# E1 Journey Domain Design

Version: 1.0

Status: APPROVED FOR TG18 READINESS ASSESSMENT

Owner: Product Architecture

Epic: E1 — Journey Foundation and Cards

## 1. Design Decision

E1 is a client-bundled journey-domain and presentation foundation over the existing tenant-scoped onboarding status contract.

E1 does not create a new backend journey engine. Product Architecture owns the journey semantics and version. Backend onboarding owns authoritative visible-step order and validation/completion truth. The frontend onboarding domain owns deterministic mapping of those authoritative inputs into the approved Journey Card contract. Presentation owns rendering and navigation only.

## 2. Journey Domain Model

### 2.1 Core identities

```typescript
type JourneyId = 'progressive-experience';

interface JourneyVersion {
  major: number;
  minor: number;
  patch: number;
}

interface JourneyRuntimeIdentity {
  journeyId: JourneyId;
  journeyVersion: JourneyVersion;
  tenantId: string;
}
```

User ID is authentication/audit context where already available; it is not part of authoritative journey progress. Draft schema version is not part of `JourneyVersion`.

### 2.2 Definition model

```typescript
interface JourneyDefinition {
  id: JourneyId;
  version: JourneyVersion;
  stepMappings: Readonly<Record<string, JourneyCardDefinition>>;
}

interface JourneyCardDefinition {
  cardId: string;
  stepCode: string;
  stageId: string;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  destination: ExistingJourneyDestination;
  iconToken: ExistingThemeIconToken;
}

interface ExistingJourneyDestination {
  kind: 'wizard_step';
  stepCode: string;
}
```

`ExistingJourneyDestination` is closed to existing wizard-step selection. `SetupWizardFlow` retains its current responsibility for rendering an embedded step or an already-approved management-route card for that selected step. E1 cannot create or duplicate a route through the definition.

### 2.3 Authoritative input model

```typescript
type JourneyStatusInput = OnboardingStatus;
```

`useOnboardingStatusQuery` currently returns `OnboardingStatusResponse`. The existing `mapOnboardingStatusToDomain` function converts that DTO into `OnboardingStatus`, including tenant identity, backend-ordered `visibleSteps`, a `Map<string, StepStatus>`, actionable state, and normalized status. The E1 presentation/application hook must reuse that mapper before calling the pure journey mapper. The journey mapper does not access raw transport responses.

### 2.4 Derived model

```typescript
interface JourneyViewModel {
  identity: JourneyRuntimeIdentity;
  cards: ReadonlyArray<JourneyCardModel>;
  progress: JourneyProgress;
  diagnostics: JourneyDiagnostics;
  availability: 'available' | 'unsupported_version';
}

interface JourneyProgress {
  completed: number;
  total: number;
}

interface JourneyDiagnostics {
  unknownStepCodes: ReadonlyArray<string>;
  missingValidationStepCodes: ReadonlyArray<string>;
}
```

The exact Journey Card model is governed by `E1-JOURNEY-CARD-CONTRACT.md`.

## 3. Journey Lifecycle

```text
Unresolved
  ↓ definition + effective tenant + status query
Loading
  ├─ query error ───────────────→ Error
  ├─ unsupported major version → Unsupported Version
  └─ supported inputs ─────────→ Available
                                  ├─ no recognized visible steps → Empty
                                  ├─ recognized cards ───────────→ Active
                                  └─ all recognized cards complete → Complete Projection

Effective tenant changes
  → discard prior derived view
  → Unresolved for new tenant

Status refetch succeeds
  → re-derive from new authoritative inputs
```

“Complete Projection” describes the E1 card set only. It does not complete onboarding, declare Ready to Start, activate a trial, or transition a tenant.

## 4. State Transitions

| From | Event | To | Rule |
|---|---|---|---|
| Unresolved | Required identity/query unavailable | Loading or safe unavailable UI | Do not fabricate cards. |
| Loading | Status succeeds and version supported | Available | Run pure mapper once with normalized inputs. |
| Loading | Status fails | Error | Use existing repository error boundary and localized presentation. |
| Any supported state | Status refetch succeeds | Available | Replace derived model; do not merge completion locally. |
| Any | Effective tenant changes | Unresolved | Remove prior derived presentation immediately. |
| Available | Card action selected | Available | Navigate only; do not mutate journey state. |
| Available | Authoritative step completes after existing flow/refetch | Available/Complete Projection | Recalculate from status. |
| Any | Unsupported major journey version | Unsupported Version | Render no partial cards. |

No transition may be driven by draft presence, card press, optimistic completion, elapsed time, demo state, or component-local counters.

## 5. Ownership

| Concern | Owner | Non-owner constraints |
|---|---|---|
| Roadmap intent and journey semantics | Product Architecture | Task Groups cannot redefine them. |
| Journey definition and supported client version | Frontend onboarding domain under Product Architecture approval | Presentation cannot modify definitions. Backend is not required for E1 definition delivery. |
| Visible-step order and validation/completion truth | Backend onboarding domain | Frontend cannot infer or write truth. |
| DTO normalization and status query | Existing onboarding service/repository boundary | Presentation cannot call API directly. |
| Journey mapping | Frontend onboarding domain/application pure mapper | Components and stores cannot own mapping rules. |
| Rendering and navigation | Frontend presentation using existing primitives/routes | No business policy or mutation. |
| Draft data | Existing Wizard Draft store | Draft store cannot own journey version/progress/completion. |
| Localization | Existing localization framework and product/localization review | No hardcoded or raw backend UI strings. |
| Theme/accessibility | Central design system and presentation contract | No card-local design system. |
| Measurement event intents | E1 contract; future shared analytics adapter | E1 cannot create an analytics platform. |

## 6. Responsibilities by Layer

### Presentation

- render `JourneyViewModel` and `JourneyCardModel`;
- use central theme/localization/accessibility primitives;
- invoke approved navigation callbacks;
- display loading, error, empty, unsupported, active, and complete-projection states;
- contain no eligibility, order, progress, completion, version, or tenant policy.

### Application

- use a focused presentation/application orchestration hook because no current journey hook exists;
- reuse `useOnboardingStatusQuery` and `mapOnboardingStatusToDomain` rather than issuing another query or duplicating DTO mapping;
- coordinate definition, normalized status, effective tenant, and pure mapping;
- expose prepared view model to presentation;
- create adapter-independent measurement intents after approved user/system events;
- reset derived state when input identity changes.

### Domain

- own E1 types, mapping rules, version compatibility, card contract enforcement, progress calculation, and diagnostics;
- remain pure and framework independent.

### Repository

- reuse existing tenant-scoped onboarding status query and central query keys;
- provide the existing DTO response to the orchestration boundary;
- own loading/error/stale semantics already established by the onboarding repository;
- remain unchanged for E1 unless source changes after this approval reveal a factual mismatch.

### Infrastructure

- reuse existing onboarding status API and transport mapping;
- no E1-specific API, persistence, migration, or network request.

## 7. Backend/Frontend Boundary

### Backend remains authoritative for

- `visible_steps` membership and order;
- `per_step_validation` state;
- actual step completion;
- onboarding completion;
- capability, readiness, tenant lifecycle, trial, and subscription truth.

### Frontend E1 owns

- client-bundled journey definition/version;
- mapping recognized visible steps to localized/themed card definitions;
- pure progress projection over authoritative recognized cards;
- safe handling of unknown/missing/unsupported data;
- presentation and approved navigation.

### Explicit boundary decision

E1 can proceed without backend work. If implementation proves the existing status contract cannot meet an approved acceptance criterion, work must stop. A new backend capability may only follow Roadmap → Requirements → Design → Task Group → Implementation approval; it cannot be added within TG18 by convenience.

## 8. Data Flow

```text
Existing auth/effective tenant
            │
            ├──────────────┐
            │              │
Existing `useOnboardingStatusQuery`
            │              │
            ▼              ▼
`OnboardingStatusResponse` + client JourneyDefinition
            │
            ▼
Existing `mapOnboardingStatusToDomain`
            │
            ▼
Normalized `OnboardingStatus`
                            │
                            ▼
                    Pure E1 domain mapper
                            │
                            ▼
                    JourneyViewModel
                            │
                            ▼
          Existing presentation/card/navigation primitives
```

No data flows from presentation back into completion truth. Existing step screens/mutations continue to own submissions; their successful status refresh later changes the E1 projection.

## 9. Error and Fallback Design

| Condition | Behavior |
|---|---|
| Status loading | Existing themed/localized loading presentation. |
| Status query error | Existing repository error mapped to localized safe error state; retry only through approved query behavior. |
| No visible steps | Localized empty state; no invented cards. |
| Unknown visible step | Omit fabricated card, record diagnostic intent, continue recognized journey. |
| Missing validation for recognized step | Render as not complete/available according to card contract; record diagnostic. |
| Unsupported major journey version | Render localized unsupported state; no partial mapping. |
| Tenant changes during request/render | Key query by tenant, discard previous derived view, ignore stale previous-tenant result. |

## 10. Extension Points

The following are deliberate future extension points, not TG18 scope:

- server-delivered journey definitions after separate approval;
- capability-driven visibility (E4/TG21);
- readiness-provider/blocker cards (E5/TG22);
- commercial trial/subscription/dunning cards (E8–E10);
- dashboard first actions/continuous growth (E11);
- shared analytics adapter (Platform Foundation);
- additional supported major journey versions;
- alternative approved card renderers that consume the same contract.

Extension points must not add optional `any` payloads or component-private rules to the E1 contract.

## 11. Architecture Decisions

1. **No new store:** Journey view state is derived from repository/query data plus an immutable definition. React Query/repository state remains sufficient.
2. **No new API:** Existing onboarding status is the only infrastructure input for E1.
3. **No direct API access:** Presentation consumes application/domain view models.
4. **No completion mutation:** E1 is read-only navigation/presentation.
5. **No duplicate card system:** Extend the existing `StepCard` to accept the localized Journey Card presentation contract while preserving existing callers; do not add a parallel Journey Card component.
6. **No journey persistence:** Journey version is bundled definition metadata; progress is re-derived from server status.
7. **No draft coupling:** Wizard Draft schema and persistence remain unchanged.
8. **No analytics platform:** Define event intents; emit only through a future/existing approved adapter.
9. **Focused orchestration hook:** Add one E1 presentation/application hook because no existing journey hook/mapper exists. It must compose the existing status hook and DTO-to-domain mapper; it is not a second query boundary.

## 12. Mandatory Principles

### Central Theme only

All visuals and icons use central tokens/primitives. No screen/card-specific styles.

### Localization first

Definitions contain localization keys, not display text. `en-US` and `hi-IN` parity is mandatory.

### Accessibility

The card renderer implements approved semantics, focus, touch target, progress description, state, and non-color signaling.

### Clean Architecture

Presentation → Application → Domain → Repository → Infrastructure. No bypasses.

### Reuse-before-create

Follow the approved reuse audit. Any new asset requires documented gap evidence and design approval.

### Multi-clinic compatibility

Effective tenant is an input to every query/derived model. Tenant change discards the prior projection.

### Progressive Experience consistency

Use Ready-to-Start terminology, do not reintroduce Demo Mode, and never bypass downstream capability/readiness/commercial ownership.

## 13. Design Verification Gates

Before TG18 code begins, the implementation plan must confirm:

- all E1 requirements map to this design and the card/version contracts;
- the reuse decisions still match actual current source;
- no new store/API/dependency is planned;
- exact authorized files are listed;
- unit/repository/component/integration/localization/accessibility/multi-clinic tests are listed;
- any factual mismatch discovered during source inspection causes a documentation/design stop, not an improvised implementation.
