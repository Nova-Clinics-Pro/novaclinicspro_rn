# E1 Journey Foundation — Implementation-Readiness Requirements

Document filename note: “Ready to Start” in this filename means ready to begin E1 implementation planning. This document does not define or implement the later Ready-to-Start product stage owned by E5/TG22.

Version: 1.0

Status: APPROVED FOR TG18 READINESS ASSESSMENT

Owner: Product Architecture

Epic: E1 — Journey Foundation and Cards

## 1. Business Objective

Establish one canonical, versioned Progressive Experience journey foundation and one reusable Journey Card contract so later Phase 2 epics consume consistent journey identity, stage meaning, progress semantics, navigation rules, localization, accessibility, theme, and multi-clinic behavior.

E1 must prevent presentation order, drafts, or component-local state from becoming product truth. Existing backend onboarding status remains authoritative for step visibility and completion. E1 creates a domain/presentation projection over that truth; it does not create a second onboarding engine.

## 2. User Journey

1. An authenticated user enters the existing onboarding flow for an effective clinic.
2. The application resolves the approved E1 journey definition and version bundled with the client.
3. Existing `useOnboardingStatusQuery` supplies the onboarding status DTO containing backend-ordered `visible_steps` and `per_step_validation` state for that clinic.
4. Existing `mapOnboardingStatusToDomain` normalizes that DTO, and the E1 domain mapper creates Journey Card view models for recognized visible steps.
5. The user sees the current journey stage, its purpose, progress, and the next permitted action.
6. A card action uses existing navigation and cannot mark completion, change readiness, start a trial, or bypass a downstream gate.
7. After an authoritative status refresh, Journey Card progress reflects the latest server state.
8. If the effective clinic changes, the previous clinic’s derived journey state is discarded and the new clinic’s status is resolved independently.
9. Unknown step codes or unsupported journey versions fail safely without inventing completion or exposing raw backend text.

## 3. Personas

Primary personas:

- Organization Owner;
- Organization Admin;
- Clinic Administrator.

Front Desk, Doctor, and Therapist are not primary E1 personas. E1 may not expand persona scope without an approved roadmap revision.

## 4. Functional Requirements

### E1-FR-1 — Journey identity

The journey foundation shall expose a stable journey identifier and an independent journey version as defined by `E1-JOURNEY-VERSIONING.md`.

### E1-FR-2 — Client-bundled E1 definition

The E1 journey definition shall be bundled with the frontend application and owned by Product Architecture. E1 shall not require a new API, backend schema, or migration.

### E1-FR-3 — Authoritative status inputs

The journey application boundary shall reuse `useOnboardingStatusQuery` and `mapOnboardingStatusToDomain`. The pure journey mapper shall consume the resulting `OnboardingStatus` domain entity and use `visibleSteps` order plus mapped `steps` state as authoritative inputs.

### E1-FR-4 — Pure domain projection

The journey mapper shall be a deterministic domain/application projection. Given journey definition, journey version, effective tenant identity, and onboarding status, it shall return the same ordered Journey Card models without network, storage, navigation, analytics, or UI side effects.

### E1-FR-5 — Card contract

Every Journey Card shall satisfy `E1-JOURNEY-CARD-CONTRACT.md`. Components must not extend the contract with private eligibility, progress, completion, ordering, or visibility rules.

### E1-FR-6 — Eligibility

A step-backed Journey Card is eligible only when its mapped step code is present in authoritative `visible_steps`. E1 shall not infer capability, readiness, trial, subscription, or clinical eligibility.

### E1-FR-7 — Ordering

Step-backed Journey Cards shall preserve backend `visible_steps` order after filtering to recognized E1 mappings. Presentation must not reorder cards.

### E1-FR-8 — Progress

Card progress and aggregate journey progress shall be calculated only from recognized eligible cards and authoritative validation state, using the rules in `E1-JOURNEY-CARD-CONTRACT.md`.

### E1-FR-9 — Completion

E1 shall never write completion state. A card is complete only when its authoritative status maps to complete. Local drafts, navigation, card presses, optimistic UI, or elapsed time shall not complete a card.

### E1-FR-10 — Navigation

Journey Card actions shall reuse existing approved routes and navigation primitives. An action may open an existing step or management destination; it shall not submit data, complete onboarding, set readiness, start a trial, transition a tenant, or mutate subscription state.

### E1-FR-11 — Unknown steps

Unknown backend step codes shall not render a fabricated card and shall not count toward known progress. The domain mapper shall return structured diagnostic metadata for an existing non-blocking logging boundary. The rest of the recognized journey shall remain usable.

### E1-FR-12 — Unsupported journey version

An unsupported major journey version shall render a localized safe-unavailable state and shall not render partially interpreted cards. Compatible minor/patch behavior shall follow `E1-JOURNEY-VERSIONING.md`.

### E1-FR-13 — Empty and partial data

Loading, empty, stale, partial, and error states shall be explicit. Missing validation for a recognized visible step shall map conservatively to not complete, never to complete.

### E1-FR-14 — Multi-clinic isolation

Journey derivation, repository queries, query keys, and diagnostic context shall use the effective tenant ID already supplied to the existing onboarding status boundary. On tenant change, derived card state from the prior tenant shall not be displayed or retained as truth.

### E1-FR-15 — Draft separation

Journey version shall remain independent from Wizard Draft schema version. The journey foundation may read no draft data to determine eligibility, progress, or completion. Existing draft behavior remains unchanged.

### E1-FR-16 — Localization

All user-visible stage, card, action, progress, empty, error, and unsupported-version text shall resolve through stable localization keys in `en-US` and `hi-IN`. No raw backend step code or error string shall be displayed.

### E1-FR-17 — Theme

All Journey Card UI shall reuse central theme/design-system tokens and approved icon primitives. No card-specific colors, typography, spacing, radii, shadows, or icon styling are permitted.

### E1-FR-18 — Accessibility

Journey presentation shall expose meaningful heading/list/card/action semantics, accessible progress descriptions, minimum touch targets, deterministic focus order, disabled-state meaning, and non-color-only status.

### E1-FR-19 — Clean Architecture

Presentation shall consume prepared Journey Card view models through approved application/repository boundaries. Presentation shall not call APIs/services directly or contain journey business rules.

### E1-FR-20 — Reuse before create

Implementation shall follow `E1-REUSE-AUDIT.md`. Any new component, hook, store, service, repository, API, or query requires a documented contract gap and design approval before implementation.

### E1-FR-21 — Measurement contract

The E1 domain/presentation boundary shall define non-blocking event intents for journey viewed, card action selected, unknown step encountered, and unsupported version encountered. E1 shall not create an analytics platform. Emission may remain disabled until an approved shared analytics adapter exists.

### E1-FR-22 — Progressive Experience boundaries

E1 shall use Ready-to-Start terminology and shall not reintroduce Demo Mode. It shall not define capability policy, readiness policy, commercial trial, subscription, payment, dunning, dashboard-first-action, or continuous-growth behavior.

## 5. Acceptance Criteria

1. A documented E1 journey definition has a stable ID and independent supported version.
2. The same input definition, tenant, and onboarding status produce the same ordered card models.
3. Recognized visible steps render in backend order.
4. Non-visible mapped steps do not render.
5. Unknown step codes do not fabricate UI, do not count toward known progress, and do not crash the journey.
6. Completed count equals the number of eligible recognized cards with authoritative complete status.
7. Total count equals the number of eligible recognized cards.
8. Missing validation never maps to complete.
9. Card presses navigate only to approved existing destinations and never mutate completion/readiness/commercial state.
10. Unsupported major version renders the localized safe-unavailable state without partial cards.
11. A tenant switch cannot display the prior tenant’s card state or progress.
12. Journey version changes do not change the Wizard Draft storage schema version or storage key.
13. Every user-visible string exists in `en-US` and `hi-IN` with matching interpolation variables.
14. Journey Card visual values come only from central theme/design-system tokens.
15. Screen-reader semantics, focus order, progress descriptions, disabled state, and touch targets pass the accepted accessibility tests.
16. Presentation imports no API datasource and contains no eligibility/progress/completion rules.
17. Existing repository, hook, component, navigation, theme, localization, and store boundaries are reused according to the approved audit.
18. No new API, migration, backend model, global store, analytics platform, or dependency is introduced.
19. Existing TG1–TG17 onboarding behavior remains unchanged.
20. The approved focused unit, repository, component, integration, localization, theme, accessibility, and multi-clinic tests pass.

## 6. Non-Functional Requirements

### Determinism

Journey derivation must be pure and deterministic. Time, random IDs, device state, and render order must not affect eligibility, ordering, progress, or completion.

### Performance

Journey derivation must operate in memory over the existing status payload and must not introduce an additional network round trip. Mapping must be linear in the number of visible steps/cards.

### Reliability

Unknown, missing, partial, stale, or unsupported data must fail conservatively. No failure path may mark work complete or bypass a gate.

### Security and privacy

Journey models and diagnostics must not include clinical data, payment data, draft payloads, or raw personally identifiable information. Tenant ID may be used only where existing scoped repository/diagnostic policy permits it.

### Maintainability

Journey definitions, mapping rules, view models, and presentation must remain separate. A future supported journey version must be addable without modifying Wizard Draft schema mechanics.

### Observability

Measurement event intents must be non-blocking, typed, and adapter-independent. No console or provider call may sit on the critical rendering/navigation path.

## 7. Success Metrics

E1 defines the following measurable outcomes:

| Metric | Definition | Measurement readiness |
|---|---|---|
| Journey start-to-completion rate | Clinics reaching authoritative onboarding completion divided by clinics that viewed the E1 journey. | Completion source already exists; journey-view event waits for shared analytics adapter. |
| Median time to Ready to Start | Median duration between first E1 journey view and authoritative Ready-to-Start timestamp/status when E5 later supplies it. | Metric contract defined; final readiness source belongs to E5/TG22. |
| Journey Card action completion rate | Eligible card actions followed by authoritative completion of the mapped step divided by card actions selected. | Event intent defined; emission deferred to shared adapter. |
| Unknown/unmapped state rate | Journey sessions containing at least one unknown visible step divided by all journey sessions. | Diagnostic intent defined; emission deferred to shared adapter. |
| Cross-clinic leakage count | Confirmed incidents where one clinic displays another clinic’s journey state. | Must remain zero; verified through integration tests and incident monitoring. |

Analytics-platform implementation is explicitly deferred. TG18 may expose typed event intents to an existing approved adapter only; it may not create the adapter or provider.

## 8. Out of Scope

- TG18 implementation in this documentation task;
- Doctor Module;
- Clinical Workspace;
- Scheduling;
- Inventory;
- Billing implementation;
- Payment Gateway implementation;
- backend API creation or redesign;
- database models or migrations;
- server-driven journey-definition delivery;
- capability-driven visibility policy (E4/TG21);
- readiness providers or Ready-to-Start behavior (E5/TG22);
- commercial trial, subscription conversion, payment recovery, or dunning;
- dashboard first actions or continuous-growth guidance;
- new global state/store;
- analytics platform/provider implementation;
- changes to existing Wizard Draft schema or persistence behavior;
- roadmap, requirement-numbering, design, task-group, dependency, or implementation-order changes.

## 9. Mandatory Principles

E1 implementation must explicitly verify before code begins:

- Central Theme only;
- Localization first (`en-US` and `hi-IN`);
- Accessibility by contract;
- Clean Architecture;
- Reuse-before-create;
- Multi-clinic compatibility;
- Progressive Experience consistency;
- existing repository reuse;
- existing component reuse;
- existing hook reuse;
- existing store boundaries and no duplicate store.

Failure to satisfy any principle is a stop condition.
