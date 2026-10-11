/**
 * Prescriptions API
 * Handles all HTTP calls for prescriptions
 *
 * IMPORTANT: All paths must start with /api/v1/...
 * Prescriptions are TENANT-SCOPED - can filter by client_id
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { isAxiosError } from 'axios';
import { PrescriptionOperationError } from '../../domain/errors/prescriptionOperationError';
import {
  PrescriptionCreateRequest,
  PrescriptionUpdateRequest,
  PrescriptionShareRequest,
  PrescriptionResponse,
  PrescriptionListResponse,
  PrescriptionShareResponse,
  ListPrescriptionsParams,
  PrescriptionPrintResponse,
} from '../models/prescriptions.dtos';
import { LivingDocumentVersionListResponse, PrescriptionSignedVersionSnapshot } from '../../../livingDocuments/data/models/livingDocuments.dtos';

/**
 * List prescriptions (tenant-scoped, can filter by client)
 * GET /api/v1/clinic/{tenant_id}/prescriptions
 */
export const listPrescriptionsApi = async (
  tenantId: string,
  params?: ListPrescriptionsParams
): Promise<PrescriptionListResponse> => {
  const requestParams = {
    ...params,
    start_date: params?.from_date,
    end_date: params?.to_date,
    from_date: undefined,
    to_date: undefined,
  };
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/prescriptions`,
    { params: requestParams }
  );
  return response.data;
};

/**
 * Get a single prescription by ID
 * GET /api/v1/clinic/{tenant_id}/prescriptions/{prescription_id}
 */
export const getPrescriptionApi = async (
  tenantId: string,
  prescriptionId: string
): Promise<PrescriptionResponse> => {
  try {
    const response = await axiosClient.get(
      `/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}`
    );
    return response.data;
  } catch (error) {
    throw normalizePrescriptionLoadError(error);
  }
};

/**
 * Create a new prescription
 * POST /api/v1/clinic/{tenant_id}/prescriptions
 */
export const createPrescriptionApi = async (
  tenantId: string,
  payload: PrescriptionCreateRequest
): Promise<PrescriptionResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/clinic/${tenantId}/prescriptions`,
      payload
    );
    return response.data;
  } catch (error) {
    throw normalizePrescriptionCreateError(error);
  }
};

/**
 * Update an existing prescription
 * PATCH /api/v1/clinic/{tenant_id}/prescriptions/{prescription_id}
 */
export const updatePrescriptionApi = async (
  tenantId: string,
  prescriptionId: string,
  payload: PrescriptionUpdateRequest
): Promise<PrescriptionResponse> => {
  try {
    const response = await axiosClient.patch(
      `/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}`,
      payload
    );
    return response.data;
  } catch (error) {
    throw normalizePrescriptionUpdateError(error);
  }
};

type PrescriptionErrorEnvelope = {
  detail?: { error?: unknown; prescription_id?: unknown } | unknown;
  error_code?: unknown;
};

const prescriptionErrorFacts = (error: unknown) => {
  const envelope = isAxiosError(error) ? error.response?.data as PrescriptionErrorEnvelope | undefined : undefined;
  const detail = envelope?.detail && typeof envelope.detail === 'object'
    ? envelope.detail as { error?: unknown; prescription_id?: unknown }
    : undefined;
  return { status: isAxiosError(error) ? error.response?.status : undefined, code: detail?.error ?? envelope?.error_code, existingPrescriptionId: detail?.prescription_id };
};

export const normalizePrescriptionLoadError = (error: unknown): PrescriptionOperationError =>
  new PrescriptionOperationError(prescriptionErrorFacts(error).status === 401 ? 'AUTHENTICATION_REQUIRED' : 'LOAD_FAILED');

export const normalizePrescriptionCreateError = (error: unknown): PrescriptionOperationError => {
  const facts = prescriptionErrorFacts(error);
  if (facts.code === 'PRESCRIPTION_ALREADY_EXISTS' && typeof facts.existingPrescriptionId === 'string') {
    return new PrescriptionOperationError('ALREADY_EXISTS', facts.existingPrescriptionId);
  }
  return new PrescriptionOperationError(facts.code === 'EPISODE_MISMATCH' ? 'EPISODE_MISMATCH' : 'SAVE_FAILED');
};

export const normalizePrescriptionUpdateError = (error: unknown): PrescriptionOperationError => {
  const facts = prescriptionErrorFacts(error);
  if (facts.status === 403) return new PrescriptionOperationError('PERMISSION_DENIED');
  if (facts.status === 409) return new PrescriptionOperationError('FINALIZED');
  return new PrescriptionOperationError('SAVE_FAILED');
};

/**
 * Delete a prescription
 * DELETE /api/v1/clinic/{tenant_id}/prescriptions/{prescription_id}
 */
export const deletePrescriptionApi = async (
  tenantId: string,
  prescriptionId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}`
  );
};

/**
 * Share a SIGNED prescription via SMS/WhatsApp/Email
 * POST /api/v1/clinic/{tenant_id}/prescriptions/{prescription_id}/share
 */
export const sharePrescriptionApi = async (
  tenantId: string,
  prescriptionId: string,
  payload: PrescriptionShareRequest
): Promise<PrescriptionShareResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/share`,
    payload
  );
  return response.data;
};

/**
 * Get structured prescription print payload with clinic branding
 * GET /api/v1/clinic/{tenant_id}/prescriptions/{prescription_id}/print
 */
export const getPrescriptionPrintApi = async (
  tenantId: string,
  prescriptionId: string
): Promise<PrescriptionPrintResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/print`
  );
  return response.data;
};

export const listPrescriptionVersionsApi = async (tenantId: string, prescriptionId: string): Promise<LivingDocumentVersionListResponse> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/versions`)).data;

export const getPrescriptionVersionApi = async (tenantId: string, prescriptionId: string, versionId: string): Promise<PrescriptionSignedVersionSnapshot> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/versions/${versionId}`)).data;

export const printPrescriptionVersionApi = async (tenantId: string, prescriptionId: string, versionId: string): Promise<string> =>
  (await axiosClient.get(`/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/versions/${versionId}/print`, { responseType: 'text' })).data;

export const amendPrescriptionApi = async (tenantId: string, prescriptionId: string): Promise<PrescriptionResponse> =>
  (await axiosClient.post(`/api/v1/clinic/${tenantId}/prescriptions/${prescriptionId}/amend`)).data;
