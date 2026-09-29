# ADR-PF-002: Organization Membership

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Product Architecture

Scope: Platform Foundation

## Context

NovaClinics needs one organization authority that can be reused by Progressive
Experience, Workspace Management, Organization Administration, RBAC, a future
Admin Portal, Clinic Management, and future APIs. Existing tenant membership
answers who may act inside one clinic. The existing `OrgUser.is_org_admin` flag
is a platform-administration bypass and must not be reinterpreted as membership
in a customer organization.

## Decision

### Organization

An **Organization** is a customer-controlled administrative boundary that may
own and govern one or more clinics. It has a stable opaque `organizationId`, a
display name, lifecycle state, audit metadata, and version. It is not a tenant,
authentication identity, subscription, clinic, or platform administrator.

Version 1 states are `active`, `suspended`, and `closed`. Suspended or closed
organizations cannot gain members or clinics. Closure is an audited terminal
business transition; records are retained according to platform policy rather
than hard-deleted by a product flow.

### Organization Member

An **Organization Member** is the authoritative relationship between exactly one
authenticated Nova user and one organization. Its stable identity is independent
of email, tenant membership, and session claims. Version 1 records:

- `organizationMemberId`, `organizationId`, and `orgUserId`;
- exactly one organization role: `organization_owner` or
  `organization_administrator`;
- lifecycle state and invitation provenance;
- `createdAt`, `activatedAt`, `suspendedAt`, `removedAt`, actor, reason, and
  concurrency version.

The pair `(organizationId, orgUserId)` is unique. Repeated accepted invitations
or membership creates replay the existing membership; they do not duplicate it.

### Organization Owner

An **Organization Owner** has full organization-scoped administration in
Version 1: manage organization administrators, initiate or approve clinic
association, create clinics, and transfer ownership. An organization must always
retain at least one active owner. The last active owner cannot be removed,
suspended, or demoted until another active owner accepts ownership.

Owner authority does not grant clinical access inside every tenant. Tenant data
access still requires tenant membership/RBAC or a separately defined audited
platform operation.

### Organization Administrator

An **Organization Administrator** may perform organization-scoped operations
explicitly granted by platform policy, including clinic creation and verified
clinic association in Version 1. An administrator cannot remove/demote the last
owner, transfer ownership, or grant itself owner authority. Product surfaces may
expose a subset of these permissions but cannot broaden them.

### Clinic Administrator

**Clinic Administrator** is a tenant-scoped RBAC role, not an organization role.
It governs one clinic/tenant and may approve Version 1 proof of authority for
that clinic when granted the platform permission `clinic.ownership.verify`.
Clinic Administrator does not by itself create organization membership, manage
other organization clinics, or associate a clinic with an organization.

The same user may independently hold an organization role and one or more clinic
roles. Authorization evaluates each scope separately.

## Ownership Model and Tenant Relationship

- An organization may govern zero or many tenants.
- A tenant represents one Nova-managed clinic isolation boundary.
- Version 1 allows each tenant to belong to at most one active organization.
- Organization-to-tenant association is authoritative, server-enforced,
  versioned, idempotent, and audited.
- A tenant association grants organization governance, not implicit tenant data
  access. Tenant RBAC remains authoritative for clinic operations.
- Clinic creation atomically creates the tenant association or fails without an
  unassociated product-visible clinic.
- Moving, merging, or sharing a tenant between organizations is not inferred.
  Those require future explicit platform contracts.

Organization identity is the required scope for organization-level duplicate
matching and pre-tenant idempotency. Client-provided organization IDs are never
sufficient authority; the server resolves an active membership for the
authenticated user and requested organization.

## Membership Lifecycle

Version 1 membership states are:

```text
invited -> active -> suspended -> active
   |          |          |
   +------> removed <-----+
   +------> expired
   +------> revoked
```

- `invited`: invitation exists but grants no organization authority.
- `active`: identity has accepted and may receive role permissions.
- `suspended`: authority is denied without deleting history; reinstatement is
  audited.
- `removed`: terminal relationship state; a future rejoin creates a new
  membership identity linked in audit history.
- `expired` and `revoked`: terminal invitation outcomes; no membership authority.

All transitions require an authenticated authorized actor, optimistic
concurrency/idempotency protection, and audit entries. Platform security may
suspend a relationship, but platform administration must be distinguishable
from customer organization actions.

## Invitation Model

Version 1 invitations are applicable to adding Organization Administrators and
additional Owners. An invitation is server-issued, single-purpose, opaque,
time-limited, hashed at rest, bound to organization, intended normalized email
or existing `orgUserId`, proposed role, inviter, expiry, and invitation version.

Only an active Owner may invite an Owner. An active Owner or Organization
Administrator may invite an Administrator. Acceptance requires authentication
whose verified identity matches the intended recipient. Acceptance is
idempotent. Role elevation requires a new authorized transition; forwarding an
invitation cannot transfer authority. Revocation, expiration, mismatch, and
replay are non-disclosing typed outcomes and are audited.

No invitation is required when a platform operation atomically creates the
first organization and its initial Owner from an already authenticated actor.

## Relationship to RBAC

Organization membership is an authorization subject and scope; RBAC remains the
policy evaluator. Version 1 organization permissions include stable keys:

- `organization.read`;
- `organization.members.manage`;
- `organization.ownership.transfer`;
- `organization.clinics.create`;
- `organization.clinics.associate`;
- `organization.clinics.list`.

Role-to-permission mappings are policy, not embedded in UI. APIs evaluate active
membership, organization lifecycle, permission, resource scope, and relevant
tenant relationship. Denials do not disclose organizations, clinics, or members
outside the caller's authority.

Tenant RBAC continues to govern tenant resources. Platform administrator bypass
remains a separately named, audited platform capability and is never returned as
customer organization membership.

## Relationship to Authentication

Authentication proves user identity and session freshness. It does not own
organization membership or role truth. The platform resolves authorization from
authoritative membership storage on each mutation and on security-sensitive
reads. Session projections may include organization summaries for navigation,
but stale claims cannot authorize a transition.

Membership or tenant-association changes require the existing session-refresh
boundary to refresh projections. Revocation/suspension takes effect server-side
without waiting for token expiry. Logout and organization/tenant switching clear
or isolate scoped caches and drafts.

## Security and Audit

Every membership, role, invitation, ownership-transfer, and tenant-association
transition records actor, subject, organization, action, prior/new state,
correlation/idempotency identity, timestamp, policy version, and safe reason.
Secrets and invitation tokens are never logged. Audit access is separately
authorized and tenant data is never copied into organization audit metadata.

## Extension Points

Additive future versions may introduce custom organization roles, permission
bundles, groups, delegated scopes, service accounts, organization hierarchies,
multiple owners with approval quorum, federated identity, or time-bound access.
They must preserve Version 1 role identifiers, membership identities, tenant
isolation, last-owner invariant, audit history, and denial semantics.

Additional tenant relationship types may be added by named/versioned contracts.
They cannot reinterpret Version 1's single active owning organization.

## Explicit Non-Goals

- Clinical authorization, Doctor Module behavior, or access to patient records.
- Subscription, billing, payment, scheduling, inventory, or analytics policy.
- Cross-organization tenant sharing, tenant transfer, merge, or ownership sale.
- Replacing tenant RBAC or the authentication provider.
- Treating platform `is_org_admin` as Organization Owner or Administrator.
- Defining a product-specific screen, navigation flow, or onboarding sequence.

## Consequences

Platform implementations require an authoritative organization aggregate,
membership repository, role policy, tenant association, invitation lifecycle,
typed errors, audit, and session projection. Existing tenant memberships and
platform-admin behavior remain backward compatible and are not silently
reclassified.
