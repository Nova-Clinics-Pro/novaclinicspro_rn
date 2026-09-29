# TG20 Final Authorization Contracts

Status: **CONSTITUTIONAL**

Version: **1.0**

Scope: **AUTH-1 through AUTH-4 closure for E3 / TG20**

Date: **2026-07-21**

## 1. Authority

This document closes the four blockers recorded by
`implementation-authorization.md`. It is an implementation contract, not an
implementation. If another TG20 document conflicts with this document on
template resolution, execution claims, authorization, migration composition, or
checkpoint boundaries, this document controls.

No model, migration, repository, route, service, hook, screen, or test is
created or authorized by this document. A separate final authorization re-review
must authorize TG20 before TG20.0 begins.

## 2. AUTH-1 — Onboarding Foundation ownership

### 2.1 Version 1 decision

`ONBOARDING_FOUNDATION` is **read-only template verification and resolution**.
The Workspace Preparation executor does not assign, materialize, create, update,
or otherwise mutate an onboarding template.

The authoritative owner is the existing onboarding template boundary:

- application owner: `app/application/services/onboarding_service.py`, method
  `OnboardingService.get_onboarding_status()`;
- repository port: `app/domain/repositories/i_template_repository.py`;
- repository adapter: `SQLAlchemyTemplateRepository` in
  `app/infrastructure/repositories/sqlalchemy_repositories.py`;
- exact repository operations, in order:
  `TemplateRepository.get_tenant(tenant_id)`,
  `TemplateRepository.get_template_by_clinic_type(tenant.clinic_type)`, then
  `TemplateRepository.get_template_by_clinic_type("general")` only when the
  clinic-type lookup returns no active template;
- setup-step verification:
  `TemplateRepository.get_setup_steps(resolved_template.code)`.

The executor must consume this resolution through a narrow read-only evidence
adapter. It must not use the legacy `user_context.is_org_admin` check as TG20
authority; TG20 authorization is completed before the adapter is invoked.

### 2.2 Success and evidence

The unit succeeds when the tenant exists and an active clinic-type template or
the active `general` fallback resolves with a non-empty canonical template code
and setup-step resolution completes. Zero returned setup steps is valid evidence
of template resolution; it is not setup completion.

Evidence contains only:

- `unit_code = ONBOARDING_FOUNDATION`;
- `source_type = onboarding_template_service`;
- `source_reference = resolved template UUID`;
- `resolution = CLINIC_TYPE | GENERAL_FALLBACK`;
- `template_code` as the bounded canonical code;
- `outcome = SATISFIED`;
- server-generated `observed_at`, `recorded_at`, attempt, and correlation ID.

Template payloads, setup-progress values, contact data, and user-visible template
content are prohibited evidence.

### 2.3 Failure catalogue

| Condition | State | Safe reason | Next action |
|---|---|---|---|
| Tenant absent/inactive or association invalid | `TERMINAL_FAILURE` | `TENANT_INELIGIBLE` or `ASSOCIATION_INACTIVE` | `CONTACT_SUPPORT` |
| Neither clinic-type nor `general` template exists | `TERMINAL_FAILURE` | `ONBOARDING_TEMPLATE_UNAVAILABLE` | `CONTACT_SUPPORT` |
| Resolved template has no canonical code | `TERMINAL_FAILURE` | `ONBOARDING_TEMPLATE_INVALID` | `CONTACT_SUPPORT` |
| Database/transport timeout before an authoritative result | `RETRYABLE_FAILURE` | `TRANSIENT_DEPENDENCY_FAILURE` | `RETRY` |
| Transaction/optimistic conflict | reload/reconcile, then `RETRYABLE_FAILURE` if unresolved | `TRANSACTION_CONFLICT` | `RETRY` |

Raw repository or HTTP exception text is never projected. The completion audit
event is `workspace_preparation.unit_completed`; terminal and retryable failures
use the corresponding existing Workspace Preparation audit events with safe
unit/reason/correlation metadata.

### 2.4 No-mutation boundary

TG20 must not call template create/update, invent assignment state, fabricate a
fallback, create setup progress, or mark a setup step complete. Retry repeats
read-only resolution only. A future assignment/materialization capability
requires its own approved product and architecture contract.

## 3. AUTH-2 — Execution claim and restart protocol

### 3.1 Persisted claim

`org_workspace_preparations` owns these exact claim fields:

| Field | Type | Nullability/default |
|---|---|---|
| `execution_claim_token` | PostgreSQL UUID | nullable |
| `execution_claimed_by` | `varchar(128)` | nullable |
| `execution_claimed_at` | `timestamptz` | nullable |
| `execution_lease_expires_at` | `timestamptz` | nullable |
| `execution_claim_generation` | integer | non-null, default `0` |

`execution_claimed_by` is `<service-name>:<runtime-instance-uuid>`; Version 1
uses service name `workspace-preparation`. The instance UUID is server-generated
per process start. The claim token is a cryptographically opaque UUID generated
for each acquisition or renewal and must never be accepted from a client.

Server/database time (`clock_timestamp()`/database-returned UTC) is the only
clock authority. Client time and in-memory-only leases are prohibited.

### 3.2 Duration

- default lease: **30 seconds**;
- renewal threshold: at or before **10 seconds** remaining;
- maximum lease granted by one acquire/renew operation: **60 seconds**;
- no unit mutation begins unless the remaining lease covers the bounded unit
  transaction or a renewal succeeds first.

Changing these bounds requires an approved TG20 contract revision.

### 3.3 Acquisition

Within one application-owned transaction, the repository:

1. selects the current run `FOR UPDATE`;
2. verifies executable state (`PENDING`, `PREPARING`, or an authorized retry
   transition), scope, contract version, and expected `aggregate_version`;
3. verifies there is no unexpired claim, or that the existing claim is expired;
4. writes a new token/owner/database claim time/expiry, increments
   `execution_claim_generation` and `aggregate_version` exactly once;
5. flushes without committing; the application service commits.

An unexpired claim returns the current projection without executing a second
writer. An expired claim is reclaimed by the same transaction. Reclaim records
safe `EXECUTION_INTERRUPTED` evidence/audit classification; timeout never means
completion.

### 3.4 Renewal, mutation, and stale rejection

Renewal requires exact run ID, claim token, claim generation, claimant owner,
and aggregate version under row lock. Renewal generates a new opaque token,
advances claim generation and aggregate version, and sets a new database-time
expiry. The prior token becomes invalid immediately.

Every unit mutation, evidence append, history append, and organization-audit
write must verify the current token/generation/owner and an unexpired lease in
the same transaction. A mismatch or expiry is a typed stale-claim conflict; it
rolls back and cannot write evidence or repeat a mutation until authoritative
state is reloaded.

### 3.5 Release and terminal behavior

Normal release clears token, owner, claimed-at, and expiry while retaining claim
generation. Unit completion may release the claim before the next unit; a new
claim is required for later work. `PERSONALIZATION_AVAILABLE`,
`RETRYABLE_FAILURE`, and `TERMINAL_FAILURE` must have no active claim.
Completion/failure transition and claim clearing occur atomically.

Request cancellation stops observation and prevents the executor from starting
the next unit when observable. It does not undo committed work or allow a client
to release a server claim. A process crash leaves a claim to expire. The next
eligible `ensure` transaction reclaims it and resumes at the first ordered unit
without currently valid completion evidence.

User retry can acquire only after the authorized
`RETRYABLE_FAILURE → PREPARING` transition. It never bypasses the maximum-three
retry contract or reruns TG19 provisioning.

### 3.6 Claim constraints and indexes

- `ck_org_workspace_preparations_claim_bundle`: token, owner, claimed-at, and
  expiry are either all null or all non-null; owner is non-empty; expiry is
  greater than claimed-at.
- `ck_org_workspace_preparations_claim_generation`: generation is `>= 0`.
- `ix_org_workspace_preparations_claim_expiry`: btree
  `(execution_lease_expires_at, id)` with predicate
  `execution_claim_token IS NOT NULL AND state = 'PREPARING'`.

PostgreSQL row locking and aggregate-version compare-and-swap are both required;
neither substitutes for the other.

## 4. AUTH-3 — Authorization composition

### 4.1 Permission decisions

| Code | Name | Description | Module |
|---|---|---|---|
| `onboarding.workspace_preparation.view` | View Workspace Preparation | View authoritative workspace-preparation status and evidence-safe progress | `onboarding` |
| `onboarding.workspace_preparation.manage` | Manage Workspace Preparation | Ensure or retry workspace preparation for the effective clinic | `onboarding` |

The repository identifier strategy is the existing database-generated UUID for
`org_permissions`; immutable permission `code` is the deterministic identity.
No hard-coded permission UUID is introduced.

Authorization composes, in order:

1. Supabase-authenticated principal;
2. active organization membership;
3. active organization-clinic association;
4. requested tenant equals Platform Foundation effective tenant;
5. existing tenant RBAC permission decision.

Organization membership establishes organization context only. It never grants
the tenant permission by itself. No role-name boolean and no `is_org_admin`
shortcut is allowed.

Current repository role codes are authoritative:

- `CLINIC_OWNER`: view + manage;
- `CLINIC_ADMIN`: view + manage;
- `DOCTOR`: view only;
- custom tenant roles: either permission only through existing RBAC assignment;
- organization membership roles `organization_owner` and
  `organization_administrator`: no implicit tenant grant; they must also hold an
  applicable tenant role/permission for the effective tenant.

The Product persona “Clinic Administrator” maps to `CLINIC_ADMIN`.
Organization Owner/Admin personas map to Platform Foundation membership roles
plus their actual tenant RBAC assignment; no new runtime role is invented.

### 4.2 Exact migration composition

TG20 uses **one additive Alembic revision** after the branch head selected at
TG20.1 implementation time. One revision follows the repository precedent of
creating schema and migration-owned RBAC catalogue rows atomically. It contains
both tables, all claim fields/indexes/constraints, two permission rows, and the
three default role mappings above. Runtime seed insertion is prohibited.

#### `org_workspace_preparations`

Exact columns:

- `id uuid primary key default gen_random_uuid()`;
- `organization_tenant_id uuid not null` FK
  `org_organization_tenants.id ON DELETE RESTRICT`;
- `organization_id uuid not null` FK `org_organizations.id ON DELETE RESTRICT`;
- `tenant_id uuid not null` FK `org_tenants.id ON DELETE RESTRICT`;
- `contract_version varchar(32) not null`;
- `state varchar(40) not null`;
- `attempt integer not null default 0`;
- `user_retry_count integer not null default 0`;
- `max_user_retries integer not null default 3`;
- `units jsonb not null default '{}'::jsonb`;
- `reason_code varchar(64) null`;
- `retry_allowed boolean not null default false`;
- `last_retry_operation_id uuid null` FK
  `org_idempotency_records.id ON DELETE SET NULL`;
- `execution_correlation_id uuid not null`;
- `aggregate_version integer not null default 1`;
- the five claim fields in §3.1;
- `created_at timestamptz not null default now()`;
- `started_at`, `completed_at`, `superseded_at` nullable `timestamptz`;
- `updated_at timestamptz not null default now()`.

Exact constraints/indexes:

- `ck_org_workspace_preparations_state`: the five approved states;
- `ck_org_workspace_preparations_counters`: attempt/retry counts non-negative,
  retry count `<= max_user_retries`, and `max_user_retries = 3`;
- `ck_org_workspace_preparations_aggregate_version`: version `> 0`;
- `ck_org_workspace_preparations_units_object`:
  `jsonb_typeof(units) = 'object'`;
- `ck_org_workspace_preparations_timestamps`: completed-at is non-null exactly
  for terminal/personalization states and is not before created-at;
- both claim checks from §3.6;
- `uq_org_workspace_preparations_current`: unique btree
  `(organization_tenant_id, contract_version)` where `superseded_at IS NULL`;
- `ix_org_workspace_preparations_scope_current`: btree
  `(organization_id, tenant_id, contract_version)` where
  `superseded_at IS NULL`;
- `ix_org_workspace_preparations_association`: btree
  `(organization_tenant_id, created_at)`;
- `ix_org_workspace_preparations_retryable`: btree
  `(organization_id, tenant_id, updated_at)` where
  `state = 'RETRYABLE_FAILURE' AND retry_allowed = true`;
- claim-expiry index from §3.6.

Association/organization/tenant consistency is verified through the locked
association repository before insert/update; PostgreSQL FKs separately enforce
existence.

#### `org_workspace_preparation_events`

Exact columns:

- `id uuid primary key default gen_random_uuid()`;
- `preparation_id uuid not null` FK
  `org_workspace_preparations.id ON DELETE RESTRICT`;
- `sequence integer not null`;
- `event_type varchar(80) not null`;
- `from_state varchar(40) null`, `to_state varchar(40) not null`;
- `unit_code varchar(48) null`;
- `attempt integer not null`;
- `outcome varchar(48) not null`;
- `reason_code varchar(64) null`;
- `actor_type varchar(32) not null`;
- `actor_principal_id uuid null`;
- `idempotency_operation_id uuid null` FK
  `org_idempotency_records.id ON DELETE SET NULL`;
- `correlation_id uuid not null`;
- `source_event_id varchar(128) null`;
- `safe_metadata jsonb not null default '{}'::jsonb`;
- `created_at timestamptz not null default now()`.

Exact constraints/indexes:

- `uq_org_workspace_preparation_events_sequence` unique
  `(preparation_id, sequence)`; the repository allocates the next sequence while
  holding the preparation row lock;
- `uq_org_workspace_preparation_events_source` unique
  `(preparation_id, source_event_id)` where `source_event_id IS NOT NULL`;
- `ck_org_workspace_preparation_events_sequence` sequence `> 0`;
- `ck_org_workspace_preparation_events_attempt` attempt `>= 0`;
- `ck_org_workspace_preparation_events_metadata_object` requires a JSON object;
- `ix_org_workspace_preparation_events_created` btree
  `(preparation_id, created_at, sequence)`.

Events are append-only. No normal update/delete repository method is permitted.

### 4.3 Permission rows and downgrade

Upgrade inserts the two permission rows with `ON CONFLICT (code) DO NOTHING`,
then inserts mappings for `CLINIC_OWNER` and `CLINIC_ADMIN` to both permissions
and `DOCTOR` to view only, using the existing `org_roles`/`org_permissions`
select pattern and mapping uniqueness.

Downgrade is fail-closed if any nonterminal preparation exists. After execution
is disabled and retention prerequisites are satisfied, it:

1. deletes only TG20 `org_role_permissions` mappings;
2. deletes only the two TG20 permission rows;
3. drops event indexes/table;
4. drops aggregate indexes/table.

No existing permission, role, organization, tenant, association, audit, or
idempotency row is changed. There is no backfill. Legacy and TG19 clinics lazily
initialize through `ensure` after upgrade. Historical migrations are untouched.

## 5. AUTH-4 — Executable checkpoint constitution

`tasks.md` is the controlling checkpoint matrix and must include, for TG20.0
through TG20.7, objective, prerequisites, source-derived allowed/prohibited
files, dependencies, schema impact, responsibilities, exact focused tests and
commands, measurable exit criteria, recovery, stop conditions, commit boundary,
and post-push synchronization.

The immutable implementation order is:

`TG20.0 → TG20.1 → TG20.2 → TG20.3 → TG20.4 → TG20.5 → TG20.6 → TG20.7`.

Each checkpoint is separately reviewed, committed, pushed, and synchronized
`0 0` before its successor. No checkpoint may absorb work assigned to a later
checkpoint. The exact boundaries are:

1. TG20.0: documentation/source/reuse proof only;
2. TG20.1: domain and persistence, including the single migration;
3. TG20.2: executor and query;
4. TG20.3: retry and backend transport;
5. TG20.4: frontend domain and data;
6. TG20.5: frontend orchestration and presentation;
7. TG20.6: cross-layer verification and narrowly required TG20-owned fixes;
8. TG20.7: final acceptance documentation.

Unrelated modules, TG21+, clinical workflows, financials, inventory, CRM, and
Platform Foundation redesign are prohibited in every checkpoint.

## 6. Reconciliation decisions

The following earlier statements are superseded:

- any permission for template assignment/materialization in
  `ONBOARDING_FOUNDATION`;
- any implication that Organization Owner/Admin membership grants TG20 tenant
  permissions without an actual tenant RBAC assignment;
- any default denial of view to `DOCTOR`;
- any unspecified “bounded lease” or in-memory claim;
- any ambiguity about one versus two migrations;
- any task group that delegates its file/test/rollback/stop boundary to coding.

The closed Version 1 safe-reason catalogue adds
`ONBOARDING_TEMPLATE_UNAVAILABLE` and `ONBOARDING_TEMPLATE_INVALID`.

## 7. Closure

AUTH-1 through AUTH-4 are constitutionally closed. Repository evidence supports
read-only onboarding template resolution, database-persisted execution claims,
existing tenant RBAC composition, one migration, and the checkpoint ordering
above. No new Platform Foundation or Product Architecture ADR is required.

Implementation remains prohibited pending the separately requested TG20 final
implementation authorization re-review.
