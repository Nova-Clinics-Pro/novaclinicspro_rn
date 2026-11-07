import { PlatformTenant, PlatformTenantPage, PlatformTenantQuery } from '../entities/platformTenant';
export interface IPlatformTenantRepository {
  list(offset: number, limit: number, query?: PlatformTenantQuery): Promise<PlatformTenantPage>;
  get(id: string): Promise<PlatformTenant>;
}
