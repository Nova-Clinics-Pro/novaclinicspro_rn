/**
 * Supabase Auth provider adapter.
 *
 * This is the sole feature-level owner of Supabase Auth SDK envelopes.  The
 * application session coordinator receives only the normalized contracts below.
 */
import { supabase } from '../../../../core/api/supabaseClient';

export interface AuthProviderSession {
  accessToken: string;
  refreshToken: string;
}

export type AuthProviderErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_UNCONFIRMED'
  | 'RATE_LIMITED'
  | 'NO_SESSION'
  | 'INVALID_RECOVERY_LINK'
  | 'PROVIDER_FAILURE';

export class AuthProviderError extends Error {
  constructor(public readonly code: AuthProviderErrorCode, message: string) {
    super(message);
    this.name = 'AuthProviderError';
  }
}

function normalizeProviderError(message: string): AuthProviderError {
  if (message.includes('Invalid login credentials')) {
    return new AuthProviderError('INVALID_CREDENTIALS', 'Invalid email or password. Please check your credentials and try again.');
  }
  if (message.includes('Email not confirmed')) {
    return new AuthProviderError('EMAIL_UNCONFIRMED', 'Please verify your email address before logging in.');
  }
  if (message.includes('Too many requests')) {
    return new AuthProviderError('RATE_LIMITED', 'Too many login attempts. Please wait a few minutes and try again.');
  }
  return new AuthProviderError('PROVIDER_FAILURE', 'Authentication service is unavailable. Please try again.');
}

function toSession(session: { access_token: string; refresh_token: string } | null): AuthProviderSession | null {
  if (!session) return null;
  return { accessToken: session.access_token, refreshToken: session.refresh_token };
}

export class SupabaseAuthProvider {
  async signInWithPassword(email: string, password: string): Promise<AuthProviderSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw normalizeProviderError(error.message);
    const session = toSession(data.session);
    if (!session) throw new AuthProviderError('NO_SESSION', 'No session returned from login');
    return session;
  }

  async getSession(): Promise<AuthProviderSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw normalizeProviderError(error.message);
    return toSession(data.session);
  }

  async setSession(session: AuthProviderSession): Promise<AuthProviderSession> {
    const { data, error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (error) throw normalizeProviderError(error.message);
    const restored = toSession(data.session);
    if (!restored) throw new AuthProviderError('NO_SESSION', 'Authentication service did not restore a session');
    return restored;
  }

  async refreshSession(): Promise<AuthProviderSession> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw normalizeProviderError(error.message);
    const session = toSession(data.session);
    if (!session) throw new AuthProviderError('NO_SESSION', 'No session returned from refresh');
    return session;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw normalizeProviderError(error.message);
  }

  async resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw normalizeProviderError(error.message);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw normalizeProviderError(error.message);
  }

  subscribe(listener: (session: AuthProviderSession | null) => void): () => void {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(toSession(session));
    });
    return () => subscription.subscription.unsubscribe();
  }
}

export const supabaseAuthProvider = new SupabaseAuthProvider();
