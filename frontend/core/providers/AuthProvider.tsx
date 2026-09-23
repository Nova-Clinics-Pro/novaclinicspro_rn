/**
 * Auth Provider Wrapper
 * Wraps the app with ThemeProvider and initializes auth on startup
 */

import React, { useEffect } from 'react';
import { ThemeProvider } from '../theme/useClinicTheme';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bootstrapSession } = useAuth();

  useEffect(() => {
    // Initialize auth on app start
    const initialize = async () => {
      try {
        await useAuthStore.getState().initializeFromStorage();
        await bootstrapSession();
      } finally {
        // AuthProvider owns bootstrap only.  The index route is the single
        // routing owner after the authoritative session context is terminal.
        useAuthStore.getState().completeBootstrap();
      }
    };

    initialize();
  }, [bootstrapSession]);

  return <>{children}</>;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <ThemeProvider clinicType="AYURVEDA">
      <AuthInitializer>{children}</AuthInitializer>
    </ThemeProvider>
  );
};
