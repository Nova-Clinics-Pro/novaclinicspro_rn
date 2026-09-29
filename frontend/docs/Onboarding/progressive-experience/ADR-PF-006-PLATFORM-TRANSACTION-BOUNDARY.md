# ADR-PF-006: Platform Transaction Boundary

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Platform Architecture

Scope: Platform Foundation

## Context

Clinic Entry must not leave a tenant, association, consumed verification,
completed idempotency record, or audit event without the others. Repository
evidence shows `TenantProvisioningService.provision_tenant()` commits internally,
while existing unit-of-work implementations already provide an application-owned
commit/rollback seam. The internal commit prevents atomic composition.

## Decision

The top-level application service owns the database transaction and is the only
layer allowed to commit or roll back. Repositories, platform adapters,
verification, idempotency, audit, and tenant provisioning mutate through one
shared session/unit of work and call `flush()` when generated identifiers or
constraint evaluation is required. They never commit.

For Clinic Entry, the atomic unit is:

```text
authorize organization membership
→ claim organization-scoped idempotency
→ validate duplicate/tenant state
→ provision tenant OR validate/consume ownership verification
→ persist organization–tenant association
→ persist authoritative ClinicEntryResultV1 replay state
→ persist transactional audit/outbox records
→ commit once
```

Any exception before commit rolls back every database mutation. A duplicate or
concurrency constraint is translated to the approved typed outcome after
rollback/reload; it is never repaired with a second unscoped write.

## Provisioning participation

`TenantProvisioningService` gains an explicit transaction-safe mode or method
that performs all current database work and flushes without committing. The
default behavior for existing callers remains backward compatible during the
migration: the legacy public entry point may continue to commit by delegating to
the transaction-safe core, while new platform orchestration must use the
non-committing entry point with an application-owned unit of work.

The transaction-safe core includes tenant creation, tenant membership and role
assignment, RBAC seed writes, and database-backed metadata/outbox preparation.
It must not execute irreversible external side effects before commit.

## Verification, idempotency, and audit

- Ownership verification is locked/validated and consumed in the same
  transaction as association. Rollback leaves approved evidence retryable.
- Idempotency completion is persisted only with the successful domain result in
  the same transaction. Rollback cannot retain a completed replay.
- Audit facts required to prove the mutation are database rows or outbox events
  written before commit. Direct event publication is post-commit only.
- Tenant-scoped audit cannot represent pre-tenant organization activity alone;
  the Platform Foundation adds organization-scoped audit persistence.

## Post-commit side effects

Supabase metadata synchronization, session projection refresh, notifications,
and external event delivery occur after commit through existing retryable
outbox/handler boundaries where available. Failure returns or records a
phase-specific retryable projection error and never reruns a completed create or
association. The authoritative `ClinicEntryResultV1` remains replayable.

## Retry and concurrency rules

- Retry a transient pre-commit failure with the same idempotency key and
  fingerprint after rollback/reclaim.
- Replay a committed operation without domain side effects.
- Serialize competing verification consumption and organization–tenant
  association with row locks and database uniqueness constraints.
- Never retry a terminal authorization, validation, expired verification, or
  cross-organization conflict as a new mutation.

## Backward-compatible migration path

1. Extract a non-committing provisioning core without changing legacy output.
2. Characterize existing committing callers with tests.
3. Keep the legacy wrapper's commit behavior until each caller explicitly adopts
   application-owned transaction control.
4. Wire Clinic Entry only to the non-committing core.
5. Deprecate the wrapper later under a separately approved migration plan.

No existing caller may accidentally begin relying on an uncommitted result.

## Testing requirements

- characterization tests for every existing provisioning caller;
- commit-count tests proving one top-level commit;
- rollback tests at each boundary after tenant, association, verification,
  idempotency, and audit writes;
- concurrent duplicate and verification-consumption tests;
- outbox/post-commit retry tests proving no duplicated domain mutation;
- integration tests using the production SQLAlchemy transaction boundary;
- failure-injection tests confirming no orphan tenant or association.

## Consequences

Clinic Entry may safely compose existing provisioning behavior, but Platform
Foundation implementation must first establish the new persistence adapters and
transaction-safe provisioning seam. Clean Architecture is strengthened: domain
and repository layers never own commits, while the application use case owns
atomicity.
