# ADR-PF-009: Clinic Contact Verification Evidence

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Foundation, Authentication, and Platform Security

Scope: Reusable server-side evidence that a contact value was verified for an
organization-scoped clinic operation

## Decision

Platform Foundation shall own a distinct `org_contact_verifications` evidence
lifecycle. It shall not extend `org_ownership_verifications`.

Clinic ownership evidence proves authority over an existing tenant and is bound
to a target `tenant_id`. Clinic-contact evidence proves control of one exact
normalized email or mobile for an intended operation and must work before a new
tenant exists. Combining them would require nullable or polymorphic ownership
fields, weaken lifecycle meaning, and couple unrelated future consumers.

The new lifecycle reuses the existing organization authorization, organization
idempotency, transactional audit, typed-error, unit-of-work, opaque-token, and
normalization foundations. It does not create a provider, messaging platform,
or second general verification framework.

## Evidence Identity

Each record has:

- an internal UUID evidence ID;
- a cryptographically random, non-guessable opaque reference returned once to
  the authorized client and stored only as a one-way token hash;
- contact kind `email` or `mobile`;
- a keyed contact fingerprint calculated from the normalized value, contact
  kind, contract version, and server-held secret;
- destination organization ID and authenticated organization-user actor ID;
- intended operation, initially `clinic_entry.create.v1`;
- contract, normalization, verification-policy, and method/version identifiers;
- issue and expiry timestamps;
- lifecycle status and safe verification/consumption timestamps;
- optional provider-safe correlation identifier, never a code, token, provider
  payload, or raw contact value;
- consuming operation ID when consumption succeeds.

The database does not persist the raw normalized contact. The provider adapter
may receive it transiently to deliver a challenge. Validation normalizes the
contact supplied by the authoritative command and compares a keyed fingerprint.
An unkeyed contact hash is prohibited because email addresses and telephone
numbers have guessable input spaces.

## Lifecycle

The Version 1 lifecycle is:

```text
issue -> pending -> verify/approve -> verified -> consume -> consumed
                    |                 |
                    +-> rejected      +-> expired
pending/verified --------------------------> revoked
```

Issuance and successful verification are separate operations.

- `issue` authorizes the actor, normalizes and fingerprints the contact, creates
  or idempotently replays a pending record, and invokes an approved provider
  adapter if one exists.
- `verify/approve` is invoked only by a trusted server-side provider adapter or
  a separately approved manual-verification authority. A client assertion of a
  timestamp, method, or successful outcome is never accepted.
- `validate` locks the record and checks token hash, status, expiry,
  organization, actor, intended operation, contact kind, contact fingerprint,
  policy version, and method compatibility.
- `expire` makes pending or verified evidence terminal after its policy expiry.
- `revoke` makes pending or verified evidence terminal and records an audit
  outcome.
- `consume` changes verified evidence to consumed in the same transaction as
  the authorized Clinic Entry mutation.

Statuses are `pending`, `verified`, `consumed`, `rejected`, `expired`, and
`revoked`. Version 1 evidence is one-time. A completed Clinic Entry idempotency
replay returns its stored authoritative result without consuming again. A
different operation or idempotency claim cannot reuse consumed evidence.

## Issuer Ownership

The accountable issuer is the Platform Clinic Contact Verification service,
owned jointly by Platform Foundation and Authentication, with security policy
owned by Platform Security. The service is the only authority permitted to
issue references or mark evidence verified.

No concrete email or SMS provider is approved by this ADR. Repository evidence
shows actor-auth magic-link initiation and logging communication adapters, but
neither verifies a clinic-bound contact under this contract. ADR-PF-010 approves
the additive `manual_platform_authority_v1` method. Only an authenticated,
independent Platform Operations or Platform Security principal with the
explicit non-bypassable capability
`platform.clinic_contact_verification.approve` may use that method to produce
`verified` state. Email link/code, mobile OTP, or trusted external verification
still requires a separately approved adapter and method/version key.

## Validator and Consumer

The Platform Clinic Contact Verification service validates evidence. The Clinic
Entry application service is the Version 1 consumer.

For every contact in `ClinicIdentityInputV1`, Clinic Entry supplies the opaque
reference plus the contact kind/value to the validator. Validation requires an
exact match for organization, authenticated actor, intended operation, kind,
normalized-value fingerprint, unexpired verified status, and policy version.
With two contacts, two independently verified references are required. Primary
selection does not transfer evidence between contact kinds.

Clinic Entry receives only a safe resolved result containing evidence ID,
contact kind, normalized value, verified timestamp, and stable verification
method/version. Those server-resolved values—not client provenance—populate the
ADR-PF-008 persistence mapping.

Typed failures are additive stable codes:

- `clinic_entry.contact_verification_invalid`;
- `clinic_entry.contact_verification_expired`;
- `clinic_entry.contact_verification_revoked`;
- `clinic_entry.contact_verification_consumed`;
- `clinic_entry.contact_verification_mismatch`;
- `clinic_entry.contact_verification_in_progress`.

Errors reveal no raw contact, token, fingerprint, provider response, evidence
existence outside the authorized scope, or internal exception.

## Security Rules

- References use at least 256 bits of cryptographically secure randomness and
  are compared through their stored one-way hashes.
- Contact fingerprints are keyed and versioned; secret rotation is an additive
  fingerprint-policy version.
- Raw challenges, codes, links, provider payloads, credentials, tokens, and
  contact values are excluded from logs, audit metadata, analytics, errors, and
  idempotency responses.
- Cross-organization, actor, operation, kind, or value mismatches use
  non-disclosing typed failures.
- Issuance, verification, rejection, expiry, revocation, validation failure,
  and consumption are auditable with safe identifiers and method/policy keys.
- Rate limiting, attempt limits, cooldown, risk review, provider fraud signals,
  and abuse lockout are required extension points. Exact thresholds remain
  provider/security policy, not product behavior.
- Actor authentication or a verified actor profile contact never becomes clinic
  contact evidence without explicit issuance and successful verification bound
  to the clinic operation.

## Idempotency and Transactions

Issuance may be idempotent under organization + actor + intended operation +
contact kind + keyed contact fingerprint + client idempotency key. Equivalent
replay returns the same still-valid opaque reference only when secure reference
recovery is supported; otherwise it returns the same evidence identity and an
explicit challenge-restart disposition without minting parallel active
evidence. Different payload under the same key conflicts.

Provider delivery is a post-commit adapter effect with retry/outbox semantics;
it cannot define database success. Verification callbacks/approvals are
idempotent for the same evidence and provider correlation, and conflicting
outcomes fail closed.

Validation and consumption occur under a row lock. Clinic Entry consumes every
required contact evidence record, provisions/associates the clinic, records
ADR-PF-008 provenance, completes organization idempotency, and writes audit in
one unit-of-work transaction. A rollback restores evidence to `verified`; no
consumed record may survive a failed clinic mutation. Concurrent consumers have
one winner. The winning Clinic Entry idempotency replay returns the stored result
without a second audit or consumption side effect.

## Persistence Contract

The separate `org_contact_verifications` table uses the `org_` prefix and
contains only the identity, scope, lifecycle, safe provenance, versioning, and
consumption fields described above. It references `org_organizations` and
`org_users`; `tenant_id` is deliberately absent because evidence precedes tenant
creation. The eventual Clinic Entry result establishes the tenant relationship.

Database constraints enforce allowed kind/status, required paired timestamps,
verified/consumed lifecycle invariants, and scoped indexes. Active-evidence and
provider-correlation uniqueness are finalized during implementation from the
approved idempotency and provider adapter policy. Existing
`org_ownership_verifications` and historical records remain unchanged.

## Additive Extensibility

Future email link/code, mobile OTP, administrative/manual verification, and
trusted external provider methods are adapters identified by immutable
method/version keys. New contact kinds, policies, purposes, or multi-use rules
require additive contract versions. They cannot reinterpret Version 1 evidence,
weaken organization/actor/value binding, or change consumed evidence.

## Explicit Non-goals

- Selecting or implementing an email, SMS, OTP, or external verification
  provider.
- Reusing ownership evidence as contact evidence or vice versa.
- Copying authentication profile contacts into clinic contacts.
- Public contact discovery, marketing consent, notification preferences, or a
  general identity-proofing platform.
- Clinic Entry transport, frontend orchestration, TG19 final acceptance, TG20,
  clinical, billing, scheduling, inventory, import, merge, or transfer work.

## ADR-PF-010 Manual Authority Addendum

ADR-PF-010 is the controlling Version 1 manual-method contract. Organization
Owners and Organization Administrators may request pending evidence, but cannot
approve it. Platform `is_org_admin` alone grants no approval authority, and the
generic administrative permission bypass must not be used. Approval, rejection,
revocation, safe status, audit, idempotency, separation of duties, and transport
authorization follow ADR-PF-010. No public provider callback is authorized.

## Consequences

The missing server-side evidence contract is resolved. Implementation remains a
separate Platform Foundation prerequisite governed by
`E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md`. TG19 Backend Clinic Entry
Transport remains blocked until that implementation and focused verification
are complete.

## ADR-PF-018 Automatic Identity Addendum

ADR-PF-018 approves one additional Version 1 decision source behind this
lifecycle: the backend Supabase authoritative identity adapter with immutable
method/version `supabase_auth_identity_v1`. It may verify only an explicitly
submitted email or mobile that, under `clinic_identity_v1` normalization,
exactly matches the authenticated user's corresponding Supabase-confirmed
attribute.

This addendum does not approve email/SMS challenge delivery, client assertions,
profile copying, or authentication alone as evidence. The Platform Clinic
Contact Verification service still issues, binds, transitions, persists,
audits, idempotently completes, and transactionally consumes normal opaque
evidence. Missing, unconfirmed, ambiguous, unavailable, or mismatched provider
identity fails closed or requires the approved manual flow.
