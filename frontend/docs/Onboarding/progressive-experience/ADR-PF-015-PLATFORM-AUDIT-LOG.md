# ADR-PF-015: Platform-Wide Audit Log

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Security, Platform Operations, and Product Architecture

## Decision

Platform-wide security and administration events that have no legitimate
organization owner use a dedicated append-only table:

`org_platform_audit_logs`

`org_audit_logs` remains unchanged and continues to own organization-scoped
events. Its required `organization_id` must not be made nullable, populated with
a fabricated value, or inferred for platform-wide activity.

## Scope and Ownership Boundary

Platform audit owns events such as:

- initial platform-capability bootstrap;
- platform-capability grant, suspension, revocation, and rotation;
- platform verifier assignment lifecycle;
- emergency capability recovery;
- future approved platform-security administrative operations without a
  legitimate organization scope.

Organization audit continues to own organization membership, organization–
tenant association, Clinic Entry, organization-scoped verification, and other
events whose authority and resource genuinely belong to an organization.

An operation writes to the audit source that owns its authorization scope. It
must not duplicate an event across both sources merely for convenience. A
future centralized export may combine both sources without changing ownership
or persistence semantics.

## Persistence Contract

Each `org_platform_audit_logs` record contains at minimum:

- immutable audit event UUID;
- stable event type;
- actor type;
- authenticated actor/principal `org_user_id` when one exists;
- target principal `org_user_id` when applicable;
- capability code or other protected-resource identifier;
- safe outcome/status;
- safe reason classification;
- correlation/request/deployment identifier when available;
- immutable safe metadata payload;
- server-created timestamp.

Approved actor types are:

- `authenticated_platform_principal`;
- `deployment_bootstrap_system`;
- `emergency_recovery_authority`.

System/bootstrap and emergency events do not invent an organization actor.
Their authenticated actor ID may be null only when the approved actor type
represents system authority. Target principal identity remains explicit when
the operation targets a user.

The table contains no `organization_id`. It stores no credentials, passwords,
API keys, raw tokens, opaque verification references, verification evidence,
contact values, fingerprints, provider payloads, or unrestricted free-form
reasons.

## Immutability

Platform audit is append-only:

- the application repository exposes insert and controlled read operations,
  with no normal update or delete method;
- inserted event identity, payload, actor, target, outcome, reason, correlation,
  and timestamp are immutable;
- database permissions must deny ordinary application update/delete access
  where deployment policy supports separate privileges;
- repository and service tests must prove no mutation path is exposed;
- tamper-evident chaining/signing and archival are explicit additive extension
  points;
- retention and legal-hold policy are explicit operational extension points and
  must not be implemented as ordinary record deletion.

## Transaction Semantics

A capability assignment mutation and its platform audit record share one unit
of work and transaction. Repositories flush without committing; the owning
application service commits only after both writes succeed.

Bootstrap, grant, suspension, revocation, rotation, and emergency recovery fail
if audit persistence fails. Assignment persistence failure rolls back audit;
audit failure rolls back assignment; transaction failure leaves neither side
partially committed.

Idempotent replay returns the existing authoritative assignment/result without
creating a duplicate mutation audit event. Conflicting replay fails closed and
may append a separate safe denied/conflict audit event only when that audit can
be recorded without changing the failed assignment transaction.

## Security and Access

- Write access is limited to approved platform-security application services
  and deployment bootstrap/recovery operations.
- Read access is controlled by an explicit platform capability and is not
  exposed publicly in this phase.
- `is_org_admin`, organization membership, tenant RBAC, and clinic roles provide
  no audit read/write authority.
- Metadata uses allowlisted keys and bounded values.
- Typed failures conceal database details and internal exceptions.
- Environment isolation applies to bootstrap/deployment events; tenant and
  organization data must not be copied into platform audit without an approved
  safe platform purpose.
- Tamper detection, export signing, rate monitoring, retention enforcement, and
  security analytics are additive extension points.

## Compatibility

- `org_audit_logs` schema and behavior remain unchanged.
- Existing organization-scoped operations continue using
  `OrganizationAuditRepository`.
- Platform-wide operations use a separate platform-audit repository and model.
- No historical record is moved or backfilled.
- Existing migrations remain unchanged.
- A future centralized audit query/export may combine the two sources through a
  read model while preserving their distinct ownership and authorization.

## Required Verification

Implementation must prove:

- bootstrap, capability grant, and capability revoke audit insertion;
- authenticated-principal, deployment-system, and emergency actor semantics;
- no organization ID is required or fabricated;
- existing organization audit behavior is unchanged;
- assignment and audit roll back together on either failure;
- append-only repository behavior and immutable payloads;
- sensitive-data exclusion;
- migration upgrade, downgrade, fresh-chain head, constraints, and indexes;
- concurrent/idempotent operations create one authoritative mutation audit.

## Non-Goals

- Making `org_audit_logs.organization_id` nullable.
- Replacing or duplicating organization audit.
- Public audit APIs, frontend audit UI, or analytics/event-platform work.
- Implementing the table, model, migration, repository, bootstrap, capability
  management, or TG19 Checkpoint 3 in this decision task.
- Doctor Module, clinical, scheduling, inventory, billing, payment, R7, TG20,
  or unrelated platform changes.

## Consequences

Platform-wide immutable audit persistence now has an approved ownership and
transaction contract. Platform Capability Bootstrap remains blocked until the
bounded platform-audit implementation is completed and verified.

Platform Audit Architecture Status: **APPROVED**
