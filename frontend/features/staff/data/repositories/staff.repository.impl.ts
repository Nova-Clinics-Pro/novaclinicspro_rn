/**
 * Staff Repository Implementation
 * React Query hooks for staff management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listStaffApi,
  getStaffApi,
  createStaffApi,
  updateStaffApi,
  deleteStaffApi,
  listStaffLeaveApi,
  createStaffLeaveApi,
  approveLeaveApi,
  rejectLeaveApi,
  cancelLeaveApi,
  searchStaffApi,
  listAllStaffLeaveApi,
} from '../datasources/staff.api';
import {
  StaffCreate,
  StaffUpdate,
  StaffResponse,
  StaffLeaveCreate,
  StaffLeaveResponse,
  LeaveApproveRequest,
  LeaveRejectRequest,
  ListStaffParams,
  ListStaffLeaveParams,
  PaginatedStaffResponse,
  PaginatedLeaveResponse,
} from '../models/staff.dtos';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// ============================================
// QUERY KEYS
// ============================================

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListStaffParams) =>
    [...staffKeys.lists(), tenantId, params] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (tenantId: string, staffId: string) =>
    [...staffKeys.details(), tenantId, staffId] as const,
  search: (tenantId: string, query: string) =>
    [...staffKeys.all, 'search', tenantId, query] as const,
  // Leave keys
  leaves: () => [...staffKeys.all, 'leaves'] as const,
  leaveList: (tenantId: string, staffId: string, params?: ListStaffLeaveParams) =>
    [...staffKeys.leaves(), tenantId, staffId, params] as const,
};

// ============================================
// STAFF QUERY HOOKS
// ============================================

/**
 * Hook to list staff members for a tenant
 */
export const useStaffListQuery = (
  tenantId: string,
  params?: ListStaffParams,
  options?: Omit<UseQueryOptions<PaginatedStaffResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedStaffResponse, Error>({
    queryKey: staffKeys.list(tenantId, params),
    queryFn: () => listStaffApi(tenantId, params),
    enabled: !!tenantId,
    ...options,
  });
};

/**
 * Hook to get a single staff member
 */
export const useStaffDetailQuery = (
  tenantId: string,
  staffId: string,
  options?: Omit<UseQueryOptions<StaffResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<StaffResponse, Error>({
    queryKey: staffKeys.detail(tenantId, staffId),
    queryFn: () => getStaffApi(tenantId, staffId),
    enabled: !!tenantId && !!staffId,
    ...options,
  });
};

// ============================================
// STAFF MUTATION HOOKS
// ============================================

/**
 * Hook to create a staff member
 */
export const useCreateStaffMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<StaffResponse, Error, StaffCreate>({
    mutationFn: (payload) => createStaffApi(tenantId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to update a staff member
 */
export const useUpdateStaffMutation = (tenantId: string, staffId: string) => {
  const queryClient = useQueryClient();

  return useMutation<StaffResponse, Error, StaffUpdate>({
    mutationFn: (payload) => updateStaffApi(tenantId, staffId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(staffKeys.detail(tenantId, staffId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to delete a staff member
 */
export const useDeleteStaffMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (staffId) => deleteStaffApi(tenantId, staffId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

// ============================================
// LEAVE QUERY HOOKS
// ============================================

/**
 * Hook to list leave requests for a staff member
 */
export const useStaffLeaveListQuery = (
  tenantId: string,
  staffId: string,
  params?: ListStaffLeaveParams,
  options?: Omit<UseQueryOptions<PaginatedLeaveResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedLeaveResponse, Error>({
    queryKey: staffKeys.leaveList(tenantId, staffId, params),
    queryFn: () => listStaffLeaveApi(tenantId, staffId, params),
    enabled: !!tenantId && !!staffId,
    ...options,
  });
};

// ============================================
// LEAVE MUTATION HOOKS
// ============================================

/**
 * Hook to create a leave request
 */
export const useCreateLeaveMutation = (tenantId: string, staffId: string) => {
  const queryClient = useQueryClient();

  return useMutation<StaffLeaveResponse, Error, StaffLeaveCreate>({
    mutationFn: (payload) => createStaffLeaveApi(tenantId, staffId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
};

/**
 * Hook to approve a leave request
 */
/**
 * Hook to list all leave requests across all staff (admin view)
 * Uses the tenant-level endpoint — no staffId required
 */
export const useAllStaffLeaveListQuery = (
  tenantId: string,
  params?: ListStaffLeaveParams,
  options?: Omit<UseQueryOptions<PaginatedLeaveResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedLeaveResponse, Error>({
    queryKey: [...staffKeys.leaves(), tenantId, 'all', params] as const,
    queryFn: () => listAllStaffLeaveApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30_000,
    ...options,
  });
};

export const useApproveLeaveMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    StaffLeaveResponse,
    Error,
    { leaveId: string; payload?: LeaveApproveRequest }
  >({
    mutationFn: ({ leaveId, payload }) => approveLeaveApi(tenantId, leaveId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
};

/**
 * Hook to reject a leave request
 */
export const useRejectLeaveMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    StaffLeaveResponse,
    Error,
    { leaveId: string; payload: LeaveRejectRequest }
  >({
    mutationFn: ({ leaveId, payload }) => rejectLeaveApi(tenantId, leaveId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
};

/**
 * Hook to cancel a leave request
 */
export const useCancelLeaveMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<StaffLeaveResponse, Error, string>({
    mutationFn: (leaveId) => cancelLeaveApi(tenantId, leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
};

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Hook to search staff by phone, email, or name
 * Uses the dedicated search endpoint: GET /api/v1/clinic/{tenant_id}/staff/search
 * 
 * @param tenantId - Clinic tenant ID
 * @param query - Search query (min 3 characters to trigger API call)
 * @param limit - Optional limit for results
 */
export const useSearchStaffQuery = (
  tenantId: string,
  query: string,
  limit?: number,
  options?: Omit<UseQueryOptions<PaginatedStaffResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedStaffResponse, Error>({
    queryKey: staffKeys.search(tenantId, query),
    queryFn: () => searchStaffApi(tenantId, query, limit),
    // Only enable when tenantId exists and query has at least 3 characters
    enabled: !!tenantId && query.length >= 3,
    // Keep stale data while fetching new results
    staleTime: 30000, // 30 seconds
    ...options,
  });
};
