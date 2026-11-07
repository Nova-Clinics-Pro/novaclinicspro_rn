import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { expoPushService } from '../data/datasources/expo-push.service';
import { notificationRepository } from '../data/repositories/push-notifications.repository.impl';
import {
  LocalNotificationContent,
  NotificationTriggerConfig,
  PushPermissionStatus,
  ReceivedNotification,
  NotificationResponse,
} from '../data/datasources/push.service.interface';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  TherapistNotificationPreferences,
} from '../data/models/push.dtos';
import {
  NotificationPreferencesDto,
  UpdatePreferencesRequest,
} from '../data/datasources/push-notifications.api';

export interface NotificationIdentity { tenantId: string; userId: string; }

function mapDtoToPreferences(dto: NotificationPreferencesDto): TherapistNotificationPreferences {
  return {
    staffId: dto.user_id,
    tenantId: dto.tenant_id,
    newAppointment: dto.appointment_new,
    appointmentUpdates: dto.appointment_updated,
    cancellationsNoShows: dto.appointment_cancelled || dto.appointment_no_show,
    dailyScheduleSummary: dto.daily_schedule_summary,
    criticalUpdates: dto.critical_updates,
    leaveUpdates: dto.leave_updates,
    scheduleSummaryTime: dto.schedule_summary_time,
    enableMiddaySummary: dto.enable_midday_summary,
    middaySummaryTime: dto.midday_summary_time,
    quietHoursEnabled: dto.quiet_hours_enabled,
    quietHoursStart: dto.quiet_hours_start,
    quietHoursEnd: dto.quiet_hours_end,
    updatedAt: dto.updated_at,
  };
}

function mapPreferencesToUpdateRequest(
  updates: Partial<TherapistNotificationPreferences>
): UpdatePreferencesRequest {
  const request: UpdatePreferencesRequest = {};
  if (updates.newAppointment !== undefined) request.appointment_new = updates.newAppointment;
  if (updates.appointmentUpdates !== undefined) request.appointment_updated = updates.appointmentUpdates;
  if (updates.cancellationsNoShows !== undefined) {
    request.appointment_cancelled = updates.cancellationsNoShows;
    request.appointment_no_show = updates.cancellationsNoShows;
  }
  if (updates.dailyScheduleSummary !== undefined) request.daily_schedule_summary = updates.dailyScheduleSummary;
  if (updates.criticalUpdates !== undefined) request.critical_updates = updates.criticalUpdates;
  if (updates.leaveUpdates !== undefined) request.leave_updates = updates.leaveUpdates;
  if (updates.scheduleSummaryTime !== undefined) request.schedule_summary_time = updates.scheduleSummaryTime;
  if (updates.enableMiddaySummary !== undefined) request.enable_midday_summary = updates.enableMiddaySummary;
  if (updates.middaySummaryTime !== undefined) request.midday_summary_time = updates.middaySummaryTime;
  if (updates.quietHoursEnabled !== undefined) request.quiet_hours_enabled = updates.quietHoursEnabled;
  if (updates.quietHoursStart !== undefined) request.quiet_hours_start = updates.quietHoursStart;
  if (updates.quietHoursEnd !== undefined) request.quiet_hours_end = updates.quietHoursEnd;
  return request;
}

export class NotificationDeviceLifecycleService {
  private identity: NotificationIdentity | null = null;
  private token: string | null = null;
  private disposeReceived: (() => void) | null = null;
  private disposeResponse: (() => void) | null = null;
  private cleanupInFlight: Promise<void> | null = null;

  async initialize(identity: NotificationIdentity, onReceived: (item: ReceivedNotification) => void, onResponse: (item: NotificationResponse) => void): Promise<{ permissionStatus: PushPermissionStatus; token: string | null }> {
    if (this.identity && (this.identity.tenantId !== identity.tenantId || this.identity.userId !== identity.userId)) await this.cleanupForIdentity(this.identity);
    this.identity = identity;
    const permissionStatus = await expoPushService.initialize();
    this.token = permissionStatus === 'granted' ? await expoPushService.getPushToken() : null;
    if (this.token) await this.registerCurrentToken();
    this.installListeners(onReceived, onResponse);
    return { permissionStatus, token: this.token };
  }

  async requestPermissions(identity: NotificationIdentity): Promise<{ permissionStatus: PushPermissionStatus; token: string | null }> {
    this.identity = identity;
    const permissionStatus = await expoPushService.requestPermissions();
    this.token = permissionStatus === 'granted' ? await expoPushService.getPushToken() : null;
    if (this.token) await this.registerCurrentToken();
    return { permissionStatus, token: this.token };
  }

  async getPreferences(identity: NotificationIdentity): Promise<TherapistNotificationPreferences> {
    return mapDtoToPreferences(await notificationRepository.getPreferences(identity.tenantId));
  }

  async updatePreferences(
    identity: NotificationIdentity,
    updates: Partial<TherapistNotificationPreferences>
  ): Promise<TherapistNotificationPreferences> {
    const dto = await notificationRepository.updatePreferences(
      identity.tenantId,
      mapPreferencesToUpdateRequest(updates)
    );
    return mapDtoToPreferences(dto);
  }

  defaultPreferences(identity: NotificationIdentity): TherapistNotificationPreferences {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      staffId: identity.userId,
      tenantId: identity.tenantId,
      updatedAt: new Date().toISOString(),
    };
  }

  private async registerCurrentToken(): Promise<void> {
    if (!this.identity || !this.token) return;
    try {
      await notificationRepository.registerDevice(this.identity.tenantId, {
        push_token: this.token,
        platform: Platform.OS as 'ios' | 'android' | 'web',
        device_name: Device.deviceName || undefined,
        device_model: Device.modelName || undefined,
        app_version: '1.0.0',
      });
      await expoPushService.registerDevice(this.token, this.identity.userId, this.identity.tenantId);
    } catch {
      // Registration is explicitly best-effort and must not block notification UI.
    }
  }

  private installListeners(onReceived: (item: ReceivedNotification) => void, onResponse: (item: NotificationResponse) => void): void {
    this.disposeListeners();
    this.disposeReceived = expoPushService.onNotificationReceived(onReceived);
    this.disposeResponse = expoPushService.onNotificationResponse(onResponse);
  }

  disposeListeners(): void {
    this.disposeReceived?.(); this.disposeResponse?.();
    this.disposeReceived = null; this.disposeResponse = null;
  }

  clearNotifications(): Promise<void> { return expoPushService.clearAllNotifications(); }
  setBadgeCount(count: number): Promise<void> { return expoPushService.setBadgeCount(count); }
  getBadgeCount(): Promise<number> { return expoPushService.getBadgeCount(); }
  scheduleLocalNotification(notification: LocalNotificationContent, trigger: NotificationTriggerConfig): Promise<string> {
    return expoPushService.scheduleLocalNotification(notification, trigger);
  }
  cancelScheduledNotification(notificationId: string): Promise<void> {
    return expoPushService.cancelScheduledNotification(notificationId);
  }
  cancelAllScheduledNotifications(): Promise<void> {
    return expoPushService.cancelAllScheduledNotifications();
  }

  async cleanupForIdentity(identity = this.identity): Promise<void> {
    if (this.cleanupInFlight) return this.cleanupInFlight;
    this.cleanupInFlight = this.performCleanup(identity).finally(() => {
      this.cleanupInFlight = null;
    });
    return this.cleanupInFlight;
  }

  private async performCleanup(identity: NotificationIdentity | null): Promise<void> {
    this.disposeListeners();
    const retainedToken = this.token;
    this.identity = null;
    this.token = null;

    let token = retainedToken;
    if (!token) {
      try {
        token = await expoPushService.getPushToken();
      } catch {
        // A provider read failure must not prevent listener disposal or logout.
        return;
      }
    }

    if (identity && token) {
      await Promise.allSettled([
        notificationRepository.unregisterDevice(identity.tenantId, token),
        expoPushService.unregisterDevice(token, identity.userId),
      ]);
    }
  }
}

export const notificationDeviceLifecycleService = new NotificationDeviceLifecycleService();
