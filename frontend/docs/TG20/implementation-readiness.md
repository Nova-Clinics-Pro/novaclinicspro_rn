# TG20 Implementation Readiness Review

Date: 2026-07-21

Branch: `feature/progressive-experience-recovery`

Planning commit reviewed: `9711040c`

Decision: **NOT READY**

> **Post-review constitutional resolution — 2026-07-21:**
> `operational-contracts.md` now defines the authoritative Version 1 work units,
> sole request-driven executor, evidence, initialization, retry, persistence,
> concurrency, legacy/no-run, authorization, projection, and rollback contracts
> requested by this review. This historical `NOT READY` decision remains
> controlling until a separately authorized readiness re-review verifies source
> fit, exact permission/file/migration boundaries, and independently executable
> task groups. Implementation remains unauthorized.

> **Final-blocker closure — 2026-07-21:**
> `final-authorization-contracts.md` subsequently resolves the source-fit,
> execution-claim, permission/migration, and executable-task issues found by the
> authorization review. This historical readiness decision is not itself
> changed to READY; the required next activity is the final implementation
> authorization re-review.

## Executive decision

TG20 is correctly scoped as Phase 2 E3 Workspace Preparation State and Guidance,
and its constitutional boundaries are strong. Implementation cannot begin,
however, because the central domain premise is not yet backed by an authoritative
runtime operation.

Current TG19 New Clinic processing calls `TenantProvisioningService` inside the
Clinic Entry transaction. That service creates the tenant, seeds RBAC, creates
the tenant-user relationship, assigns Clinic Owner, and flushes before Clinic
Entry associates the tenant, consumes verification evidence, appends audit, and
returns the effective-tenant handoff. There is no accepted post-handoff
preparation executor, work-unit vocabulary, event/evidence port, or retryable
operation from which the proposed `WorkspacePreparation` lifecycle can derive
truth.

The existing `GET /api/v1/onboarding/{tenant_id}/status` is explicitly the
canonical setup-wizard/personalization status derived from clinic data and
validation rules. It is not workspace-provisioning progress, and reusing it
would collapse TG20 preparation into TG21/TG22 personalization/readiness.

Implementation must stop until the blockers in §16 are resolved through an
approved TG20 planning revision. No code, API, repository, migration, or screen
was created by this review.

## 1. Scope review

Result: **PASS WITH DEPENDENCY BLOCKER**

- TG20 purpose, personas, product value, mandatory/optional/future requirements,
  and explicit non-goals are clear.
- Clinical flows are correctly labeled downstream and out of scope.
- TG20 does not claim TG21 capability visibility, TG22 Ready to Start, clinical,
  financial, operational, CRM, analytics-platform, or commercial behavior.
- The unresolved question is not scope breadth but whether any real preparation
  remains after the accepted synchronous TG19 transaction.

## 2. Architecture review

Result: **CONDITIONALLY COMPLIANT**

The package correctly consumes Product Architecture and Platform Foundation:

- Supabase remains authoritative.
- Organization, membership, effective tenant, audit, idempotency, verification,
  capability, DI, UoW, and typed-error boundaries are referenced rather than
  redefined.
- Frontend Clean Architecture, React Query, repository/datasource reuse, central
  Theme, localization, accessibility, and tenant cleanup are preserved.
- No alternate identity, tenant, verification, audit, or navigation system is
  proposed.

The proposed provisioning-status adapter is not implementable because no
executor/evidence contract currently exists. Adding one without deciding its
producer, delivery semantics, and transaction relationship would invent
architecture during implementation.

## 3. WorkspacePreparation aggregate review

Result: **DOMAIN SHAPE SOUND; AGGREGATE EXISTENCE UNJUSTIFIED**

The proposed identity, state vocabulary, invariant set, version independence,
terminal states, optimistic concurrency, safe reason codes, retry lineage, and
tenant/organization scope are internally coherent.

The aggregate belongs in TG20 only if Product/Architecture confirms a durable
post-TG19 preparation process. Repository evidence currently shows:

1. `ClinicEntryService.create_clinic()` invokes
   `provision_tenant_in_transaction()` before association/handoff.
2. `TenantProvisioningService` creates the tenant, seeds RBAC, creates the tenant
   user, assigns owner role, and flushes/commits as one synchronous operation.
3. Clinic Entry returns only after this work, association, evidence consumption,
   audit, and effective-tenant result succeed.
4. No current preparation-run entity, worker, event stream, progress unit, or
   retry command exists.

Consequently `PENDING → PREPARING → PERSONALIZATION_AVAILABLE` has no accepted
producer. Persisting it now would create a state machine with fabricated or
immediately completed state.

## 4. Repository review

Result: **NOT READY**

`IWorkspacePreparationRepository` is not a duplicate of the tenant,
application, onboarding-status, Journey, idempotency, or audit repositories if
the new aggregate is approved. Its proposed methods and application-owned commit
rule follow existing architecture.

Missing decisions:

- whether the aggregate exists at all;
- when and by whom the first record is created;
- how one “current run” is defined across retries and contract versions;
- whether execution evidence is pull, event, or command/result based;
- whether read projection and aggregate persistence use one repository/record;
- exact optimistic-lock and duplicate-event semantics;
- retention/history ownership.

No repository implementation can be authorized until those are fixed.

## 5. Application-service review

Result: **NOT READY**

### WorkspacePreparationQueryService

Responsibility, Platform Foundation authorization, safe projection, and
read-only transaction behavior are clear. It remains blocked by missing
initialization/not-found policy and missing authoritative aggregate producer.

### WorkspacePreparationRetryService

The proposed use of organization idempotency, audit, UoW, locking, and typed
errors is correct. Its protected operation is undefined. Re-running
`TenantProvisioningService` would attempt duplicate tenant/RBAC/user/owner work
and is not an approved or safe retry. No existing service exposes a bounded
“resume preparation” command.

The service therefore cannot define fingerprint, replay response, commit point,
execution acknowledgment, or rollback behavior without a new execution contract.

## 6. Database and migration review

Result: **NOT READY**

The package correctly identifies additive PostgreSQL persistence and isolated
migration verification. It does not define an implementation-ready schema.

Still required:

- table name and ownership;
- exact columns, enum/check representation, nullability, and defaults;
- organization/tenant foreign keys and deletion policy;
- current-run uniqueness, including version/terminal/history semantics;
- optimistic-lock column and update predicate;
- safe reason/unit storage format and validation;
- retry attempt/history representation;
- indexes supporting current query/locking;
- audit correlation without sensitive metadata;
- legacy/TG19 tenant initialization/backfill policy;
- exact downgrade/data-loss policy;
- migration predecessor/head and model-registry inclusion.

These are hidden schema decisions, not implementation details.

## 7. Frontend review

Result: **ARCHITECTURALLY READY; CONTRACT BLOCKED**

The proposed presentation/domain/data layering is consistent with the current
onboarding feature. Extending the onboarding repository, datasource, query
keys, auth/session cleanup, Theme, localization, accessibility, and navigation
is correct. No new API client or general store is needed.

Blocked details depend on the backend decisions:

- exact initial/not-found state;
- safe progress units and localized keys;
- refresh policy and server hint bounds;
- whether a retry action exists;
- route entry for already-provisioned TG19 tenants;
- exact route/handoff ownership between ChoiceScreen, preparation, and existing
  SetupWizardFlow;
- cache lifetime/history after terminal or personalization-available state.

The UI must not be implemented against placeholder states or elapsed-time
simulation.

## 8. Backend review

Result: **NOT READY**

DI, service, repository, DTO, transport, typed error, authorization, audit, and
transaction patterns are identified correctly. Two source facts require an
explicit decision:

1. Current `TenantProvisioningService` is synchronous and has no status/evidence
   port.
2. The existing onboarding status router uses legacy `TenantUserContext` and an
   `is_org_admin`-shaped context. TG20 cannot reuse that authorization shortcut;
   it must consume the accepted Platform Foundation organization membership and
   effective-tenant boundary.

Exact router/dependency composition and authorization service must be frozen
before a transport checkpoint.

## 9. Dependency review

Result: **PASS, SUBJECT TO EXECUTOR CONTRACT**

- No prohibited clinical, patient, appointment, billing, inventory, CRM, reports,
  or integration dependency enters TG20.
- The frontend dependency direction is acyclic.
- Platform Foundation is upstream; TG18 Journey is downstream handoff; TG21 and
  TG22 remain future.
- The provisioning adapter is the only unresolved edge. Until its producing
  service and semantics are approved, it is a label rather than a contract.

## 10. Sequence-diagram review

Result: **PARTIAL**

TG19 handoff, query, retry, tenant switch, and downstream clinical boundary
diagrams respect architectural direction. Missing authoritative steps:

- preparation-run creation;
- producer/executor acknowledgment and progress transition delivery;
- duplicate/out-of-order evidence handling;
- executor failure before versus after transaction commit;
- reconciliation after process/app restart;
- legacy/no-run initialization;
- cancellation/continuation semantics during tenant switch (the server operation
  may continue even though client observation stops).

The seven clinical diagrams are valid boundary illustrations and remain
non-authorizing.

## 11. Domain-model review

Result: **PARTIAL**

Entities/value objects/lifecycle ownership are coherent after an aggregate is
justified. Missing domain contracts:

- authoritative definition and ordered set of Version 1 preparation units;
- required versus informational unit semantics;
- transition producer authority;
- retry exhaustion/terminal policy owner;
- initialization and reconciliation commands;
- event identity, ordering, deduplication, and delivery guarantees;
- history/retention and current-run replacement rules.

## 12. Acceptance-strategy review

Result: **STRONG BUT NOT EXECUTABLE**

The strategy covers domain, PostgreSQL, services, transports, frontend, security,
localization, accessibility, Theme, multi-clinic, regressions, migrations,
staging, and release. Every proposed behavior has a measurable test category.

It cannot be executed until the authoritative process, schema, initialization,
retry, and evidence contracts are accepted. Acceptance also needs explicit
reconciliation/restart and out-of-order/duplicate evidence tests after the
producer contract is defined.

## 13. Task-breakdown review

Result: **NOT IMPLEMENTATION READY**

The eight groups have sensible ordering and high-level verification. TG20.0
already acknowledges unresolved initialization and boundary decisions, which
means TG20.1 must not begin.

The prompt requires every group to identify objective, dependencies, required
files, implementation order, tests, rollback, and stop conditions. Current task
groups do not yet provide:

- exact allowed/prohibited file list;
- exact model/migration/repository/service/transport/frontend paths;
- per-group rollback or forward-recovery procedure;
- per-group stop conditions beyond the package-wide statement;
- executor/evidence prerequisite and ownership;
- an explicit decision checkpoint before persistence.

Tasks should be revised only after blockers are resolved; adding filenames now
would imply an unapproved architecture.

## 14. Risk register

| Risk | Severity | Mitigation required before implementation |
|---|---|---|
| Fabricated preparation progress over synchronous completed provisioning | Critical | Define real Version 1 work and authoritative producer, or revise TG20 product behavior. |
| Unsafe retry duplicates tenant/RBAC/user/role creation | Critical | Define a bounded resumable/idempotent execution contract; never rerun full provisioning blindly. |
| Preparation collapses into personalization/readiness status | High | Preserve separate aggregate/vocabulary or explicitly revise roadmap/requirements. |
| Legacy/TG19 tenants have no run | High | Approve initialization/backfill/not-found policy without inferring completion. |
| Authorization reuses legacy `is_org_admin` shortcut | High | Freeze Platform Foundation membership/effective-tenant dependency composition. |
| Concurrent/out-of-order executor evidence regresses state | High | Define event identity/order/deduplication, optimistic locking, reconciliation. |
| Hidden migration and downgrade data loss | High | Approve exact schema, constraints, history, downgrade, and migration head. |
| Polling load or noisy announcements | Medium | Approve refresh bounds/backoff, visibility lifecycle, and announcement deduplication. |
| Terminal failures leak infrastructure details | High | Freeze safe reason catalogue and support correlation policy. |
| TG21/TG22 scope leakage | High | Keep preparation units infrastructure-safe and prohibit capability/readiness policy. |
| Long-term orphaned run history | Medium | Define retention/current-run/history ownership. |

## 15. Evidence reviewed

Documentation:

- Nova Product Architecture and Platform Foundation Architecture;
- complete TG20 package from commit `9711040c`;
- Phase 2 roadmap E3/TG20;
- TG19 Final Acceptance and Implementation Readiness;
- relevant ADR-PF-004/005/006/011/015/017 and the wider ADR-PF series.

Implementation:

- `app/application/onboarding/tenant_provisioning_service.py`;
- `app/application/onboarding/clinic_entry_service.py`;
- `app/api/v1/routers/onboarding_router.py`;
- `app/api/v1/schemas/onboarding.py`;
- current onboarding services, progress/status, dependency injection, UoW,
  repositories, models, migrations, auth/effective-tenant services;
- frontend onboarding repository, datasource, Journey/Choice/SetupWizardFlow,
  auth, React Query, draft cleanup, navigation, Theme, and localization seams.

## 16. Blocking prerequisites

All blockers must be closed before TG20.1 or any implementation task begins:

1. **Authoritative work definition:** Product/Architecture must identify the real
   Version 1 preparation work remaining after TG19's synchronous transaction and
   define each safe progress unit—or revise TG20 so it does not claim such work.
2. **Execution owner/contract:** Define the producer/executor, command/evidence
   port, acknowledgment, failure, restart/reconciliation, ordering, and
   deduplication semantics.
3. **Aggregate initialization:** Define when the run is created, who creates it,
   and the policy for already accepted TG19 and legacy tenants without a run.
4. **Retry contract:** Define exactly what is retried, eligibility/exhaustion,
   idempotency fingerprint/replay, pre/post-commit failure, and why it cannot
   duplicate provisioning.
5. **Persistence contract:** Approve the exact PostgreSQL schema, constraints,
   indexes, lock/version, history/retention, migration head, downgrade, and
   backfill/no-backfill policy.
6. **Authorization composition:** Freeze exact Platform Foundation organization
   membership/effective-tenant dependencies and prohibit the legacy
   `is_org_admin` shortcut for TG20 authority.
7. **Safe projection catalogue:** Approve state/unit/reason/next-action meanings,
   refresh bounds, support correlation, and sensitive-data exclusions.
8. **Implementation boundary:** After decisions 1–7, revise tasks with exact
   files, dependencies, tests, per-checkpoint rollback, and stop conditions.

## 17. Required planning phase

Create a bounded **TG20 Operational Preparation Contract** before implementation.
It should update only TG20 planning documents and define:

- authoritative preparation work and producer;
- executor/evidence/reconciliation/retry contract;
- initialization/legacy behavior;
- exact persistence and migration design;
- authorization/DI/transport composition;
- safe projection catalogue;
- exact implementation file/test/rollback boundary.

No Platform Foundation or Product Architecture redesign is required unless the
investigation proves no post-handoff preparation process exists. In that case,
Product Architecture must decide whether E3 becomes transparent handoff guidance
or whether provisioning must become an approved asynchronous platform
capability. Implementation cannot make that choice.

## 18. Final readiness decision

TG20 is not ready because the proposed aggregate, status, progress, retry, and
migration contracts have no accepted authoritative execution source in the
current system. The planning package correctly exposes this through its TG20.0
stop conditions; those decisions must be completed before coding.

**TG20 IMPLEMENTATION STATUS: NOT READY**

Next authorized activity: TG20 implementation readiness re-review against
`operational-contracts.md`; do not begin TG20.1 before that decision.
