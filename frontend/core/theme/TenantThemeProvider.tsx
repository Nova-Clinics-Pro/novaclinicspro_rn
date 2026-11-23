import React from 'react';
import { useFeatures } from '../hooks/useFeatures';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { ThemeProvider } from './useClinicTheme';
import { DEFAULT_THEME_CLINIC_TYPE, themeClinicTypeFor } from './themeClinicType';

/**
 * The theme follows the signed-in clinic's type (its palette, per clinic type, comes from the one central theme). Before anyone signs in
 * there is no clinic, so the default palette is used.
 */
export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { clinic_type: clinicType } = useFeatures();
  return (
    <ThemeProvider clinicType={isAuthenticated ? themeClinicTypeFor(clinicType) : DEFAULT_THEME_CLINIC_TYPE}>
      {children}
    </ThemeProvider>
  );
};
