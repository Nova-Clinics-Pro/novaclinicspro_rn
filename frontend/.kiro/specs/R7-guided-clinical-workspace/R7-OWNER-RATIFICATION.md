# R7 — Owner Ratification (authority document)

**Status:** Ratified by the Product Owner, 2026-07-17. **This document is the authority for the R7 task plan and all R7/R8 design documents.** Where any other R7 document disagrees with this one, this one governs.
**Constraints honoured:** no code, API, schema, migration, branch, worktree, route, screen, commit, or database change was made producing it.
**Baselines:** backend `dev` `8b23568` · frontend `dev` `cd86021` (both verified unchanged).

> ## Two ratified decisions are **qualified by verified code findings** (engineering-truth, this task)
> The owner instructed: *"Do not guess"* (Decision 1) and *"Do not invent unsupported clinical rules"* (patient safety). Both instructions surfaced blocking realities:
> - **F-1 — Decision 1 is not achievable with current contribution logic.** Contributions after the first are **mis-attributed to the creating visit**. See Decision 1 §Verified finding.
> - **F-2 — R7's ratified patient-safety scope is largely unbuildable: allergies do not exist in the backend.** The W0 wireframe in the prior review **fabricated** an allergy warning. See §Patient-Safety Reality Check.
>
> Both require an owner response before the task plan can be frozen. Neither is a reason to reject the ratification — both are reasons to **narrow it honestly**.

---

## Decision 1 — Case Sheet Binding · **RATIFIED (with a blocking defect to fix)**

**Decision.** One Case Sheet per **Episode**, with **append-only contributions** from multiple Visits. The Case Sheet is not recreated per appointment.

```
Episode
└── Case Sheet
    ├── Stable longitudinal assessment
    ├── Diagnosis / problem representation
    ├── Specialty-specific assessment
    ├── Longitudinal care context
    └── Visit Contributions (Visit 1 … Visit N)
```

**Rationale.** The codebase already implements this intent: `TenantCasesheetContribution(tenant_id, casesheet_id, visit_id, staff_id, contributed_at)` exists solely to attribute many visits to one case sheet (Phase 2, ADR-P2-03). The original R7 package's per-visit model would have created a second case sheet per visit — duplicating clinical records and breaking episode continuity.

**Alternatives rejected.** *Per-visit case sheet* (original package) — rejected: contradicts the contribution model and fragments longitudinal care. *Per-patient case sheet* — rejected: conflates distinct clinical problems into one document.

### Verified finding F-1 (engineering-truth; owner asked not to guess) — **BLOCKING**

**What `appointment_id` on `tenant_casesheets` actually means:**

| Question | Verified answer | Evidence |
|---|---|---|
| Is it authoritative binding? | **No.** The column comment reads *"Optional linkage (loosely coupled)"*; `nullable=True`, `ondelete="SET NULL"`. | `tenant_casesheet.py` |
| Is it ever reassigned after creation? | **No.** Set once at create (`casesheets_router.py:115` → `casesheets_service.py:134`). `update_data` in `update_casesheet` excludes it (as it excludes `episode_id`, which is explicitly *"immutable and cannot be changed via update"*). | `casesheets_service.py` |
| What is it used for? | (a) an optional **list filter**; (b) **resolving the Visit for contribution attribution** — *"The Visit is resolved server-side from the Case Sheet's own `appointment_id` (design S14)"*. | `sqlalchemy_casesheet_repository.py:68-69`; `casesheets_service.py:194-196` |

**Verified meaning: `appointment_id` = creation provenance — the appointment that created the Case Sheet. It is *not* the latest contributing appointment, and it is *not* authoritative binding.**

**The blocking defect this exposes.** Because attribution resolves the visit from the *case sheet's* `appointment_id` (fixed at creation), under the ratified per-Episode model:

- Visit 1 creates the case sheet (`appointment_id = A1`) → contribution attributed to visit(A1). Correct.
- Visit 2 updates the **same** case sheet → `appointment_id` is **still A1** → contribution attributed to **visit(A1) again**. Wrong.

**Every contribution after the first is attributed to the creating visit.** The append-only model exists but records the wrong author-visit — silently corrupting the longitudinal attribution Decision 1 depends on. A second, related risk: the code documents that when no visit resolves, *"no contribution row is inserted; the content update still succeeds (additive, not an error)"* — under the per-Episode model, **a visit's clinical note can be silently dropped from the record**. Tolerable under the old per-visit reading; a **clinical-record-integrity gap** under the ratified one.

**Recommended future disposition (not executed here; no schema change in this task):**
1. **Contribution attribution must resolve the visit from the *current write context*** (the visit being authored), **not** from `casesheet.appointment_id`. This is a **service-layer correction and is blocking for Decision 1** — Group A-BE.
2. **`episode_id` becomes the authoritative binding** and should become non-nullable **after** a data audit (records with null `episode_id` must be classified first).
3. **`appointment_id` is retained, its meaning documented as "creating appointment" (provenance only)**, and **must never again be used to resolve current-visit attribution**. Physical removal is a later, separately-approved migration once nothing reads it as binding.

**Product impact.** High — record integrity. **Architecture impact.** Service-layer correction + eventual nullability migration. **Code/schema change likely later:** yes (service now; nullability/removal later). **Documents affected:** state definitions, gap matrix, interaction matrix, task plan (Group A-BE), design.

---

## Decision 2 — Living Documents through Supersession · **RATIFIED**

**Decision.** Living clinical documents remain amendable; **signed historical versions are never mutated.** Lifecycle: `DRAFT → FINAL → SIGNED → SUPERSEDED (by an amended version)`. Applies to Case Sheet, Prescription, Treatment Plan, and Treatment Sheet where legally/clinically appropriate.

| State | Ratified meaning |
|---|---|
| `DRAFT` | editable; actively authored; **not an attested clinical record** |
| `FINAL` | complete for the current authoring purpose; not silently editable; ready for signing; **not "immutable forever"** |
| `SIGNED` | a named clinician attests to **that exact version at that time**; that version is immutable; permanently printable; **may be superseded**; **never unlocked and overwritten** |
| `SUPERSEDED` | replaced by a newer version; retained forever; printable and auditable; visibly marked; **never deleted by ordinary editing** |

**Amendment must:** create a new version · reference the superseded version · preserve the previous version unchanged · record author, reason, timestamp · require the appropriate permission · follow the normal draft/final/sign lifecycle.

**Rationale.** Resolves the head-on contradiction between the code (`DocumentStatus`: *"FINAL: Locked, no content edits allowed. SIGNED: Immutable, terminal state"*) and the product need ("completion must never imply permanent locking"). Supersession satisfies **both**: legal/clinical integrity of the attested version, and clinical freedom to correct/extend. It is architecturally continuous with **R6's proven invariant** (*immutable once referenced; evolution through supersession; the prior remains, so history stays interpretable*) — a mechanism already shipped and falsification-tested on `dev`, not a new invention.

**Alternatives rejected.** *Hard locking* — rejected: clinicians genuinely must correct records; forces out-of-band workarounds. *Free mutation of signed records* — rejected: destroys attestation, audit and legal defensibility.

**Product impact.** High (audit/print/share). **Architecture impact.** High — document versioning model. **Code/schema likely later:** **yes** — a version/supersession representation is a schema change (deferred; not designed in this task beyond the model). **Documents affected:** state definitions, interaction matrix, wireframes, feasibility, task plan (Group G), design.

**Note (engineering-truth):** `DocumentStatus`'s docstring will contradict this ratification until it is updated. That is a **documentation-vs-ratification** contradiction to close in Group G — it must not be silently ignored, and no code changes it in this task.

---

## Decision 3 — Prescription Lifecycle · **RATIFIED**

**Decision.** R7 uses **only** the verified persisted document lifecycle: `DRAFT → FINAL → SIGNED`. **`ISSUED`/`DISPENSED` must not be designed or implemented in R7.**

**Rationale (verified).** `tenant_prescription.status` is `postgresql.ENUM("DRAFT","FINAL","SIGNED", name="document_status")`. The `PrescriptionStatus` enum (`draft/issued/dispensed`) has **zero runtime usages** (`grep -rn "PrescriptionStatus" app/` → only its own definition). The original R7 package inferred a lifecycle from an unused enum's *name* — the exact failure engineering-truth exists to prevent.

**Technical debt recorded (do not delete in this task):** `PrescriptionStatus` exists · has no verified runtime usage · prior R7 documents incorrectly inferred behaviour from it · **it must not guide implementation** · its future disposition requires a separate product decision. → tracked as **`ED-ARCH-002`** in both repos' `ENGINEERING-DEBT.md`.

**Future pharmacy separation (documented, not built in R7).** If dispensing is required, it must be a **separate fulfilment lifecycle**, never merged into the document lifecycle:
```
Prescription Document :  DRAFT → FINAL → SIGNED
Dispensing Fulfilment :  NOT_STARTED → PARTIALLY_DISPENSED → DISPENSED
```
Rationale: a document's attestation state and a fulfilment process are different facts with different owners (prescriber vs pharmacy); overloading one enum with both is what produced this drift.

**Alternatives rejected.** *Implement `ISSUED`/`DISPENSED` in R7* — rejected: would ship UI transitions the backend cannot perform. *Delete the enum now* — rejected: out of scope for a design task; requires its own decision.

**Product impact.** Removes fictional actions. **Architecture impact.** None (removes an invented model). **Code/schema likely later:** only if dispensing is approved (then: new model + migration). **Documents affected:** state definitions, interaction matrix, gap matrix, wireframes, design.

---

## Decision 4 — Clinical Advice Scope · **RATIFIED → R8**

**Decision.** One shared, **optional, capability-driven** Clinical Advice framework for: Diet · Exercise · Lifestyle · Home Care · Restrictions · Follow-up Advice. **Prescription, Treatment Recommendation, Treatment Plan and Treatment Sheet are NOT merged into it.** **Assigned to R8** (unless a minimal structural placeholder proves necessary for R7 core).

**Rationale.** The six advisory concepts share one shape (advisory; no independent lifecycle; authored during the visit; printed/shared together; capability-gated; specialty-labelled) and today have **no home at all** — every specialty would otherwise re-invent them. The four excluded concepts have materially different lifecycle, regulatory, signing, resource, scheduling and execution semantics; merging them would destroy exactly the semantics that make them safe.

Framework must be: optional · capability-driven · **clinic-type independent** · specialty-extensible · clinician-editable · printable/shareable by authorised operational users · visible in the patient timeline · reusable across visits · copy-forward-with-review capable. Specialty supplies **labels** (Pathya/Apathya · home exercise programme · oral hygiene), never workflow presence.

**Alternatives rejected.** *Unify all eight* — rejected (clinical-safety risk + migration of two mature lifecycles). *Unify none* — rejected (six concepts remain homeless).

**Product impact.** High (R8). **Architecture impact.** New bounded model (additive). **Code/schema likely later:** yes, in R8. **Documents affected:** design, gap matrix, task plan (R8 handoff), feasibility.

---

## Decision 5 — Prescription Copy Forward · **RATIFIED → R8 (mandatory reconciliation gate)**

**Decision.** Approved **only with a mandatory reconciliation gate**. **Not implemented in R7** unless required for COS-core validation; full capability planned for **R8**.

**Must:** create a new `DRAFT` · preserve the previous prescription unchanged · record source prescription **and source version** · visibly identify copied items · allow per-item review/add/edit/remove · **never silently reactivate a discontinued medicine** · **never silently overwrite a current prescription** · require doctor review before finalisation/signing · check current allergies · check current medicines where data exists · surface interaction/renal-risk warnings **where the system supports them** · preserve an audit trail · clearly distinguish **copy / renew / edit**.

**Rationale.** Genuinely valuable for chronic care, and the schema is already partly ready (`repeated_from_prescription_id` / `repeat_previous_prescription_id` exist — verified in Phase-2 characterization tests). Without the reconciliation gate it is the **highest clinical-safety risk in the entire package** (silently perpetuating a stale or unsafe regimen).

**Qualified by F-2.** "Check current allergies" and "surface interaction/renal-risk warnings" **cannot be built today** — that data does not exist (see §Patient-Safety Reality Check). The owner's own qualifier *"where the system supports them"* is doing heavy lifting: **today the system supports none of them.** R8 must therefore deliver **allergy/medication data modelling before or with** copy-forward, or copy-forward ships with a reconciliation gate that cannot actually check anything — which would be **worse than not shipping it**, because it implies a safety check that does not occur.

**Alternatives rejected.** *Copy-forward without reconciliation* — rejected outright (unsafe). *No copy-forward* — rejected (real clinical need).

**Product impact.** High (R8). **Architecture impact.** Medium. **Code/schema likely later:** yes (R8; plus allergy/medication modelling). **Documents affected:** gap matrix, interaction matrix, task plan (R8), design review.

---

## Decision 6 — Billing: Warning, not Blocking · **RATIFIED**

**Decision.** **Clinical completion ≠ financial completion.** Billing is **visible** in the COS. Doctors get **read-only visibility**; admins/front desk manage charges, invoices, discounts, taxes, payments, balances, and write-offs where permitted. **Default: unbilled services produce a visible warning; the doctor may clinically complete the visit; operational closure may remain pending; billing never blocks clinical work by default.** Any tenant policy that blocks operational closure must be **explicitly configured**, never hard-coded in R7.

**Rationale.** The spine already exists and is mandatory — `TenantClinicalService.visit_id` is **`nullable=False`** (every clinical service is bound to a visit; Phase 2 ADR-P2-05) → `TenantInvoiceLine.clinical_service_id` → invoice → payment. The original package omitted billing entirely despite this finished spine. Holding clinical work hostage to billing is clinically wrong; silently losing charges is an operational defect. A warning resolves both.

**Workspace must show:** consultation charges · clinical services · therapy/session charges · medicines · consumables · procedures · invoice status · payment status · outstanding balance.

**Alternatives rejected.** *Hard block on unbilled services* — rejected (clinical work must not be gated by finance). *Omit billing* — rejected (visit completion would lie).

**Product impact.** High. **Architecture impact.** Medium (reuse existing spine). **Code/schema likely later:** additive read contract; no schema change expected. **Documents affected:** design, wireframes, interaction matrix, state definitions, gap matrix, task plan (Group F).

---

## Decision 7 — Recommendation-with-Deviation · **RATIFIED**

**Decision.** The phrase *"the system should always know"* is **rejected**. Adopted principle:

> The Clinical Operating System must always identify the **best-supported next action**, **explain why**, show **blockers or role ownership**, and make **alternative action paths immediately available. The clinician remains the decision-maker.**

Every recommendation provides: recommended action · reason · supporting context · blocker if any · role owner if waiting · alternative-action menu · ability to deviate without fighting the system.

**Rationale.** Clinical accountability sits with the clinician. Constitution 03 holds that derived/AI layers are **consumers, never owners** of clinical truth, and every contribution must remain explainable and attributable — "always knows" quietly crosses that line. Patients deviate constantly; a system that knows only one path strands exactly the cases that matter most. Prescriptive sequencing also edges toward clinical-decision-support classification.

**Explicitly forbidden:** forced clinical sequencing · automatic clinical decisions · a generalized clinical-decision-support engine.

**Alternatives rejected.** *"System always knows"* — rejected as above.

**Product impact.** Defines the COS's core interaction. **Architecture impact.** Low (derivation module). **Code/schema likely later:** no. **Documents affected:** design, wireframes, interaction matrix, task plan (Group D).

---

## Decision 8 — R7 / R8 Scope Split · **RATIFIED**

**Decision.** The combined scope is **Large/Very Large** and must not ship as one phase.

**R7 — Clinical Operating System Core:** Visit Command Center (why today / what changed / before you act) · recommendation-with-deviation · dynamic capability-driven workflow assembly · workflow pills · mobile-first · role handoffs · billing visibility · completion readiness · interruption/resume · **domain corrections** (one Case Sheet per Episode, append-only contributions, verified prescription lifecycle, supersession model, state definitions, Business State/Workflow Progress/Next Action/Status Badge separation) · **patient safety (see F-2 — scope must be narrowed)** · **treatment core** (recommendation, plan as intent, scheduling intent, capability-driven multi-session, stable session identity, schedule attributes separated from clinical content, per-session doctor instructions, therapist actuals, reschedule without instruction loss, sequential + non-sequential) · **architecture/migration** (ED-ARCH-001 remediation, canonical existing route, flag-gated, no third workspace, legacy adapters, no deletion, rollback).

**R8 — Longitudinal Clinical Intelligence:** structured laboratory measurements · manual lab entry · visit attachments · LIONIC adapter · future LIS/FHIR/device adapters · comparative lab tables · trend visualisation · structured measurement-based "what changed" · Clinical Advice framework · prescription copy-forward · richer medication reconciliation · broader longitudinal attachments · advanced clinical summaries.

**R7 "what changed" is limited to currently available data:** last visit date · latest visit summary · active treatment sessions · completed session count · pending review · current prescription existence/status · active episode · **existing billing state**. *(Allergies were listed by the owner here — see F-2: not available.)*

**Rationale.** R4–R6 succeeded on additive, reversible, one-task-at-a-time delivery. A Large/VL single phase abandons the discipline that produced that track record.

**Product impact.** Sequencing. **Architecture impact.** Clean boundary (R8 consumes R6 semantics; R7 doesn't block on it). **Code/schema likely later:** yes, both phases. **Documents affected:** all.

---


---

## Decision 9 — Backend Owns Workflow Intelligence · **RATIFIED** *(2026-07-17 addendum)*

**Decision.** All workflow recommendation semantics move to the backend. The backend is authoritative for: `recommended_action` · `recommendation_reason` · `blocking_factors` · `waiting_role` · `completion_readiness` · outstanding mandatory work · optional suggested work · **workflow assembly** · recommendation confidence (future). **The frontend is a presenter only.**

**Architectural direction — replaces the previous flow:**
```
BEFORE (rejected):  Backend State → Frontend nextAction() → Recommendation
AFTER  (ratified):  Clinical Context → Backend Clinical Workflow Service → Recommendation → API → Frontend Presentation
```

**Naming — recommended, from verified backend convention.** Call it the **Clinical Workflow Service** (`app/application/services/clinical_workflow_service.py`), matching the existing `clinical_semantic_resolution_service.py` / `capability_resolution_service.py` naming exactly. **Recommended split, following R4/R5 precedent:** a **pure domain resolver** (`app/domain/services/clinical_workflow_resolver.py`) that assembles the workflow and derives the recommendation as a **pure function over immutable snapshots**, fed by the application service which gathers the facts. This is precisely the shape `treatment_lifecycle_resolver.py` (R4) and `capability_resolver.py` (R5) already have — both pure, both `app/domain/services/`, both importing nothing from infrastructure. Reusing that proven shape keeps the domain pure and makes the recommendation unit-testable without a database.

**This is ordinary backend business logic.** It is **not** BPM, **not** a rules engine, **not** AI, **not** a generic workflow engine. `treatment_lifecycle_resolver` is the existing proof that this class of logic is just a well-tested pure function in this codebase.

**Semantics, not presentation.** The backend returns:
```json
{ "recommended_action": "...", "reason": "...", "blocking_factors": [...],
  "waiting_role": "...", "completion_readiness": {...} }
```
It must **never** return button colours, icons, layout, or UI labels. **Backend owns semantics; frontend owns presentation.** (State codes travel with localization keys, per the R5/R6 precedent — the frontend renders the label.)

**Rationale.** A recommendation *is* a clinical/business fact: it asserts what should clinically happen next. Under **Decision 8's addendum principle** (Backend Owns Clinical Truth), *workflow recommendations* and *completion readiness* are named clinical facts. Leaving `nextAction()` in the frontend would have (a) made the presenter an authority on clinical sequencing, (b) duplicated backend lifecycle rules — the exact defect **R4 already fixed once** by re-pointing frontend-derived treatment status to backend-resolved `lifecycle_status`, and (c) guaranteed drift between what the UI recommends and what the backend can actually perform.

**Alternatives rejected.** *Frontend `nextAction()`* (the prior R7 design) — rejected: presenter becomes clinical authority; duplicates backend rules. *Backend returns rendered UI* — rejected: collapses the semantics/presentation boundary; a UI change would require a backend release.

**Product impact.** Medium — behaviour unchanged for the clinician; authority relocated. **Architecture impact.** High — corrects the COS's central contract. **Implementation consequence:** recommendation generation moves **Group D-FE → Group D-BE**; frontend shrinks, backend grows. **Code/schema likely later:** new service + additive endpoint; **no schema change**. **Documents affected:** design, feasibility, task plan, design review, engineering debt.

---

## Decision 10 — Clinical History Hierarchy · **RATIFIED** *(v1.1 amendment, 2026-07-18)*

**Decision.** Clinical history is part of R7 COS core, not R8. Doctor consultations and Treatment Reviews are **top-level** clinical encounters. Therapy Sessions are **grouped beneath their authoritative Treatment Plan**. The backend owns encounter classification, Plan-to-Session association, and Plan/session aggregates; the frontend renders a collapsible hierarchy and owns nothing else.

**Verified problem this decision closes.** `useClinicalTimelineData` ✅ flattens every appointment — consultation or therapy — into one undifferentiated `'visit'` item; its own partial session-grouping computes a completed-session count from **scheduled** rows, not **completed** ones (a verified defect, `ED-ARCH-007`); and therapy appointments still separately leak through as flat items alongside that same grouping (double representation). Full evidence: [R7-HISTORY-HIERARCHY-AMENDMENT.md](R7-HISTORY-HIERARCHY-AMENDMENT.md).

**Rationale.** (1) corrects current misclassification of therapy encounters as doctor consultations; (2) removes double representation of therapy sessions; (3) prevents frontend-derived session aggregation — the same DP-15/P3 discipline Decision 9 already applied to workflow recommendation, extended here to a surface (history) not previously named; (4) makes the first-class Treatment Plan (Decision 2/Treatment Plan resolution) **meaningful in patient history** — without this decision, the new Plan entity would ship with no history representation at all; (5) it is Clinical Operating System core (viewing what happened to this patient), not advanced clinical intelligence (trends, labs, AI).

**Alternative rejected: defer to R8, retain the flat history in R7.** Rejected because: it leaves a known clinical-history misclassification live in R7's own COS surface; it duplicates treatment execution representation; it undermines the first-class Treatment Plan entity R7 itself introduces (Decision: Treatment Plan resolution); it preserves a frontend-derived, verifiably incorrect aggregate (ED-ARCH-007) inside R7's release, not merely a pre-existing debt item left alone.

**Sequencing constraint (not a rejection, a scheduling fact).** The feature is **sequenced after** the Treatment Plan backend (`T-BE-D.4`) and stable Session association (`T-BE-E.1`) are available — the Plan-grouping half has no data to group by before then. **It does not block unrelated Group -1 Engineering Truth tasks** (T--1.4 onward proceed independently).

**Product impact.** Medium-High — directly changes what doctors see reviewing a patient's course, closing a real, verified gap. **Architecture impact.** Extends (does not fork) the Clinical Workspace aggregate (§2.1a) — consistent with, not a departure from, Decision 9's "one aggregate" precedent. **Implementation consequence:** +7 tasks (`T-BE-A.3/A.4/A.5`, `T-FE-C.5/C.6/C.7`, `T-Z.9`), 70→77 total; +2 requirements (`FR-HIST-1/2`), 42→44 total. **Code/schema likely later:** additive backend read-model extension; **no schema change** by this decision itself (consumes the already-approved `tenant_treatment_plan` migration under `T-BE-D.2`). **Documents affected:** requirements.md (v1.1), design.md (§2.1a/§3), tasks.md (v1.1), requirements-traceability-matrix.md, R7-GUIDED-WORKSPACE-WIREFRAMES.md (W23), R7-WIREFRAME-IMPACT-MATRIX.md, R7-DESIGN-FREEZE-CHECKLIST.md, this document.

---

## Decision 11 — R7 Treatment Recommendation Source Identity · **RATIFIED** *(v1.2 amendment, 2026-07-24)*

**Decision.** No separate Treatment Recommendation entity is introduced in R7. The existing `TenantTreatmentSheet`/Treatment Order created through the verified `POST /clinic/{tenant_id}/treatment-recommendations` workflow is the storage representation of a Recommendation; its `id` is source provenance, persisted on `TreatmentPlan.originating_recommendation_id`. Treatment Plan remains a separate, independently persisted and versioned entity (Decision "Treatment Plan — RESOLVED"); scheduling, rescheduling, and execution never mutate the Plan or the source's provenance. This is a **legacy-source representation for R7 MVP**, not a claim that Recommendation and Plan are the same entity, and may be revisited after MVP — it is not itself an R7 requirement to change.

**Verified problem this decision closes (engineering-truth, T-BE-D.4 pre-implementation investigation).** `design.md` §2.8 and `requirements.md` FR-TR-1 both assumed an existing, independently identifiable Recommendation backend entity to "reuse." Verified reality: `tenant_treatment_proposals` (the only entity that ever matched that description) was deliberately dropped, along with its `treatment_proposal.*` permissions, by migration `20260228_130000_remove_treatment_proposals.py` — predating this R7 spec. The actual live Recommendation-creation endpoint (`treatment_orders_router.py`, permission `treatment_sheet.order`) creates a `TenantTreatmentSheet` and transitions it to `state=ORDERED`/`is_order=True` via `send_to_scheduling`. Further verified: that exact transition is **also** reachable through a second, independent live endpoint (`POST /treatment-sheets/{sheet_id}/send-to-scheduling`) on an ordinary sheet never created as a Recommendation — `is_order`/`state` alone cannot distinguish the two. **T-BE-D.3a** therefore adds an explicit, persisted `creation_source` discriminator (`RECOMMENDATION` | `DIRECT` | `NULL` for legacy-unknown rows, never backfilled/inferred) to `tenant_treatment_sheets`, plus a tenant-scoped partial-unique-index enforcement of "one Recommendation → at most one Treatment Plan" (FR-TR-1 AC1) on `tenant_treatment_plans (tenant_id, originating_recommendation_id) WHERE originating_recommendation_id IS NOT NULL`.

**Alternatives rejected.** *Recreate a dedicated Treatment Recommendation/Proposal entity* — rejected: reintroduces a subsystem the codebase's own history deliberately removed ("replaced by direct treatment sheet creation"), a real scope increase not required to satisfy FR-TR-1 as written. *Infer provenance from lifecycle state (`is_order`/`state`) alone* — rejected: verified two independent live code paths converge on the identical state, making inference unreliable and unsafe for a one-Plan-per-Recommendation guarantee. *Backfill legacy rows' `creation_source` from `is_order`/state/row-count/timestamps* — rejected: none of those signals reliably reconstructs true provenance; legacy rows remain explicitly unknown (`NULL`) and are never treated as eligible Recommendation sources.

**Does not change FR-TR-1's frozen outcome** ("a recommendation may lead to one approved Treatment Plan") — clarifies how that outcome is realized against verified current storage, nothing more.

**Product impact.** None — clinician-facing behaviour is unchanged; this is a storage-provenance clarification. **Architecture impact.** Low-medium — one additive column + CHECK constraint + partial unique index, no new entity, no router/DTO/workflow/scheduling changes. **Code/schema change:** yes — one additive, reversible migration (`T-BE-D.3a`), backend-only. **Documents affected:** this document, `design.md` §2.3/§2.8, `tasks.md` (new prerequisite task `T-BE-D.3a`, inserted before `T-BE-D.4`).

---

## Decision 12 — Case Sheet Contribution Snapshots (DO-2 amendment) · **RATIFIED** *(v1.3 amendment, 2026-07-25)*

**Decision.** DO-2's core invariant is retained unchanged: **there is exactly one current, editable Case Sheet per Episode** (`TenantCasesheet.data_json` remains the sole canonical, mutable document — never superseded, never forked). DO-2's *narrower* restriction — that a Case Sheet Contribution "holds NO clinical content" — is amended: `TenantCasesheetContribution` gains one additive, nullable `content_snapshot` JSONB column, populated with the exact validated `data_json` being committed at the moment a contribution is recorded.

**Amended DO-2 interpretation, stated precisely:**
> The Episode Case Sheet remains the sole current editable clinical document. A Case Sheet Contribution may retain an immutable content snapshot solely for Visit attribution, historical visibility, auditability, and continuity. The snapshot is not an independently editable Case Sheet and is not a second source of current truth.

A contribution snapshot is: append-only, immutable after insert, Visit-attributed (`visit_id`, unchanged), author-attributed (`staff_id`, unchanged), timestamped (`contributed_at`, unchanged), never independently edited, never treated as a second Case Sheet, and never used as the current write model. No JSON-patch or semantic-diff representation is introduced for MVP — the snapshot is the full `data_json` at that moment, stored and returned unreinterpreted.

**Verified problem this decision closes (engineering-truth, T-BE-E.1a pre-implementation investigation).** FR-CS-5 ("prior visits' notes visibly retained with author+timestamp, never overwritten") and its own frontend consumer, `T-FE-E.1b`, both require rendering historical contribution *content*. Verified reality: `TenantCasesheetContribution`'s own docstring states explicitly *"Holds NO clinical content — the Case Sheet's own content stays Episode-owned (DO-2)"* (Phase 2 · T-B.2, ADR-P2-03); its persisted columns are `id, tenant_id, casesheet_id, visit_id, staff_id, contributed_at, correlation_id, payload_hash` — no content field exists anywhere, and `payload_hash` is a one-way SHA-256 digest, cryptographically irreversible. `TenantCasesheet.data_json` is a single mutable document, overwritten in place on every update (verified in `casesheets_service.py`'s `update_casesheet` and in the frontend's own `CaseSheetModule.tsx` update call, which sends a full replacement, not a delta). Without amendment, FR-CS-5's AC is structurally unsatisfiable — not a missing endpoint, but a missing persisted fact.

**Alternatives rejected.** *Attribution-only history (author/timestamp, no content)* — rejected: does not satisfy FR-CS-5's own wording ("notes visibly retained"), and a timeline of "who touched this, with nothing to show for it" does not serve the clinical continuity purpose FR-CS-5 exists for. *JSON-patch/diff-based history* — rejected for MVP as unnecessary complexity; a full snapshot is simpler, correct, and sufficient, and the requirement never asked for a diff view. *A second, independently versioned Case Sheet entity* — rejected: would violate DO-2's core invariant (one current, editable document per Episode) and is explicitly out of this decision's scope; nothing here creates a versioning workflow.

**Legacy rows.** Existing contribution rows keep `content_snapshot = NULL` — never backfilled, never reconstructed from the current `data_json`, never inferred. The history API returns them with an explicit `content_available = false` state, never silently substituting current content for historical content.

**Product impact.** Enables FR-CS-5's own frontend surface (`T-FE-E.1b`) to render real historical content, not just attribution metadata. **Architecture impact.** Low — one additive, nullable, reversible column on an existing table; no new entity, no new write path beyond extending the existing atomic contribution-recording transaction (`T-BE-C.2`/`T-BE-C.3`/`T-BE-C.4`, unchanged in structure). **Code/schema change:** yes — one additive, reversible migration (`T-BE-E.1a`), backend-only, applied first to disposable local PostgreSQL only; the shared development database is not upgraded by this decision. **Documents affected:** this document, `design.md` §2.2, `tasks.md` (`T-BE-E.1a`'s own card), `RTM-MASTER.md` (FR-CS-5/FR-CS-6 entries only).

---

## Patient-Safety Reality Check — **F-2, BLOCKING, owner response required**

The owner scoped into R7 core: *"At minimum surface existing verified data for: allergies · active medicines · known contraindication warnings · pending clinical reviews · renal-risk indicators where existing data already supports them"* — with the instruction **"Do not invent unsupported clinical rules."** Verified against code:

| Safety item | Exists? | Evidence |
|---|---|---|
| **Allergies** | **No — nowhere in the backend.** `grep -rn "allerg" app/ -il` → **empty**. No column, no schema, no DTO. The only conceivable store is `tenant_client.metadata_` (opaque JSONB), and the backend API neither accepts nor returns an allergy field. **However the frontend declares an `allergies` string field** on `client.entity.ts` / `clients.dtos.ts` / `ClientForm` / `ClientDetailScreen` — a **frontend field the backend never persists or returns.** | verified both repos |
| **Contraindication warnings** | **Treatment-level only, free text.** `tenant_treatment.contraindications: Optional[str]` — *"Medical contraindications and warnings"*. This describes **a therapy**, not **this patient**. It cannot answer "is this contraindicated for this patient." | `tenant_treatment.py:69` |
| **Interaction warnings** | **Not modelled.** | verified |
| **Renal-risk indicators (eGFR/creatinine)** | **Not modelled.** (Measurements are R8.) | verified |
| **Active medicines** | **Only as opaque JSONB.** `tenant_prescription.prescription_data: dict` + `is_active: bool` + `document_status`. Medicines are **unstructured** — displayable, **not reason-over-able**. No reconciliation or interaction checking is possible. | `tenant_prescription.py` |
| **Pending clinical reviews** | **Yes.** `NEEDS_CLINICAL_REVIEW`/`UNDER_CLINICAL_REVIEW` (R4 resolver) + `tenant_treatment_clinical_review`. | verified |

### Reviewer error owned
**The W0 Visit Command Center wireframe in the prior design review displays an allergy warning and a renal-dose caution as headline safety features. Both are fabricated — neither data source exists.** That review invented exactly the kind of unsupported surface the owner forbade, in the same document that criticised the original package for inferring behaviour it had not verified. The wireframes are corrected.

### Consequence for R7
**R7's patient-safety group cannot be delivered as ratified.** Options for the owner:
- **(a) Narrow R7 safety to what exists (recommended):** pending clinical reviews · active prescription existence/status · active episode · treatment session progress · billing state. Honest, buildable, still valuable. **Allergies/interactions/renal → R8**, after data modelling.
- **(b) Extend R7 to model allergies** (new schema + capture UI + the frontend/backend contract fix): real scope increase, pushes R7 further into Very Large.
- **(c) Surface the frontend's existing `allergies` field** — **rejected**: it is not persisted or returned by the backend; displaying it would show a permanently empty or unreliable safety field, which is **more dangerous than showing nothing** (a clinician may read "no allergies shown" as "no allergies").

**Recommendation: (a),** with the frontend `allergies` contract drift recorded as debt (`ED-ARCH-003`) — an unbacked clinical-safety field in a shipped client entity is a latent hazard regardless of R7.

---

## Ratification Summary

| # | Decision | Status | Blocking qualifier |
|---|---|---|---|
| 1 | Case Sheet per Episode + append-only contributions | Ratified | **F-1** attribution defect (Group A-BE) |
| 2 | Living documents via supersession | Ratified | schema change later; `DocumentStatus` docstring contradiction to close |
| 3 | Prescription `DRAFT→FINAL→SIGNED` only | Ratified | `ED-ARCH-002` recorded |
| 4 | Clinical Advice (6 concepts) | Ratified → **R8** | — |
| 5 | Copy-forward + reconciliation gate | Ratified → **R8** | **F-2** — gate cannot check anything today |
| 6 | Billing warning, not blocking | Ratified | — |
| 7 | Recommend-with-deviation | Ratified | — |
| 8 | R7/R8 split | Ratified | R7 still Large after narrowing |
| 9 | **Backend owns workflow intelligence** | Ratified | recommendation moves D-FE→D-BE; **3 frontend violations found** (ED-ARCH-004/006) |
| 10 | **Clinical history hierarchy** *(v1.1)* | Ratified — **in R7, not R8** | sequenced after Treatment Plan (`T-BE-D.4`/`T-BE-E.1`); **1 new frontend violation found** (ED-ARCH-007); +7 tasks, +2 requirements |
| 11 | **R7 Treatment Recommendation source identity** *(v1.2)* | Ratified | no new entity; `creation_source` discriminator + one-Plan-per-Recommendation constraint (`T-BE-D.3a`, blocks `T-BE-D.4`); legacy rows stay unknown, never backfilled |

**Open decisions the owner must still make:** (i) F-1 disposition of `appointment_id` + nullability migration timing; (ii) **F-2 patient-safety option (a)/(b)/(c)**; (iii) whether Treatment Plan is a new persisted entity or an additive projection; (iv) whether session `Missed` is a status or a cancellation reason; (v) `PrescriptionStatus` deletion vs dispensing model.

---

## ARCHITECTURE PRINCIPLE — Backend Owns Clinical Truth *(ratification addendum, 2026-07-17)*

**The backend is the single source of truth for all clinical information. The frontend must never independently derive, infer, calculate, interpret or persist clinical meaning. The frontend is a presentation layer only.**

Clinical facts (non-exhaustive): allergies · intolerances · medication reconciliation · medication interactions · contraindications · laboratory interpretations · renal indicators · hepatic indicators · clinical measurements · diagnosis · treatment eligibility · patient-safety warnings · clinical alerts · **completion readiness** · **workflow recommendations** · clinical summaries · longitudinal trends.

**Required direction:**
```
Clinical Fact → Backend Domain Model → Backend Service → Repository
              → Database / External Clinical Provider → API Contract → Frontend Presentation
```
**Prohibited:**
```
Frontend Form → Local Interpretation → Clinical Warning → Clinical Decision
```

The frontend must never call laboratory systems, medication-interaction engines, clinical-decision-support engines, or external safety providers directly.

**Clinical warnings** carry, from the backend: type · severity · reason · supporting evidence · source · timestamp · version · acknowledgement state (where applicable).

**Absence is never a negative finding.** The backend returns an explicit state — `Known Allergies` / `No Known Allergies` / `Unknown` / `Not Recorded` — and the frontend renders that state. An empty field must never be presented as "none."

**Offline:** the frontend may cache backend responses but must mark them **stale / last-synchronized / unable to verify current clinical state**. It must never silently present stale clinical safety as current truth.

**Precedent (verified):** this is not a new idea — **R4 already did exactly this once.** The frontend previously derived treatment status locally and was re-pointed to the backend-resolved `lifecycle_status` / `lifecycle_status_label` / `lifecycle_status_unresolved` (see `treatmentSheetHeaderLifecycleRepoint`, `treatmentSheetInfoCardStatusRepoint`, `treatmentLifecycleActionsStatusRepoint` tests, and `treatmentOrders.dtos.ts`: *"resolved server-side"*, *"never writable"*). This addendum generalizes a correction the platform has already proven.

---

## DP-15 — One Clinical Answer Rule *(design freeze)*

**For every clinical question there is exactly one authoritative backend answer; the frontend must never be capable of producing a different one.** Full statement, the Resolver+Service pattern, the Workflow-Assembly ownership rule and the `SectionProgress` UI/clinical split are defined once in [R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md](R7-GUIDED-CLINICAL-WORKSPACE-DESIGN.md) — **not duplicated here** (DP-15 applies to its own documentation: one source of truth per concept).

Consequence for this document: every state defined here is a **backend-owned Business State**. Nothing here may be derived, inferred, or recomputed by the frontend.

---

# FINAL BLOCKER RESOLUTION — DESIGN FREEZE (2026-07-17)

**All Design-Freeze blockers are now resolved. These decisions are FINAL for R7 requirements authoring and must not be reopened during requirements creation unless Engineering Truth proves a direct contradiction that makes the model impossible.**

## F-1 — RESOLVED · Case Sheet Contribution Attribution

```
Episode is the authoritative Case Sheet binding.
Current Visit is the authoritative contribution attribution.
Case Sheet appointment_id is creation provenance only.
Contribution and Visit-authored content update must not diverge.
```

**Authoritative model.** One longitudinal Case Sheet per Episode; every Visit may append one or more contributions carrying `visit_id` · appointment (through the Visit) · `staff_id` · `authored_at` · clinical content · provenance · (attachments/measurements when supported — R8).

**Frozen business rule.** Every Case Sheet write representing Visit-authored clinical content **must receive an authoritative, backend-validated current Visit context** (preferred semantic input: `visit_id`). It **must never be inferred from the Case Sheet's creation appointment**. The transport (route param / request field / server-resolved workspace context) follows existing backend API conventions and is a **requirements-task decision**; the business rule is frozen.

**Backend validation (frozen).** Visit exists · same tenant · same Episode · same patient · Case Sheet belongs to that Episode · author permitted to contribute · contribution associated with the current write.

**Atomicity (frozen).** Content update **and** contribution attribution behave atomically for Visit-authored content: both succeed or both fail. The system must **never** produce *"clinical content saved BUT visit contribution silently missing"* — the current verified behaviour, and now prohibited.

**Idempotency (frozen as behaviour, not mechanism).** Retries must not create duplicate contributions. The key (Case Sheet + Visit + authoring operation · explicit contribution id · mutation/request id · another established mechanism) is for **Engineering Truth to determine during requirements** — deliberately not invented here.

**`tenant_casesheets.appointment_id` — retained, meaning frozen:**
```
The appointment under which the Case Sheet was originally created.
Creation provenance only. NOT the authoritative current Visit binding.
```
Not removed; nullability unchanged. A **future data audit must precede** making `episode_id` non-nullable, removing `appointment_id`, or changing historical records — each a separately approved migration.

**Acceptance criteria carried to requirements:** (1) V1 creates the Episode Case Sheet → V1 contribution · (2) V2 updates the same sheet → **V2** contribution · (3) V2 content never attributed to V1 · (4) V3 appends without altering V1/V2 history · (5) Visit from another Episode rejected · (6) another patient rejected · (7) another tenant rejected · (8) unresolved Visit fails **explicitly** · (9) no content update succeeds while its required contribution is missing · (10) retry creates no duplicate · (11) existing historical contributions unchanged · (12) `appointment_id` treated only as creation provenance.

## Treatment Plan — RESOLVED · first-class entity

```
Treatment Plan is a first-class persisted and versioned clinical domain entity.
It owns clinical intent independently from stable Sessions and schedule attributes.
```

**It is NOT:** a frontend projection · a reconstructed summary of scheduled sessions · a temporary UI model · an alias for Treatment Recommendation / Treatment Sheet / the schedule.

**Authoritative model.**
```
Treatment Recommendation  →  Treatment Plan  →  Stable Treatment Sessions
                                                 ├── Schedule Attributes
                                                 ├── Doctor Clinical Content
                                                 └── Therapist Execution Record
```
Each concept: one owner, one meaning. **Recommendation** answers *"should this patient receive a course?"*; **Plan** answers *"what course is clinically intended?"* and **contains no committed dates**.

**Plan owns:** patient · Episode · originating Recommendation · authoring clinician · therapies · approximate/authorized session count · frequency · scheduling intent · preferred interval · sequencing pattern · review milestones · completion criteria · course-level precautions · clinically relevant therapist requirements · plan status · document version · supersession relationship · creation/modification provenance.

**Scheduling patterns (capability-gated, never specialty-gated):** consecutive · alternate-day · specific weekdays · weekly · multiple/week · non-sequential · PRN · review-dependent continuation · planned review after a session milestone. Applies to Ayurveda, Physiotherapy, Dental, Orthopedics, Rehabilitation, Pain Management and future clinic types **by capability**.

**Stable Session identity (frozen).** Never recreated during rescheduling · therapist/room reassignment · time/date change · temporary hold · instruction update. **`day_number` is not durable identity** — a legacy ordinal may remain for display/migration only.

**Rejected alternative, recorded:** *Treatment Plan = projection of recommendation + schedule + sessions.* Rejected because clinical intent would change when the schedule changes · review-dependent continuation cannot be represented safely · versioning unclear · authorship/approval lost · completion criteria reconstructed · schedule churn would alter the apparent clinical plan · backend workflow intelligence would lack one authoritative Plan · **DP-15 violated** (multiple layers could reconstruct different answers).

**Lifecycle — semantic stages frozen; spelling deferred.** Authoring · Approved clinical intent · Available for scheduling · Active course · Under clinical review · Completed · Superseded/amended · Stopped/discontinued where clinically required. **Exact enum spelling is a requirements-task decision** after Engineering Truth. ⚠ **Do not reuse the R4 `TreatmentLifecycleStatus` 11 statuses without verifying semantic fit** — verified this task: those are *treatment execution* statuses ("for a given treatment at a given time": recommendation→scheduling→sheet→therapy→review→complete), **not Plan-lifecycle** statuses. Overlap is partial, not identity.

**Living-document behaviour.** An approved/signed Plan is never silently mutated. A material clinical change creates a new version/amendment referencing and retaining the previous version, preserves already-executed sessions, defines the effect on future unexecuted sessions, and records author/reason/timestamp. Requirements must distinguish four different operations: **changing clinical intent** · **changing schedule logistics** · **editing an unexecuted session's instructions** · **correcting an execution record**.

**Acceptance criteria carried to requirements:** (1) Recommendation → one approved Plan · (2) Plan persists independently of scheduling · (3) rescheduling doesn't change the Plan · (4) stable Sessions link to the Plan · (5) Session identity survives date/time/therapist/room change · (6) doctor instructions survive rescheduling · (7) therapist actuals stay attached to the executed Session · (8) consecutive **and** non-sequential courses supported · (9) review-dependent continuation supported · (10) sessions added without recreating existing ones · (11) reducing the course deletes no historical/executed Sessions · (12) clinical amendments versioned/superseded · (13) **schedule-only changes create no new Plan version** · (14) backend workflow intelligence derives treatment readiness from the authoritative Plan + Sessions · (15) frontend never reconstructs the Plan from schedule rows.

## F-2 — RESOLVED · Option A (no longer open)

```
F-2 = Option A
```
R7 displays **only verified backend-owned signals that exist today or are explicitly implemented in R7**. Allergy, intolerance, medication interaction, renal/hepatic safety and advanced contraindication modelling remain **R8**. The frontend must not fabricate, derive or interpret them. **This is no longer an open R7 blocker.**

## Session "Missed" — RESOLVED at architecture level

```
Schedule state  +  Execution outcome  +  Structured reason
```
**No single ambiguous `MISSED` state as the sole source of truth.** The UI may render *"Missed — Patient no-show"*, but backend semantics must distinguish **what was scheduled** · **whether execution occurred** · **why it did not**. Exact state names belong to the requirements task after Engineering Truth. **No longer a Design-Freeze blocker.**

## PrescriptionStatus — confirmed disposition (not a blocker)

R7 uses **only** the verified Prescription document lifecycle (`DRAFT → FINAL → SIGNED`, + `SUPERSEDED` per Decision 2). The unused `PrescriptionStatus` enum is **domain drift** (`ED-ARCH-002`). Future dispensing is a **separate domain object and lifecycle**. Cleanup is an independently verified engineering-debt task. **Not a Design-Freeze blocker.**

---

## ⚠ Two consequences of these decisions the freeze must record honestly

**(1) R7 now requires an additive migration.** Verified this task: **no Treatment Plan entity exists.** The only `*plan*` models are `org_subscription_plan` / `subscription_plan_capability` (billing — unrelated); `app/domain/treatment_plan/` contains only a `SyncResult` dataclass. Ratifying the Plan as *first-class persisted and versioned* therefore requires **a new table + versioning** — an **additive migration in R7**. Earlier feasibility stated *"no schema change in the core design"*; **that is now superseded.** Backend size rises accordingly.

**(2) Naming collision to resolve in requirements — `tenant_visits.treatment_plan` is a TEXT column.** Verified: `treatment_plan: Mapped[str | None]` → `TEXT`, nullable. Today "treatment plan" exists **only as free text on the Visit** — which is precisely the pre-entity representation the ratification replaces. Requirements must decide its disposition (retain as legacy visit note · migrate · deprecate) and must ensure implementers never confuse the free-text column with the new entity. **Non-blocking for freeze; blocking for the Treatment Plan requirements.**

---

## D5-OD-1 … D5-OD-15 — Treatment Plan amendment/supersession contract · **RATIFIED** *(2026-10-04)*

1. **D5-OD-1:** Clinical-intent amendment creates a new Treatment Plan row/version; it never mutates the predecessor's clinical intent.
2. **D5-OD-2:** One Living Document identity represents the enduring Treatment Plan clinical-intent series.
3. **D5-OD-3:** Generic G1 lineage is the sole authoritative supersession/currentness authority for that series.
4. **D5-OD-4:** `document_version` and `superseded_by_plan_id` are synchronized projections, never independent lineage authority.
5. **D5-OD-5:** Executed and completed historical sessions remain owned by their predecessor Plan; in-progress sessions remain predecessor-owned and may complete.
6. **D5-OD-6:** Future not-started predecessor rows become `SUPERSEDED` with provenance; `SUPERSEDED` is neither `CANCELLED` nor `COMPLETED`.
7. **D5-OD-7:** Amendment never silently rebinds a session from predecessor to successor.
8. **D5-OD-8:** Replacement relations are optional N:M audit relations, not ownership transfer or automatic scheduling.
9. **D5-OD-9:** Replacement scheduling remains a separate operational action; amendment does not copy logistics as authoritative scheduling truth.
10. **D5-OD-10:** Schedule-only/logistics changes create no Treatment Plan version.
11. **D5-OD-11:** Future unexecuted instruction editing remains a session/instruction concern and creates no Treatment Plan version.
12. **D5-OD-12:** Execution correction remains a session/execution concern and creates no Treatment Plan version.
13. **D5-OD-13:** Concurrent START and supersession have exactly one winner: a committed start preserves `IN_PROGRESS`; a committed supersession rejects a later start.
14. **D5-OD-14:** Runtime authorization is permission-driven: `treatment_plan.amend` governs clinical amendment and `treatment_order.schedule` governs scheduling/replacement logistics; subscription availability and seeded role grant remain separate.
15. **D5-OD-15:** Amendment/supersession does not reassign billing history: billing stays attached to its actual Visit/session, and no successor Plan or replacement relation transfers it.
