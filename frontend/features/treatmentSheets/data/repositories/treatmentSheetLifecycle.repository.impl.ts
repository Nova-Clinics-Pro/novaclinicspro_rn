/**
 * Treatment Sheet Lifecycle (Pause / Resume / Cancel) Repository Implementation
 *
 * R7 · T-0.7 (ED-ARCH-001): TreatmentSheetDetailScreen's own pause/resume/
 * cancel eligibility checks and pause/cancel actions previously called
 * `lifecycleApi.ts` (a datasource file) directly from three raw
 * `useQuery` calls and two raw `useMutation` calls defined inline in the
 * screen. Relocated the queryFn/mutationFn here — the query-key arrays are
 * preserved EXACTLY as the screen already used them
 * (`['can-pause-series', tenantId, treatmentSheetId]`, etc.), not migrated
 * to `treatmentSheetsKeys`, to guarantee zero cache-identity change. No
 * default `onSuccess` on the mutations — the screen's own `onSuccess`
 * (invalidation + Alert + dialog state + `refetch()`) is unchanged in
 * substance and passed through as `options` exactly as before.
 *
 * A separate file from `treatmentSheets.repository.impl.ts` (row/create/
 * archive/etc. hooks) — mirroring the existing `treatmentOrders.repository
 * .impl.ts` precedent of one repository file per distinct sub-concern
 * within the same feature, not a second repository for the same entity.
 * Co-locating this with the row hooks would make every consumer of THOSE
 * hooks transitively import `lifecycleApi.ts` → `axiosClient` →
 * `supabaseClient`, which crashes at module-load time in any test that
 * doesn't happen to mock that unrelated chain.
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  canPauseSeriesApi,
  canResumeSeriesApi,
  canCancelSeriesApi,
  pauseSeriesApi,
  cancelSeriesApi,
} from '../api/lifecycleApi';
import {
  PauseSeriesDTO,
  PauseSeriesResponse,
  CancelSeriesDTO,
  CancelSeriesResponse,
  RuleEvaluationResult,
} from '../models/lifecycle.dtos';

export const useCanPauseTreatmentSeriesQuery = (
  tenantId: string,
  treatmentSheetId: string,
  options?: Omit<UseQueryOptions<RuleEvaluationResult, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RuleEvaluationResult, Error>({
    queryKey: ['can-pause-series', tenantId, treatmentSheetId],
    queryFn: () => canPauseSeriesApi(tenantId, treatmentSheetId),
    enabled: !!tenantId && !!treatmentSheetId,
    ...options,
  });

export const useCanResumeTreatmentSeriesQuery = (
  tenantId: string,
  treatmentSheetId: string,
  options?: Omit<UseQueryOptions<RuleEvaluationResult, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RuleEvaluationResult, Error>({
    queryKey: ['can-resume-series', tenantId, treatmentSheetId],
    queryFn: () => canResumeSeriesApi(tenantId, treatmentSheetId),
    enabled: !!tenantId && !!treatmentSheetId,
    ...options,
  });

export const useCanCancelTreatmentSeriesQuery = (
  tenantId: string,
  treatmentSheetId: string,
  options?: Omit<UseQueryOptions<RuleEvaluationResult, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<RuleEvaluationResult, Error>({
    queryKey: ['can-cancel-series', tenantId, treatmentSheetId],
    queryFn: () => canCancelSeriesApi(tenantId, treatmentSheetId),
    enabled: !!tenantId && !!treatmentSheetId,
    ...options,
  });

export const usePauseTreatmentSeriesMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<PauseSeriesResponse, Error, PauseSeriesDTO>
) =>
  useMutation<PauseSeriesResponse, Error, PauseSeriesDTO>({
    mutationFn: (payload) => pauseSeriesApi(tenantId, treatmentSheetId, payload),
    ...options,
  });

export const useCancelTreatmentSeriesMutation = (
  tenantId: string,
  treatmentSheetId: string,
  options?: UseMutationOptions<CancelSeriesResponse, Error, CancelSeriesDTO>
) =>
  useMutation<CancelSeriesResponse, Error, CancelSeriesDTO>({
    mutationFn: (payload) => cancelSeriesApi(tenantId, treatmentSheetId, payload),
    ...options,
  });
