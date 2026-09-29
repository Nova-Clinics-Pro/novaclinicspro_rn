# TG20 Final Implementation Authorization

Status: **APPROVED FOR TG20.0 ONLY**

Date: **2026-07-21**

Controlling planning commit reviewed: `f5d69d1e`

Decision: **TG20.0 IMPLEMENTATION AUTHORIZED**

## 1. Controlling decision

TG20.0 may begin as the documentation-only Source and Reuse Proof checkpoint
defined by `tasks.md`. AUTH-1 through AUTH-4 are closed, the constitutional
documents are internally consistent under the precedence declared in
`final-authorization-contracts.md`, and current source supplies every existing
ownership/reuse seam that TG20.0 must inventory.

This authorization does not authorize product source changes, tests, models,
migrations, APIs, services, hooks, screens, or TG20.1–TG20.7. Each later
checkpoint remains gated by completion, commit, push, and `0 0` synchronization
of its predecessor and by its own explicit authorization.

Where the historical `implementation-readiness.md` or
`implementation-authorization.md` describes an unresolved blocker, its dated
closure notice and `final-authorization-contracts.md` control. Those historical
findings are retained for traceability and do not override this decision.

## 2. Evidence reviewed

The complete TG20 package was reviewed:

- Vision, requirements, architecture, design, domain model, dependency map, and
  sequence diagrams;
- acceptance strategy and executable tasks;
- historical implementation readiness and authorization decisions;
- operational contracts and final AUTH-1 through AUTH-4 contracts.

Upstream constitutional evidence reviewed:

- Nova Product Architecture;
- Nova Platform Foundation Architecture;
- TG19 Final Acceptance;
- applicable ADR-PF organization association, idempotency, transaction,
  effective-tenant, audit, verification-strategy, and authority decisions.

Current backend evidence reviewed includes:

- `OnboardingService.get_onboarding_status()`;
- `TemplateRepository` and `SQLAlchemyTemplateRepository`;
- onboarding/Clinic Entry/provisioning ownership;
- organization membership/association/effective-tenant services and models;
- organization idempotency and organization audit repositories;
- guarded SQLAlchemy UoW and model registry;
- RBAC catalogue/role migrations and the existing permission-migration pattern;
- current Alembic migration graph files and PostgreSQL model conventions.

Current frontend evidence reviewed includes:

- onboarding domain repository, API datasource, DTO, repository implementation,
  query keys, and React Query hooks;
- Clinic Entry orchestration and effective-tenant/session cleanup;
- onboarding routes/navigation and TG18 journey/status/progress components;
- central Theme/icon usage;
- `en-US` and `hi-IN` localization framework;
- focused onboarding test conventions.

The accepted local pre-check evidence is: both dedicated worktrees clean, on
`feature/progressive-experience-recovery`, cached `HEAD...origin = 0 0`, and no
merge, rebase, or cherry-pick in progress. Per the governing prompt, no
credential-dependent fetch was repeated.

## 3. AUTH-1 verification — Onboarding Foundation

Result: **PASS**

Current source matches the frozen Version 1 behavior:

1. `OnboardingService.get_onboarding_status()` loads the tenant through
   `TemplateRepository.get_tenant(tenant_id)`.
2. It requests the active clinic-type template through
   `get_template_by_clinic_type(tenant.clinic_type)`.
3. Only when absent, it requests the active `general` template.
4. It fails when neither exists and fails when the resolved template has no
   canonical code.
5. It resolves setup steps read-only through `get_setup_steps(template_code)`.

No template assignment/materialization service or aggregate exists. TG20 must
not invent one. The evidence adapter records only the resolved template identity,
resolution class, bounded template code, outcome, server timestamps, attempt,
and correlation. It excludes template payload and setup progress.

Missing clinic-type plus `general` is deterministically terminal as
`ONBOARDING_TEMPLATE_UNAVAILABLE`; missing canonical code is terminal as
`ONBOARDING_TEMPLATE_INVALID`. Dependency timeout is retryable. Retry repeats
read-only resolution and never creates or mutates a template or progress row.

AUTH-1 therefore has no ownership, evidence, failure, or retry ambiguity.

## 4. AUTH-2 verification — Execution claim

Result: **PASS**

The persisted claim contract fully freezes:

- opaque server-generated UUID token;
- `<service-name>:<runtime-instance-uuid>` owner;
- monotonically increasing generation;
- database-generated claim and expiry timestamps;
- 30-second default lease, 10-second renewal threshold, and 60-second maximum;
- row-locked acquisition with expected aggregate version;
- renewal that replaces the token and increments claim generation/version;
- atomic release/invalidating clear on unit completion or failure;
- transactional reclaim of expired claims;
- exact token/generation/owner/version/unexpired checks on every unit, evidence,
  history, and audit mutation;
- typed rejection of stale tokens/versions;
- crash recovery through expiry and request-driven reclaim;
- restart at the first ordered unit without valid completion evidence;
- request cancellation as observation cancellation only;
- exact claim bundle/generation checks and claim-expiry partial index.

PostgreSQL row locking and aggregate-version compare-and-swap are both required.
Database/server time is authoritative. Client clocks, client claim tokens, and
in-memory-only leases are prohibited. No restart or concurrency decision remains
for implementation to invent.

## 5. AUTH-3 verification — Authorization and migration

Result: **PASS**

Authorization composition is deterministic and matches current Platform
Foundation/RBAC boundaries:

1. existing Supabase-authenticated principal;
2. active organization membership;
3. active organization-tenant association;
4. requested tenant equal to authoritative effective tenant;
5. existing tenant RBAC permission evaluation.

Organization membership establishes context and never substitutes for tenant
RBAC. The current role catalogue confirms these real codes:

- `CLINIC_OWNER`: view + manage;
- `CLINIC_ADMIN`: view + manage;
- `DOCTOR`: view only;
- custom roles: either permission through existing RBAC assignment only.

Organization Owner/Administrator membership has no implicit tenant grant. No
`is_org_admin`, role-name boolean, alternate capability, or authorization
shortcut is permitted.

The exact permission catalogue rows are frozen:

- `onboarding.workspace_preparation.view`;
- `onboarding.workspace_preparation.manage`.

Permission code is the deterministic identity; existing database-generated UUIDs
remain the repository identifier strategy. Catalogue rows and default mappings
are migration-owned, never runtime seeded.

### Migration authorization summary

The constitutional migration plan is **exactly one additive TG20 Alembic
revision**, ordered after the branch head confirmed by TG20.0 and implemented
only in TG20.1 after its separate authorization.

That single revision owns:

- `org_workspace_preparations`;
- `org_workspace_preparation_events`;
- all aggregate, lifecycle, optimistic-version, and five execution-claim fields;
- exact foreign keys, checks, partial uniqueness, and indexes frozen in
  `final-authorization-contracts.md` §4.2;
- the two permission catalogue rows;
- view/manage mappings for `CLINIC_OWNER` and `CLINIC_ADMIN`;
- view-only mapping for `DOCTOR`.

Current-run uniqueness is
`(organization_tenant_id, contract_version)` where `superseded_at IS NULL`.
Event order is unique `(preparation_id, sequence)` allocated under the locked
aggregate, with optional source-event deduplication. Optimistic updates require
`id + aggregate_version`. Claim lookup uses
`(execution_lease_expires_at, id)` for claimed `PREPARING` rows. Retryable lookup
uses `(organization_id, tenant_id, updated_at)` for retryable/allowed rows.

Downgrade is fail-closed while any nonterminal run exists and requires execution
disabled plus retention prerequisites. It removes TG20 role mappings, TG20
permission rows, event indexes/table, then aggregate indexes/table. It changes
no historical migration or existing platform data. There is no backfill and no
inferred completion; all eligible clinics lazily initialize through `ensure`.

The migration count, contents, ownership, ordering rule, predicates, seed
ownership, and downgrade sequence are constitutionally complete. TG20.0 records
the current head but creates no revision.

## 6. AUTH-4 verification — Checkpoint boundaries

Result: **PASS**

Every group TG20.0–TG20.7 specifies all fourteen required controls:

1. objective;
2. preconditions;
3. allowed files or source-derived directories;
4. prohibited files;
5. dependencies;
6. schema/migration impact;
7. responsibilities;
8. focused tests;
9. commands;
10. measurable exit criteria;
11. rollback or forward recovery;
12. stop conditions;
13. commit boundary;
14. push and synchronization gate.

The immutable order is:

`TG20.0 → TG20.1 → TG20.2 → TG20.3 → TG20.4 → TG20.5 → TG20.6 → TG20.7`.

TG20.0 is independently executable because it changes documentation only. It
must produce the source ownership/reuse proof, exact file matrix, template and
RBAC evidence, cached migration-head evidence, and final downstream checkpoint
boundaries. It introduces no product source, schema, API, UI, or tests.

Later tasks are constitutionally bounded but are not authorized for immediate
execution by this review. Their allowed source-derived directories become exact
file matrices through TG20.0; if source contradicts the contracts, TG20.0 stops
instead of making an architectural decision.

## 7. Product Architecture compliance

Result: **PASS**

TG20 remains a Progressive Experience product module and consumes rather than
redefines Platform Foundation. It preserves separate ownership for tenant
provisioning, Clinic Entry, organization/tenant context, Journey, capability
visibility, readiness, clinical workspaces, and commercial behavior.

Clean Architecture direction is preserved: frontend presentation uses one
orchestration hook and existing repository/datasource boundaries; backend
transport delegates to application services; application services use domain
ports/UoW; adapters implement ports; repositories flush without owning commit.

TG20 does not absorb TG21 capability visibility, TG22 Ready to Start, TG26+
commercial behavior, Doctor Module, clinical workflows, scheduling, financials,
inventory, CRM, reports, or integrations.

## 8. Platform Foundation compliance

Result: **PASS**

TG20 reuses accepted organization and membership authority, active association,
effective tenant, tenant RBAC, organization audit, organization idempotency,
typed errors, repository ports, and application-owned UoW transactions.

Organization-scoped preparation events use organization audit; Platform Audit
is not duplicated or misused. TG20 creates no alternate identity, organization,
tenant, membership, verification, audit, idempotency, capability, or transaction
system. Tenant and organization isolation are mandatory at repository, service,
transport, query-key, cache, retry, and audit boundaries.

## 9. Supabase authority confirmation

Result: **PASS**

Implementation planning keeps these authorities unchanged:

- existing Supabase Authentication;
- existing `.env` runtime configuration;
- existing Platform Foundation identity/session context;
- existing Supabase PostgreSQL database and migration configuration.

TG20 is not authorized to introduce or assume:

- a local PostgreSQL runtime;
- a Docker PostgreSQL runtime;
- SQLite;
- an alternate authentication or identity provider;
- an alternate organization or tenant system;
- an alternate audit, idempotency, or transaction boundary.

Migration and transaction verification must use the existing configured
Supabase PostgreSQL test/integration authority or an explicitly approved
isolated database reached through the repository's existing configuration. A
verification database is not a new runtime authority and must not change `.env`
ownership.

## 10. TG20.0 exact authorization

TG20.0 may modify only `frontend/docs/TG20/` to create its source/reuse evidence
document and minimum factual cross-references. It must not modify any backend or
frontend product source, tests, migrations, dependency manifests, ADRs, Product
Architecture, Platform Foundation Architecture, or documentation outside the
TG20 package.

TG20.0 must:

- verify both dedicated worktrees and controlling contracts;
- cite exact current template-resolution owners/methods;
- cite exact RBAC catalogue/migration conventions and role codes;
- record the current single Alembic head without creating a migration;
- inventory reusable UoW, audit, idempotency, authorization, router, repository,
  datasource, React Query, navigation, Theme, localization, accessibility, and
  cleanup assets;
- produce the exact existing/new file and focused-test matrix for TG20.1–TG20.5;
- preserve the checkpoint order and all constitutional boundaries;
- stop on any source contradiction or undocumented decision;
- pass `git diff --check`, commit only documentation, push the feature branch,
  and restore both repositories to clean synchronized `0 0` before TG20.1.

TG20.0 creates no model, repository, migration, API, service, hook, screen, test,
or product behavior.

## 11. TG20.1–TG20.7 status

| Checkpoint | Constitutional status | Immediate execution |
|---|---|---|
| TG20.1 — Domain and persistence | Contract complete; depends on TG20.0 proof | **NOT AUTHORIZED** |
| TG20.2 — Executor and query | Contract complete; depends on TG20.1 | **NOT AUTHORIZED** |
| TG20.3 — Retry and transport | Contract complete; depends on TG20.2 | **NOT AUTHORIZED** |
| TG20.4 — Frontend domain and data | Contract complete; depends on TG20.3 | **NOT AUTHORIZED** |
| TG20.5 — Frontend orchestration/presentation | Contract complete; depends on TG20.4 | **NOT AUTHORIZED** |
| TG20.6 — Cross-layer verification | Contract complete; depends on TG20.1–5 | **NOT AUTHORIZED** |
| TG20.7 — Final acceptance | Contract complete; depends on TG20.6 | **NOT AUTHORIZED** |

No later checkpoint may start merely because TG20.0 is authorized.

## 12. Prohibited implementation shortcuts

TG20.0 and every later review must prohibit:

- product source changes during TG20.0;
- fabricated progress, elapsed-time completion, or client-owned truth;
- template assignment/materialization or setup-progress mutation;
- in-memory/client-time execution leases;
- stale claim writes or optimistic-version bypass;
- full tenant provisioning, Clinic Entry, association, or verification replay;
- `is_org_admin`, role-name boolean, or implicit organization-role tenant grant;
- runtime permission seeds or a second/unapproved migration;
- direct frontend networking, new global store, alternate repository/client, or
  tenant-insufficient query keys;
- bypass of UoW, organization audit/idempotency, typed errors, Theme,
  localization, or accessibility;
- local/Docker/SQLite runtime authority;
- TG21+, clinical, financial, inventory, CRM, report, integration, or commercial
  scope expansion.

## 13. Rollback and acceptance governance

TG20.0 rollback is documentation-only: revert uncommitted TG20.0 edits or issue
a reviewed correction commit. It creates no runtime or database state.

Each later checkpoint must use its task-specific rollback/forward-recovery rule.
Ordinary code rollback leaves additive TG20 tables intact. A future schema
downgrade follows the fail-closed sequence only after execution is disabled and
retention requirements are satisfied.

Final acceptance must trace and classify every TG20 functional/non-functional,
optional, future, and out-of-scope requirement. It must verify domain,
PostgreSQL, transport, security, tenant isolation, concurrency, restart,
idempotency, audit rollback, frontend orchestration, Theme, English/Hindi,
accessibility, multi-clinic behavior, migrations, Supabase integration, and
TG18/TG19 regressions. It chooses exactly `TG20_ACCEPTED` or
`TG20_NOT_ACCEPTED`; it does not automatically authorize TG21.

## 14. Remaining blockers

No constitutional blocker remains for TG20.0. TG20.0 itself is the required
source/reuse proof and exact-file-boundary gate before any product implementation.

## 15. Final authorization

**TG20.0 IMPLEMENTATION AUTHORIZED**
