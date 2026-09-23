/**
 * Tenants API Datasource
 * Handles all HTTP calls for tenant management
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  OrgTenantResponse,
  OrgTenantCreate,
  OrgTenantUpdate,
  TenantClinicProfileUpdate,
  TenantClinicProfile,
  ListTenantsParams,
} from '../models/tenants.dtos';

/**
 * List all tenants
 * GET /api/v1/org/tenants
 */
export const listTenantsApi = async (
  params?: ListTenantsParams
): Promise<OrgTenantResponse[]> => {
  const response = await axiosClient.get('/api/v1/org/tenants', {
    params,
  });
  return response.data;
};

/**
 * Get tenant by ID
 * GET /api/v1/org/tenants/{tenant_id}
 */
export const getTenantApi = async (id: string): Promise<OrgTenantResponse> => {
  const response = await axiosClient.get(`/api/v1/org/tenants/${id}`);
  return response.data;
};

/**
 * Create new tenant
 * POST /api/v1/org/tenants
 */
export const createTenantApi = async (
  payload: OrgTenantCreate
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.post('/api/v1/org/tenants', payload);
  return response.data;
};

/**
 * Update tenant
 * PATCH /api/v1/org/tenants/{tenant_id}
 */
export const updateTenantApi = async (
  id: string,
  payload: OrgTenantUpdate
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.patch(`/api/v1/org/tenants/${id}`, payload);
  return response.data;
};

/**
 * Deactivate tenant (soft delete via status update)
 * PATCH /api/v1/org/tenants/{tenant_id}
 */
export const deactivateTenantApi = async (id: string): Promise<OrgTenantResponse> => {
  const response = await axiosClient.patch(`/api/v1/org/tenants/${id}`, {
    is_active: false,
  });
  return response.data;
};

/**
 * Get the current tenant through the tenant-scoped self-service route.
 * GET /api/v1/tenants/{tenant_id}
 */
export const getCurrentTenantApi = async (
  tenantId: string
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.get<OrgTenantResponse>(
    `/api/v1/tenants/${tenantId}`
  );
  return response.data;
};

/** PATCH /api/v1/tenants/{tenant_id}/clinic-profile */
export const updateCurrentTenantClinicProfileApi = async (
  tenantId: string,
  payload: TenantClinicProfileUpdate,
): Promise<TenantClinicProfile> => {
  const response = await axiosClient.patch<TenantClinicProfile>(
    `/api/v1/tenants/${tenantId}/clinic-profile`,
    payload,
  );
  return response.data;
};

export const getCurrentTenantClinicProfileApi = async (tenantId: string): Promise<TenantClinicProfile> =>
  (await axiosClient.get<TenantClinicProfile>(`/api/v1/tenants/${tenantId}/clinic-profile`)).data;
