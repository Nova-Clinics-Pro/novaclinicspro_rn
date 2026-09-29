# ADR-PF-004: Organization–Tenant Association

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Product Architecture and Platform Foundation

Scope: Platform Foundation

## Context

ADR-PF-002 defines Organization and Organization Member, but repository evidence
confirms that neither is persisted. `org_users.is_org_admin` is a platform-wide
administrative bypass, while `tenant_users` is clinic-scoped RBAC. Neither may
be reinterpreted as customer-organization membership. A durable organization
authority and an explicit organization-to-tenant relationship are therefore
required before Clinic Entry or any other product can govern multiple clinics.

## Decision

### Aggregate identity and persistence

Organization is a new platform aggregate with an opaque UUID identity. Version
1 uses new persistence; it is not an extension of tenant RBAC. The aggregate is
stored in `org_organizations` with display name, lifecycle state (`active`,
`suspended`, `closed`), optimistic concurrency version, and audit timestamps.
It does not contain clinical data, subscription state, or authentication truth.

Organization membership is stored in `org_organization_members`. Each record
binds one `org_users.id` to one organization with role
`organization_owner` or `organization_administrator`, lifecycle state, audit
provenance, and concurrency version. `(organization_id, org_user_id)` is unique.
Only active membership in an active organization authorizes organization work.

### Organization-to-tenant association

`org_organization_tenants` is the authoritative owning relationship between an
organization and an existing `org_tenants` row. It records stable identity,
organization, tenant, lifecycle state, association method/version, actor,
source verification when applicable, timestamps, and concurrency version.

Version 1 invariants are:

- a tenant has at most one active owning organization;
- an organization may own zero or many tenants;
- repeated association to the same organization is idempotent;
- association to another organization is a non-disclosing conflict;
- create-clinic commits tenant and association atomically;
- removal, transfer, sharing, merge, and cross-organization ownership are not
  inferred and require future contracts;
- organization governance does not grant tenant data access; `tenant_users`
  and tenant RBAC remain authoritative for clinic operations.

### Roles and authorization

Organization Owner and active Organization Administrator may create clinics and
associate a verified clinic under the ADR-PF-002 permission policy. The server
resolves `org_users.id` from the authenticated identity and then loads current
membership; client organization IDs and session claims are never authority.
Platform `is_org_admin` is not an organization role and does not bypass this
check. Clinic Administrator remains tenant-scoped and participates only in the
ADR-PF-003 verification approval boundary.

### Lifecycle and multi-clinic behavior

Organization lifecycle is server-enforced. Suspended or closed organizations
cannot gain members or tenants. Associations use `active` and `inactive`
lifecycle states; Version 1 product operations create or consume active rows but
do not implement transfer or reactivation policy.

An organization may have many active clinic associations. The association
repository supplies only organization-authorized tenant identities. Effective
tenant selection remains explicit and tenant authorization remains independent.
No query may enumerate clinics outside the caller's organization authority.

## Persistence constraints and indexes

- All tables use approved `org_` prefixes.
- Foreign keys target `org_users.id`, `org_tenants.id`, and the new organization
  aggregate with restrictive deletion; lifecycle transitions replace cascaded
  business deletion.
- Unique `(organization_id, org_user_id)` membership.
- Partial unique active ownership on `tenant_id` for associations.
- Unique active `(organization_id, tenant_id)` association.
- Indexes cover organization/lifecycle, user/lifecycle, and tenant/lifecycle.
- Check constraints limit Version 1 lifecycle and role values.
- No identity/contact or clinical payload is copied into association rows.

## Audit and isolation

Membership and association transitions are recorded inside the owning database
transaction using organization-scoped audit persistence. Audit records include
safe IDs, actor, action, old/new lifecycle, policy/contract version,
correlation/idempotency identity, and timestamp. They exclude authentication
material, ownership evidence, clinic contact values, and clinical data.

Tenant audit remains tenant-scoped and cannot serve as the only record of a
pre-tenant organization action. Cross-organization denial is non-disclosing and
is recorded without exposing the conflicting organization.

## Backward compatibility

Existing `org_tenants`, `org_users`, `tenant_users`, tenant RBAC, and platform
admin APIs keep their current semantics. Migration introduces additive tables
and does not backfill or infer customer organizations from `is_org_admin` or
tenant membership. Existing tenants remain unassociated until an approved
platform operation associates them.

## Extension points

Future versions may add invitations, custom roles, delegated scopes,
organization hierarchies, transfer workflows, shared governance, or external
organization authority. They must preserve Version 1 identifiers, single active
owning relationship, tenant isolation, audit history, and non-disclosure.

## Explicit non-goals

- Tenant transfer, merge, sharing, public discovery, or claiming.
- Authentication-provider or tenant-RBAC replacement.
- Clinical, Doctor Module, scheduling, inventory, billing, or payment behavior.
- Frontend-owned membership, association, or authorization truth.

## Consequences

Platform Foundation must add the three `org_` tables, domain ports, SQLAlchemy
adapters, organization authorization policy, organization audit support, and
focused migration/isolation tests before Clinic Entry operations are wired.
