import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TenantsListScreen from '../../features/tenants/presentation/pages/TenantsListScreen';
import SuperAdminDashboard from '../../app/super-admin';

const mockScopeRetry = jest.fn();
const mockTenantRetry = jest.fn();
const mockScope = { organizationId: 'synthetic-org', scopeMatches: true, isLoading: false, error: null as Error | null, refetch: mockScopeRetry };
const mockQuery = { data: [] as any[] | undefined, isLoading: false, isError: false, error: null as Error | null, refetch: mockTenantRetry, isFetching: false };
jest.mock('../../features/tenants/presentation/hooks/usePlatformTenants', () => ({ usePlatformTenants: () => ({ data: undefined, isPending: false, isError: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), Link: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../core/components/QuickActionButton', () => ({ QuickActionButton: () => null }));
jest.mock('../../core/localization', () => ({ t: (key: string) => key, getCurrentLocale: () => 'en-US', ErrorTokens: { auth: { logoutFailed: 'logoutFailed' } } }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ logout: jest.fn(), currentUser: { fullName: 'Synthetic Admin' } }) }));
jest.mock('../../features/tenants/presentation/hooks/useOrganizationTenantScope', () => ({ useOrganizationTenantScope: () => mockScope }));
jest.mock('../../features/tenants/data/repositories/tenants.repository.impl', () => ({ useTenantsListQuery: () => mockQuery }));
jest.mock('../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => jest.requireActual('../../core/theme/useClinicTheme').getTheme('AYURVEDA') }));

describe('tenant listing failures are not empty-clinic evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockScope, { organizationId: 'synthetic-org', scopeMatches: true, isLoading: false, error: null });
    Object.assign(mockQuery, { data: [], isLoading: false, isError: false, error: null, isFetching: false });
  });

  it('shows an error for a 403, rather than an empty tenant list', () => {
    mockQuery.isError = true;
    mockQuery.error = new Error('Request failed with status code 403');
    const view = render(<TenantsListScreen />);
    expect(view.getByText('Unable to Load Tenants')).toBeTruthy();
    expect(view.queryByText('No Tenants Found')).toBeNull();
    fireEvent.press(view.getByText('Retry'));
    expect(mockTenantRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an error when organization scope is absent and the query is disabled', () => {
    Object.assign(mockScope, { organizationId: '', scopeMatches: false });
    mockQuery.data = undefined;
    const view = render(<TenantsListScreen />);
    expect(view.getByText('Unable to Load Tenants')).toBeTruthy();
    expect(view.queryByText('No Tenants Found')).toBeNull();
    fireEvent.press(view.getByText('Retry'));
    expect(mockScopeRetry).toHaveBeenCalledTimes(1);
    expect(mockTenantRetry).not.toHaveBeenCalled();
  });

  it('shows scope retrieval errors even if tenant query data was previously empty', () => {
    mockScope.error = new Error('synthetic context error');
    const view = render(<TenantsListScreen />);
    expect(view.getByText('errors.generic.loadFailed')).toBeTruthy();
    expect(view.queryByText('No Tenants Found')).toBeNull();
  });

  it.each(['scope', 'tenants'])('waits for %s initialization without showing an empty list', pending => {
    if (pending === 'scope') mockScope.isLoading = true;
    else Object.assign(mockQuery, { isLoading: true, isFetching: true });
    const view = render(<TenantsListScreen />);
    expect(view.getByText('Loading tenants...')).toBeTruthy();
    expect(view.queryByText('No Tenants Found')).toBeNull();
  });

  it('retains the empty state for a successful scoped empty result', () => {
    const view = render(<TenantsListScreen />);
    expect(view.getByText('No Tenants Found')).toBeTruthy();
    expect(view.queryByText('Unable to Load Tenants')).toBeNull();
  });

  it('does not present unavailable dashboard statistics as verified zero values', () => {
    const view = render(<SuperAdminDashboard />);
    expect(view.getByText('errors.tenants.loadFailed')).toBeTruthy();
    expect(view.queryByText('0')).toBeNull();
    expect(view.queryByText('No recent onboarding')).toBeNull();
    expect(view.queryByText('platformTenants.title (0)')).toBeNull();
  });
});
