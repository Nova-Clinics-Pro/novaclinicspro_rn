# ADR-PF-011: Effective Tenant Selection and Session Semantics

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Authentication, Platform Foundation, and Workspace/Tenant

## Decision

Database-backed organization membership and organization–tenant association are
authoritative. JWT claims, route parameters, local selection, and cached
application data are projections only.

Each active organization membership may persist one nullable
`effective_tenant_id`. It must reference a tenant with an active association to
that organization and current actor authorization. It is cleared when membership
or association authority ends.

## Authenticated Context

Extend the existing authenticated context endpoint to return:

- actor identity;
- active organization memberships with organization ID, role, and status;
- each organization's safe authorized-clinic set (tenant ID, display name,
  optional safe location, association and lifecycle state);
- per-organization `effectiveTenantId` and `selectionRequired`;
- a top-level effective organization/tenant only when unambiguous;
- `sessionRefreshRequired` when claims differ from database truth.

Inactive/revoked memberships and associations are excluded. `is_org_admin`
creates no customer membership. One clinic may be auto-selected and persisted;
zero yields no selection; multiple clinics without a valid persisted selection
require explicit selection.

## Selection Boundary

```text
PUT /api/v1/auth/organizations/{organizationId}/effective-tenant
```

The request contains `tenantId`, contract version, and `Idempotency-Key`. The
server resolves the actor, locks and revalidates membership/association/tenant,
persists selection, audits, and returns refreshed organization context. An
equivalent replay succeeds; the same key with a different tenant conflicts.
Unauthorized tenants are rejected without existence disclosure.

## Session Semantics

After commit, reuse the existing authentication metadata-sync boundary to
project `organization_id` and `tenant_id`. The client refreshes the existing
session and reloads context. Navigation is allowed only when refreshed database
context authorizes the tenant and claims agree.

Metadata/session refresh failure does not repeat selection or Clinic Entry. It
returns a retryable projection phase while tenant-sensitive navigation remains
blocked.

## Cache and Lifecycle

- Cancel tenant-sensitive requests before switching.
- After refresh, invalidate/refetch organization, tenant, onboarding, and
  journey state; clear or isolate the previous tenant cache/drafts.
- Accept responses only when actor, organization, context version, and intended
  tenant match the current attempt.
- Logout clears local selection, drafts, and queries through existing boundaries.
- Membership revocation or association deactivation clears persisted selection
  and immediately invalidates old claims at server authorization.

## Typed Failures

`organization_context.no_membership`, `organization_context.ambiguous`,
`organization_context.inactive_membership`,
`effective_tenant.selection_required`, `effective_tenant.not_authorized`,
`effective_tenant.inactive`, `effective_tenant.idempotency_conflict`,
`effective_tenant.session_refresh_required`,
`effective_tenant.retryable_failure`, and
`effective_tenant.terminal_failure`.

## Persistence

Add nullable indexed `effective_tenant_id` to `org_organization_members` with a
foreign key to `org_tenants`. Existing rows remain null; no backfill. The
application service enforces same-organization active association.

## Non-goals

No public tenant discovery, parallel auth/session model, frontend-owned tenant
truth, TG19 frontend implementation, TG20, or commercial work.

Effective Tenant Selection Architecture Status: **APPROVED**
