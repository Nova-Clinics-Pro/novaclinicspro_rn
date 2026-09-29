/**
 * Onboarding repository hook tests
 *
 * Repository-layer coverage for React Query invalidation behaviour.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  onboardingKeys,
  useCreateInitialOrganizationMutation,
  useDemoStatusQuery,
  useSubmitStepMutation,
  shouldRetryDemoStatusQuery,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import {
  createInitialOrganizationApi,
  getDemoStatusApi,
  getOrganizationContextApi,
  submitStepDataApi,
} from '../../features/onboarding/data/datasources/onboarding.api';
import { StepSubmissionDatasourceError } from '../../features/onboarding/data/models/onboarding.dtos';

jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  getApplicationDetailApi: jest.fn(),
  getValidationReportApi: jest.fn(),
  improveApplicationApi: jest.fn(),
  resubmitApplicationApi: jest.fn(),
  createDemoTenantApi: jest.fn(),
  getDemoStatusApi: jest.fn(),
  transitionDemoToLiveApi: jest.fn(),
  getSetupWizardContextApi: jest.fn(),
  getSetupWizardProgressApi: jest.fn(),
  completeSetupWizardApi: jest.fn(),
  getOnboardingStatusApi: jest.fn(),
  submitStepDataApi: jest.fn(),
  completeSetupApi: jest.fn(),
  createInitialOrganizationApi: jest.fn(),
  getOrganizationContextApi: jest.fn(),
}));

const mockSubmitStepDataApi = submitStepDataApi as jest.Mock;
const mockCreateInitialOrganizationApi = createInitialOrganizationApi as jest.Mock;
const mockGetDemoStatusApi = getDemoStatusApi as jest.Mock;
const mockGetOrganizationContextApi = getOrganizationContextApi as jest.Mock;

describe('useSubmitStepMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitStepDataApi.mockResolvedValue({
      step_code: 'services',
      status: 'completed',
      created_entities: [],
      validation_errors: [],
      next_step: null,
      message: 'completed',
      revision: `step-rev-v1:${'b'.repeat(64)}`,
      template_version: 'template-v1',
      capability_revision: `cap-v1:${'c'.repeat(64)}`,
    });
    mockGetOrganizationContextApi.mockResolvedValue({
      effectiveOrganizationId: 'org-1',
      effectiveTenantId: 'tenant-123',
      sessionRefreshRequired: false,
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(onboardingKeys.organizationContext(), {
      effectiveOrganizationId: 'org-1',
      effectiveTenantId: 'tenant-123',
      sessionRefreshRequired: false,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('invalidates the tenant onboarding status query after a successful step submit', async () => {
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => useSubmitStepMutation('tenant-123', 'services'),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync({
        idempotencyKey: 'submission-123',
        data: {},
        mark_complete: true,
        expected_revision: `step-rev-v1:${'a'.repeat(64)}`,
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: onboardingKeys.status('org-1', 'tenant-123'),
      });
    });
    expect(mockSubmitStepDataApi).toHaveBeenCalledWith(
      'tenant-123',
      'services',
      {
        data: {},
        mark_complete: true,
        expected_revision: `step-rev-v1:${'a'.repeat(64)}`,
      },
      'submission-123'
    );
  });

  it('does not retry or replace authoritative cache data after a stale conflict', async () => {
    const authoritative = { tenant_id: 'tenant-123', revision: 'server' };
    queryClient.setQueryData(
      onboardingKeys.status('org-1', 'tenant-123'),
      authoritative
    );
    mockSubmitStepDataApi.mockRejectedValueOnce(
      new StepSubmissionDatasourceError(
        'STALE_REVISION',
        'onboarding.step_revision_conflict',
        'errors.onboarding.stepRevisionConflict',
        false,
        {
          classification: 'STALE_REVISION',
          step_code: 'services',
          current_revision: `step-rev-v1:${'b'.repeat(64)}`,
          template_version: 'template-v1',
          capability_revision: `cap-v1:${'c'.repeat(64)}`,
        }
      )
    );
    const { result } = renderHook(
      () => useSubmitStepMutation('tenant-123', 'services'),
      { wrapper }
    );

    await expect(
      result.current.mutateAsync({
        idempotencyKey: 'same-key',
        data: { local: true },
        expected_revision: `step-rev-v1:${'a'.repeat(64)}`,
      })
    ).rejects.toEqual(expect.objectContaining({ kind: 'STALE_REVISION' }));

    expect(mockSubmitStepDataApi).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(
        onboardingKeys.status('org-1', 'tenant-123')
      )
    ).toBe(authoritative);
  });
});

describe('useCreateInitialOrganizationMutation', () => {
  it('delegates initial organization creation to the existing onboarding datasource', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    mockCreateInitialOrganizationApi.mockResolvedValue({
      organizationId: 'org-1',
      displayName: 'Nova Group',
      role: 'organization_owner',
      replayed: false,
    });
    const { result, unmount } = renderHook(() => useCreateInitialOrganizationMutation(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync('Nova Group');
    });

    expect(mockCreateInitialOrganizationApi.mock.calls[0][0]).toBe('Nova Group');
    unmount();
    queryClient.clear();
  });
});

describe('useDemoStatusQuery', () => {
  const createWrapper = (queryClient: QueryClient) => {
    const DemoStatusQueryWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    DemoStatusQueryWrapper.displayName = 'DemoStatusQueryWrapper';
    return DemoStatusQueryWrapper;
  };

  it('does not run when the authoritative demo gate is disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderHook(() => useDemoStatusQuery('tenant-123', { enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockGetDemoStatusApi).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('runs for an enabled authoritative demo tenant', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetDemoStatusApi.mockResolvedValueOnce({ demo_tenant_id: 'tenant-123' });
    renderHook(() => useDemoStatusQuery('tenant-123', { enabled: true }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetDemoStatusApi).toHaveBeenCalledWith('tenant-123');
    });
    queryClient.clear();
  });

  it('does not retry deterministic 4xx demo-status failures', () => {
    expect(shouldRetryDemoStatusQuery(0, { response: { status: 400 } })).toBe(false);
    expect(shouldRetryDemoStatusQuery(0, { response: { status: 403 } })).toBe(false);
    expect(shouldRetryDemoStatusQuery(0, { response: { status: 422 } })).toBe(false);
  });
});
