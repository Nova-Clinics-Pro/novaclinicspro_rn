import fs from 'fs';
import path from 'path';

/**
 * T-FE-C.5 (T-BE-A.3/A.3a, FR-HIST-1/2) — cross-file architecture guard
 * for the Clinical History hierarchy consumption. Extends the T-0.8/T-0.9
 * "no FE clinical derivation" pattern to this task's own files:
 * `useClinicalTimelineData.ts` (application/adapter), `ClinicalTimeline.tsx`
 * (presentation), and the `clinicalWorkspace` data-layer trio (DTOs/
 * datasource/repository). Individual files' own dedicated test files
 * (`useClinicalTimelineData.test.tsx`, `clinicalTimeline.test.tsx`,
 * `clinicalHistoryHierarchyContract.test.ts`) already cover their own
 * narrower source-checks -- this file checks properties that only make
 * sense evaluated across more than one file (no duplicate query key/DTO/
 * API path, no datasource import outside the data layer, no retained
 * fallback to the old flat assembly anywhere in the codebase).
 */

const HOOK_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/presentation/hooks/useClinicalTimelineData.ts',
);
const COMPONENT_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/presentation/components/ClinicalTimeline.tsx',
);
const REPO_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/data/repositories/clinicalWorkspace.repository.impl.ts',
);
const DATASOURCE_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/data/datasources/clinicalWorkspace.api.ts',
);
const DTO_PATH = path.resolve(
  __dirname,
  '../../../features/episodes/data/models/clinicalWorkspace.dtos.ts',
);

// The hook's own docstring intentionally documents, in prose, the retired
// symbols it removed -- stripped here so that explanatory prose can't
// false-positive against the "must not exist in actual code" checks below.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const hookSource = stripComments(fs.readFileSync(HOOK_PATH, 'utf8'));
const componentSource = fs.readFileSync(COMPONENT_PATH, 'utf8');
const repoSource = fs.readFileSync(REPO_PATH, 'utf8');
const datasourceSource = fs.readFileSync(DATASOURCE_PATH, 'utf8');
const dtoSource = fs.readFileSync(DTO_PATH, 'utf8');

describe('Clinical History hierarchy — cross-file architecture (T-FE-C.5)', () => {
  describe('Presentation never touches a datasource or axios (AC-2)', () => {
    it('ClinicalTimeline.tsx imports neither the datasource module nor axiosClient', () => {
      expect(componentSource).not.toMatch(/data\/datasources/);
      expect(componentSource).not.toMatch(/axiosClient/);
    });

    it('ClinicalTimeline.tsx imports only the canonical adapter hook from presentation/hooks', () => {
      expect(componentSource).toMatch(/from ['"]\.\.\/hooks\/useClinicalTimelineData['"]/);
    });
  });

  describe('Application layer (useClinicalTimelineData.ts) never touches a datasource directly', () => {
    it('imports the repository hook only, never the datasource module', () => {
      expect(hookSource).toMatch(/from ['"]\.\.\/\.\.\/data\/repositories\/clinicalWorkspace\.repository\.impl['"]/);
      expect(hookSource).not.toMatch(/from ['"].*data\/datasources.*['"]/);
    });
  });

  describe('No retained fallback to the pre-T-FE-C.5 flat assembly anywhere in the codebase', () => {
    it('no production file still imports the five retired queries for history purposes', () => {
      const retired = [
        'useAppointmentsListQuery',
        'usePrescriptionsListQuery',
        'useTreatmentSheetsByEpisodeQuery',
        'clinicalServicesByVisitQueryOptions',
      ];
      for (const symbol of retired) {
        expect(hookSource).not.toContain(symbol);
      }
    });

    it('the old ClinicalTimelineItemType UI-artifact values (visit/prescription/case_sheet/treatment_recommendation/clinical_service) no longer appear as a type union in the hook', () => {
      // The new backend-encounter-type union replaces them; a residual
      // reference here would mean the old shape was only partially removed.
      expect(hookSource).not.toMatch(/'visit'\s*\|\s*'prescription'/);
    });
  });

  describe('No duplicate DTO, query key, or API path for the Clinical History contract', () => {
    it('exactly one HistoryItemResponse interface exists in the episodes data layer', () => {
      const count = (dtoSource.match(/export interface HistoryItemResponse/g) ?? []).length;
      expect(count).toBe(1);
    });

    it('exactly one getClinicalWorkspaceHistoryApi function exists', () => {
      const count = (datasourceSource.match(/export const getClinicalWorkspaceHistoryApi/g) ?? []).length;
      expect(count).toBe(1);
    });

    it('exactly one useClinicalHistoryQuery hook exists', () => {
      const count = (repoSource.match(/export const useClinicalHistoryQuery/g) ?? []).length;
      expect(count).toBe(1);
    });

    it('the history query key is a distinct branch (not reusing the facts-aggregate detail key\'s exact shape)', () => {
      expect(repoSource).toMatch(/history:\s*\(/);
      expect(repoSource).toMatch(/detail:\s*\(/);
    });
  });

  describe('No clinic-type/specialty gating anywhere in the Clinical History consumption path', () => {
    it('no clinic_type/specialty conditional exists in the hook or component', () => {
      expect(hookSource).not.toMatch(/clinic_type|clinicType|specialty/i);
      expect(componentSource).not.toMatch(/clinic_type|clinicType|specialty/i);
    });
  });

  describe('No mutation capability introduced by this task', () => {
    it('the datasource exposes no create/update/delete for Clinical History', () => {
      expect(datasourceSource).not.toMatch(/postClinicalWorkspaceHistory|updateClinicalWorkspaceHistory|deleteClinicalWorkspaceHistory/);
    });

    it('the repository exposes no mutation hook for Clinical History', () => {
      expect(repoSource).not.toMatch(/useMutation.*[Hh]istory/);
    });
  });
});
