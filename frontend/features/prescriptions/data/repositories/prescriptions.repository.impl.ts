/**
 * Prescriptions Repository Implementation
 * React Query hooks for prescriptions
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  listPrescriptionsApi,
  getPrescriptionApi,
  createPrescriptionApi,
  updatePrescriptionApi,
  deletePrescriptionApi,
  sharePrescriptionApi,
  getPrescriptionPrintApi,
  listPrescriptionVersionsApi,
  getPrescriptionVersionApi,
  printPrescriptionVersionApi,
  amendPrescriptionApi,
} from '../datasources/prescriptions.api';
import {
  PrescriptionCreateRequest,
  PrescriptionUpdateRequest,
  PrescriptionShareRequest,
  PrescriptionResponse,
  PrescriptionListResponse,
  PrescriptionShareResponse,
  PrescriptionPrintResponse,
  ListPrescriptionsParams,
} from '../models/prescriptions.dtos';
import { LivingDocumentVersionListResponse, PrescriptionSignedVersionSnapshot } from '../../../livingDocuments/data/models/livingDocuments.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const prescriptionsKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionsKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListPrescriptionsParams) =>
    [...prescriptionsKeys.lists(), tenantId, params] as const,
  details: () => [...prescriptionsKeys.all, 'detail'] as const,
  detail: (tenantId: string, prescriptionId: string) =>
    [...prescriptionsKeys.details(), tenantId, prescriptionId] as const,
  /**
   * Phase 1 · T-A.1 (ADR-P1-01): deterministic key for "the prescription for
   * this consultation" (episode+appointment scoped), matching design §5's
   * addressing requirement for this read. Before this task, the consultation
   * workspace resolved this via an ad-hoc `axiosClient.get` call with no
   * corresponding query key at all — this key/hook establish the addressing
   * scheme. Wiring the workspace's read/save to actually use it is a later,
   * flag-gated task (T-A.2/T-A.5), not this one.
   */
  byAppointment: (tenantId: string, episodeId: string, appointmentId: string) =>
    [...prescriptionsKeys.all, 'byAppointment', tenantId, episodeId, appointmentId] as const,
  versions: (tenantId: string, prescriptionId: string) => [...prescriptionsKeys.detail(tenantId, prescriptionId), 'versions'] as const,
  version: (tenantId: string, prescriptionId: string, versionId: string) => [...prescriptionsKeys.versions(tenantId, prescriptionId), versionId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list prescriptions (tenant-scoped, can filter by client)
 */
export const usePrescriptionsListQuery = (
  tenantId: string,
  params?: ListPrescriptionsParams,
  options?: Omit<UseQueryOptions<PrescriptionListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PrescriptionListResponse, Error>({
    queryKey: prescriptionsKeys.list(tenantId, params),
    queryFn: () => listPrescriptionsApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Phase 1 · T-A.1 — Hook to look up the prescription for one consultation
 * (episode+appointment), matching the exact request the consultation
 * workspace currently issues manually (`appointment_id` + `episode_id`
 * filter on the same list endpoint). Not yet consumed by the workspace —
 * establishing the addressing scheme is this task's scope; wiring it in is
 * a later task.
 */
export const usePrescriptionByAppointmentQuery = (
  tenantId: string,
  episodeId: string,
  appointmentId: string,
  options?: Omit<UseQueryOptions<PrescriptionListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PrescriptionListResponse, Error>({
    queryKey: prescriptionsKeys.byAppointment(tenantId, episodeId, appointmentId),
    queryFn: () => listPrescriptionsApi(tenantId, { appointment_id: appointmentId, episode_id: episodeId }),
    enabled: !!tenantId && !!episodeId && !!appointmentId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to get a single prescription
 */
export const usePrescriptionDetailQuery = (
  tenantId: string,
  prescriptionId: string,
  options?: Omit<UseQueryOptions<PrescriptionResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PrescriptionResponse, Error>({
    queryKey: prescriptionsKeys.detail(tenantId, prescriptionId),
    queryFn: () => getPrescriptionApi(tenantId, prescriptionId),
    enabled: !!tenantId && !!prescriptionId,
    staleTime: 30 * 1000,
    ...options,
  });
};

export const usePrescriptionVersionsQuery = (tenantId: string, prescriptionId: string) =>
  useQuery<LivingDocumentVersionListResponse, Error>({
    queryKey: prescriptionsKeys.versions(tenantId, prescriptionId),
    queryFn: () => listPrescriptionVersionsApi(tenantId, prescriptionId),
    enabled: !!tenantId && !!prescriptionId,
  });

export const usePrescriptionVersionQuery = (tenantId: string, prescriptionId: string, versionId: string | null) =>
  useQuery<PrescriptionSignedVersionSnapshot, Error>({
    queryKey: prescriptionsKeys.version(tenantId, prescriptionId, versionId ?? ''),
    queryFn: () => getPrescriptionVersionApi(tenantId, prescriptionId, versionId!),
    enabled: !!tenantId && !!prescriptionId && !!versionId,
  });

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new prescription
 */
export const useCreatePrescriptionMutation = (
  tenantId: string,
  options?: UseMutationOptions<PrescriptionResponse, Error, PrescriptionCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<PrescriptionResponse, Error, PrescriptionCreateRequest>({
    mutationFn: (payload) => createPrescriptionApi(tenantId, payload),
    onSuccess: () => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook to update a prescription
 */
export const useUpdatePrescriptionMutation = (
  tenantId: string,
  prescriptionId: string,
  options?: UseMutationOptions<PrescriptionResponse, Error, PrescriptionUpdateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<PrescriptionResponse, Error, PrescriptionUpdateRequest>({
    mutationFn: (payload) => updatePrescriptionApi(tenantId, prescriptionId, payload),
    onSuccess: (data) => {
      // Update the detail cache
      queryClient.setQueryData(prescriptionsKeys.detail(tenantId, prescriptionId), data);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
      // Successful amendment signing appends the successor server-side.
      // Query invalidation preserves backend authority over lineage truth.
      if (data.status === 'SIGNED') {
        queryClient.invalidateQueries({ queryKey: prescriptionsKeys.versions(tenantId, prescriptionId) });
      }
    },
    ...options,
  });
};

/**
 * Hook to delete a prescription
 */
export const useDeletePrescriptionMutation = (
  tenantId: string,
  prescriptionId: string,
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => deletePrescriptionApi(tenantId, prescriptionId),
    onSuccess: () => {
      // Invalidate detail query
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.detail(tenantId, prescriptionId) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook to share a signed prescription
 */
export const useSharePrescriptionMutation = (
  tenantId: string,
  prescriptionId: string,
  options?: UseMutationOptions<PrescriptionShareResponse, Error, PrescriptionShareRequest>
) => {
  return useMutation<PrescriptionShareResponse, Error, PrescriptionShareRequest>({
    mutationFn: (payload) => sharePrescriptionApi(tenantId, prescriptionId, payload),
    ...options,
  });
};

export const usePrescriptionPrintMutation = (
  tenantId: string,
  prescriptionId: string,
  options?: UseMutationOptions<PrescriptionPrintResponse, Error, void>
) => {
  return useMutation<PrescriptionPrintResponse, Error, void>({
    mutationFn: () => getPrescriptionPrintApi(tenantId, prescriptionId),
    ...options,
  });
};

export const usePrescriptionVersionPrintMutation = (tenantId: string, prescriptionId: string) =>
  useMutation<string, Error, string>({ mutationFn: (versionId) => printPrescriptionVersionApi(tenantId, prescriptionId, versionId) });

export const useAmendPrescriptionMutation = (tenantId: string, prescriptionId: string) => {
  const queryClient = useQueryClient();
  return useMutation<PrescriptionResponse, Error, void>({
    mutationFn: () => amendPrescriptionApi(tenantId, prescriptionId),
    onSuccess: (data) => {
      queryClient.setQueryData(prescriptionsKeys.detail(tenantId, prescriptionId), data);
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.versions(tenantId, prescriptionId) });
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
    },
  });
};
