/**
 * Staff Dashboards Repository Implementation
 * React Query hooks for role-specific dashboards
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  getDoctorDashboardApi,
  getTherapistDashboardApi,
  getFrontdeskDashboardApi,
} from '../datasources/staffDashboards.api';
import {
  DoctorDashboardResponse,
  TherapistDashboardResponse,
  FrontdeskDashboardResponse,
} from '../models/staffDashboards.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const staffDashboardsKeys = {
  all: ['staffDashboards'] as const,
  doctor: (tenantId: string) => [...staffDashboardsKeys.all, 'doctor', tenantId] as const,
  therapist: (tenantId: string) => [...staffDashboardsKeys.all, 'therapist', tenantId] as const,
  frontdesk: (tenantId: string, params?: { doctor_id?: string; room_id?: string; status?: string }) =>
    [...staffDashboardsKeys.all, 'frontdesk', tenantId, params] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get doctor dashboard data
 */
export const useDoctorDashboardQuery = (
  tenantId: string,
  params?: {
    date?: string;
  },
  options?: Omit<UseQueryOptions<DoctorDashboardResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  // Ensure params is always an object for consistent query key
  const normalizedParams = params || {};
  
  console.log('[useDoctorDashboardQuery] Query params:', {
    tenantId,
    params: normalizedParams,
    queryKey: [...staffDashboardsKeys.doctor(tenantId), normalizedParams],
  });
  
  return useQuery<DoctorDashboardResponse, Error>({
    queryKey: [...staffDashboardsKeys.doctor(tenantId), normalizedParams],
    queryFn: () => {
      console.log('[useDoctorDashboardQuery] Executing query with params:', normalizedParams);
      return getDoctorDashboardApi(tenantId, normalizedParams);
    },
    enabled: !!tenantId,
    staleTime: 0, // Always refetch when query key changes
    ...options,
  });
};

/**
 * Hook to get therapist dashboard data
 */
export const useTherapistDashboardQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<TherapistDashboardResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TherapistDashboardResponse, Error>({
    queryKey: staffDashboardsKeys.therapist(tenantId),
    queryFn: () => getTherapistDashboardApi(tenantId),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
};

/**
 * Hook to get frontdesk dashboard data
 */
export const useFrontdeskDashboardQuery = (
  tenantId: string,
  params?: { doctor_id?: string; room_id?: string; status?: string },
  options?: Omit<UseQueryOptions<FrontdeskDashboardResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<FrontdeskDashboardResponse, Error>({
    queryKey: staffDashboardsKeys.frontdesk(tenantId, params),
    queryFn: () => getFrontdeskDashboardApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    ...options,
  });
};

// ============================================
// ADMIN DASHBOARD - MULTI-DAY TREATMENTS (F2.5)
// ============================================

import {
  getTreatmentStatsApi,
  getTodaySessionStatsApi,
  getPausedSeriesApi,
} from '../datasources/staffDashboards.api';
import {
  TreatmentStatsResponse,
  TodaySessionStatsResponse,
  PausedSeriesItem,
} from '../models/staffDashboards.dtos';

// Query keys for admin dashboard
export const adminDashboardKeys = {
  all: ['adminDashboard'] as const,
  treatmentStats: (tenantId: string) => [...adminDashboardKeys.all, 'treatmentStats', tenantId] as const,
  todaySessionStats: (tenantId: string, date?: string) => [...adminDashboardKeys.all, 'todaySessionStats', tenantId, date] as const,
  pausedSeries: (tenantId: string, limit: number) => [...adminDashboardKeys.all, 'pausedSeries', tenantId, limit] as const,
};

/**
 * Hook to get treatment statistics for admin dashboard
 */
export const useTreatmentStatsQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<TreatmentStatsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TreatmentStatsResponse, Error>({
    queryKey: adminDashboardKeys.treatmentStats(tenantId),
    queryFn: () => getTreatmentStatsApi(tenantId),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to get today's session statistics for admin dashboard
 */
export const useTodaySessionStatsQuery = (
  tenantId: string,
  date?: string,
  options?: Omit<UseQueryOptions<TodaySessionStatsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TodaySessionStatsResponse, Error>({
    queryKey: adminDashboardKeys.todaySessionStats(tenantId, date),
    queryFn: () => getTodaySessionStatsApi(tenantId, date),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to get paused series for admin dashboard
 */
export const usePausedSeriesQuery = (
  tenantId: string,
  limit: number = 5,
  options?: Omit<UseQueryOptions<{ series: PausedSeriesItem[]; total: number }, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<{ series: PausedSeriesItem[]; total: number }, Error>({
    queryKey: adminDashboardKeys.pausedSeries(tenantId, limit),
    queryFn: () => getPausedSeriesApi(tenantId, limit),
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};



// ============================================
// THERAPIST DASHBOARD — NEW ROW_ID-BASED FLOW
// ============================================

import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  getTherapistSessionsApi,
  getTherapistKpisApi,
  getSheetRowUsablesApi,
  completeSheetRowApi,
} from '../datasources/staffDashboards.api';
import {
  TherapistSessionsResponse,
  KpiQueryParams,
  TherapistKpisResponse,
  SheetRowUsablesResponse,
  CompleteSheetRowRequest,
} from '../models/staffDashboards.dtos';

// ============================================
// QUERY KEYS — THERAPIST
// ============================================

export const therapistKeys = {
  sessions: (tenantId: string, params?: { cursor?: string; limit?: number; date?: string }) =>
    ['staffDashboards', 'therapist', 'sessions', tenantId, params] as const,
  kpis: (tenantId: string, staffId: string, params?: KpiQueryParams) =>
    ['staffDashboards', 'therapist', 'kpis', tenantId, staffId, params] as const,
  usables: (tenantId: string, rowId: string) =>
    ['staffDashboards', 'sheetRow', 'usables', tenantId, rowId] as const,
};

// ============================================
// 3.1 — useTherapistSessionsQuery
// Requirements: 4.1, 3.2
// ============================================

/**
 * Hook to fetch today's sessions for the authenticated therapist.
 * Disabled when tenantId is absent.
 */
export const useTherapistSessionsQuery = (
  tenantId: string,
  params?: { cursor?: string; limit?: number; date?: string },
  options?: Omit<UseQueryOptions<TherapistSessionsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TherapistSessionsResponse, Error>({
    queryKey: therapistKeys.sessions(tenantId, params),
    queryFn: () => getTherapistSessionsApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
    ...options,
  });
};

// ============================================
// 3.2 — useTherapistKpisQuery
// Requirements: 9.3, 3.2
// ============================================

/**
 * Hook to fetch KPI metrics for a specific staff member.
 * Disabled when tenantId or staffId is absent.
 */
export const useTherapistKpisQuery = (
  tenantId: string,
  staffId: string,
  params: KpiQueryParams,
  options?: Omit<UseQueryOptions<TherapistKpisResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<TherapistKpisResponse, Error>({
    queryKey: therapistKeys.kpis(tenantId, staffId, params),
    queryFn: () => getTherapistKpisApi(tenantId, staffId, params),
    enabled: !!tenantId && !!staffId,
    staleTime: 0,
    ...options,
  });
};

// ============================================
// 3.3 — useSheetRowUsablesQuery
// Requirements: 5.6, 3.2
// ============================================

/**
 * Hook to fetch pre-configured usables (materials) for a treatment sheet row.
 * Disabled when tenantId or rowId is absent.
 */
export const useSheetRowUsablesQuery = (
  tenantId: string,
  rowId: string | null,
  options?: Omit<UseQueryOptions<SheetRowUsablesResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<SheetRowUsablesResponse, Error>({
    queryKey: therapistKeys.usables(tenantId, rowId ?? ''),
    queryFn: () => getSheetRowUsablesApi(tenantId, rowId!),
    enabled: !!tenantId && !!rowId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// ============================================
// 3.4 — useCompleteSheetRowMutation
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 6.2
// ============================================

/** 409 response body shape from the completion endpoint */
interface ConflictResponseBody {
  error_code: 'REQUEST_IN_PROGRESS' | 'PARTIAL_DEDUCTION_DETECTED' | 'CONFLICT';
  retry_after_ms?: number;
  message?: string;
}

/** Status values exposed to the UI */
export type CompleteSheetRowSubmitStatus =
  | 'idle'
  | 'completing'
  | 'error'
  | 'partial_error'
  | 'conflict';

/** Return type of useCompleteSheetRowMutation */
export interface UseCompleteSheetRowMutationResult {
  /** Call this to start the completion flow. Pass sheetId to also invalidate the treatment order. */
  mutate: (args: { rowId: string; payload: CompleteSheetRowRequest; sheetId?: string }) => void;
  submitStatus: CompleteSheetRowSubmitStatus;
  errorMessage: string | null;
  /** Reset status back to idle (e.g. when modal closes) */
  reset: () => void;
}

const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 1000;

/**
 * Mutation hook for completing a treatment sheet row.
 *
 * Implements the full idempotency state machine:
 *   IDLE → COMPLETING → SUCCESS | ERROR | PARTIAL_ERROR | CONFLICT
 *
 * - REQUEST_IN_PROGRESS: retries up to 3× with retry_after_ms delay
 * - PARTIAL_DEDUCTION_DETECTED: keeps modal open, surfaces inline error
 * - CONFLICT: closes modal (via 'conflict' status), invalidates sessions
 * - On success: closes modal (via 'idle' after invalidation), invalidates sessions
 *
 * The payload is frozen at submission time and never mutated during retries.
 */
export const useCompleteSheetRowMutation = (
  tenantId: string
): UseCompleteSheetRowMutationResult => {
  const queryClient = useQueryClient();
  const [submitStatus, setSubmitStatus] = useState<CompleteSheetRowSubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSubmitStatus('idle');
    setErrorMessage(null);
  }, []);

  const mutate = useCallback(
    ({ rowId, payload, sheetId }: { rowId: string; payload: CompleteSheetRowRequest; sheetId?: string }) => {
      // Freeze the payload at submission time — never mutate on retry
      const frozenPayload: CompleteSheetRowRequest = JSON.parse(JSON.stringify(payload));

      setSubmitStatus('completing');
      setErrorMessage(null);

      const attempt = async (attemptNumber: number): Promise<void> => {
        try {
          await completeSheetRowApi(tenantId, rowId, frozenPayload);

          // SUCCESS — close modal, invalidate sessions + KPIs + order detail (if sheetId provided)
          await queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
            exact: false,
          });
          await queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'kpis', tenantId],
            exact: false,
          });
          if (sheetId) {
            await queryClient.invalidateQueries({
              queryKey: ['treatmentOrders', 'detail', sheetId],
            });
          }
          setSubmitStatus('idle');
          setErrorMessage(null);
        } catch (err: unknown) {
          const axiosError = err as {
            response?: { status?: number; data?: ConflictResponseBody };
            message?: string;
          };

          const status = axiosError?.response?.status;
          const body = axiosError?.response?.data;

          if (status === 409 && body?.error_code) {
            switch (body.error_code) {
              case 'REQUEST_IN_PROGRESS': {
                if (attemptNumber < MAX_RETRIES) {
                  // Wait retry_after_ms then retry with the same frozen payload
                  const delay = body.retry_after_ms ?? DEFAULT_RETRY_AFTER_MS;
                  await new Promise<void>((resolve) => setTimeout(resolve, delay));
                  setSubmitStatus('completing'); // keep "Completing..." visible
                  return attempt(attemptNumber + 1);
                }
                // All 3 retries exhausted
                setSubmitStatus('error');
                setErrorMessage(
                  body.message ?? 'Request is still in progress. Please try again later.'
                );
                return;
              }

              case 'PARTIAL_DEDUCTION_DETECTED': {
                // Keep modal open, surface inline error, do NOT change payload
                setSubmitStatus('partial_error');
                setErrorMessage(
                  body.message ?? 'Partial deduction detected. Please review and resubmit.'
                );
                return;
              }

              case 'CONFLICT': {
                // Close modal, invalidate sessions + KPIs + order detail
                await queryClient.invalidateQueries({
                  queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
                  exact: false,
                });
                await queryClient.invalidateQueries({
                  queryKey: ['staffDashboards', 'therapist', 'kpis', tenantId],
                  exact: false,
                });
                if (sheetId) {
                  await queryClient.invalidateQueries({
                    queryKey: ['treatmentOrders', 'detail', sheetId],
                  });
                }
                setSubmitStatus('conflict');
                setErrorMessage(null);
                return;
              }
            }
          }

          // Other errors — surface error, keep modal open
          setSubmitStatus('error');
          setErrorMessage(
            axiosError?.message ?? 'An unexpected error occurred. Please try again.'
          );
        }
      };

      attempt(1);
    },
    [tenantId, queryClient]
  );

  return { mutate, submitStatus, errorMessage, reset };
};

// ============================================
// 3.5 — useRecordSessionNonExecutionMutation (T-FE-E.3, T-BE-E.4a)
// ============================================

import {
  recordSessionNonExecutionApi,
} from '../datasources/staffDashboards.api';
import {
  RecordSessionNonExecutionRequest,
  RecordSessionNonExecutionResponse,
} from '../models/staffDashboards.dtos';

export type RecordNonExecutionSubmitStatus = 'idle' | 'submitting' | 'error';

export interface UseRecordSessionNonExecutionMutationResult {
  /** Call this to record why a Session did not execute. */
  mutate: (args: { rowId: string; payload: RecordSessionNonExecutionRequest; sheetId?: string }) => void;
  submitStatus: RecordNonExecutionSubmitStatus;
  errorMessage: string | null;
  /** The backend's own response for the row just recorded — the ONLY place
   * these 3 facts are available (see RecordSessionNonExecutionResponse docstring
   * for why this cannot be durably re-displayed after the next list refetch). */
  lastResult: RecordSessionNonExecutionResponse | null;
  reset: () => void;
}

/**
 * Mutation hook for recording structured Session non-execution.
 *
 * Uses the real backend endpoint (record_session_non_execution, T-BE-E.4a) —
 * this genuinely persists server-side. What it does NOT do is fake durable
 * list-view redisplay of the reason: TherapistSessionItemV2 (the
 * get_therapist_sessions schema) has no non_execution_reason_code/text field,
 * and non-execution does not mutate row status server-side, so the composed
 * label is only available from this hook's own `lastResult` immediately after
 * a successful call — never invented or persisted client-side as if durable.
 */
export const useRecordSessionNonExecutionMutation = (
  tenantId: string
): UseRecordSessionNonExecutionMutationResult => {
  const queryClient = useQueryClient();
  const [submitStatus, setSubmitStatus] = useState<RecordNonExecutionSubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RecordSessionNonExecutionResponse | null>(null);

  const reset = useCallback(() => {
    setSubmitStatus('idle');
    setErrorMessage(null);
    setLastResult(null);
  }, []);

  const mutate = useCallback(
    ({ rowId, payload, sheetId }: { rowId: string; payload: RecordSessionNonExecutionRequest; sheetId?: string }) => {
      setSubmitStatus('submitting');
      setErrorMessage(null);

      (async () => {
        try {
          const result = await recordSessionNonExecutionApi(tenantId, rowId, payload);
          setLastResult(result);
          setSubmitStatus('idle');

          await queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
            exact: false,
          });
          await queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'kpis', tenantId],
            exact: false,
          });
          if (sheetId) {
            await queryClient.invalidateQueries({
              queryKey: ['treatmentOrders', 'detail', sheetId],
            });
          }
        } catch (err: unknown) {
          const axiosError = err as {
            response?: { status?: number; data?: { detail?: string; message?: string } };
            message?: string;
          };
          const status = axiosError?.response?.status;
          const detail = axiosError?.response?.data?.detail ?? axiosError?.response?.data?.message;

          setSubmitStatus('error');
          if (status === 403) {
            setErrorMessage('You do not have permission to record this outcome.');
          } else if (status === 400 || status === 422) {
            setErrorMessage(detail ?? 'This Session cannot be marked non-executed in its current state.');
          } else {
            setErrorMessage(detail ?? axiosError?.message ?? 'An unexpected error occurred. Please try again.');
          }
        }
      })();
    },
    [tenantId, queryClient]
  );

  return { mutate, submitStatus, errorMessage, lastResult, reset };
};
