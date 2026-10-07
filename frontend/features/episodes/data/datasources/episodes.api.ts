/**
 * Episodes API
 * Handles all HTTP calls for episode management
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  Episode,
  EpisodesListResponse,
  EpisodeCreateRequest,
  EpisodeUpdateRequest,
  AttachEpisodeRequest,
  CloseEpisodeRequest,
  EpisodeStatus,
  EpisodeDetailsResponse,
} from '../models/episodes.dtos';

/**
 * List episodes query parameters
 * 
 * PAGINATION NOTE:
 * This API uses offset-based pagination with skip/limit parameters:
 * - skip: Number of items to skip (offset)
 * - limit: Maximum number of items to return per page
 * 
 * Example: To get page 2 with 20 items per page, use skip=20, limit=20
 * 
 * If the backend changes to cursor-based pagination in the future,
 * this interface will need to be updated to use cursor/next_token instead.
 */
export interface ListEpisodesParams {
  /** Filter by client ID */
  client_id?: string;
  /** Filter by episode status (ACTIVE or CLOSED) */
  status?: EpisodeStatus;
  /** Number of items to skip (offset for pagination) */
  skip?: number;
  /** Maximum number of items to return per page */
  limit?: number;
}

/**
 * List episodes for a tenant
 * GET /api/v1/clinic/{tenant_id}/episodes
 */
export const listEpisodesApi = async (
  tenantId: string,
  params?: ListEpisodesParams
): Promise<EpisodesListResponse> => {
  // CRITICAL: Prevent API calls with undefined tenantId
  if (!tenantId || tenantId === 'undefined') {
    console.error('[listEpisodesApi] BLOCKED: Invalid tenantId:', tenantId);
    throw new Error('Invalid tenant ID - cannot fetch episodes');
  }
  
  // Build query string manually to avoid axios serialization issues
  const queryParts: string[] = [];
  
  if (params) {
    if (params.client_id) {
      queryParts.push(`client_id=${encodeURIComponent(params.client_id)}`);
    }
    if (params.status) {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params.skip !== undefined) {
      queryParts.push(`skip=${params.skip}`);
    }
    if (params.limit !== undefined) {
      queryParts.push(`limit=${params.limit}`);
    }
  }
  
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const url = `/api/v1/clinic/${tenantId}/episodes${queryString}`;
  
  console.log('[listEpisodesApi] URL:', url);
  console.log('[listEpisodesApi] Params:', params);
  console.log('[listEpisodesApi] Stack trace:', new Error().stack);
  
  const response = await axiosClient.get(url);
  return response.data;
};

/**
 * Read the episode count for each client shown by a tenant-scoped dashboard.
 *
 * A failed count for one client must not hide the remaining dashboard cards;
 * it is represented as zero, matching the dashboard's established behavior.
 */
export const getClientEpisodeCountsApi = async (
  tenantId: string,
  clientIds: string[]
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};

  await Promise.all(
    clientIds.map(async (clientId) => {
      try {
        const response = await listEpisodesApi(tenantId, { client_id: clientId, limit: 1 });
        counts[clientId] = response.total || 0;
      } catch {
        counts[clientId] = 0;
      }
    })
  );

  return counts;
};

/**
 * Get a single episode by ID
 * GET /api/v1/clinic/{tenant_id}/episodes/{id}
 */
export const getEpisodeApi = async (
  tenantId: string,
  episodeId: string
): Promise<Episode> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/episodes/${episodeId}`
  );
  return response.data;
};

/**
 * Get comprehensive episode details
 * GET /api/v1/clinic/{tenant_id}/episodes/{id}/details
 * 
 * Returns episode info with documents (casesheet, treatment sheet) and visits
 * (appointments with prescriptions and payments)
 */
export const getEpisodeDetailsApi = async (
  tenantId: string,
  episodeId: string
): Promise<EpisodeDetailsResponse> => {
  const url = `/api/v1/clinic/${tenantId}/episodes/${episodeId}/details`;
  console.log('[getEpisodeDetailsApi] Fetching from URL:', url);
  
  const response = await axiosClient.get(url);
  
  console.log('[getEpisodeDetailsApi] Response status:', response.status);
  console.log('[getEpisodeDetailsApi] Response data:', JSON.stringify(response.data, null, 2));
  
  return response.data;
};

/**
 * Create a new episode
 * POST /api/v1/clinic/{tenant_id}/episodes
 * 
 * Can optionally link to an appointment by providing appointment_id in the request.
 * When appointment_id is provided, the appointment will be automatically linked to the new episode.
 */
export const createEpisodeApi = async (
  tenantId: string,
  request: EpisodeCreateRequest
): Promise<Episode> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/clinic/${tenantId}/episodes`,
      request
    );
    return response.data;
  } catch (error: any) {
    const detail = error?.response?.data?.detail;
    if (detail) {
      throw new Error(detail);
    }
    throw error;
  }
};

/**
 * Update an existing episode
 * PATCH /api/v1/clinic/{tenant_id}/episodes/{id}
 * 
 * Updates episode metadata. All fields are optional to support partial updates.
 * Only the fields provided in the request will be updated.
 */
export const updateEpisodeApi = async (
  tenantId: string,
  episodeId: string,
  request: EpisodeUpdateRequest
): Promise<Episode> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/episodes/${episodeId}`,
    request
  );
  return response.data;
};

/**
 * Close an active episode
 * POST /api/v1/clinic/{tenant_id}/episodes/{id}/close
 * 
 * Marks an episode as CLOSED to indicate treatment is complete.
 * Once closed, no new appointments can be linked to the episode,
 * but existing appointments and documents remain accessible.
 */
export const closeEpisodeApi = async (
  tenantId: string,
  episodeId: string,
  request?: CloseEpisodeRequest
): Promise<Episode> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/episodes/${episodeId}/close`,
    request || {}
  );
  return response.data;
};

/**
 * Reopen a closed episode
 * POST /api/v1/clinic/{tenant_id}/episodes/{id}/reopen
 * 
 * Changes episode status from CLOSED back to ACTIVE, allowing new appointments
 * to be linked again. Useful when treatment needs to continue after being marked complete.
 */
export const reopenEpisodeApi = async (
  tenantId: string,
  episodeId: string
): Promise<Episode> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/episodes/${episodeId}/reopen`
  );
  return response.data;
};

/**
 * Attach an appointment to an episode
 * POST /api/v1/clinic/{tenant_id}/appointments/{id}/attach-episode
 * 
 * Links an existing appointment to an episode. The appointment will be associated
 * with the specified episode and will appear in the episode's visit history.
 * 
 * Error handling:
 * - Returns error_code 'EPISODE_CLOSED' if attempting to attach to a closed episode
 * - Returns error_code 'EPISODE_MISMATCH' if episode doesn't belong to the same client
 */
export const attachEpisodeToAppointmentApi = async (
  tenantId: string,
  appointmentId: string,
  request: AttachEpisodeRequest
): Promise<void> => {
  await axiosClient.post(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}/attach-episode`,
    request
  );
};

/**
 * Error handling utilities
 */

/**
 * Check if an error is due to attempting to attach to a closed episode
 * @param error - Error object from API call
 * @returns true if error is EPISODE_CLOSED
 */
export const isClosedEpisodeError = (error: any): boolean => {
  return error?.error_code === 'EPISODE_CLOSED' || 
         error?.response?.data?.error_code === 'EPISODE_CLOSED';
};

/**
 * Check if an error is due to episode mismatch (e.g., document episode doesn't match appointment)
 * @param error - Error object from API call
 * @returns true if error is EPISODE_MISMATCH
 */
export const isEpisodeMismatchError = (error: any): boolean => {
  return error?.error_code === 'EPISODE_MISMATCH' || 
         error?.response?.data?.error_code === 'EPISODE_MISMATCH';
};

/**
 * Check if an error is a validation error
 * @param error - Error object from API call
 * @returns true if error is VALIDATION_ERROR
 */
export const isValidationError = (error: any): boolean => {
  return error?.error_code === 'VALIDATION_ERROR' || 
         error?.response?.data?.error_code === 'VALIDATION_ERROR';
};

/**
 * Check if an error is a forbidden/permission error
 * @param error - Error object from API call
 * @returns true if error is FORBIDDEN or status is 403
 */
export const isForbiddenError = (error: any): boolean => {
  return error?.error_code === 'FORBIDDEN' || 
         error?.response?.data?.error_code === 'FORBIDDEN' ||
         error?.response?.status === 403;
};

/**
 * Extract field errors from a validation error response
 * @param error - Error object from API call
 * @returns Record of field names to error messages, or empty object if not a validation error
 */
export const getFieldErrors = (error: any): Record<string, string> => {
  const fieldErrors = error?.details?.field_errors || 
                     error?.response?.data?.details?.field_errors;
  
  if (!fieldErrors) return {};
  
  // Convert array of errors per field to single string
  const result: Record<string, string> = {};
  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (Array.isArray(errors) && errors.length > 0) {
      result[field] = errors[0];
    }
  }
  return result;
};

/**
 * Get user-friendly error message from API error
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  return error?.message || 
         error?.response?.data?.message || 
         'An error occurred. Please try again.';
};
