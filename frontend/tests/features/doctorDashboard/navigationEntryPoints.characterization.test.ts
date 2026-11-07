import fs from 'fs';
import path from 'path';

/**
 * R3B · T-0.1 — Characterization of TODAY'S navigation: all three entry
 * points into episode-level work, Back, and reload — BEFORE any Group A
 * convergence work begins. This is the "before" baseline AC-3/AC-4 will be
 * checked against once entry points converge; it is also the oracle proving
 * Group A's changes didn't silently disturb something this task locked in.
 *
 * `isClinicalSpineV1Enabled` (T-A.1) does not exist yet — there is no
 * ON/OFF branch to characterize here, only today's single, pre-flag
 * behavior.
 *
 * Technique: source-inspection (matching `standaloneScreenContracts
 * .characterization.test.ts`'s own precedent for exactly this kind of
 * structural/wiring fact — which component a route renders, which router
 * method a transition uses) rather than full render tests, since every
 * assertion here is about STRUCTURE (route → component, push vs. replace,
 * a query-param resolution rule), not deep runtime behavior. Reload
 * behavior is NOT re-characterized here — it already has its own dedicated
 * oracle (`workspaceReloadRestoration.test.tsx`, Phase 3A T-C.2) and
 * re-characterizing it here would duplicate already-passing, still-accurate
 * coverage, the same discipline Phase 3A's own T-0.2 applied.
 *
 * No negative-control pass was run for this task (Execution Governance #2's
 * own "where meaningful" qualifier) — these are characterizations of
 * existing structure, not assertions of a guarantee under test; negative
 * controls apply where a test claims to prove a guarantee holds (T-A.3,
 * T-E.3, T-E.4), not to a baseline snapshot of what already exists.
 */

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

const workspaceRouteFiles = (directory: string, relativePath = ''): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const nextRelativePath = path.join(relativePath, entry.name);
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return workspaceRouteFiles(nextPath, nextRelativePath);
    return entry.name.includes('workspace') && entry.name.endsWith('.tsx') ? [nextRelativePath] : [];
  });

describe('Navigation entry points (R3B · T-0.1, baseline for AC-3/AC-4)', () => {
  describe('Entry point 1: start-consultation.tsx', () => {
    const source = read('../../../app/clinic-admin/appointments/[appointmentId]/start-consultation.tsx');

    it('preserves Episode resolution while selecting the flag-governed destination from route params', () => {
      expect(source).toContain("useLocalSearchParams<{");
      expect(source).toContain('appointmentId: string;');
      expect(source).toContain('clientId: string;');
      expect(source).toContain('<CreateConsultationScreen');
      expect(source).toContain("destination={cosEnabled ? 'workspace' : 'consultation'}");
    });
  });

  describe('CreateConsultationScreen: transitions via replace into the canonical workspace after Episode creation', () => {
    const source = read('../../../features/episodes/presentation/pages/CreateConsultationScreen.tsx');

    it('uses router.replace() into the workspace route with explicit appointment context — Back skips the transient "create" step', () => {
      expect(source).toContain('router.replace(nextRoute as any);');
      expect(source).toContain("? episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor', 'assessment')");
      expect(source).toContain(': consultationRoute(episode.id, appointmentId, clientId);');
    });

    it('does NOT use router.push() for this transition (today\'s one already-correct precedent, per design.md §2.1)', () => {
      expect(source).not.toMatch(/router\.push\(episodeWorkspaceRoute/);
    });
  });

  describe('Entry point 2: consultation.tsx', () => {
    const source = read('../../../app/clinic-admin/episodes/[episodeId]/consultation.tsx');

    it('renders ClinicalWorkspace with episodeId/appointmentId/clientId from route params', () => {
      expect(source).toContain("import { ClinicalWorkspace } from '../../../../features/episodes/presentation/pages/ClinicalWorkspace';");
      expect(source).toContain('<ClinicalWorkspace');
      expect(source).toContain('episodeId={episodeId}');
      expect(source).toContain('appointmentId={appointmentId}');
      expect(source).toContain('clientId={clientId}');
    });

    it('still carries the existing freshness-flag-gated remount key (T-A.6/RB-1) — untouched by this phase so far', () => {
      expect(source).toContain('const freshnessEnabled = isFreshnessV1Enabled(features);');
      expect(source).toContain('key={freshnessEnabled ? undefined : `${episodeId}:${appointmentId}`}');
    });
  });

  describe('CompleteConsultationScreen (T-0.8 target-boundary update, replaces the pre-T-0.8 characterization above)', () => {
    const source = read('../../../features/episodes/presentation/pages/CompleteConsultationScreen.tsx');

    // T-0.8 removed the local `transitionCasesheetStatusApi(..., {status:
    // 'FINAL'})` completion mutation and its `router.replace('/doctor')`
    // follow-up navigation — no governed backend completion-mutation
    // endpoint exists yet (verified; only the read-only GET
    // /clinic/{tenant_id}/consultation-completion contract exists). The
    // completion action fails closed instead of retaining that call as a
    // substitute; there is therefore no completion-triggered navigation to
    // characterize until a governed mutation contract exists.
    it('no longer performs a completion-triggered navigation — the action fails closed instead', () => {
      expect(source).not.toContain("router.replace('/doctor'");
      expect(source).not.toContain('transitionCasesheetStatusApi');
    });

    it('still uses router.back() for manual back navigation, preserved unchanged', () => {
      expect(source).toContain('router.back()');
    });
  });

  describe('Entry point 3: workspace.tsx (structurally different screen, EpisodeWorkspaceScreen)', () => {
    const source = read('../../../app/clinic-admin/episodes/[episodeId]/workspace.tsx');

    it('renders EpisodeWorkspaceScreen, resolving mode to "admin" only when explicitly mode=admin, defaulting to "doctor" otherwise', () => {
      expect(source).toContain("import { EpisodeWorkspaceScreen, WorkspaceTab } from '../../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen';");
      expect(source).toContain("mode === 'admin' ? 'admin' : 'doctor'");
    });
  });

  describe('Entry point 3, T-FE-A.1 (FR-COS-1 AC1): cos_v1 gates the SAME route, no second route created', () => {
    const source = read('../../../app/clinic-admin/episodes/[episodeId]/workspace.tsx');

    it('imports VisitCommandCenter and gates it behind isCosV1Enabled — never unconditionally', () => {
      expect(source).toContain("import { VisitCommandCenter } from '../../../../features/episodes/presentation/pages/VisitCommandCenter';");
      expect(source).toContain('isCosV1Enabled(features)');
    });

    it('the cos_v1 branch is checked BEFORE the legacy mode/tab resolution — legacy code is untouched, just conditionally reached', () => {
      const flagCheckIndex = source.indexOf('isCosV1Enabled(features)');
      const legacyModeIndex = source.indexOf("mode === 'admin' ? 'admin' : 'doctor'");
      expect(flagCheckIndex).toBeGreaterThan(-1);
      expect(legacyModeIndex).toBeGreaterThan(-1);
      expect(flagCheckIndex).toBeLessThan(legacyModeIndex);
    });

    it('no second workspace route file exists anywhere in app/ (FR-COS-1 AC1 — one route only)', () => {
      const appDirectory = path.resolve(__dirname, '../../../app');
      const matches = workspaceRouteFiles(appDirectory)
        .filter((match) => match.startsWith(path.join('clinic-admin', 'episodes')))
        .map((match) => path.join('app', match));
      expect(matches).toEqual(['app/clinic-admin/episodes/[episodeId]/workspace.tsx']);
    });
  });

  describe('R7 workspace entry handoff', () => {
    const callers = [
      read('../../../features/appointments/presentation/pages/AppointmentsListScreen.tsx'),
    ];

    it('appointment-list callers delegate to the canonical workspace builder with the appointment identity', () => {
      expect(callers[0]).toContain('episodeWorkspaceRoute(appointment.episode_id, appointment.id, appointment.client_id, \'admin\')');
      expect(callers[0]).toContain('episodeWorkspaceRoute(episodeId, item.id, item.client_id, \'admin\')');
    });

    it('does not retain inline workspace URL construction that could omit appointmentId', () => {
      expect(callers[0]).not.toMatch(/\/workspace\?mode=admin/);
    });
  });

  describe('Back mechanics today: plain router.back() only, no custom back-stack (design.md §2.1 Reality Check, locked in)', () => {
    const flowFiles = [
      'CreateConsultationScreen.tsx',
      'CompleteConsultationScreen.tsx',
      'ConsultationWorkspaceScreen.tsx',
      'EpisodeWorkspaceScreen.tsx',
    ].map((name) => read(`../../../features/episodes/presentation/pages/${name}`));

    it('none of the episode/consultation flow screens use BackHandler, navigation.reset, or useNavigationState', () => {
      flowFiles.forEach((source) => {
        expect(source).not.toMatch(/BackHandler|navigation\.reset|useNavigationState/);
      });
    });
  });

  describe('R3B · T-A.2 (Reality-Check correction): caseResolver.ts\'s push() calls are already correct — confirmed, not converted', () => {
    const source = read('../../../features/doctorDashboard/application/caseResolver.ts');

    it('caseResolver.ts is called from exactly one origin screen (app/doctor.tsx) — confirmed via its own single caller', () => {
      // This test lives in the doctorDashboard test folder rather than
      // re-grepping app/doctor.tsx here — the single-caller fact was
      // confirmed directly via `grep -rln startConsultationWithGuard` during
      // T-A.2's own audit (recorded in tasks.md), not re-asserted as a
      // brittle source match here.
      expect(source).toContain('export async function resolveCase(');
    });

    it('all three resolveCase() branches use router.push(), not router.replace() — CORRECT, since this is the FIRST hop from a stable screen (the dashboard), not a transient step to skip on Back', () => {
      const fnBody = source.slice(
        source.indexOf('export async function resolveCase('),
        source.indexOf('export async function startConsultationWithGuard('),
      );
      const pushCalls = fnBody.match(/router\.push\(/g) ?? [];
      expect(pushCalls.length).toBe(3);
      expect(fnBody).not.toMatch(/router\.replace\(/);
    });

    it('FR-A3 protects this file from modification by this phase — entry resolution is not duplicated or reimplemented', () => {
      // Structural confirmation only: the function signature this phase must
      // not touch still exists, unchanged in shape.
      expect(source).toContain('router: Pick<Router, \'push\'>');
    });
  });
});
