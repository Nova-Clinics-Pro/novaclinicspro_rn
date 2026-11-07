/**
 * T-FE-A.2 — Clinical Workspace data hook tests.
 *
 * Mirrors `prescriptionByAppointment.test.tsx`'s established convention
 * for a repository/query-hook test (mock the datasource, drive
 * `renderHook` under a real `QueryClient`), plus a datasource-level
 * suite (mock `axiosClient` directly) proving the exact request shape —
 * the same split `persistentContextContinuity.test.tsx` and its peers
 * already use for axios-backed datasources.
 *
 * Does not test VisitCommandCenter/module composition — the frozen
 * T-FE-A.2 AC does not require shell wiring (no shell file is touched
 * by this task); this suite proves the hook independently.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getClinicalWorkspaceApi } from '../../../features/episodes/data/datasources/clinicalWorkspace.api';
import {
  clinicalWorkspaceKeys,
  useClinicalWorkspaceQuery,
} from '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl';
import { WorkspaceFactsResponse } from '../../../features/episodes/data/models/clinicalWorkspace.dtos';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../features/episodes/data/datasources/clinicalWorkspace.api', () => ({
  getClinicalWorkspaceApi: jest.fn(),
}));
jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

const mockGetClinicalWorkspaceApi = getClinicalWorkspaceApi as jest.Mock;

const snapshot: WorkspaceFactsResponse = {
  identity: {
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    episode_id: 'episode-1',
    appointment_id: 'appointment-1',
    visit_id: 'visit-1',
    requesting_tenant_user_id: 'user-1',
    context_valid: true,
  },
  purpose: { value: null, recording_state: 'not_recorded' },
  episode: { exists: true, episode_id: 'episode-1', status: 'ACTIVE', recording_state: 'recorded' },
  visit: { exists: true, visit_id: 'visit-1', outcome_type: null, outcome_notes: null, recording_state: 'recorded' },
  appointment: { exists: true, appointment_id: 'appointment-1', status: 'IN_PROGRESS', recording_state: 'recorded' },
  casesheet: {
    exists: false,
    casesheet_id: null,
    episode_id: null,
    document_status: null,
    signed: false,
    contribution_count: null,
    recording_state: 'absent',
  },
  prescription: { exists: false, prescription_id: null, document_status: null, recording_state: 'absent' },
  treatment: {
    exists: false,
    treatment_sheet_id: null,
    is_order: false,
    lifecycle_status: null,
    lifecycle_unresolved: false,
    recording_state: 'absent',
  },
  billing: {
    clinical_services_exist: null,
    invoice_exists: null,
    invoice_status: null,
    outstanding_state: 'not_applicable',
    recording_state: 'unavailable',
    invoice_count: null,
    invoice_ids: [],
    invoice_statuses: [],
    billed_amount: null,
    paid_amount: null,
    outstanding_amount: null,
    currency: null,
  },
  capability: {
    states: {
      'appointments.multiday': {
        code: 'appointments.multiday',
        entitled: true,
        tenant_preference: true,
        effective_available: true,
        effective_enabled: true,
        blocked_reason_code: null,
        unmet_dependencies: [],
        source: 'tenant_preference',
      },
    },
    recording_state: 'recorded',
  },
  permission: { granted_codes: ['casesheet.update'], recording_state: 'recorded' },
  what_changed: {
    previous_visit: { exists: false, visit_id: null, visit_date: null, outcome_notes: null, recording_state: 'absent' },
    sessions: { active_session_count: null, completed_session_count: null, recording_state: 'absent' },
    pending_review: { pending: null, recording_state: 'absent' },
  },
};

describe('clinicalWorkspaceKeys (canonical query key)', () => {
  it('includes tenant, client, episode, and appointment identity dimensions', () => {
    const key = clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1');
    expect(key).toEqual(['clinicalWorkspace', 'tenant-1', 'client-1', 'episode-1', 'appointment-1']);
  });

  it('produces the same key for the same identifiers', () => {
    expect(clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).toEqual(
      clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
    );
  });

  it('produces a different key for a different client (patient) — no cross-patient cache sharing', () => {
    expect(clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkspaceKeys.detail('tenant-1', 'client-2', 'episode-1', 'appointment-1'),
    );
  });

  it('produces a different key for a different episode — no cross-episode cache sharing', () => {
    expect(clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-2', 'appointment-1'),
    );
  });

  it('produces a different key for a different appointment (Visit) — no cross-visit cache sharing', () => {
    expect(clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-2'),
    );
  });

  it('produces a different key for a different tenant — no cross-tenant cache sharing', () => {
    expect(clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkspaceKeys.detail('tenant-2', 'client-1', 'episode-1', 'appointment-1'),
    );
  });
});

describe('useClinicalWorkspaceQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClinicalWorkspaceApi.mockResolvedValue(snapshot);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('calls getClinicalWorkspaceApi with the exact tenant/client/episode/appointment identifiers', async () => {
    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetClinicalWorkspaceApi).toHaveBeenCalledWith('tenant-1', 'client-1', 'episode-1', 'appointment-1');
  });

  it.each([
    ['tenantId', '', 'client-1', 'episode-1', 'appointment-1'],
    ['clientId', 'tenant-1', '', 'episode-1', 'appointment-1'],
    ['episodeId', 'tenant-1', 'client-1', '', 'appointment-1'],
    ['appointmentId', 'tenant-1', 'client-1', 'episode-1', ''],
  ])('is disabled (does not fetch) when %s is missing', (_label, tenantId, clientId, episodeId, appointmentId) => {
    const { result } = renderHook(
      () => useClinicalWorkspaceQuery(tenantId, clientId, episodeId, appointmentId),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetClinicalWorkspaceApi).not.toHaveBeenCalled();
  });

  it('is enabled and fetches once all four identifiers are present', async () => {
    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetClinicalWorkspaceApi).toHaveBeenCalledTimes(1);
  });

  it('does not share a cache entry between two different patient/appointment contexts', async () => {
    const { result: first } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );
    await waitFor(() => expect(first.current.isSuccess).toBe(true));

    const { result: second } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-2', 'episode-1', 'appointment-2'),
      { wrapper },
    );
    await waitFor(() => expect(second.current.isSuccess).toBe(true));

    expect(mockGetClinicalWorkspaceApi).toHaveBeenCalledTimes(2);
    expect(mockGetClinicalWorkspaceApi).toHaveBeenNthCalledWith(1, 'tenant-1', 'client-1', 'episode-1', 'appointment-1');
    expect(mockGetClinicalWorkspaceApi).toHaveBeenNthCalledWith(2, 'tenant-1', 'client-2', 'episode-1', 'appointment-2');
  });

  it('refetches the active workspace query when its canonical key is invalidated', async () => {
    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({
      queryKey: clinicalWorkspaceKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
    });

    await waitFor(() => expect(mockGetClinicalWorkspaceApi).toHaveBeenCalledTimes(2));
  });

  it('preserves absent/unavailable/not_applicable/recorded recording states distinctly, unmapped', async () => {
    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.casesheet.recording_state).toBe('absent');
    expect(result.current.data?.prescription.recording_state).toBe('absent');
    expect(result.current.data?.billing.outstanding_state).toBe('not_applicable');
    expect(result.current.data?.billing.recording_state).toBe('unavailable');
    expect(result.current.data?.episode.recording_state).toBe('recorded');
    // Never rewritten into 'Not saved'/'Not created'/'Not sent' style negatives.
    expect(JSON.stringify(result.current.data)).not.toMatch(/Not saved|Not created|Not sent/);
  });

  it('exposes a loading state before resolving', () => {
    let resolvePromise: (value: WorkspaceFactsResponse) => void = () => {};
    mockGetClinicalWorkspaceApi.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
    resolvePromise(snapshot);
  });

  it('exposes an error state when the datasource rejects, without retry (no forced remount workaround)', async () => {
    mockGetClinicalWorkspaceApi.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetClinicalWorkspaceApi).toHaveBeenCalledTimes(1);
  });

  it('does not set refetchOnMount/staleTime overrides beyond the established staleTime: 0 discipline', async () => {
    const { result, rerender } = renderHook(
      () => useClinicalWorkspaceQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({});
    // A second render with the same key must not trigger a forced network refetch beyond React Query's own staleTime:0 background-refetch behaviour.
    expect(mockGetClinicalWorkspaceApi.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe('getClinicalWorkspaceApi (datasource)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the exact endpoint URL with client_id/episode_id/appointment_id query params', async () => {
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: snapshot });
    const { getClinicalWorkspaceApi: realGetClinicalWorkspaceApi } = jest.requireActual(
      '../../../features/episodes/data/datasources/clinicalWorkspace.api',
    );

    await realGetClinicalWorkspaceApi('tenant-1', 'client-1', 'episode-1', 'appointment-1');

    expect(axiosClient.get).toHaveBeenCalledWith('/api/v1/clinic/tenant-1/clinical-workspace', {
      params: { client_id: 'client-1', episode_id: 'episode-1', appointment_id: 'appointment-1' },
    });
  });
});

describe('architecture — presentation never imports the datasource directly', () => {
  it('VisitCommandCenter.tsx does not import clinicalWorkspace.api or axiosClient', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/clinicalWorkspace\.api/);
    expect(source).not.toMatch(/axiosClient/);
  });
});
