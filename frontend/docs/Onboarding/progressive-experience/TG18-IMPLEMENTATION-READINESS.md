# TG18 Implementation Readiness Review

Date: 2026-07-20

Review type: Final planning checkpoint before implementation

Epic reviewed: E1 — Journey Foundation and Cards

Decision: **NOT READY**

> **Implementation completion update — 2026-07-20:** **TG18 COMPLETE.** The
> original `NOT READY` decision below is retained as the historical planning
> checkpoint. Its prerequisites were closed by the five accepted E1
> constitutional documents, and the authorized TG18 checkpoints now satisfy
> the accepted journey contract. The final evidence matrix is recorded in
> Section 22.

## 1. Executive Decision

TG18 is **NOT READY** to begin implementation.

The approved Phase 2 roadmap identifies E1 as the first implementation epic, but it also establishes explicit prerequisites that are not present in the canonical documents:

1. new accepted Phase 2 requirements for Journey Versioning and Journey Cards;
2. a new Phase 2 journey-domain design section;
3. an accepted journey-domain vocabulary and ownership model;
4. a decision on canonical journey-version ownership and delivery;
5. a decision on Journey Card eligibility and progress sources;
6. a completed reusable-asset audit demonstrating which existing components, hooks, stores, services, repositories, and APIs satisfy the accepted contract.

The roadmap’s TG18 stop condition requires work to stop before code when journey ownership/version or card eligibility is not accepted and domain-owned. Both decisions remain open in the roadmap’s Open Decisions Register. `tasks.md` and the traceability audit independently confirm that Journey Cards have no accepted concrete requirement/design and Journey Versioning has no journey contract.

No frontend file, backend file, API, migration, requirement, design section, task group, dependency, or package change is authorized by this review.

## 2. Authoritative Evidence Reviewed

Only the canonical tracked documents under `frontend/docs/Onboarding/progressive-experience/` were used:

| Document | Relevant evidence |
|---|---|
| `PROGRESSIVE-EXPERIENCE-PHASE2-ROADMAP.md` | Approved E1 outcome, personas, metrics, requirements references, design prerequisite, dependencies, risks, TG18 planning container, stop condition, implementation order, open decisions, and governance rules. |
| `PROGRESSIVE-EXPERIENCE-TRACEABILITY-AUDIT.md` | Journey Cards and Journey Versioning are missing from the actionable requirement/design/task chain; journey foundation is the preferred first post-planning slice. |
| `requirements.md` | Existing Req 5, 14, 15, 21, 23, 24, 25, and 28 constraints; no accepted Journey Card or Journey Versioning product contract. |
| `design.md` | Existing Layer Map, Dependency Rules, Theme Compliance, Testing Strategy, onboarding status flow, and known orchestration/repository surfaces; no journey-domain/card design. |
| `tasks.md` | Existing implementation evidence and reusable candidates; repeated finding that Journey Cards/Versioning need design clarification. |
| `ADR-PE-000.md` | Canonical documentation governance and Phase terminology. |
| `ownership-map.md` | Progressive Experience owns onboarding journey and guidance; Doctor Module and clinical workflows remain excluded. |

## 3. Business Objective

Establish a canonical, versioned Progressive Experience journey with reusable Journey Cards and meaningful progress semantics so later Phase 2 epics share one governed model rather than introducing disconnected screens or presentation-owned business rules.

The intended business outcomes are those approved in E1:

- increase onboarding journey start-to-completion;
- reduce time from journey start to Ready to Start;
- make card actions useful and measurable;
- minimize unknown or unmapped journey states;
- allow the journey to evolve without confusing journey version with draft schema version.

The business objective is accepted at roadmap level. Its behavioral contract is not yet defined at requirements level.

## 4. User Journey

The approved E1 journey is:

1. An Organization Owner, Organization Admin, or Clinic Administrator enters the onboarding journey after clinic entry.
2. The user sees the current journey stage and why it matters.
3. The user sees the next supported action through a reusable Journey Card.
4. Progress is derived from authoritative server/capability state rather than component-local assumptions.
5. Selecting a card uses existing navigation and cannot bypass readiness, subscription, or other downstream gates.
6. Journey state remains isolated to the effective clinic when the user has access to multiple clinics.

The canonical lifecycle context remains:

```text
Create Account
→ Create Clinic Identity
→ Nova Prepares Workspace
→ Review & Personalize
→ Ready to Start
→ 30-Day Commercial Trial
→ Informational Dunning
→ Paid Subscription
→ Continuous Growth
```

TG18 is not permitted to implement the later lifecycle stages. It may eventually provide the journey foundation they consume after its prerequisites are approved.

## 5. Personas

Primary personas approved for E1:

- Organization Owner;
- Organization Admin;
- Clinic Administrator.

Front Desk, Doctor, and Therapist are not primary E1 personas in the approved roadmap. TG18 must not expand its persona scope without an approved roadmap revision.

## 6. Requirements Coverage

### Existing requirements that constrain E1

| Requirement | E1 relevance | Readiness consequence |
|---|---|---|
| Req 5 — WizardDraftStore schema/persistence | Establishes tenant/user/draft-schema identity and the explicit warning that future journey version is a separate concept. | Journey version must not reuse or silently alter draft schema version. A compatibility decision is required. |
| Req 14 — Theme compliance | Constrains all new UI styling. | Journey Cards must use central theme tokens only. |
| Req 15 — Test coverage | Requires automated regression evidence. | A complete E1 unit/component/integration matrix must be accepted. |
| Req 21 — Zero hardcoded design values | Extends theme compliance across touched UI. | No screen/card-specific visual constants are permitted. |
| Req 23 — Hook and service architecture | Requires repository/service/presentation boundaries and centralized query keys. | Journey presentation cannot call APIs or services directly. |
| Req 24 — Internationalization | Requires localized user-visible text in English and Hindi. | Journey Card copy contract and key structure must be defined before UI work. |
| Req 25 — Accessibility | Requires accessible states, actions, and touch targets. | Journey Card semantic and focus behavior must be specified before implementation. |
| Req 28 — Analytics/audit events | Requires structured events but still has an open provider/stub decision. | E1 measurement events cannot be implemented safely until event ownership/catalog is accepted or explicitly deferred. |

### Missing E1 requirements

The current numbered requirements do not define:

- canonical journey identity and version source;
- journey version compatibility/migration behavior;
- stage identity, order, availability, and unknown-state behavior;
- Journey Card schema and required/optional fields;
- Journey Card eligibility and visibility rules;
- progress calculation and authoritative completion source;
- action/navigation contract;
- loading, empty, stale, error, and unsupported-version behavior;
- multi-clinic cache/query isolation for journey state;
- localization ownership for server-provided or client-mapped labels;
- analytics event names and minimum properties for the E1 success metrics.

These missing requirements are a release-blocking prerequisite for TG18 implementation readiness.

## 7. Design References and Missing Design

### Existing design constraints

TG18 must follow these existing `design.md` sections:

- Architecture — Layer Map;
- Architecture — Dependency Rules;
- Error Handling;
- Testing Strategy;
- Theme Compliance;
- existing onboarding status data flow and backend dependencies;
- central `onboardingKeys` query-key convention;
- `SetupWizardFlow` as the active wizard orchestrator.

### Mandatory missing design

The roadmap explicitly requires a new Phase 2 journey-domain design section. It must define at minimum:

1. domain vocabulary and type boundaries for journey, journey version, stage, card, action, capability, readiness, tenant, user, and draft schema version;
2. ownership and delivery of journey definition/version;
3. authoritative inputs for card eligibility, progress, and completion;
4. DTO/domain/presentation mappings;
5. repository, query-key, caching, invalidation, and tenant-switch behavior;
6. version compatibility and unknown-version fallback;
7. navigation/action rules and prohibited gate bypasses;
8. localization strategy for all card/stage content;
9. accessibility contract;
10. analytics/measurement boundary;
11. error, empty, loading, stale, and partial-data behavior;
12. the reuse decision for each candidate asset.

Without this design, file boundaries and allowed implementation changes cannot be finalized.

## 8. Existing Reusable Asset Assessment

The items below are candidates evidenced by canonical documentation. They are not yet approved TG18 dependencies because the requirements/design contract is missing.

### Components

| Candidate | Documented evidence | Potential use | Readiness |
|---|---|---|---|
| `SetupWizardFlow.tsx` | `design.md` identifies it as the active wizard orchestrator; `tasks.md` records status, lifecycle, routing, and draft orchestration. | Host or orchestrate journey presentation only if accepted design keeps this responsibility there. | CANDIDATE; contract-fit audit required. |
| Existing step/status/card primitives | Roadmap TG18 explicitly requires their reuse assessment. | Visual structure, status display, and actions for Journey Cards. | UNVERIFIED as a specific asset set. |
| Existing navigation primitives/router paths | Existing wizard routing and TG17 preserve downstream gates. | Journey Card actions. | CANDIDATE; action contract required. |
| `StepCard` | `tasks.md` records existing tests and historical behavior. | Possible card primitive or composition reference. | CANDIDATE; semantic and accessibility fit not established. |
| Existing inline notice/progress UI | Used in completed lifecycle/offline work. | Empty, stale, changed, or progress states. | CANDIDATE; E1 state model absent. |

No new Journey Card component is authorized until the reuse-before-create audit is complete.

### Hooks

| Candidate | Potential use | Readiness |
|---|---|---|
| `useOnboardingStatusQuery` | Authoritative existing onboarding status and step list. | CANDIDATE; current payload does not document journey version/card eligibility contract. |
| Existing presentation orchestration hooks | Combine repository state with presentation needs. | UNVERIFIED; canonical docs do not identify a specific E1-ready hook. |
| Existing theme and localization hooks | Central theme and localized strings. | REQUIRED reuse; exact Journey Card key/token contract still missing. |

No new hook is authorized until existing hooks are inspected against the accepted E1 design.

### Stores

| Candidate | Potential use | Readiness |
|---|---|---|
| `useWizardStore` / `wizard.store.ts` | Existing tenant/user-scoped draft persistence and journey-version compatibility review. | REUSE FOR EXISTING DRAFT RESPONSIBILITY ONLY. It must not become journey truth. |
| Auth store | Effective tenant/user identity where already approved. | CANDIDATE; selected/effective clinic behavior must remain explicit. |

The roadmap does not authorize a new Journey Store. A store may not own journey definition, eligibility, progress, readiness, or completion truth. Any store proposal requires design approval and proof that repository/query state cannot satisfy the accepted need.

### Services

| Candidate | Potential use | Readiness |
|---|---|---|
| Existing onboarding status service | Retrieve current onboarding status. | CANDIDATE; no documented journey-version/card contract. |
| Existing mapping/service-layer utilities | DTO-to-domain conversion. | CANDIDATE; exact asset and extension point not documented. |

No new service is authorized without accepted design and evidence that an existing service cannot be extended safely.

### Repositories

| Candidate | Potential use | Readiness |
|---|---|---|
| `onboarding.repository.impl.ts` | Existing React Query status/mutation boundary and invalidation. | CANDIDATE; likely reuse boundary, but E1 query/domain contract is absent. |
| `onboardingKeys` | Central query-key convention. | REQUIRED convention; new key shape, if any, needs tenant/version design. |

Presentation must not bypass repositories. No Journey repository is authorized until the design decides whether existing onboarding status repositories can own the required query/domain mapping.

### APIs

| Existing API | Documented capability | E1 assessment |
|---|---|---|
| `GET /api/v1/onboarding/{tenantId}/status` | Returns backend-ordered `visible_steps` and `per_step_validation` status. | Potential authoritative input, but no documented journey identity/version, Journey Card schema, or eligibility/progress contract. |
| Existing onboarding submit/complete APIs | Mutate step/completion state. | OUT OF SCOPE for TG18 foundation unless later requirements explicitly require an existing action and preserve all gates. |

No new API or backend redesign is authorized. The design must first decide whether E1 can be implemented from existing status data. If it cannot, TG18 remains blocked pending separately approved backend requirements/design.

## 9. Backend Dependencies

Current backend dependencies are unresolved:

- ownership of canonical journey definition and version;
- whether journey definition/version is server-provided or client-shipped;
- authoritative source for stage/card eligibility;
- authoritative progress/completion mapping;
- relationship between `visible_steps`, capabilities, readiness, and Journey Cards;
- version compatibility and unknown-version behavior;
- tenant isolation and multi-clinic query semantics;
- availability of data required for E1 success metrics.

Backend impact for this readiness review: **none**.

TG18 is not authorized to add or redesign APIs, migrations, persistence, backend services, or backend domain models. If accepted E1 requirements cannot be met with existing APIs, a new roadmap-compliant requirements/design approval must precede any backend task.

## 10. Frontend Dependencies

Frontend prerequisites before implementation:

- accepted Journey Card/stage domain and presentation models;
- accepted repository/query ownership;
- completed component/hook/store/service reuse audit;
- exact effective-tenant source and clinic-switch behavior;
- exact localization namespace/key model;
- central theme tokens and icon assets to reuse;
- accessibility behavior for cards, progress, states, and actions;
- error/empty/loading/stale/unsupported-version states;
- analytics decision or explicit measurement deferral;
- approved file-level boundary and focused test matrix.

Frontend impact for this readiness review: **documentation only**.

## 11. Localization Requirements

Before implementation, the E1 requirements/design must specify:

- `en-US` and `hi-IN` keys for stage names, explanations, state labels, actions, progress, empty/error/unsupported states;
- matching interpolation variables across locales;
- whether backend values are stable identifiers mapped to localized client keys or already-localized content under an accepted policy;
- fallbacks for unknown stage/card identifiers;
- Hindi-literate review ownership before release;
- prohibition on hardcoded user-visible strings.

Localization is mandatory and cannot be deferred to post-implementation cleanup.

## 12. Theme Requirements

TG18 must use only the central application theme/design system:

- no screen/card-specific colors;
- no screen/card-specific typography;
- no screen/card-specific spacing, radii, shadows, or icon styling;
- no inline styling unless already permitted by approved architecture;
- reuse existing tokens, icons, and primitives before introducing any new design asset;
- include a touched-file theme audit in implementation evidence.

The exact primitive/token reuse cannot be finalized until the component audit and Journey Card design are approved.

## 13. Accessibility Requirements

The E1 accessibility contract must define:

- semantic heading/list/card/action structure;
- accessible names and descriptions for stage, progress, status, and action;
- focus order and focus behavior after navigation or dynamic updates;
- minimum touch targets;
- disabled, loading, error, empty, completed, and unavailable state semantics;
- non-color-only progress and status communication;
- live-region behavior that avoids repeated announcements;
- reduced-motion behavior where transitions are introduced;
- screen-reader tests and manual acceptance expectations.

These expectations are known, but the card interaction model is not yet designed; therefore accessibility implementation is not ready.

## 14. Multi-Clinic Considerations

E1 must preserve:

- explicit effective tenant/clinic identity;
- tenant-scoped journey query/cache state;
- no reuse of another clinic’s journey version, card eligibility, progress, or completion;
- cancellation or isolation of stale requests during clinic switching;
- safe interaction with user-fallback and tenant-scoped draft identities;
- no assumptions about one clinic, clinic type, or specialty;
- no hardcoded Ayurveda-specific behavior;
- deterministic behavior when clinics have different journey/template versions.

The selected/effective clinic contract remains an open decision in the roadmap. TG18 cannot safely implement multi-clinic journey state until the specific identity source and switch behavior are accepted.

## 15. Test Strategy

The final TG18 test plan must be derived from accepted requirements/design. At minimum it is expected to include:

### Domain/unit

- journey version parsing and compatibility;
- stage/card mapping and stable ordering;
- eligibility/progress mapping from authoritative inputs;
- unknown stage/card/version behavior;
- no conflation of journey version and draft schema version;
- specialty-neutral behavior.

### Repository/service

- DTO-to-domain mapping;
- tenant-scoped query keys;
- cache isolation and invalidation/refresh rules;
- loading, stale, partial, error, and unsupported-version behavior;
- proof that presentation does not call APIs directly.

### Component

- all Journey Card states and actions;
- central-theme-only styling;
- `en-US`/`hi-IN` key parity and interpolation;
- semantic roles, labels, states, focus, touch targets, and non-color status;
- empty, loading, error, unavailable, and completed states.

### Integration

- entry into the journey and correct current-stage display;
- action routing through existing navigation without bypassing gates;
- tenant switching between clinics with different journey state/version;
- server refresh and changed-stage behavior;
- interaction with existing drafts without making drafts completion truth.

### Regression

- existing `SetupWizardFlow`, step routing, lifecycle, draft, and relevant card tests;
- no regression to TG1–TG17 behavior;
- `git diff --check` and relevant TypeScript/Jest verification when implementation is later authorized.

Exact test files and assertions are not approved until the file-level design/reuse audit is complete.

## 16. Risks

| Risk | Consequence | Required mitigation before implementation |
|---|---|---|
| UI order becomes journey truth | Backend/capability changes produce incorrect journeys. | Domain-owned authoritative mapping and accepted ownership. |
| Draft schema version reused as journey version | Draft migration and journey compatibility become coupled and unsafe. | Separate identities and documented compatibility rules. |
| Journey Cards become a second navigation system | Gate bypasses and inconsistent routing. | Reuse existing navigation and define permitted actions. |
| Card eligibility inferred in presentation | Business logic diverges across screens. | Repository/domain ownership and tests. |
| New duplicate components/hooks/stores | Architecture drift and inconsistent behavior. | Completed reuse-before-create audit. |
| Cross-clinic cache leakage | One clinic sees another clinic’s journey/progress. | Explicit tenant-scoped keys and switch tests. |
| Hardcoded clinic/specialty behavior | Progressive Experience cannot support multiple specialties. | Capability-driven, specialty-neutral contract. |
| Unlocalized server/UI text | English/Hindi inconsistency and inaccessible fallbacks. | Identifier-to-localization policy and parity tests. |
| Analytics implementation invented inside TG18 | New platform scope and privacy/ownership risk. | Accepted analytics provider/event decision or explicit deferral. |
| Premature file boundary | TG18 modifies orchestrator/store/API without a stable contract. | Requirements and design approval before file authorization. |

## 17. Open Decisions

The following decisions remain open and block implementation:

1. Who owns the canonical journey definition and version?
2. Is the journey definition/version server-provided, client-shipped, or composed from existing authoritative data?
3. What is the Journey Card schema?
4. What determines card visibility, eligibility, order, progress, and completion?
5. How do `visible_steps`, `per_step_validation`, capabilities, readiness, and Journey Cards relate?
6. What is the version compatibility and unknown-version policy?
7. How does journey identity interact with tenant, user, journey version, and draft schema version?
8. Which existing card/step/status/navigation component is the approved reuse base?
9. Can the existing onboarding status repository/service/API satisfy E1 without extension?
10. Which hook owns journey orchestration?
11. Is any new store needed, or must React Query/repository state remain sufficient?
12. What localization model applies to journey/stage/card content?
13. What analytics events and provider measure the approved success metrics?
14. What is the selected/effective tenant source for multi-clinic users?

## 18. Blockers and Missing Prerequisites

Every item below must be resolved before TG18 can be reassessed as READY:

1. Approve new E1 Journey Foundation and Journey Card requirements.
2. Approve the mandatory Phase 2 journey-domain design section.
3. Accept the canonical journey-domain vocabulary.
4. Accept journey-version ownership and delivery model.
5. Accept Journey Card eligibility/progress/completion ownership.
6. Define version compatibility, migration, and unknown-version behavior.
7. Define the relationship to existing onboarding status, capabilities, and readiness without expanding TG18 into TG21/TG22.
8. Complete and record the reuse-before-create audit for components, hooks, stores, services, repositories, APIs, theme tokens, icons, and navigation.
9. Decide whether existing APIs are sufficient; if not, obtain separate roadmap-compliant backend requirements/design approval.
10. Define effective-tenant selection and clinic-switch behavior.
11. Approve localization keys/content-source policy and Hindi review ownership.
12. Approve the Journey Card accessibility interaction contract.
13. Decide the analytics provider/event boundary or explicitly defer instrumentation while preserving measurable acceptance.
14. Approve a precise file-change boundary and expected test list.
15. Record explicit implementation authorization after all prior prerequisites pass.

## 19. Implementation Boundary

### Files expected to change

**None are authorized while TG18 is NOT READY.**

After the missing requirements, design, ownership, reuse audit, and implementation authorization are complete, the file boundary must be reassessed. Canonical evidence identifies only these provisional candidate areas:

- onboarding domain/DTO mapping for an accepted journey model;
- the existing onboarding status repository/query boundary;
- an existing step/status/card primitive selected by the reuse audit;
- presentation orchestration selected by the design, potentially `SetupWizardFlow.tsx`;
- `en-US` and `hi-IN` localization resources;
- focused onboarding unit/component/integration tests.

This candidate list is not permission to modify those files.

### Files prohibited from changing

Under this readiness review and until a later explicit TG18 authorization:

- all frontend source files;
- all backend source files;
- all API definitions;
- all database models and migrations;
- dependency manifests and lockfiles;
- `requirements.md` and `design.md` during this review;
- `tasks.md` and all Task Group definitions;
- `PROGRESSIVE-EXPERIENCE-PHASE2-ROADMAP.md`;
- Doctor Module files, branches, worktrees, and documentation;
- Clinical Workspace, Scheduling, Inventory, Billing implementation, and Payment Gateway implementation;
- unrelated onboarding or clinical files.

### Backend impact

None for this review. Future backend impact is undecided and cannot be authorized until the journey ownership/data-contract decision is approved.

### Frontend impact

None for this review. Future frontend impact is limited to a bounded, approved journey-foundation slice after requirements/design/reuse gates pass.

### Testing expected

No source tests are required for this documentation-only review. Future TG18 testing must cover the strategy in §15 after requirements/design acceptance.

### Documentation updates expected

This readiness review creates only `TG18-IMPLEMENTATION-READINESS.md`.

Before implementation can begin, separate approved planning work must update the canonical requirements and design with the missing E1 contract. This review does not make those changes, create TG18, update roadmap sequencing, or authorize implementation.

## 20. Allowed Implementation Scope if Readiness Changes

Because the decision is **NOT READY**, the allowed implementation scope is:

```text
NONE
```

When all blockers are resolved, a new readiness decision must list exact authorized files and behaviors before code begins. The future authorization must remain limited to E1 journey foundation and Journey Cards and must exclude:

- capability-driven visibility implementation (E4/TG21);
- readiness-provider or Ready-to-Start implementation (E5/TG22);
- commercial trial, subscription, payment, or dunning behavior;
- Doctor Module and clinical workflows;
- new APIs, migrations, or architecture rewrites unless separately approved through Roadmap → Requirements → Design → Task Group → Implementation.

## 21. Final Readiness Determination

The first Phase 2 epic is correctly selected, but selection and roadmap approval do not equal implementation readiness. The roadmap itself requires E1 requirements, journey-domain design, ownership decisions, and reuse verification before TG18 may begin.

Until every prerequisite in §18 is approved and a subsequent readiness review authorizes a precise file boundary:

**TG18 Implementation Status: NOT READY**

## 22. Final Implementation Acceptance Evidence

This section supersedes the historical implementation prohibition in §§19–21
only for the subsequently approved TG18 checkpoints. It does not rewrite the
planning decision that existed when this review was created.

| Accepted E1 requirement | Implementation | Focused test | Acceptance evidence |
|---|---|---|---|
| FR1–FR2 — journey identity, version, and bundled definition | `journey.entity.ts`; `progressive-experience-journey.definition.ts` | `journey.entity.test.ts` | Version identity is independent of draft schema; one accepted client definition is resolved. |
| FR3–FR4 — authoritative status and pure projection | existing onboarding-status repository/query; mapper; `build-journey-view-model.usecase.ts` | `useJourneyFoundation.test.tsx`; `build-journey-view-model.test.ts` | Existing API path is reused and presentation receives a deterministic domain projection. |
| FR5–FR7 — card contract, eligibility, and ordering | journey card domain model, definition, projection, existing `StepCard` | mapper, `StepCard`, `JourneySurface`, and `SetupWizardFlow` tests | Only eligible known cards render, in authoritative order, using existing navigation destinations. |
| FR8 — aggregate progress | projection plus `calculateJourneyProgressPercentage`; existing `ProgressBar` | mapper, `ProgressBar`, and `JourneySurface` tests | Text exposes `completed / total`; the visual value is derived from the same aggregate. |
| FR9–FR10 — no state mutation and existing navigation | `JourneySurface` delegates the existing wizard step destination | `JourneySurface.test.tsx`; `SetupWizardFlow.test.tsx` | Card selection does not change domain status or bypass existing routing. |
| FR11 — unknown steps | projection diagnostics and filtering | mapper and wizard-flow tests | Unknown steps are diagnostic-only and never become fallback cards or raw step UI. |
| FR12 — unsupported version | fail-closed projection and localized `JourneySurface` alert | journey entity, mapper, and `JourneySurface` tests | No partial cards, progress, step content, or footer actions render. Saved data is not mutated. |
| FR13 — loading, empty, partial, and available states | existing query/loading host plus explicit empty/active surfaces | hook, surface, and wizard-flow tests | Recognized-empty is explicit and is never presented as completion; partial supported data remains deterministic. |
| FR14–FR15 — tenant isolation and draft independence | tenant match guard in `useJourneyFoundation`; no draft-store dependency | hook test and dependency inspection | Mismatched cached status is suppressed; journey version remains separate from Wizard Draft schema/state. |
| FR16 — localization first | `en-US.json` and `hi-IN.json` journey keys | `JourneySurface.test.tsx` | Both locales contain matching keys and compatible `completed`/`total` placeholders. |
| FR17 — central theme | `JourneySurface`, existing `StepCard`, and revised `ProgressBar` use `useClinicTheme` tokens | component tests and source inspection | No new hardcoded color, spacing, radius, typography, or inline style was introduced. |
| FR18 — accessibility | journey header/state roles, card semantics, textual progress, progressbar value | `JourneySurface`, `StepCard`, and `ProgressBar` tests | Edge states and progress have screen-reader meaning; existing card focus/navigation order is preserved. |
| FR19–FR20 — clean architecture and reuse-before-create | domain entities/use case, existing hook/repository/API/store/navigation/components | mapper, hook, component, and integration tests | No duplicate repository, service, store, API, navigation system, or card primitive was created. |
| FR21 — measurement boundary | accepted event intents remain contract-only | architectural inspection | No analytics provider was invented; implementation does not block later approved instrumentation. |
| FR22 — E1 boundary | all TG18 checkpoints | changed-file and backend-worktree verification | No TG19 capability, backend endpoint/migration, Doctor Module, clinical, commercial, or payment work was introduced. |

Final verification:

- focused verification: **7 suites, 77 tests passed**;
- scoped TypeScript check: **no errors in TG18-touched source/tests**;
- `git diff --check`: required before delivery;
- backend impact: **none**;
- multi-clinic impact: tenant identity is enforced and presentation remains
  specialty-agnostic;
- completion commits: TG18 checkpoints beginning with `6cb53e0c`, followed by
  the Journey Card integration and acceptance-audit checkpoints, plus the final
  edge-state remediation commit.

All accepted E1 blockers and acceptance gaps are closed. This completion does
not authorize TG19 implementation; it permits only a separate TG19 readiness
review.

**TG18 Implementation Status: COMPLETE**
