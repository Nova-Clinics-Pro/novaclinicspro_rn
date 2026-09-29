# E2 Contact Verification Implementation Boundary

Date: 2026-07-20

Status: **FROZEN — READY FOR BOUNDED IMPLEMENTATION**

Governing decisions: `ADR-PF-009-CLINIC-CONTACT-VERIFICATION-EVIDENCE.md`,
`ADR-PF-010-MANUAL-CLINIC-CONTACT-VERIFICATION.md`, and
`ADR-PF-016-MANUAL-VERIFICATION-DECISION-PROVENANCE.md`

## Purpose

This boundary authorizes only the reusable Platform Foundation prerequisite for
server-issued clinic-contact evidence. It does not authorize Clinic Entry
service/transport, frontend orchestration, TG19 acceptance, or TG20.

## Authorized Persistence

Create:

- `app/infrastructure/db/models/contact_verification.py`, mapped to
  `org_contact_verifications`;
- one additive Alembic migration under
  `app/infrastructure/db/migrations/versions/`, whose filename, revision, and
  current down revision are `UNKNOWN` until verified against the implementation
  worktree head.

The model and migration may be registered through existing model `__init__` and
Alembic environment imports only if required. They must not modify
`org_ownership_verifications`, `org_tenants`, organization membership, tenant
association, or existing migration history.

The table may persist only ADR-PF-009 identity/scope/lifecycle fields: internal
ID, opaque-reference hash, contact kind, keyed contact fingerprint and version,
organization, actor, intended operation, contract/policy/method versions,
status, issue/expiry/verified/consumed/revoked timestamps, safe provider
correlation, consumed operation ID, and audit timestamps. No raw contact,
challenge, code, link, provider payload, or secret is authorized.

## Authorized Ports and Adapters

Create:

- `app/domain/repositories/i_contact_verification_repository.py`;
- `app/domain/services/i_clinic_contact_verification_service.py`;
- `app/infrastructure/repositories/contact_verification_repository.py`;
- `app/application/platform/clinic_contact_verification_service.py`.

The repository must support scoped lookup by opaque-reference hash, row-locked
validation/consumption, idempotent issuance lookup, lifecycle updates, and
concurrency-safe consumption. The service owns normalization/fingerprint
binding, issue, trusted verification completion, validate, expire, revoke, and
consume. It must reuse `clinic_identity.py` normalization rather than duplicate
email/mobile normalization.

Existing repository/service `__init__` exports and both current unit-of-work
compositions may change only to register the new adapter. Existing organization
authorization, organization audit, organization idempotency, transaction, and
typed-error infrastructure must be reused.

## Provider and Transport Boundary

No concrete provider is authorized.

An interface for a provider adapter may be added under the existing
integration/application port convention; its exact path is `UNKNOWN` pending a
fresh convention audit. It may accept transient normalized destination data and
return only safe correlation/method information.

ADR-PF-010 approves only `manual_platform_authority_v1`. The implementation may
add the smallest FastAPI transport following existing platform router/schema/
dependency conventions:

- organization-authorized email/mobile evidence request;
- requester-safe evidence status;
- platform-authority pending list/read only if operational review requires it;
- platform-authority approve, reject, and revoke;
- explicit platform-capability authorization that does not inherit the generic
  `is_org_admin` bypass.

The requester is an active Organization Owner or Organization Administrator.
The decision maker is an authenticated, independent Platform Operations or
Platform Security principal explicitly granted
`platform.clinic_contact_verification.approve`. Organization and tenant roles,
ordinary clients, the requester, destination-organization members, and platform
administrators lacking that capability are rejected.

Public callbacks, challenge transport, email/SMS delivery, OTP, and external
providers remain unauthorized. Internal service tests may continue to use a
deterministic fake provider; it is not deployable transport.

ADR-PF-016 authorizes one additive migration on the existing
`org_contact_verifications` table because source evidence confirmed that the
implemented persistence cannot retain the ADR-PF-010 verifier, reason category,
distinct safe external reference, and decision timestamp. The migration may add
only nullable `decision_principal_id`, `decision_reason_code`,
`decision_external_reference`, and `decision_at`, plus the approved verifier
foreign key and structurally safe legacy-compatible constraints. It performs no
backfill and creates no new table or index without demonstrated query evidence.

Existing rows remain valid as `LEGACY_DECISION_PROVENANCE_UNKNOWN`. The
repository and lifecycle service may be extended only to persist, safely read,
and prevent mutation of the approved decision provenance. Platform capability
enforcement remains separate from persistence. No further schema change is
authorized; any additional persistence need is a stop condition.

## Authorized Manual Transport Files

After a fresh convention audit, implementation may extend the existing contact
verification service, its port/repository only where existing lifecycle methods
require it, existing organization audit/idempotency composition, existing
authentication/permission definitions, router registration, and unit of work.
It may create one focused contact-verification schema module, router module, and
dependency module under the repository's current FastAPI conventions, plus
focused tests. It must reuse all existing evidence persistence and normalization.

The explicit platform capability may be added to the central permission catalog
and an accountable platform role mapping. It must be evaluated through a new or
extended non-bypassable platform-capability dependency; changing generic RBAC
bypass semantics repository-wide is not authorized.

## Typed Errors

The existing Clinic Entry DTO/error taxonomy may be extended only with:

- `clinic_entry.contact_verification_invalid`;
- `clinic_entry.contact_verification_expired`;
- `clinic_entry.contact_verification_revoked`;
- `clinic_entry.contact_verification_consumed`;
- `clinic_entry.contact_verification_mismatch`;
- `clinic_entry.contact_verification_in_progress`.

Existing central error schemas/mapping may change only as necessary to expose
these safe codes. Raw backend/provider text is prohibited.

## Audit, Idempotency, and Transaction Integration

- Reuse `OrganizationAuditRepository` and `OrganizationAuditLog`; add safe
  operation names/metadata, not a new audit table.
- Reuse `OrganizationIdempotencyRepository` and shared idempotency policy for
  issuance/replay where the implemented provider supports secure replay.
- Reuse the existing unit of work. Contact evidence consumption and all later
  Clinic Entry database effects must share one transaction.
- Provider delivery is post-commit and uses an existing retry/outbox boundary if
  available. No new generic event platform is authorized.
- Log only IDs, status, kind, method/policy versions, outcome, and safe
  correlation. Never log reference tokens, raw contacts, fingerprints, or
  provider payloads.

## Exact Required Tests

Focused tests under `tests/` must cover:

- opaque server-issued non-guessable evidence and stored token hashing;
- email and mobile evidence independently;
- two-contact independence;
- organization, actor, operation, contact-kind, and contact-value mismatch;
- invalid, pending, expired, revoked, rejected, and consumed evidence;
- one-time consumption and completed-operation replay;
- idempotent issuance/replay where the selected policy permits;
- concurrent consumption with exactly one winner;
- transaction rollback restoring verified evidence;
- audit creation and no duplicate audit side effects;
- cross-organization non-disclosure and isolation;
- no raw secret, contact, reference, fingerprint, or provider payload leakage in
  logs, errors, audit, or stored idempotency responses;
- migration upgrade, constraints, indexes, legacy coexistence, downgrade, fresh
  chain, and single-head verification;
- focused Ruff, compileall, Pytest, Alembic heads/current/upgrade/downgrade, and
  `git diff --check`.

ADR-PF-010 additionally requires:

- active Organization Owner/Administrator may request pending evidence;
- organization user, Clinic Administrator, and requester cannot approve;
- explicitly permitted independent platform verifier may approve;
- `is_org_admin` without the explicit capability is rejected;
- dual-role/self-approval and wrong-organization/contact decisions are rejected;
- approve, reject, revoke, expiry, consumption, concurrent decisions, and
  idempotent replay have one authoritative outcome;
- audit includes requester, verifier, safe reason category, method, and outcome;
- no raw reference/contact/fingerprint/secret leaks through review transport;
- Clinic Entry consumes only evidence approved under the accepted method.

Real PostgreSQL verification is required for row locks, uniqueness, concurrent
consumption, and rollback before the prerequisite is complete.

## Files and Areas Prohibited from Changing

- Frontend source, locale catalogs, theme, navigation, stores, hooks, and
  repositories.
- Clinic Entry service, schemas, router, endpoint registration, or dependency
  wiring in this prerequisite.
- ADR-PF-008 persistence semantics or existing verified-contact columns.
- `org_ownership_verifications` model/table/service/repository except read-only
  pattern reuse.
- Organization membership, tenant association, tenant provisioning, auth
  provider behavior, and existing migrations.
- Requirements, design, Phase 2 roadmap, task groups, E1/TG18 behavior, TG20,
  Doctor Module, clinical, scheduling, inventory, billing, payments, R7, `dev`,
  `test`, and main worktrees.
- A concrete email/SMS provider, generic verification platform, public contact
  discovery, import, merge, transfer, or tenant claiming.

## Completion Gate

The manual transport checkpoint is complete only when the ADR-PF-016 additive
persistence extension and the existing model,
repository, lifecycle service, explicit non-bypassable platform capability,
request/review/status transport, typed errors, audit/idempotency/transaction
integration, and all focused tests pass. No provider is required for the
approved manual method. Any automated email/mobile verification remains blocked
until its provider adapter is separately approved.

Manual Clinic Contact Verification Implementation Status: **READY**
