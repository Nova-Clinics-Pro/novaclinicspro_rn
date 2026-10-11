/**
 * Push Notifications Repository Implementation
 * React Query hooks for push notification operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  registerDeviceApi,
  unregisterDeviceApi,
  getPreferencesApi,
  updatePreferencesApi,
  resetPreferencesApi,
  getNotificationHistoryApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  sendTestNotificationApi,
  RegisterDeviceRequest,
  UpdatePreferencesRequest,
  NotificationHistoryParams,
  TestNotificationRequest,
} from '../datasources/push-notifications.api';

/** Non-React command boundary used by the device lifecycle coordinator. */
export const notificationRepository = {
  registerDevice: registerDeviceApi,
  unregisterDevice: unregisterDeviceApi,
  getPreferences: getPreferencesApi,
  updatePreferences: updatePreferencesApi,
};

// Query keys
export const pushNotificationKeys = {
  all: ['push-notifications'] as const,
  preferences: (tenantId: string) => 
    [...pushNotificationKeys.all, 'preferences', tenantId] as const,
  history: (tenantId: string, params?: NotificationHistoryParams) => 
    [...pushNotificationKeys.all, 'history', tenantId, params] as const,
};

// ============================================
// PREFERENCES HOOKS
// ============================================

/**
 * Fetch notification preferences
 */
export function useNotificationPreferences(tenantId: string | null) {
  return useQuery({
    queryKey: pushNotificationKeys.preferences(tenantId || ''),
    queryFn: () => getPreferencesApi(tenantId!),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Update notification preferences
 */
export function useUpdatePreferencesMutation(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePreferencesRequest) => 
      updatePreferencesApi(tenantId!, data),
    onSuccess: (data) => {
      // Update cache with new preferences
      queryClient.setQueryData(
        pushNotificationKeys.preferences(tenantId!),
        data
      );
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
    },
  });
}

/**
 * Reset notification preferences to defaults
 */
export function useResetPreferencesMutation(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetPreferencesApi(tenantId!),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pushNotificationKeys.preferences(tenantId!),
        data
      );
    },
  });
}

// ============================================
// DEVICE REGISTRATION HOOKS
// ============================================

/**
 * Register device for push notifications
 */
export function useRegisterDeviceMutation(tenantId: string | null) {
  return useMutation({
    mutationFn: (data: RegisterDeviceRequest) => 
      registerDeviceApi(tenantId!, data),
    onError: (error) => {
      console.error('Failed to register device:', error);
    },
  });
}

/**
 * Unregister device from push notifications
 */
export function useUnregisterDeviceMutation(tenantId: string | null) {
  return useMutation({
    mutationFn: (pushToken: string) => 
      unregisterDeviceApi(tenantId!, pushToken),
    onError: (error) => {
      console.error('Failed to unregister device:', error);
    },
  });
}

// ============================================
// NOTIFICATION HISTORY HOOKS
// ============================================

/**
 * Fetch notification history with pagination
 */
export function useNotificationHistory(
  tenantId: string | null,
  params?: NotificationHistoryParams
) {
  return useQuery({
    queryKey: pushNotificationKeys.history(tenantId || '', params),
    queryFn: () => getNotificationHistoryApi(tenantId!, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

/**
 * Mark single notification as read
 */
export function useMarkNotificationReadMutation(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      markNotificationReadApi(tenantId!, notificationId),
    onSuccess: () => {
      // Invalidate history queries to refresh unread count
      queryClient.invalidateQueries({
        queryKey: [...pushNotificationKeys.all, 'history', tenantId],
      });
    },
    onError: (error) => {
      console.error('Failed to mark notification read:', error);
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsReadMutation(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsReadApi(tenantId!),
    onSuccess: () => {
      // Invalidate all history queries
      queryClient.invalidateQueries({
        queryKey: [...pushNotificationKeys.all, 'history', tenantId],
      });
    },
    onError: (error) => {
      console.error('Failed to mark all notifications read:', error);
    },
  });
}

/**
 * Delete a notification
 */
export function useDeleteNotificationMutation(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      deleteNotificationApi(tenantId!, notificationId),
    onSuccess: () => {
      // Invalidate history queries
      queryClient.invalidateQueries({
        queryKey: [...pushNotificationKeys.all, 'history', tenantId],
      });
    },
    onError: (error) => {
      console.error('Failed to delete notification:', error);
    },
  });
}

// ============================================
// TEST NOTIFICATION HOOK
// ============================================

/**
 * Send test notification
 */
export function useSendTestNotificationMutation(tenantId: string | null) {
  return useMutation({
    mutationFn: (data: TestNotificationRequest) => 
      sendTestNotificationApi(tenantId!, data),
    onError: (error) => {
      console.error('Failed to send test notification:', error);
    },
  });
}
