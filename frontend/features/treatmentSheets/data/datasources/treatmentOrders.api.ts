/**
 * Treatment Orders API
 *
 * All endpoints return TreatmentOrderResponse.
 * All state-mutating endpoints require an If-Match: <version> header.
 *
 * On 409 VERSION_CONFLICT the caller must:
 *   1. Show a toast: "Plan updated elsewhere. Refreshing…"
 *   2. Refetch the order to get the current version.
 *   3. Let the user re-trigger the action — never auto-retry silently.
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { normalizeTreatmentOperationError } from './treatmentOperationError';
import {
  TreatmentOrderResponse,
  TreatmentOrdersListResponse,
  TreatmentOrdersListParams,
  SendToSchedulingRequest,
  ScheduleRowRequest,
  BulkScheduleRequest,
  SchedulingProposalResponse,
} from '../models/treatmentOrders.dtos';

// ============================================
// HELPERS
// ============================================

/** Build the If-Match header object required by all mutating endpoints.
 * The value must be a plain integer string — no quotes, no decimals. */
const ifMatch = (version: number): Record<string, string> => ({
  'If-Match': String(Math.floor(Number(version))),
});

// ============================================
// QUERIES
// ============================================

/**
 * Get a single treatment order by sheet id.
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets/{sheet_id}  (returns TreatmentOrderResponse)
 */
export const getTreatmentOrderApi = async (
  sheetId: string,
  tenantId: string
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-sheets/${sheetId}`
  );
  return response.data;
};

/**
 * Admin worklist — paginated list of treatment orders.
 * GET /api/v1/treatment-sheets/clinic/{tenant_id}/treatment-orders
 */
export const listTreatmentOrdersApi = async (
  tenantId: string,
  params?: TreatmentOrdersListParams
): Promise<TreatmentOrdersListResponse> => {
  const response = await axiosClient.get(
    `/api/v1/treatment-sheets/clinic/${tenantId}/treatment-orders`,
    { params }
  );
  return response.data;
};

// ============================================
// STATE-MUTATING ENDPOINTS
// ============================================

/** Body for POST /treatment-sheets/clinic/{tenant_id}/treatment-recommendations */
export interface CreateTreatmentRecommendationRequest {
  client_id: string;
  episode_id: string;
  appointment_id?: string | null;
  recommended_therapy: string;
  planned_sessions: number;
  frequency?: string | null;
  preferred_time_window?: string | null;
  order_notes?: string | null;
}

/**
 * Create a doctor's treatment recommendation as an ORDER — no rows created.
 * POST /api/v1/treatment-sheets/clinic/{tenant_id}/treatment-recommendations
 * Permission: treatment_sheet.order (DOCTOR role)
 *
 * The recommendation captures the therapy, recommended number of sessions,
 * frequency and notes. Admin scheduling creates the per-day rows later.
 */
export const createTreatmentRecommendationApi = async (
  tenantId: string,
  payload: CreateTreatmentRecommendationRequest
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/clinic/${tenantId}/treatment-recommendations`,
    payload
  );
  return response.data;
};

/**
 * Send treatment sheet to scheduling (DRAFT → ORDERED).
 * POST /api/v1/treatment-sheets/{sheet_id}/send-to-scheduling
 * Requires: If-Match: <version>
 * Permission: treatment_sheet.order (DOCTOR role)
 */
export const sendToSchedulingApi = async (
  sheetId: string,
  version: number,
  payload: SendToSchedulingRequest = {}
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/${sheetId}/send-to-scheduling`,
    payload,
    { headers: ifMatch(version) }
  );
  return response.data;
};

/**
 * Start a session row (SCHEDULED → IN_PROGRESS).
 * POST /api/v1/treatment-sheets/{sheet_id}/rows/{row_id}/start
 * Requires: If-Match: <version>
 * Permission: treatment_session.start (THERAPIST role)
 * Body: {} — identity derived from JWT
 */
export const startSheetRowApi = async (
  sheetId: string,
  rowId: string,
  version: number
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/${sheetId}/rows/${rowId}/start`,
    {},
    { headers: ifMatch(version) }
  );
  return response.data;
};

/**
 * Schedule a single row (assign staff + date/time).
 * PATCH /api/v1/treatment-sheets/{sheet_id}/rows/{row_id}/schedule
 * Requires: If-Match: <version>
 */
export const scheduleRowApi = async (
  sheetId: string,
  rowId: string,
  version: number,
  payload: ScheduleRowRequest
): Promise<TreatmentOrderResponse> => {
  try {
    const response = await axiosClient.patch(
      `/api/v1/treatment-sheets/${sheetId}/rows/${rowId}/schedule`,
      payload,
      { headers: ifMatch(version) }
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to schedule row.');
  }
};

/**
 * Bulk-schedule multiple rows in one call.
 * PATCH /api/v1/treatment-sheets/{sheet_id}/rows/bulk-schedule
 * Requires: If-Match: <version>
 */
export const bulkScheduleRowsApi = async (
  sheetId: string,
  version: number,
  payload: BulkScheduleRequest
): Promise<TreatmentOrderResponse> => {
  try {
    const response = await axiosClient.patch(
      `/api/v1/treatment-sheets/${sheetId}/rows/bulk-schedule`,
      payload,
      { headers: ifMatch(version) }
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to schedule');
  }
};

/** Denial reason recorded when a patient declines a recommendation. */
export interface CancelTreatmentOrderReason {
  reason_code?: string;
  reason_text?: string;
}

/**
 * Cancel a treatment order, recording the patient-decline reason for analytics.
 * POST /api/v1/treatment-sheets/{sheet_id}/cancel
 * Requires: If-Match: <version>
 */
export const cancelTreatmentOrderApi = async (
  sheetId: string,
  version: number,
  reason?: CancelTreatmentOrderReason
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/${sheetId}/cancel`,
    reason ?? {},
    { headers: ifMatch(version) }
  );
  return response.data;
};

/** Phase 4 (R4) · T-D.1. Place a treatment order's Scheduling Decision on
 * hold. hold_expires_at is an ISO datetime string. Does not change `state`. */
export interface PlaceOnHoldPayload {
  hold_expires_at: string;
  hold_notes?: string;
}

/**
 * Place a treatment order on hold (scheduling_status=ON_HOLD).
 * POST /api/v1/treatment-sheets/{sheet_id}/hold
 * Requires: If-Match: <version>
 */
export const placeTreatmentOrderOnHoldApi = async (
  sheetId: string,
  version: number,
  payload: PlaceOnHoldPayload
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/${sheetId}/hold`,
    payload,
    { headers: ifMatch(version) }
  );
  return response.data;
};

/**
 * Extend an already-on-hold treatment order's hold expiry.
 * POST /api/v1/treatment-sheets/{sheet_id}/hold/extend
 * Requires: If-Match: <version>
 */
export const extendTreatmentOrderHoldApi = async (
  sheetId: string,
  version: number,
  holdExpiresAt: string
): Promise<TreatmentOrderResponse> => {
  const response = await axiosClient.post(
    `/api/v1/treatment-sheets/${sheetId}/hold/extend`,
    { hold_expires_at: holdExpiresAt },
    { headers: ifMatch(version) }
  );
  return response.data;
};

/**
 * Phase 4 (R4) · T-E.5 (ADR-R4-06). Doctor releases the whole treatment
 * sheet to the therapist. Whole-sheet only -- no per-row/partial release.
 * POST /api/v1/treatment-sheets/{sheet_id}/release
 * Requires: If-Match: <version>
 */
export const releaseTreatmentSheetApi = async (
  sheetId: string,
  version: number
): Promise<TreatmentOrderResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/treatment-sheets/${sheetId}/release`,
      {},
      { headers: ifMatch(version) }
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to release treatment sheet.');
  }
};

/** Phase 4 (R4) · T-D.4/T-E.6 (ADR-R4-07). One tenant_clinical_review_notes
 * row -- `outcome: null` means the review is open ("Under Clinical Review"). */
export interface ClinicalReviewNoteResponse {
  id: string;
  tenant_id: string;
  treatment_sheet_id: string;
  recorded_by_staff_id: string;
  recorded_at: string;
  notes_json: Record<string, unknown>;
  outcome: string | null;
  is_deleted: boolean;
}

/**
 * Phase 4 (R4) · T-D.4 (ADR-R4-07). Append a Clinical Review note --
 * documentation activity only, always outcome=NULL. Distinct from
 * recordClinicalReviewOutcomeApi's own DECISION action.
 * POST /api/v1/treatment-sheets/{sheet_id}/clinical-review-notes
 * (no If-Match -- notes do not mutate the sheet, per T-D.4's own design)
 */
export const addClinicalReviewNoteApi = async (
  sheetId: string,
  notesJson: Record<string, unknown>
): Promise<ClinicalReviewNoteResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/treatment-sheets/${sheetId}/clinical-review-notes`,
      { notes_json: notesJson }
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to save observation.');
  }
};

/** Phase 4 (R4) · T-D.5 (ADR-R4-07). The five Clinical Review outcomes. */
export type ClinicalReviewOutcome =
  | 'continue_unchanged'
  | 'update_future_rows'
  | 'extend'
  | 'stop_remaining'
  | 'complete';

/**
 * Phase 4 (R4) · T-D.5 (ADR-R4-07). Record a Clinical Review DECISION --
 * distinct from addClinicalReviewNoteApi's documentation activity.
 * POST /api/v1/treatment-sheets/{sheet_id}/clinical-review-outcome
 * Requires: If-Match: <version>
 */
export const recordClinicalReviewOutcomeApi = async (
  sheetId: string,
  version: number,
  outcome: ClinicalReviewOutcome,
  notesJson: Record<string, unknown> = {}
): Promise<TreatmentOrderResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/treatment-sheets/${sheetId}/clinical-review-outcome`,
      { outcome, notes_json: notesJson },
      { headers: ifMatch(version) }
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to record outcome.');
  }
};

/**
 * T-FE-E.2 closure (FR-SCH-1, T-BE-E.2a). Read-only: resolves this
 * Plan's scheduling intent into proposed session dates -- persisting a
 * date remains scheduleRowApi/bulkScheduleRowsApi's job.
 * GET /api/v1/treatment-sheets/plans/{plan_id}/scheduling-proposal
 */
export interface SchedulingProposalParams {
  startDate: string;
  weekdays?: number[];
  sessionsPerWeek?: number;
  explicitDates?: string[];
  reviewMilestoneAfter?: number;
}

export const getSchedulingProposalApi = async (
  planId: string,
  params: SchedulingProposalParams
): Promise<SchedulingProposalResponse> => {
  const response = await axiosClient.get(
    `/api/v1/treatment-sheets/plans/${planId}/scheduling-proposal`,
    {
      params: {
        start_date: params.startDate,
        weekdays: params.weekdays,
        sessions_per_week: params.sessionsPerWeek,
        explicit_dates: params.explicitDates,
        review_milestone_after: params.reviewMilestoneAfter,
      },
    }
  );
  return response.data;
};
