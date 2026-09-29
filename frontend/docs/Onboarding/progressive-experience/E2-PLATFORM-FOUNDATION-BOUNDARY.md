# E2 Platform Foundation Implementation Boundary

Date: 2026-07-20

Status: **FROZEN — PLATFORM_FOUNDATION_READY_FOR_IMPLEMENTATION**

Owners: Product Architecture, Platform Architecture, Platform Security

## Purpose

This document authorizes the bounded Platform Foundation checkpoint required by
TG19. It implements ADR-PF-002 through ADR-PF-006 and does not authorize Clinic
Entry transport, frontend orchestration, TG19 acceptance, TG20, or product-scope
changes.

## Authorized persistence

New SQLAlchemy model modules and tables:

| Model file | Table | Purpose |
|---|---|---|
| `app/infrastructure/db/models/organization.py` | `org_organizations` | Organization aggregate and lifecycle. |
| `app/infrastructure/db/models/organization_member.py` | `org_organization_members` | User membership, role, lifecycle, provenance, version. |
| `app/infrastructure/db/models/organization_tenant.py` | `org_organization_tenants` | Single active owning organization per tenant. |
| `app/infrastructure/db/models/ownership_verification.py` | `org_ownership_verifications` | Opaque verification lifecycle, binding, expiry, consumption. |
| `app/infrastructure/db/models/organization_idempotency_record.py` | `org_idempotency_records` | Organization-scoped pre-tenant claim/replay. |
| `app/infrastructure/db/models/organization_audit_log.py` | `org_audit_logs` | Transactional organization membership/association/verification audit. |

`app/infrastructure/db/models/__init__.py` and
`app/infrastructure/db/migrations/env.py` may change only to register these
models. Table constraints, indexes, foreign keys, lifecycle checks, uniqueness,
redaction, and downgrade behavior must match ADR-PF-004/005.

One additive migration under
`app/infrastructure/db/migrations/versions/` is authorized. Filename and
revision ID are **UNKNOWN** until generated from the current Alembic head. It
must not infer/backfill organizations from existing users, tenants, or platform
admins. Upgrade/downgrade and fresh-chain verification are required.

## Authorized domain ports and adapters

New domain repository/service ports:

- `app/domain/repositories/i_organization_repository.py`
- `app/domain/repositories/i_organization_membership_repository.py`
- `app/domain/repositories/i_organization_tenant_repository.py`
- `app/domain/repositories/i_ownership_verification_repository.py`
- `app/domain/repositories/i_organization_idempotency_repository.py`
- `app/domain/repositories/i_organization_audit_repository.py`
- `app/domain/services/i_ownership_verification_service.py`

New SQLAlchemy adapters with matching responsibilities:

- `app/infrastructure/repositories/organization_repository.py`
- `app/infrastructure/repositories/organization_membership_repository.py`
- `app/infrastructure/repositories/organization_tenant_repository.py`
- `app/infrastructure/repositories/ownership_verification_repository.py`
- `app/infrastructure/repositories/organization_idempotency_repository.py`
- `app/infrastructure/repositories/organization_audit_repository.py`

The implementation may update repository/domain `__init__.py` exports and the
existing unit-of-work implementations only to expose these adapters through the
shared transaction. No repository may commit or publish externally.

## Authorized application services

New platform application services:

- `app/application/platform/organization_authorization_service.py`
- `app/application/platform/ownership_verification_service.py`

The first resolves current active membership and stable permissions without
using `is_org_admin`. The second issues, approves, validates, expires, revokes,
and consumes ADR-PF-003 evidence. Issuance/approval APIs are platform contracts,
not onboarding behavior.

Request/approval transport file paths are **UNKNOWN** pending the implementation
checkpoint's fresh router-convention audit. If exposed in this service, they
must use existing FastAPI schema/router/dependency patterns and be separately
named Platform Foundation endpoints. Clinic Entry may consume the service port
but cannot mint or client-validate evidence.

## Authorized transaction and provisioning changes

- `app/application/onboarding/tenant_provisioning_service.py`: extract a
  non-committing transaction-safe core; retain a backward-compatible committing
  wrapper for current callers.
- `app/infrastructure/repositories/unit_of_work.py`
- `app/infrastructure/uow/sqlalchemy_uow.py`
- `app/api/v1/dependencies/db.py`: only the minimum composition needed for one
  application-owned transaction.
- Existing provisioning caller tests and files may change only if signature
  adaptation is mechanically required and behavior remains unchanged.

Database-backed audit/outbox work flushes before the single commit. Supabase
metadata sync and other irreversible side effects move behind an existing
post-commit retry boundary or an explicitly tested callback; no parallel event
system is authorized.

## Authorized idempotency changes

- `app/application/platform/idempotency_service.py`: extract shared scope-neutral
  claim/replay policy and add an explicit organization scope without changing
  tenant semantics.
- Existing `platform_idempotency_repository.py` and
  `platform_idempotency_record.py` may receive compatibility-only refactoring.
- New organization idempotency adapter/model above owns `org_` persistence.
- Existing onboarding idempotency tests must remain green.

Fake tenant IDs, nullable ambiguous scope, or rewriting existing tenant records
are prohibited.

## Focused tests authorized and required

New tests under `tests/` may cover:

- organization/member lifecycle, role permissions, last-owner and uniqueness;
- association idempotency, single active owning organization, and multi-clinic;
- non-disclosing cross-organization and cross-tenant authorization;
- verification issue/approve/validate/expire/revoke/consume/replay and redaction;
- organization-scoped idempotency replay, conflict, concurrency, and retry;
- one-commit transaction, injected rollback at every stage, and orphan absence;
- legacy provisioning caller compatibility and post-commit retry behavior;
- audit atomicity and no duplicate audit side effects;
- migration upgrade, downgrade, constraints, indexes, heads, and fresh chain.

Use focused Ruff, compileall, Pytest, Alembic heads, migration tests, and
`git diff --check`. Real-PostgreSQL tests are required for partial uniqueness,
row locks, and concurrency before release.

## Prohibited areas

- Frontend files or UI, localization catalogs, theme, or navigation.
- Clinic Entry service, schemas, router, or endpoints in this checkpoint.
- TG19 frontend orchestration, final acceptance, TG20, or later epics.
- Existing global org-admin API semantics, authentication replacement, or
  tenant-RBAC redesign.
- Demo/provisional behavior, import/migration of customer data, tenant claiming,
  transfer, merge, or public clinic search.
- Doctor Module, clinical, scheduling, inventory, billing, payment, R7, `dev`,
  `test`, and main worktrees.
- New generic workflow, audit, event, or idempotency platforms outside the
  named bounded extensions.

## Implementation gate

All required architecture decisions are resolved. Source-confirmed exact paths
are named; only generated migration identity and optional Platform Foundation
transport placement remain `UNKNOWN`, and neither changes domain semantics.
The bounded Platform Foundation checkpoint is ready for implementation.

Platform Foundation Implementation Status: **READY**

## Implementation Evidence — 2026-07-20

Status: **PLATFORM_FOUNDATION_IMPLEMENTATION_COMPLETE**

Backend revision `20260720_120000` implements the frozen boundary as an
additive merge of repository heads `20260712_000001` and `20260717_100000`.
It creates only the six authorized tables and registers their SQLAlchemy models:

- `org_organizations`;
- `org_organization_members`;
- `org_ownership_verifications`;
- `org_organization_tenants`;
- `org_idempotency_records`;
- `org_audit_logs`.

The implementation adds the named domain ports and SQLAlchemy adapters,
organization authorization/membership operations, opaque ownership-verification
lifecycle service, organization-scoped idempotency adapter, transactional audit
adapter, and both existing unit-of-work compositions. Platform `is_org_admin`
does not participate in customer-organization authorization.

`TenantProvisioningService` retains its default committing behavior for legacy
callers and exposes `provision_tenant_in_transaction()` for an externally owned
transaction. The latter flushes without committing and defers Supabase metadata
synchronization. Organization repositories, verification, idempotency, and audit
adapters flush only, allowing one later application-service commit.

Focused Platform Foundation, tenant-idempotency compatibility, onboarding
idempotency integration, and Clinic Entry domain suites pass. New-file Ruff and
compileall checks pass. Alembic reports one head at `20260720_120000`.

A live local PostgreSQL database was not configured for this checkpoint. Full
offline fresh-chain SQL generation reaches the pre-existing historical revision
`1d51109d8e2d` and fails because that revision performs runtime inspection on an
offline mock connection, matching the already documented migration-chain debt in
ADR-PF-001. This does not alter the new revision or authorize editing historical
migrations; real PostgreSQL upgrade/downgrade remains a release verification
gate.

## Clinic Identity Persistence Addendum — ADR-PF-007

Status: **CLINIC_IDENTITY_PERSISTENCE_READY_FOR_IMPLEMENTATION**

The frozen Platform Foundation boundary is extended only as follows:

- modify `app/infrastructure/db/models/organization_tenant.py` to add nullable
  `identity_version` and `identity_fingerprint` fields plus paired-nullability
  and active organization-scoped uniqueness metadata;
- modify `app/domain/repositories/i_organization_tenant_repository.py` and
  `app/infrastructure/repositories/organization_tenant_repository.py` for
  active identity lookup, authoritative capture, and safe identity replay;
- add one migration under `app/infrastructure/db/migrations/versions/`, with its
  generated revision ID descending from the current merged head;
- update model/migration registration only if the repository requires it;
- add focused identity repository, concurrency, typed-conflict, and migration
  tests under `tests/`.

The partial unique index scope is organization + identity version + fingerprint
for active, non-null identity rows. Existing rows remain valid with both fields
null and receive no backfill. No new table, duplicate detector, Platform
Foundation service, Clinic Entry transport, or frontend source is authorized in
the identity-persistence checkpoint.

## Verified Clinic Contact Addendum — ADR-PF-008

Status: **VERIFIED_CLINIC_CONTACT_PERSISTENCE_READY_FOR_IMPLEMENTATION**

The next bounded Platform Foundation checkpoint may change only:

- `app/infrastructure/db/models/org_tenant.py` for nullable email and the six
  approved contact-contract, primary-kind, and per-method provenance fields;
- `app/domain/dto/clinic_entry.py` and `app/domain/clinic_identity.py` for the
  additive email-only/mobile-only/dual-contact DTO, validation, and versioned
  normalization boundary;
- `app/application/onboarding/tenant_provisioning_service.py` only to map
  explicitly verified clinic contact values and provenance without copying actor
  identity or generating placeholders;
- existing tenant repository mapping only where new fields require round-trip;
- one additive Alembic migration under
  `app/infrastructure/db/migrations/versions/`, descending from the current head;
- focused tests under `tests/` and registration files only if required.

Upgrade makes `org_tenants.email` nullable, adds the six ADR-PF-008 fields and
safe constraints, and performs no data update. Downgrade must transactionally
refuse when any null-email row exists; it cannot fabricate or delete data.

No new table, contact subsystem, verification provider, Clinic Entry service,
endpoint, frontend source, historical migration edit, or unrelated tenant
profile change is authorized in this checkpoint.
