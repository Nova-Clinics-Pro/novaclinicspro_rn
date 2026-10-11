import { queryClient } from '../../../core/api/queryClient';
import { setLoggingOut } from '../../../core/api/authGuard';
import { logError } from '../../../core/utils/errorHandler';
import {
  NotificationIdentity,
  notificationDeviceLifecycleService,
} from '../../notifications/application/notification-device-lifecycle.service';
import { clearWizardDraftStorageForIdentity } from '../../onboarding/presentation/stores/wizard.store';
import { authSessionService } from './auth-session.service';
import { useAuthStore } from '../presentation/providers/auth.store';

export interface UnifiedLogoutOptions {
  navigateToLogin: () => void;
}

/**
 * Canonical explicit-user logout command.
 *
 * Safety order: synchronously block authenticated requests; capture the
 * outgoing identity; begin isolated notification cleanup; synchronously
 * invalidate local auth; cancel and clear tenant queries; clear the outgoing
 * user's onboarding draft; navigate; finally attempt provider sign-out.
 * Remote notification/provider work is intentionally best-effort and never
 * blocks local logout.
 */
export class UnifiedLogoutService {
  private inFlight: Promise<void> | null = null;

  logout(options: UnifiedLogoutOptions): Promise<void> {
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.execute(options).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async execute({ navigateToLogin }: UnifiedLogoutOptions): Promise<void> {
    setLoggingOut(true);
    try {
      const { currentUser, selectedClinicId, clearSession } = useAuthStore.getState();
      const outgoingTenantId = selectedClinicId || currentUser?.tenantId || null;
      const outgoingUserId = currentUser?.userId || currentUser?.id || null;
      const outgoingIdentity: NotificationIdentity | null =
        outgoingTenantId && outgoingUserId
          ? { tenantId: outgoingTenantId, userId: outgoingUserId }
          : null;

      // The service disposes listeners before awaiting provider work. Do not
      // await it here: remote/device cleanup must never hold the user inside
      // an authenticated UI or delay the synchronous auth safety boundary.
      if (outgoingIdentity) {
        void notificationDeviceLifecycleService.cleanupForIdentity(outgoingIdentity).catch(error => {
          logError('auth.logout.notification_cleanup', error);
        });
      } else {
        notificationDeviceLifecycleService.disposeListeners();
      }

      // clearSession synchronously sets isAuthenticated false before its
      // storage cleanup resolves. This remains the authoritative local guard.
      const clearSessionPromise = clearSession();
      try {
        await queryClient.cancelQueries();
      } catch (error) {
        logError('auth.logout.query_cancel', error);
      }
      try {
        queryClient.clear();
      } catch (error) {
        logError('auth.logout.query_clear', error);
      }

      if (outgoingUserId) {
        try {
          await clearWizardDraftStorageForIdentity({
            tenantId: outgoingTenantId,
            userId: outgoingUserId,
          });
        } catch (error) {
          logError('auth.logout.onboarding_draft_cleanup', error);
        }
      }
      await clearSessionPromise;

      navigateToLogin();
      try {
        await authSessionService.signOutProviderBestEffort();
      } catch (error) {
        // The provider adapter is normally non-throwing; retain the logout
        // guarantee if a future adapter or test double rejects unexpectedly.
        logError('auth.logout.provider_signout', error);
      }
    } catch (error) {
      logError('auth.logout', error);
      throw error;
    } finally {
      setLoggingOut(false);
    }
  }
}

export const unifiedLogoutService = new UnifiedLogoutService();
