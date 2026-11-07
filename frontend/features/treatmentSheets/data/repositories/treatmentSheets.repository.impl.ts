/**
 * Treatment Sheets Repository Implementation
 * React Query hooks for treatment sheets
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  createTreatmentSheetApi,
  createSimpleTreatmentSheetApi,
  getTreatmentSheetApi,
  getTreatmentSheetsByEpisodeApi,
  transitionTreatmentSheetStatusApi,
  syncTreatmentSheetApi,
  printTreatmentSheetApi,
  archiveTreatmentSheetApi,
  updateTreatmentSheetRowApi,
  updateAllTreatmentSheetRowsApi,
  completeTreatmentSheetRowApi,
} from '../datasources/treatmentSheets.api';
import {
  TreatmentSheetCreateRequest,
  TreatmentSheetSimpleCreateRequest,
  TreatmentSheetRowUpdateRequest,
  TreatmentSheetRowCompleteRequest,
  TreatmentSheetStatusTransitionRequest,
  TreatmentSheetResponse,
  TreatmentSheetSyncResponse,
  TreatmentSheetPrintResponse,
} from '../models/treatmentSheets.dtos';
import { SessionInstructionsError } from '../../domain/errors/sessionInstructionsError';
import { TreatmentOperationError } from '../../domain/errors/treatmentOperationError';

export { SessionInstructionsError } from '../../domain/errors/sessionInstructionsError';

// ============================================
// QUERY KEYS
// ============================================

export const treatmentSheetsKeys = {
  all: ['treatmentSheets'] as const,
  details: () => [...treatmentSheetsKeys.all, 'detail'] as const,
  detail: (treatmentSheetId: string) =>
    [...treatmentSheetsKeys.details(), treatmentSheetId] as const,
  byEpisode: (episodeId: string) =>
    [...treatmentSheetsKeys.all, 'episode', episodeId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get a treatment sheet by ID
 */
export const useTreatmentSheetDetailQuery = (
  treatmentSheetId: string,
  tenantId: string,
  options?: Omit<UseQueryOptions<TreatmentSheetResponse, TreatmentOperationError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TreatmentSheetResponse, TreatmentOperationError>({
    queryKey: treatmentSheetsKeys.detail(treatmentSheetId),
    queryFn: () => getTreatmentSheetApi(treatmentSheetId, tenantId),
    enabled: !!treatmentSheetId && !!tenantId,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook to get treatment sheets by episode ID
 */
export const useTreatmentSheetsByEpisodeQuery = (
  tenantId: string,
  episodeId: string,
  options?: Omit<UseQueryOptions<{ treatment_sheets: TreatmentSheetResponse[]; total: number }, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<{ treatment_sheets: TreatmentSheetResponse[]; total: number }, Error>({
    queryKey: treatmentSheetsKeys.byEpisode(episodeId),
    queryFn: () => getTreatmentSheetsByEpisodeApi(tenantId, episodeId),
    enabled: !!tenantId && !!episodeId,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a treatment sheet from a casesheet
 */
export const useCreateTreatmentSheetMutation = (
  casesheetId: string,
  options?: UseMutationOptions<TreatmentSheetResponse, Error, TreatmentSheetCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentSheetResponse, Error, TreatmentSheetCreateRequest>({
    mutationFn: (payload) => createTreatmentSheetApi(casesheetId, payload),
    onSuccess: () => {
      // Invalidate all treatment sheet queries
      queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.all });
    },
    ...options,
  });
};

/**
 * Hook to create a treatment sheet (simplified, without casesheet)
 */
export const useCreateSimpleTreatmentSheetMutation = (
  tenantId: string,
  options?: UseMutationOptions<TreatmentSheetResponse, Error, TreatmentSheetSimpleCreateRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentSheetResponse, Error, TreatmentSheetSimpleCreateRequest>({
    mutationFn: (payload) => createSimpleTreatmentSheetApi(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.all });
    },
    ...options,
  });
};

/**
 * Hook to transition treatment sheet status
 */
export const useTransitionTreatmentSheetStatusMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<TreatmentSheetResponse, Error, TreatmentSheetStatusTransitionRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentSheetResponse, Error, TreatmentSheetStatusTransitionRequest>({
    mutationFn: (payload) => transitionTreatmentSheetStatusApi(tenantId, treatmentSheetId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentSheetsKeys.detail(treatmentSheetId), data);
    },
    ...options,
  });
};

/**
 * Hook to sync treatment sheet with sessions
 */
export const useSyncTreatmentSheetMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<TreatmentSheetSyncResponse, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentSheetSyncResponse, Error, string>({
    mutationFn: (seriesId: string) => syncTreatmentSheetApi(tenantId, treatmentSheetId, seriesId),
    onSuccess: () => {
      // Refetch the treatment sheet to get updated rows
      queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.detail(treatmentSheetId) });
    },
    ...options,
  });
};

/**
 * Hook to print a treatment sheet
 */
export const usePrintTreatmentSheetMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<TreatmentSheetPrintResponse, Error, void>
) => {
  return useMutation<TreatmentSheetPrintResponse, Error, void>({
    mutationFn: () => printTreatmentSheetApi(tenantId, treatmentSheetId),
    ...options,
  });
};

/**
 * Hook to archive a treatment sheet
 */
export const useArchiveTreatmentSheetMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<void, Error, void>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => archiveTreatmentSheetApi(tenantId, treatmentSheetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.detail(treatmentSheetId) });
      queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.all });
    },
    ...options,
  });
};

/**
 * Hook to update a treatment sheet row.
 *
 * R7 · T-0.7 (ED-ARCH-001): re-shaped from its original
 * `(tenantId, rowId, treatmentSheetId, options?)` signature — previously
 * exported but never actually consumed anywhere in the codebase (verified:
 * zero call sites) — to accept `rowId` as a mutate-time variable instead of
 * a hook-instantiation param, so `useTreatmentSheetRows` (which updates
 * whichever row a doctor is currently editing, chosen at call time from a
 * list) can reuse ONE hook instance rather than needing one hook call per
 * row (Rules of Hooks). Removed the pre-existing default `onSuccess`
 * (never exercised by any real caller) — the actual consumer already
 * refetches the whole sheet itself after a successful save; adding a
 * second, independent cache write here would be a new, unrequested side
 * effect not present before this task.
 *
 * T-FE-E.2 (FR-TS-3, FR-SCH-2): `updateTreatmentSheetRowApi` no longer
 * takes `tenantId` (its URL never carried tenant scoping — see that
 * function's own docstring for the route-mismatch defect this closes);
 * `tenantId` stays a parameter here unchanged so the one existing caller
 * (`useTreatmentSheetRows.ts`) needs no signature change, it is simply no
 * longer threaded into the datasource call. `expectedVersion` is new and
 * optional -- an existing caller that omits it gets the exact prior
 * behavior (no `If-Match` sent).
 */
export const useUpdateTreatmentSheetRowMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<
    TreatmentSheetResponse,
    SessionInstructionsError,
    { rowId: string; payload: TreatmentSheetRowUpdateRequest; expectedVersion?: number }
  >
) => {
  return useMutation<
    TreatmentSheetResponse,
    SessionInstructionsError,
    { rowId: string; payload: TreatmentSheetRowUpdateRequest; expectedVersion?: number }
  >({
    mutationFn: ({ rowId, payload, expectedVersion }) => updateTreatmentSheetRowApi(rowId, payload, expectedVersion),
    ...options,
  });
};

/**
 * Hook to bulk-update every row of a treatment sheet in one call.
 *
 * R7 · T-0.7 (ED-ARCH-001): new — no hook wrapped
 * `updateAllTreatmentSheetRowsApi` before this task (its sole caller,
 * `useTreatmentSheetRows`, called the datasource function directly). No
 * default `onSuccess`, same reasoning as
 * `useUpdateTreatmentSheetRowMutation` above.
 */
export const useUpdateAllTreatmentSheetRowsMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<TreatmentSheetResponse, SessionInstructionsError, Array<{ id: string } & TreatmentSheetRowUpdateRequest>>
) => {
  return useMutation<TreatmentSheetResponse, SessionInstructionsError, Array<{ id: string } & TreatmentSheetRowUpdateRequest>>({
    mutationFn: (rows) => updateAllTreatmentSheetRowsApi(tenantId, treatmentSheetId, rows),
    ...options,
  });
};

// Lifecycle (pause/resume/cancel) hooks live in
// `treatmentSheetLifecycle.repository.impl.ts` — a separate file, not this
// one (R7 · T-0.7 finding: co-locating them here made every consumer of
// THIS file's row/create/archive hooks transitively import
// `lifecycleApi.ts` → `axiosClient` → `supabaseClient`, breaking tests that
// mock only the row-level datasource. Split, mirroring the existing
// `treatmentOrders.repository.impl.ts` precedent of a separate file per
// distinct sub-concern within the same feature, not a second repository
// for the same entity).

/**
 * Hook to complete a treatment sheet row
 */
export const useCompleteTreatmentSheetRowMutation = (
  rowId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<TreatmentSheetResponse, Error, TreatmentSheetRowCompleteRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentSheetResponse, Error, TreatmentSheetRowCompleteRequest>({
    mutationFn: (payload) => completeTreatmentSheetRowApi(rowId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentSheetsKeys.detail(treatmentSheetId), data);
    },
    ...options,
  });
};
