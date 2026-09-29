# TG20 Final Implementation Authorization Review

Date: 2026-07-21

Branch: `feature/progressive-experience-recovery`

Decision: **TG20 IMPLEMENTATION NOT AUTHORIZED**

> **Post-review constitutional closure — 2026-07-21:**
> `final-authorization-contracts.md` closes AUTH-1 through AUTH-4 with the
> source-proven read-only onboarding-template boundary, database-persisted claim
> protocol, exact tenant-RBAC/migration composition, and independently
> executable TG20.0–TG20.7 task contract. The historical decision in this file
> remains the last authorization decision; implementation is still prohibited
> until a separately requested final authorization re-review supersedes it.

## 1. Controlling decision

TG20 implementation may not begin. The operational contracts resolve the
product intent and most lifecycle decisions, but repository inspection exposes
four remaining constitutional inconsistencies. Each affects behavior,
authorization, persistence, concurrency, or independently executable task
boundaries. Implementation cannot safely choose among the alternatives.

This document is the controlling implementation authorization decision. No
TG20.0/TG20.1 code, model, migration, repository, API, permission seed, frontend
feature, or test implementation is authorized until the blockers in §13 are
closed and this decision is superseded by an approved re-review.

## 2. Evidence reviewed

Documentation reviewed completely:

- TG20 Vision, requirements, architecture, design, tasks, acceptance,
  dependency map, domain model, sequence diagrams, implementation readiness,
  and operational contracts;
- Nova Product Architecture and Platform Foundation Architecture;
- TG19 Final Acceptance and accepted handoff evidence;
- relevant ADR-PF-004, 005, 006, 011, 015, 017 and the wider ADR-PF series.

Implementation evidence reviewed:

- synchronous tenant/RBAC/owner provisioning in
  `app/application/onboarding/tenant_provisioning_service.py`;
- Clinic Entry transaction and handoff in
  `app/application/onboarding/clinic_entry_service.py`;
- current onboarding router/schema/service/status/progress/template repositories;
- template clinic-type/general fallback in
  `app/application/services/onboarding_service.py`;
- idempotent RBAC seed and migration-owned organization permission catalogue in
  `app/infrastructure/db/seeds/rbac_seed.py`;
- current Platform Foundation authorization, effective-tenant, idempotency,
  audit, UoW, repositories, models, and Alembic patterns;
- current frontend onboarding datasource/repository, Choice/SetupWizardFlow,
  React Query, auth, navigation, tenant cleanup, Theme, localization, and tests.

## 3. Constitutional completeness matrix

| Area | Result | Review |
|---|---|---|
| Aggregate ownership | Complete | Progressive Experience owns one tenant/association-scoped aggregate; executor is sole lifecycle writer. |
| Lifecycle/states/invariants | Complete | Five states, four ordered units, evidence-only progress, terminal semantics, and version independence are explicit. |
| Executor ownership/invocation | Partial | Request-driven `ensure` is explicit, but execution-lease/restart mechanics are not persistable as specified. |
| Evidence/provenance/audit | Complete | Safe fields, unit evidence, retry evidence, organization audit events, and prohibited sensitive data are explicit. |
| Retry | Complete in principle | Authorization, idempotency, maximum three user retries, duplicate-provisioning prohibition, partial rollback, and terminal behavior are explicit. |
| Persistence/history | Partial | Two tables and logical fields exist, but required lease fields and exact index/constraint names are absent. |
| Concurrency | Partial | Optimistic version/race rules exist, but claim lease duration/ownership/recovery is undefined. |
| Legacy/no-run | Complete | Universal lazy ensure, no synthetic backfill, observe/reconcile, and version upgrade are explicit. |
| Downgrade/rollback | Complete in principle | Additive code rollback, fail-closed schema downgrade, interruption, and forward compatibility are explicit. |
| Authorization | Partial | Permission codes are named, but default-role/membership mapping and migration ownership conflict with current RBAC structures. |
| Frontend | Complete in principle | Repository/datasource/React Query/navigation/localization/accessibility/stale/retry rules are clear. |
| Backend | Partial | Services/ports/UoW/audit/errors are clear; one required onboarding reconciliation owner does not exist. |
| Migration | Not exact | Count/tables are stated, but permission seeding and exact indexes/constraints are not deterministically assigned. |
| Tasks | Not independently implementable | Exact files, per-group rollback, stop conditions, and acceptance exits remain incomplete. |

## 4. Domain review

The `WorkspacePreparation` aggregate belongs to TG20 if its operational units
are implementable through approved owners. Its identity, organization-tenant
scope, contract version, attempt/retry counters, safe unit evidence, reason,
next action, optimistic version, lifecycle timestamps, and terminal semantics are
coherent.

The state machine is deterministic:

`PENDING → PREPARING → PERSONALIZATION_AVAILABLE | RETRYABLE_FAILURE |
TERMINAL_FAILURE`, with authorized retry returning only
`RETRYABLE_FAILURE → PREPARING`.

Unknown versions/states fail safe. Preparation version remains independent of
Journey and draft-schema versions. No clinical, readiness, capability-visibility,
or commercial aggregate enters TG20.

Domain authorization remains withheld because `ONBOARDING_FOUNDATION` and the
execution lease have unresolved operational meaning (§13).

## 5. Persistence and migration review

The operational contract authorizes logically:

1. `org_workspace_preparations`;
2. append-only `org_workspace_preparation_events`;
3. one additive Alembic revision after the implementation-time head;
4. one current-run partial uniqueness rule;
5. optimistic concurrency, event ordering, tenant/association indexes, retryable
   operational lookup, safe downgrade, and no synthetic backfill.

That is insufficient for the final prompt's exact migration gate:

- restart/reconciliation relies on a “bounded execution lease,” but the aggregate
  fields contain no lease owner/token, acquisition time, expiry time, or claim
  generation;
- no lease duration or renewal/reclaim transaction is defined;
- index and constraint purposes are stated but exact names/column/order/predicate
  definitions are not frozen;
- the same implementation requires two new RBAC permission catalogue entries,
  while current repository evidence says organization permissions and role
  mappings are migration-seeded; the operational contract does not say whether
  those rows belong to the single TG20 revision, use deterministic identifiers,
  or require another revision.

Therefore exact migration count and contents are not authorized.

## 6. Executor review

The executor is correctly placed in the onboarding/Progressive Experience
application layer. Request-driven execution avoids inventing a queue/worker.
Unit-level application transactions, evidence validation, audit, cancellation of
observation rather than committed server work, and resumability are sound.

Two gaps remain:

1. The contract says a stale `PREPARING` run is reclaimed after a bounded lease,
   but does not define a persistable lease or claim protocol.
2. `ONBOARDING_FOUNDATION` permits reconciliation through an “existing approved
   template-assignment/materialization boundary.” Current source has no such
   boundary. `OnboardingService` reads a clinic-type template, falls back to
   `general`, and returns 404 when none exists; it does not assign/materialize a
   tenant template. Implementation must not decide whether V1 is read-only,
   introduces a new template owner, or changes fallback behavior.

## 7. Retry and failure review

The retry contract is otherwise complete:

- only current `RETRYABLE_FAILURE` run and authorized effective tenant;
- three user retries;
- organization-scoped idempotency and request fingerprint;
- same-intent replay and conflicting-intent rejection;
- optimistic winner for parallel retry;
- resume at first invalid unit;
- never rerun tenant creation, Clinic Entry, association, or verification;
- one unit mutation/evidence/audit transaction;
- retry exhaustion becomes terminal;
- internal recovery is separate from the public TG20 journey.

It remains unimplementable until the executor claim/lease and onboarding unit
owner are resolved.

## 8. Security review

The following are constitutionally complete:

- Supabase authentication and Platform Foundation tenant/organization authority;
- route tenant/effective tenant equality;
- active association requirement;
- no `is_org_admin` shortcut;
- organization-scoped idempotency/audit;
- immutable safe evidence/history;
- no raw exception, contact, verification evidence, credential, token,
  fingerprint, provider payload, or internal detail leakage;
- no duplicate tenant/association/provisioning;
- client cannot declare progress, completion, retry eligibility, or handoff.

Authorization is not deterministic because the operational contract names new
tenant permission codes but maps them to Product personas spanning two existing
authorization systems: Organization Owner/Admin membership roles and tenant
Clinic Administrator RBAC. Current tenant RBAC default roles are
`CLINIC_OWNER`, `CLINIC_ADMIN`, and `DOCTOR`, while organization membership
authorization is a separate Platform Foundation service. Exact composition,
permission catalogue rows, and default mappings must be frozen without creating
a boolean shortcut.

## 9. Frontend review

Frontend architecture is implementation-bounded once backend contracts close:

- extend existing onboarding repository/datasource and identity/organization/
  tenant/version query keys;
- add one domain projection, one orchestration hook, and one preparation surface;
- reuse React Query, TG19 tenant/session cleanup, existing navigation, TG18
  status/progress/card primitives, auth, Theme/icons, localization, and error
  tokens;
- implement explicit ensure, query, retry, fast-complete, pending/preparing,
  retryable/terminal, stale, unsupported, tenant switch/logout, and effective-
  tenant equality behavior;
- preserve English/Hindi parity, accessible progress/live/focus semantics, and
  no direct networking or new global store.

Exact frontend files and route ownership are not listed per task group, so no
frontend checkpoint is authorized yet.

## 10. Backend review

The proposed backend layering is correct: domain aggregate/value objects/errors,
one repository port/adapter, executor/query/retry services, narrow evidence
adapters, existing UoW/audit/idempotency/authorization, onboarding transport/DI,
and PostgreSQL persistence.

No general worker, alternate repository family, audit system, auth, tenant
resolver, or provisioning system is allowed.

Backend implementation remains blocked by the missing onboarding-foundation
owner, lease protocol, RBAC composition/migration decision, and absent exact
file/checkpoint boundary.

## 11. Task-group authorization review

| Group | Intended objective | Authorization |
|---|---|---|
| TG20.0 | Reuse/source audit and exact boundary | **Not authorized**; must close §13 and produce exact file/rollback matrix. |
| TG20.1 | Domain, repository, persistence | **Not authorized**; lease and migration contents are incomplete. |
| TG20.2 | Query, evidence adapter, read transport | **Not authorized**; onboarding-foundation owner is undefined. |
| TG20.3 | Retry service/transport | **Not authorized**; depends on TG20.1/2 and lease semantics. |
| TG20.4 | Frontend domain/data | **Not authorized**; backend projection/ensure routes are not finally frozen. |
| TG20.5 | Frontend presentation/orchestration | **Not authorized**; depends on TG20.3/4 and exact route ownership. |
| TG20.6 | Integration/migration/regression verification | **Not authorized**; implementation groups are blocked. |
| TG20.7 | Final acceptance | **Not authorized**; all prior groups must complete. |

The current task document has objectives, dependency order, and broad tests, but
does not satisfy the final authorization requirement for each group:

- exact allowed/prohibited files;
- per-group migration/schema impact;
- exact tests and exit criteria;
- rollback/forward-recovery procedure;
- explicit group-specific stop conditions.

## 12. Acceptance-gate review

The acceptance strategy is comprehensive and measurable across domain,
PostgreSQL, transport, frontend, security, accessibility, localization, Theme,
multi-clinic, migration, regressions, staging, and release.

No acceptance checkpoint is executable until tasks are independently authorized.
After blocker closure, the final matrix must classify every mandatory/optional/
future/out-of-scope requirement and choose exactly `TG20_ACCEPTED` or
`TG20_NOT_ACCEPTED`.

## 13. Remaining constitutional blockers

**Closure status:** AUTH-1 through AUTH-4 below are closed by
`final-authorization-contracts.md`. They are retained as the historical findings
that caused this review's `NOT AUTHORIZED` decision, not as unresolved planning
questions.

All four blockers must be resolved in documentation before another authorization
review:

### AUTH-1 — Onboarding foundation ownership

Choose and define exactly one Version 1 behavior:

- read-only verification using current clinic-type/general template resolution,
  with missing template terminal; or
- a new explicitly owned idempotent assignment/materialization service, including
  its aggregate/repository/transaction contract.

The operational contract currently assumes an existing reconciliation boundary
that repository evidence disproves.

### AUTH-2 — Execution lease and restart protocol

Define lease/claim fields, duration, clock authority, acquire/renew/release/
expiry/reclaim rules, optimistic-version interaction, request cancellation,
crash recovery, and exact indexes/constraints. Alternatively remove the lease
concept and define a different deterministic stale-`PREPARING` recovery model.

### AUTH-3 — Permission and migration composition

Define exact authorization composition across organization membership and tenant
RBAC; exact default mappings for `CLINIC_OWNER`/`CLINIC_ADMIN` and organization
roles; whether custom roles may receive view/manage; exact permission catalogue
and role-mapping rows; deterministic identifiers; and whether the single TG20
migration contains both tables plus RBAC seed data or a second migration is
required. Then freeze exact migration count, index/constraint names, columns,
order, predicates, and downgrade order.

### AUTH-4 — Independently implementable task boundaries

Revise every TG20 group with exact allowed/prohibited files, dependencies,
implementation order, schema impact, tests/commands, measurable exit criteria,
rollback/forward recovery, and stop conditions. The file list must be derived
from current source after AUTH-1 through AUTH-3, not guessed during coding.

## 14. Prohibited implementation shortcuts

Even after future authorization, implementation may never:

- start code before AUTH-1 through AUTH-4 are approved;
- fabricate progress or use setup completion/readiness as preparation truth;
- create a template assignment service implicitly inside the executor;
- represent a lease only in memory or use client time;
- seed permissions through ad hoc runtime inserts or role-name booleans;
- split migration work without updating the exact authorization;
- rerun full tenant provisioning, Clinic Entry, association, or verification;
- bypass Platform Foundation, UoW, repository ports, audit, idempotency, React
  Query, datasource/repository, Theme, localization, or accessibility;
- expand into TG21/TG22, clinical, financial, inventory, CRM, reports,
  integrations, or commercial behavior.

## 15. Migration, testing, rollback, and acceptance authorization

- **Migration authorization:** withheld. Logical two-table intent is accepted;
  exact revision count/contents and lease/RBAC/index definitions are not.
- **Testing authorization:** planning of tests is accepted; implementation of
  tests is withheld with their task groups.
- **Rollback authorization:** constitutional strategy is accepted; per-group and
  exact migration rollback are withheld.
- **Task authorization:** all TG20.0–TG20.7 groups withheld.
- **Acceptance authorization:** strategy accepted; execution withheld.

## 16. Final decision

The operational contracts materially advance TG20 and resolve the original
eight conceptual blockers, but source verification reveals four remaining
constitutional gaps. Because implementation would have to choose template
ownership, lease semantics, permission/migration composition, and exact task
boundaries, deterministic implementation is not yet possible.

**TG20 IMPLEMENTATION NOT AUTHORIZED**
