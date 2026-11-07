/**
 * Treatment Orders Repository
 *
 * React Query hooks for the treatment-order execution lifecycle.
 * Separate from treatmentSheets.repository.impl.ts (documentation lifecycle).
 *
 * VERSION CONFLICT POLICY (applies to all mutations):
 *   On 409 with error = 'VERSION_CONFLICT':
 *     - Surface a toast message to the user.
 *     - Refetch the order to get the current version.
 *     - Do NOT auto-retry — let the user re-trigger.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  getTreatmentOrderApi,
  listTreatmentOrdersApi,
  sendToSchedulingApi,
  createTreatmentRecommendationApi,
  startSheetRowApi,
  scheduleRowApi,
  bulkScheduleRowsApi,
  cancelTreatmentOrderApi,
  placeTreatmentOrderOnHoldApi,
  extendTreatmentOrderHoldApi,
  releaseTreatmentSheetApi,
  addClinicalReviewNoteApi,
  recordClinicalReviewOutcomeApi,
  getSchedulingProposalApi,
  CreateTreatmentRecommendationRequest,
  ClinicalReviewNoteResponse,
  ClinicalReviewOutcome,
  SchedulingProposalParams,
} from '../datasources/treatmentOrders.api';
import {
  TreatmentOrderResponse,
  TreatmentOrdersListResponse,
  TreatmentOrdersListParams,
  SendToSchedulingRequest,
  ScheduleRowRequest,
  BulkScheduleRequest,
  VersionConflictError,
  SchedulingProposalResponse,
} from '../models/treatmentOrders.dtos';
import { treatmentSheetsKeys } from './treatmentSheets.repository.impl';

// ============================================
// QUERY KEYS
// ============================================

export const treatmentOrderKeys = {
  all: ['treatmentOrders'] as const,
  detail: (sheetId: string) =>
    [...treatmentOrderKeys.all, 'detail', sheetId] as const,
  worklists: (tenantId: string) =>
    [...treatmentOrderKeys.all, 'worklist', tenantId] as const,
  worklist: (tenantId: string, params?: TreatmentOrdersListParams) =>
    [...treatmentOrderKeys.worklists(tenantId), params] as const,
  pendingDocumentation: (tenantId: string, staffId: string) =>
    [...treatmentOrderKeys.all, 'pendingDocumentation', tenantId, staffId] as const,
  schedulingProposal: (planId: string, startDate: string) =>
    [...treatmentOrderKeys.all, 'schedulingProposal', planId, startDate] as const,
};

const removeOrderFromCachedWorklists = (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  sheetId: string
) => {
  queryClient.setQueriesData<TreatmentOrdersListResponse>(
    { queryKey: treatmentOrderKeys.worklists(tenantId), exact: false },
    (current) => {
      if (!current) return current;
      const nextItems = current.items.filter((item) => item.id !== sheetId);
      if (nextItems.length === current.items.length) return current;
      return {
        ...current,
        items: nextItems,
        total: Math.max(0, current.total - (current.items.length - nextItems.length)),
      };
    }
  );
};

/**
 * Phase 1 · T-A.2 (ADR-P1-01): exported so `useConsultationWorkspace.ts`'s
 * `sendTreatmentToAdmin` can reuse this exact invalidation set after a
 * successful send, instead of duplicating it. Was previously module-private
 * (used only by mutations within this file).
 */
export const invalidateTreatmentOrderSurfaces = async (
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  sheetId?: string
) => {
  await Promise.all([
    ...(sheetId
      ? [
          queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.detail(sheetId) }),
          queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.detail(sheetId) }),
        ]
      : []),
    queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.worklists(tenantId), exact: false }),
    queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.pendingDocumentation(tenantId, 'doctor') }),
    queryClient.invalidateQueries({ queryKey: treatmentSheetsKeys.all, exact: false }),
  ]);
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch a single treatment order by sheet id.
 * Used by the doctor CTA screen and therapist start-session flow.
 */
export const useTreatmentOrderQuery = (
  sheetId: string,
  tenantId: string,
  options?: Omit<UseQueryOptions<TreatmentOrderResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TreatmentOrderResponse, Error>({
    queryKey: treatmentOrderKeys.detail(sheetId),
    queryFn: () => getTreatmentOrderApi(sheetId, tenantId),
    enabled: !!sheetId && !!tenantId,
    staleTime: 0,
    ...options,
  });

/**
 * Resolves a treatment order from an event handler while preserving the same
 * canonical React Query cache identity as `useTreatmentOrderQuery`.
 *
 * The therapist's Start Session action needs the server-issued version before
 * it can submit a row transition. The action is initiated from a callback, so
 * a regular query hook cannot be called at that point without violating the
 * Rules of Hooks.
 */
export const useTreatmentOrderOnDemand = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (sheetId: string, tenantId: string) =>
      queryClient.fetchQuery<TreatmentOrderResponse>({
        queryKey: treatmentOrderKeys.detail(sheetId),
        queryFn: () => getTreatmentOrderApi(sheetId, tenantId),
        staleTime: 0,
      }),
    [queryClient]
  );
};

/**
 * T-FE-E.2 closure (FR-SCH-1). Read-only: resolves a Treatment Plan's
 * scheduling intent into proposed session dates -- disabled until a
 * `planId` exists (a Plan must be created first). No local date
 * computation/sorting; the response is rendered as-is.
 */
export const useSchedulingProposalQuery = (
  planId: string,
  params: SchedulingProposalParams,
  options?: Omit<UseQueryOptions<SchedulingProposalResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<SchedulingProposalResponse, Error>({
    queryKey: treatmentOrderKeys.schedulingProposal(planId, params.startDate),
    queryFn: () => getSchedulingProposalApi(planId, params),
    enabled: !!planId && !!params.startDate,
    ...options,
  });

/**
 * Admin worklist — paginated list of treatment orders.
 * Filtered by state / scheduling_status / overdue etc.
 */
export const useTreatmentOrdersQuery = (
  tenantId: string,
  params?: TreatmentOrdersListParams,
  options?: Omit<UseQueryOptions<TreatmentOrdersListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TreatmentOrdersListResponse, Error>({
    queryKey: treatmentOrderKeys.worklist(tenantId, params),
    queryFn: () => listTreatmentOrdersApi(tenantId, params),
    enabled: !!tenantId,
    staleTime: 0,
    ...options,
  });

/**
 * Doctor widget — sheets where state IN (ORDERED, SCHEDULED, IN_PROGRESS)
 * AND documentation_status NOT IN (FINAL, SIGNED).
 * ORDERED = sent to scheduling, awaiting assignment.
 * SCHEDULED/IN_PROGRESS = active, may need documentation.
 */
export const usePendingDocumentationQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<TreatmentOrdersListResponse, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<TreatmentOrdersListResponse, Error>({
    queryKey: treatmentOrderKeys.pendingDocumentation(tenantId, 'doctor'),
    queryFn: async () => {
      const [ordered, scheduled, inProgress] = await Promise.all([
        listTreatmentOrdersApi(tenantId, { state: 'ORDERED', limit: 50 }),
        listTreatmentOrdersApi(tenantId, { state: 'SCHEDULED', limit: 50 }),
        listTreatmentOrdersApi(tenantId, { state: 'IN_PROGRESS', limit: 50 }),
      ]);
      const hasPendingClinicalRows = (order: TreatmentOrderResponse): boolean => {
        const rows = order.rows?.filter((row) => row.status !== 'CANCELLED') ?? [];
        if (rows.length === 0) return true;
        return rows.some((row) => {
          const fields = [row.treatment_name, row.medicines_text, row.instructions_text];
          return fields.every((value) => !value || !String(value).trim());
        });
      };
      const items = [...ordered.items, ...scheduled.items, ...inProgress.items].filter((order) => {
        if (order.documentation_status !== 'DRAFT') return false;
        if (order.state === 'ORDERED') return true;
        return hasPendingClinicalRows(order);
      });
      return { items, total: items.length, skip: 0, limit: items.length };
    },
    enabled: !!tenantId,
    staleTime: 0,
    ...options,
  });

// ============================================
// VERSION CONFLICT HELPERS
// ============================================

/** Extracts the VersionConflictError body from an axios error, or null. */
const extractVersionConflict = (err: unknown): VersionConflictError | null => {
  const axiosErr = err as { response?: { status?: number; data?: any } };
  if (axiosErr?.response?.status !== 409) return null;
  // Body may be flat: {error, current_version} or nested: {detail: {error, current_version}}
  const body = axiosErr.response.data?.error === 'VERSION_CONFLICT'
    ? axiosErr.response.data
    : axiosErr.response.data?.detail?.error === 'VERSION_CONFLICT'
    ? axiosErr.response.data.detail
    : null;
  return body;
};

/** Extracts a human-readable message from any API error. */
const extractErrorMessage = (err: unknown, fallback: string): string => {
  const axiosErr = err as { response?: { data?: any }; message?: string };
  const data = axiosErr?.response?.data;
  // detail may be a string or an object — extract string safely
  const detail = data?.detail;
  const detailStr = typeof detail === 'string' ? detail : detail?.message || detail?.error || null;
  return (
    data?.message ||
    detailStr ||
    data?.error ||
    (axiosErr as any)?.message ||
    fallback
  );
};

// ============================================
// SEND TO SCHEDULING MUTATION
// ============================================

export type SendToSchedulingStatus = 'idle' | 'sending' | 'success' | 'error' | 'conflict';

export interface UseSendToSchedulingResult {
  mutate: (args: { sheetId: string; version: number; payload?: SendToSchedulingRequest }) => void;
  status: SendToSchedulingStatus;
  errorMessage: string | null;
  /** Current version after a conflict refetch — use this to re-trigger. */
  currentVersion: number | null;
  reset: () => void;
}

/**
 * Mutation: Send treatment sheet to scheduling (DRAFT → ORDERED).
 * On 409 VERSION_CONFLICT: surfaces conflict status + current_version for re-trigger.
 * Invalidates: treatmentOrder detail + admin worklist.
 */
export const useSendToSchedulingMutation = (tenantId: string): UseSendToSchedulingResult => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SendToSchedulingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setCurrentVersion(null);
  }, []);

  const mutate = useCallback(
    async ({ sheetId, version, payload = {} }: { sheetId: string; version: number; payload?: SendToSchedulingRequest }) => {
      setStatus('sending');
      setErrorMessage(null);
      setCurrentVersion(null);
      try {
        await sendToSchedulingApi(sheetId, version, payload);
        await invalidateTreatmentOrderSurfaces(queryClient, tenantId, sheetId);
        setStatus('success');
      } catch (err) {
        const conflict = extractVersionConflict(err);
        if (conflict) {
          // Refetch to surface the latest version to the caller
          await queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.detail(sheetId) });
          setCurrentVersion(conflict.current_version);
          setStatus('conflict');
          setErrorMessage('This plan was updated elsewhere. Please review and try again.');
        } else {
          setStatus('error');
          setErrorMessage(extractErrorMessage(err, 'Failed to send to scheduling.'));
        }
      }
    },
    [tenantId, queryClient]
  );

  return { mutate, status, errorMessage, currentVersion, reset };
};

// ============================================
// CREATE RECOMMENDATION / DIRECT SEND-TO-SCHEDULING MUTATIONS
// ============================================

/**
 * R7 · T-0.4 (ED-ARCH-001): thin useMutation wrappers so
 * TreatmentRecommendationModule (Presentation) no longer imports
 * createTreatmentRecommendationApi/sendToSchedulingApi directly. Distinct
 * from useSendToSchedulingMutation above (a local status-machine hook used
 * by the standalone Treatment Sheet screens) — that hook swallows errors
 * into its own status/errorMessage state and never resolves the response
 * to its caller, which doesn't fit a caller that needs to await the
 * created/updated order and throw on failure. No default onSuccess
 * (matches useAddClinicalReviewNoteMutation's precedent below) — callers
 * own their own invalidation.
 */
export const useCreateTreatmentRecommendationMutation = (
  tenantId: string,
  options?: UseMutationOptions<TreatmentOrderResponse, Error, CreateTreatmentRecommendationRequest>
) =>
  useMutation<TreatmentOrderResponse, Error, CreateTreatmentRecommendationRequest>({
    mutationFn: (payload) => createTreatmentRecommendationApi(tenantId, payload),
    ...options,
  });

export const useSendTreatmentOrderToSchedulingMutation = (
  options?: UseMutationOptions<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; payload?: SendToSchedulingRequest }
  >
) =>
  useMutation<TreatmentOrderResponse, Error, { sheetId: string; version: number; payload?: SendToSchedulingRequest }>({
    mutationFn: ({ sheetId, version, payload }) => sendToSchedulingApi(sheetId, version, payload),
    ...options,
  });

// ============================================
// START SESSION MUTATION
// ============================================

export type StartSessionStatus = 'idle' | 'starting' | 'success' | 'error' | 'conflict';

export interface UseStartSessionResult {
  mutate: (args: { sheetId: string; rowId: string; version: number }) => void;
  status: StartSessionStatus;
  errorMessage: string | null;
  currentVersion: number | null;
  reset: () => void;
}

/**
 * Mutation: Start a session row (SCHEDULED → IN_PROGRESS).
 * On 409 VERSION_CONFLICT: surfaces conflict + current_version.
 * On 422: surfaces validation error (e.g. row not in SCHEDULED state).
 * Invalidates: therapist sessions + treatment order detail.
 */
export const useStartSessionMutation = (tenantId: string): UseStartSessionResult => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StartSessionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setCurrentVersion(null);
  }, []);

  const mutate = useCallback(
    async ({ sheetId, rowId, version }: { sheetId: string; rowId: string; version: number }) => {
      setStatus('starting');
      setErrorMessage(null);
      setCurrentVersion(null);
      try {
        await startSheetRowApi(sheetId, rowId, version);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
            exact: false,
          }),
          queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.detail(sheetId) }),
        ]);
        setStatus('success');
      } catch (err) {
        const conflict = extractVersionConflict(err);
        if (conflict) {
          await queryClient.invalidateQueries({ queryKey: treatmentOrderKeys.detail(sheetId) });
          await queryClient.invalidateQueries({
            queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
            exact: false,
          });
          setCurrentVersion(conflict.current_version);
          setStatus('conflict');
          setErrorMessage('This session was updated elsewhere. Refreshing…');
        } else {
          setStatus('error');
          setErrorMessage(extractErrorMessage(err, 'Failed to start session.'));
        }
      }
    },
    [tenantId, queryClient]
  );

  return { mutate, status, errorMessage, currentVersion, reset };
};

// ============================================
// SCHEDULE ROW MUTATION (admin scheduler)
// ============================================

/**
 * Mutation: Schedule a single row (assign staff + date/time).
 * Returns the full updated TreatmentOrderResponse.
 */
export const useScheduleRowMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; rowId: string; version: number; payload: ScheduleRowRequest }
  >({
    mutationFn: ({ sheetId, rowId, version, payload }) =>
      scheduleRowApi(sheetId, rowId, version, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

/**
 * Mutation: Bulk-schedule multiple rows.
 */
export const useBulkScheduleRowsMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; payload: BulkScheduleRequest }
  >({
    mutationFn: ({ sheetId, version, payload }) =>
      bulkScheduleRowsApi(sheetId, version, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

// ============================================
// CANCEL ORDER MUTATION
// ============================================

/**
 * Mutation: Cancel a treatment order.
 * Invalidates: order detail + admin worklist + doctor dashboard.
 */
export const useCancelTreatmentOrderMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; reason_code?: string; reason_text?: string }
  >({
    mutationFn: ({ sheetId, version, reason_code, reason_text }) =>
      cancelTreatmentOrderApi(sheetId, version, { reason_code, reason_text }),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      removeOrderFromCachedWorklists(queryClient, tenantId, data.id);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

// Phase 4 (R4) · T-D.1 (ADR-R4-01) — Scheduling On Hold.
export const usePlaceTreatmentOrderOnHoldMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; hold_expires_at: string; hold_notes?: string }
  >({
    mutationFn: ({ sheetId, version, hold_expires_at, hold_notes }) =>
      placeTreatmentOrderOnHoldApi(sheetId, version, { hold_expires_at, hold_notes }),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

export const useExtendTreatmentOrderHoldMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; hold_expires_at: string }
  >({
    mutationFn: ({ sheetId, version, hold_expires_at }) =>
      extendTreatmentOrderHoldApi(sheetId, version, hold_expires_at),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

// Phase 4 (R4) · T-E.5 (ADR-R4-06) — Release Treatment Sheet (Doctor-only,
// whole-sheet, no per-row/partial release).
export const useReleaseTreatmentSheetMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<TreatmentOrderResponse, Error, { sheetId: string; version: number }>({
    mutationFn: ({ sheetId, version }) => releaseTreatmentSheetApi(sheetId, version),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};

// Phase 4 (R4) · T-D.4/T-E.6 (ADR-R4-07) — Clinical Review note (append-only
// documentation, outcome always NULL). Does not mutate the sheet itself (no
// version bump on the backend), so no order-detail cache update is needed
// beyond the note's own response -- the caller refetches the order
// separately if it wants a fresh lifecycle_status read.
export const useAddClinicalReviewNoteMutation = () => {
  return useMutation<ClinicalReviewNoteResponse, Error, { sheetId: string; notesJson: Record<string, unknown> }>({
    mutationFn: ({ sheetId, notesJson }) => addClinicalReviewNoteApi(sheetId, notesJson),
  });
};

// Phase 4 (R4) · T-D.5/T-E.6 (ADR-R4-07) — Clinical Review outcome (the
// DECISION, distinct from the note above).
export const useRecordClinicalReviewOutcomeMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    TreatmentOrderResponse,
    Error,
    { sheetId: string; version: number; outcome: ClinicalReviewOutcome; notesJson?: Record<string, unknown> }
  >({
    mutationFn: ({ sheetId, version, outcome, notesJson }) =>
      recordClinicalReviewOutcomeApi(sheetId, version, outcome, notesJson),
    onSuccess: (data) => {
      queryClient.setQueryData(treatmentOrderKeys.detail(data.id), data);
      invalidateTreatmentOrderSurfaces(queryClient, tenantId, data.id);
    },
  });
};
