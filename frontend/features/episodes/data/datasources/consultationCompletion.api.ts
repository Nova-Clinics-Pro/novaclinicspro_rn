/**
 * Consultation Completion API
 * Handles the HTTP call for the backend-owned consultation completion
 * contract (T-BE-F.3 / T-BE-F.3a).
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { ConsultationCompletionResponse } from '../models/consultationCompletion.dtos';

/**
 * Get the consultation completion contract for a Visit context.
 * GET /api/v1/clinic/{tenant_id}/consultation-completion
 */
export const getConsultationCompletionApi = async (
  tenantId: string,
  clientId: string,
  episodeId: string,
  appointmentId: string,
): Promise<ConsultationCompletionResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/consultation-completion`,
    { params: { client_id: clientId, episode_id: episodeId, appointment_id: appointmentId } },
  );
  return response.data;
};
