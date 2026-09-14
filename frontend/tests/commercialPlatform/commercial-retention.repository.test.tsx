import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getCommercialRetentionApi } from '../../features/commercialPlatform/data/datasources/commercial-trial.api';
import {
  CommercialRetentionResponseDTO,
  CommercialTrialDatasourceError,
} from '../../features/commercialPlatform/contracts/commercial-trial';
import {
  commercialTrialRepository,
  mapCommercialRetention,
  commercialTrialKeys,
  useClearCommercialRetentionCache,
  useCommercialRetentionQuery,
} from '../../features/commercialPlatform/data/repositories/commercial-trial.repository.impl';

jest.mock('../../features/commercialPlatform/data/datasources/commercial-trial.api', () => ({
  activateCommercialTrialApi: jest.fn(),
  getCommercialRetentionApi: jest.fn(),
  getCommercialTrialApi: jest.fn(),
  grantCommercialTrialExtensionApi: jest.fn(),
  requestCommercialTrialExtensionApi: jest.fn(),
  requestCommercialTrialSubscriptionApi: jest.fn(),
}));

const mockGetRetention = getCommercialRetentionApi as jest.Mock;

const dto = (
  organizationId = 'org-1',
  tenantId = 'tenant-1'
): CommercialRetentionResponseDTO => ({
  contract_version: 'commercial_trial_v1',
  trial_id: 'trial-1',
  organization_id: organizationId,
  tenant_id: tenantId,
  commercial_state: 'ARCHIVED',
  aggregate_version: 8,
  archived_at: '2026-07-01T10:00:00Z',
  retention_until: '2026-09-29T10:00:00Z',
  restore_eligible: true,
  permanent_deletion_eligible: false,
  extension_eligible: true,
  workspace_data_export_request_permitted: false,
  legal_hold_active: false,
  statutory_retention_active: false,
  allowed_actions: ['GRANT_EXTENSION', 'RESTORE_WORKSPACE'],
  ineligibility_reasons: ['RETENTION_PERIOD_ACTIVE'],
});

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperFor = (queryClient: QueryClient) => {
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  QueryWrapper.displayName = 'CommercialRetentionQueryWrapper';
  return QueryWrapper;
};

describe('Commercial Retention repository and query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRetention.mockImplementation(async () => dto());
  });

  it('maps the exact backend projection without deriving lifecycle decisions', async () => {
    const result = await commercialTrialRepository.getCommercialRetention(
      'org-1',
      'tenant-1'
    );

    expect(result).toEqual({
      contractVersion: 'commercial_trial_v1',
      trialId: 'trial-1',
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      commercialState: 'ARCHIVED',
      aggregateVersion: 8,
      archivedAt: '2026-07-01T10:00:00Z',
      retentionUntil: '2026-09-29T10:00:00Z',
      restoreEligible: true,
      permanentDeletionEligible: false,
      extensionEligible: true,
      workspaceDataExportRequestPermitted: false,
      legalHoldActive: false,
      statutoryRetentionActive: false,
      allowedActions: ['GRANT_EXTENSION', 'RESTORE_WORKSPACE'],
      ineligibilityReasons: ['RETENTION_PERIOD_ACTIVE'],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.allowedActions)).toBe(true);
    expect(Object.isFrozen(result.ineligibilityReasons)).toBe(true);
    expect(mockGetRetention).toHaveBeenCalledWith('tenant-1', undefined);
  });

  it('preserves nullable optional evidence exactly as received', () => {
    expect(
      mapCommercialRetention(
        {
          ...dto(),
          archived_at: null,
          retention_until: null,
          legal_hold_active: null,
          statutory_retention_active: null,
          allowed_actions: [],
          ineligibility_reasons: ['PROTECTION_EVIDENCE_UNAVAILABLE'],
        },
        'org-1',
        'tenant-1'
      )
    ).toMatchObject({
      archivedAt: null,
      retentionUntil: null,
      legalHoldActive: null,
      statutoryRetentionActive: null,
      allowedActions: [],
      ineligibilityReasons: ['PROTECTION_EVIDENCE_UNAVAILABLE'],
    });
  });

  it('fails closed for unknown contract, state, action, reason, or scope', () => {
    const expectedInvalid = { kind: 'INVALID_AGGREGATE' };
    expect(() =>
      mapCommercialRetention(
        { ...dto(), contract_version: 'commercial_trial_v2' },
        'org-1',
        'tenant-1'
      )
    ).toThrow(expect.objectContaining({ kind: 'UNSUPPORTED_CONTRACT' }));
    expect(() =>
      mapCommercialRetention(
        { ...dto(), commercial_state: 'FUTURE' },
        'org-1',
        'tenant-1'
      )
    ).toThrow(expect.objectContaining(expectedInvalid));
    expect(() =>
      mapCommercialRetention(
        { ...dto(), allowed_actions: ['DOWNLOAD_PACKAGE'] },
        'org-1',
        'tenant-1'
      )
    ).toThrow(expect.objectContaining(expectedInvalid));
    expect(() =>
      mapCommercialRetention(
        { ...dto(), ineligibility_reasons: ['UNKNOWN_POLICY'] },
        'org-1',
        'tenant-1'
      )
    ).toThrow(expect.objectContaining(expectedInvalid));
    expect(() => mapCommercialRetention(dto('org-other'), 'org-1', 'tenant-1'))
      .toThrow(expect.objectContaining({ kind: 'ORGANIZATION_MISMATCH' }));
    expect(() => mapCommercialRetention(dto('org-1', 'tenant-other'), 'org-1', 'tenant-1'))
      .toThrow(expect.objectContaining({ kind: 'TENANT_MISMATCH' }));
  });

  it.each([
    [401, 'commercial_trial.application_failure', 'UNAUTHORIZED'],
    [403, 'commercial_trial.forbidden', 'FORBIDDEN'],
    [404, 'commercial_trial.not_found', 'NOT_FOUND'],
    [
      409,
      'commercial_trial.retention_evidence_unavailable',
      'RETENTION_EVIDENCE_UNAVAILABLE',
    ],
    [503, 'commercial_trial.application_failure', 'BACKEND_FAILURE'],
  ])('maps %s %s to %s', async (httpStatus, code, kind) => {
    mockGetRetention.mockRejectedValue(
      new CommercialTrialDatasourceError(
        code,
        `errors.${code}`,
        httpStatus >= 500 || code.endsWith('retention_evidence_unavailable'),
        httpStatus
      )
    );
    await expect(
      commercialTrialRepository.getCommercialRetention('org-1', 'tenant-1')
    ).rejects.toMatchObject({ kind, code });
  });

  it('uses a tenant-aware contract-scoped cache key and cancellation signal', async () => {
    const queryClient = createClient();
    const { result, unmount } = renderHook(
      () => useCommercialRetentionQuery('org-1', 'tenant-1'),
      { wrapper: wrapperFor(queryClient) }
    );

    await waitFor(() => expect(result.current.data?.trialId).toBe('trial-1'));
    expect(commercialTrialKeys.commercialRetention('org-1', 'tenant-1')).toEqual([
      'onboarding',
      'commercial-retention',
      'org-1',
      'tenant-1',
      'commercial_trial_v1',
    ]);
    expect(mockGetRetention).toHaveBeenCalledWith(
      'tenant-1',
      expect.any(AbortSignal)
    );
    unmount();
    queryClient.clear();
  });

  it('exposes typed loading, success, and error states with bounded retry', async () => {
    let release: ((value: CommercialRetentionResponseDTO) => void) | undefined;
    mockGetRetention.mockImplementationOnce(
      () =>
        new Promise<CommercialRetentionResponseDTO>((resolve) => {
          release = resolve;
        })
    );
    const queryClient = createClient();
    const first = renderHook(
      () => useCommercialRetentionQuery('org-1', 'tenant-1'),
      { wrapper: wrapperFor(queryClient) }
    );
    expect(first.result.current.isPending).toBe(true);
    await act(async () => release?.(dto()));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    queryClient.clear();

    mockGetRetention.mockRejectedValueOnce(
      new CommercialTrialDatasourceError(
        'commercial_trial.forbidden',
        'errors.commercialTrial.forbidden',
        false,
        403
      )
    );
    const errorClient = createClient();
    const second = renderHook(
      () => useCommercialRetentionQuery('org-1', 'tenant-1'),
      { wrapper: wrapperFor(errorClient) }
    );
    await waitFor(() => expect(second.result.current.isError).toBe(true));
    expect(second.result.current.error).toMatchObject({ kind: 'FORBIDDEN' });
    expect(mockGetRetention).toHaveBeenCalledTimes(2);
    second.unmount();
    errorClient.clear();
  });

  it('cancels and removes only the outgoing retention scope', async () => {
    const queryClient = createClient();
    queryClient.setQueryData(commercialTrialKeys.commercialRetention('org-1', 'tenant-1'), dto());
    queryClient.setQueryData(commercialTrialKeys.commercialRetention('org-1', 'tenant-2'), dto());
    const { result, unmount } = renderHook(
      () => useClearCommercialRetentionCache(),
      { wrapper: wrapperFor(queryClient) }
    );

    await act(async () => result.current('org-1', 'tenant-1'));

    expect(queryClient.getQueryData(
      commercialTrialKeys.commercialRetention('org-1', 'tenant-1')
    )).toBeUndefined();
    expect(queryClient.getQueryData(
      commercialTrialKeys.commercialRetention('org-1', 'tenant-2')
    )).toBeDefined();
    unmount();
    queryClient.clear();
  });
});
