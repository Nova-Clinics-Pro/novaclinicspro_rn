/**
 * Casesheets API
 * Handles all HTTP calls for clinical case sheets
 *
 * IMPORTANT: All paths must start with /api/v1/...
 * Casesheets are CLIENT-SCOPED - list/create requires client_id in path
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  CasesheetCreateRequest,
  CasesheetUpdateRequest,
  CasesheetStatusTransitionRequest,
  CasesheetResponse,
  CasesheetListResponse,
  CasesheetPrintResponse,
  CasesheetContributionHistoryResponse,
  ListCasesheetsParams,
} from '../models/casesheets.dtos';
import { CasesheetSignedVersionSnapshot, LivingDocumentVersionListResponse } from '../../../livingDocuments/data/models/livingDocuments.dtos';

/**
 * List casesheets for a client
 * GET /api/v1/clinic/{tenant_id}/clients/{client_id}/casesheets
 */
export const listCasesheetsApi = async (
  tenantId: string,
  clientId: string,
  params?: ListCasesheetsParams
): Promise<CasesheetListResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/clients/${clientId}/casesheets`,
    { params }
  );
  return response.data;
};

/**
 * Phase 4 · T-G.2 (clean-architecture boundary restoration) -- extracted
 * VERBATIM from a pre-existing inline axiosClient call in
 * CreateAppointmentScreen.tsx's ordering-doctor waterfall, preserved
 * exactly (not fixed) because T-G is architecture-only and must not change
 * behavior.
 *
 * KNOWN BUG, confirmed during this audit, NOT fixed here: this URL does not
 * match any route in casesheets_router.py -- the real list-by-client route
 * is GET /clinic/{tenant_id}/clients/{client_id}/casesheets (listCasesheetsApi
 * above). This call 404s every time and is expected to be caught by the
 * caller, exactly as it already was before this extraction. Flagged as a
 * follow-up bug-fix candidate, not resolved under this task's no-behavior-
 * change scope.
 * GET /api/v1/clinic/{tenant_id}/casesheets?client_id=...&limit=... (no matching route -- always 404s)
 */
export const getLatestCasesheetForClientLegacyApi = async (
  tenantId: string,
  clientId: string
): Promise<{ recorded_by_staff_id?: string } | undefined> => {
  const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/casesheets`, {
    params: { client_id: clientId, limit: 1 },
  });
  return response.data?.casesheets?.[0];
};

/**
 * Get a single casesheet by ID
 * GET /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}
 */
export const getCasesheetApi = async (
  tenantId: string,
  casesheetId: string
): Promise<CasesheetResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}`
  );
  return response.data;
};

/**
 * Create a new casesheet for a client
 * POST /api/v1/clinic/{tenant_id}/clients/{client_id}/casesheets
 */
export const createCasesheetApi = async (
  tenantId: string,
  clientId: string,
  payload: CasesheetCreateRequest
): Promise<CasesheetResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/clients/${clientId}/casesheets`,
    payload
  );
  return response.data;
};

/**
 * Update an existing casesheet
 * PATCH /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}
 */
export const updateCasesheetApi = async (
  tenantId: string,
  casesheetId: string,
  payload: CasesheetUpdateRequest
): Promise<CasesheetResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}`,
    payload
  );
  return response.data;
};

/**
 * Transition casesheet status (DRAFT → FINAL → SIGNED)
 * PATCH /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}/status
 */
export const transitionCasesheetStatusApi = async (
  tenantId: string,
  casesheetId: string,
  payload: CasesheetStatusTransitionRequest
): Promise<CasesheetResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/status`,
    payload
  );
  return response.data;
};

/**
 * Print casesheet (returns HTML/PDF content)
 * GET /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}/print
 */
export const printCasesheetApi = async (
  tenantId: string,
  casesheetId: string
): Promise<CasesheetPrintResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/print`
  );
  return response.data;
};

export const listCasesheetVersionsApi = async (tenantId: string, casesheetId: string): Promise<LivingDocumentVersionListResponse> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/versions`)).data;

export const getCasesheetVersionApi = async (tenantId: string, casesheetId: string, versionId: string): Promise<CasesheetSignedVersionSnapshot> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/versions/${versionId}`)).data;

/** HTML is authored and version-labelled by the backend; the frontend never modifies it. */
export const printCasesheetVersionApi = async (tenantId: string, casesheetId: string, versionId: string): Promise<string> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/versions/${versionId}/print`, { responseType: 'text' })).data;

export const amendCasesheetApi = async (tenantId: string, casesheetId: string): Promise<CasesheetResponse> =>
  (await axiosClient.post(`/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/amend`)).data;

/**
 * T-FE-E.1b (T-BE-E.1a, Decision 12). Get the append-only contribution
 * history for a Case Sheet — client_id/episode_id are required query
 * params the backend uses for context validation (tenant/client/Episode/
 * Case Sheet scope), never for filtering or inference here.
 * GET /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}/contributions
 */
export const getCasesheetContributionsApi = async (
  tenantId: string,
  casesheetId: string,
  clientId: string,
  episodeId: string
): Promise<CasesheetContributionHistoryResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}/contributions`,
    { params: { client_id: clientId, episode_id: episodeId } }
  );
  return response.data;
};

/**
 * Archive (soft delete) a casesheet
 * DELETE /api/v1/clinic/{tenant_id}/casesheets/{casesheet_id}
 */
export const archiveCasesheetApi = async (
  tenantId: string,
  casesheetId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/casesheets/${casesheetId}`
  );
};
