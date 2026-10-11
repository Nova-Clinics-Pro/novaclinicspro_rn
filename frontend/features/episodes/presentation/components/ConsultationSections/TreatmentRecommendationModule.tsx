/**
 * TreatmentRecommendationModule (R3A · T-B.3, ADR-R3A-02)
 *
 * The doctor's existing Treatment Recommendation section, re-hosted as a
 * workspace module. Reads episodeId/clientId/appointmentId/tenantId from
 * Persistent Context (design §9.E) instead of from props threaded by the
 * parent screen. All draft/send logic below is copied UNCHANGED from
 * useConsultationWorkspace.ts — only its input source changed.
 *
 * ensureCasesheetExists (the T-B.1 transitional bridge) is still received as
 * a PROP from ConsultationWorkspaceScreen (sourced from CaseSheetModule's
 * own ref) — migrating this module does NOT retire that bridge, only
 * relocates it from "hook input" to "prop between two sibling modules." The
 * underlying cross-module dependency (a treatment order's sheet is derived
 * from the client's latest casesheet, a real backend constraint) is
 * permanent; this bridge is the mechanism for it regardless of which layer
 * owns Treatment Recommendation's own state.
 *
 * Exposes sendTreatmentToAdmin via ref — not needed by any production call
 * site (unlike CaseSheetModule's ref, "Save & Submit" never needed to flush
 * treatment, since it isn't autosave-debounced), but the CTA button's own
 * handleSend() wraps onSendToAdmin() fire-and-forget with no .catch()
 * (TreatmentRecommendationSection, unchanged), so verifying the rejection
 * path (e.g. the casesheet bridge failing) needs a direct, awaitable handle
 * — the same reasoning that makes CaseSheetModule's ref useful, applied here
 * for test verification rather than a production coordination need.
 *
 * R7 · T-0.4 (ED-ARCH-001): the write path imported `sendToSchedulingApi`/
 * `createTreatmentRecommendationApi` directly from the datasource layer.
 * Repointed to `useCreateTreatmentRecommendationMutation`/
 * `useSendTreatmentOrderToSchedulingMutation` (`treatmentOrders.repository
 * .impl.ts`) — new, minimal `useMutation` wrappers, since no existing hook
 * covered either call with a throw-based, awaitable, response-returning
 * contract (the existing `useSendToSchedulingMutation` in the same file is
 * a local status-machine hook built for the standalone Treatment Sheet
 * screens and swallows errors into its own state instead of rejecting).
 * The shared post-call invalidation logic below (unconditional
 * `refetchEpisode()`, then `isFreshnessV1Enabled`-gated
 * `invalidateTreatmentOrderSurfaces` vs. `refetchTreatmentSheet()`) is
 * unchanged — both branches already converged on it before this task.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isFreshnessV1Enabled, useFeatures } from '../../../../../core/hooks/useFeatures';
import {
  invalidateTreatmentOrderSurfaces,
  useCreateTreatmentRecommendationMutation,
  useSendTreatmentOrderToSchedulingMutation,
} from '../../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { useEpisodeContext, usePatientContext, useVisitContext } from '../../context/ClinicalWorkspaceContext';
import { useReportSaveStatus } from '../../context/WorkspaceSaveStatusContext';
import {
  SectionKey,
  SectionProgress,
  SectionProgressStatus,
  TreatmentRecommendationDraft,
} from '../../hooks/useConsultationWorkspace';
import { TreatmentRecommendationSection } from './TreatmentRecommendationSection';
import { renderSection } from './sectionRenderer';
import { toClinicalWorkspaceError } from '../../../application/clinicalWorkspaceError';

const DEFAULT_TREATMENT_DRAFT: TreatmentRecommendationDraft = {
  recommendedTherapy: '',
  frequency: 'daily',
  durationDays: 7,
  startPreference: 'asap',
  notesForAdmin: '',
};

// Execution states that mean the sheet has been sent to admin for scheduling.
// Document status (DRAFT/FINAL/SIGNED) is a separate axis and is NOT used here.
const SENT_EXECUTION_STATES = new Set(['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED']);

const isSentToScheduling = (state?: string | null): boolean =>
  SENT_EXECUTION_STATES.has((state ?? '').toUpperCase());

function computeTreatmentStatus(treatmentDraft: TreatmentRecommendationDraft, isTreatmentSent: boolean): SectionProgressStatus {
  if (!treatmentDraft.recommendedTherapy?.trim()) return 'empty';
  if (isTreatmentSent) return 'complete';
  return 'in_progress';
}

export interface TreatmentRecommendationModuleHandle {
  /** Exposed for test verification only — see file header. */
  sendTreatmentToAdmin: () => Promise<void>;
}

export interface TreatmentRecommendationModuleProps {
  expandedSections: Set<SectionKey>;
  onToggleSection: (key: SectionKey) => void;
  /** T-B.1 transitional bridge, relocated here from the hook (T-B.3) — see file header. */
  ensureCasesheetExists: () => Promise<string | null>;
}

export const TreatmentRecommendationModule = forwardRef<TreatmentRecommendationModuleHandle, TreatmentRecommendationModuleProps>(({
  expandedSections,
  onToggleSection,
  ensureCasesheetExists,
}, ref) => {
  const queryClient = useQueryClient();
  const features = useFeatures();
  const {
    tenantId,
    episodeId,
    episodeDetails,
    refetchEpisode,
    treatmentSheet,
    treatmentSheetId: remoteTreatmentSheetId,
    refetchTreatmentSheet,
  } = useEpisodeContext();
  const { clientId: resolvedClientId } = usePatientContext();
  const { appointmentId } = useVisitContext();

  const [treatmentRecommendation, setTreatmentRecommendation] = useState<TreatmentRecommendationDraft>(DEFAULT_TREATMENT_DRAFT);
  const [isTreatmentSaving, setIsTreatmentSaving] = useState(false);
  const [treatmentSaveError, setTreatmentSaveError] = useState<string | null>(null);
  const [isTreatmentSent, setIsTreatmentSent] = useState(false);
  const isTreatmentSentRef = useRef(false);
  const treatmentSheetIdRef = useRef<string | null>(null);
  const treatmentSheetVersionRef = useRef<number>(0);
  const treatmentPrefillDoneRef = useRef(false);
  const treatmentRecommendationRef = useRef<TreatmentRecommendationDraft>(DEFAULT_TREATMENT_DRAFT);
  const treatmentDirtyRef = useRef(false);

  useEffect(() => {
    treatmentSheetIdRef.current = null;
    treatmentSheetVersionRef.current = 0;
    treatmentPrefillDoneRef.current = false;
    setTreatmentRecommendation(DEFAULT_TREATMENT_DRAFT);
    treatmentRecommendationRef.current = DEFAULT_TREATMENT_DRAFT;
    treatmentDirtyRef.current = false;
    setTreatmentSaveError(null);
    setIsTreatmentSent(false);
    isTreatmentSentRef.current = false;
  }, [episodeId, appointmentId]);

  // Pre-populate from existing treatment sheet
  useEffect(() => {
    if (treatmentSheet) {
      treatmentSheetIdRef.current = treatmentSheet.id;
      treatmentSheetVersionRef.current = (treatmentSheet as any).version ?? 0;
    }

    if (treatmentSheet && !isTreatmentSentRef.current && !treatmentPrefillDoneRef.current) {
      treatmentPrefillDoneRef.current = true;
      const firstRow = treatmentSheet.rows?.[0];
      setTreatmentRecommendation((prev) => {
        const sessions = treatmentSheet.planned_sessions ?? treatmentSheet.duration_days;
        let durationDays: TreatmentRecommendationDraft['durationDays'] = prev.durationDays;
        let customDurationDays = prev.customDurationDays;
        if (typeof sessions === 'number' && sessions > 0) {
          if ([7, 14, 21, 30, 45, 60].includes(sessions)) {
            durationDays = sessions as 7 | 14 | 21 | 30 | 45 | 60;
          } else {
            durationDays = 'custom';
            customDurationDays = sessions;
          }
        }

        let extra: Partial<TreatmentRecommendationDraft> = {};
        if (firstRow?.instructions) {
          try {
            const parsed = JSON.parse(firstRow.instructions);
            if (parsed.frequency) extra.frequency = parsed.frequency;
            if (parsed.startPreference) extra.startPreference = parsed.startPreference;
            if (parsed.notesForAdmin !== undefined) extra.notesForAdmin = parsed.notesForAdmin;
          } catch {
            // ignore parse errors
          }
        }

        const next: TreatmentRecommendationDraft = {
          ...prev,
          recommendedTherapy: treatmentSheet.recommended_therapy ?? firstRow?.treatment_description ?? prev.recommendedTherapy,
          notesForAdmin: treatmentSheet.order_notes ?? extra.notesForAdmin ?? prev.notesForAdmin,
          durationDays,
          customDurationDays,
          ...(extra.frequency ? { frequency: extra.frequency } : {}),
          ...(extra.startPreference ? { startPreference: extra.startPreference } : {}),
        };
        treatmentRecommendationRef.current = next;
        return next;
      });

      if (isSentToScheduling((treatmentSheet as any).state)) {
        setIsTreatmentSent(true);
        isTreatmentSentRef.current = true;
      }
    }
  }, [treatmentSheet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const treatmentDocument = episodeDetails?.documents.treatment_sheet;
    const sheetId = treatmentSheet?.id ?? remoteTreatmentSheetId ?? treatmentDocument?.id;
    if (sheetId) {
      treatmentSheetIdRef.current = sheetId;
      const version = (treatmentSheet as any)?.version ?? 0;
      if (version > 0) treatmentSheetVersionRef.current = version;
    }

    const state = (treatmentSheet as any)?.state ?? (treatmentDocument as any)?.state;
    if (isSentToScheduling(state)) {
      setIsTreatmentSent(true);
      isTreatmentSentRef.current = true;
    }
  }, [episodeDetails, remoteTreatmentSheetId, treatmentSheet]);

  const createRecommendationMutation = useCreateTreatmentRecommendationMutation(tenantId);
  const sendToSchedulingMutation = useSendTreatmentOrderToSchedulingMutation();

  const updateTreatmentField = useCallback(
    <K extends keyof TreatmentRecommendationDraft>(key: K, value: TreatmentRecommendationDraft[K]) => {
      setTreatmentRecommendation((prev) => {
        const next = { ...prev, [key]: value };
        treatmentRecommendationRef.current = next;
        return next;
      });
      treatmentDirtyRef.current = true;
      if (isTreatmentSent) {
        setIsTreatmentSent(false);
        isTreatmentSentRef.current = false;
      }
    },
    [isTreatmentSent],
  );

  const sendTreatmentToAdmin = useCallback(async (): Promise<void> => {
    const draft = treatmentRecommendationRef.current;

    if (!draft.recommendedTherapy || !draft.recommendedTherapy.trim()) {
      const msg = 'Please enter the recommended therapy.';
      setTreatmentSaveError(msg);
      throw new Error(msg);
    }

    setIsTreatmentSaving(true);
    setTreatmentSaveError(null);

    const plannedSessions = draft.durationDays === 'custom' ? (draft.customDurationDays ?? 7) : draft.durationDays;

    const toIsoDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const frequencyLabel = (() => {
      switch (draft.frequency) {
        case 'daily': return 'Daily';
        case 'alternate': return 'Alternate days';
        case '3x_week': return '3x / week';
        case 'custom': return draft.customFrequency || 'Custom';
        default: return undefined;
      }
    })();

    const startPref =
      draft.startPreference === 'specific_date' && draft.specificStartDate
        ? `Preferred start: ${toIsoDate(draft.specificStartDate)}`
        : 'Preferred start: ASAP';
    const orderNotes = draft.notesForAdmin?.trim() || undefined;

    try {
      let sheetId = treatmentSheetIdRef.current;

      if (!sheetId) {
        // Backend derives the order's sheet from the client's latest
        // casesheet, so make sure consultation notes have been saved first.
        const casesheetId = await ensureCasesheetExists();
        if (!casesheetId) {
          throw new Error('Please add consultation notes before sending to scheduling.');
        }

        const order = await createRecommendationMutation.mutateAsync({
          client_id: resolvedClientId,
          episode_id: episodeId,
          appointment_id: appointmentId,
          recommended_therapy: draft.recommendedTherapy.trim(),
          planned_sessions: plannedSessions,
          frequency: frequencyLabel,
          preferred_time_window: startPref,
          order_notes: orderNotes,
        });
        treatmentSheetIdRef.current = order.id;
        treatmentSheetVersionRef.current = (order as any).version ?? 0;
      } else {
        const order = await sendToSchedulingMutation.mutateAsync({
          sheetId,
          version: treatmentSheetVersionRef.current,
          payload: {
            order_notes: orderNotes,
            planned_sessions: plannedSessions,
            frequency: frequencyLabel,
            preferred_time_window: startPref,
            recommended_therapy: draft.recommendedTherapy.trim(),
          },
        });
        treatmentSheetVersionRef.current = (order as any).version ?? treatmentSheetVersionRef.current;
      }

      setIsTreatmentSent(true);
      isTreatmentSentRef.current = true;
      treatmentDirtyRef.current = false;
      refetchEpisode();
      if (isFreshnessV1Enabled(features)) {
        await invalidateTreatmentOrderSurfaces(queryClient, tenantId, treatmentSheetIdRef.current ?? undefined);
      } else {
        refetchTreatmentSheet();
      }
    } catch (err: unknown) {
      setTreatmentSaveError(toClinicalWorkspaceError(err, 'Failed to send to scheduling').message);
      throw err;
    } finally {
      setIsTreatmentSaving(false);
    }
  }, [
    tenantId,
    resolvedClientId,
    appointmentId,
    episodeId,
    ensureCasesheetExists,
    refetchEpisode,
    refetchTreatmentSheet,
    queryClient,
    features,
    createRecommendationMutation,
    sendToSchedulingMutation,
  ]);

  // Own unmount-flush — moves with this module (design §6.4).
  useEffect(() => {
    return () => {
      if (treatmentDirtyRef.current && treatmentRecommendationRef.current.recommendedTherapy?.trim()) {
        sendTreatmentToAdmin().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ sendTreatmentToAdmin }), [sendTreatmentToAdmin]);

  const sectionProgress = useMemo<SectionProgress>(
    () => ({ status: computeTreatmentStatus(treatmentRecommendation, isTreatmentSent), saveStatus: 'idle' }),
    [treatmentRecommendation, isTreatmentSent],
  );

  // T-D.1 (ADR-R3A-03): report this module's own already-computed save
  // status for WorkspaceHeader's read-only aggregate — reports the SAME
  // saveStatus this module's own collapsed section already shows
  // (sectionProgress.saveStatus, hardcoded 'idle' above — a pre-existing gap
  // predating this task, logged as Engineering Debt, not fixed here) so the
  // aggregate never shows something this module's own UI doesn't.
  const reportSaveStatus = useReportSaveStatus();
  useEffect(() => {
    reportSaveStatus('treatmentRecommendation', sectionProgress.saveStatus);
  }, [sectionProgress.saveStatus, reportSaveStatus]);

  return (
    <>
      {renderSection(
        'treatmentRecommendation',
        expandedSections,
        onToggleSection,
        sectionProgress,
        <TreatmentRecommendationSection
          draft={treatmentRecommendation}
          isSaving={isTreatmentSaving}
          isSent={isTreatmentSent}
          saveError={treatmentSaveError}
          onUpdate={updateTreatmentField}
          onSendToAdmin={sendTreatmentToAdmin}
          progress={sectionProgress.status}
        />,
      )}
    </>
  );
});

TreatmentRecommendationModule.displayName = 'TreatmentRecommendationModule';
