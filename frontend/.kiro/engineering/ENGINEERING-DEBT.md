# NovaClinicsPro Frontend — Engineering Debt (General Register)

General, non-phase-specific engineering debt. Phase-scoped debt continues
to live alongside its own spec (e.g.
`frontend/.kiro/specs/R5-capability-platform/`) — this file is for debt
that cuts across features and isn't owned by any single phase.

**ID scheme:** `ED-ARCH-NNN` for architecture/layering debt (this
register), mirroring the backend repo's own `.kiro/engineering/
ENGINEERING-DEBT.md`.


## Classification (R7 Design Freeze, 2026-07-17 · updated 2026-07-18 v1.1 amendment)

| ID | Item | R7 status | Why |
|---|---|---|---|
| **ED-ARCH-001** | Layer boundary violations (presentation→axiosClient/datasource; service→AsyncSession) | 🟥 **BLOCKING** | R7 **reuses** the violating modules; composing them would carry the violation into the COS. Remediation of the reused subset is Group 0's gate. |
| **ED-ARCH-004** | `deriveSummary()` — frontend-derived clinical summary + completion, acts on its own derivation | 🟥 **BLOCKING** | Violates DP-15. Sits on the consultation-completion screen R7 plans to compose as the `complete` stage. |
| **ED-ARCH-006** | `buildSectionConfig()` frontend workflow assembly (+ `SectionProgress` visit-level completion) | 🟥 **BLOCKING** | Violates DP-15 + Decision 9. R7's workflow cannot be backend-assembled while the frontend computes `activeSections`. |
| **ED-ARCH-007** | `useClinicalTimelineData` — incorrect (scheduled-not-completed) session counts + double-represented therapy encounters | 🟥 **BLOCKING for the v1.1 history-hierarchy amendment** | Violates DP-15 + Decision 10. R7's clinical-history hierarchy (`FR-HIST-1/2`) cannot ship while the frontend miscounts and duplicates therapy sessions. |
| **ED-ARCH-002** | `PrescriptionStatus` dead enum (drift) | 🟨 non-blocking | R7 avoids it (Decision 3). Disposition is a separate product decision. |
| **ED-ARCH-003** | Frontend `allergies` field with no backend contract | 🟨 non-blocking **for R7 core** | R7 does not surface allergies (F-2). It **blocks the ratified patient-safety scope** and is an **R8 prerequisite**. |
| **ED-ARCH-005** | `deriveKpiMetrics()` client-side reporting derivation | 🟨 non-blocking | Not a clinical fact; outside R7 scope. |

**Every item below records: problem · why it matters · architectural impact · affected modules · blocking status · recommended future remediation.**

---

## ED-ARCH-001 — Layer Boundary Violations and Dependency Direction Cleanup

**Status:** Open · **Discovered:** 2026-07-17 · **Category:** Architecture / Clean Architecture / Dependency Inversion

### Description

The intended dependency direction (`CLAUDE.md` §3) is:

```
Presentation
      ↓
Application / Use Cases (hooks, application services)
      ↓
Domain (entities, repository interfaces)
      ↓
Data (repositories, datasources — the only layer that touches transport)
```

`CLAUDE.md` already states the core rule ("Presentation must never call
Axios or Supabase directly"). The violation is that the codebase does not
consistently follow it.

**Verified violations** — presentation-layer files that import `axiosClient`
(`core/api/axiosClient.ts`) or a feature's `data/datasources/*.api.ts`
directly (confirmed via precise `import`/`from` statement matches, not
comment mentions — several files matched only in comments on a first pass
and were excluded):

- `features/episodes/presentation/components/ConsultationSections/CaseSheetModule.tsx`
- `features/episodes/presentation/components/ConsultationSections/ClinicalServicesModule.tsx`
- `features/episodes/presentation/components/ConsultationSections/PrescriptionModule.tsx` — both `axiosClient` **and** a datasource import, plus a live `axiosClient.get(...)` call
- `features/episodes/presentation/components/ConsultationSections/TreatmentRecommendationModule.tsx`
- `features/episodes/presentation/hooks/useClinicalTimelineData.ts`
- `features/episodes/presentation/pages/CompleteConsultationScreen.tsx`
- `features/episodes/presentation/pages/CreateConsultationScreen.tsx`
- `features/notifications/presentation/hooks/usePushNotifications.ts`
- `features/notifications/presentation/pages/NotificationHistoryScreen.tsx`
- `features/onboarding/presentation/pages/SetupWizardFlow.tsx`
- `features/onboarding/presentation/pages/steps/BillingSetupScreen.tsx`
- `features/onboarding/presentation/pages/steps/ClinicProfileScreen.tsx`
- `features/onboarding/presentation/pages/steps/OperatingHoursScreen.tsx`
- `features/onboarding/presentation/pages/steps/PaymentSetupScreen.tsx`
- `features/onboarding/presentation/pages/steps/StaffSetupScreen.tsx`
- `features/onboarding/presentation/pages/steps/TreatmentRoomsScreen.tsx`
- `features/operatingHours/presentation/pages/OperatingHoursScreen.tsx`
- `features/rbac/presentation/hooks/useApiErrorHandler.ts`
- `features/registration/presentation/hooks/useRegistrationStatus.ts`
- `features/therapistDashboard/presentation/components/TreatmentSessionCompleteModal.tsx`
- `features/treatmentSheets/presentation/pages/TreatmentSheetDetailScreen.tsx`
- `features/treatmentSheets/presentation/pages/detail/ClinicalReviewSection.tsx`
- `features/treatmentSheets/presentation/pages/detail/TreatmentSheetDetailContent.tsx`
- `features/treatmentSheets/presentation/pages/detail/useTreatmentSheetHeaderData.ts`
- `features/treatmentSheets/presentation/pages/detail/useTreatmentSheetRows.ts`

25 files, spanning 8 features (episodes, notifications, onboarding,
operatingHours, rbac, registration, therapistDashboard, treatmentSheets).
Not all necessarily call the transport directly (some may only import a
type) — each needs individual classification per the migration strategy
below; this list is the verified *import-site* evidence, not a claim that
all 25 make a live network call from presentation.

### Why this is a problem

**Architectural impact.** `data/datasources/*.api.ts` exists specifically
to be the one place that knows about HTTP/Axios. A presentation component
calling `axiosClient` directly creates a second transport path the
datasource layer doesn't know about — the same "no second source of truth"
failure mode this codebase's own backend R5/R6 work was built to prevent,
here recurring at the transport-access layer.

**Maintainability impact.** An API contract change (auth header handling,
base URL, error envelope shape) must now be hunted down at every ad hoc
call site instead of updated once in the datasource. Reviewers can't trust
"only datasources touch the network" as an actual invariant.

**Testing impact.** A presentation component that calls `axiosClient`
directly can't be tested against a mocked repository/hook the way
datasource-mediated components can — it requires mocking Axios itself,
a heavier and less representative test.

### Migration strategy

1. **Classify each file**: does it call `axiosClient`/a datasource for
   read, write, or both; is there already a hook/application-service
   equivalent it should call instead; or does no such abstraction exist
   yet (in which case the fix is adding one, not just rewiring the call).
2. **Fix incrementally, one feature at a time**, starting with
   `episodes` (5 files, the largest concentration, all in the
   consultation-authoring flow) — each fix is its own reviewed change
   under `novaclinics-engineering-workflow`, not a bulk rewrite.
3. **No new instances** — see `CLAUDE.md` §"Mandatory Architecture Rule —
   Layer Integrity" and its pre-implementation audit, which now runs
   before every task.

### Related finding (not part of this debt item, flagged separately)

This debt item's own tracking file needed a narrow `.gitignore` exception
(`frontend/.kiro/engineering/`) to be trackable at all — `frontend/.kiro/`
is otherwise narrowly allow-listed to only `specs/R5-capability-platform/`.
Worth revisiting whether other `frontend/.kiro/` content (other spec
phases) should also become trackable, but that is a separate, larger
repository-hygiene decision, out of scope here.

---

## ED-ARCH-002 — `PrescriptionStatus` domain drift (unused enum that misled a design phase)

**Status:** Open · **Discovered:** 2026-07-17 (R7 design review) · **Category:** Domain drift / dead code

**Evidence.** `app/domain/common/enums.py` defines `PrescriptionStatus(draft/issued/dispensed)`. `grep -rn "PrescriptionStatus" app/ --include="*.py"` returns **zero usages** outside its own definition. The persisted lifecycle is `tenant_prescription.status` → `postgresql.ENUM("DRAFT","FINAL","SIGNED", name="document_status")`.

**Why it matters.** This is not merely dead code — it **actively misled a design phase**. The original R7 package inferred and documented a `DRAFT→ISSUED→DISPENSED` prescription lifecycle from this enum's *name*, and propagated it into the interaction-state matrix, gap matrix and wireframes. Implementing it would have shipped "Issue"/"Dispense" actions the backend cannot perform. Any future reader is exposed to the same trap.

**Rules (ratified, R7 Owner Ratification Decision 3):**
- It **must not guide implementation**. R7 uses only `DRAFT → FINAL → SIGNED`.
- It is **not deleted** by that decision — disposition requires a separate product decision.
- If dispensing is genuinely needed, it must be a **separate fulfilment lifecycle** (`NOT_STARTED → PARTIALLY_DISPENSED → DISPENSED`), never merged into the document lifecycle — overloading one enum with attestation *and* fulfilment is what produced this drift.

**Blocks R7?** No (R7 avoids it). **Proposed remediation:** owner decides delete-as-dead-code vs design a migrated dispensing model. **Task group:** R7 Group -1 records it; disposition is its own future task.

---

## ED-ARCH-003 — Frontend `allergies` field has no backend contract (unbacked clinical-safety field)

**Status:** Open · **Discovered:** 2026-07-17 (R7 design review) · **Category:** Contract drift / **clinical-safety hazard**

**Evidence.** Frontend declares an `allergies` string field on `features/clients/domain/entities/client.entity.ts`, `features/clients/data/models/clients.dtos.ts`, and renders it in `ClientForm.tsx` / `ClientDetailScreen.tsx`. Backend: `grep -rn "allerg" app/ -il` returns **empty** — no column, no schema, no DTO, on any model or endpoint. The only conceivable store is `tenant_client.metadata_` (opaque JSONB), and no backend schema accepts or returns the field.

**Why it matters (safety, not tidiness).** A clinician reading an empty allergy field reasonably infers *"no known allergies"*. An allergy field that the backend never persists or returns can therefore **communicate a false clinical negative**. This is a latent hazard independent of R7, and it is why R7 **rejected** the option of surfacing this field in the Visit Command Center (R7 Owner Ratification, F-2 option (c)).

**Blocks R7?** It blocks the **ratified R7 patient-safety scope** (F-2): allergies cannot be surfaced because they do not exist. **Proposed remediation:** either model allergies properly (schema + capture + contract) — a real scope decision — or remove the unbacked field from the frontend client entity so it cannot mislead. **Task group:** R7 Group -1 records it; R8 owns allergy modelling.

---

## ED-ARCH-004 — Frontend derives clinical truth in `deriveSummary` (Backend-Owns-Clinical-Truth violation)

**Status:** Open · **Discovered:** 2026-07-17 (R7 ratification addendum) · **Category:** Clinical-truth ownership / business-rule duplication / **false-negative hazard**

**Location.** `features/episodes/presentation/pages/CompleteConsultationScreen.tsx` → `deriveSummary(data, appointmentId, includeAyurveda)`.

**Evidence — this single function violates four of the five debt criteria in the addendum:**

1. **Derives a clinical summary in the frontend.** The addendum names *clinical summaries* as backend-owned. `deriveSummary` composes the consultation summary (notes / prescription / treatment recommendation / ayurvedic assessment) entirely client-side.
2. **Duplicates backend business rules.** `const treatmentSent = treatmentState != null && treatmentState !== 'DRAFT'` — the frontend re-implements the treatment **order lifecycle** semantics (`DRAFT → ORDERED → SCHEDULED …`) to decide "Sent to Admin" vs "Not sent". The backend already owns this (R4 `treatment_lifecycle_resolver`, exposed as `lifecycle_status`). The function's own comment records that this derivation was **already wrong once** (it read `status` instead of `state` and displayed "DRAFT" after Send to Admin) — direct evidence of the fragility the principle exists to prevent.
3. **Interprets clinical content, with hardcoded clinical identifiers in presentation.** `hasAyurveda` reaches into `casesheet.data_json.extensions`, hardcodes template IDs `['nadi_pariksha', 'prakriti']`, and inspects their values to decide whether an Ayurvedic assessment was performed. This is frontend interpretation of opaque clinical JSONB *and* a raw-identifier check in presentation (`CLAUDE.md` §3 forbids raw string checks where a governed abstraction exists).
4. **Assumes missing data means a negative finding.** `status: casesheetStatus || 'Not saved'`, `'Not created'`, `'Not sent'`, and `hasAyurveda === false` present **absence as a definitive negative clinical statement**. This is the same false-clinical-negative pattern as `ED-ARCH-003`'s allergy field: "not recorded" and "did not happen" are rendered identically.
5. **Acts on its own derivation.** The screen then calls `transitionCasesheetStatusApi(..., { status: 'FINAL' })` — a **document-lifecycle transition driven by a locally-derived summary**.

**Why it matters.** This is the addendum's prohibited path made concrete: `Frontend Form → Local Interpretation → Clinical Statement → Clinical Decision`. It sits on the **consultation-completion** screen — the highest-consequence moment in the visit — and R7 planned to **reuse this screen** as the `complete` stage, which would have carried the violation into the Clinical Operating System.

**Precedent for the fix.** R4 already solved this exact class once: the frontend derived treatment status locally and was re-pointed to the backend-resolved `lifecycle_status` / `lifecycle_status_label` / `lifecycle_status_unresolved` (`treatmentSheetHeaderLifecycleRepoint`, `treatmentSheetInfoCardStatusRepoint`, `treatmentLifecycleActionsStatusRepoint` tests). `deriveSummary` is the same violation R4 fixed elsewhere, still live here.

**Blocks R7?** **Yes — blocking for the R7 completion stage.** R7 must not compose this screen until the summary + completion-readiness are backend-owned (an addendum consequence: *completion readiness* is a clinical fact). **Proposed remediation:** backend returns the consultation summary and completion readiness (with explicit `Unknown` / `Not Recorded` states rather than absence-as-negative); the frontend renders it. **Task group:** R7 Group D-BE (recommendation + completion readiness), gated before Group I composes the completion route. **Do not fix during documentation.**

---

## ED-ARCH-005 — Frontend `deriveKpiMetrics` computes reporting metrics client-side

**Status:** Open · **Discovered:** 2026-07-17 · **Category:** Business-rule duplication

**Location.** `features/feedback/domain/entities/feedback.entity.ts` → `deriveKpiMetrics(kpi: StaffKPIResponse)`.

**Problem.** KPI/reporting metrics are derived in the frontend from a backend response.
**Why it matters.** Two clients (or a report) can compute different numbers from the same response — a reporting analogue of DP-15, though **not** a clinical answer.
**Architectural impact.** Low — business-rule duplication outside the backend; no clinical-safety exposure.
**Affected modules.** `features/feedback/domain/entities/feedback.entity.ts` (`deriveKpiMetrics`), and any consumer of `StaffKPIResponse`.
**Blocking status.** 🟨 **Non-blocking** — outside R7 scope; recorded so it is not mistaken for approved practice.
**Recommended future remediation.** Backend returns derived KPI values; frontend renders. Own task, own phase.

**Do not fix during documentation.**

---

## ED-ARCH-006 — Frontend assembles the workflow and derives completion (`buildSectionConfig` / `SectionProgress`)

**Status:** Open · **Discovered:** 2026-07-17 (R7 Decision-9 engineering-truth sweep) · **Category:** Clinical-truth ownership / workflow assembly in presentation

**Ratification basis.** R7 Owner Ratification **Decision 9 — Backend Owns Workflow Intelligence**: *workflow assembly* and *completion readiness* are backend-owned; the frontend is a presenter only.

### Violation A — `buildSectionConfig()` assembles the workflow in the frontend · **blocking R7**

**Location.** `features/episodes/presentation/hooks/useConsultationWorkspace.ts`.

**Evidence.**
```ts
export function buildSectionConfig(features) {
  if (isAyurvedaClinic(features)) specialtySections.add('ayurvedicAssessment');
  const activeSections = ['chiefComplaint','clinicalNotes',
    ...(isAyurvedaClinic(features) ? ['ayurvedicAssessment'] : []),
    'prescription','treatmentRecommendation','clinicalServices'];
}
```

**Three defects in one function:**
1. **Workflow assembly in the frontend** — decides which clinical stages exist. Decision 9 makes this backend-owned.
2. **Specialty-gated, not capability-gated** — uses `isAyurvedaClinic`. Multi-session therapy is a **capability** (`appointments.multiday`/`appointments.sessions`), already entitled to **ayurveda *and* physio** (`capability_multiday_entitlement_seed.py`: `("ayurveda","physio")`). Specialty-gating hides entitled workflow from physio and requires a code change per future specialty (violates "extension before modification", Constitution 03).
3. **Hardcoded canonical section order** — the fixed order the COS design explicitly rejects in favour of assembly.

**Why blocking:** R7's workflow cannot be backend-assembled while the frontend still computes `activeSections`. **Correction:** `clinical_workflow_resolver` (pure domain) assembles; the frontend renders. **Do not fix during documentation.**

### Violation B — `SectionProgress` completion derived in ~10 modules · **non-blocking**

**Location.** `SectionProgressStatus = 'empty' | 'in_progress' | 'complete'` (`useConsultationWorkspace.ts`), consumed by ~10 `ConsultationSections/*` components, each deciding "complete" locally.

**Why it matters.** Decision 9 makes **completion readiness** backend-owned. Today completion is derived in ten places with no single authority — "is this visit complete?" has ten possible answers, and they can disagree.

**Why non-blocking:** per-section **save/authoring** progress is legitimately presentational and may remain. Only **visit-level completion readiness** is a clinical fact and must come from the backend (Group D-BE). **Correction:** backend owns completion readiness; per-section save status stays presentational.

### Cleared (recorded so it is not re-raised)

`episodeWorkspaceConfigByRole` (`canEditNotes`/`canSchedule`/`canWriteRx`/`canCreateTreatmentSheet`) is **not** a Decision-9 violation. `CLAUDE.md` §3 explicitly permits it: *"Hiding a route or component is presentation polish, never an access control mechanism"* — provided the backend enforces. **However:** R7 must derive actionability from the backend's `blocking_factors`/`waiting_role`, never from this map. The map may hide a CTA; it may never be the authority for whether an action is permitted.

### Precedent

**R4 already performed this exact correction once** — frontend-derived treatment status → backend-resolved `lifecycle_status`/`lifecycle_status_label`/`lifecycle_status_unresolved` (`treatmentOrders.dtos.ts`: *"resolved server-side"*, *"never writable"*; `treatmentSheetHeaderLifecycleRepoint` / `treatmentSheetInfoCardStatusRepoint` / `treatmentLifecycleActionsStatusRepoint` tests). ED-ARCH-004 and ED-ARCH-006 are the **same violation R4 fixed elsewhere, still live** in the consultation surface.

**Task group:** R7 Group D-BE owns the correction; Group D-FE.3 removes the frontend derivation. **Do not fix during documentation.**

---

## ED-ARCH-007 — Frontend derives incorrect clinical-history session counts (`useClinicalTimelineData`)

**Status:** Open · **Discovered:** 2026-07-18 (R7 v1.1 history-hierarchy amendment) · **Category:** Clinical-truth ownership / incorrect aggregation

**Ratification basis.** R7 Owner Ratification **Decision 10 — Clinical History Hierarchy**: encounter classification and session/Plan aggregates are backend-owned; the frontend renders only.

**Evidence.** `features/episodes/presentation/hooks/useClinicalTimelineData.ts` computes, per treatment sheet:
```ts
const completedSessionCount = sheet.rows?.filter((row) => !!row.session_date).length ?? 0;
```
This counts rows with a **scheduled** `session_date`, not rows with `status`/`completed_at` indicating **actual completion** — the formula is verifiably wrong, not merely frontend-owned. Additionally, the same hook renders every appointment (consultation or therapy) as one flat `'visit'` item regardless of `appointment_type`, so a therapy appointment and its already-tallied session both appear in the timeline — a double-representation defect on top of the miscounted aggregate.

**Why it matters.** A doctor reviewing patient history sees a progress count that can disagree with the backend's own execution truth (`treatment_sheet_row.status`/`completed_at`, and `treatment_lifecycle_resolver`'s lifecycle state) — exactly the DP-15 "one clinical answer" violation Decision 9 already corrected once for workflow recommendation, recurring here on a surface (clinical history) not previously audited for it.

**Blocks R7?** **Yes — blocking for the v1.1 history-hierarchy amendment** (`FR-HIST-1`/`FR-HIST-2`). Not blocking for any pre-amendment R7 task. **Proposed remediation:** backend computes completed/scheduled/not-completed/cancelled counts from actual execution facts and returns them on the `history_items[]` contract; the frontend renders them and removes the local computation entirely. **Owning tasks:** `T-BE-A.5` (backend correction) · `T-FE-C.5` (frontend removal) · debt gate `ED-DEP-7`. **Do not fix during documentation.**
