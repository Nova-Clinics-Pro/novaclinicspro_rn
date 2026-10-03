# R7 — Clinical Operating System · Design

**Version:** 1.0 (Draft — **not approved**) · **Date:** 2026-07-17
**Derives from:** [`requirements.md`](requirements.md) **v1.0 (FROZEN)**. Every design decision below traces to a frozen requirement; **nothing here adds scope absent from requirements**.
**Constitutional authority (frozen, not reopened):** [R7-OWNER-RATIFICATION.md](R7-OWNER-RATIFICATION.md) · [R7-DESIGN-FREEZE-CHECKLIST.md](R7-DESIGN-FREEZE-CHECKLIST.md) · [R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md](R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md) (architecture) · [R7-TREATMENT-SCHEDULING-MODEL.md](R7-TREATMENT-SCHEDULING-MODEL.md) · [R7-STATE-DEFINITIONS.md](R7-STATE-DEFINITIONS.md)
**Baselines:** backend `dev` `8b23568` · frontend `dev` `cd86021`. ✅ = verified in code this engagement · **[VP]** = verification point owned by an implementation task.
**Status of downstream:** `tasks.md` **NOT authored** — awaits design completion, internal-consistency check, **and owner approval**.

> **Scope of this document.** `R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md` is the **architecture** (principles, ownership, invariants) and remains constitutional. **This document is the implementation design**: module boundaries, contracts, data shapes, sequencing and test strategy. It references the architecture; it does not restate or revise it.

---

## 1. Design Principles Applied

The nine frozen principles (`P1`–`P9`) and eight architecture constraints (`AC-1`–`AC-8`) are inputs, not decisions. Two shape almost every choice below:

- **P3 / AC-5 (DP-15).** Every clinical question resolves in exactly one backend module. Where a design choice could let two layers answer the same question, the design picks the option that makes the second answer *structurally impossible*, not merely discouraged.
- **P2 / D9.** Workflow intelligence is backend-owned. The frontend receives semantics and renders them.

**Reuse-first.** R7 is composition-heavy: the context model (`WorkspaceProvider` ✅), the modules (`CaseSheetModule`, `PrescriptionModule`, `TreatmentRecommendationModule`, `ClinicalServicesModule` ✅), the UoW ✅, the flag mechanism ✅, and the R4/R5 resolver pattern ✅ all already exist. New code is added only where a frozen requirement has no existing home.

---

## 2. Backend Design

### 2.1 Clinical Workflow Intelligence — the core new capability
**Implements:** FR-WFA-1, FR-WFA-2, FR-REC-1, FR-CR-1, FR-BILL-2 · **Principles:** P2, P3 · **AC:** AC-1, AC-3, AC-4

Two modules, following the **verified R4/R5 pattern** (`treatment_lifecycle_resolver` ✅ + `capability_resolver` ✅ are pure domain; `capability_resolution_service` ✅ / `clinical_semantic_resolution_service` ✅ orchestrate):

```
app/domain/services/clinical_workflow_resolver.py        ← NEW · pure domain
app/application/services/clinical_workflow_service.py    ← NEW · application
app/domain/services/i_clinical_workflow_service.py       ← NEW · interface
app/application/factories/clinical_workflow_factory.py   ← NEW · factory (convention ✅)
app/api/v1/dependencies/services/clinical_workflow_dependencies.py ← NEW
app/api/v1/routers/clinical_workflow_router.py           ← NEW · thin
```

**`clinical_workflow_resolver` (pure domain).**
- **Inputs:** immutable snapshots only — `WorkspaceFactsSnapshot` (capabilities · appointment purpose **[VP ETX-3]** · episode state · document presence/status · treatment state · billing state · permissions) + role.
- **Outputs:** frozen dataclasses — `AssembledWorkflow(stages[])`, `Recommendation(action, reason, blocking_factors[], waiting_role, alternatives[])`, `CompletionReadiness(can_complete, outstanding_mandatory[], optional_suggested[], warnings[])`.
- **Forbidden by AC-3:** imports from `app.infrastructure`, `app.api`, a session, or `app.localization` (which transitively pulls FastAPI/SQLAlchemy — the exact trap `capability_resolver`'s docstring documents ✅).
- **Rationale (P3):** a pure function has exactly one answer and is unit-testable **without a database** — the property that made R6's FT-1..FT-5 falsification possible.

**`clinical_workflow_service` (application).** Gathers facts via **repositories only** (AC-1), builds the snapshot, invokes the resolver, returns semantics. Reuses `treatment_lifecycle_resolver` ✅ for treatment stage rather than re-deriving it (P3 — one answer).

**Reference-data read exception.** Capability reads may use the documented `AsyncSession`-for-platform-reference-data exception (`capability_catalog_provider` ✅ precedent, ED-ARCH-001 §exception). Business-entity data goes through repositories, no exception.

**Contract (semantics only — AC-4).**
```
recommended_action · reason · blocking_factors[] · waiting_role · completion_readiness{}
stages[]{ key, state, waiting_role, blocking_reason }
```
State codes + **localization keys**; **never** colours, icons, layout, or UI labels. A contract test asserts no presentation field exists in the response (FR-REC-1 AC-1).

**Why one aggregate read, not enriched per-entity responses.** Considered: additively enriching each existing response and letting the frontend stitch. **Rejected** — stitching *is* frontend derivation (P2/P3 violation) and reintroduces ED-ARCH-006. One aggregate is the only option consistent with DP-15.

### 2.1a Clinical Workspace Aggregate & Hierarchical History Projection *(amended v1.1, 2026-07-18)*
**Implements:** FR-HIST-1, FR-HIST-2 · **Principles:** P1, P2, P3, P9 · **AC:** AC-1, AC-4, AC-5 · **Decisions:** D10

`T-BE-A.1`/`T-BE-A.2` already establish the **Clinical Workspace aggregate** (`app/application/services/clinical_workspace_service.py` + `app/api/v1/routers/clinical_workspace_router.py`) as a distinct capability from §2.1's Workflow Resolver — it assembles `WorkspaceFactsSnapshot` (the resolver's *input*) via repositories only. This amendment gives it a second read: **the hierarchical history projection**, on the same service/router, not a second aggregate (FR-HIST-2's own instruction — "do not create an independent competing history aggregate").

**Encounter classification (pure, deterministic).** Derived from **verified existing signals** — `appointment_type` (`"consultation"`/`"THERAPY"`/`"therapy"` values ✅) plus `treatment_lifecycle_resolver`'s `NEEDS_CLINICAL_REVIEW`/`UNDER_CLINICAL_REVIEW` states (the closest existing anchor for "Treatment Review," per `R7-HISTORY-HIERARCHY-AMENDMENT.md` §3) — **not a new field**. Classification logic belongs in the pure domain layer (candidate: a small classifier alongside or within `clinical_workflow_resolver.py`'s existing reuse of `treatment_lifecycle_resolver` — exact placement is an implementation-time decision, not fixed here).

**Plan-to-session association.** Reuses `T-BE-D.4`'s Plan service and `T-BE-E.1`'s stable Session identity — **this projection cannot return real Plan groups before both exist** (§7 Sequencing, below). Association keys on stable identifiers only (Session→Plan FK, once `T-BE-D`/`T-BE-E` land) — never inferred from date/name/proximity (FR-HIST-2 AC 6).

**Deduplication.** A therapy appointment and its Session/`treatment_sheet_row` must resolve to **one** history item, not two — the aggregate's own responsibility (FR-HIST-2 AC 1/2), preventing the exact double-representation `R7-HISTORY-HIERARCHY-AMENDMENT.md` §1 verified in the current flat list.

**Session-count correction.** Completed/scheduled/not-completed/cancelled counts are computed **backend-side** from actual execution facts (`treatment_sheet_row.status`/`completed_at`), replacing the verified-incorrect frontend formula (`useClinicalTimelineData`'s `session_date`-presence check, which counts *scheduled*, not *completed*, rows — see ED-DEP-7/ED-ARCH-007).

**Legacy fallback (no fabricated grouping).** `treatment_sheet_row.treatment_sheet_id` is `NOT NULL` — legacy sessions are never orphaned from their Treatment Sheet, but Sheet-to-Plan **cardinality is unverified** (design note, not resolved here — see `R7-HISTORY-HIERARCHY-AMENDMENT.md` §8/§16 for the required data audit). Until verified, unassociated sessions classify as `LEGACY_TREATMENT_SESSIONS` (exact code TBD at implementation, following existing convention) — never backfilled by guessing.

**Contract (semantics only — AC-4).**
```
history_items[]: { item_type: consultation | treatment_review | treatment_plan | legacy_treatment_sessions,
                    ...type-specific fields, session_counts{} for treatment_plan, sessions[] nested }
```
No colours/icons/layout/UI labels — same semantics-only discipline as §2.1's workflow contract.

**Why extend, not fork (FR-HIST-2's own rule).** A second aggregate would let two backend paths answer "what happened for this patient" — the exact DP-15 violation §2.1 already rejected once for enriched-per-entity stitching. One aggregate, two reads (facts snapshot + history projection), is the only option consistent with the precedent this design already set.

### 2.2 Case Sheet — Episode binding, current-Visit attribution, atomicity
**Implements:** FR-CS-1, FR-CS-2, FR-CS-3, FR-CS-4, FR-CS-5, FR-CS-6 · **Decisions:** D1, F-1 · **Principles:** P4, P5

**Change surface:** `app/application/services/casesheets_service.py` (service-layer only; **no schema change**).

**(a) Find-or-create per Episode (FR-CS-1).** The service resolves the Episode's case sheet; creates only if absent. Dup-guard at the service, not the UI.

**(b) Current-Visit attribution (FR-CS-2).** `update_casesheet` accepts an **explicit, backend-validated** current visit context (preferred `visit_id`). Attribution resolves from **that**, never from `casesheet.appointment_id`.

> **Verified defect being fixed:** today the service resolves the visit from the case sheet's own `appointment_id` ✅ — which is set once at creation and never reassigned ✅ (`update_data` excludes it, as it excludes the explicitly-immutable `episode_id` ✅). Consequence: every contribution after the first is attributed to the creating visit.

**Transport [VP].** Route param vs request field vs server-resolved workspace context — decided at implementation per existing API conventions. The **business rule is frozen**; only the transport is open.

**(c) Validation (FR-CS-2 AC 5/6/7).** Service verifies: visit exists · same tenant · same Episode · same patient · case sheet belongs to that Episode · author permitted. Rejections are explicit service-layer failures, not UI hiding.

**(d) Atomicity (FR-CS-3).**
> **Verified — the mechanism already exists.** `SqlAlchemyUnitOfWork` exposes `commit()`/`rollback()` and holds **both** `casesheet_contribution_repo` ✅ and `visit_repo` ✅ on the same session, and the contribution create **already runs inside the same transaction** as the content update, before `uow.commit()` ✅.
>
> **Therefore the design is subtractive:** remove the permissive guard that skips the contribution when the visit does not resolve (today documented as *"no contribution row is inserted; the content update still succeeds (additive, not an error)"* ✅). Replace with an explicit failure. **No transactional machinery is built.** Sizing: **Small**.

**(e) Idempotency (FR-CS-4) [VP].** Retries must not duplicate. Key deliberately **not chosen here** (owner-directed): candidates — (case sheet + visit + authoring operation) · explicit contribution id · mutation/request id. Implementation determines and tests it via Engineering Truth. *Design note:* the natural-key option is attractive but must be checked against the legitimate case of **two distinct contributions by the same staff in the same visit** before adoption — that is precisely why it is not fixed here.

**(f) `appointment_id` (FR-CS-2 AC 12).** Retained; meaning documented as **creation provenance only**; never read for current-visit attribution. Nullability untouched; `episode_id` non-null migration deferred behind a data audit (**ETX-2**).

**(g) Contribution content snapshots (FR-CS-5, FR-CS-6) — Decision 12 amendment (T-BE-E.1a, v1.3, 2026-07-25).**
> **Verified gap this closes.** `TenantCasesheetContribution` was attribution-only (`id, tenant_id, casesheet_id, visit_id, staff_id, contributed_at, correlation_id, payload_hash`) — no content field existed anywhere, by the original Decision "holds NO clinical content" (Phase 2 · T-B.2, ADR-P2-03). `TenantCasesheet.data_json` is a single mutable document, overwritten in place on every update. Without amendment, FR-CS-5 ("prior visits' notes visibly retained... never overwritten") has no persisted fact to render.

**Amendment.** `TenantCasesheetContribution` gains one additive, nullable `content_snapshot` JSONB column — the exact validated `data_json` at the moment of that contribution, stored inside the SAME atomic transaction (d) already performs (no new transactional machinery). DO-2's core invariant is unchanged: `TenantCasesheet.data_json` remains the sole current, editable document; the snapshot is never independently editable and is never treated as a second Case Sheet. See Decision 12 (`R7-OWNER-RATIFICATION.md`) for the full ratified interpretation.

**Read path.** One additive read method (`list_by_casesheet`, already existed at the repository layer) exposed through the existing Case Sheet router/service — no new aggregate, no Clinical Workspace history endpoint. Legacy rows keep `content_snapshot = NULL`, returned with an explicit `content_available = false`, never backfilled or reconstructed from current `data_json`.

**Idempotency (e) interaction.** `payload_hash` is computed from the same `data_json` that becomes `content_snapshot` — consistency between the two is automatic, not a separately maintained invariant. A retry with a mismatched hash is rejected exactly as (e) already specifies; no second idempotency mechanism is introduced.

### 2.3 Treatment Plan — first-class persisted, versioned entity
**Implements:** FR-TP-1, FR-TP-2, FR-TP-3 · **Decision:** Treatment Plan resolution · **Principles:** P1, P3, P6

> **Verified:** no Plan entity exists — `app/domain/treatment_plan/` holds only a `SyncResult` dataclass ✅; "treatment plan" today is a free-text **`TEXT` column on `tenant_visits`** ✅ (**ETX-5**). This is R7's **first additive migration**.

**Modules (following the R6 `org_clinical_concept` precedent ✅):**
```
app/infrastructure/db/models/tenant_treatment_plan.py         ← NEW (persistence)
app/domain/treatment_plan/models.py                            ← NEW (pure domain object)
app/domain/repositories/i_treatment_plan_repository.py         ← NEW (interface)
app/infrastructure/repositories/sqlalchemy_treatment_plan_repository.py ← NEW
app/application/services/treatment_plan_service.py             ← NEW
app/infrastructure/db/migrations/versions/<rev>_r7_treatment_plan.py ← NEW (additive)
app/infrastructure/db/migrations/versions/<rev>_r7_recommendation_source_identity.py ← NEW (additive, T-BE-D.3a)
```
Registered on the UoW alongside existing repos (convention ✅). `tenant_` prefix — the plan is tenant-owned (verified convention: `org_` = platform, `tenant_` = tenant).

**Recommendation source identity (Decision 11, T-BE-D.3a — prerequisite, blocks T-BE-D.4).** `originating_recommendation_id` references a `TenantTreatmentSheet.id` explicitly marked `creation_source = RECOMMENDATION` (see §2.8) — never inferred from lifecycle state. Enforced at the database level: a tenant-scoped partial unique index on `(tenant_id, originating_recommendation_id) WHERE originating_recommendation_id IS NOT NULL` guarantees at most one Plan per Recommendation (FR-TR-1 AC1).

**Shape (design intent; exact DDL is an implementation task):** identity · tenant · patient · episode · originating recommendation · authoring clinician · therapies · approximate/authorized session count · frequency · **scheduling intent** · preferred interval · sequencing pattern · review milestones · completion criteria · course precautions · therapist requirements · **status** · **document version** · **superseded-by** · provenance timestamps. **No date columns for committed sessions** — FR-TP-1 AC: the Plan contains no schedule.

**Status [VP].** Semantic stages are frozen (FR-TP-2); **spelling is deferred**. ⚠ **Do not reuse `TreatmentLifecycleStatus`** — verified: its 11 statuses are *treatment execution* statuses ("for a given treatment at a given time") ✅, not Plan lifecycle. Overlap is partial, not identity; overloading one enum with two concerns is what produced ED-ARCH-002. Implementation proposes the **smallest additive** enum.

**Versioning (FR-TP-3, P6).** Clinical-intent change → new version superseding the prior (R6 supersession pattern ✅). **Schedule-only change → no new Plan version** (FR-TP-3 AC 13) — enforced by the service, since only the service can distinguish the four operations (intent · logistics · unexecuted-instruction edit · execution correction).

**Rollback.** Additive table; rollback = drop it. No existing table altered (AC-8).

### 2.4 Sessions — identity / attributes / content / execution
**Implements:** FR-TS-1, FR-TS-2, FR-TS-3, FR-TS-4, FR-TS-5, FR-SCH-1, FR-SCH-2 · **Principles:** P1, P6

> **Verified:** `treatment_sheet_row` already carries `session_id`, `session_date`, `assigned_staff_id`, `status`, `completed_at`, `completed_by_staff_id`, `materials_payload_hash` ✅ **plus legacy `day_number`** ✅ — the separation is ~70% complete. R7 finishes it; it does not rewrite it.

**Design rule (FR-TS-1):** the only session operations are **create · update attributes · cancel/miss · add**. "Regenerate from schedule" is **not a permitted concept** — this is what makes FR-TS-3 AC 6 ("doctor instructions survive rescheduling") true *by construction* rather than by careful coding.

- **Identity:** stable; `day_number` becomes display-order only, never identity, never a content anchor. Retirement of `day_number` is **not** in R7 (E-6, non-blocking).
- **Attributes:** date/time/therapist/room/bed/resource/operational status — mutable without touching Plan identity, Session identity, content, or execution history.
- **Doctor content:** bound to **session identity** (FR-TS-3). **Author-once-apply-to-many** with per-session override is a stated requirement, not a nicety — a 14-session course is otherwise unusable.
- **Execution record:** append-only/audit-controlled (FR-TS-4). A reschedule never overwrites it.
- **`Missed` (FR-TS-5):** decomposed into **schedule state + execution outcome + structured reason**; the UI composes the label. Spelling **[VP]**.
- **Concurrency (FR-SCH-2):** OCC on session writes — reuse the verified `version`/If-Match (R5 ✅) / `document_version` (✅) precedent; conflict surfaces reload/keep, never silent clobber.

### 2.5 Billing visibility
**Implements:** FR-BILL-1, FR-BILL-2 · **Decision:** D6

`T-BE-F.1` is the additive **read** contract composing the verified existing spine: `TenantClinicalService.visit_id` (`nullable=False` ✅) → `TenantInvoiceLine.clinical_service_id` ✅ → invoice → payment. F.1 itself adds no billing write path. The separately ratified `T-BE-F.1a` governs use of the existing invoice-create path from R7: frontend provides `appointment_id` only; backend resolves authenticated tenant → appointment → client → active Visit, validates all relationships and any clinical-service attribution, and enforces effective `billing.invoicing` **and** the applicable canonical `invoice.*` permission. `T-FE-E.4` composes the resulting billing presentation/affordance; `T-FE-E.6` retains broader role/capability composition. Completion returns a **warning** for unbilled services (FR-BILL-2); it is never a frontend hard block, and backend completion readiness remains authoritative. See `R7-BILLING-ACTIONABILITY-RATIFICATION.md`.

### 2.6 Living documents
**Implements:** FR-LD-1, FR-LD-2, FR-LD-3 · **Decision:** D2 · **Principle:** P6

Version/supersession representation **[VP]** — deliberately not fixed here; it is a schema change requiring its own approval, and R7 core ships without amendment (Group G defers cleanly). Design constraints that are **not** deferred: a `SIGNED` version is never mutated; a superseded version is retained, renderable exactly as signed, and visibly marked; prints identify the version; amendment records author/reason/timestamp and requires a distinct permission (**ETX-1**).

**Rollback caveat (FR-FLAG-1 AC 3).** Supersession is **data-shaped**: a flag rolls back code, not records. Group G requires its own rollback plan — this is the one place R7's "flag-off = no data effect" posture does not hold, and the design says so rather than implying otherwise.


### 2.7 Prescription
**Implements:** FR-RX-1, FR-RX-2 · **Decision:** D3 · **Principle:** P1

**No new prescription module.** `PrescriptionModule` ✅ is reused (post-ED-ARCH-001 remediation — it calls `axiosClient.get` directly today ✅, which must be routed through its repository/hook **before** composition, per ED-DEP-1).

**Lifecycle (FR-RX-1).** R7 implements **only** the verified persisted lifecycle: `tenant_prescription.status` → `document_status` ENUM `DRAFT/FINAL/SIGNED` ✅ (+ `SUPERSEDED` via §2.6). Signing writes `signed_by_staff_id`/`signed_at` ✅ and is the point the prescription becomes dispensable.

**Design prohibition.** **No `Issue` or `Dispense` action is designed, contracted, or rendered.** `PrescriptionStatus(draft/issued/dispensed)` has **zero runtime usages** ✅ and must not guide implementation (ED-DEP-5 / ED-ARCH-002). Editing is `DRAFT`-only; `FINAL`/`SIGNED` change only by amendment (§2.6).

**[R8] integration point only.** Dispensing fulfilment (`NOT_STARTED → PARTIALLY_DISPENSED → DISPENSED`) is a **separate domain object with its own lifecycle** — never merged into the document lifecycle. Copy-forward (FR-RX-2) is **not built in R7**; its reconciliation gate cannot check anything until R8 models allergies/medications (F-2).

### 2.8 Treatment Recommendation
**Implements:** FR-TR-1 · **Decision:** D8, "R7 Treatment Recommendation source identity" (Decision 11) · **Principle:** P8

**Reuse.** Existing recommendation routers/services ✅ (`POST /clinic/{tenant_id}/treatment-recommendations`) and `TreatmentRecommendationModule` ✅ (post-remediation). No new entity.

**Storage representation (Decision 11, T-BE-D.3a — corrects an earlier assumption in this section).** Recommendation has no independent backend entity or ID space of its own — `tenant_treatment_proposals` was removed pre-R7. The Recommendation-creation endpoint's own `TenantTreatmentSheet`/Treatment Order row **is** the storage representation; its `id` is the Recommendation's provenance identity. This row is explicitly discriminated from an ordinary directly-created sheet by `creation_source = RECOMMENDATION` (T-BE-D.3a) — `is_order`/`state` alone are NOT sufficient discriminators, since a second, independent live endpoint (`send-to-scheduling`) reaches the identical `is_order=True`/`state=ORDERED` state on ordinary sheets. This is a legacy-source representation for R7 MVP, not a claim that Recommendation and Plan are one entity.

**Design boundary.** The Recommendation answers *"should this patient receive a course?"* and **does not own the course design** — that is the Plan (§2.3). It carries no committed dates. The Recommendation → Plan edge is **one-directional**: a Recommendation may lead to **one** approved Plan (FR-TR-1 AC 1, enforced by T-BE-D.3a's partial unique index on `tenant_treatment_plans (tenant_id, originating_recommendation_id)`); the Plan records its originating Recommendation (§2.3 shape).

**Handoff.** The doctor→admin handoff is not new mechanism: it is the existing lifecycle status ✅ surfaced as `waiting_role` by §2.1 (FR-WFA-2), so the originating role can see the ball is in another court.

### 2.9 Patient Safety — R7 scope
**Implements:** FR-PS-1, FR-VCC-4 · **Decision:** F-2 = Option A · **Principle:** P1

**Design consequence of a verified absence.** Allergies do not exist in the backend ✅ (`grep -rn "allerg" app/ -il` → empty); interactions and renal/hepatic indicators are not modelled ✅; `tenant_treatment.contraindications` ✅ is free text describing *a therapy*, not *this patient*; medicines are opaque JSONB ✅ (displayable, not reason-over-able).

**Therefore R7's safety surface is exactly:** pending clinical reviews ✅ · active prescription existence/status ✅ · active episode ✅ · treatment session progress ✅ · billing state ✅.

**Hard design prohibition (FR-PS-1 AC 1–3).** No allergy/intolerance/interaction/renal/hepatic/contraindication panel is designed or rendered in R7. **An unbacked safety field is never displayed** — the frontend's existing `allergies` field ✅ (ED-ARCH-003) must not be surfaced: an empty allergy field reads as *"no known allergies"*, a false clinical negative. This is a **design rule, not a UI preference**.

**[R8] integration point.** The safety model is backend-first in R8; the VCC's "before you act" region is the designed insertion point, and it is built so adding R8 signals requires no restructuring — only new backend fields.

### 2.10 Legacy Transition
**Implements:** FR-LEG-1, FR-LEG-2 · **Principle:** AC-6/AC-8

**No screen deleted in R7** (FR-LEG-1). Staged: Discover → Introduce → Shadow → Validate → **Redirect** (R7 stops here) → Deprecate → Remove.

**Redirect design (FR-LEG-2).** Thin route adapters map legacy routes to workspace stages, preserving params so deep links land on the correct stage:
- `appointments/[id]/start-consultation` · `episodes/[id]/consultation` · `episodes/[id]/complete-consultation` → `workspace?step=…`
- standalone casesheet/prescription create/edit → workspace, reusing the **existing** flags ✅ (`caseSheetRouteFlagSwitch`, `prescriptionRouteFlagSwitch`) rather than adding new ones.
- A standalone *"new case sheet per visit"* entry **redirects to the Episode's sheet** (§2.2) — it models the wrong thing (FR-CS-1), so redirecting it is a correctness fix, not just consolidation.

**Gate.** The **completion route must not be composed** until §2.1 makes summary/readiness backend-owned (ED-DEP-2 / ED-ARCH-004) — otherwise R7 imports the violation into the COS.

**Rollback.** Every redirect is flag-reversible; original routes remain intact (never deleted in R7).

---

## 3. Frontend Design

**Implements:** FR-COS-1, FR-COS-2, FR-VCC-1, FR-VCC-2, FR-VCC-3, FR-VCC-4, FR-MOB-1, FR-MOB-2, FR-REC-2, FR-RBAC-1, FR-HIST-1 *(amended v1.1)* · **Principles:** P9 · **AC:** AC-2

```
app/clinic-admin/episodes/[episodeId]/workspace.tsx      ← EXISTING route (reused, not replaced)
  └── VisitCommandCenter                                  ← NEW shell (flag cos_v1)
        ├── WorkspaceProvider                             ← REUSE (patient/episode/visit context ✅)
        ├── BriefingRegions (why-today · what-changed · before-you-act · billing)  ← NEW, render-only
        ├── WorkflowPills                                 ← NEW, render-only
        ├── NextActionBar                                 ← NEW, render-only (+ deviation menu)
        └── active-stage body:
              CaseSheetModule · PrescriptionModule · TreatmentRecommendationModule
              ClinicalServicesModule · TreatmentPlansSection · ClinicalTimeline   ← ALL REUSE
```

**Every new frontend component is render-only** (FR-COS-2). The workflow-intelligence contract is fetched by **one application-layer hook** with a canonical query key; presentation never touches a datasource (AC-2).

**Removed, not added (FR-COS-2, ED-DEP-3):** `buildSectionConfig()`'s assembly and `nextAction()`-style derivation do not move into the new components — they cease to exist in R7 paths. This is why the frontend gets *smaller* under D9.

**Freshness.** Reuse the verified flag/invalidation discipline (`isFreshnessV1Enabled` ✅); no forced remounts to fake freshness.

**Mobile (FR-MOB-1/2).** Sticky next action · horizontal pill rail with active auto-scrolled into view · one primary task · ≥44pt · **never colour-alone** (icon + text) · **no dot-only pills**.

**Role composition (FR-RBAC-1).** `episodeWorkspaceConfigByRole` ✅ extends 2→5 roles **as config**. It may hide a CTA; it is **never** the authority — actionability comes from backend `blocking_factors`/`waiting_role` (FR-WFA-2).

**Hierarchical history (FR-HIST-1, amended v1.1).** `ClinicalTimeline`/`useClinicalTimelineData` are **modified, not replaced**: the hook stops assembling five independent flat queries and instead consumes §2.1a's `history_items[]` contract directly; it **stops computing `completedSessionCount` locally** (the corrected, backend-derived count arrives on the `treatment_plan` item). `ClinicalTimeline.tsx`'s rendering gains: collapsed/expanded Plan-group state (local UI state only, per FR-HIST-1's own rule), a `treatment_review`/`legacy_treatment_sessions` visual treatment alongside the existing `consultation`/`treatment_plan` types, and per-type icon+label distinction — extending the file's already-theme-compliant pattern (`useClinicTheme()`, verified during T--1.1's theme review), not introducing a new styling system. **No second frontend-derived timeline model is created** — this is the same file, corrected.

---

## 4. Contracts (semantics only)

| Contract | Serves | Shape (semantics) | Prohibited |
|---|---|---|---|
| Workflow intelligence (read) | FR-WFA-1/2, FR-REC-1, FR-CR-1 | stages[] · recommended_action · reason · blocking_factors[] · waiting_role · completion_readiness{} · alternatives[] | colours · icons · layout · UI labels (AC-4) |
| Workspace context (read) | FR-VCC-1..4 | patient/episode/visit context · what-changed signals (8, R7 scope) · verified safety signals only | allergy/interaction/renal panels (F-2) |
| Billing visibility (read) | FR-BILL-1 | charges · invoice status · payment status · outstanding | write operations (R7) |
| Case sheet write | FR-CS-2/3/4 | + explicit current `visit_id` **[VP transport]** | inference from `appointment_id` |
| History hierarchy (read) *[amended v1.1]* | FR-HIST-1/2 | `history_items[]`: consultation \| treatment_review \| treatment_plan{session_counts, sessions[]} \| legacy_treatment_sessions | colours · icons · layout · UI labels · any frontend-computable aggregate (AC-4) |

All state codes travel with **localization keys**; the frontend renders the label (R5/R6 precedent ✅).

---

## 5. Testing Strategy

| Layer | Strategy | Precedent |
|---|---|---|
| `clinical_workflow_resolver` | **pure unit tests, no DB** — one per assembly example (GP · Ayurveda · Physio · follow-up · review · therapist), plus recommendation/blocking/waiting-role cases | `treatment_lifecycle_resolver` ✅, `capability_resolver` ✅ |
| `clinical_workflow_service` | mocked repositories (`AsyncMock(spec=...)`) ✅ | R6 Group C ✅ |
| Case sheet F-1 | N-visit attribution; each rejection (episode/patient/tenant); **failure injection → neither content nor contribution persists**; retry → exactly one contribution | R6 falsification discipline |
| Treatment Plan | persistence independent of schedule; reschedule leaves Plan untouched; schedule-only change creates no version | — |
| Sessions | identity survives date/therapist/room change; **doctor content survives reschedule**; execution never overwritten | — |
| Contract | **semantics-only guard** — response contains no presentation fields | AC-4 |
| Architecture | resolver imports no infrastructure; **no FE derivation in R7 modules**; no presentation→transport import in touched files | ED-ARCH-001/004/006 |
| Regression | both suites vs baseline; flag-off parity | R4–R6 |
| Real-DB | disposable Postgres for the additive migration up/down (**not** Supabase) | R6 T-A.1 ✅ |

---

## 6. Rollback

| Change | Rollback |
|---|---|
| COS shell, pills, next-action, briefing | flag `cos_v1` off → today's behaviour, **no data effect** |
| Workflow intelligence contract | additive read endpoint — drop cleanly |
| Case sheet F-1 fix | revert service (behaviour-additive: correct attribution + explicit failure) |
| Treatment Plan | drop the additive table (no existing table altered) |
| Billing visibility | additive read — remove |
| **Living-document supersession** | ⚠ **data-shaped — a flag does not roll this back.** Group G needs its own plan |

---

## 7. Sequencing (design-level dependencies; task decomposition is `tasks.md`'s job)

```
ED-ARCH-001 remediation (reused modules)  ─┐
                                           ├─► FE composition may begin
Case sheet F-1 (service)  ─────────────────┘
Workflow intelligence (resolver+service) ──► FE renders pills/recommendation (hard dependency)
Treatment Plan entity (+migration) ────────► Sessions/scheduling ──► FE treatment experience
                                           └─► History hierarchy projection ──► FE hierarchical history [amended v1.1]
Billing read ──────────────────────────────► FE billing stage
Supersession (schema, deferrable) ─────────► amendment surfaces
```
**Hard rule:** no interim frontend reconstruction while a backend contract is pending (D9). If the contract is late, the frontend waits — it does not derive. **The history hierarchy is a hard consumer of Treatment Plan** (§2.1a) — its Plan-grouping half cannot ship, even partially, before `T-BE-D`/`T-BE-E` complete; the consultation/treatment-review half does not share this dependency and may proceed independently.

---

## 8. Traceability

Every design section names the requirements it implements (headers above). Reverse coverage, and requirement→task-group mapping, are maintained in [`requirements-traceability-matrix.md`](requirements-traceability-matrix.md) — not duplicated here.

**Design decisions that are deliberately deferred (each owned by a requirement's [VP] or an ETX):** case-sheet write transport (FR-CS-2) · idempotency key (FR-CS-4) · Plan status spelling (FR-TP-2) · `Missed` spelling (FR-TS-5) · supersession representation (FR-LD-1) · appointment purpose existence (**ETX-3**) · permission codes (**ETX-1**) · legacy `treatment_plan` column disposition (**ETX-5**). **`ETX-4` (capability-change-mid-episode) is resolved** — the owner-approved capability-loss policy is frozen and implemented through the clarified `T-BE-B.1`/`T-BE-B.2`/`T-FE-E.6` acceptance criteria ([R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md](R7-CAPABILITY-CHANGE-MID-EPISODE-VERIFICATION.md)).

**This design adds no scope absent from requirements v1.1.** Where it says "Small" or "subtractive," that is a verified finding, not an estimate. **v1.1 amendment (2026-07-18):** §2.1a and the FR-HIST-1 paragraph of §3 are the only sections added; nothing else in this document was reopened.

---

## 9. Internal-Consistency Statement

- Every design section maps to ≥1 frozen requirement; no orphan design exists.
- No design choice contradicts P1–P9 or AC-1–AC-8.
- No design choice implements an `[R8]` concept.
- Every deferred detail names its owning requirement/ETX — no silent gaps.
- Two design choices are **subtractive** (remove FE derivation; remove the contribution guard) — recorded because they *reduce* effort against the earlier estimate and should not be re-inflated in `tasks.md`.

**Open for owner review before `tasks.md`:** (1) the aggregate-read choice over per-entity enrichment (§2.1); (2) `tenant_treatment_plan` naming/prefix (§2.3); (3) accepting that Group G's supersession has no flag-based rollback (§6).
