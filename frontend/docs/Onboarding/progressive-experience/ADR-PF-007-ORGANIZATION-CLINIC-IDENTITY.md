# ADR-PF-007: Organization Clinic Identity Persistence

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Product Architecture and Platform Foundation

Scope: Platform Foundation

## Context

The TG19 domain foundation defines deterministic `clinic_identity_v1`
normalization and fingerprinting. The implemented Organization Platform
Foundation associates organizations and tenants, but
`org_organization_tenants` does not persist the versioned fingerprint. Mutable
`org_tenants` fields cannot reliably reconstruct the complete approved identity,
and request-idempotency fingerprints are not durable clinic identity. Therefore
application read-before-write cannot prevent concurrent equivalent clinic
creation within one organization.

## Decision

Select **Option A: extend `org_organization_tenants`**. The owning association is
the smallest correct source of truth because identity uniqueness applies to an
active clinic association within an organization. A separate identity table
would duplicate lifecycle ownership without a Version 1 requirement for
independent identity history.

Add two nullable columns to the existing model/table:

- `identity_version VARCHAR(64)`;
- `identity_fingerprint VARCHAR(128)`.

For authoritative Version 1 capture, both values are present and use:

```text
identity_version = clinic_identity_v1
identity_fingerprint = SHA-256 produced by the existing TG19 domain foundation
```

The domain normalization/fingerprint implementation remains the sole algorithm
owner. Persistence stores its result and never reimplements normalization.

## Source of truth and lifecycle

`org_organization_tenants` owns tenant association lifecycle and its captured
organization-scoped identity metadata. `org_tenants`, idempotency records,
frontend state, and audit metadata are not duplicate-identity authorities.

Identity metadata is immutable while an association is active. Changing clinic
display/profile fields does not silently change identity. A future explicit
identity correction or new matcher/version requires an additive contract and an
audited transition; Version 1 values cannot be reinterpreted.

An inactive association does not reserve its fingerprint. Reactivation with an
authoritative identity must re-evaluate active uniqueness in the same
transaction. Re-associating the same tenant to the same organization returns the
existing active association only when its captured identity is compatible; a
different authoritative fingerprint is a typed conflict requiring explicit
future reconciliation.

## Uniqueness and concurrency contract

The database is the final concurrency authority. Add a partial unique index on:

```text
(organization_id, identity_version, identity_fingerprint)
WHERE status = 'active'
  AND identity_version IS NOT NULL
  AND identity_fingerprint IS NOT NULL
```

Consequences:

- the first authoritative Version 1 association succeeds;
- an equivalent active identity in the same organization conflicts;
- the same fingerprint in different organizations is permitted;
- different named identity versions remain distinguishable;
- inactive associations do not block a new active association;
- two concurrent equivalent creates can commit at most one active association;
- application read-before-write improves the response but never replaces the
  database constraint.

The application service computes the normalized identity before provisioning,
performs an organization-scoped lookup, and persists tenant association plus
identity in its single ADR-PF-006 transaction. A uniqueness violation rolls back
tenant provisioning, association, audit, and idempotency completion. It maps to
the stable `clinic_entry.duplicate` typed outcome; unrelated integrity failures
must not be misclassified.

## Existing associations

Existing rows are `LEGACY_IDENTITY_UNKNOWN` by classification, represented by
both new columns remaining `NULL`.

- Existing associations remain valid and active.
- No fingerprint is derived from incomplete or mutable historical fields.
- No automatic or destructive backfill is authorized.
- Active uniqueness enforcement begins when authoritative identity is captured.
- Legacy rows do not falsely reserve an identity.
- A later reconciliation/backfill requires a separately approved, auditable
  process with evidence sufficient to construct the complete versioned input.

## Repository boundary

Extend the existing Organization Platform Foundation association port and
adapter only. It may:

- look up an active association by organization, identity version, and
  fingerprint;
- add an association with optional version/fingerprint metadata;
- atomically flush and surface the named uniqueness violation;
- load identity metadata for idempotent replay and safe audit correlation;
- preserve existing tenant-based lookup and multi-clinic listing behavior.

No parallel duplicate-detection repository or service is authorized.

## Migration authorization

One additive migration descending from the current merged Alembic head is
authorized to:

1. add the two nullable columns;
2. add a paired-nullability check so both values are null or both are present;
3. add the partial unique active-identity index;
4. add an organization/version/fingerprint lookup index only if the unique index
   does not already satisfy the query plan;
5. register the fields in the existing SQLAlchemy model/adapter.

Upgrade performs no data update. Downgrade removes only the additive indexes,
check constraint, and columns. The generated revision ID is implementation-time
metadata. Migration verification must cover current-head ancestry, upgrade,
downgrade, constraints/indexes, and a fresh database chain. Historical migration
repair is not authorized by this ADR.

## Audit and security

Audit records may contain identity version and a redacted/truncated correlation
of the fingerprint, never the normalized identity payload, verified contact,
ownership evidence, idempotency key, or raw fingerprint where unnecessary.
Cross-organization duplicate checks remain non-disclosing.

## Focused tests

Implementation must prove first capture, same-organization duplicate,
cross-organization allowance, version distinction, concurrent equivalent create,
inactive behavior, same-tenant replay/conflict, legacy-null validity, absence of
synthetic backfill, stable typed duplicate mapping, and migration
upgrade/downgrade/fresh-head behavior.

## Explicit non-goals

- Historical identity inference or automatic reconciliation.
- A public clinic search or cross-organization disclosure mechanism.
- A second identity table, matching service, or frontend duplicate detector.
- Tenant transfer, merge, claiming, import, or clinical-data migration.

## Consequences

The extension closes the remaining persistence prerequisite for concurrency-safe
New Clinic creation. TG19 remains blocked until the migration/model/repository
extension is implemented and verified, after which backend Clinic Entry service
and transport implementation may resume.
