/** Platform URL handling only; provider operations remain in AuthSessionService. */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { RecoveryCredentials } from '../application/auth-session.service';

export const INVALID_RECOVERY_LINK = 'Invalid or expired reset link. Please request a new password reset.';

export function getPasswordRecoveryRedirect(): string {
  if (Platform.OS === 'web') return new URL('/reset-password', window.location.origin).toString();
  const callback = Linking.createURL('reset-password');
  if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) return callback;
  // Expo Go does not own the standalone app's custom scheme. Use the existing
  // web route on the same Metro host so email/browser recovery is deterministic.
  const expoUrl = new URL(callback);
  if (!['exp:', 'exps:'].includes(expoUrl.protocol) || !expoUrl.host) {
    throw new Error('Unable to send reset email. Please try again.');
  }
  return `${expoUrl.protocol === 'exps:' ? 'https:' : 'http:'}//${expoUrl.host}/reset-password`;
}

export function parsePasswordRecoveryCallback(url: string): RecoveryCredentials {
  try {
    const parsed = new URL(url);
    const fragment = new URLSearchParams(parsed.hash.slice(1));
    const query = parsed.searchParams;
    const isResetRoute = parsed.pathname === '/reset-password'
      || parsed.pathname === '/--/reset-password'
      || (parsed.hostname === 'reset-password' && ['', '/'].includes(parsed.pathname));
    if (!isResetRoute || ['error', 'error_code', 'error_description'].some(key => fragment.has(key) || query.has(key))) {
      throw new Error(INVALID_RECOVERY_LINK);
    }
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    if (fragment.get('type') !== 'recovery' || !accessToken || !refreshToken) throw new Error(INVALID_RECOVERY_LINK);
    return { accessToken, refreshToken };
  } catch {
    // Never include the URL, token or provider error description in diagnostics.
    throw new Error(INVALID_RECOVERY_LINK);
  }
}
