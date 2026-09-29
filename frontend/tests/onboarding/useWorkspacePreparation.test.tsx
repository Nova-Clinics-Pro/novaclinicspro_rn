import { act, renderHook, waitFor } from '@testing-library/react-native';

import { WorkspacePreparation } from '../../features/onboarding/domain/entities/workspace-preparation.entity';
import { useWorkspacePreparation } from '../../features/onboarding/presentation/hooks/useWorkspacePreparation';

const mockUseOrganizationContextQuery = jest.fn();
const mockUseEnsureWorkspacePreparationMutation = jest.fn();
const mockUseWorkspacePreparationQuery = jest.fn();
const mockUseRetryWorkspacePreparationMutation = jest.fn();
const mockUseClearWorkspacePreparationCache = jest.fn();

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOrganizationContextQuery: (...args: unknown[]) => mockUseOrganizationContextQuery(...args),
  useEnsureWorkspacePreparationMutation: (...args: unknown[]) =>
    mockUseEnsureWorkspacePreparationMutation(...args),
  useWorkspacePreparationQuery: (...args: unknown[]) => mockUseWorkspacePreparationQuery(...args),
  useRetryWorkspacePreparationMutation: (...args: unknown[]) =>
    mockUseRetryWorkspacePreparationMutation(...args),
  useClearWorkspacePreparationCache: (...args: unknown[]) =>
    mockUseClearWorkspacePreparationCache(...args),
}));

const preparation = (
  overrides: Partial<WorkspacePreparation> = {}
): WorkspacePreparation => ({
  contractVersion: 'workspace_preparation_v1',
  runId: 'run-1',
  state: 'PREPARING',
  aggregateVersion: 2,
  progress: { completed: 1, total: 4, indeterminate: false },
  units: [{
    code: 'TENANT_FOUNDATION', outcome: 'SATISFIED', evidenceVersion: 'v1', attempt: 1,
    observedAt: new Date('2026-07-21T12:00:00Z'),
    recordedAt: new Date('2026-07-21T12:00:00Z'),
  }],
  reasonCode: null,
  retryAllowed: false,
  userRetryCount: 0,
  maxUserRetries: 3,
  nextAction: 'REFRESH',
  refreshAfterSeconds: 5,
  supportCorrelationId: 'safe-correlation',
  updatedAt: new Date('2026-07-21T12:00:00Z'),
  ...overrides,
});

describe('useWorkspacePreparation orchestration', () => {
  const ensureMutate = jest.fn();
  const ensureMutateAsync = jest.fn();
  const ensureReset = jest.fn();
  const retryMutateAsync = jest.fn();
  const retryReset = jest.fn();
  const statusRefetch = jest.fn();
  const contextRefetch = jest.fn();
  const clearCache = jest.fn().mockResolvedValue(undefined);
  let context: any;
  let ensure: any;
  let status: any;
  let retry: any;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      data: { effectiveOrganizationId: 'org-1', effectiveTenantId: 'tenant-1' },
      isLoading: false,
      error: null,
      refetch: contextRefetch,
    };
    ensure = {
      isIdle: false, isPending: false, isSuccess: true, isError: false,
      error: null, mutate: ensureMutate, mutateAsync: ensureMutateAsync, reset: ensureReset,
    };
    status = {
      data: preparation(), isLoading: false, error: null, refetch: statusRefetch,
    };
    retry = {
      isPending: false, error: null, mutateAsync: retryMutateAsync, reset: retryReset,
    };
    mockUseOrganizationContextQuery.mockImplementation(() => context);
    mockUseEnsureWorkspacePreparationMutation.mockImplementation(() => ensure);
    mockUseWorkspacePreparationQuery.mockImplementation(() => status);
    mockUseRetryWorkspacePreparationMutation.mockImplementation(() => retry);
    mockUseClearWorkspacePreparationCache.mockReturnValue(clearCache);
  });

  it('starts lazy initialization only for the authoritative effective tenant', async () => {
    ensure.isIdle = true;
    ensure.isSuccess = false;
    status.data = undefined;
    renderHook(() => useWorkspacePreparation('tenant-1', 'org-1'));

    await waitFor(() => expect(ensureMutate).toHaveBeenCalledTimes(1));
    expect(mockUseWorkspacePreparationQuery.mock.calls.at(-1)?.[2]).toMatchObject({
      enabled: false,
    });
  });

  it('uses the bounded server refresh hint only for pending or preparing state', () => {
    renderHook(() => useWorkspacePreparation('tenant-1', 'org-1'));
    const options = mockUseWorkspacePreparationQuery.mock.calls.at(-1)?.[2];
    expect(options.enabled).toBe(true);
    expect(options.refetchInterval({ state: { data: preparation() } })).toBe(5000);
    expect(
      options.refetchInterval({
        state: { data: preparation({
          state: 'TERMINAL_FAILURE', nextAction: 'CONTACT_SUPPORT', refreshAfterSeconds: null,
        }) },
      })
    ).toBe(false);
  });

  it('prevents duplicate retry intent while a retry is in flight', async () => {
    let resolveRetry: (() => void) | undefined;
    retryMutateAsync.mockReturnValue(new Promise<void>((resolve) => { resolveRetry = resolve; }));
    status.data = preparation({
      state: 'RETRYABLE_FAILURE', retryAllowed: true, userRetryCount: 1,
      nextAction: 'RETRY', refreshAfterSeconds: null,
      reasonCode: 'TRANSIENT_DEPENDENCY_FAILURE',
    });
    const { result } = renderHook(() => useWorkspacePreparation('tenant-1', 'org-1'));

    let first: Promise<void>;
    await act(async () => {
      first = result.current.retry();
      await result.current.retry();
      resolveRetry?.();
      await first;
    });
    expect(retryMutateAsync).toHaveBeenCalledTimes(1);
    expect(retryMutateAsync).toHaveBeenCalledWith({ aggregateVersion: 2 });
  });

  it('revalidates effective tenant before personalization handoff', async () => {
    status.data = preparation({
      state: 'PERSONALIZATION_AVAILABLE',
      progress: { completed: 4, total: 4, indeterminate: false },
      units: ['TENANT_FOUNDATION', 'ACCESS_FOUNDATION', 'ONBOARDING_FOUNDATION',
        'PERSONALIZATION_HANDOFF'].map((code) => ({
          code, outcome: 'SATISFIED', evidenceVersion: 'v1', attempt: 1,
          observedAt: new Date('2026-07-21T12:00:00Z'),
          recordedAt: new Date('2026-07-21T12:00:00Z'),
        })) as WorkspacePreparation['units'],
      nextAction: 'ENTER_PERSONALIZATION', refreshAfterSeconds: null,
    });
    contextRefetch.mockResolvedValue({
      data: { effectiveOrganizationId: 'org-1', effectiveTenantId: 'tenant-2' },
    });
    const { result } = renderHook(() => useWorkspacePreparation('tenant-1', 'org-1'));

    await act(async () => {
      await expect(result.current.preparePersonalizationHandoff()).resolves.toBe(false);
    });
    expect(result.current.error?.reasonCode).toBe('workspace_preparation.tenant_mismatch');
  });

  it('clears outgoing scoped state and resets operations on tenant switch', async () => {
    let tenantId = 'tenant-1';
    const { rerender, unmount } = renderHook(() =>
      useWorkspacePreparation(tenantId, 'org-1')
    );
    context.data = { effectiveOrganizationId: 'org-1', effectiveTenantId: 'tenant-2' };
    tenantId = 'tenant-2';
    rerender(undefined);
    expect(mockUseWorkspacePreparationQuery.mock.calls.at(-1)?.[2].enabled).toBe(false);

    await waitFor(() => {
      expect(clearCache).toHaveBeenCalledWith('org-1', 'tenant-1');
      expect(ensureReset).toHaveBeenCalled();
      expect(retryReset).toHaveBeenCalled();
    });
    unmount();
    await waitFor(() => expect(clearCache).toHaveBeenCalledWith('org-1', 'tenant-2'));
  });

  it('fails closed without issuing work for a mismatched route tenant', () => {
    const { result } = renderHook(() => useWorkspacePreparation('tenant-2', 'org-1'));
    expect(result.current.domain).toBeNull();
    expect(result.current.error?.reasonCode).toBe('workspace_preparation.tenant_mismatch');
    expect(ensureMutate).not.toHaveBeenCalled();
  });
});
