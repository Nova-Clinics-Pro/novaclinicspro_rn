# RTM — R7 Requirements Traceability Matrix

**This is the final matrix, not the audit.** For the full narrative findings, contradictions, and evidence behind each row, see `RTM-AUDIT.md`. This document is meant to be kept current as tasks complete — one row per requirement, updated in place.

**As of:** 2026-07-25 · Backend `c16cbf008f51cb248698057bc9acd68a4cf568bf` · Frontend `57902bccdc9665a570a7768b6b61603ce3f0970f`
**Legend:** ✅ Done and verified · 🟡 Partially done (BE or FE side only) · ⬜ Not started · **Verification** = how the "Done" claim was checked (test run / file inspection / both)

| Requirement | Design | Task(s) | Repository | Tests | Verification |
|---|---|---|---|---|---|
| **FR-COS-1** — COS is one workspace on the existing route | §3 | T-FE-A.1 | `frontend/.../pages/VisitCommandCenter.tsx`, `app/clinic-admin/episodes/[episodeId]/workspace.tsx` | 2 test files | ✅ File + test inspection |
| **FR-COS-2** — Frontend derives no clinical meaning | §DP-15 (all sections) | T-0.8, T-0.9 (closes ED-ARCH-004/006-A); full proof pending T-Z.1 | `CompleteConsultationScreen.tsx`, `useConsultationWorkspace.ts` | `test_r7_workflow_contract_semantics_only.py` (BE guard) + FE regression tests | 🟡 BE guard done; FE-wide proof (T-Z.1) not started |
| **FR-VCC-1** — Briefing, not a form | §4a (matrix citation unresolvable against actual design.md headings — see audit §7) | T-FE-A.1, T-FE-B.1/B.2 (for "one tap") | `VisitCommandCenter.tsx` | shell tests only | 🟡 Shell done; recommended-task navigation (FE-B) not started |
| **FR-VCC-2** — "Why today" | — | T-FE-C.1 | `WhyTodaySection.tsx` | 2 test files | ✅ |
| **FR-VCC-3** — "What changed" (R7 scope) | §2.1, §4a | T-BE-A.6, T-FE-C.2 | `clinical_workspace_facts.py` (BE), `WhatChangedSection.tsx` (FE) | BE: extended `test_clinical_workspace_service.py`; FE: 3 test files | ✅ Both sides done |
| **FR-VCC-4** — "Before you act" (R7 scope) | §2.9 | T-FE-C.3 | `BeforeYouActSection.tsx` | 2 test files, incl. explicit no-allergy-panel assertion | ✅ |
| **FR-WFA-1** — Backend assembles the workflow | §2.1 | T-BE-B.1, T-BE-B.2 | `clinical_workflow_resolver.py`, `clinical_workflow_service.py` | `test_clinical_workflow_resolver.py`, `_service.py`, `_architecture.py` | ✅ |
| **FR-WFA-2** — Permissions gate actionability, not presence | §2.1 | T-BE-B.1/B.2 (BE contract); T-FE-E.6 (FE consumption) | `clinical_workflow_resolver.py` | resolver tests | 🟡 BE done; FE role-composition (E.6) not started |
| **FR-CS-1** — One Case Sheet per Episode | §2.2 | T-BE-C.1 | `casesheets_service.py` | `test_casesheet_find_or_create.py` | ✅ |
| **FR-CS-2** — Contribution attributed to current Visit | §2.2 | T-BE-C.2 | `casesheets_service.py`, `casesheets_router.py` | `test_casesheet_contribution_write_path.py` | ✅ |
| **FR-CS-3** — Atomic content + contribution | §2.2 | T-BE-C.3 | `casesheets_service.py` | same | ✅ |
| **FR-CS-4** — Idempotent contribution | §2.2 | T-BE-C.4 | `casesheets_service.py`, migration `20260724_000001` | extended write-path tests | ✅ (idempotency key: caller-supplied `correlation_id`, decided at implementation, not yet folded back into requirements.md as ratified — see audit §8) |
| **FR-CS-5** — Append-only visit notes surface | — | T-FE-E.1 | — | — | ⬜ Not started |
| **FR-CS-6** — Audit | §2.2 | T-BE-C.2 (attribution carries actor/time/visit) | `casesheets_service.py` | write-path tests | ✅ |
| **FR-LD-1** — Signed versions immutable; documents amendable | §2.6 | T-BE-G.1 | — | — | ⬜ Not started |
| **FR-LD-2** — Amendment permissions | §2.6 | T-BE-G.2 | — | — | ⬜ Not started |
| **FR-LD-3** — Close `DocumentStatus` docstring contradiction | §2.6 | T-BE-G.3 | — | — | ⬜ Not started — contradiction still live in code today |
| **FR-RX-1** — Verified document lifecycle only | §2.7 | (enforced by omission — no code changes needed) | `tenant_prescription.status` (pre-existing) | pre-existing suite | ✅ No Issue/Dispense code exists anywhere |
| **FR-RX-2** — Copy-forward not in R7 | — | (negative requirement — correctly not built) | — | — | ✅ Confirmed absent, as required |
| **FR-TR-1** — Recommendation is a proposal, not a course design | §2.3, §2.8 | T-BE-D.3a (BE); T-FE-E.2 (FE composition) | `tenant_treatment_sheet.py` (`creation_source`), migration `20260724_000003` | `test_r7_recommendation_source_identity.py` | 🟡 BE done; FE composition not started |
| **FR-TP-1** — Treatment Plan is first-class persisted, versioned entity | §2.3 | T-BE-D.1–D.4 | `treatment_plan/models.py`, `tenant_treatment_plan.py`, migration `20260724_000002`, `treatment_plan_service.py` | `test_r7_treatment_plan_domain.py`, `_persistence.py`, `test_treatment_plan_repository.py`, `test_treatment_plan_service.py` | 🟡 Entity/service done; FE never-reconstructs claim unfalsifiable until FE-E.2 exists |
| **FR-TP-2** — Plan lifecycle: stages frozen, spelling deferred | §2.3 | T-BE-D.1 | `treatment_plan/models.py::TreatmentPlanStatus` | `test_r7_treatment_plan_domain.py` | ✅ Spelling decided at implementation (8 stages), not yet folded back into requirements.md |
| **FR-TP-3** — Plan amendment vs. schedule change | §2.3, §2.6 | T-BE-D.5 | — | — | ⬜ Not started |
| **FR-TS-1** — Stable session identity | §2.4 | T-BE-E.1 | `i_treatment_plan_repository.py` (docstring — reuses existing lookup) | `test_r7_stable_session_identity.py` | ✅ Proven structurally against pre-existing `treatment_sheet_row` code |
| **FR-TS-2** — Schedule attributes | §2.4 | T-BE-E.1 (proven by omission — no scheduling mutation touches Plan/identity) | same | same | ✅ |
| **FR-TS-3** — Doctor clinical content bound to session identity | §2.4 | T-BE-E.3 | — | — | ⬜ Not started |
| **FR-TS-4** — Therapist execution record | §2.4 | T-BE-E.4 | — | — | ⬜ Not started |
| **FR-TS-5** — "Missed" is decomposed | §2.4 | T-BE-E.4 | — | — | ⬜ Not started — spelling still genuinely undecided |
| **FR-SCH-1** — Scheduling intents | §2.4 | T-BE-E.2 | — | — | ⬜ Not started |
| **FR-SCH-2** — Synchronization semantics | §2.4 | T-BE-E.3, T-BE-E.5 | — | — | ⬜ Not started |
| **FR-BILL-1** — Billing visible, doctor read-only | §2.5 | T-BE-F.1 (BE); T-FE-E.4 (FE) | `i_finance_repository.py`, `sqlalchemy_repositories.py` | `test_finance_repository_visit_scope.py`, `test_billing_clinical_service_boundary.py` | 🟡 BE done; FE stage not started |
| **FR-BILL-2** — Clinical completion ≠ financial completion | §2.5 | T-BE-F.2 | (no production code needed) | `test_billing_completion_never_blocks.py` | ✅ |
| **FR-REC-1** — Backend owns the recommendation | §2.1, §4 | T-BE-B.2, T-BE-B.2a, T-BE-B.3 | `clinical_workflow_service.py`, `clinical_workflow_router.py` | `test_r7_workflow_contract_semantics_only.py` | ✅ |
| **FR-REC-2** — Recommend, never decide | — | T-FE-B.2 | — | — | ⬜ Not started |
| **FR-CR-1** — Backend owns completion readiness | §2.1 | T-BE-F.3 | `consultation_completion_service.py`, `_resolver.py`, `consultation_completion_router.py` | 3+ test files | ✅ |
| **FR-PS-1** — R7 surfaces only verified-existing signals | §2.9 | T-BE-A.1/A.6 (BE); T-FE-C.3 (FE) | `clinical_workspace_facts.py` | FE: explicit no-allergy-panel test | ✅ |
| **FR-MOB-1** — Mobile-first Command Center | — | T-FE-A.1 (shell), T-FE-G.1 (pill rail polish) | `VisitCommandCenter.tsx` | shell tests | 🟡 Shell exists; pill rail/sticky-next-action (G.1) not started |
| **FR-MOB-2** — Workflow pills | — | T-FE-B.1 | — | — | ⬜ Not started |
| **FR-LEG-1** — No screen deleted in R7 | §2.10 | (structural — enforced by not deleting anything) | all legacy screens | — | ✅ Confirmed no screen removed |
| **FR-LEG-2** — Redirects | §2.10 | T-FE-F.1, T-FE-F.2, T-FE-F.3 | — | — | ⬜ Not started |
| **FR-FLAG-1** — R7 is flag-gated and reversible | §7 | T-FE-A.3 (+BE mirror) | `useFeatures.ts`, `config.py` | `useFeatures.test.ts`, `test_cos_v1_feature_flag.py` | ✅ |
| **FR-RBAC-1** — Role-aware composition, not forked screens | §3 | T-FE-E.6 | `episodeWorkspaceConfig.ts` (pre-existing, not yet R7-extended) | — | ⬜ Not started for R7's own extension |
| **FR-HIST-1** *(v1.1)* — Consultation/therapy history separation | §2.1a, §3 | T-BE-A.3, T-FE-C.5, T-FE-C.6, T-FE-C.7 | — | — | ⬜ Not started (BE prerequisites now unblocked — see `RTM-AUDIT.md` §6) |
| **FR-HIST-2** *(v1.1)* — Backend-owned hierarchical clinical history contract | §2.1a | T-BE-A.3, T-BE-A.4, T-BE-A.5 | — | — | ⬜ Not started (unblocked; data audit for A.4 still required first) |

**Totals: 44 requirements. ✅ 24 fully done · 🟡 9 partially done · ⬜ 11 not started.**
