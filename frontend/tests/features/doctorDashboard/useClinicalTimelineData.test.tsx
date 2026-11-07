import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClinicalTimelineData } from '../../../features/episodes/presentation/hooks/useClinicalTimelineData';
import { useEpisodeContext, usePatientContext } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useClinicalHistoryQuery } from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';

/**
 * T-FE-C.5 (T-BE-A.3/A.3a, FR-HIST-1/2) — rewrite of this hook's own test
 * file. The pre-T-FE-C.5 version mocked five independent queries
 * (appointments/prescriptions/treatment sheets/casesheet-via-context/
 * per-Visit clinical services) and included a deliberate "history-hierarchy
 * defect characterization" block documenting three then-open defects
 * (undifferentiated visit shape, no genuine session-count subtitle,
 * therapy double-representation). All three are fixed by consuming the
 * backend's classified `history_items[]` contract, so that
 * characterization block is superseded here, not merely extended --
 * documented in this docstring rather than left half-true in test form.
 */

jest.mock('../../../features/episodes/presentation/context/ClinicalWorkspaceContext', () => ({
  useEpisodeContext: jest.fn(),
  usePatientContext: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl', () => ({
  useClinicalHistoryQuery: jest.fn(),
}));

const TENANT_ID = 'tenant-1';
const CLIENT_ID = 'client-1';
const EPISODE_ID = 'episode-1';

function mockQueryResult(overrides: Partial<ReturnType<typeof defaultQueryResult>> = {}) {
  (useClinicalHistoryQuery as jest.Mock).mockReturnValue({ ...defaultQueryResult(), ...overrides });
}
function defaultQueryResult() {
  return { data: undefined as any, isLoading: false, isError: false, refetch: jest.fn() };
}

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  (useEpisodeContext as jest.Mock).mockReturnValue({ tenantId: TENANT_ID, episodeId: EPISODE_ID });
  (usePatientContext as jest.Mock).mockReturnValue({ clientId: CLIENT_ID });
});

describe('useClinicalTimelineData (T-FE-C.5)', () => {
  it('consumes useClinicalHistoryQuery with tenantId/clientId/episodeId from Persistent Context', () => {
    mockQueryResult();
    renderHook(() => useClinicalTimelineData(), { wrapper });
    expect(useClinicalHistoryQuery).toHaveBeenCalledWith(TENANT_ID, CLIENT_ID, EPISODE_ID);
  });

  it('returns an empty item list and isLoading=false when there is no data yet', () => {
    mockQueryResult({ data: undefined });
    const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
    expect(result.current.items).toEqual([]);
  });

  it('propagates isLoading/isError/refetch from the query unchanged', async () => {
    const refetch = jest.fn();
    mockQueryResult({ isLoading: true, isError: true, refetch });
    const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
    result.current.refetch();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  describe('mirrors backend items 1:1, no local classification/aggregation', () => {
    it('consultation item: id, encounter_type, occurred_at, appointment_ids passed through; route derived from its own appointment_ids[0]', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'appt-1', encounter_type: 'consultation', appointment_ids: ['appt-1'], plan_id: null, session_counts: null, occurred_at: '2026-06-01T10:00:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      const item = result.current.items[0];
      expect(item.id).toBe('appt-1');
      expect(item.type).toBe('consultation');
      expect(item.date).toBe('2026-06-01T10:00:00');
      expect(item.appointmentIds).toEqual(['appt-1']);
      expect(item.planId).toBeNull();
      expect(item.sessionCounts).toBeNull();
      expect(item.route).toBe('/clinic-admin/appointments/appt-1');
    });

    it('legacy_treatment_sessions item: same route-derivation pattern as consultation', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'appt-4', encounter_type: 'legacy_treatment_sessions', appointment_ids: ['appt-4'], plan_id: null, session_counts: null, occurred_at: '2026-06-02T09:30:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items[0].type).toBe('legacy_treatment_sessions');
      expect(result.current.items[0].route).toBe('/clinic-admin/appointments/appt-4');
    });

    it('treatment_plan item: session_counts and plan_id preserved unchanged; no route (no existing Plan detail screen)', () => {
      const sessionCounts = { completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 };
      mockQueryResult({
        data: {
          items: [
            { id: 'plan-1', encounter_type: 'treatment_plan', appointment_ids: ['appt-2', 'appt-3'], plan_id: 'plan-1', session_counts: sessionCounts, occurred_at: '2026-05-15T08:00:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      const item = result.current.items[0];
      expect(item.type).toBe('treatment_plan');
      expect(item.planId).toBe('plan-1');
      expect(item.sessionCounts).toEqual(sessionCounts);
      expect(item.route).toBeUndefined();
    });

    it('treatment_review item: empty appointment_ids preserved, no route, honest null occurred_at when unresolved', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'sheet-1', encounter_type: 'treatment_review', appointment_ids: [], plan_id: null, session_counts: null, occurred_at: null },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      const item = result.current.items[0];
      expect(item.type).toBe('treatment_review');
      expect(item.appointmentIds).toEqual([]);
      expect(item.route).toBeUndefined();
      expect(item.date).toBeNull();
    });

    it('a non-null occurred_at on treatment_review is preserved unchanged (T-BE-A.3a), never overridden', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'sheet-1', encounter_type: 'treatment_review', appointment_ids: [], plan_id: null, session_counts: null, occurred_at: '2026-06-10T11:15:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items[0].date).toBe('2026-06-10T11:15:00');
    });

    it('null session_counts is preserved as null, never coerced to zero', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'appt-1', encounter_type: 'consultation', appointment_ids: ['appt-1'], plan_id: null, session_counts: null, occurred_at: '2026-06-01T10:00:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items[0].sessionCounts).toBeNull();
    });

    it('every item retains a title -- a known encounter_type maps to a static localized label, never an inferred one', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'a1', encounter_type: 'consultation', appointment_ids: ['a1'], plan_id: null, session_counts: null, occurred_at: null },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items[0].title).toBe('Consultation');
    });

    it('an unrecognized encounter_type is never silently relabeled as a known type -- type is passed through verbatim', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'x1', encounter_type: 'a_future_type', appointment_ids: [], plan_id: null, session_counts: null, occurred_at: null },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items[0].type).toBe('a_future_type');
      expect(result.current.items[0].title).toBe('Clinical Encounter');
    });

    it('multiple items and duplicate occurred_at values are all retained -- never collapsed or deduplicated', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'a1', encounter_type: 'consultation', appointment_ids: ['a1'], plan_id: null, session_counts: null, occurred_at: '2026-06-01T10:00:00' },
            { id: 'a2', encounter_type: 'consultation', appointment_ids: ['a2'], plan_id: null, session_counts: null, occurred_at: '2026-06-01T10:00:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items.map((i) => i.id)).toEqual(['a1', 'a2']);
    });

    it('preserves backend order exactly -- output order matches input order, no reordering by occurred_at or any other field', () => {
      mockQueryResult({
        data: {
          items: [
            { id: 'plan-1', encounter_type: 'treatment_plan', appointment_ids: ['a2'], plan_id: 'plan-1', session_counts: null, occurred_at: '2026-05-01T00:00:00' },
            { id: 'a1', encounter_type: 'consultation', appointment_ids: ['a1'], plan_id: null, session_counts: null, occurred_at: '2026-06-01T00:00:00' },
          ],
        },
      });
      const { result } = renderHook(() => useClinicalTimelineData(), { wrapper });
      // plan-1's occurred_at is earlier than a1's, yet plan-1 comes first
      // in the backend response -- output order must match exactly.
      expect(result.current.items.map((i) => i.id)).toEqual(['plan-1', 'a1']);
    });
  });

  describe('Source-level architecture checks (T-FE-C.5 removal of the five-query flat assembly)', () => {
    const rawSource = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/hooks/useClinicalTimelineData.ts'),
      'utf8',
    );
    // The file's own docstring intentionally documents, in prose, the
    // retired symbols/behaviors it removed (naming what is NOT there is
    // exactly what makes the docstring useful to a future reader) -- these
    // "must not exist in actual code" checks strip comments first so the
    // explanatory prose doesn't false-positive against itself.
    const source = rawSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

    it('no longer imports any of the five retired flat-assembly queries', () => {
      expect(source).not.toMatch(/useAppointmentsListQuery/);
      expect(source).not.toMatch(/usePrescriptionsListQuery/);
      expect(source).not.toMatch(/useTreatmentSheetsByEpisodeQuery/);
      expect(source).not.toMatch(/clinicalServicesByVisitQueryOptions/);
    });

    it('performs no per-Visit useQueries fan-out', () => {
      expect(source).not.toMatch(/useQueries\(/);
    });

    it('calls exactly the one canonical Clinical History hook', () => {
      expect(source).toMatch(/useClinicalHistoryQuery\(/);
    });

    it('performs no local sort/reverse -- backend order preserved exactly', () => {
      expect(source).not.toMatch(/\.sort\(|\.reverse\(/);
    });

    it('performs no local encounter classification -- no appointment_type/therapy inspection', () => {
      expect(source).not.toMatch(/appointment_type|is_therapy|isTherapy/i);
    });

    it('performs no local Session-count aggregation -- no status/completed/cancelled counting logic', () => {
      expect(source).not.toMatch(/\.filter\([^)]*status/i);
      expect(source).not.toMatch(/session_date/);
    });

    it('performs no appointment-proximity/date-matching to derive a Plan or Review association', () => {
      expect(source).not.toMatch(/nearest|closest|proximity/i);
    });

    it('holds no clinical-artifact component state (CO-4) — no useState/useReducer', () => {
      expect(source).not.toMatch(/useState|useReducer/);
    });

    it('is render-free -- no react-native import, zero JSX (Timeline Adapter Rule §7)', () => {
      expect(source).not.toMatch(/from ['"]react-native['"]/);
    });

    it('presentation never touches a datasource from this file (AC-2) -- no axiosClient/datasource import', () => {
      expect(source).not.toMatch(/axiosClient/);
      expect(source).not.toMatch(/data\/datasources/);
    });
  });
});
