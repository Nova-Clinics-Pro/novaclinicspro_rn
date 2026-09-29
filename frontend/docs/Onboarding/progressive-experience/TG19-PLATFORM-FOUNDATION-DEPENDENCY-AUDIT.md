# TG19 Platform Foundation Dependency Audit

Date: 2026-07-20

Target: TG19 Frontend Clinic Entry orchestration

Decision: **NOT READY**

Scope: Documentation-only recursive dependency audit of the synchronized
Progressive Experience frontend and backend worktrees

## Executive Decision

TG19 Frontend Orchestration cannot begin safely yet. Clinic Entry mutation
transport is implemented, but the frontend cannot obtain an authoritative
organization context, refresh an authorized clinic set, complete the approved
effective-tenant handoff, or obtain approved contact/ownership evidence through
transport.

This audit identifies the complete Platform Foundation backlog visible in the
approved contracts and current source. The remaining work must be delivered as
one final coordinated Platform Foundation phase, then verified together before
frontend orchestration starts. Implementing only one endpoint family would leave
the same end-to-end path blocked.

## Classification Rules

- `IMPLEMENTED`: approved behavior exists in current source at the required
  layer and is usable by the target flow.
- `IMPLEMENTED_PARTIAL`: a reusable foundation exists, but the target contract
  is incomplete.
- `DOCUMENTED_NOT_IMPLEMENTED`: an approved constitutional contract and boundary
  exist, but source does not implement them.
- `MISSING_DOCUMENTATION`: current contracts do not decide the exact behavior or
  boundary needed for safe implementation.
- `MISSING_IMPLEMENTATION`: behavior is required or mechanically implied by an
  approved contract, but its implementation is absent.
- `NOT_REQUIRED_FOR_TG19`: explicitly outside the TG19 completion path.

## Dependency Matrix

Every recursively discovered dependency is classified exactly once.

| ID | Dependency | Classification | Source/contract evidence | Blocks |
|---|---|---|---|---|
| D01 | Organization aggregate persistence | IMPLEMENTED | `org_organizations` model/repository and Platform Foundation migration exist. | Nothing |
| D02 | Organization membership persistence and lifecycle | IMPLEMENTED | `org_organization_members` represents Owner/Admin roles and active/suspended/removed states. | Nothing |
| D03 | Organization role authorization | IMPLEMENTED | `OrganizationAuthorizationService.require_permission()` resolves active membership without `is_org_admin`. | Nothing |
| D04 | Actor-to-organization membership listing | MISSING_IMPLEMENTATION | Repository supports only `get_active(organization_id, user_id)`; no list-by-actor projection exists. | Frontend orchestration |
| D05 | Authoritative organization-context response | DOCUMENTED_NOT_IMPLEMENTED | Approved prompt/ADR boundary requires memberships, roles, statuses, and organization IDs; `/auth/me` exposes none. | Frontend orchestration |
| D06 | Organization-to-tenant association persistence | IMPLEMENTED | `org_organization_tenants` enforces one active owning organization and active pairs. | Nothing |
| D07 | Active tenant association listing by organization | IMPLEMENTED | `OrganizationTenantRepository.list_active()` exists and excludes inactive rows. | Nothing |
| D08 | Actor-authorized clinic-set projection | MISSING_IMPLEMENTATION | No service joins active actor membership, active associations, tenant lifecycle, and safe clinic metadata. | Frontend orchestration |
| D09 | Safe clinic display metadata projection | MISSING_IMPLEMENTATION | Association rows contain IDs only; no authorized projection joins `org_tenants` name/city/status for auth context. | Frontend orchestration |
| D10 | Single-clinic effective-tenant calculation in Clinic Entry result | IMPLEMENTED | `ClinicEntryService` returns the sole active association as `effectiveTenantId`. | Nothing |
| D11 | Refreshed single-clinic effective-tenant projection | MISSING_IMPLEMENTATION | `/auth/me` trusts JWT `tenant_id` and does not recalculate from current membership truth. | Frontend orchestration |
| D12 | Multiple-clinic `selectionRequired` projection | MISSING_IMPLEMENTATION | Approved policy exists; no backend response exposes the required flag. | Frontend orchestration |
| D13 | Effective-tenant selection command/transport | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-011 fixes endpoint, persistence, session refresh, response, lifecycle, and errors. | Frontend orchestration; final acceptance |
| D14 | Unauthorized/stale requested-tenant rejection | MISSING_IMPLEMENTATION | No authenticated context/selection operation validates a requested tenant against the refreshed authorized set. | Frontend orchestration |
| D15 | Existing basic `/auth/me` identity projection | IMPLEMENTED | User ID, email, JWT tenant, roles, permissions, and application status exist. | Nothing |
| D16 | `/auth/me` organization memberships | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-002 and the remediation objective approve it; `CurrentUserResponse` has no organization field. | Frontend orchestration |
| D17 | `/auth/me` authorized clinics | DOCUMENTED_NOT_IMPLEMENTED | Required refresh contract exists; response contains only one `clinic_names` value derived from JWT tenant. | Frontend orchestration |
| D18 | `/auth/me` effective tenant and selection-required state | DOCUMENTED_NOT_IMPLEMENTED | Required by the handoff contract; response has only legacy `tenant_id`. | Frontend orchestration |
| D19 | Frontend Supabase session refresh | IMPLEMENTED | Existing `useAuth.refreshSession()` refreshes tokens and calls `/auth/me`. | Nothing |
| D20 | Session refresh as authoritative membership refresh | IMPLEMENTED_PARTIAL | Refresh mechanism exists, but backend projection is incomplete and JWT tenant can remain stale. | Frontend orchestration |
| D21 | Platform manual-verifier permission definition | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-010 names `platform.clinic_contact_verification.approve`; central permission catalog does not contain it. | Frontend orchestration |
| D22 | Non-bypassable platform-capability dependency | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-010 prohibits `is_org_admin` bypass; current generic permission dependencies explicitly bypass. | Frontend orchestration |
| D23 | Accountable platform-role/capability assignment source | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-012 fixes database assignment, Platform Security ownership, bootstrap, revocation, and non-bypassable evaluation. | Manual transport; frontend orchestration |
| D24 | Contact-verification persistence | IMPLEMENTED | `org_contact_verifications` and migration `20260720_150000` exist. | Nothing |
| D25 | Contact evidence repository with locked lookup | IMPLEMENTED | Repository/port support hash lookup, add, and lifecycle locking. | Nothing |
| D26 | Contact evidence issuance service | IMPLEMENTED | Service authorizes organization actor, normalizes/fingerprints, creates opaque pending evidence, and audits. | Nothing |
| D27 | Contact evidence validation | IMPLEMENTED | Scope, actor, operation, kind, fingerprint, state, and expiry validation exist. | Nothing |
| D28 | Contact evidence atomic consumption | IMPLEMENTED | Clinic Entry consumes evidence in its unit of work. | Nothing |
| D29 | Contact evidence request endpoint | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-010 authorizes organization Owner/Admin request transport; no router/schema exists. | Frontend orchestration |
| D30 | Requester-safe contact evidence status endpoint | DOCUMENTED_NOT_IMPLEMENTED | Authorized by ADR-PF-010 boundary; no route exists. | Frontend orchestration |
| D31 | Manual contact review list/read transport | DOCUMENTED_NOT_IMPLEMENTED | Conditionally authorized when operational review requires it; no concrete operational decision says whether it is required. | Manual operations deployment |
| D32 | Manual approve/reject/revoke transport | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-010 approves the operations; no router/schema/dependency exists. | Frontend orchestration |
| D33 | Manual verifier/reason/outcome audit mapping | IMPLEMENTED_PARTIAL | Existing append-only `org_audit_logs` can store verifier actor, outcome, correlation, and safe reason/reference metadata; contact service does not yet map manual decisions into it. | Manual transport; final acceptance |
| D34 | Manual verification schema migration | NOT_REQUIRED_FOR_TG19 | Existing evidence lifecycle fields plus append-only organization audit can represent the approved safe decision without changing schema. | Nothing |
| D35 | Contact transport typed-error mapping | IMPLEMENTED_PARTIAL | Stable service codes exist; no contact-verification transport maps auth, lifecycle, conflict, and safe status errors. | Frontend orchestration |
| D36 | Contact request idempotency | IMPLEMENTED | Issuance composes organization-scoped idempotency and safe replay metadata. | Nothing |
| D37 | Manual decision idempotency/concurrency | IMPLEMENTED_PARTIAL | Row version/lifecycle foundations exist, but no explicit reviewer decision service/transport applies expected-version conflict policy. | Final acceptance |
| D38 | Contact verification audit foundation | IMPLEMENTED | Organization audit events are written for lifecycle changes with safe metadata. | Nothing |
| D39 | Manual review audit completeness | MISSING_IMPLEMENTATION | Current audit attributes contact events to requester (`row.actor_id`), not independent verifier; reason category is absent. | Final acceptance |
| D40 | Ownership-verification persistence | IMPLEMENTED | `org_ownership_verifications` contains target tenant, organization, initiator, approver, lifecycle, and expiry. | Nothing |
| D41 | Ownership evidence issuance service | IMPLEMENTED | `OwnershipVerificationService.issue()` creates opaque pending evidence after organization authorization. | Nothing |
| D42 | Ownership approval service | IMPLEMENTED | In-product approver permission and state transition exist. | Nothing |
| D43 | Ownership validation and atomic consumption | IMPLEMENTED | Service resolves server-side target tenant and Clinic Entry consumes the approved record. | Nothing |
| D44 | Ownership request endpoint | MISSING_IMPLEMENTATION | No safe FastAPI transport issues an ownership request. | Frontend orchestration |
| D45 | Ownership approve/reject/revoke endpoint | MISSING_IMPLEMENTATION | Service has approve/revoke but no transport; reject transport/service operation is incomplete. | Frontend orchestration |
| D46 | Ownership safe-status endpoint | MISSING_IMPLEMENTATION | No requester/approver status projection exists. | Frontend orchestration |
| D47 | Authorized non-enumerating target-clinic context | DOCUMENTED_NOT_IMPLEMENTED | ADR-PF-013 fixes approver-authorized context, opaque target issuance, binding, safe handoff, and no-enumeration rules. | Frontend orchestration |
| D48 | Ownership issuance idempotency | IMPLEMENTED_PARTIAL | ADR-PF-003 requires it; current service mints a new reference on each call and does not compose organization idempotency. | Final acceptance |
| D49 | Ownership verification audit | IMPLEMENTED | Issue/approve/expire/revoke/consume events use organization audit. | Nothing |
| D50 | Clinic Entry create/associate DTOs and routes | IMPLEMENTED | Version 1 schemas and both organization-scoped routes are registered. | Nothing |
| D51 | Clinic Entry dependency injection and actor resolution | IMPLEMENTED | Existing UOW, repositories, authorization, verification, and provisioning are composed. | Nothing |
| D52 | Clinic Entry typed transport errors | IMPLEMENTED | Stable safe error payloads cover mutation failures without raw exception text. | Nothing |
| D53 | Clinic identity normalization/fingerprint | IMPLEMENTED | `clinic_identity_v1` normalization is reused server-side. | Nothing |
| D54 | Organization-scoped identity uniqueness | IMPLEMENTED | Association fingerprint fields and partial unique index enforce concurrency-safe duplicate prevention. | Nothing |
| D55 | New-clinic provisioning reuse | IMPLEMENTED | Transaction-safe provisioning core is used; no duplicate engine exists. | Nothing |
| D56 | Organization-scoped Clinic Entry idempotency | IMPLEMENTED | Create/associate use pre-tenant organization scope, conflict, replay, and retry. | Nothing |
| D57 | Single application-owned transaction | IMPLEMENTED | Provisioning, association, evidence consumption, idempotency, and audit share one UOW commit. | Nothing |
| D58 | Clinic Entry authoritative handoff result | IMPLEMENTED | Response includes tenant, effective tenant, refresh-required flag, and `workspace_preparation`. | Nothing |
| D59 | Auth-context integration after Clinic Entry | MISSING_IMPLEMENTATION | No integration makes the new association visible through refreshed auth context. | Frontend orchestration |
| D60 | Onboarding datasource/repository mutation methods | DOCUMENTED_NOT_IMPLEMENTED | Approved frontend target; current onboarding datasource/repository has no Clinic Entry operations. | Frontend orchestration implementation itself |
| D61 | Frontend Clinic Entry DTO/error mapping | DOCUMENTED_NOT_IMPLEMENTED | Approved target; no typed mapping for new/bring/result/stable errors exists. | Frontend orchestration implementation itself |
| D62 | Frontend mutation hooks and attempt idempotency | DOCUMENTED_NOT_IMPLEMENTED | Approved target; no mutation hooks, same-attempt key, pending guard, or retry phase exists. | Frontend orchestration implementation itself |
| D63 | Frontend auth/effective-tenant store boundary | IMPLEMENTED_PARTIAL | Auth store and selected-clinic persistence exist, but validate only against incomplete `ownedClinics` data and are client-local. | Frontend orchestration |
| D64 | Frontend stale-context suppression and query invalidation | MISSING_IMPLEMENTATION | Existing general query client exists; no TG19 organization/user response guard or required invalidation sequence exists. | Frontend orchestration implementation itself |
| D65 | Frontend Clinic Entry presentation | IMPLEMENTED_PARTIAL | ChoiceScreen presents both approved paths accessibly; submission/forms/status/retry integration is absent by design. | Frontend orchestration implementation itself |
| D66 | Frontend E2 draft allowlist/cleanup | IMPLEMENTED_PARTIAL | Wizard draft infrastructure and logout cleanup exist; E2 pre-tenant allowlist and success/abandon cleanup are not implemented. | Frontend orchestration implementation itself |
| D67 | Localization and central theme foundations | IMPLEMENTED | Both locale catalogs, theme tokens, icons, loading/error primitives, and accessible choice cards exist. | Nothing |
| D68 | Frontend TG19 orchestration tests | IMPLEMENTED_PARTIAL | Checkpoint 2 presentation tests exist; datasource/repository/handoff/error/security tests do not. | Frontend orchestration implementation itself |
| D69 | Workspace Preparation implementation | NOT_REQUIRED_FOR_TG19 | TG19 hands off to the TG20 boundary without implementing workspace preparation. | TG20 only |
| D70 | Commercial readiness/subscription implementation | NOT_REQUIRED_FOR_TG19 | Later roadmap epics own readiness/commercial work. | Nothing |
| D71 | Automated email/SMS provider | NOT_REQUIRED_FOR_TG19 | ADR-PF-010 manual authority is the approved Version 1 method. | Nothing |
| D72 | Clinical, scheduling, inventory, billing, and payment systems | NOT_REQUIRED_FOR_TG19 | Explicit constitutional non-goals. | Nothing |

## Classification Totals

The 72 dependencies classify as:

| Classification | Count |
|---|---:|
| IMPLEMENTED | 30 |
| IMPLEMENTED_PARTIAL | 9 |
| DOCUMENTED_NOT_IMPLEMENTED | 16 |
| MISSING_DOCUMENTATION | 0 |
| MISSING_IMPLEMENTATION | 12 |
| NOT_REQUIRED_FOR_TG19 | 5 |

## Complete Remaining Platform Foundation Backlog

The following is the exhaustive Platform Foundation work required before
frontend orchestration begins. Frontend implementation items D60–D68 are not
prerequisites; they are the target work that follows this backlog.

### PF-FINAL-1 — Authoritative organization and clinic context

- Add actor membership list-by-user repository/service projection.
- Extend authenticated context with active organization memberships, IDs,
  roles, statuses, and safe authorized clinic projections.
- Join only active organization associations and active tenant metadata.
- Return authoritative effective tenant and `selectionRequired` from current
  membership truth; do not let stale JWT tenant override it.
- Add non-disclosing zero/one/many, inactive/revoked, cross-organization, stale
  tenant, and post-Clinic-Entry refresh tests.

Owner: Platform Foundation + Authentication. Complexity: high. Order: 1.
Severity: blocks frontend orchestration and final acceptance.

### PF-FINAL-2 — Effective-tenant selection contract and transport

First close D13: approve the exact server-owned selection command, persistence/
session behavior, response, and refresh relationship. Then implement selection
against the refreshed authorized set, reject stale/unauthorized tenants, and
return refreshed effective context. Reuse auth/session infrastructure; do not
create a parallel session.

Owner: Workspace/Tenant + Authentication + Product Architecture. Complexity:
high. Order: 2 after context projection. Severity: blocks frontend orchestration
for multi-clinic users and final acceptance.

### PF-FINAL-3 — Manual contact verification authority

- Decide D23: the authoritative platform-capability assignment/revocation
  source. Reuse `org_audit_logs` for verifier/reason/outcome/safe reference;
  no migration is required.
- Add the explicit `platform.clinic_contact_verification.approve` capability and
  a non-bypassable dependency.
- Extend the service with independent verifier checks, expected-version decision
  transitions, reason classification, verifier-attributed audit, and safe status.
- Add organization request/status and platform review transport authorized by
  ADR-PF-010; no provider integration.
- Verify request/decision idempotency, concurrency, separation of duties,
  lifecycle, redaction, isolation, and later Clinic Entry consumption.

Owner: Platform Security + Platform Operations + Platform Foundation.
Complexity: high. Order: 3; may run after the capability decision in parallel
with PF-FINAL-2. Severity: blocks New Clinic frontend orchestration and final
acceptance.

### PF-FINAL-4 — Ownership verification transport

- Close D47 by approving the non-enumerating source of the exact existing Nova
  tenant reference and the product handoff to the authorized approver.
- Add idempotent ownership request, safe status, approve/reject/revoke transport,
  dependency wiring, and typed non-disclosing errors.
- Compose organization idempotency for issuance and preserve tenant-RBAC
  approval, lifecycle, audit, expiry, revocation, and atomic consumption.
- Verify initiator/approver scope, cross-organization isolation, concurrent
  decisions, replay, and Clinic Entry association integration.

Owner: Platform Foundation + Workspace/Tenant + RBAC. Complexity: high. Order:
4; may run in parallel with PF-FINAL-3 after D47. Severity: blocks Bring Your
Clinic frontend orchestration and final acceptance.

### PF-FINAL-5 — Cross-foundation acceptance gate

Run one real-PostgreSQL integration matrix across organization context, contact
and ownership verification, Clinic Entry create/associate, session refresh,
effective selection, audit, idempotency, concurrency, and tenant isolation.
Verify route registration, stable errors, no secret leakage, Alembic single head,
upgrade/current/downgrade policy, and refreshed authorized clinic visibility.

Owner: Platform Architecture + Security + QA. Complexity: medium. Order: 5.
Severity: blocks frontend orchestration handoff approval and final acceptance.

## Architecture Decision Status

ADR-PF-011 through ADR-PF-013 close D13, D23, and D47. There are zero
`MISSING_DOCUMENTATION` dependencies and no remaining TG19 Platform Foundation
product or architecture decision. All remaining gaps are bounded implementation
or verification work.

## Dependency Graph

```text
Platform Foundation
├─ Organization/member persistence [IMPLEMENTED]
├─ Organization authorization [IMPLEMENTED]
├─ Actor membership projection [MISSING]
├─ Authorized clinic/auth projection [MISSING]
├─ Effective-tenant selection contract + transport [MISSING]
├─ Contact evidence persistence/service [IMPLEMENTED]
├─ Manual verifier permission + persistence + transport [MISSING]
├─ Ownership evidence persistence/service [IMPLEMENTED]
└─ Ownership target context + transport + issuance idempotency [MISSING]
                         │
                         ▼
Backend Transport
├─ Clinic Entry create/associate [IMPLEMENTED]
├─ Typed Clinic Entry errors [IMPLEMENTED]
├─ Refreshed organization/clinic context [MISSING]
├─ Effective-tenant selection [MISSING]
├─ Manual contact verification [MISSING]
└─ Ownership verification [MISSING]
                         │
                         ▼
Frontend Orchestration
├─ Choice presentation [PARTIAL]
├─ Datasource/repository/DTO mapping [DOCUMENTED, NOT IMPLEMENTED]
├─ Mutation/idempotency/error lifecycle [DOCUMENTED, NOT IMPLEMENTED]
└─ Refresh/selection/invalidation/navigation [BLOCKED BY PLATFORM]
                         │
                         ▼
Final Acceptance
└─ Cross-layer isolation, accessibility, localization, concurrency,
   idempotency, migration, and staging evidence [BLOCKED]
```

## Blockers by Milestone

### Frontend orchestration

Blocked by PF-FINAL-1 through PF-FINAL-5. In concrete terms: no authoritative
organization ID/membership projection, no authorized clinic refresh, no approved
effective-tenant selection boundary, no deployable manual contact-verification
transport, and no deployable ownership-verification transport/non-enumerating
target context.

### TG19 final acceptance

Blocked by all frontend-orchestration blockers plus frontend implementation,
manual verifier audit/concurrency evidence, ownership issuance idempotency,
real-PostgreSQL integration, localization/accessibility review, and staging
verification.

### TG20

TG20 must not begin before TG19 final acceptance. Workspace Preparation itself
is not a missing TG19 dependency; the validated `workspace_preparation` handoff
is the TG19 boundary.

## Final Determination

TG19 Frontend Orchestration is **NOT READY**. The final Platform Foundation phase
must deliver PF-FINAL-1 through PF-FINAL-5 as one reviewed program. After that
phase passes, no additional Platform Foundation architecture is expected for
TG19; the remaining work is the already documented frontend orchestration and
final acceptance.

TG19 Frontend Orchestration Status: **NOT READY**

## Architecture Closure Addendum — 2026-07-20

ADR-PF-011 closes effective-tenant selection/session semantics. ADR-PF-012
closes explicit manual-verifier capability assignment. ADR-PF-013 closes the
non-enumerating ownership target context. Dependencies D13, D23, and D47 move
from `MISSING_DOCUMENTATION` to `DOCUMENTED_NOT_IMPLEMENTED`; no TG19 Platform
Foundation architecture decision remains open.

`TG19-FINAL-PLATFORM-FOUNDATION-IMPLEMENTATION-PLAN.md` consolidates PF-FINAL-1
through PF-FINAL-5 into one ordered phase. Frontend orchestration remains
blocked until that phase and its PostgreSQL/security gate pass.

TG19 Final Platform Foundation Plan Status: **READY**
