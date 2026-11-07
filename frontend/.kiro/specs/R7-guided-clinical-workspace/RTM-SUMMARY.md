# RTM-SUMMARY — R7 Clinical Operating System

**Derived from:** `RTM-MASTER.md` (full reconciliation pass). **As of:** 2026-07-27 · Backend `186f11f74c9ebd7986689a3919459ad69d446ea6` · Frontend `d69ade484d936cc2f819b40a15758ff22a7ce9d7`.

> **[2026-07-26] Partially stale as of `T-FE-E.2`.** This document was generated from `RTM-MASTER.md`'s 2026-07-27 pass and has NOT been rewritten for `T-FE-E.2`'s partial completion (commits `4fba2ec4`/`80fb96d0`). In particular: Prescription and Treatment Recommendation composition are now done (not "not started"); Session Instructions and Scheduling have real partial composition (current state + write); the Treatment Plan gap is now understood specifically — `TenantTreatmentPlan` has zero public HTTP contract — with a proposed remediation, `T-BE-D.4a`. Treat every `T-FE-E.2`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-26]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Further update: `T-BE-D.4a` + `T-FE-E.2` closure.** The gap the banner above describes is now closed for Treatment Plan and the scheduling-proposal preview: `T-BE-D.4a` (backend commit `c69f7ef`) exposed the Treatment Plan public contract, and `TreatmentPlanModule` + `SchedulingModule`'s proposal consumption compose it (frontend commit `bfe31956`). `T-FE-E.2` is still not COMPLETE -- the sole remaining gap is author-once-apply-to-many (FR-TS-3's own AC), blocked on the separate, still-unstarted `T-BE-E.3`, out of this closure's own scope. Treat every `T-FE-E.2`/`T-BE-D.4a`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-27]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Correction: `T-BE-E.3` was already complete.** Every reference below (and in every prior session's own reports) claiming `T-BE-E.3` "remains Not Started" was factually wrong -- commit `9497f13` (2026-07-25) predates all of them; a re-verification against `git log` this session caught it. `FR-TS-3` moves Not Started -> Partially Complete in `RTM-MASTER.md`. The one remaining gap for `T-FE-E.2` (author-once-apply-to-many) is now understood to be purely a frontend implementation task -- its backend primitive already exists and works; no backend defect was found. Not implemented this session (an Engineering-Truth-only task stopped at verification, as instructed). Treat every `T-BE-E.3`-referencing line below as superseded by `RTM-MASTER.md`'s `[Corrected 2026-07-27]` markers.

> **[2026-07-27] `T-FE-E.2` CLOSED.** The narrow frontend amendment `T-FE-E.2a` (commit `7e2ce7f1`) implemented author-once-apply-to-many in `SessionInstructionsModule` (multi-select keyed by stable Session id, one call to the existing atomic bulk-update endpoint, no backend change). `T-FE-E.2` moves PARTIAL → COMPLETE, `FR-TS-3` moves Partially Complete → Fully Complete. Every `T-FE-E.2 not started`/`PARTIAL` reference below is superseded — see `RTM-MASTER.md`'s `[Updated 2026-07-27, T-FE-E.2a closure]` markers for the authoritative current figures (task totals, Requirement Statistics, Capability Readiness Table, completion-boundary item 9).

> **[2026-07-28] `T-FE-E.3` CLOSED.** Engineering Truth found assigned-session listing, read-only doctor instructions, Start Session, and Complete Session were already composed by a pre-existing `TherapistDashboardScreen` — not built this task. The genuinely missing piece, structured non-execution, is now built (commit `302bccbf`): `SessionNonExecutionModal.tsx` + `useRecordSessionNonExecutionMutation`, using the exact governed backend vocabulary, never a `MISSED` status. `FR-TS-4`/`FR-TS-5` move Partially Complete → Fully Complete. Every `T-FE-E.3 not started`/`READY_TO_START` reference below is superseded — see `RTM-MASTER.md`'s `[Updated 2026-07-28]` markers for the current state, including one reported non-blocking gap (non-execution reason not durably re-displayed after a list refetch — a backend list-schema gap, not a frontend defect).




**Reconciliation note.** The prior version of this document accumulated seven narrow addenda (2026-07-25 through 2026-07-26) that each explicitly stated its own headline statistics table was NOT recomputed. This pass performs the deferred full recount `RTM-MASTER.md`'s own Reconciliation Evidence section documents. The headline tables below are the fresh, arithmetic-checked numbers — no prior addendum's numbers are carried forward. Historical addenda and their evolution remain available in this file's own git history and in `RTM-AUDIT.md`; they are not repeated here.

---

## Requirement-level statistics (44 total)

| Status | Count | % |
|---|---|---|
| Fully Complete | 20 | 45.5% |
| Partially Complete | 17 | 38.6% |
| Not Started | 6 | 13.6% |
| Deferred (to R8, by design) | 1 | 2.3% |
| Superseded | 0 | 0% |
| **Total** | **44** | **100%** |

| Release Classification | Count | % |
|---|---|---|
| READY FOR MVP | 20 | 45.5% |
| BLOCKING MVP | 23 | 52.3% |
| OPTIONAL FOR MVP | 0 | 0% |
| DEFER TO R8 | 1 | 2.3% |
| SUPERSEDED | 0 | 0% |
| **Total** | **44** | **100%** |

*(20 "Fully Complete" requirements map exactly to the 20 "READY FOR MVP" requirements; 23 "Partially Complete" + "Not Started" requirements map exactly to the 23 "BLOCKING MVP" requirements; FR-RX-2 is both "Deferred" and "DEFER TO R8.")*

## Task-level statistics (88 total tasks — recomputed from zero; see `RTM-MASTER.md` §Task Statistics for the full arithmetic)

| Category | Complete | Total | % |
|---|---|---|---|
| Backend-owned (BE Groups A–G, incl. T-BE-E.1a) | 32 | 36 | 88.9% |
| Frontend-owned (Groups 0A/0B, FE Groups A–G) | 25 | 35 | 71.4% |
| Shared/Governance (Group -1 + Group Z) | 7 | 16 | 43.8% |
| **Overall (all 88 tasks)** | **65** | **88** | **73.9%** |

## Completion percentages

- **Backend completion: 89%** (32/36 backend-owned tasks; `T-BE-D.5`, `T-BE-G.1/G.2/G.3` remain)
- **Frontend completion: 71%** (25/35 frontend-owned tasks; `T-FE-E.2..E.6`, `T-FE-F.1..F.3`, `T-FE-G.1/G.2` remain)
- **Overall completion: 74%** (task-based, all 88 tasks)

**Requirement-based overall completion (arguably more product-meaningful): 46% fully done, 39% partially done, 14% not started, 2% correctly deferred.** The gap between the 74% task-based figure and the 46% fully-done requirement-based figure is the important number: **most "Partially Complete" requirements have their backend half done and their frontend half not started** — see `RTM-MASTER.md`'s "Can we say Clinical Workspace and Doctor Module are complete?" section: only 5 of the 17 completion-boundary items are satisfied. Task-count progress does not equal product-usable progress; the single largest remaining piece is `T-FE-E.2` (Prescription/Recommendation/Plan/Scheduling/Session-instruction composition), which alone blocks 5 of the 17 items.

---

## Current remaining work to complete Clinical Workspace and Doctor Module

### Mandatory backend tasks remaining (4)
`T-BE-G.1` (Living Documents supersession representation — **READY_TO_START**) → `T-BE-G.2` (amendment permissions) + `T-BE-D.5` (Plan versioning/supersession) → `T-BE-G.3` (docstring fix, docs-only).

### Mandatory frontend tasks remaining (6, excluding the 2 deferred G-group tasks)
`T-FE-E.2` (Prescription/Recommendation/Plan/Scheduling/Session-instruction composition — **READY_TO_START**, see readiness check in `RTM-MASTER.md`) · `T-FE-E.3` (therapist execution — **READY_TO_START**) · `T-FE-E.4` (billing — **READY_TO_START**) · `T-FE-E.5` (amendment surfaces — blocked on `T-BE-G.2`) · `T-FE-E.6` (role composition — **READY_TO_START**) · `T-FE-F.1`/`T-FE-F.2` (legacy redirects — **READY_TO_START**) · `T-FE-F.3` (standalone redirects — blocked on `T-FE-E.2`).

### Release-validation tasks remaining (9)
`T-Z.1` … `T-Z.9` — all formally blocked by "all" prior tasks per the dependency map; `T-Z.1` (architecture proof) and `T-Z.5` (performance sanity) could run incrementally today against what already exists, but full closure waits on the mandatory work above.

### Optional/deferred tasks (2)
`T-FE-G.1` (mobile polish, judged optional by `MVP-RELEASE-FREEZE.md`), `T-FE-G.2` (depends on G.1).

### Current critical path
`T-BE-G.1` → `T-BE-G.2`/`T-BE-D.5` → `T-FE-E.5`. In parallel: `T-FE-E.2` → `T-FE-F.3`. The single longest pole is **`T-FE-E.2`** — the widest-scope remaining task (realizes 5 requirements: FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-1/2/3, FR-SCH-1), fully unblocked, not yet started.

### Current parallel paths
`T-BE-G.1` (backend) runs fully in parallel with `T-FE-E.2`/`E.3`/`E.4`/`E.6`/`T-FE-F.1`/`F.2` (frontend) — no shared file or dependency either direction. Within frontend, `T-FE-E.3`, `T-FE-E.4`, `T-FE-E.6`, `T-FE-F.1`, `T-FE-F.2` have no dependency on `T-FE-E.2` or each other.

---

## What this means, stated once, plainly

Backend implementation is substantially ahead of frontend implementation (89% vs. 71% task completion), and Clinical History (FR-HIST-1/FR-HIST-2) is now complete end-to-end as of this session's closure. But Clinical History is one capability among seventeen items on the completion boundary the owner actually cares about — "can a doctor run a full episode through this workspace" — and only five of those seventeen are done. The entire treatment-workflow composition surface (Prescription, Recommendation, Plan, Scheduling, Session instructions — `T-FE-E.2`) has zero frontend implementation despite every backend contract it needs having been complete since 2026-07-25, and the release-validation gate (Group Z) has not run once. Living Documents (Group G, both repos) has zero implementation on either side.
