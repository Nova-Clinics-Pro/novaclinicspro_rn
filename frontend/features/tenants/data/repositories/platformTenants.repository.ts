import { useQuery } from '@tanstack/react-query';
import { getPlatformTenantApi, listPlatformTenantsApi } from '../datasources/platformTenants.api';

// Identity-scoped cache; server-side authority is checked on every request.
export const usePlatformTenantsQuery = (actorId: string | undefined, offset = 0, limit = 25) => {
  return useQuery({
    queryKey: ['platform-tenants', actorId, offset, limit],
    queryFn: () => listPlatformTenantsApi(offset, limit),
    enabled: Boolean(actorId),
    staleTime: 0,
  });
};
export const usePlatformTenantQuery = (actorId: string | undefined, id: string) => {
  return useQuery({
    queryKey: ['platform-tenant', actorId, id],
    queryFn: () => getPlatformTenantApi(id),
    enabled: Boolean(actorId && id),
    staleTime: 0,
  });
};
