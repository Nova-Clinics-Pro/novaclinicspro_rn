import fs from 'fs';
import path from 'path';

/**
 * R3B · T-0.5 — Characterization of the confirmed task-language and
 * multi-status violations (FR-D1/FR-D2), plus confirmation of the Phase 1
 * freshness baseline, BEFORE any Group B/C/D work begins. This is FR-D1/
 * FR-D2's own "before" oracle.
 *
 * MAJOR REALITY-CHECK CORRECTION (requirements.md §3.4/§3.5 and design.md
 * updated before this file was written): the ORIGINAL characterization
 * ("status badges render raw enum values directly — DRAFT, PENDING,
 * FULLY_SCHEDULED, PARTIALLY_SCHEDULED, SCHEDULED") does NOT hold. Every
 * status badge in the codebase (`TreatmentSheetStatusBadge`,
 * `getOrderStateLabel`, `getStatusLabel`, `getSchedulingStatusLabel`)
 * already renders a humanized label ("Draft," "Waiting for Scheduling,"
 * "Fully Scheduled") — the raw uppercase strings found by an earlier,
 * shallower grep are used only in comparison/filter logic, never rendered
 * as visible text. The conclusion ("a task-language violation exists") is
 * still correct — the CITATION was wrong. The real, confirmed violations
 * are two literal section/screen titles, exact matches to Doc 03 §19's own
 * negative examples:
 *   1. `app/doctor.tsx` — the doctor's own dashboard renders a section
 *      literally titled "Pending Documentation."
 *   2. `app/clinic-admin/treatment-sheets/orders.tsx` — the admin
 *      scheduling worklist's own screen header is literally "Treatment
 *      Orders."
 *
 * A SECOND finding (additive, expands FR-D2's confirmed scope rather than
 * correcting anything): `orders.tsx` — the SAME screen as finding #2 above
 * — renders a state "pill" and, conditionally, a separate scheduling-status
 * "pill" side-by-side on every list-item card. This is the same underlying
 * violation `TreatmentSheetInfoCard.tsx` already had, just as two adjacent
 * badges instead of one concatenated string — a second confirmed instance,
 * not previously characterized.
 *
 * UPDATE (T-D.1, resolution): `TreatmentSheetInfoCard.tsx`'s own
 * concatenation is fixed — it now renders exactly one primary status via the
 * new `getPrimaryOrderStatusLabel()`/`getPrimaryOrderStatusColor()`
 * (`treatmentOrders.dtos.ts`), which picks whichever of `state`/
 * `scheduling_status` is currently the more business-meaningful value,
 * never both. The `orders.tsx` instance (finding #2 above) is UNCHANGED —
 * that is T-D.2's own separate scope, not this task's.
 *
 * UPDATE (T-D.2, resolution): both task-language violations are fixed —
 * `app/doctor.tsx`'s section is now titled "Needs Documentation" (Doc 03
 * §19's own positive vocabulary, near-verbatim); `orders.tsx`'s header is
 * now "Treatment Plans" (reusing the app's own already-established
 * task-oriented term for this entity — `app/clinic-admin/index.tsx`'s
 * "Treatment Plan(s) to Schedule" widget already navigates to this exact
 * screen). `orders.tsx`'s own multi-status pill pair (finding #2 above) is
 * ALSO fixed in this same task (an explicit scope expansion beyond FR-D1
 * alone, approved directly — see `tasks.md`'s own T-D.2 note) using the
 * same `getPrimaryOrderStatusLabel`/`getPrimaryOrderStatusColor` T-D.1
 * built (and corrected) for `TreatmentSheetInfoCard.tsx`.
 *
 * UPDATE (Phase 4 · R4 · T-E.1, resolution): `getPrimaryOrderStatusLabel`/
 * `getPrimaryOrderStatusColor` no longer derive anything themselves — R3B's
 * own frontend re-derivation (including the "Needs Re-scheduling" drift
 * case) is superseded by the backend's single resolved
 * `lifecycle_status_label`/`lifecycle_status` (ADR-R4-02, T-C.2). Two
 * further, previously-undiscovered duplicate lifecycle-display sites were
 * found by this task's own audit and re-pointed the same way:
 * `TreatmentLifecycleActions.tsx`'s `OrderStateAction` (a state-derived
 * action-button label) and `app/doctor.tsx`'s "Needs Documentation" widget
 * pill (`getPendingDocumentationStatusLabel`, its own independent raw-state
 * branching). `TreatmentPlansTab.tsx`'s status chip was also re-pointed once
 * an order exists (its `sheet.status`-based fallback before any order
 * exists is a distinct, legitimate documentation-status display, not part
 * of this violation).
 *
 * FRESHNESS BASELINE (T-0.5's third responsibility): the existing
 * `isFreshnessV1Enabled` two-branch suite (`freshnessFeatureFlag.test.tsx`,
 * `consultationSaveFreshness.characterization.test.tsx`,
 * `freshnessNoDuplicateFetch.test.tsx`) was re-run in full before this task
 * concluded: 3 suites, 5 tests, all passing — recorded here as the
 * confirmed "before" checkpoint Execution Governance #8 requires. Not
 * re-characterized as new tests in this file, to avoid duplicating
 * already-passing coverage (same discipline applied throughout G0).
 */

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('Task language violations (R3B · T-0.5, baseline for FR-D1) — ORIGINAL FINDING (T-0.5) vs. resolved state (T-D.2)', () => {
  it('T-D.2 RESOLUTION: app/doctor.tsx\'s section is now "Needs Documentation" — Doc 03 §19\'s own positive vocabulary, not the negative-example "Pending Documentation"', () => {
    const source = read('../../../app/doctor.tsx');
    // Not a blanket substring ban — an explanatory code comment legitimately
    // mentions the old name. The real guarantee is that no visible <Text>
    // renders it.
    expect(source).not.toContain('<Text style={styles.sectionTitle}>Pending Documentation</Text>');
    expect(source).toContain('<Text style={styles.sectionTitle}>Needs Documentation</Text>');
  });

  it('T-D.2 RESOLUTION: orders.tsx\'s own screen header is now "Treatment Plans" — reusing the app\'s own already-established task-oriented term, not the raw entity name "Treatment Orders"', () => {
    const source = read('../../../app/clinic-admin/treatment-sheets/orders.tsx');
    expect(source).not.toContain('>Treatment Orders<');
    expect(source).toContain('<Text style={styles.headerTitle}>Treatment Plans</Text>');
  });

  it('app/clinic-admin/index.tsx\'s "Treatment Plan{s} to Schedule" remains the one existing task-oriented precedent, unchanged', () => {
    // The wording now lives in the translations (the screen refers to it by key).
    const source = read('../../../core/localization/translations/en-US.json');
    expect(source).toMatch(/Treatment Plans? to Schedule/);
  });

  describe('CORRECTION: status badges are already humanized, not raw enum text — confirmed, not assumed', () => {
    const statusBadge = read('../../../features/treatmentSheets/presentation/components/TreatmentSheetStatusBadge.tsx');
    const treatmentSheetsDtos = read('../../../features/treatmentSheets/data/models/treatmentSheets.dtos.ts');
    const treatmentOrdersDtos = read('../../../features/treatmentSheets/data/models/treatmentOrders.dtos.ts');

    it('TreatmentSheetStatusBadge renders getStatusLabel(status), not the raw status value', () => {
      expect(statusBadge).toContain('const label = getStatusLabel(status);');
      expect(statusBadge).toContain('{label}');
    });

    it('getStatusLabel maps every raw enum value to a humanized label (Draft, Scheduled, In Progress, etc.)', () => {
      expect(treatmentSheetsDtos).toContain("DRAFT: 'Draft'");
      expect(treatmentSheetsDtos).toContain("IN_PROGRESS: 'In Progress'");
    });

    it('getOrderStateLabel and getSchedulingStatusLabel likewise map to humanized labels, not raw text', () => {
      expect(treatmentOrdersDtos).toContain("ORDERED: 'Waiting for Scheduling'");
      expect(treatmentOrdersDtos).toContain("FULLY_SCHEDULED: 'Fully Scheduled'");
    });
  });
});

describe('Multi-status violations (R3B · T-0.5, baseline for FR-D2) — ORIGINAL FINDING (T-0.5) vs. resolved state (T-D.1) for instance #1', () => {
  it('T-D.1 RESOLUTION: TreatmentSheetInfoCard.tsx no longer concatenates state + scheduling_status — exactly one primary status is rendered', () => {
    const source = read('../../../features/treatmentSheets/presentation/pages/detail/TreatmentSheetInfoCard.tsx');
    expect(source).not.toMatch(/getOrderStateLabel\(treatmentOrder\.state\)/);
    expect(source).not.toMatch(/getSchedulingStatusLabel\(treatmentOrder\.scheduling_status\)/);
    expect(source).not.toContain('·');
    expect(source).toContain('getPrimaryOrderStatusLabel(treatmentOrder)');
    expect(source).toContain('getPrimaryOrderStatusColor(treatmentOrder)');
  });

  it('N-1: the underlying getOrderStateLabel/getSchedulingStatusLabel functions themselves are untouched — this was a presentation fix, not a re-derivation', () => {
    const dtosSource = read('../../../features/treatmentSheets/data/models/treatmentOrders.dtos.ts');
    expect(dtosSource).toContain("ORDERED: 'Waiting for Scheduling'");
    expect(dtosSource).toContain("FULLY_SCHEDULED: 'Fully Scheduled'");
    expect(dtosSource).toContain('export const getOrderStateLabel');
    expect(dtosSource).toContain('export const getSchedulingStatusLabel');
  });

  it('T-E.1 RESOLUTION (supersedes the two tests below it in git history): getPrimaryOrderStatusLabel/Color no longer re-derive a status from state/scheduling_status at all — they read the backend\'s own resolved lifecycle_status_label/lifecycle_status (T-C.2) verbatim. The frontend "Needs Re-scheduling" drift case T-D.1 added is gone from this file entirely — that computation is now the backend resolver\'s sole job (its own needs_scheduling status covers the same signal from its own inputs; nothing is silently dropped, only the computation moved server-side). Branch-level behavior is exercised by treatmentOrderPrimaryStatus.test.ts.', () => {
    const dtosSource = read('../../../features/treatmentSheets/data/models/treatmentOrders.dtos.ts');
    expect(dtosSource).toContain('export const getPrimaryOrderStatusLabel');
    expect(dtosSource).toContain('export const getPrimaryOrderStatusColor');
    expect(dtosSource).not.toMatch(/order\.is_order && order\.state === 'ORDERED' && order\.scheduling_status/);
    expect(dtosSource).not.toContain("'Needs Re-scheduling'");
    expect(dtosSource).not.toMatch(/order\.is_order && order\.state !== 'ORDERED' && order\.scheduling_status === 'PARTIALLY_SCHEDULED'/);
    expect(dtosSource).toMatch(/order\.lifecycle_status_label/);
  });

  it('T-D.2 RESOLUTION: orders.tsx no longer renders a state pill AND a separate scheduling-status pill side-by-side — exactly one primary status pill per card, via the same shared resolution T-D.1 built', () => {
    const source = read('../../../app/clinic-admin/treatment-sheets/orders.tsx');
    expect(source).not.toMatch(/getOrderStateLabel\(order\.state\)/);
    expect(source).not.toMatch(/getSchedulingStatusLabel\(order\.scheduling_status\)/);
    expect(source).toContain('getPrimaryOrderStatusLabel(order)');
    expect(source).toContain('getPrimaryOrderStatusColor(order)');
    // Confirms exactly one pill container in the card's top row — not two
    // side by side.
    const cardTopRowStart = source.indexOf('{/* Single primary status pill (R3B · T-D.2, FR-D2) */}');
    const cardTopRowEnd = source.indexOf('{/* Sessions + ordered date */}', cardTopRowStart);
    const cardTopRowBlock = source.slice(cardTopRowStart, cardTopRowEnd);
    const pillMatches = cardTopRowBlock.match(/styles\.pill,/g) ?? [];
    expect(pillMatches.length).toBe(1);
  });

  it('getOrderStateLabel remains used elsewhere in orders.tsx for a single, non-multi-status purpose (the filter empty-state message) — confirms the fix was scoped to the card\'s own status display, not a blanket removal', () => {
    const source = read('../../../app/clinic-admin/treatment-sheets/orders.tsx');
    expect(source).toContain('getOrderStateLabel(stateFilter)');
  });
});
