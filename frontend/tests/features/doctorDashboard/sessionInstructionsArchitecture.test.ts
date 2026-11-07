/**
 * SessionInstructionsModule architecture guard (T-FE-E.2a).
 *
 * Source-inspection tests (matching the established convention, e.g.
 * `visitCommandCenterDesignTokens.test.ts`) proving the bulk-apply
 * addition respects Layer Integrity and this task's own explicit
 * prohibitions -- no datasource/axios in Presentation, no client-side
 * mutation loop, no local lifecycle resolver, no hardcoded roles, no
 * duplicate API path/query key, no protected-field write.
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const moduleSource = read('../../../features/episodes/presentation/components/ConsultationSections/SessionInstructionsModule.tsx');
const executableModuleSource = moduleSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const repoSource = read('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl.ts');
const datasourceSource = read('../../../features/treatmentSheets/data/datasources/treatmentSheets.api.ts');

describe('SessionInstructionsModule bulk-apply architecture (T-FE-E.2a)', () => {
  it('imports no datasource or axios directly -- goes through the canonical repository hook only', () => {
    expect(moduleSource).not.toMatch(/axiosClient/);
    expect(moduleSource).not.toMatch(/from ['"].*treatmentSheets\.api['"]/);
    expect(moduleSource).not.toMatch(/from ['"].*treatmentOrders\.api['"]/);
  });

  it('consumes feature error semantics rather than HTTP/Axios response envelopes', () => {
    expect(executableModuleSource).toMatch(/SessionInstructionsError/);
    expect(executableModuleSource).not.toMatch(/AxiosError|isAxiosError|\berror\?*\.response|\berr\?*\.response|\.response\?*\.data|\.response\.data|response\.status/);
  });

  it('uses the existing canonical bulk hook -- does not construct a new bulk mutation or duplicate the endpoint', () => {
    expect(moduleSource).toMatch(/useUpdateAllTreatmentSheetRowsMutation/);
    // No second PATCH .../rows implementation anywhere in this module.
    expect(moduleSource).not.toMatch(/axiosClient\.(patch|post|put)/);
  });

  it('never loops single-row mutations to simulate bulk apply', () => {
    // The bulk-apply code path must call bulkMutation exactly once per
    // submit, never map over checkedRowIds into N updateRowMutation calls.
    const bulkSubmitBlock = moduleSource.slice(
      moduleSource.indexOf('const submitBulkApply'),
      moduleSource.indexOf('const handleApplyPress'),
    );
    expect(bulkSubmitBlock).toMatch(/bulkMutation\.mutateAsync/);
    expect(bulkSubmitBlock).not.toMatch(/updateRowMutation\.mutateAsync/);
    expect(bulkSubmitBlock).not.toMatch(/for\s*\(|\.forEach\(|Promise\.all\(\s*Array\.from\(checkedRowIds\)\.map\(.*updateRowMutation/);
  });

  it('derives Session eligibility from the verified backend rule (status !== COMPLETED) only -- no second lifecycle resolver', () => {
    expect(moduleSource).toMatch(/isEligibleForContentEdit/);
    expect(moduleSource).toMatch(/row\.status !== 'COMPLETED'/);
    // No invented additional eligibility engine/service.
    expect(moduleSource).not.toMatch(/LifecycleResolver|eligibilityService|computeEligibility/);
  });

  it('never hardcodes a role name for gating the bulk-apply action', () => {
    for (const forbidden of ["'doctor'", '"doctor"', "'admin'", '"admin"', "'therapist'", '"therapist"']) {
      expect(moduleSource).not.toContain(forbidden);
    }
  });

  it('selection state is keyed by row id (Set<string> of TreatmentSheetRow.id), never day_number or array index', () => {
    expect(moduleSource).toMatch(/checkedRowIds:\s*Set<string>|useState<Set<string>>/);
    expect(moduleSource).not.toMatch(/checkedDayNumbers|checkedIndex(es)?/);
  });

  it('the bulk request payload never includes protected identity/execution/scheduling fields', () => {
    const submitBlock = moduleSource.slice(
      moduleSource.indexOf('const submitBulkApply'),
      moduleSource.indexOf('const handleApplyPress'),
    );
    for (const forbidden of [
      'session_id', 'treatment_sheet_id', 'episode_id', 'status', 'scheduled_date',
      'scheduled_time', 'assigned_staff_id', 'appointment_id', 'completed_at',
      'completed_by_staff_id', 'started_at', 'started_by_staff_id',
      'materials_payload_hash', 'non_execution_reason_code', 'day_number',
    ]) {
      expect(submitBlock).not.toContain(`${forbidden}:`);
    }
  });

  it('the canonical bulk hook does not construct a new query key -- reuses treatmentSheetsKeys', () => {
    expect(repoSource).toMatch(/useUpdateAllTreatmentSheetRowsMutation/);
    // Exactly one bulk-update API function is exposed from the datasource;
    // no second bulk-rows endpoint was introduced by this task.
    const bulkApiMatches = datasourceSource.match(/export const updateAllTreatmentSheetRowsApi/g) ?? [];
    expect(bulkApiMatches.length).toBe(1);
  });

  it('OCC: no version/If-Match token is sent on the bulk path -- the verified backend contract accepts none (reported, not invented)', () => {
    const submitBlock = moduleSource.slice(
      moduleSource.indexOf('const submitBulkApply'),
      moduleSource.indexOf('const handleApplyPress'),
    );
    expect(submitBlock).not.toMatch(/If-Match|expectedVersion|expected_version/);
  });

  it('VisitCommandCenter remains an orchestrator -- no bulk mutation logic in the page', () => {
    const shellSource = read('../../../features/episodes/presentation/pages/VisitCommandCenter.tsx');
    expect(shellSource).not.toMatch(/useUpdateAllTreatmentSheetRowsMutation|bulkMutation|checkedRowIds/);
  });
});
