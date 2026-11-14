/**
 * Expo Push Notification Service
 * Implementation of IPushNotificationService using Expo Notifications
 * 
 * This is the primary push notification provider for the React Native/Expo app.
 * Can be swapped for FCM or other providers by implementing IPushNotificationService.
 */

import type * as NotificationTypes from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IPushNotificationService,
  PushPermissionStatus,
  LocalNotificationContent,
  NotificationTriggerConfig,
  ReceivedNotification,
  NotificationResponse,
  NotificationReceivedHandler,
  NotificationResponseHandler,
} from './push.service.interface';
import { PushNotificationData } from '../models/push.dtos';

/** Whether a push token cannot be requested here: on the web it requires a configured VAPID public key. */
export const webPushUnavailable = (
  platform: string,
  notificationConfig?: { vapidPublicKey?: string } | null,
): boolean => platform === 'web' && !notificationConfig?.vapidPublicKey;

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: '@NovaClinicsPro:pushToken',
  DEVICE_REGISTERED: '@NovaClinicsPro:deviceRegistered',
  NOTIFICATION_HISTORY: '@NovaClinicsPro:notificationHistory',
};

// Expo Go must not evaluate expo-notifications: its Android remote-push
// initialization is unsupported, including when imported by auth/logout.
export const nativeNotificationsAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const Notifications: typeof NotificationTypes | null = nativeNotificationsAvailable
  // Metro needs a literal conditional require so native initialization stays gated.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('expo-notifications')
  : null;

// Preserve native-build handler registration and let unexpected native errors surface.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Expo Push Notification Service Implementation
 */
export class ExpoPushNotificationService implements IPushNotificationService {
  private pushToken: string | null = null;
  private notificationReceivedListener: NotificationTypes.Subscription | null = null;
  private notificationResponseListener: NotificationTypes.Subscription | null = null;

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<PushPermissionStatus> {
    if (!Notifications) return 'denied';
    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    // Check existing permissions
    const status = await this.getPermissionStatus();
    
    // If granted, get the token
    if (status === 'granted') {
      await this.getPushToken();
    }

    return status;
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (!Notifications) return;
    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      description: 'General notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32', // App primary color
      sound: 'default',
    });

    // High priority channel for appointments
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Appointments',
      description: 'New appointments and schedule changes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
      sound: 'default',
    });

    // Critical channel for urgent updates
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical Updates',
      description: 'Important system alerts and emergencies',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#D32F2F',
      sound: 'default',
      bypassDnd: true,
    });

    // Schedule summary channel
    await Notifications.setNotificationChannelAsync('schedule', {
      name: 'Daily Schedule',
      description: 'Daily schedule summaries',
      importance: Notifications.AndroidImportance.LOW,
      sound: 'default',
    });
  }

  /**
   * Request push notification permissions
   */
  async requestPermissions(): Promise<PushPermissionStatus> {
    if (!Notifications) return 'denied';
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return 'denied';
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return 'granted';
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return this.mapExpoStatus(status);
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<PushPermissionStatus> {
    if (!Notifications) return 'denied';
    const { status } = await Notifications.getPermissionsAsync();
    return this.mapExpoStatus(status);
  }

  /**
   * Map Expo permission status to our enum
   */
  private mapExpoStatus(status: NotificationTypes.PermissionStatus): PushPermissionStatus {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'undetermined';
    }
  }

  /**
   * Get push token for this device
   */
  async getPushToken(): Promise<string | null> {
    if (!Notifications) return null;
    if (this.pushToken) {
      return this.pushToken;
    }

    // Check cached token first
    const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (cachedToken) {
      this.pushToken = cachedToken;
      return cachedToken;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Web push needs a VAPID key; without one expo-notifications throws, which showed up as a red error on every
    // web load. The app registers devices as ios/android only, so on the web there is nothing to register.
    if (webPushUnavailable(Platform.OS, (Constants.expoConfig as { notification?: { vapidPublicKey?: string } } | null)?.notification)) {
      console.log('Push notifications are not configured for the web (no VAPID key); skipping');
      return null;
    }

    try {
      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 
                       Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('Project ID not found for Expo Push Token');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      this.pushToken = tokenData.data;
      
      // Cache the token
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.pushToken);
      
      return this.pushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Register device with backend
   * Note: This requires backend API support
   */
  async registerDevice(token: string, staffId: string, tenantId: string): Promise<void> {
    if (!Notifications) return;
    // Store registration locally for now
    // TODO: When backend API is available, send registration to server
    const registrationData = {
      token,
      staffId,
      tenantId,
      platform: Platform.OS as 'ios' | 'android',
      deviceId: Device.modelId || 'unknown',
      registeredAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.DEVICE_REGISTERED,
      JSON.stringify(registrationData)
    );

    console.log('Device registered for push notifications:', {
      staffId,
      tenantId,
      platform: Platform.OS,
    });

    // TODO: API call to backend when available
    // await pushNotificationsApi.registerDevice({
    //   token,
    //   platform: Platform.OS,
    //   deviceId: Device.modelId || 'unknown',
    // });
  }

  /**
   * Unregister device (e.g., on logout)
   */
  async unregisterDevice(token: string, staffId: string): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.DEVICE_REGISTERED);
    this.pushToken = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);

    console.log('Device unregistered from push notifications');

    // TODO: API call to backend when available
    // await pushNotificationsApi.unregisterDevice({ token, staffId });
  }

  /**
   * Set up notification received handler
   */
  onNotificationReceived(handler: NotificationReceivedHandler): () => void {
    if (!Notifications) return () => {};
    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as unknown as PushNotificationData;
        
        const receivedNotification: ReceivedNotification = {
          notificationId: notification.request.identifier,
          title: notification.request.content.title || '',
          body: notification.request.content.body || '',
          data,
          receivedAt: new Date(),
        };

        // Store in history
        this.addToHistory(receivedNotification);

        handler(receivedNotification);
      }
    );

    return () => {
      if (this.notificationReceivedListener) {
        this.notificationReceivedListener.remove();
        this.notificationReceivedListener = null;
      }
    };
  }

  /**
   * Set up notification response handler (when user taps)
   */
  onNotificationResponse(handler: NotificationResponseHandler): () => void {
    if (!Notifications) return () => {};
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notification = response.notification;
        const data = notification.request.content.data as unknown as PushNotificationData;

        const notificationResponse: NotificationResponse = {
          notificationId: notification.request.identifier,
          title: notification.request.content.title || '',
          body: notification.request.content.body || '',
          data,
          actionIdentifier: response.actionIdentifier,
        };

        handler(notificationResponse);
      }
    );

    return () => {
      if (this.notificationResponseListener) {
        this.notificationResponseListener.remove();
        this.notificationResponseListener = null;
      }
    };
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    content: LocalNotificationContent,
    trigger: NotificationTriggerConfig
  ): Promise<string> {
    if (!Notifications) throw new Error('Native notifications are unavailable in Expo Go');
    const expoTrigger = this.mapTriggerConfig(trigger);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: content.sound === true ? 'default' : content.sound || undefined,
        badge: content.badge,
        categoryIdentifier: content.categoryIdentifier,
        subtitle: content.subtitle,
      },
      trigger: expoTrigger,
    });

    return notificationId;
  }

  /**
   * Map trigger config to Expo format
   */
  private mapTriggerConfig(trigger: NotificationTriggerConfig): NotificationTypes.NotificationTriggerInput {
    if (!Notifications) return null;
    switch (trigger.type) {
      case 'date':
        return {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger.value as Date,
        };
      case 'daily':
        const time = trigger.value as { hour: number; minute: number };
        return {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        };
      case 'interval':
        return {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger.value as number,
          repeats: trigger.repeats || false,
        };
      default:
        return null; // Immediate
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    if (!Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all delivered notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!Notifications) return;
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Add notification to local history
   */
  private async addToHistory(notification: ReceivedNotification): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new notification at the beginning
      history.unshift({
        ...notification,
        receivedAt: notification.receivedAt.toISOString(),
      });

      // Keep only last 100 notifications
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(trimmedHistory)
      );
    } catch (error) {
      console.error('Failed to save notification to history:', error);
    }
  }

  /**
   * Get notification history from local storage
   */
  async getNotificationHistory(): Promise<ReceivedNotification[]> {
    try {
      const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      if (!historyJson) return [];
      
      const history = JSON.parse(historyJson);
      return history.map((item: any) => ({
        ...item,
        receivedAt: new Date(item.receivedAt),
      }));
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Clear notification history
   */
  async clearNotificationHistory(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
  }
}

// Export singleton instance
export const expoPushService = new ExpoPushNotificationService();
