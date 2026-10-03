/**
 * PrescriptionModule (R3A · T-B.2, ADR-R3A-02)
 *
 * The doctor's existing Prescription section, re-hosted as a workspace
 * module. Reads episodeId/clientId/appointmentId/tenantId from Persistent
 * Context (design §9.D) instead of from props threaded by the parent screen.
 * All save/validation logic below is copied UNCHANGED from
 * useConsultationWorkspace.ts — only its input source changed.
 *
 * Unlike CaseSheetModule (T-B.1), no cross-module bridge is needed:
 * Prescription is explicit-save (no debounce, so nothing for "Save & Submit"
 * to flush) and nothing else in the hook reads prescription state (confirmed
 * by a full grep of useConsultationWorkspace.ts before writing this file).
 * Its own unmount-flush (dirty-ref check + save) moves with it, exactly as
 * CaseSheetModule's did (design §6.4).
 *
 * R7 · T-0.2 (ED-ARCH-001): the read path previously called `axiosClient.get`
 * directly and the write path imported `createPrescriptionApi`/
 * `updatePrescriptionApi` from the datasource layer — both bypassing the
 * governed Presentation → Application → Domain → Infrastructure direction.
 * Repointed to `usePrescriptionByAppointmentQuery`/`useCreatePrescriptionMutation`/
 * `useUpdatePrescriptionMutation` (`prescriptions.repository.impl.ts`) — the
 * exact same application-layer hooks the standalone Prescription screens
 * already use. `usePrescriptionByAppointmentQuery`'s own docstring notes it
 * was built to "match the exact request the consultation workspace
 * currently issues manually" and was "not yet consumed by the workspace" —
 * this task is that wiring. Cache invalidation is reproduced exactly
 * (hook-level `onSuccess` override, not the call-time additive form) so the
 * existing `isFreshnessV1Enabled` gate continues to suppress ALL
 * invalidation when the flag is off, matching prior behavior precisely
 * rather than letting the hooks' own always-on internal invalidation leak
 * through.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { isFreshnessV1Enabled, useFeatures } from '../../../../../core/hooks/useFeatures';
import {
  prescriptionsKeys,
  usePrescriptionByAppointmentQuery,
  useCreatePrescriptionMutation,
  useUpdatePrescriptionMutation,
} from '../../../../prescriptions/data/repositories/prescriptions.repository.impl';
import { PrescriptionData } from '../../../../prescriptions/data/models/prescriptions.dtos';
import { useEpisodeContext, usePatientContext, useVisitContext } from '../../context/ClinicalWorkspaceContext';
import { useReportSaveStatus } from '../../context/WorkspaceSaveStatusContext';
import { SectionKey, SectionProgress, SectionProgressStatus, SectionSaveStatus } from '../../hooks/useConsultationWorkspace';
import { PrescriptionEditingCore } from '../../../../prescriptions/presentation/components/PrescriptionEditingCore';
import { renderSection } from './sectionRenderer';
import { PrescriptionVersionPanel } from '../../../../prescriptions/presentation/components/PrescriptionVersionPanel';

// R3B (T-B.4, ADR-R3B-05): fixed set — reproduces PrescriptionSection's own
// pre-T-B.4 advice-field behavior bit-for-bit (T-0.3 baseline). The
// canonical core's full field set (also notes, next_visit_days) exists, but
// this host only activates the same three fields it always has.
const PRESCRIPTION_MODULE_ACTIVE_ADVICE_FIELDS = ['dietary_advice', 'lifestyle_advice', 'follow_up_instructions'] as const;

const EMPTY_PRESCRIPTION_DATA: PrescriptionData = { medications: [] };

// T-A.3 (FR-A4): gates the unmount-flush auto-save — only worth
// auto-committing if at least one medication has a real name.
function isPrescriptionDraftEmpty(data: PrescriptionData): boolean {
  const meds = data.medications ?? [];
  return meds.every((m) => !m.name?.trim());
}

function computePrescriptionStatus(prescriptionId: string | null, prescriptionNotRequired: boolean): SectionProgressStatus {
  if (!prescriptionId && !prescriptionNotRequired) return 'empty';
  return 'complete';
}

export interface PrescriptionModuleProps {
  expandedSections: Set<SectionKey>;
  onToggleSection: (key: SectionKey) => void;
  permissions?: string[];
}

export const PrescriptionModule: React.FC<PrescriptionModuleProps> = ({ expandedSections, onToggleSection, permissions = [] }) => {
  const queryClient = useQueryClient();
  const { colors, spacing, typography } = useClinicTheme();
  const features = useFeatures();
  const { tenantId, episodeId } = useEpisodeContext();
  const { clientId: resolvedClientId } = usePatientContext();
  const { appointmentId } = useVisitContext();

  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>(EMPTY_PRESCRIPTION_DATA);
  const [isPrescriptionSaving, setIsPrescriptionSaving] = useState(false);
  const [prescriptionSaveError, setPrescriptionSaveError] = useState<string | null>(null);
  const [prescriptionNotRequired, setPrescriptionNotRequired] = useState(false);
  const [prescriptionStatus, setPrescriptionStatus] = useState<string | null>(null);
  const prescriptionIdRef = useRef<string | null>(null);
  const prescriptionDataRef = useRef<PrescriptionData>(EMPTY_PRESCRIPTION_DATA);
  const prescriptionDirtyRef = useRef(false);

  // ── Save status (own copy — CO-3: each module owns its own save state) ──
  const [saveStatus, setSaveStatus] = useState<SectionSaveStatus>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSectionSaveStatus = useCallback((status: SectionSaveStatus) => {
    setSaveStatus(status);
    if (status === 'saved') {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, []);

  // T-D.1 (ADR-R3A-03): report this module's own already-computed save
  // status for WorkspaceHeader's read-only aggregate — purely additive.
  const reportSaveStatus = useReportSaveStatus();
  useEffect(() => {
    reportSaveStatus('prescription', saveStatus);
  }, [saveStatus, reportSaveStatus]);

  // Reset local edit state whenever the active appointment changes (unchanged
  // reset semantics from useConsultationWorkspace.ts — only the load source
  // below changed, T-0.2).
  useEffect(() => {
    if (!tenantId || !appointmentId) return;
    setPrescriptionId(null);
    prescriptionIdRef.current = null;
    setPrescriptionData(EMPTY_PRESCRIPTION_DATA);
    prescriptionDataRef.current = EMPTY_PRESCRIPTION_DATA;
    setPrescriptionNotRequired(false);
    setPrescriptionStatus(null);
    setPrescriptionSaveError(null);
    prescriptionDirtyRef.current = false;
  }, [tenantId, appointmentId, episodeId]);

  // Load existing prescription for this appointment via the governed
  // application-layer hook (T-0.2 · ED-ARCH-001 — was a direct
  // `axiosClient.get`). Query-key scoping (`prescriptionsKeys.byAppointment`)
  // means React Query itself supersedes any in-flight request when
  // appointmentId changes — no manual cancellation flag needed.
  const prescriptionByAppointmentQuery = usePrescriptionByAppointmentQuery(tenantId, episodeId, appointmentId);

  useEffect(() => {
    const items = prescriptionByAppointmentQuery.data?.items ?? [];
    if (items.length > 0) {
      const first = items[0];
      setPrescriptionId(first.id);
      prescriptionIdRef.current = first.id;
      const loaded = first.prescription_data ?? EMPTY_PRESCRIPTION_DATA;
      setPrescriptionData(loaded);
      prescriptionDataRef.current = loaded;
      setPrescriptionStatus(first.status);
    }
    // No prescription found (empty items, or the query errored) — start
    // fresh, matching the prior direct-call's catch-all behavior exactly.
  }, [prescriptionByAppointmentQuery.data]);

  // Both mutations override the hook's own default `onSuccess` (rather than
  // the additive call-time form) so the existing `isFreshnessV1Enabled` gate
  // continues to suppress ALL cache writes when the flag is off — matching
  // today's exact behavior instead of letting the hooks' own always-on
  // internal invalidation leak through unconditionally.
  const createMutation = useCreatePrescriptionMutation(tenantId, {
    onSuccess: (response) => {
      if (isFreshnessV1Enabled(features)) {
        queryClient.setQueryData(prescriptionsKeys.detail(tenantId, response.id), response);
        queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: prescriptionsKeys.byAppointment(tenantId, episodeId, appointmentId),
        });
      }
    },
  });
  const updateMutation = useUpdatePrescriptionMutation(tenantId, prescriptionId ?? '', {
    onSuccess: (response) => {
      if (isFreshnessV1Enabled(features)) {
        queryClient.setQueryData(prescriptionsKeys.detail(tenantId, prescriptionId ?? ''), response);
        queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: prescriptionsKeys.byAppointment(tenantId, episodeId, appointmentId),
        });
      }
    },
  });

  const savePrescription = useCallback(async (): Promise<void> => {
    if (prescriptionStatus === 'SIGNED') return;
    setIsPrescriptionSaving(true);
    setPrescriptionSaveError(null);
    setSectionSaveStatus('saving');
    try {
      if (!prescriptionIdRef.current) {
        const response = await createMutation.mutateAsync({
          client_id: resolvedClientId,
          prescription_data: prescriptionDataRef.current,
          appointment_id: appointmentId,
          episode_id: episodeId,
        });
        setPrescriptionId(response.id);
        prescriptionIdRef.current = response.id;
      } else {
        await updateMutation.mutateAsync({
          prescription_data: prescriptionDataRef.current,
        });
      }
      prescriptionDirtyRef.current = false;
      setSectionSaveStatus('saved');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Save failed';
      setPrescriptionSaveError(msg);
      setSectionSaveStatus('error');
      throw err;
    } finally {
      setIsPrescriptionSaving(false);
    }
  }, [tenantId, resolvedClientId, appointmentId, episodeId, queryClient, setSectionSaveStatus, features, createMutation, updateMutation, prescriptionStatus]);

  const markPrescriptionNotRequired = useCallback(() => {
    setPrescriptionNotRequired(true);
    prescriptionDirtyRef.current = false;
  }, []);

  const onChange = useCallback((data: PrescriptionData) => {
    setPrescriptionData(data);
    prescriptionDataRef.current = data;
    prescriptionDirtyRef.current = true;
  }, []);

  // Own unmount-flush — moves with this module (design §6.4).
  useEffect(() => {
    return () => {
      if (prescriptionDirtyRef.current && !isPrescriptionDraftEmpty(prescriptionDataRef.current)) {
        savePrescription().catch(() => {});
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionProgress = useMemo<SectionProgress>(
    () => ({ status: computePrescriptionStatus(prescriptionId, prescriptionNotRequired), saveStatus }),
    [prescriptionId, prescriptionNotRequired, saveStatus],
  );

  const signedSource = prescriptionStatus === 'SIGNED';
  if (signedSource && prescriptionId) {
    return <PrescriptionVersionPanel tenantId={tenantId} prescriptionId={prescriptionId} signed canAmend={permissions.includes('prescription.amend')} onAmended={() => prescriptionByAppointmentQuery.refetch()} />;
  }

  return (
    <>
      {renderSection(
        'prescription',
        expandedSections,
        onToggleSection,
        sectionProgress,
        <PrescriptionEditingCore
          prescriptionData={prescriptionData}
          isSaving={isPrescriptionSaving}
          saveError={prescriptionSaveError}
          resolvedWithoutSave={prescriptionNotRequired}
          onSave={savePrescription}
          onChange={onChange}
          progress={sectionProgress.status}
          saveStatus={sectionProgress.saveStatus}
          activeAdviceFields={PRESCRIPTION_MODULE_ACTIVE_ADVICE_FIELDS as any}
          extraActions={
            <TouchableOpacity
              onPress={markPrescriptionNotRequired}
              accessibilityRole="button"
              style={{
                minHeight: 44,
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: colors.border.default,
                borderRadius: spacing.sm,
                padding: spacing.sm,
              }}
            >
              <Text style={[typography.button, { color: colors.text.secondary }]}>Mark as Not Required</Text>
            </TouchableOpacity>
          }
        />,
      )}
      {prescriptionId && <PrescriptionVersionPanel tenantId={tenantId} prescriptionId={prescriptionId} signed={false} canAmend={false} onAmended={() => prescriptionByAppointmentQuery.refetch()} />}
    </>
  );
};
