/**
 * Operating Hours API
 * Handles all HTTP calls for operating hours management
 * 
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  OperatingHourCreate,
  OperatingHourUpdate,
  OperatingHourResponse,
  ListOperatingHoursParams,
  PaginatedOperatingHoursResponse,
  OnboardingOperatingHoursSourceItem,
} from '../models/operatingHours.dtos';

/**
 * List operating hours for a tenant
 * GET /api/v1/clinic/{tenant_id}/operating-hours
 */
export const listOperatingHoursApi = async (
  tenantId: string,
  params?: ListOperatingHoursParams
): Promise<PaginatedOperatingHoursResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/operating-hours`,
    { params }
  );
  return response.data;
};

/**
 * Read the legacy named-day array used by onboarding.
 * Successful non-array responses preserve onboarding's historical empty state.
 */
export const listOnboardingOperatingHoursApi = async (
  tenantId: string
): Promise<OnboardingOperatingHoursSourceItem[]> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/operating-hours`
  );
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Get a single operating hour entry
 * GET /api/v1/clinic/{tenant_id}/operating-hours/{operating_hour_id}
 */
export const getOperatingHourApi = async (
  tenantId: string,
  operatingHourId: string
): Promise<OperatingHourResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/operating-hours/${operatingHourId}`
  );
  return response.data;
};

/**
 * Create operating hours for a day
 * POST /api/v1/clinic/{tenant_id}/operating-hours
 */
export const createOperatingHourApi = async (
  tenantId: string,
  payload: OperatingHourCreate
): Promise<OperatingHourResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/operating-hours`,
    payload
  );
  return response.data;
};

/**
 * Update operating hours
 * PATCH /api/v1/clinic/{tenant_id}/operating-hours/{operating_hour_id}
 */
export const updateOperatingHourApi = async (
  tenantId: string,
  operatingHourId: string,
  payload: OperatingHourUpdate
): Promise<OperatingHourResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/operating-hours/${operatingHourId}`,
    payload
  );
  return response.data;
};

/**
 * Delete operating hours
 * DELETE /api/v1/clinic/{tenant_id}/operating-hours/{operating_hour_id}
 */
export const deleteOperatingHourApi = async (
  tenantId: string,
  operatingHourId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/operating-hours/${operatingHourId}`
  );
};
