# R7 — Clinical Operating System · Requirements

**Version:** 1.1 — **FROZEN** (amended 2026-07-18) · **Original freeze:** 2026-07-17
**Status:** ✅ **FROZEN AT v1.1.** Implementation specification authored **from the frozen architecture**. No architecture was reinterpreted.

> ## REQUIREMENTS FREEZE — v1.1 (amended)
> These **44 requirements** (42 original + `FR-HIST-1`/`FR-HIST-2`, added 2026-07-18 by owner-approved controlled amendment) are **frozen** and are the authority for `design.md` and `tasks.md`.
> **Design must implement these requirements — not reinterpret, extend, or narrow them.**
> Changing a frozen requirement requires returning to the requirements-approval process; it is **not** a design-time decision.
> The five **Engineering Truth Exceptions (§19)** and the marked **[VP]** verification points are the *only* sanctioned places where implementation resolves detail — and each names its owning group.
> **v1.1 amendment record:** owner-approved 2026-07-18. Added `FR-HIST-1` (Clinical History Separates Consultations from Therapy Encounters) and `FR-HIST-2` (Backend-Owned Hierarchical Clinical History Contract) — §22. **No existing requirement (FR-COS-1 … FR-RBAC-1) was reinterpreted, narrowed, or renumbered.** Amendment scope limited strictly to the clinical-history hierarchy gap identified in [R7-HISTORY-HIERARCHY-AMENDMENT.md](R7-HISTORY-HIERARCHY-AMENDMENT.md); rejected alternative (defer to R8) recorded in `R7-OWNER-RATIFICATION.md` Decision 10.
> **Downstream status:** `design.md` amended to §2.1a/§3 · `tasks.md` amended (+7 tasks, 70→77) · both re-approved under this amendment.
**Authority (constitutional, frozen — must not be reopened):** [R7-OWNER-RATIFICATION.md](R7-OWNER-RATIFICATION.md) · [R7-DESIGN-FREEZE-CHECKLIST.md](R7-DESIGN-FREEZE-CHECKLIST.md) · [R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md](R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md) · [R7-TREATMENT-SCHEDULING-MODEL.md](R7-TREATMENT-SCHEDULING-MODEL.md) · [R7-STATE-DEFINITIONS.md](R7-STATE-DEFINITIONS.md) · [R7-WIREFRAME-IMPACT-MATRIX.md](R7-WIREFRAME-IMPACT-MATRIX.md) · [R7-GUIDED-WORKSPACE-WIREFRAMES.md](R7-GUIDED-WORKSPACE-WIREFRAMES.md) · [R7-PATIENT-LIFECYCLE-GAP-MATRIX.md](R7-PATIENT-LIFECYCLE-GAP-MATRIX.md) · [R7-FEASIBILITY-AND-IMPACT.md](R7-FEASIBILITY-AND-IMPACT.md)
**Baselines verified:** backend `dev` `8b23568` · frontend `dev` `cd86021`. Every current-code claim below is verified; unverified items are marked **[VP]** (verification point) or raised as an **Engineering Truth Exception**.

**Principles every requirement obeys** (violation = defect, not a trade-off):
`P1` Backend Owns Clinical Truth · `P2` Backend Owns Workflow Intelligence · `P3` **DP-15 One Clinical Answer** · `P4` One Case Sheet per Episode · `P5` Append-only Visit Contributions · `P6` Living Document Supersession · `P7` Recommendation with Easy Deviation · `P8` Capability-driven workflow · `P9` Frontend presentation only.

**Owner decisions:** `D1`…`D9`, **`D10`** (Clinical History Hierarchy — amendment) + `F-1`, `F-2 = Option A`, Treatment Plan = entity, `Missed` decomposition, `PrescriptionStatus` deferred.

**Legend:** ✅ verified in code · **[VP]** verification point for implementation · **[R8]** deferred, integration point only.

---

## 0. Architecture Constraints (binding on every requirement)

| ID | Constraint | Rationale |
|---|---|---|
| **AC-1** | Backend: `Routers → Services → Repositories → ORM/DB/External`. No DB/ORM in routers; no business-data SQLAlchemy in services; no repository bypass. | `CLAUDE.md`, ED-ARCH-001 |
| **AC-2** | Frontend: `Presentation → Application → Domain Repo Interfaces → Infra Repos → Datasources/HTTP`. Presentation never touches `axiosClient`/datasources. | `CLAUDE.md`, ED-ARCH-001 |
| **AC-3** | Domain modules import nothing from `app.infrastructure` / `app.api` / a session — even transitively. | `capability_resolver` precedent |
| **AC-4** | Backend returns **semantics only** — state codes + localization keys. Never colours, icons, layout, or UI labels. | `D9`, R5/R6 precedent |
| **AC-5** | Every clinical question has **exactly one** backend answer; the frontend must be structurally incapable of producing a different one. | `P3` DP-15 |
| **AC-6** | All R7 behaviour is **flag-gated and reversible**; flag-off restores today's behaviour with no data effect. | R4–R6 precedent |
| **AC-7** | Workflow presence is gated by **capability**, never by clinic type/specialty. Specialty supplies **labels only**. | `P8`, `D8` |
| **AC-8** | Additive-only: no existing clinical table altered; no existing API contract broken. | R4–R6 posture |

---

## 1. Clinical Operating System (COS)

### FR-COS-1 — The COS is one workspace on the existing route
**Rationale.** Two workspaces already exist (`ConsultationWorkspaceScreen`, `EpisodeWorkspaceScreen` ✅). A third surface would recreate the duplication R7 exists to remove.
**Functional.** The COS renders on the **existing** `app/clinic-admin/episodes/[episodeId]/workspace.tsx` route ✅, behind flag `cos_v1`. It composes existing modules; it replaces none in R7.
**AC.** (1) No new workspace route is created. (2) Flag-off renders today's behaviour exactly. (3) All existing workspace tests stay green.
**Edge/Failure.** Invalid/absent context → explicit "cannot open workspace" state, never blank or wrong-record (wireframe W30).
**RBAC.** Route access unchanged; content role-composed (FR-RBAC-1).
**Backend.** none. **Frontend.** new shell composing existing components. **API.** none. **DB/Migration.** none. **Rollback.** flag off.
**Tests.** flag-on/off parity; existing suites green. **Depends.** FR-FLAG-1, ED-DEP-1. **Decisions.** D8. **Principles.** P9.

### FR-COS-2 — Frontend derives no clinical meaning
**Rationale.** Three live violations verified (ED-ARCH-004, ED-ARCH-006 A/B).
**Functional.** No R7 frontend code may derive workflow, recommendation, completion readiness, clinical summary, or interpret clinical content. It renders backend semantics.
**AC.** (1) Static check: no R7 FE module computes recommendation/assembly/completion. (2) Every clinical statement rendered traces to a backend field. (3) Absence is **never** rendered as a negative clinical finding.
**Failure.** Backend contract unavailable → explicit "unable to verify current clinical state"; **never** a locally-derived substitute.
**Backend.** owns all of it. **Frontend.** render only. **Rollback.** flag off.
**Tests.** architecture test asserting no FE derivation in R7 modules. **Depends.** FR-REC-1, FR-CR-1, ED-DEP-2/3. **Principles.** P1, P2, P3, P9.

---

## 2. Visit Command Center (VCC)

### FR-VCC-1 — The workspace opens on a briefing, not a form
**Rationale.** Design §4a. A clinician needs situational awareness before data entry.
**Functional.** Landing state answers: why today · what changed · before you act · recommended next · workflow pills · billing status. Forms open **from** the briefing (recommendation or pill), never as the landing state.
**AC.** (1) Landing renders no editable clinical form. (2) All six regions present or explicitly empty-stated. (3) One tap from briefing to the recommended task.
**Edge.** No purpose recorded → region shows "not recorded", never a guess. Long history → virtualized, filtered to the active episode.
**RBAC.** Regions role-composed; read-only roles see content, not mutations.
**Backend.** FR-CR-1 contract. **Frontend.** new `VisitCommandCenter`. **API.** workspace-state read. **DB.** none. **Rollback.** flag.
**Tests.** region rendering; empty states; role variants. **Depends.** FR-CR-1. **Decisions.** D7, D8. **Principles.** P1, P9.

### FR-VCC-2 — "Why today"
**Functional.** Renders appointment purpose + patient-stated concern from backend fields.
**AC.** (1) Purpose rendered when present. (2) Absent → "not recorded". (3) Never inferred from other data.
**[VP]** *Appointment "purpose" and "patient-stated concern" fields are **not yet verified to exist**.* → **ETX-3**.
**Backend.** must expose or model. **Frontend.** render. **Principles.** P1.

### FR-VCC-3 — "What changed" (R7 scope only)
**Rationale.** D8 limits R7 to currently available data.
**Functional.** Renders **only**: last visit date · latest visit summary · active treatment sessions · completed session count · pending review · current prescription existence/status · active episode · billing state.
**AC.** (1) Only the eight listed signals. (2) **No measurement deltas** (R8). (3) Each traces to a verified backend source. (4) Deltas computed **backend-side** (P2).
**[R8]** measurement trends — integration point only.
**Backend.** delta computation. **Frontend.** render. **Principles.** P1, P2.

### FR-VCC-4 — "Before you act" (R7 scope only)
**Rationale.** **F-2 = Option A.** Verified: allergies/interactions/renal **do not exist** in the backend.
**Functional.** Renders **only** verified-existing safety signals: pending clinical reviews ✅ · active prescription status ✅ · active episode ✅ · session progress ✅.
**AC.** (1) **No allergy, interaction, renal or hepatic panel is rendered in R7.** (2) No unbacked safety field is displayed — an empty safety field is prohibited (false clinical negative). (3) Absence of a panel is not presented as "no known findings".
**[R8]** allergy/intolerance/interaction/renal/hepatic/contraindication modelling — R8, backend-first.
**Rollback.** flag. **Tests.** assert no allergy/renal panel renders. **Depends.** ED-DEP-4 (ED-ARCH-003). **Decisions.** F-2. **Principles.** P1, P9.

---

## 3. Dynamic Workflow Assembly

### FR-WFA-1 — The backend assembles the workflow
**Rationale.** `D9`, `P2`. Verified violation: `buildSectionConfig()` assembles in the frontend (ED-ARCH-006/A).
**Functional.** A backend **`clinical_workflow_resolver`** (pure domain) assembles the applicable stages from: enabled capabilities · appointment purpose · episode state · existing clinical records · treatment state · clinician decisions · role permissions · billing state. A **`clinical_workflow_service`** (application) gathers facts and invokes it.
**AC.** (1) GP assembles `Consult → Visit Update → Rx (if needed) → Advice [R8] → Billing → Complete`. (2) Ayurveda/Physio assemble therapy stages **when the capability is entitled** — never by clinic name. (3) A follow-up with no changes assembles `Consult → Visit Update → Continue Plan → Billing → Complete`. (4) A therapist session assembles `Review Instructions → Deliver → Record Actuals → Complete`. (5) **No fixed canonical order exists anywhere.** (6) Steps absent when inapplicable — not rendered as permanent grey unless genuinely useful.
**Edge.** Capability revoked mid-episode → **[VP]** behaviour undefined; requirements-time decision (**ETX-4**).
**Failure.** Assembly unavailable → workspace shows explicit unavailable state; **no frontend fallback assembly**.
**Backend.** new resolver (pure) + service. **Frontend.** render only. **API.** workflow contract. **DB.** none. **Rollback.** flag.
**Tests.** resolver unit tests **without a DB** (per `treatment_lifecycle_resolver`/`capability_resolver` precedent ✅), one per assembly example; architecture test (resolver imports no infrastructure).
**Depends.** ED-DEP-3. **Decisions.** D9. **Principles.** P2, P3, P8.

### FR-WFA-2 — Permissions gate actionability, not presence
**Functional.** A stage the role may not act on renders as **waiting-on-role**, never hidden — otherwise a doctor cannot see the patient is blocked on admin.
**AC.** (1) Non-actionable stage visible with owner named. (2) Actionability derives from backend `blocking_factors`/`waiting_role`, **not** from `episodeWorkspaceConfigByRole` ✅ (which may hide a CTA but is never the authority).
**Principles.** P2, P3.

---

## 4. Case Sheet

### FR-CS-1 — One Case Sheet per Episode (find-or-create)
**Rationale.** `D1`/`P4`. `TenantCasesheetContribution` ✅ exists precisely for many-visits-one-sheet.
**Functional.** Opening the case sheet in a visit resolves **the Episode's** case sheet; creates one only if the Episode has none.
**AC.** (1) V1 creates. (2) V2 **reuses** the same sheet. (3) A second sheet is never created for the same Episode. (4) Standalone "new case sheet" entry points redirect to the Episode's sheet (FR-LEG-2).
**Edge.** Episode has a legacy null-`episode_id` sheet → **[VP]** data audit required before non-null migration (**ETX-2**).
**Backend.** service find-or-create. **DB.** none in R7. **Rollback.** flag.
**Tests.** dup-guard; multi-visit reuse. **Decisions.** D1. **Principles.** P4.

### FR-CS-2 — Contribution attributed to the **current** Visit
**Rationale.** **F-1.** Verified defect: attribution resolves the visit from `casesheet.appointment_id`, which is set once at creation and never reassigned ✅ → **every contribution after the first is attributed to the creating visit.**
**Functional.** Every Case Sheet write representing Visit-authored clinical content receives an **explicit, backend-validated current Visit context** (preferred input `visit_id`). `casesheet.appointment_id` **must never** be used to resolve current-visit attribution.
**AC.** (1) V1 create → V1 contribution. (2) V2 update → **V2** contribution. (3) V2 content never attributed to V1. (4) V3 appends without altering V1/V2 history. (5) Visit from another **Episode** rejected. (6) another **patient** rejected. (7) another **tenant** rejected. (8) Unresolved Visit → **explicit failure**. (11) Existing historical contributions unchanged. (12) `appointment_id` treated only as creation provenance.
**Transport.** route param / request field / server-resolved workspace context — **[VP]**, follow existing API conventions. The **business rule is frozen**.
**Backend.** service correction. **Frontend.** must supply/permit the current visit context. **API.** additive input. **DB.** none. **Rollback.** revert service (additive behaviour).
**Tests.** N-visit attribution; each rejection case. **Depends.** FR-CS-3. **Decisions.** D1/F-1. **Principles.** P4, P5.

### FR-CS-3 — Atomic content + contribution
**Rationale.** F-1. Verified: the code documents that when no visit resolves, *"no contribution row is inserted; the content update still succeeds (additive, not an error)"* ✅ — prohibited under `P4`/`P5`.
**Functional.** Content update **and** contribution recording succeed together or fail together.
**AC.** (9) No content update succeeds while its required contribution is missing. (8) Unresolved Visit → explicit failure, nothing persisted.
**✅ Positive Engineering Truth finding:** the mechanism **already exists** — `SqlAlchemyUnitOfWork` exposes `commit()`/`rollback()` and holds **both** `casesheet_contribution_repo` and `visit_repo` on the same session ✅, and the contribution create already runs **inside** the same transaction as the content update, before `uow.commit()` ✅. **The fix is removing the permissive `if visit:` guard, not building transactionality.** Sizing: **Small**, not Medium.
**Backend.** service. **DB.** none. **Rollback.** revert service.
**Tests.** failure injection → neither persists. **Decisions.** F-1. **Principles.** P5.

### FR-CS-4 — Idempotent contribution
**Functional.** Retries must not create duplicate contributions.
**AC.** (10) A retry yields exactly one contribution.
**[VP]** **Key deliberately not invented** (owner-directed): Engineering Truth determines whether it is Case Sheet + Visit + authoring operation · an explicit contribution id · a mutation/request id · another established mechanism. **Implementation must decide and test it.**
**Tests.** duplicate-submit; retry-after-timeout. **Decisions.** F-1.

### FR-CS-5 — Append-only visit notes surface
**Rationale.** The contribution model exists ✅ but **has no UI**.
**Functional.** Prior visits' notes are visibly retained with author + timestamp; a visit appends, never overwrites.
**AC.** (1) Prior notes never overwritten. (2) Author/timestamp shown per contribution. (3) Ordering by `contributed_at` ✅.
**Frontend.** new surface. **Principles.** P5.

### FR-CS-6 — Audit
**Functional.** Every contribution records actor, time, and the visit. Amendments additionally record reason (FR-LD-2).
**AC.** Attribution is reconstructible per visit for the life of the Episode.

---

## 5. Living Documents (Supersession)

### FR-LD-1 — Signed versions are immutable; documents remain amendable
**Rationale.** `D2`/`P6`. Resolves the verified contradiction: `DocumentStatus` docstring says *"FINAL: Locked… SIGNED: Immutable, terminal"* ✅ vs "completion must never imply permanent locking".
**Functional.** `DRAFT → FINAL → SIGNED → SUPERSEDED`. An amendment creates a **new version** referencing and **retaining** the prior, recording author/reason/timestamp, following the normal draft/final/sign lifecycle. Applies to Case Sheet, Prescription, Treatment Plan (and Treatment Sheet where clinically/legally appropriate).
**AC.** (1) No path mutates a `SIGNED` version. (2) A superseded version remains renderable/printable **exactly as signed**, visibly marked superseded. (3) Never deleted by ordinary editing. (4) Prints identify the version and whether an amendment exists.
**Backend.** version/supersession representation → **schema change**, **[VP]** representation deferred to implementation. **Rollback.** ⚠ data-shaped — flags roll back code, not records; rollback plan required.
**Tests.** immutability of signed version; supersession chain; print identification.
**Depends.** FR-LD-3. **Decisions.** D2. **Principles.** P6.

### FR-LD-2 — Amendment permissions
**Functional.** Amendment requires an explicit permission distinct from write. Doctors amend; admins/therapists do not.
**[VP]** exact permission codes unverified → **ETX-1**.
**AC.** Unpermitted amend attempt rejected at the **service** layer (not merely hidden in UI).
**Principles.** P1.

### FR-LD-3 — Close the docstring contradiction
**Functional.** `DocumentStatus`'s documented meaning is updated to match the ratified supersession model.
**AC.** Docstring and ratification agree. **Backend.** docs only. **Decisions.** D2.

---

## 6. Prescription

### FR-RX-1 — Verified document lifecycle only
**Rationale.** `D3`. Verified: `tenant_prescription.status` = `document_status` ENUM `DRAFT/FINAL/SIGNED` ✅; `PrescriptionStatus(draft/issued/dispensed)` has **zero runtime usages** ✅.
**Functional.** R7 implements **only** `DRAFT → FINAL → SIGNED` (+`SUPERSEDED` per FR-LD-1). Signing is the point the prescription becomes dispensable.
**AC.** (1) **No `Issue` or `Dispense` action exists** anywhere in R7. (2) Signing records `signed_by_staff_id`/`signed_at` ✅. (3) Editing is `DRAFT`-only; `FINAL`/`SIGNED` change only by amendment.
**[R8]** dispensing fulfilment (`NOT_STARTED → PARTIALLY_DISPENSED → DISPENSED`) — **separate domain object and lifecycle**, integration point only.
**Depends.** ED-DEP-5 (ED-ARCH-002). **Decisions.** D3. **Principles.** P1.

### FR-RX-2 — Copy-forward is **not** in R7
**Rationale.** `D5` → R8; its reconciliation gate cannot check anything today (F-2).
**AC.** No copy-forward action ships in R7. **[R8]** full capability + mandatory reconciliation, gated on allergy/medication modelling.

---

## 7. Treatment Recommendation

### FR-TR-1 — Recommendation is a proposal, not a course design
**Functional.** Answers *"should this patient receive a course?"* May carry recommended categories, clinical reason, high-level duration suggestion, priority, preliminary precautions, notes. It does **not** own the final course design.
**AC.** (1) A recommendation may lead to **one** approved Treatment Plan. (2) It contains no committed dates. (3) Handoff to admin is visible to the doctor as waiting-on-role (FR-WFA-2).
**Backend.** existing routers reused ✅. **Decisions.** D8. **Principles.** P8.

---

## 8. Treatment Plan

### FR-TP-1 — Treatment Plan is a first-class persisted, versioned entity
**Rationale.** Ratified. **Verified: no Plan entity exists** — `app/domain/treatment_plan/` holds only a `SyncResult` ✅; "treatment plan" is today a free-text **`TEXT` column on `tenant_visits`** ✅.
**Functional.** The Plan answers *"what course is clinically intended?"* and owns: patient · Episode · originating Recommendation · authoring clinician · therapies · approximate/authorized session count · frequency · scheduling intent · preferred interval · sequencing pattern · review milestones · completion criteria · course-level precautions · clinically relevant therapist requirements · status · document version · supersession relationship · provenance. **It contains no committed dates.**
**AC.** (1) Recommendation → one approved Plan. (2) Plan persists **independently** of scheduling. (3) Rescheduling does not change the Plan. (13) **Schedule-only changes create no new Plan version.** (14) Workflow intelligence derives treatment readiness from the authoritative Plan + Sessions. (15) The frontend **never** reconstructs the Plan from schedule rows.
**Rejected (recorded).** Plan-as-projection — would let schedule churn alter clinical intent; breaks review-dependent continuation, versioning, authorship, completion criteria; violates DP-15.
**Backend.** **new entity + repository + service.** **DB.** ⚠ **new table** — **R7's first additive migration.** **Migration.** additive; rollback = drop the new table (no data loss; nothing existing altered). **Frontend.** render only.
**Tests.** persistence independent of schedule; reschedule leaves Plan untouched.
**Depends.** FR-TP-2. **Decisions.** Treatment Plan resolution. **Principles.** P1, P3, P6.

### FR-TP-2 — Plan lifecycle: semantic stages frozen, spelling deferred
**Functional.** Stages: Authoring · Approved clinical intent · Available for scheduling · Active course · Under clinical review · Completed · Superseded/amended · Stopped/discontinued.
**AC.** (1) Every stage is representable. (2) The model is the **smallest additive** one that expresses them.
**[VP]** **Exact enum spelling deferred** (owner-directed). ⚠ **Do not reuse the R4 `TreatmentLifecycleStatus` 11 statuses without verifying semantic fit** — verified: those are *treatment execution* statuses ("for a given treatment at a given time") ✅, **not Plan lifecycle**. Overlap is partial, not identity. Overloading one enum with two concerns is what produced ED-ARCH-002.
**Decisions.** Treatment Plan resolution.

### FR-TP-3 — Plan amendment vs schedule change
**Functional.** Four **distinct** operations, never conflated: (a) change clinical intent → **new Plan version**; (b) change schedule logistics → **no** new Plan version; (c) edit an unexecuted session's instructions → session-level, no Plan version; (d) correct an execution record → audit-controlled correction.
**AC.** (12) Clinical amendments versioned/superseded. (13) Schedule-only changes create no Plan version. Amendment preserves already-executed sessions and defines the effect on future unexecuted sessions.
**Principles.** P6.

---

## 9. Treatment Sessions

### FR-TS-1 — Stable session identity
**Rationale.** Ratified. Verified: `treatment_sheet_row` already has `session_id`, `session_date`, `assigned_staff_id`, `status`, `completed_at`, `completed_by_staff_id` ✅ **plus legacy `day_number`** ✅ — the separation is ~70% done.
**Functional.** A Session's identity is stable and **never recreated** during rescheduling · therapist/room reassignment · time/date change · temporary hold · instruction update. **`day_number` is not durable identity**; it may remain as a legacy ordinal for display/migration only.
**AC.** (4) Sessions link to the Plan. (5) Identity survives date/time/therapist/room change. (10) Sessions added without recreating existing ones. (11) Reducing the course deletes no historical/executed Sessions.
**Prohibited.** "Schedule regeneration" as a concept — the only operations are create · update attributes · cancel/miss · add.
**Decisions.** Treatment Plan resolution. **Principles.** P1.

### FR-TS-2 — Schedule attributes
**Functional.** Operational scheduling owns date · start/end time · therapist · room · bed · resource allocation · operational status. These change **without** changing Plan identity, Session identity, doctor content, or execution history.
**AC.** (3)/(6): reschedule changes no Plan and loses no instructions.

### FR-TS-3 — Doctor clinical content bound to session identity
**Functional.** After a Session has identity and scheduling context, an authorized doctor authors: therapies · medicines · oils · materials · intended duration · precautions · special instructions · preparation instructions · expected outcome · clinical notes. Content attaches to **Session identity**.
**AC.** (6) **Doctor instructions survive rescheduling** — by construction, not by careful coding. Rescheduling never deletes, regenerates, detaches or silently remaps content.
**Adoption requirement.** **Author-once-apply-to-many** across selected sessions with per-session override — without it a 14-session course is unusable (correctness fine, adoption not).
**Principles.** P1.

### FR-TS-4 — Therapist execution record
**Functional.** Records actual start/end · actual duration · therapies delivered · medicines/materials used · deviations · patient response · observations · adverse events **[VP]** · completion outcome · therapist identity · timestamps.
**AC.** (7) Actuals remain attached to the executed Session. Execution history is **append-only or version/audit controlled**; a reschedule **never** overwrites an execution record.
**Principles.** P1, P6.

### FR-TS-5 — "Missed" is decomposed, not a single state
**Rationale.** Ratified.
**Functional.** Backend semantics distinguish **what was scheduled** · **whether execution occurred** · **why it did not** (structured reason). The UI may render *"Missed — Patient no-show"*.
**AC.** (1) No single ambiguous `MISSED` state is the sole source of truth. (2) The rendered label is composed from the three backend facts.
**[VP]** exact state names → implementation, after Engineering Truth.

---

## 10. Scheduling

### FR-SCH-1 — Scheduling intents
**Functional.** The Plan expresses: consecutive · alternate-day · specific weekdays · weekly · multiple/week · non-sequential · **PRN** · **review-dependent continuation** · planned review after a session milestone. Scheduling converts intent into real sessions.
**AC.** (8) Consecutive **and** non-sequential courses supported. (9) Review-dependent continuation supported. **PRN** pre-creates **no** dates; sessions are created on demand. Review-dependent schedules only to the review milestone.
**Rationale.** These are exactly what a fixed "Day 1..Day N" sheet cannot express.
**Principles.** P8 (capability-gated: Ayurveda · Physiotherapy · Dental · Orthopedics · Rehabilitation · Pain Management · future — **never specialty-gated**).

### FR-SCH-2 — Synchronization semantics
**Functional.** Reschedule → date attribute only · therapist change → assignment only · room change → attribute only · cancellation → status + reason, **content retained** · missed → FR-TS-5 · additional session → new identity appended · reduced course → future sessions cancelled, past untouched.
**AC.** Every event above preserves doctor content and execution history.
**Concurrency.** Doctor authoring while admin reschedules must not silently clobber → conflict surfaces reload/keep (OCC precedent: R5 `version`/If-Match ✅, `document_version` ✅).

---

## 11. Billing Visibility

### FR-BILL-1 — Billing is visible, doctor read-only
**Rationale.** `D6`. Verified spine: `TenantClinicalService.visit_id` is **`nullable=False`** ✅ → `TenantInvoiceLine.clinical_service_id` ✅ → invoice → payment.
**Functional.** The workspace shows consultation charges · clinical services · therapy/session charges · medicines · consumables · procedures · invoice status · payment status · outstanding balance. Doctors: **read-only**. Admin/front desk: charges, invoices, discounts, taxes, payments, balances, write-offs where permitted.
**AC.** (1) Doctor sees billing, cannot mutate. (2) Capability-gated — clinics without billing see no stage.
**Backend.** additive read contract reusing the existing spine. **DB.** none.
**Decisions.** D6. **Principles.** P8.

### FR-BILL-2 — Clinical completion ≠ financial completion
**Functional.** Unbilled services produce a **visible warning**; the doctor may clinically complete the visit; operational closure may remain pending. **Billing never blocks clinical work by default.**
**AC.** (1) Completion with unbilled services succeeds, with a warning. (2) **No hard block is hard-coded.** (3) Any tenant policy that blocks operational closure is **explicitly configured** — **[VP]**, not built in R7.
**Decisions.** D6.

---

## 12. Workflow Recommendations

### FR-REC-1 — The backend owns the recommendation
**Rationale.** `D9`/`P2`.
**Functional.** The `clinical_workflow_service` returns: `recommended_action` · `reason` · `blocking_factors` · `waiting_role` · `completion_readiness` (+ alternatives; confidence **[R8]**). The frontend renders it.
**AC.** (1) The contract returns **no** presentation fields (colours/icons/layout/UI labels) — contract test. (2) State codes + localization keys only. (3) **The frontend computes no recommendation.**
**Backend.** service + pure resolver. **Frontend.** render. **Rollback.** flag.
**Tests.** semantics-only guard; resolver unit tests without a DB.
**Decisions.** D9. **Principles.** P2, P3, AC-4.

### FR-REC-2 — Recommend, never decide
**Rationale.** `D7`/`P7`.
**Functional.** Every recommendation presents: recommended action · reason · supporting context · blocker (if any) · role owner (if waiting) · **alternative-action menu**. Deviation must be immediate and unpunished.
**AC.** (1) `[Do this]` + `[Something else ▾]` always present. (2) Deviation ≤ 1 tap. (3) **No forced clinical sequencing.** (4) No automatic clinical decision. (5) No generalized clinical-decision-support engine.
**Decisions.** D7. **Principles.** P7.

---

## 13. Completion Readiness

### FR-CR-1 — Backend owns completion readiness
**Rationale.** `D9`. Verified violation: completion is derived across ~10 frontend modules (ED-ARCH-006/B) and `deriveSummary` acts on its own derivation (ED-ARCH-004).
**Functional.** The backend answers *"can this visit be completed?"* with outstanding mandatory work, optional suggested work, and warnings (incl. billing).
**AC.** (1) **Exactly one** answer (DP-15). (2) Open therapy sessions **coexist** with consultation completion — shown as coexistence, not contradiction. (3) Unbilled services → warning, not block. (4) The frontend renders; it does not compute.
**Depends.** ED-DEP-2 — **the completion route must not be composed until `deriveSummary` is backend-owned.**
**Principles.** P1, P2, P3.

---

## 14. Patient Safety (R7 scope only)

### FR-PS-1 — R7 surfaces only verified-existing signals
**Rationale.** **F-2 = Option A.**
**Functional.** R7 surfaces: pending clinical reviews ✅ · active prescription existence/status ✅ · active episode ✅ · treatment session progress ✅ · billing state ✅.
**AC.** (1) **No allergy/intolerance/interaction/renal/hepatic/contraindication surface in R7.** (2) The frontend must not fabricate, derive or interpret them. (3) An unbacked safety field is **never** displayed.
**[R8]** the full safety model, backend-first.
**Depends.** ED-DEP-4. **Decisions.** F-2. **Principles.** P1.

---

## 15. Mobile Experience

### FR-MOB-1 — Mobile-first Command Center
**Functional.** Patient summary → today's needs → **sticky next action** → **horizontal scrollable pill rail** → one primary task → minimal scrolling → ≥44pt targets → interruption recovery.
**AC.** (1) Active pill auto-scrolled into view. (2) **No unexplained dot-only representation.** (3) Full or understandable short labels. (4) One primary task at a time. (5) Status never conveyed by colour alone (icon + text).
**Principles.** P9.

### FR-MOB-2 — Workflow pills
**Functional.** 🟢 completed · 🟡 current/action-now · ⚪ pending-available · 🔵 waiting-on-role (**owner named**: "Waiting for Admin/Doctor/Therapist") · 🔴 blocked/error · ⚫ not-applicable (only where showing it is useful).
**AC.** (1) Blue always names the owner. (2) Grey only when genuinely useful. (3) Accessible (icon + text).

---

## 16. Legacy Transition

### FR-LEG-1 — No screen deleted in R7
**Functional.** Staged: Discover → Introduce → Shadow → Validate → **Redirect** → Deprecate → Remove. R7 reaches at most **Redirect**.
**AC.** (1) No screen removed in R7. (2) Every redirect reversible by flag. (3) Deep links land on the correct stage.

### FR-LEG-2 — Redirects
**Functional.** `start-consultation` · `consultation` · `complete-consultation` → workspace stages via adapters. Standalone casesheet/prescription create/edit → workspace, reusing existing flags ✅ (`caseSheetRouteFlagSwitch`, `prescriptionRouteFlagSwitch`). A standalone "new case sheet per visit" entry **redirects to the Episode's sheet** (it models the wrong thing — FR-CS-1).
**AC.** Redirect tests per route; params preserved.
**Depends.** FR-CR-1 (completion route gated on ED-DEP-2).

---

## 17. Feature Flags

### FR-FLAG-1 — R7 is flag-gated and reversible
**Rationale.** Verified precedent: backend `freshness_v1_enabled` / `clinical_spine_v1_enabled` in `config.py` ✅; frontend `isFreshnessV1Enabled` / `isClinicalSpineV1Enabled` in `useFeatures.ts` ✅.
**Functional.** One umbrella flag `cos_v1`, mirroring the existing mechanism exactly; reuse existing route flags rather than adding new ones.
**AC.** (1) Flag-off = today's behaviour, **no data effect**. (2) Rollback = flag off. (3) ⚠ **Data-shaped changes (supersession versions, contributions) are not rolled back by a flag** — FR-LD-1 requires its own rollback plan.
**Principles.** AC-6.

---

## 18. Engineering Debt Dependencies (blocking gates)

| ID | Debt | Gate |
|---|---|---|
| **ED-DEP-1** | **ED-ARCH-001** — presentation→axiosClient/datasource in reused modules | **No R7 group may compose a module until that module is remediated.** Do not widen into repo-wide refactor. |
| **ED-DEP-2** | **ED-ARCH-004** — `deriveSummary` derives clinical summary/completion and acts on it | **The completion route must not be composed until FR-CR-1 makes it backend-owned.** |
| **ED-DEP-3** | **ED-ARCH-006/A** — `buildSectionConfig` assembles workflow in FE (+ specialty-gated) | **FR-WFA-1 must land before/with any FE workflow rendering.** |
| **ED-DEP-4** | **ED-ARCH-003** — unbacked frontend `allergies` field | FR-PS-1/FR-VCC-4 must not surface it; R8 owns the model. |
| **ED-DEP-5** | **ED-ARCH-002** — `PrescriptionStatus` drift | FR-RX-1 must not be guided by it. Non-blocking. |
| **ED-DEP-6** | **ED-ARCH-006/B** — `SectionProgress` visit-level completion in FE | Non-blocking; per-section save status may remain presentational. |

---

## 19. Engineering Truth Exceptions

> Recorded per instruction: **do not redesign** — record evidence, affected requirement, recommendation, and continue.

### ETX-1 — R7 permission codes are unverified
**Evidence.** `casesheet.amend`, `prescription.sign`, `billing.view`, `session.execute` etc. are **proposed names**; not yet verified against `org_permissions`.
**Affected.** FR-LD-2, FR-WFA-2, FR-BILL-1, FR-RBAC-1.
**Recommendation.** Group 0 / T-0.2 verifies every code before Group H. **Does not make any requirement impossible.**

### ETX-2 — `tenant_casesheets.episode_id` is nullable; historical data unclassified
**Evidence.** `episode_id: Mapped[UUID | None]`, `ondelete="SET NULL"` ✅. Ratification defers non-nullability behind a data audit.
**Affected.** FR-CS-1.
**Recommendation.** R7 handles null-`episode_id` sheets gracefully; **no nullability migration in R7**; audit precedes any future change.

### ETX-3 — Appointment "purpose" / "patient-stated concern" not verified to exist
**Evidence.** No verified field for either; the wireframe assumes them.
**Affected.** FR-VCC-2 (and FR-WFA-1, which uses purpose as an assembly input).
**Recommendation.** Verify in Group 0. If absent, either model additively (scope decision) **or** render "not recorded" and assemble without purpose. **FR-VCC-2 must not fabricate a purpose** (F-2 discipline). Requirement remains possible either way.

### ETX-4 — Capability change mid-episode is undefined
**Evidence.** No verified behaviour for entitlement revoked while a plan is active.
**Affected.** FR-WFA-1.
**Recommendation.** Implementation-time decision; default proposal — **preserve clinical records, hide future stages** (never delete history; R5 entitlement-loss precedent).

### ETX-5 — Naming collision: `tenant_visits.treatment_plan` is a free-text `TEXT` column
**Evidence.** `treatment_plan: Mapped[str | None]` → `TEXT`, nullable ✅ — the pre-entity representation FR-TP-1 replaces.
**Affected.** FR-TP-1.
**Recommendation.** Requirements/implementation must decide disposition (retain as legacy visit note · migrate · deprecate) and **must ensure implementers never confuse the column with the entity**. Does not block FR-TP-1.

---

## 20. R7 / R8 Boundary

**In R7:** COS core · VCC (R7-scope signals only) · backend workflow assembly + recommendation + completion readiness · Case Sheet per Episode + current-visit attribution + atomicity + idempotency · living-document supersession · verified prescription lifecycle · Treatment Recommendation → **Plan (entity)** → stable Sessions → schedule attributes → doctor content → therapist actuals · scheduling intents incl. PRN/review-dependent · billing visibility · mobile · legacy redirects · flags · **backend-owned consultation/treatment-review/therapy history hierarchy (FR-HIST-1/2, v1.1 amendment) — COS core, not advanced clinical intelligence, sequenced after Treatment Plan.**

**Deferred to R8 (integration points only):** structured laboratory measurements · manual lab entry · attachments · LIONIC/LIS/FHIR/device adapters · comparative tables · trend visualisation · measurement-based "what changed" · **Clinical Advice framework** · **prescription copy-forward** · **medication reconciliation** · **allergy/intolerance/interaction/renal/hepatic modelling** · dispensing fulfilment lifecycle · advanced summaries · recommendation confidence.

**Guard.** No requirement above implements an R8 concept. R8 references appear only as `[R8]` integration markers.

---

## 21. RBAC

### FR-RBAC-1 — Role-aware composition, not forked screens
**Functional.** `episodeWorkspaceConfigByRole` ✅ extends 2 → 5 roles (Doctor, Assistant Doctor, Admin, Front desk, Therapist) **as config**. RBAC-flexible: any role holding the permission may act — never one hard-coded profession.
**AC.** (1) One screen, role-composed. (2) Read-only roles see clinically useful content where policy permits. (3) **Backend enforces**; UI hiding is presentation polish only ✅ (`CLAUDE.md` §3). (4) Actionability from backend `blocking_factors`/`waiting_role` (FR-WFA-2).
**Depends.** ETX-1. **Principles.** P1, P9.

---

## 22. Clinical History Hierarchy *(added v1.1, 2026-07-18 amendment — owner-approved, [R7-HISTORY-HIERARCHY-AMENDMENT.md](R7-HISTORY-HIERARCHY-AMENDMENT.md))*

**Verified problem this section closes.** `useClinicalTimelineData` ✅ flattens every appointment — consultation or therapy — into one undifferentiated `'visit'` item (backed by Appointments, not `TenantVisit`); its own partial session-grouping computes `completedSessionCount` from **scheduled** rows, not **completed** ones (a verified defect); and therapy appointments still separately leak through as flat items alongside that same grouping — a double-representation defect. See `R7-HISTORY-HIERARCHY-AMENDMENT.md` §1 for full evidence.

### FR-HIST-1 — Clinical History Separates Consultations from Therapy Encounters
**Rationale.** Verified misclassification (above) undermines the first-class Treatment Plan (FR-TP-1) and conflates operational therapy execution with clinical consultation — exactly the concept-separation DP-15/P3 exists to prevent, applied to a surface (history) not previously named by R7.
**Functional.** The Clinical Operating System presents doctor consultations and treatment reviews as **top-level** clinical encounters. Therapy execution encounters are **grouped beneath the authoritative Treatment Plan** to which their stable Sessions belong. Treatment Plans are collapsible. Collapse/expand is frontend UI state only; **the hierarchy and association are backend-owned.**
**AC.** (1) Doctor consultations render as top-level clinical encounters. (2) Therapy sessions do not render as top-level doctor-consultation Visits. (3) Therapy sessions are grouped under their authoritative Treatment Plan. (4) Treatment Review encounters remain distinguishable from therapy execution. (5) Each Treatment Plan group is independently collapsible. (6) Multiple Treatment Plans remain separate. (7) Completed, stopped and superseded Plans remain visible. (8) Expanded Sessions retain their individual identity. (9) Session dates, therapists, instructions, execution outcomes and reasons remain available. (10) A collapsed Plan displays backend-provided session aggregates. (11) **The frontend does not calculate completed, pending, missed or cancelled counts.** (12) **The frontend does not classify encounters.** (13) **The frontend does not infer Plan association.** (14) Legacy/unassociated Sessions are explicitly classified by the backend. (15) Styling uses centralized semantic theme tokens and accessible shared primitives. (16) Consultation and therapy distinction does not depend on colour alone. (17) Mobile presentation preserves the hierarchy and does not flatten Sessions.
**Backend.** owns encounter classification, Plan-to-session association, Plan/session aggregates, consultation-vs-therapy-vs-review distinction. **Frontend.** hierarchy rendering, collapse/expand state, navigation, accessibility, theme presentation only.
**Sequencing.** Depends on `FR-TP-1` (Treatment Plan entity) and `FR-TS-1` (stable Session identity) existing — the Plan-grouping half cannot function before either does; this does not block Group -1 or any task not dependent on it.
**Tests.** architecture test asserting the frontend performs zero encounter classification/aggregation (extends the `T-0.8`/`T-0.9` "no FE clinical derivation" pattern) · per-hierarchy-shape unit tests · accessibility (icon+text, never colour-alone) · mobile collapse-behavior tests.
**Depends.** FR-TP-1, FR-TS-1, FR-TS-4. **Decisions.** D10. **Principles.** P1, P2, P3, P9.

### FR-HIST-2 — Backend-Owned Hierarchical Clinical History Contract
**Rationale.** FR-HIST-1 requires a single authoritative source; per DP-15/AC-5, this must be one backend contract, not a frontend reconstruction from multiple flat queries (the current, verified failure mode).
**Functional.** The **existing Clinical Workspace aggregate** (§2.1, `T-BE-A`) exposes an authoritative hierarchical clinical-history projection. **No independent competing history aggregate is created** unless current API conventions make composition through the existing aggregate technically impossible and an Engineering Truth exception is separately approved. Conceptual semantics: `history_items: consultation | treatment_review | treatment_plan{sessions[]} | legacy_treatment_sessions`. Exact transport shape is an implementation-design decision; **semantic ownership is frozen** by this requirement.
**Backend responsibilities.** classify encounter type · associate stable Sessions with Treatment Plans · provide Plan-level session counts · provide Plan lifecycle summary (reusing `treatment_lifecycle_resolver` ✅, never re-deriving) · classify unassociated legacy treatment sessions · prevent double representation of the same therapy encounter.
**Frontend responsibilities.** render the returned hierarchy · manage collapse/expand state · route to details · apply theme, localization and accessibility · **perform no clinical aggregation.**
**AC.** (1) The same therapy Session appears exactly once in history. (2) A therapy appointment and its Session do not appear as duplicate history items. (3) Completed-session count reflects **actual completed execution**, not scheduled rows. (4) Counts for scheduled/completed/not-completed/cancelled are backend-derived. (5) Plan association uses authoritative identifiers. (6) No association is inferred from date, therapy name, patient, therapist, or proximity. (7) Treatment Review is not classified as therapy execution. (8) History remains scoped to the active patient/Episode. (9) The contract contains semantics, not presentation styling (AC-4). (10) The frontend is **structurally unable** to produce a different grouping (AC-5, DP-15).
**Legacy session policy.** `treatment_sheet_row` ✅ is never orphaned from its Treatment Sheet (non-null FK, verified), but Sheet-to-future-Plan **cardinality is unverified**. **No automatic legacy backfill without a verified cardinality/data audit.** Where reliable Plan association is unavailable, the backend classifies the group explicitly (`LEGACY_TREATMENT_SESSIONS` or the smallest equivalent semantic code, per convention — not invented here) rather than inferring from proximity/names. UI renders an explicit label (e.g. *"Legacy Treatment Sessions — Plan association unavailable"*), never a fabricated grouping.
**Treatment Plan summary semantics** (collapsed-row fields): Plan identity · Plan status · treatment summary · course start date · authorized/intended session count · completed count · scheduled count · non-completed count · cancelled count · next scheduled Session · review milestone · responsible clinician where applicable. **Fields the underlying verified model does not yet support are represented explicitly as unavailable, never guessed.**
**Tests.** contract test (no presentation fields, AC-4) · duplicate-representation test (AC 1/2) · completed-count-accuracy test against actual execution facts, not scheduled rows (AC 3) · legacy-classification test (no inferred association).
**Depends.** FR-HIST-1, FR-TP-1, FR-TS-1, FR-TS-4, FR-VCC-3 (shares underlying session-count facts). **Decisions.** D10. **Principles.** P1, P2, P3, AC-1, AC-4, AC-5.
