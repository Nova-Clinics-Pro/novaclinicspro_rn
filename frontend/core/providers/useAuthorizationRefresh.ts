import { useEffect } from 'react';
import { AppState } from 'react-native';
import { authSessionService } from '../../features/auth/application/auth-session.service';

/** How often a visible, signed-in app re-reads the user's roles and permissions (the service throttles further). */
export const AUTHORIZATION_REFRESH_INTERVAL_MS = 60_000;

/**
 * Keeps the signed-in user's roles and permissions current: when the app comes back to the foreground (React Native
 * `active`, and the page becoming visible on the web) and on a timer while it is in the foreground. See
 * `AuthSessionService.refreshAuthorization` for why and for the safety rules.
 */
export const useAuthorizationRefresh = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;

    const refresh = () => void authSessionService.refreshAuthorization();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, AUTHORIZATION_REFRESH_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [enabled]);
};
