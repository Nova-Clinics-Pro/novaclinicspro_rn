import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  PendingMutationReplayCoordinator,
} from '../../application/pending-mutation-replay.coordinator';
import type { PendingMutationScope } from '../../domain/entities/pending-mutation.entity';

interface UsePendingMutationReplayLifecycleInput {
  readonly coordinator: PendingMutationReplayCoordinator;
  readonly scope: PendingMutationScope | null;
  readonly isAuthenticated: boolean;
}

export const usePendingMutationReplayLifecycle = ({
  coordinator,
  scope,
  isAuthenticated,
}: UsePendingMutationReplayLifecycleInput): void => {
  const netInfo = useNetInfo();
  const previousOnline = useRef(false);
  const previousScope = useRef<PendingMutationScope | null>(null);
  const previousAuthenticatedUser = useRef<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const scopeUserId = scope?.userId ?? null;
  const scopeOrganizationId = scope?.organizationId ?? null;
  const scopeTenantId = scope?.tenantId ?? null;
  const online =
    netInfo.isConnected === true && netInfo.isInternetReachable !== false;

  useEffect(() => {
    const activeScope =
      scopeUserId && scopeOrganizationId && scopeTenantId
        ? {
          userId: scopeUserId,
          organizationId: scopeOrganizationId,
          tenantId: scopeTenantId,
        }
        : null;
    const prior = previousScope.current;
    const changed = Boolean(
      prior &&
        (!activeScope ||
          prior.userId !== activeScope.userId ||
          prior.organizationId !== activeScope.organizationId ||
          prior.tenantId !== activeScope.tenantId)
    );
    previousScope.current = activeScope;
    if (!activeScope || !isAuthenticated || (prior && !changed)) return;

    previousAuthenticatedUser.current = activeScope.userId;
    let cancelled = false;
    const activate = async () => {
      if (changed) await coordinator.cancelAndEvict();
      if (cancelled) return;
      await coordinator.initialize(activeScope);
      if (!cancelled) await coordinator.requestReplay('RESTART');
    };
    void activate();
    return () => {
      cancelled = true;
    };
  }, [
    coordinator,
    isAuthenticated,
    scopeOrganizationId,
    scopeTenantId,
    scopeUserId,
  ]);

  useEffect(() => {
    coordinator.setConnectivity(online);
    if (scopeTenantId && isAuthenticated && online && !previousOnline.current) {
      void coordinator.requestReplay('RECONNECT');
    }
    previousOnline.current = online;
  }, [coordinator, isAuthenticated, online, scopeTenantId]);

  useEffect(() => {
    if (!isAuthenticated && previousAuthenticatedUser.current) {
      const userId = previousAuthenticatedUser.current;
      previousAuthenticatedUser.current = null;
      previousScope.current = null;
      void coordinator.logout(userId);
    }
  }, [coordinator, isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prior = appState.current;
      appState.current = nextState;
      if (
        nextState === 'active' &&
        (prior === 'inactive' || prior === 'background')
      ) {
        void coordinator.requestReplay('FOREGROUND');
      }
    });
    return () => subscription.remove();
  }, [coordinator]);

  useEffect(
    () => () => {
      void coordinator.cancelAndEvict();
    },
    [coordinator]
  );
};
