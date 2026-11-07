/**
 * useConsultationWorkspace
 *
 * R3A · T-B.1/T-B.2/T-B.3: Case Sheet's, Prescription's, and Treatment
 * Recommendation's own state (autosave, create-if-absent, save status, send
 * logic) now live in CaseSheetModule, PrescriptionModule, and
 * TreatmentRecommendationModule respectively — this hook owns none of them
 * anymore.
 *
 * T-0.9 (ED-ARCH-006) removed this hook's own clinical-workflow-assembly
 * helper, its hard-coded canonical section order, and its clinic-type-
 * driven stage-presence gating. That was a second, competing frontend
 * answer to "which workflow stages apply" (DP-15 violation);
 * `ConsultationWorkspaceScreen.tsx` never consumed that helper's output in
 * production (verified — no live reader), so nothing replaces it here.
 * Workflow-stage assembly is backend-owned (the pure clinical workflow
 * resolver, T-BE-B.1); a governed frontend consumption path for it is
 * later frontend work (FE-D), not this task.
 *
 * What remains here: a thin wrapper over useEpisodeWorkspaceData plus the
 * shared SectionKey-family types every module still imports from this file
 * (SectionKey, SectionProgress, SectionSaveStatus,
 * TreatmentRecommendationDraft, etc.) — moving those type exports elsewhere
 * is out of this task's scope (T-B.3 migrates Treatment Recommendation's
 * *state*, not this file's shared type definitions). `SectionProgress`
 * remains presentation-local state only (save/empty/in-progress display),
 * never a visit-level completion answer — that is the backend consultation-
 * completion contract's job (T-BE-F.3), already consumed by
 * CompleteConsultationScreen (T-0.8).
 */

import { useEpisodeWorkspaceData } from './useEpisodeWorkspaceData';
import { EpisodeDetailsResponse } from '../../data/models/episodes.dtos';

// ============================================================
// EXPORTED TYPES
// ============================================================

export type SectionProgressStatus = 'empty' | 'in_progress' | 'complete';
export type SectionSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SectionProgress {
  status: SectionProgressStatus;
  saveStatus: SectionSaveStatus;
}

export type CoreSectionKey = 'chiefComplaint' | 'clinicalNotes' | 'prescription' | 'treatmentRecommendation' | 'clinicalServices';
export type SpecialtySectionKey = 'ayurvedicAssessment';
export type SectionKey = CoreSectionKey | SpecialtySectionKey;

export interface TreatmentRecommendationDraft {
  recommendedTherapy: string;
  frequency: 'daily' | 'alternate' | '3x_week' | 'custom';
  customFrequency?: string;
  durationDays: 7 | 14 | 21 | 30 | 45 | 60 | 'custom';
  customDurationDays?: number;
  startPreference: 'asap' | 'specific_date';
  specificStartDate?: Date;
  notesForAdmin: string;
}

export interface UseConsultationWorkspaceInput {
  tenantId: string;
  episodeId: string;
  appointmentId: string;
  clientId: string;
}

export interface UseConsultationWorkspaceOutput {
  // Data from useEpisodeWorkspaceData
  episodeDetails: EpisodeDetailsResponse | undefined;
  isEpisodeLoading: boolean;
  isEpisodeError: boolean;
  refetchEpisode: () => void;
  clientName: string;
}

// ============================================================
// MAIN HOOK
// ============================================================

export function useConsultationWorkspace(
  input: UseConsultationWorkspaceInput,
): UseConsultationWorkspaceOutput {
  const { tenantId, episodeId, clientId } = input;

  // ── Episode workspace data (read-only, reactive) ──────────────────────────
  // R3A · T-B.1/T-B.3: casesheet/casesheetId/hasCasesheet and treatmentSheet/
  // treatmentSheetId/hasTreatmentSheet/refetchTreatmentSheet removed from
  // this destructure — CaseSheetModule and TreatmentRecommendationModule now
  // read them via useEpisodeContext() (the same underlying
  // useEpisodeWorkspaceData call, relocated to WorkspaceProvider, not
  // duplicated).
  const {
    episodeDetails,
    isEpisodeLoading,
    isEpisodeError,
    refetchEpisode,
    clientName,
  } = useEpisodeWorkspaceData(tenantId, episodeId, clientId);

  return {
    episodeDetails,
    isEpisodeLoading,
    isEpisodeError,
    refetchEpisode,
    clientName,
  };
}
