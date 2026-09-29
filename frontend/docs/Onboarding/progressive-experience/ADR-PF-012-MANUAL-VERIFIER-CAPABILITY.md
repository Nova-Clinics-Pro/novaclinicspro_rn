# ADR-PF-012: Manual Verifier Capability Assignment

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Security and Platform Operations

## Decision

`platform.clinic_contact_verification.approve` is an explicit database-backed
platform capability. It is not derived from tenant roles, organization
membership, JWT roles, or `is_org_admin`.

Create `org_platform_capability_assignments` with assignment ID, `org_user_id`,
immutable capability code, status (`active`, `suspended`, `revoked`), grantor,
grant reason/timestamp, suspension/revocation actor/reason/timestamp, version,
and audit timestamps.

## Ownership, Bootstrap, and Lifecycle

Platform Security owns policy and grants/revokes assignments. Platform
Operations owns the verifier roster. Management requires the separate explicit
capability `platform.capabilities.manage`, safe reason, authentication, and
immutable audit.

The first management principal is inserted by a reviewed deployment bootstrap
using a configured existing `org_user_id`; it is never inferred from
`is_org_admin`. Missing bootstrap configuration fails closed. Suspension and
revocation are database-authoritative immediately; cached claims cannot retain
authority.

## Separation of Duties

Manual approval requires an authenticated `org_user`, active explicit approval
assignment, a verifier different from the requester, no active membership in
the destination organization, and no self-evidence. Dual-role principals are
rejected even with the capability. Generic admin-bypass dependencies cannot be
reused.

## Audit and Least Privilege

Grant, suspension, revocation, denied use, review access, and verification
decisions record principal, capability, decision actor, safe reason, outcome,
timestamp, and correlation. Raw evidence/contact/reference data is prohibited.
Only capability managers may safely list assignments. A verifier cannot grant
capabilities without the separate management assignment.

## Typed Failures

`platform_capability.not_assigned`, `platform_capability.inactive`,
`platform_capability.self_approval`,
`platform_capability.dual_role_conflict`,
`platform_capability.unauthorized_manager`,
`platform_capability.idempotency_conflict`,
`platform_capability.retryable_failure`, and
`platform_capability.terminal_failure`.

## Transport

Version 1 may add authenticated grant/suspend/revoke and safe list/read transport
under existing platform conventions, plus a non-bypassable dependency for
ADR-PF-010 review routes. Mutations are idempotent and transactionally audited.

## Non-goals

No replacement of tenant RBAC/organization membership, implicit admin grant,
self-approval, generic entitlement UI, provider integration, or onboarding UI.

Manual Verifier Capability Architecture Status: **APPROVED**
