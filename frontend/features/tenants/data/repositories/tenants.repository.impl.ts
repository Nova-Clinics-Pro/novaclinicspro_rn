/**
 * Tenants Repository Implementation
 * React Query hooks for tenant management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listTenantsApi,
  getTenantApi,
  getCurrentTenantApi,
  createTenantApi,
  updateTenantApi,
  updateCurrentTenantClinicProfileApi,
  getCurrentTenantClinicProfileApi,
  deactivateTenantApi,
} from '../datasources/tenants.api';
import {
  OrgTenantResponse,
  OrgTenantCreate,
  OrgTenantUpdate,
  TenantClinicProfileUpdate,
  TenantClinicProfile,
  ListTenantsParams,
} from '../models/tenants.dtos';

// Query Keys
export const tenantsKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantsKeys.all, 'list'] as const,
  list: (params?: ListTenantsParams) => [...tenantsKeys.lists(), params] as const,
  details: () => [...tenantsKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantsKeys.details(), id] as const,
};

/**
 * Hook to list tenants with optional filters
 */
export const useTenantsListQuery = (
  params?: ListTenantsParams,
  options?: Omit<UseQueryOptions<OrgTenantResponse[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<OrgTenantResponse[], Error>({
    queryKey: tenantsKeys.list(params),
    queryFn: () => listTenantsApi(params),
    ...options,
  });
};

/**
 * Hook to get a single tenant by ID
 */
export const useTenantQuery = (
  id: string,
  options?: Omit<UseQueryOptions<OrgTenantResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<OrgTenantResponse, Error>({
    queryKey: tenantsKeys.detail(id),
    queryFn: () => getTenantApi(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook to get the current (own) tenant's information -- tenant-scoped
 * self-service lookup, distinct from useTenantQuery's org-admin route.
 * Phase 4 · T-G.2 (clean-architecture boundary restoration).
 */
export const useCurrentTenantQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<OrgTenantResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<OrgTenantResponse, Error>({
    queryKey: ['current-tenant', tenantId],
    queryFn: () => getCurrentTenantApi(tenantId),
    enabled: !!tenantId,
    ...options,
  });
};

/** Update only the signed-in tenant's clinic profile and refresh derived onboarding state. */
export const useUpdateCurrentTenantClinicProfileMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TenantClinicProfile, Error, TenantClinicProfileUpdate>({
    mutationFn: (payload) => updateCurrentTenantClinicProfileApi(tenantId, payload),
    onSuccess: (tenant) => {
      queryClient.setQueryData(['tenant-clinic-profile', tenantId], tenant);
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'journey-visibility'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'ready-to-start'] });
    },
  });
};

export const useCurrentTenantClinicProfileQuery = (tenantId: string) => useQuery<TenantClinicProfile, Error>({
  queryKey: ['tenant-clinic-profile', tenantId],
  queryFn: () => getCurrentTenantClinicProfileApi(tenantId),
  enabled: Boolean(tenantId),
});

/**
 * Hook to create a new tenant
 */
export const useCreateTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, OrgTenantCreate>({
    mutationFn: createTenantApi,
    onSuccess: () => {
      // Invalidate tenant lists to refetch
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() });
    },
  });
};

/**
 * Hook to update a tenant
 */
export const useUpdateTenantMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, OrgTenantUpdate>({
    mutationFn: (payload) => updateTenantApi(id, payload),
    onSuccess: (data) => {
      // Update the specific tenant in cache
      queryClient.setQueryData(tenantsKeys.detail(id), data);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() });
    },
  });
};

/**
 * Hook to deactivate a tenant (soft delete)
 */
export const useDeactivateTenantMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, void>({
    mutationFn: () => deactivateTenantApi(id),
    onSuccess: (data) => {
      // Update the specific tenant in cache
      queryClient.setQueryData(tenantsKeys.detail(id), data);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists() });
    },
  });
};
