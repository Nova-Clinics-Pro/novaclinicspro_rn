import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import {
  useClearReadyToStartCache,
  useOrganizationContextQuery,
  useReadyToStartQuery,
} from '../../data/repositories/onboarding.repository.impl';
import { ReadyToStartError } from '../../domain/entities/ready-to-start.entity';

export const useReadyToStart = (tenantId: string) => {
  const organizationContext = useOrganizationContextQuery();
  const organizationId = organizationContext.data?.effectiveOrganizationId ?? '';
  const scopeMatches = Boolean(
    organizationId &&
      tenantId &&
      organizationContext.data?.effectiveTenantId === tenantId &&
      !organizationContext.data?.sessionRefreshRequired
  );
  const query = useReadyToStartQuery(organizationId, tenantId, { enabled: scopeMatches });
  const clearCache = useClearReadyToStartCache();
  const previousScope = useRef<{ organizationId: string; tenantId: string } | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasMatchingIdentity = query.data?.identity.tenantId === tenantId;

  useEffect(() => {
    const previous = previousScope.current;
    if (
      previous &&
      (previous.organizationId !== organizationId || previous.tenantId !== tenantId)
    ) {
      void clearCache(previous.organizationId, previous.tenantId);
    }
    previousScope.current = organizationId && tenantId ? { organizationId, tenantId } : null;
  }, [clearCache, organizationId, tenantId]);

  useEffect(
    () => () => {
      const current = previousScope.current;
      if (current) void clearCache(current.organizationId, current.tenantId);
    },
    [clearCache]
  );

  const refresh = useCallback(async () => {
    if (!scopeMatches) {
      await organizationContext.refetch();
      return;
    }
    await query.refetch();
  }, [organizationContext, query, scopeMatches]);

  const revalidateTenant = useCallback(async (): Promise<boolean> => {
    const refreshed = await organizationContext.refetch();
    return Boolean(
      refreshed.data?.effectiveOrganizationId === organizationId &&
        refreshed.data?.effectiveTenantId === tenantId &&
        !refreshed.data?.sessionRefreshRequired
    );
  }, [organizationContext, organizationId, tenantId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const previousState = appState.current;
      appState.current = nextState;
      if (
        nextState === 'active' &&
        previousState !== 'active' &&
        scopeMatches
      ) {
        void query.refetch();
      }
    });
    return () => subscription.remove();
  }, [query, scopeMatches]);

  const scopeError =
    !organizationContext.isLoading && !scopeMatches
      ? new ReadyToStartError(
          'TENANT_MISMATCH',
          'readiness.tenant_mismatch',
          'errors.readyToStart.tenant_mismatch',
          false
        )
      : null;

  return {
    data: scopeMatches && hasMatchingIdentity ? query.data : undefined,
    error: organizationContext.error ?? scopeError ?? query.error,
    // Missing data after a terminal query failure is an error state, not a
    // pending state. Retaining the identity guard here would otherwise keep
    // the Ready-to-Start screen on its spinner after a bounded 503 retry.
    loading: organizationContext.isLoading || (scopeMatches && query.isLoading),
    refreshing: query.isRefetching,
    refresh,
    revalidateTenant,
    scopeMatches,
  };
};
