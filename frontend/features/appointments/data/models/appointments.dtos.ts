/**
 * Appointments DTOs
 * Data Transfer Objects matching OpenAPI schemas
 * 
 * CLEAN ARCHITECTURE: This file contains ONLY data contracts (interfaces, types, enums).
 * All business logic, formatting, and messaging has been moved to separate utility modules.
 */

// ============================================
// ENUMS & TYPES
// ============================================

/** Appointment status enum */
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/** Appointment type */
export type AppointmentType = 'SINGLE' | 'MULTI';

/** Status options for filtering */
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create an appointment */
export interface AppointmentCreate {
  client_id: string;
  doctor_id?: string | null;
  therapist_ids?: string[];
  room_id?: string | null;
  treatment_id?: string | null;
  appointment_start: string; // ISO datetime
  appointment_end?: string | null; // ISO datetime
  status: string;
  notes?: string | null;
  series_id?: string | null;
  appointment_type?: string | null;
  // Linking fields for multi-day appointments
  episode_id?: string | null;
  case_sheet_id?: string | null;
  treatment_sheet_id?: string | null;
  // Validation flags
  is_past_booking?: boolean;
  is_outside_operating_hours?: boolean;
  is_during_break_time?: boolean;
  is_on_weekly_off?: boolean;
}

/** Request to update an appointment */
export interface AppointmentUpdate {
  doctor_id?: string | null;
  therapist_ids?: string[];
  room_id?: string | null;
  treatment_id?: string | null;
  appointment_start?: string | null;
  appointment_end?: string | null;
  status?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
}

/** Request to reschedule an appointment */
export interface AppointmentReschedule {
  new_start?: string; // ISO datetime
  new_end?: string | null;
  appointment_start?: string; // ISO datetime (legacy)
  appointment_end?: string | null;
  reason?: string | null;
}

/** Parameters for listing appointments */
export interface ListAppointmentsParams {
  status?: string;
  client_id?: string;
  doctor_id?: string;
  therapist_id?: string;
  episode_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

/** Search appointments params */
export interface SearchAppointmentsParams {
  q: string;
  date?: string;
  status?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Staff assignment for multi-therapist support */
export interface StaffAssignment {
  id: string;
  name: string;
}

/** Staff info in responses */
export interface StaffInfo {
  id: string;
  name: string;
  gender?: string;
  role?: string;
}

/** Room info in responses */
export interface RoomInfo {
  id: string;
  name: string;
  capacity?: number;
}

/** Response for an appointment */
export interface AppointmentResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  doctor_id: string | null;
  therapist_ids: string[];
  room_id: string | null;
  treatment_id: string | null;
  appointment_start: string;
  appointment_end: string | null;
  status: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  appointment_type: string | null;
  series_id: string | null;
  session_number?: number;
  total_sessions?: number;
  // Episode fields (optional, nullable)
  episode_id?: string | null;
  episode_title?: string;
  episode_status?: 'ACTIVE' | 'CLOSED';
  /** Doctor dashboard only: where the consultation stands (backend `consultation_progress`). */
  consultation_progress?: 'not_started' | 'in_progress' | 'documents_finalized' | 'closed';
  // Multi-day treatment fields (optional, nullable)
  treatment_sheet_id?: string | null;
  session_id?: string | null;
  // Expanded fields (may be present)
  client_name?: string;
  client_phone?: string;
  doctor_name?: string;
  staff_assignments?: StaffAssignment[] | null;
  treatment_name?: string;
  room_name?: string;
}

/** Enhanced appointment response with expanded fields */
export interface AppointmentWithDetails extends AppointmentResponse {
  client_phone?: string;
  staff?: StaffInfo[];
  session_number?: number;
  total_sessions?: number;
}

/** Paginated response for appointments */
export interface PaginatedAppointmentsResponse {
  items: AppointmentResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Reschedule response */
export interface AppointmentRescheduleResponse {
  id: string;
  original_start: string;
  new_start: string;
  new_end: string | null;
  reason: string | null;
  rescheduled_at: string;
  rescheduled_by: string | null;
}

/** Daily summary for appointments */
export interface AppointmentSummary {
  total: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

/** List appointments response with summary */
export interface AppointmentsListResponse {
  appointments: AppointmentWithDetails[];
  summary: AppointmentSummary;
}

// ============================================
// AVAILABILITY & SCHEDULING DTOs
// ============================================

/** Available slot */
export interface AvailableSlot {
  start: string;
  end: string;
  duration_minutes: number;
  available_staff: StaffInfo[];
  available_rooms: RoomInfo[];
}

/** Available slots request */
export interface AvailableSlotsRequest {
  start_date: string;
  end_date: string;
  treatment_id?: string;
  duration_minutes: number;
  client_gender?: string;
}

/** Available slots response */
export interface AvailableSlotsResponse {
  slots: AvailableSlot[];
}

/** Available therapist for multi-slot */
export interface AvailableTherapist {
  id: string;
  name: string;
  gender?: string;
  role: string;
  availability_score: number;
  available_days: number;
  unavailable_dates: string[];
  qualifications?: string[];
}

// ============================================
// VALIDATION DTOs
// ============================================

/** Validation request */
export interface ValidateAppointmentRequest {
  client_id: string;
  staff_id: string;
  room_id?: string;
  appointment_start: string;
  appointment_end: string;
}

/** Conflict info */
export interface ConflictInfo {
  conflict_id?: string;
  conflict_type: string;
  message: string;
}

/** Validation response */
export interface ValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: {
    staff_conflict?: ConflictInfo;
    room_conflict?: ConflictInfo;
  } | null;
}

/** Alternative slot for conflict resolution */
export interface AlternativeSlot {
  start: string;
  end: string;
  staff_id: string;
  staff_name: string;
  room_id?: string;
  room_name?: string;
  score: number;
}

// ============================================
// MULTI-DAY THERAPY DTOs
// ============================================

/** Session in therapy plan - matches API response */
export interface TherapyPlanSession {
  session_number: number;
  appointment_start: string;
  appointment_end: string;
  staff_id: string | null;
  room_id: string | null;
  is_conflicted: boolean;
  conflict?: {
    day_index: number;
    requested_time: string;
    conflict_type: string;
    message: string;
    alternative_slots: Array<{
      start: string;
      end: string;
      available_staff: Array<{
        staff_id: string;
        full_name: string;
        staff_type: string;
      }>;
      available_rooms: Array<{
        room_id: string;
        name: string;
        room_type: string;
      }>;
      score: number;
    }>;
  } | null;
}

/** Therapy plan request */
export interface TherapyPlanRequest {
  client_id: string;
  treatment_id: string;
  doctor_id?: string;
  therapist_ids: string[];
  start_date: string;
  duration_days: number;
  // Per THERAPY_PLAN_TIME_HANDLING.md: preferred_time_hour is OPTIONAL
  // If not provided, backend extracts time from start_date
  preferred_time_hour?: number;
  client_gender?: string;
}

/** Therapy plan response - matches API spec */
export interface TherapyPlanResponse {
  series_id: string;
  client_id: string;
  client_name?: string;  // Optional - returned by some API versions
  treatment_id: string;
  start_date: string;
  duration_days: number;
  has_conflicts: boolean;
  sessions: TherapyPlanSession[];
  metadata: {
    total_sessions: number;
    conflicted_sessions: number;
    available_sessions: number;
  };
}

/** Bulk create appointment item */
export interface BulkAppointmentItem {
  client_id: string;
  doctor_id?: string;
  therapist_ids?: string[];
  room_id?: string;
  treatment_id: string;
  appointment_start: string;
  appointment_end: string;
  status: string;
  session_number: number;
  notes?: string;
  // Linking fields for multi-day appointments
  episode_id?: string;
  case_sheet_id?: string;
  treatment_sheet_id?: string;
  // Validation flags
  is_past_booking?: boolean;
  is_outside_operating_hours?: boolean;
  is_during_break_time?: boolean;
  is_on_weekly_off?: boolean;
}

/** Bulk create request */
export interface BulkCreateRequest {
  series_id: string;
  episode_id?: string; // When present, appointments are linked to treatment sheet rows inline
  appointments: BulkAppointmentItem[];
}

/** Created appointment summary */
export interface CreatedAppointmentSummary {
  id: string;
  series_id: string;
  session_number: number;
  appointment_start: string;
  status: string;
  episode_id?: string | null;
}

/** Bulk create response */
export interface BulkCreateResponse {
  created_appointments: CreatedAppointmentSummary[];
  total_created: number;
}
