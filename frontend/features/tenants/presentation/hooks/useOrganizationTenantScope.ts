import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useOrganizationContextQuery } from '../../../onboarding/data/repositories/onboarding.repository.impl';
import { tenantsKeys } from '../../data/repositories/tenants.repository.impl';

/**
 * Composes tenant-management requests with the server-derived active
 * organization context. This deliberately owns no identity state itself.
 */
export const useOrganizationTenantScope = () => {
  const organizationContext = useOrganizationContextQuery();
  const queryClient = useQueryClient();
  const previousOrganizationId = useRef<string | null>(null);
  const effectiveOrganizationId = organizationContext.data?.effectiveOrganizationId ?? '';
  const scopeMatches = Boolean(
    effectiveOrganizationId &&
      !organizationContext.data?.selectionRequired &&
      !organizationContext.data?.sessionRefreshRequired,
  );
  const organizationId = scopeMatches ? effectiveOrganizationId : '';

  useEffect(() => {
    const previous = previousOrganizationId.current;
    if (previous && previous !== organizationId) {
      const queryKey = tenantsKeys.organization(previous);
      void queryClient.cancelQueries({ queryKey });
      queryClient.removeQueries({ queryKey });
    }
    previousOrganizationId.current = organizationId || null;
  }, [organizationId, queryClient]);

  useEffect(
    () => () => {
      const current = previousOrganizationId.current;
      if (current) {
        const queryKey = tenantsKeys.organization(current);
        void queryClient.cancelQueries({ queryKey });
        queryClient.removeQueries({ queryKey });
      }
    },
    [queryClient],
  );

  return {
    organizationId,
    scopeMatches,
    isLoading: organizationContext.isLoading,
    error: organizationContext.error,
    refetch: organizationContext.refetch,
  };
};
