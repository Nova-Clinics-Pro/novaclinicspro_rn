# RELEASE-READINESS-DASHBOARD — NovaClinics Clinical Operating System

**As of:** 2026-07-27 (full reconciliation pass) · Backend `186f11f74c9ebd7986689a3919459ad69d446ea6` · Frontend `d69ade484d936cc2f819b40a15758ff22a7ce9d7`

> **[2026-07-26] Partially stale as of `T-FE-E.2`.** This document was generated from `RTM-MASTER.md`'s 2026-07-27 pass and has NOT been rewritten for `T-FE-E.2`'s partial completion (commits `4fba2ec4`/`80fb96d0`). In particular: Prescription and Treatment Recommendation composition are now done (not "not started"); Session Instructions and Scheduling have real partial composition (current state + write); the Treatment Plan gap is now understood specifically — `TenantTreatmentPlan` has zero public HTTP contract — with a proposed remediation, `T-BE-D.4a`. Treat every `T-FE-E.2`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-26]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Further update: `T-BE-D.4a` + `T-FE-E.2` closure.** The gap the banner above describes is now closed for Treatment Plan and the scheduling-proposal preview: `T-BE-D.4a` (backend commit `c69f7ef`) exposed the Treatment Plan public contract, and `TreatmentPlanModule` + `SchedulingModule`'s proposal consumption compose it (frontend commit `bfe31956`). `T-FE-E.2` is still not COMPLETE -- the sole remaining gap is author-once-apply-to-many (FR-TS-3's own AC), blocked on the separate, still-unstarted `T-BE-E.3`, out of this closure's own scope. Treat every `T-FE-E.2`/`T-BE-D.4a`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-27]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Correction: `T-BE-E.3` was already complete.** Every reference below (and in every prior session's own reports) claiming `T-BE-E.3` "remains Not Started" was factually wrong -- commit `9497f13` (2026-07-25) predates all of them; a re-verification against `git log` this session caught it. `FR-TS-3` moves Not Started -> Partially Complete in `RTM-MASTER.md`. The one remaining gap for `T-FE-E.2` (author-once-apply-to-many) is now understood to be purely a frontend implementation task -- its backend primitive already exists and works; no backend defect was found. Not implemented this session (an Engineering-Truth-only task stopped at verification, as instructed). Treat every `T-BE-E.3`-referencing line below as superseded by `RTM-MASTER.md`'s `[Corrected 2026-07-27]` markers.

> **[2026-07-27] `T-FE-E.2` CLOSED.** The narrow frontend amendment `T-FE-E.2a` (commit `7e2ce7f1`) implemented author-once-apply-to-many in `SessionInstructionsModule` (multi-select keyed by stable Session id, one call to the existing atomic bulk-update endpoint, no backend change). Every Frontend column `🔴 (T-FE-E.2 not started)` below for Prescription Management, Treatment Recommendation & Plan, Session Scheduling, and Doctor Session Instructions is superseded — those 4 rows' Frontend columns are now ✅. See `RTM-MASTER.md`'s `[Updated 2026-07-27, T-FE-E.2a closure]` markers for the authoritative current state. Release Validation (Group Z) still has not run once — no row should be read as passed an end-to-end gate.

> **[2026-07-28] `T-FE-E.3` CLOSED.** `TherapistDashboardScreen` already composed start/complete (pre-existing, discovered via Engineering Truth, not built this task); structured non-execution was genuinely missing and is now built (commit `302bccbf`). The Therapist Execution row's Frontend column `🔴 (T-FE-E.3 not started)` below is superseded — now ✅. Release Validation (Group Z) still has not run once — no row should be read as passed an end-to-end gate.



**Legend:** ✅ Complete · 🟠 Implemented, Not Exposed (service-only — no router/caller reaches it) · 🟡 Partial · 🔴 Not Started · N/A Not Applicable to this capability

**Reconciliation note.** This dashboard is fully rewritten this pass, not addended. **Workflow Engine** and **Recommendation Engine** move from 🔴/🔴 to ✅/✅ on Frontend/Release — `T-FE-B.1`, `T-FE-B.2`, `T-FE-D.1` had shipped (commits `6e667d15`, `acfa730a`, `426967bb`) without this dashboard being updated, the same staleness `RTM-MASTER.md`'s reconciliation found in five requirement cards. Every other row was independently re-verified via `git log` and source inspection this pass; see `RTM-MASTER.md`'s Reconciliation Evidence section for method.

| Capability | BE | FE | Tests | Release | MVP Scope |
|---|---|---|---|---|---|
| Clinical Workspace Shell & Briefing | ✅ | ✅ | ✅ | ✅ | Included |
| Patient Safety Surface | ✅ | ✅ | ✅ | ✅ | Included |
| Workflow Engine | ✅ | ✅ **[Corrected — was stale 🔴]** (`T-FE-D.1`, commit `426967bb`) | ✅ | ✅ | Included |
| Recommendation Engine | ✅ | ✅ **[Corrected — was stale 🔴]** (`T-FE-B.1`/`T-FE-B.2`, commits `6e667d15`/`acfa730a`) | ✅ | ✅ | Included |
| Case Sheet Continuity | ✅ | ✅ (`T-FE-E.1a`+`T-FE-E.1b`, commits `0ed23f7`/`c93fddf`) | ✅ | ✅ | Included |
| Prescription Management | ✅ | 🔴 (`T-FE-E.2` not started) | ✅ | 🔴 | Included |
| Treatment Recommendation & Plan (creation) | ✅ | 🔴 (`T-FE-E.2` not started) | ✅ | 🔴 | Included |
| Session Scheduling | ✅ (intents resolved and exposed — `T-BE-E.2a`, commit `882dfa6`) | 🔴 (`T-FE-E.2` not started) | ✅ (48+12) | 🔴 | Included |
| Doctor Session Instructions | ✅ (`T-BE-E.3`, commit `9497f13`) | 🔴 (`T-FE-E.2` not started) | ✅ (58) | 🔴 | Included |
| Therapist Execution | ✅ (non-execution recording done and exposed — `T-BE-E.4a`, commit `a0aa4c3`) | 🔴 (`T-FE-E.3` not started) | ✅ (44+17) | 🔴 | Included |
| Billing Visibility | ✅ | 🔴 (`T-FE-E.4` not started) | ✅ | 🔴 | Included |
| Clinical History | ✅ (`T-BE-A.3/A.4/A.5/A.3a/A.3b`, commits `4472060`/`2147ada`/`6cac1e6`/`8326f33`/`186f11f`) | ✅ (`T-FE-C.5`+`T-FE-C.6`+`T-FE-C.7`+`T-FE-C.6a` all done, commits `cedee6cc`/`71e9f44d`/`3315d08d`/`3a4afd71`) | ✅ | ✅ | Included |
| Role-Based Workflow | N/A | 🔴 (`T-FE-E.6` not started) | 🔴 | 🔴 | Included |
| Legacy Navigation | N/A | 🔴 (`T-FE-F.1/F.2/F.3` not started) | 🔴 | 🔴 | Included |
| Living Documents (incl. Plan versioning) | 🔴 (`T-BE-G.1/G.2/G.3`, `T-BE-D.5` not started) | 🔴 (`T-FE-E.5` not started) | 🔴 | 🔴 | Included |
| Release Validation | N/A | N/A | 🔴 | 🔴 | Included — never yet run (Group Z, 0/9) |
| Mobile-First Presentation (full polish) | N/A | 🟡 | ✅ | 🟡 | **Deferred** (`T-FE-G.1` judged optional at task level) |

**Overall Release column [Updated 2026-07-27, full reconciliation]: 6 ✅ (Clinical Workspace Shell, Patient Safety, Workflow Engine, Recommendation Engine, Case Sheet Continuity, Clinical History) · 1 🟡 (Mobile, deferred anyway) · 8 🔴 (Prescription, Treatment Recommendation & Plan, Session Scheduling, Doctor Session Instructions, Therapist Execution, Billing, Role-Based Workflow, Legacy Navigation) · 1 🔴 not-applicable-to-BE/FE-split (Living Documents, both sides 🔴) · 1 🔴 (Release Validation, never run).** Of the 16 in-scope-for-MVP capabilities (excluding the 1 deferred), **6 are release-ready today** — up from 3 in the prior (stale) pass, purely from correcting the Workflow/Recommendation Engine staleness, not from new work.

**Reading this dashboard correctly:** every remaining 🔴 in the Release column except Living Documents and Role-Based Workflow is now driven by a ✅ Backend column paired with a 🔴 Frontend column — meaning most of the remaining engineering risk for Prescription/Treatment Recommendation/Plan/Scheduling/Doctor Session Instructions/Therapist Execution/Billing is frontend composition (`T-FE-E.2`, `T-FE-E.3`, `T-FE-E.4`), not backend design, implementation, or exposure risk. Living Documents is the one capability with zero implementation on either side. Release Validation (Group Z) has not run once — no dashboard row above should be read as "release-ready" in the sense of having passed an end-to-end gate, only as "its own task-level AC is met."
