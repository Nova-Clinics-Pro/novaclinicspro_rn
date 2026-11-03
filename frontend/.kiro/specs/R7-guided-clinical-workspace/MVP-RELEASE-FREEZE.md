# MVP-RELEASE-FREEZE — NovaClinics Clinical Operating System

**Status of this document: proposed governance basis, not yet owner-approved.** It is derived entirely from `RTM-AUDIT.md` and `RTM.md` (this audit), which are themselves derived from `requirements.md`, `design.md`, `tasks.md`, and `R7-OWNER-RATIFICATION.md`. It does not add, remove, or reinterpret any requirement, task, or decision — it only organizes what those documents already say into a release-readiness frame, plus states current repository fact where that fact is unambiguous (test counts, task completion, migration state).
**As of:** 2026-07-25 · Backend `c16cbf008f51cb248698057bc9acd68a4cf568bf` · Frontend `57902bccdc9665a570a7768b6b61603ce3f0970f`

---

## 1. Scope INCLUDED in MVP

Everything `R7-OWNER-RATIFICATION.md` ratified as R7 (not R8), per its 11 Decisions and the Final Blocker Resolution section:

- Clinical Operating System shell on the existing episode-workspace route, flag-gated (`cos_v1`) — Decision 8.
- Backend-owned workflow assembly, recommendation, and completion readiness — Decision 9, `FR-WFA-1/2`, `FR-REC-1`, `FR-CR-1`.
- Recommend-with-deviation interaction model — Decision 7, `FR-REC-2`.
- One Case Sheet per Episode with correct current-Visit attribution, atomicity, and idempotency — Decision 1, `FR-CS-1..6`.
- Treatment Plan as a first-class persisted, versioned entity, independent of scheduling — Treatment Plan resolution decision, `FR-TP-1..3`.
- Stable Session identity, scheduling intents (consecutive/non-sequential/PRN/review-dependent), doctor content bound to session identity, therapist execution record, decomposed "Missed" state — `FR-TS-1..5`, `FR-SCH-1/2`.
- Treatment Recommendation source identity — Decision 11 (this session's own deliverable).
- Living documents via supersession (DRAFT→FINAL→SIGNED→SUPERSEDED) — Decision 2, `FR-LD-1..3`.
- Prescription lifecycle limited to the verified DRAFT/FINAL/SIGNED path, no Issue/Dispense — Decision 3, `FR-RX-1`.
- Billing visibility as a read-only, warning-not-block surface — Decision 6, `FR-BILL-1/2`.
- Mobile-first Command Center presentation with workflow pills — `FR-MOB-1/2`.
- Role-aware composition across Doctor/Assistant Doctor/Admin/Front-desk/Therapist — `FR-RBAC-1`.
- No-deletion legacy transition (redirects only, no screen removed) — `FR-LEG-1/2`.
- Clinical history hierarchy: consultations and Treatment Reviews as top-level encounters, therapy Sessions grouped under their Plan — Decision 10 (v1.1 amendment), `FR-HIST-1/2`.
- Patient-safety surface limited to what verifiably exists today (pending clinical reviews, active prescription status, active episode, session progress, billing state) — Decision 5/F-2 Option A, `FR-PS-1`, `FR-VCC-4`.

## 2. Scope EXCLUDED from MVP

Everything R7-OWNER-RATIFICATION.md explicitly deferred to R8 (Decisions 4, 5, and the R7/R8 boundary in requirements.md §20):

- Structured laboratory measurements, manual lab entry, LIONIC/LIS/FHIR/device adapters, comparative lab tables, trend visualization, measurement-based "what changed."
- Clinical Advice framework (Diet/Exercise/Lifestyle/Home Care/Restrictions/Follow-up Advice as one shared model) — Decision 4.
- Prescription copy-forward, gated on allergy/medication data modelling existing first or alongside it — Decision 5.
- Allergy, intolerance, medication-interaction, renal-risk, hepatic-risk, and advanced contraindication modelling — F-2, explicitly not R7.
- Dispensing fulfilment lifecycle (`NOT_STARTED → PARTIALLY_DISPENSED → DISPENSED`), a separate future domain object per Decision 3's own design rule.
- Recommendation confidence scoring.
- `PrescriptionStatus` enum cleanup/disposition (`ED-ARCH-002`) — recorded as debt, not an R7 obligation.
- Physical removal of `appointment_id` from `tenant_casesheets`, and `episode_id` non-nullability — both explicitly deferred to a future, separately-approved migration pending a data audit.
- Legacy screen *removal* (only redirect-staging is in R7; `FR-LEG-1` explicitly caps R7 at "Redirect," not "Deprecate"/"Remove").
- `day_number` retirement on `treatment_sheet_row` — explicitly non-blocking, not R7 (design.md §2.4).

## 3. Remaining mandatory work

24 tasks, drawn directly from `RTM-AUDIT.md` §10 (marked "Yes" for MVP-required):

**Backend (11):** `T-BE-A.3`, `T-BE-A.4` (blocked on a not-yet-performed data audit), `T-BE-A.5`, `T-BE-D.5`, `T-BE-E.2`, `T-BE-E.3`, `T-BE-E.4`, `T-BE-E.5`, `T-BE-G.1`, `T-BE-G.2`, `T-BE-G.3`.
**Frontend (13):** `T-FE-B.1`, `T-FE-B.2`, `T-FE-C.5`, `T-FE-C.6`, `T-FE-C.7`, `T-FE-D.1`, `T-FE-E.1`, `T-FE-E.2`, `T-FE-E.3`, `T-FE-E.4`, `T-FE-E.5`, `T-FE-E.6`, `T-FE-F.1`, `T-FE-F.2`, `T-FE-F.3`.
**Closure (2):** `T-Z.1`–`T-Z.4`, `T-Z.8`, `T-Z.9` (release-gate and history-hierarchy proof).

Owner-review gates not yet reached: **OR-3** (mid-M6, after BE Group D — Group D is not fully complete pending `T-BE-D.5`), **OR-4** (after M4/dynamic workflow UI), **OR-5** (after M7/living documents), **OR-6** (final release gate, M8). Gates **OR-1** (closed 2026-07-19, verified via `R7-GROUP-0-M1-CLOSURE.md`) and the task-completion basis for **OR-2** are the only ones whose prerequisite work is done — the owner sign-off actions themselves are outside what this audit can confirm from repository state.

## 4. Remaining optional work

5 tasks, judged non-blocking for MVP per `RTM-AUDIT.md` §10:

- `T-FE-G.1`, `T-FE-G.2` — mobile pill-rail/accessibility polish. Could ship post-MVP with a documented gap; the underlying Command Center shell and briefing regions already work without them.
- `T-Z.5` — performance sanity check. Valuable, not itself release-blocking.
- `T-Z.6` — legacy deprecation readiness instrumentation (zero-usage tracking). Explicitly about preparing for a *future* removal, not required for R7's own release.
- `T-Z.7` — R8 handoff package. Needed before R8 work starts, not before R7 ships.

## 5. Deferred work (future releases)

Everything in Section 2 above (R8 scope), plus the specific follow-ups `R7-OWNER-RATIFICATION.md` itself named as "later, separately-approved" work:
- `episode_id` non-nullability migration on `tenant_casesheets`, pending a data audit of null-`episode_id` historical records.
- Physical removal of `tenant_casesheets.appointment_id` once nothing reads it as authoritative.
- `day_number` retirement on `treatment_sheet_row`.
- Wiring the dormant `casesheet.sign`/`prescription.sign` permission codes into actual enforcement (currently bypassed by hardcoded role checks) — a new finding from `T--1.2`'s own trace doc, not yet tracked as a debt item.
- Correcting the `billing.view`→`invoice.read` naming mismatch found by the same trace doc.
- Remediating the remaining ~18 ED-ARCH-001 files outside R7's declared reuse scope.

## 6. Technical debt accepted

From both repositories' `ENGINEERING-DEBT.md`, items whose disposition for MVP is "open, correctly out of scope, not remediated":

| ID | Item | MVP disposition |
|---|---|---|
| ED-ARCH-002 | `PrescriptionStatus` dead enum | Accepted — zero runtime usage, non-blocking, cleanup deferred |
| ED-ARCH-003 | Unbacked frontend `allergies` field | Accepted for MVP — not surfaced (enforced by test), but not removed at the source. Real hazard if any future code re-surfaces it without also building the R8 data model |
| ED-ARCH-005 | `deriveKpiMetrics()` client-side derivation | Accepted — outside R7's declared reuse scope |
| ED-ARCH-006 Violation B | `SectionProgress` frontend completion authority | Status unclear — not independently re-verified this audit; must be confirmed closed or accepted before release |
| ED-ARCH-001 (residual) | ~18 files outside the 7 R7-reused modules | Accepted — pre-existing, not R7's obligation |

## 7. Architectural debt accepted

- **No CI-enforced frontend architecture regression tests.** Every frontend layer-boundary fix shipped so far (`T-0.2`–`T-0.9`) is verified only by a manually-run, manually-documented grep sweep at task-completion time, not an automated gate. **This is the single largest accepted architectural risk in this release candidate** — accepting MVP release without closing it means every subsequent frontend change carries an un-alarmed risk of silently reintroducing an ED-ARCH-001-class violation.
- **`CLAUDE.md` uncommitted in both repositories for the entire R7 effort.** The governing layer-integrity rules this effort claims to operate under are not part of either repository's committed history. Accepting this for MVP means the process guarantee is real only as long as this specific uncommitted file survives on this specific machine.
- **`.kiro/constitution/`, ADR content, and the backend's `ENGINEERING-TRUTH.md` are untracked or stale.** Accepted as a documentation-process gap, not a runtime risk.
- **The Recommendation-source design was corrected mid-flight** (Decision 11) after the original design assumed an entity that had already been removed from the codebase before R7 began. Accepted as resolved (the fix shipped, tested, and is in production-candidate state) but recorded as evidence the original design-freeze process did not fully validate against Engineering Truth before `tasks.md` was frozen.

## 8. Known limitations

- No treatment scheduling exists yet (`T-BE-E.2`–`E.5` not started) — a Treatment Plan can be created but no Session can be scheduled, executed, or rescheduled against it.
- No document supersession/amendment exists yet (`T-BE-G.1`–`G.3` not started) — SIGNED documents remain governed only by the pre-R7 lock, and `DocumentStatus`'s own docstring still contradicts the ratified model.
- No frontend rendering exists for the workflow/recommendation contract, treatment composition, billing stage, or amendment surfaces — the backend contracts are complete and tested in isolation but cannot be exercised end-to-end by a real user yet.
- No legacy-route redirects exist — old screens and the new workspace shell are not yet connected for real traffic.
- Clinical history still shows the pre-R7 flat, undifferentiated view — the hierarchy separating consultations/reviews/therapy sessions (Decision 10) is fully unbuilt on both sides, though its backend prerequisites are now unblocked.
- Patient-safety surface is deliberately minimal (no allergy/interaction/renal data anywhere) — by ratified design (F-2 Option A), not an oversight, but a real clinical-workflow limitation users will experience.
- Two documented Engineering Truth findings (ETX-1's dormant sign-permissions, ETX-4's disputed resolution status between `requirements.md` and `design.md`) remain unreconciled in the governing documents themselves.

## 9. Release checklist

Derived from `tasks.md`'s own Milestone/Gate structure (M0–M8, OR-1–OR-6) plus this audit's findings — not a new checklist, a restatement of what the frozen documents already require, marked against current state:

- [x] M0 — Engineering Truth Complete (Group -1)
- [x] M1 — Blocking Architecture Debt Removed (Group 0A + Backend Contract Prerequisite Window + Group 0B) — closed 2026-07-19
- [x] M2 — Backend COS Contracts Complete (BE Groups A.1/A.2, B, F) — task-complete; **Gate OR-2 owner sign-off not confirmed by this audit**
- [x] M3 — COS Shell and Command Center Complete (FE Group A) — task-complete
- [ ] M4 — Dynamic Workflow Functional (FE Groups B, D) — not started
- [ ] M5 — Clinical Continuity Complete (BE Group C done; FE-E.1, FE-E.2's Rx/Recommendation portion, FE-E.4 not started)
- [ ] M6 — Treatment Workflow Complete (BE Group D done except D.5; BE-E done through E.1 only; FE-E.2's Plan/Scheduling portion, FE-E.3 not started) — **Gate OR-3 not reached**
- [ ] M7 — Living Documents Complete (BE Group G, FE-E.5) — not started — **Gate OR-4/OR-5 not reached**
- [ ] M8 — R7 Release Candidate (Group Z) — not started — **Gate OR-6, the release decision itself, not reached**
- [ ] Frontend architecture regression tests made CI-enforced (Section 7 above) — not currently required by any task but recommended before this document treats M8 as achievable
- [ ] `CLAUDE.md` committed in both repositories, or an explicit owner decision recorded that it remains intentionally local-only
- [ ] `tasks.md`'s task-count arithmetic corrected (77 → 80) or an owner decision recorded that it's accepted as-is
- [ ] ED-ARCH-006 Violation B status confirmed (open or closed)
- [ ] ETX-1's two new findings (dormant sign-permissions, `billing.view` naming) either tracked as new debt items or explicitly accepted as out of scope
- [ ] ETX-4's resolution-status disagreement between `requirements.md` and `design.md` reconciled

## 10. Go / No-Go criteria

**Current recommendation: No-Go.** Stated plainly, not softened: 24 mandatory tasks remain (Section 3), spanning the entire frontend rendering layer for workflow/recommendation, treatment composition, billing, and amendments, plus backend scheduling and document supersession. None of `tasks.md`'s own release gates from OR-3 onward have been reached. This is a factual statement of remaining scope, not a judgment on the work completed so far — everything completed (51 of 80 tasks, 24 of 44 requirements fully discharged) is verified done, tested, and consistent with its governing documents.

**Go criteria, once met** (mirroring `tasks.md`'s own M8/OR-6 merge criteria, restated here as the release condition):
1. All 24 remaining mandatory tasks (Section 3) complete and verified the same way this audit verified the first 51 — file presence, passing tests, no reversion.
2. Group Z (`T-Z.1`–`T-Z.4`, `T-Z.8`, `T-Z.9`) complete: full architecture proof, full regression against baseline on both repos, DP-15 one-answer proof, rollback drill (all four kinds), history-hierarchy proof.
3. Owner-review Gates OR-2 through OR-6 explicitly approved by the product owner — an action this document cannot perform or substitute for.
4. The frontend architecture-test gap (Section 7) closed, or an explicit owner-accepted risk statement recorded in its place.
5. `CLAUDE.md` and constitutional documents' tracking status resolved one way or the other.
6. The open architectural questions in `RTM-AUDIT.md` §8 either answered or explicitly accepted as post-MVP.

**No single item above is a judgment call by this audit** — each is a restatement of a requirement, task, or gate the governing documents already define. This document does not invent new release criteria; it only assembles the existing ones into one place and states, factually, which are met today and which are not.
