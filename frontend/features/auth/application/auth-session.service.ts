/** Canonical application owner for the Auth session lifecycle. */
import { logError } from '../../../core/utils/errorHandler';
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

  private async hydrateCurrentUser(accessToken: string): Promise<AuthUserSession> {
    try {
      const user = await authRepository.getCurrentUser();
      useAuthStore.getState().setCurrentUser(user);
      this.hydratedAccessToken = accessToken;
      return user;
    } catch (firstError: any) {
      if (firstError?.isAxiosError && !firstError?.response) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const user = await authRepository.getCurrentUser();
        useAuthStore.getState().setCurrentUser(user);
        this.hydratedAccessToken = accessToken;
        return user;
      }
      throw firstError;
    }
  }

  private async persistSession(session: AuthProviderSession): Promise<void> {
    await useAuthStore.getState().setTokens(session.accessToken, session.refreshToken);
  }

  async login(email: string, password: string): Promise<AuthUserSession> {
    const session = await supabaseAuthProvider.signInWithPassword(email, password);
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
      await useAuthStore.getState().initializeFromStorage();
      const persistedState = useAuthStore.getState();
      let session = await supabaseAuthProvider.getSession();
      if (!session && persistedState.accessToken && persistedState.refreshToken) {
        restoringPersistedSession = true;
        session = await supabaseAuthProvider.setSession({
          accessToken: persistedState.accessToken,
          refreshToken: persistedState.refreshToken,
        });
      }
      if (!session) return { authenticated: false, session: null, error: 'No active session' };
      await this.persistSession(session);
      const user = await this.hydrateCurrentUser(session.accessToken);
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
    if (!session) {
      if (useAuthStore.getState().isAuthenticated || useAuthStore.getState().accessToken) {
        await useAuthStore.getState().clearSession();
      }
      this.hydratedAccessToken = null;
      return;
    }
    await this.persistSession(session);
    if (this.recoveryMode) return;
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

  async signOutProviderBestEffort(): Promise<void> {
    try {
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

  /** Validates an existing recovery session or establishes one from a web link. */
  async establishRecoverySession(credentials?: RecoveryCredentials): Promise<void> {
    this.recoveryMode = true;
    try {
      const existingSession = await supabaseAuthProvider.getSession();
      if (existingSession) return;
      if (!credentials) {
        throw new AuthProviderError('INVALID_RECOVERY_LINK', 'Invalid or expired reset link. Please request a new password reset.');
      }
      await supabaseAuthProvider.setSession(credentials);
    } catch (error) {
      this.recoveryMode = false;
      throw this.normalizeRecoveryError(error, 'Invalid or expired reset link. Please request a new password reset.');
    }
  }

  async completePasswordRecovery(password: string): Promise<void> {
    try {
      await supabaseAuthProvider.updatePassword(password);
      // Preserve current behavior: a provider sign-out failure is surfaced.
      await supabaseAuthProvider.signOut();
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
