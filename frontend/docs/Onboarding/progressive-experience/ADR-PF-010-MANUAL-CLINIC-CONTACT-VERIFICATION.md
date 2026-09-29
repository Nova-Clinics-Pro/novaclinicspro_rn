# ADR-PF-010: Manual Clinic Contact Verification

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Operations, Platform Security, Platform Foundation, and Authentication

Scope: Platform-wide Version 1 manual authority for clinic-contact verification

## Context

ADR-PF-009 defines server-issued clinic-contact evidence but deliberately does
not approve an email, SMS, OTP, external-provider, or manual-verification
method. TG19 needs one deployable method that can move a pending evidence record
to `verified` without allowing a client to assert verification truth.

Repository evidence also shows that existing generic permission dependencies
grant platform `is_org_admin` a blanket bypass. That behavior is not sufficient
for this security-sensitive authority. Manual verification therefore requires a
dedicated, explicitly assigned, non-bypassable platform capability.

## Decision

Version 1 uses a manual Platform Authority verification method identified by
the immutable method/version key `manual_platform_authority_v1`.

The accountable verifier is an authenticated Platform Operations or Platform
Security principal explicitly granted:

```text
platform.clinic_contact_verification.approve
```

Possession of `is_org_admin`, an organization role, a tenant role, or access to
the request does not grant this capability. The implementation must evaluate
the explicit platform capability without the current generic platform-admin
bypass. Assignment and revocation of this capability remain platform-security
administration responsibilities and must be auditable.

Organization Owners and Organization Administrators may request verification
for their organization. Organization Owners, Organization Administrators,
Clinic Administrators, ordinary organization users, and the requesting actor
cannot approve their own evidence.

## Request Creation

An authenticated actor with active destination-organization membership and the
existing `organization.clinics.create` permission may request verification for
an approved clinic email or mobile contact.

The Platform Clinic Contact Verification service remains the issuer. It:

1. resolves the authenticated actor and active organization membership;
2. accepts organization identity, contact kind and transient contact value,
   intended operation, contract/policy version, and an idempotency key;
3. normalizes and fingerprints the contact using ADR-PF-009 policy;
4. creates or safely replays a pending evidence record with an expiry;
5. returns the opaque evidence reference once with safe status and expiry.

The request binds organization, actor, contact kind/fingerprint, operation, and
expiry. Creating or replaying it never marks it verified. Raw normalized contact
is not persisted in the evidence record, audit, idempotency response, logs, or
analytics.

## Manual Authority and Independence

The verifier authenticates through the existing authentication boundary and is
resolved to the platform principal that owns the explicit approval capability.
Authorization must fail closed unless that exact capability is active.

The verifier must be independent of the requesting organization:

- the verifier must not be the requesting actor;
- the verifier must not have an active Owner, Administrator, or other membership
  in the destination organization;
- the verifier must not approve evidence requested on their own behalf;
- dual-role principals are ineligible even when they also hold the platform
  capability.

These checks are evaluated at decision time, not inferred from cached claims.

## Approval Protocol

The manual authority may approve, reject, or revoke a pending/verified request,
or allow it to expire under policy. Every decision requires:

- authenticated verifier identity;
- the explicit non-bypassable approval capability;
- current independence from the destination organization and requesting actor;
- a stable reason/evidence-classification code from an allowlist;
- server timestamp and immutable audit event;
- optional safe external reference containing no raw evidence or secret;
- the expected lifecycle version for concurrency-safe transition.

Approval records method `manual_platform_authority_v1`, safe reason category,
verifier identity, timestamp, and safe external reference, then transitions
`pending` to `verified`. Rejection transitions `pending` to `rejected`.
Revocation transitions eligible `pending` or `verified` evidence to `revoked`.
Expiry remains policy-driven. Concurrent or repeated decisions produce one
authoritative outcome; an equivalent replay is idempotent and a conflicting
decision fails closed.

The manual transport never accepts client-supplied `verified` state,
verification timestamps, provenance, fingerprints, audit payloads, or method
identity.

## Completion and Consumption

Successful approval returns only safe evidence identity/status, method/version,
expiry, and timestamps. The opaque reference originally issued to the requester
does not change and is not re-exposed to the verifier.

Clinic Entry later supplies that opaque reference with the exact contact and
operation. The existing Platform Clinic Contact Verification service validates
organization, actor, operation, kind, fingerprint, policy, verified state, and
expiry, then consumes the evidence atomically with Clinic Entry. Approval does
not create, associate, select, or provision a clinic or tenant.

## Audit and Security

Immutable audit events are required for request, replay, read access, approval,
rejection, revocation, expiry, authorization failure, conflict, and later
consumption. Safe audit metadata includes evidence ID, organization ID, requester
and verifier IDs, operation, contact kind, method/policy version, reason
category, outcome, correlation/idempotency identity, and timestamps.

The following are prohibited from logs, audit, analytics, errors, idempotency
responses, list/read responses, and approval responses: opaque reference values,
raw contacts, fingerprints, codes, credentials, tokens, provider payloads, and
unapproved evidence attachments.

List/read access requires the same explicit platform capability and returns only
the minimum safe review projection. Organization scope and actor binding remain
server authoritative. Non-disclosing typed errors cover unauthorized,
not-found-or-not-authorized, pending, rejected, expired, revoked, consumed,
conflict, rate-limited, retryable failure, and terminal failure.

Rate limits, review queues, attempt limits, abuse monitoring, separation-of-duty
alerts, and risk escalation are required extension points. Concrete thresholds
are Platform Security operational policy and do not change this contract.

## Authorized Version 1 Transport

The bounded implementation may add:

- an organization-authorized endpoint to request email or mobile evidence;
- a requester-safe status endpoint scoped to the issuing organization and actor;
- a platform-authority pending-request list/read endpoint if operational review
  requires it;
- platform-authority approve, reject, and revoke endpoints;
- explicit non-bypassable platform-capability dependencies;
- typed request/response/error schemas;
- audit and idempotency composition through existing infrastructure.

No endpoint may return the opaque reference after its authorized issuance
response, accept verification truth from an organization client, or create a
clinic. Public callbacks and email/SMS/provider transport are not authorized.

## Additive Extensibility

Future approved methods may include verified email links, email OTP, mobile OTP,
trusted external providers, and document-assisted review. Each uses a new
immutable method/version adapter behind the ADR-PF-009 lifecycle, evidence
binding, validator, typed errors, audit, and atomic consumer contract.

Future methods cannot reinterpret `manual_platform_authority_v1`, weaken
separation of duties, change existing evidence, or allow client-supplied
verification truth.

## Explicit Non-goals

- Implementing an email, SMS, OTP, or external provider.
- Storing raw evidence, documents, screenshots, or contact values.
- Granting approval through `is_org_admin` alone.
- Organization or clinic self-approval.
- Clinic creation, association, tenant claiming, import, migration, or transfer.
- Frontend orchestration, TG19 final acceptance, TG20, or clinical/payment work.

## Consequences

The Version 1 manual authority, authentication, independence, approval,
auditability, completion, and extension contracts are approved. Implementation
is a separate bounded backend checkpoint and must pass the tests authorized in
`E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md`.

Manual Clinic Contact Verification Implementation Status: **READY**
