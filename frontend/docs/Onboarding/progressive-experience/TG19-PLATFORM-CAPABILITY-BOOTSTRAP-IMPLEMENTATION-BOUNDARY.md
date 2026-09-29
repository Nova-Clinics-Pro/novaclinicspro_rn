# TG19 Platform Capability Bootstrap Implementation Boundary

Date: 2026-07-20

Status: **FROZEN — READY FOR BOUNDED IMPLEMENTATION**

Governing decisions: `ADR-PF-012-MANUAL-VERIFIER-CAPABILITY.md`,
`ADR-PF-014-PLATFORM-CAPABILITY-BOOTSTRAP.md`, and
`ADR-PF-015-PLATFORM-AUDIT-LOG.md`

## Purpose

This boundary authorizes a future backend/deployment prerequisite that creates
the first database-authoritative `platform.capabilities.manage` assignment.
It does not implement or authorize TG19 Final Platform Foundation Checkpoint 3.

Checkpoint 3 remains blocked until this prerequisite is implemented, verified,
committed, pushed, and reviewed in a separate task.

## Authorized Future Scope

The bounded implementation may add only:

- the `PLATFORM_CAPABILITY_BOOTSTRAP_ORG_USER_ID` configuration setting, with no
  default identity and fail-closed validation;
- one deployment-only command or application service for one-time/idempotent
  bootstrap execution;
- existing-user lookup, active-state validation, and row locking through the
  existing user persistence boundary;
- reuse of the ADR-PF-012 capability-assignment model, repository, application
  service, transaction boundary, and lifecycle rules;
- reuse of the implemented ADR-PF-015 platform-audit repository for immutable
  bootstrap evidence;
- stable typed bootstrap failures and safe operational output;
- focused unit and PostgreSQL-backed integration tests;
- deployment documentation describing secure per-environment configuration,
  approval, execution, verification, rotation, and recovery.

The implementation must use the same capability-assignment persistence and
management service that later grant/suspend/revoke operations use. It must not
create a bootstrap-specific authority table, permission model, audit system, or
parallel user repository.

## Required Execution Contract

The future command/service must:

1. require the explicitly supplied deployment configuration;
2. validate its UUID shape without logging the raw configuration source;
3. resolve and lock the existing authoritative active `org_user`;
4. query the authoritative assignment for
   `platform.capabilities.manage`;
5. return an existing active same-principal assignment on replay;
6. reject a different configured principal while bootstrap authority exists;
7. create the initial assignment with deployment bootstrap/system grantor
   provenance when absent;
8. write one immutable safe grant audit event;
9. commit assignment and audit in one transaction;
10. return a safe deployment result suitable for release verification.

No partial success is permitted. Configuration, identity, assignment, audit,
or commit failure must roll back and fail the deployment step.

## Configuration and Deployment Boundary

- The configuration has no source-controlled value or fallback.
- Each environment supplies its own reviewed existing `org_user_id` through its
  approved secret or deployment-configuration system.
- Production execution requires recorded approval from Product Architecture,
  Platform Security or Platform Operations, and the Release/Deployment owner.
- Non-production environments may use separate explicitly approved identities.
- Execution is deployment-controlled and unavailable through public or
  unauthenticated runtime transport.
- Changing configuration alone cannot rotate or transfer authority.

## Explicitly Prohibited

- Hardcoded, example-as-default, generated, or committed real user IDs.
- Automatic selection from `is_org_admin`, organization membership, tenant
  RBAC, clinic roles, email domains, registration order, environment owner, or
  database-superuser identity.
- Seeding authority from organization or clinic data.
- An unauthenticated API endpoint, public runtime bootstrap route, frontend
  action, or client-supplied bootstrap identity.
- `is_org_admin` or generic administrative fallback.
- Silent transfer when configuration changes.
- Automatic grant of `platform.clinic_contact_verification.approve` or any
  capability other than `platform.capabilities.manage`.
- A second assignment repository, service, table, audit log, identity model, or
  idempotency system.
- Checkpoint 3 manual verification transport, Checkpoints 4–5, TG19 frontend
  orchestration/acceptance, TG20, or unrelated platform work.

## Required Future Tests

### Configuration and identity

- configured active user receives the initial capability;
- missing and blank configuration fail closed;
- malformed UUID fails;
- nonexistent user fails;
- inactive user fails;
- no actual environment user ID is committed to source.

### Authorization independence

- `is_org_admin` without an assignment receives no authority;
- organization membership does not grant platform capability;
- tenant RBAC and clinic roles do not grant platform capability;
- no heuristic or fallback principal is selected.

### Idempotency and conflict

- same configured principal returns the existing authoritative assignment;
- replay creates no duplicate assignment or grant audit;
- a different configured principal conflicts and receives no assignment;
- configuration change does not silently transfer or revoke authority;
- concurrent bootstrap attempts produce one authoritative assignment.

### Transaction and audit

- immutable audit records the safe principal, capability, bootstrap version,
  correlation, timestamp, and outcome;
- no configuration secret or unapproved deployment metadata is audited/logged;
- assignment failure rolls back audit;
- audit failure rolls back assignment;
- commit failure leaves no partial authority.

### PostgreSQL and deployment verification

- relevant uniqueness, foreign-key, status, and lifecycle constraints hold;
- row locking and concurrent execution fail safely;
- deployment command exits non-zero for every fail-closed case;
- successful execution can be verified through the authoritative repository;
- rotation requires a second authorized administrator before original
  revocation;
- emergency recovery produces a separately correlated reviewed audit event.

## Documentation Expected from Implementation

The future implementation task may update only implementation evidence and
deployment instructions needed to configure, execute, verify, rotate, and
recover the bootstrap. It must not commit an environment value or redefine the
ADR-PF-012/014 authority model.

## Completion Gate

Bootstrap implementation must not begin until the ADR-PF-015 platform-audit
model, migration, repository, UoW registration, and focused verification are
complete.

The bootstrap prerequisite is complete only when platform-audit implementation
and the bounded bootstrap implementation, focused tests, PostgreSQL concurrency/
rollback evidence, deployment documentation, clean diff, commit, and push are
complete.

Only a fresh pre-check after that completion may unblock TG19 Final Platform
Foundation Checkpoint 3.

Platform Capability Bootstrap Implementation Boundary Status: **READY**
