/**
 * Push Notification Hook (Backend Integrated)
 * React hook for managing push notifications with backend API integration
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import {
  PushPermissionStatus,
  ReceivedNotification,
  NotificationResponse,
} from '../../data/datasources/push.service.interface';
import {
  NotificationIdentity,
  notificationDeviceLifecycleService,
} from '../../application/notification-device-lifecycle.service';
import {
  PushNotificationData,
  TherapistNotificationPreferences,
  getNotificationDeepLink,
  shouldDeliverPushNotification,
  isInQuietHours,
} from '../../data/models/push.dtos';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';

interface UsePushNotificationsReturn {
  // State
  permissionStatus: PushPermissionStatus;
  pushToken: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  preferences: TherapistNotificationPreferences | null;
  recentNotifications: ReceivedNotification[];
  error: string | null;
  
  // Actions
  requestPermissions: () => Promise<PushPermissionStatus>;
  initialize: () => Promise<void>;
  updatePreferences: (updates: Partial<TherapistNotificationPreferences>) => Promise<void>;
  clearNotifications: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  scheduleScheduleSummary: () => Promise<void>;
  cancelScheduleSummary: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

/**
 * Hook for managing push notifications with backend integration
 */
export const usePushNotifications = (): UsePushNotificationsReturn => {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuth();
  
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<TherapistNotificationPreferences | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<ReceivedNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const scheduleSummaryId = useRef<string | null>(null);
  const identityRef = useRef<NotificationIdentity | null>(null);

  // Get tenant ID from auth context
  const tenantId = currentUser?.tenantId;
  const userId = currentUser?.userId;
  const identity = useMemo(
    () => tenantId && userId ? { tenantId, userId } : null,
    [tenantId, userId]
  );

  const cancelScheduleSummary = useCallback(async () => {
    if (scheduleSummaryId.current) {
      await notificationDeviceLifecycleService.cancelScheduledNotification(scheduleSummaryId.current);
      scheduleSummaryId.current = null;
    }
    await notificationDeviceLifecycleService.cancelAllScheduledNotifications();
  }, []);

  const scheduleScheduleSummary = useCallback(async (preferencesToSchedule = preferences) => {
    if (!preferencesToSchedule?.dailyScheduleSummary) return;

    await cancelScheduleSummary();
    const [hour, minute] = preferencesToSchedule.scheduleSummaryTime.split(':').map(Number);
    const morningId = await notificationDeviceLifecycleService.scheduleLocalNotification(
      {
        title: "Today's Schedule",
        body: 'Tap to view your appointments for today',
        data: { trigger: 'schedule_summary', summaryType: 'morning' } as any,
        sound: true,
        categoryIdentifier: 'schedule',
      },
      { type: 'daily', value: { hour, minute }, repeats: true }
    );
    scheduleSummaryId.current = morningId;

    if (preferencesToSchedule.enableMiddaySummary) {
      const [middayHour, middayMinute] = preferencesToSchedule.middaySummaryTime.split(':').map(Number);
      await notificationDeviceLifecycleService.scheduleLocalNotification(
        {
          title: 'Afternoon Schedule Update',
          body: 'Tap to view your remaining appointments',
          data: { trigger: 'schedule_summary', summaryType: 'midday' } as any,
          sound: true,
          categoryIdentifier: 'schedule',
        },
        { type: 'daily', value: { hour: middayHour, minute: middayMinute }, repeats: true }
      );
    }
  }, [cancelScheduleSummary, preferences]);

  /**
   * Fetch preferences from backend
   */
  const fetchPreferences = useCallback(async () => {
    if (!identity) return null;

    try {
      setIsLoading(true);
      const prefs = await notificationDeviceLifecycleService.getPreferences(identity);
      setPreferences(prefs);
      setError(null);
      return prefs;
    } catch (err: any) {
      console.error('Failed to fetch notification preferences:', err);
      // Use defaults if API fails
      const defaultPrefs = notificationDeviceLifecycleService.defaultPreferences(identity);
      setPreferences(defaultPrefs);
      setError('Failed to load preferences');
      return defaultPrefs;
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  /**
   * Refresh preferences from backend
   */
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  /**
   * Update preferences on backend
   */
  const updatePreferences = useCallback(
    async (updates: Partial<TherapistNotificationPreferences>) => {
      if (!identity || !preferences) return;

      // Optimistically update local state
      const previousPrefs = preferences;
      const optimisticPrefs: TherapistNotificationPreferences = {
        ...preferences,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      setPreferences(optimisticPrefs);

      try {
        setIsLoading(true);
        const updatedPrefs = await notificationDeviceLifecycleService.updatePreferences(identity, updates);
        setPreferences(updatedPrefs);
        setError(null);

        // Re-schedule daily summary if time changed
        if (updates.scheduleSummaryTime || updates.dailyScheduleSummary !== undefined) {
          if (updatedPrefs.dailyScheduleSummary) {
            await scheduleScheduleSummary(updatedPrefs);
          } else {
            await cancelScheduleSummary();
          }
        }
      } catch (err: any) {
        console.error('Failed to update preferences:', err);
        // Revert to previous state on error
        setPreferences(previousPrefs);
        setError('Failed to update preferences');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [identity, preferences, scheduleScheduleSummary, cancelScheduleSummary]
  );

  /**
   * Handle received notification
   */
  const handleNotificationReceived = useCallback((notification: ReceivedNotification) => {
    console.log('Notification received:', notification.title);
    
    // Check preferences before processing
    if (preferences) {
      const data = notification.data as PushNotificationData;
      if (!shouldDeliverPushNotification(data.trigger, preferences)) {
        console.log('Notification filtered by preferences');
        return;
      }
      if (isInQuietHours(preferences)) {
        console.log('Notification filtered by quiet hours');
        return;
      }
    }

    // Add to recent notifications
    setRecentNotifications(prev => [notification, ...prev.slice(0, 49)]);
  }, [preferences]);

  /**
   * Handle notification tap - deep link navigation
   */
  const handleNotificationResponse = useCallback((response: NotificationResponse) => {
    console.log('Notification tapped:', response.title);
    
    const data = response.data as PushNotificationData;
    const route = getNotificationDeepLink(data);
    
    // Navigate to the appropriate screen
    if (route) {
      router.push(route as any);
    }
  }, [router]);

  /**
   * Initialize push notifications
   */
  const initialize = useCallback(async () => {
    if (isInitialized || !identity) return;

    try {
      setIsLoading(true);

      const result = await notificationDeviceLifecycleService.initialize(
        identity,
        handleNotificationReceived,
        handleNotificationResponse
      );
      identityRef.current = identity;
      const { permissionStatus: status, token } = result;
      setPermissionStatus(status);
      setPushToken(token);

      // Fetch preferences from backend
      await fetchPreferences();

      setIsInitialized(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to initialize push notifications:', err);
      setError('Failed to initialize notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, identity, fetchPreferences, handleNotificationReceived, handleNotificationResponse]);

  /**
   * Request permissions
   */
  const requestPermissions = useCallback(async (): Promise<PushPermissionStatus> => {
    if (!identity) return permissionStatus;
    const { permissionStatus: status, token } = await notificationDeviceLifecycleService.requestPermissions(identity);
    setPermissionStatus(status);
    setPushToken(token);

    return status;
  }, [identity, permissionStatus]);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(async () => {
    await notificationDeviceLifecycleService.clearNotifications();
    setRecentNotifications([]);
  }, []);

  /**
   * Set badge count
   */
  const setBadgeCount = useCallback(async (count: number) => {
    await notificationDeviceLifecycleService.setBadgeCount(count);
  }, []);

  // Initialize on mount when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser && tenantId && !isInitialized) {
      const initialization = Promise.resolve().then(initialize);
      void initialization;
    }
  }, [isAuthenticated, currentUser, tenantId, isInitialized, initialize]);

  // The hook observes authentication state; the lifecycle service owns cleanup.
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      const registeredIdentity = identityRef.current;
      if (registeredIdentity) {
        void notificationDeviceLifecycleService.cleanupForIdentity(registeredIdentity);
      }
      identityRef.current = null;
      void Promise.resolve().then(() => {
        setIsInitialized(false);
        setPushToken(null);
        setPreferences(null);
      });
    }
  }, [isAuthenticated, isInitialized]);

  // Handle app state changes (refresh on foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && isInitialized) {
        // Refresh badge count when app becomes active
        notificationDeviceLifecycleService.getBadgeCount().then(count => {
          console.log('Badge count:', count);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, isInitialized]);

  useEffect(() => () => notificationDeviceLifecycleService.disposeListeners(), []);

  return {
    permissionStatus,
    pushToken,
    isInitialized,
    isLoading,
    preferences,
    recentNotifications,
    error,
    requestPermissions,
    initialize,
    updatePreferences,
    clearNotifications,
    setBadgeCount,
    scheduleScheduleSummary,
    cancelScheduleSummary,
    refreshPreferences,
  };
};

export default usePushNotifications;
