# ADR-PF-003: Clinic Ownership Verification

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Product Architecture and Platform Security

Scope: Platform Foundation

## Context

Several platform capabilities need a reusable, non-disclosing method to prove
that an actor is authorized to approve an administrative relationship involving
an existing Nova-managed clinic. A tenant identifier, clinic name, verified
contact value, cached membership, or platform-admin flag is not ownership proof.
The contract must serve organization administration, workspace/clinic
management, RBAC, future admin surfaces/APIs, and Progressive Experience without
belonging to any one product journey.

## Decision

### Version 1 mechanism

Version 1 uses **authenticated in-product administrative approval**. An active
principal who already has authoritative tenant membership and the tenant-scoped
permission `clinic.ownership.verify` approves a single proposed association of
that Nova-managed clinic to a destination organization.

Clinic Administrator receives this permission through tenant RBAC in Version 1.
A user who is both an authorized destination Organization Owner/Administrator
and an authorized Clinic Administrator may approve the same request; scope and
permissions are still validated independently and the dual authority is audited.

Control of email/mobile, knowledge of clinic metadata, possession of a tenant
ID, and platform `is_org_admin` alone do not satisfy Version 1 verification.

### Verification issuer

The **Platform Ownership Verification service** is the sole issuer. It is a
platform application capability backed by authoritative organization
membership, tenant membership/RBAC, tenant association, and audit repositories.
Product surfaces request a verification; they do not mint evidence.

The issuer creates a random opaque `ownershipVerificationId` and stores only the
server-side verification record. The identifier contains no clinic,
organization, user, role, or outcome data and has at least 128 bits of
cryptographically secure entropy.

### Required evidence and binding

Issuance requires:

1. an authenticated initiator with active destination organization membership
   and `organization.clinics.associate`;
2. an exact existing Nova tenant reference obtained through an authorized,
   non-enumerating context—not public clinic search;
3. destination organization ID and proposed operation/purpose;
4. an authenticated approver with active membership in that tenant and
   `clinic.ownership.verify`;
5. explicit approval of the named destination organization and purpose.

The server record binds: verification ID hash; target tenant; destination
organization; initiator and approver identities; both authoritative membership
IDs and evaluated permissions; purpose `organization_clinic_association`;
contract/method/policy version; issued, approved, expires, consumed, revoked
timestamps; state; correlation ID; and audit references.

No raw credential, access token, invitation token, OTP, clinic contact data, or
approval secret is part of transferable evidence.

### Verification lifecycle

```text
pending -> approved -> consumed
   |          |
   +-> rejected
   +-> expired
   +-> revoked
```

- `pending`: request exists and grants no association authority.
- `approved`: all authority was validated and the record may be consumed for its
  bound purpose until expiry.
- `consumed`: association committed or idempotently replayed; terminal.
- `rejected`, `expired`, `revoked`: terminal for this verification ID.

Pending records expire after 24 hours. Approved records expire 30 minutes after
approval unless consumed sooner. Expiry durations are named policy values and
may be shortened for security without changing evidence semantics. Association
and consumption occur atomically, or the approved record remains safely
retryable.

### Verification validator

The **Platform Ownership Verification service** is also the authoritative
validator. The consuming Workspace/Tenant application service calls it
server-to-server inside the association transaction. Validation checks:

- record and purpose/version;
- exact target tenant and destination organization;
- state and expiry;
- initiator's current active organization membership and associate permission;
- approver's current active target-tenant membership and verify permission;
- tenant's current organization association and lifecycle;
- revocation and idempotency/concurrency version.

Approval is invalid if relevant authority was removed or suspended before
consumption. The frontend, session claims, route parameters, or a raw identifier
cannot validate evidence.

### Consumption and replay

Consumption is scoped to destination organization + target tenant + purpose +
verification ID and is idempotent. The first successful association records the
authoritative result and consumes the verification. An exact retry returns that
same result without duplicate association or audit effects. A different tenant,
organization, purpose, or request fingerprint returns a non-disclosing conflict.

If the tenant is already associated with the same organization, valid approval
resolves as idempotent success. If associated with another organization, the
request is rejected without identifying that organization. Transfer is not
attempted.

## Audit Requirements

Append-only audit events are required for request, approval, rejection,
expiration, revocation, validation failure, successful consumption, replay, and
conflict. Events record safe IDs, actors, scoped roles/permissions, state
transition, policy/method version, correlation/idempotency IDs, timestamp, and
safe reason category.

Audit and operational logs must redact raw opaque identifiers where full value
is unnecessary, all auth/session material, contact data, and security evidence.
Unauthorized callers receive no target-clinic existence, membership, approver,
or destination-organization details.

## Retry Policy

- Request creation uses platform idempotency scoped to initiator, destination
  organization, target context, purpose, and request fingerprint.
- Repeated approval by the same still-authorized approver returns the same state.
- Transport, timeout, lock, and transient persistence failures are retryable
  with the same idempotency key.
- Rejection, expiry, revocation, permission loss, unsupported method/version,
  and cross-organization conflict are terminal for that verification.
- A terminal verification requires a new request; it is never reset or reused.
- Rate limits apply per actor, destination organization, and target tenant.
  Exceeding them is retryable only after the server-provided safe interval.

## Failure States

Stable platform categories are `validation`, `unauthorized`, `not_found_or_not_authorized`,
`pending`, `rejected`, `expired`, `revoked`, `already_consumed`, `conflict`,
`rate_limited`, `retryable_failure`, and `terminal_failure`. Product APIs map
these to localized safe messages; raw backend text is never displayed. Existence
and identity are deliberately collapsed for unauthorized callers.

Session-refresh failure after successful consumption does not repeat
verification or association. The authoritative result is retained and only the
session projection is retried.

## Relationship to Authentication, RBAC, Organization, and Tenant

- Authentication proves initiator/approver identity and refreshes projections.
- ADR-PF-002 organization membership proves destination authority.
- Tenant RBAC proves existing clinic administrative authority.
- Workspace/Tenant owns the resulting association and effective tenant truth.
- Ownership verification proves approval for one operation; it grants no lasting
  organization or tenant permissions by itself.

## Future Verification Mechanisms

Future named methods may include multi-approver quorum, verified domain/DNS,
regulated business-document review, trusted partner attestation, or platform
support review. Each is an additive method/version behind the same opaque
evidence, validator, lifecycle, audit, non-disclosure, consumption, and result
boundary. A new method cannot weaken or reinterpret Version 1 approval records.

## Explicit Non-Goals

- Public clinic directory, arbitrary tenant search, or existence disclosure.
- Verification based only on clinic metadata, email/mobile possession, tenant
  identifier, route state, invitation forwarding, or platform admin status.
- Tenant claiming without an authorized clinic approver.
- Tenant transfer, organization merge, ownership sale, record migration, EMR or
  vendor import, or external-system integration.
- Authentication-provider replacement, tenant RBAC replacement, or permanent
  access grant.
- Any onboarding screen, journey order, navigation, or product-specific copy.
- Clinical or payment data processing.

## Backward Compatibility and Consequences

Existing tenant membership, tenant provisioning, platform administration, and
authentication remain unchanged until an implementation explicitly adopts this
contract. No existing API is silently treated as verification. Implementations
add a platform issuer/validator, persistent state, RBAC permission, idempotency,
typed errors, and audit integration while preserving existing identifiers and
isolation behavior.

## ADR-PF-018 Non-production System-authority Addendum

ADR-PF-018 approves `verification_strategy_system_authority` with immutable
method/version `nonprod_ownership_strategy_v1` for ownership `AUTO_APPROVE` in
approved non-production environments and ownership `DISABLED` only in narrowly
controlled automated/integration tests.

This authority is not an approver, tenant-RBAC user, organization member,
platform administrator, or fabricated human principal. The normal `REQUIRED`
path and all human authority rules remain unchanged. The system path must issue
normal target/evidence, apply its decision through the ownership lifecycle,
persist mutually exclusive typed system provenance, write Platform Audit,
complete idempotency, and use the existing transaction. It cannot associate a
clinic; Clinic Entry remains the sole consumer and association owner.

The nullable human `approver_id` remains null for system decisions. ADR-PF-018
authorizes the smallest additive extension recording actor classification,
strategy, environment, method/version, safe reason, decision timestamp, and
safe correlation. Production and staging require `REQUIRED`; ambiguous or
bypass-capable production configuration fails startup.
