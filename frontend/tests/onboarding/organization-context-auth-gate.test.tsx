import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useOrganizationContextQuery } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { getOrganizationContextApi } from '../../features/onboarding/data/datasources/onboarding.api';

const mockIsLoggingOut = jest.fn();
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  currentUser: null as { userId: string } | null,
};

jest.mock('../../core/api/authGuard', () => ({
  isLoggingOut: () => mockIsLoggingOut(),
}));
jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));
jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  getOrganizationContextApi: jest.fn(),
}));

const mockGetOrganizationContextApi = getOrganizationContextApi as jest.Mock;

const createWrapper = (client: QueryClient) =>
  function OrganizationContextQueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('organization-context authenticated query gate', () => {
  beforeEach(() => {
    mockAuthState = { isAuthenticated: false, isLoading: false, currentUser: null };
    mockIsLoggingOut.mockReturnValue(false);
    mockGetOrganizationContextApi.mockReset();
  });

  it('does not request organization context before authenticated bootstrap resolves', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useOrganizationContextQuery(), { wrapper: createWrapper(client) });

    expect(mockGetOrganizationContextApi).not.toHaveBeenCalled();
    client.clear();
  });

  it('does not request organization context during logout even if a mounted screen rerenders', () => {
    mockAuthState = { isAuthenticated: true, isLoading: false, currentUser: { userId: 'user-1' } };
    mockIsLoggingOut.mockReturnValue(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useOrganizationContextQuery(), { wrapper: createWrapper(client) });

    expect(mockGetOrganizationContextApi).not.toHaveBeenCalled();
    client.clear();
  });

  it('requests organization context only after an authenticated session is authoritative', async () => {
    mockAuthState = { isAuthenticated: true, isLoading: false, currentUser: { userId: 'user-1' } };
    mockGetOrganizationContextApi.mockResolvedValue({ memberships: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useOrganizationContextQuery(), { wrapper: createWrapper(client) });

    await waitFor(() => expect(mockGetOrganizationContextApi).toHaveBeenCalledTimes(1));
    client.clear();
  });
});
