import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../features/tenants/data/datasources/tenants.api', () => ({
  listTenantsApi: jest.fn(),
  getTenantApi: jest.fn(),
  getCurrentTenantApi: jest.fn(),
  createTenantApi: jest.fn(),
  updateTenantApi: jest.fn(),
  updateCurrentTenantClinicProfileApi: jest.fn(),
  getCurrentTenantClinicProfileApi: jest.fn(),
  uploadCurrentTenantClinicLogoApi: jest.fn(),
  deactivateTenantApi: jest.fn(),
}));

import {
  getTenantApi,
  listTenantsApi,
  updateTenantApi,
} from '../../features/tenants/data/datasources/tenants.api';
import {
  useTenantQuery,
  useTenantsListQuery,
  useUpdateTenantMutation,
} from '../../features/tenants/data/repositories/tenants.repository.impl';

const createWrapper = (client: QueryClient) =>
  function TenantRepositoryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('organization-scoped tenant management repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not reuse another organization\'s tenant query result after an organization switch', async () => {
    (getTenantApi as jest.Mock).mockImplementation(async (organizationId: string, tenantId: string) => ({
      id: tenantId,
      name: `Tenant for ${organizationId}`,
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result, rerender, unmount } = renderHook(
      ({ organizationId }) => useTenantQuery(organizationId, 'tenant-a'),
      { initialProps: { organizationId: 'organization-a' }, wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.data?.name).toBe('Tenant for organization-a'));
    rerender({ organizationId: 'organization-b' });

    await waitFor(() => expect(result.current.data?.name).toBe('Tenant for organization-b'));
    expect(getTenantApi).toHaveBeenLastCalledWith('organization-b', 'tenant-a');
    unmount();
    client.clear();
  });

  it('uses the current organization when a mutation is submitted after an organization switch', async () => {
    (updateTenantApi as jest.Mock).mockResolvedValue({ id: 'tenant-a', name: 'Updated' });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const { result, rerender, unmount } = renderHook(
      ({ organizationId }) => useUpdateTenantMutation(organizationId, 'tenant-a'),
      { initialProps: { organizationId: 'organization-a' }, wrapper: createWrapper(client) },
    );

    rerender({ organizationId: 'organization-b' });
    await act(async () => {
      await result.current.mutateAsync({ name: 'Updated' } as any);
    });

    expect(updateTenantApi).toHaveBeenCalledWith('organization-b', 'tenant-a', { name: 'Updated' });
    unmount();
    client.clear();
  });

  it('preserves authorized tenant-management list behavior within the active organization scope', async () => {
    const tenants = [{ id: 'tenant-a', name: 'Clinic A' }];
    (listTenantsApi as jest.Mock).mockResolvedValue(tenants);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result, unmount } = renderHook(
      () => useTenantsListQuery('organization-a', { search: 'Clinic' }),
      { wrapper: createWrapper(client) },
    );

    await waitFor(() => expect(result.current.data).toEqual(tenants));
    expect(listTenantsApi).toHaveBeenCalledWith('organization-a', { search: 'Clinic' });
    unmount();
    client.clear();
  });
});
