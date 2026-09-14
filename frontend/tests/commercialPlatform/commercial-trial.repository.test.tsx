import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  activateCommercialTrialApi,
  getCommercialTrialApi,
} from '../../features/commercialPlatform/data/datasources/commercial-trial.api';
import {
  CommercialTrialDatasourceError,
  CommercialTrialError,
  CommercialTrialResponseDTO,
} from '../../features/commercialPlatform/contracts/commercial-trial';
import {
  commercialTrialRepository,
  mapCommercialTrial,
  commercialTrialKeys,
  shouldRetryCommercialTrial,
  useActivateCommercialTrialMutation,
  useClearCommercialTrialCache,
  useCommercialTrialQuery,
} from '../../features/commercialPlatform/data/repositories/commercial-trial.repository.impl';

jest.mock('../../features/commercialPlatform/data/datasources/commercial-trial.api', () => ({
  activateCommercialTrialApi: jest.fn(),
  getCommercialTrialApi: jest.fn(),
  grantCommercialTrialExtensionApi: jest.fn(),
  requestCommercialTrialExtensionApi: jest.fn(),
  requestCommercialTrialSubscriptionApi: jest.fn(),
}));

const mockGet = getCommercialTrialApi as jest.Mock;
const mockActivate = activateCommercialTrialApi as jest.Mock;

const dto = (
  organizationId = 'org-1',
  tenantId = 'tenant-1',
  aggregateVersion = 3
): CommercialTrialResponseDTO => ({
  contract_version: 'commercial_trial_v1',
  trial_id: 'trial-1',
  organization_id: organizationId,
  tenant_id: tenantId,
  state: 'ACTIVE',
  aggregate_version: aggregateVersion,
  activation_at: '2026-07-29T10:00:00Z',
  expires_at: '2026-08-28T10:00:00Z',
  final_notice_starts_at: null,
  allowed_actions: ['REQUEST_EXTENSION'],
});

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

const wrapperFor = (queryClient: QueryClient) => {
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  QueryWrapper.displayName = 'CommercialTrialQueryWrapper';
  return QueryWrapper;
};

describe('Commercial Trial repository and query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation(async (_tenantId: string) => dto());
    mockActivate.mockImplementation(async () => dto('org-1', 'tenant-1', 4));
  });

  it('maps the immutable Version 1 aggregate without deriving policy', async () => {
    const result = await commercialTrialRepository.getCommercialTrial(
      'org-1',
      'tenant-1'
    );

    expect(result).toEqual({
      contractVersion: 'commercial_trial_v1',
      trialId: 'trial-1',
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      state: 'ACTIVE',
      aggregateVersion: 3,
      activationAt: '2026-07-29T10:00:00Z',
      expiresAt: '2026-08-28T10:00:00Z',
      finalNoticeStartsAt: null,
      allowedActions: ['REQUEST_EXTENSION'],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.allowedActions)).toBe(true);
  });

  it('fails closed for unknown contracts, states, actions, and mismatched scope', () => {
    expect(() =>
      mapCommercialTrial(
        { ...dto(), contract_version: 'commercial_trial_v2' },
        'org-1',
        'tenant-1'
      )
    ).toThrow(expect.objectContaining({ kind: 'UNSUPPORTED_CONTRACT' }));
    expect(() =>
      mapCommercialTrial({ ...dto(), state: 'FUTURE' }, 'org-1', 'tenant-1')
    ).toThrow(expect.objectContaining({ kind: 'INVALID_AGGREGATE' }));
    expect(() =>
      mapCommercialTrial({ ...dto(), allowed_actions: ['DOWNLOADS'] }, 'org-1', 'tenant-1')
    ).toThrow(expect.objectContaining({ kind: 'INVALID_AGGREGATE' }));
    expect(() => mapCommercialTrial(dto('org-other'), 'org-1', 'tenant-1')).toThrow(
      expect.objectContaining({ kind: 'ORGANIZATION_MISMATCH' })
    );
    expect(() => mapCommercialTrial(dto('org-1', 'tenant-other'), 'org-1', 'tenant-1')).toThrow(
      expect.objectContaining({ kind: 'TENANT_MISMATCH' })
    );
  });

  it.each([
    [401, 'commercial_trial.application_failure', 'UNAUTHORIZED'],
    [403, 'commercial_trial.forbidden', 'FORBIDDEN'],
    [409, 'commercial_trial.activation_conflict', 'CONFLICT'],
    [422, 'commercial_trial.not_ready', 'NOT_READY'],
    [422, 'commercial_trial.confirmation_required', 'CONFIRMATION_REQUIRED'],
    [404, 'commercial_trial.not_found', 'NOT_FOUND'],
    [500, 'commercial_trial.application_failure', 'BACKEND_FAILURE'],
  ])('maps %s %s to %s', async (httpStatus, code, kind) => {
    mockGet.mockRejectedValue(
      new CommercialTrialDatasourceError(code, `errors.${code}`, httpStatus === 500, httpStatus)
    );
    await expect(
      commercialTrialRepository.getCommercialTrial('org-1', 'tenant-1')
    ).rejects.toMatchObject({ kind, code });
  });

  it('uses an organization, tenant, and contract-scoped query with cancellation', async () => {
    const queryClient = createClient();
    const { result, unmount } = renderHook(
      () => useCommercialTrialQuery('org-1', 'tenant-1'),
      { wrapper: wrapperFor(queryClient) }
    );
    await waitFor(() => expect(result.current.data?.trialId).toBe('trial-1'));

    expect(commercialTrialKeys.commercialTrial('org-1', 'tenant-1')).toEqual([
      'onboarding',
      'commercial-trial',
      'org-1',
      'tenant-1',
      'commercial_trial_v1',
    ]);
    expect(mockGet).toHaveBeenCalledWith('tenant-1', expect.any(AbortSignal));
    unmount();
    queryClient.clear();
  });

  it('cancels and removes only the outgoing commercial-trial scope', async () => {
    const queryClient = createClient();
    queryClient.setQueryData(commercialTrialKeys.commercialTrial('org-1', 'tenant-1'), dto());
    queryClient.setQueryData(commercialTrialKeys.commercialTrial('org-1', 'tenant-2'), dto());
    const { result, unmount } = renderHook(() => useClearCommercialTrialCache(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => result.current('org-1', 'tenant-1'));

    expect(queryClient.getQueryData(commercialTrialKeys.commercialTrial('org-1', 'tenant-1')))
      .toBeUndefined();
    expect(queryClient.getQueryData(commercialTrialKeys.commercialTrial('org-1', 'tenant-2')))
      .toBeDefined();
    unmount();
    queryClient.clear();
  });

  it('preserves caller idempotency, disables mutation retry, and rejects stale cache overwrite', async () => {
    const queryClient = createClient();
    const queryKey = commercialTrialKeys.commercialTrial('org-1', 'tenant-1');
    queryClient.setQueryData(
      queryKey,
      mapCommercialTrial(dto('org-1', 'tenant-1', 8), 'org-1', 'tenant-1')
    );
    const { result, unmount } = renderHook(
      () => useActivateCommercialTrialMutation('org-1', 'tenant-1'),
      { wrapper: wrapperFor(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({
        aggregateVersion: 3,
        confirmed: true,
        idempotencyKey: 'activation-key',
      });
    });

    expect(mockActivate).toHaveBeenCalledWith(
      'tenant-1',
      {
        contract_version: 'commercial_trial_v1',
        aggregate_version: 3,
        confirmed: true,
      },
      'activation-key'
    );
    expect(result.current.failureCount).toBe(0);
    expect(queryClient.getQueryData<ReturnType<typeof mapCommercialTrial>>(queryKey))
      .toMatchObject({ aggregateVersion: 8 });
    unmount();
    queryClient.clear();
  });

  it('retries only bounded retryable query failures', () => {
    expect(
      shouldRetryCommercialTrial(
        1,
        new CommercialTrialError(
          'BACKEND_FAILURE',
          'commercial_trial.application_failure',
          'errors.commercialTrial.application_failure',
          true
        )
      )
    ).toBe(true);
    expect(
      shouldRetryCommercialTrial(
        2,
        new CommercialTrialError(
          'BACKEND_FAILURE',
          'commercial_trial.application_failure',
          'errors.commercialTrial.application_failure',
          true
        )
      )
    ).toBe(false);
    expect(shouldRetryCommercialTrial(0, new Error('raw'))).toBe(false);
  });
});
