/**
 * Notifications Feature
 * 
 * Provides in-app notification center and push notification functionality.
 * 
 * Push Notifications Architecture:
 * - Abstracted service interface (IPushNotificationService) allows provider swapping
 * - Expo Push Notifications is the default provider
 * - Can be swapped for FCM in the future without changing consuming code
 * - Backend API integration for device management and preferences
 */

// ============================================
// IN-APP NOTIFICATIONS (API-based)
// ============================================

// Data layer - DTOs
export {
  type NotificationDto,
  type NotificationListResponse,
  type ListNotificationsParams,
  type MarkNotificationReadRequest,
  type MarkAllNotificationsReadRequest,
  type MarkAllReadResponse,
  toNotificationEntity,
  getCategoryLabel,
  getImportanceLabel,
} from './data/models/notifications.dtos';
export * from './data/datasources/notifications.api';
export * from './data/repositories/notifications.repository.impl';

// Domain layer - entities
export {
  type NotificationCategory,
  type NotificationImportance,
  type Notification,
  isUnread,
  isHighPriority,
  getTimeAgo,
} from './domain/entities/notification.entity';
export type { NotificationListResult, INotificationsRepository } from './domain/repositories/notifications.repository';

// Presentation - In-app notification screens
export { NotificationsListScreen } from './presentation/pages/NotificationsListScreen';
export { NotificationDetailScreen } from './presentation/pages/NotificationDetailScreen';
export { NotificationHistoryScreen } from './presentation/pages/NotificationHistoryScreen';
export { NotificationListItem } from './presentation/components/NotificationListItem';
export { NotificationCategoryBadge } from './presentation/components/NotificationCategoryBadge';
export { NotificationsIconWithBadge } from './presentation/components/NotificationsIconWithBadge';
export { useNotificationBadgeCount } from './presentation/hooks/useNotificationBadgeCount';

// ============================================
// PUSH NOTIFICATIONS (Expo/Device-based)
// ============================================

// Push DTOs & Types
export {
  type PushNotificationTrigger,
  type PushNotificationData,
  type NewAppointmentPushData,
  type AppointmentUpdatedPushData,
  type AppointmentCancelledPushData,
  type ScheduleSummaryPushData,
  type ScheduleBatchUpdatePushData,
  type CriticalUpdatePushData,
  type LeaveStatusPushData,
  type TherapistNotificationPreferences,
  type PushDeviceToken,
  type RegisterDeviceRequest,
  type RegisterDeviceResponse,
  type StoredNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getPushNotificationTitle,
  formatPushNotificationBody,
  getNotificationDeepLink,
  shouldDeliverPushNotification,
  isInQuietHours,
} from './data/models/push.dtos';

// Push Service Interface (for abstraction)
export {
  type IPushNotificationService,
  type PushPermissionStatus,
  type LocalNotificationContent,
  type NotificationTriggerConfig,
  type ReceivedNotification,
  type NotificationResponse,
  type NotificationReceivedHandler,
  type NotificationResponseHandler,
  PushNotificationProvider,
} from './data/datasources/push.service.interface';

// Expo Push Service (default implementation)
export { ExpoPushNotificationService, expoPushService } from './data/datasources/expo-push.service';

// Push Notification Hook
export { usePushNotifications } from './presentation/hooks/usePushNotifications';

// Notification Preferences Screen
export { NotificationPreferencesScreen } from './presentation/pages/NotificationPreferencesScreen';

// ============================================
// BACKEND API INTEGRATION
// ============================================

// Push Notifications Backend API (renamed to avoid conflicts)
export {
  registerDeviceApi,
  unregisterDeviceApi,
  getPreferencesApi,
  updatePreferencesApi,
  resetPreferencesApi,
  getNotificationHistoryApi,
  markNotificationReadApi as markPushNotificationReadApi,
  markAllNotificationsReadApi as markAllPushNotificationsReadApi,
  deleteNotificationApi,
  sendTestNotificationApi,
  type RegisterDeviceRequest as PushRegisterDeviceRequest,
  type RegisterDeviceResponse as PushRegisterDeviceResponse,
  type NotificationPreferencesDto,
  type UpdatePreferencesRequest,
  type NotificationHistoryItem,
  type NotificationHistoryResponse,
  type NotificationHistoryParams,
  type MarkAllReadResponse as PushMarkAllReadResponse,
  type TestNotificationRequest,
} from './data/datasources/push-notifications.api';

// Push Notifications Repository (React Query hooks - renamed to avoid conflicts)
export {
  pushNotificationKeys,
  useNotificationPreferences,
  useUpdatePreferencesMutation,
  useResetPreferencesMutation,
  useRegisterDeviceMutation,
  useUnregisterDeviceMutation,
  useNotificationHistory,
  useMarkNotificationReadMutation as usePushMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation as usePushMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useSendTestNotificationMutation,
} from './data/repositories/push-notifications.repository.impl';
