# ADR-PF-005: Pre-Tenant Idempotency

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Platform Foundation

Scope: Platform Foundation

## Context

ADR-PF-001 provides tenant-scoped idempotency through
`tenant_idempotency_records`. Clinic creation has no tenant before execution,
and using a fake, provisional, or placeholder tenant ID would corrupt the
security scope. Organization is the authoritative pre-tenant boundary.

## Decision

Pre-tenant organization commands use a separate additive persistence model,
`org_idempotency_records`, while reusing the existing platform idempotency
algorithm and shared lifecycle semantics. The existing tenant table and callers
remain unchanged.

The logical Version 1 identity is:

```text
organization_id + actor_org_user_id + operation + idempotency_key
```

The server first authorizes current active organization membership. The request
fingerprint includes the stable contract version, operation, destination
organization, and normalized material command payload. Raw payloads and secrets
are not stored.

## Lifecycle and replay

Records support `IN_PROGRESS`, `COMPLETED`, and `FAILED_RETRYABLE`, matching
ADR-PF-001.

- The first request atomically claims the scoped key.
- A concurrent request with the same scope/key/fingerprint cannot execute the
  operation and receives the stable in-progress outcome.
- A completed exact replay returns the stored authoritative response and status
  without repeating provisioning, association, verification consumption, or
  audit effects.
- The same scope/key with a different fingerprint returns a conflict.
- A retryable failure may be reclaimed only by the same scope/key/fingerprint.
- Terminal domain failures do not masquerade as successful replay.
- Missing keys follow the consuming API contract; TG19 create and associate
  require a non-empty `Idempotency-Key`.

Association also uses organization-scoped idempotency because the destination
organization is the governing scope. The target tenant and ownership
verification identity participate in its request fingerprint; they do not
replace organization authorization.

## Transaction requirement

Claim, domain mutation, authoritative response persistence, and transactional
audit participate in the ADR-PF-006 unit of work. A response may be replayed
only after the domain transaction commits. Rollback must not leave a completed
record for a rolled-back tenant or association. Post-commit transport/session
refresh failure retries the projection phase, not the completed mutation.

## Persistence, constraints, and indexes

`org_idempotency_records` contains organization, actor, operation, key,
fingerprint, lifecycle status, replayable safe response/status, safe error
category, timestamps, and expiry.

- Foreign keys reference `org_organizations` and `org_users`.
- Unique `(organization_id, actor_id, operation, idempotency_key)`.
- Check constraint for the three lifecycle states.
- Indexes on organization/actor/operation and `expires_at`.
- Response JSON must contain only the approved safe result contract.
- Retention defaults to 24 hours, matching ADR-PF-001.

No fake tenant ID, nullable scope ambiguity, or cross-table replay is permitted.

## Migration and rollback

One additive Alembic revision may create `org_idempotency_records` alongside
the other approved Platform Foundation tables. Upgrade creates constraints and
indexes explicitly. Downgrade drops indexes/constraints and the new table only;
it never mutates `tenant_idempotency_records`. Fresh-database migration-chain
verification and upgrade/downgrade tests are mandatory. The final revision
filename remains `UNKNOWN` until generated from the repository's current head.

## Compatibility

`IdempotencyScope` and the existing tenant repository remain supported.
Implementation extracts or generalizes shared claim/replay policy without
changing tenant scope semantics or stored records. Callers migrate
incrementally by choosing an explicit tenant or organization scope type.

## Audit and security

Claims, replay, conflicts, retries, and expiry expose safe typed outcomes and
correlation IDs. Logs redact keys, fingerprints, response secrets, verification
identifiers, and payload data. Cross-organization callers cannot inspect or
replay another organization's records.

## Explicit non-goals

- Placeholder tenant IDs or client-authorized organization scope.
- A generic distributed workflow engine.
- Payment-specific, import, clinical, or frontend idempotency truth.
