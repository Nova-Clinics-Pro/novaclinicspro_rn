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

export class OrganizationContextRequiredError extends Error {
  constructor() {
    super('organization_context_required');
    this.name = 'OrganizationContextRequiredError';
  }
}

const organizationParams = (organizationId: string) => {
  if (!organizationId) {
    throw new OrganizationContextRequiredError();
  }

  // FastAPI binds this scalar separately from the JSON tenant DTO.  It must
  // remain an encoded query parameter for create, read, and update requests.
  return { organization_id: organizationId };
};

/**
 * List all tenants
 * GET /api/v1/org/tenants
 */
export const listTenantsApi = async (
  organizationId: string,
  params?: ListTenantsParams
): Promise<OrgTenantResponse[]> => {
  const response = await axiosClient.get('/api/v1/org/tenants', {
    params: { ...params, ...organizationParams(organizationId) },
  });
  return response.data;
};

/**
 * Get tenant by ID
 * GET /api/v1/org/tenants/{tenant_id}
 */
export const getTenantApi = async (
  organizationId: string,
  id: string,
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.get(`/api/v1/org/tenants/${id}`, {
    params: organizationParams(organizationId),
  });
  return response.data;
};

/**
 * Create new tenant
 * POST /api/v1/org/tenants
 */
export const createTenantApi = async (
  organizationId: string,
  payload: OrgTenantCreate
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.post('/api/v1/org/tenants', payload, {
    params: organizationParams(organizationId),
  });
  return response.data;
};

/**
 * Update tenant
 * PATCH /api/v1/org/tenants/{tenant_id}
 */
export const updateTenantApi = async (
  organizationId: string,
  id: string,
  payload: OrgTenantUpdate
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.patch(`/api/v1/org/tenants/${id}`, payload, {
    params: organizationParams(organizationId),
  });
  return response.data;
};

/**
 * Deactivate tenant (soft delete via status update)
 * PATCH /api/v1/org/tenants/{tenant_id}
 */
export const deactivateTenantApi = async (
  organizationId: string,
  id: string,
): Promise<OrgTenantResponse> => {
  const response = await axiosClient.patch(`/api/v1/org/tenants/${id}`, {
    is_active: false,
  }, {
    params: organizationParams(organizationId),
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

/** Upload branding media through the tenant-scoped profile API. */
export const uploadCurrentTenantClinicLogoApi = async (
  tenantId: string,
  clinicLogo: string,
): Promise<{ clinic_logo?: string | null }> =>
  (await axiosClient.post<{ clinic_logo?: string | null }>(`/api/v1/tenants/${tenantId}/upload-logo`, {
    clinic_logo: clinicLogo,
  })).data;
