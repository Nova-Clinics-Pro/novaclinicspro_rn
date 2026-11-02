import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PlatformTenantsScreen, { PlatformTenantDetailScreen } from '../../features/tenants/presentation/pages/PlatformTenantsScreen';
import { platformDto } from './platformTenant.fixture';
import { mapPlatformTenant } from '../../features/tenants/data/repositories/platformTenants.repository';
import SuperAdminDashboard from '../../app/super-admin';

const mockRetry = jest.fn();
const mockPush = jest.fn();
const mockPageHook = jest.fn();
const mockDetailHook = jest.fn();
const mockQuery: any = { data: undefined, isPending: false, isError: false, refetch: mockRetry };
jest.mock('../../features/tenants/presentation/hooks/usePlatformTenants', () => ({
  usePlatformTenants: (...args: any[]) => { mockPageHook(...args); return mockQuery; },
  usePlatformTenant: (...args: any[]) => { mockDetailHook(...args); return mockQuery; },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useLocalSearchParams: () => ({ tenantId: 'synthetic-id' }), Link: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../core/components/QuickActionButton', () => ({ QuickActionButton: () => null }));
jest.mock('../../core/localization', () => ({ t: (key: string) => key, getCurrentLocale: () => 'en-US', ErrorTokens: { auth: { logoutFailed: 'logoutFailed' } } }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ logout: jest.fn(), currentUser: { userId: 'synthetic-actor', fullName: 'Synthetic Admin' } }) }));
jest.mock('../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => jest.requireActual('../../core/theme/useClinicTheme').getTheme('AYURVEDA') }));
const tenant = mapPlatformTenant(platformDto);

describe('read-only platform tenant presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockQuery, { data: undefined, isPending: false, isError: false });
  });
  it('shows loading without claiming an empty result', () => {
    mockQuery.isPending = true;
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByLabelText('common.loading')).toBeTruthy();
    expect(view.queryByText('empty.noData')).toBeNull();
  });
  it('shows error and retries without claiming zero clinics', () => {
    mockQuery.isError = true;
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByText('errors.tenants.loadFailed')).toBeTruthy();
    fireEvent.press(view.getByText('common.retry'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
    expect(view.queryByText('empty.noData')).toBeNull();
  });
  it('shows a genuine empty result', () => {
    mockQuery.data = { items: [], total: 0, activeTotal: 0, offset: 0, limit: 25 };
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByText('empty.noData')).toBeTruthy();
  });
  it('uses total, not page length, and pages forward/back', () => {
    mockQuery.data = { items: [tenant], total: 80, activeTotal: 40, offset: 0, limit: 25 };
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByText('platformTenants.title (80)')).toBeTruthy();
    fireEvent.press(view.getByText('common.next'));
    expect(mockPageHook).toHaveBeenLastCalledWith(10, 10, { sort: 'created_desc' });
    fireEvent.press(view.getByText('common.previous'));
    expect(mockPageHook).toHaveBeenLastCalledWith(0, 10, { sort: 'created_desc' });
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.manage Synthetic clinic' }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(view.getByTestId('manage-synthetic-id')).toBeTruthy();
    fireEvent.press(view.getByText('common.close'));
    expect(view.queryByTestId('manage-synthetic-id')).toBeNull();
  });
  it('shows metadata detail without management actions', () => {
    mockQuery.data = tenant;
    const view = render(<PlatformTenantDetailScreen />);
    expect(mockDetailHook).toHaveBeenCalledWith('synthetic-id');
    expect(view.getAllByText('Synthetic clinic').length).toBeGreaterThan(0);
    expect(view.queryByText('common.edit')).toBeNull();
    expect(view.queryByText('common.delete')).toBeNull();
  });
  it('dashboard uses full clinic total while other statistics remain unavailable', () => {
    mockQuery.data = { items: [tenant], total: 18, activeTotal: 12, offset: 0, limit: 1 };
    const view = render(<SuperAdminDashboard />);
    expect(view.getByText('platformTenants.title (18)')).toBeTruthy();
    expect(view.getByText('platformAdmin.accessBlocked')).toBeTruthy();
    expect(mockPageHook).toHaveBeenCalledWith(0, 10, { sort: 'created_desc' });
  });
  it.each(['pending', 'error'])('dashboard does not display stale counts during %s', state => {
    mockQuery.data = { items: [tenant], total: 18 };
    mockQuery.isPending = state === 'pending'; mockQuery.isError = state === 'error';
    const view = render(<SuperAdminDashboard />);
    expect(view.queryByText('platformTenants.title (18)')).toBeNull();
  });
});
