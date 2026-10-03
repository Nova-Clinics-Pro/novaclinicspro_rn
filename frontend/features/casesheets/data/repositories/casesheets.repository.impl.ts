/**
 * Casesheets Repository Implementation
 * React Query hooks for clinical case sheets
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  listCasesheetsApi,
  getCasesheetApi,
  createCasesheetApi,
  updateCasesheetApi,
  transitionCasesheetStatusApi,
  printCasesheetApi,
  getCasesheetContributionsApi,
  archiveCasesheetApi,
  listCasesheetVersionsApi,
  getCasesheetVersionApi,
  printCasesheetVersionApi,
  amendCasesheetApi,
} from '../datasources/casesheets.api';
import {
  CasesheetCreateRequest,
  CasesheetUpdateRequest,
  CasesheetStatusTransitionRequest,
  CasesheetResponse,
  CasesheetListResponse,
  CasesheetPrintResponse,
  CasesheetContributionHistoryResponse,
  ListCasesheetsParams,
} from '../models/casesheets.dtos';
import { CasesheetSignedVersionSnapshot, LivingDocumentVersionListResponse } from '../../../livingDocuments/data/models/livingDocuments.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const casesheetsKeys = {
  all: ['casesheets'] as const,
  lists: () => [...casesheetsKeys.all, 'list'] as const,
  list: (tenantId: string, clientId: string, params?: ListCasesheetsParams) =>
    [...casesheetsKeys.lists(), tenantId, clientId, params] as const,
  details: () => [...casesheetsKeys.all, 'detail'] as const,
  detail: (tenantId: string, casesheetId: string) =>
    [...casesheetsKeys.details(), tenantId, casesheetId] as const,
  contributions: () => [...casesheetsKeys.all, 'contributions'] as const,
  /**
   * T-FE-E.1b: every context dimension the backend endpoint actually
   * requires (tenant/casesheet/client/Episode) is part of the key —
   * avoids cache leakage across Case Sheets/Episodes/clients.
   */
  contributionHistory: (tenantId: string, casesheetId: string, clientId: string, episodeId: string) =>
    [...casesheetsKeys.contributions(), tenantId, casesheetId, clientId, episodeId] as const,
  versions: (tenantId: string, casesheetId: string) => [...casesheetsKeys.detail(tenantId, casesheetId), 'versions'] as const,
  version: (tenantId: string, casesheetId: string, versionId: string) => [...casesheetsKeys.versions(tenantId, casesheetId), versionId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list casesheets for a client
 */
export const useCasesheetsListQuery = (
  tenantId: string,
  clientId: string,
  params?: ListCasesheetsParams,
  options?: Omit<UseQueryOptions<CasesheetListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CasesheetListResponse, Error>({
    queryKey: casesheetsKeys.list(tenantId, clientId, params),
    queryFn: () => listCasesheetsApi(tenantId, clientId, params),
    enabled: !!tenantId && !!clientId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to get a single casesheet
 */
export const useCasesheetDetailQuery = (
  tenantId: string,
  casesheetId: string,
  options?: Omit<UseQueryOptions<CasesheetResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CasesheetResponse, Error>({
    queryKey: casesheetsKeys.detail(tenantId, casesheetId),
    queryFn: () => getCasesheetApi(tenantId, casesheetId),
    enabled: !!tenantId && !!casesheetId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * T-FE-E.1b (T-BE-E.1a, Decision 12, FR-CS-5/6). Hook to fetch the
 * append-only contribution history for a Case Sheet. Disabled unless
 * every required context dimension is present -- never infers a
 * casesheet/client/Episode. Mirrors the backend response 1:1: no
 * frontend sorting, no author join, no reconstruction.
 */
export const useCasesheetContributionHistoryQuery = (
  tenantId: string,
  casesheetId: string,
  clientId: string,
  episodeId: string,
  options?: Omit<UseQueryOptions<CasesheetContributionHistoryResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CasesheetContributionHistoryResponse, Error>({
    queryKey: casesheetsKeys.contributionHistory(tenantId, casesheetId, clientId, episodeId),
    queryFn: () => getCasesheetContributionsApi(tenantId, casesheetId, clientId, episodeId),
    enabled: !!tenantId && !!casesheetId && !!clientId && !!episodeId,
    staleTime: 30 * 1000,
    ...options,
  });
};

export const useCasesheetVersionsQuery = (tenantId: string, casesheetId: string) =>
  useQuery<LivingDocumentVersionListResponse, Error>({
    queryKey: casesheetsKeys.versions(tenantId, casesheetId),
    queryFn: () => listCasesheetVersionsApi(tenantId, casesheetId),
    enabled: !!tenantId && !!casesheetId,
  });

export const useCasesheetVersionQuery = (tenantId: string, casesheetId: string, versionId: string | null) =>
  useQuery<CasesheetSignedVersionSnapshot, Error>({
    queryKey: casesheetsKeys.version(tenantId, casesheetId, versionId ?? ''),
    queryFn: () => getCasesheetVersionApi(tenantId, casesheetId, versionId!),
    enabled: !!tenantId && !!casesheetId && !!versionId,
  });

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new casesheet
 */
export const useCreateCasesheetMutation = (
  tenantId: string,
  clientId: string,
  options?: UseMutationOptions<CasesheetResponse, Error, CasesheetCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<CasesheetResponse, Error, CasesheetCreateRequest>({
    mutationFn: (payload) => createCasesheetApi(tenantId, clientId, payload),
    onSuccess: () => {
      // Invalidate list queries for this client
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.list(tenantId, clientId) });
    },
    ...options,
  });
};

/**
 * Hook to update a casesheet
 */
export const useUpdateCasesheetMutation = (
  tenantId: string,
  casesheetId: string,
  options?: UseMutationOptions<CasesheetResponse, Error, CasesheetUpdateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<CasesheetResponse, Error, CasesheetUpdateRequest>({
    mutationFn: (payload) => updateCasesheetApi(tenantId, casesheetId, payload),
    onSuccess: (data) => {
      // Update the detail cache
      queryClient.setQueryData(casesheetsKeys.detail(tenantId, casesheetId), data);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.lists() });
      // A G.2 successor is appended only by a successful SIGN.  Refetch the
      // backend-owned lineage; never promote/demote versions in the client.
      if (data.status === 'SIGNED') {
        queryClient.invalidateQueries({ queryKey: casesheetsKeys.versions(tenantId, casesheetId) });
      }
    },
    ...options,
  });
};

/**
 * Hook to transition casesheet status
 */
export const useTransitionCasesheetStatusMutation = (
  tenantId: string,
  casesheetId: string,
  options?: UseMutationOptions<CasesheetResponse, Error, CasesheetStatusTransitionRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<CasesheetResponse, Error, CasesheetStatusTransitionRequest>({
    mutationFn: (payload) => transitionCasesheetStatusApi(tenantId, casesheetId, payload),
    onSuccess: (data) => {
      // Update the detail cache
      queryClient.setQueryData(casesheetsKeys.detail(tenantId, casesheetId), data);
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.lists() });
      if (data.status === 'SIGNED') {
        queryClient.invalidateQueries({ queryKey: casesheetsKeys.versions(tenantId, casesheetId) });
      }
    },
    ...options,
  });
};

/**
 * Hook to print a casesheet
 */
export const usePrintCasesheetMutation = (
  tenantId: string,
  casesheetId: string,
  options?: UseMutationOptions<CasesheetPrintResponse, Error, void>
) => {
  return useMutation<CasesheetPrintResponse, Error, void>({
    mutationFn: () => printCasesheetApi(tenantId, casesheetId),
    ...options,
  });
};

export const usePrintCasesheetVersionMutation = (tenantId: string, casesheetId: string) =>
  useMutation<string, Error, string>({ mutationFn: (versionId) => printCasesheetVersionApi(tenantId, casesheetId, versionId) });

export const useAmendCasesheetMutation = (tenantId: string, casesheetId: string) => {
  const queryClient = useQueryClient();
  return useMutation<CasesheetResponse, Error, void>({
    mutationFn: () => amendCasesheetApi(tenantId, casesheetId),
    onSuccess: (data) => {
      queryClient.setQueryData(casesheetsKeys.detail(tenantId, casesheetId), data);
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.versions(tenantId, casesheetId) });
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.lists() });
    },
  });
};

/**
 * Hook to archive a casesheet
 */
export const useArchiveCasesheetMutation = (
  tenantId: string,
  casesheetId: string,
  clientId: string,
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => archiveCasesheetApi(tenantId, casesheetId),
    onSuccess: () => {
      // Invalidate detail query
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.detail(tenantId, casesheetId) });
      // Invalidate list queries for this client
      queryClient.invalidateQueries({ queryKey: casesheetsKeys.list(tenantId, clientId) });
    },
    ...options,
  });
};
