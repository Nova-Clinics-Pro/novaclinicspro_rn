import { getDateLocale } from '../localization/dateLocale';
/**
 * Centralized Date/Time Utilities
 * 
 * SINGLE SOURCE OF TRUTH for all date/time operations in the app.
 * All components MUST import from this file instead of implementing their own.
 * 
 * CRITICAL UNDERSTANDING - BACKEND BEHAVIOR:
 * - When SENDING to backend: Send local time WITHOUT Z suffix (e.g., "2026-02-22T11:00:00")
 * - When RECEIVING from backend: Backend returns UTC time WITH Z suffix (e.g., "2026-02-22T05:30:00Z")
 * - The axios response interceptor (transformDatesFromUTC) converts UTC+Z → local ISO (no Z) automatically
 * - Frontend display code then reads local ISO strings directly
 * 
 * Example flow:
 * 1. User selects 11:00 AM IST
 * 2. Frontend sends: "2026-02-22T11:00:00" (local, no Z) via toLocalTimeISO()
 * 3. Backend stores and returns: "2026-02-22T05:30:00Z" (UTC, with Z)
 * 4. Response interceptor converts: "2026-02-22T05:30:00Z" → "2026-02-22T11:00:00" (local, no Z)
 * 5. Frontend displays: "11:00 AM" (new Date("2026-02-22T11:00:00") treated as local)
 */

// ============================================
// CORE PRINCIPLES
// ============================================
// 1. SENDING TO API: Use toLocalTimeISO() - sends local time WITHOUT Z suffix
// 2. RECEIVING FROM API: Axios interceptor converts UTC+Z → local ISO (no Z) automatically
// 3. DISPLAYING: Use format functions - they call new Date(localISOString) which treats it as local
// 4. VALIDATING: Use Date object methods (.getHours(), .getDay()) - they return local values
// 5. NEVER use .toISOString() for API calls - it sends UTC which breaks the interceptor round-trip

// ============================================
// API COMMUNICATION (Sending to Backend)
// ============================================

/**
 * Convert Date to ISO string with LOCAL time (not UTC)
 * USE THIS when sending appointment times to the backend API
 * 
 * CRITICAL: Backend expects local time WITHOUT timezone suffix
 * The backend will treat this as local clinic time.
 * 
 * Example:
 *   Input: Date representing 11:00 AM IST on Feb 22, 2026
 *   Output: "2026-02-22T11:00:00" (local time, NO Z suffix)
 * 
 * @param date - Date object with local time
 * @returns ISO string with local time (e.g., "2026-02-22T11:00:00")
 */
export const toLocalTimeISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  // NO Z suffix - backend expects local time without timezone indicator
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

/**
 * Convert date to YYYY-MM-DD string using LOCAL date
 * USE THIS for date-only API parameters
 * 
 * @param date - Date object
 * @returns Date string (e.g., "2026-02-22")
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================
// DISPLAY FORMATTING (Showing to Users)
// ============================================

/**
 * Format date for display (e.g., "15 Feb 2026")
 * USE THIS to display dates in the UI
 * 
 * @param dateStr - ISO string from backend or Date object
 * @returns Formatted date string
 */
export const formatDate = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Format short date (e.g., "15 Feb")
 * USE THIS for compact date displays
 * 
 * @param dateStr - ISO string from backend or Date object
 * @returns Formatted short date string
 */
export const formatShortDate = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
};

/**
 * Get day of week (e.g., "Sun", "Mon")
 * USE THIS to display day names
 * 
 * @param dateStr - ISO string from backend or Date object
 * @returns Day of week abbreviation
 */
export const formatDayOfWeek = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(getDateLocale(), { 
      weekday: 'short',
    });
  } catch {
    return '';
  }
};

/**
 * Format time for display (e.g., "04:00 pm")
 * USE THIS to display times in the UI
 * 
 * CRITICAL: Backend returns times in UTC with Z suffix (e.g., "2026-02-22T05:30:00Z")
 * We need to parse as UTC and convert to local time for display.
 * 
 * @param dateStr - ISO string from backend or Date object
 * @returns Formatted time string (e.g., "04:00 pm")
 */
export const formatTime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    // If it's a Date object, use it directly
    if (dateStr instanceof Date) {
      if (isNaN(dateStr.getTime())) return '—';
      return dateStr.toLocaleTimeString(getDateLocale(), {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    
    // Backend returns UTC times with Z suffix (e.g., "2026-02-22T05:30:00Z")
    // Parse as UTC and convert to local time
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    
    return date.toLocaleTimeString(getDateLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

/**
 * Format time from hour and minute numbers
 * USE THIS when you have separate hour/minute values
 * 
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @returns Formatted time string (e.g., "11:00 am", "02:30 pm")
 */
export const formatTimeFromParts = (hour: number, minute: number): string => {
  // Determine AM/PM
  const period = hour >= 12 ? 'pm' : 'am';
  
  // Convert 24-hour to 12-hour format
  // 0 -> 12, 1-11 -> 1-11, 12 -> 12, 13-23 -> 1-11
  let displayHour = hour % 12;
  if (displayHour === 0) {
    displayHour = 12;
  }
  
  // Format with zero-padding
  const hourStr = String(displayHour).padStart(2, '0');
  const minuteStr = String(minute).padStart(2, '0');
  
  return `${hourStr}:${minuteStr} ${period}`;
};

/**
 * Format date and time together (e.g., "15 Feb, 04:00 pm")
 * USE THIS to display full date-time in the UI
 * 
 * @param dateStr - ISO string from backend or Date object
 * @returns Formatted date-time string
 */
export const formatDateTime = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '—';
  const date = formatDate(dateStr);
  const time = formatTime(dateStr);
  if (date === '—' || time === '—') return '—';
  return `${date}, ${time}`;
};

// ============================================
// DURATION FORMATTING
// ============================================

/**
 * Calculate appointment duration in minutes
 * USE THIS to compute duration between two times
 * 
 * @param start - Start time ISO string
 * @param end - End time ISO string
 * @returns Duration in minutes
 */
export const calculateDuration = (start: string, end: string | null): number | null => {
  if (!end) return null;
  
  // Extract time components from ISO strings
  const startMatch = start.match(/T(\d{2}):(\d{2})/);
  const endMatch = end.match(/T(\d{2}):(\d{2})/);
  
  if (startMatch && endMatch) {
    const startMinutes = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
    const endMinutes = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);
    return endMinutes - startMinutes;
  }
  
  // Fallback: use Date parsing
  const startDate = parseBackendDateTime(start);
  const endDate = parseBackendDateTime(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
};

/**
 * Format duration for display (e.g., "60 min" or "1h 30min")
 * USE THIS to display durations in the UI
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

// ============================================
// DATE CONSTRUCTION (Creating Date Objects)
// ============================================

/**
 * Build Date object from separate date and time components
 * USE THIS when combining date picker and time picker values
 * 
 * @param date - Date object for the date part
 * @param time - Date object for the time part (hours/minutes)
 * @returns Date object with combined date and time
 */
export const buildDateTime = (date: Date, time: Date): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hours = time.getHours();
  const minutes = time.getMinutes();
  return new Date(year, month, day, hours, minutes, 0, 0);
};

/**
 * Parse ISO string from backend to Date object
 * USE THIS when receiving date-times from the backend
 * 
 * CRITICAL: Backend returns times in UTC with Z suffix (e.g., "2026-02-22T05:30:00Z")
 * This represents UTC time that needs to be converted to local time for display.
 * 
 * @param isoString - ISO string from backend (e.g., "2026-02-22T05:30:00Z")
 * @returns Date object representing the local time
 */
export const parseBackendDateTime = (isoString: string): Date => {
  // Backend returns UTC times with Z suffix
  // JavaScript Date constructor handles this correctly
  return new Date(isoString);
};

// ============================================
// DATE COMPARISON HELPERS
// ============================================

/**
 * Check if date is today
 * USE THIS for "today" checks in the UI
 * 
 * @param dateStr - ISO string or Date object
 * @returns True if date is today
 */
export const isToday = (dateStr: string | Date): boolean => {
  const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if date is before today (strictly past)
 * USE THIS for past date checks
 * 
 * @param dateStr - ISO string or Date object
 * @returns True if date is before today
 */
export const isBeforeToday = (dateStr: string | Date): boolean => {
  const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if date is after today (strictly future)
 * USE THIS for future date checks
 * 
 * @param dateStr - ISO string or Date object
 * @returns True if date is after today
 */
export const isAfterToday = (dateStr: string | Date): boolean => {
  const date = typeof dateStr === 'string' ? parseBackendDateTime(dateStr) : dateStr;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Get backend day of week from Date object
 * USE THIS for operating hours validation
 * 
 * Backend uses: 0=Monday, 1=Tuesday, ..., 6=Sunday
 * JavaScript uses: 0=Sunday, 1=Monday, ..., 6=Saturday
 * 
 * @param date - Date object
 * @returns Backend day of week (0=Monday, 6=Sunday)
 */
export const getBackendDayOfWeek = (date: Date): number => {
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Monday, 6=Sunday
};

/**
 * Get day name from Date object
 * USE THIS to display day names in validation messages
 * 
 * @param date - Date object
 * @returns Day name (e.g., "Sunday", "Monday")
 */
export const getDayName = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Get time in minutes since midnight
 * USE THIS for operating hours validation
 * 
 * @param date - Date object
 * @returns Minutes since midnight (e.g., 660 for 11:00 AM)
 */
export const getMinutesSinceMidnight = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

// ============================================
// EXTRACTION HELPERS
// ============================================

/**
 * Extract time pattern (HH:MM) from ISO string
 * USE THIS when you need just the time part as a string
 * 
 * @param dateStr - ISO string
 * @returns Time pattern (e.g., "11:00")
 */
export const extractTimePattern = (dateStr: string): string => {
  const timeMatch = dateStr.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  return '00:00';
};

/**
 * Extract hour from ISO string (0-23)
 * USE THIS when you need just the hour value
 * 
 * @param dateStr - ISO string
 * @returns Hour (0-23)
 */
export const extractHour = (dateStr: string): number => {
  const timeMatch = dateStr.match(/T(\d{2}):/);
  return timeMatch ? parseInt(timeMatch[1], 10) : 0;
};

/**
 * Extract minute from ISO string (0-59)
 * USE THIS when you need just the minute value
 * 
 * @param dateStr - ISO string
 * @returns Minute (0-59)
 */
export const extractMinute = (dateStr: string): number => {
  const timeMatch = dateStr.match(/T\d{2}:(\d{2})/);
  return timeMatch ? parseInt(timeMatch[1], 10) : 0;
};

// ============================================
// DEPRECATED - DO NOT USE
// ============================================

/**
 * @deprecated Use buildDateTime() + toLocalTimeISO() instead
 * This function is kept for backward compatibility but should not be used.
 */
export const buildLocalTimeISO = (date: Date, time: Date): string => {
  console.warn('buildLocalTimeISO is deprecated. Use buildDateTime() + toLocalTimeISO() instead.');
  const combined = buildDateTime(date, time);
  return toLocalTimeISO(combined);
};

// ============================================
// DATE RANGE GENERATION
// ============================================

/**
 * Generate an array of Date objects around a center date
 * USE THIS for date sliders and date pickers
 *
 * @param centerDate - The center date
 * @param daysAround - Number of days before and after (default: 7)
 * @returns Array of Date objects
 */
export const generateDateRange = (centerDate: Date, daysAround: number = 7): Date[] => {
  const dates: Date[] = [];
  for (let i = -daysAround; i <= daysAround; i++) {
    const date = new Date(centerDate);
    date.setDate(centerDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};
