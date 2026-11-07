/**
 * Treatment Orders DTOs
 *
 * TreatmentOrderResponse is the NEW response shape returned by the treatment-order
 * endpoints. It is DISTINCT from TreatmentSheetResponse (which covers the
 * documentation lifecycle and is unchanged).
 *
 * Key separation:
 *   TreatmentSheetResponse  — documentation lifecycle (DRAFT → FINAL → SIGNED)
 *   TreatmentOrderResponse  — execution lifecycle    (DRAFT → ORDERED → SCHEDULED
 *                                                      → IN_PROGRESS → COMPLETED
 *                                                      → CANCELLED)
 */

// ============================================
// EXECUTION LIFECYCLE TYPES
// ============================================

/**
 * Execution state of the treatment order.
 * Driven entirely by the backend — never derive on the frontend.
 */
export type TreatmentOrderState =
  | 'DRAFT'
  | 'ORDERED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Scheduling completeness of the order.
 * null when is_order = false (sheet not yet sent to scheduling).
 */
export type SchedulingStatus =
  | 'PENDING_SCHEDULING'
  | 'PARTIALLY_SCHEDULED'
  | 'FULLY_SCHEDULED'
  /** Phase 4 (R4) · T-D.1 (ADR-R4-01) — Admin placed a temporary hold on
   * scheduling. Does not affect `state`, which stays 'ORDERED'. */
  | 'ON_HOLD'
  | null;

/** Phase 4 (R4) · T-C.2/T-C.4 (ADR-R4-02) — the single business lifecycle
 * status resolved server-side. One of 11 values, or null while the still-open
 * T-B.2 edge case (`lifecycle_status_unresolved`) applies. */
export type TreatmentLifecycleStatus =
  | 'recommended'
  | 'needs_scheduling'
  | 'scheduling_on_hold'
  | 'scheduling_denied'
  | 'scheduled_awaiting_treatment_sheet'
  | 'treatment_sheet_draft'
  | 'released_to_therapist'
  | 'in_therapy'
  | 'needs_clinical_review'
  | 'under_clinical_review'
  | 'treatment_complete'
  | null;

/**
 * Documentation lifecycle status (aliased from the existing sheet status column).
 * Documentation is complete when value is 'FINAL' or 'SIGNED'.
 */
export type DocumentationStatus = 'DRAFT' | 'FINAL' | 'SIGNED';

/** Completion progress of the session rows. */
export type CompletionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

/** Row-level execution status. */
export type TreatmentRowStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// ============================================
// ROW RESPONSE
// ============================================

/**
 * A single row in a TreatmentOrderResponse.
 * treatment_sheet_id lives on the parent — not repeated per row.
 */
export interface TreatmentRowOrderResponse {
  /** row_id — primary identifier for start/complete operations */
  id: string;
  day_number: number;
  status: TreatmentRowStatus;
  assigned_staff_id: string | null;
  /** ISO date string in tenant local time (YYYY-MM-DD) */
  scheduled_date: string | null;
  /** "HH:MM:SS" in tenant local time */
  scheduled_time: string | null;
  /** ISO datetime UTC — when the row was scheduled */
  scheduled_at: string | null;
  scheduled_by_staff_id: string | null;
  /** ISO datetime UTC — when the session was started */
  started_at: string | null;
  started_by_staff_id: string | null;
  /** ISO datetime UTC — when the session was completed */
  completed_at: string | null;
  completed_by_staff_id: string | null;
  treatment_name: string | null;
  medicines_text: string | null;
  instructions_text: string | null;
}

// ============================================
// MAIN RESPONSE
// ============================================

/** Full treatment order response — returned by all order endpoints. */
export interface TreatmentOrderResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  case_sheet_id?: string | null;
  episode_id: string | null;
  /** Execution lifecycle state — read directly, never derive. */
  state: TreatmentOrderState;
  /** True once the sheet has been sent to scheduling via send-to-scheduling. */
  is_order: boolean;
  /** Scheduling completeness — null when is_order = false. */
  scheduling_status: SchedulingStatus;
  /** Documentation lifecycle — complete when 'FINAL' | 'SIGNED'. */
  documentation_status: DocumentationStatus;
  planned_sessions: number | null;
  frequency: string | null;
  preferred_time_window: string | null;
  order_notes: string | null;
  /** Therapy the doctor recommended (free text). Empty for legacy row-based sheets. */
  recommended_therapy?: string | null;
  /** ISO datetime UTC — when send-to-scheduling was called. */
  ordered_at: string | null;
  /**
   * Optimistic concurrency token.
   * All state-mutating endpoints require If-Match: <version> header.
   * On 409 VERSION_CONFLICT: refetch to get current_version, then re-trigger.
   */
  version: number;
  rows: TreatmentRowOrderResponse[];
  scheduled_count: number;
  completed_count: number;
  active_row_count: number;
  progress_percentage: number;
  completion_status: CompletionStatus;
  created_at: string | null;
  updated_at: string | null;
  // ── Denormalised display fields (returned by list endpoint) ──────────────
  client_name?: string | null;
  ordered_by_name?: string | null;
  duration_days?: number | null;
  /** Staff ID of the doctor who created/ordered the sheet */
  recorded_by_staff_id?: string | null;

  // ── Phase 4 (R4) additive fields (T-C.3/T-C.4/T-D.1) ─────────────────────
  /** Presence (not a boolean) is the release marker (ADR-R4-06). Whole-sheet only. */
  released_at?: string | null;
  released_by_staff_id?: string | null;
  /** On-Hold detail (ADR-R4-01) — populated only while scheduling_status='ON_HOLD'. */
  hold_started_at?: string | null;
  hold_expires_at?: string | null;
  hold_notes?: string | null;
  /** 'planned' | 'stopped_early' — set only on a Doctor-recorded completion (ADR-R4-07). */
  completion_reason?: string | null;
  /** Single business status from the backend resolver (ADR-R4-02) — derived,
   * never writable. Null + lifecycle_status_unresolved=true for the
   * still-open T-B.2 edge case (do not guess a value client-side). */
  lifecycle_status?: TreatmentLifecycleStatus;
  lifecycle_status_label?: string | null;
  lifecycle_status_unresolved?: boolean;

  // T-FE-E.2 (FR-TR-1): the backend's own `TreatmentOrderResponse` schema
  // (`app/schemas/treatment_orders.py`) already returns these two fields
  // -- verified this task, the frontend interface was simply never
  // updated to declare them. Additive only; no existing field changed.
  /** Structured reason code when `state` is a cancelled/declined outcome. */
  cancellation_reason_code?: string | null;
  cancellation_reason_text?: string | null;
}

// ============================================
// REQUEST DTOs
// ============================================

/** Body for POST /treatment-sheets/{sheet_id}/send-to-scheduling */
export interface SendToSchedulingRequest {
  order_notes?: string;
  planned_sessions?: number;
  frequency?: string;
  preferred_time_window?: string;
  recommended_therapy?: string;
}

/** Body for PATCH /treatment-sheets/{sheet_id}/rows/{row_id}/schedule */
export interface ScheduleRowRequest {
  assigned_staff_id: string;
  therapist_ids?: string[];
  room_id?: string | null;
  scheduled_date: string;
  scheduled_time?: string;
}

/** Single assignment in a bulk-schedule request */
export interface BulkScheduleAssignment {
  row_id: string;
  assigned_staff_id: string;
  therapist_ids?: string[];
  room_id?: string | null;
  scheduled_date: string;
  scheduled_time?: string;
}

/** Body for PATCH /treatment-sheets/{sheet_id}/rows/bulk-schedule */
export interface BulkScheduleRequest {
  assignments: BulkScheduleAssignment[];
}

// ============================================
// PAGINATED LIST RESPONSE
// ============================================

/** Paginated response from GET /treatment-sheets/clinic/{tenant_id}/treatment-orders */
export interface TreatmentOrdersListResponse {
  items: TreatmentOrderResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Query params for the admin worklist */
export interface TreatmentOrdersListParams {
  state?: TreatmentOrderState;
  scheduling_status?: SchedulingStatus;
  date_from?: string;
  date_to?: string;
  therapist_id?: string;
  overdue?: boolean;
  skip?: number;
  limit?: number;
}

// ============================================
// 409 CONFLICT RESPONSE
// ============================================

/** Shape of the 409 body returned by all state-mutating order endpoints. */
export interface VersionConflictError {
  error: 'VERSION_CONFLICT';
  current_version: number;
  retry: boolean;
  message: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** True when documentation is complete (FINAL or SIGNED). */
export const isDocumentationComplete = (status: DocumentationStatus): boolean =>
  status === 'FINAL' || status === 'SIGNED';

/** Human-readable label for execution state. */
export const getOrderStateLabel = (state: TreatmentOrderState): string => {
  const labels: Record<TreatmentOrderState, string> = {
    DRAFT: 'Draft',
    ORDERED: 'Waiting for Scheduling',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[state] ?? state;
};

/** Color token for execution state. */
export const getOrderStateColor = (state: TreatmentOrderState): string => {
  const map: Record<TreatmentOrderState, string> = {
    DRAFT: '#6B7280',
    ORDERED: '#F59E0B',
    SCHEDULED: '#3B82F6',
    IN_PROGRESS: '#8B5CF6',
    COMPLETED: '#10B981',
    CANCELLED: '#EF4444',
  };
  return map[state] ?? '#6B7280';
};

/** Human-readable label for scheduling status. */
export const getSchedulingStatusLabel = (status: SchedulingStatus): string => {
  if (!status) return '—';
  const labels: Record<NonNullable<SchedulingStatus>, string> = {
    PENDING_SCHEDULING: 'Pending Scheduling',
    PARTIALLY_SCHEDULED: 'Partially Scheduled',
    FULLY_SCHEDULED: 'Fully Scheduled',
    // Phase 4 (R4) · T-D.1 — required for exhaustiveness now that
    // SchedulingStatus includes ON_HOLD; not a new status decision, only a
    // label/color lookup entry (the primary resolver re-point is T-E.1's job).
    ON_HOLD: 'On Hold',
  };
  return labels[status];
};

/** Color token for scheduling status. */
export const getSchedulingStatusColor = (status: SchedulingStatus): string => {
  if (!status) return '#6B7280';
  const map: Record<NonNullable<SchedulingStatus>, string> = {
    PENDING_SCHEDULING: '#EF4444',
    PARTIALLY_SCHEDULED: '#F59E0B',
    FULLY_SCHEDULED: '#10B981',
    ON_HOLD: '#6B7280',
  };
  return map[status];
};

/**
 * Phase 4 (R4) · T-E.1 (ADR-R4-02, FR-B4) — re-pointed to the backend's own
 * single business-lifecycle status (`lifecycle_status_label`, resolved
 * server-side by `app/domain/treatment_plan/lifecycle_status.py`, T-C.2).
 *
 * **Superseded (not deleted) R3B logic:** this function used to re-derive a
 * "primary status" itself from raw `state`/`scheduling_status` (including a
 * frontend-only "Needs Re-scheduling" drift case — see git history for the
 * full R3B/T-D.1 reasoning). That re-derivation is now the backend
 * resolver's job; the frontend must not recreate it (constitutional
 * governance rule: "frontend must not recreate resolver logic"). The one
 * case genuinely lost by re-pointing — the `state` vs. `scheduling_status`
 * "drift" the old code surfaced as "Needs Re-scheduling" — is exactly what
 * the resolver's own `needs_scheduling` status covers from its OWN inputs;
 * no information is silently dropped, only the computation moved server-side.
 *
 * `lifecycle_status_unresolved` (the still-open T-B.2 edge case) is shown
 * honestly as "Status Pending Review" rather than guessing at one of the 11
 * real statuses — matching the backend's own "explicit not-yet-decided
 * signal, never a guess" philosophy.
 */
export const getPrimaryOrderStatusLabel = (
  order: Pick<TreatmentOrderResponse, 'lifecycle_status_label' | 'lifecycle_status_unresolved'>
): string => {
  if (order.lifecycle_status_unresolved) return 'Status Pending Review';
  return order.lifecycle_status_label ?? 'Status Pending Review';
};

/** Human-readable label for a raw lifecycle_status value directly (no full order needed) — same fallback rule as getPrimaryOrderStatusLabel. */
export const getLifecycleStatusLabel = (
  lifecycleStatusLabel: string | null | undefined,
  unresolved?: boolean
): string => {
  if (unresolved) return 'Status Pending Review';
  return lifecycleStatusLabel ?? 'Status Pending Review';
};

/** Phase 4 (R4) · T-E.1 — color lookup keyed by the backend's own resolved
 * `lifecycle_status` enum value. This does not re-derive WHICH status
 * applies (that remains the backend resolver's sole authority) — it only
 * assigns a display color to an already-resolved value, exactly symmetric
 * with the backend's own label-only `STATUS_LABELS` lookup
 * (`app/domain/treatment_plan/lifecycle_status.py`). */
const LIFECYCLE_STATUS_COLORS: Record<NonNullable<TreatmentLifecycleStatus>, string> = {
  recommended: '#6B7280',
  needs_scheduling: '#EF4444',
  scheduling_on_hold: '#6B7280',
  scheduling_denied: '#EF4444',
  scheduled_awaiting_treatment_sheet: '#3B82F6',
  treatment_sheet_draft: '#3B82F6',
  released_to_therapist: '#8B5CF6',
  in_therapy: '#8B5CF6',
  needs_clinical_review: '#F59E0B',
  under_clinical_review: '#F59E0B',
  treatment_complete: '#10B981',
};

/** Color token for a raw lifecycle_status value directly (no full order needed). */
export const getLifecycleStatusColor = (
  lifecycleStatus: TreatmentLifecycleStatus | null | undefined,
  unresolved?: boolean
): string => {
  if (unresolved || !lifecycleStatus) return '#6B7280';
  return LIFECYCLE_STATUS_COLORS[lifecycleStatus] ?? '#6B7280';
};

/** Color token matching `getPrimaryOrderStatusLabel`'s value — re-pointed to `lifecycle_status` (T-E.1), same rule as the label. */
export const getPrimaryOrderStatusColor = (
  order: Pick<TreatmentOrderResponse, 'lifecycle_status' | 'lifecycle_status_unresolved'>
): string => getLifecycleStatusColor(order.lifecycle_status, order.lifecycle_status_unresolved);

/**
 * Returns the rows from a TreatmentOrderResponse that have a scheduled_date,
 * sorted ascending — used for the patient schedule modal (Phase 1).
 */
export const getScheduledRows = (order: TreatmentOrderResponse): TreatmentRowOrderResponse[] =>
  order.rows
    .filter((r) => r.scheduled_date !== null)
    .sort((a, b) => (a.scheduled_date! > b.scheduled_date! ? 1 : -1));

/**
 * T-FE-E.2 closure (FR-SCH-1) -- field-for-field mirror of the backend's
 * `SchedulingProposalResponse` (T-BE-E.2a). Read-only passthrough; the
 * frontend never computes or sorts these dates itself.
 */
export interface SchedulingProposalResponse {
  intent: string | null;
  dates: string[];
  reason_code: string;
  bounded_by_milestone: boolean;
}
