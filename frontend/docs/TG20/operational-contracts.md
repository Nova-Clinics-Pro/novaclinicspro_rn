# TG20 Workspace Preparation Operational Contracts

Status: **Constitutional**

Version: **1.0**

Scope: **E3 / TG20 Workspace Preparation State and Guidance**

## 1. Authority and purpose

This document resolves the eight constitutional blockers recorded in
`implementation-readiness.md`. It defines operational behavior only; it does not
implement a model, migration, repository, API, service, worker, or screen.

These contracts consume and do not redefine:

- `NOVA-PRODUCT-ARCHITECTURE.md`;
- `NOVA-PLATFORM-FOUNDATION-ARCHITECTURE.md`;
- Phase 2 roadmap E3/TG20;
- TG19 accepted Clinic Entry and effective-tenant handoff;
- ADR-PF-004 organization-tenant association;
- ADR-PF-005 scoped idempotency;
- ADR-PF-006 application-owned transactions;
- ADR-PF-011 effective-tenant selection;
- ADR-PF-015 audit separation;
- ADR-PF-017 runtime-strategy authority.

> **Constitutional boundary:** Workspace Preparation verifies and, where
> explicitly allowed, idempotently reconciles the minimum workspace foundation
> needed to enter personalization. It does not create a tenant, associate a
> clinic, verify contact/ownership, decide Journey Card capability visibility,
> declare Ready to Start, or perform clinical/commercial setup.

## 2. Version 1 preparation definition

TG19 completes tenant creation/association and effective-tenant resolution.
TG20 begins only after that commit. Version 1 preparation is the authoritative
verification and bounded reconciliation of the following workspace foundation:

| Unit code | Authoritative completion evidence | Allowed reconciliation |
|---|---|---|
| `TENANT_FOUNDATION` | Active organization-tenant association references an existing, non-inactive tenant. | None. Missing/invalid tenant or association is terminal and returns to Platform Foundation support ownership. |
| `ACCESS_FOUNDATION` | At least one active tenant user has the approved Clinic Owner role. For New Clinic, TG19's creating actor is that owner. Bring Your Clinic preserves an existing clinic owner and never infers ownership from the association requester. | For New Clinic only, reuse existing idempotent tenant-user/RBAC/role-assignment services to restore the TG19-recorded creating owner's missing access. For Bring Your Clinic, missing owner access is terminal/support-owned; never assign the requester implicitly. Never create a new tenant or organization association. |
| `ONBOARDING_FOUNDATION` | Existing onboarding/template services resolve an active clinic-type template or the active `general` fallback, with a canonical template code and readable setup steps. | None. Resolution is read-only. If neither template exists, the unit fails terminally; TG20 never assigns, materializes, creates, or mutates a template or setup progress. |
| `PERSONALIZATION_HANDOFF` | The preceding units are complete and a refreshed Platform Foundation context still reports the same effective tenant. | No server-side navigation. The backend authorizes `ENTER_PERSONALIZATION`; the frontend performs the accepted refreshed-context equality gate. |

These four units are ordered, mandatory, specialty-neutral, and safe for user
presentation through localization keys. Version 1 has no optional or hidden
unit. New units or changed meaning require a new preparation contract version.

“Personalization available” means only that the existing setup/journey entry
point is operational. It does not mean onboarding steps are complete, the clinic
is Ready to Start, a trial has begun, or any clinical/financial capability is
configured.

## 3. Contract 1 — Authoritative Workspace Preparation Executor

### 3.1 Ownership

The single lifecycle writer is the **Workspace Preparation Executor**, an
application-layer orchestration service inside the existing onboarding/
Progressive Experience bounded context.

The persisted `WorkspacePreparation` aggregate in Supabase PostgreSQL is the
single source of truth for preparation state. The executor is the only normal
application component authorized to transition it. Provisioning, RBAC,
template, transport, frontend, integration, or audit adapters may provide
evidence but cannot write lifecycle state directly.

### 3.2 Execution model

Version 1 is **request-driven and resumable**, not a background-job platform.
No new queue, worker, scheduler, or alternate runtime is constitutional.

Invocation occurs through an idempotent `ensure preparation` application
command after TG19 has committed and refreshed the effective tenant:

1. TG19 New Clinic or Bring Your Clinic returns its accepted handoff unchanged.
2. The Workspace Preparation frontend route issues `ensure` for the current
   effective tenant, then queries the resulting run.
3. Existing/legacy users entering the route use the same command.
4. `ensure` initializes or reuses one current run, claims it through optimistic
   concurrency, and executes/resumes units in order.
5. Each unit is evaluated from authoritative repositories/services. An allowed
   reconciliation uses the existing owner service and records real evidence.
6. Execution persists a transition after each unit, so interruption can resume
   without invented progress.

The executor may complete all units in one request. The UI must support a fast
transition directly to `PERSONALIZATION_AVAILABLE`; visible delay is not a
product requirement.

### 3.3 Completion

Completion requires stored successful evidence for all four Version 1 units and
a current effective-tenant equality check. Only then may the executor transition
to `PERSONALIZATION_AVAILABLE` and return next action
`ENTER_PERSONALIZATION`.

### 3.4 Cancellation

Client cancellation, navigation, logout, or tenant switch cancels observation,
not a server transaction already executing. A transaction either commits its
current unit transition or rolls it back. No subsequent unit begins after the
request is cancelled when cancellation is observable.

There is no destructive “cancel preparation” state in Version 1. A user may
leave and later resume the same run. Organization-tenant deactivation makes the
run non-executable and yields terminal safe reason `ASSOCIATION_INACTIVE`.

### 3.5 Failure and restart

- Transient dependency/transaction failures transition to
  `RETRYABLE_FAILURE` only after the failing unit transaction rolls back.
- Invalid/missing tenant association, unsafe inconsistency, retry exhaustion, or
  unsupported contract transitions to `TERMINAL_FAILURE`.
- Process/app restart reads the current aggregate/version and resumes at the
  first unit without successful evidence.
- Successful evidence is revalidated before it is trusted after restart; a
  regressed invariant can reopen execution only from `PENDING`, `PREPARING`, or
  `RETRYABLE_FAILURE`, never silently from a terminal state.

## 4. Contract 2 — Preparation Evidence Model

### 4.1 Authoritative evidence

Evidence is a safe, immutable fact returned by the existing owning boundary and
recorded with the unit transition:

| Evidence field | Contract |
|---|---|
| `unit_code` | One Version 1 unit code. |
| `evidence_version` | Unit-specific additive evidence schema identity. |
| `source_type` | Stable owner classification such as `organization_tenant_repository`, `rbac_service`, `onboarding_template_service`, or `platform_context_service`. |
| `source_reference` | Opaque internal UUID/reference where safe; never contact, credential, token, fingerprint, or raw payload. |
| `outcome` | `SATISFIED`, `RECONCILED`, or safe failure classification. |
| `observed_at` | Server timestamp of authoritative observation. |
| `recorded_at` | Server timestamp committed with aggregate transition. |
| `attempt` | Current executor attempt number. |
| `correlation_id` | Safe request/execution correlation UUID. |

### 4.2 Progress and completion

Determinate progress is exactly the count of Version 1 units with committed
`SATISFIED` or `RECONCILED` evidence divided by four. No fractional unit,
estimated percentage, elapsed-time forecast, fake animation completion, or
client increment is allowed. While a unit is evaluating, the projection may be
indeterminate without changing committed completed count.

Completion is the aggregate transition described in §3.3, not the UI reaching
100% and not onboarding setup completion.

### 4.3 Provenance and timestamps

Evidence records system provenance: executor version, owning source type, safe
reference, attempt, and timestamps. Human verifier provenance from TG19 is not
copied. All timestamps are server-generated UTC. Client timestamps are ignored.

### 4.4 Retry evidence

Every retry records:

- retry operation/idempotency record reference;
- actor principal ID and organization membership authorization outcome;
- prior state/version/attempt;
- safe retry reason;
- new attempt number;
- executor correlation ID;
- committed result/replay classification.

Evidence from a failed rolled-back reconciliation is not marked successful.

### 4.5 Audit participation

Organization-scoped events use the existing organization audit repository:

- `workspace_preparation.initialized`;
- `workspace_preparation.started`;
- `workspace_preparation.unit_completed`;
- `workspace_preparation.retry_requested`;
- `workspace_preparation.retry_started`;
- `workspace_preparation.personalization_available`;
- `workspace_preparation.failed_retryably`;
- `workspace_preparation.failed_terminally`.

Platform Audit is not used because every event is organization/tenant scoped.
Audit contains safe IDs, codes, outcome, attempt, and correlation only. Raw
exceptions, SQL/provider text, contacts, evidence from verification, credentials,
tokens, fingerprints, or template payloads are prohibited.

## 5. Contract 3 — WorkspacePreparation initialization

### 5.1 Creation point and owner

The executor initializes the aggregate inside the idempotent `ensure` command.
TG19 does not create the record and is not modified to own TG20 state. This keeps
TG19 accepted behavior stable and gives New Clinic, Bring Your Clinic, legacy,
and direct-route users one initialization path.

### 5.2 Prerequisites

Initialization requires all of the following:

1. authenticated Supabase principal mapped to an organization user;
2. active organization membership authorized to prepare the clinic;
3. active organization-tenant association;
4. route tenant equals the Platform Foundation effective tenant;
5. supported `workspace_preparation_v1` contract;
6. tenant exists and is not inactive/suspended under existing platform policy.

Failure of 1–4 is typed unauthorized/tenant mismatch and creates no record.
Failure of 5 is unsupported and creates no Version 1 record. Failure of 6 is a
typed terminal platform inconsistency and is auditable without fabricated run.

### 5.3 Duplicate protection

The `ensure` command uses organization-scoped idempotency. Database authority
also enforces one non-superseded run for the organization-tenant association and
contract version. Concurrent initializers either return the same run or receive
the authoritative uniqueness winner and replay it; they never create two runs.

Idempotency fingerprint includes organization ID, actor ID, association ID,
tenant ID, contract version, and operation code. It contains no contact or
verification evidence.

### 5.4 Versioning and initialization state

The record begins at `PENDING`, aggregate version 1, attempt 0, retry count 0,
with no successful units. The executor then claims attempt 1 and transitions to
`PREPARING`.

Preparation contract version is independent of Journey version, draft schema
version, application status, tenant status, and API media version. A later
contract version creates a successor run and supersedes the prior current run
only through an approved upgrade command.

## 6. Contract 4 — Retry semantics

### 6.1 Authorization and boundary

User retry is allowed only when:

- current state is `RETRYABLE_FAILURE`;
- `retry_allowed` is true;
- actor retains active organization membership and the existing approved
  preparation permission;
- association is active and tenant remains effective;
- opaque run ID and contract version match the current run;
- user retry count is below three.

Retry resumes at the first unit lacking valid successful evidence. It may
revalidate prior evidence but does not repeat an already satisfied mutation.

### 6.2 Idempotency and replay

Retry uses existing organization idempotency with operation
`workspace_preparation.retry.v1`. Fingerprint includes organization, actor,
association, tenant, run, aggregate version observed by client, and contract
version. Same-key/same-fingerprint returns the stored authoritative projection.
Same key with different intent returns typed idempotency conflict.

### 6.3 Duplicate-provisioning prohibition

The executor and retry service must never call full tenant creation or Clinic
Entry provisioning. Specifically they may not create another tenant, duplicate
the organization association, consume verification again, repeat Clinic Entry,
or replace the effective tenant.

Allowed reconciliation is unit-scoped and idempotent through existing owner
services. If an owner service cannot prove idempotent “ensure” semantics, the
unit fails terminally until that owner contract is extended and approved.

### 6.4 Partial failures

Each unit reconciliation and its aggregate evidence/audit transition is one
application-owned transaction. Failure rolls back that unit transaction. Prior
committed units remain and are revalidated on resume. No evidence claims a
mutation whose transaction rolled back.

External/post-commit effects must expose an idempotent acknowledgment reference.
Ambiguous acknowledgment yields `RETRYABLE_FAILURE` and reconciliation checks
authoritative state before repeating any command.

### 6.5 Maximum retries and terminal behavior

Version 1 permits three user-requested retries per run. Automatic request replay
under the same idempotency key does not increment the count. When the third user
retry fails retryably, the executor transitions to `TERMINAL_FAILURE` with safe
reason `RETRY_LIMIT_REACHED`.

No public reset exists. After support corrects the underlying platform data, an
authorized internal recovery command may create a successor run, with Platform
Foundation authorization and organization audit. The recovery command is not a
TG20 user feature and requires its own implementation boundary/test evidence.

## 7. Contract 5 — Persistence contract

### 7.1 Aggregate table

Future implementation responsibility: one additive table named
`org_workspace_preparations`.

Required logical fields:

| Field | Contract |
|---|---|
| `id` | UUID primary key/run ID. |
| `organization_tenant_id` | Non-null FK to the accepted organization-tenant association. |
| `organization_id`, `tenant_id` | Non-null immutable scope columns, indexed and validated against the association by repository/service. |
| `contract_version` | Non-null bounded string. |
| `state` | Non-null Version 1 checked string. |
| `attempt`, `user_retry_count`, `max_user_retries` | Non-negative integers; max is 3 for V1. |
| `units` | Non-null JSONB object validated by the Version 1 domain serializer; safe evidence only. |
| `reason_code` | Nullable bounded safe code. |
| `retry_allowed` | Non-null boolean consistent with state/domain invariants. |
| `last_retry_operation_id` | Nullable opaque reference to existing idempotency record/operation. |
| `execution_correlation_id` | Non-null UUID. |
| `aggregate_version` | Non-null positive integer for optimistic concurrency. |
| lifecycle timestamps | `created_at`, `started_at`, `updated_at`, `completed_at`, `superseded_at`, all server UTC as applicable. |

Required constraints/indexes:

- FK and indexes for association, organization, tenant;
- partial unique current run on `(organization_tenant_id, contract_version)`
  where `superseded_at IS NULL`;
- check for allowed states, counters, JSON object, timestamp consistency;
- index for current tenant query and retryable-state operational lookup;
- optimistic update predicate on `id + aggregate_version`.

### 7.2 History table

Future implementation responsibility: append-only
`org_workspace_preparation_events` with UUID ID, preparation FK, sequence,
from/to state, unit code, attempt, safe reason/outcome, actor type/principal ID
when applicable, idempotency operation reference, correlation ID, safe JSONB
metadata, and server UTC timestamp.

Unique `(preparation_id, sequence)` and optional unique source-event identity
provide ordering/deduplication. No update/delete repository methods exist.

### 7.3 Transition and transaction ownership

The executor/application service owns transaction completion. Repository methods
lock/load/add/update with optimistic version and flush without commit. Aggregate
transition, evidence/history event, organization audit, and idempotency result
commit or roll back according to ADR-PF-006.

### 7.4 Migration expectations

- One additive Alembic revision after the branch head at implementation time.
- No historical migration modification.
- No synthetic backfill and no inference of completion.
- Model registry/Alembic metadata includes both tables and fail-closed tests.
- Fresh upgrade, current, downgrade, re-upgrade, constraints, indexes, and drift
  verified on disposable PostgreSQL; Supabase remains runtime authority.
- Code remains compatible when tables are empty.

### 7.5 Version compatibility

V1 readers ignore additive fields but fail safe on unknown contract/state.
Successor versions create new current runs and preserve V1 history. Old clients
receive unsupported-version/no-action rather than a downgraded projection.

## 8. Contract 6 — Concurrency

### 8.1 Parallel ensure/initialization

Organization idempotency handles request replay; database partial uniqueness is
the final authority. On uniqueness conflict, the service reloads and returns the
winning current run only after verifying identical scope/version.

### 8.2 Executor claim and optimistic locking

The exact database-persisted claim protocol, fields, 30-second default/60-second
maximum lease, acquisition/renewal/reclaim/release rules, stale-token rejection,
constraints, and indexes are defined by `final-authorization-contracts.md` §3.
An executor request uses row locking and `aggregate_version`; neither is
optional. Each successful claim or transition increments version exactly once.
A stale claim or zero-row update is a typed conflict; the caller reloads and
does not repeat a mutation before reconciling authoritative evidence.

### 8.3 Retry races

Only one request can transition a specific aggregate version from
`RETRYABLE_FAILURE` to `PREPARING`. Other same-key requests replay; different-key
races reload the winner and return retry-in-progress/current projection without
incrementing attempts or invoking reconciliation twice.

### 8.4 Tenant switching and stale requests

Client cancellation does not roll back committed server work. Every response
includes tenant, run, contract version, and aggregate version. Frontend applies a
response only when all match its current authenticated organization/effective-
tenant/request generation. Outgoing-tenant execution may finish safely but its
response/cache cannot affect the new tenant.

### 8.5 Evidence ordering and duplication

Version 1 is request-driven; unit evidence is produced in executor order. If an
adapter supplies an external source-event identity, duplicates are ignored after
authoritative-state reconciliation. Evidence for an older attempt/version cannot
regress state or overwrite newer evidence.

### 8.6 Transaction ownership

The application service owns each unit transaction. Repository, provisioning,
RBAC, template, audit, and adapter code does not commit independently when
composed in TG20.

## 9. Contract 7 — Legacy and no-run handling

### 9.1 Universal lazy initialization

No-run is a supported initial condition, not an error and not completion. All
eligible clinics use the same `ensure` command:

- TG19 New Clinic users;
- TG19 Bring Your Clinic users;
- organizations/clinics that existed before TG19;
- clinics upgraded after TG20 deployment;
- partially configured/personalized clinics.

There is no bulk/synthetic migration backfill.

### 9.2 Existing and partially prepared workspaces

The executor observes the four authoritative units. Already satisfied units are
recorded `SATISFIED`; they are not re-created. Missing units with an approved
idempotent reconciliation are recorded `RECONCILED` after success. Missing
tenant/association or unsafe inconsistent data is terminal.

Existing setup progress, completed onboarding steps, active clinical data, or
tenant status does not imply preparation completion. Conversely TG20 never
resets or modifies those records.

### 9.3 Upgrade behavior

Contract-version upgrade is explicit and lazy. A new version evaluates its own
units and creates a successor current run; it cannot rewrite V1 evidence or
infer new completion from removed/renamed units without an accepted mapping.

### 9.4 Recovery

Interrupted `PENDING`, `PREPARING`, or `RETRYABLE_FAILURE` runs resume by
revalidating evidence. A run left `PREPARING` beyond the bounded execution lease
is eligible for reconciliation by the next `ensure` request; it does not become
complete by timeout. Terminal runs require support remediation and audited
successor-run recovery as defined in §6.5.

## 10. Contract 8 — Downgrade and rollback

### 10.1 Runtime rollback ownership

The Workspace Preparation application service owns transaction rollback. Each
unit transition, evidence/history, organization audit, and idempotency result
follows ADR-PF-006. Existing owner services must participate without independent
commit when composed.

### 10.2 Release rollback

TG20 schema is additive. A code release rollback first deploys the previous code,
which ignores the new tables; data remains intact. Server/client contract
versioning makes old clients fail safe. Active preparation execution is disabled
before rollback, and no new attempts start during the release boundary.

### 10.3 Schema downgrade

Schema downgrade is a separate controlled operation, not required for ordinary
code rollback. It must fail closed when any nonterminal run exists. Before table
removal, operations verify execution disabled, all runs terminal/superseded,
required audit/history retention exported under approved policy, and no deployed
code reads the tables.

Downgrade removes event table before aggregate table and never alters tenant,
organization, association, RBAC, setup progress, Journey, or Platform Foundation
data. Re-upgrade creates empty tables; lazy `ensure` reconstructs authoritative
state without synthetic backfill.

### 10.4 Abandoned and interrupted preparations

- Client abandonment leaves a resumable run.
- Interrupted transaction rolls back the current unit.
- Committed earlier units remain and are revalidated.
- Execution lease expiry enables reconciliation, not completion.
- Association deactivation prevents resume and produces safe terminal behavior.

### 10.5 Forward compatibility

New code tolerates absent V1 rows and additive nullable fields. Old code ignores
new tables. New contract versions preserve old rows/history. Unsupported clients
receive no actionable completion/handoff.

## 11. Safe projection catalogue

The Version 1 projection uses only:

| State | Progress | Retry | Next action |
|---|---|---|---|
| `PENDING` | 0/4 or committed completed count | No | `WAIT` or explicit `START` response flow |
| `PREPARING` | committed completed count / 4; indeterminate while evaluating unit | No | `WAIT`/`REFRESH` |
| `PERSONALIZATION_AVAILABLE` | 4/4 | No | `ENTER_PERSONALIZATION` |
| `RETRYABLE_FAILURE` | committed completed count / 4 | Server boolean, max 3 | `RETRY` or `CONTACT_SUPPORT` |
| `TERMINAL_FAILURE` | committed count / 4, never presented as successful percentage | No | `CONTACT_SUPPORT` |

Safe reason codes are a closed Version 1 catalogue:

- `TRANSIENT_DEPENDENCY_FAILURE`
- `TRANSACTION_CONFLICT`
- `EXECUTION_INTERRUPTED`
- `ACCESS_RECONCILIATION_FAILED`
- `ONBOARDING_FOUNDATION_FAILED`
- `ASSOCIATION_INACTIVE`
- `TENANT_INELIGIBLE`
- `UNSAFE_INCONSISTENCY`
- `RETRY_LIMIT_REACHED`
- `UNSUPPORTED_CONTRACT`

The backend does not send resolved human text. Frontend maps codes/unit/state to
matching `en-US` and `hi-IN` localization keys. Refresh hint is null or bounded
between 2 and 30 seconds; frontend uses focus/app lifecycle and React Query to
avoid background/noisy polling. Terminal/success states stop polling.

Support correlation is the execution correlation UUID. It reveals no internal
exception, provider, SQL, evidence, contact, or credential.

## 12. Authorization and Platform Foundation composition

- Actor comes from existing Supabase authentication.
- Organization user/membership comes from accepted Platform Foundation services.
- Route tenant must equal authoritative effective tenant and have an active
  organization-tenant association.
- The legacy `is_org_admin` boolean shortcut is prohibited.
- Query requires additive tenant permission
  `onboarding.workspace_preparation.view`; ensure/retry requires
  `onboarding.workspace_preparation.manage`. Both use the existing tenant RBAC
  permission framework, not Platform Capability and not a boolean role shortcut.
- Version 1 maps `CLINIC_OWNER` and `CLINIC_ADMIN` to view/manage and `DOCTOR`
  to view only. Organization Owner/Admin membership establishes organization
  context but grants neither tenant permission implicitly; the actor must also
  hold the applicable tenant RBAC assignment. Existing custom-role assignment
  may grant either permission and cannot bypass organization/tenant scope.
- Adding the two permission catalogue/seed entries is an implementation
  responsibility; their codes and default-role policy are constitutional here.
- Organization audit, organization idempotency, and SQLAlchemy UoW are reused.
- Platform Audit, runtime contact/ownership verification strategies, and
  verification evidence are not involved in TG20 execution.

## 13. Future implementation responsibilities

The following are bounded implementation responsibilities, **not new
constitutional decisions**:

### Backend

- Domain: implement `WorkspacePreparation`, unit/evidence/value objects, events,
  state transitions, safe reasons, concurrency version, and typed failures.
- Repositories: add `IWorkspacePreparationRepository` and one SQLAlchemy adapter;
  extend the existing UoW registration. Do not add repositories for audit,
  idempotency, tenant, RBAC, template, or provisioning.
- Services: implement executor/ensure, query, retry, and internal recovery
  application services using existing owners.
- Authorization: add the two bounded tenant permission entries from §12 through
  the existing RBAC catalogue/seed/migration convention; do not create a new
  role or capability system.
- Adapters: implement narrow tenant/access/onboarding-foundation evidence adapters
  over existing repositories/services. No general worker/queue framework.
- Persistence: add exactly one aggregate model/table and one append-only event
  model/table, execution-claim fields, and migration-owned permission catalogue
  rows/default mappings through the single additive Alembic migration frozen in
  `final-authorization-contracts.md` §4.2.
- Transport/DI: add status, ensure, and retry schemas/routes through existing
  onboarding router/dependency patterns, using Platform Foundation authorization
  and safe typed errors.
- Tests: domain, adapter, repository, PostgreSQL, migration, concurrency,
  idempotency, audit/rollback, authorization/isolation, transport, restart,
  legacy/no-run, downgrade/re-upgrade, and regression tests.

### Frontend

- Domain: implement Version 1 projection/view model and safe error mapping.
- Data: extend existing onboarding repository interface/implementation,
  datasource, DTO mapping, and identity/tenant/version query keys.
- Feature: add one Workspace Preparation surface and orchestration hook within
  existing onboarding navigation; do not add an API client, repository layer,
  global store, or alternate navigation.
- Reuse TG19 session/tenant cleanup, TG18 status/progress/card primitives, auth,
  React Query, central Theme/icons, accessibility patterns, and error tokens.
- Localization: add parity keys in `en-US` and `hi-IN` for the closed catalogue.
- Tests: real hook, datasource/repository delegation, all states/units/reasons,
  fast completion, refresh, retry/replay, stale response, tenant switch/logout,
  navigation equality gate, Theme, localization, and accessibility.

### Migration and release

- Select the actual migration predecessor at implementation time.
- Verify isolated PostgreSQL fresh upgrade/current/downgrade/re-upgrade and zero
  TG20-owned drift; Supabase remains runtime authority.
- Release behind a TG20 behavior flag only if the existing feature-flag framework
  is reused. The flag gates UI/transport availability and never authorization.
- Staging verifies actual New Clinic, Bring Your Clinic, legacy, fast-complete,
  reconciliation, retry, multi-clinic, restart, and rollback journeys.

Exact source-derived file boundaries, permission reuse, and test commands are
fixed by `tasks.md` as reconciled by `final-authorization-contracts.md`. They may
not be chosen or expanded during implementation.

## 14. Cross-contract invariants

1. Supabase Authentication/PostgreSQL/session metadata remain authoritative.
2. Organization is the root business entity; clinic association and effective
   tenant are Platform Foundation authority.
3. TG20 never creates/duplicates a tenant or organization association.
4. Executor is the sole lifecycle writer; aggregate persistence is source of truth.
5. Progress is committed evidence only and cannot be fabricated.
6. Query does not mutate; ensure/retry are explicit idempotent commands.
7. Existing repositories/services are reused through ports; no direct table
   mutation across ownership boundaries.
8. Application services own transactions; repositories flush without commit.
9. Organization audit is append-only and atomic with protected transitions.
10. Frontend never bypasses repositories or authoritative tenant validation.
11. Preparation availability is not readiness, capability visibility, clinical
    configuration, or commercial activation.
12. Versioning is additive and independent of Journey/draft schema versions.
13. Unknown/legacy/no-run states fail safe and use lazy authoritative ensure.
14. Clinical flows remain downstream and out of scope.

## 15. Constitutional closure

These contracts resolve the readiness review's eight blockers:

| Blocker | Resolution |
|---|---|
| Authoritative work definition | Four closed Version 1 foundation units in §2. |
| Execution owner/contract | Sole request-driven resumable executor in §3. |
| Aggregate initialization | Universal idempotent lazy `ensure` in §5. |
| Retry contract | Unit-scoped, max-three, non-provisioning retry in §6. |
| Persistence contract | Exact logical tables/fields/constraints/history/migration rules in §7. |
| Concurrency | Initialization, claims, retry races, stale response, ordering rules in §8. |
| Legacy/no-run | Universal observe/reconcile without synthetic backfill in §9. |
| Downgrade/rollback | Transaction, release, schema, interruption, forward-compatibility rules in §10. |

No additional constitutional ambiguity is known. Implementation remains
unauthorized until a readiness re-review verifies exact repository fit,
permission reuse, file boundaries, migration head, and independent task gates.
