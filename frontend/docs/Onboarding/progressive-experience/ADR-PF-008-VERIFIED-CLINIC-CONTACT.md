# ADR-PF-008: Verified Clinic Contact

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owner: Product Architecture, Platform Architecture, and Platform Security

Scope: Platform Foundation and Tenant/Clinic identity

## Context

Epic 2 Version 1 supports a clinic whose verified contact is email only, mobile
only, or both. Repository evidence shows that `org_tenants.email` is made
`NOT NULL` by migration `05aec2bbf49c`, while `org_tenants.phones` can hold
clinic telephone values but neither field records clinic-contact verification
provenance. Consequently, the current provisioning path cannot truthfully create
a mobile-only clinic without fabricating or borrowing an email address.

## Ownership decision

Authentication owns the acting person's authenticated identity and may know a
verified actor email, verified actor mobile, or both. Authentication evidence
does not automatically become clinic-contact truth.

Tenant/Clinic owns clinic contact metadata. An email or mobile is clinic contact
data only when explicitly supplied for the clinic and verified through an
approved server-side clinic-contact verification flow. The acting user's email,
organization email, JWT claims, or cached profile cannot be copied implicitly.

## Version 1 contact model

An authoritative Version 1 clinic contact has contract identity
`verified_clinic_contact_v1` and supports email only, mobile only, or both.
Email and mobile are individually optional, but at least one approved verified
clinic contact method is required.

“Verified” means that the server has validated evidence bound to the exact
normalized contact value, clinic-creation operation, destination organization,
actor, method/version, and expiry or completion state. Raw evidence is never
stored on `org_tenants`.

Existing rows without a contact contract version are
`LEGACY_CONTACT_PROVENANCE_UNKNOWN`. They remain valid and are not retroactively
described as verified.

## Primary-contact semantics

- With exactly one verified method, that method is deterministically primary.
- With both verified methods, the request must explicitly select `email` or
  `mobile` as `primary_contact_kind`.
- The server rejects a missing or unsupported selection when both are present.
- Primary selection affects contact preference only; it does not change whether
  either method is verified and does not transfer authentication ownership.

This explicit rule avoids inventing email-first or mobile-first product policy.

## Persistence decision

Select the smallest additive extension of `org_tenants`; no parallel clinic
contact table or subsystem is authorized.

1. Alter existing `org_tenants.email` to nullable, preserving every value.
2. Continue to store clinic mobile/contact numbers in the existing `phones`
   field. Version 1 stores the normalized verified mobile as the first entry.
3. Add nullable `contact_contract_version VARCHAR(64)`.
4. Add nullable `primary_contact_kind VARCHAR(16)`.
5. Add nullable `email_verified_at TIMESTAMPTZ` and
   `email_verification_method VARCHAR(64)`.
6. Add nullable `mobile_verified_at TIMESTAMPTZ` and
   `mobile_verification_method VARCHAR(64)`.

For authoritative Version 1 writes:

- `contact_contract_version = verified_clinic_contact_v1`;
- email provenance fields are both present exactly when a verified clinic email
  is present;
- mobile provenance fields are both present exactly when a verified clinic
  mobile is present in `phones`;
- at least one verified method is present;
- `primary_contact_kind` names a present verified method.

Database checks shall enforce paired provenance fields, allowed version/kind
values, email/provenance consistency, and the Version 1 minimum-contact
invariant where safely expressible. The application/domain boundary remains
authoritative for normalizing values, validating opaque verification evidence,
ensuring the first `phones` entry is the verified mobile, and selecting the
primary method. Legacy rows are exempt through null `contact_contract_version`.

## Verification provenance

Version 1 persists only safe provenance summaries on the tenant row: verified
timestamp and stable verification method/version key per present method. The
verification issuer/validator retains opaque evidence and audit correlation
under its own security boundary. Raw codes, tokens, provider payloads, actor
credentials, ownership evidence, and full audit payloads are not tenant columns.

The concrete verification method must be an existing approved server-side
method or a separately approved additive method before a contact is marked
verified. Actor authentication alone is not such a method.

## API and DTO implications

The TG19 DTO boundary is extended without changing existing field meaning:

- `primary_contact_number` becomes optional so email-only entry is representable;
- existing `verified_contact` is the explicit primary verified contact;
- an optional `additional_verified_contact` carries the other kind;
- duplicate verified-contact kinds are invalid;
- when mobile is present, its normalized value and any supplied primary contact
  number must agree;
- at least one verified contact is required;
- normalization and `clinic_identity_v1` use all present Version 1 verified
  contact values in stable declared order. A semantic change requires an
  additive identity version rather than reinterpreting existing hashes.

Transport accepts only opaque server-issued verification references through the
approved validation boundary and returns no evidence or provenance internals.

## Migration and rollout

One additive Alembic migration descending from the current head is authorized.
Upgrade shall make `org_tenants.email` nullable, add only the six fields above,
add safe check constraints, and perform no update, backfill, verification
inference, or value fabrication.

Existing non-null email values and phone arrays remain unchanged. New Clinic
transport remains disabled until migration, model, DTO, validation, provisioning
mapping, and focused tests are deployed together.

## Downgrade policy

Downgrade is permitted only when no row has `email IS NULL`. It must first run a
preflight guard and fail transactionally with an actionable operator message if
mobile-only rows exist. It must never delete those rows, invent email values, or
silently discard contact truth. When the guard passes, downgrade removes the
additive constraints/columns and restores email non-nullability.

Operational rollback after mobile-only creation therefore means rolling forward
with a correction or first obtaining an explicitly verified clinic email through
an approved workflow; destructive rollback is prohibited.

## Security, privacy, and audit

Clinic email/mobile and provenance are business-sensitive tenant metadata, not
authentication, clinical, or payment data. Access is tenant/organization scoped.
Logs and typed errors exclude raw values, evidence, provider payloads, and
fingerprints.

Audit records capture safe tenant/organization/actor identifiers, contact method
kinds, verification method/version keys, primary selection, outcome, contract
version, and correlation ID. They do not contain raw email/mobile, codes, tokens,
or authentication claims.

## Backward compatibility

- Existing email values remain unchanged.
- No email or mobile is synthesized.
- No legacy contact is asserted to be verified.
- Existing readers must tolerate null email and retain the existing phone shape.
- Future contact methods are additive named kinds with independent verification
  and storage contracts; they cannot reinterpret Version 1 provenance.

## Required tests

Implementation must cover email-only, mobile-only, both, neither rejected,
unverified rejected, explicit primary selection, actor email not copied, no
placeholder generation, existing email preservation, DTO/repository round-trip,
tenant/organization isolation, log/error redaction, migration upgrade, downgrade
without mobile-only rows, and guarded downgrade failure with mobile-only rows.

## Explicit non-goals

- Reusing actor authentication claims as clinic-contact verification.
- Placeholder email generation or silent mobile-only rejection.
- A public contact directory or clinic search.
- Marketing consent, notification preference, or communications routing.
- Replacing Authentication, ownership verification, tenant RBAC, or organization.
- Clinical, payment, import, merge, transfer, TG20, or frontend orchestration.

## Consequences

The verified-contact persistence correction is constitutionally complete and
ready for its bounded implementation checkpoint. TG19 backend Clinic Entry
transport remains blocked until that checkpoint is implemented and verified.
