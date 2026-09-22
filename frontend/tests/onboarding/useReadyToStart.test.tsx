import { renderHook, waitFor } from '@testing-library/react-native';

import {
  useClearReadyToStartCache,
  useOrganizationContextQuery,
  useReadyToStartQuery,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { ReadyToStartError } from '../../features/onboarding/domain/entities/ready-to-start.entity';
import { useReadyToStart } from '../../features/onboarding/presentation/hooks/useReadyToStart';

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useClearReadyToStartCache: jest.fn(),
  useOrganizationContextQuery: jest.fn(),
  useReadyToStartQuery: jest.fn(),
}));

const clearCache = jest.fn(async () => undefined);
const refetchOrganization = jest.fn(async () => ({
  data: {
    effectiveOrganizationId: 'org-1',
    effectiveTenantId: 'tenant-1',
    sessionRefreshRequired: false,
  },
}));
const refetchReadiness = jest.fn(async () => undefined);

describe('useReadyToStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useClearReadyToStartCache as jest.Mock).mockReturnValue(clearCache);
    (useOrganizationContextQuery as jest.Mock).mockReturnValue({
      data: {
        effectiveOrganizationId: 'org-1',
        effectiveTenantId: 'tenant-1',
        sessionRefreshRequired: false,
      },
      isLoading: false,
      error: null,
      refetch: refetchOrganization,
    });
    (useReadyToStartQuery as jest.Mock).mockImplementation((_org, tenantId) => ({
      data: { identity: { tenantId } },
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: refetchReadiness,
    }));
  });

  it('enables only matching organization/tenant scope and exposes matching data', () => {
    const { result } = renderHook(() => useReadyToStart('tenant-1'));
    expect(useReadyToStartQuery).toHaveBeenCalledWith('org-1', 'tenant-1', { enabled: true });
    expect(result.current.data?.identity.tenantId).toBe('tenant-1');
    expect(result.current.scopeMatches).toBe(true);
  });

  it('cancels and removes the outgoing tenant cache when tenant scope changes', async () => {
    const { rerender } = renderHook(({ tenantId }) => useReadyToStart(tenantId), {
      initialProps: { tenantId: 'tenant-1' },
    });
    (useOrganizationContextQuery as jest.Mock).mockReturnValue({
      data: {
        effectiveOrganizationId: 'org-1',
        effectiveTenantId: 'tenant-2',
        sessionRefreshRequired: false,
      },
      isLoading: false,
      error: null,
      refetch: refetchOrganization,
    });
    rerender({ tenantId: 'tenant-2' });
    await waitFor(() => expect(clearCache).toHaveBeenCalledWith('org-1', 'tenant-1'));
  });

  it('fails closed and hides stale tenant data when effective scope does not match', () => {
    const { result } = renderHook(() => useReadyToStart('tenant-other'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toMatchObject({ kind: 'TENANT_MISMATCH' });
    expect(useReadyToStartQuery).toHaveBeenCalledWith('org-1', 'tenant-other', { enabled: false });
  });

  it('exits loading and exposes a retryable readiness 503 after bounded retries', () => {
    const unavailable = new ReadyToStartError(
      'READINESS_UNAVAILABLE',
      'readiness.provider_unavailable',
      'errors.readyToStart.provider_unavailable',
      true
    );
    (useReadyToStartQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isRefetching: false,
      error: unavailable,
      refetch: refetchReadiness,
    });

    const { result } = renderHook(() => useReadyToStart('tenant-1'));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(unavailable);
  });
});
