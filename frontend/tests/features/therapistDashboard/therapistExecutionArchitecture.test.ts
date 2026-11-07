/**
 * Therapist execution architecture guard (T-FE-E.3).
 *
 * Source-inspection tests proving the non-execution addition respects
 * Layer Integrity and this task's own explicit prohibitions: no
 * datasource/axios in Presentation, no MISSED lifecycle, no doctor-field
 * mutation, no duplicate endpoint, stable Session id only.
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const screenSource = read('../../../features/therapistDashboard/presentation/pages/TherapistDashboardScreen.tsx');
const modalSource = read('../../../features/therapistDashboard/presentation/components/SessionNonExecutionModal.tsx');
const repoSource = read('../../../features/staffDashboards/data/repositories/staffDashboards.repository.impl.ts');
const datasourceSource = read('../../../features/staffDashboards/data/datasources/staffDashboards.api.ts');

describe('Therapist execution architecture (T-FE-E.3)', () => {
  it('SessionNonExecutionModal imports no datasource or axios directly', () => {
    expect(modalSource).not.toMatch(/axiosClient/);
    expect(modalSource).not.toMatch(/from ['"].*staffDashboards\.api['"]/);
  });

  it('TherapistDashboardScreen (Presentation) imports no axios directly and builds no ad-hoc TanStack Query', () => {
    expect(screenSource).not.toMatch(/axiosClient/);
    expect(screenSource).not.toMatch(/useQuery\(\s*\{/);
    expect(screenSource).not.toMatch(/useMutation\(\s*\{/);
  });

  it('the screen uses the canonical repository hook for non-execution, not a duplicated one', () => {
    expect(screenSource).toMatch(/useRecordSessionNonExecutionMutation/);
  });

  it('exactly one recordSessionNonExecutionApi export exists — no duplicate endpoint', () => {
    const matches = datasourceSource.match(/export const recordSessionNonExecutionApi/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('the non-execution request never contains doctor-authored or protected fields', () => {
    for (const forbidden of [
      'treatment_name', 'treatment_description', 'medicines_text', 'medicines_given',
      'instructions_text', 'instructions', 'day_number', 'session_date', 'therapist_id',
      'completed_by_staff_id', 'started_by_staff_id',
    ]) {
      expect(repoSource).not.toContain(`${forbidden}:`);
    }
  });

  it('no MISSED status/enum is introduced anywhere in the therapist execution surface', () => {
    for (const source of [screenSource, modalSource, repoSource, datasourceSource]) {
      expect(source).not.toMatch(/'MISSED'|"MISSED"|\bMISSED\b\s*[,:]/);
    }
  });

  it('non-execution mutation identifies the Session by its stable row id only', () => {
    const submitBlock = repoSource.slice(
      repoSource.indexOf('export const useRecordSessionNonExecutionMutation'),
      repoSource.indexOf('export const useRecordSessionNonExecutionMutation') + 3000,
    );
    expect(submitBlock).toMatch(/rowId/);
    expect(submitBlock).not.toMatch(/dayNumber|sessionDate|arrayIndex/);
  });

  it('no hardcoded role-name string gates the non-execution or start actions', () => {
    for (const forbidden of ["'doctor'", '"doctor"', "'therapist'", '"therapist"', "'admin'", '"admin"']) {
      expect(modalSource).not.toContain(forbidden);
    }
  });

  it('the exact non-execution route is used, matching the verified backend contract', () => {
    expect(datasourceSource).toMatch(
      /\/api\/v1\/clinic\/treatment-sheets\/rows\/\$\{rowId\}\/non-execution/
    );
  });

  it('the governed reason vocabulary matches the verified backend enum exactly', () => {
    for (const code of ['PATIENT_NO_SHOW', 'PATIENT_CANCELLED', 'CLINIC_CANCELLED', 'CLINICAL_HOLD', 'OTHER']) {
      expect(modalSource).toContain(code);
    }
  });
});
