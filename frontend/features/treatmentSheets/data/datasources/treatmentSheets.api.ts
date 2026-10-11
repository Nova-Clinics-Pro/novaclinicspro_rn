/**
 * Treatment Sheets API
 * Handles all HTTP calls for treatment sheets
 *
 * IMPORTANT: Treatment sheets are created FROM casesheets
 * No standalone list endpoint - access via casesheet or by ID
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { isAxiosError } from 'axios';
import { SessionInstructionsError } from '../../domain/errors/sessionInstructionsError';
import { normalizeTreatmentOperationError } from './treatmentOperationError';
import {
  TreatmentSheetCreateRequest,
  TreatmentSheetSimpleCreateRequest,
  TreatmentSheetRowUpdateRequest,
  TreatmentSheetRowCompleteRequest,
  TreatmentSheetStatusTransitionRequest,
  TreatmentSheetResponse,
  TreatmentSheetSyncResponse,
  TreatmentSheetPrintResponse,
} from '../models/treatmentSheets.dtos';

/**
 * Create treatment sheet from a casesheet
 * POST /api/v1/clinic/casesheets/{case_sheet_id}/treatment-sheets
 */
export const createTreatmentSheetApi = async (
  casesheetId: string,
  payload: TreatmentSheetCreateRequest
): Promise<TreatmentSheetResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/clinic/casesheets/${casesheetId}/treatment-sheets`,
      payload
    );
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Failed to create treatment sheet.');
  }
};

/**
 * Create treatment sheet (simplified, tenant-scoped)
 * POST /api/v1/clinic/tenants/{tenant_id}/treatment-sheets
 */
export const createSimpleTreatmentSheetApi = async (
  tenantId: string,
  payload: TreatmentSheetSimpleCreateRequest
): Promise<TreatmentSheetResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/tenants/${tenantId}/treatment-sheets`,
    payload
  );
  return response.data;
};

/**
 * Get a treatment sheet by ID
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}
 */
export const getTreatmentSheetApi = async (
  treatmentSheetId: string,
  tenantId: string
): Promise<TreatmentSheetResponse> => {
  try {
    const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}`);
    return response.data;
  } catch (error) {
    throw normalizeTreatmentOperationError(error, 'Could not load this treatment sheet. Please try again.');
  }
};

/**
 * Get treatment sheets by episode ID
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets?episode_id={episode_id}
 */
export const getTreatmentSheetsByEpisodeApi = async (
  tenantId: string,
  episodeId: string
): Promise<{ treatment_sheets: TreatmentSheetResponse[]; total: number }> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-sheets`,
    { params: { episode_id: episodeId } }
  );
  const items = response.data?.treatment_sheets ?? response.data?.items ?? [];
  return {
    treatment_sheets: items,
    total: response.data?.total ?? items.length,
  };
};

/**
 * List treatment sheets for a client, optionally filtered by status --
 * used to resolve the "ordering doctor" from a client's active treatment
 * sheet (T-G.2, clean-architecture boundary restoration; extracted from an
 * inline axiosClient call in CreateAppointmentScreen.tsx).
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets?client_id=...&status=...&limit=...
 */
export const listTreatmentSheetsByClientApi = async (
  tenantId: string,
  params: { client_id: string; status?: string; limit?: number }
): Promise<{ items: TreatmentSheetResponse[]; total: number }> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-sheets`,
    { params }
  );
  const items = response.data?.items ?? [];
  return {
    items,
    total: response.data?.total ?? items.length,
  };
};

/**
 * Transition treatment sheet status (DRAFT → FINAL → SIGNED)
 * PATCH /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}/status
 *
 * Use this ONLY for the doctor explicitly finalising/locking the clinical document.
 * Do NOT call this as a side-effect of scheduling. Document status (DRAFT/FINAL/SIGNED)
 * and execution state (DRAFT/ORDERED/SCHEDULED/…) are independent axes.
 */
export const transitionTreatmentSheetStatusApi = async (
  tenantId: string,
  treatmentSheetId: string,
  payload: TreatmentSheetStatusTransitionRequest
): Promise<TreatmentSheetResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}/status`,
    payload
  );
  return response.data;
};

/**
 * Sync treatment sheet with treatment sessions
 * POST /api/v1/clinic/{tenant_id}/treatment-sheets/{sheet_id}/sync?series_id={series_id}
 */
export const syncTreatmentSheetApi = async (
  tenantId: string,
  treatmentSheetId: string,
  seriesId: string
): Promise<TreatmentSheetSyncResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}/sync`,
    null,
    { params: { series_id: seriesId } }
  );
  return response.data;
};

/**
 * Print treatment sheet
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}/print
 */
export const printTreatmentSheetApi = async (
  tenantId: string,
  treatmentSheetId: string
): Promise<TreatmentSheetPrintResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}/print`
  );
  return response.data;
};

/**
 * Archive (soft delete) a treatment sheet
 * DELETE /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}
 */
export const archiveTreatmentSheetApi = async (
  tenantId: string,
  treatmentSheetId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}`
  );
};

/**
 * Update all treatment sheet rows (bulk update)
 * PATCH /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}/rows
 */
export const updateAllTreatmentSheetRowsApi = async (
  tenantId: string,
  treatmentSheetId: string,
  rows: Array<{ id: string } & TreatmentSheetRowUpdateRequest>
): Promise<TreatmentSheetResponse> => {
  try {
    const response = await axiosClient.patch(
      `/api/v1/clinic/${tenantId}/treatment-sheets/${treatmentSheetId}/rows`,
      { rows }
    );
    return response.data;
  } catch (error) {
    throw normalizeSessionInstructionsError(error);
  }
};

/**
 * Update a single treatment sheet row's doctor-authored content
 * PATCH /api/v1/clinic/treatment-sheets/rows/{row_id}
 *
 * T-FE-E.2 (FR-TS-3, FR-SCH-2). Route corrected: the backend route
 * (`app/api/v1/routers/treatment_sheets_router.py::update_treatment_sheet_row`)
 * carries NO `{tenant_id}` path segment -- tenant scoping comes from the
 * JWT (`user_context.tenant_id`), not the URL. The prior `${tenantId}`
 * segment here was a live 404 defect, never exercised by any composed
 * caller until this task. `expectedVersion`, when supplied, is sent as
 * `If-Match` -- the backend's own OCC token (the PARENT SHEET's
 * `version`, staged-optional per `T-BE-E.5`'s compatibility amendment;
 * never made mandatory here). On a stale token the backend returns 409
 * with `{error: 'VERSION_CONFLICT', current_version}` in the response
 * body -- surfaced to the caller unchanged via the rejected promise, no
 * silent retry.
 */
export const updateTreatmentSheetRowApi = async (
  rowId: string,
  payload: TreatmentSheetRowUpdateRequest,
  expectedVersion?: number
): Promise<TreatmentSheetResponse> => {
  try {
    const response = await axiosClient.patch(
      `/api/v1/clinic/treatment-sheets/rows/${rowId}`,
      payload,
      expectedVersion !== undefined ? { headers: { 'If-Match': String(expectedVersion) } } : undefined
    );
    return response.data;
  } catch (error) {
    throw normalizeSessionInstructionsError(error);
  }
};

type SessionInstructionsErrorEnvelope = {
  error?: unknown;
  detail?: unknown;
  message?: unknown;
  current_version?: unknown;
};

const safeMessage = (error: unknown): string => error instanceof Error && !/(axioserror|typeerror|referenceerror|stack trace|sql|traceback)/i.test(error.message)
  ? error.message
  : 'Could not save Session instructions.';

const envelopeMessage = (envelope: SessionInstructionsErrorEnvelope | undefined): string | null => {
  const candidate = envelope?.detail ?? envelope?.message ?? envelope?.error;
  if (typeof candidate === 'string' && !/(stack trace|sql|traceback)/i.test(candidate)) return candidate;
  if (candidate && typeof candidate === 'object') {
    const nested = candidate as SessionInstructionsErrorEnvelope;
    return envelopeMessage(nested);
  }
  return null;
};

/** Interprets row-write transport responses once for all Treatment Sheets consumers. */
export const normalizeSessionInstructionsError = (error: unknown): SessionInstructionsError => {
  if (error instanceof SessionInstructionsError) return error;
  if (!isAxiosError(error)) return new SessionInstructionsError('SAVE_FAILED', safeMessage(error));

  const status = error.response?.status;
  const envelope = error.response?.data as SessionInstructionsErrorEnvelope | undefined;
  const detail = envelope?.detail && typeof envelope.detail === 'object'
    ? envelope.detail as SessionInstructionsErrorEnvelope
    : undefined;
  const code = envelope?.error ?? detail?.error;
  const currentVersion = envelope?.current_version ?? detail?.current_version;
  const version = typeof currentVersion === 'number' ? currentVersion : null;
  const message = envelopeMessage(envelope) ?? safeMessage(error);

  if (status === 409) return new SessionInstructionsError('VERSION_CONFLICT', 'Session instructions changed on the server.', version);
  if (status === 403) return new SessionInstructionsError('PERMISSION_DENIED', 'You do not have permission to apply Session instructions.');
  if (status === 400 || status === 422) return new SessionInstructionsError('VALIDATION_FAILED', 'Could not apply — one or more selected Sessions is not eligible.');
  if (code === 'VERSION_CONFLICT') return new SessionInstructionsError('VERSION_CONFLICT', 'Session instructions changed on the server.', version);
  return new SessionInstructionsError('SAVE_FAILED', message);
};

/**
 * Complete a treatment sheet row
 * POST /api/v1/clinic/treatment-sheets/rows/{row_id}/complete
 */
export const completeTreatmentSheetRowApi = async (
  rowId: string,
  payload: TreatmentSheetRowCompleteRequest
): Promise<TreatmentSheetResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/treatment-sheets/rows/${rowId}/complete`,
    payload
  );
  return response.data;
};
