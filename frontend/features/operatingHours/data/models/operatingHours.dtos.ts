/**
 * Operating Hours DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

/** Days of week (0 = Monday, 6 = Sunday) */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
] as const;

/** Operating hour status options */
export const OPERATING_HOUR_STATUS = [
  'active',
  'inactive',
  'seasonal',
  'temporary',
] as const;

export type OperatingHourStatus = typeof OPERATING_HOUR_STATUS[number];

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create operating hours */
export interface OperatingHourCreate {
  day_of_week: number; // 0-6 (Monday-Sunday)
  is_open: boolean;
  open_time?: string | null; // HH:MM:SS or HH:MM format
  close_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  status?: string;
}

/** Request to update operating hours */
export interface OperatingHourUpdate {
  day_of_week?: number | null;
  is_open?: boolean | null;
  open_time?: string | null;
  close_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  status?: string | null;
  is_active?: boolean | null;
}

/** Parameters for listing operating hours */
export interface ListOperatingHoursParams {
  is_active?: boolean;
  day_of_week?: number;
  skip?: number;
  limit?: number;
  lang?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Response for an operating hour entry */
export interface OperatingHourResponse {
  id: string;
  tenant_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  day_name: string; // Computed: "Monday", "Tuesday", etc.
}

/** Paginated response for operating hours */
export interface PaginatedOperatingHoursResponse {
  items: OperatingHourResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Legacy named-day schedule consumed by the onboarding confirmation screen. */
export interface OnboardingOperatingHoursSourceItem {
  day: string;
  is_open: boolean;
  open_time?: string;
  close_time?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get day label from day_of_week number */
export const getDayLabel = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Unknown';
};

/** Get short day label from day_of_week number */
export const getDayShortLabel = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.short || '?';
};

/** Format time string for display (HH:MM) */
export const formatTimeForDisplay = (time: string | null): string => {
  if (!time) return '--:--';
  // Handle both HH:MM:SS and HH:MM formats
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
};

/** Parse time string to Date for comparison */
export const parseTimeToMinutes = (time: string | null): number => {
  if (!time) return 0;
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};
