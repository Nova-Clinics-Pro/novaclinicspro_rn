/**
 * Consultation Completion Repository Implementation
 * React Query hook for the backend-owned consultation completion contract
 * (T-BE-F.3 / T-BE-F.3a / T-0.8).
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getConsultationCompletionApi } from '../datasources/consultationCompletion.api';
import { ConsultationCompletionResponse } from '../models/consultationCompletion.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const consultationCompletionKeys = {
  all: ['consultationCompletion'] as const,
  detail: (tenantId: string, episodeId: string, appointmentId: string) =>
    [...consultationCompletionKeys.all, tenantId, episodeId, appointmentId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to fetch the consultation completion contract for a Visit context.
 */
export const useConsultationCompletionQuery = (
  tenantId: string,
  clientId: string,
  episodeId: string,
  appointmentId: string,
  options?: Omit<UseQueryOptions<ConsultationCompletionResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ConsultationCompletionResponse, Error>({
    queryKey: consultationCompletionKeys.detail(tenantId, episodeId, appointmentId),
    queryFn: () => getConsultationCompletionApi(tenantId, clientId, episodeId, appointmentId),
    enabled: !!tenantId && !!clientId && !!episodeId && !!appointmentId,
    staleTime: 0,
    ...options,
  });
};
