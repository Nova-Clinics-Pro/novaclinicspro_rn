# E2 Source Reuse Audit

Date: 2026-07-20

Status: Complete repository evidence audit; implementation not authorized

## Classification

- `REUSE_AS_IS`: contract and authorization match without semantic change.
- `EXTEND_EXISTING`: the owner/layer is correct but requires bounded additions.
- `NEW_CONTRACT_REQUIRED`: no safe matching behavior exists.
- `NOT_APPLICABLE`: deliberately excluded from E2.

## Operation Matrix

| TG19 operation | Classification | Repository evidence and decision |
|---|---|---|
| Read application context | `REUSE_AS_IS` | Existing onboarding application query/repository may supply accepted context; it is not tenant authority. |
| Administrative tenant list/detail | `NOT_APPLICABLE` | `/org/tenants` is platform-admin and can list global tenants; it must not become clinic discovery. |
| Administrative tenant create | `NOT_APPLICABLE` | `org_tenants_router.py` requires global `is_org_admin`; DTO/service do not implement organization scope, normalized identity, association, or operation replay. |
| Provision a new tenant and owner | `EXTEND_EXISTING` | `TenantProvisioningService` already creates tenant, owner `TenantUser`, role seed, event, and Supabase metadata. Wrap it behind the E2 application contract; do not copy it. |
| Associate existing clinic to organization | `NEW_CONTRACT_REQUIRED` | No organization-association aggregate, repository operation, or authorization contract was found. |
| Issue/validate ownership evidence | `NEW_CONTRACT_REQUIRED` | No ownership-verification mechanism was found. |
| Normalize/match clinic identity | `NEW_CONTRACT_REQUIRED` | Existing generated tenant code/global uniqueness is not organization-scoped duplicate matching. Add the Version 1 domain policy behind repository lookup. |
| Platform idempotency for association | `EXTEND_EXISTING` | Existing service provides fingerprint, conflict, in-progress, replay, and retry behavior. Target tenant exists, but scope must also bind destination organization. |
| Platform idempotency for create | `EXTEND_EXISTING` | Service behavior is reusable, but its persisted scope requires `tenant_id` before creation. Add a real pre-tenant organization scope; never use a fake tenant ID. |
| Tenant membership authorization | `EXTEND_EXISTING` | `TenantUserContext` and tenant membership checks remain valid after association. They do not prove destination-organization authority. |
| Organization role authorization | `NEW_CONTRACT_REQUIRED` | `OrgUser.is_org_admin` is documented as platform admin/cross-tenant bypass, not Organization Owner/Admin membership. |
| Effective clinic list/session data | `EXTEND_EXISTING` | Auth `ownedClinics`, selected clinic, and refresh boundary are the existing frontend truth path; backend `/auth/me` must expose newly authorized clinics consistently. |
| Single clinic auto-selection | `REUSE_AS_IS` | Auth store already selects the only owned clinic. |
| Multiple clinic explicit selection | `EXTEND_EXISTING` | Existing selected-clinic persistence is reusable; validate persisted selection against refreshed authorized clinics and clear stale tenant state. |
| Session refresh | `EXTEND_EXISTING` | Existing `useAuth.refreshSession` refreshes tokens and `/auth/me`; add result validation and phase-specific typed recovery, not a second auth flow. |
| Typed errors | `EXTEND_EXISTING` | Backend `ErrorResponse/ErrorDetail`, domain exceptions, frontend error tokens/handler are foundations. Existing tenant HTTP strings and generic JS `Error` must be mapped to E2 codes. |
| Audit | `EXTEND_EXISTING` | Generic tenant audit log and `TenantCreatedEvent` can carry versioned create/association outcomes; add redacted event types/metadata. |
| Local draft persistence | `EXTEND_EXISTING` | Wizard store/storage already provides scoped draft persistence and cleanup. Enforce the E2 allowlist and pre-tenant cleanup; do not add a store. |
| Logout cache/draft cleanup | `EXTEND_EXISTING` | `useAuth` clears session, query cache, and wizard identity drafts. Cover pre-tenant E2 scope and tenant switch. |
| Demo/provisional create | `NOT_APPLICABLE` | Demo service is an existing special lifecycle and cannot implement the target E2 paths. |
| Import/migration/claim/merge | `NOT_APPLICABLE` | Explicitly outside Version 1. |

## Reuse

- Central theme tokens, typography, spacing, icon and form primitives.
- Existing localization framework and both locale catalogs.
- `ChoiceScreen` shell/navigation semantics after removing demo-path coupling.
- Approved portions of `ClinicProfileScreen` fields and form behavior.
- Application query and centralized onboarding query keys.
- Auth store, `useSelectedClinic`, refresh/logout boundaries, and query client.
- Tenant provisioning service, tenant/user repositories, role seeding, and
  Supabase metadata synchronization behind the new application operation.
- Platform idempotency algorithm/fingerprint/replay behavior.
- Standard error schema/exceptions, audit repository/model, and tenant-created
  event infrastructure.
- TG18 journey surface only after authoritative effective-tenant handoff.

## Extend

- Onboarding domain DTOs and repository interface with two typed E2 commands and
  one authoritative result; presentation must not call Axios.
- Auth clinic refresh/selection validation and tenant-switch cleanup.
- Wizard draft serializer with a positive allowlist and lifecycle cleanup.
- Provisioning orchestration with normalized duplicate lookup, organization
  authorization, atomic association, and idempotent replay.
- Platform idempotency persistence with a genuine pre-tenant organization scope.
- Existing standard error and audit structures with E2 stable codes/events.

## Do Not Reuse

- Global `/org/tenants` list/create as clinic-entry or Bring Your Clinic.
- `createDemoTenant` or application/demo identity as a target E2 contract.
- Route/cached tenant IDs, global `is_org_admin`, or tenant code as ownership
  evidence.
- Client-side duplicate detection, arbitrary clinic search, raw server messages,
  direct Axios calls, or Wizard Draft as authoritative truth.
- Any duplicate repository, store, auth flow, theme/localization framework,
  Journey Card foundation, provisioning engine, or idempotency engine.

## Source Evidence Inspected

Frontend evidence includes `ChoiceScreen.tsx`, `ClinicProfileScreen.tsx`, the
onboarding repository/datasource/DTO/query boundaries, `wizard.store.ts`, auth
store/entities/`useAuth`, central errors, locale catalogs, theme and navigation.

Backend evidence includes `org_tenants_router.py`, `org_tenant.py` schema/model,
`OrgTenantsService`, `TenantProvisioningService`, application/demo/onboarding
flows, RBAC dependencies and tenant membership, auth router/session metadata,
platform idempotency service/repository/model/migration, error schemas/domain
exceptions, and audit/event infrastructure.

## Mandatory Principles

All reuse/extension must preserve central Theme, both locales, accessibility,
Clean Architecture, tenant isolation, specialty-neutral stable keys, additive
Version 1 contracts, and reuse-before-create. No classification authorizes code.
