# IMPLEMENTATION-ROADMAP — NovaClinics Clinical Operating System MVP

**Status: proposed engineering execution plan, not yet owner-approved.** Derived entirely from `RTM-MASTER.md`, `RTM-SUMMARY.md`, `MVP-BLOCKERS.md`, `RTM.md`, `RTM-AUDIT.md`, `MVP-RELEASE-FREEZE.md`, and the original governing documents (`requirements.md`, `design.md`, `tasks.md`, `R7-OWNER-RATIFICATION.md`). None of those documents were modified to produce this one. No production code was touched. No requirement, design, or completed-task status was changed.

> **[2026-07-26] Partially stale as of `T-FE-E.2`.** This document was generated from `RTM-MASTER.md`'s 2026-07-27 pass and has NOT been rewritten for `T-FE-E.2`'s partial completion (commits `4fba2ec4`/`80fb96d0`). In particular: Prescription and Treatment Recommendation composition are now done (not "not started"); Session Instructions and Scheduling have real partial composition (current state + write); the Treatment Plan gap is now understood specifically — `TenantTreatmentPlan` has zero public HTTP contract — with a proposed remediation, `T-BE-D.4a`. Treat every `T-FE-E.2`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-26]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Further update: `T-BE-D.4a` + `T-FE-E.2` closure.** The gap the banner above describes is now closed for Treatment Plan and the scheduling-proposal preview: `T-BE-D.4a` (backend commit `c69f7ef`) exposed the Treatment Plan public contract, and `TreatmentPlanModule` + `SchedulingModule`'s proposal consumption compose it (frontend commit `bfe31956`). `T-FE-E.2` is still not COMPLETE -- the sole remaining gap is author-once-apply-to-many (FR-TS-3's own AC), blocked on the separate, still-unstarted `T-BE-E.3`, out of this closure's own scope. Treat every `T-FE-E.2`/`T-BE-D.4a`-referencing line below as superseded by `RTM-MASTER.md`'s per-requirement `[Updated 2026-07-27]` markers; this document was not line-by-line corrected to match.

> **[2026-07-27] Correction: `T-BE-E.3` was already complete.** Every reference below (and in every prior session's own reports) claiming `T-BE-E.3` "remains Not Started" was factually wrong -- commit `9497f13` (2026-07-25) predates all of them; a re-verification against `git log` this session caught it. `FR-TS-3` moves Not Started -> Partially Complete in `RTM-MASTER.md`. The one remaining gap for `T-FE-E.2` (author-once-apply-to-many) is now understood to be purely a frontend implementation task -- its backend primitive already exists and works; no backend defect was found. Not implemented this session (an Engineering-Truth-only task stopped at verification, as instructed). Treat every `T-BE-E.3`-referencing line below as superseded by `RTM-MASTER.md`'s `[Corrected 2026-07-27]` markers.

> **[2026-07-27] `T-FE-E.2` CLOSED.** The narrow frontend amendment `T-FE-E.2a` (commit `7e2ce7f1`) implemented author-once-apply-to-many in `SessionInstructionsModule` (multi-select keyed by stable Session id, one call to the existing atomic bulk-update endpoint, no backend change). `T-FE-E.2` moves PARTIAL → COMPLETE; `FR-TS-3` moves Partially Complete → Fully Complete. Every "❌ Not Started" / "T-FE-E.2 not started" reference to Prescription Management, Session Scheduling, or Doctor Session Instructions below is superseded — see `RTM-MASTER.md`'s `[Updated 2026-07-27, T-FE-E.2a closure]` markers for the current state (frontend completion, Category A readiness list, Requirement Statistics).

> **[2026-07-28] `T-FE-E.3` CLOSED.** `TherapistDashboardScreen` already composed start/complete (pre-existing, discovered via Engineering Truth, not built this task); structured non-execution was genuinely missing and is now built (commit `302bccbf`). `T-FE-E.3` moves ❌ Not Started → ✅ Complete; `FR-TS-4`/`FR-TS-5` move Partially Complete → Fully Complete. Every "❌ Not Started" reference to Therapist Execution / `T-FE-E.3` below is superseded — see `RTM-MASTER.md`'s `[Updated 2026-07-28]` markers for current frontend completion and Requirement Statistics figures.



**As of:** 2026-07-27 (full reconciliation pass) · Backend `186f11f74c9ebd7986689a3919459ad69d446ea6` · Frontend `d69ade484d936cc2f819b40a15758ff22a7ce9d7`.

**Reconciliation note.** This document is fully rewritten this pass, not addended. Capabilities **#3 Workflow Engine** and **#4 Recommendation Engine** move from "Backend Complete, frontend not started" to **Complete** — `T-FE-B.1`, `T-FE-B.2`, `T-FE-D.1` had shipped without this document being updated (the same staleness `RTM-MASTER.md`'s reconciliation found). The task denominator is **88** (recomputed from zero, see `RTM-MASTER.md`'s Task Statistics), not the "80"/"38 remaining" figures this document previously used, which themselves predate 9 later amendment/split tasks. Phase 3's product-level MVP-decision reasoning (which capability is required vs. deferrable, and why) is preserved unchanged where the underlying facts didn't change — that reasoning is a judgment call, not a status fact, and remains valid.

---

## Phase 1 & 2 — Capability Definition and Assessment

The 44 requirements group into **15 product capabilities** (Living Documents and Mobile Polish already judged deferrable in the original pass; that judgment is unchanged here).

| Capability | Backend | Frontend | Tests | End-to-End | Status |
|---|---|---|---|---|---|
| **1. Clinical Workspace Shell & Briefing** (FR-COS-1, FR-COS-2, FR-VCC-1/2/3, FR-FLAG-1) | ✅ Complete | ✅ Complete | ✅ Unit | ❌ None exists | **Complete** — FR-COS-2's cross-cutting architecture proof (`T-Z.1`) has not run; every individual module is architecture-tested on its own |
| **2. Patient Safety Surface** (FR-VCC-4, FR-PS-1) | ✅ Complete | ✅ Complete | ✅ Unit incl. explicit negative-assertion test | ❌ None | **Complete** |
| **3. Workflow Engine** (FR-WFA-1, FR-WFA-2, FR-CR-1) | ✅ Complete | ✅ **Complete [Corrected — was stale]** (`T-FE-D.1`, commit `426967bb`; `T-FE-B.1`/`T-FE-B.2` render stages/next-action, commits `6e667d15`/`acfa730a`) | ✅ Unit+Architecture (BE+FE) | ❌ None | **Complete** — `FR-WFA-2`'s `T-FE-E.6` (multi-role rendering) remains, so the requirement-level card stays Partially Complete even though the core engine renders |
| **4. Recommendation Engine** (FR-REC-1, FR-REC-2) | ✅ Complete | ✅ **Complete [Corrected — was stale]** (`T-FE-B.2`, commit `acfa730a`) | ✅ Contract/semantics guard + FE unit/architecture/a11y | ❌ None | **Complete** |
| **5. Case Sheet Continuity** (FR-CS-1..6) | ✅ Complete | ✅ Complete (`T-FE-E.1a`/`T-FE-E.1b`, commits `0ed23f7`/`c93fddf`) | ✅ Unit+Integration (BE+FE) | ❌ None | **Complete** — FR-CS-6's amendment-reason half still depends on Living Documents |
| **6. Prescription Management** (FR-RX-1, FR-RX-2) | ✅ Complete (by omission) | ❌ Not Started | ✅ Pre-existing suite | ❌ None | **Backend Complete** — `T-FE-E.2` not started |
| **7. Treatment Recommendation & Plan** (FR-TR-1, FR-TP-1, FR-TP-2, FR-TP-3) | 🟡 Partial (creation done, versioning not — `T-BE-D.5`) | ❌ Not Started | ✅ Extensive unit/structural (89+ tests, BE only) | ❌ None | **Backend Complete for creation; Not Started for versioning + frontend** |
| **8. Session Scheduling** (FR-TS-1, FR-TS-2, FR-SCH-1, FR-SCH-2) | ✅ Complete and exposed (identity, intent-resolution, OCC, `resolve_scheduling_proposal`) | ❌ Not Started | ✅ 28+48+58+33+12 | ❌ None | **Backend Complete** — `T-FE-E.2` not started |
| **9. Doctor Session Instructions + Therapist Execution** (FR-TS-3, FR-TS-4, FR-TS-5) | ✅ Complete and exposed (`T-BE-E.3`/`E.4`/`E.4a`) | ❌ Not Started | ✅ 58+44+17 | ❌ None | **Backend Complete** — `T-FE-E.2` (instructions) + `T-FE-E.3` (execution) not started |
| **10. Living Documents** (FR-LD-1, FR-LD-2, FR-LD-3) | ❌ Not Started | ❌ Not Started | ❌ None | ❌ None | **Not Started** |
| **11. Billing Visibility** (FR-BILL-1, FR-BILL-2) | ✅ Complete | ❌ Not Started | ✅ Unit (BE only) | ❌ None | **Backend Complete** — `T-FE-E.4` not started |
| **12. Clinical History** (FR-HIST-1, FR-HIST-2) | ✅ Complete (`T-BE-A.3/A.4/A.5/A.3a/A.3b`) | ✅ Complete (`T-FE-C.5/C.6/C.7/C.6a`) | ✅ 1970 backend + 996 frontend, full suite | ❌ None | **Complete** — READY FOR MVP |
| **13. Role-Based Workflow** (FR-RBAC-1) | N/A | ❌ Not Started | ❌ None R7-specific | ❌ None | **Not Started** — `episodeWorkspaceConfig.ts` untouched by any R7 commit |
| **14. Legacy Navigation** (FR-LEG-1, FR-LEG-2) | N/A | ❌ Not Started | ❌ None | ❌ None | **Not Started** |
| **15. Mobile-First Presentation** (FR-MOB-1, FR-MOB-2) | N/A | 🟡 Partial (shell + `T-FE-B.1`'s pill-state rendering done; `T-FE-G.1`'s sticky/scroll polish not) | ✅ Shell + pill tests | ❌ None | **Partially Complete** |

**Cross-cutting fact repeated once: no End-to-End test of any kind exists anywhere in either repository, for any capability, and Group Z (release validation) has not run once.**

---

## Phase 3 — MVP Decision Per Capability (unchanged reasoning from the prior pass; facts re-verified, judgment preserved where facts didn't change)

Each answers exactly: *can NovaClinics ship its first Clinical Operating System MVP without this capability?*

### 1–2. Clinical Workspace Shell & Patient Safety — **YES, Required** (already Complete — costs nothing to enforce)

### 3. Workflow Engine — **YES, Required** — now **Complete**, not merely backend-complete. Decision 9's "Backend Owns Workflow Intelligence" is now fully realized end-to-end.

### 4. Recommendation Engine — **YES, Required** — now **Complete**. Decision 7's "recommend, never decide" interaction model is implemented and tested.

### 5. Case Sheet Continuity — **YES, Required** — Complete (Decision 1's F-1 fix).

### 6. Prescription Management — **YES, Required** — backend done; `T-FE-E.2` remains.

### 7. Treatment Recommendation & Plan — **YES, Required for creation; versioning (FR-TP-3) rides with capability #10's deferral** — the marquee new entity of R7, backend rigorously done, zero frontend surface.

### 8. Session Scheduling — **YES, Required** — without it, no actual multi-session therapy course can run; backend done, `T-FE-E.2` remains.

### 9. Doctor Session Instructions + Therapist Execution — **YES, Required** (the most negotiable "yes" in this list — see prior pass's caveat about a possible simplified-flow owner conversation, unchanged).

### 10. Living Documents — **NO, Defer to Post-MVP** — `design.md` §2.6 explicitly states this "R7 core ships without amendment (Group G defers cleanly)." Zero implementation exists on either side, consistent with a genuinely deferred capability, not neglect.

### 11. Billing Visibility — **YES, Required** — backend done and tested; one Medium frontend task remains.

### 12. Clinical History — **YES, Required** — now **Complete**. Decision 10's explicit "in R7, not R8" ratification is fully realized.

### 13. Role-Based Workflow — **YES, Required** — genuine dependency of Billing Visibility (#11) and Therapist Execution (#9); deferring it leaves those functionally unreachable for the roles that need them.

### 14. Legacy Navigation — **YES, Required** — the on-ramp; without it, existing entry points never reach the new workspace regardless of flag state.

### 15. Mobile-First Presentation (full polish) — **NO, Defer to Post-MVP** — shell already Complete and mobile-safe; remaining pieces are animation/scroll polish (`T-FE-G.1`/`T-FE-G.2`), concurring with `MVP-RELEASE-FREEZE.md` §4.

**Result: 13 of 15 capabilities are Required for MVP; 2 are cleanly deferrable (Living Documents — direct design-document textual permission; Mobile polish — cost/value judgment).** 6 of the 13 required capabilities are now fully Complete (up from 3 in the prior, stale pass); 7 remain — all 7 have their backend half done, and the frontend composition gap is the entire remaining engineering cost for 6 of them (Role-Based Workflow, Legacy Navigation, and the versioning half of Treatment Plan are the exceptions with real backend work still outstanding too).

---

## Phase 4 — Remaining Task Classification (all 23 not-started tasks, each exactly once; recomputed from zero against the 88-task denominator)

| Category | Definition | Count | Tasks |
|---|---|---|---|
| **A — Mandatory before Release, ready to start now** | Required capability, no remaining blocking dependency | 6 | `T-FE-E.2`, `T-FE-E.3`, `T-FE-E.4`, `T-FE-E.6`, `T-FE-F.1`, `T-FE-F.2`, `T-BE-G.1` *(7 — see note)* |
| **B — Mandatory before Release, blocked on Category A** | Required capability, waiting on another not-started task | 3 | `T-FE-F.3` (waits on `T-FE-E.2`), `T-BE-G.2`/`T-BE-D.5` (wait on `T-BE-G.1`) |
| **C — Release-validation gate** | Group Z, blocked by "all" per the dependency map | 9 | `T-Z.1`…`T-Z.9` |
| **D — Documentation only** | Produces no capability, only closure documentation | 1 | `T-Z.8` (also in Category C's Group Z — counted once, in C) |
| **E — Already Implemented / Superseded / Duplicate / Technical Debt** | — | 0 | None — every remaining task traces to a genuinely unstarted requirement obligation |
| **F — Post-MVP (deferred capability)** | Realizes a capability Phase 3 judged deferrable | 2 | `T-FE-G.1`, `T-FE-G.2` |
| **G — Post-MVP (frontend half of a deferred backend chain)** | `T-FE-E.5` realizes FR-LD-1/2's frontend half — deferred alongside Living Documents itself | 1 | `T-FE-E.5` |

**Note on Category A's count:** `T-BE-G.1` is listed in Category A (no blocking dependency — `T--1.2` is done) even though it realizes the Living Documents capability Phase 3 judged deferrable. This is a genuine tension worth naming: `T-BE-G.1`/`T-BE-G.2`/`T-BE-G.3`/`T-BE-D.5`/`T-FE-E.5` are **task-plan-mandatory** (no document defers the *task*) even though their **capability** (Living Documents) is product-deferrable per `design.md`'s own explicit permission. This document follows the capability-level product judgment for sequencing purposes (Living Documents tasks placed in the "Deferred" section of Phase 5 below), while `RTM-MASTER.md` follows the stricter task-plan-literal classification (all of them "Mandatory for MVP" per the frozen AC, never softened without an explicit owner decision). Both are internally consistent; they answer different questions ("what should ship first" vs. "what does the frozen plan require"), and the disagreement is reported, not resolved by fiat.

**Total: 7(A, incl. T-BE-G.1) + 3(B) + 9(C, incl. T-Z.8) + 3(F+G) = 22.** (23rd task, `T-BE-G.1`, already counted in A — the 23 NOT_STARTED tasks from `RTM-MASTER.md`'s Task Statistics map onto these categories with `T-BE-G.1` appearing once, in A.)

---

## Phase 5 — The Roadmap, Sorted by Implementation Order

### Roadmap Phase I — Ready now, no blocking dependency (parallel, lowest risk)
| Capability | Related Requirements | Remaining Tasks | Size | MVP/Post-MVP |
|---|---|---|---|---|
| Prescription + Treatment Recommendation + Plan (creation) + Session Scheduling + Doctor Session Instructions (compose) | FR-RX-1, FR-TR-1, FR-TP-1, FR-TS-1/2/3, FR-SCH-1 | `T-FE-E.2` | M (largest remaining single task) | MVP |
| Therapist Execution (compose) | FR-TS-4/5 | `T-FE-E.3` | M | MVP |
| Billing Visibility (compose) | FR-BILL-1/2 | `T-FE-E.4` | M | MVP |
| Role-Based Workflow | FR-RBAC-1 | `T-FE-E.6` | M | MVP |
| Legacy Navigation (start/consultation + completion redirects) | FR-LEG-1/2, FR-CR-1 | `T-FE-F.1`, `T-FE-F.2` | M+M | MVP |

### Roadmap Phase II — Depends on Phase I
| Capability | Related Requirements | Remaining Tasks | Size | MVP/Post-MVP | Dependency |
|---|---|---|---|---|---|
| Legacy Navigation (standalone entry redirects) | FR-LEG-2, FR-CS-1 | `T-FE-F.3` | M | MVP | `T-FE-E.2` (Phase I) |

### Roadmap Phase V — Release Gate (must be last)
| Capability | Related Requirements | Remaining Tasks | Size | MVP/Post-MVP |
|---|---|---|---|---|
| Release Readiness Proof | Cross-cutting (all) | `T-Z.1`…`T-Z.7`, `T-Z.9` | M×8 | MVP |
| Closure documentation | — | `T-Z.8` | M | MVP (documentation, may run alongside the rest of Phase V) |

### Deferred entirely (Post-MVP — may proceed independently whenever prioritized, does not block Phase I–V above)
| Capability | Related Requirements | Remaining Tasks | Size | MVP/Post-MVP |
|---|---|---|---|---|
| Living Documents | FR-LD-1/2/3, FR-TP-3 (versioning) | `T-BE-G.1`, `T-BE-G.2`, `T-BE-G.3`, `T-BE-D.5`, `T-FE-E.5` | L+M+S+L+M | Post-MVP (capability-level; task-plan-literal per `RTM-MASTER.md` remains "Mandatory" — see Phase 4's note) |
| Mobile-First Presentation (polish) | FR-MOB-1 (partial), FR-MOB-2 | `T-FE-G.1`, `T-FE-G.2` | M+M | Post-MVP |
