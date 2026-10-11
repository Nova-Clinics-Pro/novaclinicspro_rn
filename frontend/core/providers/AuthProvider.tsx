/**
 * Auth Provider Wrapper
 * Wraps the app with ThemeProvider and initializes auth on startup
 */

import React, { useEffect } from 'react';
import { ThemeProvider } from '../theme/useClinicTheme';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { authSessionService } from '../../features/auth/application/auth-session.service';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
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
  }, []);

  return <>{children}</>;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <ThemeProvider clinicType="AYURVEDA">
      <AuthInitializer>{children}</AuthInitializer>
    </ThemeProvider>
  );
};
