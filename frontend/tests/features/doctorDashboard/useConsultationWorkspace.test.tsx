/**
 * T-0.9 (ED-ARCH-006) target-boundary tests — replaces the pre-T-0.9 suite
 * that characterized `buildSectionConfig`'s Ayurveda-based workflow-stage
 * gating (a frontend clinical-workflow-assembly authority, competing with
 * the backend's own `clinical_workflow_resolver.py`, a DP-15 violation).
 * `buildSectionConfig` is removed outright, not renamed or relocated —
 * these tests prove the target reality (no FE assembly), not a defect
 * being merely documented.
 */
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));

import * as fs from 'fs';
import * as path from 'path';
import { renderHook } from '@testing-library/react-native';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { useConsultationWorkspace } from '../../../features/episodes/presentation/hooks/useConsultationWorkspace';

const HOOK_SOURCE_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/presentation/hooks/useConsultationWorkspace.ts',
);
const source = fs.readFileSync(HOOK_SOURCE_PATH, 'utf8');

const workspaceData = {
  episodeDetails: { episode: { id: 'episode-1', title: 'Back pain' } },
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  clientName: 'Maya Rao',
};

describe('useConsultationWorkspace — regression (unaffected by T-0.9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(workspaceData);
  });

  it('passes episode workspace data through unchanged', () => {
    const { result } = renderHook(() =>
      useConsultationWorkspace({ tenantId: 't1', episodeId: 'episode-1', appointmentId: 'a1', clientId: 'client-1' }),
    );

    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('t1', 'episode-1', 'client-1');
    expect(result.current.episodeDetails).toBe(workspaceData.episodeDetails);
    expect(result.current.isEpisodeLoading).toBe(false);
    expect(result.current.isEpisodeError).toBe(false);
    expect(result.current.clientName).toBe('Maya Rao');
    expect(typeof result.current.refetchEpisode).toBe('function');
  });

  it('surfaces loading and error states unchanged', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...workspaceData, isEpisodeLoading: true, isEpisodeError: true });
    const { result } = renderHook(() =>
      useConsultationWorkspace({ tenantId: 't1', episodeId: 'episode-1', appointmentId: 'a1', clientId: 'client-1' }),
    );
    expect(result.current.isEpisodeLoading).toBe(true);
    expect(result.current.isEpisodeError).toBe(true);
  });
});

describe('useConsultationWorkspace — architecture: no frontend workflow assembly remains (T-0.9 AC 1/2/4)', () => {
  it('no longer exports buildSectionConfig, ConsultationSectionConfig, or a computed sectionConfig field', () => {
    const hookModule = require('../../../features/episodes/presentation/hooks/useConsultationWorkspace');
    expect(hookModule.buildSectionConfig).toBeUndefined();
    expect(source).not.toMatch(/\bbuildSectionConfig\b/);
    expect(source).not.toMatch(/\bConsultationSectionConfig\b/);
    expect(source).not.toMatch(/\bsectionConfig\b/);
  });

  it('computes no activeSections array — no canonical clinical stage order remains', () => {
    expect(source).not.toMatch(/\bactiveSections\b/);
    expect(source).not.toMatch(/\bspecialtySections\b/);
  });

  it('does not import useFeatures/isAyurvedaClinic — no clinic-type-driven workflow-presence gating remains', () => {
    expect(source).not.toMatch(/isAyurvedaClinic/);
    expect(source).not.toMatch(/from ['"].*core\/hooks\/useFeatures['"]/);
  });

  it('the hook output carries no next-action, recommendation, or completion-readiness field', () => {
    for (const forbidden of ['recommendedAction', 'nextAction', 'completionReadiness', 'canComplete', 'clinicallyReady']) {
      expect(source).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });

  it('SectionProgress remains a presentation-only shape (status/saveStatus), not a clinical-completion answer', () => {
    expect(source).toContain('export interface SectionProgress');
    expect(source).toContain('status: SectionProgressStatus');
    expect(source).toContain('saveStatus: SectionSaveStatus');
    // Never expanded into a clinical-truth field on this same interface.
    expect(source).not.toMatch(/interface SectionProgress[^}]*visitComplete/s);
    expect(source).not.toMatch(/interface SectionProgress[^}]*prescriptionRequired/s);
  });

  it('still exports the shared SectionKey-family types every module depends on (unchanged by this task)', () => {
    const hookModule = require('../../../features/episodes/presentation/hooks/useConsultationWorkspace');
    expect(hookModule.useConsultationWorkspace).toBeDefined();
    expect(source).toContain('export type SectionKey');
    expect(source).toContain('export interface TreatmentRecommendationDraft');
  });
});
