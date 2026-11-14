/**
 * Auth Provider Wrapper
 * Wraps the app with ThemeProvider and initializes auth on startup
 */

import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { ThemeProvider } from '../theme/useClinicTheme';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { authSessionService } from '../../features/auth/application/auth-session.service';
import { useAuthorizationRefresh } from './useAuthorizationRefresh';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isRecoveryRoute = usePathname() === '/reset-password';
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  useAuthorizationRefresh(isAuthenticated && !isRecoveryRoute);
  useEffect(() => {
    // The reset route establishes its provider-only recovery session. Ordinary
    // bootstrap/subscription must not restore or hydrate a login over it.
    if (isRecoveryRoute) return;

    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    // Bootstrap completes before the sole lifecycle subscription is installed,
    // preventing an INITIAL_SESSION event from competing with startup /auth/me
    // hydration.
    const initialize = async () => {
      try {
        await authSessionService.bootstrap();
      } finally {
        // AuthProvider owns bootstrap only.  The index route is the single
        // routing owner after the authoritative session context is terminal.
        useAuthStore.getState().completeBootstrap();
      }
      if (!disposed) {
        unsubscribe = authSessionService.subscribeToAuthState();
      }
    };

    void initialize();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isRecoveryRoute]);

  return <>{children}</>;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <ThemeProvider clinicType="AYURVEDA">
      <AuthInitializer>{children}</AuthInitializer>
    </ThemeProvider>
  );
};
