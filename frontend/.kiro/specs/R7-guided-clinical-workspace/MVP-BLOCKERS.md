# MVP-BLOCKERS — NovaClinics Clinical Operating System

**Scope: requirements only.** Not tasks, not assumptions, not future enhancements. Every entry below is one of the 24 requirements `RTM-MASTER.md` classifies `BLOCKING MVP`, with its full chain: Requirement → Design → Task → Implementation Gap → Evidence → Why it blocks release. Full supporting detail (files, commits, test names) is in `RTM-MASTER.md`; this document exists to be short enough to drive a release conversation on its own.

> **[2026-07-26] Partially stale as of `T-FE-E.2`.** This document was generated from `RTM-MASTER.md`'s 2026-07-27 pass and has NOT been rewritten for `T-FE-E.2`'s partial completion (commits `4fba2ec4`/`80fb96d0`). In particular: Prescription and Treatment Recommendation composition are now done (not "not started"); Session Instructions and Scheduling have real partial composition (current state + write); the Treatment Plan gap is now understood specifically — `TenantTreatmentPlan` has zero public HTTP contract — with a proposed remediation, `T-BE-D.4a`. Treat every `T-FE-E.2`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-26]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Further update: `T-BE-D.4a` + `T-FE-E.2` closure.** The gap the banner above describes is now closed for Treatment Plan and the scheduling-proposal preview: `T-BE-D.4a` (backend commit `c69f7ef`) exposed the Treatment Plan public contract, and `TreatmentPlanModule` + `SchedulingModule`'s proposal consumption compose it (frontend commit `bfe31956`). `T-FE-E.2` is still not COMPLETE -- the sole remaining gap is author-once-apply-to-many (FR-TS-3's own AC), blocked on the separate, still-unstarted `T-BE-E.3`, out of this closure's own scope. Treat every `T-FE-E.2`/`T-BE-D.4a`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-27]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Correction: `T-BE-E.3` was already complete.** Every reference below (and in every prior session's own reports) claiming `T-BE-E.3` "remains Not Started" was factually wrong -- commit `9497f13` (2026-07-25) predates all of them; a re-verification against `git log` this session caught it. `FR-TS-3` moves Not Started -> Partially Complete in `RTM-MASTER.md`. The one remaining gap for `T-FE-E.2` (author-once-apply-to-many) is now understood to be purely a frontend implementation task -- its backend primitive already exists and works; no backend defect was found. Not implemented this session (an Engineering-Truth-only task stopped at verification, as instructed). Treat every `T-BE-E.3`-referencing line below as superseded by `RTM-MASTER.md`'s `[Corrected 2026-07-27]` markers.

> **[2026-07-27] `T-FE-E.2` CLOSED — blockers FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-2, FR-SCH-1 (partial), and now FR-TS-3 no longer block release.** The narrow frontend amendment `T-FE-E.2a` (commit `7e2ce7f1`) implemented author-once-apply-to-many in `SessionInstructionsModule` (multi-select keyed by stable Session id, one call to the existing atomic bulk-update endpoint, no backend change). `FR-TS-3` moves Partially Complete → Fully Complete. Every "T-FE-E.2 not started" gap line below is superseded — see `RTM-MASTER.md`'s `[Updated 2026-07-27, T-FE-E.2a closure]` markers for current figures. `FR-TS-1` (session identity, still names the separate `T-FE-E.3` execution-composition task) and `FR-SCH-2` (still names `T-FE-E.5`'s mandatory-header adoption) remain the only genuinely open items in this section, unrelated to this closure.

> **[2026-07-28] `T-FE-E.3` CLOSED — blockers `FR-TS-4`/`FR-TS-5` no longer block release.** `TherapistDashboardScreen` already composed start/complete (pre-existing, not built this task); structured non-execution was genuinely missing and is now built (commit `302bccbf`). `FR-TS-4`/`FR-TS-5` move Partially Complete → Fully Complete. Every "T-FE-E.3 not started" gap line below (the two Design §2.4 rows citing it) is superseded. One reported, non-blocking gap remains, tracked as follow-up debt, not a release blocker: the non-execution reason cannot be durably re-shown after a list refetch (backend list-schema gap, `TherapistSessionItem` lacks the field) — see `RTM-MASTER.md`'s `[Updated 2026-07-28]` markers.



**As of:** 2026-07-27 (full reconciliation pass) · Backend `186f11f74c9ebd7986689a3919459ad69d446ea6` · Frontend `d69ade484d936cc2f819b40a15758ff22a7ce9d7`.

**Reconciliation note.** This document is fully rewritten this pass, not addended. Five requirements (`FR-VCC-1`, `FR-WFA-1`, `FR-REC-1`, `FR-REC-2`, `FR-MOB-2`) were removed — their blocking frontend tasks (`T-FE-B.1`, `T-FE-B.2`, `T-FE-D.1`) had shipped without this document being updated. `FR-COS-2` remains here (its architecture proof `T-Z.1` genuinely has not run). `FR-HIST-1`/`FR-HIST-2` were already resolved as of last session; unchanged this pass.

---

### FR-COS-2 — Frontend derives no clinical meaning
Design §DP-15 → T-Z.1 (general proof, not run) → **Gap:** the two known violations are closed (T-0.8/T-0.9) but the general architecture proof cannot honestly be called complete until it actually runs against the now much larger frontend surface (FE-B/C/D shipped since this requirement's own violations were closed) → Evidence: `test_r7_workflow_contract_semantics_only.py` (BE guard, passing); no FE-wide `T-Z.1` scan has been executed → **Blocks release because:** the requirement's own AC(1) demands "static check — no FE module computes recommendation/assembly/completion," which is unverified as a whole even though every individual module built so far is architecture-tested on its own.

### FR-WFA-2 — Permissions gate actionability, not presence
Design §2.1 → T-FE-E.6 (not started) → **Gap:** `waiting_role`/`blocking_factors` fields exist on the backend contract and are rendered by `WorkflowPills`/`NextActionBar` where applicable, but the multi-role composition config (`episodeWorkspaceConfigByRole`) that would let a non-doctor role see the workspace at all has not been extended → Evidence: contract fields present and consumed in `WorkflowPills.tsx`/`NextActionBar.tsx`; `episodeWorkspaceConfig.ts` untouched by any R7 commit → **Blocks release because:** without this, only the doctor role can meaningfully use the workspace — the requirement's own "any role holding permission may act" AC is unbuilt.

### FR-CS-6 — Audit
Design §2.2 → T-BE-G.2 (amendment-reason half, not started) → **Gap:** write-side attribution audit works; amendment-reason recording cannot exist before Living Documents ships → Evidence: `casesheets_service.py` covers actor/time/visit; no amendment mechanism exists anywhere → **Blocks release because:** the requirement's full AC ("amendments additionally record reason") is unsatisfiable until Group G ships.

### FR-LD-1 — Signed versions immutable; documents remain amendable
Design §2.6 → T-BE-G.1 (not started) → **Gap:** zero implementation; the exact contradiction this requirement exists to resolve (`DocumentStatus` docstring says "SIGNED: Immutable, terminal state") is still live in the codebase → Evidence: no supersession fields/migration/endpoint found anywhere; docstring unchanged since before R7 → **Blocks release because:** this is a RATIFIED architectural decision (Decision 2) with zero code — amendment of any signed document is currently impossible, and the codebase's own documentation actively contradicts the ratified model.

### FR-LD-2 — Amendment permissions
Design §2.6 → T-BE-G.2 (not started) → **Gap:** the specific permission codes this needs (`casesheet.amend`, `prescription.amend`) confirmed not to exist by `T--1.2`'s own trace doc → Evidence: `R7-PERMISSION-VERIFICATION.md`, Class C rows → **Blocks release because:** amendment cannot be permission-gated if the permissions themselves don't exist.

### FR-LD-3 — Close the `DocumentStatus` docstring contradiction
Design §2.6 → T-BE-G.3 (not started, blocked on T-BE-G.1) → **Gap:** zero implementation → Evidence: docstring unchanged → **Blocks release because:** the Owner Ratification's own text says this "must not be silently ignored" — a live, self-acknowledged documentation-vs-ratification contradiction shipping in a release candidate.

### FR-RX-1 — Verified document lifecycle only
Design §2.7 → T-FE-E.2 (not started) → **Gap:** backend constraint trivially satisfied (nothing was ever built to violate it); no frontend composition exists → Evidence: `tenant_prescription.status` pre-existing and untouched; `VisitCommandCenter.tsx` composes only `CaseSheetModule`/`ClinicalTimeline` — no `PrescriptionModule` composition found → **Blocks release because:** there is no frontend surface for a clinician to actually exercise a compliant prescription flow inside the new workspace.

### FR-TR-1 — Recommendation is a proposal, not a course design
Design §2.3, §2.8 → T-FE-E.2 (not started) → **Gap:** backend source-identity mechanism complete (`T-BE-D.3a`); no frontend composition consumes it → Evidence: `tenant_treatment_sheet.py`/`creation_source`, migration, `test_r7_recommendation_source_identity.py` all passing; no `TreatmentRecommendationModule` composition in `VisitCommandCenter.tsx` → **Blocks release because:** a doctor cannot create or view a Recommendation through the new workspace yet.

### FR-TP-1 — Treatment Plan is first-class persisted, versioned entity
Design §2.3 → T-FE-E.2 (not started) → **Gap:** entire backend chain (domain/ORM/migration/repository/service) complete and rigorously tested across 4 sequential tasks; no frontend composition exists; "frontend never reconstructs Plan from schedule rows" (AC15) is unfalsifiable with no frontend to check → Evidence: `treatment_plan/models.py`, `tenant_treatment_plan.py`, `treatment_plan_service.py`, 4 test files, commits `216d82c`→`f09097f` → **Blocks release because:** the single largest, most carefully-verified backend deliverable in this matrix has no user-facing surface at all.

### FR-TP-3 — Plan amendment vs. schedule change
Design §2.3, §2.6 → T-BE-D.5 (not started, itself blocked on T-BE-G.1) → **Gap:** zero implementation, doubly blocked → Evidence: `treatment_plan_service.py` has exactly two methods (`create_treatment_plan_from_recommendation`, `resolve_scheduling_proposal`) — no versioning/supersession method exists → **Blocks release because:** a RATIFIED, frozen AC of the Treatment Plan entity (four distinct operation types) is entirely unbuilt.

### FR-TS-1 — Stable session identity
Design §2.4 → T-FE-E.2/E.3 (not started) → **Gap:** backend proof complete via structural/behavioral tests reusing pre-existing `treatment_sheet_row` machinery; no frontend composition exists → Evidence: `test_r7_stable_session_identity.py` (28 tests, `c16cbf0`); no session-authoring UI found → **Blocks release because:** no session can be created, viewed, or rescheduled through the new workspace.

### FR-TS-2 — Schedule attributes
Design §2.4 → T-FE-E.2 (not started) → **Gap:** same as FR-TS-1 → Evidence: same → **Blocks release because:** same.

### FR-TS-3 — Doctor clinical content bound to session identity
Design §2.4 → T-BE-E.3 **complete** (commit `9497f13`, 58 tests), T-FE-E.2 not started → **Gap:** backend content-binding, protected-field rejection, and OCC-integration are done and verified; no frontend composition exists → Evidence: `tests/test_r7_doctor_content_bound_to_session.py` (58 passing) → **Blocks release because:** without a frontend, the requirement's own rationale ("without it a 14-session course is otherwise unusable") remains true for the clinician even though the backend half is solid.

### FR-TS-4 — Therapist execution record
Design §2.4 → T-BE-E.4 + T-BE-E.4a **complete, backend-exposed**; T-FE-E.3 not started → **Gap:** frontend composition only → Evidence: `tests/test_r7_session_non_execution.py`, `tests/test_r7_session_non_execution_api.py` (17), `POST /treatment-sheets/rows/{row_id}/non-execution` (commit `a0aa4c3`) → **Blocks release because:** the backend fact exists and is reachable; only the frontend surface (`T-FE-E.3`) remains unbuilt.

### FR-TS-5 — "Missed" is decomposed, not a single state
Design §2.4 → T-BE-E.4 + T-BE-E.4a **complete, backend-exposed**; state-name spelling resolved (`PATIENT_NO_SHOW`/`PATIENT_CANCELLED`/`CLINIC_CANCELLED`/`CLINICAL_HOLD`/`OTHER`); T-FE-E.3 not started → **Gap:** frontend composition only → Evidence: migration `20260726_000001_r7_session_non_execution_reason.py`, commit `a0aa4c3` → **Blocks release because:** both the architectural question and the exposure gap are resolved; only the frontend surface remains.

### FR-SCH-1 — Scheduling intents
Design §2.4 → T-BE-E.2 + T-BE-E.2a **complete, backend-exposed**; T-FE-E.2 not started → **Gap:** frontend composition only → Evidence: `tests/test_r7_scheduling_intents.py` (48), `tests/test_r7_scheduling_proposal_api.py` (12), `GET /treatment-sheets/plans/{plan_id}/scheduling-proposal` (commit `882dfa6`) → **Blocks release because:** the backend proposal contract is reachable; only the frontend surface remains.

### FR-SCH-2 — Synchronization semantics
Design §2.4 → T-BE-E.3 **complete**, T-BE-E.5 **accepted with a documented compatibility amendment**, T-FE-E.2/T-FE-E.5 not started → **Gap:** OCC is implemented and enforced end-to-end whenever a caller supplies `If-Match` (409 `VERSION_CONFLICT` + `current_version`, no mutation on conflict — verified by 33 tests) → Evidence: commits `f9614d7`, `93e9b8d`, `tests/test_r7_session_concurrency_occ.py` → **Blocks release because:** the mobile client does not yet send `If-Match` or retain `version`, so a doctor and an admin can still race today — release requires `T-FE-E.5` to adopt the contract, after which a follow-up task should make `If-Match` mandatory.

### FR-BILL-1 — Billing visible, doctor read-only
Design §2.5 → T-FE-E.4 (not started) → **Gap:** backend read contract complete and tested; no frontend stage exists → Evidence: `i_finance_repository.py` (`efe2344`), 2 passing test files; no billing composition in `VisitCommandCenter.tsx` → **Blocks release because:** billing visibility, a RATIFIED core requirement (Decision 6), has no user-facing surface.

### FR-BILL-2 — Clinical completion ≠ financial completion
Design §2.5 → T-FE-E.4 (not started) → **Gap:** backend behavior already correct (verified with zero code changes); no frontend surface to display the warning it produces → Evidence: `test_billing_completion_never_blocks.py` passing → **Blocks release because:** same as FR-BILL-1 — correct backend behavior with no way for a clinician to see it.

### FR-CR-1 — Backend owns completion readiness
Design §2.1 → T-FE-F.2 (completion-route redirect, not started) → **Gap:** backend answer complete and consumed by `T-0.8`; the legacy-route redirect that would make it reachable from existing entry points is missing → Evidence: `consultation_completion_service.py`/`_router.py`, `CompleteConsultationScreen.tsx` all shipped; `complete-consultation.tsx` route confirmed to have zero `cos_v1` references → **Blocks release because:** the completion answer exists and is correctly consumed on the new screen, but a user arriving via the old route never reaches it.

### FR-MOB-1 — Mobile-first Command Center
— (WIREFRAMES W0-m) → T-FE-G.1 (not started, judged optional-at-task-level by `MVP-RELEASE-FREEZE.md`) → **Gap:** shell exists and is flag-gated correctly; sticky-next-action and horizontal pill-rail behaviors this requirement specifically names are unbuilt → Evidence: `VisitCommandCenter.tsx` shell tests passing; no pill-rail component found → **Blocks release because:** stated per the requirement's own frozen AC — though this is the one blocker where a documented, explicit owner decision to accept the gap is a real, defensible option, not yet made.

### FR-LEG-1 — No screen deleted in R7
Design §2.10 → T-FE-F.1–F.3 (not started) → **Gap:** the "don't delete" half is trivially true (verified — zero screens removed); the "reach Redirect stage" half is unbuilt → Evidence: no screen deletions found anywhere in the R7 branch; no redirect logic found in any legacy route → **Blocks release because:** R7's own staged legacy-transition model requires reaching "Redirect" before this requirement is fully satisfied, and it hasn't.

### FR-LEG-2 — Redirects
Design §2.10 → T-FE-F.1, F.2, F.3 (all not started) → **Gap:** zero redirect implementation → Evidence: `start-consultation.tsx`, `complete-consultation.tsx`, `consultation.tsx` confirmed to contain zero `cos_v1`/`VisitCommandCenter` references → **Blocks release because:** old screens and the new workspace are not connected for real users at all.

### FR-RBAC-1 — Role-aware composition, not forked screens
Design §3 → T-FE-E.6 (not started) → **Gap:** `episodeWorkspaceConfig.ts` untouched by any R7 commit; additionally, ETX-1's trace doc found `casesheet.sign`/`prescription.sign` are bypassed by hardcoded role checks rather than the permission system this requirement's own AC(3) assumes is authoritative → Evidence: `R7-PERMISSION-VERIFICATION.md` rows for `casesheet.sign`/`prescription.sign` → **Blocks release because:** the multi-role rendering this product is fundamentally built around doesn't exist, and a real, evidenced enforcement gap exists in the very mechanism this requirement depends on being trustworthy.

---

## RESOLVED (no longer block release — kept for history)

### FR-VCC-1, FR-WFA-1, FR-REC-1, FR-REC-2, FR-MOB-2 — RESOLVED 2026-07-27 (reconciliation finding)
All five were blocked on `T-FE-B.1`, `T-FE-B.2`, or `T-FE-D.1`, which had actually shipped (commits `6e667d15`, `acfa730a`, `426967bb`) without this document or `RTM-MASTER.md` being updated. Corrected this pass — see `RTM-MASTER.md`'s Reconciliation Evidence section.

### FR-HIST-1, FR-HIST-2 — RESOLVED 2026-07-27 / 2026-07-26
Clinical History is complete end-to-end (`T-BE-A.3b`/`T-FE-C.6a` closed the last gap, AC7/AC8/AC9). See `RTM-MASTER.md`'s FR-HIST-1/2 cards.

### FR-COS-1, FR-VCC-2, FR-VCC-3, FR-VCC-4, FR-CS-1, FR-CS-2, FR-CS-3, FR-CS-4, FR-CS-5, FR-TP-2, FR-PS-1, FR-FLAG-1 — already resolved in prior sessions, unaffected by this pass.

---

## Blocker count by cause

| Cause | Count |
|---|---|
| Backend complete, frontend consumption missing | 15 (FR-WFA-2, FR-CS-6, FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-1, FR-TS-2, FR-TS-4, FR-TS-5, FR-SCH-1, FR-SCH-2, FR-BILL-1, FR-BILL-2, FR-CR-1, FR-LEG-1) |
| Both sides genuinely unbuilt | 6 (FR-LD-1, FR-LD-2, FR-LD-3, FR-TP-3, FR-TS-3, FR-LEG-2) |
| Cross-cutting proof not run | 1 (FR-COS-2 — `T-Z.1`) |
| Judged optional at task level, formally still blocking | 1 (FR-MOB-1) |
| RBAC composition + a real pre-existing enforcement gap | 1 (FR-RBAC-1) |
| **Total** | **24** |

**The dominant release blocker remains missing frontend consumption of already-complete, already-tested backend contracts.** 15 of 24 blockers would clear the moment their corresponding frontend task ships, with zero new backend work required. The single widest-scope unblock is `T-FE-E.2`, which alone clears FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-1, FR-TS-2, FR-TS-3 (partially), and FR-SCH-1 (partially) — 6-7 of the 24.
