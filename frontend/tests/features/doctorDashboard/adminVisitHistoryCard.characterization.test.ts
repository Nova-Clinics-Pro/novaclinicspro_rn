import fs from 'fs';
import path from 'path';

/**
 * R3B · T-0.4 — Characterization of the existing admin "Visit History" card
 * (`AppointmentDetailScreen.tsx`'s `VisitHistoryCard`), confirming it is
 * genuinely untouched by this phase's plan. This is BC-2's own oracle,
 * proving Group C's new Clinical Timeline did not silently modify this
 * screen. Mirrors T-0.1/T-0.2/T-0.3's source-inspection technique — this is
 * a structural/wiring characterization, not new runtime behavior.
 *
 * REALITY-CHECK FINDING (additive, not a correction — design.md §2.4 never
 * claimed the opposite, it just didn't go into this level of detail): the
 * card's OUTER container has no drill-down navigation (confirmed — "BUG FIX
 * #4" deliberately removed it, and the onPress prop it still receives is
 * never wired to anything interactive, so handleVisitHistoryPress is
 * defined but unreachable dead code). BUT each card contains TWO real,
 * interactive CTAs — "Add/View Case Sheet" and "Add/View Prescription" —
 * that DO navigate via router.push to the exact standalone routes
 * (.../casesheets/{new,[id]}, .../prescriptions/{new,[id]}) that T-B.2/
 * T-B.3/T-B.5/T-B.6 will flag-gate. This is a genuinely new, previously
 * unlisted entry point into Case Sheet/Prescription editing beyond
 * requirements.md §3.1/§3.3's own original audit — but since these CTAs
 * navigate to the SAME route paths Group B gates at the route level (not
 * per-caller), this is automatically and correctly handled by that work,
 * with no special-casing needed. Flagged here so T-B.2/T-B.3's own
 * "every current caller of the old routes is identified" (MIG-1) check
 * knows this screen is one of those callers.
 */

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('Admin Visit History card characterization (R3B · T-0.4, baseline for BC-2)', () => {
  const source = read('../../../features/appointments/presentation/pages/AppointmentDetailScreen.tsx');

  it('the section is titled "Visits in This Episode" (renamed from "Previous Visits"), only shown when the appointment has an episode with other visits', () => {
    expect(source).toContain("t('episodes.visitsInEpisode') || 'Visits in This Episode'");
    expect(source).toContain('{episodeId && episodeAppointments.length > 0 && (');
  });

  it('sources its data client-side from the existing generic appointments-list query, scoped by episode_id — no dedicated history/timeline backend endpoint', () => {
    expect(source).toContain('useAppointmentsListQuery(');
    expect(source).toContain('{ episode_id: episodeId || undefined, skip: 0, limit: 50 }');
  });

  it('excludes the current appointment and sorts remaining visits most-recent-first (chronological)', () => {
    expect(source).toContain("filter((apt: any) => apt.id !== appointmentId)");
    expect(source).toMatch(/new Date\(b\.appointment_start\)\.getTime\(\) - new Date\(a\.appointment_start\)\.getTime\(\)/);
  });

  it('the card itself has NO drill-down navigation — BUG FIX #4 deliberately removed it', () => {
    expect(source).toContain('BUG FIX #4: Removed TouchableOpacity and navigation');
    expect(source).toContain('BUG FIX #4: Navigation Arrow REMOVED - previous visits should not navigate');
  });

  it('handleVisitHistoryPress is defined but unreachable — the onPress prop it would wire to is never attached to any interactive element in VisitHistoryCard\'s own render', () => {
    expect(source).toContain('const handleVisitHistoryPress = useCallback((historyAppointmentId: string) => {');
    expect(source).toContain("router.push(`/clinic-admin/appointments/${historyAppointmentId}`");
    // The card's own outer container is a plain View, not a Touchable — confirmed
    // by the absence of any onPress={onPress} wiring inside VisitHistoryCard's body.
    const cardBodyStart = source.indexOf('const VisitHistoryCard');
    const cardBodyEnd = source.indexOf('// ============================================', cardBodyStart);
    const cardBody = source.slice(cardBodyStart, cardBodyEnd);
    expect(cardBody).not.toMatch(/onPress=\{onPress\}/);
  });

  it('each card contains two real, COS-aware Case Sheet and Prescription CTAs', () => {
    expect(source).toContain('router.push(`/clinic-admin/clients/${clientId}/casesheets/${appointment.case_sheet_id}`');
    expect(source).toContain("episodeWorkspaceRoute(appointment.episode_id, appointment.id, clientId, 'doctor', 'case_sheet')");
    expect(source).toContain('router.push(`/clinic-admin/clients/${clientId}/prescriptions/${appointment.prescription_id}`');
    expect(source).toContain("episodeWorkspaceRoute(appointment.episode_id, appointment.id, clientId, 'doctor', 'prescription')");
    // Legacy destinations remain only for COS-off and no-episode fallback.
    expect(source).toContain(': `/clinic-admin/clients/${clientId}/prescriptions/new?appointmentId=${appointment.id}`');
  });
});
