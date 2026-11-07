/**
 * Platform tenant list refetch policy.
 *
 * Every platform list read persists a mandatory access-audit row, so the two
 * intentional list queries must not refetch passively on window focus or network
 * reconnect, and stay fresh for 30 s. The detail query is deliberately unchanged
 * (staleTime 0, default focus/reconnect behavior) so a fresh aggregate version is
 * read. These tests use the real hooks and repository with only the HTTP
 * datasource replaced; no network or platform API is touched.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformClinicWorkspace } from '../../features/tenants/presentation/pages/PlatformTenantsScreen';
import {
  platformTenantKeys,
  platformTenantListQueryPolicy,
  usePlatformTenantQuery,
  usePlatformTenantsQuery,
} from '../../features/tenants/data/repositories/platformTenants.repository';
import { getPlatformTenantApi, listPlatformTenantsApi } from '../../features/tenants/data/datasources/platformTenants.api';
import { platformDto } from './platformTenant.fixture';

jest.mock('../../features/tenants/data/datasources/platformTenants.api', () => ({
  listPlatformTenantsApi: jest.fn(),
  getPlatformTenantApi: jest.fn(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useLocalSearchParams: () => ({ tenantId: 'synthetic-id' }), Link: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../core/localization', () => ({ t: (key: string) => key, getCurrentLocale: () => 'en-US', ErrorTokens: { auth: { logoutFailed: 'logoutFailed' } } }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ logout: jest.fn(), currentUser: { userId: 'synthetic-actor', fullName: 'Synthetic Admin' } }) }));
jest.mock('../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => jest.requireActual('../../core/theme/useClinicTheme').getTheme('AYURVEDA') }));

const list = listPlatformTenantsApi as jest.Mock;
const detail = getPlatformTenantApi as jest.Mock;
const SORT = { sort: 'created_desc' };
let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const callsFor = (offset: number, limit: number, query: object) =>
  list.mock.calls.filter(([o, l, q]) => o === offset && l === limit && JSON.stringify(q) === JSON.stringify(query)).length;
const settle = () => act(async () => { await new Promise<void>(resolve => setImmediate(resolve)); });
const toggleFocusAndReconnect = () => act(async () => {
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await new Promise<void>(resolve => setImmediate(resolve));
});
const loadWorkspace = async () => {
  const view = render(<PlatformClinicWorkspace />, { wrapper });
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  // Both queries resolved and rendered (table paging control and summary total).
  await waitFor(() => expect(view.getByText('common.next')).toBeTruthy());
  await waitFor(() => expect(view.getByText('platformTenants.title (80)')).toBeTruthy());
  await settle();
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  list.mockImplementation(async (offset: number, limit: number) => ({ items: [platformDto], total: 80, active_total: 40, offset, limit }));
  detail.mockResolvedValue(platformDto);
});
afterEach(async () => {
  cleanup();
  await client.cancelQueries();
  client.clear();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe('platform tenant list query options', () => {
  it('exports the approved list policy', () => {
    expect(platformTenantListQueryPolicy).toEqual({ staleTime: 30_000, refetchOnWindowFocus: false, refetchOnReconnect: false });
  });

  it('applies the policy to a list query without changing its key', async () => {
    const { result } = renderHook(() => usePlatformTenantsQuery('actor', 0, 1, {}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key = platformTenantKeys.list('actor', 0, 1, {});
    expect(key).toEqual(['platform-tenants', 'actor', 0, 1, {}]);
    const options = client.getQueryCache().find({ queryKey: key })!.observers[0].options;
    expect(options.staleTime).toBe(30_000);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(false);
  });

  it('leaves the detail query options unchanged', async () => {
    const { result } = renderHook(() => usePlatformTenantQuery('actor', 'synthetic-id'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const key = platformTenantKeys.detail('actor', 'synthetic-id');
    expect(key).toEqual(['platform-tenant', 'actor', 'synthetic-id']);
    const options = client.getQueryCache().find({ queryKey: key })!.observers[0].options;
    expect(options.staleTime).toBe(0);
    // Not overridden: the library defaults (refetch on focus/reconnect) remain in force.
    expect(options.refetchOnWindowFocus).not.toBe(false);
    expect(options.refetchOnReconnect).not.toBe(false);
  });
});

describe('platform tenant workspace list queries', () => {
  it('issues exactly the two intentional queries on initial load', async () => {
    await loadWorkspace();
    expect(list).toHaveBeenCalledTimes(2);
    expect(callsFor(0, 1, {})).toBe(1);
    expect(callsFor(0, 10, SORT)).toBe(1);
  });

  it('does not refetch on window focus or network reconnect', async () => {
    await loadWorkspace();
    await toggleFocusAndReconnect();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('control: the unchanged detail query still refetches on focus, so the harness can detect refetches', async () => {
    const { result } = renderHook(() => usePlatformTenantQuery('actor', 'synthetic-id'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(detail).toHaveBeenCalledTimes(1);
    await toggleFocusAndReconnect();
    await waitFor(() => expect(detail.mock.calls.length).toBeGreaterThan(1));
  });

  it('pagination updates the table query only', async () => {
    const view = await loadWorkspace();
    fireEvent.press(view.getByText('common.next'));
    await waitFor(() => expect(callsFor(10, 10, SORT)).toBe(1));
    expect(callsFor(0, 1, {})).toBe(1);
  });

  it('a filter change updates the table query only', async () => {
    const view = await loadWorkspace();
    fireEvent.changeText(view.getByLabelText('common.search'), 'Syn');
    await waitFor(() => expect(callsFor(0, 10, { ...SORT, search: 'Syn' })).toBe(1));
    expect(callsFor(0, 1, {})).toBe(1);
  });

  it('Manage preparation refreshes the single tenant through the detail query, not the whole table', async () => {
    const view = await loadWorkspace();
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.manage Synthetic clinic' }));
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.prepareExtension' }));
    await waitFor(() => expect(detail).toHaveBeenCalledTimes(1));
    expect(detail).toHaveBeenCalledWith('synthetic-id');
    expect(callsFor(0, 10, SORT)).toBe(1);
    expect(callsFor(0, 1, {})).toBe(1);
  });

  it('explicit summary Retry still refetches the totals query', async () => {
    list.mockImplementation(async (offset: number, limit: number) => {
      if (limit === 1 && callsFor(0, 1, {}) === 1) throw new Error('synthetic failure');
      return { items: [platformDto], total: 80, active_total: 40, offset, limit };
    });
    const view = render(<PlatformClinicWorkspace />, { wrapper });
    const retry = await view.findAllByText('platformAdmin.retrySummary');
    fireEvent.press(retry[0]);
    await waitFor(() => expect(callsFor(0, 1, {})).toBe(2));
    expect(callsFor(0, 10, SORT)).toBe(1);
  });
});
