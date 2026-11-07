import { platformDto } from './platformTenant.fixture';
import React, { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { listPlatformTenantsApi, getPlatformTenantApi } from '../../features/tenants/data/datasources/platformTenants.api';
import { usePlatformTenantsQuery, usePlatformTenantQuery, mapPlatformTenant } from '../../features/tenants/data/repositories/platformTenants.repository';
import { axiosClient } from '../../core/api/axiosClient';
jest.mock('../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn() } }));
const get = axiosClient.get as jest.Mock;
const page = { items: [platformDto], total: 18, active_total: 12, offset: 25, limit: 25 };

beforeEach(() => { jest.clearAllMocks(); get.mockResolvedValue({ data: page }); });
it('uses the platform namespace and explicit pagination, without customer context', async () => {
  expect(await listPlatformTenantsApi(25, 25)).toEqual(page);
  expect(get).toHaveBeenCalledWith('/api/v1/platform/tenants', { params: { offset: 25, limit: 25 } });
});
it('encodes detail identifier and propagates authorization failures', async () => {
  get.mockRejectedValue(new Error('403'));
  await expect(getPlatformTenantApi('synthetic/id')).rejects.toThrow('403');
  expect(get).toHaveBeenCalledWith('/api/v1/platform/tenants/synthetic%2Fid');
});
it('keeps cache entries separate by authenticated identity and page', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ actor, offset }) => usePlatformTenantsQuery(actor, offset, 25), { initialProps: { actor: 'actor-a', offset: 0 }, wrapper });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  hook.rerender({ actor: 'actor-b', offset: 25 });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(client.getQueryData(['platform-tenants', 'actor-a', 0, 25, {}])).toMatchObject({ total: 18, activeTotal: 12 });
  expect(client.getQueryData(['platform-tenants', 'actor-b', 25, 25, {}])).toMatchObject({ total: 18, activeTotal: 12 });
  expect(get).toHaveBeenCalledTimes(2);
  hook.unmount(); client.clear();
});
it('does not request platform metadata without an authenticated identity', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => ({ list: usePlatformTenantsQuery(undefined), detail: usePlatformTenantQuery(undefined, 'synthetic') }), { wrapper });
  expect(get).not.toHaveBeenCalled();
  expect(hook.result.current.list.fetchStatus).toBe('idle');
  hook.unmount(); client.clear();
});

it('maps wire DTOs into domain names and drops extra transport fields', () => {
  const entity = mapPlatformTenant({ ...platformDto, patient_records: 'must not propagate', audit: { availability: 'available', reason: 'forged' } });
  expect(entity.clinicType).toBe('general');
  expect(entity.organization.associationId).toBe('synthetic-association');
  expect(entity.trial.aggregateVersion).toBe(2);
  expect(entity.entitlement.operationallyEntitled).toBe(false);
  expect(entity.auditAvailability).toBe('unavailable');
  expect(entity).not.toHaveProperty('clinic_type');
  expect(entity).not.toHaveProperty('patient_records');
});

it('query boundary can use an injected domain repository without transport', async () => {
  const entity = mapPlatformTenant(platformDto);
  const repository = { list: jest.fn().mockResolvedValue({ items: [entity], total: 1, activeTotal: 1, offset: 0, limit: 25 }), get: jest.fn().mockResolvedValue(entity) };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => usePlatformTenantQuery('actor', 'synthetic-id', repository), { wrapper });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(repository.get).toHaveBeenCalledWith('synthetic-id');
  expect(get).not.toHaveBeenCalled();
  hook.unmount(); client.clear();
});
