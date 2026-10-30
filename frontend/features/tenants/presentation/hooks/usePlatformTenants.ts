import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { usePlatformTenantsQuery, usePlatformTenantQuery } from '../../data/repositories/platformTenants.repository';

export const usePlatformTenants = (offset = 0, limit = 25) => {
  const { currentUser } = useAuth();
  return usePlatformTenantsQuery(currentUser?.userId, offset, limit);
};
export const usePlatformTenant = (id: string) => {
  const { currentUser } = useAuth();
  return usePlatformTenantQuery(currentUser?.userId, id);
};
