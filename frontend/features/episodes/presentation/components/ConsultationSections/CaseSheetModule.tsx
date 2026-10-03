/**
 * CaseSheetModule (R3A · T-B.1, ADR-R3A-02)
 *
 * The doctor's existing Chief Complaint / Clinical Notes / Ayurvedic
 * Assessment sections, re-hosted as a workspace module. Named CaseSheetModule
 * — not VisitNoteModule — per design.md §2's Reality-Check: what this content
 * persists to is the Episode-owned Case Sheet, not the Visit's own Visit Note
 * fields, despite the "Chief Complaint" label's coincidental overlap with the
 * backend Visit Note field of the same name.
 *
 * Reads episodeId/clientId/appointmentId/tenantId from Persistent Context
 * (design §9.C) instead of from props threaded by the parent screen. All
 * save/debounce/validation logic below is copied UNCHANGED from
 * useConsultationWorkspace.ts — only its input source changed (design §4:
 * "What changes is only *where it gets* episodeId/appointmentId/patientId/
 * visitId from").
 *
 * Exposes flushPendingAutosave() and ensureCasesheetExists() via ref — a
 * temporary bridge (user-confirmed, T-B.1) so the still-centralized
 * useConsultationWorkspace.ts can keep triggering a forced casesheet save
 * from sendTreatmentToAdmin() (an existing, load-bearing cross-module
 * dependency found during this task's audit: the backend derives a
 * treatment order's sheet from the client's latest casesheet). This bridge
 * is expected to be removed once Treatment Recommendation itself migrates
 * (T-B.3).
 *
 * R7 · T-0.3 (ED-ARCH-001): the write path imported `createCasesheetApi`/
 * `updateCasesheetApi` directly from the datasource layer — the read side
 * has no violation (existing casesheet data is already context-provided via
 * `useEpisodeContext()`, never fetched by this component). Repointed to
 * `useCreateCasesheetMutation`/`useUpdateCasesheetMutation`
 * (`casesheets.repository.impl.ts`) — the same hooks `CreateCasesheetScreen`/
 * `CasesheetEditScreen` already use. Cache invalidation is reproduced via a
 * hook-level `onSuccess` override (not the additive call-time form) to
 * preserve today's exact — and asymmetric — behavior: CREATE invalidates
 * only `casesheetsKeys.list(tenantId, clientId)` and unconditionally calls
 * `refetchEpisode()`; UPDATE sets the detail cache and invalidates the
 * broader `casesheetsKeys.lists()`. Both remain gated by
 * `isFreshnessV1Enabled`, exactly as before.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeatures, isAyurvedaClinic, isFreshnessV1Enabled } from '../../../../../core/hooks/useFeatures';
import {
  casesheetsKeys,
  useCreateCasesheetMutation,
  useUpdateCasesheetMutation,
} from '../../../../casesheets/data/repositories/casesheets.repository.impl';
import { CasesheetFormData } from '../../../../casesheets/presentation/components/CasesheetForm';
import { useEpisodeContext, usePatientContext, useVisitContext } from '../../context/ClinicalWorkspaceContext';
import { useReportSaveStatus } from '../../context/WorkspaceSaveStatusContext';
import {
  SectionKey,
  SectionProgress,
  SectionProgressStatus,
  SectionSaveStatus,
} from '../../hooks/useConsultationWorkspace';
import { ChiefComplaintSection } from '../../../../casesheets/presentation/components/ChiefComplaintSection';
import { ClinicalNotesSection } from '../../../../casesheets/presentation/components/ClinicalNotesSection';
import { CaseSheetExtensionsSection } from '../../../../casesheets/presentation/components/CaseSheetExtensionsSection';
import { renderSection } from './sectionRenderer';
import { CaseSheetContributionHistory } from './CaseSheetContributionHistory';
import { CaseSheetVersionPanel } from '../../../../casesheets/presentation/components/CaseSheetVersionPanel';

// R3B (T-B.1, ADR-R3B-05): fixed set, no add/remove — reproduces
// AyurvedicAssessmentSection's own pre-T-B.1 behavior bit-for-bit (T-0.2
// baseline). The canonical core's full four-template registry (vitals,
// prakriti, nadi_pariksha, custom) also exists, but this host only
// activates the same two templates it always has.
const AYURVEDIC_ASSESSMENT_ACTIVE_TEMPLATE_IDS = ['prakriti', 'nadi_pariksha'];

const EMPTY_CASESHEET_DATA: CasesheetFormData = { basic: {}, extensions: [] };

const CASESHEET_SECTION_KEYS: SectionKey[] = ['chiefComplaint', 'clinicalNotes', 'ayurvedicAssessment'];

function normalizeCasesheetData(casesheet: any): CasesheetFormData {
  const dataJson = casesheet.data_json ?? casesheet.data ?? {};
  const basic = dataJson.basic ?? dataJson;
  return {
    basic: {
      ...basic,
      chief_complaint: basic.chief_complaint ?? casesheet.chief_complaint ?? undefined,
      provisional_diagnosis: basic.provisional_diagnosis ?? casesheet.provisional_diagnosis ?? undefined,
      final_diagnosis: basic.final_diagnosis ?? casesheet.final_diagnosis ?? undefined,
    },
    extensions: dataJson.extensions ?? casesheet.extensions ?? [],
  };
}

function isCasesheetDraftEmpty(data: CasesheetFormData): boolean {
  const b = data.basic;
  const hasBasic =
    !!b.chief_complaint?.trim() ||
    !!b.subjective?.trim() ||
    !!b.objective?.trim() ||
    !!b.assessment?.trim() ||
    !!b.plan?.trim() ||
    !!b.provisional_diagnosis?.trim() ||
    !!b.final_diagnosis?.trim();
  if (hasBasic) return false;
  if (data.extensions && data.extensions.length > 0) {
    return data.extensions.every((ext) => Object.values(ext.data || {}).every((v) => !String(v ?? '').trim()));
  }
  return true;
}

function computeChiefComplaintStatus(data: CasesheetFormData): SectionProgressStatus {
  const val = data.basic.chief_complaint?.trim() ?? '';
  return val ? 'complete' : 'empty';
}

function computeClinicalNotesStatus(data: CasesheetFormData): SectionProgressStatus {
  const b = data.basic;
  const fields = [b.subjective, b.objective, b.assessment, b.plan, b.provisional_diagnosis, b.final_diagnosis];
  const filled = fields.filter((f) => !!f?.trim()).length;
  if (filled === 0) return 'empty';
  if (filled < 6) return 'in_progress';
  return 'complete';
}

function computeAyurvedicAssessmentStatus(data: CasesheetFormData): SectionProgressStatus {
  const prakritiExt = data.extensions?.find((e) => e.template_id === 'prakriti');
  const nadiExt = data.extensions?.find((e) => e.template_id === 'nadi_pariksha');

  const prakritiHasData = prakritiExt
    ? Object.values(prakritiExt.data || {}).some((v) => !!String(v ?? '').trim())
    : false;
  const nadiHasData = nadiExt ? Object.values(nadiExt.data || {}).some((v) => !!String(v ?? '').trim()) : false;

  if (!prakritiHasData && !nadiHasData) return 'empty';

  const prakritiFields = ['vata', 'pitta', 'kapha', 'dominant_dosha'];
  const nadiFields = ['nadi_type', 'nadi_gati', 'nadi_bala', 'observations'];

  const prakritiComplete = prakritiFields.every((f) => !!String(prakritiExt?.data?.[f] ?? '').trim());
  const nadiComplete = nadiFields.every((f) => !!String(nadiExt?.data?.[f] ?? '').trim());

  if (prakritiComplete && nadiComplete) return 'complete';
  return 'in_progress';
}

export interface CaseSheetModuleHandle {
  /** Awaited by "Save & Submit" before navigating away — same behavior as the pre-T-B.1 hook's own flushPendingAutosave. */
  flushPendingAutosave: () => Promise<void>;
  /** Transitional bridge (T-B.1) for sendTreatmentToAdmin's existing casesheet dependency — removed when Treatment Recommendation migrates (T-B.3). */
  ensureCasesheetExists: () => Promise<string | null>;
}

export interface CaseSheetModuleProps {
  expandedSections: Set<SectionKey>;
  onToggleSection: (key: SectionKey) => void;
  permissions?: string[];
}

export const CaseSheetModule = forwardRef<CaseSheetModuleHandle, CaseSheetModuleProps>(
  ({ expandedSections, onToggleSection, permissions = [] }, ref) => {
    const queryClient = useQueryClient();
    const features = useFeatures();
    const {
      tenantId,
      episodeId,
      refetchEpisode,
      casesheet: remoteCasesheet,
      casesheetId: remoteCasesheetId,
      hasCasesheet,
    } = useEpisodeContext();
    const { clientId: resolvedClientId } = usePatientContext();
    const { appointmentId } = useVisitContext();

    // ── Casesheet local draft (unchanged from useConsultationWorkspace.ts) ──
    const [casesheetData, setCasesheetData] = useState<CasesheetFormData>(EMPTY_CASESHEET_DATA);
    const casesheetDataRef = useRef<CasesheetFormData>(EMPTY_CASESHEET_DATA);
    const [isCasesheetSaving, setIsCasesheetSaving] = useState(false);
    const [casesheetSaveError, setCasesheetSaveError] = useState<string | null>(null);

    const casesheetIdRef = useRef<string | null>(null);
    const [casesheetId, setCasesheetId] = useState<string | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const workspaceKeyRef = useRef(`${episodeId}:${appointmentId}`);

    useEffect(() => {
      const nextKey = `${episodeId}:${appointmentId}`;
      if (workspaceKeyRef.current === nextKey) return;

      workspaceKeyRef.current = nextKey;
      casesheetIdRef.current = null;
      setCasesheetId(null);
      casesheetDataRef.current = EMPTY_CASESHEET_DATA;
      setCasesheetData(EMPTY_CASESHEET_DATA);
      setCasesheetSaveError(null);
    }, [episodeId, appointmentId]);

    useEffect(() => {
      if (remoteCasesheetId && !casesheetIdRef.current) {
        casesheetIdRef.current = remoteCasesheetId;
        setCasesheetId(remoteCasesheetId);
      } else if (!remoteCasesheetId && !hasCasesheet) {
        casesheetIdRef.current = null;
        setCasesheetId(null);
      }
    }, [remoteCasesheetId, hasCasesheet]);

    const initialSyncDoneRef = useRef(false);
    useEffect(() => {
      initialSyncDoneRef.current = false;
    }, [episodeId, appointmentId]);

    useEffect(() => {
      if (remoteCasesheet && !initialSyncDoneRef.current) {
        const remoteDraftEmpty = isCasesheetDraftEmpty(casesheetDataRef.current);
        if (remoteDraftEmpty) {
          const loaded = normalizeCasesheetData(remoteCasesheet);
          setCasesheetData(loaded);
          casesheetDataRef.current = loaded;
          initialSyncDoneRef.current = true;
        }
      }
    }, [remoteCasesheet]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Save status (own copy — CO-3: each module owns its own save state) ──
    const [saveStatuses, setSaveStatuses] = useState<Partial<Record<SectionKey, SectionSaveStatus>>>({});
    const savedTimerRefs = useRef<Partial<Record<SectionKey, ReturnType<typeof setTimeout>>>>({});

    // T-D.1 (ADR-R3A-03): report this module's own already-computed save
    // status for WorkspaceHeader's read-only aggregate — purely additive,
    // does not affect anything above (CO-3 unchanged).
    const reportSaveStatus = useReportSaveStatus();
    useEffect(() => {
      Object.entries(saveStatuses).forEach(([key, status]) => {
        if (status) reportSaveStatus(key as SectionKey, status);
      });
    }, [saveStatuses, reportSaveStatus]);

    const setSectionSaveStatus = useCallback((key: SectionKey, status: SectionSaveStatus) => {
      setSaveStatuses((prev) => ({ ...prev, [key]: status }));
      if (status === 'saved') {
        const existing = savedTimerRefs.current[key];
        if (existing) clearTimeout(existing);
        savedTimerRefs.current[key] = setTimeout(() => {
          setSaveStatuses((prev) => ({ ...prev, [key]: 'idle' }));
        }, 2000);
      }
    }, []);

    const activeSections = useMemo<SectionKey[]>(
      () => ['chiefComplaint', 'clinicalNotes', ...(isAyurvedaClinic(features) ? (['ayurvedicAssessment'] as SectionKey[]) : [])],
      [features],
    );

    const createMutation = useCreateCasesheetMutation(tenantId, resolvedClientId, {
      onSuccess: (response) => {
        refetchEpisode();
        if (isFreshnessV1Enabled(features)) {
          queryClient.setQueryData(casesheetsKeys.detail(tenantId, response.id), response);
          queryClient.invalidateQueries({ queryKey: casesheetsKeys.list(tenantId, resolvedClientId) });
        }
      },
    });
    const updateMutation = useUpdateCasesheetMutation(tenantId, casesheetId ?? '', {
      onSuccess: (response) => {
        if (isFreshnessV1Enabled(features)) {
          queryClient.setQueryData(casesheetsKeys.detail(tenantId, casesheetId ?? ''), response);
          queryClient.invalidateQueries({ queryKey: casesheetsKeys.lists() });
        }
      },
    });

    const performAutosave = useCallback(async (): Promise<void> => {
      // T-FE-E.1a (T-BE-C.2, FR-CS-2): never send an unattributed write.
      // Missing appointmentId means the current-Visit context this write
      // would be attributed to cannot be established — preserve the
      // draft locally, surface the module's own existing error
      // convention, and do not create a second Case Sheet by falling
      // through to the create branch below.
      if (!appointmentId) {
        setCasesheetSaveError('Missing current appointment context');
        activeSections.forEach((k) => setSectionSaveStatus(k, 'error'));
        return;
      }

      const draft = casesheetDataRef.current;
      activeSections.forEach((k) => setSectionSaveStatus(k, 'saving'));
      setIsCasesheetSaving(true);

      try {
        if (!casesheetIdRef.current) {
          const response = await createMutation.mutateAsync({
            clinic_type: features.clinic_type as any,
            data_json: draft,
            appointment_id: appointmentId,
            episode_id: episodeId,
          });
          casesheetIdRef.current = response.id;
          setCasesheetId(response.id);
        } else {
          // T-FE-E.1a (T-BE-C.2, FR-CS-2): supply the explicit current-
          // Visit context on every update, not just create -- the
          // backend already accepts and requires this to attribute the
          // contribution to the Visit the write actually happened
          // during, not the Case Sheet's original creation Visit.
          await updateMutation.mutateAsync({ data_json: draft, appointment_id: appointmentId });
        }

        setCasesheetSaveError(null);
        activeSections.forEach((k) => setSectionSaveStatus(k, 'saved'));
      } catch (err: any) {
        const msg = err?.response?.data?.detail ?? err?.message ?? 'Save failed';
        setCasesheetSaveError(msg);
        activeSections.forEach((k) => setSectionSaveStatus(k, 'error'));
        throw err;
      } finally {
        setIsCasesheetSaving(false);
      }
    }, [appointmentId, episodeId, features, activeSections, setSectionSaveStatus, createMutation, updateMutation]);

    const scheduleAutosave = useCallback(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        performAutosave().catch(() => {});
      }, 1000);
    }, [performAutosave]);

    const flushPendingAutosave = useCallback(async (): Promise<void> => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        await performAutosave();
      }
    }, [performAutosave]);

    const ensureCasesheetExists = useCallback(async (): Promise<string | null> => {
      if (!casesheetIdRef.current) {
        await performAutosave();
      }
      return casesheetIdRef.current;
    }, [performAutosave]);

    useImperativeHandle(ref, () => ({ flushPendingAutosave, ensureCasesheetExists }), [
      flushPendingAutosave,
      ensureCasesheetExists,
    ]);

    // Own unmount-flush — moves with this module (design §6.4), independent
    // of useConsultationWorkspace.ts's own remaining (prescription/treatment)
    // unmount cleanup.
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
          performAutosave().catch(() => {});
        }
        Object.values(savedTimerRefs.current).forEach((t) => {
          if (t) clearTimeout(t);
        });
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const updateCasesheetField = useCallback(
      (path: string, value: string) => {
        setCasesheetData((prev) => {
          const next: CasesheetFormData = { ...prev, basic: { ...prev.basic, [path]: value } };
          casesheetDataRef.current = next;
          return next;
        });
        setCasesheetSaveError(null);
        scheduleAutosave();
      },
      [scheduleAutosave],
    );

    const updateExtensionField = useCallback(
      (templateId: string, fieldId: string, value: string) => {
        if (!activeSections.includes('ayurvedicAssessment')) return;
        setCasesheetData((prev) => {
          const extensions = prev.extensions ? [...prev.extensions] : [];
          const idx = extensions.findIndex((e) => e.template_id === templateId);
          if (idx >= 0) {
            extensions[idx] = { ...extensions[idx], data: { ...extensions[idx].data, [fieldId]: value } };
          } else {
            extensions.push({ template_id: templateId, data: { [fieldId]: value } });
          }
          const next: CasesheetFormData = { ...prev, extensions };
          casesheetDataRef.current = next;
          return next;
        });
        setCasesheetSaveError(null);
        scheduleAutosave();
      },
      [scheduleAutosave, activeSections],
    );

    const sectionProgress = useMemo<Partial<Record<SectionKey, SectionProgress>>>(() => {
      const result: Partial<Record<SectionKey, SectionProgress>> = {};
      for (const section of activeSections) {
        const saveStatus: SectionSaveStatus = saveStatuses[section] ?? 'idle';
        let status: SectionProgressStatus;
        switch (section) {
          case 'chiefComplaint':
            status = computeChiefComplaintStatus(casesheetData);
            break;
          case 'clinicalNotes':
            status = computeClinicalNotesStatus(casesheetData);
            break;
          case 'ayurvedicAssessment':
            status = computeAyurvedicAssessmentStatus(casesheetData);
            break;
          default:
            status = 'empty';
        }
        result[section] = { status, saveStatus };
      }
      return result;
    }, [activeSections, casesheetData, saveStatuses]);

    const signedSource = remoteCasesheet?.status === 'SIGNED';
    if (signedSource && casesheetId) {
      return <CaseSheetVersionPanel tenantId={tenantId} casesheetId={casesheetId} signed canAmend={permissions.includes('casesheet.amend')} onAmended={refetchEpisode} />;
    }

    return (
      <>
        {renderSection(
          'chiefComplaint',
          expandedSections,
          onToggleSection,
          sectionProgress.chiefComplaint,
          <ChiefComplaintSection
            value={casesheetData.basic.chief_complaint ?? ''}
            onChange={(value) => updateCasesheetField('chief_complaint', value)}
            progress={sectionProgress.chiefComplaint?.status ?? 'empty'}
            saveStatus={sectionProgress.chiefComplaint?.saveStatus ?? 'idle'}
          />,
        )}
        {renderSection(
          'clinicalNotes',
          expandedSections,
          onToggleSection,
          sectionProgress.clinicalNotes,
          <ClinicalNotesSection
            data={casesheetData.basic}
            onChange={updateCasesheetField}
            progress={sectionProgress.clinicalNotes?.status ?? 'empty'}
            saveStatus={sectionProgress.clinicalNotes?.saveStatus ?? 'idle'}
          />,
        )}
        {activeSections.includes('ayurvedicAssessment') &&
          renderSection(
            'ayurvedicAssessment',
            expandedSections,
            onToggleSection,
            sectionProgress.ayurvedicAssessment,
            <CaseSheetExtensionsSection
              title="Ayurvedic Assessment"
              extensions={casesheetData.extensions}
              activeTemplateIds={AYURVEDIC_ASSESSMENT_ACTIVE_TEMPLATE_IDS}
              allowAddRemove={false}
              onChange={updateExtensionField}
              progress={sectionProgress.ayurvedicAssessment?.status ?? 'empty'}
              saveStatus={sectionProgress.ayurvedicAssessment?.saveStatus ?? 'idle'}
            />,
          )}
        {/* T-FE-E.1b: read-only, append-only history of prior Visit
            contributions -- never a SectionKey (no save/progress
            semantics), never editable, never merged into the draft
            above. */}
        <CaseSheetContributionHistory />
        {casesheetId && <CaseSheetVersionPanel tenantId={tenantId} casesheetId={casesheetId} signed={false} canAmend={false} onAmended={refetchEpisode} />}
      </>
    );
  },
);

CaseSheetModule.displayName = 'CaseSheetModule';
