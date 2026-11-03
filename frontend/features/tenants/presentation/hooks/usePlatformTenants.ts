import { PlatformTenantQuery } from '../../domain/entities/platformTenant';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { usePlatformTenantsQuery, usePlatformTenantQuery, usePlatformTenantRefresh as usePlatformTenantRefreshQuery } from '../../data/repositories/platformTenants.repository';

export const usePlatformTenants = (offset = 0, limit = 25, query: PlatformTenantQuery = {}) => {
  const { currentUser } = useAuth();
  return usePlatformTenantsQuery(currentUser?.userId, offset, limit, query);
};
export const usePlatformTenant = (id: string) => {
  const { currentUser } = useAuth();
  return usePlatformTenantQuery(currentUser?.userId, id);
};
/** Awaited, single-tenant refresh used before the extension preparation flow. */
export const usePlatformTenantRefresh = () => {
  const { currentUser } = useAuth();
  return usePlatformTenantRefreshQuery(currentUser?.userId);
};
