/**
 * Debounced platform tenant search and placeholder-aware table.
 *
 * Real hooks and repository with only the HTTP datasource replaced; fake timers drive the
 * 300 ms debounce. No network or platform API is touched.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformClinicWorkspace } from '../../features/tenants/presentation/pages/PlatformTenantsScreen';
import { listPlatformTenantsApi } from '../../features/tenants/data/datasources/platformTenants.api';
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
const SORT = { sort: 'created_desc' };
let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const tick = (ms = 0) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });
const callsFor = (offset: number, limit: number, query: object) =>
  list.mock.calls.filter(([o, l, q]) => o === offset && l === limit && JSON.stringify(q) === JSON.stringify(query)).length;
const defer = () => { let resolve!: (value: unknown) => void; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const pageFor = (offset: number, limit: number, query: any) => ({
  items: [{ ...platformDto, id: `id-${query.search ?? 'base'}`, name: query.search ? `Result ${query.search}` : 'Synthetic clinic' }],
  total: 80, active_total: 40, offset, limit,
});
let pending: Record<string, ReturnType<typeof defer>>;

const load = async () => {
  const view = render(<PlatformClinicWorkspace />, { wrapper });
  await waitFor(() => expect(view.getByText('common.next')).toBeTruthy());
  await tick(0);
  return view;
};
const type = (view: ReturnType<typeof render>, text: string) => fireEvent.changeText(view.getByLabelText('common.search'), text);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  pending = {};
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  list.mockImplementation((offset: number, limit: number, query: any) =>
    query.search && pending[query.search] ? pending[query.search].promise : Promise.resolve(pageFor(offset, limit, query)));
});
afterEach(async () => {
  cleanup();
  await client.cancelQueries();
  client.clear();
  jest.useRealTimers();
});

describe('debounced search', () => {
  it('multiple keystrokes inside 300 ms produce one applied request', async () => {
    const view = await load();
    type(view, 'a'); await tick(100);
    type(view, 'ab'); await tick(100);
    type(view, 'abc'); await tick(299);
    expect(callsFor(0, 10, { ...SORT, search: 'abc' })).toBe(0);
    await tick(1);
    expect(callsFor(0, 10, { ...SORT, search: 'abc' })).toBe(1);
    expect(list.mock.calls.filter(([, , q]) => q.search).map(([, , q]) => q.search)).toEqual(['abc']);
  });

  it('a pause longer than 300 ms applies the search, and a later pause applies the next', async () => {
    const view = await load();
    type(view, 'a'); await tick(300);
    expect(callsFor(0, 10, { ...SORT, search: 'a' })).toBe(1);
    type(view, 'ab'); await tick(300);
    expect(callsFor(0, 10, { ...SORT, search: 'ab' })).toBe(1);
  });

  it('another keystroke resets the debounce', async () => {
    const view = await load();
    type(view, 'ab'); await tick(200);
    type(view, 'abc'); await tick(200); // 400 ms since the first key, 200 ms since the last
    expect(list.mock.calls.some(([, , q]) => q.search)).toBe(false);
    await tick(100);
    expect(callsFor(0, 10, { ...SORT, search: 'abc' })).toBe(1);
  });

  it('trims the applied text and enforces the 100-character limit on the input', async () => {
    const view = await load();
    expect(view.getByLabelText('common.search').props.maxLength).toBe(100);
    type(view, '  abc  '); await tick(300);
    expect(callsFor(0, 10, { ...SORT, search: 'abc' })).toBe(1);
  });

  it('clearing applies immediately and restores the exact unfiltered query (cache hit, no search property)', async () => {
    const view = await load();
    type(view, 'abc'); await tick(300);
    await waitFor(() => expect(view.getByText('Result abc')).toBeTruthy());
    const before = list.mock.calls.length;
    type(view, '');
    await tick(0); // no debounce wait
    await waitFor(() => expect(view.getByText('Synthetic clinic')).toBeTruthy());
    expect(list.mock.calls.length).toBe(before); // unfiltered key is still fresh (30 s): served from cache
    expect(callsFor(0, 10, SORT)).toBe(1);
    expect(list.mock.calls.every(([, , q]) => !('search' in q && q.search === ''))).toBe(true);
  });

  it('whitespace-only input is an empty search and never sends a search property', async () => {
    const view = await load();
    type(view, '   '); await tick(600);
    expect(list).toHaveBeenCalledTimes(2); // only the two initial queries
    expect(list.mock.calls.every(([, , q]) => !('search' in q))).toBe(true);
  });

  it('applying a search resets pagination to offset 0', async () => {
    const view = await load();
    fireEvent.press(view.getByText('common.next'));
    await waitFor(() => expect(callsFor(10, 10, SORT)).toBe(1));
    type(view, 'abc'); await tick(300);
    expect(callsFor(0, 10, { ...SORT, search: 'abc' })).toBe(1);
    expect(callsFor(10, 10, { ...SORT, search: 'abc' })).toBe(0);
  });

  it('preserves sorting and status filters when a search is applied', async () => {
    const view = await load();
    fireEvent.press(view.getByLabelText('platformAdmin.operationalStatus'));
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.active' }));
    fireEvent.press(view.getByLabelText('platformAdmin.sortBy'));
    fireEvent.press(view.getByText('platformAdmin.name_asc'));
    type(view, 'abc'); await tick(300);
    expect(callsFor(0, 10, { sort: 'name_asc', status: 'active', search: 'abc' })).toBe(1);
  });

  it('a filter change during a pending debounce does not lose the pending search text', async () => {
    const view = await load();
    type(view, 'abc'); await tick(100);
    fireEvent.press(view.getByLabelText('platformAdmin.operationalStatus'));
    fireEvent.press(view.getByRole('button', { name: 'platformAdmin.active' }));
    await tick(0);
    expect(callsFor(0, 10, { ...SORT, status: 'active' })).toBe(1);
    expect((view.getByLabelText('common.search').props.value)).toBe('abc');
    await tick(200);
    expect(callsFor(0, 10, { ...SORT, status: 'active', search: 'abc' })).toBe(1);
  });

  it('clear filters resets the input, the applied search and the filters', async () => {
    const view = await load();
    type(view, 'abc'); await tick(300);
    fireEvent.press(view.getByText('platformAdmin.clearFilters'));
    await tick(0);
    expect(view.getByLabelText('common.search').props.value).toBe('');
    await waitFor(() => expect(view.getByText('Synthetic clinic')).toBeTruthy());
  });

  it('never refetches the summary query (0,1,{}) when search changes', async () => {
    const view = await load();
    type(view, 'abc'); await tick(300);
    type(view, ''); await tick(300);
    expect(callsFor(0, 1, {})).toBe(1);
  });
});

describe('table loading experience', () => {
  it('keeps the previous rows visible with a loading indicator and disabled paging while a new search loads', async () => {
    pending.abc = defer();
    const view = await load();
    expect(view.getByText('platformTenants.title (80)')).toBeTruthy();
    type(view, 'abc'); await tick(300);
    expect(view.getByText('Synthetic clinic')).toBeTruthy(); // previous rows still visible
    expect(view.getByTestId('table-refreshing')).toBeTruthy();
    expect(view.queryByText('platformTenants.title (80)')).toBeNull(); // previous total not presented for the new query
    expect(view.getByRole('button', { name: 'common.next' })).toBeDisabled();
    expect(view.getByRole('button', { name: 'common.previous' })).toBeDisabled();
    await act(async () => { pending.abc.resolve(pageFor(0, 10, { search: 'abc' })); });
    await waitFor(() => expect(view.getByText('Result abc')).toBeTruthy());
    expect(view.queryByTestId('table-refreshing')).toBeNull();
    expect(view.getByRole('button', { name: 'common.next' })).toBeEnabled();
  });

  it('an older search response cannot replace the newer search results', async () => {
    pending.ab = defer(); pending.abc = defer();
    const view = await load();
    type(view, 'ab'); await tick(300);
    type(view, 'abc'); await tick(300);
    await act(async () => { pending.abc.resolve(pageFor(0, 10, { search: 'abc' })); });
    await waitFor(() => expect(view.getByText('Result abc')).toBeTruthy());
    await act(async () => { pending.ab.resolve(pageFor(0, 10, { search: 'ab' })); });
    await tick(0);
    expect(view.getByText('Result abc')).toBeTruthy();
    expect(view.queryByText('Result ab')).toBeNull();
  });

  it('explicit Retry on a failed table load still refetches the applied query', async () => {
    const view = await load();
    list.mockImplementation((offset: number, limit: number, query: any) => (limit === 10 && callsFor(0, 10, query) === 1 && query.search === 'bad' ? Promise.reject(new Error('synthetic')) : Promise.resolve(pageFor(offset, limit, query))));
    type(view, 'bad'); await tick(300);
    const retry = await view.findByText('common.retry');
    fireEvent.press(retry);
    await waitFor(() => expect(callsFor(0, 10, { ...SORT, search: 'bad' })).toBe(2));
    expect(callsFor(0, 1, {})).toBe(1);
  });
});
