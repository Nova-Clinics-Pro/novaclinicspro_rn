/**
 * ClinicalServicesModule (R3A · T-B.4, ADR-R3A-02, FR-C2/FR-C3)
 *
 * The first-ever frontend surface for Phase 2's Clinical Services backend
 * capability (design §9.F). Reads appointmentId from Persistent Context
 * (VisitContext) and calls the existing Phase 2 create endpoint — no new
 * backend endpoint, field, or business rule (Non-Goal N-7).
 *
 * Unlike Prescription/Case Sheet (one editable record that accumulates
 * drafts), Clinical Services is an append-only log: each "Record Service"
 * press is a discrete, already-complete action, not a draft you resume
 * editing — the backend schema itself has no draft/versioning concept
 * (design §9.F). So this module has no debounce, no unmount-flush, and no
 * "load existing on mount": there is no single record to load.
 *
 * Session-only list (user-confirmed judgment call, T-B.4 audit): the
 * Clinical Services LIST endpoint only filters by visit_id, and the
 * frontend has no visit_id anywhere (VisitInfo, from the episode-details
 * response every module already reads, only ever carries appointment_id —
 * confirmed against the backend's own VisitInfo schema, app/api/v1/schemas/
 * episode.py). Rather than add a backend field to expose it, this module
 * only shows services recorded in the current session (built from each
 * create() response's own returned visit_id) — no history fetch. Full
 * services-for-this-visit browsing is deferred; if a later phase needs it,
 * it should expose visit_id on VisitInfo then, not here.
 *
 * R7 · T-0.5 (ED-ARCH-001): the write path imported `createClinicalServiceApi`
 * directly from the datasource layer — the sole call site (no other
 * production consumer). Repointed to `useCreateClinicalServiceMutation`
 * (`clinicalServices.repository.impl.ts`), a new, minimal `useMutation`
 * wrapper — no application hook existed at all for Clinical Services
 * writes before this task. No default `onSuccess` on the new hook, so this
 * module's existing conditional (`isFreshnessV1Enabled`-gated)
 * invalidation, and its local session-list append, are both unchanged.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isFreshnessV1Enabled, useFeatures } from '../../../../../core/hooks/useFeatures';
import {
  clinicalServicesKeys,
  useCreateClinicalServiceMutation,
} from '../../../../clinicalServices/data/repositories/clinicalServices.repository.impl';
import { ClinicalServiceResponse } from '../../../../clinicalServices/data/models/clinicalServices.dtos';
import { useEpisodeContext, useVisitContext } from '../../context/ClinicalWorkspaceContext';
import { useReportSaveStatus } from '../../context/WorkspaceSaveStatusContext';
import { SectionKey, SectionProgress, SectionProgressStatus, SectionSaveStatus } from '../../hooks/useConsultationWorkspace';
import { ClinicalServiceDraft, ClinicalServicesSection } from './ClinicalServicesSection';
import { renderSection } from './sectionRenderer';
import { toClinicalWorkspaceError } from '../../../application/clinicalWorkspaceError';

const EMPTY_DRAFT: ClinicalServiceDraft = { service_type: '', description: '' };

function computeClinicalServicesStatus(recordedCount: number, draft: ClinicalServiceDraft): SectionProgressStatus {
  if (recordedCount > 0) return 'complete';
  if (draft.service_type.trim().length > 0) return 'in_progress';
  return 'empty';
}

export interface ClinicalServicesModuleProps {
  expandedSections: Set<SectionKey>;
  onToggleSection: (key: SectionKey) => void;
}

export const ClinicalServicesModule: React.FC<ClinicalServicesModuleProps> = ({ expandedSections, onToggleSection }) => {
  const queryClient = useQueryClient();
  const features = useFeatures();
  const { tenantId } = useEpisodeContext();
  const { appointmentId } = useVisitContext();

  const [draft, setDraft] = useState<ClinicalServiceDraft>(EMPTY_DRAFT);
  const [recordedThisSession, setRecordedThisSession] = useState<ClinicalServiceResponse[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // ── Save status (own copy — CO-3: each module owns its own save state) ──
  const [saveStatus, setSaveStatus] = useState<SectionSaveStatus>('idle');
  const setSectionSaveStatus = useCallback((status: SectionSaveStatus) => {
    setSaveStatus(status);
    if (status === 'saved') {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, []);

  // T-D.1 (ADR-R3A-03): report this module's own already-computed save
  // status for WorkspaceHeader's read-only aggregate — purely additive.
  const reportSaveStatus = useReportSaveStatus();
  useEffect(() => {
    reportSaveStatus('clinicalServices', saveStatus);
  }, [saveStatus, reportSaveStatus]);

  const createServiceMutation = useCreateClinicalServiceMutation(tenantId);

  const recordService = useCallback(async (): Promise<void> => {
    if (!draft.service_type.trim()) return;
    setIsRecording(true);
    setRecordError(null);
    setSectionSaveStatus('saving');
    try {
      const response = await createServiceMutation.mutateAsync({
        appointment_id: appointmentId,
        service_type: draft.service_type.trim(),
        description: draft.description.trim() || undefined,
      });
      setRecordedThisSession((prev) => [...prev, response]);
      setDraft(EMPTY_DRAFT);
      if (isFreshnessV1Enabled(features)) {
        queryClient.invalidateQueries({ queryKey: clinicalServicesKeys.lists() });
      }
      setSectionSaveStatus('saved');
    } catch (err: unknown) {
      setRecordError(toClinicalWorkspaceError(err, 'Save failed').message);
      setSectionSaveStatus('error');
    } finally {
      setIsRecording(false);
    }
  }, [appointmentId, draft, features, queryClient, setSectionSaveStatus, createServiceMutation]);

  const sectionProgress = useMemo<SectionProgress>(
    () => ({ status: computeClinicalServicesStatus(recordedThisSession.length, draft), saveStatus }),
    [recordedThisSession.length, draft, saveStatus],
  );

  return (
    <>
      {renderSection(
        'clinicalServices',
        expandedSections,
        onToggleSection,
        sectionProgress,
        <ClinicalServicesSection
          draft={draft}
          recordedThisSession={recordedThisSession}
          isRecording={isRecording}
          recordError={recordError}
          onChange={setDraft}
          onRecord={recordService}
          progress={sectionProgress.status}
          saveStatus={sectionProgress.saveStatus}
        />,
      )}
    </>
  );
};
