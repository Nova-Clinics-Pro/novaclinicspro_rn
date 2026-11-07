/**
 * Clinical Workflow Repository Implementation (T-FE-B.1)
 * React Query hook for the backend-owned Clinical Workflow semantic
 * contract (T-BE-B.2a).
 *
 * This is the ONLY governed frontend read path for the contract —
 * presentation must consume `useClinicalWorkflowQuery`, never the
 * datasource directly (AC-2). Mirrors `clinicalWorkspace.repository.
 * impl.ts` (T-FE-A.2) exactly: same four-dimension query key shape,
 * same required-identifier gating, same staleTime discipline.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getClinicalWorkflowApi } from '../datasources/clinicalWorkflow.api';
import { ClinicalWorkflowResolutionResponse } from '../models/clinicalWorkflow.dtos';

// ============================================
// QUERY KEYS
// ============================================

/**
 * Canonical query key family for the Clinical Workflow contract.
 *
 * `detail` carries all four identity dimensions the endpoint is scoped
 * by — tenant, client (patient), episode, and appointment (Visit) — so
 * two different Visit/patient/Episode contexts can never share a cache
 * entry (mirrors `clinicalWorkspaceKeys.detail`, T-FE-A.2).
 */
export const clinicalWorkflowKeys = {
  all: ['clinicalWorkflow'] as const,
  detail: (tenantId: string, clientId: string, episodeId: string, appointmentId: string) =>
    [...clinicalWorkflowKeys.all, tenantId, clientId, episodeId, appointmentId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch the Clinical Workflow semantic resolution for a Visit
 * context. Required identifiers gate execution — no partial/guessed
 * context is ever fetched.
 */
export const useClinicalWorkflowQuery = (
  tenantId: string,
  clientId: string,
  episodeId: string,
  appointmentId: string,
  options?: Omit<UseQueryOptions<ClinicalWorkflowResolutionResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ClinicalWorkflowResolutionResponse, Error>({
    queryKey: clinicalWorkflowKeys.detail(tenantId, clientId, episodeId, appointmentId),
    queryFn: () => getClinicalWorkflowApi(tenantId, clientId, episodeId, appointmentId),
    enabled: !!tenantId && !!clientId && !!episodeId && !!appointmentId,
    staleTime: 0,
    ...options,
  });
};
