/**
 * Operating Hours Repository Implementation
 * React Query hooks for operating hours management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listOperatingHoursApi,
  getOperatingHourApi,
  createOperatingHourApi,
  updateOperatingHourApi,
  deleteOperatingHourApi,
} from '../datasources/operatingHours.api';
import {
  OperatingHourCreate,
  OperatingHourUpdate,
  OperatingHourResponse,
  ListOperatingHoursParams,
  PaginatedOperatingHoursResponse,
} from '../models/operatingHours.dtos';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// ============================================
// QUERY KEYS
// ============================================

export const operatingHoursKeys = {
  all: ['operatingHours'] as const,
  lists: () => [...operatingHoursKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListOperatingHoursParams) =>
    [...operatingHoursKeys.lists(), tenantId, params] as const,
  details: () => [...operatingHoursKeys.all, 'detail'] as const,
  detail: (tenantId: string, id: string) =>
    [...operatingHoursKeys.details(), tenantId, id] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list operating hours for a tenant
 */
export const useOperatingHoursListQuery = (
  tenantId: string,
  params?: ListOperatingHoursParams,
  options?: Omit<UseQueryOptions<PaginatedOperatingHoursResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedOperatingHoursResponse, Error>({
    queryKey: operatingHoursKeys.list(tenantId, params),
    queryFn: () => listOperatingHoursApi(tenantId, params),
    enabled: !!tenantId,
    ...options,
  });
};

/**
 * Hook to get a single operating hour entry
 */
export const useOperatingHourDetailQuery = (
  tenantId: string,
  operatingHourId: string,
  options?: Omit<UseQueryOptions<OperatingHourResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<OperatingHourResponse, Error>({
    queryKey: operatingHoursKeys.detail(tenantId, operatingHourId),
    queryFn: () => getOperatingHourApi(tenantId, operatingHourId),
    enabled: !!tenantId && !!operatingHourId,
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create operating hours
 */
export const useCreateOperatingHourMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<OperatingHourResponse, Error, OperatingHourCreate>({
    mutationFn: (payload) => createOperatingHourApi(tenantId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: operatingHoursKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to update operating hours
 */
export const useUpdateOperatingHourMutation = (tenantId: string, operatingHourId: string) => {
  const queryClient = useQueryClient();

  return useMutation<OperatingHourResponse, Error, OperatingHourUpdate>({
    mutationFn: (payload) => updateOperatingHourApi(tenantId, operatingHourId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        operatingHoursKeys.detail(tenantId, operatingHourId),
        data
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: operatingHoursKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to delete operating hours
 */
export const useDeleteOperatingHourMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (operatingHourId) => deleteOperatingHourApi(tenantId, operatingHourId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: operatingHoursKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};
