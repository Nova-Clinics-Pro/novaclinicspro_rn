# R7 — Design Freeze Checklist *(re-run: Final Blocker Resolution, 2026-07-17)*

**Purpose:** the gate between design and requirements authoring. **Authority:** [R7-OWNER-RATIFICATION.md](R7-OWNER-RATIFICATION.md) §Final Blocker Resolution.
**Baselines:** backend `dev` `8b23568` · frontend `dev` `cd86021` — unchanged. Documentation only.

## Blocker status — expected final result

```
F-1:                RESOLVED
F-2:                RESOLVED — Option A
Treatment Plan:     RESOLVED — first-class persisted, versioned entity
Session Missed:     RESOLVED at architecture level
PrescriptionStatus: DEFERRED CLEANUP, not blocking
```
✅ **All four Design-Freeze blockers from the prior run are closed.**

Legend: ✅ satisfied · 🟨 non-blocking (scheduled/deferred by design) · ⏳ deliberately deferred to requirements.

---

## Architecture

| # | Item | Status | Note |
|---|---|---|---|
| A1 | Frontend/backend responsibilities verified | ✅ | Backend = semantics; frontend = rendering. Stated once (design §Responsibility Split) |
| A2 | Workflow ownership verified | ✅ *(design)* · 🟨 *(code)* | Backend-owned (Decision 9). Live `buildSectionConfig()` violation = **ED-ARCH-006**, scheduled in Groups D/0 — a violation to remove, not a design |
| A3 | State ownership verified | ✅ | Business State / Workflow Progress / Next Action / Status Badge separated; all states backend-owned |
| A4 | Recommendation ownership verified | ✅ | `clinical_workflow_service` + pure `clinical_workflow_resolver`; no frontend `nextAction()` remains in design |
| A5 | Document lifecycle verified | ✅ · ⏳ | `DRAFT→FINAL→SIGNED→SUPERSEDED` ratified (Decision 2). Version/supersession **representation** → requirements; Group G defers cleanly (R7 core ships without amendment). `DocumentStatus` docstring contradiction closes in Group G |
| A6 | **Treatment architecture verified** | ✅ | **RESOLVED:** Plan = first-class persisted, versioned **entity**; projection **rejected**. Recommendation → Plan → stable Sessions (Schedule Attributes · Doctor Clinical Content · Therapist Execution Record). Session identity stable; `day_number` never identity |
| A7 | DP-15 (One Clinical Answer) stated and testable | ✅ | Design §DP-15 |
| A8 | Resolver+Service pattern formalized | ✅ | Precedents: `treatment_lifecycle_resolver`, `capability_resolver`, `clinical_semantic_resolution_service` |
| A9 | No third competing workspace | ✅ | COS lands on the existing `episodes/[episodeId]/workspace` route |

## Product

| # | Item | Status | Note |
|---|---|---|---|
| P1 | Patient lifecycle complete | ✅ | 28-row gap matrix incl. billing, advice, measurements, attachments |
| P2 | No workflow gaps | ✅ | Every gap has a treatment or an explicit R8 assignment |
| P3 | Capability-driven workflow | ✅ *(design)* · 🟨 *(code)* | Capability-gated by design (multi-session entitled to ayurveda **and physio**). Live specialty gating = ED-ARCH-006, scheduled |
| P4 | Clinic-type independence | ✅ | One assembly engine; specialty supplies **labels only** |
| P5 | Mobile reviewed | ✅ | Mobile-first Command Center; sticky next action; pill rail; ≥44pt |
| P6 | Billing reviewed | ✅ | Visible · doctor read-only · **warning, never blocking** (Decision 6) |
| P7 | **Patient safety** | ✅ **RESOLVED — Option A** | R7 shows only verified backend-owned signals; allergy/interaction/renal/hepatic → **R8**. Frontend must not fabricate/derive/interpret |
| P8 | Recommendation ≠ decision | ✅ | Decision 7; recommendation + reason + `[Something else ▾]` |

## State Model

| # | Item | Status | Note |
|---|---|---|---|
| S1 | All owner decisions reflected | ✅ | Decisions 1–9 + Final Blocker Resolution present across the set |
| S2 | One Clinical Answer rule satisfied | ✅ *(design)* · 🟨 *(code)* | DP-15 stated; 3 live violations recorded (ED-ARCH-004/006) and scheduled |
| S3 | State definitions synchronized | ✅ | Prescription `DRAFT→FINAL→SIGNED`; `ISSUED`/`DISPENSED` appear only as explicit negations. Treatment Plan semantic stages frozen |
| S4 | Interaction matrix synchronized | ✅ | Document lifecycle · billing · amendment · per-Episode case sheet |
| S5 | States needing spelling | ⏳ **by design** | Plan lifecycle spelling · `Missed` decomposition spelling · Appointment `CONFIRMED` meaning → **requirements task** (owner-directed). ⚠ Do **not** reuse the R4 11 statuses without semantic-fit verification (verified: execution statuses, not Plan lifecycle) |

## Engineering

| # | Item | Status | Note |
|---|---|---|---|
| E1 | Task plan synchronized | ✅ | Group -1 exit gate satisfied; A-BE carries atomicity/idempotency/validation; E-BE is now **schema-bearing** |
| E2 | Architecture debt recorded | ✅ | ED-ARCH-001…006, both repos, each with problem/why/impact/modules/blocking/remediation |
| E3 | Blocking debt identified | ✅ | **001, 004, 006** blocking *implementation*; 002, 003, 005 non-blocking |
| E4 | R7/R8 boundary verified | ✅ | R8 = lab, attachments, adapters, trends, Clinical Advice, copy-forward, medication reconciliation, **allergy modelling** |
| E5 | **No unresolved document contradictions** | ✅ | 8-point sweep run; **2 stale items found and fixed this pass** (see below) |
| E6 | Permission codes verified | ⏳ | Proposed names; T-0.2 verifies vs `org_permissions` before Group H |
| E7 | **Migration posture** | ✅ *(recorded)* | ⚠ **R7 now requires ≥1 additive migration** (Treatment Plan entity + versioning). Earlier "no schema change" is **superseded**. Additive + reversible; no `appointment_id`/`episode_id` nullability change in R7 |

## Implementation Readiness

| # | Item | Status |
|---|---|---|
| I1 | Ready for Group -1 | ✅ — exit gate **satisfied** |
| I2 | Ready for requirements authoring | ✅ |
| I3 | No implementation performed | ✅ |
| I4 | No branches / worktrees | ✅ |
| I5 | No commits | ✅ |
| I6 | No migrations | ✅ |
| I7 | No schema changes | ✅ |

---

## Contradiction sweep (8 required checks)

| Check | Result |
|---|---|
| per-visit Case Sheet | ✅ clean — only historical/corrected records |
| contribution derived from creation appointment | ✅ clean — appears only as the **defect being fixed** and its prohibition |
| silent contribution omission | ✅ clean — appears only as **prohibited** behaviour |
| **Treatment Plan as projection** | ✅ **fixed this pass** — checklist A6/§Verdict and gaps G-D still listed it as *open*; now marked **RESOLVED: entity** |
| schedule as clinical intent | ✅ clean |
| session regeneration during rescheduling | ✅ clean — only as "not permitted as a concept" / the rejected flow's fatal property |
| frontend-derived Treatment Plan | ✅ clean — only as AC-15 prohibition |
| specialty-gated multi-session therapy | ✅ clean — only as ED-ARCH-006 code evidence and the corrected design |

**Also fixed this pass:** gaps **G-E** (`Missed`) still listed as *undecided* → marked **RESOLVED**; **F-1/F-2** entries updated from *blocking* to **RESOLVED** (F-1's defect remains live in **code** — Group A-BE fixes it — but the **decision** is frozen).

**Historical descriptions of corrected errors are retained deliberately** and are clearly labelled as historical/rejected/evidence — per the freeze rule permitting them.

---

## Verdict

# R7 DESIGN IS READY FOR FREEZE AND REQUIREMENTS AUTHORING.

All four prior blockers are resolved: **F-1** (Episode binding · current-Visit attribution · creation-provenance `appointment_id` · atomic · idempotent), **F-2 = Option A**, **Treatment Plan = first-class persisted versioned entity**, **`Missed` = schedule state + execution outcome + structured reason**. `PrescriptionStatus` is deferred cleanup, explicitly not a blocker.

**Everything still open is open *by design*, and none of it makes the architecture ambiguous:**
- **Deliberately deferred to requirements** (owner-directed): Plan-lifecycle spelling · `Missed` decomposition spelling · Appointment `CONFIRMED` meaning · idempotency key · supersession representation · disposition of the legacy free-text `tenant_visits.treatment_plan` column.
- **Scheduled implementation work, not design ambiguity:** ED-ARCH-001/004/006 — these are *why* Groups 0 and D exist.
- **Verified in Group 0:** exact permission codes.

**Two consequences the freeze records honestly, neither blocking:**
1. **R7 now requires an additive migration** — verified: no Treatment Plan entity exists; "treatment plan" is today a free-text `TEXT` column on `tenant_visits`. The earlier "no schema change in core design" is **superseded**. The migration is additive and reversible.
2. **Naming collision for requirements to resolve:** `tenant_visits.treatment_plan` (TEXT) vs the new Plan entity — implementers must never confuse them.

**Recommended next activity:** author the formal R7 requirements from this frozen architecture. Do not reopen Decisions 1–9 or the Final Blocker Resolution unless Engineering Truth proves a direct contradiction that makes the model impossible.

---

# v1.1 Amendment Re-Verification *(2026-07-18 — Clinical History Hierarchy, `FR-HIST-1`/`FR-HIST-2`, Decision 10)*

Re-run against the amended scope only — Decisions 1–9 and the Final Blocker Resolution are **not reopened**.

| Check | Result |
|---|---|
| Backend ownership preserved | ✅ — encounter classification, Plan-to-session association, aggregates, legacy classification all backend-owned (FR-HIST-1/2, design.md §2.1a) |
| DP-15 preserved | ✅ — history is one authoritative backend projection on the existing Clinical Workspace aggregate, not a second competing source; frontend structurally cannot produce a different grouping (FR-HIST-2 AC10) |
| Frontend derivation removed | ✅ — `T-FE-C.5` explicitly removes `useClinicalTimelineData`'s local `completedSessionCount` computation (the verified ED-ARCH-007 defect); architecture test extends the T-0.8/T-0.9 "no FE clinical derivation" pattern to this file |
| R7/R8 boundary still coherent | ✅ — history hierarchy is COS core (viewing existing patient course data); no lab/measurement/trend/AI content introduced; Decision 10's own rationale states this explicitly |
| No advanced trends/labs/advice moved into R7 | ✅ — verified: `R7-HISTORY-HIERARCHY-AMENDMENT.md` and all amended documents cite only `appointment_type`, `treatment_lifecycle_resolver` states, and `treatment_sheet_row` facts — all already-R7-scoped signals, nothing R8-deferred |
| Task plan remains implementation-ready | ✅ — 7 new atomic tasks added (`T-BE-A.3/A.4/A.5`, `T-FE-C.5/C.6/C.7`, `T-Z.9`), each with Files/Blocked-by/AC/Tests/Rollback; no existing task renumbered; 70→77 |
| Treatment Plan dependency explicit | ✅ — `T-BE-A.3` blocked by `T-BE-D.4`/`T-BE-E.1`; design.md §7 Sequencing and the traceability matrix's critical path both state this as a hard dependency, not an assumption |
| No contradiction remains | ✅ — 3-file contradiction sweep (requirements.md/design.md/tasks.md counts cross-checked: 44 requirements, 77 tasks, both internally consistent); the pre-existing `A-BE`/`BE Group A` lettering mismatch in `requirements-traceability-matrix.md` was found and **flagged explicitly**, not silently resolved (out of this amendment's scope — predates it) |

**Additional verification specific to this amendment:**
- **Legacy data-audit gate honored.** No automatic Sheet→Plan backfill is designed or scheduled; `T-BE-A.4` is explicitly blocked on the (not-yet-performed) cardinality audit, per FR-HIST-2's own "no automatic legacy backfill without a verified cardinality/data audit" rule.
- **Sequencing does not block unrelated work.** Group -1's remaining tasks (T--1.4 onward) do not depend on this amendment; verified by inspecting their own `Blocked by` fields, none of which reference the new tasks.
- **Debt correctly attributed, not duplicated.** `ED-ARCH-007` is a new debt item (neither `ED-ARCH-004` nor `ED-ARCH-006` accurately owns `useClinicalTimelineData`'s session-count defect — different files, different concerns) — recorded in both repos' `ENGINEERING-DEBT.md`, mapped to `T-FE-C.5`/`T-BE-A.5` via `ED-DEP-7`.

## Verdict (amended scope)

# R7 DESIGN REMAINS FROZEN AS AMENDED.

The v1.1 amendment adds `FR-HIST-1`/`FR-HIST-2` and Decision 10 without reopening any prior decision, without introducing R8 scope, and without weakening backend clinical-truth ownership or DP-15. The amendment is fully sequenced (hard-dependent on Treatment Plan/Sessions), fully traced (requirements → design → tasks → traceability matrix, all four updated consistently), and its one newly-discovered architectural violation (`ED-ARCH-007`) is recorded, not silently fixed or silently ignored.
