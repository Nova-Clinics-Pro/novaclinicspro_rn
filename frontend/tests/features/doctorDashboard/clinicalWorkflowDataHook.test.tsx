/**
 * T-FE-B.1 — Clinical Workflow data hook tests.
 *
 * Mirrors `clinicalWorkspaceDataHook.test.tsx`'s (T-FE-A.2) established
 * convention exactly: mock the datasource, drive `renderHook` under a
 * real `QueryClient`; a datasource-level suite proving the exact
 * request shape; an architecture check that presentation never imports
 * the datasource/axios directly.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getClinicalWorkflowApi } from '../../../features/episodes/data/datasources/clinicalWorkflow.api';
import {
  clinicalWorkflowKeys,
  useClinicalWorkflowQuery,
} from '../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl';
import { ClinicalWorkflowResolutionResponse } from '../../../features/episodes/data/models/clinicalWorkflow.dtos';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../features/episodes/data/datasources/clinicalWorkflow.api', () => ({
  getClinicalWorkflowApi: jest.fn(),
}));
jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

const mockGetClinicalWorkflowApi = getClinicalWorkflowApi as jest.Mock;

const resolution: ClinicalWorkflowResolutionResponse = {
  stages: [
    { code: 'consultation', state: 'completed', mandatory: true, waiting_permission: null, blocking_reason_code: null, detail_reason_code: null },
    { code: 'prescription', state: 'current', mandatory: true, waiting_permission: null, blocking_reason_code: null, detail_reason_code: null },
    { code: 'billing', state: 'waiting', mandatory: true, waiting_permission: 'billing.create', blocking_reason_code: null, detail_reason_code: null },
    { code: 'visit_completion', state: 'pending', mandatory: true, waiting_permission: null, blocking_reason_code: null, detail_reason_code: null },
  ],
  recommended_action: 'record_prescription',
  recommendation_reason: 'prescription_not_recorded',
  blocking_factors: [],
  waiting_role: 'billing.create',
  alternatives: [],
  completion_readiness: { ready: false, unresolved_stage_codes: ['billing', 'visit_completion'], reason_code: 'mandatory_stages_unresolved' },
  outstanding_work: ['prescription'],
  optional_work: [],
  unresolved_facts: [],
  capability_loss: [],
};

describe('clinicalWorkflowKeys (canonical query key)', () => {
  it('includes tenant, client, episode, and appointment identity dimensions', () => {
    const key = clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1');
    expect(key).toEqual(['clinicalWorkflow', 'tenant-1', 'client-1', 'episode-1', 'appointment-1']);
  });

  it('produces the same key for the same identifiers', () => {
    expect(clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).toEqual(
      clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
    );
  });

  it('produces a different key for a different client (patient) — no cross-patient cache sharing', () => {
    expect(clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkflowKeys.detail('tenant-1', 'client-2', 'episode-1', 'appointment-1'),
    );
  });

  it('produces a different key for a different episode — no cross-episode cache sharing', () => {
    expect(clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-2', 'appointment-1'),
    );
  });

  it('produces a different key for a different appointment (Visit) — no cross-visit cache sharing', () => {
    expect(clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-2'),
    );
  });

  it('produces a different key for a different tenant — no cross-tenant cache sharing', () => {
    expect(clinicalWorkflowKeys.detail('tenant-1', 'client-1', 'episode-1', 'appointment-1')).not.toEqual(
      clinicalWorkflowKeys.detail('tenant-2', 'client-1', 'episode-1', 'appointment-1'),
    );
  });
});

describe('useClinicalWorkflowQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClinicalWorkflowApi.mockResolvedValue(resolution);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('calls getClinicalWorkflowApi with the exact tenant/client/episode/appointment identifiers', async () => {
    const { result } = renderHook(
      () => useClinicalWorkflowQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetClinicalWorkflowApi).toHaveBeenCalledWith('tenant-1', 'client-1', 'episode-1', 'appointment-1');
  });

  it.each([
    ['tenantId', '', 'client-1', 'episode-1', 'appointment-1'],
    ['clientId', 'tenant-1', '', 'episode-1', 'appointment-1'],
    ['episodeId', 'tenant-1', 'client-1', '', 'appointment-1'],
    ['appointmentId', 'tenant-1', 'client-1', 'episode-1', ''],
  ])('is disabled (does not fetch) when %s is missing', (_label, tenantId, clientId, episodeId, appointmentId) => {
    const { result } = renderHook(
      () => useClinicalWorkflowQuery(tenantId, clientId, episodeId, appointmentId),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetClinicalWorkflowApi).not.toHaveBeenCalled();
  });

  it('is enabled and fetches once all four identifiers are present', async () => {
    const { result } = renderHook(
      () => useClinicalWorkflowQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetClinicalWorkflowApi).toHaveBeenCalledTimes(1);
  });

  it('preserves backend stage codes/states unmapped — no frontend derivation', async () => {
    const { result } = renderHook(
      () => useClinicalWorkflowQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.stages).toHaveLength(4);
    expect(result.current.data?.stages[1].state).toBe('current');
    expect(result.current.data?.completion_readiness.ready).toBe(false);
    expect(result.current.data?.recommended_action).toBe('record_prescription');
  });

  it('exposes a loading state before resolving', () => {
    let resolvePromise: (value: ClinicalWorkflowResolutionResponse) => void = () => {};
    mockGetClinicalWorkflowApi.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    const { result } = renderHook(
      () => useClinicalWorkflowQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
    resolvePromise(resolution);
  });

  it('exposes an error state when the datasource rejects, without retry (no forced remount workaround)', async () => {
    mockGetClinicalWorkflowApi.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(
      () => useClinicalWorkflowQuery('tenant-1', 'client-1', 'episode-1', 'appointment-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetClinicalWorkflowApi).toHaveBeenCalledTimes(1);
  });
});

describe('getClinicalWorkflowApi (datasource)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the exact endpoint URL with client_id/episode_id/appointment_id query params', async () => {
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: resolution });
    const { getClinicalWorkflowApi: realGetClinicalWorkflowApi } = jest.requireActual(
      '../../../features/episodes/data/datasources/clinicalWorkflow.api',
    );

    await realGetClinicalWorkflowApi('tenant-1', 'client-1', 'episode-1', 'appointment-1');

    expect(axiosClient.get).toHaveBeenCalledWith('/api/v1/clinic/tenant-1/clinical-workflow', {
      params: { client_id: 'client-1', episode_id: 'episode-1', appointment_id: 'appointment-1' },
    });
  });
});

describe('architecture — presentation never imports the datasource directly', () => {
  it('VisitCommandCenter.tsx and WorkflowPills.tsx do not import clinicalWorkflow.api or axiosClient', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    for (const relPath of [
      '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx',
      '../../../features/episodes/presentation/components/WorkflowPills.tsx',
    ]) {
      const source = fs.readFileSync(path.resolve(__dirname, relPath), 'utf8');
      expect(source).not.toMatch(/clinicalWorkflow\.api/);
      expect(source).not.toMatch(/axiosClient/);
    }
  });
});
