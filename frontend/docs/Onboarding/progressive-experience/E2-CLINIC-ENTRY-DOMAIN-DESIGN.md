# E2 Clinic Entry Domain Design

Date: 2026-07-20

Status: Version 1 product architecture approved; technical integration remains open

## Version 1 Approved Architecture Register

This controlling register closes conflicting earlier `OPEN DECISION` statements.
Unlisted technical detail remains open and must not be inferred.

| Classification | Domain element | Version 1 design |
|---|---|---|
| CONFIRMED | `ClinicEntryPathId` | Stable, extensible identifiers for `new_clinic` and `bring_your_clinic`; future approved paths are additive. |
| CONFIRMED | `BringYourClinicIntent` | Connect an existing Nova-managed clinic to the caller's organization after successful ownership verification; caller is an authenticated Organization Owner or authorized Organization Admin. |
| CONFIRMED | `ClinicIdentityContact` | Extensible keyed field collection with a Version 1 required minimum set and optional initial set; unknown optional additions do not invalidate older consumers. |
| CONFIRMED | Required Minimum Set | Clinic Name, Clinic Address, Primary Contact Number, Verified Email or Mobile, Clinic Type / Specialty. |
| CONFIRMED | Optional Initial Set | GST, PAN, Logo, Website, Secondary Contact. |
| CONFIRMED | Workspace/Tenant ownership | Owns create, associate, select, normalized-identity duplicate prevention, authoritative result, and tenant truth. |
| CONFIRMED | Authentication ownership | Owns authenticated identity and session refresh. |
| CONFIRMED | Frontend ownership | Owns presentation, navigation, client validation presentation, accessibility, and localization; never tenant truth. |
| CONFIRMED | Effective tenant | One authorized clinic selects automatically; more than one requires explicit selection. Selection strategies are additive. |
| CONFIRMED | Idempotency | Create/associate commands are idempotent and replay returns the same authoritative result. |
| CONFIRMED | Security | Identity/contact is business-sensitive tenant metadata. Drafting is limited to an approved non-sensitive allowlist and is cleared on logout/switch. Verification/association is auditable. |

### Version 1 State-Machine Refinement

```text
CONFIRMED: ENTRY_CONTEXT_LOADING
  → CONFIRMED: PATH_SELECTION
  → CONFIRMED: NEW_CLINIC_INPUT | BRING_EXISTING_NOVA_CLINIC_VERIFICATION
  → CONFIRMED: AUTHORITATIVE_CREATE | AUTHORITATIVE_ASSOCIATE
  → CONFIRMED: SESSION_REFRESH
  → CONFIRMED: AUTO_SELECT_SINGLE | EXPLICIT_SELECT_MULTIPLE
  → CONFIRMED: EFFECTIVE_TENANT_RESOLVED
  → CONFIRMED: WORKSPACE_PREPARATION_HANDOFF
```

- **CONFIRMED** — Each authoritative command may expose pending, validation,
  failure, retry, and success presentation without transferring truth to the
  frontend.
- **CONFIRMED** — Paths, fields, match strategies, and tenant-selection
  strategies are discriminated/versioned extension points.
- **OPEN DECISION** — Exact backend states, DTOs, ownership-verification method,
  normalized identity algorithm, retryable error classes, and transition API
  remain unresolved.

## Classification Rule

- **CONFIRMED** — Directly supported by canonical evidence.
- **OPEN DECISION** — Required design input is absent; no implementation may
  infer it.
- **OUT OF SCOPE** — Explicitly excluded from E2/TG19.

## Design Objective

- **CONFIRMED** — E2 must separate product path choice, identity/contact input,
  tenant authority, effective-tenant handoff, and presentation.
- **CONFIRMED** — Frontend shall present and orchestrate accepted contracts; it
  shall not own provisioning, association, duplicate, or completion truth.
- **OPEN DECISION** — The complete domain cannot be finalized until Bring Your
  Clinic and tenant/provisioning ownership are approved.

## Domain Model

| Classification | Concept | Definition/boundary |
|---|---|---|
| CONFIRMED | `ClinicEntryContext` | Tenant-neutral context derived from the accepted application/account boundary before effective tenant resolution. |
| CONFIRMED | `ClinicEntryPathId` | Stable identifier for a product-approved path; confirmed concepts are new clinic and Bring Your Clinic, but identifiers are not approved. |
| CONFIRMED | `ClinicIdentityContact` | Specialty-extensible identity/contact data required for the accepted handoff. Exact fields are open. |
| CONFIRMED | `TenantId` | Authoritative tenant identity returned or selected through an accepted backend/session contract. |
| CONFIRMED | `EffectiveTenant` | The one explicit tenant context used by downstream queries, drafts, mutations, navigation, and TG18 projection. |
| CONFIRMED | `ClinicEntryResult` | Authoritative outcome needed before workspace-preparation handoff; frontend may not synthesize it. |
| OPEN DECISION | `BringYourClinicIntent` | Product semantics, eligibility, input, ownership proof, and result are undefined. |
| OPEN DECISION | `TenantAssociation` | Relationship between application/user/organization/clinic/tenant and proof of authorization is undefined. |
| OPEN DECISION | `DuplicateResolution` | Duplicate identity, authoritative match, safe response, and user choice are undefined. |
| OPEN DECISION | `ProvisioningStatus` | E2/TG20 ownership boundary and authoritative states are undefined. |
| OUT OF SCOPE | Clinical records/domain | E2 model contains no clinical data migration, scheduling, inventory, billing, or Doctor Module concepts. |

## State Machine

### Confirmed skeleton

```text
CONFIRMED: ENTRY_CONTEXT_LOADING
  → CONFIRMED: PATH_SELECTION
  → OPEN DECISION: PATH-SPECIFIC INPUT/VERIFICATION
  → OPEN DECISION: AUTHORITATIVE CREATE/ASSOCIATE/SELECT REQUEST
  → OPEN DECISION: AUTHORITATIVE RESULT + SESSION REFRESH
  → CONFIRMED: EFFECTIVE_TENANT_RESOLVED
  → CONFIRMED: WORKSPACE_PREPARATION_HANDOFF
```

- **CONFIRMED** — Loading, pending, validation failure, request failure, and
  retry presentation are required.
- **CONFIRMED** — No transition reaches `EFFECTIVE_TENANT_RESOLVED` from a route
  parameter, cached value, or optimistic frontend assumption alone.
- **CONFIRMED** — Tenant change invalidates or isolates prior tenant-derived TG18
  view state.
- **OPEN DECISION** — Path-specific substates, duplicate/conflict states,
  cancellation, resume, timeout, partial success, retry eligibility, and terminal
  failures require approved contracts.
- **OPEN DECISION** — Whether workspace preparation starts synchronously or is a
  separate authoritative TG20 state is unresolved.

## Ownership

| Classification | Owner | Responsibility |
|---|---|---|
| CONFIRMED | Product Architecture/Product | Approve supported paths, path meaning, non-goals, identity/contact intent, and journey handoff. |
| CONFIRMED | Backend/platform | Own authoritative tenant creation/association/selection/provisioning results, authorization, duplicates, and persisted truth. |
| CONFIRMED | Frontend onboarding | Present approved choices/forms/states; call repositories; refresh session; preserve tenant context; navigate only after authoritative success. |
| CONFIRMED | Auth/session boundary | Supply refreshed authenticated tenant identity through existing mechanisms. |
| CONFIRMED | TG18 | Consume effective tenant and status after clinic entry; never create or associate tenants. |
| OPEN DECISION | Specific backend service/team | Exact ownership of create, associate, select, duplicate, and provisioning transitions is not recorded. |
| OPEN DECISION | Security/Data owner | Classification, storage, audit, retention, and proof-of-ownership requirements are not recorded. |
| OUT OF SCOPE | Frontend presentation/store | It may not own tenant truth, provisioning truth, duplicate detection, or authorization. |

## Frontend Responsibilities

- **CONFIRMED** — Reuse central theme, localization, navigation, auth/session,
  application/onboarding repositories, form primitives, and TG18 handoff.
- **CONFIRMED** — Keep DTO/domain mapping and policy out of components.
- **CONFIRMED** — Keep React Query in repositories and transport in datasources.
- **CONFIRMED** — Expose explicit accessible loading, choice, field,
  validation, pending, failure, and retry states.
- **CONFIRMED** — Preserve tenant context across every query, mutation, draft,
  navigation, and handoff.
- **OPEN DECISION** — Exact orchestration hook/use-case and presentation files
  depend on accepted contracts and source-confirmed audit.
- **OUT OF SCOPE** — No frontend import engine, duplicate detector,
  authorization engine, provisioning state machine, or new API invention.

## Backend Responsibilities

- **CONFIRMED** — Authorize and persist accepted create/associate/select
  operations and return authoritative tenant identity/status.
- **CONFIRMED** — Prevent cross-tenant access and duplicate side effects.
- **CONFIRMED** — Support Req 11 tenant identity/session behavior and accepted
  idempotency semantics.
- **OPEN DECISION** — Existing API sufficiency, endpoint shape, DTOs, error
  taxonomy, duplicate semantics, ownership proof, provisioning states, and retry
  contract are unknown.
- **OUT OF SCOPE** — This design creates no endpoint, schema, service, or
  migration.

## Repository Boundaries

```text
CONFIRMED:
Presentation
  → presentation/application orchestration
  → existing repository hook or approved extension
  → existing datasource or separately approved backend contract
  → authoritative backend
```

- **CONFIRMED** — `ChoiceScreen` and `ClinicProfileScreen` shall not directly
  call Axios/API functions in new or refactored E2 behavior.
- **CONFIRMED** — Existing `onboardingKeys` and tenant/application repository
  boundaries shall be reused where contract-compatible.
- **CONFIRMED** — Existing auth refresh shall be reused; no second auth state.
- **OPEN DECISION** — Whether application, onboarding, tenant, or a separately
  approved repository owns each E2 operation requires contract verification.
- **OUT OF SCOPE** — A new repository/service is prohibited absent gap evidence
  and prior requirements/design approval.

## Navigation

- **CONFIRMED** — Reuse existing Expo Router/navigation primitives.
- **CONFIRMED** — Preserve application and effective-tenant context using typed,
  approved destinations.
- **CONFIRMED** — After authoritative tenant resolution, hand off toward
  workspace preparation and later TG18 journey consumption.
- **OPEN DECISION** — Exact entry, back, cancel, retry, duplicate-resolution,
  session-failure, and success destinations are undefined.
- **OUT OF SCOPE** — No second navigator, raw route construction from untrusted
  identifiers, or direct navigation past workspace/readiness/commercial gates.

## Validation Ownership

- **CONFIRMED** — Frontend may perform approved usability validation for
  immediate feedback.
- **CONFIRMED** — Backend remains authoritative for ownership, uniqueness,
  association, tenant creation, and persisted field validity.
- **CONFIRMED** — Client/server errors must map to localized accessible
  presentation without exposing sensitive raw details.
- **OPEN DECISION** — Canonical fields, normalization, validation rules,
  uniqueness keys, ownership proof, and cross-field rules are undefined.
- **OUT OF SCOPE** — No clinical validation or specialty-specific policy.

## Effective-Tenant Handoff

- **CONFIRMED** — Downstream operations begin only with an authoritative tenant
  identity and refreshed/consistent session context.
- **CONFIRMED** — `useJourneyFoundation` and tenant-scoped onboarding status are
  reused after handoff.
- **CONFIRMED** — A mismatched tenant/status payload must remain suppressed by
  the TG18 tenant guard.
- **OPEN DECISION** — Multi-clinic selection source, refresh ordering, cache
  invalidation/cancellation, and fallback-removal gate require approval.

## Extension Points

- **CONFIRMED** — Stable path identifiers may permit future product-approved
  paths without changing the core orchestration contract.
- **CONFIRMED** — Identity/contact fields must remain specialty-extensible.
- **CONFIRMED** — Repository interfaces may support later authoritative status
  evolution when separately approved.
- **OPEN DECISION** — No specific extension payload or API version is approved.
- **OUT OF SCOPE** — Extension points do not authorize TG20+, clinical,
  migration/import, commercial, or payment capabilities.

## Cross-Cutting Principles

- **CONFIRMED — Central Theme:** central tokens and existing primitives only.
- **CONFIRMED — Localization First:** English/Hindi parity, no hardcoded copy.
- **CONFIRMED — Accessibility:** semantic choices/forms/states, focus, errors,
  touch targets, and non-color meaning.
- **CONFIRMED — Clean Architecture:** preserve layer/dependency rules.
- **CONFIRMED — Reuse-before-create:** no duplicate hooks/stores/services/
  repositories/APIs/navigation/components.
- **CONFIRMED — Multi-clinic:** tenant isolation and stale-state suppression.
- **CONFIRMED — Progressive Experience:** target journey excludes Demo Mode and
  frontend-owned workspace/readiness/commercial truth.

## Design Blockers

- **OPEN DECISION** — Bring Your Clinic product contract.
- **OPEN DECISION** — Tenant creation/association/selection/provisioning owner
  and contract.
- **OPEN DECISION** — Identity/contact field and validation contract.
- **OPEN DECISION** — Duplicate/idempotency and failure/retry contract.
- **OPEN DECISION** — Security/data classification.
- **OPEN DECISION** — Exact repository/API fit, file boundary, and tests.

Epic 2 Product Architecture Status: **VERSION 1 APPROVED**

Epic 2 Technical Integration Status: **NOT READY**
