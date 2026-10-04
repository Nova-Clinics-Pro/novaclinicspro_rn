# R7 — Clinical Operating System · Tasks

**Version:** 1.2 — **APPROVED — implementation roadmap frozen (amended)**
**Approved:** 2026-07-17 · **Amended:** 2026-07-18 (owner-approved history-hierarchy amendment — [R7-HISTORY-HIERARCHY-AMENDMENT.md](R7-HISTORY-HIERARCHY-AMENDMENT.md)) · **Requirements version:** `requirements.md` v1.1 FROZEN · **Design version:** `design.md` v1.0 APPROVED (amended §2.1a/§3, version number unchanged per that document's own amendment note) · **Base commits recorded before this documentation commit:** BE `novaclinicspro-api` `dev` `8b23568` · FE `novaclinicspro_rn` `dev` `cd86021`.
**Implements (immutable, not reinterpreted):** [`requirements.md`](requirements.md) v1.1 FROZEN · [`design.md`](design.md) v1.0 APPROVED (amended) · [`requirements-traceability-matrix.md`](requirements-traceability-matrix.md) · R7-OWNER-RATIFICATION (amended, Decision 10) · R7-DESIGN-FREEZE-CHECKLIST (re-run for amended scope) · R7-GUIDED-CLINICAL-WORKSPACE-DESIGN · R7-TREATMENT-SCHEDULING-MODEL · R7-STATE-DEFINITIONS
**Baselines:** BE `novaclinicspro-api` `dev` `8b23568` · FE `novaclinicspro_rn` `dev` `cd86021`
**v1.1 amendment summary:** +7 tasks (T-BE-A.3/A.4/A.5, T-FE-C.5/C.6/C.7, T-Z.9), +2 requirements (FR-HIST-1/2), 70→77 total tasks, 42→44 total requirements. **No existing task renumbered.**
**2026-07-18 — ETX-4 resolved by owner decision** (not a requirements/design amendment — a task-level AC clarification): capability-loss policy frozen ([R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md](R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md)) and applied to `T-BE-B.1`/`T-BE-B.2`/`T-FE-E.6`'s existing acceptance criteria. **Task count unchanged at 77; no task ID, dependency, or scope changed.**
**2026-07-19 — Controlled Amendment: Group 0 sequencing correction** (not a requirements/design amendment — a documentation-only sequencing correction, see [R7-T-0.8-BLOCKED-BACKEND-DEPENDENCY.md](R7-T-0.8-BLOCKED-BACKEND-DEPENDENCY.md) for the Engineering Truth finding that prompted it): T-0.8 and T-0.9 were always declared **Blocked by T-BE-F.3 / T-BE-B.2** in this document (§Dependency & Parallelism Map, unchanged), but the former "GROUP 0" header text ("No feature work begins until complete") contradicted that declared dependency — a **task-plan sequencing contradiction**, not an architectural or requirements defect. Resolved by relabeling, not rewriting: "GROUP 0" is now **GROUP 0A** (T-0.1…T-0.7, independent frontend layering, no new backend contract required) followed by an explicitly authorized **Backend Contract Prerequisite Window** (T-BE-A.1, T-BE-B.1, T-BE-B.2, T-BE-F.1, T-BE-F.2, T-BE-F.3 — existing tasks, unchanged IDs/scope/dependencies) followed by **GROUP 0B** (T-0.8, T-0.9, unchanged). Final Group 0 / M1 requires all three; Group 0A completion alone does **not** satisfy M1 (see the Group 0 Final Gate and the amended M1 section below). **Task count unchanged at 77; no task ID, dependency, acceptance criterion, requirement mapping, or product scope changed** — see [R7-GROUP-0A-CLOSURE.md](R7-GROUP-0A-CLOSURE.md) for Group 0A's own closure evidence.

**Amendment control.** This plan is now frozen. Changing scope, task IDs, dependencies, acceptance criteria, milestones, or governance mechanisms requires a **controlled task-plan amendment** — its own reviewed, versioned change — not an inline edit. No task under this plan may reinterpret `requirements.md` or `design.md`.

> **Engineering Truth note (surfaced, not silently resolved).** `design.md`'s own header still reads *"Draft — not approved"* and *"tasks.md NOT authored — awaits ... approval."* Both are stale relative to this approval: `design.md` is a constitutional input this task is instructed not to modify, so its header was left untouched rather than edited to normalize wording — approval is recorded here instead, in `tasks.md`, where this task's authorization actually permits a status change. A future task should update `design.md`'s own header to match; that is not performed here.

**Governance (R4–R6 proven, mandatory):** one task at a time · per-group Standing Gate (Engineering-Truth → Product-Discovery; **STOP** on divergence) · **Task Isolation** (touch only declared files; no opportunistic cleanup) · never `git add .` · no commit/push/DB-write without explicit authorization · additive/reversible/flag-gated · **frozen once approved**.

**Every task is atomic · independently testable · reviewable · reversible · commitable.** Sizes S/M/L. **No calendar estimates.**

**Rollback vocabulary (owner-ratified — used precisely, never loosely):**
| Kind | Meaning |
|---|---|
| **Behavior** | feature flag · compatibility routing · UI rollback |
| **Migration** | *pre-adoption:* table may be dropped · *post-adoption:* disable behavior, **retain data**, provide compatibility |
| **Compatibility** | legacy route/adapter remains functional |
| **Data** | ⚠ **clinical history is NEVER destroyed.** Amendment chains, signed versions, contributions, audit history preserved. **"Data rollback" is never claimed for clinical records.** |

**Legend:** ✅ verified in code · **[VP]** verification point · **[ETX-n]** Engineering Truth Exception (requirements §19) · **∥** parallelizable.

---

# GROUP -1 — Engineering Truth · Design Validation · Environment
*(no feature code; output is verified knowledge)*

### T--1.1 · Branch & baseline gate
**Repo:** both · **Layer:** — · **Objective:** create R7 feature branch from approved `dev`; record base/HEAD/clean tree.
**Files:** git only · **Blocked by:** — · **Unblocks:** all · **∥ with:** T--1.2…T--1.6 · **Size:** S
**AC:** branch record present; clean at creation; `.claude/` never staged.
**ET:** confirm `dev` = `8b23568`(BE)/`cd86021`(FE). **Tests:** n/a. **Rollback:** *Behavior* — delete branch.
**Reqs:** FR-FLAG-1 · **Design:** §7 · **Decisions:** D8 · **Principles:** AC-6

### T--1.2 · ETX-1 — verify R7 permission codes ∥
**Repo:** BE · **Objective:** verify against `org_permissions`: `casesheet.write/finalise/sign/amend`, `prescription.write/sign/amend`, `treatment.recommend/schedule`, `session.execute`, `billing.view`, `invoice.write`, `payment.write`, `episode.close`, `visit.outcome`, `clinical_service.write`.
**Files:** trace doc · **Blocked by:** T--1.1 · **Unblocks:** BE-F, BE-G, FE-E.6 · **∥** · **Size:** M
**AC:** each code confirmed to **exist** or recorded as **must-be-seeded** with an owning task; **no requirement proceeds on an unverified code.**
**ET:** read-only inspection of `org_permissions` + `rbac_seed.py`. **Tests:** n/a. **Rollback:** n/a.
**Reqs:** FR-RBAC-1, FR-LD-2, FR-WFA-2, FR-BILL-1 · **ETX:** ETX-1

### T--1.3 · ETX-3 — verify appointment purpose / patient-stated concern ∥
**Repo:** BE · **Files:** trace doc · **Blocked by:** T--1.1 · **Unblocks:** BE-A, FE-C.1 · **∥** · **Size:** S
**AC:** existence proven/disproven. If absent → **Engineering Truth Finding** with two options (model additively = scope decision · render "not recorded"). **FR-VCC-2 must not fabricate.** **No redesign.**
**ET:** inspect `tenant_appointment` + appointment schemas. **Reqs:** FR-VCC-2, FR-WFA-1 · **ETX:** ETX-3
**Status [Reconciled 2026-10-03]: COMPLETE — IMPLEMENTED_AND_RECONCILED.** Verification commit `916406e0b1ae44095b3531f8287dca8d567837be`; authoritative evidence: `R7-APPOINTMENT-PURPOSE-VERIFICATION.md`, `R7-GROUP--1-CLOSURE.md`, and `RTM-MASTER.md`. Frozen disposition: purpose/concern absent → `null`/`not_recorded`; no semantic substitution.

### T--1.4 · ETX-5 — `tenant_visits.treatment_plan` disposition ∥
**Repo:** BE · **Objective:** decide final disposition of the **legacy narrative** free-text column ✅ (`treatment_plan: TEXT nullable`).
**Files:** trace doc · **Blocked by:** T--1.1 · **Unblocks:** BE-D · **∥** · **Size:** M
**AC:** (1) usage census. (2) disposition recommended: **retain as legacy narrative** *(default)* · migrate · deprecate. (3) **NOT silently merged with `tenant_treatment_plan`** (owner-directed). (4) naming-collision guard documented.
**ET:** grep readers/writers, both repos. **Reqs:** FR-TP-1 · **Design:** §2.3 · **ETX:** ETX-5

### T--1.5 · ETX-2 — audit null-`episode_id` case sheets ∥
**Repo:** BE · **Files:** trace doc · **Blocked by:** T--1.1 · **Unblocks:** BE-C · **∥** · **Size:** M
**AC:** count + classification recorded; **no nullability migration in R7**; audit precedes any future change.
**ET:** **read-only** shared-DB query (authorization required; no mutation). **Reqs:** FR-CS-1 · **ETX:** ETX-2

### T--1.6 · ETX-4 — capability-change-mid-episode behavior ∥
**Repo:** BE · **Files:** trace doc · **Blocked by:** T--1.1 · **Unblocks:** BE-B · **∥** · **Size:** S
**AC:** behavior specified; default **preserve records, hide future stages** (R5 entitlement-loss precedent ✅). Finding, not redesign. **Reqs:** FR-WFA-1 · **ETX:** ETX-4

### T--1.7 · Design-validation & environment gate
**Repo:** both · **Blocked by:** T--1.2…T--1.6 · **Unblocks:** Group 0 · **Size:** S
**AC:** internal consistency confirmed (44/44 coverage ✅); both suites green at baseline (BE 667 ✅). **Rollback:** n/a.

> **GATE:** Group 0 does not start until T--1.7 passes.

---

# GROUP 0A — Independent Architecture Remediation
*(Controlled amendment, 2026-07-19 — formerly "GROUP 0"; relabeled, not rewritten. See the 2026-07-19 amendment note above.)* Scope = **only R7-composed modules** (ED-ARCH-001 §migration-strategy — do not widen to a repo-wide refactor). **No FE composition task runs against a module until that module's Group-0A task is complete.**

**Group 0A exit criteria:** all seven tasks (T-0.1…T-0.7) complete · focused characterization suites green · no new layer violations introduced in touched modules · known unrelated test failures (e.g. `workspaceHeader.test.tsx`) remain explicitly baselined, never silently absorbed · T-0.8/T-0.9's own backend dependencies (T-BE-F.3, T-BE-B.2) documented, not bypassed. **Group 0A completion alone does not satisfy M1** — see the Backend Contract Prerequisite Window and GROUP 0B below, and the Group 0 Final Gate.

### T-0.1 · Characterization baseline ∥
**Repo:** FE · **Layer:** Test · **Objective:** lock current behavior before touching anything.
**Files:** extend `tests/features/doctorDashboard/consultationFlow.integration.test.tsx`, `workspaceProvider.test.tsx`, `caseSheetDualImplementation.characterization.test.tsx`, `prescriptionDualImplementation.characterization.test.tsx` ✅
**Blocked by:** T--1.7 · **Unblocks:** T-0.2…T-0.9 · **Size:** S
**AC:** baseline captured; all green. **Tests:** characterization. **Rollback:** *Behavior* — test-only.
**Reqs:** FR-COS-1 · **Design:** §5

### T-0.2 · ED-ARCH-001 — `PrescriptionModule` (**2 imports** ✅ + live `axiosClient.get` ✅)
**Repo:** FE · **Layer:** Presentation→Application · **Objective:** route transport through the feature's repository/hook; remove `axiosClient`+datasource imports.
**Files:** `features/episodes/presentation/components/ConsultationSections/PrescriptionModule.tsx` (+ its hook/repository)
**Blocked by:** T-0.1 · **Unblocks:** FE-E.2 · **∥ with:** T-0.3…T-0.7 · **Size:** M
**AC:** (1) zero `axiosClient`/datasource imports. (2) **behavior-preserving** — `prescriptionModule.test.tsx` ✅ green unchanged. (3) no new abstraction invented.
**ET:** confirm an existing hook/repository covers the call; if none → create one **in the correct layer**, not a workaround. **Tests:** unit · architecture (no presentation→transport import). **Rollback:** *Behavior* — revert.
**Reqs:** FR-COS-2, FR-RX-1 · **Design:** §2.7, §3 · **Debt:** ED-DEP-1 · **Principles:** P9, AC-2

### T-0.3 · ED-ARCH-001 — `CaseSheetModule` (1 ✅) ∥
**Repo:** FE · **Files:** `.../ConsultationSections/CaseSheetModule.tsx` · **Blocked by:** T-0.1 · **Unblocks:** FE-E.1 · **Size:** S
**AC:** zero violation imports; `caseSheetModule.test.tsx` ✅ green. **Rollback:** *Behavior* — revert. **Reqs:** FR-COS-2 · **Debt:** ED-DEP-1

### T-0.4 · ED-ARCH-001 — `TreatmentRecommendationModule` (1 ✅) ∥
**Repo:** FE · **Files:** `.../ConsultationSections/TreatmentRecommendationModule.tsx` · **Blocked by:** T-0.1 · **Unblocks:** FE-E.2 · **Size:** S
**AC:** zero violation imports; `treatmentRecommendationModule.test.tsx` ✅ green. **Rollback:** *Behavior* — revert. **Reqs:** FR-COS-2, FR-TR-1 · **Debt:** ED-DEP-1

### T-0.5 · ED-ARCH-001 — `ClinicalServicesModule` (1 ✅) ∥
**Repo:** FE · **Files:** `.../ConsultationSections/ClinicalServicesModule.tsx` · **Blocked by:** T-0.1 · **Unblocks:** FE-E.2 · **Size:** S
**AC:** zero violation imports; behavior preserved. **Rollback:** *Behavior* — revert. **Reqs:** FR-COS-2 · **Debt:** ED-DEP-1

### T-0.6 · ED-ARCH-001 — `useClinicalTimelineData` (1 ✅) ∥
**Repo:** FE · **Files:** `features/episodes/presentation/hooks/useClinicalTimelineData.ts` · **Blocked by:** T-0.1 · **Unblocks:** FE-C.4 · **Size:** S
**AC:** zero violation imports; `clinicalWorkspaceTimelineFlagSwitch.test.tsx` ✅ green. **Rollback:** *Behavior* — revert. **Reqs:** FR-COS-2 · **Debt:** ED-DEP-1

### T-0.7 · ED-ARCH-001 — `TreatmentSheetDetailScreen` (2 ✅) + `useTreatmentSheetRows` (1 ✅) ∥
**Repo:** FE · **Files:** `features/treatmentSheets/presentation/pages/TreatmentSheetDetailScreen.tsx`, `.../detail/useTreatmentSheetRows.ts` · **Blocked by:** T-0.1 · **Unblocks:** FE-E.2 · **Size:** M
**AC:** zero violation imports; existing treatment tests green. **Rollback:** *Behavior* — revert. **Reqs:** FR-COS-2, FR-TS-3 · **Debt:** ED-DEP-1

---

## Backend Contract Prerequisite Window
*(Controlled amendment, 2026-07-19. Authorized immediately after Group 0A closes, solely to satisfy GROUP 0B's already-declared dependencies below — not general authorization for backend Treatment Plan, Session, supersession, or any frontend composition work, all of which remain gated exactly as §Dependency & Parallelism Map already specifies.)*

The minimum backend work required to unblock T-0.8/T-0.9 is exactly the tasks already defined under **# BACKEND** below, with their existing IDs, scope, acceptance criteria and dependencies unchanged — this window does not redefine, rename, or reinterpret any of them:

| Task | Title | Unblocks (existing) |
|---|---|---|
| **T-BE-A.1** | Workspace facts snapshot (read model) | T-BE-A.2, T-BE-B.2 |
| **T-BE-B.1** | `clinical_workflow_resolver` — pure domain | T-BE-B.2 |
| **T-BE-B.2** | `clinical_workflow_service` + contract | **T-0.9**, T-FE-B.1, T-FE-D.1 |
| **T-BE-F.1** | Billing visibility read contract | T-BE-F.1a, T-FE-E.4 |
| **T-BE-F.1a** | Governed Visit-scoped invoice action contract | T-FE-E.4 |
| **T-BE-F.2** | Completion readiness — billing warning, never block | T-BE-F.3 |
| **T-BE-F.3** | Backend owns consultation summary + completion readiness | **T-0.8**, T-FE-F.2 |

See each task's full definition under its owning **BE Group A / BE Group B / BE Group F** section below. Parallel execution follows the already-approved dependency graph (§Dependency & Parallelism Map) unchanged — e.g. T-BE-F.2 also requires T-BE-B.2, per that task's own pre-existing "Blocked by" field.

> **Checkpoint 0A — Independent Layer Remediation Complete.** *Not a merge milestone; does not replace Gate OR-1.* Reached when Group 0A closes (see `R7-GROUP-0A-CLOSURE.md`). Its only effect is to authorize this Backend Contract Prerequisite Window to begin.

---

# GROUP 0B — Contract-Dependent Debt Removal
*(Controlled amendment, 2026-07-19 — formerly the tail of "GROUP 0"; relabeled, not rewritten. Unchanged task ID, scope, acceptance criteria, or dependency.)* Begins only after its relevant backend contract(s) in the window above exist.

**Group 0B exit criteria:** ED-ARCH-004 removed (T-0.8) · ED-ARCH-006 removed (T-0.9) · frontend renders backend workflow/completion semantics only · no `deriveSummary` clinical authority remains · no `buildSectionConfig` workflow authority remains · no frontend canonical clinical order remains · focused and architecture tests green.

### T-0.8 · **ED-ARCH-004** — retire `deriveSummary` from clinical decision-making
**Repo:** FE · **Layer:** Presentation · **Objective:** stop the frontend deriving the consultation summary/completion and **acting on it**.
**Files:** `features/episodes/presentation/pages/CompleteConsultationScreen.tsx` (1 import ✅ + `deriveSummary` ✅)
**Blocked by:** **T-BE-F.3** (backend owns summary+readiness) · **Unblocks:** T-FE-F.2 · **Size:** M
**AC:** (1) `deriveSummary` renders the backend contract — derives no clinical statement. (2) `treatmentSent = treatmentState !== 'DRAFT'` lifecycle duplication ✅ **removed**. (3) hardcoded template IDs `['nadi_pariksha','prakriti']` ✅ removed from presentation. (4) **absence never rendered as a negative finding** (`'Not saved'/'Not created'/'Not sent'` → backend states). (5) `transitionCasesheetStatusApi(...,{status:'FINAL'})` ✅ driven by contract, not local derivation.
**ET:** re-verify the violation before changing. **Tests:** unit · **architecture (no FE clinical derivation)** · regression (completion flow). **Rollback:** *Behavior* — flag `cos_v1` off restores the legacy screen (never deleted in R7).
**Reqs:** FR-COS-2, FR-CR-1 · **Design:** §2.9, §2.10, §3 · **Debt:** ED-DEP-2 · **Principles:** P1, P2, P3

### T-0.9 · **ED-ARCH-006** — remove frontend workflow assembly
**Repo:** FE · **Layer:** Application · **Objective:** delete `buildSectionConfig()`'s assembly + hardcoded canonical order + `isAyurvedaClinic` workflow gating ✅.
**Files:** `features/episodes/presentation/hooks/useConsultationWorkspace.ts`
**Blocked by:** **T-BE-B.2** (backend assembles) · **Unblocks:** FE-D · **Size:** M
**AC:** (1) no `activeSections` computed in FE. (2) no `isAyurvedaClinic` **workflow-presence** gating (labels only). (3) `SectionProgress` retained **only** as UI state — **never visit-level completion** (that is T-BE-F.3). (4) architecture test proves no FE assembly.
**ET:** verify no other consumer depends on `activeSections` before removal. **Tests:** unit · architecture · regression (`useConsultationWorkspace.test.tsx` ✅). **Rollback:** *Behavior* — flag off.
**Reqs:** FR-COS-2, FR-WFA-1 · **Design:** §3 · **Debt:** ED-DEP-3, ED-DEP-6 · **Principles:** P2, P3, P8

> **GATE:** no FE composition task runs against a module until that module's Group-0A task is complete.

> **GROUP 0 FINAL GATE** *(Controlled amendment, 2026-07-19)*: final Group 0 / M1 is **not** complete until Group 0A **+** the Backend Contract Prerequisite Window **+** GROUP 0B are **all** complete. Group 0A completion alone does **not** satisfy M1 and does **not** trigger Gate OR-1 — Checkpoint 0A (above) authorizes only the Backend Contract Prerequisite Window to begin, nothing more.

---

# BACKEND

## BE Group A — Clinical Workspace Aggregate
*(Approved: **one** purpose-specific aggregate; FE never assembles from multiple responses. It **composes existing authorities** — never a second lifecycle owner.)*

### T-BE-A.1 · Workspace facts snapshot (read model)
**Repo:** BE · **Layer:** Application · **Objective:** assemble `WorkspaceFactsSnapshot` via **repositories only** — patient/episode/visit context, document presence+status, treatment state (**reuse `treatment_lifecycle_resolver`** ✅), billing state, capabilities, permissions, purpose ([ETX-3]).
**Files:** `app/application/services/clinical_workspace_service.py`, `app/domain/services/i_clinical_workspace_service.py`, `app/application/factories/clinical_workspace_factory.py`
**Blocked by:** T-0 gate, T--1.3 · **Unblocks:** T-BE-A.2, T-BE-B.2 · **∥ with:** BE-C, BE-D · **Size:** M
**AC:** (1) **no DB/ORM in router; no business-data SQLAlchemy in service** (AC-1). (2) treatment stage from the existing resolver (**one answer**, P3). (3) platform-reference reads may use the documented `AsyncSession` exception ✅ (`capability_catalog_provider`); **business data via repositories**. (4) snapshot immutable.
**ET:** confirm every needed repo method exists; if absent → extend the **interface**, never bypass. **Tests:** unit (`AsyncMock(spec=...)` ✅) · architecture. **Rollback:** *Behavior* — additive, unreferenced.
**Reqs:** FR-VCC-3, FR-VCC-4, FR-PS-1 · **Design:** §2.1 · **Decisions:** D9 · **Principles:** P1, P2, P3, AC-1

### T-BE-A.2 · Aggregate read endpoint (thin router)
**Repo:** BE · **Layer:** Router · **Files:** `app/api/v1/routers/clinical_workspace_router.py`, `.../dependencies/services/clinical_workspace_dependencies.py`
**Blocked by:** T-BE-A.1 · **Unblocks:** T-FE-A.2 · **Size:** S
**AC:** (1) router parses/authz/calls service/translates — nothing else. (2) additive; **no existing contract changed** (AC-8). (3) follows verified `get_X_service → create_X_service(db) → IXService` convention ✅.
**Tests:** contract · integration · architecture. **Rollback:** *Behavior* — remove route.
**Reqs:** FR-VCC-1 · **Design:** §2.1, §4

### T-BE-A.3 · Encounter classification + hierarchical history projection *[amendment, v1.1, 2026-07-18 — FR-HIST-1/2]*
**Repo:** BE · **Layer:** Domain (classification, pure) + Application (projection) · **Objective:** classify each history item as `consultation`/`treatment_review`/`treatment_plan`/`legacy_treatment_sessions` from **verified existing signals** (`appointment_type`, `treatment_lifecycle_resolver`'s `NEEDS_CLINICAL_REVIEW`/`UNDER_CLINICAL_REVIEW`) — no new field; associate stable Sessions to Treatment Plans; return the `history_items[]` contract on the **same** `clinical_workspace_service.py`/`clinical_workspace_router.py` (§2.1a) — **not** a second aggregate.
**Files:** `app/application/services/clinical_workspace_service.py` (extend), `app/api/v1/routers/clinical_workspace_router.py` (extend), classification logic in domain layer (exact module TBD at implementation)
**Blocked by:** T-BE-A.1, **T-BE-D.4** (Treatment Plan service), **T-BE-E.1** (stable Session identity) · **Unblocks:** T-BE-A.4, T-FE-C.5 · **Size:** **L**
**AC (FR-HIST-1/2):** (1) the same therapy Session appears exactly once (no duplicate representation of a therapy appointment + its Session). (2) Plan association uses authoritative identifiers only — never date/name/proximity inference. (3) Treatment Review classifies distinctly from therapy execution. (4) history remains scoped to the active patient/Episode. (5) contract carries semantics only (AC-4) — reuses the existing contract-guard pattern (T-BE-B.3).
**ET:** re-verify `appointment_type` values and `treatment_lifecycle_resolver` states before coding — do not assume the T--1.4-era snapshot is still current.
**Tests:** unit (classification, no DB) · duplicate-representation test · contract test (no presentation fields). **Rollback:** *Behavior* — additive, unreferenced until wired.
**Reqs:** FR-HIST-1, FR-HIST-2 · **Design:** §2.1a · **Decisions:** D10 · **Principles:** P1, P2, P3, AC-1, AC-4, AC-5

### T-BE-A.3a · Add authoritative `occurred_at` to the Clinical History contract **[NEW, discovered during T-FE-C.5, 2026-07-26]**
**Repo:** BE · **Layer:** Domain (classification, pure) + Application (projection) + API (schema) · **Blocked by:** T-BE-A.3 (complete) · **Unblocks:** T-FE-C.5 · **Size:** S
**Objective:** `HistoryItemResponse` (`id`, `encounter_type`, `appointment_ids`, `plan_id`, `session_counts`) carried no timestamp — Engineering Truth during `T-FE-C.5`'s own pre-implementation report found this genuinely blocks any honest timeline rendering (Treatment Review items have no `appointment_ids` at all — `TenantTreatmentClinicalReview` carries no appointment/Visit link, verified against its ORM model — so no join-based date derivation is possible for them). Adds `occurred_at: datetime | None`, encounter-type-specific and always backend-resolved: consultation/legacy_treatment_sessions → the appointment's own `appointment_start`; treatment_plan → the Plan's own `created_at` (never a member appointment's date); treatment_review → the latest clinical review's own `created_at` (never fabricated — `None` only when genuinely unresolved).
**AC:** (1) every history item exposes `occurred_at`. (2) Treatment Review returns its own authoritative timestamp, not null-by-construction. (3) legitimately-unresolved cases return `null`, never a fabricated/guessed value. (4) no second history authority introduced — same `classify_history_items`/`ClinicalWorkspaceService.get_clinical_history`/`clinical_workspace_router.py` endpoint, additive field only. (5) no frontend code touched by this task.
**Tests:** unit (classifier `occurred_at` propagation per encounter type) · service (source resolution per type, including the ISO-string-to-`datetime` parse for reviews) · contract (semantics-only guard extended, `occurred_at` allow-listed, present on every serialized item).
**Rollback:** *Behavior* — additive nullable field only; no migration, no existing field removed or renamed.
**Reqs:** FR-HIST-1, FR-HIST-2 · **Design:** §2.1a (amends the contract this section describes)
**Status: COMPLETE.** Backend commit `8326f33` (`novaclinicspro-api`, `feature/r7-clinical-operating-system`). `T-FE-C.5` is now fully unblocked — it no longer needs to choose between fabricating a Treatment Review date or touching `T-FE-C.6`'s file.

### T-BE-A.3b · Enrich Clinical History Plan groups with Session details **[NEW, discovered during T-FE-C.7 closure, 2026-07-26]**
**Repo:** BE · **Layer:** Domain (classification, pure) + Application (projection) + Infrastructure (repository projection) + API (schema) · **Blocked by:** T-BE-A.3, T-BE-A.5, T-BE-A.3a (all complete) · **Unblocks:** T-FE-C.6a · **Size:** M
**Objective:** `HistoryItemResponse`'s `treatment_plan` items carry only `session_counts` (an aggregate) — FR-HIST-1's own AC7 (status-distinct Plans) and AC8/AC9 (individual Session identity, dates, therapist, instructions, outcomes) remain unsatisfied, a gap first reported during `T-FE-C.6`'s Engineering Truth and carried forward unresolved through `T-FE-C.7`. Adds `plan_status: str | None` (the Plan's own authoritative `TenantTreatmentPlan.status`, never derived from Treatment Sheet/session state) and `sessions: tuple[ClinicalHistorySessionResponse, ...]` (one entry per `TreatmentSheetRow` belonging to the Plan's member sheets) to `treatment_plan` items only.
**AC:** (1) `plan_status` is the Plan's own `status` column, never a Treatment Sheet lifecycle status or a derived value. (2) each Session exposes its stable identity (`TreatmentSheetRow.id`, never `session_id`/`day_number`/`appointment_id`). (3) Session scheduling uses the authoritative `scheduled_date`/`scheduled_time`/`scheduled_at` fields, null when unscheduled/PRN, never derived from Plan order or nearby appointments. (4) therapist is resolved through the existing staff repository's safe display-name projection (`coalesce(org_user.full_name, staff.full_name)`), never email/phone/auth id; a deleted/unavailable therapist is represented as `null`, not omitted. (5) doctor instructions surface the row's own `treatment_name`/`medicines_text`/`instructions_text`, never therapist-authored content. (6) execution state (`status`), execution occurrence (`completed_at`/`completed_by_staff_id`), and non-execution reason (`non_execution_reason_code`/`non_execution_reason_text`) remain three distinct fields — no single ambiguous `MISSED` value is introduced. (7) Sessions are ordered deterministically (`scheduled_date` ASC NULLS LAST, `scheduled_time` ASC NULLS LAST, then `id` — the existing `sqlalchemy_treatment_order_repository.py` scheduling-read convention), backend-owned; the frontend performs no sort. (8) legacy/unassociated Sessions are unaffected — this task only enriches items already classified `treatment_plan`. (9) no migration — every field is additive off already-persisted columns.
**Tests:** unit (classifier Session-shape propagation, ordering) · service (Plan-status/session projection resolution, therapist safe-display resolution incl. deleted-staff fallback) · contract (semantics-only guard extended — no presentation fields on the new Session shape) · scoping (tenant/patient/Episode/Plan) · legacy (no forced association, no backfill).
**Rollback:** *Behavior* — additive nullable fields only; no migration, no existing field removed or renamed.
**Reqs:** FR-HIST-1 (AC7, AC8, AC9) · **Design:** §2.1a, §2.3, §2.4 (amends the contract these sections describe) · **Decisions:** D10
**Status [Updated 2026-07-27]: COMPLETE.** Commit `186f11f` (`novaclinicspro-api`). All 9 AC items satisfied: `plan_status` sourced from `TenantTreatmentPlan.status` (already-fetched Plan dict, no second read); Session identity is `TreatmentSheetRow.id`; scheduling from `scheduled_date`/`scheduled_time`/`scheduled_at` (verified absent from the `list_by_treatment_sheet` projection and added there additively); therapist resolved via `TenantStaffRepository.get_by_id_with_org_user` (deleted staff → `null` name, Session still returned); doctor content from `treatment_name`/`medicines_text`/`instructions_text`; execution state/occurrence/non-execution-reason kept as 3 distinct fields; deterministic ordering (`scheduled_date`/`scheduled_time` ASC NULLS LAST, then `id`) proven by unit test; legacy items unaffected (proven by test); zero migration (`alembic heads`/`current` unchanged at `20260727_000001`). Full backend suite: 1970 passed / 1 known pre-existing failure / 13 skipped — no regressions.

### T-BE-A.4 · Legacy treatment-session classification *[amendment, v1.1]*
**Repo:** BE · **Layer:** Application · **Objective:** classify sessions with unreliable Plan association as `LEGACY_TREATMENT_SESSIONS` (or the smallest equivalent code, per convention) rather than inferring a grouping.
**Files:** same as T-BE-A.3 (extend)
**Blocked by:** T-BE-A.3, **the data audit** (§8/§16 of `R7-HISTORY-HIERARCHY-AMENDMENT.md` — Sheet-to-Plan cardinality, not yet performed) · **Unblocks:** T-FE-C.5 · **Size:** M
**AC:** (1) **no automatic backfill without a verified cardinality/data audit.** (2) unreliable association classifies explicitly, never silently merged into a Plan. (3) `treatment_sheet_row.treatment_sheet_id` (verified `NOT NULL`) is the only trusted anchor used — nothing weaker.
**ET:** the data audit itself (count Treatment Sheets per episode/recommendation across real tenant data) is a **prerequisite investigation**, not part of this task's code — if unperformed when this task starts, it blocks start, it is not skipped.
**Tests:** unit (classification fallback) · integration (ambiguous-cardinality case classifies as legacy, not guessed). **Rollback:** *Behavior*.
**Reqs:** FR-HIST-2 · **Design:** §2.1a · **Decisions:** D10

### T-BE-A.5 · Session-count correction (backend-derived, actual execution) *[amendment, v1.1]*
**Repo:** BE · **Layer:** Application · **Objective:** compute completed/scheduled/not-completed/cancelled counts from `treatment_sheet_row.status`/`completed_at` — **not** `session_date` presence (the verified-incorrect frontend formula this task replaces).
**Files:** same as T-BE-A.3 (extend)
**Blocked by:** T-BE-A.3 · **Unblocks:** T-FE-C.5 · **Size:** S
**AC:** (1) completed count reflects actual completion, not scheduling. (2) counts match `treatment_lifecycle_resolver`'s own state where overlapping — one answer, not two (DP-15).
**Tests:** unit — regression test proving the corrected formula disagrees with the old (scheduled-based) one on a mixed fixture. **Rollback:** *Behavior*.
**Reqs:** FR-HIST-2 AC3 · **Design:** §2.1a · **Debt:** ED-ARCH-007 (frontend session-count derivation this replaces — see ED-DEP-7)

### T-BE-A.6 · FR-VCC-3 "What changed" facts (backend-owned) *[amendment, v1.1, 2026-07-24 — FR-VCC-3]*
**Repo:** BE · **Layer:** Application · **Objective:** extend `WorkspaceFactsSnapshot`/`ClinicalWorkspaceService` so all eight FR-VCC-3 signals are explicit, backend-owned facts (last Visit date · latest Visit summary · active treatment sessions · completed session count · pending clinical review · current Prescription existence/status ✅ reused · active Episode ✅ reused · billing state ✅ reused) — closing the gap T-FE-C.2 found (only 3 of 8 had a verified field on the T-BE-A.1 snapshot). **New authority added:** `WhatChangedFacts` (previous-Visit + session-activity + pending-review), nested on the SAME `WorkspaceFactsSnapshot`/`WorkspaceFactsResponse`/`GET /clinic/{tenant_id}/clinical-workspace` — no second aggregate, no competing service.
**Files:** `app/domain/models/clinical_workspace_facts.py` (extend), `app/application/services/clinical_workspace_service.py` (extend), `app/api/v1/schemas/clinical_workspace.py` (extend), `app/domain/repositories/i_visit_repository.py` (+1 method), `app/infrastructure/repositories/sqlalchemy_repositories.py` (visit repo section, +1 method), focused tests.
**Blocked by:** T-BE-A.1 · **Unblocks:** T-FE-C.2 · **Size:** M
**AC:** (1) previous-Visit selection is deterministic (most recent by `visit_date`, tie-broken by `created_at`, for the same tenant+client+Episode, excluding the current Visit — no date-proximity/client-wide/frontend-sort shortcut). (2) Visit summary sourced from verified stored narrative only (`outcome_notes` — the same field already exposed for the current Visit's own outcome) — no generation, no diagnosis inference, no cross-record combination. (3) active/completed session counts come from `treatment_sheet_row.status` only (`IN_PROGRESS`/`COMPLETED`) — never `day_number`, scheduling, row existence, or document status — the same authority T-BE-A.5 independently designates for the history-hierarchy consumer; a later reconciliation should share one computation, not duplicate it. (4) pending-review is one explicit backend-owned mapping of `TreatmentLifecycleStatus.NEEDS_CLINICAL_REVIEW`/`UNDER_CLINICAL_REVIEW` — the frontend never reads the raw lifecycle string for this purpose. (5) additive/backward-compatible — every existing `WorkspaceFactsSnapshot(...)` construction (T-BE-A.1's own test fixtures) remains valid unchanged. (6) tenant/patient/Episode isolation and current-Visit exclusion proven by tests. (7) no schema migration, no new endpoint, no application-service SQLAlchemy query added.
**Tests:** unit (`AsyncMock(spec=...)` ✅, same convention as T-BE-A.1) · isolation (tenant/client/Episode scoping + current-Visit exclusion) · serialization (semantic states survive `WorkspaceFactsResponse`). **Rollback:** *Behavior* — additive, unreferenced until T-FE-C.2 consumes it.
**Reqs:** FR-VCC-3 · **Design:** §2.1, §4 · **Debt:** coordination note for T-BE-A.5 — both independently designate `treatment_sheet_row.status`/`completed_at` as the completed-session authority; a future pass should extract one shared computation rather than maintain two.

## BE Group B — Clinical Workflow Resolver & Service

### T-BE-B.1 · `clinical_workflow_resolver` — **pure domain**
**Repo:** BE · **Layer:** Domain (pure) · **Objective:** assemble workflow + derive recommendation/blocking/waiting-role/completion-readiness as a **pure function over immutable snapshots** (R4 `treatment_lifecycle_resolver`/R5 `capability_resolver` shape ✅).
**Files:** `app/domain/services/clinical_workflow_resolver.py`
**Blocked by:** T-0 gate, T--1.6 · **Unblocks:** T-BE-B.2 · **∥ with:** BE-A, BE-C, BE-D · **Size:** **L**
**AC:** (1) imports **nothing** from `app.infrastructure`/`app.api`/session/`app.localization` (AC-3 — the trap `capability_resolver` documents ✅). (2) **unit-testable with no DB.** (3) assembles GP · Ayurveda · Physio · follow-up · treatment-review · therapist journeys correctly. (4) **no fixed canonical order.** (5) capability-gated, **never** specialty-gated (AC-7). (6) inapplicable stages absent. (7) frozen dataclasses out.
**AC — capability-loss policy** *[clarification, ETX-4 owner-resolved, 2026-07-18 — [R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md](R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md)]*: (8) historical records (completed Plans/Sessions/signed documents) remain visible after capability loss. (9) new capability-dependent workflows (new Recommendation/Plan/Session beyond the authorized course) are **absent or blocked**, never silently offered. (10) already-scheduled active care (execute a scheduled Session, record actuals, complete planned review) **may continue** when capability is lost. (11) course **expansion** (additional Sessions beyond the authorized count, a replacement capability-dependent Plan) is **blocked**, distinct from continuation. (12) stop/discontinue remains available to an authorized clinician regardless of capability state. (13) the contract returns an explicit capability-unavailable reason (exact code TBD at implementation, per repository convention — not frozen here). (14) capability availability is a **pre-resolved input** to this module (AC-3 — never a direct catalog/entitlement read). (15) **no clinic-type inference** substitutes for capability (AC-7, restated). (16) **no frontend fallback** — absence of a backend answer is never locally derived.
**ET:** verify capability codes `appointments.multiday`/`appointments.sessions` ✅ and entitlement (`("ayurveda","physio")` ✅). **Tests:** **unit, no DB** (per journey) · architecture (import audit) · **capability-loss unit tests (AC 8–16), one per policy rule.** **Rollback:** *Behavior* — additive.
**Reqs:** FR-WFA-1, FR-WFA-2, FR-REC-1, FR-CR-1 · **Design:** §2.1 · **Decisions:** D9 · **Principles:** P2, P3, P8, AC-3 · **ETX:** ETX-4 resolved

### T-BE-B.2 · `clinical_workflow_service` + contract
**Repo:** BE · **Layer:** Application+Router · **Files:** `app/application/services/clinical_workflow_service.py` (+ router/dependencies/factory)
**Blocked by:** T-BE-A.1, T-BE-B.1 · **Unblocks:** **T-0.9**, T-FE-B.1, T-FE-D.1 · **Size:** M
**AC:** contract returns `recommended_action · reason · blocking_factors[] · waiting_role · completion_readiness{} · stages[] · alternatives[]`.
**AC — capability assembly** *[clarification, ETX-4 owner-resolved, 2026-07-18]*: the service assembles, via existing repositories/`capability_resolver` (reuse, not rebuild) — entitlement, effective availability, effective-enabled state, active-record context (does an in-flight Plan/Session already exist for this action), and the action class (read / continue / expand / stop / create) — and passes this to `clinical_workflow_resolver` as part of its immutable snapshot.
**Tests:** unit (mocked) · contract · integration. **Rollback:** *Behavior* — additive endpoint.
**Reqs:** FR-WFA-1/2, FR-REC-1 · **Design:** §2.1, §4 · **ETX:** ETX-4 resolved

### T-BE-B.2a · Expose Clinical Workflow semantic contract *[amendment, v1.1, 2026-07-24 — sequencing]*
**Repo:** BE · **Layer:** Router / API contract · **Objective:** expose the existing `ClinicalWorkflowResolution` (T-BE-B.1/T-BE-B.2) through one thin, tenant-scoped read endpoint — closing the gap T-BE-B.3 found: its own guard target ("the API contract") does not yet exist, because T-BE-B.2 deliberately stopped at the service layer (its own architecture tests assert zero router/schema files for `clinical_workflow`, by design, not oversight). Reuses `create_clinical_workflow_service`/`IClinicalWorkflowService`/`ClinicalWorkflowService`/`resolve_clinical_workflow` unchanged — no second resolver, service, or facts assembler.
**Files:** `app/api/v1/schemas/clinical_workflow.py`, `app/api/v1/dependencies/services/clinical_workflow_dependencies.py`, `app/api/v1/routers/clinical_workflow_router.py`, `app/main.py` (registration only), focused tests.
**Blocked by:** T-BE-B.2 · **Unblocks:** T-BE-B.3, T-FE-B.1, T-FE-D.1 · **Size:** S
**AC:** (1) router parses/authorizes/calls `IClinicalWorkflowService`/translates response — nothing else; never calls `resolve_clinical_workflow` or a repository directly. (2) **one** aggregate endpoint only — no per-field endpoint for stages/recommendation/alternatives/blockers/capability-loss/handoff. (3) response maps `ClinicalWorkflowResolution` without reinterpretation — only its existing fields, no invented ones. (4) no presentation field (colour/icon/layout/route/component/button styling/translated label), no `confidence`, no diagnosis/treatment-selection logic. (5) tenant/context isolation matches the existing `clinical_workspace_router.py` convention — `WorkspaceContextError` maps consistently, cross-tenant/cross-patient rejected, no alternative Visit/Appointment inferred. (6) T-BE-B.2's existing "no router/schema" architecture-test assertions are updated only to the extent necessary to stop asserting an absence this task now separately, explicitly authorizes — their historical intent (T-BE-B.2 itself added no router) is preserved, not weakened.
**Tests:** unit/contract (router) · serialization · tenant/context isolation · architecture (no repository/resolver-direct/SQLAlchemy access in router). **Rollback:** *Behavior* — additive endpoint, unreferenced until a frontend task consumes it.
**Reqs:** FR-WFA-1/2, FR-REC-1 · **Design:** §2.1, §4 · **Debt:** none — closes the T-BE-B.3 sequencing gap this amendment's own investigation found.

### T-BE-B.3 · **Semantics-only contract guard**
**Repo:** BE · **Layer:** Contract test · **Files:** `tests/test_r7_workflow_contract_semantics_only.py`
**Blocked by:** T-BE-B.2, **T-BE-B.2a** · **Unblocks:** T-FE-B.1 · **Size:** S
**AC:** fails if any colour/icon/layout/UI-label field appears; state codes carry **localization keys** ✅.
**Tests:** contract. **Rollback:** *Behavior* — test-only. **Reqs:** FR-REC-1 · **Design:** §4 · **Principles:** AC-4

## BE Group C — Case Sheet (F-1)

### T-BE-C.1 · Episode find-or-create
**Repo:** BE · **Layer:** Application · **Files:** `app/application/services/casesheets_service.py`
**Blocked by:** T-0 gate, T--1.5 · **Unblocks:** T-BE-C.2, T-FE-E.1 · **∥ with:** BE-A, BE-B, BE-D · **Size:** M
**AC:** (1) V2 **reuses** the Episode's sheet. (2) a second sheet never created for an Episode. (3) null-`episode_id` legacy sheets handled gracefully ([ETX-2]); **no nullability migration**.
**ET:** re-verify `episode_id` immutability on update ✅. **Tests:** unit · integration (dup-guard) · regression. **Rollback:** *Behavior* — revert; **Data:** ⚠ none — read/create only.
**Reqs:** FR-CS-1 · **Design:** §2.2 · **Decisions:** D1 · **Principles:** P4

### T-BE-C.2 · **Current-Visit attribution** (F-1 fix)
**Repo:** BE · **Layer:** Application · **Objective:** resolve attribution from an explicit, backend-validated **current visit context** — never from `casesheet.appointment_id` ✅.
**Files:** `casesheets_service.py`, `casesheets_router.py` (additive input), `i_casesheet_repository.py` if needed
**Blocked by:** T-BE-C.1 · **Unblocks:** T-BE-C.3 · **Size:** M
**AC (FR-CS-2):** (1) V1→V1. (2) **V2→V2.** (3) V2 never attributed to V1. (4) V3 appends without altering V1/V2. (5) other-**Episode** rejected. (6) other-**patient** rejected. (7) other-**tenant** rejected. (12) `appointment_id` = **creation provenance only**, never read for attribution.
**Transport [VP]:** route param · request field · server-resolved context — per existing API conventions; **business rule frozen.**
**ET:** re-verify defect; confirm `visit_repo` on UoW ✅. **Tests:** unit (N-visit attribution) · integration (each rejection) · regression. **Rollback:** *Behavior* — revert; **Data:** ⚠ **existing historical contributions NOT rewritten** (AC 11) — forward-only; **clinical history never destroyed**.
**Reqs:** FR-CS-2, FR-CS-6 · **Design:** §2.2 · **Decisions:** D1, F-1 · **Principles:** P4, P5

### T-BE-C.3 · **Atomicity** — remove the permissive guard
**Repo:** BE · **Layer:** Application · **Files:** `casesheets_service.py`
**Blocked by:** T-BE-C.2 · **Unblocks:** T-BE-C.4 · **Size:** **S** *(subtractive)*
**AC:** (8) unresolved Visit → **explicit failure**, nothing persisted. (9) no content update survives a missing required contribution.
**ET (verified):** UoW exposes `commit()`/`rollback()` and holds both `casesheet_contribution_repo` ✅ and `visit_repo` ✅ on one session; contribution create **already inside the transaction** ✅. **This task removes the `if visit:` guard** (today: *"no contribution row is inserted; the content update still succeeds"* ✅). **No transactional machinery built** — if implementation finds otherwise, raise an **ET Finding**, do not redesign.
**Tests:** unit · **integration with failure injection → neither persists** · regression. **Rollback:** *Behavior* — revert; **Data:** ⚠ none.
**Reqs:** FR-CS-3 · **Design:** §2.2 · **Decisions:** F-1 · **Principles:** P5

### T-BE-C.4 · **Idempotency** [VP]
**Repo:** BE · **Layer:** Application · **Files:** `casesheets_service.py` (+ repository/constraint if the chosen key needs it)
**Blocked by:** T-BE-C.3 · **Unblocks:** T-FE-E.1 · **Size:** M
**AC:** (10) retry → exactly one contribution.
**ET (owner-directed — decide, don't assume):** evaluate (case sheet + visit + authoring operation) · explicit contribution id · mutation/request id. **Must check** the legitimate case of **two distinct contributions by the same staff in the same visit** before adopting a natural key (design §2.2e).
**Tests:** unit · integration (duplicate submit; retry-after-timeout) · **migration test if a constraint is added**. **Rollback:** *Behavior* — revert; **Migration** (only if constraint added): *pre-adoption* drop; *post-adoption* disable enforcement, **retain data**.
**Reqs:** FR-CS-4 · **Design:** §2.2 · **Decisions:** F-1

## BE Group D — Treatment Plan
*(Entity name approved: **`tenant_treatment_plan`**. `tenant_visits.treatment_plan` is **legacy narrative only** — never silently merged; disposition from T--1.4.)*

### T-BE-D.1 · Domain object + repository interface
**Repo:** BE · **Layer:** Domain · **Files:** `app/domain/treatment_plan/models.py`, `app/domain/repositories/i_treatment_plan_repository.py`
**Blocked by:** T-0 gate, T--1.4 · **Unblocks:** T-BE-D.2 · **∥ with:** BE-A, BE-B, BE-C · **Size:** M
**AC:** (1) pure domain (AC-3). (2) **no committed dates** (FR-TP-1). (3) status = **smallest additive** enum for the frozen stages; ⚠ **`TreatmentLifecycleStatus` NOT reused** without semantic-fit proof (verified: execution statuses, not Plan lifecycle ✅).
**ET:** re-verify no Plan entity exists ✅ (`app/domain/treatment_plan/` = `SyncResult` only ✅). **Tests:** unit (domain invariants). **Rollback:** *Behavior* — additive.
**Reqs:** FR-TP-1, FR-TP-2 · **Design:** §2.3 · **Principles:** P1, AC-3

### T-BE-D.2 · `tenant_treatment_plan` — ORM model + **additive migration**
**Repo:** BE · **Layer:** Infrastructure · **Files:** `app/infrastructure/db/models/tenant_treatment_plan.py`, `.../migrations/versions/<rev>_r7_treatment_plan.py`, models `__init__.py`
**Blocked by:** T-BE-D.1 · **Unblocks:** T-BE-D.3 · **Size:** **L**
**AC:** (1) **additive only** — no existing table altered (AC-8). (2) `tenant_` prefix (tenant-owned ✅). (3) single alembic head. (4) empty at creation. (5) `downgrade()` drops cleanly. (6) **`tenant_visits.treatment_plan` untouched.**
**ET:** verify current head before revising. **Tests:** structural · **migration up/down on disposable Postgres (NOT Supabase)** ✅ (R6 T-A.1 precedent) · single-head. **Rollback:** **Migration — *pre-adoption:* drop the table** (no data, nothing altered); ***post-adoption:* flag off, RETAIN data, provide compatibility.** ⚠ **Data: once plans exist they are clinical records — never destroyed.**
**Reqs:** FR-TP-1 · **Design:** §2.3 · **Decisions:** Treatment Plan

### T-BE-D.3 · Repository impl + UoW registration
**Repo:** BE · **Layer:** Infrastructure · **Files:** `.../repositories/sqlalchemy_treatment_plan_repository.py`, `app/infrastructure/uow/sqlalchemy_uow.py`
**Blocked by:** T-BE-D.2 · **Unblocks:** T-BE-D.3a · **Size:** M
**AC:** implements interface; registered on UoW alongside existing repos ✅; returns DTO/dict (no ORM leakage upward).
**Tests:** unit · integration (disposable Postgres). **Rollback:** *Behavior* — revert. **Reqs:** FR-TP-1 · **Principles:** AC-1

### T-BE-D.3a · Persist Recommendation source discriminator and one-Plan invariant
**Repo:** BE · **Layer:** Infrastructure · **Files:** `app/domain/common/enums.py` (`TreatmentSheetCreationSource`), `app/infrastructure/db/models/tenant_treatment_sheet.py`, `app/infrastructure/db/migrations/versions/<rev>_r7_recommendation_source_identity.py`, `app/domain/repositories/i_treatment_sheet_repository.py`, `app/infrastructure/repositories/sqlalchemy_treatment_sheet_repository.py`, `app/domain/repositories/i_treatment_order_repository.py`, `app/infrastructure/repositories/sqlalchemy_treatment_order_repository.py`, `app/domain/repositories/i_treatment_plan_repository.py`, `app/infrastructure/repositories/sqlalchemy_treatment_plan_repository.py`, `app/application/services/treatment_sheets_service.py`, `app/application/treatment_plan/create_treatment_sheet_use_case.py`
**Blocked by:** T-BE-D.3 · **Unblocks:** T-BE-D.4 · **Size:** M
**AC:** (1) additive `creation_source` column (`RECOMMENDATION`/`DIRECT`/`NULL`-legacy-unknown) on `tenant_treatment_sheets`, CHECK-constrained, no server default. (2) every live sheet-creation path sets it explicitly — verified: `create_treatment_recommendation` → RECOMMENDATION; `create_treatment_sheet`/`create_simple_treatment_sheet`/legacy `CreateOrUpdateTreatmentSheetUseCase` → DIRECT. (3) no lifecycle-transition repository method (send-to-scheduling, schedule, start, complete, cancel) ever assigns it. (4) `get_eligible_recommendation_source` repository lookup validates tenant/patient/episode/`creation_source=RECOMMENDATION`/eligible state (`ORDERED`/`SCHEDULED`/`IN_PROGRESS`/`COMPLETED`; `DRAFT`/`CANCELLED` ineligible) — never infers source type from state. (5) DB-enforced one-Plan-per-Recommendation: partial unique index `(tenant_id, originating_recommendation_id) WHERE originating_recommendation_id IS NOT NULL` on `tenant_treatment_plans`, plus `ITreatmentPlanRepository.get_by_originating_recommendation_id` for the application-level check-before-insert half. (6) legacy rows never backfilled/inferred.
**ET:** verified `tenant_treatment_proposals` removed pre-R7 (`20260228_130000`); verified `is_order`/`state=ORDERED` reachable via two independent live endpoints (recommendation-creation and direct send-to-scheduling), making lifecycle state alone unreliable provenance — see Decision 11 (`R7-OWNER-RATIFICATION.md`). **Tests:** structural (migration DDL, vocabulary) · unit (mocked, every creation path + immutability via source inspection) · concurrency (disposable Postgres, one-Plan constraint under simulated concurrent insert). **Rollback:** *Migration* — drop index/constraint/column (additive, no data loss; table expected empty outside disposable verification, confirmed not assumed).
**Reqs:** FR-TR-1 · **Design:** §2.3, §2.8 · **Decisions:** R7 Treatment Recommendation source identity (Decision 11)

### T-BE-D.4 · Plan service — Recommendation → Plan
**Repo:** BE · **Layer:** Application · **Files:** `app/application/services/treatment_plan_service.py` (+ router/dependencies/factory)
**Blocked by:** T-BE-D.3, T-BE-D.3a, T--1.2 · **Unblocks:** T-BE-D.5, BE-E, T-FE-E.2 · **Size:** M
**AC:** (1) Recommendation → **one** approved Plan (FR-TR-1 AC1), via T-BE-D.3a's `get_eligible_recommendation_source` + one-Plan invariant. (2) Plan persists **independently of scheduling** (FR-TP-1 AC2). (3) rescheduling never changes the Plan (AC3).
**Tests:** unit (mocked) · integration · contract. **Rollback:** *Behavior*. **Reqs:** FR-TP-1, FR-TR-1 · **Design:** §2.3, §2.8

### T-BE-D.5 · Plan versioning/supersession + four-operation distinction
**Repo:** BE · **Layer:** Application · **Objective:** clinical-intent change → new version; **schedule-only change → no new version.**
**Blocked by:** T-BE-D.4, T-BE-G.1 · **Unblocks:** T-BE-E.4 · **Size:** **L**
**AC:** (12) clinical amendment versioned/superseded. (13) **schedule-only → NO new Plan version.** (a/b/c/d) four operations distinct: intent · logistics · unexecuted-instruction edit · execution correction. Amendment preserves executed sessions; defines effect on future unexecuted ones.
**Tests:** unit (each op) · integration · regression. **Rollback:** *Behavior* — flag; **Data:** ⚠ **amendment chains + superseded versions PRESERVED — never destroyed.**
**Reqs:** FR-TP-3, FR-LD-1 · **Design:** §2.3, §2.6 · **Principles:** P6

## BE Group E — Sessions · Scheduling · Content · Execution

### T-BE-E.1 · Stable session identity
**Repo:** BE · **Layer:** Application+Infrastructure · **Blocked by:** T-BE-D.4 · **Unblocks:** T-BE-E.2 · **Size:** M
**AC:** (4) sessions link to Plan. (5) identity survives date/time/therapist/room change. (10) sessions added without recreating existing ones. (11) reducing the course deletes **no** historical/executed sessions. **"Regenerate from schedule" not implemented as a concept.** `day_number` ✅ = display-order only, **never identity** (retirement not R7).
**ET (verified):** `treatment_sheet_row` already has `session_id`/`session_date`/`assigned_staff_id`/`status`/`completed_at`/`completed_by_staff_id` ✅. **Tests:** unit · integration (reschedule preserves identity) · regression. **Rollback:** *Behavior*; **Data:** ⚠ sessions are clinical records — never destroyed.
**Reqs:** FR-TS-1, FR-TS-2 · **Design:** §2.4 · **Principles:** P1

### T-BE-E.2 · Scheduling intents
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-E.1 · **Unblocks:** T-BE-E.3, T-FE-E.2 · **Size:** M
**AC:** (8) consecutive **and** non-sequential. (9) review-dependent supported. **PRN pre-creates no dates.** review-dependent schedules only to the milestone. **Capability-gated, never specialty-gated** (AC-7).
**Tests:** unit (each intent) · integration. **Rollback:** *Behavior*. **Reqs:** FR-SCH-1 · **Design:** §2.4 · **Principles:** P8

### T-BE-E.2a · Expose scheduling-intent proposal contract **[NEW — backend-closure audit, 2026-07-25]**
**Repo:** BE · **Layer:** Router · **Blocked by:** T-BE-E.2 (complete) · **Unblocks:** T-FE-E.2 · **Size:** S
**Objective:** `TreatmentPlanService.resolve_scheduling_proposal` (T-BE-E.2, commit `c496c86`, 9 intents, 48 tests) is Application-layer only — no router, no OpenAPI operation, no internal caller. `T-FE-E.2`'s AC requires composing Scheduling, which needs proposed dates for an intent before `schedule_treatment_row`/`bulk_schedule_treatment_rows` (already exposed on `treatment_orders_router`) can persist them. Without this task, `T-FE-E.2` cannot obtain a proposal without either an endpoint or reimplementing intent-resolution logic client-side (a layer-integrity risk this project's CLAUDE.md forbids).
**AC:** a thin router endpoint (natural home: `treatment_orders_router.py`, alongside `schedule_treatment_row`) exposes `resolve_scheduling_proposal` read-only — no new business logic, no new persistence. Capability-gated identically to the existing scheduling endpoints.
**Tests:** contract/unit for the new endpoint · regression (existing 48 service-level tests unaffected).
**Rollback:** *Behavior* — additive endpoint only.
**Reqs:** FR-SCH-1 · **Design:** §2.4
**Status [Updated 2026-07-25, T-BE-E.2a closure]: COMPLETE.** `GET /treatment-sheets/plans/{plan_id}/scheduling-proposal` on `treatment_orders_router.py`, gated by `treatment_order.schedule`. Pure passthrough of `SessionDateProposal` (no recomputation, no new scheduling authority) — verified: router does not import `parse_scheduling_intent`/`resolve_session_dates`. The DI factory (`get_treatment_plan_service`) did not exist before this task; added, reusing `create_treatment_plan_service`/`SchedulingCapabilityGateAdapter` verbatim. 12 new tests, all passing. Commit `882dfa6`. Unblocks `T-FE-E.2`.

### T-BE-E.3 · Doctor clinical content bound to session identity **[COMPLETE — verified 2026-07-27, previously mislabeled Not Started]**
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-E.2 · **Unblocks:** T-BE-E.4, T-FE-E.2 · **Size:** M
**AC:** (6) **doctor instructions survive rescheduling** — by construction. reschedule/cancel/miss/add never delete, regenerate, detach or silently remap content. content attaches to identity, not date.
**Tests:** unit · **integration: reschedule → content intact** · regression. **Rollback:** *Behavior*; **Data:** ⚠ content is clinical — never destroyed. **Reqs:** FR-TS-3, FR-SCH-2 · **Design:** §2.4
**Status [Corrected 2026-07-27]: COMPLETE.** Commit `9497f13` (2026-07-25) — predates this correction by two days; every subsequent RTM/task-status document (through this session's own prior reports) cited this task as "Not Started" without re-verifying against `git log`, an Engineering Truth failure this correction fixes. The row-update path (`sqlalchemy_treatment_sheet_repository.py`) now rejects Session-identity fields (`id`/`session_id`/`treatment_sheet_id`/`episode_id`) and therapist-execution fields instead of silently applying them via a blanket `setattr` loop — AC6 ("survives rescheduling by construction") is structurally guaranteed, not caller-discipline-dependent. 58 tests (`test_r7_doctor_content_bound_to_session.py`): content untouched by schedule/unschedule/bulk-schedule/start, no row recreation, identity never reassigned, every protected field refused (including smuggled alongside legitimate content), COMPLETED rows immutable. No migration, no new router. FR-SCH-2's card previously cited commit `f9614d7` as "(T-BE-E.3)" evidence — that commit is actually T-BE-E.5's (its own message references T-BE-E.3's guard as pre-existing, confirming `9497f13` predates it); corrected below.
**Separately verified, NOT part of this task's own AC:** FR-TS-3's "Adoption requirement" (author-once-apply-to-many UI) remains genuinely unbuilt on the frontend (`SessionInstructionsModule.tsx` is single-select only) — but this is not a T-BE-E.3 gap. The backend primitive it needs already exists and is reachable: a tenant-scoped bulk endpoint, `bulk_update_treatment_sheet_rows_by_tenant` (`PATCH /api/v1/clinic/{tenant_id}/treatment-sheets/{treatment_sheet_id}/rows`, confirmed via direct OpenAPI schema inspection — `getattr` shows both this and a non-tenant-scoped sibling registered), delegates to the same `treatment_sheets_service.py::bulk_update_rows` → repository `bulk_update`, so T-BE-E.3's protected-field guard applies identically. The frontend's existing `updateAllTreatmentSheetRowsApi` call (`treatmentSheets.api.ts`) matches this route exactly — **initial suspicion of a route-mismatch defect here was investigated and disproven**; no backend fix is needed. One separate, minor, non-blocking observation: this tenant-scoped variant is gated by `Depends(get_tenant_user_context)` (tenant match only) rather than `Depends(require_permission("treatment_sheet.update"))` like its sibling — a narrower RBAC gap, not reported as blocking, not investigated further this session (out of scope). The sole remaining gap for FR-TS-3's Adoption requirement is purely frontend: `SessionInstructionsModule` needs multi-select + a call to the already-working bulk endpoint. Not implemented this session — out of this task's authorized scope (stop-branch: T-BE-E.3 proven complete, so no implementation was authorized).

### T-BE-E.4 · Therapist execution (append-only) + `Missed` decomposition
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-E.3 · **Unblocks:** T-FE-E.3 · **Size:** M
**AC:** (7) actuals stay attached to the executed session. execution history **append-only/audit-controlled**; a reschedule **never** overwrites it. `Missed` = **schedule state + execution outcome + structured reason** — **no single ambiguous `MISSED`**; spelling **[VP]**.
**ET:** verify existing session/actuals surface (structural to date). **Tests:** unit · integration (reschedule after execution) · regression. **Rollback:** *Behavior*; **Data:** ⚠ execution history never destroyed.
**Reqs:** FR-TS-4, FR-TS-5 · **Design:** §2.4 · **Principles:** P6

### T-BE-E.4a · Expose Session non-execution outcome contract **[NEW — backend-closure audit, 2026-07-25]**
**Repo:** BE · **Layer:** Router · **Blocked by:** T-BE-E.4 (application-complete, commits `ccf56d8`/`1529b47`) · **Unblocks:** T-FE-E.3 · **Size:** S
**Objective:** `TreatmentSheetsService.record_session_non_execution` is implemented, migrated to shared dev (`20260726_000001`), and tested (44 tests), but has zero transport exposure — no router, no OpenAPI operation. `T-FE-E.3`'s own AC requires composing the `Missed` label "from the **three** backend facts, never a single ambiguous state" — the third fact (the structured reason) is unreachable without this task.
**AC:** a router endpoint (natural home: `treatment_sheets_router.py`, alongside the existing `complete_treatment_sheet_row`/`get_therapist_assigned_row` row-level therapist endpoints) accepts `reason_code` (closed vocabulary: `PATIENT_NO_SHOW`/`PATIENT_CANCELLED`/`CLINIC_CANCELLED`/`CLINICAL_HOLD`/`OTHER`) and optional `reason_text`, calling the existing service method unmodified. No new business logic.
**Tests:** contract/unit for the new endpoint · regression (existing 44 service-level tests unaffected).
**Rollback:** *Behavior* — additive endpoint only.
**Reqs:** FR-TS-4, FR-TS-5 · **Design:** §2.4
**Status [Updated 2026-07-25, T-BE-E.4a closure]: COMPLETE.** `POST /treatment-sheets/rows/{row_id}/non-execution` on `treatment_sheets_router.py`, gated by `treatment_sheet.complete` (reused, not invented). `recorded_by_staff_id` derived from JWT, matching the `completed_by_staff_id` convention. Two prerequisite gaps discovered and closed: (1) `record_session_non_execution` was missing from `ITreatmentSheetsService` entirely — added, since the router can only depend on the interface; (2) `SQLAlchemyTreatmentSheetRowRepository._to_dict` never exposed the two T-BE-E.4 migration columns — the response would have always read back `None` even after a successful write; fixed the same way the identical `appointment_id` gap (T-BE-A.3) was fixed. One exact-set guard test updated deliberately (widened, not weakened) for the new keys. 17 new tests, all passing. Commit `a0aa4c3`. Unblocks `T-FE-E.3`.

### T-BE-E.5 · Session concurrency (OCC) ∥ with T-BE-E.4
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-E.3 · **Size:** S
**AC:** doctor-authoring vs admin-rescheduling → conflict surfaces reload/keep; **never silent clobber.** reuses verified `version`/If-Match (R5 ✅)/`document_version` ✅.
**Tests:** unit · integration (concurrent write). **Rollback:** *Behavior*. **Reqs:** FR-SCH-2 · **Design:** §2.4
**Status [Updated 2026-07-25, backend-closure audit]:** **Accepted, with a documented compatibility amendment** (commits `f9614d7`, `93e9b8d`). OCC is fully implemented and enforced whenever `If-Match` is supplied. The header was made unconditionally mandatory on first landing without a router-change stop, an audit gap this closure task caught; corrected to staged-optional (Decision B) after verifying the mobile client sends no `If-Match` and `T-FE-E.5` has not started. A follow-up task must make the header mandatory once `T-FE-E.5` ships.

## BE Group F — Billing · Completion Readiness · Recommendation

### T-BE-F.1 · Billing visibility read contract ∥
**Repo:** BE · **Layer:** Application+Router · **Objective:** compose the **verified existing spine** — `TenantClinicalService.visit_id`(`nullable=False` ✅) → `TenantInvoiceLine.clinical_service_id` ✅ → invoice → payment.
**Blocked by:** T-0 gate, T--1.2 · **Unblocks:** T-BE-F.1a, T-FE-E.4 · **∥ with:** BE-C, BE-D, BE-E · **Size:** M
**AC:** returns consultation charges · clinical services · therapy/session charges · medicines · consumables · procedures · invoice status · payment status · outstanding. **read-only; no new billing write path in R7.** capability-gated.
**Tests:** unit · contract · integration. **Rollback:** *Behavior* — additive read. **Reqs:** FR-BILL-1 · **Design:** §2.5 · **Decisions:** D6 · **Principles:** P8

### T-BE-F.1a · Governed Visit-scoped invoice action contract
**Repo:** BE · **Layer:** Application+Router+RBAC · **Status:** COMPLETE [Reconciled 2026-10-03] · **Unblocks:** T-FE-E.4 · **Size:** M
**AC:** (1) R7 invoice creation accepts `appointment_id` as context only. (2) Backend resolves authenticated tenant → appointment → client → active Visit and validates tenant/client/appointment/Visit ownership. (3) Clinical-service references, where present, belong to that tenant and resolved Visit. (4) Backend requires effective `billing.invoicing` **and** `invoice.create`; frontend is never the authorization boundary. (5) Default seeded grants: Admin and Receptionist/Front Desk receive `invoice.create`/`invoice.update`/`invoice.collect_payment`; Doctor receives none by default. (6) Cross-tenant/IDOR and invalid context are atomically rejected. (7) Reuses compatible generic billing behavior; no competing invoice-create route.
**Tests:** unit · integration · security/IDOR · seed-composition. **Rollback:** *Behavior* — disable the new governed workspace invocation; retain existing compatible generic billing flow. **Reqs:** FR-BILL-1, FR-BILL-2, FR-CR-1, FR-RBAC-1, FR-WFA-2 · **Design:** §2.5 · **Decisions:** D6, D9 · **Principles:** P1, P2, P8 · **Owner decision:** `R7-BILLING-ACTIONABILITY-RATIFICATION.md`
**Completion evidence [Reconciled 2026-10-03]:** backend commit `e2ee6600001b407aef98f48232cd5eace2526f46` on `reconciliation/r7-cos-dev-be`; gate `VISIT_SCOPED_INVOICE_ACTION_CLEAN`; 88 passed / 0 failed / 0 skipped. Migration `20261003_000001` follows `20261002_000003` with one Alembic head. `ET-MIG-001` remains OPEN; this evidence does not claim clean empty-database replay. `ED-R7-DB-001` was corrected as an ORM metadata-only foreign-key target repair (`org_staff.id` → `tenant_staff.id`), with no migration.

### T-BE-F.2 · Completion readiness — billing warning, never block
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-F.1, T-BE-B.2 · **Unblocks:** T-BE-F.3 · **Size:** S
**AC:** unbilled → **warning**; completion succeeds. **no hard block hard-coded**; blocking tenant policy is explicit config **[VP]**. open therapy sessions **coexist** with consultation completion.
**Tests:** unit · integration. **Rollback:** *Behavior*. **Reqs:** FR-BILL-2, FR-CR-1 · **Design:** §2.5 · **Decisions:** D6

### T-BE-F.3 · **Backend owns consultation summary + completion readiness**
**Repo:** BE · **Layer:** Application · **Objective:** the single backend answer to *"can this visit be completed?"* + the summary the FE derives today ✅.
**Blocked by:** T-BE-F.2 · **Unblocks:** **T-0.8**, T-FE-F.2 · **Size:** M
**AC:** (1) **exactly one** answer (DP-15). (2) outstanding-mandatory + optional-suggested + warnings returned. (3) explicit states (**never absence-as-negative**). (4) replaces every clinical statement `deriveSummary` ✅ computes.
**Tests:** unit · contract · integration. **Rollback:** *Behavior* — additive; FE falls back to flag-off legacy screen.
**Reqs:** FR-CR-1, FR-COS-2 · **Design:** §2.1 · **Debt:** ED-DEP-2 · **Principles:** P1, P2, P3

## BE Group G — Living Documents · Supersession · Compatibility · Rollback

### T-BE-G.1 · Supersession representation [VP — ownership clarified by Decision 13]
**Repo:** BE · **Layer:** Infrastructure+Domain · **Objective:** domain-owned complete immutable signed-version representation plus content-free, strict-linear lineage (predecessor/successor, audit metadata, derived currentness). See `R7-OWNER-RATIFICATION.md` Decision 13; Case Sheet/Prescription/Plan only, not Treatment Sheet/session execution.
**Blocked by:** T-0 gate, T--1.2 · **Unblocks:** T-BE-D.5, T-BE-G.2 · **Size:** **L**
**AC:** (1) a `SIGNED` version is **never mutated.** (2) a superseded version is **retained**, renderable **exactly as signed**, visibly marked. (3) never deleted by ordinary editing. (4) additive schema.
**ET:** verify `document_version` ✅ semantics before extending; **do not overload** an existing enum (ED-ARCH-002 lesson). **Tests:** unit · **migration up/down (disposable Postgres)** · integration (immutability of signed version). **Rollback:** **Migration — *pre-adoption:* drop additive structures; *post-adoption:* disable amendment via flag, RETAIN data, provide compatibility.** ⚠ **Data: amendment chains, signed versions, audit history PRESERVED — clinical history NEVER destroyed. No data rollback is claimed.**
**Reqs:** FR-LD-1 · **Design:** §2.6 · **Decisions:** D2 · **Principles:** P6

### T-BE-G.2 · Amendment service + permissions **[COMPLETE, 2026-10-03]**
**Repo:** BE · **Layer:** Application · **Blocked by:** T-BE-G.1, T--1.2 · **Unblocks:** T-FE-E.5 · **Size:** M
**AC:** amendment requires a distinct permission ([ETX-1]); rejection is **service-layer** (not UI hiding); follows draft/final/sign lifecycle.
**Tests:** unit · integration (unpermitted amend rejected). **Rollback:** *Behavior*; **Data:** ⚠ preserved. **Reqs:** FR-LD-2 · **Design:** §2.6
**Status [Updated 2026-10-03]: COMPLETE.** Decision 14's source-document lifecycle (`SIGNED → AMEND → DRAFT → FINAL → SIGN → SIGNED V(n+1)`) is implemented by backend commit `f6faf98081461ea1afdaba9662c014cd472cfdb0` on `reconciliation/r7-cos-dev-be`: Case Sheet and Prescription acceptance 30/30 each; final executable regression GREEN; architecture clean; four essential G2 tests tracked for CI; no G2 migration or remaining blocker. Closure included canonical writer enforcement, amend+sign composition, V2+ initial-sign and signed-history disposal protections, and the Prescription immutable-field ordering fix. `G1_B2_RUNTIME_CONCURRENCY_DEFERRED_REQUIRES_ISOLATED_DB` remains separately OPEN as pre-release evidence debt (no impact on G2 implementation completion; release evidence affected).

### T-BE-G.3 · Close the `DocumentStatus` docstring contradiction
**Repo:** BE · **Layer:** Docs · **Blocked by:** T-BE-G.1 · **Size:** S
**AC:** docstring (*"FINAL: Locked… SIGNED: Immutable, terminal"* ✅) matches the ratified supersession model. **docs only — no behavior change.**
**Tests:** n/a. **Rollback:** *Behavior* — revert docstring. **Reqs:** FR-LD-3 · **Design:** §2.6
**Status [Updated 2026-10-03]: COMPLETE.** Backend commit `2edca9b5405ff84206c18bffeef31c961a3475c6` on `reconciliation/r7-cos-dev-be` resolves a `DOCSTRING_ONLY_CONTRADICTION`; 15 focused Living Document tests passed. Behavior, schema, and migrations remain unchanged.

---

# FRONTEND
*(Every FE task is **render-only**. No FE task may derive clinical meaning — FR-COS-2.)*

## FE Group A — Workspace shell

### T-FE-A.1 · `VisitCommandCenter` shell on the **existing** route
**Repo:** FE · **Layer:** Presentation · **Files:** `features/episodes/presentation/pages/VisitCommandCenter.tsx`, `app/clinic-admin/episodes/[episodeId]/workspace.tsx` ✅ (wire only)
**Blocked by:** T-0 gate · **Unblocks:** FE-B, FE-C · **∥ with:** all BE groups · **Size:** M
**AC:** (1) **no new workspace route** (FR-COS-1 AC1). (2) flag `cos_v1` **off ⇒ today's behavior exactly.** (3) reuses `WorkspaceProvider` ✅ — context scoping **not weakened.** (4) invalid context → explicit "cannot open workspace" (W30).
**ET:** confirm `WorkspaceProvider`'s appointment-scoped visit lookup ✅ before reuse. **Tests:** unit · integration (flag on/off parity) · regression. **Rollback:** *Behavior* — flag off; **Compatibility:** legacy workspace untouched.
**Reqs:** FR-COS-1, FR-VCC-1 · **Design:** §3 · **Principles:** P9
**Status [Updated 2026-10-03]: COMPLETE.** `ALREADY_IMPLEMENTED`: original implementation commit `1b53f3fd` is in current branch ancestry; 36 focused tests passed and the presentation architecture is clean. No implementation change was required during reconciliation.

### T-FE-A.2 · Workspace data hook (application layer)
**Repo:** FE · **Layer:** Application · **Blocked by:** T-FE-A.1, T-BE-A.2 · **Unblocks:** FE-C · **Size:** S
**AC:** canonical query key + invalidation; **presentation never touches a datasource** (AC-2); reuses verified freshness discipline ✅ (no forced remounts).
**Tests:** unit · architecture · integration (invalidation). **Rollback:** *Behavior*. **Reqs:** FR-COS-1 · **Design:** §3
**Status [Updated 2026-10-03]: COMPLETE.** Production implementation is `ALREADY_IMPLEMENTED` from commit `1d799ba2`; current reconciliation added focused canonical-key invalidation evidence. Query key/invalidation, presentation datasource isolation, and freshness/no-forced-remount checks PASS; 23 focused tests PASS; `APPLICATION_ARCHITECTURE_CLEAN`.

### T-FE-A.3 · Feature flag `cos_v1` ∥
**Repo:** FE (+BE mirror) · **Layer:** Core · **Files:** `core/hooks/useFeatures.ts` ✅ (+ `app/core/config.py` ✅ if a BE gate is needed)
**Blocked by:** T-0 gate · **Unblocks:** T-FE-A.1 · **Size:** S
**AC:** mirrors the verified mechanism exactly (`isFreshnessV1Enabled`/`isClinicalSpineV1Enabled` ✅; `freshness_v1_enabled`/`clinical_spine_v1_enabled` ✅). **one umbrella flag**; reuse existing route flags.
**Tests:** flag-switch. **Rollback:** *Behavior* — flag off ⇒ **no data effect.** **Reqs:** FR-FLAG-1 · **Principles:** AC-6
**Status [Updated 2026-10-03]: COMPLETE.** `ALREADY_IMPLEMENTED` from commit `3df98d04`; current verification: 50 focused tests PASS. `cos_v1` is the single umbrella flag: OFF preserves the legacy workspace; ON selects `VisitCommandCenter` on the same route. `FEATURE_FLAG_ARCHITECTURE_CLEAN`; no production or test change was required.

## FE Group B — Workflow rendering

### T-FE-B.1 · `WorkflowPills` (render-only)
**Repo:** FE · **Layer:** Presentation · **Blocked by:** T-FE-A.2, **T-BE-B.2**, T-BE-B.3 · **Unblocks:** FE-D · **Size:** M
**AC:** 🟢completed 🟡current ⚪pending 🔵waiting-on-role (**owner named**) 🔴blocked ⚫n/a. **renders backend stages; assembles nothing.** never colour-alone (icon+text). grey only where useful.
**Tests:** unit (each state) · architecture (no assembly) · a11y. **Rollback:** *Behavior* — flag. **Reqs:** FR-MOB-2, FR-WFA-2 · **Principles:** P2, P9
**Status [Updated 2026-10-03]: COMPLETE.** `ALREADY_IMPLEMENTED` from commit `6e667d155b7c8caac6a28d50071ab828395519b8`; current evidence: 61 focused frontend tests PASS and 125 required backend dependency tests PASS. `WORKFLOW_PILLS_RENDER_ONLY_CLEAN`: backend stages render without frontend workflow assembly/derivation; localized icon+text and accessible semantic presentation verified. No production or test change was required. T-BE-B.2/T-BE-B.3 remain separately `DEPENDENCY_IMPLEMENTED_NOT_RECONCILED`.

### T-FE-B.2 · `NextActionBar` + deviation menu (render-only)
**Repo:** FE · **Layer:** Presentation · **Blocked by:** T-FE-B.1 · **Unblocks:** FE-D · **Size:** M
**AC:** renders `recommended_action · reason · blocking_factors · waiting_role`; `[Do this]` + **`[Something else ▾]` always present**; deviation ≤1 tap; **no forced sequencing**; **FE computes no recommendation.**
**Tests:** unit · architecture · a11y. **Rollback:** *Behavior*. **Reqs:** FR-REC-2, FR-COS-2 · **Decisions:** D7 · **Principles:** P7
**Status [Updated 2026-10-03]: COMPLETE.** Prior classification `PARTIALLY_IMPLEMENTED`; historical implementation `acfa730a00b76162d0491861d6186f6c0d897b6b`. `T_FE_B2_COMPLETE`: added the always-present disabled/non-navigating primary control when backend semantics lack an executable frontend target. `NEXT_ACTION_RENDER_ONLY_CLEAN`: backend owns recommendation and alternatives; frontend only localizes and maps authoritative action codes to existing navigation. 88 focused tests PASS; VisitCommandCenter 16/16 PASS; no new route or frontend workflow/recommendation/permission/readiness derivation.

## FE Group C — Visit Command Center regions

### T-FE-C.1 · "Why today" ∥
**Repo:** FE · **Blocked by:** T-FE-A.2, T--1.3 · **Size:** S
**AC:** purpose+concern rendered when present; absent → **"not recorded"**; **never inferred** ([ETX-3]). **Tests:** unit · empty-state. **Rollback:** *Behavior*. **Reqs:** FR-VCC-2
**Status [Reconciled 2026-10-03]: COMPLETE — ALREADY_IMPLEMENTED.** Original implementation commit `e329ab5d5418a4af56180ea1c168c0c9506288f5`; `WHY_TODAY_BACKEND_TRUTH_CLEAN`. Focused acceptance evidence: `whyTodaySection.test.tsx` 8/8 PASS; governed aggregate regression `clinicalWorkspaceDataHook.test.tsx` 20/20 PASS.

### T-FE-C.2 · "What changed" (R7 scope) ∥
**Repo:** FE · **Blocked by:** T-FE-A.2, T-BE-A.1, **T-BE-A.6** · **Size:** M
**AC:** **only** the 8 R7 signals; **no measurement deltas** ([R8]); deltas computed backend-side. **Tests:** unit · integration. **Rollback:** *Behavior*. **Reqs:** FR-VCC-3

### T-FE-C.3 · "Before you act" (R7 scope) ∥
**Repo:** FE · **Blocked by:** T-FE-A.2, T-BE-A.1 · **Size:** S
**AC:** **only** verified signals (pending review · Rx status · episode · session progress). **no allergy/interaction/renal/hepatic panel.** **never render an unbacked safety field** — the FE `allergies` field ✅ (ED-ARCH-003) **must not** be surfaced (false clinical negative).
**Tests:** unit · **test asserting no allergy/renal panel renders.** **Rollback:** *Behavior*. **Reqs:** FR-VCC-4, FR-PS-1 · **Decisions:** F-2 · **Debt:** ED-DEP-4

### T-FE-C.4 · History/timeline panel ∥
**Repo:** FE · **Blocked by:** T-0.6 · **Size:** S
**AC:** reuses `ClinicalTimeline` ✅; virtualized; **default-filtered to the active episode** (no cross-episode leak). **Tests:** unit · integration. **Rollback:** *Behavior*. **Reqs:** FR-VCC-1

### T-FE-C.5 · Consume backend history hierarchy (replace flat assembly) *[amendment, v1.1, 2026-07-18 — FR-HIST-1/2]*
**Repo:** FE · **Layer:** Application · **Objective:** `useClinicalTimelineData` stops assembling five independent flat queries and consumes §2.1a's `history_items[]` contract; **removes** the local `completedSessionCount` computation (ED-ARCH-007).
**Files:** `features/episodes/presentation/hooks/useClinicalTimelineData.ts`
**Blocked by:** T-FE-C.4, **T-BE-A.3, T-BE-A.4, T-BE-A.5** (hard dependency — no interim frontend reconstruction, D9) · **Unblocks:** T-FE-C.6 · **Size:** M
**AC:** (1) **zero** local encounter classification. (2) **zero** local session/count aggregation. (3) `presentation never touches a datasource` held (AC-2) — this task is application-layer only. (4) architecture test extends the `T-0.8`/`T-0.9` "no FE clinical derivation" pattern to this file specifically.
**ET:** re-verify the hook's current five-query assembly before removing it — do not assume T--1's-era snapshot is unchanged.
**Tests:** unit · architecture (no FE aggregation) · regression. **Rollback:** *Behavior* — flag; legacy flat assembly remains available behind the flag until this task is proven.
**Reqs:** FR-HIST-1, FR-HIST-2 · **Design:** §3 · **Debt:** ED-ARCH-007, ED-DEP-7 · **Decisions:** D10 · **Principles:** P1, P2, P3, P9
**Status [Updated 2026-07-26]: COMPLETE.** Commit `cedee6cc` (`novaclinicspro_rn`). `useClinicalTimelineData.ts` now consumes `T-BE-A.3/A.3a`'s `GET /clinic/{tenant_id}/clinical-workspace/history` exclusively — all five retired queries removed, zero local classification/aggregation/sort (proven by source-level architecture tests). **Deviation from this card's own Rollback note, by explicit owner instruction this turn:** no flag-gated dual path was built — the old five-query assembly was removed outright, not kept behind a flag, since the shipping instruction explicitly forbade retaining a fallback. Rollback for this task is therefore `git revert`, not a flag flip. `title`/`route` in `ClinicalTimelineItem` are populated by a minimal presentation adapter (static localized label per `encounter_type`; route only for `consultation`/`legacy_treatment_sessions`, since no Treatment Plan/Review detail screen exists yet) — richer hierarchy rendering remains `T-FE-C.6`'s own scope, not started here.

### T-FE-C.6 · Collapsible Treatment Plan groups + consultation/review/therapy distinction *[amendment, v1.1]*
**Repo:** FE · **Layer:** Presentation · **Objective:** render `history_items[]` as a hierarchy — top-level consultations/treatment-reviews, collapsible Treatment Plan groups, expanded Session detail, explicit `LEGACY_TREATMENT_SESSIONS` label.
**Files:** `features/episodes/presentation/components/ClinicalTimeline.tsx`
**Blocked by:** T-FE-C.5 · **Unblocks:** T-FE-C.7, T-Z.9 · **Size:** M
**AC:** (1) consultations/treatment-reviews top-level, never nested. (2) therapy sessions never render as independent top-level items. (3) each Plan group independently collapsible; collapse/expand is **local UI state only**. (4) multiple Plans, and completed/stopped/superseded Plans, remain visible and distinct. (5) status never colour-alone — icon + text (extends the file's already-theme-compliant `useClinicTheme()` pattern, verified T--1.1). (6) legacy group rendered with an explicit "Plan association unavailable" label, never silently merged.
**Tests:** unit (per hierarchy shape) · a11y (icon+text, not colour-alone) · regression. **Rollback:** *Behavior* — flag.
**Reqs:** FR-HIST-1 · **Design:** §3 · **Decisions:** D10 · **Principles:** P9
**Status [Updated 2026-07-26]: COMPLETE.** Commit `71e9f44d` (`novaclinicspro_rn`). All 6 frozen AC items satisfied: (1)/(2) consultation/review remain top-level, no local re-nesting. (3) `treatment_plan` rows individually collapsible, local `useState<Set<string>>` only. (4) every Plan the backend returns renders, never locally filtered (literal "remain visible" clause; see Engineering Truth note below for the stronger "distinct by status" clause). (5) expanded content (`session_counts`) rendered icon+text, never colour-alone. (6) `legacy_treatment_sessions` gets an explicit "Plan association unavailable" label. **Engineering Truth discovered gap (reported, not fabricated around):** `HistoryItemResponse` has no `sessions[]` array and no Plan `status` field — design.md's own contract description names both, neither exists live. Expanding a Plan can only reveal the real `session_counts` aggregate, never per-session detail or a status label. This leaves FR-HIST-1's own AC7 (status-distinct Plans) and AC8/AC9 (individual Session identity/dates/therapist/outcome) unsatisfied at the requirement level — would need a `T-BE-A.3a`-style backend amendment, not yet requested.

### T-FE-C.7 · Mobile hierarchy behaviour *[amendment, v1.1]*
**Repo:** FE · **Blocked by:** T-FE-C.6 · **Size:** S
**AC:** (1) collapse/expand touch target ≥44pt (FR-MOB-1 AC1 pattern). (2) hierarchy is **not flattened** on mobile — Plan grouping preserved, not degraded to a flat list for space. (3) no dot-only status representation (FR-MOB-1 AC2).
**Tests:** unit · responsive. **Rollback:** *Behavior*.
**Reqs:** FR-HIST-1 AC17 · **Design:** §3 · **Decisions:** D10
**Status [Updated 2026-07-26]: COMPLETE.** Commit `3315d08d` (`novaclinicspro_rn`). Engineering Truth found only one genuine gap among the 3 frozen AC items: (1) the collapse/expand touch target had no explicit minimum, sized only by content — fixed with `minHeight: sizes.touchTarget` (the governed 44pt token), no raw literal. (2)/(3) were already true by construction and needed proof, not code: no viewport-conditional rendering exists anywhere in `ClinicalTimeline.tsx` (so Plan grouping can never be flattened on a smaller screen), and every status-bearing element already renders icon+text, never a bare colour-only dot. No new backend field was required for this task's own AC — the still-open `sessions[]`/Plan-`status` gap reported under `T-FE-C.6` remains a separate, unresolved requirement-level blocker for FR-HIST-1's AC7/AC8/AC9, not this task's own scope.

### T-FE-C.6a · Render enriched Plan and Session hierarchy **[NEW, discovered during T-FE-C.7 closure, 2026-07-26]**
**Repo:** FE · **Layer:** Presentation · **Objective:** consume `T-BE-A.3b`'s `plan_status`/`sessions[]` fields inside the same `ClinicalTimeline.tsx`/`useClinicalTimelineData.ts` pair — render backend-authoritative Plan status and per-Session identity/scheduling/therapist/instructions/execution facts. No second history surface, no new route.
**Files:** `features/episodes/data/models/clinicalWorkspace.dtos.ts`, `features/episodes/presentation/hooks/useClinicalTimelineData.ts`, `features/episodes/presentation/components/ClinicalTimeline.tsx`, `core/localization/translations/{en-US,hi-IN}.json`
**Blocked by:** T-BE-A.3b, T-FE-C.5, T-FE-C.6, T-FE-C.7 · **Unblocks:** none (closes the FR-HIST-1 chain) · **Size:** M
**AC:** (1) `plan_status` rendered as text/icon (never colour-alone), with a localized honest fallback when `null`. (2) each expanded Plan renders one row per backend `sessions[]` entry, showing only verified facts (date/time, therapist, doctor instructions, execution state/outcome, non-execution reason) with field-specific localized "unavailable" states, never one vague generic message. (3) backend Session order preserved — no local sort. (4) zero frontend Plan-status/execution-status/Session-count derivation, zero appointment/Treatment-Sheet/staff joins — reuses the existing architecture-guard test pattern. (5) T-FE-C.7's mobile behaviour preserved (≥44pt targets, hierarchy never flattened, no dot-only status) for the new Session child rows too. (6) read-only — no editable doctor/therapist forms, no scheduling/execution actions from Clinical History.
**Tests:** contract (Plan status/Session fields/order preserved one-to-one, nullable fields preserved) · rendering (multiple Plan groups, completed/stopped/superseded Plans visible, Session children incl. unscheduled/missing-therapist/structured non-execution reason, legacy group unaffected) · architecture (zero classification/aggregation/join, no datasource/axios in Presentation) · regression (`T-FE-C.4`–`T-FE-C.7`, `VisitCommandCenter`, `ClinicalWorkspace`, Case Sheet composition, WorkflowPills, NextActionBar, design-token/architecture guards).
**Rollback:** *Behavior* — `git revert`, consistent with `T-FE-C.5`'s own no-flag precedent.
**Reqs:** FR-HIST-1 (AC7, AC8, AC9) · **Design:** §3 (amends the `ClinicalTimeline`/`useClinicalTimelineData` description) · **Decisions:** D10
**Status [Updated 2026-07-27]: COMPLETE.** Commit `3a4afd71` (`novaclinicspro_rn`). All 6 AC items satisfied: `plan_status` rendered as text with icon, honest `clinicalTimeline.planStatusUnavailable` fallback when null; each expanded Plan renders one read-only `SessionRow` per backend Session with field-specific "unavailable" states (date/therapist/instructions) and distinct execution-state/non-execution-reason text; backend order preserved (no `.sort()`); zero classification/aggregation/join (proven by source-level architecture tests); T-FE-C.7 mobile behaviour preserved; Session rows carry no `onPress` (proven by test). Full frontend suite: 996 passed / 9 known pre-existing failures — identical to baseline, no regressions. `npx tsc --noEmit`: 31 errors, identical to baseline, zero in touched files.

## FE Group D — Dynamic workflow rendering

### T-FE-D.1 · Render the assembled workflow (post-`buildSectionConfig` removal)
**Repo:** FE · **Layer:** Presentation · **Blocked by:** **T-0.9**, T-FE-B.1, T-FE-B.2 · **Unblocks:** FE-E · **Size:** M
**AC:** stages come **only** from the backend; GP shows no therapy stages **because the capability is absent**, not clinic name; blocked stage shows reason + fix affordance (W18); read-only role sees content, actions hidden (W19/W26).
**Tests:** unit (per journey) · architecture (no FE assembly) · regression. **Rollback:** *Behavior* — flag. **Reqs:** FR-WFA-1/2, FR-COS-2 · **Principles:** P2, P8

## FE Group E — Module composition
*(each blocked by its module's Group-0 remediation)*

### T-FE-E.1 · Compose Case Sheet + append-only visit notes · **[UMBRELLA — split 2026-07-25]**
**Repo:** FE · **Blocked by:** **T-0.3**, T-BE-C.4 · **Size:** M
**AC:** opens the **Episode's** sheet (never a second); prior visits' notes **visibly retained** with author+timestamp, never overwritten; supplies the explicit current-visit context (T-BE-C.2 transport).
**Tests:** unit · integration (multi-visit) · regression. **Rollback:** *Behavior*. **Reqs:** FR-CS-1, FR-CS-5
**Status [Updated 2026-07-26]: COMPLETE.** All three split units (`T-FE-E.1a`, `T-BE-E.1a`, `T-FE-E.1b`) are complete — see each unit's own Status line. FR-CS-1 (single Episode-owned Case Sheet, never a second), FR-CS-2's frontend half (explicit current-Visit `appointment_id` transport), and FR-CS-5 (prior Visit contributions visibly retained, read-only, with author+timestamp) are all satisfied end-to-end.

### T-FE-E.1a · Compose Episode Case Sheet + supply current-Visit attribution **[NEW, split from T-FE-E.1, 2026-07-25]**
**Repo:** FE · **Layer:** Presentation · **Blocked by:** **T-0.3**, T-BE-C.4 · **Unblocks:** (none — parallel with `T-BE-E.1a`) · **Size:** S
**Scope:** Compose the existing `CaseSheetModule` inside `VisitCommandCenter`, using the Episode-scoped Case Sheet already present in `WorkspaceProvider`. Send the current `appointment_id` on Case Sheet updates so the backend resolves and records the actual current Visit contribution (the transport already exists — `CaseSheetUpdateRequest.appointment_id`, T-BE-C.2 — the frontend update DTO/call simply never populated it).
**AC:** (1) opens the Episode's existing Case Sheet. (2) never creates a second Case Sheet for the same Episode. (3) update payload includes the explicit current `appointment_id`. (4) uses existing hooks, DTOs, routes and module — no duplicate form/datasource/query/repository/route. (5) backend remains untouched.
**Tests:** unit (composition, Episode ownership, current-Visit transport) · architecture (no datasource/axios import, no duplicate query key) · regression (existing `CaseSheetModule` tests, VCC region order, WorkflowPills/NextActionBar unchanged).
**Rollback:** *Behavior*. **Reqs:** FR-CS-1, part of FR-CS-2's frontend half · **Design:** §3 (region order)
**Status: COMPLETE.**

### T-BE-E.1a · Expose Episode Case Sheet contribution history **[NEW, split from T-FE-E.1, 2026-07-25]**
**Repo:** BE · **Layer:** Application/API · **Blocked by:** T-BE-C.4 (complete, commit `e7715d4`) · **Unblocks:** `T-FE-E.1b` · **Size:** S
**AC:** (1) tenant-, patient-, Episode-, and Case-Sheet-scoped read. (2) returns append-only contribution entries in deterministic chronological order. (3) each entry includes only backend-owned facts required by the frozen frontend AC: contribution ID, Visit ID, author/staff identity or safe display facts already governed by existing conventions, created timestamp, and the contribution content required for display. (4) no history reconstruction from current Case Sheet contents. (5) no overwriting or collapsing of contributions. (6) no date/name/proximity inference. (7) no new aggregate if the existing Case Sheet service/router is the natural authority. (8) no migration unless Engineering Truth proves an existing persisted field is missing.
**Tests:** unit · contract · integration (multi-visit chronological order). **Rollback:** *Behavior* — additive read endpoint only.
**Reqs:** FR-CS-5, FR-CS-6 · **Design:** §2.2
**Status [Updated 2026-07-25, owner-ratified snapshot amendment]:** Engineering Truth (pre-implementation report, this task) proved AC(3)'s "contribution content" clause had no persisted fact to serve — `TenantCasesheetContribution` was attribution-only by the original DO-2 decision, no content field existed anywhere. **`T-BE-E.1a` now includes the ratified immutable snapshot migration/write/read contract** (Decision 12, `R7-OWNER-RATIFICATION.md`, v1.3 amendment): one additive nullable `content_snapshot` JSONB column, populated inside the existing atomic contribution-recording transaction, legacy rows explicitly `content_available: false`. AC(8)'s migration condition is satisfied under this ratified exception — Engineering Truth proved the field was genuinely missing, and the owner ratified the narrow schema amendment rather than leaving AC(3) unsatisfiable.
**Status [Updated 2026-07-26]: COMPLETE.** `GET /clinic/{tenant_id}/casesheets/{casesheet_id}/contributions` implemented and verified (commit `00682b6`); shared development Supabase upgraded to `20260727_000001` and verified (commit `8e43b15`, see `.kiro/engineering/DB-T-BE-E1A-SNAPSHOT-UPGRADE-RESULT.md`). `T-FE-E.1b` unblocked and now also complete.

### T-FE-E.1b · Render prior Visit Case Sheet contributions **[NEW, split from T-FE-E.1, 2026-07-25]**
**Repo:** FE · **Layer:** Presentation · **Blocked by:** `T-FE-E.1a`, `T-BE-E.1a` · **Size:** S
**Scope:** Render prior Visit Case Sheet contributions inside the composed Case Sheet experience (T-FE-E.1a).
**AC:** (1) prior Visit notes remain visibly retained. (2) each contribution shows author and timestamp. (3) current and prior contributions are visually distinguishable. (4) contributions are never edited, replaced, or collapsed into the current draft. (5) uses the backend contribution-history contract only (`T-BE-E.1a`). (6) no frontend history reconstruction or inference.
**Tests:** unit · integration (multi-visit) · regression. **Rollback:** *Behavior*.
**Reqs:** FR-CS-5 · **Design:** §2.2
**Status [Updated 2026-07-26]: COMPLETE.** `CaseSheetContributionHistory` composed as a read-only 4th child of `CaseSheetModule`, consuming `T-BE-E.1a`'s endpoint via a new `useCasesheetContributionHistoryQuery` hook. All 6 AC clauses satisfied: prior contributions visibly retained in backend order, author+timestamp shown, read-only badge visually distinguishes history from the editable draft, no mutation hook imported (structurally proven), legacy rows show an explicit unavailable state, no frontend reconstruction. Commit `c93fddf`.

### T-FE-E.2 · Compose Prescription · Recommendation · Plan · Scheduling
**Repo:** FE · **Blocked by:** **T-0.2/T-0.4/T-0.7**, T-BE-D.4, T-BE-E.2, T-BE-E.3 (**all done — T-BE-E.3 was wrongly believed Not Started, see its own card, corrected 2026-07-27**) · **Size:** M
**AC:** **no `Issue`/`Dispense` action exists** (FR-RX-1); Rx edit DRAFT-only; **FE never reconstructs the Plan from schedule rows** (FR-TP-1 AC15); **author-once-apply-to-many** per-session instructions (FR-TS-3 adoption).
**Tests:** unit · integration · architecture. **Rollback:** *Behavior*. **Reqs:** FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-3, FR-SCH-1
**Status [Updated 2026-07-27, T-FE-E.2a closure]: COMPLETE.** Composed into `VisitCommandCenter`: `PrescriptionModule`/`TreatmentRecommendationModule` (reused unchanged, FR-RX-1/FR-TR-1), `SessionInstructionsModule` (single-session doctor content, stable-id-bound, OCC-adopted, **plus author-once-apply-to-many multi-select bulk apply — see `T-FE-E.2a`**), `SchedulingModule` (current scheduled/unscheduled state + permission-gated schedule/reschedule), and `TreatmentPlanModule` (create/view a Treatment Plan from an eligible Recommendation, every FR-TP-1 clinical-intent field rendered, no amendment/version controls — FR-TP-1 AC15 satisfied by construction, never reconstructed from schedule rows) — `T-BE-D.4a` (commit `c69f7ef`) exposed the previously-missing public HTTP contract, closing that earlier gap. `SchedulingModule` also consumes the scheduling-proposal read (`resolve_scheduling_proposal`, T-BE-E.2a) using the `plan_id` obtained from the same Recommendation-keyed Plan lookup — FR-SCH-1's "governed scheduling intent"/proposed dates/PRN/review-dependent framing are composed, not fabricated. All 4 of this task's own frozen AC items are now satisfied: no `Issue`/`Dispense` action; Rx edit DRAFT-only; FE never reconstructs the Plan from schedule rows; author-once-apply-to-many is built (`T-FE-E.2a`, commit `7e2ce7f1`). Frontend commits: `4fba2ec4`, `80fb96d0`, `c69f7ef` (backend), `bfe31956`, `7e2ce7f1`.
**Prior gap, now closed:** "Author-once-apply-to-many" (FR-TS-3's own Adoption requirement) was not implemented as of the 2026-07-27 T-BE-D.4a closure. Engineering Truth re-verification found `T-BE-E.3` was already COMPLETE (commit `9497f13`, 2026-07-25) — every prior report claiming it "remains Not Started" was factually wrong. `T-FE-E.2a` (below) implemented the frontend multi-select + bulk apply using the already-working `bulk_update_treatment_sheet_rows_by_tenant` endpoint. No further gap remains for this task's own AC.

### T-FE-E.2a · Author once, apply Session instructions to many Sessions **[NEW, narrow frontend amendment of T-FE-E.2, 2026-07-27 — COMPLETE]**
**Repo:** FE · **Layer:** Presentation · **Blocked by:** T-BE-E.3 (complete, `9497f13`) · **Unblocks:** T-FE-E.2's own closure · **Size:** S
**Objective:** Close FR-TS-3's sole remaining Adoption-requirement gap, verified genuine by a dedicated Engineering-Truth-only task: `SessionInstructionsModule` edited exactly one Session at a time; no way existed to author instructions once and apply them to an explicitly selected subset of Sessions, despite the backend bulk primitive (`bulk_update_treatment_sheet_rows_by_tenant`) already existing, already atomic, and already reachable.
**AC:** (1) an explicit multi-select mechanism, keyed by stable `TreatmentSheetRow.id` (never `day_number`/array position), fully independent of the pre-existing single-row tap-to-edit flow — neither mode is forced on the other. (2) COMPLETED Sessions are never selectable (matches the verified backend eligibility rule exactly, no invented eligibility engine). (3) one shared author-once draft is applied via exactly one call to the existing bulk mutation — no per-row loop, no second endpoint. (4) confirmation is required only when more than one Session is selected; a single-Session apply matches the existing no-confirmation UX unchanged. (5) the existing single-Session edit/save/conflict flow is preserved byte-for-byte. (6) the confirmed absence of OCC/version on the bulk path is reported (code comment + dedicated architecture test), not silently added to or worked around in the backend.
**Tests:** unit (selection, draft, confirmation, request shape, results) · architecture (Layer Integrity, no mutation loop, no protected-field write, no duplicate endpoint) · regression (all 8 pre-existing single-Session tests unchanged).
**Rollback:** *Behavior* — additive UI only, no schema/contract change, no migration.
**Reqs:** FR-TS-3 (Adoption requirement) · **Design:** §2.4
**Status: COMPLETE.** `SessionInstructionsModule.tsx` gained `checkedRowIds: Set<string>` (independent of `selectedRowId`), a shared `bulkDraft`, and `submitBulkApply` calling `useUpdateAllTreatmentSheetRowsMutation` (the existing canonical hook, no new datasource function) exactly once per apply. Confirmation shown only when `checkedRowIds.size > 1`; a single selected Session applies immediately, matching the pre-existing single-Session convention. Backend atomicity confirmed by source inspection (`sqlalchemy_treatment_sheet_repository.py::bulk_update`): all validation — sheet-edit permission, every row exists, every row belongs to the sheet, no row is `COMPLETED` — runs before any mutation; any failure rolls back the whole batch via the service's `uow.rollback()`, so no partial-success handling was needed. OCC gap (no `expected_version`/`If-Match` anywhere on the bulk path) confirmed genuine and reported, not fixed — out of this task's scope per its own explicit instruction. 20 new tests (`sessionInstructionsBulkApply.test.tsx`) + 10 new architecture tests (`sessionInstructionsArchitecture.test.ts`) + all 8 pre-existing `sessionInstructionsModule.test.tsx` tests unchanged and passing (mock block only extended). Full `doctorDashboard` suite: 758/759 (1 known pre-existing unrelated failure, `workspaceHeader.test.tsx`). `npx tsc --noEmit`: zero new errors. Backend repository confirmed untouched throughout. Commit `7e2ce7f1`.

### T-BE-D.4a · Expose Treatment Plan creation/read contract **[COMPLETE, 2026-07-27]**
**Repo:** BE · **Layer:** Router · **Blocked by:** T-BE-D.4 (complete) · **Unblocks:** the Treatment Plan and scheduling-proposal portions of T-FE-E.2
**Objective:** `TreatmentPlanService`/`ITreatmentPlanRepository` (T-BE-D.4, commit `f09097f`) are Application-layer only — no router, no schema, no `main.py` registration, confirmed via `find`/`grep` across the backend repository. This blocks three things: (a) creating a Plan from an eligible Recommendation over HTTP at all, (b) any frontend view of Plan clinical fields, and (c) obtaining a `plan_id` at all, which `resolve_scheduling_proposal` (T-BE-E.2a) requires as a path parameter — so the scheduling-proposal endpoint is unreachable from the frontend even though it is itself fully exposed.
**AC:** a thin router exposing (1) create Plan from an eligible Recommendation (reusing `create_treatment_plan_from_recommendation` verbatim — no eligibility/one-Plan-invariant logic reimplemented in the router), (2) get Plan by id, (3) get Plan by originating Recommendation id (reusing `get_by_originating_recommendation_id`, already on the repository interface) — the operation the frontend needs to determine whether a Plan already exists without reconstructing it from schedule rows. No new business logic, no new persistence, no new uniqueness mechanism, same capability-gating convention as `treatment_orders_router.py`/`treatment_recommendation` routes. `list_by_episode` exposed only if Engineering Truth proves the frontend genuinely needs it beyond (3).
**Tests:** contract/unit for every new endpoint (creation spoofing/duplicate/ineligible rejection; read tenant/Episode isolation; not-found).
**Rollback:** *Behavior* — additive endpoints only, no migration.
**Reqs:** FR-TP-1, FR-TR-1, FR-SCH-1 · **Design:** §2.3, §2.4, §2.8
**Status [Updated 2026-07-27]: COMPLETE.** New `treatment_plans_router.py` (`POST /treatment-plans`, `GET /treatment-plans/{plan_id}`, `GET /treatment-plans/by-recommendation/{recommendation_id}`) and `app/schemas/treatment_plans.py`, reusing the existing `get_treatment_plan_service` DI factory (T-BE-E.2a) and `treatment_sheet.order`/`treatment_sheet.read` permissions verbatim — no new permission code. One necessary, narrow addition beyond router/schema: `ITreatmentPlanService`/`TreatmentPlanService` gained `get_treatment_plan`/`get_treatment_plan_by_recommendation`, thin one-line delegations to the repository's own already-tested reads (the service had no read methods at all before this task; the router calling the repository directly would have violated Layer Integrity). 31 new backend tests (18 API/contract/RBAC/architecture + 9 semantics-only guard + 4 service-level read tests), full suite 2000/2001 (the one pre-existing failure is an unrelated environment-config test). No migration — additive endpoints only over the existing T-BE-D.1 table; Alembic code head and shared dev DB both remain `20260727_000001`. Commit `c69f7ef`.

### T-FE-E.3 · Compose therapist session execution ∥ **[COMPLETE, 2026-07-28]**
**Repo:** FE · **Blocked by:** **T-0.7** (done), T-BE-E.4 (done) · **Size:** M
**AC:** instructions visible; actuals append; `Missed` label composed from the **three** backend facts (never a single ambiguous state). **Tests:** unit · integration. **Rollback:** *Behavior*. **Reqs:** FR-TS-4, FR-TS-5
**Status: COMPLETE.** Engineering Truth (re-verified against current source, not prior reports) found that assigned-session listing (`useTherapistSessionsQuery` → `get_therapist_sessions`, server-side scoped to the caller, no client-side therapist filtering), read-only doctor instructions, Start Session (`useStartSessionMutation` → `start_treatment_session`, `If-Match` required), and Complete Session (`useCompleteSheetRowMutation` → `complete_treatment_sheet_row`, idempotent via payload-hash, full retry/conflict state machine) were **already composed** by a pre-existing `TherapistDashboardScreen` — none of this predates R7 by coincidence, but none of it was built by this task either. The one genuinely missing piece was **structured non-execution** (`T-BE-E.4a`): zero frontend presence anywhere in the repo, confirmed by grep. Implemented: `SessionNonExecutionModal.tsx` (governed reason selector — `PATIENT_NO_SHOW`/`PATIENT_CANCELLED`/`CLINIC_CANCELLED`/`CLINICAL_HOLD`/`OTHER`, `OTHER` requires free text, no raw code ever shown), `recordSessionNonExecutionApi`/`useRecordSessionNonExecutionMutation` (new, following the exact `completeSheetRowApi` pattern), and `TherapistDashboardScreen.tsx` wiring (Record Non-Execution action, gated on `status !== 'COMPLETED'` — the one server-verified restriction; composed-label display rendering schedule state / "execution did not occur" / reason as three separate lines, sourced only from the record endpoint's own response — never a `MISSED` status). Doctor-authored fields (`treatment_name`/`medicines_text`/`instructions_text`) are never sent in the non-execution payload (verified by architecture test). Stable identity (`TreatmentSheetRow.id`, i.e. `row_id`) used throughout, never `day_number`/`session_date`/array position. 18 new tests (`sessionNonExecutionModal.test.tsx`, 8; `therapistExecutionArchitecture.test.ts`, 10), all passing; full frontend suite 1088 tests, 1079 passing (9 pre-existing unrelated failures — `workspaceHeader.test.tsx`, `therapistDashboard.property.test.ts`/`TherapistSessionCard.test.ts`/`therapistDashboard.entity.test.ts` [case-sensitivity], `staffDashboards.api.test.ts` [stale URL assertion on the untouched `completeSheetRowApi`], `wizard.store.test.ts`/`StepCard.test.tsx` [unrelated AsyncStorage/zustand issue] — none touch this task's files, confirmed via isolated re-runs and a `git stash`/`stash pop` round-trip proving the diff is purely additive). **One reported, non-blocking gap:** `TherapistSessionItem` (the `get_therapist_sessions` list schema) carries no `non_execution_reason_code`/`non_execution_reason_text` field, and non-execution does not mutate row `status` server-side — so the composed label is genuinely shown immediately after the action but cannot survive the list's next auto-refetch (pre-existing 30s interval / focus refetch). This is a backend contract gap, reported not worked around; tracked as follow-up debt, not a blocker for this card's own frozen AC. Commit `302bccbf`.

### T-FE-E.4 · Compose billing stage ∥
**Repo:** FE · **Status:** COMPLETE [Reconciled 2026-10-03] · **Size:** M
**AC:** doctor **read-only**; admin/front-desk actionable; unbilled → **warning at completion, never a block**; capability-gated. **Tests:** unit (per role) · integration. **Rollback:** *Behavior*. **Reqs:** FR-BILL-1/2 · **Decisions:** D6
**Completion evidence [Reconciled 2026-10-03]:** frontend commit `d5854bd465747dbdf2a25aaea07d706ac5b162dc` on `reconciliation/r7-cos-dev-fe`; classification `T_FE_E4_COMPLETE`; gate `E4_BILLING_STAGE_BACKEND_TRUTH_CLEAN`; 54 passed / 0 failed / 0 skipped. The Visit-scoped stage renders backend billing facts when effective `billing` is enabled, stays read-only absent effective `billing.invoicing` + `invoice.create`, reuses the invoice-create route with appointment context only, leaves Client/Visit authority to the backend, preserves generic invoice creation, and renders unbilled as warning-only. COS flag and C.2 regressions passed. T-FE-E.6 remains separate and is not a dependency of this task.

### T-FE-E.5 · Amendment surfaces + version rendering
**Repo:** FE · **Blocked by:** none · **Size:** M
**AC:** amend action permission-gated; **superseded versions visibly marked**; prints identify the version; **no UI path mutates a signed version.**
**Tests:** unit · integration. **Rollback:** *Behavior* — flag (⚠ **records persist**; see T-BE-G.1). **Reqs:** FR-LD-1/2 · **Principles:** P6
**Status [Reconciled 2026-10-03]: COMPLETE.** Consumes the authoritative Living Document read closure from backend commit `d17c508bdb419a939711d508a51bf88c0a042021`: Case Sheet and Prescription lineage, backend version/current/superseded truth, immutable historical snapshots, and version-specific print. COS composes document-specific adapters over repository-free shared presentation; signed sources and historical snapshots expose no ordinary mutation path. Amend is permission-gated by canonical `casesheet.amend` / `prescription.amend`, uses the same stable source identity through G.2, creates neither a new Case Sheet/Prescription nor a client-side successor, and successful successor SIGN invalidates the canonical lineage query for backend refetch. Focused acceptance: 6 passed / 0 failed / 0 skipped; critical module/flag regression: 46 passed / 0 failed; targeted COS regression: 111 passed / 0 failed. `cos_v1` OFF remains unchanged. `ET-MIG-001` and `G1_B2_RUNTIME_CONCURRENCY_DEFERRED_REQUIRES_ISOLATED_DB` remain OPEN and are not closed by this task.

### T-FE-E.6 · Role/capability composition
**Repo:** FE · **Layer:** Config · **Files:** `features/episodes/presentation/config/episodeWorkspaceConfig.ts` ✅
**Blocked by:** T--1.2, T-FE-D.1 · **Size:** M
**AC:** 2→5 roles **as config, no screen forks** (the file's own docstring mandates this ✅); **RBAC-flexible** (permission-driven, not profession-hard-coded); **backend enforces** — UI hiding is presentation polish only ✅; actionability from backend `blocking_factors`/`waiting_role`, **never this map.**
**AC — capability-loss rendering** *[clarification, ETX-4 owner-resolved, 2026-07-18]*: renders backend-provided capability-loss semantics (read-only / blocked / continuation-allowed / historical-only / waiting-owner) exactly as returned; **never derives continuation/expansion policy from `useFeatures()`, clinic type, or this role-config map** — those remain presentation-polish only, same rule as actionability above.
**Tests:** unit (per role) · integration. **Rollback:** *Behavior*. **Reqs:** FR-RBAC-1, FR-WFA-2 · **ETX:** ETX-4 resolved
**Status [Reconciled 2026-10-04]: COMPLETE.** Five authoritative presentation roles (Doctor, Assistant Doctor, Admin, Front desk, Therapist) compose one COS screen with no role-specific module tree. Clinical actions remain permission/capability-driven and backend mutation authority remains unchanged; `blocking_factors`, `waiting_role`, recommendation, and the four backend capability-loss codes are rendered from the governed workflow contract without `useFeatures`, clinic, or plan policy derivation. Unknown/custom and multi-role presentation remain neutral and cannot affect authorization; readable context remains present for read-only users. Focused acceptance: 24 passed / 0 failed; required regression selection: 188 passed / 0 failed. **Closure remediation:** the original combined focused run exposed a synchronous settled-state assertion racing React Query's legitimate loading state; it now awaits the existing text with `findByText`. The exact combined command passed 24/0 in three consecutive runs; individual E.6 and VisitCommandCenter suites passed 8/0 and 16/0.

## FE Group F — Legacy redirects
*(R7 reaches **Redirect** only. **No screen deleted.**)*

### T-FE-F.1 · Route adapters: start-consultation · consultation ∥
**Repo:** FE · **Blocked by:** T-FE-D.1 · **Size:** M
**AC:** params preserved; deep links land on the correct stage; flag-gated. **Tests:** redirect + deep-link. **Rollback:** *Compatibility* — flag off ⇒ original routes intact (never deleted). **Reqs:** FR-LEG-1/2 · **Design:** §2.10

### T-FE-F.2 · Route adapter: complete-consultation
**Repo:** FE · **Blocked by:** **T-0.8**, T-BE-F.3 · **Size:** M
**AC:** composed **only after** summary/readiness are backend-owned (ED-DEP-2 gate). **Tests:** redirect · integration. **Rollback:** *Compatibility* — flag off. **Reqs:** FR-LEG-2, FR-CR-1 · **Debt:** ED-DEP-2

### T-FE-F.3 · Standalone casesheet/prescription create-edit redirects ∥
**Repo:** FE · **Blocked by:** T-FE-E.1, T-FE-E.2 · **Size:** M
**AC:** reuse **existing** flags ✅ (`caseSheetRouteFlagSwitch`, `prescriptionRouteFlagSwitch`); standalone "new case sheet per visit" **redirects to the Episode's sheet** (correctness fix, FR-CS-1); **read/list retained.**
**Tests:** flag-switch · redirect. **Rollback:** *Compatibility* — flag off. **Reqs:** FR-LEG-2, FR-CS-1

## FE Group G — Mobile · Accessibility

### T-FE-G.1 · Mobile-first Command Center ∥
**Repo:** FE · **Blocked by:** T-FE-C.1..C.3, T-FE-B.2 · **Size:** M
**AC:** sticky next action; horizontal pill rail with **active auto-scrolled into view**; one primary task; minimal scrolling; ≥44pt; **no dot-only pills.**
**Tests:** unit · responsive · a11y. **Rollback:** *Behavior*. **Reqs:** FR-MOB-1

### T-FE-G.2 · Accessibility & localization ∥
**Repo:** FE · **Blocked by:** T-FE-G.1 · **Size:** M
**AC:** **status never colour-alone** (icon+text); labels/roles/hit targets; **all text via localization keys** ✅ (backend sends keys, never English — AC-4). **Tests:** a11y · localization. **Rollback:** *Behavior*. **Reqs:** FR-MOB-1/2

---

# GROUP Z — Proof · Regression · Performance · Rollback validation · Release readiness

### T-Z.1 · Architecture proof ∥
**Repo:** both · **Blocked by:** all · **Size:** M
**AC:** layer audit clean (**no new ED-ARCH-001 instances**); resolver imports no infrastructure; **no FE clinical derivation**; contract carries no presentation fields. **Tests:** architecture suite. **Reqs:** FR-COS-2, FR-REC-1 · **Principles:** AC-1..AC-5

### T-Z.2 · Full regression vs baseline
**Repo:** both · **Blocked by:** all · **Size:** M
**AC:** both suites green vs baseline (BE 667 ✅ + new); **flag-off parity proven**; no pre-existing failure silently absorbed. **Tests:** full suites.

### T-Z.3 · DP-15 proof (one clinical answer)
**Repo:** both · **Blocked by:** T-Z.1 · **Size:** M
**AC:** for each clinical question (can-complete · next-action · treatment-complete · rx-finalized · casesheet-ready) **exactly one** backend authority answers; **no FE path can produce a different answer.** **Tests:** architecture + integration. **Principles:** P3

### T-Z.4 · **Rollback validation** (all four kinds, explicitly)
**Repo:** both · **Blocked by:** T-Z.2 · **Size:** M
**AC:** (1) **Behavior:** `cos_v1` off ⇒ today's behavior, **no data effect.** (2) **Compatibility:** every legacy route still functional. (3) **Migration — pre-adoption:** `tenant_treatment_plan` + supersession structures drop cleanly (disposable Postgres). (4) **Migration — post-adoption:** behavior disabled via flag, **data retained**, compatibility provided. (5) ⚠ **Data: NO rollback destroys clinical history** — amendment chains, signed versions, contributions, audit history preserved and **verified present after rollback.**
**Tests:** migration up/down · flag-off parity · **post-adoption rollback drill.**

### T-Z.5 · Performance sanity ∥
**Repo:** both · **Blocked by:** T-Z.2 · **Size:** S
**AC:** the aggregate read does not regress workspace open vs baseline; no N+1 from fact assembly. **Tests:** query-count/timing on a disposable environment.

### T-Z.6 · Legacy deprecation readiness (**no removal**)
**Repo:** FE · **Blocked by:** T-FE-F.1..F.3 · **Size:** S
**AC:** zero-usage instrumentation in place; **removal explicitly deferred** to a separately-approved task with the full §17 checklist. **no screen deleted in R7.** **Reqs:** FR-LEG-1

### T-Z.7 · R8 handoff package ∥
**Repo:** docs · **Blocked by:** T-Z.3 · **Size:** M
**AC:** R8 inputs complete — measurements (on R6 concepts) · attachments · adapters · trends · **Clinical Advice** · **copy-forward + reconciliation** · **allergy/medication modelling (F-2 prerequisite)** · dispensing fulfilment. **Reqs:** FR-RX-2 + `[R8]` markers

### T-Z.8 · R7 closure + architecture/workflow proof doc
**Repo:** docs · **Blocked by:** T-Z.1..T-Z.7 · **Size:** M
**AC:** every requirement → evidence; every owner decision → implementation; rollback verified; retrospective recorded (R6 precedent).

### T-Z.9 · History hierarchy proof *[amendment, v1.1, 2026-07-18 — FR-HIST-1/2]*
**Repo:** both · **Blocked by:** T-BE-A.5, T-FE-C.7 · **∥ with:** other Z tasks once its own dependency chain clears · **Size:** M
**AC:** (1) **no duplicate Session representation** — the same therapy encounter never appears twice. (2) **no frontend history classification** — architecture scan clean on `useClinicalTimelineData.ts`/`ClinicalTimeline.tsx`. (3) **completed counts match backend execution truth** — regression test confirms parity with `treatment_sheet_row.status`/`completed_at`, not the retired scheduled-row formula. (4) consultations and therapy encounters remain visually and semantically distinct — a11y-audited, not colour-alone. (5) Plan groups are accessible and mobile-safe (extends T-Z.1's architecture proof and T-Z.2's regression scope to this surface specifically).
**Tests:** architecture · regression · a11y · mobile. **Rollback:** *Behavior*.
**Reqs:** FR-HIST-1, FR-HIST-2 · **Decisions:** D10

---

# Dependency & Parallelism Map

```
-1 ─► 0 ─┬─► BE-A ─► BE-B ─┬─► BE-F.3 ─► T-0.8 ─► FE-F.2
         │                 └─► T-0.9 ─► FE-D ─► FE-E ─► FE-F.1/F.3 ─► FE-G
         ├─► BE-C (∥ A/B/D)
         ├─► BE-D ─► BE-E
         ├─► BE-F.1/F.2 (∥)
         ├─► BE-G ─► BE-D.5
         └─► FE-A (∥ ALL BE — shell needs no backend) ─► FE-B/FE-C
                                                                      └─► Z
```

**Concurrent execution (both teams, no contention):**
| Window | Backend | Frontend |
|---|---|---|
| 1 | BE-A, BE-C, BE-D.1–D.3, BE-G.1 — **all ∥** | **FE-A** (shell+flag+hook; needs no BE) ∥ **T-0.2…T-0.7** remediation (6 modules ∥) |
| 2 | BE-B (resolver+service), BE-E, BE-F | FE-C regions (C.1/C.2/C.3/C.4 ∥) |
| 3 | BE-F.3, BE-G.2 | FE-B → FE-D → FE-E (E.3/E.4 ∥) |
| 4 | — | FE-F (F.1/F.3 ∥), FE-G (G.1/G.2 ∥) |
| 5 | Z (Z.1/Z.5/Z.7 ∥) | Z |

**Hard blocks (never parallelize):**
- **T-0 gate → all feature work.**
- **T-BE-B.2 → T-0.9** (FE can't remove assembly until the backend assembles).
- **T-BE-F.3 → T-0.8 → T-FE-F.2** (completion route must not compose a violating screen — ED-DEP-2).
- **Any FE composition → that module's Group-0 task** (ED-DEP-1).
- **FE-B/FE-D → BE-B** — **no interim frontend derivation** (D9). If the contract is late, the frontend waits.

---

# Coverage

**Requirements → tasks:** all **44/44** frozen requirements have ≥1 implementing task (FR-RX-2 is a *negative* requirement enforced by T-FE-E.2 AC + T-Z.7; **FR-HIST-1/2** [v1.1] → T-BE-A.3/A.4/A.5, T-FE-C.5/C.6/C.7, T-Z.9).
**Owner decisions → tasks:** D1→BE-C · D2→BE-G · D3→T-FE-E.2/T-BE-D.1 · D4→[R8] T-Z.7 · D5→[R8] T-Z.7 · D6→BE-F/T-FE-E.4 · D7→T-FE-B.2 · D8→scope/T-Z.7 · D9→BE-B/T-0.9 · **D10→T-BE-A.3/A.4/A.5, T-FE-C.5/C.6/C.7, T-Z.9 (v1.1)** · F-1→BE-C.2/C.3/C.4 · F-2→T-FE-C.3 · Plan→BE-D · Missed→T-BE-E.4/T-FE-E.3.
**Debt gates → tasks:** ED-DEP-1→T-0.2..0.7 · ED-DEP-2→T-0.8 · ED-DEP-3→T-0.9 · ED-DEP-4→T-FE-C.3 · ED-DEP-5→T-BE-D.1/T-FE-E.2 · ED-DEP-6→T-0.9 · **ED-DEP-7→T-BE-A.5/T-FE-C.5 (v1.1 — ED-ARCH-007, frontend session-count derivation)**.
**ETX → tasks:** ETX-1→T--1.2 · ETX-2→T--1.5 · ETX-3→T--1.3 · ETX-4→T--1.6 · ETX-5→T--1.4.
**Rollback:** every task declares its kind. **Data rollback is claimed nowhere** — clinical history is preserved by design (T-Z.4 AC5 verifies it).
**Task count:** **77** (70 original + 7 added by the v1.1 history-hierarchy amendment: T-BE-A.3/A.4/A.5, T-FE-C.5/C.6/C.7, T-Z.9). **No existing task ID was renumbered or reused.**

---

# Repository Milestones and Merge Checkpoints

Milestone completion requires tests passing, architecture proof, and (where a gate is defined below) owner-review approval — **code existing is necessary but never sufficient.**

## M0 — Engineering Truth Complete
**Task groups:** Group -1 (T--1.1 … T--1.7).
**Required automated tests:** none yet (verification-only group); T--1.7 confirms both baseline suites green (BE 667 ✅ + FE baseline).
**Required architecture proof:** none (no code yet).
**Merge criteria:** all five ETX findings (ETX-1..5) recorded with evidence; branch/baseline verified (T--1.1); T--1.7's internal-consistency + baseline-green gate passes.
**Owner-review requirement:** none dedicated — visibility via the Group -1 completion report.
**Permitted target branch:** `feature/r7-clinical-operating-system` only. **No implementation starts before this gate** (T--1.7's own gate statement).

## M1 — Blocking Architecture Debt Removed
*(Controlled amendment, 2026-07-19 — internal sequencing made explicit; scope, task groups and requirement mapping unchanged.)*
> **M1 CLOSED — 2026-07-19.** Verified via `R7-GROUP-0-M1-CLOSURE.md` (final Group 0 / M1 verification task). Verdict: **GROUP 0 / M1 PASSED**. Group 0A closure: `R7-GROUP-0A-CLOSURE.md` (commit `022a3e08`). Backend Contract Prerequisite Window completion commits: T-BE-A.1 `75cbae8`, T-BE-B.1 `f3895d8`, T-BE-B.2 `bd0e746`, T-BE-F.1 `efe2344`, T-BE-F.2 `f57d93b`, T-BE-F.3 `c9630e8`; plus the controlled amendment T-BE-F.3a (`7fe1991`, "expose consultation completion contract" — supplies the router exposure the Backend Contract Prerequisite Window's own tasks did not each carry, per each task's own Engineering Truth finding at the time). Group 0B completion commits: T-0.8 `cd48984d`, T-0.9 `055751dc`. **Gate OR-1 status: satisfied by this closure — owner review may proceed on the M1 closure artifact.**
**Task groups:** GROUP 0A (T-0.1 … T-0.7) **+** Backend Contract Prerequisite Window (T-BE-A.1, T-BE-B.1, T-BE-B.2, T-BE-F.1, T-BE-F.2, T-BE-F.3) **+** GROUP 0B (T-0.8, T-0.9). All three are required — Group 0A completion alone does **not** satisfy M1 (see the Group 0 Final Gate).
**Required automated tests:** T-0.1's characterization suite green; each of T-0.2…T-0.7's own architecture test ("no presentation→transport import"); the Backend Contract Prerequisite Window's own tests (resolver unit tests with no DB, service unit/contract/integration tests, semantics-only contract guard — identical to the tests already required by M2 for these same task IDs); T-0.8's architecture test ("no FE clinical derivation") + regression; T-0.9's architecture test ("no FE assembly") + regression (`useConsultationWorkspace.test.tsx` ✅).
**Required architecture proof:** frontend scan (§Architectural Regression Scans) clean for the 8 R7-composed modules named in T-0.2…T-0.7, plus `CompleteConsultationScreen.tsx` (T-0.8) and `useConsultationWorkspace.ts` (T-0.9); backend scan clean for the Backend Contract Prerequisite Window tasks (resolver imports no infrastructure — AC-3; router/service/repository layering intact — AC-1).
**Merge criteria:** ED-ARCH-001 remediated in every R7-composed module (Group 0A, T-0.2…T-0.7) · the Backend Contract Prerequisite Window complete (T-BE-A.1, T-BE-B.1, T-BE-B.2, T-BE-F.1, T-BE-F.2, T-BE-F.3) · ED-ARCH-004 no longer controls completion (T-0.8) · ED-ARCH-006 no longer assembles workflow in the frontend (T-0.9) · characterization tests green throughout.
**Owner-review requirement:** **Gate OR-1** — occurs after **final** M1 (Group 0A + Backend Contract Prerequisite Window + Group 0B), not after Group 0A alone.
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M2 — Backend COS Contracts Complete
**Task groups:** BE Group A (T-BE-A.1, T-BE-A.2) · BE Group B (T-BE-B.1, T-BE-B.2, T-BE-B.3) · BE Group F, backend portion (T-BE-F.1, T-BE-F.2, T-BE-F.3). **Excludes T-BE-A.3/A.4/A.5 (v1.1 history hierarchy)** — these extend the same aggregate but depend on Treatment Plan/Sessions (M6) and complete later; see the M6 addendum below.
**Required automated tests:** resolver unit tests with no DB (T-BE-B.1) · service unit tests with mocked repos + contract + integration (T-BE-A.1/A.2, T-BE-B.2) · **semantics-only contract guard** (T-BE-B.3) · completion-readiness contract tests (T-BE-F.3).
**Required architecture proof:** backend scan clean — resolver imports no infrastructure (AC-3); router/service/repository layering intact (AC-1); contract carries no presentation fields (AC-4, T-BE-B.3).
**Merge criteria:** Clinical Workspace aggregate complete (T-BE-A) · pure workflow resolver complete (T-BE-B.1) · workflow service complete (T-BE-B.2) · semantics-only contract guard passing (T-BE-B.3) · completion-readiness backend contract complete (T-BE-F.3, which itself depends on billing T-BE-F.1/F.2) · **no frontend clinical derivation required** to consume the contract · backend focused tests green.
**Owner-review requirement:** **Gate OR-2.**
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M3 — COS Shell and Command Center Complete
**Task groups:** FE Group A (T-FE-A.1, T-FE-A.2, T-FE-A.3).
**Required automated tests:** flag on/off parity (T-FE-A.1) · invalidation tests (T-FE-A.2) · flag-switch test (T-FE-A.3).
**Required architecture proof:** frontend scan clean for the new shell — presentation never touches a datasource (AC-2, T-FE-A.2).
**Merge criteria:** existing workspace route reused, no new route created (FR-COS-1 AC1) · `cos_v1` flag operational · flag-off parity proven · Visit Command Center shell complete · frontend remains render-only · invalid-context state handled (W30).
**Owner-review requirement:** none dedicated — M3 is presentation scaffolding with no clinical semantics yet; visibility via completion report. (Independent of OR-1/OR-2 — the dependency map already permits FE-A to proceed in parallel with all backend groups.)
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M4 — Dynamic Workflow Functional
**Task groups:** FE Group B (T-FE-B.1, T-FE-B.2) · FE Group D (T-FE-D.1).
**Required automated tests:** per-state unit tests + architecture ("no assembly") + a11y (T-FE-B.1) · architecture ("FE computes no recommendation") + a11y (T-FE-B.2) · per-journey unit tests + architecture ("no FE assembly") + regression (T-FE-D.1).
**Required architecture proof:** frontend scan clean — no FE workflow assembly, no FE recommendation derivation (both explicit scan items, §Architectural Regression Scans).
**Merge criteria:** backend-assembled workflow rendered (T-FE-D.1) · recommendations and alternatives rendered (T-FE-B.2) · waiting-role and blockers rendered (T-FE-B.1) · **no canonical frontend order** · **no specialty-driven workflow presence** (capability-gated only, AC-7) · mobile workflow-pill behaviour verified against T-FE-G.1's pill-rail AC (full mobile polish remains Group G's own scope; only pill *behavior* is spot-verified here).
**Owner-review requirement:** **Gate OR-4.**
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M5 — Clinical Continuity Complete
**Task groups:** BE Group C (T-BE-C.1 … T-BE-C.4) · FE-E.1 (case sheet) · the Prescription/Recommendation portion of FE-E.2 · FE-E.4 (billing stage).
> **Granularity note.** `T-FE-E.2` is one task titled "Compose Prescription · Recommendation · Plan · Scheduling" — its scope spans both M5 (Prescription/Recommendation) and M6 (Plan/Scheduling). It is **not split** here (task IDs/scope are frozen); M5's merge criteria checks only the Prescription/Recommendation portion of its already-declared AC (`FR-RX-1`, `FR-TR-1`), and M6 additionally requires the Plan/Scheduling portion (`FR-TP-1`, `FR-TS-3`, `FR-SCH-1`) before M6 itself completes.
**Required automated tests:** N-visit attribution + each rejection case + regression (T-BE-C.2) · failure-injection integration (T-BE-C.3) · duplicate-submit/retry integration (T-BE-C.4) · multi-visit integration (FE-E.1) · unit/integration/architecture (FE-E.2, Prescription/Recommendation portion) · per-role unit + integration (FE-E.4).
**Required architecture proof:** backend scan clean for `casesheets_service.py` (no repository bypass, AC-1); frontend scan clean for composed modules (no new axiosClient/datasource imports reintroduced post-T-0.2..T-0.7 remediation).
**Merge criteria:** one Case Sheet per Episode (T-BE-C.1) · current-Visit contribution attribution correct (T-BE-C.2) · atomicity and idempotency verified (T-BE-C.3, T-BE-C.4) · append-only visit notes visible (FE-E.1) · Prescription and Recommendation composed (FE-E.2 portion) · billing visible according to role (FE-E.4).
**Owner-review requirement:** none dedicated — folded into OR-4's dependent-milestone visibility and OR-6's end-to-end review; the F-1 fix itself was already owner-ratified as a frozen contract in `requirements.md`, so this milestone verifies implementation against an already-approved contract rather than opening a new decision.
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M6 — Treatment Workflow Complete
**Task groups:** BE Group D (T-BE-D.1 … T-BE-D.5) · BE Group E (T-BE-E.1 … T-BE-E.5) · the Plan/Scheduling portion of FE-E.2 · FE-E.3 (therapist execution).
**Required automated tests:** domain invariant unit tests (T-BE-D.1) · **migration up/down on disposable Postgres** (T-BE-D.2) · integration on disposable Postgres (T-BE-D.3) · structural + unit + concurrency on disposable Postgres (T-BE-D.3a) · unit/integration/contract (T-BE-D.4) · per-operation unit + integration + regression (T-BE-D.5) · reschedule-preserves-identity integration (T-BE-E.1) · per-intent unit + integration (T-BE-E.2) · reschedule-content-intact integration (T-BE-E.3) · reschedule-after-execution integration (T-BE-E.4) · concurrent-write integration (T-BE-E.5).
**Required architecture proof:** backend scan clean for the new Treatment Plan module (pure domain, AC-3; repository/UoW registration, AC-1); confirm `TreatmentLifecycleStatus` was **not** reused for Plan lifecycle without semantic-fit proof (T-BE-D.1's own AC).
**Merge criteria:** Treatment Plan entity implemented (T-BE-D.1) · migration tested up/down (T-BE-D.2) · stable Sessions linked to Plan (T-BE-E.1) · sequential and non-sequential scheduling supported (T-BE-E.2) · doctor instructions survive rescheduling (T-BE-E.3) · therapist execution history preserved (T-BE-E.4) · `Missed` semantics decomposed correctly (T-BE-E.4).
**Owner-review requirement:** **Gate OR-3**, positioned specifically **after BE Group D completes and before the Plan/Scheduling portion of FE-E.2 begins** (i.e., mid-M6, not only at its end) — per the user's own placement ("before treatment UI composition").
**Permitted target branch:** `feature/r7-clinical-operating-system`.

> **M6 addendum (v1.1 amendment, 2026-07-18).** Once `T-BE-D.4` and `T-BE-E.1` complete within this milestone, they **unblock** `T-BE-A.3`/`A.4`/`A.5` (history hierarchy backend) and, once those land, `T-FE-C.5`/`C.6`/`C.7` (history hierarchy frontend) and `T-Z.9` (history hierarchy proof). These seven tasks are not assigned to any single M0-M8 milestone — they form their own dependency chain **anchored inside M6, extending into M8** (T-Z.9 shares M8's "blocked by all" posture). No new milestone letter is introduced; this note exists so the chain isn't silently lost between M6 and M8.

## M7 — Living Documents Complete
**Task groups:** BE Group G (T-BE-G.1, T-BE-G.2, T-BE-G.3) · FE-E.5 (amendment surfaces + version rendering).
**Required automated tests:** **migration up/down on disposable Postgres** + immutability-of-signed-version integration (T-BE-G.1) · unpermitted-amend-rejected integration (T-BE-G.2) · unit + integration (FE-E.5).
**Required architecture proof:** backend scan clean — `document_version` semantics not overloaded (ED-ARCH-002 lesson, T-BE-G.1's own ET note); amendment rejection is service-layer, not UI hiding (T-BE-G.2).
**Merge criteria:** supersession representation implemented (T-BE-G.1) · signed versions immutable (T-BE-G.1) · amendments versioned (T-BE-G.1, T-BE-G.2) · prior versions printable and auditable (FE-E.5) · post-adoption compatibility/rollback verified (T-BE-G.1's own Migration rollback clause) · **no destructive clinical-data rollback** (T-BE-G.1's Data clause — amendment chains, signed versions, audit history preserved).
**Owner-review requirement:** **Gate OR-5.**
**Permitted target branch:** `feature/r7-clinical-operating-system`.

## M8 — R7 Release Candidate
**Task groups:** Group Z (T-Z.1 … T-Z.9, **T-Z.9 added v1.1**) — each blocked by **"all"** prior tasks per the existing dependency map, so M8 implicitly gates on M0–M7 (and, via T-Z.9, on the M6-anchored history-hierarchy chain above).
**Required automated tests:** full architecture suite (T-Z.1) · full regression, both repos, vs baseline (T-Z.2) · DP-15 architecture+integration proof (T-Z.3) · migration up/down + flag-off parity + post-adoption rollback drill (T-Z.4) · query-count/timing sanity (T-Z.5).
**Required architecture proof:** T-Z.1 in full — layer audit clean, **no new ED-ARCH-001 instances**, resolver imports no infrastructure, no FE clinical derivation, contract carries no presentation fields.
**Merge criteria:** Group Z complete · full regression green · DP-15 proof complete · architecture proof complete · rollback drill complete · performance sanity complete · legacy routes remain functional (T-FE-F.1…F.3, consumed by T-Z.6) · R8 handoff complete (T-Z.7) · **owner release approval obtained.**
**Owner-review requirement:** **Gate OR-6.** This is the final gate — its approval is the release decision itself, separate from and in addition to any subsequent decision to merge `feature/r7-clinical-operating-system` into `dev`.
**Permitted target branch:** work lands on `feature/r7-clinical-operating-system`. **Merging that branch into `dev` is a separate, explicitly authorized action** — not automatic on M8 completion, and not performed by this task.

---

# No-New-Debt Exit Gate

**Applies to every task, task group, milestone, and pull request in this plan — without exception.**

Before any of the above may be marked complete, confirm:

```
No new ED-ARCH item introduced.
No new ED-DEP gate introduced.
No unresolved Engineering Truth divergence.
No new Presentation → axiosClient access.
No new Presentation → datasource access.
No new Application → HTTP client access.
No new Router → database/repository shortcut.
No new Service → direct business-data SQLAlchemy access.
No new frontend-derived clinical truth.
No duplicate clinical lifecycle authority.
No duplicate workflow/recommendation/completion-readiness logic.
No unrelated cleanup included.
```

**If any item fails:** the task/group/milestone **remains incomplete** · the violation must be **fixed within the responsible task** or **explicitly escalated** (a new, separately-tracked item — never silently folded into "future debt" to force a milestone closed) · **it is never a license for an uncontrolled repository-wide cleanup** — this gate applies to **new and touched R7 code only**; pre-existing violations outside R7's touched surface are reported (per §Architectural Regression Scans' three-way classification) and left alone.

**Existing precedent this gate formalizes:** T-Z.1's own AC already states "no new ED-ARCH-001 instances" — this gate generalizes that check to every task, not only Group Z.

---

# Pull Request Acceptance Checklist

**Every R7 pull request must confirm:**

```
[ ] The PR identifies the exact task ID.
[ ] The PR identifies the implementing requirement IDs.
[ ] The PR identifies the relevant design sections.
[ ] Only declared files/modules were changed.
[ ] No unrelated refactor or cleanup was included.
[ ] Frontend/backend layer rules remain intact.
[ ] Backend Owns Clinical Truth is preserved.
[ ] Backend Owns Workflow Intelligence is preserved.
[ ] DP-15 One Clinical Answer is preserved.
[ ] No frontend clinical derivation was introduced.
[ ] Acceptance criteria are demonstrated.
[ ] Required tests were added or updated.
[ ] Focused tests pass.
[ ] Relevant regression tests pass.
[ ] Architecture tests pass.
[ ] Contract tests pass where applicable.
[ ] Migration up/down tests pass where applicable.
[ ] Rollback behaviour is documented and verified.
[ ] Clinical records are not destroyed by rollback.
[ ] Feature-flag behaviour is verified where applicable.
[ ] R7/R8 boundary remains intact.
[ ] No frozen requirement or approved design was reinterpreted.
[ ] git diff --check passes.
[ ] Exact staged files were reviewed; git add . was not used.
```

**Every PR additionally requires a brief evidence section:**

- Commands run.
- Tests and counts (e.g., "unit: 12 passed; integration: 4 passed; architecture: 1 passed").
- Migration result, where applicable (up/down verified on disposable Postgres — never Supabase, per R6 T-A.1 precedent).
- Rollback evidence (which kind — Behavior/Migration/Compatibility/Data — and how it was exercised).
- Architecture-scan result (clean, or pre-existing debt named and excluded).
- Known limitations.
- **Explicit statement that no unrelated files were changed.**

---

# Architectural Regression Scans

**Purpose:** catch a new violation before it merges — not just at Group Z. Every scan **distinguishes** pre-existing known debt (ED-ARCH-001..006, already recorded, not this gate's concern unless the current task touches that exact file) · R7-touched violations (a file already on the ED-ARCH-001 list, remediated by Group 0, then re-violated by later R7 work) · newly introduced violations (a file never on the list, introduced by R7). **Only the third category blocks completion** — but the second (a Group-0 remediation regressing) is equally serious and treated as a task failure, not new debt.

## Frontend scan
Detect:
- presentation imports of `axiosClient`;
- presentation imports of datasources;
- presentation imports of infrastructure repository implementations;
- application imports of HTTP clients/datasources;
- frontend workflow assembly (a reintroduced `activeSections`-style computation);
- frontend lifecycle derivation;
- frontend recommendation derivation;
- frontend completion-readiness derivation;
- hard-coded clinic-type workflow presence (specialty-string gating instead of capability-gating);
- duplicate clinical state answers (two code paths that could answer the same DP-15 question differently).

## Backend scan
Detect:
- routers accessing ORM/database directly;
- routers calling repositories instead of services;
- services issuing business-data SQLAlchemy queries directly;
- services bypassing an existing repository;
- domain modules importing infrastructure/API/session (AC-3);
- duplicate lifecycle resolvers (a second pure resolver answering a question `clinical_workflow_resolver` or `treatment_lifecycle_resolver` already owns);
- duplicate workflow/recommendation authorities;
- UI/presentation fields leaking into semantic contracts (AC-4 — the exact check T-BE-B.3 already automates).

**Cadence:** after every backend or frontend group · before every milestone merge · during Group Z's architecture proof (T-Z.1).

**Automation.** Where practical, convert to automated architecture tests rather than relying exclusively on grep — several tasks already do this (T-BE-B.1's import audit, T-BE-B.3's semantics-only guard, T-0.2…T-0.9's "no presentation→transport import"/"no FE assembly"/"no FE clinical derivation" tests, T-Z.1's architecture suite). New scan categories introduced by this gate (duplicate lifecycle resolvers, duplicate workflow authorities, hard-coded clinic-type presence) should gain equivalent automated tests during the tasks that first make them possible to violate (T-BE-B.1, T-BE-D.1, T-FE-D.1) rather than remaining grep-only through Group Z.

---

# Owner Review Gates

**No subsequent dependent milestone begins until its applicable gate is approved.** Independent tasks not depending on the review may continue **only when the dependency map (§Dependency & Parallelism Map) explicitly allows it** — e.g., FE-A may proceed during OR-1/OR-2 review because the map already shows it depends only on the T-0 gate, not on BE Group A/B.

## Gate OR-1 — After Group 0 / M1
*(Controlled amendment, 2026-07-19 — clarifies timing only; review scope unchanged.)* **Occurs after final M1** (GROUP 0A + Backend Contract Prerequisite Window + GROUP 0B) — **Group 0A completion alone does not trigger this gate.** Checkpoint 0A (§GROUP 0A / Backend Contract Prerequisite Window) is an internal authorization to begin backend prerequisite work, not a review milestone.
> **Ready — 2026-07-19.** Final M1 is closed (see the M1 section's own closure note and `R7-GROUP-0-M1-CLOSURE.md`). This gate is now ready for owner review; it has not been separately marked "passed" by an owner in this document, since that is the owner's own action, not something this task performs on the owner's behalf.
Review: architectural debt remediation (T-0.2…T-0.7, Group 0A) · the Backend Contract Prerequisite Window (T-BE-A.1, T-BE-B.1, T-BE-B.2, T-BE-F.1, T-BE-F.2, T-BE-F.3) · contract-dependent debt removal (T-0.8, T-0.9, Group 0B) · preserved behaviour (characterization suite still green) · no widened cleanup (Task Isolation held) · readiness to compose existing modules (Group 0A's own gate statement: "no FE composition task runs against a module until that module's Group-0A task is complete").

## Gate OR-2 — After Backend Workflow Contract / M2
Review: aggregate shape (T-BE-A) · workflow stages (T-BE-B.1) · recommendation semantics (T-BE-B.2) · completion readiness (T-BE-F.3) · blockers and waiting role · absence of UI fields (T-BE-B.3's contract guard) · proof that frontend derivation is unnecessary (the contract is sufficient for T-FE-B/T-FE-D to render without computing anything).

## Gate OR-3 — After Treatment Plan Backend / before treatment UI composition
Review: `tenant_treatment_plan` entity (T-BE-D.1/D.2) · lifecycle semantics (T-BE-D.1's status enum — confirm it did **not** reuse `TreatmentLifecycleStatus`) · migration (T-BE-D.2, up/down verified) · relationship to Recommendation and Sessions (T-BE-D.4, T-BE-E.1) · disposition of legacy `tenant_visits.treatment_plan` (per T--1.4/ETX-5's finding) · rollback phases (pre-/post-adoption, T-BE-D.2).
**Position:** mid-M6 — after BE Group D, before the Plan/Scheduling portion of T-FE-E.2.

## Gate OR-4 — After Dynamic Workflow UI / M4
Review: clinic/capability variants (T-FE-D.1's per-journey tests) · recommendation with easy deviation (T-FE-B.2, Decision 7) · mobile pills (T-FE-B.1, spot-verified against T-FE-G.1's AC) · waiting-role behaviour · no fixed frontend order · no form-first regression (the COS opens on a briefing, not a form — FR-VCC-1).

## Gate OR-5 — After Living Documents / M7
Review: immutable signed versions (T-BE-G.1) · amendment chain (T-BE-G.1/G.2) · print/share behaviour (FE-E.5) · version visibility (FE-E.5) · post-adoption rollback and compatibility (T-BE-G.1's Migration rollback clause).

## Gate OR-6 — Group Z / M8
Review: end-to-end patient lifecycle (T-Z.1..T-Z.3) · rollback drill (T-Z.4) · regression (T-Z.2) · performance (T-Z.5) · legacy compatibility (T-Z.6) · R7/R8 boundary (T-Z.7) · release readiness. **This gate's approval is the release decision** — separate from any later decision to merge into `dev`.

---

# Not in R7 (explicit)
Laboratory/measurements · attachments · trends · Clinical Advice · copy-forward · medication reconciliation · allergy/interaction/renal modelling · dispensing fulfilment · generalized workflow engine · autonomous clinical decisions · CDS engine · analytics/AI · **screen removal** (readiness only) · `day_number` retirement · `episode_id` nullability migration · `appointment_id` removal · unrelated drift cleanup. **R8 scope may not move into R7 without explicit owner approval.**
