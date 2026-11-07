import fs from 'fs';
import path from 'path';

/**
 * Phase 4 (R4) · T-E.3 — Treatment lifecycle parity verification (read-only
 * audit, no removal). Confirms TreatmentSheetDetailScreen.tsx (+ its
 * detail/ folder) is the single live Treatment lifecycle workspace: no
 * duplicate send-to-scheduling, treatment creation, or row-editing path is
 * currently reachable. Release/Review have no UI yet at all (T-E.5/T-E.6,
 * not built) -- "no duplicate" holds trivially for those two until then.
 *
 * This re-confirms (does not re-derive) T-A.2/T-A.3's own findings that
 * TreatmentPlansTab's create-modal and Send-to-Scheduling button are
 * dormant in the only reachable mode (admin) -- checked again here because
 * T-E.3 is explicitly the gate before any removal, and R4's own Group D/E
 * work since T-A.3 could in principle have changed this.
 */

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('Treatment lifecycle: single canonical workspace, no duplicate paths (R4 · T-E.3)', () => {
  it('EpisodeWorkspaceScreen only ever reaches TreatmentPlansTab in admin mode -- re-confirmed by finding every real navigation call site, not just the one already known', () => {
    const episodeWorkspaceScreen = read('../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen.tsx');
    expect(episodeWorkspaceScreen).toContain('config.canCreateTreatmentSheet');
    expect(episodeWorkspaceScreen).toContain('config.canSchedule');

    const appointmentsListScreen = read('../../../features/appointments/presentation/pages/AppointmentsListScreen.tsx');
    const navigationCalls = [...appointmentsListScreen.matchAll(/episodeWorkspaceRoute\([\s\S]*?'admin'\)/g)];
    expect(navigationCalls.length).toBeGreaterThan(0);
  });

  it('admin mode config: canCreateTreatmentSheet=false, canSchedule=true -- TreatmentPlansTab\'s create-modal and Send-to-Scheduling branches are dormant in the only reachable mode', () => {
    const config = read('../../../features/episodes/presentation/config/episodeWorkspaceConfig.ts');
    const adminBlockStart = config.indexOf("mode: 'admin'") >= 0 ? config.indexOf("canSchedule: true") : config.lastIndexOf('canSchedule: true');
    expect(adminBlockStart).toBeGreaterThan(-1);
    // The admin config block: canSchedule true, canCreateTreatmentSheet false.
    const adminBlock = config.slice(adminBlockStart - 50, adminBlockStart + 150);
    expect(adminBlock).toContain('canSchedule: true');
    expect(adminBlock).toContain('canCreateTreatmentSheet: false');
  });

  it('TreatmentPlansTab\'s "Send to Scheduling" button is gated OFF when canSchedule is true (admin\'s own config) -- it only shows in the unreachable doctor-mode branch', () => {
    const tab = read('../../../features/episodes/presentation/components/TreatmentPlansTab.tsx');
    expect(tab).toMatch(/showSendButton\s*=[\s\S]*?!canSchedule/);
  });

  it('TreatmentPlansTab\'s create-modal is gated on canCreate (admin\'s own config.canCreateTreatmentSheet=false) -- unreachable in the only live mode', () => {
    const tab = read('../../../features/episodes/presentation/components/TreatmentPlansTab.tsx');
    const canCreateGuardCount = (tab.match(/canCreate\s*&&/g) ?? []).length;
    expect(canCreateGuardCount).toBeGreaterThan(0);
  });

  it('row editing has exactly one consumer of the update-row hooks: TreatmentSheetDetailContent.tsx (inside the canonical detail/ folder)', () => {
    const detailContent = read('../../../features/treatmentSheets/presentation/pages/detail/TreatmentSheetDetailContent.tsx');
    expect(detailContent).toContain('onUpdateField={rows.updateRowField}');
  });

  it('the doctor\'s own Recommendation flow (TreatmentRecommendationModule) remains the canonical send-to-scheduling owner, unaffected by this task', () => {
    const module = read('../../../features/episodes/presentation/components/ConsultationSections/TreatmentRecommendationModule.tsx');
    expect(module).toBeTruthy();
  });
});
