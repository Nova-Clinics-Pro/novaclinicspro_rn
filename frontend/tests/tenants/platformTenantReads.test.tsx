import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PlatformTenantsScreen, { PlatformTenantDetailScreen } from '../../features/tenants/presentation/pages/PlatformTenantsScreen';
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
jest.mock('../../core/localization', () => ({ t: (key: string) => key, ErrorTokens: { auth: { logoutFailed: 'logoutFailed' } } }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ logout: jest.fn(), currentUser: { userId: 'synthetic-actor', fullName: 'Synthetic Admin' } }) }));
jest.mock('../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => ({ colors: { surface: { default: '#fff' }, text: { primary: '#111' } } }) }));
const tenant = { id: 'synthetic-id', name: 'Synthetic clinic', code: 'SYN', clinic_type: 'general', status: 'active', is_active: true, created_at: '2026-10-30T00:00:00Z', organization_id: 'synthetic-org' };

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
    mockQuery.data = { items: [], total: 0, active_total: 0, offset: 0, limit: 25 };
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByText('empty.noData')).toBeTruthy();
  });
  it('uses total, not page length, and pages forward/back', () => {
    mockQuery.data = { items: [tenant], total: 80, active_total: 40, offset: 0, limit: 25 };
    const view = render(<PlatformTenantsScreen />);
    expect(view.getByText('platformTenants.title (80)')).toBeTruthy();
    fireEvent.press(view.getByText('common.next'));
    expect(mockPageHook).toHaveBeenLastCalledWith(25, 25);
    fireEvent.press(view.getByText('common.previous'));
    expect(mockPageHook).toHaveBeenLastCalledWith(0, 25);
    fireEvent.press(view.getByText('Synthetic clinic'));
    expect(mockPush).toHaveBeenCalledWith('/super-admin/tenants/synthetic-id');
  });
  it('shows metadata detail without management actions', () => {
    mockQuery.data = tenant;
    const view = render(<PlatformTenantDetailScreen />);
    expect(mockDetailHook).toHaveBeenCalledWith('synthetic-id');
    expect(view.getByText('Synthetic clinic')).toBeTruthy();
    expect(view.queryByText('common.edit')).toBeNull();
    expect(view.queryByText('common.delete')).toBeNull();
  });
  it('dashboard uses full clinic total while other statistics remain unavailable', () => {
    mockQuery.data = { items: [tenant], total: 18, active_total: 12, offset: 0, limit: 1 };
    const view = render(<SuperAdminDashboard />);
    expect(view.getByText('18')).toBeTruthy();
    expect(view.getAllByText('—')).toHaveLength(3);
    expect(mockPageHook).toHaveBeenCalledWith(0, 1);
  });
  it.each(['pending', 'error'])('dashboard does not display stale counts during %s', state => {
    mockQuery.data = { items: [tenant], total: 18 };
    mockQuery.isPending = state === 'pending'; mockQuery.isError = state === 'error';
    const view = render(<SuperAdminDashboard />);
    expect(view.queryByText('18')).toBeNull();
    expect(view.getAllByText('—')).toHaveLength(4);
  });
});
