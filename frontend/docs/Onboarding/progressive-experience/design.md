# Design Document — Onboarding Production Hardening

## Overview

This document describes the technical design for hardening the NovaClinics Pro onboarding wizard for initial production release. This revision reflects a **release-now, harden-later** approach: only the 7 absolute release blockers are in scope. All other hardening work (draft persistence, offline resilience, conflict resolution, analytics, etc.) is deferred to post-release sprints and documented here for completeness.

### Documentation Ownership

Canonical Progressive Experience documentation lives in:

```text
frontend/docs/Onboarding/progressive-experience/
```

The `.kiro` directory is an agent/spec workspace only:

```text
frontend/.kiro/specs/onboarding-production-hardening/
```

Accepted architecture and planning documents must be version-controlled in the canonical path and traceable to commits. The `.kiro` copy must not become an independently editable source of truth.

### Phase Terminology

Use `Progressive Experience Phase 0`, `Progressive Experience Phase 1`, `Progressive Experience Phase 2`, and so on for all future work.

Historical mapping:

```text
Legacy "Sprint 1" = Progressive Experience production-hardening checkpoint
Legacy "release gate" = Progressive Experience production-hardening checkpoint
```

### Progressive Experience Production-Hardening Checkpoint Scope (9 Items: 7 Engineering Changes + 2 Verification Tasks)

| # | Item | Requirement |
|---|---|---|
| 1 | Shared `SERVICE_CATALOGUE_ALIASES` constant | Req 1–2 |
| 2 | `StepDetailScreen` alias routing fix | Req 1 |
| 3 | `SetupWizardFlow` alias routing fix | Req 2 |
| 4 | Delete `TreatmentsAndTherapiesScreen.tsx` | Req 3 |
| 5 | Submit → `await refetch()` → advance ordering | Req 26 AC-8 |
| 6 | `isPending` lock on CTA + spinner | Req 26 AC-1–5 |
| 7 | `invalidateQueries` after step submit | Req 27 AC-1 |
| 8 | Android `BackHandler` intercept | Req 10 |
| 9 | Tenant resolution + backend idempotency verification | Req 11, Req 12 AC-6 |

### Deferred to Post-Release

WizardDraftStore · AsyncStorage persistence · lz-string · OfflineBanner · NetInfo · PendingMutationStore · Axios retry interceptor · Conflict resolution modal · Multi-device sync · Draft expiry · Analytics · Error centralisation · Payment recovery · Accessibility enhancements · Tenant cleanup logic · AppState lifecycle handling

**Key codebase facts:**
- The active wizard path is `SetupWizardFlow.tsx`. `SetupWizardScreen.tsx` is a redirect shim and `StepDetailScreen.tsx` is a legacy alternate flow.
- Step screens register save handlers via `onRegisterSaveHandler` prop; external steps (staff, rooms) have no save handler.
- Auth store pattern: `create<State>((set, get) => ({...}))`, async actions catch internally, selector hooks exported separately.

---

## Components and Interfaces

### Progressive Experience Production-Hardening Checkpoint Components

**`stepAliases.ts`** — shared constant array extracted from `SetupWizardFlow` and `StepDetailScreen` so both screens use the identical alias list.

```typescript
// frontend/features/onboarding/constants/stepAliases.ts
export const SERVICE_CATALOGUE_ALIASES = [
  'treatments_and_therapies',
  'services_and_specialities',
  'services',
  'services_offered',
  'treatment_services',
] as const;
export type ServiceCatalogueAlias = typeof SERVICE_CATALOGUE_ALIASES[number];
```

**`SetupWizardFlow.tsx` (modified)** — adds: alias routing via `SERVICE_CATALOGUE_ALIASES`, submission lock state, `submissionId` ref, `await refetch()` before step advance, Android `BackHandler`.

**`StepDetailScreen.tsx` (modified)** — adds: service-catalogue aliases to `redirectSteps` map.

### Deferred Components (Post-Release)

`wizard-draft.store.ts` · `pending-mutations.store.ts` · `OfflineBanner.tsx` · `DraftConflictModal.tsx`

---

## Data Models

### Tier 1 Data Changes

No data model changes are required for the Progressive Experience production-hardening checkpoint. The `updated_at` / `updatedAtMs` DTO additions are deferred to the post-release conflict resolution phase (see deferred section 1.4 above).

### Deferred Data Models (Post-Release)

`DraftEntry`, `PendingMutation`, `DraftPayload`, and related types are deferred to the post-release hardening sprint.

---

## Architecture

### Layer Map (Clean Architecture)

```
Presentation Layer
  ├── pages/
  │   ├── SetupWizardFlow.tsx          ← orchestrator, modified heavily
  │   └── StepDetailScreen.tsx         ← modified (alias routing)
  ├── components/
  │   ├── OfflineBanner.tsx            ← NEW (deferred)
  │   └── DraftConflictModal.tsx       ← NEW (deferred)
  └── stores/
      ├── wizard-draft.store.ts        ← NEW (deferred)
      └── pending-mutations.store.ts   ← NEW (deferred)

Data Layer
  ├── datasources/
  │   └── onboarding.api.ts            ← modified (idempotency keys, X-Tenant-ID removal)
  └── repositories/
      └── onboarding.repository.impl.ts ← modified (query invalidation, new mutations)

Domain Layer
  └── models/
      └── onboarding.dtos.ts           ← NO checkpoint changes; updated_at / updatedAtMs deferred to post-release conflict resolution phase

Core Layer
  ├── api/
  │   └── axiosClient.ts               ← modified (retry interceptor, deferred)
  └── analytics/
      └── analytics.ts                 ← NEW stub (deferred)
```

### Dependency Rules (Req 22, 23)

| Layer | Can import | Cannot import |
|---|---|---|
| Stores | Nothing outside core utils | React hooks, React Query, Axios |
| Service functions (`datasources/`) | axiosClient, DTOs | React hooks, Zustand |
| Repository hooks (`repositories/`) | Service functions, React Query | Zustand stores directly |
| Presentation hooks (`presentation/hooks/`) | Repository hooks, Zustand stores | Service functions directly |
| Components / pages | Presentation hooks, Zustand selectors | APIs directly |

### E4 Capability-Driven Journey Visibility Constitutional Contract (Req 33)

#### Ownership

| Concern | Authoritative owner | Prohibited owner |
|---|---|---|
| Ordered journey steps and stable step identity | Journey Template | Frontend presentation or capability registry |
| Capability definitions and lifecycle | Capability Registry | Journey Template or frontend |
| Step-to-capability mapping and tenant visibility | Backend Journey Visibility Projection | Frontend hooks, components, stores, or route configuration |
| Projection rendering | Frontend onboarding repository/domain/presentation flow | Backend presentation policy |

The Backend Journey Visibility Projection is the only composition boundary. It
consumes an authoritative ordered Journey Template and authoritative
tenant-scoped capability state. It produces one complete ordered projection;
the frontend never intersects template steps with capability state itself.

#### Projection identity and validity

```text
JourneyVisibilityProjectionIdentity =
  (template_version, capability_revision)
```

- Both values are backend-authoritative.
- A projection is valid only while both values match current authority.
- A change to either value invalidates the prior identity and triggers backend
  recalculation before a replacement projection is served.
- Identical tenant input and identical identity must produce deterministic
  visibility and ordering.
- Revision validation, DTO generation, typed errors, transaction ownership, and
  rollback remain backend responsibilities.

#### Fail-closed capability policy

For a step whose required capability is unknown, unavailable, disabled,
unsupported, or missing, the Backend Journey Visibility Projection excludes the
step. The backend does not delegate this decision, and the frontend does not
restore, infer, or substitute visibility. Unknown step codes continue through
the existing Journey diagnostics/safe-state boundary; they never authorize an
action by fallback.

#### Active-onboarding lifecycle

```text
Current complete projection
  └─ template_version or capability_revision changes
       └─ backend detects identity mismatch
            └─ backend recalculates complete replacement projection
                 ├─ same stable step identity → preserve valid progress
                 ├─ removed step → retire from the new projection
                 └─ newly applicable step → introduce as incomplete
```

An active session continues against its current complete projection until the
backend supplies the recalculated complete projection. The frontend must not
compose a partial projection or migrate progress/drafts. Draft payloads remain
tenant/user scoped under the existing Wizard Draft contract and are not
rewritten by the frontend. Projection and completed-progress transition remain
backend-owned and step-identity based.

#### Frontend boundary

The existing onboarding datasource and repository receive the authoritative
projection. The journey domain maps the returned ordered steps into existing
Journey Card models, and presentation renders loading, error, empty, changed,
and available states using localization, accessibility, and central Theme
contracts. No frontend capability mapping, clinic-type branching, new global
store, duplicate API client, or presentation-layer capability policy is
permitted.

#### Acceptance invariants

1. Visibility originates only from the backend projection.
2. Projection output is deterministic for an identical identity and tenant.
3. Template or capability revision changes trigger backend recalculation.
4. Unknown or non-effective capabilities fail closed.
5. Reordered or removed steps preserve progress only through stable identity.
6. Frontend source contains no step-to-capability mapping logic.
7. Tenant isolation applies to projection identity, steps, progress, caches,
   errors, and rendering.
8. Tests cover version changes, capability changes, fail-closed states,
   progress preservation, and tenant switching/isolation.

---

### E5 Ready-to-Start Constitutional Contract (Req 34)

#### Source audit and reuse decision

| Required capability | Current evidence | Classification | E5 decision |
|---|---|---|---|
| Readiness provider interface | No shared provider port exists. `OnboardingProgressService.compute_all_steps_status` owns setup validation and TG20 owns workspace state separately. | `MISSING` | Add a narrow E5 provider result port; adapters call existing domain owners and do not move their rules. |
| Readiness aggregate | `is_ready_to_go_live` is a derived onboarding-status boolean and is not versioned or provider-complete. | `MISSING` | Add an immutable, tenant-scoped Ready-to-Start aggregate/read model in the backend domain/application boundary. |
| Checklist model | `GoLiveScreen` builds positional checklist rows locally from wizard steps. | `EXTEND` | Replace local derivation with the E5 authoritative checklist DTO/domain model; reuse presentation primitives only. |
| Blocker model | Onboarding validation exposes issues, dependency reasons, visibility, and actionable state; no cross-provider safe blocker model exists. | `EXTEND` | Adapt safe existing evidence into E5 items; do not expose raw validation/provider data. |
| Next-action model | Onboarding status has `next_recommended_step`/`action_url_template`; TG20 has workspace-specific `NextAction`; TG17 routes known wizard steps. | `EXTEND` | Define bounded E5 action descriptors pointing only to existing owners/routes. Do not generalize TG20 actions or create an execution engine. |
| Ready-to-Start service | `GoLiveService` activates tenants and `OnboardingService` derives legacy completion; neither is a read-only multi-provider E5 composition. | `MISSING` | Add a read-only Ready-to-Start application composition. Do not change or call activation as evaluation. |
| Backend endpoint | Existing onboarding status/complete transports do not return a versioned provider aggregate. | `MISSING` | Later transport checkpoint adds one read-only Version 1 endpoint using existing DI/auth patterns. |
| Frontend domain model | Onboarding status and Journey models exist; no E5 identity/state/checklist domain exists. | `MISSING` | Later frontend domain checkpoint adds immutable mapping without readiness calculation. |
| Existing resolution routes | TG17/SetupWizard routes known wizard steps and TG20 owns refresh/retry. No generic support route was proven. | `REUSE` | Allowlist only audited existing owners. Missing or stale owner, including support without an approved route, means no action. |
| Tenant-scoped readiness query | Existing onboarding React Query keys are tenant scoped; no E5 query exists. | `EXTEND` | Add an organization+tenant+contract keyed query and outgoing-tenant cleanup through existing repository infrastructure. |
| Readiness permission | TG21 read projection uses existing `tenant.read`; Effective Tenant and organization association checks already exist. | `REUSE` | Reuse the same context, active association, tenant user, and `tenant.read` checks; no admin bypass or new permission. |

The legacy `GoLiveService` is activation authority, not readiness authority. E5
must not treat its mutable precondition helper, frontend route visitation, or
the legacy `is_ready_to_go_live` boolean as the new constitutional aggregate.

#### Authority and provider composition

```text
Authenticated user
  -> Effective Organization + Effective Tenant + active association + tenant.read
  -> ReadyToStartReadiness composition (read only)
       -> TG21 Journey Visibility (applicable ordered setup steps)
       -> Onboarding Progress/Validation (setup evidence)
       -> TG20 Workspace Preparation (workspace evidence)
  -> one complete immutable E5 aggregate
  -> repository/domain mapping
  -> presentation only
```

The backend application composition is the sole aggregate authority. Provider
rules remain owned by their domains. Version 1 provider IDs are
`journey_setup_progress` and `workspace_preparation`. The first consumes the
TG21 projection and existing onboarding validation for only projected steps;
the second translates TG20 state without redefining it. Commercial readiness,
trial activation, subscription, billing, payment, clinical readiness, and
inventory policy are not E5 providers.

A provider result is immutable and contains: `provider_id`, `provider_version`,
`applicable`, `evidence_revision`, `observed_at`, `outcome`, `severity`, safe
explanation token, and optional next action. Provider failures are returned to
the composition as typed failures, never as provider-authored raw text.

#### Provider-specific Version 1 mapping

`journey_setup_progress` intersects the current TG21 projected step IDs with
`OnboardingProgressService.compute_all_steps_status`. Template
`setupsteps[].optional` is authoritative (`false`/absent required, `true`
optional); Version 1 has no informational value. Projection order is retained.

| Authoritative setup evidence | Checklist status | Classification | Aggregate effect | Item identity | Action |
|---|---|---|---|---|---|
| Required, complete, valid | `COMPLETE` | none | none | `journey_setup_progress.step.<step_code>` | none |
| Required, incomplete or dependency-blocked | `BLOCKED` | `BLOCKER` | `NOT_READY` | same step ID | `readiness.navigate_setup_step` when the projected step has an audited setup route |
| Optional, complete, valid | `COMPLETE` | none | none | same step ID | none |
| Optional, incomplete | `ADVISORY` | `ADVISORY` | may coexist with `READY` | same step ID | setup navigation when audited |
| Validation `blocker` | `BLOCKED` | `BLOCKER` | `NOT_READY` | `journey_setup_progress.validation.<step_code>.<error_key>` | setup navigation when audited |
| Validation `warning` | `ADVISORY` | `ADVISORY` | may coexist with `READY` | same validation pattern | setup navigation when audited |
| Hidden/non-projected or retired | omitted | none | none | none | none |
| Unknown severity, malformed/missing `error_key`, unavailable evidence | no unsafe partial item | none | typed provider/configuration failure | none | none |
| TG21 identity mismatch | `STALE` | `BLOCKER` | `STALE` | `journey_setup_progress.system.stale` | none |

Computed setup outcomes use evaluation time as `evidence_timestamp`. The setup
evidence revision hashes projection identity plus ordered step code/order,
required/optional value, progress/status, validation severity, and validated
`error_key`; it excludes evaluation time and raw validation values.

`workspace_preparation` calls only `GetWorkspacePreparationQueryService` and
emits one item. It never ensures, starts, retries, claims, or expands TG20 units.

| TG20 source result | Provider state | Item status / class | Aggregate effect | Action |
|---|---|---|---|---|
| `PENDING` | `NOT_READY` | `BLOCKED` / `BLOCKER` | blocks | navigate to fixed workspace-preparation screen; that owner retains start authorization |
| `PREPARING` | `EVALUATING` | `EVALUATING` / `BLOCKER` | fail closed | refresh readiness only |
| `PERSONALIZATION_AVAILABLE` | `READY` | `COMPLETE` / none | ready if the other provider permits | none |
| `RETRYABLE_FAILURE`, retry allowed | `NOT_READY` | `BLOCKED` / `BLOCKER` | blocks | delegate `RETRY` to TG20 |
| `TERMINAL_FAILURE`, including retry exhaustion | `NOT_READY` | `BLOCKED` / `BLOCKER` | blocks | none; no proven support owner |
| Not found/no run | `NOT_READY` | `BLOCKED` / `BLOCKER` | blocks | workspace navigation/start handoff |
| Unsupported/unknown contract or state | `UNKNOWN` | `UNKNOWN` / `BLOCKER` | fail closed | none |
| Stale run/evidence | `STALE` | `STALE` / `BLOCKER` | fail closed | none |
| Query/provider unavailable | typed `readiness.provider_unavailable` | no partial item | no aggregate | none |

The normal workspace ID is always `workspace_preparation.workspace`; exception
IDs use `workspace_preparation.system.missing|unknown|stale|unavailable`.
`updated_at` is the evidence timestamp. The provider evidence revision hashes
contract/run/aggregate version, state, safe progress counters, retry booleans
and counters, safe reason classification, next-action enum, and ordered unit
codes/evidence versions. It excludes timestamps, correlation IDs, raw reasons,
and evidence payloads.

#### Aggregate precedence and checklist vocabulary

After validating the complete provider set, scope, versions, and TG21 identity,
the reducer uses `STALE > UNAVAILABLE > UNKNOWN > EVALUATING > NOT_READY >
READY`. Both Version 1 providers are required/applicable. A false or unknown
applicability result fails closed; it is not silently skipped. Provider
exceptions/missing providers return a typed application failure with no partial
aggregate. Identical duplicate items collapse; conflicting duplicates produce
`UNAVAILABLE`.

| Item status | Classification | Meaning |
|---|---|---|
| `COMPLETE` | none | Current evidence is satisfied. |
| `ADVISORY` | `ADVISORY` | Optional improvement; never independently blocks. |
| `BLOCKED` | `BLOCKER` | Complete evaluation found unresolved required work. |
| `EVALUATING` | `BLOCKER` | Current evaluation cannot make a readiness claim. |
| `UNKNOWN` | `BLOCKER` | Applicability/evidence cannot be determined. |
| `UNAVAILABLE` | `BLOCKER` | Required evidence cannot be obtained. |
| `STALE` | `BLOCKER` | Evidence identity is no longer current. |

#### Bounded action and localization allowlists

| Action ID | Kind | Owner | Opaque target | Permission | Presence |
|---|---|---|---|---|---|
| `readiness.navigate_setup_step` | `NAVIGATE` | `setup_wizard` | `setup_step.<step_code>` from the current projection/TG17 alias resolver | `tenant.read` | Incomplete/advisory/validation setup item with an audited route |
| `readiness.refresh` | `REFRESH` | `ready_to_start` | none | `tenant.read` | `PREPARING`/explicit refresh; reruns read-only composition |
| `readiness.open_workspace_preparation` | `NAVIGATE` | `workspace_preparation` | `onboarding.workspace_preparation` | `tenant.read` | `PENDING` or missing run |
| `readiness.retry_workspace_preparation` | `RETRY` | `workspace_preparation` | `workspace_preparation.retry` | `onboarding.workspace_preparation.manage` | TG20 says retry is allowed |

Every descriptor is tenant-bound and revalidates Effective Tenant immediately
before delegation. Unknown owner/kind/target, arbitrary URL, and stale source
identity are rejected as provider configuration/stale failures. The existing
source proves no dedicated support route owner, so Version 1 emits no
`CONTACT_SUPPORT` descriptor.

Tokens use
`onboarding.progressive_experience.ready_to_start.providers.<provider>` with
step-code, validated `error_key`, or approved workspace state/failure suffixes.
Version 1 has no interpolation. Both locales must contain every token; a missing
token uses the generic localized unavailable token, exposes no action, and fails
acceptance. No raw reason, exception, database/capability/provider jargon, or
token key is user-visible.

#### Aggregate, checklist, and ordering

`ReadyToStartState` is exactly `READY | NOT_READY | EVALUATING | UNKNOWN |
UNAVAILABLE | STALE`. Only a complete current provider set with no blocker may
be `READY`. Advisories may coexist with `READY`; every other non-ready state is
fail closed. No override exists in Version 1.

Checklist items contain stable ID, title/explanation tokens, item status,
classification, evidence timestamp, source provider, bounded next action,
order, applicability, and version. Items are deduplicated by
`(provider_id, item_id)` and sorted by classification (blocker first), provider
order (`journey_setup_progress`, then `workspace_preparation`), provider item
order, and stable ID. Duplicate conflicting values make the aggregate
`UNAVAILABLE`; identical duplicates collapse deterministically.

The composition returns an explicit empty checklist only when the complete
current provider set proves that no checklist item applies. Empty or partial
provider input never implies readiness.

#### Bounded next actions

Version 1 action kinds are `NAVIGATE`, `REFRESH`, `RETRY`, and
`CONTACT_SUPPORT`. Each descriptor has a stable action ID, localization token,
owner ID, kind, opaque allowlisted target ID (when applicable), authorization
requirement, and source identity. Navigation may target only existing audited
wizard routes. Refresh re-runs E5 evaluation. Retry delegates to an existing
domain retry owner such as TG20 and does not execute inside E5. A missing,
unauthorized, or stale owner produces no enabled action. Every action requires
effective-tenant revalidation immediately before delegation.

#### Refresh, identity, and consistency

Evaluation is request-driven on initial query, explicit refresh, return from a
resolution owner, foreground, and effective-tenant change. Providers may be
called independently, but the application publishes only after every required
provider completes against the same resolved organization/tenant and source
identities. Partial failure yields `UNAVAILABLE`; unknown applicability yields
`UNKNOWN`; revision mismatch yields `STALE`. Version 1 adds no worker or E5
provider cache.

```text
ReadyToStartIdentity =
  (readiness_contract_version,
   tenant_id,
   journey_template_version,
   journey_capability_revision,
   provider_set_revision,
   evidence_revision)
```

E5 owns `readiness_contract_version` and deterministic
`provider_set_revision`; TG21 owns template/capability identity; the composition
derives `evidence_revision` deterministically from ordered provider IDs,
versions, evidence revisions, and observed evidence identity—not from response
time. Any member change requires recalculation. Frontend caches are scoped by
organization, tenant, and contract, reject identity regression, and are
cancelled/removed on tenant switch or logout.

#### Errors, security, localization, and accessibility

Typed errors are: `readiness.organization_unavailable`,
`readiness.effective_tenant_unavailable`, `readiness.forbidden`,
`readiness.provider_unavailable`, `readiness.unsupported_contract`,
`readiness.stale`, `readiness.provider_configuration`, and
`readiness.evaluation_failure`. Transport maps them to safe tokens and retry
eligibility; raw exceptions and evidence never leave the backend.

E5 reuses authenticated organization context, active organization-tenant
association, active tenant user, and `tenant.read`. It never trusts a client
readiness flag, provider result, organization/tenant relationship, or
`is_org_admin` bypass. The read path performs no audit write; later delegated
mutations retain their owner service's authorization, transaction, idempotency,
and audit obligations.

All visible text is tokenized with `en-US`/`hi-IN` key and placeholder parity.
Presentation uses plain clinic language, central Theme, existing cards/loading/
error primitives, busy and live-region semantics, programmatic blocker and
advisory labels, ordered focus, disabled state, non-color meaning, compliant
touch targets, font scaling, and layouts tolerant of longer Hindi content.

#### Acceptance and rollback

Backend tests must cover deterministic ordering/revisions, complete and empty
provider sets, every aggregate state, blocker/advisory coexistence,
deduplication/conflict, provider failure, stale identity, authorization,
organization/tenant isolation, and safe errors. Transport tests must cover the
Version 1 schema and leakage. Frontend tests must cover immutable mapping,
tenant-scoped caching and cleanup, stale rejection, all UX states, approved
actions only, localization parity, accessibility, and multi-clinic switching.
TG18–TG21 regressions remain mandatory.

Provider-specific backend acceptance additionally covers required/optional and
completed setup steps, both actual validation severities, hidden/retired steps,
stale TG21 identity, every TG20 state plus missing/unsupported/stale/query
failure, retry allowed/exhausted, the full aggregate precedence order,
identical/conflicting duplicates, stable IDs/revisions, tenant/organization
isolation, action allowlist rejection, arbitrary-target rejection, and absence
of raw evidence/errors. Later transport/frontend acceptance covers locale-token
parity and safe generic fallback without changing provider policy.

Rollback removes the E5 query/surface and returns to the prior read-only Journey
experience. It must not change provider data, TG20/TG21 identities, progress,
drafts, activation, trial, subscription, or payment state. No migration is
authorized by this constitutional contract.

---

### E6 Draft Conflict and Multi-Clinic Recovery Constitutional Contract

#### Domain ownership

The E6 domain distinguishes two truths: backend-authoritative step state and a
device-local, non-authoritative draft. Conflict is a guarded recovery condition,
not a merge algorithm. Its identity is scoped by authenticated user,
organization, effective tenant, Journey Visibility identity, and stable step
code. The backend-issued opaque step revision is the concurrency authority;
`updated_at` is UTC freshness evidence for explanation and audit.

The conceptual lifecycle is: current state and local draft are loaded in the
same validated scope; divergence is either absent, ineligible for choice, a
recoverable editable conflict, or unavailable evidence; an explicit choice is
made when allowed; the scope is revalidated; then recovery resolves or remains
safely blocked. No lifecycle state authorizes a stale write.

#### Backend ownership

The backend owns the current per-step revision and timestamp, atomic association
of revision with step state/completion and Journey Visibility identity,
authorization, stale-write rejection, and typed recovery failures. Every visible
step, including `not_started`, must carry authoritative evidence. The existing
onboarding progress persistence remains the authoritative state owner; E6 must
not introduce a second writer or let a transport/router decide conflict policy.

The backend validates the effective organization/tenant and current revision at
the mutation boundary. Unknown versions, missing evidence, projection mismatch,
and stale or cross-scope revisions fail closed without partial state mutation.

#### Frontend ownership

The existing Wizard Draft boundary owns local draft data and local save time.
The onboarding repository/query boundary owns fresh server evidence. A
presentation hook may orchestrate the two, but presentation components must not
fetch directly, invent revisions, infer tenant authority, or contain conflict
business rules.

The frontend owns accessible/localized conflict and unavailable-recovery
presentation, explicit Use Latest/Keep Local intent, refresh and submission
revalidation, completed/retired/hidden draft cleanup, stale-response rejection,
and cleanup during effective-tenant switch/logout. Keep Local preserves editing
only; it is not permission to overwrite.

#### Persistence and synchronization ownership

Backend persistence owns authoritative per-step state, opaque revision, and UTC
timestamp. Frontend persistence owns only user/organization/effective-tenant/
projection/step-scoped local drafts and their device-local timestamps. Neither
store may copy responsibility from the other, and audit records contain safe
identifiers/outcomes only, never draft content.

E6 is request-driven. Devices converge by reading and conditionally mutating the
backend authority; they do not synchronize local drafts peer-to-peer and E6 does
not establish a general synchronization platform. On tenant switch, outgoing
queries and in-flight responses are invalidated before the new scope loads.

#### User-visible recovery contract

Editable divergence presents Use Latest and Keep Local with complete
consequences. Ineligible server states remove the stale draft from active use.
Unavailable or invalid authority preserves the draft, disables submission, and
offers safe refresh/retry. The dialog owns initial focus, focus containment and
return, screen-reader role/labels, disabled/loading semantics, minimum touch
targets, font scaling, and English/Hindi parity through existing Theme,
localization, and accessibility systems.

#### Acceptance boundary

Constitutional acceptance requires source-backed proof for atomic revision/state
changes, stale-write rejection, missing/unknown evidence, Use Latest, Keep Local
plus revalidation, completed/retired/hidden cleanup, two-device propagation,
effective-tenant switching, organization/tenant isolation, stale-response
rejection, safe audit/error behavior, localization, accessibility, and rollback.
Implementation remains unauthorized until a separately approved task boundary
identifies files, migration/API impact if any, checkpoints, tests, rollback, and
stop conditions.

### E7 Offline Mutation Recovery Constitutional Design

#### Domain and lifecycle ownership

E7 owns a non-authoritative, tenant-scoped intent lifecycle for the single
Version 1 operation `onboarding.step.submit.v1`. The frontend E7 application
coordinator is the only durable retry authority. The backend onboarding
mutation owner remains authoritative for whether an execution is accepted.

```text
eligible user attempt
  → PENDING
  → REPLAYING
  → SUCCEEDED (remove)
  | CONFLICT_BLOCKED (delegate to E6)
  | MANUAL_ACTION_REQUIRED
  | EXPIRED
  → DISCARDED (explicit confirmation)
```

Known-offline UI remains gated. Enqueue occurs only when an attempt started
online or with indeterminate connectivity and subsequently failed transiently.
One effective tenant executes FIFO with one active claim. Restart, reconnect,
and foreground are competing triggers for the same coordinator and lock, not
separate replay engines.

#### Operation registry and payload boundary

The E7 domain owns a closed Version 1 operation registry. Its sole descriptor
binds stable operation ID, step code, safe per-step payload validator, existing
datasource/repository execution owner, E6 evidence requirements, and result/
error mapper. Unknown operations, URLs, methods, headers, steps, or fields fail
closed.

Only allowlisted onboarding-configuration JSON may be persisted. Credentials,
tokens, contact values, verification evidence, payment/banking values,
clinical/patient data, files, raw errors, and unrestricted payloads are rejected
before storage. Excluded operation families cannot opt into E7 by configuration;
they require a later constitutional revision.

#### Frontend ownership

The existing onboarding presentation hook initiates user intent. An E7
application coordinator owns eligibility, enqueue, claim, fresh-context
validation, replay, lifecycle transitions, query invalidation, and safe
telemetry. A synchronous Zustand store owns only lifecycle state mutations;
standalone persistence functions own serialization, schema migration, storage,
and corruption handling. React Query continues to own server cache.

The existing onboarding datasource and repository execute the approved request.
The queue does not call Axios from presentation, store React Query hooks, build
URLs, or create another query-key family. Axios performs no independent retry
for a persisted attempt.

Tenant switch cancels execution and removes outgoing memory/cache before the new
scope loads; durable records remain inaccessible under their original composite
scope. Logout/account removal deletes the authenticated user's queue.
Authorization loss blocks replay and surfaces manual recovery.

#### Backend ownership

The existing onboarding step endpoint/service owns fresh Effective Tenant,
organization membership, permission, current Journey-visible step, E6 revision,
idempotency, transaction, audit, typed failure, and accepted result. Replay uses
the existing endpoint and the original idempotency key; no new endpoint,
background replay worker, transaction owner, idempotency service, or alternate
tenant authority is authorized.

The backend never trusts queue state, attempt count, payload eligibility,
frontend authorization, or captured revision as current. E6 stale/missing/
projection conflict remains a typed blocked result with no partial mutation.

#### Persistence, retry, and dead-letter ownership

The Version 1 record is exactly the field set approved in the E7 requirements.
It is schema-versioned, scoped by user/organization/effective tenant, expires
after seven days, and retains acknowledged terminal evidence for no more than
30 days. Pure additive migrations are required for recognized schemas; unknown,
corrupt, cross-scope, or prohibited records never replay.

Retry classification occurs once in the E7 application coordinator after the
existing repository normalizes the typed transport result. The original attempt
plus three replays use 2/4/8-second confirmed-online backoff. Offline waiting and
local cancellation do not consume attempts. Retryable transport/5xx outcomes
remain pending; validation, authorization, unsupported/malformed,
idempotency-conflict, and other terminal outcomes require manual action.

`CONFLICT_BLOCKED` delegates to the existing E6 refresh/Use Latest/Keep Local
owner. Manual recovery may refresh, edit through the owning step, retry after
fresh validation, discard with confirmation, or use an existing support route.
There is no infinite retry, silent deletion, field merge, or cross-tenant
transfer.

#### Telemetry and presentation ownership

An onboarding application telemetry port emits the approved safe lifecycle
events without blocking mutation flow; an existing provider may implement it
and a safe no-op adapter is valid when none is configured. Payloads, evidence,
secrets, contact/clinical/payment data, and raw exceptions never enter events.

Presentation consumes domain state and owns only localized explanation and
bounded user intent. It uses `en-US`/`hi-IN` parity, central Theme, existing
loading/error primitives, live regions, focus management, disabled/busy state,
non-color meaning, touch targets, font scaling, and guarded hardware-back
behavior.

#### Compatibility, rollback, and acceptance

Rollout first verifies existing backend typed failures and idempotency, then
enables the additive frontend schema and operation registry. Feature disablement
stops enqueue/replay but does not execute or transfer retained intents.
Rollback returns to existing offline gating; a later compatible version may
resume only records it validates. Unknown/legacy records fail closed.

Acceptance must prove the complete lifecycle, operation and payload deny lists,
single retry ownership, deterministic FIFO/locking, concurrent triggers,
restart/reconnect/foreground, expiry/corruption/migration, idempotency, E6
conflict delegation, tenant/organization/user isolation, authorization loss,
manual recovery, telemetry leakage safety, localization/accessibility/Theme,
rollback, and TG18–TG23 regressions. Requirement 32 staging/device evidence is a
release gate.

### Progressive Experience Epic Design Coverage Index

This index reconciles design ownership without duplicating or redesigning the
accepted contracts. A roadmap entry is not implementation design by itself.

| Epic | Design authority | Current coverage |
|---|---|---|
| E1 Journey Foundation and Cards | `E1-JOURNEY-DOMAIN-DESIGN.md`, `E1-JOURNEY-VERSIONING.md`, `E1-JOURNEY-CARD-CONTRACT.md`, and `E1-REUSE-AUDIT.md` | Accepted and implemented by TG18. |
| E2 Clinic Entry and Bring Your Clinic | E2 constitutional documents, `E2-OPERATIONAL-CONTRACT.md`, `E2-IMPLEMENTATION-BOUNDARY.md`, and ADR-PF-002–018 as referenced by those contracts | Accepted and implemented by TG19. |
| E3 Workspace Preparation | `frontend/docs/TG20/design.md`, `domain-model.md`, `operational-contracts.md`, `final-authorization-contracts.md`, and `acceptance.md` | Accepted and implemented by TG20. |
| E4 Capability Visibility | Req 33 and the E4 constitutional contract in this document | Accepted and implemented by TG21. |
| E5 Ready-to-Start Experience | Req 34 and the E5 constitutional contract in this document | Accepted and implemented by TG22. |
| E6 Conflict and Multi-Clinic Recovery | E6 constitutional product contract in `requirements.md` and the E6 constitutional design contract above | Constitutionally complete. Implementation remains unauthorized pending a separately approved task boundary and implementation-readiness review. |
| E7 Offline Mutation Recovery | E7 constitutional requirements and the E7 constitutional design in this document | Constitutionally complete; TG24 implementation authorized, with TG25 reserved for final acceptance. |
| E8 Commercial Trial | `E8-CONSTITUTIONAL-DECISIONS.md`, E8 requirements, and roadmap E8 | Constitutionally complete; TG26 implementation authorized. |
| E9 Subscription Conversion and Payment Recovery | Req 12, 18–20, 23–28, 30, 32 and roadmap E9 | Incomplete. Payment ownership, verification, recovery, and security contracts are not accepted. |
| E10 Informational Dunning | Req 20, 24, 25, 28 and roadmap E10 | Incomplete. Trigger, timing, channel, severity, and owned-action design is absent. |
| E11 Dashboard First Actions and Progressive Guidance | Req 14, 15, 21, 23–25, 28 and roadmap E11 | Incomplete. Dashboard ownership, first-action authority, growth eligibility, and branding criteria are absent. |
| E12 Cross-Cutting Completion and Release | Cross-cutting sections in this document, Req 14, 15, 19–25, 28, 30–32, and roadmap E12 | Partially covered. Hindi review ownership, staging/device matrix, analytics completion, security audit, and release evidence remain open. |

The E4 and E5 sections above are the TG21/TG22 constitutional updates. They
supersede any older implication that the frontend may derive capability
visibility or readiness locally. Likewise, the historical Demo/Live transition
design must not be used to bypass Req 34 or the approved E8 commercial contract.
No other design section is declared obsolete by this reconciliation.

### E8 Constitutional Design Ownership

`E8-CONSTITUTIONAL-DECISIONS.md` is the accepted E8 authority. The backend
commercial-trial domain owns the immutable trial identity, lifecycle, policy,
server-UTC clock, commercial configuration, persistence/history, scheduled
transitions, readiness-evidence validation, authorization, Effective Tenant and
organization isolation, idempotency/concurrency, transactions, audit, retries,
versioned typed APIs, compatibility, rollout, and rollback.

The Trial Lifecycle is `ELIGIBLE` → `ACTIVE` → derived `EXPIRING` → `EXPIRED`
and ends at `EXPIRED`. The separate Commercial Retention Lifecycle begins after
expiry and is `SUSPENDED` → `ARCHIVED` → `DELETED`. This conceptual ownership
separation does not alter approved behavior and keeps E8 trial authority
distinct from future E9 subscription authority. An audited Super Admin
extension restores the same immutable retained trial from `SUSPENDED` or
`ARCHIVED` to `ACTIVE`; it never creates a second trial. Subscription initiation
hands commercial authority to E9.

Commercial deletion remains subordinate to legal hold, regulatory preservation,
and mandatory statutory retention. E8 does not own those legal obligations and
commercial policy cannot override them.

The frontend owns presentation, orchestration, navigation, and user interaction
through existing Clean Architecture. It consumes backend-authoritative
commercial and retention states through verified existing datasource,
repository, React Query, tenant-scoped cache, localization, accessibility, and
Theme boundaries. It does not calculate policy, expiry, entitlement, retention,
or commercial authority. Tenant switch, logout, authorization loss, stale
responses, loading, errors, disabled actions, downloads, and retention
navigation must preserve the approved authority and isolation boundaries.

`ADR-PF-019-GOVERNED-LIFECYCLE-SCHEDULER.md` owns the platform-wide scheduling
and execution boundary for time-driven lifecycle work. Platform Foundation owns
due-work coordination, process operation, bounded dispatch, and retry cadence;
the E8 executor owns commercial eligibility, transitions, transaction, history,
and audit. The scheduler cannot calculate commercial policy, infer tenant
scope, or mutate an E8 aggregate directly. TG26.3 is the first authorized
consumer and may register only the approved E8 commercial lifecycle job.
`ADR-PF-020-PLATFORM-BACKGROUND-RUNTIME-CATALOG.md` is the permanent inventory
and selection authority for background, deferred, startup, replay, executor,
and reconciliation mechanisms; it preserves the distinction between runtime
ownership and E8 business ownership.

#### E8 implementation sequencing and retention foundation

TG26.2 established only the Trial Lifecycle persistence foundation:
`ELIGIBLE`, `ACTIVE`, persisted `EXPIRED`, and derived `EXPIRING`. Its accepted
source does not persist `SUSPENDED`, `ARCHIVED`, or `DELETED`; does not preserve
extension request/decision history; and exposes no repository contract for
retention eligibility, protection evidence, or retained-state recovery.

TG26.2A owns the missing E8 domain and persistence foundation required before
TG26.3:

- persisted Commercial Retention Lifecycle states `SUSPENDED`, `ARCHIVED`, and
  terminal commercial `DELETED`, while secure deletion remains outside E8;
- immutable extension request, direct-grant, approval, reason, channel,
  approver, decision-time, and resulting-end-time evidence for the same trial;
- same-identity recovery from `SUSPENDED` or `ARCHIVED` to `ACTIVE`, without
  changing original activation evidence or creating another trial;
- captured retention-policy identity and authoritative UTC transition
  timestamps, with `EXPIRING` and final notice remaining derived views rather
  than additional persisted lifecycle states;
- append-only lifecycle/extension history and optimistic-concurrency evidence;
- authoritative export-in-progress evidence with its governed timeout, plus
  legal-hold, regulatory-preservation, and statutory-retention protection
  evidence sufficient to block commercial deletion;
- repository contracts for scoped lifecycle updates, due-transition
  eligibility, protection checks, execution claim/lease persistence,
  idempotent replay, and retained-state recovery; and
- one additive migration and typed retention/extension configuration, without
  fabricating historical evidence or reinterpreting legacy terms.

TG26.2A owns no application orchestration, scheduler runtime, polling, worker
startup, public API, frontend, E9 behavior, export format, legal-retention
policy, or secure-deletion implementation. Existing E8 rows without captured
retention evidence must remain explicit and fail closed; migration must not
invent policy history, protection evidence, extension decisions, or lifecycle
timestamps.

After TG26.2A acceptance, TG26.3 owns activation reads/commands and transport,
extension request/direct-grant/approval orchestration, database-UTC due-work
discovery, the single E8 scheduler registration, the E8 lifecycle executor,
scheduled transitions, retained-state recovery orchestration, claims/retries,
idempotency, transactional audit, and typed transport. TG26.3 consumes the
protection evidence established by TG26.2A and must not implement export
formats, legal-retention policy, secure deletion, subscription, payment, or E9.

TG26 must first prove semantic fit before reusing Demo, trial, subscription,
billing, Go-Live, status, countdown, export, or archive assets. Compatibility
code is source evidence, not authority to retain obsolete seven-day
pre-readiness or Demo semantics. TG23 conflict handling and the E7 queue are not
trial transition/retry owners. Commercial mutations must not be added to E7.

Implementation must preserve existing paid and seven-day terms, avoid automatic
Demo conversion or trial restart, classify ambiguous legacy organizations for
governed review, and apply the new configuration-driven 30-day default only to
new E8 activations. Rollback must disable new commands while preserving
identities, elapsed time, lifecycle history, retention evidence, and clinical
truth.

#### TG26.5 presentation and navigation contract audit

The prior retained-artifact and archive-content model is superseded. Commercial
Retention owns the workspace lifecycle and eligibility decisions; it does not
own export packages, downloadable artifacts, archive files, document
generation, or storage.

Version 1 uses one E8-owned Commercial Retention presentation destination:

```text
CommercialRetentionDestinationV1
  route: /onboarding/commercial-retention
  organizationId
  tenantId
  trialId
  aggregateVersion
  contractVersion
```

The backend Commercial Retention owner must supply one versioned,
organization/tenant-scoped read projection containing only:

- authoritative workspace/commercial state;
- archived timestamp and retention-until timestamp when applicable;
- restoration, permanent-deletion, extension, and export-request eligibility;
- legal/statutory hold awareness;
- allowed commercial actions; and
- safe reason classifications for unavailable or ineligible actions.

Eligibility and timestamps are backend-derived. Unknown versions, missing
scope, unavailable protection evidence, and stale authority fail closed. The
frontend must not infer eligibility from timestamps, scheduler evidence,
transition history, or raw protection records.

TG26.5 owns the destination presentation and route registration. It may show
Workspace Status, Archived Date, Retention Until, Restore Workspace, Delete
Permanently, Request Extension, Request Workspace Data Export, and Contact
Support only when the backend read model authorizes or classifies them. It must
not show artifact collections, export status, package metadata, download
links, archive files, or retained-record collections.

##### Workspace Data Export boundary

Workspace Data Export is a separate future bounded capability. Commercial
Retention may expose only whether a request is permitted. A
`REQUEST_WORKSPACE_DATA_EXPORT` action is a governed future handoff, not proof
that a request, export, package, retrieval, or download exists.

Workspace Data Export owns export requests, content scope, generation, package
lifecycle, metadata, retrieval, download, expiry, audit, and storage
integration. Runtime owns execution, retry, and scheduling. Infrastructure
owns storage providers, streaming, object storage, and file transport. TG26.5
must remain informational when the future destination is unavailable and must
not call the current `exports` handoff as if it were a package catalog.

##### Support

Version 1 Support is intentionally deferred and non-navigating. Product owns
future support behavior; no support domain or navigation owner exists today.
TG26.5 may show localized informational guidance where E8 permits contacting
support, but the action remains disabled and exposes no URL, email address,
phone number, provider, or fabricated request state. No organization or tenant
context leaves the application. A future governed support capability must own
its typed handoff, authorization, destination, audit, and unavailable behavior.

##### E9 subscription handoff

E9 owns all future subscription navigation and commercial behavior. Before E9
registers a governed destination, TG26.5 presents subscription as deferred
information and does not navigate, call billing/payment routes, or claim that a
request was stored. The existing `E9`/`REQUEST_SUBSCRIPTION` handoff may be
validated only through the TG26.4 repository boundary.

The future Version 1 destination contract must carry `organizationId`,
`tenantId`, `trialId`, `aggregateVersion`, and `contractVersion`. Unknown,
unsupported, unauthorized, or unavailable destinations fail closed. Adding an
E9 destination is E9 work and does not expand TG26.5.

##### Extension request inputs

The mandatory business reason is trimmed free text with a post-trim length of
`1..160`. TG26.5 owns localized labels, guidance, remaining-length and
validation presentation. It submits the trimmed value unchanged to the
existing `reason` field. Guidance prohibits clinical details, patient
information, credentials, payment data, and other sensitive content. Empty,
over-length, or unsupported input fails locally and remains subject to backend
validation.

`approval channel` records interaction provenance, not decision state. Product
owns the closed Version 1 vocabulary:

- `IN_APP_REQUEST` for an Organization Admin request;
- `SUPPORT`, `SALES`, or `CUSTOMER_SUCCESS` for a Super Admin direct grant
  following the corresponding verified offline interaction.

For an Organization Admin request, TG26.5 submits `IN_APP_REQUEST`
automatically and does not show a selector. For a Super Admin direct grant,
TG26.5 presents a localized required selector for the three offline channels.
The frontend submits the stable value without translation. The backend owns
authorization, existing bounded transport validation, persistence, and
immutable audit. TG26.5 rejects unknown values before submission. Future values
require additive Product approval and coordinated backend/frontend contract
versioning; they cannot be inferred from arbitrary transport strings.

Across these decisions, Product owns behavior, E8 owns commercial context,
TG26.5 owns presentation, E8 frontend navigation owns its route contract,
backend owners retain authorization and read-model authority, and future
Workspace Data Export, Support, and E9 owners retain their downstream behavior.
Unsupported or deferred behavior must remain explicit and fail closed.

##### TG26.5 implementation prerequisite

Source inspection proves that existing E8 persistence contains lifecycle
timestamps, captured retention terms, extension evidence, and latest
protection evidence, but the TG26.3 response does not expose the complete
Commercial Retention projection above. TG26.4 therefore has no DTO/domain
mapping for it.

The smallest genuine prerequisites are:

1. a backend Commercial Retention read-projection checkpoint that reuses
   existing E8 persistence and authorization, adds no artifact model and no
   export lifecycle, and exposes the approved typed projection; then
2. a frontend data/domain integration checkpoint that maps that projection
   through the existing datasource, repository, React Query, tenant-scoped
   cache, and fail-closed domain boundaries without presentation.

No migration is expected because the approved projection is derived from
existing TG26.2/TG26.2A evidence. If implementation inspection disproves that
fit, the prerequisite must stop rather than invent persistence. TG26.5 remains
presentation-only and begins only after both prerequisites are complete.

### Documentation Design Governance v1.0

This document owns implementation design only. It consumes approved intent from
`requirements.md` and must not redefine product scope, implementation status,
or execution history. The RTM links each requirement to the accepted design
section; `tasks.md` records what was executed.

Before a future Task Group receives constitutional approval, its design must
freeze the relevant ownership, lifecycle, boundaries, dependencies, failure
behavior, security and tenant isolation, localization, accessibility, testing,
rollback, and stop conditions. Missing design remains an explicit prerequisite
in the RTM and must not be filled by implementation-time invention.

An implementation or acceptance checkpoint updates this document only when
verified evidence proves the accepted architecture inaccurate or an approved
architecture change is made. Status, commits, tests, and acceptance results
belong in the RTM and task ledger, not in design prose.

## Error Handling

### Tier 1 Error Handling

All errors in `handleNext` are caught and surfaced via `Alert.alert` using the existing pattern already in `SetupWizardFlow`. No new error infrastructure is needed for Tier 1.

The `submissionId` guard silently drops stale callbacks — no user-visible error in that case.

### Deferred Error Handling (Post-Release)

`syncWizardDraftToStorage` error handling, analytics reporting, and centralised `mapOnboardingError` utility are deferred to post-release sprints.

---

## Correctness Properties

### Property 1: No Double Submission

`handleNext` is a no-op if `submitMutation.isPending === true`. The CTA button is disabled and shows a spinner. `submitStepDataApi` is called at most once per user tap.

### Property 2: Step Advances Only After Refetch

`setCurrentStepIndex` is called only after `await refetch()` resolves inside `handleNext`. Step index never increments on stale cache data.

### Property 3: Stale Callbacks Are Silent No-ops

`submissionId` is captured at call time and compared in `onSuccess`/`onError`. Mismatched IDs (navigate-away-and-back race) are silently discarded.

### Property 4: Android Back Never Exits Wizard

`BackHandler` returns `true` on every hardware back press while `SetupWizardFlow` is mounted.

### Property 5: Alias Routing Is Exhaustive and Consistent

Both `StepDetailScreen.redirectSteps` and `SetupWizardFlow.renderStepContent` derive their lists from the single `SERVICE_CATALOGUE_ALIASES` constant. They cannot diverge.

### Property 6: Capability Visibility Is Backend-Authoritative

For a fixed tenant and identical `(template_version, capability_revision)`, the
Backend Journey Visibility Projection returns the same ordered visible-step
result. The frontend cannot add a step omitted by that result. Unknown or
non-effective capability state therefore fails closed.

### Deferred Properties (Post-Release)

Properties related to draft persistence and storage reliability (DraftEntry integrity, AsyncStorage error isolation) are deferred to the post-release hardening sprint.

---

## Progressive Experience Production-Hardening Checkpoint Implementation

### 1.1 Alias Routing — StepDetailScreen (Req 1)

**Current state:** `redirectSteps` map in `StepDetailScreen.tsx` contains `rooms_and_therapy_beds`, `treatment_rooms`, `treatments_and_therapies`, `staff_and_roles`, `staff_setup`, `staff_members`, `inventory_setup`. Missing: `services`, `services_offered`, `services_and_specialities`, `treatment_services`.

**Change:** Extend the `redirectSteps` map with a unified service-catalogue group:

```typescript
// Audited service-catalogue aliases — source: backend template audit (Req 4)
const SERVICE_CATALOGUE_ALIASES = [
  'treatments_and_therapies',
  'services_and_specialities',
  'services',
  'services_offered',
  'treatment_services',
] as const;

const redirectSteps: Record<string, string> = {
  // service catalogue — all aliases point to the same screen
  ...Object.fromEntries(
    SERVICE_CATALOGUE_ALIASES.map(code => [code, '/clinic-admin/settings/treatments'])
  ),
  // rooms
  rooms_and_therapy_beds: '/clinic-admin/settings/rooms',
  treatment_rooms: '/clinic-admin/settings/rooms',
  // staff
  staff_and_roles: '/clinic-admin/staff',
  staff_setup: '/clinic-admin/staff',
  staff_members: '/clinic-admin/staff',
  // inventory
  inventory_setup: '/clinic-admin/inventory',
};
```

### 1.2 Alias Routing — SetupWizardFlow (Req 2)

**Current state:** `renderStepContent()` switch handles `treatments_and_therapies` and `services_and_specialities` in one branch, showing a redirect card. Missing: `services`, `services_offered`, `treatment_services`.

**Change:** Extract `SERVICE_CATALOGUE_ALIASES` as a shared constant (same array as above, placed in `frontend/features/onboarding/constants/stepAliases.ts`) and replace the hardcoded case list:

```typescript
// In renderStepContent()
if (SERVICE_CATALOGUE_ALIASES.includes(currentStep.code as any)) {
  return <RedirectCard
    title={t('onboarding.wizard.steps.treatmentsAndTherapies')}
    description={t('onboarding.wizard.redirectCard.treatmentsDescription')}
    ctaLabel={t('onboarding.wizard.redirectCard.goToTreatments')}
    onPress={() => router.push('/clinic-admin/settings/treatments')}
  />;
}
```

`RedirectCard` is a new shared sub-component extracted from the existing inline JSX, accepting `title`, `description`, `ctaLabel`, `onPress`.

### 1.3 Delete TreatmentsAndTherapiesScreen (Req 3)

Delete `frontend/features/onboarding/presentation/pages/steps/TreatmentsAndTherapiesScreen.tsx`. Verify build passes.

### 1.4 Backend DTO — `updated_at` Field

> **Deferred.** The `updated_at` field in `StepValidationDTO` and the `updatedAtMs` mapping are required only for draft conflict resolution (Req 16, Req 29), which is deferred to post-release. No changes to `onboarding.dtos.ts` or `onboarding-status.entity.ts` are needed for the Progressive Experience production-hardening checkpoint.

---

## Data Flow Diagrams

### Submit → Refetch → Advance (Progressive Experience production-hardening checkpoint)

```
User taps Next
  └─► handleNext() fires
        ├─► isPending === true? → NO-OP (button was disabled, this is a guard)
        ├─► generate submissionId (UUID)
        ├─► await submitStepDataApi(tenantId, stepCode, data, submissionId)
        │     └─► Idempotency-Key: submissionId sent in header
        ├─► await refetch()   ← CRITICAL: must complete before advancing
        ├─► submissionId still current? → if not, silent no-op (stale callback)
        └─► setCurrentStepIndex(prev => prev + 1)  OR  router.replace(dashboard)
```

### Deferred Data Flows (Post-Release)

Draft lifecycle, offline mutation queue, and conflict resolution flows are deferred to the post-release hardening sprint.

---

## File Change Summary

| File | Action | Notes |
|---|---|---|
| `frontend/features/onboarding/constants/stepAliases.ts` | CREATE | Shared alias constant |
| `frontend/features/onboarding/presentation/pages/StepDetailScreen.tsx` | MODIFY | Alias routing fix |
| `frontend/features/onboarding/presentation/pages/SetupWizardFlow.tsx` | MODIFY | Alias routing, submission lock, await-refetch ordering, Android back, query invalidation |
| `frontend/features/onboarding/presentation/pages/steps/TreatmentsAndTherapiesScreen.tsx` | DELETE | Dead file |
| `frontend/features/onboarding/data/repositories/onboarding.repository.impl.ts` | MODIFY | `invalidateQueries` in `useSubmitStepMutation.onSuccess` |

All other file changes (WizardDraftStore, OfflineBanner, PendingMutationStore, axiosClient retry, DraftConflictModal, analytics, error utils, i18n, auth store cleanup) are deferred.

---

## Testing Strategy

### Progressive Experience Production-Hardening Checkpoint Tests (must pass before shipping)

| File | Test | Type |
|---|---|---|
| `SetupWizardFlow.test.tsx` | Rapid "Next" taps while `isPending` → `submitStepDataApi` called once | Unit |
| `SetupWizardFlow.test.tsx` | Step index does NOT advance until `refetch()` resolves | Integration |
| `SetupWizardFlow.test.tsx` | Stale `submissionId` callback is a no-op | Unit |
| `SetupWizardFlow.test.tsx` | Android back on step > 0 calls `handlePrevious`, not `router.back()` | Unit |
| `SetupWizardFlow.test.tsx` | Android back on step 0 does not navigate | Unit |
| `StepDetailScreen.test.tsx` | `services`, `services_offered`, `treatment_services` redirect to `/clinic-admin/settings/treatments` | Unit |
| `SetupWizardFlow.test.tsx` | `services`, `services_and_specialities`, `treatment_services` render Treatments redirect card | Unit |

### E2E Manual Verification Before Release

| Run | Clinic type | Device | Network | Critical checks |
|---|---|---|---|---|
| A | Demo | Android (emulator OK) | Fast (WiFi) | All steps complete, go-live reached |
| B | Real (direct setup) | Android (emulator OK) | Fast (WiFi) | `tenant_id` in JWT, all steps complete |
| C | Either | Android **physical** | Slow (3G throttle) | No double-submit, `Idempotency-Key` present in headers, step advances only after refetch |
| D | Either | Android **physical** | Intermittent (airplane mode) | No crash, no data loss, step advances when reconnected |

### Release Checklist

```
[ ] Run A passed (demo clinic, fast network)
[ ] Run B passed (real clinic, fast network)
[ ] Run C passed (slow network, physical Android)
[ ] Run D passed (intermittent connectivity, physical Android)

[ ] Backend idempotency confirmed:
      - Sent 2× identical POST /steps/{code} with same Idempotency-Key to staging
      - Second response returned cached result, no duplicate record created

[ ] Duplicate submission test:
      - Tapped "Next" 3× rapidly during a slow submission
      - Confirmed submitStepDataApi called exactly once (network log)

[ ] Submit → refetch → step advance ordering:
      - Throttled network to ~1 Mbps
      - Wizard does NOT advance step index while refetch is in-flight

[ ] Tenant resolution verified:
      - JWT contains tenant_id for both PROVISIONAL and live tenants, OR
      - Fallback header mechanism confirmed working on staging

Signed off by: ______________ Date: ______________
```

### Backend Dependencies for E2E Validation

The frontend hardening in this sprint depends on the following backend behaviours before E2E sign-off:

1. Auth/session tenant resolution
   - `/auth/me` or the active session bootstrap response must include a non-null tenant identifier for both PROVISIONAL/demo tenants and live tenants.
   - Until that is deployed and verified on staging, onboarding endpoints must continue accepting `X-Tenant-ID: {tenantId}` as a fallback header.

2. Onboarding status contract
   - `GET /api/v1/onboarding/{tenantId}/status` must return `visible_steps` in backend-defined order.
   - `per_step_validation[stepCode].status` must reflect the latest step submit result immediately after refetch.
   - Service-catalogue aliases may include: `treatments_and_therapies`, `services_and_specialities`, `services`, `services_offered`, `treatment_services`.

3. Step submission contract
   - `POST /api/v1/onboarding/{tenantId}/steps/{stepCode}` must accept `{ data, mark_complete }`.
   - The endpoint must accept `Idempotency-Key` and cache/dedupe duplicate requests with the same key for the same tenant/step/payload.
   - A duplicate request with the same `Idempotency-Key` must not create duplicate validation records or double-increment completion counters.

4. Complete setup contract
   - `POST /api/v1/onboarding/{tenantId}/complete` must finalize setup only after required steps are complete.
   - The auth/session refresh after completion must expose the updated application or tenant status used by the dashboard gate.

5. External management screens used by redirect steps
   - Treatments: `/clinic-admin/settings/treatments` must persist at least one treatment/service so the corresponding onboarding status becomes completed.
   - Rooms: `/clinic-admin/settings/rooms` must persist rooms/beds and update onboarding status.
   - Staff: `/clinic-admin/staff` must persist staff and update onboarding status.
   - Inventory: `/clinic-admin/inventory` must persist inventory and update onboarding status.

6. Staging observability needed for release sign-off
   - Request logs must expose `Idempotency-Key`, tenant ID source (JWT vs `X-Tenant-ID` fallback), step code, and dedupe/cache outcome.
   - Status-query logs should make it possible to confirm one completed transition per step after duplicate submits.

### Deferred Tests (Post-Release)

WizardDraftStore unit and property tests · tenant isolation integration tests · OfflineBanner tests · PendingMutationStore tests · multi-device sync tests — all deferred to post-release hardening sprint.

---

## Theme Compliance

All new and modified files must use `useClinicTheme()` exclusively — zero hardcoded colours, spacing values, font sizes, or border radii (except `flex: 1`, `zIndex`, `minHeight: 44`, `minWidth: 44`, animation timing).

---

## Git Delivery Strategy

All onboarding feature work must start from the latest committed `dev` baseline in both repositories. If either working tree is dirty, do not switch branches in that folder; use a clean clone or a separate worktree.

### 1. Start from latest `dev`

Run separately in frontend and backend:

```bash
git switch dev
git pull --ff-only origin dev
git status
```

Expected:

```text
On branch dev
Your branch is up to date with 'origin/dev'.
nothing to commit, working tree clean
```

### 2. Create paired feature branches

Use the same feature branch name in frontend and backend. For the current onboarding initiative, use:

```text
feature/progressive-experience-recovery
```

Create locally and verify:

```bash
git switch -c feature/progressive-experience-recovery
git branch --show-current
git status
```

### 3. Create remote branches immediately

```bash
git push -u origin feature/progressive-experience-recovery
```

Run in both frontend and backend.

### 4. Commit in logical groups

Before each commit:

```bash
git status
git diff --stat
git diff --check
```

Stage only reviewed files:

```bash
git add <specific-files>
```

Review staged content:

```bash
git diff --cached --stat
git diff --cached --name-status
```

Commit and push:

```bash
git commit -m "<clear onboarding task message>"
git push
```

Do not use `git add .` unless every modified and untracked file has been reviewed.

### 5. Keep feature branch updated from `dev`

After the feature branch is pushed, prefer:

```bash
git fetch origin
git merge origin/dev
```

Resolve conflicts, rerun tests, and push. Use rebase only when the branch has not been shared and the history rewrite is safe.

### 6. Final feature verification

Frontend:

```bash
git status
npm test -- --runInBand
npx tsc --noEmit
git diff --check
git log --oneline --decorate -10
```

Backend:

```bash
git status
alembic heads
alembic current
pytest -q
git diff --check
git log --oneline --decorate -10
```

The feature branch must be clean before integration.

### 7. Merge feature into `test`

Update `test`:

```bash
git switch test
git pull --ff-only origin test
```

Check merge compatibility:

```bash
git merge-tree --write-tree test feature/progressive-experience-recovery
echo $?
```

Expected:

```text
0
```

Merge with an explicit merge commit:

```bash
git merge --no-ff feature/progressive-experience-recovery \
  -m "Merge feature/progressive-experience-recovery into test"
git push origin test
```

Run separately in frontend and backend.

### 8. Integrated testing on `test`

Keep both repositories on `test`.

Frontend:

```bash
npm test -- --runInBand
npx tsc --noEmit
```

Backend:

```bash
alembic upgrade head
pytest -q
```

Then run the complete onboarding frontend-backend journey and UAT. Do not promote to `dev` until integrated testing passes.

### 9. Promote validated `test` to `dev`

Inspect divergence:

```bash
git fetch origin
git log --oneline --left-right dev...test
```

If `dev` is only behind:

```bash
git switch dev
git pull --ff-only origin dev
git merge --ff-only test
git push origin dev
```

If branches diverged:

```bash
git switch dev
git pull --ff-only origin dev
git merge-tree --write-tree dev test
echo $?
```

If clean:

```bash
git merge --no-ff test -m "Merge validated test into dev"
git push origin dev
```

Apply the same process to frontend and backend.

### 10. Confirm feature branch is merged

```bash
git merge-base --is-ancestor \
  feature/progressive-experience-recovery test
echo $?
```

Expected:

```text
0
```

### 11. Delete merged feature branches

After validation and promotion:

```bash
git switch dev
git branch -d feature/progressive-experience-recovery
git push origin --delete feature/progressive-experience-recovery
git fetch --all --prune
```

Do this separately in frontend and backend.

### 12. Final branch verification

```bash
git branch -a -vv
git status
```

Expected long-lived active branches:

- `main`
- `dev`
- `test`

The completed onboarding feature branch should no longer exist locally or remotely.

### Multi-Agent Working Rule

One agent = one branch = one clean clone or worktree.

Claude's Doctor Module work and Codex's Onboarding work must never share the same working folder. Codex must work only in the Progressive Experience frontend/backend folders and branches. Unrelated Doctor Module files must not be staged, moved, committed, reset, or deleted.
