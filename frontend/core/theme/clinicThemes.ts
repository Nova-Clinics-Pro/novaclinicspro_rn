/**
 * Clinic-Type Theme Definitions
 * Each clinic type has its own color palette mapped to semantic tokens.
 * This enables multi-clinic theming while maintaining a consistent API.
 */

import { SemanticColors } from './semanticColors';

/**
 * Ayurveda Clinic Theme
 * Calm, clinical, trustworthy with subtle herbal influence
 * Primary: Muted herbal green (#2F6F4E)
 * Secondary: Warm earthy accent (#C28A4B)
 * Background: Off-white/cream (#F8F4EC)
 */
export const ayurvedaTheme: SemanticColors = {
  primary: {
    default: '#2F6F4E', // Muted herbal green
    light: '#4A9370', // Lighter variant
    dark: '#1F5038', // Darker variant
    onPrimary: '#FFFFFF', // White text on primary
    pressed: '#265A3E', // Pressed state (darker)
    disabled: '#8CB3A1', // Desaturated version
    soft: '#E8F3EE', // Very light, subtle background
  },

  secondary: {
    default: '#926431', // Warm earthy accent
    light: '#D5A46F', // Lighter variant
    dark: '#A67339', // Darker variant
    onSecondary: '#FFFFFF',
    pressed: '#B07D42',
    disabled: '#D9C2A5',
  },

  background: {
    default: '#F8F4EC', // Off-white/cream base
    elevated: '#FFFFFF', // Pure white for elevated cards
    muted: '#EFE9DD', // Slightly darker cream
    inverse: '#2C3E36', // Dark green for dark sections
  },

  surface: {
    default: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#F8F4EC',
    overlay: 'rgba(47, 111, 78, 0.5)', // Primary with opacity
  },

  border: {
    default: '#D9D1C1', // Soft border
    subtle: '#E8E3D5', // Very subtle
    strong: '#B8AD96', // More pronounced
    focus: '#2F6F4E', // Primary color for focus
  },

  text: {
    primary: '#1C2B23', // Dark green-gray
    secondary: '#556B5E', // Medium green-gray
    tertiary: '#5D6B63', // Light green-gray
    disabled: '#A3B5AC', // Very light
    inverse: '#F8F4EC', // Cream on dark backgrounds
    onPrimary: '#FFFFFF',
    link: '#2F6F4E', // Primary color for links
  },

  feedback: {
    success: '#2F6F4E', // Use primary for success (herbal green)
    successLight: '#E8F3EE',
    warning: '#946524', // Soft amber
    warningLight: '#FDF3E5',
    error: '#B14C48', // Desaturated red/brown-red
    errorLight: '#FDEEED',
    info: '#487388', // Muted blue
    infoLight: '#EDF5F9',
  },

  interactive: {
    hover: 'rgba(47, 111, 78, 0.08)',
    pressed: 'rgba(47, 111, 78, 0.12)',
    focus: 'rgba(47, 111, 78, 0.12)',
    disabled: 'rgba(47, 111, 78, 0.38)',
  },
};

/**
 * General Medicine Clinic Theme
 * Professional, clean, medical blue palette
 */
export const generalMedicineTheme: SemanticColors = {
  primary: {
    default: '#2563EB', // Medical blue
    light: '#60A5FA',
    dark: '#1E40AF',
    onPrimary: '#FFFFFF',
    pressed: '#1D4ED8',
    disabled: '#93C5FD',
    soft: '#EFF6FF',
  },

  secondary: {
    default: '#7C3AED', // Purple accent
    light: '#A78BFA',
    dark: '#5B21B6',
    onSecondary: '#FFFFFF',
    pressed: '#6D28D9',
    disabled: '#C4B5FD',
  },

  background: {
    default: '#F9FAFB', // Light gray
    elevated: '#FFFFFF',
    muted: '#F3F4F6',
    inverse: '#111827',
  },

  surface: {
    default: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#F9FAFB',
    overlay: 'rgba(37, 99, 235, 0.5)',
  },

  border: {
    default: '#E5E7EB',
    subtle: '#F3F4F6',
    strong: '#D1D5DB',
    focus: '#2563EB',
  },

  text: {
    primary: '#111827',
    secondary: '#686E7C',
    tertiary: '#666F7F',
    disabled: '#D1D5DB',
    inverse: '#F9FAFB',
    onPrimary: '#FFFFFF',
    link: '#2563EB',
  },

  feedback: {
    success: '#0B815A',
    successLight: '#ECFDF5',
    warning: '#9E6506',
    warningLight: '#FFFBEB',
    error: '#DB1313',
    errorLight: '#FEF2F2',
    info: '#0D64F4',
    infoLight: '#EFF6FF',
  },

  interactive: {
    hover: 'rgba(37, 99, 235, 0.08)',
    pressed: 'rgba(37, 99, 235, 0.12)',
    focus: 'rgba(37, 99, 235, 0.12)',
    disabled: 'rgba(37, 99, 235, 0.38)',
  },
};

/**
 * Dental Clinic Theme
 * Clean, bright, turquoise/teal palette
 */
export const dentalTheme: SemanticColors = {
  primary: {
    default: '#077B97', // Turquoise
    light: '#22D3EE',
    dark: '#0E7490',
    onPrimary: '#FFFFFF',
    pressed: '#075985',
    disabled: '#A5F3FC',
    soft: '#ECFEFF',
  },

  secondary: {
    default: '#047D91', // Cyan
    light: '#67E8F9',
    dark: '#0891B2',
    onSecondary: '#FFFFFF',
    pressed: '#0E7490',
    disabled: '#CFFAFE',
  },

  background: {
    default: '#F0FDFF', // Very light cyan
    elevated: '#FFFFFF',
    muted: '#E0F9FF',
    inverse: '#164E63',
  },

  surface: {
    default: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#F0FDFF',
    overlay: 'rgba(8, 145, 178, 0.5)',
  },

  border: {
    default: '#CFF9FE',
    subtle: '#E5FBFF',
    strong: '#A0E7F4',
    focus: '#0891B2',
  },

  text: {
    primary: '#083344',
    secondary: '#155E75',
    tertiary: '#0E7490',
    disabled: '#A5F3FC',
    inverse: '#F0FDFF',
    onPrimary: '#FFFFFF',
    link: '#077B97',
  },

  feedback: {
    success: '#0B815A',
    successLight: '#ECFDF5',
    warning: '#9E6506',
    warningLight: '#FFFBEB',
    error: '#DB1313',
    errorLight: '#FEF2F2',
    info: '#077B97',
    infoLight: '#ECFEFF',
  },

  interactive: {
    hover: 'rgba(8, 145, 178, 0.08)',
    pressed: 'rgba(8, 145, 178, 0.12)',
    focus: 'rgba(8, 145, 178, 0.12)',
    disabled: 'rgba(8, 145, 178, 0.38)',
  },
};

/**
 * Physiotherapy Clinic Theme
 * Energetic, warm, orange/coral palette
 */
export const physiotherapyTheme: SemanticColors = {
  primary: {
    default: '#C3490A', // Vibrant orange
    light: '#FB923C',
    dark: '#C2410C',
    onPrimary: '#FFFFFF',
    pressed: '#B34009',
    disabled: '#FDBA74',
    soft: '#FFF7ED',
  },

  secondary: {
    default: '#DC2424', // Red accent
    light: '#F87171',
    dark: '#B91C1C',
    onSecondary: '#FFFFFF',
    pressed: '#991B1B',
    disabled: '#FCA5A5',
  },

  background: {
    default: '#FFF8F1', // Very light orange
    elevated: '#FFFFFF',
    muted: '#FFEDD5',
    inverse: '#7C2D12',
  },

  surface: {
    default: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#FFF8F1',
    overlay: 'rgba(234, 88, 12, 0.5)',
  },

  border: {
    default: '#FED7AA',
    subtle: '#FFEDD5',
    strong: '#FDBA74',
    focus: '#EA580C',
  },

  text: {
    primary: '#431407',
    secondary: '#7C2D12',
    tertiary: '#C0400C',
    disabled: '#FDBA74',
    inverse: '#FFF8F1',
    onPrimary: '#FFFFFF',
    link: '#C3490A',
  },

  feedback: {
    success: '#0B815A',
    successLight: '#ECFDF5',
    warning: '#9E6506',
    warningLight: '#FFFBEB',
    error: '#D52222',
    errorLight: '#FEF2F2',
    info: '#0D64F4',
    infoLight: '#EFF6FF',
  },

  interactive: {
    hover: 'rgba(234, 88, 12, 0.08)',
    pressed: 'rgba(234, 88, 12, 0.12)',
    focus: 'rgba(234, 88, 12, 0.12)',
    disabled: 'rgba(234, 88, 12, 0.38)',
  },
};

/**
 * Clinic Type Enum
 */
export type ClinicType = 'AYURVEDA' | 'GENERAL_MEDICINE' | 'DENTAL' | 'PHYSIOTHERAPY';

/**
 * Get theme for a specific clinic type
 */
export const getClinicTheme = (clinicType: ClinicType = 'AYURVEDA'): SemanticColors => {
  switch (clinicType) {
    case 'AYURVEDA':
      return ayurvedaTheme;
    case 'GENERAL_MEDICINE':
      return generalMedicineTheme;
    case 'DENTAL':
      return dentalTheme;
    case 'PHYSIOTHERAPY':
      return physiotherapyTheme;
    default:
      return ayurvedaTheme; // Default fallback
  }
};
