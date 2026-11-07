# R7 — Requirements Traceability Matrix

**Companion to** [`requirements.md`](requirements.md) (same directory). **Status:** Draft, not approved. Documentation only.

**Why one file, not two.** Each requirement already carries its principles/decisions/dependencies inline, so a second "requirements-to-task-mapping" document would mostly duplicate it. What is *not* available inline is (a) a compact index, (b) the **reverse** direction — task group → requirements — and (c) **two-way coverage proof**. This file provides exactly those three and nothing else, per "do not create documentation for its own sake."

**Counts:** **44** functional requirements (42 original + `FR-HIST-1`/`FR-HIST-2`, v1.1 amendment, 2026-07-18) · 8 architecture constraints · **7** engineering-debt gates (+`ED-DEP-7`) · 5 Engineering Truth Exceptions.

> **v1.1 amendment note.** This matrix predates `tasks.md`'s final group lettering in one respect, worth stating rather than silently papering over: §1/§2 below use an earlier `A-BE`/`B-BE`/`C-BE`… naming scheme where, e.g., **`B-BE` here = `BE Group A` (Clinical Workspace Aggregate) in `tasks.md`**. This mismatch predates this amendment and is not fixed here (out of this amendment's narrow scope). The new `FR-HIST-1`/`FR-HIST-2` rows below cite **exact `tasks.md` task IDs directly** (`T-BE-A.3` etc.) to avoid adding a second ambiguity on top of the first.

---

## 1. Requirement → Principle · Decision · Design doc · Task group

Principles: `P1` Backend Owns Clinical Truth · `P2` Backend Owns Workflow Intelligence · `P3` DP-15 · `P4` One Case Sheet/Episode · `P5` Append-only Contributions · `P6` Supersession · `P7` Recommend+Deviate · `P8` Capability-driven · `P9` Frontend presentation only.

| Req | Title | Principles | Decisions | Design source | Group |
|---|---|---|---|---|---|
| FR-COS-1 | One workspace on the existing route | P9 | D8 | DESIGN §5 | B-FE |
| FR-COS-2 | Frontend derives no clinical meaning | P1,P2,P3,P9 | D9 | DESIGN §DP-15 | D-FE, 0 |
| FR-VCC-1 | Briefing, not a form | P1,P9 | D7,D8 | DESIGN §4a; WIREFRAMES W0 | B-FE, C-FE |
| FR-VCC-2 | "Why today" | P1 | D8 | WIREFRAMES W0 | C-FE *(ETX-3)* |
| FR-VCC-3 | "What changed" (R7 scope) | P1,P2 | D8 | DESIGN §4a; RATIFICATION D8 | C-BE, C-FE |
| FR-VCC-4 | "Before you act" (R7 scope) | P1,P9 | **F-2** | RATIFICATION §Patient-Safety | C-BE, C-FE |
| FR-WFA-1 | Backend assembles the workflow | P2,P3,P8 | D9 | DESIGN §4b | **D-BE** |
| FR-WFA-2 | Permissions gate actionability, not presence | P2,P3 | D9 | DESIGN §4b | D-BE, H |
| FR-CS-1 | One Case Sheet per Episode | P4 | D1 | RATIFICATION D1 | A-BE, A-FE |
| FR-CS-2 | Contribution → **current** Visit | P4,P5 | **F-1** | RATIFICATION §F-1 | **A-BE** |
| FR-CS-3 | Atomic content + contribution | P5 | **F-1** | RATIFICATION §F-1 | **A-BE** |
| FR-CS-4 | Idempotent contribution | P5 | **F-1** | RATIFICATION §F-1 | A-BE *(VP)* |
| FR-CS-5 | Append-only visit notes surface | P5 | D1 | GAP-MATRIX row 5b | A-FE |
| FR-CS-6 | Audit | P5 | D1 | STATE-DEFS §4 | A-BE |
| FR-LD-1 | Signed immutable; documents amendable | P6 | D2 | RATIFICATION D2 | **G** |
| FR-LD-2 | Amendment permissions | P1 | D2 | STATE-DEFS §4 | G, H *(ETX-1)* |
| FR-LD-3 | Close `DocumentStatus` docstring contradiction | P6 | D2 | RATIFICATION D2 | G |
| FR-RX-1 | Verified document lifecycle only | P1 | **D3** | RATIFICATION D3 | D-FE, A-BE |
| FR-RX-2 | Copy-forward not in R7 | — | D5 | RATIFICATION D5 | **[R8]** |
| FR-TR-1 | Recommendation is a proposal | P8 | D8 | TREATMENT-MODEL §2 | E-BE, E-FE |
| FR-TP-1 | **Plan = first-class persisted entity** | P1,P3,P6 | **Plan** | RATIFICATION §Treatment Plan | **E-BE** ⚠migration |
| FR-TP-2 | Plan lifecycle stages frozen, spelling deferred | P6 | Plan | STATE-DEFS §7 | E-BE *(VP)* |
| FR-TP-3 | Amendment vs schedule change | P6 | Plan, D2 | TREATMENT-MODEL §2 | E-BE, G |
| FR-TS-1 | Stable session identity | P1 | Plan | TREATMENT-MODEL §1,§4 | E-BE |
| FR-TS-2 | Schedule attributes | P1 | Plan | TREATMENT-MODEL §1 | E-BE |
| FR-TS-3 | Doctor content bound to identity | P1 | Plan | TREATMENT-MODEL §1,§6 | E-BE, E-FE |
| FR-TS-4 | Therapist execution record | P1,P6 | Plan | TREATMENT-MODEL §1 | E-BE, E-FE |
| FR-TS-5 | "Missed" decomposed | P1,P3 | **Missed** | RATIFICATION §Missed | E-BE *(VP)* |
| FR-SCH-1 | Scheduling intents (incl. PRN, review-dependent) | P8 | Plan | TREATMENT-MODEL §3 | E-BE |
| FR-SCH-2 | Synchronization semantics | P1 | Plan | TREATMENT-MODEL §5 | E-BE |
| FR-BILL-1 | Billing visible, doctor read-only | P8 | **D6** | RATIFICATION D6 | F-BE, F-FE |
| FR-BILL-2 | Clinical ≠ financial completion | — | D6 | RATIFICATION D6 | F-BE, D-BE |
| FR-REC-1 | Backend owns the recommendation | P2,P3 | **D9** | RATIFICATION D9 | **D-BE** |
| FR-REC-2 | Recommend, never decide | P7 | **D7** | RATIFICATION D7 | D-FE |
| FR-CR-1 | Backend owns completion readiness | P1,P2,P3 | D9 | DESIGN §4a | **D-BE** |
| FR-PS-1 | R7 surfaces only verified signals | P1 | **F-2** | RATIFICATION §Patient-Safety | C-BE, C-FE |
| FR-MOB-1 | Mobile-first Command Center | P9 | D8 | WIREFRAMES W0-m | B-FE, D-FE |
| FR-MOB-2 | Workflow pills | P9 | D8 | WIREFRAMES §pills | D-FE |
| FR-LEG-1 | No screen deleted in R7 | — | D8 | LEGACY-PLAN | **I** |
| FR-LEG-2 | Redirects | — | D8 | LEGACY-PLAN | I |
| FR-FLAG-1 | Flag-gated and reversible | AC-6 | D8 | FEASIBILITY | 0, all |
| FR-RBAC-1 | Role-aware composition | P1,P9 | D8 | DESIGN §11 | **H** *(ETX-1)* |
| **FR-HIST-1** *(v1.1)* | Consultation/therapy history separation | P1,P2,P3,P9 | **D10** | design.md §2.1a, §3 | `T-FE-C.5/C.6/C.7` |
| **FR-HIST-2** *(v1.1)* | Backend hierarchical history contract | P1,P2,P3 | **D10** | design.md §2.1a | `T-BE-A.3/A.4/A.5` |

---

## 2. Task group → Requirements (reverse coverage)

| Group | Requirements delivered | Notes |
|---|---|---|
| **-1** Ratification freeze | *(gate)* — all | Exit gate satisfied |
| **0** ET, baseline, blocking remediation | FR-COS-2, FR-FLAG-1; **ED-DEP-1**; resolves **ETX-1, ETX-3** | Blocking gate for all FE composition |
| **A-BE** Case Sheet contract | FR-CS-1..4, FR-CS-6, FR-RX-1 | **F-1 fix**; FR-CS-3 is **Small** (guard removal — mechanism exists ✅) |
| **A-FE** Episode sheet + visit notes | FR-CS-1, FR-CS-5 | depends A-BE |
| **B-BE** COS aggregate + assembly facts | FR-WFA-1 (facts), FR-VCC-3 | |
| **B-FE** Command Center foundation | FR-COS-1, FR-VCC-1, FR-MOB-1 | flag `cos_v1` |
| **C-BE** Existing clinical context | FR-VCC-3, FR-VCC-4, FR-PS-1 | **scope set by F-2 = Option A** |
| **C-FE** Why/What changed/Before you act | FR-VCC-2..4, FR-PS-1 | must not surface unbacked safety |
| **D-BE** Workflow intelligence | **FR-WFA-1, FR-WFA-2, FR-REC-1, FR-CR-1, FR-BILL-2** | pure resolver + service; **ED-DEP-2/3** |
| **D-FE** Render pills + recommendation | FR-COS-2, FR-REC-2, FR-MOB-2, FR-RX-1 | **hard-depends on D-BE** |
| **E-BE** Plan, sessions, scheduling | **FR-TP-1..3, FR-TS-1..5, FR-SCH-1..2, FR-TR-1** | ⚠ **schema-bearing** (additive migration) |
| **E-FE** Treatment experience | FR-TR-1, FR-TS-3, FR-TS-4 | author-once-apply-to-many |
| **F-BE** Billing contract | FR-BILL-1, FR-BILL-2 | reuses verified spine ✅ |
| **F-FE** Billing stage | FR-BILL-1 | doctor read-only |
| **G** Living-document supersession | **FR-LD-1..3, FR-TP-3** | schema; **data-shaped rollback required** |
| **H** Role/permission/capability | FR-RBAC-1, FR-WFA-2, FR-LD-2 | gated on **ETX-1** |
| **I** Legacy redirects | FR-LEG-1, FR-LEG-2 | completion route gated on **ED-DEP-2** |
| **J** COS workflow proof | all | end-to-end |
| **K** R8 handoff | FR-RX-2 + `[R8]` markers | |
| **Z** Architecture/closure | AC-1..8 | layer audit clean |
| **History hierarchy** *(v1.1, tasks.md exact IDs)* | FR-HIST-1, FR-HIST-2 | `T-BE-A.3/A.4/A.5` (BE, extends Clinical Workspace aggregate) · `T-FE-C.5/C.6/C.7` (FE, extends `ClinicalTimeline`) · `T-Z.9` (proof) — **hard-depends on `T-BE-D.4`/`T-BE-E.1`** (Treatment Plan/Sessions) |

---

## 3. Coverage proof

- **Every requirement maps to ≥1 group** ✅ (**44/44**; FR-RX-2 maps to R8 by design — it is a *negative* requirement: "not in R7"; FR-HIST-1/2 → the History-hierarchy row above).
- **Every group maps to ≥1 requirement** ✅ (Group -1 is a gate over all; Group Z covers AC-1..8; the History-hierarchy chain covers FR-HIST-1/2).
- **Every owner decision is realized** ✅: D1→FR-CS-1/2 · D2→FR-LD-1..3 · D3→FR-RX-1 · D4→[R8] · D5→FR-RX-2 · D6→FR-BILL-1/2 · D7→FR-REC-2 · D8→boundary + FR-VCC-3 · D9→FR-WFA-1/FR-REC-1/FR-CR-1 · **D10→FR-HIST-1/2 (v1.1)** · F-1→FR-CS-2/3/4 · F-2→FR-VCC-4/FR-PS-1 · Plan→FR-TP-1..3 · Missed→FR-TS-5.
- **Every principle is enforced by ≥1 requirement** ✅: P1(14) P2(7) P3(8) P4(3) P5(5) P6(5) P7(1) P8(5) P9(8) *(counts updated for FR-HIST-1: P1,P2,P3,P9; FR-HIST-2: P1,P2,P3)*.
- **Every ED gate binds ≥1 group** ✅: ED-DEP-1→0/all FE · ED-DEP-2→D-BE/I · ED-DEP-3→D-BE/D-FE · ED-DEP-4→C-* · ED-DEP-5→A-BE/D-FE · ED-DEP-6→D-BE · **ED-DEP-7→T-BE-A.5/T-FE-C.5 (v1.1)**.
- **Every ETX has an owning group** ✅: ETX-1→0/H · ETX-2→A-BE · ETX-3→0/C-FE · ETX-4→D-BE · ETX-5→E-BE.

## 4. Critical path

```
-1 (gate, satisfied) → 0 (ED-ARCH-001 remediation, ETX-1/ETX-3)
   → A-BE (F-1: attribution + atomicity + idempotency)  → A-FE
   → B-BE → B-FE
   → C-BE (F-2 Option A scope) → C-FE
   → D-BE (assembly + recommendation + readiness)  → D-FE  [hard dependency]
   → E-BE (Plan entity ⚠migration + sessions + scheduling) → E-FE
                                                             └─► T-BE-A.3/A.4/A.5 (history hierarchy BE) [v1.1]
                                                                    └─► T-FE-C.5/C.6/C.7 (history hierarchy FE) → T-Z.9
   → F-BE → F-FE → G (schema; deferrable) → H → I → J → K → Z
```
**Hard blocks:** ED-DEP-1 blocks all FE composition · ED-DEP-2 blocks Group I's completion route · ED-DEP-3 blocks FE workflow rendering · D-FE cannot precede D-BE (no interim FE derivation) · **T-BE-A.3 cannot precede `T-BE-D.4`/`T-BE-E.1` (v1.1 — history hierarchy hard-depends on Treatment Plan/Sessions).**
