// @ts-nocheck -- Jest globals are intentionally supplied by the Expo test runtime.
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axiosClient } from '../../../core/api/axiosClient';
import { getDailyFinanceSummaryApi } from '../../../features/billing/data/datasources/billing.api';
import {
  billingKeys,
  useCreatePaymentMutation,
  useDailyFinanceSummaryQuery,
} from '../../../features/billing/data/repositories/billing.repository.impl';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn(), post: jest.fn() } }));

const SUMMARY = { date: '2026-11-21', collected_amount: '2000.00', billed_amount: '2000.00', payments_count: 1, outstanding_amount: '0.00' };
const wrapper = (client) => ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const clients = [];
const newClient = () => { const c = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(c); return c; };

describe('daily finance summary (the dashboard\'s Daily Revenue)', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => { while (clients.length) clients.pop().clear(); }); // no cache timers left running after the test

  it('asks the server for the clinic\'s day: today by default, or the day given', async () => {
    axiosClient.get.mockResolvedValue({ data: SUMMARY });
    await getDailyFinanceSummaryApi('tenant-1');
    expect(axiosClient.get).toHaveBeenCalledWith('/api/v1/finance/tenant-1/summary/daily', { params: undefined });
    await getDailyFinanceSummaryApi('tenant-1', '2026-11-20');
    expect(axiosClient.get).toHaveBeenLastCalledWith('/api/v1/finance/tenant-1/summary/daily', { params: { date: '2026-11-20' } });
  });

  it('exposes the collected amount from the server and does not compute it', async () => {
    axiosClient.get.mockResolvedValue({ data: SUMMARY });
    const client = newClient();
    const { result } = renderHook(() => useDailyFinanceSummaryQuery('tenant-1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
  });

  it('does not fetch without a clinic', () => {
    renderHook(() => useDailyFinanceSummaryQuery(''), { wrapper: wrapper(newClient()) });
    expect(axiosClient.get).not.toHaveBeenCalled();
  });

  it('refreshes the day\'s revenue after a payment is recorded', async () => {
    axiosClient.post.mockResolvedValue({ data: { id: 'payment-1' } });
    const client = newClient();
    client.setQueryData(billingKeys.dailySummary('tenant-1'), SUMMARY);
    const { result } = renderHook(() => useCreatePaymentMutation('tenant-1'), { wrapper: wrapper(client) });
    await act(async () => { await result.current.mutateAsync({ invoice_id: 'i', client_id: 'c', payment_date: '2026-11-21', amount: '100', payment_method: 'CASH' }); });
    expect(client.getQueryState(billingKeys.dailySummary('tenant-1')).isInvalidated).toBe(true);
  });
});
