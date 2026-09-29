# E1 Reuse Audit

Version: 1.0

Status: APPROVED; SOURCE CONFIRMED AT FRONTEND HEAD `31845814`

Owner: Product Architecture

Epic: E1 — Journey Foundation and Cards

## 1. Purpose and Decision

This audit identifies the existing onboarding assets documented in the canonical Progressive Experience sources and assigns one of three decisions:

- **REUSE:** consume the existing asset within its current responsibility;
- **EXTEND:** make the smallest contract-preserving change after source confirmation and explicit file authorization;
- **DO NOT REUSE:** keep the asset out of E1 because its responsibility or semantics do not fit.

E1 must not create duplicate components, hooks, stores, services, repositories, queries, APIs, routing systems, design tokens, or localization frameworks.

The audit began from canonical sources and was confirmed read-only against frontend source at branch HEAD `31845814`. The source inspection verified names, exports, current behavior, localization paths, and tests. If source changes after this approval create a mismatch, implementation must stop for factual reconciliation; a mismatch is not permission to improvise a duplicate.

## 2. Reuse Principles

1. Reuse existing architecture boundaries before creating an E1-specific layer.
2. Extend only when the E1 contract cannot be satisfied through composition.
3. Do not move backend truth into components or Zustand.
4. Do not reuse a semantically different Demo, readiness, commercial, billing, or clinical asset merely because it looks similar.
5. Do not introduce a new dependency when existing application primitives can satisfy the contract.
6. Preserve central theme, localization, accessibility, multi-clinic isolation, and Progressive Experience terminology.

## 3. Components Audit

| Existing asset | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| `SetupWizardFlow.tsx` | Canonical docs and source confirm it is the active wizard orchestrator; it uses `useOnboardingStatusQuery`, tenant context, existing navigation, localization, theme, and wizard behavior. | EXTEND | Host the E1 journey projection and wizard-step selection only. Keep submission, lifecycle, draft, commercial compatibility, and navigation behavior unchanged. Put mapping in the focused E1 hook/domain mapper, not the component. |
| `StepCard` | Source confirms the component and `StepCard.test.tsx`. It uses `useClinicTheme` but currently derives raw code/status text and contains hardcoded radius, widths, sizes, margins, and opacity. | EXTEND | Reuse the component identity and tests. Minimally extend it to accept prepared localized Journey Card content/accessibility props and replace touched hardcoded design values with central tokens. Preserve existing callers through an intentional compatible prop adapter; do not create a parallel card. |
| `ProgressBar`, `StepProgressHeader`, `WizardStepper` | Source confirms all three central-theme onboarding progress primitives. | REUSE/COMPOSE | Select only the primitive whose semantics match aggregate E1 progress; do not duplicate progress visuals. `WizardStepper` retains wizard navigation responsibility. |
| `LoadingScreen`, `ErrorScreen`, existing notices | Source confirms themed onboarding loading/error components and existing notices. | REUSE | Use for safe loading/error/updated states when their localization/accessibility contract fits; extend minimally rather than duplicate. |
| Existing navigation/router primitives | `SetupWizardFlow` and `StepDetailScreen` use existing approved routes; TG17 preserves checklist routing. | REUSE | Consume closed approved destinations. Do not construct routes from raw step codes or create a second navigator. |
| Existing inline notice/loading/error/empty primitives | Completed TG15–TG17 work uses themed/localized notices and states. | REUSE | Use for loading, safe empty/error, changed, and unsupported states when semantically compatible. Confirm exact component names before implementation. |
| `OfflineBanner` | TG16-specific connectivity visibility/gating. | DO NOT REUSE as Journey Card | Retain its existing responsibility; E1 does not implement connectivity or offline recovery. It may continue rendering independently in the host flow. |
| `DemoStatusBanner` | TG17 compatibility surface for existing setup/Ready-to-Start routing. | DO NOT REUSE as Journey Card | Demo semantics are not the target journey and E1 cannot own readiness/commercial transition. Keep existing compatibility behavior separate. |
| `GoLiveScreen` | Existing readiness checklist surface referenced by audit/tasks. | DO NOT REUSE in E1 | Owned by later Ready-to-Start work. E1 may not modify or absorb its policy. |
| `StepDetailScreen.tsx` | `design.md` calls it a legacy alternate flow. | DO NOT REUSE as E1 host | Preserve existing alias/navigation behavior; do not establish the new journey foundation in the legacy alternate flow. |

### Component conclusion

Source confirmation selects `StepCard` for minimal extension and existing progress/loading/error primitives for composition. A new `JourneyCard` component or card family is prohibited under E1.

## 4. Hooks Audit

| Existing asset | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| `useOnboardingStatusQuery` | `tasks.md` records it as the current tenant-scoped status query used by `SetupWizardFlow`. | REUSE | Sole network-query input for E1. Consume normalized status; do not add a second status query. |
| Existing theme hook (`useClinicTheme`) | Requirements/design mandate central theme usage. | REUSE | All E1 visuals and icons resolve through central theme/design primitives. |
| Existing localization hook/utility | Requirements/tasks record `en-US`/`hi-IN` Progressive Experience localization. | REUSE | Resolve all definition keys and state/action copy. No hardcoded strings. |
| Existing presentation orchestration hooks | Source search confirms no existing journey definition, mapper, or journey hook. | CREATE ONE JUSTIFIED FOCUSED HOOK; NOT A DUPLICATE | Add a focused E1 orchestration hook that composes `useOnboardingStatusQuery`, existing `mapOnboardingStatusToDomain`, the bundled definition, and the pure journey mapper. It must not create a second query, store, service, or policy boundary. |
| Demo/live repository mutation hooks | TG17 evidence. | DO NOT REUSE | E1 is read-only and cannot transition demo/live, readiness, trial, or subscription. |
| Submission/complete mutation hooks | Requirements/design/tasks evidence. | DO NOT REUSE for Journey Card behavior | Existing step screens retain them. E1 cards navigate only; they do not submit or complete. |

### Hook conclusion

E1 needs no new network or mutation hook. One focused presentation/application orchestration hook is justified because source confirmation found no existing journey hook and keeping DTO/domain/version mapping out of `SetupWizardFlow` preserves Clean Architecture. It must reuse the existing status hook rather than duplicate it.

## 5. Stores Audit

| Existing asset | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| `useWizardStore` / `wizard.store.ts` | TG13–TG15 completed tenant/user-scoped drafts, lifecycle, migration, compression, expiry, and cleanup. | REUSE EXISTING RESPONSIBILITY; DO NOT EXTEND FOR JOURNEY TRUTH | E1 must not read drafts for eligibility/progress/completion and must not store journey definition/card state here. Version compatibility review remains conceptual only. |
| Auth store/effective tenant source | Requirements/tasks record tenant/user identity and `SetupWizardFlow` tenant use. | REUSE | Consume the same effective tenant identity already passed to the onboarding status query. Do not create a second selected-clinic state. |
| Pending mutation store | Not implemented and belongs to E7/TG25 planning. | DO NOT CREATE OR REUSE | E1 is read-only and has no offline mutation queue. |
| New journey store | No accepted need; E1 state is derived from query data plus immutable definition. | DO NOT CREATE | React Query/repository status and pure derivation are sufficient. A store would duplicate truth and create persistence/version risk. |

### Store conclusion

No store file is expected to change for TG18. If implementation proposes one, stop and revise design with evidence.

## 6. Services Audit

| Existing asset | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| Existing onboarding status service/datasource | `design.md` lists `onboarding.api.ts` and service/repository layering; status API exists. | REUSE UNCHANGED | Continue retrieving existing onboarding status through repository. E1 does not call it directly. |
| Existing `mapOnboardingStatusToDomain` | Source confirms it maps `OnboardingStatusResponse` to `OnboardingStatus`, including tenant, `visibleSteps`, `steps`, actionable state, and normalized status; focused entity tests exist. | REUSE UNCHANGED | The E1 orchestration hook invokes it before the pure journey mapper. Do not duplicate mapping or expose raw DTOs to the Journey Card renderer. |
| Existing error handling utilities | Design/tasks reference current error patterns/utilities. | REUSE | Use existing repository/error presentation behavior; E1 does not create centralized error architecture (TG24). |
| New pure journey mapper | Source search confirms none exists. | CREATE AS DOMAIN LOGIC; NOT AN INFRASTRUCTURE SERVICE | A small framework-independent mapper is required by the accepted contract. It performs no I/O and does not duplicate an existing implementation. |
| Analytics service/provider | Roadmap keeps analytics provider decision open. | DO NOT CREATE | Define typed event intents only. Emit through an existing approved adapter if one is confirmed; otherwise leave emission disabled/deferred. |

### Service conclusion

No new infrastructure service or datasource is expected. Existing onboarding status and domain mapping remain unchanged. The new pure journey mapper is a required domain artifact, not a network/service duplicate.

## 7. Repositories Audit

| Existing asset | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| `onboarding.repository.impl.ts` | Docs and source confirm `useOnboardingStatusQuery` and tenant-scoped `onboardingKeys.status(tenantId)`. The hook currently returns `OnboardingStatusResponse`. | REUSE UNCHANGED | Existing status repository remains the sole query boundary; E1 maps the DTO through the existing domain mapper in its orchestration hook. |
| `onboardingKeys` | Requirements/design require centralized query keys. | REUSE | Use existing tenant-scoped status key. Do not add an E1 network key when no new request exists. |
| New journey repository | No new data source or persistence exists for E1. | DO NOT CREATE | Pure journey mapping belongs above the existing repository. |
| Demo/subscription repositories | TG17/commercial evidence. | DO NOT REUSE | Later epics own commercial/readiness behavior. |

### Repository conclusion

No new repository is authorized. A minimal existing repository normalization extension is allowed only after source confirmation and exact file authorization; query behavior must remain tenant scoped.

## 8. APIs Audit

| Existing API | Canonical evidence | Decision | E1 use/boundary |
|---|---|---|---|
| `GET /api/v1/onboarding/{tenantId}/status` | `design.md` backend dependency: backend-ordered `visible_steps` and current `per_step_validation`. | REUSE UNCHANGED | Sole authoritative E1 data input through existing service/repository. |
| Step submission API | Existing production-hardening flow. | DO NOT CALL FROM E1 CARDS | Existing step screens own mutations. Card action only navigates. |
| Onboarding complete API | Existing completion flow. | DO NOT CALL FROM E1 | E1 progress projection cannot complete onboarding. |
| Demo/live APIs | TG17 compatibility/commercial adjacency. | DO NOT REUSE | Outside E1. |
| Subscription/payment APIs | Current behavior inventory/requirements. | DO NOT REUSE | Outside E1. |
| New journey API | Not required by approved E1 design. | DO NOT CREATE | If existing status proves insufficient, stop for roadmap-compliant backend planning. |

### API conclusion

TG18 has zero backend/API/migration scope.

## 9. Navigation Audit

- Reuse existing router/navigation primitives and destinations.
- Define a closed destination registry in the frontend onboarding domain/application boundary.
- Do not build routes through string concatenation from `stepCode`.
- Do not add a second navigation stack.
- Do not navigate directly to readiness, commercial, payment, or dashboard states that bypass existing gates.
- Preserve Android back, draft sync, submit/refetch ordering, and TG17 behavior.

Decision: **REUSE** existing navigation; **DO NOT CREATE** new routing infrastructure.

## 10. Theme, Localization, and Accessibility Audit

| Capability | Decision | Boundary |
|---|---|---|
| Central theme/design system | REUSE | No E1-specific tokens or inline visual system. |
| Existing icon tokens/assets | REUSE | Definitions reference approved token identifiers only. |
| Existing localization framework | REUSE | `en-US`/`hi-IN` keys; matching interpolation; Hindi review. |
| Existing accessibility primitives/test patterns | REUSE/EXTEND | Card semantics and progress descriptions may minimally extend selected primitive; no separate accessibility abstraction. |

## 11. Expected Minimal Change Surface After Source Confirmation

This audit does not authorize code. Source confirmation now matches the decisions above. If TG18 later becomes explicitly authorized, the expected minimal areas are:

1. a small frontend onboarding domain journey definition/types and pure mapper;
2. one focused presentation/application orchestration hook that reuses the current status hook and domain mapper;
3. minimal compatible extension of `StepCard.tsx` plus composition of existing progress/loading/error primitives;
4. minimal host orchestration in `SetupWizardFlow.tsx` for rendering and existing wizard-step selection;
5. localization entries in `frontend/core/localization/translations/en-US.json` and `hi-IN.json`;
6. focused domain/hook/component/flow tests plus existing regression tests.

Not expected to change:

- backend;
- APIs;
- migrations;
- dependency manifests/lockfiles;
- Wizard Draft store;
- auth store behavior;
- mutation hooks;
- submission/completion flow;
- readiness/commercial/payment flows;
- Doctor Module or clinical work.

Expected paths are fixed below. A later explicit TG18 authorization may narrow this list but may not broaden it without approved documentation revision.

| Path | Action | Approved future responsibility |
|---|---|---|
| `frontend/features/onboarding/domain/entities/journey.entity.ts` | CREATE | E1 journey/version/card/view-model domain types only. |
| `frontend/features/onboarding/domain/usecases/build-journey-view-model.usecase.ts` | CREATE | Pure deterministic definition/status-to-view-model mapping only. |
| `frontend/features/onboarding/domain/usecases/index.ts` | MODIFY | Export the new pure use case if current barrel convention requires it. |
| `frontend/features/onboarding/presentation/hooks/useJourneyFoundation.ts` | CREATE | Compose `useOnboardingStatusQuery`, `mapOnboardingStatusToDomain`, bundled definition, and pure mapper; no second query or store. |
| `frontend/features/onboarding/presentation/components/StepCard.tsx` | MODIFY | Compatible localized/themed/accessibility extension for prepared Journey Card content; preserve existing callers. |
| `frontend/features/onboarding/presentation/pages/SetupWizardFlow.tsx` | MODIFY | Render E1 projection and select an existing wizard step; no changes to submit, draft, lifecycle, readiness, or commercial logic. |
| `frontend/core/localization/translations/en-US.json` | MODIFY | E1 journey/card/state keys. |
| `frontend/core/localization/translations/hi-IN.json` | MODIFY | Matching E1 keys and interpolation. |
| `frontend/tests/onboarding/journey.entity.test.ts` | CREATE | Version/domain model validation where needed. |
| `frontend/tests/onboarding/build-journey-view-model.test.ts` | CREATE | Eligibility, ordering, status, progress, unknowns, versions, tenants. |
| `frontend/tests/onboarding/useJourneyFoundation.test.tsx` | CREATE | Existing hook/domain composition, loading/error/tenant behavior. |
| `frontend/tests/onboarding/StepCard.test.tsx` | MODIFY | Compatible legacy plus E1 localization/theme/accessibility states. |
| `frontend/tests/onboarding/SetupWizardFlow.test.tsx` | MODIFY | E1 rendering/action plus existing-flow regression. |

The following verified existing files are reused unchanged and are not in the expected modification list:

- `frontend/features/onboarding/data/datasources/onboarding.api.ts`;
- `frontend/features/onboarding/data/repositories/onboarding.repository.impl.ts`;
- `frontend/features/onboarding/data/models/onboarding.dtos.ts`;
- `frontend/features/onboarding/domain/entities/onboarding-status.entity.ts`;
- `frontend/features/onboarding/presentation/stores/wizard.store.ts`;
- dependency manifests and lockfiles;
- backend files.

## 12. Source-Confirmation Checklist

Source-confirmation result:

- [x] `SetupWizardFlow` remains the active orchestration path.
- [x] `StepCard`, `ProgressBar`, `StepProgressHeader`, and `WizardStepper` exist; `StepCard` requires contract-preserving extension.
- [x] `StepCard` currently has localization/theme/accessibility gaps; the E1 extension scope explicitly corrects touched behavior.
- [x] `useOnboardingStatusQuery` exists and returns `OnboardingStatusResponse`.
- [x] `mapOnboardingStatusToDomain` and its focused tests exist.
- [x] `onboarding.repository.impl.ts` and tenant-scoped `onboardingKeys.status(tenantId)` are active.
- [x] existing status DTO supplies `visible_steps`, `per_step_validation`, actionable state, and completion fields.
- [x] effective tenant is selected in `SetupWizardFlow` from route tenant then authenticated user tenant and passed to the status hook.
- [x] localization files are `frontend/core/localization/translations/en-US.json` and `hi-IN.json`; `useTranslation` exists.
- [x] `useClinicTheme` and existing onboarding icon/progress primitives exist.
- [x] relevant StepCard, SetupWizardFlow, repository, API, wizard-store, status-entity, and progress tests exist.
- [x] no existing journey definition, mapper, hook, store, repository, service, or API implements the E1 contract.
- [x] no new store, infrastructure service, repository, API, dependency, or route is needed.

If any confirmed fact changes before implementation, work must stop for factual documentation/design reconciliation.

## 13. Mandatory Principles

- **Central Theme only:** reuse central tokens/icons/components.
- **Localization first:** reuse the localization framework with `en-US`/`hi-IN` parity.
- **Accessibility:** reuse/extend accessible primitives; do not bolt on semantics afterward.
- **Clean Architecture:** preserve Presentation → Application → Domain → Repository → Infrastructure.
- **Reuse-before-create:** the decisions in this audit are mandatory; duplicate implementations are prohibited.
- **Multi-clinic compatibility:** reuse effective-tenant and tenant-scoped query boundaries; never persist derived journey truth.
- **Progressive Experience consistency:** no Demo Mode, gate bypass, later-epic behavior, Doctor Module, or clinical workflow expansion.

## 14. Final Audit Decision

| Category | Reuse | Extend | Do not reuse/create |
|---|---|---|---|
| Components | Navigation, progress, loading/error/notices | `StepCard`; `SetupWizardFlow` host composition | DemoStatusBanner, GoLiveScreen, OfflineBanner as card, StepDetail legacy host, duplicate card system |
| Hooks | Status, theme, localization | One focused E1 orchestration hook because none exists | Demo/live and mutation hooks; duplicate status/network hook |
| Stores | Auth/effective tenant; existing draft store in its current responsibility | None expected | Journey store, PendingMutationStore, draft store as journey truth |
| Services/domain | Existing status, error, and `mapOnboardingStatusToDomain` boundaries | New pure journey mapper because none exists | New journey network service, analytics platform |
| Repositories | Existing onboarding status repository and keys | None | Journey repository, commercial repositories |
| APIs | Existing status API unchanged | None | New journey API; submit/complete/demo/commercial calls from E1 |

The source-confirmed reuse plan removes the duplicate-implementation uncertainty identified by the readiness review. A brief drift check against the recorded HEAD remains mandatory immediately before any later authorized code change.

## 15. TG18 Readiness Blocker Closure

| Prior readiness blocker | Constitutional resolution | Status |
|---|---|---|
| New E1 requirements | `E1-READY-TO-START-REQUIREMENTS.md` defines business, functional/non-functional requirements, acceptance, metrics, and scope. | CLOSED |
| Journey-domain design | `E1-JOURNEY-DOMAIN-DESIGN.md` defines model, lifecycle, states, ownership, layers, boundaries, and extensions. | CLOSED |
| Domain vocabulary | Journey, version, runtime identity, definition, card, progress, diagnostics, tenant, and draft-version terms are defined. | CLOSED |
| Journey-version ownership/delivery | Product Architecture owns semantics; E1 uses client-bundled `progressive-experience@1.0.0`; no API required. | CLOSED |
| Card eligibility/progress/completion ownership | `E1-JOURNEY-CARD-CONTRACT.md` assigns deterministic domain mapping over authoritative existing status. | CLOSED |
| Version compatibility/migration | `E1-JOURNEY-VERSIONING.md` defines MAJOR/MINOR/PATCH, compatibility, upgrades, and migration. | CLOSED |
| Relationship to status/capability/readiness | Existing status supplies visible-step/completion truth; E4/E5 policy remains explicitly excluded. | CLOSED |
| Reuse-before-create audit | This document records REUSE/EXTEND/DO NOT REUSE decisions and read-only source confirmation. | CLOSED |
| Existing API sufficiency | Existing tenant status API is sufficient for E1; no new backend work is required or allowed. | CLOSED |
| Effective tenant/multi-clinic behavior | Reuse current route-tenant/auth-tenant resolution and tenant-scoped query; discard old derived view on change. | CLOSED |
| Localization model | Stable keys in existing `en-US`/`hi-IN` files, matching interpolation, no raw backend text, Hindi review. | CLOSED |
| Accessibility contract | Card semantics, action consequences, progress, focus, touch targets, states, and non-color behavior are defined. | CLOSED |
| Analytics boundary | Typed non-blocking event intents are defined; provider/platform implementation is explicitly deferred. | CLOSED |
| Precise file/test boundary | §11 and the test contracts enumerate the exact expected future files and verification scope. | CLOSED |
| Explicit implementation authorization | Remains a governance action after planning readiness; these documents do not authorize code or create TG18. | NOT A PLANNING BLOCKER |

No architectural or product-planning blocker remains for a subsequent explicit TG18 implementation authorization. If repository source changes after HEAD `31845814`, factual drift must be reconciled before code.

Epic 1 Planning Status: **READY**
