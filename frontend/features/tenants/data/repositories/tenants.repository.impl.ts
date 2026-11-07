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
  uploadCurrentTenantClinicLogoApi,
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
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// Query Keys
export const tenantsKeys = {
  all: ['tenants'] as const,
  organization: (organizationId: string) => [...tenantsKeys.all, 'organization', organizationId] as const,
  lists: (organizationId: string) => [...tenantsKeys.organization(organizationId), 'list'] as const,
  list: (organizationId: string, params?: ListTenantsParams) =>
    [...tenantsKeys.lists(organizationId), params] as const,
  details: (organizationId: string) => [...tenantsKeys.organization(organizationId), 'detail'] as const,
  detail: (organizationId: string, id: string) => [...tenantsKeys.details(organizationId), id] as const,
};

/**
 * Hook to list tenants with optional filters
 */
export const useTenantsListQuery = (
  organizationId: string,
  params?: ListTenantsParams,
  options?: Omit<UseQueryOptions<OrgTenantResponse[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { enabled = true, ...queryOptions } = options ?? {};
  return useQuery<OrgTenantResponse[], Error>({
    queryKey: tenantsKeys.list(organizationId, params),
    queryFn: () => listTenantsApi(organizationId, params),
    enabled: Boolean(organizationId) && enabled,
    ...queryOptions,
  });
};

/**
 * Hook to get a single tenant by ID
 */
export const useTenantQuery = (
  organizationId: string,
  id: string,
  options?: Omit<UseQueryOptions<OrgTenantResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const { enabled = true, ...queryOptions } = options ?? {};
  return useQuery<OrgTenantResponse, Error>({
    queryKey: tenantsKeys.detail(organizationId, id),
    queryFn: () => getTenantApi(organizationId, id),
    enabled: Boolean(organizationId && id) && enabled,
    ...queryOptions,
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
    onSuccess: async (tenant) => {
      queryClient.setQueryData(['tenant-clinic-profile', tenantId], tenant);
      await invalidateCanonicalOnboardingState(queryClient, tenantId);
    },
  });
};

export const useCurrentTenantClinicProfileQuery = (tenantId: string) => useQuery<TenantClinicProfile, Error>({
  queryKey: ['tenant-clinic-profile', tenantId],
  queryFn: () => getCurrentTenantClinicProfileApi(tenantId),
  enabled: Boolean(tenantId),
});

export const useUploadCurrentTenantClinicLogoMutation = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation<{ clinic_logo?: string | null }, Error, string>({
    mutationFn: (clinicLogo) => uploadCurrentTenantClinicLogoApi(tenantId, clinicLogo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-clinic-profile', tenantId] });
      await invalidateCanonicalOnboardingState(queryClient, tenantId);
    },
  });
};

/**
 * Hook to create a new tenant
 */
export const useCreateTenantMutation = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, OrgTenantCreate>({
    mutationFn: (payload) => createTenantApi(organizationId, payload),
    onSuccess: () => {
      // Invalidate tenant lists to refetch
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists(organizationId) });
    },
  });
};

/**
 * Hook to update a tenant
 */
export const useUpdateTenantMutation = (organizationId: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, OrgTenantUpdate>({
    mutationFn: (payload) => updateTenantApi(organizationId, id, payload),
    onSuccess: (data) => {
      // Update the specific tenant in cache
      queryClient.setQueryData(tenantsKeys.detail(organizationId, id), data);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists(organizationId) });
    },
  });
};

/**
 * Hook to deactivate a tenant (soft delete)
 */
export const useDeactivateTenantMutation = (organizationId: string, id: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrgTenantResponse, Error, void>({
    mutationFn: () => deactivateTenantApi(organizationId, id),
    onSuccess: (data) => {
      // Update the specific tenant in cache
      queryClient.setQueryData(tenantsKeys.detail(organizationId, id), data);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: tenantsKeys.lists(organizationId) });
    },
  });
};
