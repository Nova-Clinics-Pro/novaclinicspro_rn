import React from 'react';
import * as RN from 'react-native';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { ThemeProvider, getTheme } from '../../core/theme/useClinicTheme';
import { DashboardHeader } from '../../core/components/DashboardHeader';
import { ThemedButton } from '../../core/components/ui/ThemedButton';
import { useLogoutConfirmation } from '../../core/hooks/useLogoutConfirmation';
import { platformDto } from './platformTenant.fixture';
import { mapPlatformTenant } from '../../features/tenants/data/repositories/platformTenants.repository';
import { PlatformClinicWorkspace } from '../../features/tenants/presentation/pages/PlatformTenantsScreen';

const mockLogout = jest.fn();
const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
const mockPageHook = jest.fn();
const mockDetail = jest.fn();
const tenant = mapPlatformTenant(platformDto);
const mockTotals: any = { data: { total: 120, activeTotal: 70 }, isPending: false, isError: false };
const mockPage: any = { data: { items: [tenant], total: 80, activeTotal: 40, offset: 0, limit: 25 }, isPending: false, isError: false, refetch: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ tenantId: 'synthetic-id' }), Link: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/localization', () => ({ t: (key: string) => key, getCurrentLocale: () => 'en-US' }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ currentUser: { userId: 'synthetic-actor', fullName: 'Synthetic Admin' }, logout: mockLogout }) }));
jest.mock('../../features/tenants/presentation/hooks/usePlatformTrialCommands', () => ({ usePlatformTrialCommands: () => ({ initialize: jest.fn(), grant: jest.fn() }), createOperationKey: () => 'synthetic-key', toPlatformTrialFailure: () => ({ kind: 'UNKNOWN', retryable: true }) }));
jest.mock('../../features/tenants/presentation/hooks/usePlatformTenants', () => ({ usePlatformTenants: (...args: any[]) => { mockPageHook(...args); return args[1] === 1 ? mockTotals : mockPage; }, usePlatformTenant: (...args: any[]) => mockDetail(...args) , usePlatformTenantRefresh: () => jest.fn() }));

const workspace = (showBack = false) => render(<ThemeProvider><PlatformClinicWorkspace showBack={showBack} /></ThemeProvider>);

beforeEach(() => { jest.clearAllMocks(); mockLogout.mockResolvedValue(undefined); mockRouter.canGoBack.mockReturnValue(true); });
afterEach(() => { jest.useRealTimers(); });
it('root has one shared Logout and no meaningless Back', () => {
  const view = workspace();
  expect(view.getAllByLabelText('navigation.logout')).toHaveLength(1);
  expect(view.queryByLabelText('common.goBack')).toBeNull();
});
it.each([true, false])('subpage shared Back respects navigation history: %s', hasHistory => {
  mockRouter.canGoBack.mockReturnValue(hasHistory);
  const view = workspace(true);
  expect(view.getAllByLabelText('common.goBack')).toHaveLength(1);
  fireEvent.press(view.getByLabelText('common.goBack'));
  if (hasHistory) expect(mockRouter.back).toHaveBeenCalledTimes(1);
  else expect(mockRouter.replace).toHaveBeenCalledWith('/super-admin');
});
it('shared confirmation cancels without logout, then confirms the canonical command once', async () => {
  const view = workspace();
  fireEvent.press(view.getByLabelText('navigation.logout'));
  fireEvent.press(view.getByText('common.cancel'));
  expect(mockLogout).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText('navigation.logout'));
  fireEvent.press(view.getByText('navigation.logout'));
  await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
});
it('central logout confirmation coalesces in-flight calls and exposes failures', async () => {
  let reject: (reason: Error) => void = () => {};
  const logout = jest.fn(() => new Promise<void>((_, no) => { reject = no; }));
  const hook = renderHook(() => useLogoutConfirmation(logout));
  let first: Promise<void>;
  act(() => { first = hook.result.current.dialog.onConfirm(); void hook.result.current.dialog.onConfirm(); });
  expect(logout).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('synthetic failure')); await first; });
  expect(hook.result.current.error).toBe('errors.auth.logoutFailed');
});
it('Manage stays inline, shows all sections, and never offers unverified writes/audit access', () => {
  const view = workspace();
  fireEvent.press(view.getByRole('button', { name: 'platformAdmin.manage Synthetic clinic' }));
  for (const section of ['overview','organization','commercial','entitlement','administration','history']) expect(view.getAllByText(`platformAdmin.${section}`).length).toBeGreaterThan(0);
  expect(view.getByText('platformAdmin.auditUnavailable')).toBeTruthy();
  expect(view.getByTestId('manage-card-administration')).toBeTruthy();
  expect(view.getByRole('button', { name: 'platformAdmin.prepareExtension' })).toBeEnabled();
  expect(view.getByRole('button', { name: 'platformAdmin.viewSubscription' })).toBeEnabled();
  expect(view.queryByText('platformAdmin.extensionBlocked')).toBeNull();
  expect(mockRouter.push).not.toHaveBeenCalled(); expect(mockDetail).not.toHaveBeenCalled();
  expect(view.queryByText('View Status')).toBeNull(); expect(view.queryByText('Extend Trial')).toBeNull();
});
it('search (debounced), filter and sort reset pagination and have distinct query inputs', () => {
  jest.useFakeTimers();
  const view = workspace();
  fireEvent.press(view.getByText('common.next'));
  expect(mockPageHook).toHaveBeenLastCalledWith(10,10,{ sort: 'created_desc' });
  fireEvent.changeText(view.getByLabelText('common.search'),'Synthetic');
  expect(mockPageHook).toHaveBeenLastCalledWith(10,10,{ sort: 'created_desc' });
  act(() => { jest.advanceTimersByTime(300); });
  expect(mockPageHook).toHaveBeenLastCalledWith(0,10,{ sort: 'created_desc', search: 'Synthetic' });
  fireEvent.press(view.getByLabelText('platformAdmin.operationalStatus'));
  fireEvent.press(view.getByRole('button', { name: 'platformAdmin.active' }));
  expect(mockPageHook).toHaveBeenLastCalledWith(0,10,{ sort: 'created_desc', search: 'Synthetic', status: 'active' });
  fireEvent.press(view.getByLabelText('platformAdmin.sortBy'));
  fireEvent.press(view.getByText('platformAdmin.name_asc'));
  expect(mockPageHook).toHaveBeenLastCalledWith(0,10,{ sort: 'name_asc', search: 'Synthetic', status: 'active' });
  jest.useRealTimers();
});
it.each([400, 1200])('keeps essential statuses visible in mobile/desktop presentation: %s', width => {
  const spy = jest.spyOn(RN,'useWindowDimensions').mockReturnValue({ width, height: 800, scale: 1, fontScale: 2 });
  const view = workspace();
  for (const label of ['name','type','status','organization','trial','subscription','entitlement','manage']) expect(view.getAllByText(`platformAdmin.${label}`).length).toBeGreaterThan(0);
  expect(view.getAllByText('Synthetic clinic').length).toBeGreaterThan(0);
  expect(view.getByText('Synthetic organization')).toBeTruthy();
  expect(view.getByText('platformAdmin.expired')).toBeTruthy();
  expect(view.getByText('platformAdmin.accessBlocked')).toBeTruthy();
  view.unmount(); spy.mockRestore();
});
it.each(['AYURVEDA','GENERAL_MEDICINE','DENTAL','PHYSIOTHERAPY'] as const)('shared button rebinds %s palette on rerender and keeps token sizing', clinicType => {
  const view = render(<ThemeProvider clinicType="AYURVEDA"><ThemedButton label="Synthetic action" onPress={() => {}} /></ThemeProvider>);
  expect(RN.StyleSheet.flatten(view.getByLabelText('Synthetic action').props.style).backgroundColor).toBe(getTheme('AYURVEDA').colors.primary.default);
  view.rerender(<ThemeProvider clinicType={clinicType}><ThemedButton label="Synthetic action" onPress={() => {}} /></ThemeProvider>);
  const style = RN.StyleSheet.flatten(view.getByLabelText('Synthetic action').props.style);
  expect(style.backgroundColor).toBe(getTheme(clinicType).colors.primary.default);
  expect(style.minHeight).toBe(getTheme(clinicType).sizes.touchTarget);
});


it.each(['AYURVEDA','GENERAL_MEDICINE','DENTAL','PHYSIOTHERAPY'] as const)('shared header rebinds %s tokens without losing callback behavior', clinicType => {
  const back = jest.fn(); const logout = jest.fn(); const notifications = jest.fn();
  const view = render(<ThemeProvider><DashboardHeader title="Synthetic header" onBackPress={back} onLogoutPress={logout} onNotificationPress={notifications} notificationCount={150} /></ThemeProvider>);
  view.rerender(<ThemeProvider clinicType={clinicType}><DashboardHeader title="Synthetic header" onBackPress={back} onLogoutPress={logout} onNotificationPress={notifications} notificationCount={150} /></ThemeProvider>);
  expect(RN.StyleSheet.flatten(view.getByText('Synthetic header').props.style).color).toBe(getTheme(clinicType).colors.text.primary);
  expect(view.getByText('99+')).toBeTruthy();
  fireEvent.press(view.getByLabelText('common.goBack'));
  fireEvent.press(view.getByLabelText('navigation.logout'));
  fireEvent.press(view.getByLabelText('navigation.notifications'));
  expect(back).toHaveBeenCalledTimes(1); expect(logout).toHaveBeenCalledTimes(1); expect(notifications).toHaveBeenCalledTimes(1);
});

it('summary counts are global server counts, distinct from filtered page totals; missing metrics are not fabricated', () => {
  const view = workspace();
  expect(view.getByText('120')).toBeTruthy();
  expect(view.getByText('70')).toBeTruthy();
  expect(view.getByText('platformTenants.title (80)')).toBeTruthy();
  expect(view.getAllByText('platformAdmin.metricContractMissing')).toHaveLength(2);
  fireEvent.changeText(view.getByLabelText('common.search'), 'Synthetic');
  fireEvent.press(view.getByText('platformAdmin.clearFilters'));
  expect(mockPageHook).toHaveBeenLastCalledWith(0, 10, { sort: 'created_desc' });
  expect(view.getByRole('button', { name: 'platformAdmin.type' })).toBeDisabled();
  expect(view.getByRole('button', { name: 'platformAdmin.organization' })).toBeDisabled();
});
