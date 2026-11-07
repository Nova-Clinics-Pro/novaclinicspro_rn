/**
 * Clinical Workflow API
 * Handles the HTTP call for the backend-owned Clinical Workflow semantic
 * contract (T-BE-B.2a).
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { ClinicalWorkflowResolutionResponse } from '../models/clinicalWorkflow.dtos';

/**
 * Get the Clinical Workflow semantic resolution for a Visit context.
 * GET /api/v1/clinic/{tenant_id}/clinical-workflow
 */
export const getClinicalWorkflowApi = async (
  tenantId: string,
  clientId: string,
  episodeId: string,
  appointmentId: string,
): Promise<ClinicalWorkflowResolutionResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/clinical-workflow`,
    { params: { client_id: clientId, episode_id: episodeId, appointment_id: appointmentId } },
  );
  return response.data;
};
