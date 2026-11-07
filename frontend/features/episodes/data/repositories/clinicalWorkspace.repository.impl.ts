/**
 * Clinical Workspace Repository Implementation (T-FE-A.2)
 * React Query hook for the backend-owned Clinical Workspace facts
 * aggregate (T-BE-A.1 / T-BE-A.2).
 *
 * This is the ONLY governed frontend read path for the aggregate —
 * presentation must consume `useClinicalWorkspaceQuery`, never the
 * datasource directly (AC-2).
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getClinicalWorkspaceApi, getClinicalWorkspaceHistoryApi } from '../datasources/clinicalWorkspace.api';
import { WorkspaceFactsResponse, ClinicalHistoryResponse } from '../models/clinicalWorkspace.dtos';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Canonical query key family for the Clinical Workspace aggregate.
 *
 * `detail` carries all four identity dimensions the endpoint is scoped
 * by — tenant, client (patient), episode, and appointment (Visit) — so
 * two different Visit/patient/Episode contexts can never share a cache
 * entry. This is deliberately wider than consultationCompletionKeys.detail
 * (tenantId/episodeId/appointmentId only, no clientId) — that narrower
 * precedent predates this task's explicit identity-leakage requirement
 * and is not itself expanded here (out of this task's scope).
 */
export const clinicalWorkspaceKeys = {
  all: ['clinicalWorkspace'] as const,
  detail: (tenantId: string, clientId: string, episodeId: string, appointmentId: string) =>
    [...clinicalWorkspaceKeys.all, tenantId, clientId, episodeId, appointmentId] as const,
  /**
   * T-FE-C.5: the Clinical History projection is Episode-scoped, not
   * Visit-scoped -- no appointmentId dimension, unlike `detail` above.
   */
  history: (tenantId: string, clientId: string, episodeId: string) =>
    [...clinicalWorkspaceKeys.all, 'history', tenantId, clientId, episodeId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch the Clinical Workspace facts aggregate for a Visit
 * context. Required identifiers gate execution — no partial/guessed
 * context is ever fetched (never infers an Appointment, never falls
 * back to latest patient data, never crosses patient/Episode
 * boundaries).
 */
export const useClinicalWorkspaceQuery = (
  tenantId: string,
  clientId: string,
  episodeId: string,
  appointmentId: string,
  options?: Omit<UseQueryOptions<WorkspaceFactsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<WorkspaceFactsResponse, Error>({
    queryKey: clinicalWorkspaceKeys.detail(tenantId, clientId, episodeId, appointmentId),
    queryFn: () => getClinicalWorkspaceApi(tenantId, clientId, episodeId, appointmentId),
    enabled: !!tenantId && !!clientId && !!episodeId && !!appointmentId,
    staleTime: 0,
    ...options,
  });
};

/**
 * T-FE-C.5 (T-BE-A.3/A.3a, FR-HIST-1/2). Hook to fetch the backend-owned
 * Clinical History projection. Disabled unless every required context
 * dimension is present -- never infers a patient/Episode. The response
 * (classification, grouping, session counts, occurrence timestamps) is
 * returned exactly as the backend computed it; no frontend derivation.
 */
export const useClinicalHistoryQuery = (
  tenantId: string,
  clientId: string,
  episodeId: string,
  options?: Omit<UseQueryOptions<ClinicalHistoryResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ClinicalHistoryResponse, Error>({
    queryKey: clinicalWorkspaceKeys.history(tenantId, clientId, episodeId),
    queryFn: () => getClinicalWorkspaceHistoryApi(tenantId, clientId, episodeId),
    enabled: !!tenantId && !!clientId && !!episodeId,
    staleTime: 0,
    ...options,
  });
};
