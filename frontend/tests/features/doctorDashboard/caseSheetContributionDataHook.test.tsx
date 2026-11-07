/**
 * T-FE-E.1b (T-BE-E.1a, Decision 12) — tests for
 * `useCasesheetContributionHistoryQuery` (`casesheets.repository.impl.ts`).
 *
 * Mocks only the datasource layer (`getCasesheetContributionsApi`) — the
 * hook itself, and react-query, run for real. Proves: the exact endpoint
 * called, the complete query key (every context dimension the backend
 * requires), the `enabled` guard when any required context is missing, that
 * the response is mirrored 1:1 with no frontend transformation/sorting/
 * author-join, and that refetch/retry work through react-query normally.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCasesheetContributionHistoryQuery,
  casesheetsKeys,
} from '../../../features/casesheets/data/repositories/casesheets.repository.impl';
import { getCasesheetContributionsApi } from '../../../features/casesheets/data/datasources/casesheets.api';
import { CasesheetContributionHistoryResponse } from '../../../features/casesheets/data/models/casesheets.dtos';

jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  getCasesheetContributionsApi: jest.fn(),
}));

const TENANT_ID = 'tenant-1';
const CASESHEET_ID = 'casesheet-1';
const CLIENT_ID = 'client-1';
const EPISODE_ID = 'episode-1';

const RESPONSE: CasesheetContributionHistoryResponse = {
  casesheet_id: CASESHEET_ID,
  episode_id: EPISODE_ID,
  contributions: [
    {
      id: 'contribution-1',
      visit_id: 'visit-1',
      author: { staff_id: 'staff-1', full_name: 'Dr. Asha Rao' },
      contributed_at: '2026-06-01T10:00:00',
      content_snapshot: { basic: { chief_complaint: 'headache' }, extensions: [] },
      content_available: true,
    },
  ],
};

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useCasesheetContributionHistoryQuery (T-FE-E.1b)', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.clearAllMocks();
    (getCasesheetContributionsApi as jest.Mock).mockResolvedValue(RESPONSE);
  });

  it('calls the exact endpoint with tenantId, casesheetId, clientId, episodeId', async () => {
    const { result } = renderHook(
      () => useCasesheetContributionHistoryQuery(TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCasesheetContributionsApi).toHaveBeenCalledWith(TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID);
  });

  it('builds a query key containing every required context dimension', () => {
    const key = casesheetsKeys.contributionHistory(TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID);
    expect(key).toEqual(
      expect.arrayContaining(['casesheets', 'contributions', TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID]),
    );
  });

  it('a different casesheetId produces a different query key (no cache leakage across Case Sheets)', () => {
    const keyA = casesheetsKeys.contributionHistory(TENANT_ID, 'casesheet-A', CLIENT_ID, EPISODE_ID);
    const keyB = casesheetsKeys.contributionHistory(TENANT_ID, 'casesheet-B', CLIENT_ID, EPISODE_ID);
    expect(keyA).not.toEqual(keyB);
  });

  it('mirrors the backend response 1:1 -- no transformation, no author join, no reordering', async () => {
    const { result } = renderHook(
      () => useCasesheetContributionHistoryQuery(TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(RESPONSE);
  });

  describe('disabled when required context is absent', () => {
    it.each([
      ['tenantId', '', CASESHEET_ID, CLIENT_ID, EPISODE_ID],
      ['casesheetId', TENANT_ID, '', CLIENT_ID, EPISODE_ID],
      ['clientId', TENANT_ID, CASESHEET_ID, '', EPISODE_ID],
      ['episodeId', TENANT_ID, CASESHEET_ID, CLIENT_ID, ''],
    ])('never calls the API when %s is missing', async (_label, tenantId, casesheetId, clientId, episodeId) => {
      const { result } = renderHook(
        () => useCasesheetContributionHistoryQuery(tenantId, casesheetId, clientId, episodeId),
        { wrapper },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(getCasesheetContributionsApi).not.toHaveBeenCalled();
    });
  });

  it('refetch re-invokes the datasource (retry/refetch works through react-query normally)', async () => {
    const { result } = renderHook(
      () => useCasesheetContributionHistoryQuery(TENANT_ID, CASESHEET_ID, CLIENT_ID, EPISODE_ID),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getCasesheetContributionsApi).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(getCasesheetContributionsApi).toHaveBeenCalledTimes(2);
  });
});
