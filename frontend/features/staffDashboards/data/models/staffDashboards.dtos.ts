/**
 * Staff Dashboards DTOs
 * Data Transfer Objects matching OpenAPI schemas for role-specific dashboards
 */

// ============================================
// DOCTOR DASHBOARD
// ============================================

/** Doctor appointment item */
export interface DoctorAppointmentItem {
  id: string;
  client_id: string;
  client_name: string | null;
  appointment_start: string;
  appointment_end: string | null;
  status: string;
  notes: string | null;
  treatment_name: string | null;
  room_name: string | null;
  staff_name?: string | null;
  doctor_id?: string | null;
  doctor_name?: string | null;
  therapist_ids?: string[];
  episode_id?: string | null;
  episode_title?: string | null;
  episode_status?: string | null;
}

/** Doctor dashboard response */
export interface DoctorDashboardResponse {
  on_leave_today: boolean;
  appointments: DoctorAppointmentItem[];
  total_count: number;
}

// ============================================
// THERAPIST DASHBOARD
// ============================================

/** Therapist session item */
export interface TherapistSessionItem {
  id: string;
  treatment_sheet_id: string;
  client_id: string;
  client_name: string | null;
  session_date: string;
  session_number: number;
  treatment_name: string | null;
  status: string;
  completed_at: string | null;
}

/** Therapist dashboard response */
export interface TherapistDashboardResponse {
  on_leave_today: boolean;
  sessions: TherapistSessionItem[];
  total_count: number;
}

// ============================================
// FRONTDESK DASHBOARD
// ============================================

/** Frontdesk appointment item */
export interface FrontdeskAppointmentItem {
  id: string;
  client_id: string;
  client_name: string | null;
  doctor_id: string | null;
  therapist_ids: string[];
  staff_name: string | null;
  room_id: string | null;
  room_name: string | null;
  treatment_name: string | null;
  appointment_start: string;
  appointment_end: string | null;
  status: string;
  notes: string | null;
}

/** Frontdesk dashboard filters */
export interface FrontdeskDashboardFilters {
  doctor_id: string | null;
  room_id: string | null;
  status: string | null;
}

/** Frontdesk dashboard response */
export interface FrontdeskDashboardResponse {
  on_leave_today: boolean;
  appointments: FrontdeskAppointmentItem[];
  total_count: number;
  filters_applied: FrontdeskDashboardFilters;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** 
 * Format time for display - uses centralized utility
 * @deprecated Use formatTime from core/utils/dateTimeUtils.ts instead
 */
export const formatTime = (dateStr: string | null): string => {
  // Re-export from centralized utility
  const { formatTime: centralizedFormatTime } = require('../../../../core/utils/dateTimeUtils');
  return centralizedFormatTime(dateStr);
};

/** 
 * Format date for display - uses centralized utility
 * @deprecated Use formatShortDate from core/utils/dateTimeUtils.ts instead
 */
export const formatDate = (dateStr: string | null): string => {
  // Re-export from centralized utility
  const { formatShortDate } = require('../../../../core/utils/dateTimeUtils');
  return formatShortDate(dateStr);
};

/** Get status color */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    scheduled: '#3B82F6',
    confirmed: '#10B981',
    in_progress: '#F59E0B',
    completed: '#059669',
    cancelled: '#EF4444',
    no_show: '#6B7280',
    pending: '#F59E0B',
  };
  return colors[status?.toLowerCase()] || '#6B7280';
};

/** Get status label */
export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    pending: 'Pending',
  };
  return labels[status?.toLowerCase()] || status;
};

/** Calculate duration in minutes */
export const calculateDuration = (start: string, end: string | null): number | null => {
  if (!end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
};

/** Format duration for display */
export const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours}h ${mins}m`;
};

// ============================================
// ADMIN DASHBOARD - MULTI-DAY TREATMENTS (F2.5)
// ============================================

/** Treatment statistics for admin dashboard */
export interface TreatmentStatsResponse {
  active_series: number;
  unscheduled_sheets: number;
  paused_series: number;
  completed_this_month: number;
}

/** Pending proposal item for admin dashboard */
export interface PendingProposalItem {
  id: string;
  treatment_sheet_id: string;
  treatment_name: string;
  client_id: string;
  client_name: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  total_days: number;
  estimated_cost: number;
}

/** Today's session statistics for admin dashboard */
export interface TodaySessionStatsResponse {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
}

/** Paused series item for admin dashboard */
export interface PausedSeriesItem {
  id: string;
  treatment_sheet_id: string;
  treatment_name: string;
  client_id: string;
  client_name: string;
  pause_reason: string;
  paused_at: string;
  paused_days_ago: number;
  remaining_days: number;
  completed_days: number;
  total_days: number;
}


// ============================================
// THERAPIST DASHBOARD — NEW ROW_ID-BASED FLOW
// ============================================

/**
 * Sessions API response for the new therapist sessions endpoint.
 * Each item carries row_id as the PRIMARY identifier for completion.
 */
export interface TherapistSessionsResponse {
  items: TherapistSessionItemV2[];
  total: number;
  next_cursor: string | null;
}

/**
 * A single session entry returned by the new sessions endpoint.
 *
 * For multi-day treatments: row_id is populated, appointment_id may also be present.
 * For single-day appointments: row_id is null, appointment_id identifies the appointment.
 *
 * COMPLETION RULES:
 *   - row_id present  → use completeSheetRowApi(row_id)
 *   - row_id null     → use updateAppointmentStatusApi(appointment_id, 'COMPLETED')
 */
export interface TherapistSessionItemV2 {
  /** Treatment sheet row id — present for multi-day treatments, null for single-day */
  row_id: string | null;
  /** Appointment id — always present, used for single-day completion */
  appointment_id: string | null;
  /**
   * Parent treatment sheet id — present for multi-day treatments.
   * Used for query invalidation after start/complete.
   */
  treatment_sheet_id: string | null;
  /** Session record id (may be absent) */
  id?: string | null;
  client_name: string | null;
  room_id?: string | null;
  room_name?: string | null;
  treatment_name: string | null;
  treatment_description?: string | null;
  medicines_given?: string | null;
  instructions?: string | null;
  day_number: number | null;
  /** Total number of sessions in the series (e.g. 21 for a 21-day plan) */
  total_sessions: number | null;
  /** ISO date string for the session date (YYYY-MM-DD) */
  session_date: string | null;
  /** ISO datetime string — appointment start (e.g. "2026-03-21T10:00:00+05:30") */
  scheduled_time: string | null;
  /** ISO datetime string — appointment end (e.g. "2026-03-21T11:00:00+05:30") */
  scheduled_end_time: string | null;
  /** Alias used by some dashboard payloads for appointment start. */
  session_time?: string | null;
  /** Logged-in therapist's display name */
  therapist_name: string | null;
  /** All therapist names assigned to this appointment (comma-separated or array) */
  all_therapist_names: string[] | null;
  /**
   * Row-level execution status from TreatmentRowOrderResponse.
   * Values: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
   * For single-day appointments this mirrors the appointment status.
   */
  status: string;
  /** ISO datetime UTC — set when therapist calls start-session. Null until started. */
  started_at: string | null;
  /** Staff id of the therapist who started the session. */
  started_by_staff_id: string | null;
}

// ============================================
// KPI
// ============================================

/** Query parameters for the KPI endpoint */
export interface KpiQueryParams {
  period?: '7d' | '30d' | '90d';
  /** ISO date string — used for custom date range */
  start_date?: string;
  /** ISO date string — used for custom date range */
  end_date?: string;
}

/** KPI metrics response */
export interface TherapistKpisResponse {
  completion_rate: number;
  retention_rate: number;
  satisfaction_score: number | null;
  rating_distribution: Record<string, number>;
  period_label: string;
}

// ============================================
// SHEET ROW USABLES
// ============================================

/** Response from GET /treatment-sheets/rows/{row_id}/usables */
export interface SheetRowUsablesResponse {
  items: SheetRowUsable[];
}

/** A single pre-configured material/consumable for a treatment sheet row */
export interface SheetRowUsable {
  inventory_item_id: string | null;
  material_name: string;
  material_code: string | null;
  quantity_used: number;
  unit: string;
  ml_per_unit: number;
  category: 'oil' | 'medicine' | 'disposable' | 'other';
}

// ============================================
// SHEET ROW COMPLETION
// ============================================

/**
 * Request body for POST /treatment-sheets/rows/{row_id}/complete.
 * MUST NOT include completed_by_staff_id or completed_at — the server derives these.
 */
export interface CompleteSheetRowRequest {
  materials: CompleteMaterial[];
}

/** A single material entry in the completion payload */
export interface CompleteMaterial {
  inventory_item_id?: string | null;
  material_name: string;
  material_code?: string | null;
  /** Must be > 0 and <= 10000 */
  quantity_used: number;
  unit: string;
  /** Must be > 0 */
  ml_per_unit: number;
  category: 'oil' | 'medicine' | 'disposable' | 'other';
}

/** Response from POST /treatment-sheets/rows/{row_id}/complete */
export interface CompleteSheetRowResponse {
  row_id: string;
  status: string;
}

// ============================================
// SESSION NON-EXECUTION (T-BE-E.4a)
// ============================================

/**
 * Governed reason vocabulary for why a scheduled Session did not execute.
 * Exact backend values — SessionNonExecutionReason (app/domain/common/enums.py).
 */
export type SessionNonExecutionReasonCode =
  | 'PATIENT_NO_SHOW'
  | 'PATIENT_CANCELLED'
  | 'CLINIC_CANCELLED'
  | 'CLINICAL_HOLD'
  | 'OTHER';

/**
 * Request body for POST /clinic/treatment-sheets/rows/{row_id}/non-execution.
 * `recorded_by_staff_id` is intentionally absent — derived server-side from the JWT.
 * `reason_text` is required by the backend only when reason_code is 'OTHER'.
 */
export interface RecordSessionNonExecutionRequest {
  reason_code: SessionNonExecutionReasonCode;
  reason_text?: string | null;
}

/**
 * Response from POST /clinic/treatment-sheets/rows/{row_id}/non-execution —
 * field-for-field passthrough of what the backend service returns.
 *
 * NOTE (T-FE-E.3 Engineering Truth finding): this is the ONLY place these
 * three facts are ever returned to the frontend. Neither TherapistSessionItemV2
 * (the get_therapist_sessions list schema) nor the therapist assigned-row detail
 * schema carries non_execution_reason_code/text, and non-execution does not
 * mutate row status server-side — so this result cannot be durably re-displayed
 * after the query cache refetches. See TherapistDashboardScreen.tsx for how
 * this is rendered honestly (transient, not persisted-and-faked).
 */
export interface RecordSessionNonExecutionResponse {
  id: string;
  non_execution_reason_code: SessionNonExecutionReasonCode | null;
  non_execution_reason_text: string | null;
  status: string | null;
}
