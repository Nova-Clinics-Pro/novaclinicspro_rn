/**
 * useClinicalTimelineData (R3B · T-C.1 origin; T-FE-C.5 rewrite — T-BE-A.3/
 * A.3a, FR-HIST-1/2)
 *
 * T-FE-C.5 replaces the prior five-query, frontend-assembled flat timeline
 * (Visits + Prescriptions + Case Sheet + Treatment Recommendation +
 * Clinical Services, locally sorted) with a thin adapter over the
 * backend-owned Clinical History projection
 * (`GET /clinic/{tenant_id}/clinical-workspace/history`, T-BE-A.3). There
 * is no fallback to the old assembly -- the prior five queries
 * (`useAppointmentsListQuery`/`usePrescriptionsListQuery`/
 * `useTreatmentSheetsByEpisodeQuery`/`useEpisodeContext().casesheet`/the
 * per-Visit `useQueries` clinical-services fan-out) are gone from this
 * file entirely.
 *
 * This file performs ZERO encounter classification, ZERO Session-count
 * aggregation, ZERO Plan-association inference, and ZERO Treatment Review
 * date derivation -- every one of those facts (`encounter_type`,
 * `plan_id`, `session_counts`, `occurred_at`) is backend-resolved and
 * passed through unchanged (Timeline Adapter Rule §7, extended to cover
 * "no re-classification" as well as "no re-aggregation"). The only
 * transformation performed here is a presentation-adapter mapping from
 * the backend's semantic-only `HistoryItemResponse` shape onto the
 * existing `ClinicalTimelineItem` shape `ClinicalTimeline.tsx` (T-FE-C.4)
 * already renders -- required only because `ClinicalTimelineItem` predates
 * this contract and still needs a `title`/optional `route` for its
 * current (pre-T-FE-C.6) rendering:
 *   - `title`: a static, governed label looked up by `encounter_type` via
 *     localization (`clinicalTimeline.types.*`) -- not inferred from any
 *     clinical fact, exactly the same "governed code -> UI label" pattern
 *     already used throughout this codebase (e.g. `getStatusLabel`).
 *   - `route`: populated only for `consultation`/`legacy_treatment_sessions`
 *     (each has exactly one `appointment_ids[0]`, routed to the existing
 *     `/clinic-admin/appointments/{id}` screen -- the same destination the
 *     pre-T-FE-C.5 `'visit'` item type already used). Left `undefined` for
 *     `treatment_plan`/`treatment_review` -- Engineering Truth found no
 *     existing Treatment Plan or Clinical Review detail screen in this
 *     app to route to, and this task must not invent a new route
 *     (T-FE-C.6's or a later task's own scope).
 *   - `subtitle` is left `undefined` for every item -- rendering
 *     `session_counts`/richer summaries is T-FE-C.6's own scope, not
 *     re-derived or pre-empted here.
 *
 * Backend order is preserved exactly -- no `.sort()`/`.reverse()` of any
 * kind. The backend does not return items in strict chronological order
 * across encounter-type buckets today (consultations/legacy sessions in
 * appointment order, then all Treatment Plan groups, then all Treatment
 * Review items) -- that is accepted as-is per this task's explicit
 * instruction not to reorder using `occurred_at` or any other
 * locally-derived fact.
 *
 * T-FE-C.6a (T-BE-A.3b, FR-HIST-1 AC7/AC8/AC9): `plan_status`/`sessions`
 * are passed through unchanged, same passthrough discipline as every
 * other backend fact here -- `sessions` is mapped field-by-field to
 * `ClinicalTimelineSession` (camelCase, matching this file's existing
 * `appointmentIds`/`planId`/`sessionCounts` convention) with zero
 * reordering, zero filtering, zero derived fields.
 */
import { useMemo } from 'react';
import { useEpisodeContext, usePatientContext } from '../context/ClinicalWorkspaceContext';
import { useClinicalHistoryQuery } from '../../data/repositories/clinicalWorkspace.repository.impl';
import { t } from '../../../../core/localization/i18n';

export type ClinicalTimelineItemType =
  | 'consultation'
  | 'treatment_review'
  | 'treatment_plan'
  | 'legacy_treatment_sessions';

export interface ClinicalTimelineSessionCounts {
  completed: number;
  scheduled: number;
  not_completed: number;
  cancelled: number;
}

/**
 * T-BE-A.3b (FR-HIST-1 AC8/AC9) -- one individual Session, passed through
 * from `ClinicalHistorySessionResponse` unchanged (field-renamed to
 * camelCase only, matching this file's own convention). `id` is the
 * Session's stable identity. `scheduledDate`/`scheduledTime`/`scheduledAt`
 * are `null` when genuinely unscheduled/PRN -- never fabricated.
 * `assignedStaffName` is `null` when unassigned or unresolvable (e.g. a
 * deleted staff record) -- the Session itself is never dropped either
 * way. `status`, `completedAt`/`completedByStaffId`, and
 * `nonExecutionReasonCode`/`nonExecutionReasonText` remain three
 * independent fields, never composed into one derived label here.
 */
export interface ClinicalTimelineSession {
  id: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledAt: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  treatmentName: string | null;
  medicinesText: string | null;
  instructionsText: string | null;
  status: string;
  completedAt: string | null;
  completedByStaffId: string | null;
  nonExecutionReasonCode: string | null;
  nonExecutionReasonText: string | null;
}

export interface ClinicalTimelineItem {
  id: string;
  /**
   * Passed through verbatim from `HistoryItemResponse.encounter_type` --
   * typed as the known union in the common case, but never narrowed or
   * remapped for an unrecognized value (a future backend-added type must
   * render with a safe generic fallback, never be silently relabeled as
   * one of the four known types).
   */
  type: ClinicalTimelineItemType | (string & {});
  /**
   * Backend-authoritative occurrence timestamp (T-BE-A.3a,
   * `HistoryItemResponse.occurred_at`) -- ISO string, or `null` when the
   * backend genuinely could not resolve one. Never fabricated, never
   * derived from `appointmentIds`, a Treatment Sheet date, or the current
   * date. `null` is preserved and rendered honestly (existing
   * `formatDate()` already renders a null-safe placeholder) -- an item is
   * never dropped merely because this is null.
   */
  date: string | null;
  title: string;
  subtitle?: string;
  /** FR-C2: the item's own canonical detail/reference route -- absent
   * when no safe existing route exists yet for this encounter type. */
  route?: string;
  /** Backend identifiers/facts passed through unchanged for future
   * (T-FE-C.6) hierarchy rendering -- never computed here. */
  appointmentIds: string[];
  planId: string | null;
  sessionCounts: ClinicalTimelineSessionCounts | null;
  /** T-BE-A.3b (FR-HIST-1 AC7) -- present for `treatment_plan` items
   * only; `null` elsewhere means "not applicable", same convention as
   * `sessionCounts`. The Plan's own authoritative status, never derived. */
  planStatus: string | null;
  /** T-BE-A.3b (FR-HIST-1 AC8/AC9) -- present for `treatment_plan` items
   * only, same "not applicable" convention. Backend-ordered; never
   * sorted here. */
  sessions: ClinicalTimelineSession[] | null;
}

export interface ClinicalTimelineData {
  items: ClinicalTimelineItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  'consultation',
  'treatment_review',
  'treatment_plan',
  'legacy_treatment_sessions',
]);

function encounterTypeLabel(encounterType: string): string {
  if (!KNOWN_TYPES.has(encounterType)) {
    return t('clinicalTimeline.unknownType');
  }
  return t(`clinicalTimeline.types.${encounterType}`);
}

export function useClinicalTimelineData(): ClinicalTimelineData {
  const { tenantId, episodeId } = useEpisodeContext();
  const { clientId } = usePatientContext();

  const historyQuery = useClinicalHistoryQuery(tenantId, clientId, episodeId);

  const items = useMemo<ClinicalTimelineItem[]>(() => {
    const rawItems = historyQuery.data?.items ?? [];

    // Passthrough map only -- backend order preserved exactly, no sort.
    return rawItems.map((item) => {
      // A route only exists (today) for the two appointment-attributed
      // types, using their own first appointment id -- never a
      // proximity/date-based guess, and never invented for
      // treatment_plan/treatment_review.
      const route =
        (item.encounter_type === 'consultation' || item.encounter_type === 'legacy_treatment_sessions') &&
        item.appointment_ids[0]
          ? `/clinic-admin/appointments/${item.appointment_ids[0]}`
          : undefined;

      return {
        id: item.id,
        type: item.encounter_type,
        date: item.occurred_at,
        title: encounterTypeLabel(item.encounter_type),
        route,
        appointmentIds: item.appointment_ids,
        planId: item.plan_id,
        sessionCounts: item.session_counts,
        planStatus: item.plan_status,
        sessions: item.sessions
          ? item.sessions.map((session) => ({
              id: session.id,
              scheduledDate: session.scheduled_date,
              scheduledTime: session.scheduled_time,
              scheduledAt: session.scheduled_at,
              assignedStaffId: session.assigned_staff_id,
              assignedStaffName: session.assigned_staff_name,
              treatmentName: session.treatment_name,
              medicinesText: session.medicines_text,
              instructionsText: session.instructions_text,
              status: session.status,
              completedAt: session.completed_at,
              completedByStaffId: session.completed_by_staff_id,
              nonExecutionReasonCode: session.non_execution_reason_code,
              nonExecutionReasonText: session.non_execution_reason_text,
            }))
          : null,
      };
    });
  }, [historyQuery.data]);

  return {
    items,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    refetch: historyQuery.refetch,
  };
}
