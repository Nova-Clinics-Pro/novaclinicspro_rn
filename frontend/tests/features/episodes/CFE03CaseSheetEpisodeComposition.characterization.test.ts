/**
 * C-FE-03 — baseline-only characterization of the current composition.
 *
 * This is intentionally structural: Package C is authorized to record the
 * existing Patient → Appointment → Episode → Case Sheet path, not to change
 * its clinical, navigation, or persistence ownership.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (relativePath: string) =>
  readFileSync(resolve(__dirname, '../../../', relativePath), 'utf8');

describe('C-FE-03 Case-Sheet / Episode composition baseline', () => {
  it('resolves an existing active episode before routing an appointment into the doctor workspace', () => {
    const source = read('features/doctorDashboard/application/caseResolver.ts');

    expect(source).toContain('operations.getAppointment(tenantId, appointmentId)');
    expect(source).toContain('operations.listActiveEpisodes(tenantId, clientId)');
    expect(source).toContain('await operations.attachEpisode(tenantId, appointmentId, episode.id)');
    expect(source).toContain("episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor')");
    expect(source).toContain('startConsultationRoute(appointmentId, clientId)');
  });

  it('creates a consultation episode with the current appointment and preserves all identities in the next route', () => {
    const source = read('features/episodes/presentation/pages/CreateConsultationScreen.tsx');

    expect(source).toContain('client_id: clientId');
    expect(source).toContain('appointment_id: appointmentId');
    expect(source).toContain("episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor', 'assessment')");
    expect(source).toContain("queryKey: ['appointments', 'detail', tenantId, appointmentId]");
  });

  it('keeps the consultation Case Sheet writer behind repository mutation hooks with explicit episode and appointment attribution', () => {
    const source = read('features/episodes/presentation/components/ConsultationSections/CaseSheetModule.tsx');

    expect(source).toContain('useCreateCasesheetMutation');
    expect(source).toContain('useUpdateCasesheetMutation');
    expect(source).toContain('appointment_id: appointmentId');
    expect(source).toContain('episode_id: episodeId');
    // Historical comments intentionally name the retired API functions. Check
    // the executable module boundary, rather than treating that evidence text
    // as an import.
    expect(source).not.toMatch(/from ['"][^'"]*data\/datasources[^'"]*['"]/);
  });

  it('retains read-only summary ownership in CasesheetTab and routes editing through the workspace shell', () => {
    const tabSource = read('features/episodes/presentation/components/CasesheetTab.tsx');
    const workspaceSource = read('features/episodes/presentation/pages/EpisodeWorkspaceScreen.tsx');

    // The header comment records the old duplicate writer. The actual tab
    // must not import the repository mutation module that would make it live.
    expect(tabSource).not.toMatch(/from ['"][^'"]*casesheets\.repository\.impl['"]/);
    expect(tabSource).toContain('onEditCasesheet');
    expect(workspaceSource).toContain('/clinic-admin/clients/${resolvedClientId}/casesheets/${casesheetId}/edit');
    expect(workspaceSource).toContain('episodeWorkspaceConfigByRole[mode]');
  });
});
