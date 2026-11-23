/**
 * Appointment Status Utilities
 * 
 * CLEAN ARCHITECTURE: Domain layer utilities for status-related operations.
 * Used by: UI components for displaying status badges and colors.
 * 
 * DRY IMPROVEMENT: Uses centralized getStatusKey() to normalize status strings.
 */

import { hasTranslation, t } from '../../../../core/localization';

// ============================================
// STATUS NORMALIZATION (DRY)
// ============================================

/**
 * Normalize status string to lowercase for consistent lookups
 * DRY: Single source of truth for status key normalization
 * @param status - Raw status string (may be null, undefined, or mixed case)
 * @returns Normalized lowercase status key
 */
export const getStatusKey = (status: string | null | undefined): string => {
  return (status || '').toLowerCase();
};

// ============================================
// STATUS DISPLAY
// ============================================

/**
 * Get display label for appointment status
 * @param status - Raw status string
 * @returns Human-readable status label
 */
export const getStatusLabel = (status: string): string => {
  const key = getStatusKey(status);
  const translationKey = `clinicAdmin.appointmentStatus.${key}`;
  return hasTranslation(translationKey) ? t(translationKey) : status;
};

/**
 * Get color hex code for appointment status
 * Used for status badges, indicators, and UI theming
 * @param status - Raw status string
 * @returns Hex color code
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    scheduled: '#3B82F6', // Blue
    confirmed: '#10B981', // Green
    in_progress: '#F59E0B', // Amber
    completed: '#059669', // Emerald
    cancelled: '#EF4444', // Red
    no_show: '#6B7280', // Gray
  };
  
  const key = getStatusKey(status);
  return colors[key] || '#6B7280'; // Default gray
};
