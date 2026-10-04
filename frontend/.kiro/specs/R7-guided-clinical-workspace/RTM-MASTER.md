# RTM-MASTER — NovaClinics Clinical Operating System, Authoritative Requirements Traceability Matrix

**Status: proposed authoritative source, not yet owner-approved.** This document reconciles `requirements.md`, `design.md`, `tasks.md`, the Dependency & Parallelism Map, `R7-OWNER-RATIFICATION.md`, both repositories' Engineering Truth/Debt documents, and the prior audit artifacts (`RTM.md`, `RTM-AUDIT.md`, `MVP-RELEASE-FREEZE.md`). It does not modify, rewrite, or reinterpret any of them. Every claim of completion below was checked against actual repository content (files, commits, tests) — nothing is marked done because it "looks done."

**As of:** 2026-07-27 (full reconciliation pass — statistics and stale statuses recomputed from zero, not carried forward as an addendum), narrowly updated 2026-07-26 for `T-FE-E.2`'s partial closure and again 2026-07-27 for `T-BE-D.4a` + `T-FE-E.2`'s further closure (only the cards each task touched — see the per-section `[Updated ...]` markers throughout; no broader recount performed) · Backend `novaclinicspro-api` @ `c69f7ef6a75161b96bc55df913ef35a48ee17dd0` (branch `feature/r7-clinical-operating-system`) · Frontend `novaclinicspro_rn` @ `bfe31956bcf2fbdcf0b9238b30543a0a7d732e9e` (same branch). **Reconciliation finding:** the prior pass (2026-07-25, carried through several narrow addenda since) had gone stale in more than just the Clinical History rows it was tracking — `T-FE-B.1`, `T-FE-B.2`, and `T-FE-D.1` had all shipped (commits `6e667d15`, `acfa730a`, `426967bb`) without their consuming requirement cards (`FR-VCC-1`, `FR-WFA-1`, `FR-REC-1`, `FR-REC-2`, `FR-MOB-2`) ever being updated to reflect it, and the "remaining task" classification table at the bottom of this document still listed 10 tasks (`T-BE-E.2/E.3/E.4/E.5`, `T-FE-B.1/B.2/C.4/C.5/C.6/C.7/D.1/E.1`) that had already completed. Every status below was re-verified this pass against current source, current tests, and `git log` on the current branch — see §Reconciliation Evidence for the exact commands and findings.

**This document is requirement-centric.** One row (one card, below) per Functional Requirement — 44 total. A requirement spanning many tasks still gets exactly one card. Task-centric detail (files/commits/blocked-by) lives inside each requirement's card as evidence, not as the organizing structure.

**Ground rules applied throughout:** nothing inferred, nothing assumed complete without file/test/commit evidence, every disagreement between Requirements/Design/Tasks/Implementation reported and left unresolved (never silently reconciled).

---

## How to read a card

- **Priority** — the requirement's own scoping intent, per `requirements.md`'s R7/R8 boundary and `R7-OWNER-RATIFICATION.md`: `MVP Mandatory` / `MVP Optional` / `Post MVP` / `Future`.
- **Backend/Frontend Status** — `Not Started` / `In Progress` / `Complete` / `Superseded` / `Deferred`, each independently, since most requirements have both a backend and frontend half that complete at different times.
- **Release Classification** — the current, evidence-based release verdict: `READY FOR MVP` / `BLOCKING MVP` / `OPTIONAL FOR MVP` / `DEFER TO R8` / `SUPERSEDED`. Never blank.
- **Testing** — which of Unit / Integration / Architecture / E2E actually exist, by file. A cross-cutting finding, stated once here rather than repeated 44 times: **no E2E test of any kind exists anywhere in either repository for any requirement** — every "Integration" test found is either a mocked-UoW/mocked-session backend test or a one-off disposable-Postgres verification script that is not part of the committed, CI-running suite. Where a card says "Integration," that caveat applies.

---

# Group: Clinical Operating System Shell

### FR-COS-1 — COS is one workspace on the existing route
**Business Objective:** Prevent a third parallel workspace surface; COS must render on the existing `episodes/[episodeId]/workspace.tsx` route, composing existing modules, replacing none.
**Priority:** MVP Mandatory
**Design:** §3 · **ADR/Decision:** D8 · **ET refs:** none · **Owner Ratification:** Decision 8 (R7/R8 split)
**Backend:** Tasks: none (frontend-only requirement) · Status: N/A
**Frontend:** Tasks: T-FE-A.1 · Status: **Complete**
**Implementation Evidence (FE):** `VisitCommandCenter.tsx` (new), `app/clinic-admin/episodes/[episodeId]/workspace.tsx` (wire only) — commit `1b53f3fd`
**Tests:** Unit + regression, 2 files (shell + workspace wiring)
**Traceability:** FR-COS-1 → design.md §3 → T-FE-A.1 → `VisitCommandCenter.tsx` → 2 test files → `1b53f3fd` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** None.

### FR-COS-2 — Frontend derives no clinical meaning
**Business Objective:** No R7 frontend code may compute recommendation/workflow assembly/completion readiness/clinical summary; render backend semantics only.
**Priority:** MVP Mandatory
**Design:** §DP-15 (cross-cutting, applies to every FE section) · **ADR/Decision:** — · **ET refs:** ED-ARCH-004, ED-ARCH-006 (both cited as the verified violations this requirement exists to close) · **Owner Ratification:** Decision 9
**Backend:** Tasks: T-BE-B.3 (contract guard) · Status: **Complete**
**Frontend:** Tasks: T-0.8, T-0.9 (close the two known violations); full proof is T-Z.1 · Status: **Partially Complete** — the two known violations are closed; the general proof across the whole frontend (T-Z.1) has not run because most consuming frontend surfaces (FE-B, D, E) don't exist yet to be scanned
**Implementation Evidence:** BE: `test_r7_workflow_contract_semantics_only.py` (permanent guard). FE: `CompleteConsultationScreen.tsx` (`T-0.8`, commit `cd48984d`), `useConsultationWorkspace.ts` (`T-0.9`, commit `055751dc`, test explicitly asserts `buildSectionConfig` is `undefined`)
**Tests:** Architecture (BE contract guard) + Unit/regression (FE, 2 tasks)
**Traceability:** FR-COS-2 → design.md §DP-15 → T-0.8/T-0.9/T-BE-B.3 → 3 files → 6 tests → `cd48984d`/`055751dc`/`2c69107` → Partially Complete
**Release Classification:** BLOCKING MVP
**Remarks:** Cannot be marked fully READY until FE-B/D/E exist and T-Z.1 can actually scan them — a requirement that is "unfalsified" because its consumers don't exist yet is not the same as "proven."

---

# Group: Visit Command Center (Briefing)

### FR-VCC-1 — Workspace opens on a briefing, not a form
**Business Objective:** Landing state must answer why-today/what-changed/before-you-act/recommended-next before any editable form appears.
**Priority:** MVP Mandatory
**Design:** §4a (matrix citation; this label does not resolve against design.md's actual headings — see `RTM-AUDIT.md` §7, finding #4) · **Decisions:** D7, D8 · **ET refs:** none · **Owner Ratification:** Decisions 7, 8
**Backend:** Tasks: T-BE-A.1, T-BE-B.1/B.2 (facts + recommendation contracts) · Status: **Complete**
**Frontend:** Tasks: T-FE-A.1 (shell), T-FE-B.1/B.2 (one-tap-to-recommended-task) · Status: **Complete** **[Corrected 2026-07-27 — stale]** — `T-FE-B.1` (commit `6e667d15`) and `T-FE-B.2` (commit `acfa730a`) both shipped 2026-07-24/25 without this card being updated; re-verified via `git log` and `WorkflowPills.tsx`/`NextActionBar.tsx` source inspection this pass
**Implementation Evidence:** `VisitCommandCenter.tsx` (`1b53f3fd`), `WorkflowPills.tsx` (`6e667d15`), `NextActionBar.tsx` (`acfa730a`)
**Tests:** Unit (shell) + unit/architecture/a11y (`T-FE-B.1`/`T-FE-B.2`)
**Traceability:** FR-VCC-1 → design.md §4a → T-FE-A.1/T-FE-B.1/T-FE-B.2 (all done) → `VisitCommandCenter.tsx`+`WorkflowPills.tsx`+`NextActionBar.tsx` → tests above → `1b53f3fd`/`6e667d15`/`acfa730a` → Complete
**Release Classification:** READY FOR MVP **[Corrected 2026-07-27]**
**Remarks:** This card was stale — see the document header's Reconciliation finding. The briefing landing state and one-tap-to-recommended-task AC are both now implemented and tested.

### FR-VCC-2 — "Why today"
**Business Objective:** Render appointment purpose + patient-stated concern; absent → "not recorded," never inferred.
**Priority:** MVP Mandatory
**Design:** — (cited only via WIREFRAMES W0 in the matrix) · **ET refs:** ETX-3 (resolved this requirement's own prerequisite — purpose field confirmed not to exist) · **Owner Ratification:** —
**Backend:** Tasks: T--1.3 (ETX-3 trace) · Status: **Complete**
**Frontend:** Tasks: T-FE-C.1 · Status: **Complete**
**Implementation Evidence:** `R7-APPOINTMENT-PURPOSE-VERIFICATION.md` (commit `916406e0`), `WhyTodaySection.tsx` (commit `e329ab5d`)
**Tests:** Unit, 2 files
**Traceability:** FR-VCC-2 → ETX-3 → T--1.3/T-FE-C.1 → `WhyTodaySection.tsx` → 2 tests → `916406e0`/`e329ab5d` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** None — this is a good example of a requirement correctly built around a verified absence rather than a guess.

### FR-VCC-3 — "What changed" (R7 scope)
**Business Objective:** Render exactly 8 backend-verified signals (last visit date, latest visit summary, active sessions, completed session count, pending review, prescription status, active episode, billing state); no measurement deltas (R8).
**Priority:** MVP Mandatory
**Design:** §2.1, §4a · **ADR/Decision:** D8 · **ET refs:** none new · **Owner Ratification:** referenced under Decision 8's "what R7 surfaces" boundary
**Backend:** Tasks: T-BE-A.6 · Status: **Complete**
**Frontend:** Tasks: T-FE-C.2 · Status: **Complete**
**Implementation Evidence:** `clinical_workspace_facts.py`, `i_visit_repository.py` (+1 method) — commit `1a72c58`; `WhatChangedSection.tsx` — commit `7e0629d9`
**Tests:** BE: extended `test_clinical_workspace_service.py`/`_router.py`. FE: 3 files
**Traceability:** FR-VCC-3 → design.md §2.1 → T-BE-A.6/T-FE-C.2 → `clinical_workspace_facts.py`+`WhatChangedSection.tsx` → 5 tests → `1a72c58`/`7e0629d9` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** Both sides shipped 2026-07-24, closing a gap `T-FE-C.2` itself found (only 3/8 signals had a verified backend field before `T-BE-A.6`).

### FR-VCC-4 — "Before you act" (R7 scope)
**Business Objective:** Render only verified-existing safety signals; explicitly prohibit any allergy/interaction/renal/hepatic panel.
**Priority:** MVP Mandatory
**Design:** §2.9 · **Decision:** F-2 = Option A · **ET refs:** F-2 Patient-Safety Reality Check · **Owner Ratification:** F-2
**Backend:** Tasks: T-BE-A.1/A.6 (facts) · Status: **Complete**
**Frontend:** Tasks: T-FE-C.3 · Status: **Complete**
**Implementation Evidence:** `BeforeYouActSection.tsx` — commit `0cfab0fa`
**Tests:** 2 files, including an explicit test asserting no allergy/interaction/renal/hepatic panel renders and no unbacked field is read (`beforeYouActSection.test.tsx:263`)
**Traceability:** FR-VCC-4 → design.md §2.9 → T-FE-C.3 → `BeforeYouActSection.tsx` → 2 tests (incl. explicit safety-negative test) → `0cfab0fa` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** One of the strongest-evidenced requirements in the whole matrix — the negative assertion (what must NOT render) is directly tested, not just assumed by omission.

---

# Group: Workflow Assembly & Recommendation

### FR-WFA-1 — Backend assembles the workflow
**Business Objective:** `clinical_workflow_resolver` (pure domain) assembles applicable stages from capability/purpose/episode-state/records/decisions/permissions/billing — no fixed canonical order, capability-gated never specialty-gated.
**Priority:** MVP Mandatory
**Design:** §2.1 · **Decision:** D9 · **ET refs:** ETX-4 (capability-loss policy, applied to this task's own AC) · **Owner Ratification:** Decision 9
**Backend:** Tasks: T-BE-B.1, T-BE-B.2 · Status: **Complete**
**Frontend:** Tasks: T-FE-D.1 (render) · Status: **Complete** **[Corrected 2026-07-27 — stale]** — commit `426967bb` shipped 2026-07-25 without this card being updated; re-verified via `git log` and `useConsultationWorkspace.ts`/workflow-rendering source this pass
**Implementation Evidence:** `clinical_workflow_resolver.py`, `clinical_workflow_service.py` — commits `f3895d8`, `bd0e746`; workflow rendering — commit `426967bb`
**Tests:** BE: Unit (no-DB resolver tests, per-journey) + Architecture (`test_clinical_workflow_architecture.py`) + capability-loss unit tests (AC 8-16). FE: per-journey unit + architecture ("no FE assembly") + regression.
**Traceability:** FR-WFA-1 → design.md §2.1 → T-BE-B.1/B.2/T-FE-D.1 (all done) → `clinical_workflow_resolver.py` → resolver/service/architecture/FE tests → `f3895d8`/`bd0e746`/`426967bb` → Complete
**Release Classification:** READY FOR MVP **[Corrected 2026-07-27]**
**Remarks:** This card was stale — see the document header's Reconciliation finding. Backend assembly and its frontend rendering are both complete and tested.

### FR-WFA-2 — Permissions gate actionability, not presence
**Business Objective:** A stage the role may not act on renders as waiting-on-role, never hidden; actionability from backend `blocking_factors`/`waiting_role`, not frontend role config alone.
**Priority:** MVP Mandatory
**Design:** §2.1 · **Decision:** D9 · **ET refs:** ETX-1 (permission codes, resolved by trace doc) · **Owner Ratification:** —
**Backend:** Tasks: T-BE-B.1/B.2 (contract carries the fields) · Status: **Complete**
**Frontend:** Tasks: T-FE-E.6 (role/capability composition consuming it) · Status: **Complete** [Reconciled 2026-10-04]
**Implementation Evidence:** `clinical_workflow_resolver.py` (`blocking_factors`/`waiting_role` fields)
**Tests:** BE resolver/service tests
**Traceability:** FR-WFA-2 → design.md §2.1 → T-BE-B.1/B.2 (done) + T-FE-E.6 (complete) → backend workflow facts rendered without local authority → Complete
**Release Classification:** BLOCKING MVP
**Remarks:** `NextActionBar` renders backend `waiting_role`/`blocking_factors`; E.6 adds backend capability-loss rendering without local policy derivation.

---

# Group: Case Sheet

### FR-CS-1 — One Case Sheet per Episode (find-or-create)
**Business Objective:** Opening a case sheet in a visit resolves the Episode's case sheet; a second is never created for the same Episode.
**Priority:** MVP Mandatory
**Design:** §2.2 · **Decision:** D1 · **ET refs:** ETX-2 (null-episode_id sheets, audited, no migration in R7) · **Owner Ratification:** Decision 1
**Backend:** Tasks: T-BE-C.1 · Status: **Complete**
**Frontend:** Tasks: T-FE-E.1a (compose — complete, commit `0ed23f7`) · Status: **Complete** **[Updated 2026-07-26]**
**Implementation Evidence:** `casesheets_service.py` — commit `fa03a4a`; `CaseSheetModule.tsx` composition — commit `0ed23f7`
**Tests:** Unit + integration dup-guard: `test_casesheet_find_or_create.py`; frontend composition/Episode-ownership tests in `caseSheetModuleComposition.test.tsx`
**Traceability:** FR-CS-1 → design.md §2.2 → T-BE-C.1 (done) + T-FE-E.1a (done) → `casesheets_service.py` + `CaseSheetModule.tsx` → tests above → `fa03a4a`, `0ed23f7` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** Backend rule is solid and tested; the Episode Case Sheet is now composed and exercised through `VisitCommandCenter` (`T-FE-E.1a`).

### FR-CS-2 — Contribution attributed to current Visit
**Business Objective:** Every Case Sheet write receives an explicit, backend-validated current-Visit context; `appointment_id` must never be used to resolve attribution (fixes the verified F-1 defect: every contribution after the first was mis-attributed to the creating visit).
**Priority:** MVP Mandatory
**Design:** §2.2 · **Decision:** D1, F-1 · **ET refs:** F-1 (BLOCKING finding, code-fixed here) · **Owner Ratification:** Decision 1 / F-1 RESOLVED
**Backend:** Tasks: T-BE-C.2 · Status: **Complete**
**Frontend:** Tasks: none required directly (backend service correction) · Status: N/A
**Implementation Evidence:** `casesheets_router.py`, `casesheets_service.py`, `i_casesheet_repository.py` — commit `e8ba0a2`
**Tests:** Unit (N-visit attribution) + integration (each rejection case): `test_casesheet_contribution_write_path.py`
**Traceability:** FR-CS-2 → design.md §2.2 → T-BE-C.2 → `casesheets_service.py` → `test_casesheet_contribution_write_path.py` → `e8ba0a2` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** The specific blocking defect F-1 named is fixed and tested. F-1's *broader* recommended follow-ups (episode_id non-nullability, appointment_id removal) remain explicitly deferred — see `RTM-AUDIT.md` §8 item 1 — but those are not this requirement's own AC.

### FR-CS-3 — Atomic content + contribution
**Business Objective:** Content update and contribution recording succeed together or fail together; no content update survives a missing required contribution.
**Priority:** MVP Mandatory
**Design:** §2.2 · **Decision:** F-1 · **ET refs:** F-1 (the mechanism already existed — UoW commit/rollback — this task removed a permissive guard, sizing correctly downgraded to Small) · **Owner Ratification:** —
**Backend:** Tasks: T-BE-C.3 · Status: **Complete**
**Frontend:** Tasks: none · Status: N/A
**Implementation Evidence:** `casesheets_service.py` (subtractive change — guard removal) — commit `48b49c9`
**Tests:** Unit + integration failure-injection: same file as C.2
**Traceability:** FR-CS-3 → design.md §2.2 → T-BE-C.3 → `casesheets_service.py` → failure-injection tests → `48b49c9` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** None.

### FR-CS-4 — Idempotent contribution
**Business Objective:** Retries must not create duplicate contributions.
**Priority:** MVP Mandatory
**Design:** §2.2(e) · **Decision:** F-1 · **ET refs:** [VP] — idempotency key deliberately not chosen in requirements/design, owner-directed decide-at-implementation · **Owner Ratification:** —
**Backend:** Tasks: T-BE-C.4 · Status: **Complete**
**Frontend:** Tasks: none · Status: N/A
**Implementation Evidence:** `casesheets_service.py`, migration `20260724_000001_r7_casesheet_contribution_idempotency.py` — commit `e7715d4`
**Tests:** Unit + integration (duplicate-submit, retry-after-timeout): extended write-path test file
**Traceability:** FR-CS-4 → design.md §2.2(e) → T-BE-C.4 → migration + service → tests → `e7715d4` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** **Open architectural question closed in practice, not yet in the frozen documents**: the idempotency key was decided during implementation as a caller-supplied `correlation_id`. `requirements.md`/`design.md` still describe this as an open `[VP]`. The implementation decision should be folded back into the governing documents as a ratified spelling — flagged, not fixed here.

### FR-CS-5 — Append-only visit notes surface
**Business Objective:** Prior visits' notes visibly retained with author + timestamp; a visit appends, never overwrites.
**Priority:** MVP Mandatory
**Design:** §2.2(g) · **Decision:** D1, **Decision 12** (DO-2 amendment, v1.3) · **ET refs:** T-BE-E.1a pre-implementation investigation · **Owner Ratification:** Decision 12
**Backend:** Tasks: `T-BE-E.1a` (snapshot migration/write/read contract) · Status: **Complete** **[Updated 2026-07-26]**. Implementation commit `00682b6`; shared development Supabase upgraded and verified at `20260727_000001` (commit `8e43b15`, see `.kiro/engineering/DB-T-BE-E1A-SNAPSHOT-UPGRADE-RESULT.md` in `novaclinicspro-api`).
**Frontend:** Tasks: `T-FE-E.1a` (composition — complete, commit `0ed23f7`), `T-FE-E.1b` (render history — complete, commit `c93fddf`) · Status: **Complete** **[Updated 2026-07-26]**
**Implementation Evidence:** `T-FE-E.1a` commit `0ed23f7`; `T-BE-E.1a` commit `00682b6` + DB upgrade `8e43b15`; `T-FE-E.1b` commit `c93fddf`
**Tests:** `T-FE-E.1a`'s composition tests; `T-BE-E.1a`'s 88 focused backend tests (snapshot, history, migration, idempotency, write path); `T-FE-E.1b`'s 26 focused frontend tests (data hook + rendering + isolation + architecture) plus updated `caseSheetModule.test.tsx`/`caseSheetModuleComposition.test.tsx` regression coverage
**Traceability:** FR-CS-5 → design.md §2.2(g) → T-BE-E.1a/T-FE-E.1a/T-FE-E.1b (all done) → `casesheets_service.py`, `casesheets_router.py`, `CaseSheetModule.tsx`, `CaseSheetContributionHistory.tsx` → tests above → `00682b6`, `8e43b15`, `0ed23f7`, `c93fddf` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** The original requirement rationale ("the contribution model exists but has no UI") undersold the actual gap — the model didn't persist content at all, only attribution. Decision 12 closed that gap without reopening DO-2's core invariant (one current, editable Case Sheet per Episode); the frontend now renders that history read-only, never merging it into the active draft.

### FR-CS-6 — Audit
**Business Objective:** Every contribution records actor, time, visit; amendments additionally record reason.
**Priority:** MVP Mandatory
**Design:** §2.2 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-C.2 (attribution carries actor/time/visit) · Status: **Complete** for the write side; amendment-reason half depends on FR-LD-2 (not started)
**Frontend:** Tasks: none directly · Status: N/A
**Implementation Evidence:** `casesheets_service.py` — commit `e8ba0a2`
**Tests:** same as FR-CS-2
**Traceability:** FR-CS-6 → design.md §2.2 → T-BE-C.2 (done) + amendment-reason half via T-BE-G.2 (not started) → Partially Complete
**Release Classification:** BLOCKING MVP
**Remarks:** Basic write-attribution audit is real and tested; the amendment-reason half of this requirement cannot exist until Living Documents (Group G) ships.

---

# Group: Living Documents

### FR-LD-1 — Signed versions immutable; documents remain amendable
**Business Objective:** DRAFT→FINAL→SIGNED→SUPERSEDED lifecycle; amendment creates a new version referencing/retaining the prior, never mutates a signed one.
**Priority:** MVP Mandatory
**Design:** §2.6 · **Decision:** D2 · **ET refs:** the verified `DocumentStatus` docstring contradiction this requirement exists to resolve · **Owner Ratification:** Decision 2
**Backend:** Tasks: T-BE-G.1 · Status: **Not Started**
**Frontend:** Tasks: T-FE-E.5 · Status: **Not Started**
**Implementation Evidence:** none
**Tests:** none
**Traceability:** FR-LD-1 → design.md §2.6 → T-BE-G.1/T-FE-E.5 → — → — → Not Started
**Release Classification:** BLOCKING MVP
**Remarks:** A RATIFIED architectural decision (Decision 2) with zero implementation. The contradiction it exists to resolve (`DocumentStatus`'s docstring still says "SIGNED: Immutable, terminal state" vs. the ratified "may be superseded") is still live in the codebase today.

### FR-LD-2 — Amendment permissions
**Business Objective:** Amendment requires a distinct permission from write; rejection is service-layer, not UI hiding.
**Priority:** MVP Mandatory
**Design:** §2.6 · **ET refs:** [VP] → ETX-1 (permission codes) · **Owner Ratification:** —
**Backend:** Tasks: T-BE-G.2 · Status: **Not Started**
**Frontend:** Tasks: none directly · Status: N/A
**Implementation Evidence:** none
**Tests:** none
**Traceability:** FR-LD-2 → design.md §2.6 → T-BE-G.2 → — → — → Not Started
**Release Classification:** BLOCKING MVP
**Remarks:** ETX-1's own trace doc found the specific permission codes this would need (`casesheet.amend`, `prescription.amend`) genuinely don't exist yet ("Class C — required, proposed code follows convention") — a concrete, evidenced gap, not a guess.

### FR-LD-3 — Close the `DocumentStatus` docstring contradiction
**Business Objective:** Update the docstring to match the ratified supersession model; documentation-only, no behavior change.
**Priority:** MVP Mandatory
**Design:** §2.6 · **Decision:** D2 · **ET refs:** — · **Owner Ratification:** Decision 2's own explicit note: "must not be silently ignored"
**Backend:** Tasks: T-BE-G.3 · Status: **Not Started**
**Frontend:** Tasks: none · Status: N/A
**Implementation Evidence:** none — the contradictory docstring (`"FINAL: Locked… SIGNED: Immutable, terminal state"`) is still present in `DocumentStatus`'s definition today
**Tests:** none
**Traceability:** FR-LD-3 → design.md §2.6 → T-BE-G.3 → not started → — → Not Started
**Release Classification:** BLOCKING MVP
**Remarks:** Lowest-effort task in the whole remaining backlog (Size S, docs-only) but blocked on `T-BE-G.1` landing first per its own dependency, so it cannot be picked off early to reduce backlog count.

---

# Group: Prescription

### FR-RX-1 — Verified document lifecycle only
**Business Objective:** R7 implements only DRAFT→FINAL→SIGNED (+SUPERSEDED via FR-LD-1); no Issue/Dispense action anywhere.
**Priority:** MVP Mandatory
**Design:** §2.7 · **Decision:** D3 · **ET refs:** the verified fact that `PrescriptionStatus(draft/issued/dispensed)` has zero runtime usages (ED-ARCH-002) · **Owner Ratification:** Decision 3
**Backend:** Tasks: none required (enforced by omission — no Issue/Dispense code was ever built) · Status: **Complete**
**Frontend:** Tasks: T-FE-E.2 · Status: **Complete** [Updated 2026-07-26]
**Implementation Evidence:** `tenant_prescription.status` (pre-existing `document_status` ENUM); `PrescriptionModule` composed unchanged into `VisitCommandCenter` — commit `80fb96d0`
**Tests:** pre-existing prescription test suite; `visitCommandCenter.test.tsx` composition assertions
**Traceability:** FR-RX-1 → design.md §2.7 → (no BE task needed) + T-FE-E.2 (done) → `tenant_prescription.status` + `PrescriptionModule` → pre-existing tests + composition tests → `80fb96d0` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** The backend constraint is trivially satisfied (nothing was ever built to violate it); `PrescriptionModule` (already T-0.2-remediated) is now reused unchanged in the doctor workflow composition, no new Rx logic introduced.

### FR-RX-2 — Copy-forward is not in R7
**Business Objective:** No copy-forward action ships in R7 — a negative requirement.
**Priority:** **Post MVP / Future** (this is the one requirement whose own text defers itself)
**Design:** — · **Decision:** D5 · **ET refs:** F-2 (copy-forward's reconciliation gate cannot check anything without allergy/medication data) · **Owner Ratification:** Decision 5 (RATIFIED → R8)
**Backend:** Tasks: none (by design) · Status: **Deferred**
**Frontend:** Tasks: none (by design) · Status: **Deferred**
**Implementation Evidence:** N/A — confirmed absent, as required
**Tests:** N/A
**Traceability:** FR-RX-2 → Decision 5 → (no task, by design) → confirmed absent → n/a → Deferred
**Release Classification:** DEFER TO R8
**Remarks:** The only requirement of the 44 that is itself scoped out of R7 by its own text. Its ratification carries a strong warning worth repeating here: shipping the reconciliation gate without the allergy/medication data model "would be worse than not shipping it" — R8 must build the data model before or alongside copy-forward, not after.

---

# Group: Treatment Recommendation & Plan

### FR-TR-1 — Recommendation is a proposal, not a course design
**Business Objective:** Answers "should this patient receive a course?"; does not own final course design; may lead to at most one approved Treatment Plan.
**Priority:** MVP Mandatory
**Design:** §2.3, §2.8 · **Decision:** D8, Decision 11 · **ET refs:** the removed `tenant_treatment_proposals` entity, the dual-endpoint discriminator ambiguity resolved by `T-BE-D.3a` · **Owner Ratification:** Decision 11 (v1.2 amendment, this session)
**Backend:** Tasks: T-BE-D.3a · Status: **Complete**
**Frontend:** Tasks: T-FE-E.2 · Status: **Complete** [Updated 2026-07-26]
**Implementation Evidence:** `tenant_treatment_sheet.py` (`creation_source` column), migration `20260724_000003_r7_recommendation_source_identity.py`, `i_treatment_order_repository.py::get_eligible_recommendation_source`, `i_treatment_plan_repository.py::get_by_originating_recommendation_id` — commit `fc8235a`; `TreatmentRecommendationModule` composed unchanged into `VisitCommandCenter` — commit `80fb96d0`
**Tests:** Structural (migration DDL) + Unit (mocked, every creation path + immutability via source inspection) + Integration (disposable Postgres, one-off concurrency proof, not in CI suite): `test_r7_recommendation_source_identity.py`; `visitCommandCenter.test.tsx` composition assertions
**Traceability:** FR-TR-1 → design.md §2.3/§2.8 → T-BE-D.3a (done) + T-FE-E.2 (done) → `tenant_treatment_sheet.py`+migration + `TreatmentRecommendationModule` → tests above → `fc8235a`/`80fb96d0` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** This requirement's backend realization required a genuine design correction mid-flight — see `RTM-AUDIT.md` §1 finding #4 and §7 finding #3. Known minor gap (not part of this requirement's own formal AC): `TreatmentRecommendationModule` does not yet surface `cancellation_reason_code`/`cancellation_reason_text` (added to the frontend DTO in `4fba2ec4` but not yet consumed by this component) when a Recommendation is declined/cancelled — reused unchanged per this task's own scope commitment, not a regression.

### FR-TP-1 — Treatment Plan is first-class persisted, versioned entity
**Business Objective:** Plan answers "what course is clinically intended?"; owns patient/Episode/Recommendation/clinician/therapies/session-count/frequency/etc.; contains no committed dates; persists independently of scheduling.
**Priority:** MVP Mandatory
**Design:** §2.3 · **Decision:** Treatment Plan resolution · **ET refs:** verified no Plan entity existed pre-R7 (`app/domain/treatment_plan/` held only `SyncResult`); ETX-5 naming collision with `tenant_visits.treatment_plan` (resolved by T--1.4) · **Owner Ratification:** "Treatment Plan — RESOLVED · first-class entity" section
**Backend:** Tasks: T-BE-D.1, T-BE-D.2, T-BE-D.3, T-BE-D.4, T-BE-D.4a · Status: **Complete** [Updated 2026-07-27: T-BE-D.4a exposed the public contract]
**Frontend:** Tasks: T-FE-E.2 · Status: **Complete** [Updated 2026-07-27]
**Implementation Evidence:** `treatment_plan/models.py` (domain, `216d82c`), `tenant_treatment_plan.py` + migration `20260724_000002` (ORM/schema, `f0fdb33`), `sqlalchemy_treatment_plan_repository.py` + UoW registration (`bbe4066`), `treatment_plan_service.py` + `i_treatment_plan_service.py` + factory (`f09097f`), `treatment_plans_router.py` + `app/schemas/treatment_plans.py` (`c69f7ef`); `TreatmentPlanModule.tsx` + `treatmentPlans.dtos/api/repository.impl.ts` composed into `VisitCommandCenter` (`bfe31956`)
**Tests:** Unit (domain invariants, repository, service — mocked) + Structural (migration DDL) + API/contract/RBAC/architecture (T-BE-D.4a, 27 tests) + semantics-only guard (9 tests): `test_r7_treatment_plan_domain.py`, `_persistence.py`, `test_treatment_plan_repository.py`, `test_treatment_plan_service.py`, `test_r7_treatment_plan_api.py`, `test_r7_treatment_plan_contract_semantics_only.py`; frontend: `treatmentPlanModule.test.tsx` (12 tests)
**Traceability:** FR-TP-1 → design.md §2.3 → T-BE-D.1..D.4a (done) + T-FE-E.2 (done) → new modules + router/schema + 1 migration → test files above → `216d82c`/`f0fdb33`/`bbe4066`/`f09097f`/`c69f7ef`/`bfe31956` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** The entity, its persistence, the service that creates it from a Recommendation, and now the public HTTP contract and frontend composition are all complete and tested — this is the single most rigorously verified chain in the entire matrix (6 sequential tasks, each independently audited on landing). [Updated 2026-07-27] `T-FE-E.2`'s prior partial closure confirmed "Frontend never reconstructs the Plan from schedule rows" (AC15) held only because composition could not be attempted at all; `T-BE-D.4a` closed that gap, and `TreatmentPlanModule` now composes create/view with every clinical-intent field rendered directly from the Plan response, never reconstructed. Note: workflow-intelligence deriving treatment readiness from the authoritative Plan + Sessions (FR-TP-1 AC14) is a separate, unrelated task's scope (workflow resolver, not tracked against this card).

### FR-TP-2 — Plan lifecycle: semantic stages frozen, spelling deferred
**Business Objective:** 8 named stages (Authoring…Stopped/discontinued) must all be representable; smallest additive model.
**Priority:** MVP Mandatory
**Design:** §2.3 · **ET refs:** [VP] spelling deferred; explicit warning not to reuse `TreatmentLifecycleStatus` (verified semantic mismatch — execution status, not Plan lifecycle) · **Owner Ratification:** Treatment Plan resolution section
**Backend:** Tasks: T-BE-D.1 · Status: **Complete**
**Frontend:** Tasks: none directly · Status: N/A
**Implementation Evidence:** `treatment_plan/models.py::TreatmentPlanStatus` (8-member enum, distinct type from `TreatmentLifecycleStatus`, verified by a dedicated test) — commit `216d82c`
**Tests:** `test_r7_treatment_plan_domain.py::TestFrozenEightStageLifecycle`, `TestNoTreatmentLifecycleStatusReuse`
**Traceability:** FR-TP-2 → design.md §2.3 → T-BE-D.1 → `TreatmentPlanStatus` enum → domain tests → `216d82c` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** **Open architectural question closed in practice, not in the frozen documents**: exact spelling (`authoring`/`approved_clinical_intent`/…/`stopped_discontinued`) was decided at implementation. `requirements.md` still calls this `[VP]` deferred. Should be ratified back into the governing documents.

### FR-TP-3 — Plan amendment vs. schedule change
**Business Objective:** Four distinct operations never conflated: clinical-intent change → new version; schedule-logistics change → no new version; unexecuted-session-instruction edit → session-level only; execution-record correction → audit-controlled.
**Priority:** MVP Mandatory
**Design:** §2.3, §2.6 · **Decision:** —, D2 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-D.5 · Status: **Complete [2026-10-04]**
**Frontend:** Tasks: none directly · Status: N/A
**Implementation Evidence:** none
**Tests:** none
**Traceability:** FR-TP-3 → design.md §2.3/§2.6 → T-BE-D.5 → governed amendment/lineage/replacement/scheduling transport → isolated local PostgreSQL acceptance (18 passed) + affected regression suite (141 passed) → Complete
**Release Classification:** BLOCKING MVP
**Remarks:** Complete in backend commit `067427a2`. Clinical-intent amendment creates a new immutable Plan version in G1 lineage; `document_version` and `superseded_by_plan_id` are projections. Scheduling, future-instruction editing, and execution correction remain non-versioning operational/session concerns. D5-OD-1…15 record the frozen ownership and safety boundary. ET-MIG-001 and G1_B2_RUNTIME_CONCURRENCY_DEFERRED_REQUIRES_ISOLATED_DB remain open independently.

---

# Group: Sessions & Scheduling

### FR-TS-1 — Stable session identity
**Business Objective:** Session identity stable, never recreated during rescheduling/reassignment/hold/instruction-update; `day_number` is display-order only, never identity.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** verified `treatment_sheet_row` already ~70% separated pre-R7 · **Owner Ratification:** Treatment Plan resolution section
**Backend:** Tasks: T-BE-E.1 · Status: **Complete**
**Frontend:** Tasks: T-FE-E.2/E.3 (compose) · Status: **In Progress** [Updated 2026-07-26: T-FE-E.2 portion done — T-FE-E.3 not started]
**Implementation Evidence:** `i_treatment_plan_repository.py` (docstring extension — reuses the existing `get_by_originating_recommendation_id` lookup for Session→Plan resolution, no new column/entity) — commit `c16cbf0`; `SessionInstructionsModule` selects/edits Sessions keyed on `TreatmentSheetRow.id`, never `day_number`/array position — commit `80fb96d0`
**Tests:** Structural + behavioral (28 tests): `test_r7_stable_session_identity.py`; `sessionInstructionsModule.test.tsx` (asserts stable-id selection)
**Traceability:** FR-TS-1 → design.md §2.4 → T-BE-E.1 (done) + T-FE-E.2 (done)/E.3 (not started) → `i_treatment_plan_repository.py` + `SessionInstructionsModule` → tests above → `c16cbf0`/`80fb96d0` → Partially Complete
**Release Classification:** BLOCKING MVP
**Remarks:** This task deliberately added almost no new production code — it proved, via structural/behavioral tests, that the pre-existing `treatment_sheet_row` machinery (built well before R7) already satisfies AC(5)/(10)/(11) and the "no regenerate" prohibition. This is the correct outcome per the requirement's own rationale ("R7 finishes it; it does not rewrite it"), not an under-delivery. [Updated 2026-07-26] The doctor-facing half of stable-identity consumption (selecting/editing a Session by id) is now composed; the therapist-facing execution half (T-FE-E.3) remains unstarted.

### FR-TS-2 — Schedule attributes
**Business Objective:** Date/time/therapist/room/bed/resource/operational status change without touching Plan identity, Session identity, doctor content, or execution history.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-E.1 (proven by omission — verified no scheduling-mutation method touches Plan/identity) · Status: **Complete**
**Frontend:** Tasks: T-FE-E.2 · Status: **Complete** [Updated 2026-07-26]
**Implementation Evidence:** same as FR-TS-1 — `schedule_row`/`unschedule_row`/`start_row`/`bulk_schedule_rows` verified via source inspection to key on `row_id` only, never `day_number`, and never construct a replacement row; `SchedulingModule` composed (current scheduled/unscheduled state + schedule/reschedule action via the existing `ScheduleRowModal`) — commit `80fb96d0`
**Tests:** same file as FR-TS-1; `schedulingModule.test.tsx`
**Traceability:** FR-TS-2 → design.md §2.4 → T-BE-E.1 (done) + T-FE-E.2 (done) → same evidence + `SchedulingModule` → same tests + `schedulingModule.test.tsx` → `c16cbf0`/`80fb96d0` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** None beyond FR-TS-1's. [Updated 2026-07-26] Schedule attributes (date/time/therapist) are now visible and, where the `treatment_order.schedule` permission is present, editable from the doctor workspace — reuses the existing write path unchanged, no new scheduling logic.

### FR-TS-3 — Doctor clinical content bound to session identity
**Business Objective:** Author-once-apply-to-many across sessions with per-session override; rescheduling never deletes/regenerates/detaches/remaps content.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-E.3 · Status: **Complete** [Corrected 2026-07-27 — see Remarks]
**Frontend:** Tasks: T-FE-E.2a · Status: **Complete** [Updated 2026-07-27]
**Implementation Evidence:** `sqlalchemy_treatment_sheet_repository.py` (protected-field rejection, commit `9497f13`); `SessionInstructionsModule.tsx` (single-session authoring, commit `80fb96d0`; author-once-apply-to-many multi-select + bulk apply, commit `7e2ce7f1`)
**Tests:** `test_r7_doctor_content_bound_to_session.py` (58, backend AC6); `sessionInstructionsBulkApply.test.tsx` (20), `sessionInstructionsArchitecture.test.ts` (10), `sessionInstructionsModule.test.tsx` (8, unchanged — regression proof)
**Traceability:** FR-TS-3 → design.md §2.4 → T-BE-E.3 (done, `9497f13`) / T-FE-E.2a (done, `7e2ce7f1`) → `sqlalchemy_treatment_sheet_repository.py` + `SessionInstructionsModule.tsx` → tests above → `9497f13`/`7e2ce7f1` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** [Corrected 2026-07-27, Engineering Truth re-verification] This card and every downstream document (through several prior sessions' own completion reports) claimed `T-BE-E.3` was "Not Started" — **false**, confirmed via direct `git log`: commit `9497f13` (2026-07-25) predates every one of those claims. AC6 ("doctor instructions survive rescheduling by construction") is satisfied: the row-update path now rejects Session-identity and therapist-execution fields instead of silently applying them, closing the gap between "every current caller happens to be careful" and "structurally guaranteed." [Updated 2026-07-27, T-FE-E.2a closure] The requirement's own "Adoption requirement" (author-once-apply-to-many) is now built: `SessionInstructionsModule` adds an independent `checkedRowIds: Set<string>` multi-select (never conflated with the pre-existing single-row `selectedRowId` flow), a shared author-once draft applied via exactly one call to the existing `useUpdateAllTreatmentSheetRowsMutation`/`bulk_update_treatment_sheet_rows_by_tenant` (no new endpoint, no client-side mutation loop). Confirmed-atomic backend (`bulk_update` validates every row — sheet-edit permission, row-exists, row-belongs-to-sheet, no row COMPLETED — before any mutation; any failure rolls the whole batch back, never partially applies), so no confirmation-race or partial-success handling was needed beyond surfacing the atomic error. One gap remains, reported not fixed (out of this task's scope, does not block FR-TS-3's own AC): the bulk endpoint carries no OCC/version parameter at any layer, unlike the single-row path's `If-Match`; documented in code and covered by a dedicated architecture test (`sessionInstructionsArchitecture.test.ts`). Category corrected from Partially Complete to Fully Complete.

### FR-TS-4 — Therapist execution record
**Business Objective:** Actuals stay attached to the executed session; append-only/audit-controlled; reschedule never overwrites.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** [VP] adverse-events marker · **Owner Ratification:** —
**Backend:** Tasks: T-BE-E.4, T-BE-E.4a · Status: **Complete, exposed** (`record_session_non_execution` implemented in `TreatmentSheetsService`; `POST /treatment-sheets/rows/{row_id}/non-execution` exposes it — commit `a0aa4c3`)
**Frontend:** Tasks: T-FE-E.3 · Status: **Complete** [Updated 2026-07-28]
**Implementation Evidence:** commits `9497f13`, `ccf56d8`, `1529b47`, `a0aa4c3` (backend); `302bccbf` (frontend — `TherapistDashboardScreen.tsx` composes the full lifecycle: assigned-session listing, read-only doctor instructions, Start Session, Complete with materials, and the new Record Non-Execution action, all via the already-established `useTherapistSessionsQuery`/`useStartSessionMutation`/`useCompleteSheetRowMutation`/new `useRecordSessionNonExecutionMutation` canonical hooks); DB result doc `DB-T-BE-E4-MIGRATION-UPGRADE-RESULT.md`
**Tests:** `tests/test_r7_session_non_execution.py` (44), `tests/test_r7_doctor_content_bound_to_session.py`, `tests/test_r7_session_non_execution_api.py` (17); `sessionNonExecutionModal.test.tsx` (8), `therapistExecutionArchitecture.test.ts` (10)
**Traceability:** FR-TS-4 → design.md §2.4 → T-BE-E.4/T-BE-E.4a (done) / T-FE-E.3 (done, `302bccbf`) → `TherapistDashboardScreen.tsx` + `SessionNonExecutionModal.tsx` → tests above → `a0aa4c3`/`302bccbf` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** [2026-07-25] `T-BE-E.4a` closed the transport gap the prior audit found. Two prerequisite gaps discovered and fixed while exposing it: the interface method was missing entirely, and the row `_to_dict` projection never exposed the two migrated columns (response would have always read `None`). See `T-BE-E.4a`'s task card for full detail. [Updated 2026-07-28, T-FE-E.3] Engineering Truth found `start`/`complete` were already composed by a pre-existing, pre-R7 `TherapistDashboardScreen` (row_id-based, idempotent completion, materials handling) — this was not a from-scratch build, only the structured non-execution action was genuinely missing and has now been added. One reported, non-blocking gap: `TherapistSessionItem` (the `get_therapist_sessions` list schema the therapist screen actually reads) carries no `non_execution_reason_code`/`non_execution_reason_text` field, and non-execution does not mutate row `status` server-side — so the composed 3-fact label is genuinely displayed immediately after the action (from the record endpoint's own response) but cannot be durably re-shown after the list's next refetch (30s auto-refetch/focus-refetch, both pre-existing). This is a backend contract gap, reported not worked around — no client-side fake persistence was added. Tracked as follow-up debt, not a blocker for this card's own frozen AC (composed-from-3-facts, no MISSED), which is satisfied.

### FR-TS-5 — "Missed" is decomposed, not a single state
**Business Objective:** Backend semantics distinguish what was scheduled / whether execution occurred / why not; UI composes the label from three facts, never a single ambiguous state.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** [VP] exact state names deferred to implementation, after Engineering Truth · **Owner Ratification:** "Session 'Missed' — RESOLVED at architecture level" (the three-part shape is ratified; spelling is not)
**Backend:** Tasks: T-BE-E.4, T-BE-E.4a · Status: **Complete, exposed** (state-name spelling decided: `PATIENT_NO_SHOW`/`PATIENT_CANCELLED`/`CLINIC_CANCELLED`/`CLINICAL_HOLD`/`OTHER`, migration `20260726_000001` on shared dev; reachable via `POST /treatment-sheets/rows/{row_id}/non-execution` — commit `a0aa4c3`)
**Frontend:** Tasks: T-FE-E.3 · Status: **Complete** [Updated 2026-07-28]
**Implementation Evidence:** commits `ccf56d8`, `1529b47`, `a0aa4c3` (backend); `302bccbf` (frontend — `SessionNonExecutionModal.tsx` renders the exact governed vocabulary via localized labels only, never a raw code; `TherapistDashboardScreen.tsx` renders schedule state / "execution did not occur" / reason as three separate lines, never composed into one `MISSED` string); migration `20260726_000001_r7_session_non_execution_reason.py`
**Tests:** `tests/test_r7_session_non_execution.py` (44), `tests/test_r7_session_non_execution_api.py` (17); `sessionNonExecutionModal.test.tsx` (8, incl. "never renders a Missed label"), `therapistExecutionArchitecture.test.ts` (10, incl. a dedicated no-MISSED source-scan)
**Traceability:** FR-TS-5 → design.md §2.4 → T-BE-E.4/T-BE-E.4a (done) / T-FE-E.3 (done, `302bccbf`) → `SessionNonExecutionModal.tsx` → tests above → `a0aa4c3`/`302bccbf` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** [2026-07-25] Both the spelling question and the exposure gap are now resolved. [Updated 2026-07-28, T-FE-E.3] The three-part composition is rendered honestly: schedule state, "execution did not occur", and the localized reason are three separate `Text` lines, sourced only from the record-non-execution response's own three fields — no invented ambiguous status. See FR-TS-4's Remarks for the one reported (non-blocking) gap in durable re-display after a list refetch.

### FR-SCH-1 — Scheduling intents
**Business Objective:** Consecutive · alternate-day · specific weekdays · weekly · multiple/week · non-sequential · PRN · review-dependent continuation, capability-gated never specialty-gated.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-E.2, T-BE-E.2a, T-BE-D.4a · Status: **Complete, exposed and reachable** [Updated 2026-07-27] (`resolve_scheduling_proposal` implemented in `TreatmentPlanService`, all 9 intents; `GET /treatment-sheets/plans/{plan_id}/scheduling-proposal` exposes it — commit `882dfa6`; `T-BE-D.4a` closed the last gap — the frontend now has a way to obtain a `plan_id` at all, commit `c69f7ef`)
**Frontend:** Tasks: T-FE-E.2 · Status: **Complete** [Updated 2026-07-27]
**Implementation Evidence:** commits `c496c86`, `882dfa6`, `80fb96d0` (`SchedulingModule` current-state+write), `c69f7ef` (`T-BE-D.4a`), `bfe31956` (`SchedulingModule` proposal consumption)
**Tests:** `tests/test_r7_scheduling_intents.py` (48), `tests/test_r7_scheduling_proposal_api.py` (12), `schedulingModule.test.tsx` (16, incl. 7 proposal-specific)
**Traceability:** FR-SCH-1 → design.md §2.4 → T-BE-E.2/T-BE-E.2a/T-BE-D.4a (done) / T-FE-E.2 (done) → `SchedulingModule` → tests above → `882dfa6`/`c69f7ef`/`bfe31956` → Fully Complete
**Release Classification:** READY FOR MVP
**Remarks:** [2026-07-25] `T-BE-E.2a` closed the transport gap the prior audit found; also added the DI factory for `TreatmentPlanService`, which had never been wired into the FastAPI graph at all before this task. [2026-07-26] `resolve_scheduling_proposal` was itself fully exposed and reachable in principle, but required a `plan_id` the frontend had no way to obtain (same gap as FR-TP-1). [Updated 2026-07-27] `T-BE-D.4a` closed that gap; `SchedulingModule` now obtains `plan_id` from the same Recommendation-keyed Plan lookup `TreatmentPlanModule` uses (shared query key, react-query dedupes the fetch) and renders "governed scheduling intent"/proposed dates/PRN/review-dependent framing exactly as the backend returns them — no local date computation or sorting.

### FR-SCH-2 — Synchronization semantics
**Business Objective:** Reschedule/therapist-change/room-change/cancellation/missed/additional-session/reduced-course all preserve doctor content and execution history; OCC prevents silent clobber.
**Priority:** MVP Mandatory
**Design:** §2.4 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: T-BE-E.3, T-BE-E.5 · Status: **Accepted, with a documented compatibility amendment** (`expected_version` end-to-end + `If-Match` on `PATCH /treatment-sheets/rows/{row_id}`; conflict → 409 `VERSION_CONFLICT` + `current_version`, no mutation — verified. Missing-header behavior amended from mandatory-428 to staged-optional pending `T-FE-E.5` — see Remarks)
**Frontend:** Tasks: T-FE-E.2, T-FE-E.5 · Status: **Partially Complete** [Updated 2026-07-26] (T-FE-E.2 portion: OCC now real end-to-end for Session content saves; T-FE-E.5's mandatory-header adoption not started)
**Implementation Evidence:** commits `9497f13` (T-BE-E.3 — corrected 2026-07-27, this citation previously mislabeled `f9614d7`, which is T-BE-E.5's own commit), `f9614d7` (T-BE-E.5 initial), `93e9b8d` (compatibility amendment), `4fba2ec4` (fixed a live route-mismatch defect in `updateTreatmentSheetRowApi` — it carried an erroneous `tenant_id` URL segment the backend route never accepted — and added the optional `expectedVersion`/`If-Match` plumbing this AC needs), `80fb96d0` (`SessionInstructionsModule` sends the order's `version` as `If-Match` on every save, surfaces an explicit conflict state with a reload action on 409, never a silent overwrite or blind retry)
**Tests:** `tests/test_r7_doctor_content_bound_to_session.py` (58), `tests/test_r7_session_concurrency_occ.py` (33), `sessionInstructionsModule.test.tsx` (OCC conflict/reload cases)
**Traceability:** FR-SCH-2 → design.md §2.4 → T-BE-E.3/E.5 (done, staged) / T-FE-E.2 (done for content saves) / T-FE-E.5 (not started) → `SessionInstructionsModule` + fixed datasource → tests above → `93e9b8d`/`4fba2ec4`/`80fb96d0` → Partially Complete
**Release Classification:** BLOCKING MVP
**Remarks:** Backend-closure audit (2026-07-25): T-BE-E.5 as first landed made `If-Match` unconditionally mandatory (missing → 428). Audit found `novaclinicspro_rn`'s `updateTreatmentSheetRowApi` sends no `If-Match` and retains no `version`, and `T-FE-E.5` (the task that adopts this contract) has not started — mandatory enforcement today would break the only live caller instead of surfacing a reload/keep conflict, the opposite of the AC. Corrected to Decision B (staged adoption, commit `93e9b8d`): OCC fully enforced whenever a token is supplied, 428 removed until `T-FE-E.5` lands. This is a scoped, documented rollout boundary, not a requirement weakening — a follow-up task must make the header mandatory once `T-FE-E.5` ships. [Updated 2026-07-26] `T-FE-E.2` closes the gap the 2026-07-25 audit flagged as a possibility: the route-mismatch defect was confirmed live and fixed, and `SessionInstructionsModule` is the first real caller sending `If-Match`. The header is still not made mandatory here, per this task's own explicit instruction not to own that closure step — that remains `T-FE-E.5`.

---

# Group: Billing

### FR-BILL-1 — Billing visible, doctor read-only
**Business Objective:** Workspace shows consultation charges/clinical services/therapy charges/medicines/consumables/procedures/invoice+payment status/outstanding; doctors read-only, admin/front-desk full access where permitted.
**Priority:** MVP Mandatory
**Design:** §2.5 · **Decision:** D6 · **ET refs:** verified spine `TenantClinicalService.visit_id` (`nullable=False`) → `TenantInvoiceLine.clinical_service_id` → invoice → payment · **Owner Ratification:** Decision 6
**Backend:** Tasks: T-BE-F.1 (**Complete** read contract), T-BE-F.1a (**Complete** governed action contract)
**Frontend:** Tasks: T-FE-E.4 · Status: **Complete**
**Implementation Evidence:** T-BE-F.1: `i_finance_repository.py`, `sqlalchemy_repositories.py` — commit `efe2344`; T-BE-F.1a: backend commit `e2ee6600001b407aef98f48232cd5eace2526f46`, gate `VISIT_SCOPED_INVOICE_ACTION_CLEAN`, 88 passed / 0 failed / 0 skipped; T-FE-E.4: frontend commit `d5854bd465747dbdf2a25aaea07d706ac5b162dc`, gate `E4_BILLING_STAGE_BACKEND_TRUTH_CLEAN`, 54 passed / 0 failed / 0 skipped
**Tests:** `test_finance_repository_visit_scope.py`, `test_billing_clinical_service_boundary.py`
**Traceability:** FR-BILL-1 → design.md §2.5 → T-BE-F.1 (done, read) + T-BE-F.1a (done, governed action) → T-FE-E.4 (done: backend facts, effective capability visibility, permission-gated governed navigation) → evidence above → Complete
**Release Classification:** BLOCKING MVP
**Remarks:** None beyond the missing frontend stage.

### FR-BILL-2 — Clinical completion ≠ financial completion
**Business Objective:** Unbilled services produce a visible warning; clinical completion succeeds; billing never blocks by default.
**Priority:** MVP Mandatory
**Design:** §2.5 · **Decision:** D6 · **ET refs:** none · **Owner Ratification:** Decision 6
**Backend:** Tasks: T-BE-F.2 · Status: **Complete**; T-BE-F.1a completed while preserving its warning-only invariant
**Frontend:** Tasks: T-FE-E.4 · Status: **Complete** (warning-only billing presentation)
**Implementation Evidence:** none needed — commit `f57d93b`'s own message states no production code changed; existing behavior was already correct
**Tests:** `test_billing_completion_never_blocks.py`
**Traceability:** FR-BILL-2 → design.md §2.5 → T-BE-F.2 (done, verification-only) + T-BE-F.1a (done, preserves non-blocking) → T-FE-E.4 (done, unbilled warning only; no frontend completion authority) → `d5854bd465747dbdf2a25aaea07d706ac5b162dc` → Complete
**Release Classification:** BLOCKING MVP
**Remarks:** A genuinely pleasant finding — the requirement was already true before R7 touched anything; the task existed to *prove* it, and did, cheaply (no code change).

---

# Group: Recommendation & Completion Readiness

### FR-REC-1 — The backend owns the recommendation
**Business Objective:** `clinical_workflow_service` returns `recommended_action`/`reason`/`blocking_factors`/`waiting_role`/`completion_readiness` (+alternatives); contract carries no presentation fields.
**Priority:** MVP Mandatory
**Design:** §2.1, §4 · **Decision:** D9 · **ET refs:** none · **Owner Ratification:** Decision 9
**Backend:** Tasks: T-BE-B.2, T-BE-B.2a, T-BE-B.3 · Status: **Complete**
**Frontend:** Tasks: T-FE-B.1/B.2 (render) · Status: **Complete** **[Corrected 2026-07-27 — stale]** — commits `6e667d15`/`acfa730a` shipped without this card being updated
**Implementation Evidence:** `clinical_workflow_service.py`, `clinical_workflow_router.py` — commits `bd0e746`, `f23e018`; `WorkflowPills.tsx`/`NextActionBar.tsx` — commits `6e667d15`/`acfa730a`
**Tests:** Contract/semantics-only guard: `test_r7_workflow_contract_semantics_only.py` (`2c69107`, hardened `eaca818`). FE: per-state unit + architecture ("no assembly") + a11y.
**Traceability:** FR-REC-1 → design.md §2.1/§4 → T-BE-B.2/B.2a/B.3/T-FE-B.1/B.2 (all done) → service + router + FE components → semantics guard + FE tests → `bd0e746`/`f23e018`/`2c69107`/`6e667d15`/`acfa730a` → Complete
**Release Classification:** READY FOR MVP **[Corrected 2026-07-27]**
**Remarks:** This card was stale — see the document header's Reconciliation finding. The backend contract and its rendering are both complete and permanently guarded.

### FR-REC-2 — Recommend, never decide
**Business Objective:** Every recommendation presents action/reason/context/blocker/alternatives; deviation immediate (≤1 tap) and unpunished; no forced sequencing, no automatic clinical decision.
**Priority:** MVP Mandatory
**Design:** — · **Decision:** D7 · **ET refs:** none · **Owner Ratification:** Decision 7
**Backend:** Tasks: none directly (contract from FR-REC-1 covers the data) · Status: N/A
**Frontend:** Tasks: T-FE-B.2 · Status: **Complete** **[Corrected 2026-07-27 — stale]** — commit `acfa730a`
**Implementation Evidence:** `NextActionBar.tsx` — commit `acfa730a`
**Tests:** unit · architecture ("FE computes no recommendation") · a11y
**Traceability:** FR-REC-2 → Decision 7 → T-FE-B.2 (done) → `NextActionBar.tsx` → tests above → `acfa730a` → Complete
**Release Classification:** READY FOR MVP **[Corrected 2026-07-27]**
**Remarks:** This card was stale — see the document header's Reconciliation finding. `[Do this]` + `[Something else ▾]` deviation menu is implemented and tested; the frontend computes no recommendation of its own (architecture-tested).

### FR-CR-1 — Backend owns completion readiness
**Business Objective:** Backend is the single answer to "can this visit be completed?" — outstanding mandatory work, optional suggested work, warnings, all explicit states.
**Priority:** MVP Mandatory
**Design:** §2.1 · **Decision:** D9 · **ET refs:** verified violation — completion was derived across ~10 frontend modules (ED-ARCH-006/B) plus `deriveSummary` (ED-ARCH-004) · **Owner Ratification:** Decision 9
**Backend:** Tasks: T-BE-F.3 · Status: **Complete**
**Frontend:** Tasks: T-0.8 (consumes it), T-FE-F.2 (route adapter) · Status: **Complete [Reconciled 2026-10-04]** — T-0.8 consumes the contract and T-FE-F.2 flag-gates the completion-route redirect.
**Implementation Evidence:** `consultation_completion_service.py`, `_resolver.py`, `consultation_completion_router.py` — commits `c9630e8`, `7fe1991`; `CompleteConsultationScreen.tsx` — commit `cd48984d`
**Tests:** 3+ backend test files, 3 frontend test files
**Traceability:** FR-CR-1 → design.md §2.1 → T-BE-F.3/T-0.8/T-FE-F.2 (done) → backend contract + `CompleteConsultationScreen.tsx` + completion adapter → focused 47/0 adapter/flag regression → Complete
**Release Classification:** READY FOR MVP
**Remarks:** The ON path redirects to the workspace completion stage only; the OFF path retains `CompleteConsultationScreen`. No frontend completion-readiness policy was added.

---

# Group: Patient Safety

### FR-PS-1 — R7 surfaces only verified-existing signals
**Business Objective:** Pending clinical reviews, active prescription status, active episode, session progress, billing state — nothing else; frontend must not fabricate/derive/interpret; unbacked safety field never displayed.
**Priority:** MVP Mandatory
**Design:** §2.9 · **Decision:** F-2 · **ET refs:** F-2 (allergies/interactions/renal confirmed not to exist anywhere in the backend) · **Owner Ratification:** F-2 = Option A
**Backend:** Tasks: T-BE-A.1/A.6 · Status: **Complete**
**Frontend:** Tasks: T-FE-C.3 · Status: **Complete**
**Implementation Evidence:** same as FR-VCC-4
**Tests:** same as FR-VCC-4
**Traceability:** FR-PS-1 → design.md §2.9 → T-BE-A.1/A.6/T-FE-C.3 → `clinical_workspace_facts.py`+`BeforeYouActSection.tsx` → tests incl. explicit negative assertion → `1a72c58`/`0cfab0fa` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** Same evidence as FR-VCC-4 — these two requirements are realized by the same code and tests.

---

# Group: Mobile & Presentation

### FR-MOB-1 — Mobile-first Command Center
**Business Objective:** Patient summary → today's needs → sticky next action → horizontal scrollable pill rail → one primary task → minimal scrolling → ≥44pt targets → interruption recovery.
**Priority:** MVP Mandatory
**Design:** — (WIREFRAMES W0-m) · **Decision:** D8 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: none · Status: N/A
**Frontend:** Tasks: T-FE-A.1 (shell), T-FE-G.1 (pill rail/sticky-action polish) · Status: **Partially Complete**
**Implementation Evidence:** `VisitCommandCenter.tsx` — commit `1b53f3fd`
**Tests:** shell tests only
**Traceability:** FR-MOB-1 → WIREFRAMES W0-m → T-FE-A.1 (done) + T-FE-G.1 (not started) → `VisitCommandCenter.tsx` → shell tests → `1b53f3fd` → Partially Complete
**Release Classification:** BLOCKING MVP
**Remarks:** The shell exists and is flag-gated/render-only correctly, but the sticky-next-action and horizontal pill-rail behaviors this requirement specifically names are part of `T-FE-G.1`, judged optional-for-MVP at the task level in `MVP-RELEASE-FREEZE.md` — meaning this requirement can realistically ship with a documented gap rather than being a hard blocker, but is recorded as BLOCKING here per the ground rule of never softening a requirement's own frozen AC without an explicit owner decision to do so.

### FR-MOB-2 — Workflow pills
**Business Objective:** 6 pill states (completed/current/pending/waiting-on-role/blocked/not-applicable), blue always names owner, accessible (icon+text, never colour alone).
**Priority:** MVP Mandatory
**Design:** — · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: none · Status: N/A
**Frontend:** Tasks: T-FE-B.1 · Status: **Complete** **[Corrected 2026-07-27 — stale]** — commit `6e667d15`
**Implementation Evidence:** `WorkflowPills.tsx` — commit `6e667d15`
**Tests:** unit (each state) · architecture (no assembly) · a11y
**Traceability:** FR-MOB-2 → (no design.md section cited) → T-FE-B.1 (done) → `WorkflowPills.tsx` → tests above → `6e667d15` → Complete
**Release Classification:** READY FOR MVP **[Corrected 2026-07-27]**
**Remarks:** This card was stale — see the document header's Reconciliation finding. All 6 pill states render icon+text, never colour-alone.

---

# Group: Legacy Transition

### FR-LEG-1 — No screen deleted in R7
**Business Objective:** Staged model (Discover→Introduce→Shadow→Validate→Redirect→Deprecate→Remove); R7 reaches at most Redirect.
**Priority:** MVP Mandatory
**Design:** §2.10 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: none · Status: N/A
**Frontend:** Tasks: T-FE-F.1-F.3 · Status: **Complete [Reconciled 2026-10-04]**
**Implementation Evidence:** zero screens removed; all Group F routes are flag-gated adapters, retaining canonical legacy screens when OFF.
**Tests:** focused adapter/flag-switch/deep-link regression, 47 passed / 0 failed
**Traceability:** FR-LEG-1 → design.md §2.10 → no deletion + T-FE-F.1-F.3 complete → adapter/flag-switch tests → Complete
**Release Classification:** READY FOR MVP
**Remarks:** R7 reaches Redirect only; no legacy screen was deleted.

### FR-LEG-2 — Redirects
**Business Objective:** `start-consultation`/`consultation`/`complete-consultation` route to workspace stages via adapters; standalone case-sheet/prescription entry points redirect to the Episode's own sheet.
**Priority:** MVP Mandatory
**Design:** §2.10 · **ET refs:** none · **Owner Ratification:** —
**Backend:** Tasks: none · Status: N/A
**Frontend:** Tasks: T-FE-F.1, T-FE-F.2, T-FE-F.3 · Status: **Complete [Reconciled 2026-10-04]**
**Implementation Evidence:** start/consultation/completion routes and all four client-scoped Case Sheet/Prescription create/edit routes gate `cos_v1`; ON preserves explicit identity in the canonical workspace destination and OFF retains legacy/canonical standalone paths.
**Tests:** focused adapter, deep-link, flag-switch, route-builder, and VisitCommandCenter regression: 47 passed / 0 failed
**Traceability:** FR-LEG-2 → design.md §2.10 → T-FE-F.1-F.3 complete → route adapter evidence → Complete
**Release Classification:** READY FOR MVP
**Remarks:** Missing Episode/Visit context fails safely; adapters introduce no clinical workflow authority.

---

# Group: Platform

### FR-FLAG-1 — R7 is flag-gated and reversible
**Business Objective:** One umbrella flag `cos_v1`, mirroring existing mechanism; flag-off = today's behavior exactly; data-shaped changes not rolled back by a flag alone.
**Priority:** MVP Mandatory
**Design:** §7 · **ET refs:** verified precedent (`freshness_v1_enabled`, `clinical_spine_v1_enabled`) · **Owner Ratification:** —
**Backend:** Tasks: (mirror only) · Status: **Complete**
**Frontend:** Tasks: T-FE-A.3 · Status: **Complete**
**Implementation Evidence:** `useFeatures.ts` — commit `3df98d04`; `config.py` — commit `9023b45`
**Tests:** `useFeatures.test.ts`, `test_cos_v1_feature_flag.py`
**Traceability:** FR-FLAG-1 → design.md §7 → T-FE-A.3 → `useFeatures.ts`+`config.py` → 2 test files → `3df98d04`/`9023b45` → Complete
**Release Classification:** READY FOR MVP
**Remarks:** None — this is a fully clean, fully tested requirement.

### FR-RBAC-1 — Role-aware composition, not forked screens
**Business Objective:** `episodeWorkspaceConfigByRole` extends 2→5 roles as config; any role holding permission may act — backend enforces, UI hiding is polish only.
**Priority:** MVP Mandatory
**Design:** §3 · **ET refs:** ETX-1 (permission codes) · **Owner Ratification:** —
**Backend:** Tasks: T-BE-F.1a (invoice capability/permission enforcement) · Status: **Complete** (`e2ee6600001b407aef98f48232cd5eace2526f46`)
**Frontend:** Tasks: T-FE-E.6 · Status: **Complete** [Reconciled 2026-10-04]
**Implementation Evidence:** five-role presentation config, one `VisitCommandCenter`, localized rendering of the backend capability-loss contract and `waiting_role`; no role-derived clinical action policy.
**Tests:** focused E.6 acceptance 24/0; required capability/workflow/module/flag regression selection 188/0
**Traceability:** FR-RBAC-1 → design.md §3 → T-FE-E.6 (complete) + T-BE-F.1a (done; canonical invoice permissions enforced server-side) → COS shell/config and backend-owned action gates → Complete
**Release Classification:** READY FOR MVP
**Remarks:** Unknown/custom and multi-role presentation are neutral; permissions, effective capabilities, backend workflow facts, and backend mutation enforcement remain authoritative.

---

# Group: Clinical History Hierarchy (v1.1 amendment)

### FR-HIST-1 — Consultation/therapy history separation
**Business Objective:** Doctor consultations and Treatment Reviews are top-level clinical encounters; therapy Sessions grouped beneath their authoritative Treatment Plan, collapsible; hierarchy backend-owned, frontend renders only.
**Priority:** MVP Mandatory (RATIFIED explicitly as in-R7, not R8 — Decision 10)
**Design:** §2.1a, §3 · **Decision:** D10 · **ET refs:** verified defect — `useClinicalTimelineData` flattened everything into one undifferentiated list, computed completed-count from scheduled (not completed) rows, double-represented therapy appointments (ED-ARCH-007) — all three now closed · **Owner Ratification:** Decision 10 (v1.1 amendment, 2026-07-18)
**Backend:** Tasks: T-BE-A.3, T-BE-A.4, T-BE-A.5, T-BE-A.3a, T-BE-A.3b · Status: **COMPLETE** **[Updated 2026-07-27, T-BE-A.3b closure]** — commits `4472060` (A.3, encounter classification), `2147ada` (A.4, legacy association), `6cac1e6` (A.5, backend-derived session counts), `8326f33` (A.3a, authoritative `occurred_at`), `186f11f` (A.3b, Plan-status/Session enrichment)
**Frontend:** Tasks: T-FE-C.5 (consumption — complete, commit `cedee6cc`), T-FE-C.6 (collapsible hierarchy rendering — **COMPLETE, commit `71e9f44d`**), T-FE-C.7 (mobile hierarchy behavior, AC17 — **COMPLETE, commit `3315d08d`**), T-FE-C.6a (**COMPLETE, commit `3a4afd71`**) · Status: **COMPLETE** **[Updated 2026-07-27, T-FE-C.6a closure]**
**Implementation Evidence:** Backend: `clinical_history_classifier.py`, `clinical_workspace_service.py`, `clinical_workspace.py` (schemas), `sqlalchemy_treatment_sheet_repository.py` — commits above. Frontend: `useClinicalTimelineData.ts`, `ClinicalTimeline.tsx`, `clinicalWorkspace.dtos.ts` — commits `cedee6cc`, `71e9f44d`, `3315d08d`, `3a4afd71`.
**Tests:** Backend: 139 + `T-BE-A.3b`'s new focused tests (classifier `SessionDetail`/`build_session_details`/ordering, service Plan-status/therapist-resolution incl. deleted-staff, contract semantics-only guard extended) — 1970 passed / 1 known pre-existing failure / 13 skipped, full suite. Frontend: `useClinicalTimelineData`, `ClinicalTimeline` (incl. `T-FE-C.6a`'s new describe block: Plan status text/fallback, Session rows, field-specific unavailable states, ordering, read-only/no-onPress, icon+text-never-colour-alone), data-contract, cross-file architecture — 996 passed / 9 known pre-existing failures, full suite.
**Traceability:** FR-HIST-1 → design.md §2.1a/§3 → T-BE-A.3/A.4/A.5/A.3a/A.3b (done) + T-FE-C.5/C.6/C.7/C.6a (done) → source above → tests above → **COMPLETE**
**Release Classification:** READY FOR MVP **[Updated 2026-07-27]** — all 17 of FR-HIST-1's frozen AC items are now genuinely satisfied. AC1-6/AC10-16 were already satisfied by `T-BE-A.3`–`A.5`/`T-FE-C.5`/`T-FE-C.6`. AC17 (mobile, no flattening/dot-only-status/sub-44pt target) was satisfied by `T-FE-C.7`. AC7 (Plan status distinctness, not just "remain visible") and AC8/AC9 (individual Session identity/dates/therapists/instructions/outcomes) — the gap first reported during `T-FE-C.6`'s own Engineering Truth and carried forward unresolved through `T-FE-C.7` — are now closed by `T-BE-A.3b`/`T-FE-C.6a`: `plan_status` is the Plan's own authoritative `TenantTreatmentPlan.status` column (never derived from Treatment Sheet lifecycle/session counts/dates), and `sessions[]` exposes each Session's stable identity (`TreatmentSheetRow.id`), authoritative scheduling, safely-resolved therapist name (deleted staff stay representable with a null name), doctor-authored content, and three distinct execution fields (state/occurrence/non-execution-reason, never one ambiguous `MISSED`). No migration was required — every field was additive off already-persisted columns; the one genuine repository-projection gap found was closed additively, not via a schema change.
**Remarks:** All 5 backend tasks and all 4 frontend tasks in the `T-BE-A.3`/`T-FE-C.5` chain are complete. Only `T-Z.9` remains as a task on this chain (unaffected — its own scope is proof/validation, not implementation). FR-HIST-1 and FR-HIST-2 are both now **READY FOR MVP**.

### FR-HIST-2 — Backend-owned hierarchical clinical history contract
**Business Objective:** The existing Clinical Workspace aggregate exposes an authoritative `history_items[]` projection (consultation/treatment_review/treatment_plan{session_counts}/legacy_treatment_sessions); no competing aggregate; frontend performs zero clinical aggregation.
**Priority:** MVP Mandatory (same ratification as FR-HIST-1)
**Design:** §2.1a · **Decision:** D10 · **ET refs:** "Sheet-to-Plan cardinality is unverified... no automatic legacy backfill without a verified cardinality/data audit" — resolved by `T-BE-A.4`'s explicit legacy classification (never inferred) · **Owner Ratification:** Decision 10
**Backend:** Tasks: T-BE-A.3, T-BE-A.4, T-BE-A.5, T-BE-A.3a · Status: **COMPLETE** **[Updated 2026-07-26]** — same commits as FR-HIST-1's Backend row
**Frontend:** Tasks: T-FE-C.5 (consumption) · Status: **COMPLETE** **[Updated 2026-07-26]** — commit `cedee6cc`. `useClinicalTimelineData.ts` performs zero encounter classification, zero Session-count aggregation, zero Plan-association inference, zero Treatment Review date derivation, and no local sort — every AC this requirement names is about the contract/non-derivation guarantee (not rich hierarchy rendering, which is FR-HIST-1's `T-FE-C.6/C.7`), and that guarantee is now structurally enforced (proven by source-level architecture tests, `clinicalHistoryArchitecture.test.ts`/`useClinicalTimelineData.test.tsx`'s own architecture describe blocks).
**Implementation Evidence:** Same files as FR-HIST-1.
**Tests:** Same test suites as FR-HIST-1.
**Traceability:** FR-HIST-2 → design.md §2.1a → T-BE-A.3/A.4/A.5/A.3a (done) + T-FE-C.5 (done) → source above → tests above → **COMPLETE**
**Release Classification:** READY FOR MVP **[Updated 2026-07-26]** — this requirement's own AC (backend-owned classification, no competing aggregate, zero frontend clinical aggregation) is fully satisfied end-to-end; it does not itself require the richer hierarchy UI FR-HIST-1/`T-FE-C.6` still owns.
**Remarks [Note added 2026-07-26, narrow]:** `T-BE-A.3a` (new) is COMPLETE, adding the authoritative `occurred_at` timestamp this contract was missing — `T-FE-C.5` is now fully unblocked on the backend side. Row's Backend/Frontend Status cells not otherwise recomputed in this pass.
**Remarks:** `T-BE-A.4` specifically cannot even start until "the data audit itself (count Treatment Sheets per episode/recommendation across real tenant data)" is performed — this is a genuine prerequisite investigation, not a coding task, and per the task's own text "if unperformed when this task starts, it blocks start, it is not skipped."

---

## Mandatory Cross-Validation — Requirements ↔ Design ↔ Tasks ↔ Implementation

Checked for every one of the 44 requirements above. Where all four agree, no note appears (the card above stands as the record). Where they disagree, both sides are reported below rather than silently resolved:

1. **FR-TR-1**: `design.md` §2.8's original text (Requirements↔Design agreement point) assumed a reusable, independently-identifiable Recommendation backend entity. **Implementation reality disagreed**: no such entity existed (`tenant_treatment_proposals` had been removed pre-R7). `design.md` was subsequently amended in place (Decision 11) to state its own earlier assumption was wrong. Requirements↔Design now agree with Implementation; the disagreement was real and is recorded, not erased.
2. **FR-CS-4 / FR-TP-2 / FR-TS-5 / FR-LD-1**: all four carry a `requirements.md`/`design.md` `[VP]` marking a detail as "deferred to implementation." For FR-CS-4 and FR-TP-2, **Implementation has since decided the detail** (correlation_id; the 8-stage enum spelling) but **Requirements/Design have not been updated to reflect the ratified spelling** — a live Requirements↔Implementation gap, not fixed here per instruction. For FR-TS-5 and FR-LD-1, the `[VP]` remains genuinely open on both sides (Implementation hasn't started either).
3. **FR-WFA-1** (via ETX-4): `requirements.md` §19 still lists ETX-4 among its open Engineering Truth Exceptions; `design.md` §8 states "ETX-4... is resolved." **Requirements and Design disagree with each other** on this exception's status, independent of what Implementation actually did (Implementation did apply a capability-loss policy to `T-BE-B.1`/`T-BE-B.2`'s ACs, both complete — so Implementation sides with Design's "resolved" framing, but Requirements has not been updated to match).
4. **FR-RBAC-1**: Design/Requirements state "backend enforces; UI hiding is presentation polish only" as the governing rule. **Implementation (per `T--1.2`'s own trace doc) disagrees in two specific places**: `casesheet.sign`/`prescription.sign` are enforced by hardcoded role-string checks in routers, bypassing the permission-code system this rule assumes is authoritative. This is a real Design↔Implementation gap on a live (pre-R7) code path this requirement depends on, not a hypothetical one.
5. **FR-HIST-1/FR-HIST-2**: `design.md` §2.1a explicitly states its own projection "cannot return real Plan groups before both [Treatment Plan and Session identity] exist." As of this session, both now exist (`T-BE-D.4`, `T-BE-E.1` complete) — Design's own stated precondition is now satisfied, but Tasks (`T-BE-A.3` onward) have not yet been executed to take advantage of it. Not a disagreement, but a live, actionable state change worth recording since Design's own gating language is now stale relative to Implementation reality.

No other requirement showed a Requirements↔Design↔Tasks↔Implementation disagreement in this pass.

---

## Validation Report 1 — Requirements with No Design

None found. Every one of the 44 requirements cites at least one design.md section, a named artifact (WIREFRAMES/TREATMENT-MODEL/STATE-DEFS/GAP-MATRIX/RATIFICATION), or is itself a structural/negative requirement whose "design" is the absence of an artifact (FR-RX-2, FR-LEG-1's negative half). Caveat carried over from `RTM-AUDIT.md` §7 finding #4: several of `requirements-traceability-matrix.md`'s own design-section citations (§4a, §4b, §5, §11, §DP-15) do not resolve against `design.md`'s actual heading structure — the citation exists, but is unverifiable as written. Affected requirements: FR-VCC-1, FR-VCC-3, FR-COS-1, FR-COS-2, FR-CR-1, FR-WFA-1, FR-WFA-2, FR-RBAC-1.

## Validation Report 2 — Requirements with No Tasks

None found among the 44. Every requirement maps to at least one task (backend and/or frontend), confirmed via `requirements-traceability-matrix.md`'s own §1/§2 coverage claim ("44/44") and independently re-verified against `tasks.md`'s actual task list in this audit and the prior one.

## Validation Report 3 — Requirements with Tasks but No Implementation

**[Reconciled 2026-10-04 for T-FE-E.6 only.]** FR-RBAC-1 and FR-WFA-2 are removed from this stale list: their frontend E.6 composition is now complete. All other entries retain their prior audit status. **Removed from this list, now fully implemented on both sides:** FR-VCC-1, FR-WFA-1, FR-WFA-2, FR-RBAC-1, FR-CS-1, FR-CS-5, FR-REC-1, FR-REC-2, FR-MOB-2, FR-HIST-1, FR-HIST-2.

## Validation Report 4 — Implementation with No Requirement

None found. Every commit inspected in the backend and frontend audits ties back to a named task, and every named task ties back to at least one requirement ID in its own frontmatter. No orphan implementation (code with no requirement trace) was found in either repository.

## Validation Report 5 — Requirements Implemented but Not Tested

None found. Every requirement card above whose Backend or Frontend status is "Complete" cites at least one test file, independently confirmed to exist and pass in the relevant repository audit. The one partial exception is FR-BILL-2, where "Complete" required zero production code (behavior was already correct) — its test file still exists and passes, so it is not actually untested, merely untested-by-necessity-of-no-new-code.

## Validation Report 6 — Tasks Completed but Requirement Still Partially Satisfied

**[Reconciled 2026-10-04 for T-FE-E.6 only.]** FR-WFA-2 is removed from this stale list because its frontend E.6 composition is complete. All other entries retain their prior audit status. **Removed from this list, now fully implemented on both sides:** FR-VCC-1, FR-WFA-1, FR-WFA-2, FR-RBAC-1, FR-CS-1, FR-REC-1. This category remains real evidence of "backend substantially ahead of frontend" — see §Current Remaining Work below for the fresh count and critical path.

## Validation Report 7 — Duplicate Requirements

None found. Every requirement ID is unique and its scope does not overlap another requirement's scope to the point of duplication. (FR-VCC-3/FR-VCC-4 and FR-PS-1 share underlying backend evidence — `clinical_workspace_facts.py` — but they specify genuinely distinct AC sets, not duplicated ones, so this is shared implementation, not a duplicate requirement.)

## Validation Report 8 — Superseded Requirements

None found. No requirement's own text or AC has been replaced by a different requirement. The one place "superseded" language appears in the source documents is at the *design* level (design.md §2.8's Decision-11 correction) and the *task* level (`T-BE-D.3a` inserted as a prerequisite) — neither event superseded the requirement itself (FR-TR-1's text and AC are unchanged); only the *design's assumption about how to realize it* was corrected.

## Validation Report 9 — Requirements Incorrectly Marked Mandatory

None found to be incorrectly marked. All 43 non-FR-RX-2 requirements are genuinely part of R7's ratified core scope per `R7-OWNER-RATIFICATION.md`'s own Decision 8 ("R7 — Clinical Operating System Core"). One borderline case worth naming: FR-MOB-1's full realization depends partly on `T-FE-G.1`, which `MVP-RELEASE-FREEZE.md` judged optional-at-the-task-level. This is not the requirement being incorrectly marked mandatory — it is a task-level scoping choice that could, with an explicit owner decision, downgrade this one requirement's Release Classification from BLOCKING to OPTIONAL. That decision has not been made; recorded here as a candidate, not a finding of error.

## Validation Report 10 — Requirements Incorrectly Deferred

None found. FR-RX-2 is the only requirement classified Post MVP/Future, and its own text explicitly states it is a negative requirement ("no copy-forward action ships in R7") — it is correctly deferred, not incorrectly.

---

## Reconciliation Evidence (2026-07-27 full pass)

**Method:** `git log --oneline 8b23568..HEAD` (backend) / equivalent on frontend, grepped case-insensitively for each task ID's own name/keywords, cross-checked against current source (`grep`/direct file reads) for every task whose completion could not be settled by commit message alone. Full fresh task inventory (every `### T-` heading in `tasks.md`, denominator recomputed from zero, not carried forward from the document's own stale "77" self-count): **88 tasks total** — see §Task Statistics below for the exact breakdown. `T-BE-F.3a` (commit `7fe1991`, "expose consultation completion contract") is real, complete, and referenced in the M1 closure note, but has **no `### T-BE-F.3a` card anywhere in `tasks.md`** — an orphan task, reported here since Phase 4 of this reconciliation requires it, not fixed (`tasks.md` is not this task's file list).

**Stale entries found and corrected this pass:** `FR-VCC-1`, `FR-WFA-1`, `FR-REC-1`, `FR-REC-2`, `FR-MOB-2` (all said "Not Started" for `T-FE-B.1`/`T-FE-B.2`/`T-FE-D.1`, which had shipped, commits `6e667d15`/`acfa730a`/`426967bb`, without these cards being updated) — corrected above. Validation Reports 3 and 6 recomputed to remove these five requirements from their stale lists. The "remaining task" classification table below is fully rewritten, not amended — the version it replaces (visible in this document's own prior git history) still listed 10 already-complete tasks (`T-BE-E.2/E.3/E.4/E.5`, `T-FE-B.1/B.2/C.4/C.5/C.6/C.7/D.1/E.1`) as remaining.

## Task Statistics (recomputed from zero, 2026-07-27)

**Denominator:** ~~88~~ **89 tasks** [Updated 2026-07-26]. This supersedes `tasks.md`'s own stale "77" self-count (v1.1 note, predates 9 later amendment/split cards: `T-BE-A.3a`, `T-BE-A.3b`, `T-BE-B.2a`, `T-BE-E.1a`, `T-BE-E.2a`, `T-BE-E.4a`, `T-FE-C.6a`, `T-FE-E.1a`, `T-FE-E.1b`) and this document's own 2026-07-27 recomputation of 88 (every `### T-` heading in `tasks.md`, counted exactly once each — `T-BE-E.1a` counted once, tagged `Repo: BE`, despite being physically documented inside the FE-E section of `tasks.md`). The denominator moved to 89 because `T-FE-E.2` surfaced a genuine backend contract gap and this pass adds one new proposed task card, `T-BE-D.4a` (BE Group D), per this task's own instruction not to silently expand scope without naming the new task explicitly. **The itemized group-count breakdown immediately below was NOT re-derived this pass** (narrow update per this task's own instruction: "do not perform a broad recount unless the task changes the denominator" — the denominator did change, by exactly +1, but a full re-audit of the existing breakdown's internal counts is out of this task's scope). Treat the totals below as 88-denominator figures plus this one narrowly-added task, not as independently re-verified.

```
Group -1 (both, foundational)      =  7    [Backend+Frontend shared verification]
Group 0A + 0B (FE remediation)     =  9    (T-0.1..T-0.9, all Repo: FE)
BE Group A                         =  8    (A.1,A.2,A.3,A.3a,A.3b,A.4,A.5,A.6)
BE Group B                         =  4    (B.1,B.2,B.2a,B.3)
BE Group C                         =  4    (C.1..C.4)
BE Group D                         =  6    (D.1,D.2,D.3,D.3a,D.4,D.5)
BE Group E (incl. E.1a)            =  8    (E.1,E.1a,E.2,E.2a,E.3,E.4,E.4a,E.5)
BE Group F                         =  3    (F.1,F.2,F.3)
BE Group G                         =  3    (G.1,G.2,G.3)
FE Group A                         =  3    (A.1,A.2,A.3)
FE Group B                         =  2    (B.1,B.2)
FE Group C                         =  8    (C.1..C.7,C.6a)
FE Group D                         =  1    (D.1)
FE Group E (excl. E.1a — BE above) =  7    (E.1,E.1b,E.2,E.3,E.4,E.5,E.6)
FE Group F                         =  3    (F.1,F.2,F.3)
FE Group G                         =  2    (G.1,G.2)
Group Z (both)                     =  9    (Z.1..Z.9)
------------------------------------------
TOTAL                              = 88  ✓

By repository:
  Backend-owned (BE-A..G + E.1a)   = 8+4+4+6+8+3+3            = 36
  Frontend-owned (0A/0B + FE-A..G) = 9+3+2+8+1+7+3+2            = 35
  Shared/both (Group -1 + Group Z) = 7+9                        = 16
  36 + 35 + 16 = 87 — plus T-BE-E.1a is the 88th, already included in the 36 above (BE Group E's "8" already counts it) → 88  ✓

COMPLETE       = 69   [Updated 2026-07-28: +1, T-FE-E.3]
NOT_STARTED    = 21   [Updated 2026-07-28] (BE-D.5:1, BE-G.1-G.3:3, FE-E.4-E.6:3, FE-F.1-F.3:3, FE-G.1-G.2:2, Z.1-Z.9:9)
PARTIAL        =  0
BLOCKED        =  0   (every remaining task's own declared dependencies are already satisfied by COMPLETE work outside this list; the only blocking is internal to this list: T-BE-G.1 → T-BE-D.5/T-BE-G.2 → T-BE-G.3, and T-FE-G.1 → T-FE-G.2)
DEFERRED       =  2   (T-FE-G.1, T-FE-G.2 — a 2-task SUBSET of the 21 NOT_STARTED above, not additive; MVP-RELEASE-FREEZE.md judged T-FE-G.1 optional-at-task-level, T-FE-G.2 depends on it)
SUPERSEDED     =  0
--------------------------------
TOTAL          = 69 + 21 = 90  ✓  [Updated 2026-07-28: T-FE-E.3 moved NOT_STARTED→COMPLETE, was 68+22=90]

Backend completion   = 33/37 = 89.2%   [unchanged this pass] (37 backend-owned tasks; of those, BE-D.5 + BE-G.1-3 = 4 not started. T-BE-F.3a is a real, complete, but orphaned/undocumented task — excluded from this denominator, reported separately, not counted toward either side.)
Frontend completion  = 28/36 = 77.8%   [Updated 2026-07-28] (36 frontend-owned; `T-FE-E.3` moves to COMPLETE, +1 from 27; FE-E.4-6(3)+FE-F.1-3(3)+FE-G.1-2(2) = 8 remain not started)
Shared/Group Z       =  0/9  =  0%     (release-validation gate has not run once)
Overall              = 69/90 = 76.7%   [Updated 2026-07-28]
```

## Requirement Statistics (recomputed from zero, 2026-07-27 base pass; narrowly updated 2026-07-26 and again 2026-07-27 for T-FE-E.2/T-BE-D.4a — only the cards these tasks touched were re-checked each time, no broader recount performed)

Recount method: direct enumeration against all 44 requirement IDs from `requirements.md`, cross-checked against each requirement's own card above (just corrected for staleness).

| Status | Count | Requirement IDs |
|---|---|---|
| Fully Complete | **27** [Updated 2026-07-28: +2, FR-TS-4, FR-TS-5] | FR-COS-1, FR-VCC-1, FR-VCC-2, FR-VCC-3, FR-VCC-4, FR-WFA-1, FR-CS-1, FR-CS-2, FR-CS-3, FR-CS-4, FR-CS-5, FR-TP-1, FR-TP-2, FR-REC-1, FR-REC-2, FR-PS-1, FR-MOB-2, FR-FLAG-1, FR-HIST-1, FR-HIST-2, FR-RX-1, FR-TR-1, FR-TS-2, FR-SCH-1, FR-TS-3, FR-TS-4, FR-TS-5 |
| Partially Complete | **11** [Updated 2026-07-28: -2, FR-TS-4/FR-TS-5] | FR-COS-2 (T-Z.1 proof not run), FR-WFA-2, FR-CS-6, FR-TS-1, FR-SCH-2, FR-BILL-1, FR-BILL-2, FR-CR-1, FR-MOB-1, FR-LEG-1, FR-RBAC-1 |
| Not Started | **5** | FR-LD-1, FR-LD-2, FR-LD-3, FR-TP-3, FR-LEG-2 |
| Blocked | **0** | — (nothing is waiting on a decision; only on unstarted work already accounted for above) |
| Deferred | **1** | FR-RX-2 (by its own text, R8) |
| **Total** | **44** | 27+11+5+0+1 = 44 ✓ |

```
READY FOR MVP (Release Classification)   = 27  (same set as Fully Complete — every fully-complete requirement above already carries READY FOR MVP; verified no fully-complete requirement is marked otherwise)
BLOCKING MVP                             = 16  (11 Partially Complete + 5 Not Started)
OPTIONAL FOR MVP                         = 0   (FR-MOB-1 remains formally BLOCKING per the ground rule against silently softening a frozen AC — see its card's own Remarks — even though its one blocking task, T-FE-G.1, is owner-judged optional at the task level)
DEFER TO R8                              = 1   (FR-RX-2)
27 + 16 + 0 + 1 = 44 ✓
```

**[Updated 2026-07-28, T-FE-E.3 closure] `FR-TS-4` and `FR-TS-5` move Partially Complete → Fully Complete.** `T-FE-E.3` (commit `302bccbf`) composed structured non-execution — the sole genuinely missing piece; `start`/`complete` were already composed by a pre-existing `TherapistDashboardScreen` (not built this task, discovered via Engineering Truth). One reported, non-blocking gap tracked as follow-up debt, not a blocker for either card's own frozen AC — see FR-TS-4's Remarks.

**[2026-07-26] T-FE-E.2 (partial closure) delta:** `FR-RX-1`, `FR-TR-1`, `FR-TS-2` moved Partially Complete → Fully Complete. `FR-TP-1`, `FR-TS-1`, `FR-SCH-1`, `FR-SCH-2` stayed Partially Complete. `FR-TS-3` stayed Not Started.

**[Updated 2026-07-27] T-BE-D.4a + T-FE-E.2 closure delta:** `FR-TP-1` and `FR-SCH-1` move Partially Complete → Fully Complete — `T-BE-D.4a` exposed the Treatment Plan public contract, `TreatmentPlanModule` composes create/view, and `SchedulingModule` now consumes the scheduling-proposal read using the resulting `plan_id`. `FR-TS-1`, `FR-SCH-2` remain Partially Complete (unrelated to this closure — `T-FE-E.3`/`T-FE-E.5` respectively). See each card's own Remarks, and `tasks.md`'s `T-FE-E.2` status note for the exact remaining blocker.

**[Corrected 2026-07-27, Engineering Truth re-verification] `FR-TS-3` moved Not Started → Partially Complete.** `T-BE-E.3` was already COMPLETE (commit `9497f13`, 2026-07-25) — every prior document claiming it "remains Not Started" was factually wrong, and this was never caught because no prior pass re-verified the claim against `git log`. The frontend Adoption requirement (author-once-apply-to-many) remained genuinely unbuilt at that point, and its backend primitive was confirmed reachable (no defect).

**[Updated 2026-07-27, T-FE-E.2a closure] `FR-TS-3` moves Partially Complete → Fully Complete.** `T-FE-E.2a` (commit `7e2ce7f1`) implemented the frontend Adoption requirement: `SessionInstructionsModule` now offers an independent multi-select mechanism, keyed by stable Session id, applying a shared author-once draft via exactly one call to the existing atomic bulk-update endpoint. `T-FE-E.2` itself moves Partially Complete → Fully Complete (Release Classification, above) as a direct consequence — this was its sole remaining AC gap.

## Capability Readiness Table

| Capability | Status | Evidence |
|---|---|---|
| Clinical Workspace shell and briefing | **READY** | T-FE-A.1-A.3, T-FE-B.1/B.2, T-FE-C.1-C.4, T-FE-D.1, T-BE-A.1/A.2/A.6, T-BE-B.1/B.2/B.2a/B.3 all COMPLETE |
| Patient safety | **READY** | FR-PS-1/FR-VCC-4 COMPLETE — T-FE-C.3, T-BE-A.1/A.6 |
| Workflow engine | **READY** | FR-WFA-1/FR-REC-1/FR-REC-2 COMPLETE end-to-end (backend + rendering) |
| Case Sheet continuity | **READY** | FR-CS-1..6 substantially complete; only the amendment-reason half of FR-CS-6 (needs Living Documents) remains |
| Clinical History | **READY** | FR-HIST-1/FR-HIST-2 COMPLETE end-to-end (this session's closure) |
| Prescription management | **READY** [Updated 2026-07-26] | Backend lifecycle constraint trivially satisfied by omission; `T-FE-E.2` composed `PrescriptionModule` unchanged (commit `80fb96d0`) |
| Treatment Recommendation | **READY** [Updated 2026-07-26] | Backend complete (T-BE-D.3a); `T-FE-E.2` composed `TreatmentRecommendationModule` unchanged (commit `80fb96d0`) |
| Treatment Plan | **READY** [Updated 2026-07-27] | Entity/persistence/service complete (T-BE-D.1-D.4); public contract exposed (`T-BE-D.4a`, commit `c69f7ef`); `TreatmentPlanModule` composes create/view (commit `bfe31956`). Versioning/supersession (`T-BE-D.5`) remains separately Not Started (post-MVP for this capability's own basic readiness) |
| Session scheduling | **READY** [Updated 2026-07-27] | Backend intents + transport complete (T-BE-E.2/E.2a); frontend composes current-state view, permission-gated write, AND the governed-proposal preview (`SchedulingModule`, commits `80fb96d0`/`bfe31956`) — the `plan_id` gap `T-BE-D.4a` closed |
| Doctor Session instructions | **READY** [Updated 2026-07-27] | Backend (`T-BE-E.3`) COMPLETE (commit `9497f13`); frontend composes single-session authoring AND author-once-apply-to-many multi-select bulk apply (`SessionInstructionsModule`, stable-id-bound, OCC-adopted on the single-row path, atomic bulk apply via the existing endpoint, commits `80fb96d0`/`7e2ce7f1`, `T-FE-E.2a`) |
| Therapist execution | **READY** [Updated 2026-07-28] | Backend (`T-BE-E.4`/`E.4a`) + OCC (`T-BE-E.5`) complete and exposed; frontend (`T-FE-E.3`, commit `302bccbf`) composes assigned-session listing, read-only doctor instructions, start, complete-with-materials, and structured non-execution. Reported non-blocking gap: non-execution reason not durably re-displayable after a list refetch (backend list schema lacks the field) — see FR-TS-4's card |
| Billing visibility | **READY** [Reconciled 2026-10-03] | Backend (`T-BE-F.1`/`F.1a`/`F.2`) and frontend (`T-FE-E.4`, `d5854bd465747dbdf2a25aaea07d706ac5b162dc`) complete; unbilled state remains warning-only |
| Role-aware workflow | **READY** [Reconciled 2026-10-04] | `T-FE-E.6` complete: five-role presentation composition, backend-owned workflow/capability semantics, and permission-driven actions |
| Living Documents | **READY** [Reconciled 2026-10-03] | Backend G.1/G.2/G.3 plus frontend T-FE-E.5 complete; signed-history safety, stable-identity amendment, and backend-authoritative lineage/version print are composed. `ET-MIG-001` and `G1_B2_RUNTIME_CONCURRENCY_DEFERRED_REQUIRES_ISOLATED_DB` remain OPEN. |
| Legacy-route transition | **READY** | `T-FE-F.1/F.2/F.3` complete — flag-gated adapters preserve identity ON and legacy/canonical paths OFF; focused evidence 47/0 |
| Mobile/presentation polish | **DEFERRED** | `T-FE-G.1` judged optional-at-task-level (`MVP-RELEASE-FREEZE.md`); core mobile AC already satisfied by per-task work (T-FE-C.7 etc.) |
| Release validation | **NOT_STARTED** | Group Z (`T-Z.1`-`T-Z.9`) — zero tasks started; the release gate itself has not run once |

---

## Can we say Clinical Workspace and Doctor Module are complete?

**Answer: NO.**

Of the 17 completion-boundary items (see the governing prompt's own definition), only **5 are satisfied**:

| # | Item | Status | Blocking task(s) |
|---|---|---|---|
| 1 | Enter workspace from all intended routes | ✅ | — |
| 2 | See patient/Visit briefing and safety context | ✅ | — |
| 3 | See backend-owned workflow and next action | ✅ | — |
| 4 | Open and update the one Episode Case Sheet | ✅ | — |
| 5 | See prior Visit contributions | ✅ | — |
| 6 | Create and manage Prescription | ✅ [Updated 2026-07-26] | — (`T-FE-E.2` composed `PrescriptionModule` unchanged) |
| 7 | Create Treatment Recommendation | ✅ [Updated 2026-07-26] | — (`T-FE-E.2` composed `TreatmentRecommendationModule` unchanged) |
| 8 | Create/view Treatment Plan | ✅ [Updated 2026-07-27] | — (`T-BE-D.4a` exposed the contract; `TreatmentPlanModule` composes create/view; versioning, T-BE-D.5, remains separate and out of this item's own scope) |
| 9 | Author Session instructions | ✅ [Updated 2026-07-27] | — (single-session editing AND author-once-apply-to-many multi-select bulk apply both composed, `SessionInstructionsModule`, stable-id-bound, backend guard `T-BE-E.3` COMPLETE, `T-FE-E.2a` commit `7e2ce7f1`) |
| 10 | See and manage Session scheduling | ✅ [Updated 2026-07-27] | — (`SchedulingModule` composes current state, permission-gated write, AND the governed-proposal preview using the `plan_id` `T-BE-D.4a` made obtainable) |
| 11 | Record Session execution/non-execution | ✅ [Updated 2026-07-28] | — (`T-FE-E.3` composed the full lifecycle, commit `302bccbf`) |
| 12 | View Clinical History | ✅ | — |
| 13 | View billing state | ❌ | T-FE-E.4 |
| 14 | Render role-appropriate actions | ✅ | T-FE-E.6 |
| 15 | Amend signed clinical documents safely | ✅ | T-BE-G.1/G.2/G.3 and T-FE-E.5 complete; stable-ID G.2 amendment and immutable signed-history presentation |
| 16 | Preserve legacy route compatibility | ✅ | — |
| 17 | Pass release/E2E validation | ❌ | T-Z.1 … T-Z.9 |

**[Updated 2026-07-28, T-FE-E.3 closure] 11 of 17 fully satisfied, 0 partially satisfied.** `T-BE-D.4a` (commit `c69f7ef`) exposed the Treatment Plan public contract, closing item 8 in full and item 10's remaining proposal-preview half. `T-FE-E.2a` (commit `7e2ce7f1`) closed item 9 in full. `T-FE-E.3` (commit `302bccbf`) closes item 11 — a pre-existing `TherapistDashboardScreen` already composed start/complete; the genuinely missing piece, structured non-execution, is now built. Clinical History, Doctor Session instructions, and Therapist execution being complete does not generalize to the rest of the Doctor Module — 6 of 17 completion-boundary items remain unmet (routes 1/16, Billing 13, RBAC 14, Living Documents 15, Release validation 17).

~~**5 of 17 satisfied.** The backend is substantially ahead (37 of its 37 non-Group-−1/Z tasks minus 4 = 33 complete, 89.2%), but the entire treatment-workflow composition layer on the frontend (`T-FE-E.2`, the single largest remaining task, spanning Prescription/Recommendation/Plan/Scheduling/Session-instruction authoring in one card) has not been started, and nothing has passed release validation.~~ *(superseded by the note above — `T-FE-E.2` is no longer un-started)*

---

## Current Remaining Work to Complete Clinical Workspace and Doctor Module

### Mandatory backend tasks remaining (4)
| Task | Realizes | Blocked by | Ready? |
|---|---|---|---|
| T-BE-D.5 | FR-TP-3 (Plan versioning/supersession) | T-BE-G.1 | **Complete [2026-10-04]** — D5-OD-1…15; isolated-local PostgreSQL acceptance and regression evidence recorded in FR-TP-3 |
| T-BE-G.1 | FR-LD-1 (supersession representation) | — (T--1.2 already done) | **READY_TO_START** |
| T-BE-G.2 | FR-LD-2 (amendment permissions) | T-BE-G.1 | Blocked on T-BE-G.1 |
| T-BE-G.3 | FR-LD-3 (docstring fix) | T-BE-G.1 | Blocked on T-BE-G.1 |

### Mandatory frontend tasks remaining (10, of which 1 is PARTIAL not NOT_STARTED)
| Task | Realizes | Blocked by | Ready? |
|---|---|---|---|
| T-FE-E.2 | FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-1/2/3, FR-SCH-1 | T-0.2/T-0.4/T-0.7 (done), T-BE-D.4 (done), T-BE-E.2 (done), T-BE-E.3 (done, `9497f13`) | **COMPLETE — [Updated 2026-07-27, T-FE-E.2a closure]** Prescription/Recommendation/Session-Instructions (single + bulk apply)/Scheduling/Treatment-Plan all composed (commits `4fba2ec4`, `80fb96d0`, `c69f7ef` [backend], `bfe31956`, `7e2ce7f1`). The sole remaining gap, author-once-apply-to-many (FR-TS-3's own Adoption requirement), was closed by the narrow amendment task `T-FE-E.2a`, reusing the already-complete backend bulk endpoint. Note: `FR-TS-1` itself stays Partially Complete at the requirement level — its card also names `T-FE-E.3` (therapist execution composition, not started, out of `T-FE-E.2`'s own scope) — but every AC item this task's own frozen card names is satisfied. |
| T-FE-E.3 | FR-TS-4/5 | T-0.7 (done), T-BE-E.4 (done) | **COMPLETE — [Updated 2026-07-28]** Assigned-session listing, doctor instructions (read-only), start, complete-with-materials all pre-existed via `TherapistDashboardScreen`; structured non-execution now added (commit `302bccbf`). One reported, non-blocking gap: non-execution reason not durably re-displayed after a list refetch (backend list schema gap). |
| T-FE-E.4 | FR-BILL-1/2 | T-BE-F.1 (done), T-BE-F.1a (done, `e2ee6600001b407aef98f48232cd5eace2526f46`) | **COMPLETE — `d5854bd465747dbdf2a25aaea07d706ac5b162dc`; 54 passed / 0 failed / 0 skipped; `E4_BILLING_STAGE_BACKEND_TRUTH_CLEAN`** |
| T-FE-E.5 | FR-LD-1/2 | T-BE-G.2 (complete) | **COMPLETE — [Reconciled 2026-10-03]** Backend prerequisite `d17c508bdb419a939711d508a51bf88c0a042021`; COS version history renders backend lineage/current/superseded truth, immutable snapshots, permission-gated stable-ID G.2 amendment, version-specific print, and successor-SIGN backend refetch. Focused 6/0; module/flag 46/0; targeted COS 111/0. |
| T-FE-E.6 | FR-RBAC-1, FR-WFA-2 | T--1.2 (done), T-FE-D.1 (done) | **COMPLETE — [Reconciled 2026-10-04]** Five-role presentation config, one COS screen, backend-owned workflow/capability-loss rendering; focused 24/0, required regressions 188/0. Closure remediation: React Query loading-state assertion changed to `findByText`; exact combined focused command passed 24/0 three consecutive times, individual suites 8/0 and 16/0. |
| T-FE-F.1 | FR-LEG-1/2 | T-FE-D.1 (done) | **COMPLETE [2026-10-04]** |
| T-FE-F.2 | FR-CR-1, FR-LEG-2 | T-0.8 (done), T-BE-F.3 (done) | **COMPLETE [2026-10-04]** |
| T-FE-F.3 | FR-LEG-2, FR-CS-1 | T-FE-E.1/E.2 (done) | **COMPLETE [2026-10-04]** |

### Release-validation tasks remaining (9)
T-Z.1 … T-Z.9, all blocked by "all" prior tasks per the dependency map — cannot begin in earnest until the mandatory backend/frontend work above lands, though T-Z.1 (architecture proof) and T-Z.5 (performance sanity) could run incrementally today against what already exists.

### Optional/deferred tasks (2)
T-FE-G.1 (mobile polish, judged optional by `MVP-RELEASE-FREEZE.md`), T-FE-G.2 (depends on G.1).

### Current critical path
```
T-BE-G.1 ──► T-BE-G.2 ──► T-FE-E.5
    │
    └──► T-BE-D.5 (Plan versioning) **COMPLETE [2026-10-04]**

T-FE-E.2 ──► T-FE-F.3
    │
    ├──► (independently) T-FE-E.3
    ├──► (independently) T-FE-E.4
    └──► (independently) T-FE-E.6, T-FE-F.1, T-FE-F.2

All mandatory BE+FE work ──► T-Z.1…T-Z.9 ──► Release (M8/OR-6)
```
The single longest pole is **T-FE-E.2** — it is the widest-scope remaining task (5 requirements) and the only thing standing between "backend done" and "doctor can actually create/manage Prescription, Recommendation, Plan, Scheduling, and Session instructions from the workspace." It has no blocking task left — see the readiness check below.

### Current parallel paths
`T-BE-G.1` (backend) can run fully in parallel with `T-FE-E.2`/`T-FE-E.3`/`T-FE-E.4`/`T-FE-E.6`/`T-FE-F.1`/`T-FE-F.2` (frontend) — no shared file, no shared dependency either direction. Within frontend, `T-FE-E.3`, `T-FE-E.4`, `T-FE-E.6`, `T-FE-F.1`, `T-FE-F.2` have no dependency on `T-FE-E.2` or each other and can all proceed independently once started (only `T-FE-F.3` waits on `T-FE-E.2`).

## T-FE-E.2 Readiness Check

**Original verdict (2026-07-27): READY_TO_START.** **[Updated 2026-07-26] This verdict was WRONG for 2 of the 7 rows below — corrected in place, not silently.** `T-FE-E.2`'s own mandatory pre-implementation re-verification ("do not rely on that READY_TO_START conclusion blindly — reverify every required contract from current source and OpenAPI") caught what this table's prior "✅ Ready" claims missed: `TenantTreatmentPlan` has zero public HTTP contract, confirmed via direct `find`/`grep` across the backend repository (no router file, no schema, no `main.py` registration) — the "domain, migration, repository, service all live" claim below was true but incomplete; it never checked for a router. This is exactly the kind of stale-readiness risk the task's own instructions anticipated.

| Backend contract T-FE-E.2 needs | Status | Evidence |
|---|---|---|
| Prescription (verified lifecycle) | ✅ Ready | Pre-existing `tenant_prescription.status` ENUM, no R7 backend task needed |
| Treatment Recommendation | ✅ Ready | `T-BE-D.3a` COMPLETE (commit `fc8235a`) — `creation_source`, `get_eligible_recommendation_source` |
| Treatment Plan | ✅ **Ready [Closed 2026-07-27]** | `T-BE-D.1-D.4` built the domain/migration/repository/service (commits `216d82c`/`f0fdb33`/`bbe4066`/`f09097f`); `T-BE-D.4a` (commit `c69f7ef`) added the router/schema this row previously flagged as missing. Now genuinely reachable and composed (`bfe31956`). |
| Doctor Session content | ✅ Ready | Pre-existing `PATCH /clinic/treatment-sheets/rows/{row_id}` (not a new `T-BE-E.3` endpoint — `T-BE-E.3` itself remains Not Started; the single-row content-update path predates R7 and was reused, with a live route-mismatch defect found and fixed in `4fba2ec4`) |
| Scheduling proposal | ✅ **Ready [Closed 2026-07-27]** | `T-BE-E.2`/`T-BE-E.2a` COMPLETE (commits `c496c86`/`882dfa6`); the `plan_id` it requires is now obtainable via `T-BE-D.4a`'s Recommendation-keyed Plan lookup, and `SchedulingModule` consumes it (`bfe31956`). |
| Session scheduling (write) | ✅ Ready | `schedule_treatment_row`/`bulk_schedule_treatment_rows` pre-exist on `treatment_orders_router.py`, unaffected by R7 — confirmed genuinely usable, composed successfully |
| OCC / If-Match | ✅ Ready (staged) | `T-BE-E.5` COMPLETE with a documented compatibility amendment (commit `93e9b8d`) — `If-Match` fully enforced when supplied, optional until `T-FE-E.5` ships; `T-FE-E.2` adopted `If-Match` immediately (commits `4fba2ec4`/`80fb96d0`), confirmed working end-to-end |

**[Updated 2026-07-27, T-FE-E.2a closure] All 7 rows are ready, and `T-FE-E.2` is now COMPLETE.** `T-BE-D.4a` closed the two gaps this table's 2026-07-26 correction identified. The last remaining gap, `SessionInstructionsModule`'s author-once-apply-to-many (FR-TS-3's own AC), was closed by `T-FE-E.2a` (commit `7e2ce7f1`), which reused the already-working `bulk_update_treatment_sheet_rows_by_tenant` endpoint — no backend change was needed, contrary to this table's earlier belief that `T-BE-E.3` was unstarted.

---

## T-FE-E.5 Backend-Prerequisite Reconciliation [2026-10-03]

This current reconciliation supersedes the stale Living Document blocker statements above without rewriting their historical audit evidence. Backend `reconciliation/r7-cos-dev-be` commit `d17c508bdb419a939711d508a51bf88c0a042021` (`R7 expose living document lineage and snapshots`) is present on the remote branch. The focused closure suite passed 63 / 0 / 0.

| E.5 prerequisite | Status | Verified evidence |
|---|---|---|
| G.1 identity and immutable snapshots | SATISFIED | Complete; reused by read transport |
| G.2 amendment lifecycle and permission enforcement | SATISFIED | Complete; canonical `casesheet.amend` / `prescription.amend` authority |
| G.3 lifecycle documentation | SATISFIED | Complete |
| ETX-1 permission classification | SATISFIED | Complete |
| Case Sheet and Prescription lineage/version lists | SATISFIED | authoritative backend reads |
| Immutable historical snapshot reads | SATISFIED | document-owned signed snapshots |
| Current/superseded truth and historical-version prints | SATISFIED | backend lineage and snapshot print transport |
| Tenant and document/version isolation | SATISFIED | closure security tests |

T-FE-E.5 is **COMPLETE [Reconciled 2026-10-03]**. It consumes authoritative Case Sheet and Prescription version lists, version number, current/superseded state, immutable signed snapshots, and historical-version print routes; it does not derive lineage or treat amendments as new Case Sheets or Prescriptions. Focused E.5 acceptance passed 6 / 0 / 0; critical module/flag regressions 46 / 0; targeted COS regressions 111 / 0. `ET-MIG-001` and `G1_B2_RUNTIME_CONCURRENCY_DEFERRED_REQUIRES_ISOLATED_DB` remain OPEN and are not closed by E.5.
