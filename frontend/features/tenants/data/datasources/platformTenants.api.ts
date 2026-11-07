import { axiosClient } from '../../../../core/api/axiosClient';
import { PlatformTenantQuery } from '../../domain/entities/platformTenant';
import { PlatformTenantDto, PlatformTenantPageDto } from '../models/platformTenants.dtos';

export const listPlatformTenantsApi = async (offset: number, limit: number, query: PlatformTenantQuery = {}): Promise<PlatformTenantPageDto> =>
  (await axiosClient.get<PlatformTenantPageDto>('/api/v1/platform/tenants', { params: { offset, limit, ...query } })).data;
export const getPlatformTenantApi = async (id: string): Promise<PlatformTenantDto> =>
  (await axiosClient.get<PlatformTenantDto>(`/api/v1/platform/tenants/${encodeURIComponent(id)}`)).data;
