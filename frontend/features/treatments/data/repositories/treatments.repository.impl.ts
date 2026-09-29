/**
 * Treatments Repository Implementation
 * React Query hooks for treatment management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listTreatmentsApi,
  getTreatmentApi,
  createTreatmentApi,
  updateTreatmentApi,
  deleteTreatmentApi,
  searchTreatmentsApi,
} from '../datasources/treatments.api';
import {
  TreatmentCreate,
  TreatmentUpdate,
  TreatmentResponse,
  ListTreatmentsParams,
  PaginatedTreatmentsResponse,
} from '../models/treatments.dtos';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// ============================================
// QUERY KEYS
// ============================================

export const treatmentsKeys = {
  all: ['treatments'] as const,
  lists: () => [...treatmentsKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListTreatmentsParams) =>
    [...treatmentsKeys.lists(), tenantId, params] as const,
  details: () => [...treatmentsKeys.all, 'detail'] as const,
  detail: (tenantId: string, treatmentId: string) =>
    [...treatmentsKeys.details(), tenantId, treatmentId] as const,
  search: (tenantId: string, query: string) =>
    [...treatmentsKeys.all, 'search', tenantId, query] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list treatments for a tenant
 */
export const useTreatmentsListQuery = (
  tenantId: string,
  params?: ListTreatmentsParams,
  options?: Omit<UseQueryOptions<PaginatedTreatmentsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedTreatmentsResponse, Error>({
    queryKey: treatmentsKeys.list(tenantId, params),
    queryFn: () => listTreatmentsApi(tenantId, params),
    enabled: !!tenantId,
    ...options,
  });
};

/**
 * Hook to get a single treatment
 */
export const useTreatmentDetailQuery = (
  tenantId: string,
  treatmentId: string,
  options?: Omit<UseQueryOptions<TreatmentResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TreatmentResponse, Error>({
    queryKey: treatmentsKeys.detail(tenantId, treatmentId),
    queryFn: () => getTreatmentApi(tenantId, treatmentId),
    enabled: !!tenantId && !!treatmentId,
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a treatment
 */
export const useCreateTreatmentMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentResponse, Error, TreatmentCreate>({
    mutationFn: (payload) => createTreatmentApi(tenantId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treatmentsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to update a treatment
 */
export const useUpdateTreatmentMutation = (tenantId: string, treatmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentResponse, Error, TreatmentUpdate>({
    mutationFn: (payload) => updateTreatmentApi(tenantId, treatmentId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(treatmentsKeys.detail(tenantId, treatmentId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treatmentsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to delete a treatment
 */
export const useDeleteTreatmentMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (treatmentId) => deleteTreatmentApi(tenantId, treatmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treatmentsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Hook to search treatments by name
 * Uses the dedicated search endpoint: GET /api/v1/clinic/{tenant_id}/treatments/search
 * 
 * @param tenantId - Clinic tenant ID
 * @param query - Search query (min 3 characters to trigger API call)
 * @param limit - Optional limit for results
 */
export const useSearchTreatmentsQuery = (
  tenantId: string,
  query: string,
  limit?: number,
  options?: Omit<UseQueryOptions<PaginatedTreatmentsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedTreatmentsResponse, Error>({
    queryKey: treatmentsKeys.search(tenantId, query),
    queryFn: () => searchTreatmentsApi(tenantId, query, limit),
    // Only enable when tenantId exists and query has at least 3 characters
    enabled: !!tenantId && query.length >= 3,
    // Keep stale data while fetching new results
    staleTime: 30000, // 30 seconds
    ...options,
  });
};
