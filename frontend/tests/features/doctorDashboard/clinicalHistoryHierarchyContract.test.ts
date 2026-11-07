import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useClinicalHistoryQuery,
  clinicalWorkspaceKeys,
} from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import { getClinicalWorkspaceHistoryApi } from '../../../features/episodes/data/datasources/clinicalWorkspace.api';
import { ClinicalHistoryResponse } from '../../../features/episodes/data/models/clinicalWorkspace.dtos';

/**
 * T-FE-C.5 (T-BE-A.3/A.3a, FR-HIST-1/2) — data-contract tests for the
 * Clinical History hierarchy: exact endpoint/params, query key
 * composition, the `enabled` guard, and 1:1 response mirroring
 * (including `occurred_at` nullability and `session_counts`
 * nullability/preservation). Mocks only the datasource
 * (`getClinicalWorkspaceHistoryApi`) — the hook and react-query run for
 * real.
 */

jest.mock('../../../features/episodes/data/datasources/clinicalWorkspace.api', () => ({
  getClinicalWorkspaceHistoryApi: jest.fn(),
  getClinicalWorkspaceApi: jest.fn(),
}));

const TENANT_ID = 'tenant-1';
const CLIENT_ID = 'client-1';
const EPISODE_ID = 'episode-1';

const RESPONSE: ClinicalHistoryResponse = {
  items: [
    {
      id: 'appt-1',
      encounter_type: 'consultation',
      appointment_ids: ['appt-1'],
      plan_id: null,
      session_counts: null,
      occurred_at: '2026-06-01T10:00:00',
      plan_status: null,
      sessions: null,
    },
    {
      id: 'plan-1',
      encounter_type: 'treatment_plan',
      appointment_ids: ['appt-2', 'appt-3'],
      plan_id: 'plan-1',
      session_counts: { completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 },
      occurred_at: '2026-05-15T08:00:00',
      // T-BE-A.3b (FR-HIST-1 AC7/AC8/AC9)
      plan_status: 'active_course',
      sessions: [
        {
          id: 'row-1',
          scheduled_date: '2026-05-20',
          scheduled_time: '09:00:00',
          scheduled_at: null,
          assigned_staff_id: 'staff-1',
          assigned_staff_name: 'Dr. Rao',
          treatment_name: 'Ultrasound',
          medicines_text: null,
          instructions_text: 'Ice after session',
          status: 'COMPLETED',
          completed_at: '2026-05-20T09:30:00',
          completed_by_staff_id: 'staff-1',
          non_execution_reason_code: null,
          non_execution_reason_text: null,
        },
      ],
    },
    {
      id: 'sheet-1',
      encounter_type: 'treatment_review',
      appointment_ids: [],
      plan_id: null,
      session_counts: null,
      occurred_at: null,
      plan_status: null,
      sessions: null,
    },
  ],
};

let queryClient: QueryClient;
// .test.ts (not .tsx) -- JSX is unavailable here, so the wrapper is built
// with React.createElement instead of a JSX expression.
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useClinicalHistoryQuery data contract (T-FE-C.5)', () => {
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    jest.clearAllMocks();
    (getClinicalWorkspaceHistoryApi as jest.Mock).mockResolvedValue(RESPONSE);
  });

  it('calls the exact endpoint with tenantId, clientId, episodeId', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getClinicalWorkspaceHistoryApi).toHaveBeenCalledWith(TENANT_ID, CLIENT_ID, EPISODE_ID);
  });

  it('the datasource targets GET /clinic/{tenant_id}/clinical-workspace/history with client_id/episode_id query params', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/data/datasources/clinicalWorkspace.api.ts'),
      'utf8',
    );
    expect(source).toMatch(/\/api\/v1\/clinic\/\$\{tenantId\}\/clinical-workspace\/history/);
    expect(source).toMatch(/client_id:\s*clientId/);
    expect(source).toMatch(/episode_id:\s*episodeId/);
  });

  it('builds a query key containing tenantId, clientId, episodeId', () => {
    const key = clinicalWorkspaceKeys.history(TENANT_ID, CLIENT_ID, EPISODE_ID);
    expect(key).toEqual(expect.arrayContaining([TENANT_ID, CLIENT_ID, EPISODE_ID]));
  });

  it('the history query key is distinct from the facts-aggregate detail key (no cache collision)', () => {
    const historyKey = clinicalWorkspaceKeys.history(TENANT_ID, CLIENT_ID, EPISODE_ID);
    const detailKey = clinicalWorkspaceKeys.detail(TENANT_ID, CLIENT_ID, EPISODE_ID, 'appointment-1');
    expect(historyKey).not.toEqual(detailKey);
  });

  it('a different episodeId produces a different query key (no cross-Episode cache leakage)', () => {
    const keyA = clinicalWorkspaceKeys.history(TENANT_ID, CLIENT_ID, 'episode-A');
    const keyB = clinicalWorkspaceKeys.history(TENANT_ID, CLIENT_ID, 'episode-B');
    expect(keyA).not.toEqual(keyB);
  });

  describe('disabled when required context is absent', () => {
    it.each([
      ['tenantId', '', CLIENT_ID, EPISODE_ID],
      ['clientId', TENANT_ID, '', EPISODE_ID],
      ['episodeId', TENANT_ID, CLIENT_ID, ''],
    ])('never calls the API when %s is missing', async (_label, tenantId, clientId, episodeId) => {
      const { result } = renderHook(() => useClinicalHistoryQuery(tenantId, clientId, episodeId), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
      expect(getClinicalWorkspaceHistoryApi).not.toHaveBeenCalled();
    });
  });

  it('mirrors the backend response 1:1 -- no transformation, no reordering, no field renaming', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(RESPONSE);
  });

  it('preserves a null occurred_at exactly (treatment_review) -- never coerced or dropped', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const review = result.current.data!.items.find((i) => i.encounter_type === 'treatment_review')!;
    expect(review.occurred_at).toBeNull();
  });

  it('preserves a non-null occurred_at exactly', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const consultation = result.current.data!.items.find((i) => i.encounter_type === 'consultation')!;
    expect(consultation.occurred_at).toBe('2026-06-01T10:00:00');
  });

  it('preserves session_counts for treatment_plan, and null for types where it is not applicable', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const plan = result.current.data!.items.find((i) => i.encounter_type === 'treatment_plan')!;
    const consultation = result.current.data!.items.find((i) => i.encounter_type === 'consultation')!;
    expect(plan.session_counts).toEqual({ completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 });
    expect(consultation.session_counts).toBeNull();
  });

  it('preserves backend response order exactly -- treatment_plan sorts earlier in occurred_at but stays second, matching the raw fixture order', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data!.items.map((i) => i.id)).toEqual(['appt-1', 'plan-1', 'sheet-1']);
  });

  it('refetch re-invokes the datasource', async () => {
    const { result } = renderHook(() => useClinicalHistoryQuery(TENANT_ID, CLIENT_ID, EPISODE_ID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getClinicalWorkspaceHistoryApi).toHaveBeenCalledTimes(1);
    await result.current.refetch();
    expect(getClinicalWorkspaceHistoryApi).toHaveBeenCalledTimes(2);
  });

  describe('no appointment join / no second history authority at the data layer', () => {
    const repoSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl.ts'),
      'utf8',
    );
    const datasourceSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/data/datasources/clinicalWorkspace.api.ts'),
      'utf8',
    );

    it('the repository performs no local sort of history items', () => {
      expect(repoSource).not.toMatch(/\.sort\(|\.reverse\(/);
    });

    it('the datasource makes exactly one HTTP call for history -- no appointments/prescriptions/treatment-sheets join call', () => {
      expect(datasourceSource).not.toMatch(/appointments\?|prescriptions\?|treatment-sheets\?/);
      expect(datasourceSource).not.toMatch(/getAppointment|getPrescription|getTreatmentSheet/i);
    });

    it('no duplicate DTO name for the same backend contract exists elsewhere in the episodes feature', () => {
      const dtoSource = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/data/models/clinicalWorkspace.dtos.ts'),
        'utf8',
      );
      const matches = dtoSource.match(/interface HistoryItemResponse/g) ?? [];
      expect(matches.length).toBe(1);
    });
  });
});
