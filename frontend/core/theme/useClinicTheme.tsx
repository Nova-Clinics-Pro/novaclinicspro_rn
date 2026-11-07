/**
 * Theme Hook
 * Provides access to the active clinic theme.
 * In a real app, the clinic type would come from tenant/user configuration.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { SemanticColors } from './semanticColors';
import { getClinicTheme, ClinicType } from './clinicThemes';
import { spacing } from './spacing';
import { typography } from './typography';
import { radii } from './radii';
import { borderWidths } from './borderWidths';
import { sizes } from './sizes';

/**
 * Complete theme object with colors, spacing, typography, and the
 * reusable-appearance token categories (radii/borderWidths/sizes) —
 * every reusable visual value a screen needs must come from here, not
 * a raw local number.
 */
export interface ClinicTheme {
  colors: SemanticColors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
  borderWidths: typeof borderWidths;
  sizes: typeof sizes;
  clinicType: ClinicType;
}

/**
 * Theme Context
 */
const ThemeContext = createContext<ClinicTheme | undefined>(undefined);

/**
 * Theme Provider Props
 */
interface ThemeProviderProps {
  children: ReactNode;
  clinicType?: ClinicType;
}

/**
 * Theme Provider Component
 * Wraps the app and provides theme context.
 * In production, clinicType would come from API/tenant config.
 */
export const ThemeProvider = ({ children, clinicType = 'AYURVEDA' }: ThemeProviderProps) => {
  const theme: ClinicTheme = {
    colors: getClinicTheme(clinicType),
    spacing,
    typography,
    radii,
    borderWidths,
    sizes,
    clinicType,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/**
 * Hook to access the active clinic theme
 * Usage:
 *   const theme = useClinicTheme();
 *   <View style={{ backgroundColor: theme.colors.background.default }} />
 */
export const useClinicTheme = (): ClinicTheme => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if used outside provider (development/testing)
    console.warn('useClinicTheme used outside ThemeProvider, using default Ayurveda theme');
    return {
      colors: getClinicTheme('AYURVEDA'),
      spacing,
      typography,
      radii,
      borderWidths,
      sizes,
      clinicType: 'AYURVEDA',
    };
  }
  return context;
};

/**
 * Helper function to get theme without hook (for use in non-component files)
 */
export const getTheme = (clinicType: ClinicType = 'AYURVEDA'): ClinicTheme => {
  return {
    colors: getClinicTheme(clinicType),
    spacing,
    typography,
    radii,
    borderWidths,
    sizes,
    clinicType,
  };
};
