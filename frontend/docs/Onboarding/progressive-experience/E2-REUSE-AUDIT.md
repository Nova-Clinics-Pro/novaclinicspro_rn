# E2 Reuse Audit

Date: 2026-07-20

Status: Version 1 product constraints approved; source-to-contract fit remains open

## Version 1 Reuse Constraints

This controlling section closes prior uncertainty about product meaning and
domain ownership. It does not declare an existing API suitable without contract
verification.

| Classification | Decision | Asset/boundary | Version 1 disposition |
|---|---|---|---|
| CONFIRMED | REUSE/EXTEND | `ChoiceScreen.tsx` | Present stable `new_clinic` and `bring_your_clinic` choices for eligible users; do not use demo creation as the hidden implementation. |
| CONFIRMED | REUSE/EXTEND | `ClinicProfileScreen.tsx` form behavior | Support the required minimum field set and optional initial set through extensible field definitions; do not copy direct Axios or hardcoded UI behavior. |
| CONFIRMED | REUSE | Workspace/Tenant boundary | Own create, associate, select, normalized-identity matching, idempotency, and authoritative tenant result. Exact existing repository/API fit remains open. |
| CONFIRMED | REUSE | Authentication boundary | Own identity and session refresh; no second auth state. |
| CONFIRMED | REUSE | Wizard Draft store | Only approved non-sensitive field keys; clear on logout/switch; never tenant truth. The allowlist remains open. |
| CONFIRMED | REUSE | TG18 foundation | Consume only after automatic single-clinic or explicit multi-clinic effective-tenant resolution. |
| CONFIRMED | DO NOT CREATE | duplicate tenant/clinic truth | No frontend store, matching engine, association engine, or provisioning truth. |
| CONFIRMED | DO NOT REUSE | demo tenant creation as target path | Version 1 paths are new clinic and verified association of an existing Nova-managed clinic. |
| OUT OF SCOPE | DO NOT CREATE | migration/import capability | Data/EMR/vendor migration, bulk import, and unverified claims are excluded. |

### Extensible field reuse

- **CONFIRMED** — Required Minimum Set: Clinic Name, Clinic Address, Primary
  Contact Number, Verified Email or Mobile, Clinic Type / Specialty.
- **CONFIRMED** — Optional Initial Set: GST, PAN, Logo, Website, Secondary
  Contact.
- **CONFIRMED** — Reusable form rendering/validation shall consume stable field
  definitions so approved future keys are additive.
- **OPEN DECISION** — Exact existing input primitives, field-definition location,
  normalization, server validation mapping, draft allowlist, and test file
  boundary require source-to-contract design approval.

### Remaining reuse decisions

- **OPEN DECISION** — Which existing onboarding/tenant repository and datasource
  can satisfy Workspace/Tenant create/associate/select without new APIs.
- **OPEN DECISION** — Whether one focused orchestration hook and pure mapper are
  needed after exact DTOs and state transitions are verified.
- **OPEN DECISION** — Exact localization keys/copy, navigation destinations,
  ownership-verification UI, errors, and accessibility acceptance.

## Classification Rule

- **CONFIRMED** — Source and canonical evidence support the disposition.
- **OPEN DECISION** — Final reuse/extension depends on unresolved E2 product or
  backend contracts.
- **OUT OF SCOPE** — Asset/capability shall not be used for E2.
- **CONFIRMED** — Duplicate implementations are prohibited.

## Source-Confirmed Context

- **CONFIRMED** — `ChoiceScreen.tsx` is an existing entry/choice surface using
  application detail, demo creation, auth refresh, onboarding presentation store,
  theme, localization, loading/error, and routing.
- **CONFIRMED** — Both current ChoiceScreen action paths create a demo tenant;
  its comment states direct setup is not implemented.
- **CONFIRMED** — `ClinicProfileScreen.tsx` contains reusable identity/contact
  form behavior and draft integration, plus legacy direct Axios access and
  hardcoded strings that violate the target boundary.
- **CONFIRMED** — Onboarding repositories expose application detail/validation,
  demo creation, setup-wizard, status, submit, and completion operations.
- **CONFIRMED** — Tenant repositories expose organization tenant list/detail/
  create/update/deactivate and current-tenant lookup.
- **CONFIRMED** — No accepted Bring Your Clinic repository/service/API contract
  exists.
- **CONFIRMED** — TG18 provides reusable journey domain/projection/hook/card/
  progress/edge states only after effective tenant resolution.

## Components

| Classification | Decision | Asset | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE/EXTEND | `ChoiceScreen.tsx` | Candidate host for approved path presentation; must not retain demo creation as hidden behavior for all paths. Exact extension is open. |
| CONFIRMED | REUSE/EXTEND | `ClinicProfileScreen.tsx` identity/contact form behavior | Reuse approved fields/primitives/draft behavior; presentation-to-API calls and hardcoded copy cannot be copied into E2 architecture. Exact extraction is open. |
| CONFIRMED | REUSE | `LoadingScreen`, `ErrorScreen`, existing form/input/button/state primitives | Use only where semantics, theme, localization, and accessibility satisfy approved E2 states. |
| CONFIRMED | REUSE | TG18 `JourneySurface`, `StepCard`, `ProgressBar` and host handoff | Consume unchanged after effective tenant resolution; do not use them to create/associate/select tenants. |
| OPEN DECISION | EXTEND | Choice/form-specific status, duplicate, and recovery composition | Exact components depend on approved states and error contract. |
| OUT OF SCOPE | DO NOT REUSE | `DemoStatusBanner`, demo choice behavior as target journey | Demo Mode is not the target Progressive Experience journey. |
| OUT OF SCOPE | DO NOT REUSE | `GoLiveScreen`, clinical, scheduling, inventory, billing/payment components | Later epics or other modules own these capabilities. |
| OUT OF SCOPE | DO NOT CREATE | Parallel clinic-entry component system | Existing surfaces/primitives must be extended or composed first. |

## Hooks

| Classification | Decision | Asset | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE | `useApplicationDetailQuery` | Existing application context query; no duplicate fetch. |
| CONFIRMED | REUSE | existing auth hook/session refresh | Reuse after authoritative tenant result; no second auth state. |
| CONFIRMED | REUSE | `useClinicTheme`, `useTranslation`, router hooks | Mandatory central framework use. |
| CONFIRMED | REUSE | `useJourneyFoundation` | Downstream post-resolution journey only; preserve tenant mismatch guard. |
| OPEN DECISION | REUSE/EXTEND | existing onboarding or tenant mutation/query hooks | Contract fit and caller authorization are unresolved. |
| OPEN DECISION | EXTEND/CREATE ONE | focused E2 orchestration hook | Allowed only if no existing hook fits after accepted design; it must compose repositories, not call services. |
| OUT OF SCOPE | DO NOT REUSE | demo/live, submit/complete, commercial/payment hooks as E2 clinic entry | Their responsibilities do not define clinic entry. |
| OUT OF SCOPE | DO NOT CREATE | duplicate application/auth/status/network hooks | Existing boundaries must be reused. |

## Stores

| Classification | Decision | Asset | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE CURRENT RESPONSIBILITY | auth state | Supply authenticated identity/session only. |
| CONFIRMED | REUSE CURRENT RESPONSIBILITY | Wizard Draft store | Use only if approved E2 fields may be stored and identity scope is safe. It never owns tenant truth. |
| OPEN DECISION | REUSE/EXTEND | onboarding presentation store | Existing application/submission UI state may be reused if the accepted design still needs it. |
| OUT OF SCOPE | DO NOT EXTEND | Wizard Draft as path, association, provisioning, duplicate, or effective-tenant truth | Repository/backend authority is required. |
| OUT OF SCOPE | DO NOT CREATE | new clinic-entry, tenant, provisioning, or Bring Your Clinic store | No accepted need; would risk duplicate truth. |
| OUT OF SCOPE | DO NOT CREATE | PendingMutationStore for E2 | TG25 policy is not accepted for clinic creation/association. |

## Services and Domain Logic

| Classification | Decision | Asset | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE | existing onboarding application/status datasources and mappers | Reuse only their current contracts through repositories. |
| CONFIRMED | REUSE | existing auth/session service boundary | Refresh/verify through existing auth architecture. |
| OPEN DECISION | REUSE/EXTEND | existing tenant datasource/service | Suitability for self-service entry/association is not established by org-admin operations. |
| OPEN DECISION | CREATE PURE DOMAIN LOGIC | E2 path/state/validation mapping | Only after product rules are accepted and no existing pure implementation fits. No I/O. |
| OUT OF SCOPE | DO NOT CREATE | import, claim, duplicate, provisioning, analytics, or error infrastructure | Requires separate accepted contracts/roadmap groups. |
| OUT OF SCOPE | DO NOT CALL | datasource/API directly from presentation | Violates Clean Architecture. |

## Repositories

| Classification | Decision | Asset | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE | `onboarding.repository.impl.ts` and `onboardingKeys` | Preserve centralized application/status queries and scoped invalidation. |
| CONFIRMED | REUSE | auth repository/session boundary | No direct auth datasource from new presentation behavior. |
| OPEN DECISION | REUSE/EXTEND | onboarding application repository | Extend only if an accepted backend contract fits its responsibility. |
| OPEN DECISION | REUSE/EXTEND | tenant repository and `tenantsKeys` | Org-admin tenant operations are not automatically valid E2 operations; ownership/authorization must be approved. |
| OUT OF SCOPE | DO NOT CREATE | duplicate E2/Bring Your Clinic repository | Prohibited unless approved contract proves existing repositories cannot fit. |
| OUT OF SCOPE | DO NOT REUSE | commercial, payment, clinical repositories | Outside E2. |

## APIs

| Classification | Decision | Existing operation | Boundary |
|---|---|---|---|
| CONFIRMED | REUSE | application detail/validation APIs | Read accepted application context through existing repository. |
| CONFIRMED | REUSE | onboarding status API | Used by TG18 after effective tenant; not clinic-entry authority. |
| CONFIRMED | REUSE | auth/session refresh API boundary | Reuse after authoritative tenant result. |
| OPEN DECISION | VERIFY, THEN REUSE/EXTEND | demo tenant creation | Existing behavior only; not approved as target new-clinic or Bring Your Clinic operation. |
| OPEN DECISION | VERIFY, THEN REUSE/EXTEND | organization tenant create/list/detail/current-tenant | Administrative contract may not satisfy self-service clinic entry, association, or selection. |
| OUT OF SCOPE | DO NOT CALL | submit/complete/demo-live/subscription/payment APIs from E2 path choice | Different responsibilities. |
| OUT OF SCOPE | DO NOT CREATE | Bring Your Clinic, association, duplicate, or provisioning API | No endpoint is authorized by these documents. |

## Theme and Icons

- **CONFIRMED — REUSE:** `useClinicTheme`, central colors, spacing,
  typography, radii, shadows, and existing icon system.
- **CONFIRMED — EXTEND:** Existing themed primitives may be minimally extended
  only where the approved E2 state cannot be represented compatibly.
- **OUT OF SCOPE — DO NOT CREATE:** E2-specific theme, tokens, hardcoded colors,
  spacing, typography, radii, or icon system.

## Localization

- **CONFIRMED — REUSE:** Existing `useTranslation` and
  `frontend/core/localization/translations/en-US.json` / `hi-IN.json`.
- **CONFIRMED — EXTEND:** Add matching namespaced keys only for approved paths,
  fields, validation, status, duplicate, recovery, and navigation copy.
- **OPEN DECISION:** Exact key catalog, approved wording, interpolation, and
  Hindi review owner depend on Product decisions.
- **OUT OF SCOPE — DO NOT REUSE:** Raw backend messages or hardcoded strings as
  user-visible copy.

## Navigation

- **CONFIRMED — REUSE:** Existing Expo Router, approved routes, back handling,
  and tenant-aware navigation.
- **CONFIRMED — REUSE:** Existing TG18 journey destination/host only after
  effective tenant resolution.
- **OPEN DECISION — EXTEND:** Exact new-clinic/Bring Your Clinic/back/cancel/
  retry/success destinations require accepted flow design.
- **OUT OF SCOPE — DO NOT CREATE:** Second navigator, raw untrusted route
  construction, or routes bypassing workspace/readiness/commercial gates.

## Accessibility

- **CONFIRMED — REUSE/EXTEND:** Existing accessibility patterns for role,
  label, state, focus, alert/live region, and minimum touch target.
- **CONFIRMED — EXTEND:** Approved choices/forms/errors require programmatic
  meaning, consequence, instructions, error association, focus movement, and
  non-color-only state.
- **OPEN DECISION:** Manual screen-reader/focus acceptance and exact state
  announcements depend on final UX.
- **OUT OF SCOPE — DO NOT CREATE:** Separate accessibility abstraction when
  existing React Native semantics suffice.

## Provisional Future Change Surface

- **OPEN DECISION** — No source file is currently authorized.
- **OPEN DECISION** — After product/backend/security approval, a new readiness
  review may authorize a subset of `ChoiceScreen.tsx`, approved reusable clinic
  identity/contact form boundaries, existing onboarding/tenant/auth repository
  and DTO boundaries, localization files, minimal TG18 handoff, and focused tests.
- **OUT OF SCOPE** — Backend, API, migration, dependency, Doctor Module, R7,
  clinical, commercial, and TG20+ changes remain unauthorized by this audit.

## Mandatory Principles

- **CONFIRMED — Central Theme:** reuse central design assets only.
- **CONFIRMED — Localization First:** bilingual keys before UI completion.
- **CONFIRMED — Accessibility:** preserve semantics, focus, state, and targets.
- **CONFIRMED — Clean Architecture:** preserve dependency direction.
- **CONFIRMED — Reuse-before-create:** decisions above are mandatory and
  duplicate implementations are prohibited.
- **CONFIRMED — Multi-clinic:** explicit scope and stale-state isolation.
- **CONFIRMED — Progressive Experience:** no Demo Mode target, clinical scope,
  or later-gate bypass.

## Audit Determination

- **CONFIRMED** — Existing assets are sufficient to establish candidate reuse
  boundaries.
- **OPEN DECISION** — Final REUSE/EXTEND choices for mutation/repository/API
  behavior cannot close before Bring Your Clinic and tenant/provisioning
  contracts are approved.

E2 Reuse Policy Status: **VERSION 1 APPROVED**

E2 Source-to-Contract Audit Status: **NOT READY FOR IMPLEMENTATION**
