# E1 Journey Card Contract

Version: 1.0

Status: APPROVED FOR TG18 READINESS ASSESSMENT

Owner: Product Architecture

## 1. Purpose

Define one reusable, deterministic, localized, themed, accessible Journey Card contract for E1. A Journey Card is a read-only projection of authoritative onboarding status plus an approved navigation action. It is not completion truth, a mutation engine, capability policy, readiness policy, or commercial policy.

## 2. Journey Card Model

### Definition model

```typescript
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
```

### Derived presentation model

```typescript
type JourneyCardStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'blocked'
  | 'unavailable';

interface JourneyCardModel {
  cardId: string;
  stepCode: string;
  stageId: string;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  destination: ExistingJourneyDestination;
  iconToken: ExistingThemeIconToken;
  status: JourneyCardStatus;
  isEligible: true;
  isVisible: true;
  isActionable: boolean;
  order: number;
}
```

`isEligible` and `isVisible` are true for emitted models because ineligible/invisible definitions are not emitted. They remain explicit to prevent presentation from recalculating policy.

No `data: any`, callback, component, style object, raw display text, arbitrary route, mutation, draft payload, clinical data, payment data, or backend DTO may be embedded in the contract.

## 3. Stable Identity

- `cardId` is stable within a journey MAJOR version.
- `stepCode` maps the card to authoritative onboarding status.
- `stageId` groups meaning but does not override backend step order.
- Card identity is independent of translated title and visual component.
- Reusing a `cardId` for different meaning requires a MAJOR journey version.

## 4. Eligibility Rules

A card is eligible when all are true:

1. its definition belongs to the supported journey definition;
2. its `stepCode` is present in authoritative `visible_steps` for the effective tenant;
3. its destination exists in the approved closed destination registry;
4. the definition is structurally valid.

E1 eligibility must not inspect:

- clinic type or specialty constants;
- local drafts;
- presentation state;
- demo/trial/subscription state;
- readiness assumptions;
- user interaction history;
- elapsed time;
- hardcoded capability rules.

Capability-driven eligibility belongs to E4/TG21. Readiness belongs to E5/TG22.

## 5. Visibility Rules

- Eligible recognized cards are visible.
- Ineligible definitions are omitted.
- Unknown backend step codes do not create placeholder cards.
- A recognized eligible card with missing validation remains visible and conservatively not complete.
- Presentation cannot hide an emitted card based on screen size, persona assumptions, draft state, or local completion.
- Permission-based actionability may be represented only if existing authoritative permission state is part of the accepted input; E1 otherwise preserves current onboarding access behavior and does not invent role policy.

## 6. Ordering

1. Backend `visible_steps` order is authoritative for step-backed cards.
2. The mapper iterates `visible_steps` in order and emits recognized eligible cards.
3. `order` is the emitted zero-based position after filtering unknown/unmapped steps.
4. Definitions, components, and localization files must not reorder cards.
5. `stageId` does not regroup or reorder cards in E1.
6. Duplicate visible step codes are treated as malformed input: emit the first recognized occurrence, record a diagnostic intent, and do not double-count progress.

## 7. Status Mapping

The domain mapper owns a closed mapping from normalized authoritative validation status to `JourneyCardStatus`.

| Authoritative normalized meaning | Journey Card status |
|---|---|
| Completed | `complete` |
| In progress | `in_progress` |
| Blocked | `blocked` |
| Not started | `not_started` |
| Explicitly unavailable/non-actionable | `unavailable` |
| Missing or unknown validation | `not_started` plus diagnostic; never complete |

Exact backend transport strings are normalized in the existing DTO/repository boundary. Components must not inspect raw status strings.

## 8. Progress Calculation

For the emitted eligible recognized card list:

```text
total = number of emitted cards
completed = number of emitted cards where status == complete
```

Rules:

- unknown step codes are excluded from both counts;
- missing validation is included in total and excluded from completed;
- blocked/unavailable/in-progress/not-started cards are included in total and excluded from completed;
- local drafts do not affect either count;
- progress is `0 of 0` for an empty recognized card list; presentation uses the localized empty state rather than a misleading percentage;
- percentage, if displayed by an existing primitive, is derived from `completed / total` only when `total > 0`;
- E1 progress is a projection, not Ready-to-Start, activation, or onboarding-completion truth.

## 9. Completion Rules

- A card is complete only from authoritative normalized completed validation.
- Card action selection does not complete a card.
- Navigation return does not complete a card.
- Draft presence or clearing does not complete a card.
- Optimistic local state does not complete a card.
- A successful existing step mutation affects the card only after authoritative repository status refresh.
- E1 cannot call completion APIs or mutate progress.

## 10. Action Contract

An action:

- navigates through an existing approved navigation primitive;
- selects the mapped existing wizard step by `stepCode` within the backend-ordered visible-step list;
- is enabled only from the prepared `isActionable` field;
- exposes localized action text and an accessible consequence label;
- does not contain business logic in the component;
- does not submit, complete, transition, start trial, purchase, or alter readiness.

E1 uses one closed destination kind: the existing wizard-step selection behavior. The active wizard continues to decide whether that selected step renders an embedded screen or its already-approved management-route card. E1 does not duplicate route tables, construct raw routes, or add destinations. If the mapped wizard step is unavailable, the card is not actionable and the mapper records a diagnostic intent.

## 11. Dependencies

Required E1 dependencies:

- supported client-bundled Journey Definition and Versioning contract;
- effective tenant identity already used by onboarding;
- existing onboarding status repository/query;
- normalized `visible_steps` and `per_step_validation` inputs;
- existing approved navigation routes;
- selected existing card/status/progress primitive from the reuse audit;
- central theme/icon tokens;
- existing localization framework with `en-US`/`hi-IN`;
- existing accessibility primitives/test patterns.

No new third-party dependency is required or authorized.

Source confirmation selected the existing `StepCard` for minimal extension, `ProgressBar`/`StepProgressHeader` for composition where their current semantics fit, and `SetupWizardFlow` for host orchestration. The implementation must preserve existing callers and tests.

## 12. Localization Expectations

- Definitions contain localization keys only.
- Keys use the existing onboarding/Progressive Experience namespace convention.
- Every title, description, action, status, progress, empty, error, and unsupported state has `en-US` and `hi-IN` entries.
- Interpolation variables match exactly across locales.
- Raw `stepCode`, backend errors, or untranslated server labels are never displayed.
- Unknown identifiers use a generic localized safe state outside card fabrication.
- Hindi copy requires Hindi-literate review before release.

## 13. Theme Expectations

- Renderer uses only central theme/design-system tokens.
- `iconToken` references an existing approved central icon token; it is not an arbitrary icon/style payload.
- No card-specific colors, typography, spacing, borders, radii, shadows, or status palettes.
- Status is not communicated by color alone.
- Existing card/status/progress primitives are reused or minimally extended per the reuse audit.

## 14. Accessibility Contract

Each rendered card must provide:

- a semantic grouped/card or list-item structure supported by the current platform primitives;
- a meaningful accessible name combining localized title and state;
- an accessible description of purpose and progress/status;
- an action label that describes the destination/consequence;
- disabled/unavailable state semantics;
- minimum 44 × 44 logical-pixel action target;
- deterministic focus order matching visual/backend order;
- no nested ambiguous interactive targets;
- non-color-only status indicator;
- polite announcement only for material asynchronous state changes, not every render;
- reduced-motion-compatible transitions if an existing approved animation is reused.

## 15. Multi-Clinic Contract

- Card lists are derived separately for each effective tenant.
- Query/cache keys include tenant identity through the existing repository convention.
- Tenant change discards the old derived card list before showing the new tenant.
- Card actions retain the effective tenant context required by existing destinations.
- No card definition contains tenant-specific display data.
- Different clinics may have different visible cards/order without changing journey version.
- No clinic type or specialty is hardcoded.

## 16. Measurement Event Intents

E1 defines, but does not implement a provider for:

| Event intent | Trigger | Minimum non-sensitive properties |
|---|---|---|
| `progressive_journey_viewed` | Supported journey view becomes available. | journey ID/version, tenant context per approved policy, card count, completed count. |
| `progressive_journey_card_action_selected` | User selects an actionable card. | journey ID/version, card ID, step code, order. |
| `progressive_journey_unknown_step` | Unknown visible step encountered. | journey ID/version, step code, position. |
| `progressive_journey_unsupported_version` | Unsupported major version encountered. | journey ID, requested/supported major. |

Emission is fire-and-forget through an existing/future approved shared adapter. TG18 must not create an analytics platform and must not block UI when no adapter exists.

## 17. Test Contract

Tests must cover:

- eligibility and omission;
- backend ordering and duplicate handling;
- every normalized status mapping;
- missing/unknown validation;
- progress totals;
- no local completion mutation;
- action destination and invalid-destination behavior;
- unsupported version;
- tenant switching and cache isolation;
- localization parity/interpolation;
- central theme usage;
- accessibility semantics, state, focus order, and touch targets;
- no raw strings/routes/styles/API calls in presentation;
- regression of the reused component and existing onboarding flow.

## 18. Mandatory Principles and Stop Conditions

- **Central Theme only:** stop for any card-local design values.
- **Localization first:** stop for hardcoded or raw backend UI text.
- **Accessibility:** stop if semantic/action/progress behavior is unspecified or untested.
- **Clean Architecture:** stop if components calculate eligibility/progress/completion or call APIs.
- **Reuse-before-create:** stop before adding a duplicate card, hook, store, service, repository, or API.
- **Multi-clinic compatibility:** stop if tenant isolation/action context cannot be proven.
- **Progressive Experience consistency:** stop if the card bypasses gates, reintroduces Demo Mode, or implements later epics.
