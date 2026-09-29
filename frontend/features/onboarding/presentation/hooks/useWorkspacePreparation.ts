import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useEnsureWorkspacePreparationMutation,
  useClearWorkspacePreparationCache,
  useOrganizationContextQuery,
  useRetryWorkspacePreparationMutation,
  useWorkspacePreparationQuery,
} from '../../data/repositories/onboarding.repository.impl';
import {
  WorkspacePreparationFailureInformation,
  WorkspacePreparationOrchestrationState,
} from '../../domain/entities/workspace-preparation.entity';
import {
  deriveWorkspacePreparationState,
  translateWorkspacePreparationError,
} from '../../domain/usecases/build-workspace-preparation-view-model.usecase';

export interface WorkspacePreparationPresentationState {
  readonly loading: boolean;
  readonly domain: WorkspacePreparationOrchestrationState | null;
  readonly error: WorkspacePreparationFailureInformation | null;
  readonly retrying: boolean;
  readonly personalizing: boolean;
  readonly retry: () => Promise<void>;
  readonly reload: () => Promise<void>;
  readonly preparePersonalizationHandoff: () => Promise<boolean>;
}

export const useWorkspacePreparation = (
  tenantId: string,
  requestedOrganizationId?: string | null
): WorkspacePreparationPresentationState => {
  const organizationContext = useOrganizationContextQuery();
  const organizationId =
    requestedOrganizationId ?? organizationContext.data?.effectiveOrganizationId ?? '';
  const scopeMatches = Boolean(
    organizationId &&
      tenantId &&
      organizationContext.data?.effectiveOrganizationId === organizationId &&
      organizationContext.data?.effectiveTenantId === tenantId
  );
  const scope = `${organizationId}:${tenantId}`;
  const previousScope = useRef(scope);
  const operationScopeMatches = previousScope.current === scope;
  const ensure = useEnsureWorkspacePreparationMutation(organizationId, tenantId);
  const status = useWorkspacePreparationQuery(organizationId, tenantId, {
    enabled: scopeMatches && operationScopeMatches && ensure.isSuccess,
    refetchInterval: (query) => {
      const current = query.state.data;
      if (!current || !['PENDING', 'PREPARING'].includes(current.state)) return false;
      return current.refreshAfterSeconds === null
        ? false
        : current.refreshAfterSeconds * 1000;
    },
  });
  const retryMutation = useRetryWorkspacePreparationMutation(organizationId, tenantId);
  const clearPreparationCache = useClearWorkspacePreparationCache();
  const retryInFlight = useRef(false);
  const personalizationInFlight = useRef(false);
  const ensureStartedScope = useRef<string | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [handoffMismatch, setHandoffMismatch] = useState(false);
  const ensureIdle = ensure.isIdle;
  const ensurePreparation = ensure.mutate;

  useEffect(() => {
    if (previousScope.current !== scope) {
      previousScope.current = scope;
      retryInFlight.current = false;
      personalizationInFlight.current = false;
      ensureStartedScope.current = null;
      setHandoffMismatch(false);
      setPersonalizing(false);
      ensure.reset();
      retryMutation.reset();
    }
  }, [ensure, retryMutation, scope]);

  useEffect(() => {
    if (
      scopeMatches &&
      operationScopeMatches &&
      ensureIdle &&
      ensureStartedScope.current !== scope
    ) {
      ensureStartedScope.current = scope;
      ensurePreparation();
    }
  }, [ensureIdle, ensurePreparation, operationScopeMatches, scope, scopeMatches]);

  useEffect(
    () => () => {
      if (organizationId && tenantId) {
        void clearPreparationCache(organizationId, tenantId);
      }
    },
    [clearPreparationCache, organizationId, tenantId]
  );

  const preparation =
    scopeMatches && operationScopeMatches ? (status.data ?? null) : null;
  const domain = useMemo(
    () => (preparation ? deriveWorkspacePreparationState(preparation) : null),
    [preparation]
  );
  const rawError = organizationContext.error ?? ensure.error ?? status.error ?? retryMutation.error;
  const error = useMemo(
    () => {
      if (rawError) return translateWorkspacePreparationError(rawError);
      if ((!organizationContext.isLoading && !scopeMatches) || handoffMismatch) {
        return {
          kind: 'TERMINAL' as const,
          reasonCode: 'workspace_preparation.tenant_mismatch',
          messageToken: 'errors.workspacePreparation.tenant_mismatch',
        };
      }
      return null;
    }, [handoffMismatch, organizationContext.isLoading, rawError, scopeMatches]
  );

  const retry = useCallback(async () => {
    if (!domain?.retry.available || retryInFlight.current) return;
    retryInFlight.current = true;
    try {
      await retryMutation.mutateAsync({ aggregateVersion: domain.aggregateVersion });
    } finally {
      retryInFlight.current = false;
    }
  }, [domain, retryMutation]);

  const reload = useCallback(async () => {
    if (!scopeMatches) {
      await organizationContext.refetch();
      return;
    }
    if (ensure.isError) {
      await ensure.mutateAsync();
      return;
    }
    if (retryMutation.error) retryMutation.reset();
    await status.refetch();
  }, [ensure, organizationContext, retryMutation, scopeMatches, status]);

  const preparePersonalizationHandoff = useCallback(async (): Promise<boolean> => {
    if (!domain?.personalizationAvailable || personalizationInFlight.current) return false;
    personalizationInFlight.current = true;
    setPersonalizing(true);
    try {
      const refreshed = await organizationContext.refetch();
      const matches =
        refreshed.data?.effectiveOrganizationId === organizationId &&
        refreshed.data?.effectiveTenantId === tenantId;
      setHandoffMismatch(!matches);
      return matches;
    } catch {
      setHandoffMismatch(true);
      return false;
    } finally {
      personalizationInFlight.current = false;
      setPersonalizing(false);
    }
  }, [domain?.personalizationAvailable, organizationContext, organizationId, tenantId]);

  return {
    loading:
      organizationContext.isLoading ||
      (scopeMatches &&
        (!operationScopeMatches ||
          ensure.isIdle ||
          ensure.isPending ||
          (ensure.isSuccess && status.isLoading))),
    domain,
    error,
    retrying: retryMutation.isPending,
    personalizing,
    retry,
    reload,
    preparePersonalizationHandoff,
  };
};
