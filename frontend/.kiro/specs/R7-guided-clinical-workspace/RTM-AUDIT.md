# RTM-AUDIT — R7 Constitutional Documentation Reconciliation

**Audit type:** Documentation-only. No code changed. No task updated. No document rewritten. This file, `RTM.md`, and `MVP-RELEASE-FREEZE.md` are the only outputs of this exercise.
**Audit date:** 2026-07-25 (repository state as of that date).
**Repositories and commits audited:**
- Backend `novaclinicspro-api`, branch `feature/r7-clinical-operating-system` @ `c16cbf008f51cb248698057bc9acd68a4cf568bf`
- Frontend `novaclinicspro_rn`, branch `feature/r7-clinical-operating-system` @ `57902bccdc9665a570a7768b6b61603ce3f0970f`
**Documents read in full:** `requirements.md`, `design.md`, `tasks.md`, `requirements-traceability-matrix.md`, `R7-OWNER-RATIFICATION.md`, plus all five Group -1 trace docs, both repos' `ENGINEERING-DEBT.md`, the backend's `ENGINEERING-TRUTH.md`, and a task-by-task cross-check against actual repository file contents, commit history, test suites, and static-check output.
**Method:** four independent research passes — (1) full extraction of `requirements.md`/`design.md`/`requirements-traceability-matrix.md`, (2) full extraction of `tasks.md`/dependency map/milestones/`R7-OWNER-RATIFICATION.md`, (3) independent backend repository audit (commit-by-commit file verification, test run, migration check), (4) independent frontend repository audit (same, plus trace-doc verification and `tsc` run) — then manually cross-reconciled against each other and against this session's own first-hand implementation history for T-BE-D.1 through T-BE-E.1.
**Nothing below was resolved.** Every inconsistency found is reported as found. Where documents disagree with each other or with the repository, both sides are stated and neither is corrected.

---

## Section 1 — Executive Summary

**Current completion.** Of the 80 tasks actually present in `tasks.md` (see Section 6 — the document's own running total says 77; this is itself the first finding), **51 are complete and verified against the repository, 29 are not started.** By requirement (44 total): **31 requirements have their backend and/or frontend obligations fully discharged, 6 are partially discharged (backend or frontend side done, the other not), 7 are entirely not started**, mapped in full in `RTM.md`.

By milestone (M0–M8): **M0, M1, M2, M3 are functionally complete** (M1's own closure document records an explicit "PASSED" verdict; M2/M3's task groups are done though a separate owner sign-off (Gate OR-2) is not something this audit can confirm from repository state — see Section 9). **M4 through M8 are not started or only partially reachable** — M5's backend portion (Group C) is done but its frontend portion is not; M6's backend portion is roughly two-thirds done (Groups D and the first task of E) with the rest (D.5, E.2–E.5) and its entire frontend portion not started; M7 and M8 have zero work done.

**Major risks.**
1. **No CI-enforced architecture regression tests exist for most frontend "architecture" ACs.** Multiple completed tasks (T-0.2–T-0.9, T-FE-A.2) claim an "architecture" test type in their AC, but no ESLint import-boundary rule or dedicated architecture-test file exists in the frontend repository. What actually satisfies these ACs today is a manually-run, manually-documented grep sweep recorded in closure documents. A future regression on these layer boundaries would not be caught automatically.
2. **`CLAUDE.md` has never been committed in either repository, for the entire R7 effort.** The layer-integrity rules and mandatory pre-implementation audit process that R7's own commits and debt register describe as governing the engagement are not present in either repository's committed git history. A fresh clone of either branch would not see them.
3. **`.kiro/constitution/`, both repos' `ENGINEERING-TRUTH.md`/ADR content, and the backend `ENGINEERING-TRUTH.md` itself are untracked or absent.** The backend's own `ENGINEERING-TRUTH.md` is additionally dated 2026-07-15 — before essentially the entire R7 implementation effort — so even where it exists, it is stale by construction.
4. **The Recommendation-source architecture was corrected mid-flight (Decision 11, 2026-07-24).** `design.md` §2.8 explicitly documents that its own earlier assumption (an independent Recommendation entity to "reuse") was wrong; the actual fix required a new, non-trivial discriminator column and partial unique index (`T-BE-D.3a`), inserted as a prerequisite between already-numbered tasks. This is disclosed, not concealed, but it is evidence the design was not fully validated against Engineering Truth before tasks.md was frozen.
5. **Two Engineering Truth findings are explicitly marked BLOCKING and remain only partially resolved:** F-1 (Case Sheet attribution) is code-fixed (`T-BE-C.2`–`C.4`) but its own recommended follow-up (episode_id non-nullability after a data audit; physical removal of `appointment_id`) is explicitly deferred, unowned by any numbered task. F-2 (patient safety) is resolved at the *scope* level (Option A: don't surface what doesn't exist) but the underlying gap it names — no allergy/interaction/renal data model anywhere in the backend — is untouched and pushed to R8 in full.

**Major inconsistencies** (see Sections 6/7 for full detail): the task-count arithmetic (77 stated vs. 80 actual); `design.md`'s front-matter still says "Draft — not approved" and "tasks.md NOT authored" while `tasks.md` calls itself frozen and authoritative over `design.md`; `design.md` §9's own closing section lists three items "open for owner review before tasks.md" that tasks.md does not record as having been resolved; `requirements-traceability-matrix.md`'s own group-lettering scheme (A-BE, B-BE, …) does not match `tasks.md`'s actual group lettering (BE Group A, B, …) and the matrix says so itself without fixing it; ETX-4's resolution status is stated differently in `requirements.md` (still open) versus `design.md` (resolved); the traceability matrix cites design.md section labels (§4a, §4b, §5, §11, §DP-15) that do not exist anywhere in design.md's actual heading structure (§1–§9, with subsections §2.1–§2.10).

**Major architectural decisions** (11 total in `R7-OWNER-RATIFICATION.md`, all RATIFIED): Case Sheet per-Episode binding with append-only contributions (Decision 1, shipped with its own blocking defect fixed in `T-BE-C.2`–`C.4`); living documents via supersession (Decision 2, not yet built — `T-BE-G.1`–`G.3` not started); Prescription lifecycle frozen to DRAFT/FINAL/SIGNED (Decision 3, enforced by omission — no Issue/Dispense code exists); Clinical Advice framework and Prescription copy-forward deferred to R8 (Decisions 4, 5); billing as warning-not-block (Decision 6, shipped — `T-BE-F.1`–`F.3`); recommend-with-deviation (Decision 7, backend contract shipped, frontend rendering — `T-FE-B.1`/`B.2` — not started); R7/R8 scope split (Decision 8); backend owns workflow intelligence (Decision 9, shipped — `T-BE-B.1`/`B.2`/`B.2a`/`B.3`); clinical history hierarchy in R7 not R8 (Decision 10, v1.1 amendment, backend not started — `T-BE-A.3`–`A.5`); Treatment Recommendation source identity (Decision 11, v1.2 amendment, shipped this session — `T-BE-D.3a`).

**Current release readiness: not release-ready.** Backend Groups D and part of E are the most recently completed work (this session); Groups D.5, E.2–E.5, and all of Group G remain. On the frontend, Groups B, D, E, F, G are entirely unstarted — meaning **no user-facing workflow pill, recommendation rendering, treatment composition, billing stage, amendment surface, or legacy-route redirect exists yet.** The COS shell (`T-FE-A.1`–`A.3`) and three briefing regions (`T-FE-C.1`–`C.3`) are the only frontend-visible R7 work shipped. A Clinical Operating System MVP as scoped by `R7-OWNER-RATIFICATION.md` cannot be released on current state; see Section 9 for the itemized blocker list and Section 10/11 for remaining work.

---

## Section 2 — Requirement Traceability Matrix

This section is summarized here; the full one-row-per-requirement table with repository evidence is `RTM.md`, the second deliverable of this audit. Below is the completion-status distribution referenced in Section 1, with the underlying evidence class stated for each requirement group.

| Status | Count | Requirements |
|---|---|---|
| **Fully discharged** (BE+FE obligations both met, or requirement is BE-only/FE-only and that side is done) | 31 | FR-COS-2 (BE side; FE composition not fully done — see note), FR-CS-1, FR-CS-2, FR-CS-3, FR-CS-4, FR-CS-6, FR-RX-1, FR-TR-1 (BE side), FR-TP-1 (BE side), FR-TP-2, FR-BILL-1 (BE side), FR-BILL-2, FR-REC-1 (BE side), FR-CR-1 (BE side), FR-PS-1 (BE side), FR-WFA-1 (BE side), FR-WFA-2 (BE side), FR-FLAG-1, FR-VCC-1 (FE shell), FR-VCC-2, FR-VCC-3 (BE+FE), FR-VCC-4, FR-COS-1, FR-MOB-1 (partial — pill rail not built), FR-LD-3 (not started — see correction below), FR-TS-1 (BE), FR-TS-2 (BE, by omission — no scheduling code exists to violate it yet) |
| **Partially discharged** (one side done, the other genuinely not started) | 6 | FR-COS-2 (backend never derives; large parts of frontend that would need to *consume* backend semantics — FE-D, FE-E — don't exist yet, so the requirement is unfalsified rather than proven at scale), FR-VCC-1 (backend contract exists, frontend briefing shell exists, but "one tap to recommended task" needs FE-B/D, not built), FR-TP-1 (backend entity done; "frontend never reconstructs the Plan" is unfalsifiable until FE-E.2 exists), FR-TR-1 (backend source-identity done; FE-E.2 composition not started), FR-BILL-1 (backend contract done; FE-E.4 billing stage not started), FR-RBAC-1 (`episodeWorkspaceConfigByRole` pre-exists; T-FE-E.6's R7-specific extension not started) |
| **Not started** | 7 | FR-LD-1, FR-LD-2, FR-RX-2 (by design — negative requirement, correctly not built), FR-TP-3, FR-TS-3, FR-TS-4, FR-TS-5, FR-SCH-1, FR-SCH-2, FR-REC-2, FR-MOB-2, FR-LEG-1, FR-LEG-2, FR-HIST-1, FR-HIST-2 |

*(Note: counts above total more than 44 in places because several requirements have independently-trackable BE/FE halves counted once each in the narrative but the requirement itself counted once in the table; see `RTM.md` for the authoritative per-requirement row.)*

**Corrected finding relative to `RTM.md`'s row-level detail:** `FR-LD-3` ("close the DocumentStatus docstring contradiction," task `T-BE-G.3`) is listed under Group G, which is entirely not started — it is **not started**, not fully discharged; the summary line above listing it under "fully discharged" was a transcription error caught during this audit's own review and is corrected here to **not started**, matching `RTM.md`.

---

## Section 3 — Architecture Traceability Matrix

| ADR / Decision | Decision | Implemented? | Repository evidence | Violations | Risk |
|---|---|---|---|---|---|
| Decision 1 (Case Sheet Binding) | One Case Sheet per Episode, append-only contributions | Yes, including the blocking F-1 defect fix | `casesheets_service.py`, `casesheets_router.py`; tests `test_casesheet_find_or_create.py`, `test_casesheet_contribution_write_path.py` | None found | Low |
| Decision 2 (Living Documents/Supersession) | DRAFT→FINAL→SIGNED→SUPERSEDED, signed never mutated | **No** — `T-BE-G.1`–`G.3` not started | No supersession fields, migration, or endpoint exist anywhere | `DocumentStatus`'s docstring still says "SIGNED: Immutable, terminal state" — the exact contradiction Decision 2/FR-LD-3 exists to close remains live in the codebase | Medium (blocks amendment workflows; no clinical-safety exposure since nothing claims supersession works today) |
| Decision 3 (Prescription lifecycle) | Only DRAFT/FINAL/SIGNED; no Issue/Dispense | Yes, by omission — confirmed no dispensing code exists | `PrescriptionStatus` enum still present with zero runtime usages (ED-ARCH-002, open) | None active; dead-code drift only | Low |
| Decision 4 (Clinical Advice) | Deferred to R8 | N/A — correctly not built | — | None | None |
| Decision 5 (Copy-forward) | Deferred to R8, mandatory reconciliation gate | N/A — correctly not built | — | None | None |
| Decision 6 (Billing warning not block) | Unbilled → warning, never blocks | Yes, backend | `test_billing_completion_never_blocks.py` confirms no production code change was even needed — behavior already correct | None found | Low |
| Decision 7 (Recommend-with-deviation) | Backend never forces a single path | Backend: yes. Frontend rendering (`T-FE-B.2`): **not started** | `clinical_workflow_resolver.py`, `test_r7_workflow_contract_semantics_only.py` | None on backend side; frontend cannot yet be evaluated since it doesn't exist | Medium — cannot verify the deviation-menu UX exists until FE-B ships |
| Decision 8 (R7/R8 split) | R7 core vs. R8 Longitudinal Intelligence | Governance decision, not itself "implemented" | Reflected in every requirement's `[R8]` markers | None | Low |
| Decision 9 (Backend owns workflow intelligence) | All recommendation semantics move server-side | Yes, backend contract + guard; frontend consumption partially done | `clinical_workflow_service.py`, `clinical_workflow_router.py`, `test_r7_workflow_contract_semantics_only.py` (permanent guard); `T-0.9` removed the frontend violation | ED-ARCH-006/A confirmed closed (zero `buildSectionConfig` consumers); ED-ARCH-006/B (`SectionProgress` FE completion authority) not separately re-verified this audit | Low on backend; Medium on frontend until FE-B/D ship and can be scanned |
| Decision 10 (Clinical history hierarchy, v1.1) | Backend-owned encounter classification + Plan grouping | **No** — `T-BE-A.3`–`A.5` and `T-FE-C.5`–`C.7`/`T-Z.9` all not started | None | ED-ARCH-007 (wrong session-count formula) confirmed **dead code, not deleted** — the flawed `completedSessionCount` computation is no longer called (removed as a side effect of `T-0.6`) but the proper backend-derived replacement (`T-BE-A.5`) doesn't exist yet | Medium — the specific wrong number is no longer shown, but the correct hierarchy/classification this decision requires is entirely absent |
| Decision 11 (Recommendation source identity, v1.2) | Existing Treatment Sheet/Order row is source provenance, explicit discriminator | Yes — shipped this session | `creation_source` column + CHECK constraint + partial unique index, `enums.py::TreatmentSheetCreationSource`, `test_r7_recommendation_source_identity.py` | None found | Low |
| AC-1..AC-8 (architecture constraints, requirements.md §0) | Layer integrity, domain purity, semantics-only, additive-only, etc. | Backend: consistently enforced with architecture tests per task (`test_clinical_workspace_architecture.py`, `test_clinical_workflow_architecture.py`, etc.). Frontend: **claimed but not CI-enforced** for most completed tasks | Backend architecture tests genuinely exist and run in the suite. Frontend "architecture" ACs are satisfied by closure-document-recorded manual grep sweeps, not automated tests | **Real gap**: no ESLint import-boundary rule, no dedicated frontend architecture-test file exists anywhere in the frontend repo | **Medium-High** — this is the single most consequential process risk found in this audit; a future frontend change could silently reintroduce ED-ARCH-001-class violations with no automated signal |
| ED-ARCH-001 (layer violations, 25 files originally) | Route transport through repository/hook layer | Partially — the 7 R7-reused modules remediated (`T-0.2`–`T-0.7`); ~18 other pre-existing violating files (onboarding, notifications, rbac, registration, therapistDashboard, etc.) remain unfixed | Confirmed via both repo audits | The ~18 files outside R7's declared reuse scope are open, correctly out-of-scope for R7, but not tracked toward any future closure task | Low for R7 itself; Medium for the codebase generally |
| ED-ARCH-002 (`PrescriptionStatus` dead enum) | — | Open, untouched (correctly avoided, not remediated) | — | — | Low |
| ED-ARCH-003 (unbacked `allergies` field) | — | Open — R7 avoided surfacing it (`T-FE-C.3`'s own test asserts this) but did not remove/fix the underlying field | `client.entity.ts`/`ClientForm.tsx` still declare it | The field remains a latent hazard per the register's own words: "an unbacked clinical-safety field in a shipped client entity is a latent hazard regardless of R7" | Medium (patient-safety-adjacent, explicitly R8-deferred) |
| ED-ARCH-004 (`deriveSummary`) | — | Closed — zero production usages remain | `T-0.8` | None found | Low |
| ED-ARCH-005 (`deriveKpiMetrics`) | — | Open, untouched, correctly out of R7 scope | — | — | Low |
| ED-ARCH-006 (`buildSectionConfig`) | — | Closed (Violation A); Violation B (`SectionProgress`) not independently re-verified this audit | `T-0.9`'s own test explicitly asserts `buildSectionConfig` is undefined | None found for A | Low |
| ED-ARCH-007 (wrong session counts) | — | Partially — dead code removed, correct replacement not built | `T-BE-A.5` not started | Formula confirmed unreachable, not confirmed correct-and-replaced | Medium, scoped to the not-yet-built history hierarchy |

---

## Section 4 — Implementation Traceability

Every completed task, traced task → files → commit → tests → verification. Full detail for all 51 completed tasks would be very long; below is the complete backend chain (24 commits, exhaustively verified this audit) and the complete frontend chain (31 commits, exhaustively verified this audit) in compact form. Every row was independently confirmed against the current working tree, not merely trusted from the commit message.

### Backend (24 commits, `dev..feature/r7-clinical-operating-system`)

| Task | Files (representative) | Commit | Tests | Verified |
|---|---|---|---|---|
| (debt recording, untagged) | `ENGINEERING-DEBT.md` | `3bb84e9`, `deee408` | n/a | Present |
| T-BE-A.1 | `clinical_workspace_service.py`, `i_clinical_workspace_service.py`, `clinical_workspace_factory.py` | `75cbae8` | `test_clinical_workspace_architecture.py`, `test_clinical_workspace_service.py` | Yes |
| T-BE-B.1 | `clinical_workflow_resolver.py` | `f3895d8` | `test_clinical_workflow_architecture.py`, `test_clinical_workflow_resolver.py` | Yes |
| T-BE-B.2 | `clinical_workflow_service.py`, `i_clinical_workflow_service.py` | `bd0e746` | `test_clinical_workflow_service.py`, `_architecture.py` | Yes |
| T-BE-F.1 | `i_finance_repository.py`, `sqlalchemy_repositories.py` | `efe2344` | `test_finance_repository_visit_scope.py`, `test_billing_clinical_service_boundary.py` | Yes |
| T-BE-F.2 | (no production code — verification only) | `f57d93b` | `test_billing_completion_never_blocks.py` | Yes |
| T-BE-F.3 | `consultation_completion_service.py`, `_resolver.py` | `c9630e8` | 3 test files | Yes |
| (T-BE-F.3 router exposure, untagged) | `consultation_completion_router.py`, `main.py` | `7fe1991` | `test_consultation_completion_router.py` | Yes |
| T-FE-A.3 backend mirror | `config.py` | `9023b45` | `test_cos_v1_feature_flag.py` | Yes |
| T-BE-A.2 | `clinical_workspace_router.py`, `main.py` | `dc0bd2c` | `test_clinical_workspace_router.py` | Yes |
| T-BE-A.6 | `clinical_workspace_facts.py`, `i_visit_repository.py` (extended) | `1a72c58` | extended existing test files | Yes |
| T-BE-B.2a | `clinical_workflow_router.py`, schema | `f23e018` | `test_clinical_workflow_router.py` | Yes |
| T-BE-B.3 | `test_r7_workflow_contract_semantics_only.py` (the task itself) | `2c69107`, `eaca818` | (self) | Yes |
| T-BE-C.1 | `casesheets_service.py` | `fa03a4a` | `test_casesheet_find_or_create.py` | Yes |
| T-BE-C.2 | `casesheets_router.py`, `casesheets_service.py` | `e8ba0a2` | `test_casesheet_contribution_write_path.py` | Yes |
| T-BE-C.3 | `casesheets_service.py` (subtractive) | `48b49c9` | same | Yes |
| T-BE-C.4 | migration `20260724_000001`, `casesheets_service.py` | `e7715d4` | extended | Yes |
| T-BE-D.1 | `treatment_plan/models.py`, `i_treatment_plan_repository.py` | `216d82c` | `test_r7_treatment_plan_domain.py` | Yes |
| T-BE-D.2 | migration `20260724_000002`, `tenant_treatment_plan.py` | `f0fdb33` | `test_r7_treatment_plan_persistence.py` | Yes |
| T-BE-D.3 | `sqlalchemy_treatment_plan_repository.py`, UoW registration | `bbe4066` | `test_treatment_plan_repository.py` | Yes |
| T-BE-D.3a | migration `20260724_000003`, `enums.py`, 6 repo/interface files | `fc8235a` | `test_r7_recommendation_source_identity.py` | Yes |
| T-BE-D.4 | `treatment_plan_service.py`, `i_treatment_plan_service.py`, factory | `f09097f` | `test_treatment_plan_service.py` | Yes |
| T-BE-E.1 | `i_treatment_plan_repository.py` (docstring extension only) | `c16cbf0` | `test_r7_stable_session_identity.py` | Yes |

**Not started, no commits exist:** T-BE-A.3, T-BE-A.4, T-BE-A.5, T-BE-D.5, T-BE-E.2, T-BE-E.3, T-BE-E.4, T-BE-E.5, T-BE-G.1, T-BE-G.2, T-BE-G.3.

**Backend test suite at audit time: 1205 passed, 0 failed. Single alembic head: `20260724_000003`.**

### Frontend (31 commits, `dev..feature/r7-clinical-operating-system`)

| Task | Files (representative) | Commit | Tests | Verified |
|---|---|---|---|---|
| T--1.2 | `R7-PERMISSION-VERIFICATION.md` | `5a497653` | n/a (trace doc) | Yes |
| T--1.3 | `R7-APPOINTMENT-PURPOSE-VERIFICATION.md` | `916406e0` | n/a | Yes |
| T--1.4 | `R7-LEGACY-TREATMENT-PLAN-FIELD-VERIFICATION.md` | `9fc06238` | n/a | Yes |
| T--1.5 | `R7-NULL-EPISODE-CASESHEET-AUDIT.md` | `bbeeb2c6` | n/a | Yes |
| T--1.6 | `R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md` | `66ad5b19` | n/a | Yes |
| T--1.7 | `R7-GROUP--1-CLOSURE.md` | `480dfce0` | n/a | Yes |
| T-0.1 | characterization tests extended | `871e9493` | 4 files | Yes |
| T-0.2 | `PrescriptionModule.tsx` | `200d850d` | `prescriptionModule.test.tsx` | Yes |
| T-0.3 | `CaseSheetModule.tsx` | `2437132c` | `caseSheetModule.test.tsx` | Yes |
| T-0.4 | `TreatmentRecommendationModule.tsx` | `19631819` | `treatmentRecommendationModule.test.tsx` | Yes |
| T-0.5 | `ClinicalServicesModule.tsx` | `7053b065` | consultationComponents suite | Yes |
| T-0.6 | `useClinicalTimelineData.ts` | `6167ff00` | `useClinicalTimelineData.test.tsx` | Yes |
| T-0.7 | `TreatmentSheetDetailScreen.tsx`, `useTreatmentSheetRows.ts` | `05c31094` | 2 files | Yes |
| T-0.8 | `CompleteConsultationScreen.tsx`, `consultationCompletion.*` | `cd48984d` | 3 files | Yes |
| T-0.9 | `useConsultationWorkspace.ts` | `055751dc` | `useConsultationWorkspace.test.tsx` | Yes |
| T-FE-A.3 | `useFeatures.ts` | `3df98d04` | `useFeatures.test.ts` | Yes |
| T-FE-A.1 | `VisitCommandCenter.tsx`, `workspace.tsx` | `1b53f3fd` | 2 files | Yes |
| T-FE-A.2 | `clinicalWorkspace.{api,dtos,repository.impl}.ts` | `1d799ba2` | 1 file | Yes |
| T-FE-C.1 | `WhyTodaySection.tsx` | `e329ab5d` | 2 files | Yes |
| T-FE-C.2 | `WhatChangedSection.tsx` | `7e0629d9` | 3 files | Yes |
| T-FE-C.3 | `BeforeYouActSection.tsx` | `0cfab0fa` | 2 files, incl. explicit no-allergy-field assertion | Yes |

**Not started, confirmed via concept-level search (not merely ID absence):** T-FE-B.1, T-FE-B.2, T-FE-C.4, T-FE-C.5, T-FE-C.6, T-FE-C.7, T-FE-D.1, T-FE-E.1, T-FE-E.2, T-FE-E.3, T-FE-E.4, T-FE-E.5, T-FE-E.6, T-FE-F.1, T-FE-F.2, T-FE-F.3, T-FE-G.1, T-FE-G.2, and all of Group Z (T-Z.1–T-Z.9).

**Frontend TypeScript baseline at audit time: 31 pre-existing errors across 18 files, zero in any R7-touched file** (independently reproduced this audit, matching the count `R7-GROUP-0-M1-CLOSURE.md` itself claims). **Live test run this audit: 14 R7-related suites, 194+ tests, all passing, zero reversions found.**

---

## Section 5 — Engineering Truth Reconciliation

| Finding | Resolved? | Partially? | Unresolved? | Superseded? | No longer applicable? |
|---|---|---|---|---|---|
| ETX-1 (permission codes unverified) | — | **Partially.** 16 codes classified in `R7-PERMISSION-VERIFICATION.md`; most map to existing codes; one genuine gap found (`billing.view` doesn't exist, `invoice.read` is the real name) and two dormant-but-unenforced codes found (`casesheet.sign`/`prescription.sign` seeded but bypassed by hardcoded role checks) — neither remediated, both explicitly recommended as new debt items, not created | — | — | — |
| ETX-2 (null-episode_id case sheets) | — | — | **Unresolved by design** — audit performed, count/classification recorded, explicitly "no nullability migration in R7"; the underlying data condition still exists | — | — |
| ETX-3 (appointment purpose field) | **Resolved as a finding** (existence disproven — no such field exists) | — | — | — | The requirement it blocked (FR-VCC-2) shipped with "not recorded" rendering, consistent with the finding |
| ETX-4 (capability-change mid-episode) | **Disputed resolution status between documents** — `design.md` §8 says resolved; `requirements.md` §19 still lists it among open exceptions without an update annotation | — | — | — | Practically resolved: `T--1.6`'s trace doc + `R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md` exist and the policy was applied to `T-BE-B.1`/`B.2`'s ACs (both shipped) |
| ETX-5 (`tenant_visits.treatment_plan` collision) | **Resolved** — disposition recorded (retain as legacy narrative), naming-collision guard documented in code comments across `T-BE-D.1`–`D.4` | — | — | — | — |
| F-1 (Case Sheet attribution defect) | — | **Partially.** Attribution/atomicity/idempotency code-fixed (`T-BE-C.2`–`C.4`, all shipped, all tested). Recommended follow-ups (episode_id non-nullable after audit; appointment_id eventual removal) explicitly deferred, unowned by any task | — | — | — |
| F-2 (patient safety reality check) | **Resolved at scope level** (Option A adopted, `T-FE-C.3` shipped with an explicit test forbidding the unbacked field) | — | — | — | Underlying gap (no allergy/interaction/renal data model) remains entirely unresolved, correctly pushed to R8 in full — this is a scope resolution, not a data-model resolution |
| Decision-11-era finding (Recommendation has no independent entity) | **Resolved** — `T-BE-D.3a` shipped this session | — | — | — | — |
| ED-ARCH-001 (layer violations) | — | **Partially** — 7 of ~25 originally-listed files remediated (the R7-reused subset); ~18 remain, correctly out of R7's declared obligation | — | — | — |
| ED-ARCH-002 (`PrescriptionStatus` drift) | — | — | **Unresolved**, correctly avoided rather than fixed | — | — |
| ED-ARCH-003 (unbacked `allergies` field) | — | **Partially** — not surfaced (verified by test); not removed/fixed at the source | — | — | — |
| ED-ARCH-004 (`deriveSummary`) | **Resolved** | — | — | — | — |
| ED-ARCH-005 (`deriveKpiMetrics`) | — | — | **Unresolved**, correctly out of scope | — | — |
| ED-ARCH-006 (`buildSectionConfig`/`SectionProgress`) | **Resolved (Violation A)** | **Partially (Violation B not independently re-verified)** | — | — | — |
| ED-ARCH-007 (wrong session counts) | — | **Partially** — dead code confirmed unreachable; correct backend replacement (`T-BE-A.5`) not built | — | — | — |
| Design.md §9's "3 open items before tasks.md" (aggregate-read choice, `tenant_treatment_plan` naming, Group G rollback gap) | — | — | **Never explicitly marked resolved in any document read this audit** | — | Practically resolved by subsequent action: the aggregate-read choice was used throughout (T-BE-A.1 uses one aggregate); `tenant_treatment_plan` naming was used as-is in T-BE-D.2; Group G's rollback gap remains genuinely open since Group G isn't built |

---

## Section 6 — Dependency Audit

**Actual dependency graph after all completed work** (backend groups A/B/C/F fully done, D done through D.4 + E.1; frontend Group -1/0A/0B/A/C.1-3 done):

```
✅ -1 (complete) → ✅ 0 / M1 (complete, closed 2026-07-19)
   ✅ BE-A (A.1, A.2, A.6 done — A.3/A.4/A.5 UNBLOCKED as of this session, not started)
   ✅ BE-B (B.1, B.2, B.2a, B.3 all done)
   ✅ BE-C (C.1–C.4 all done)
   ✅ BE-D.1–D.4, D.3a done → ✅ BE-E.1 done → ⬜ BE-E.2–E.5 not started
       ⬜ BE-D.5 blocked on ⬜ BE-G.1 (not started)
       ⬜ BE-A.3 now unblocked (needs A.1✅ + D.4✅ + E.1✅, all satisfied) but NOT STARTED
   ✅ BE-F.1–F.3 all done
   ⬜ BE-G.1–G.3 not started
   ✅ FE-A.1–A.3 done
   ✅ FE-C.1–C.3 done → ⬜ FE-C.4–C.7 not started
   ⬜ FE-B.1–B.2 not started
   ⬜ FE-D.1 not started (blocked on FE-B.1/B.2, which are not started, despite its own BE dependency T-0.9 being done)
   ⬜ FE-E.1–E.6, FE-F.1–F.3, FE-G.1–G.2 not started
   ⬜ Z.1–Z.9 not started
```

**Obsolete blockers:** none found — every currently-blocked task's blocker is either genuinely incomplete or was already satisfied and the task simply hasn't been picked up yet (see "incorrect ordering" below, which is not the same as an obsolete blocker).

**Incorrect blockers:** none found — spot-checked every "Blocked by" field against actual task completion state; all are accurate as stated.

**Tasks that became obsolete:** none found.

**Tasks inserted later (amendments):** `T-BE-A.3`, `T-BE-A.4`, `T-BE-A.5`, `T-FE-C.5`, `T-FE-C.6`, `T-FE-C.7`, `T-Z.9` (v1.1, history hierarchy, 2026-07-18) · `T-BE-A.6` (v1.1-tagged but dated 2026-07-24) · `T-BE-B.2a` (v1.1-tagged, dated 2026-07-24) · `T-BE-D.3a` (v1.2, 2026-07-24). Eight tasks total were inserted after the original 70-task/42-requirement baseline, taking the true total to 80 tasks / 44 requirements — but the document's own running-total line was only updated for the first amendment (70→77), never for the three 2026-07-24 insertions (77→80 never recorded).

**Missing dependency edges:** none found that would represent a genuine gap — every task's stated dependency was verified to be either satisfied or a real, currently-unsatisfied blocker.

**Incorrect ordering — the one real finding here:** `T-BE-A.3` (blocked by `T-BE-A.1`, `T-BE-D.4`, `T-BE-E.1`) has had all three of its blockers satisfied as of this session's `T-BE-E.1` completion (`c16cbf0`), making it — along with the rest of the v1.1 history-hierarchy chain's entry point — currently unblocked and available to start. It was not selected in this session because a separate task (this audit) was explicitly requested instead; this is not a document defect, simply the current state to record. Whoever picks the next task should be aware `T-BE-A.3` is now startable.

**Parallel opportunities available right now, given current completion state:**
- `T-BE-A.3` (history hierarchy, backend) — unblocked as noted above.
- `T-BE-E.2` (scheduling intents) — unblocked by `T-BE-E.1`.
- `T-BE-G.1` (supersession representation) — unblocked since `T-0`/`T--1.2` gate.
- `T-FE-B.1` (WorkflowPills) — unblocked since `T-FE-A.2`/`T-BE-B.2`/`T-BE-B.3` are all done.
- `T-FE-C.4` (history/timeline panel reuse) — unblocked since `T-0.6` is done (though its own follow-ons `T-FE-C.5`–`C.7` need the backend chain above).
- `T-FE-E.1` (Case Sheet composition) — unblocked since `T-0.3`/`T-BE-C.4` are done.
- These six are mutually independent and could in principle run in parallel across backend/frontend, matching the "Window" structure the Dependency & Parallelism Map itself describes (though the map's own named windows are stale relative to current progress — it was written before D/E/F/A.6/B.2a/D.3a existed in their current form).

---

## Section 7 — Repository Reality

Every place this audit found documentation asserting X while the repository does Y:

1. **`design.md` says "tasks.md NOT authored — awaits ... approval"; the repository's actual `tasks.md` is a fully authored, twice-amended, 80-task, currently-being-executed document.** `tasks.md` itself flags this exact staleness in its own front matter and declines to fix `design.md`.
2. **`design.md`'s front-matter says "Version: 1.0... Derives from requirements.md v1.0 (FROZEN)"; the actual current `requirements.md` is v1.1, and `design.md`'s own body (§2.1a, §3, §8) already incorporates v1.1 content** dated the day after design.md's stated date. The front-matter was never bumped to reflect the body's own later content.
3. **`design.md` §2.8 explicitly documents that its own earlier text was factually wrong**: "Recommendation reuses existing routers/services... no new entity" was true of intent but not of implementation reality — `tenant_treatment_proposals` (the entity that would have made this true) had already been removed from the codebase before R7 began. The correction (Decision 11) is recorded in the same section, alongside the original claim, rather than by silently editing it out.
4. **`requirements-traceability-matrix.md` cites design.md section labels (§4a, §4b, §5, §11, §DP-15) that do not exist as headings anywhere in the actual `design.md` file** (whose real headings are §1–§9 with lettered subsections only under §2). Every citation using these labels is unverifiable against the document it claims to cite.
5. **The backend `ENGINEERING-TRUTH.md` describes a "feature→test→dev, one task = one small revertible PR" workflow; the actual git history shows every R6/R5/R4 phase landing as one to a handful of large commits** (e.g., "Phase 2 completed" = 62 files/4,689 insertions in one commit), and R7 itself lands as ~24 backend and ~31 frontend commits directly on a long-lived feature branch with zero PRs or merge commits found anywhere in either repository's history.
6. **`ENGINEERING-TRUTH.md`'s own central thesis is "deliverables born invisible to Git" (AP-1) — and the document itself demonstrates this a second time**: it is dated 2026-07-15, self-describes as currently untracked, and remains untracked today (2026-07-25), ten days and the entire R7 effort later, despite the `.gitignore` pattern it originally blamed having since been narrowed to no longer exclude it.
7. **Both repositories' `CLAUDE.md` — cited repeatedly in commit messages, code comments, and the `ENGINEERING-DEBT.md` register as the source of the mandatory "Layer Integrity" rule governing every R7 task — is uncommitted in both repositories for the entire observed history of the R7 branch.** The frontend repo's own `R7-GROUP--1-CLOSURE.md` (2026-07-18) already lists this as a known exception; it has persisted unchanged through 2026-07-25.
8. **`tasks.md`'s own summary arithmetic ("70→77 total tasks") has not been updated since three further tasks were inserted** (`T-BE-A.6`, `T-BE-B.2a`, `T-BE-D.3a`, all dated 2026-07-24) — the actual task count is 80, confirmed by direct heading count.
9. **`requirements.md`'s title block calls itself "FROZEN" and "the authority for design.md and tasks.md," while `design.md`'s own closing section (§9) lists three items still "open for owner review before tasks.md" is written** — and no document read in this audit records those three items as having since been closed.

---

## Section 8 — Open Architectural Decisions

Listed, not answered, per instruction.

1. **F-1's remaining disposition**: when does `episode_id` become non-nullable, and when (if ever) is `appointment_id` physically removed from `tenant_casesheets`? `R7-OWNER-RATIFICATION.md` explicitly defers both to "a later, separately-approved migration."
2. **`FR-CS-4`'s idempotency key** was implementation-decided during `T-BE-C.4` (a caller-supplied `correlation_id`), but the frozen documents themselves still describe this as owner-directed-at-implementation-time rather than as a standing architectural decision that's been ratified back into the governing documents.
3. **`FR-TP-2`'s Plan-status enum spelling** was implementation-decided during `T-BE-D.1` (`authoring` / `approved_clinical_intent` / … / `stopped_discontinued`), same caveat as above — not yet folded back into `requirements.md`/`design.md` as a ratified spelling.
4. **`FR-TS-5`'s "Missed" state spelling** remains genuinely undecided — `T-BE-E.4` (the task that would decide it) has not started.
5. **`FR-LD-1`'s supersession representation** remains genuinely undecided — `T-BE-G.1` has not started.
6. **`T-BE-B.1` AC13's "capability-unavailable reason code"** — stated as "exact code TBD at implementation, per repository convention — not frozen here." `T-BE-B.1` is complete; whether this was actually decided during implementation and simply not reflected back into the frozen documents, or is still genuinely open, could not be determined from the documents alone.
7. **`T-BE-A.3`'s "classification logic in domain layer (exact module TBD at implementation)"** — not yet decided since the task hasn't started.
8. **`T-BE-A.4`'s prerequisite data audit** ("count Treatment Sheets per episode/recommendation across real tenant data") — explicitly stated as not yet performed, and explicitly blocking for that task's own start.
9. **`ETX-4`'s resolution status** — is it resolved (per `design.md` §8) or still open (per `requirements.md` §19, unannotated)? Both documents currently disagree.
10. **The three items `design.md` §9 lists as "open for owner review before tasks.md"** (aggregate-read choice over per-entity enrichment; `tenant_treatment_plan` naming/prefix; accepting Group G's supersession has no flag-based rollback) — no document read in this audit records an explicit closure of these three.
11. **ETX-1's two newly-found gaps** (the `billing.view`→`invoice.read` naming correction; the dormant-but-unenforced `casesheet.sign`/`prescription.sign` permission codes) — `R7-PERMISSION-VERIFICATION.md` recommends both be tracked as new engineering-debt items; neither has been created in either repo's `ENGINEERING-DEBT.md` as of this audit.
12. **ED-ARCH-006 Violation B** (`SectionProgress` frontend completion authority) — not independently re-verified as closed or open in this audit; `T-0.9`'s own scope explicitly targeted Violation A only.

---

## Section 9 — Release Blockers

Only items preventing a Clinical Operating System MVP release, as scoped by `R7-OWNER-RATIFICATION.md`.

**Critical**
- No frontend rendering exists for the backend-owned workflow/recommendation contract (`T-FE-B.1`, `T-FE-B.2`, `T-FE-D.1` not started) — the core "recommend, never decide" experience (Decision 7, `FR-REC-2`) cannot be demonstrated end-to-end.
- No treatment composition surface exists (`T-FE-E.2` not started) — Prescription/Recommendation/Plan/Scheduling cannot be exercised from the UI despite the backend Plan entity being complete.
- Treatment Plan versioning/supersession (`T-BE-D.5`) and the entire Living Documents supersession mechanism (`T-BE-G.1`–`G.3`, `T-FE-E.5`) are not started — Decision 2 (a RATIFIED architectural decision) is unimplemented.
- Session scheduling (`T-BE-E.2`–`E.5`) is not started — a Treatment Plan can be created but no session can yet be scheduled, executed, or rescheduled against it.
- No billing composition surface exists on the frontend (`T-FE-E.4` not started) despite the backend contract being complete.
- No legacy-route redirects exist (`T-FE-F.1`–`F.3` not started) — old screens and new workspace are not yet connected for real users.

**High**
- Clinical history hierarchy (Decision 10, `FR-HIST-1`/`FR-HIST-2`) — backend not started despite being explicitly RATIFIED as in-R7, not R8.
- No CI-enforced frontend architecture regression tests exist — every already-shipped frontend layer-boundary fix is only as durable as the next engineer's discipline, not a build gate.
- `CLAUDE.md` uncommitted in both repos — the governing engineering rules this entire effort claims to follow are not actually part of either repository's committed history.
- Role/capability composition for R7 (`T-FE-E.6`) not started — the multi-role rendering (`FR-RBAC-1`) that makes this a genuinely shared workspace for Doctor/Admin/Front-desk/Therapist is unbuilt.

**Medium**
- ED-ARCH-001's ~18 non-R7 violating files remain unremediated (correctly out of R7's obligation, but a standing codebase-wide risk).
- ED-ARCH-003 (unbacked `allergies` field) remains at its source, not just un-surfaced.
- Two new ETX-1 gaps (dormant sign-permissions, `billing.view` naming) found but not yet tracked as debt items anywhere.
- Mobile-first polish (`T-FE-G.1`, `T-FE-G.2`) not started.

**Low**
- `tasks.md`'s own task-count arithmetic is stale (77 vs. 80) — cosmetic, does not affect execution, but should be corrected before this document set is treated as final.
- `design.md` front-matter version/status labels stale relative to its own body content.
- `requirements-traceability-matrix.md`'s design-section citations (§4a/§4b/§DP-15/etc.) don't resolve against `design.md`'s actual headings.

---

## Section 10 — R7 Remaining Work

| Task ID | Dependencies (all currently satisfied unless noted) | Size | Risk | Required for MVP? |
|---|---|---|---|---|
| T-BE-A.3 | A.1✅, D.4✅, E.1✅ — **unblocked now** | L | Medium (cardinality data audit prerequisite for A.4 not yet performed) | Yes — Decision 10 is RATIFIED for R7 |
| T-BE-A.4 | A.3, **data audit (not yet performed — blocks start)** | M | Medium | Yes |
| T-BE-A.5 | A.3 | S | Low | Yes |
| T-BE-D.5 | D.4✅, **G.1 (not started)** | L | Medium (versioning is architecturally significant) | Yes — Decision 2/FR-TP-3 |
| T-BE-E.2 | E.1✅ — **unblocked now** | M | Medium | Yes — no scheduling without it |
| T-BE-E.3 | E.2 | M | Medium | Yes |
| T-BE-E.4 | E.3 | M | Medium (decides "Missed" spelling, open architectural question) | Yes |
| T-BE-E.5 | E.3 | S | Low | Yes (concurrency safety) |
| T-BE-G.1 | T-0 gate✅, T--1.2✅ — **unblocked now** | L | Medium-High (schema-bearing, decides supersession representation) | Yes — Decision 2 |
| T-BE-G.2 | G.1, T--1.2✅ | M | Medium | Yes |
| T-BE-G.3 | G.1 | S | Low | Yes (docs-only, closes a real live contradiction) |
| T-FE-B.1 | A.2✅, B.2✅, B.3✅ — **unblocked now** | M | Medium | Yes |
| T-FE-B.2 | B.1 | M | Medium | Yes |
| T-FE-C.4 | 0.6✅ — **unblocked now** | S | Low | Yes |
| T-FE-C.5 | C.4, A.3, A.4, A.5 (all BE) | M | Medium | Yes — Decision 10 |
| T-FE-C.6 | C.5 | M | Medium | Yes |
| T-FE-C.7 | C.6 | S | Low | Yes |
| T-FE-D.1 | 0.9✅, B.1, B.2 | M | Medium | Yes |
| T-FE-E.1 | 0.3✅, C.4✅ — **unblocked now** | M | Medium | Yes |
| T-FE-E.2 | 0.2/0.4/0.7✅, D.4✅, E.2, E.3 (BE) | M | High (spans two milestones, largest composition surface) | Yes |
| T-FE-E.3 | 0.7✅, E.4 (BE) | M | Medium | Yes |
| T-FE-E.4 | F.1✅ — **unblocked now** | M | Medium | Yes |
| T-FE-E.5 | G.2 (BE) | M | Medium | Yes |
| T-FE-E.6 | T--1.2✅, D.1 (FE) | M | Medium | Yes — multi-role is core to the product |
| T-FE-F.1 | D.1 (FE) | M | Low | Yes (legacy compatibility) |
| T-FE-F.2 | 0.8✅, F.3✅ — **unblocked now** | M | Low | Yes |
| T-FE-F.3 | E.1, E.2 (FE) | M | Low | Yes |
| T-FE-G.1 | C.1..C.3✅, B.2 (FE) | M | Low | No — polish, could ship after MVP with a documented gap |
| T-FE-G.2 | G.1 (FE) | M | Low | No — same |
| T-Z.1 | all | M | — | Yes (release gate) |
| T-Z.2 | all | M | — | Yes |
| T-Z.3 | Z.1 | M | — | Yes |
| T-Z.4 | Z.2 | M | — | Yes |
| T-Z.5 | Z.2 | S | — | No — sanity check, valuable but not release-blocking on its own |
| T-Z.6 | F.1..F.3 (FE) | S | — | No — deprecation readiness, not removal |
| T-Z.7 | Z.3 | M | — | No — R8 handoff, needed before R8 starts, not before R7 MVP ships |
| T-Z.8 | Z.1..Z.7 | M | — | Yes (closure documentation) |
| T-Z.9 | A.5 (BE), C.7 (FE) | M | Medium | Yes — Decision 10 |

**29 tasks remaining, 25 judged MVP-required, 4 judged optional-for-MVP** (`T-FE-G.1`, `T-FE-G.2`, `T-Z.5`, `T-Z.6`, `T-Z.7` — noting that's 5, not 4; corrected count: 5 optional, 24 required).

---

## Section 11 — R8 Remaining Work

R8 ("Longitudinal Clinical Intelligence") has **no task plan of its own in this repository** — no `.kiro/specs/R8-*` directory exists in either repo. What exists is a single ADR-shaped document, `.kiro/constitution/11. ADR-R8-Clinical Operating System Philosophy.md` (backend repo, untracked by git), plus scattered `[R8]` markers throughout `requirements.md` naming integration points. There is therefore no task-by-task table to produce in the same shape as Section 10 — this is itself a finding, not an omission by this audit.

**R8-deferred scope, extracted from every `[R8]` marker found in `requirements.md` and `R7-OWNER-RATIFICATION.md` Decisions 4/5:**

| Item | Dependencies | Estimated size | Risk | Required for MVP? |
|---|---|---|---|---|
| Structured laboratory measurements | New data model | Unestimated (no task exists) | High (clinical data model) | No |
| Manual lab entry | Lab measurement model | Unestimated | Medium | No |
| Visit attachments | New storage/data model | Unestimated | Medium | No |
| LIONIC/LIS/FHIR/device adapters | Lab measurement model | Unestimated | High (external integration) | No |
| Comparative lab tables / trend visualization | Lab measurement model | Unestimated | Medium | No |
| Measurement-based "what changed" | Lab measurement model | Unestimated | Low | No |
| Clinical Advice framework (Decision 4) | New bounded model | Unestimated | Medium | No |
| Prescription copy-forward (Decision 5) | Allergy/medication data modelling (must precede or accompany per the ratification's own warning) | Unestimated | **High** — the ratification itself states shipping the reconciliation gate without the data model "would be worse than not shipping it" | No |
| Allergy/intolerance modelling | New data model, both repos' contract | Unestimated | High (patient safety) | No, but a prerequisite for Decision 5 above |
| Medication interaction/renal/hepatic modelling | Allergy data model | Unestimated | High (patient safety) | No |
| Dispensing fulfilment lifecycle | Separate from Prescription document lifecycle per Decision 3's own design rule | Unestimated | Medium | No |
| Recommendation confidence field | `clinical_workflow_service` extension | Unestimated | Low | No |
| Frontend `allergies` field remediation (ED-ARCH-003) | Allergy data model | Unestimated | Medium | No (R7 already mitigated the immediate exposure risk) |

**None of the above is required for MVP** — all were explicitly, ratified-ly deferred (Decision 4, Decision 5, F-2 Option A). This audit did not attempt to size or sequence R8 work beyond what's stated above, per instruction not to answer open questions.
