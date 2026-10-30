import { axiosClient } from '../../../../core/api/axiosClient';
import { PlatformTenant, PlatformTenantPage } from '../../domain/entities/platformTenant';

export const listPlatformTenantsApi = async (offset: number, limit: number): Promise<PlatformTenantPage> =>
  (await axiosClient.get<PlatformTenantPage>('/api/v1/platform/tenants', { params: { offset, limit } })).data;

export const getPlatformTenantApi = async (id: string): Promise<PlatformTenant> =>
  (await axiosClient.get<PlatformTenant>(`/api/v1/platform/tenants/${encodeURIComponent(id)}`)).data;
