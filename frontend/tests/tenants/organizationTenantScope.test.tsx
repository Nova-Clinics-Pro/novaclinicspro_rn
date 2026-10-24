import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

let mockActiveOrganizationId = 'organization-a';

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOrganizationContextQuery: () => ({
    data: {
      effectiveOrganizationId: mockActiveOrganizationId,
      selectionRequired: false,
      sessionRefreshRequired: false,
    },
    isLoading: false,
    error: null,
  }),
}));

import { tenantsKeys } from '../../features/tenants/data/repositories/tenants.repository.impl';
import { useOrganizationTenantScope } from '../../features/tenants/presentation/hooks/useOrganizationTenantScope';

const createWrapper = (client: QueryClient) =>
  function OrganizationTenantScopeWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('organization tenant scope', () => {
  it('clears the prior organization cache when the authoritative organization changes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(tenantsKeys.detail('organization-a', 'tenant-a'), { id: 'tenant-a' });
    const { result, rerender, unmount } = renderHook(
      ({ revision }: { revision: number }) => {
        void revision;
        return useOrganizationTenantScope();
      },
      { initialProps: { revision: 0 }, wrapper: createWrapper(client) },
    );

    expect(result.current.organizationId).toBe('organization-a');
    mockActiveOrganizationId = 'organization-b';
    rerender({ revision: 1 });

    await waitFor(() => expect(result.current.organizationId).toBe('organization-b'));
    expect(client.getQueryData(tenantsKeys.detail('organization-a', 'tenant-a'))).toBeUndefined();
    unmount();
    client.clear();
  });
});
