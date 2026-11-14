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
 *
 * Draft protection (supersedes the former silent unmount-flush, FR-A4): a dirty draft registers with the shared
 * unsaved-work registry (core/unsavedWork). Navigation and session boundaries ask the user Save / Discard / Cancel
 * through one dialog before the draft can be lost. This module never saves on unmount and never discards on its own
 * during ordinary navigation. A save is stamped with the identity the draft was created under (tenant, episode,
 * appointment, client, prescription), is single-flight, persists draft data only (it never signs or finalizes), and is
 * refused if the stamped tenant is not the current authenticated tenant. Server data never overwrites an edited draft.
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
  usePrescriptionDraftSaveMutation,
} from '../../../../prescriptions/data/repositories/prescriptions.repository.impl';
import { PrescriptionData } from '../../../../prescriptions/data/models/prescriptions.dtos';
import { useAuth } from '../../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { registerDraft, type UnsavedDraftHandle } from '../../../../../core/unsavedWork/unsavedWorkRegistry';
import { useEpisodeContext, usePatientContext, useVisitContext } from '../../context/ClinicalWorkspaceContext';
import { useReportSaveStatus } from '../../context/WorkspaceSaveStatusContext';
import { SectionKey, SectionProgress, SectionProgressStatus, SectionSaveStatus } from '../../hooks/useConsultationWorkspace';
import { PrescriptionEditingCore } from '../../../../prescriptions/presentation/components/PrescriptionEditingCore';
import { renderSection } from './sectionRenderer';
import { PrescriptionVersionPanel } from '../../../../prescriptions/presentation/components/PrescriptionVersionPanel';
import { toClinicalWorkspaceError } from '../../../application/clinicalWorkspaceError';

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

interface DraftIdentity {
  tenantId: string;
  episodeId: string;
  appointmentId: string;
  clientId: string;
}

interface ServerSync {
  id: string | null;
  data: PrescriptionData;
  status: string | null;
}

let draftRegistrationCounter = 0;

export const PrescriptionModule: React.FC<PrescriptionModuleProps> = ({ expandedSections, onToggleSection, permissions = [] }) => {
  const queryClient = useQueryClient();
  const { colors, spacing, typography } = useClinicTheme();
  const features = useFeatures();
  const { t } = useTranslation();
  const { currentUser, selectedClinicId } = useAuth();
  const { tenantId, episodeId } = useEpisodeContext();
  const { clientId: resolvedClientId } = usePatientContext();
  const { appointmentId } = useVisitContext();
  // The tenant the signed-in user is acting for right now. A draft stamped with any other tenant must not be saved.
  const authenticatedTenantId = selectedClinicId || currentUser?.tenantId || '';

  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>(EMPTY_PRESCRIPTION_DATA);
  const [isPrescriptionSaving, setIsPrescriptionSaving] = useState(false);
  const [prescriptionSaveError, setPrescriptionSaveError] = useState<string | null>(null);
  const [prescriptionNotRequired, setPrescriptionNotRequired] = useState(false);
  const [prescriptionStatus, setPrescriptionStatus] = useState<string | null>(null);
  // True once the user has edited the draft and it has not been saved or discarded. Render-visible twin of the ref.
  const [isDirty, setIsDirty] = useState(false);
  // Snapshot of the last server-driven state change (reset or load); an effect aligns the refs with it.
  const [serverSync, setServerSync] = useState<ServerSync | null>(null);

  // Refs hold what callbacks need synchronously (a save fired in the same tick as an edit must see that edit).
  const prescriptionIdRef = useRef<string | null>(null);
  const prescriptionDataRef = useRef<PrescriptionData>(EMPTY_PRESCRIPTION_DATA);
  const prescriptionStatusRef = useRef<string | null>(null);
  const prescriptionDirtyRef = useRef(false);
  /** Identity the current draft was created under. Set when the draft first becomes dirty. */
  const stampRef = useRef<DraftIdentity | null>(null);
  const identityRef = useRef<DraftIdentity>({ tenantId, episodeId, appointmentId, clientId: resolvedClientId });
  const authTenantRef = useRef(authenticatedTenantId);
  const queryDataRef = useRef<{ items?: { prescription_data?: PrescriptionData }[] } | undefined>(undefined);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const draftHandleRef = useRef<UnsavedDraftHandle | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const discardRef = useRef<() => void>(() => {});
  const translateRef = useRef(t);

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

  // Reset local edit state when the consultation identity changes (adjusted during render, not in an effect). The
  // navigation layer resolves a dirty draft (Save / Discard / Cancel) BEFORE the identity can change, so this never
  // silently discards a draft the user could have kept.
  const identityKey = `${tenantId}|${episodeId}|${appointmentId}`;
  const [syncedIdentity, setSyncedIdentity] = useState<string | null>(null);
  const identityChanged = syncedIdentity !== null && syncedIdentity !== identityKey;
  if (syncedIdentity !== identityKey) {
    setSyncedIdentity(identityKey);
    if (identityChanged && tenantId && appointmentId) {
      setPrescriptionId(null);
      setPrescriptionData(EMPTY_PRESCRIPTION_DATA);
      setPrescriptionNotRequired(false);
      setPrescriptionStatus(null);
      setPrescriptionSaveError(null);
      setIsDirty(false);
      setServerSync({ id: null, data: EMPTY_PRESCRIPTION_DATA, status: null });
    }
  }

  // Load existing prescription for this appointment via the governed
  // application-layer hook (T-0.2 · ED-ARCH-001 — was a direct
  // `axiosClient.get`). Query-key scoping (`prescriptionsKeys.byAppointment`)
  // means React Query itself supersedes any in-flight request when
  // appointmentId changes — no manual cancellation flag needed.
  const prescriptionByAppointmentQuery = usePrescriptionByAppointmentQuery(tenantId, episodeId, appointmentId);
  const queryData = prescriptionByAppointmentQuery.data;

  // Server data -> local draft (adjusted during render when the query data changes, not in an effect). A refetch
  // never overwrites a draft the user has edited; after a reset (identity change) it always applies.
  const [syncedQueryData, setSyncedQueryData] = useState<typeof queryData>(undefined);
  if (queryData !== syncedQueryData) {
    setSyncedQueryData(queryData);
    const items = queryData?.items ?? [];
    if (items.length > 0 && (!isDirty || identityChanged)) {
      const first = items[0];
      const loaded = first.prescription_data ?? EMPTY_PRESCRIPTION_DATA;
      setPrescriptionId(first.id);
      setPrescriptionData(loaded);
      setPrescriptionStatus(first.status);
      setServerSync({ id: first.id, data: loaded, status: first.status });
    }
    // No prescription found (empty items, or the query errored) — start
    // fresh, matching the prior direct-call's catch-all behavior exactly.
  }

  // Align the synchronous refs with a server-driven change (refs cannot be written during render).
  useEffect(() => {
    if (!serverSync) return;
    prescriptionIdRef.current = serverSync.id;
    prescriptionDataRef.current = serverSync.data;
    prescriptionStatusRef.current = serverSync.status;
    prescriptionDirtyRef.current = false;
    stampRef.current = null;
    draftHandleRef.current?.setDirty(false);
  }, [serverSync]);

  // Keep the latest render values reachable from callbacks that outlive a render (save/discard run from the dialog).
  useEffect(() => {
    identityRef.current = { tenantId, episodeId, appointmentId, clientId: resolvedClientId };
    authTenantRef.current = authenticatedTenantId;
    queryDataRef.current = queryData;
    translateRef.current = t;
  });

  // Draft saves carry tenant/ids/payload in their variables (see usePrescriptionDraftSaveMutation). The
  // `isFreshnessV1Enabled` gate continues to suppress ALL cache writes when the flag is off — matching today's exact
  // behavior instead of letting any always-on internal invalidation leak through unconditionally.
  const saveMutation = usePrescriptionDraftSaveMutation({
    onSuccess: (response, variables) => {
      if (isFreshnessV1Enabled(features)) {
        queryClient.setQueryData(prescriptionsKeys.detail(variables.tenantId, response.id), response);
        queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
        queryClient.invalidateQueries({
          queryKey: prescriptionsKeys.byAppointment(
            variables.tenantId,
            variables.create.episode_id,
            variables.create.appointment_id,
          ),
        });
      }
    },
  });

  const registryDirty = () => prescriptionDirtyRef.current && !isPrescriptionDraftEmpty(prescriptionDataRef.current);

  // Single-flight: concurrent saves (dialog Save, the form's Save button, a retry) share one operation. Saves the
  // draft against the identity it was STAMPED with, never against whatever the screen shows now.
  const savePrescription = (): Promise<void> => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    const operation = (async () => {
      if (prescriptionStatusRef.current === 'SIGNED') return;
      const stamp = (prescriptionDirtyRef.current ? stampRef.current : null) ?? identityRef.current;
      setIsPrescriptionSaving(true);
      setPrescriptionSaveError(null);
      setSectionSaveStatus('saving');
      try {
        if (!authTenantRef.current || stamp.tenantId !== authTenantRef.current) {
          throw new Error(translateRef.current('unsavedWork.tenantMismatch'));
        }
        const response = await saveMutation.mutateAsync({
          tenantId: stamp.tenantId,
          prescriptionId: prescriptionIdRef.current,
          create: { client_id: stamp.clientId, episode_id: stamp.episodeId, appointment_id: stamp.appointmentId },
          data: prescriptionDataRef.current,
        });
        const current = identityRef.current;
        const stillCurrent =
          current.tenantId === stamp.tenantId &&
          current.episodeId === stamp.episodeId &&
          current.appointmentId === stamp.appointmentId;
        if (stillCurrent) {
          prescriptionIdRef.current = response.id;
          setPrescriptionId(response.id);
          prescriptionDirtyRef.current = false;
          stampRef.current = null;
          setIsDirty(false);
          draftHandleRef.current?.setDirty(false);
        }
        setSectionSaveStatus('saved');
      } catch (err: unknown) {
        setPrescriptionSaveError(toClinicalWorkspaceError(err, 'Save failed').message);
        setSectionSaveStatus('error');
        throw err;
      } finally {
        setIsPrescriptionSaving(false);
      }
    })();
    const tracked = operation.finally(() => {
      saveInFlightRef.current = null;
    });
    saveInFlightRef.current = tracked;
    return tracked;
  };

  // Explicit discard: back to the last server copy (or empty), draft no longer dirty.
  const discardDraft = () => {
    const first = queryDataRef.current?.items?.[0];
    const loaded = first?.prescription_data ?? EMPTY_PRESCRIPTION_DATA;
    prescriptionDataRef.current = loaded;
    setPrescriptionData(loaded);
    prescriptionDirtyRef.current = false;
    stampRef.current = null;
    setIsDirty(false);
    setPrescriptionSaveError(null);
    draftHandleRef.current?.setDirty(false);
  };

  useEffect(() => {
    saveRef.current = savePrescription;
    discardRef.current = discardDraft;
  });

  // Register with the shared unsaved-work registry for the lifetime of this module instance.
  useEffect(() => {
    const handle = registerDraft({
      id: `prescription-${++draftRegistrationCounter}`,
      label: translateRef.current('unsavedWork.prescriptionDraft'),
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    });
    draftHandleRef.current = handle;
    return () => {
      draftHandleRef.current = null;
      handle.unregister();
    };
  }, []);

  const markPrescriptionNotRequired = () => {
    setPrescriptionNotRequired(true);
    prescriptionDirtyRef.current = false;
    setIsDirty(false);
    draftHandleRef.current?.setDirty(false);
  };

  const onChange = (data: PrescriptionData) => {
    if (!prescriptionDirtyRef.current) {
      stampRef.current = { tenantId, episodeId, appointmentId, clientId: resolvedClientId };
    }
    setPrescriptionData(data);
    prescriptionDataRef.current = data;
    prescriptionDirtyRef.current = true;
    setIsDirty(true);
    draftHandleRef.current?.setDirty(registryDirty());
  };

  // There is deliberately NO unmount save. A dirty draft is resolved (Save / Discard / Cancel) by the navigation
  // layer before the screen can go away; only the saved-status timer is cleaned up here.
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

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
      {!!prescriptionId && <PrescriptionVersionPanel tenantId={tenantId} prescriptionId={prescriptionId} signed={false} canAmend={false} onAmended={() => prescriptionByAppointmentQuery.refetch()} />}
    </>
  );
};
