/** Canonical application owner for the Auth session lifecycle. */
import { logError } from '../../../core/utils/errorHandler';
import { getLogoutEpoch, isLoggingOut } from '../../../core/api/authGuard';
import { authRepository } from '../data/repositories/auth.repository.impl';
import {
  AuthProviderError,
  AuthProviderSession,
  supabaseAuthProvider,
} from '../data/datasources/supabase-auth.provider';
import { AuthUserSession } from '../domain/entities/auth.entity';
import { useAuthStore } from '../presentation/providers/auth.store';

export interface AuthBootstrapResult {
  authenticated: boolean;
  session: AuthUserSession | null;
  error?: string;
}

export interface RecoveryCredentials {
  accessToken: string;
  refreshToken: string;
}

export class AuthSessionService {
  private hydratedAccessToken: string | null = null;
  private recoveryMode = false;
  private recoverySessionReady = false;
  /** True while reconcileStaleSessionScope drives its own provider refresh (its auth event must not re-enter hydration). */
  private reconcilingScope = false;

  private async hydrateCurrentUser(accessToken: string): Promise<AuthUserSession> {
    let user: AuthUserSession;
    try {
      user = await authRepository.getCurrentUser();
    } catch (firstError: any) {
      if (firstError?.isAxiosError && !firstError?.response) {
        await new Promise(resolve => setTimeout(resolve, 800));
        user = await authRepository.getCurrentUser();
      } else {
        throw firstError;
      }
    }
    useAuthStore.getState().setCurrentUser(user);
    this.hydratedAccessToken = accessToken;
    return this.reconcileStaleSessionScope(user);
  }

  /**
   * NC-WEB-001. The backend is authoritative for the effective organization/tenant
   * and reports `sessionRefreshRequired` while the provider token claims lag behind
   * it (a clinic provisioned at registration has no tenant claim yet). Every
   * tenant-scoped surface fails closed on that flag, so the canonical handshake
   * (server-side claim projection, then provider token refresh) must run once the
   * session is hydrated; otherwise a new owner is stuck on "selected clinic changed".
   * The backend decides the scope from database membership; nothing is trusted from
   * the client and tenant isolation is unchanged. Attempted at most once per
   * hydration; a failure leaves the fail-closed state in place.
   */
  private async reconcileStaleSessionScope(user: AuthUserSession): Promise<AuthUserSession> {
    const scope = user.sessionScope;
    if (
      !scope?.sessionRefreshRequired ||
      !scope.effectiveOrganizationId ||
      !scope.effectiveTenantId ||
      isLoggingOut()
    ) {
      return user;
    }
    const epoch = getLogoutEpoch();
    this.reconcilingScope = true;
    try {
      await authRepository.refreshEffectiveTenantSession(scope.effectiveOrganizationId);
      const refreshed = await supabaseAuthProvider.refreshSession();
      if (isLoggingOut() || getLogoutEpoch() !== epoch) return user;
      await this.persistSession(refreshed);
      const reconciled = await authRepository.getCurrentUser();
      if (isLoggingOut() || getLogoutEpoch() !== epoch) return user;
      useAuthStore.getState().setCurrentUser(reconciled);
      this.hydratedAccessToken = refreshed.accessToken;
      return reconciled;
    } catch (error) {
      logError('auth.session_scope_reconciliation', error);
      return user;
    } finally {
      this.reconcilingScope = false;
    }
  }

  private async persistSession(session: AuthProviderSession): Promise<void> {
    await useAuthStore.getState().setTokens(session.accessToken, session.refreshToken);
  }

  async login(email: string, password: string): Promise<AuthUserSession> {
    const session = await supabaseAuthProvider.signInWithPassword(email, password);
    this.recoveryMode = false;
    this.recoverySessionReady = false;
    await this.persistSession(session);
    try {
      return await this.hydrateCurrentUser(session.accessToken);
    } catch (error: any) {
      logError('auth.login.backend_context', error);
      try {
        await supabaseAuthProvider.signOut();
      } catch (signOutError) {
        logError('auth.login.provider_signout', signOutError);
      }
      await useAuthStore.getState().clearSession();
      throw this.normalizeContextError(error);
    }
  }

  async bootstrap(): Promise<AuthBootstrapResult> {
    let restoringPersistedSession = false;
    try {
      if (this.recoveryMode) {
        // Leaving reset must not turn a recovery-only session into normal login.
        // A failed sign-out remains fail-closed; explicit login can still proceed.
        await supabaseAuthProvider.signOut();
        await useAuthStore.getState().clearSession();
        this.recoveryMode = false;
        this.recoverySessionReady = false;
        this.hydratedAccessToken = null;
        return { authenticated: false, session: null, error: 'No active session' };
      }
      // A logout that begins before or during bootstrap wins: bootstrap must never
      // restore a persisted session over it (the /logout route loads the app and
      // runs bootstrap and logout concurrently).
      const epoch = getLogoutEpoch();
      const supersededByLogout = () => isLoggingOut() || getLogoutEpoch() !== epoch;
      const loggedOut: AuthBootstrapResult = { authenticated: false, session: null, error: 'No active session' };
      if (supersededByLogout()) return loggedOut;
      await useAuthStore.getState().initializeFromStorage();
      if (supersededByLogout()) {
        await useAuthStore.getState().clearSession();
        return loggedOut;
      }
      const persistedState = useAuthStore.getState();
      let session = await supabaseAuthProvider.getSession();
      if (supersededByLogout()) {
        await useAuthStore.getState().clearSession();
        return loggedOut;
      }
      if (!session && persistedState.accessToken && persistedState.refreshToken) {
        restoringPersistedSession = true;
        session = await supabaseAuthProvider.setSession({
          accessToken: persistedState.accessToken,
          refreshToken: persistedState.refreshToken,
        });
        if (supersededByLogout()) {
          // setSession re-seeded the provider storage; remove it again.
          await supabaseAuthProvider.invalidateLocalSession();
          await useAuthStore.getState().clearSession();
          return loggedOut;
        }
      }
      if (!session) return loggedOut;
      await this.persistSession(session);
      if (supersededByLogout()) {
        await supabaseAuthProvider.invalidateLocalSession();
        await useAuthStore.getState().clearSession();
        return loggedOut;
      }
      const user = await this.hydrateCurrentUser(session.accessToken);
      if (supersededByLogout()) {
        await useAuthStore.getState().clearSession();
        return loggedOut;
      }
      return { authenticated: true, session: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Session bootstrap failed';
      // A consumed persisted refresh token is terminal. A /auth/me hydration
      // failure remains non-terminal, matching the prior bootstrap behavior.
      if (restoringPersistedSession) {
        await useAuthStore.getState().clearSession();
      }
      return { authenticated: false, session: null, error: message };
    }
  }

  async refresh(): Promise<AuthUserSession> {
    const session = await supabaseAuthProvider.refreshSession();
    await this.persistSession(session);
    return this.hydrateCurrentUser(session.accessToken);
  }

  async handleAuthStateChange(session: AuthProviderSession | null): Promise<void> {
    // While a logout is running no provider event may re-establish authentication.
    if (session && isLoggingOut()) return;
    if (!session) {
      if (useAuthStore.getState().isAuthenticated || useAuthStore.getState().accessToken) {
        await useAuthStore.getState().clearSession();
      }
      this.hydratedAccessToken = null;
      return;
    }
    if (this.recoveryMode || this.reconcilingScope) return;
    await this.persistSession(session);
    if (this.hydratedAccessToken === session.accessToken) return;
    try {
      await this.hydrateCurrentUser(session.accessToken);
    } catch (error) {
      logError('auth.event.backend_context', error);
    }
  }

  subscribeToAuthState(): () => void {
    return supabaseAuthProvider.subscribe(session => {
      void this.handleAuthStateChange(session);
    });
  }

  /**
   * Synchronously (storage-level) invalidates the persisted provider session and
   * returns the access token needed to revoke it remotely. Fail-closed: a storage
   * failure is logged and reported as null, never thrown into logout.
   */
  async invalidateLocalProviderSession(): Promise<string | null> {
    try {
      return await supabaseAuthProvider.invalidateLocalSession();
    } catch (error) {
      logError('auth.logout.provider_local_invalidation', error);
      return null;
    }
  }

  async signOutProviderBestEffort(revocationToken?: string | null): Promise<void> {
    try {
      if (revocationToken) {
        try {
          await supabaseAuthProvider.revokeRemoteSession(revocationToken);
        } catch (error) {
          // Local invalidation already happened; keep going to the SDK sign-out.
          logError('auth.logout.remote_revocation', error);
        }
      }
      await supabaseAuthProvider.signOut();
    } catch (error) {
      logError('auth.logout.supabase_signout', error);
    } finally {
      this.hydratedAccessToken = null;
    }
  }

  /** Registration may create a provider session; the product intentionally ends unauthenticated. */
  async finalizeRegistrationSession(): Promise<void> {
    await supabaseAuthProvider.signOut();
    this.hydratedAccessToken = null;
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    try {
      await supabaseAuthProvider.resetPasswordForEmail(email, redirectTo);
    } catch (error) {
      throw this.normalizeRecoveryError(error, 'Unable to send reset email. Please try again.');
    }
  }

  /** Recovery always requires fresh callback credentials, never an unrelated login. */
  async establishRecoverySession(credentials?: RecoveryCredentials): Promise<void> {
    this.recoveryMode = true;
    this.recoverySessionReady = false;
    try {
      if (!credentials?.accessToken || !credentials.refreshToken) {
        throw new AuthProviderError('INVALID_RECOVERY_LINK', 'Invalid or expired reset link. Please request a new password reset.');
      }
      // A recovery-only provider session must not retain another user's normal
      // application/tenant identity or trigger /auth/me hydration.
      await useAuthStore.getState().clearSession();
      await supabaseAuthProvider.setSession(credentials);
      this.recoverySessionReady = true;
    } catch (error) {
      this.recoveryMode = false;
      throw this.normalizeRecoveryError(error, 'Invalid or expired reset link. Please request a new password reset.');
    }
  }

  async completePasswordRecovery(password: string): Promise<void> {
    if (!this.recoveryMode || !this.recoverySessionReady) {
      throw new Error('Invalid or expired reset link. Please request a new password reset.');
    }
    try {
      await supabaseAuthProvider.updatePassword(password);
      // Consume this local recovery flow even if provider sign-out later fails.
      this.recoverySessionReady = false;
      await supabaseAuthProvider.signOut();
      await useAuthStore.getState().clearSession();
      this.hydratedAccessToken = null;
      this.recoveryMode = false;
    } catch (error) {
      throw this.normalizeRecoveryError(error, 'Failed to update password. Please try again.');
    }
  }

  private normalizeContextError(error: any): Error {
    if (error?.response?.status === 401) return new Error('Your account is not authorized. Please contact support.');
    if (error?.response?.status === 403) return new Error('Access denied. Your account may be suspended.');
    if (error?.response?.status === 404) return new Error('User profile not found. Please contact support to set up your account.');
    if (error?.isAxiosError && !error?.response) return new Error('Unable to connect to the server. Please check your internet connection and try again.');
    if (error instanceof AuthProviderError) return new Error(error.message);
    return new Error('Unable to load your profile. Please try again later.');
  }

  private normalizeRecoveryError(error: unknown, fallback: string): Error {
    if (error instanceof AuthProviderError) {
      if (error.code === 'RATE_LIMITED') return new Error('Too many requests. Please wait a few minutes and try again.');
      if (error.code === 'INVALID_RECOVERY_LINK' || error.code === 'NO_SESSION') {
        return new Error('Invalid or expired reset link. Please request a new password reset.');
      }
    }
    return new Error(fallback);
  }
}

export const authSessionService = new AuthSessionService();
