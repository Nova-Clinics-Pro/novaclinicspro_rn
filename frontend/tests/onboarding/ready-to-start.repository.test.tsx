import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getReadyToStartApi } from '../../features/onboarding/data/datasources/onboarding.api';
import {
  ReadinessChecklistItemDTO,
  ReadyToStartDatasourceError,
  ReadyToStartResponseDTO,
} from '../../features/onboarding/data/models/onboarding.dtos';
import {
  mapReadyToStart,
  onboardingKeys,
  readyToStartRepository,
  shouldRetryReadyToStart,
  useClearReadyToStartCache,
  useReadyToStartQuery,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { ReadyToStartError } from '../../features/onboarding/domain/entities/ready-to-start.entity';

jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  getReadyToStartApi: jest.fn(),
}));

const mockGetReadyToStartApi = getReadyToStartApi as jest.Mock;

const item = (
  providerId: string,
  itemId: string,
  classification: 'BLOCKER' | 'ADVISORY' | null
): ReadinessChecklistItemDTO => ({
  provider_id: providerId,
  item_id: itemId,
  item_version: '1',
  title_token: `readiness.${itemId}.title`,
  explanation_token: `readiness.${itemId}.explanation`,
  status: classification === 'BLOCKER' ? 'BLOCKED' : classification === 'ADVISORY' ? 'ADVISORY' : 'COMPLETE',
  classification,
  evidence_timestamp: '2026-07-22T12:00:00Z',
  order: classification === 'BLOCKER' ? 9 : 2,
  applicable: true,
  next_action: null,
});

const dto = (tenantId: string): ReadyToStartResponseDTO => {
  const blocker = item('journey_setup_progress', 'profile', 'BLOCKER');
  const advisory = item('journey_setup_progress', 'optional-tip', 'ADVISORY');
  const complete = item('workspace_preparation', 'workspace', null);
  return {
    identity: {
      readiness_contract_version: 'ready_to_start_v1',
      tenant_id: tenantId,
      journey_projection_identity: {
        template_version: 'template-v5',
        capability_revision: 'cap-v1:revision',
      },
      provider_set_revision: 'providers-v1',
      evidence_revision: 'evidence-v7',
    },
    state: 'NOT_READY',
    providers: [
      {
        provider_id: 'workspace_preparation',
        provider_version: 'workspace-v1',
        provider_order: 8,
        applicable: true,
        state: 'READY',
        outcome: 'SATISFIED',
        evidence_revision: 'workspace-evidence-v2',
        observed_at: '2026-07-22T12:00:00Z',
        severity: 'readiness.severity.complete',
        explanation_token: 'readiness.workspace.complete',
        next_action: null,
      },
      {
        provider_id: 'journey_setup_progress',
        provider_version: 'journey-v1',
        provider_order: 1,
        applicable: true,
        state: 'NOT_READY',
        outcome: 'BLOCKER',
        evidence_revision: 'journey-evidence-v4',
        observed_at: '2026-07-22T12:00:00Z',
        severity: 'readiness.severity.blocker',
        explanation_token: 'readiness.journey.blocked',
        next_action: {
          action_id: 'readiness.refresh',
          label_token: 'readiness.actions.refresh',
          owner_id: 'ready_to_start',
          kind: 'REFRESH',
          authorization_requirement: 'tenant.read',
          target_id: null,
        },
      },
    ],
    checklist: [complete, blocker, advisory],
    blockers: [blocker],
    advisories: [advisory],
    evaluated_at: '2026-07-22T12:00:01Z',
    authorizes_handoff: false,
  };
};

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperFor = (queryClient: QueryClient) => {
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  QueryWrapper.displayName = 'ReadyToStartQueryWrapper';
  return QueryWrapper;
};

describe('Ready to Start repository and query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReadyToStartApi.mockImplementation(async (tenantId: string) => dto(tenantId));
  });

  it('maps an immutable aggregate while preserving identity, ordering, revisions, and provider metadata', async () => {
    const result = await readyToStartRepository.getReadyToStart('tenant-1');

    expect(result.identity).toEqual({
      readinessContractVersion: 'ready_to_start_v1',
      tenantId: 'tenant-1',
      journeyProjectionIdentity: {
        templateVersion: 'template-v5',
        capabilityRevision: 'cap-v1:revision',
      },
      providerSetRevision: 'providers-v1',
      evidenceRevision: 'evidence-v7',
    });
    expect(result.providers.map((provider) => provider.providerId)).toEqual([
      'workspace_preparation',
      'journey_setup_progress',
    ]);
    expect(result.providers[0]).toMatchObject({
      providerOrder: 8,
      providerVersion: 'workspace-v1',
      evidenceRevision: 'workspace-evidence-v2',
    });
    expect(result.checklist.map((entry) => entry.itemId)).toEqual([
      'workspace',
      'profile',
      'optional-tip',
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.identity)).toBe(true);
    expect(Object.isFrozen(result.providers)).toBe(true);
    expect(Object.isFrozen(result.checklist[0])).toBe(true);
  });

  it('rejects mismatched tenant identity and invalid aggregate values', () => {
    expect(() => mapReadyToStart(dto('tenant-other'), 'tenant-1')).toThrow(
      expect.objectContaining({ kind: 'TENANT_MISMATCH' })
    );
    expect(() =>
      mapReadyToStart({ ...dto('tenant-1'), state: 'FUTURE_STATE' } as never, 'tenant-1')
    ).toThrow(expect.objectContaining({ kind: 'INVALID_AGGREGATE' }));
    expect(() =>
      mapReadyToStart({
        ...dto('tenant-1'),
        identity: {
          ...dto('tenant-1').identity,
          readiness_contract_version: 'ready_to_start_v2',
        },
      } as never, 'tenant-1')
    ).toThrow(expect.objectContaining({ kind: 'UNSUPPORTED_CONTRACT' }));
  });

  it.each([
    [401, 'readiness.organization_unavailable', 'UNAUTHORIZED'],
    [403, 'readiness.forbidden', 'FORBIDDEN'],
    [409, 'readiness.tenant_mismatch', 'TENANT_MISMATCH'],
    [403, 'readiness.organization_mismatch', 'ORGANIZATION_MISMATCH'],
    [422, 'readiness.unsupported_contract', 'UNSUPPORTED_CONTRACT'],
    [409, 'readiness.stale', 'STALE_PROJECTION'],
    [503, 'readiness.provider_unavailable', 'READINESS_UNAVAILABLE'],
    [422, 'readiness.provider_configuration', 'INVALID_AGGREGATE'],
    [500, 'readiness.evaluation_failure', 'BACKEND_FAILURE'],
  ])('maps %s %s to %s', async (httpStatus, code, kind) => {
    mockGetReadyToStartApi.mockRejectedValue(
      new ReadyToStartDatasourceError(code, `errors.${code}`, code.includes('unavailable'), httpStatus)
    );
    await expect(readyToStartRepository.getReadyToStart('tenant-1')).rejects.toMatchObject({
      kind,
      code,
    });
  });

  it('uses an organization, tenant, and contract-scoped cache key', () => {
    expect(onboardingKeys.readiness('org-1', 'tenant-1')).toEqual([
      'onboarding',
      'ready-to-start',
      'org-1',
      'tenant-1',
      'ready_to_start_v1',
    ]);
  });

  it('isolates tenants, supports refresh, and forwards cancellation signals', async () => {
    const queryClient = createClient();
    let tenantId = 'tenant-1';
    const { result, rerender, unmount } = renderHook(
      () => useReadyToStartQuery('org-1', tenantId),
      { wrapper: wrapperFor(queryClient) }
    );
    await waitFor(() => expect(result.current.data?.identity.tenantId).toBe('tenant-1'));

    await act(async () => {
      await result.current.refetch();
    });
    tenantId = 'tenant-2';
    rerender(undefined);
    await waitFor(() => expect(result.current.data?.identity.tenantId).toBe('tenant-2'));

    expect(mockGetReadyToStartApi).toHaveBeenCalledWith('tenant-1', expect.any(AbortSignal));
    expect(mockGetReadyToStartApi).toHaveBeenCalledWith('tenant-2', expect.any(AbortSignal));
    expect(mockGetReadyToStartApi.mock.calls.filter((call) => call[0] === 'tenant-1'))
      .toHaveLength(2);
    expect(queryClient.getQueryData(onboardingKeys.readiness('org-1', 'tenant-1')))
      .toBeDefined();
    expect(queryClient.getQueryData(onboardingKeys.readiness('org-1', 'tenant-2')))
      .toBeDefined();
    unmount();
    queryClient.clear();
  });

  it('cancels and removes only the outgoing tenant readiness cache', async () => {
    const queryClient = createClient();
    queryClient.setQueryData(onboardingKeys.readiness('org-1', 'tenant-1'), { tenant: 1 });
    queryClient.setQueryData(onboardingKeys.readiness('org-1', 'tenant-2'), { tenant: 2 });
    const cancel = jest.spyOn(queryClient, 'cancelQueries');
    const { result, unmount } = renderHook(() => useClearReadyToStartCache(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => result.current('org-1', 'tenant-1'));

    expect(cancel).toHaveBeenCalledWith({
      queryKey: onboardingKeys.readinesses('org-1', 'tenant-1'),
    });
    expect(queryClient.getQueryData(onboardingKeys.readiness('org-1', 'tenant-1')))
      .toBeUndefined();
    expect(queryClient.getQueryData(onboardingKeys.readiness('org-1', 'tenant-2')))
      .toEqual({ tenant: 2 });
    unmount();
    queryClient.clear();
  });

  it('retries only bounded retryable typed failures', () => {
    expect(
      shouldRetryReadyToStart(
        1,
        new ReadyToStartError('READINESS_UNAVAILABLE', 'code', 'token', true)
      )
    ).toBe(true);
    expect(
      shouldRetryReadyToStart(
        2,
        new ReadyToStartError('READINESS_UNAVAILABLE', 'code', 'token', true)
      )
    ).toBe(false);
    expect(shouldRetryReadyToStart(0, new Error('raw'))).toBe(false);
  });
});
