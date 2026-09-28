import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  onboardingKeys,
  shouldRetryWorkspacePreparation,
  useRetryWorkspacePreparationMutation,
  workspacePreparationRepository,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import {
  ensureWorkspacePreparationApi,
  getWorkspacePreparationApi,
  retryWorkspacePreparationApi,
} from '../../features/onboarding/data/datasources/onboarding.api';
import {
  WorkspacePreparationDatasourceError,
} from '../../features/onboarding/data/models/onboarding.dtos';
import { WorkspacePreparationError } from '../../features/onboarding/domain/entities/workspace-preparation.entity';

jest.mock('../../core/api/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  ensureWorkspacePreparationApi: jest.fn(),
  getWorkspacePreparationApi: jest.fn(),
  retryWorkspacePreparationApi: jest.fn(),
}));

const dto = {
  contract_version: 'workspace_preparation_v1',
  run_id: 'run-1',
  state: 'RETRYABLE_FAILURE',
  aggregate_version: 4,
  progress: { completed: 1, total: 4, indeterminate: false },
  units: [{
    code: 'TENANT_FOUNDATION',
    outcome: 'SATISFIED',
    evidence_version: 'tenant_foundation_v1',
    attempt: 1,
    observed_at: '2026-07-21T12:00:00Z',
    recorded_at: '2026-07-21T12:00:00Z',
  }],
  reason_code: 'TRANSIENT_DEPENDENCY_FAILURE',
  retry_allowed: true,
  user_retry_count: 1,
  max_user_retries: 3,
  next_action: 'RETRY',
  refresh_after_seconds: null,
  support_correlation_id: 'correlation-1',
  updated_at: '2026-07-21T12:00:00Z',
};

describe('Workspace Preparation repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureWorkspacePreparationApi as jest.Mock).mockResolvedValue(dto);
    (getWorkspacePreparationApi as jest.Mock).mockResolvedValue(dto);
    (retryWorkspacePreparationApi as jest.Mock).mockResolvedValue(dto);
  });

  it('delegates and isolates DTO mapping', async () => {
    const result = await workspacePreparationRepository.getWorkspacePreparation('tenant-1');
    expect(getWorkspacePreparationApi).toHaveBeenCalledWith('tenant-1');
    expect(result).toMatchObject({
      contractVersion: 'workspace_preparation_v1',
      aggregateVersion: 4,
      reasonCode: 'TRANSIENT_DEPENDENCY_FAILURE',
    });
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('contract_version');
  });

  it('maps datasource errors into the safe domain error', async () => {
    (getWorkspacePreparationApi as jest.Mock).mockRejectedValue(
      new WorkspacePreparationDatasourceError(
        'workspace_preparation.stale_version',
        'errors.workspacePreparation.stale_version',
        true
      )
    );
    await expect(
      workspacePreparationRepository.getWorkspacePreparation('tenant-1')
    ).rejects.toMatchObject({
      code: 'workspace_preparation.stale_version',
      message: 'errors.workspacePreparation.stale_version',
      retryable: true,
    });
  });

  it('keys cache by organization, tenant, and contract version', () => {
    expect(onboardingKeys.workspacePreparation('org-1', 'tenant-1')).toEqual([
      'onboarding',
      'workspace-preparation',
      'org-1',
      'tenant-1',
      'workspace_preparation_v1',
    ]);
  });

  it('retries only bounded retryable domain errors', () => {
    expect(
      shouldRetryWorkspacePreparation(
        1,
        new WorkspacePreparationError('code', 'token', true)
      )
    ).toBe(true);
    expect(
      shouldRetryWorkspacePreparation(
        2,
        new WorkspacePreparationError('code', 'token', true)
      )
    ).toBe(false);
    expect(shouldRetryWorkspacePreparation(0, new Error('raw'))).toBe(false);
  });

  it('updates and invalidates only the scoped cache after retry', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useRetryWorkspacePreparationMutation('org-1', 'tenant-1'),
      { wrapper }
    );
    await act(async () => {
      await result.current.mutateAsync({ aggregateVersion: 4 });
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: onboardingKeys.workspacePreparation('org-1', 'tenant-1'),
      })
    );
    expect(retryWorkspacePreparationApi).toHaveBeenCalledWith(
      'tenant-1',
      4,
      expect.stringMatching(/^workspace-preparation-retry-/)
    );
    queryClient.clear();
  });

  it('reuses one idempotency key for retry replay and rotates it after success', async () => {
    (retryWorkspacePreparationApi as jest.Mock)
      .mockRejectedValueOnce(
        new WorkspacePreparationDatasourceError(
          'workspace_preparation.retryable_failure',
          'errors.workspacePreparation.retryable_failure',
          true
        )
      )
      .mockResolvedValue(dto);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useRetryWorkspacePreparationMutation('org-1', 'tenant-1'),
      { wrapper }
    );

    await act(async () => {
      await expect(result.current.mutateAsync({ aggregateVersion: 4 })).rejects.toThrow();
      await result.current.mutateAsync({ aggregateVersion: 5 });
      await result.current.mutateAsync({ aggregateVersion: 5 });
    });

    const keys = (retryWorkspacePreparationApi as jest.Mock).mock.calls.map(
      (call) => call[2]
    );
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
    expect((retryWorkspacePreparationApi as jest.Mock).mock.calls.map((call) => call[1]))
      .toEqual([4, 4, 5]);
    queryClient.clear();
  });

  it('does not carry retry intent across tenant scope changes', async () => {
    (retryWorkspacePreparationApi as jest.Mock)
      .mockRejectedValueOnce(
        new WorkspacePreparationDatasourceError(
          'workspace_preparation.retryable_failure',
          'errors.workspacePreparation.retryable_failure',
          true
        )
      )
      .mockResolvedValue(dto);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    let tenantId = 'tenant-1';
    const { result, rerender } = renderHook(
      () => useRetryWorkspacePreparationMutation('org-1', tenantId),
      { wrapper }
    );

    await act(async () => {
      await expect(result.current.mutateAsync({ aggregateVersion: 4 })).rejects.toThrow();
    });
    tenantId = 'tenant-2';
    rerender(undefined);
    await act(async () => {
      await result.current.mutateAsync({ aggregateVersion: 8 });
    });

    const calls = (retryWorkspacePreparationApi as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe('tenant-1');
    expect(calls[1][0]).toBe('tenant-2');
    expect(calls[1][1]).toBe(8);
    expect(calls[1][2]).not.toBe(calls[0][2]);
    queryClient.clear();
  });
});
