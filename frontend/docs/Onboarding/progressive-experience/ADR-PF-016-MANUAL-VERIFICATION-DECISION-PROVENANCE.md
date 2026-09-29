# ADR-PF-016: Manual Verification Decision Provenance

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Security, Platform Operations, Platform Foundation, and Authentication

## Context

ADR-PF-009 and ADR-PF-010 require an authoritative manual decision to retain
the authenticated verifier, safe decision classification, decision time, and
optional safe operational reference. The implemented
`org_contact_verifications` record retains the requester and provider
correlation but cannot retain that distinct manual-decision provenance.

Platform Audit is required for the broader transition event, but audit alone
does not make the evidence record self-describing at later validation,
consumption, revocation, or security review. The smallest compatible correction
is an additive extension of the existing evidence record.

## Decision

Add these nullable fields to `org_contact_verifications`:

- `decision_principal_id`: authenticated platform verifier `org_user_id`;
- `decision_reason_code`: approved bounded safe classification;
- `decision_external_reference`: optional bounded safe operational reference,
  distinct from `provider_correlation_id`;
- `decision_at`: authoritative server decision timestamp.

`decision_principal_id` references `org_users.id` with restrictive deletion
semantics. The existing `actor_id` remains the organization requester and must
not be reinterpreted as the verifier. `provider_correlation_id` remains
provider-owned correlation and must not be reused for a manual review
reference.

No new evidence table, provider model, authority source, or verification
lifecycle is created.

## Safe Decision Classifications

Version 1 accepts only these method-specific reason codes:

- `manual_control_confirmed` for approval;
- `manual_control_not_confirmed` for rejection;
- `manual_verification_revoked` for revocation.

They are classifications, not free-form explanations. Adding a classification
is an additive, reviewed Platform Security policy change. Raw evidence,
contacts, documents, provider responses, or operator notes are never accepted
as reason codes.

## External Reference Contract

`decision_external_reference` is optional. When present, it is a safe
operational reference of 1–128 characters matching
`[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`. It may identify an approved internal review
case but must not contain URLs with query data, raw contacts, opaque evidence
references, tokens, hashes, credentials, secrets, free-form evidence, or
provider payloads.

## Lifecycle and Provenance Rules

- Newly issued `pending` evidence has all decision fields null.
- Manual approval changes `pending` to `verified` and atomically records the
  verifier, `manual_control_confirmed`, optional safe external reference, and
  server decision time.
- Manual rejection changes `pending` to `rejected` and atomically records the
  verifier, `manual_control_not_confirmed`, optional safe external reference,
  and server decision time.
- Manual revocation changes eligible `pending` or `verified` evidence to
  `revoked` and atomically records the revoking verifier,
  `manual_verification_revoked`, optional safe external reference, and server
  decision time. When verified evidence is revoked, immutable Platform Audit
  retains the earlier approval event and the evidence record becomes
  authoritative for the terminal revocation decision.
- Expiry without a human decision does not invent decision provenance. Pending
  evidence that expires keeps all decision fields null; verified evidence that
  expires retains its original approval provenance.
- Consumption does not alter decision provenance. Consumed evidence retains
  the original approval verifier, classification, reference, and timestamp.
- A relevant terminal decision (`rejected`, `revoked`, or `consumed`) makes the
  stored decision provenance immutable. No later repository operation may
  rewrite or clear it.

For newly decided rows, `decision_principal_id`, `decision_reason_code`, and
`decision_at` are an all-or-none set. An external reference is valid only when
that required set exists. Repository and application validation enforce the
status/reason pairing and prevent later mutation. Database constraints may
enforce safe structural combinations where they remain compatible with legacy
rows.

## Legacy Compatibility

All four columns are nullable. Existing evidence remains valid and receives no
synthetic verifier, reason, external reference, or timestamp. Existing rows
with null decision fields are classified as:

`LEGACY_DECISION_PROVENANCE_UNKNOWN`

This classification is interpretive and is not backfilled into persistence.
Legacy verified or consumed evidence is not invalidated, rewritten, or
silently attributed to a platform principal.

## Authorization and Security

Persistence does not grant authority. ADR-PF-012's active, explicit,
non-bypassable `platform.clinic_contact_verification.approve` assignment and
ADR-PF-010 independence checks remain mandatory at decision time.

The implementation must reject:

- raw contact values, opaque references, tokens, or hashes;
- credentials, secrets, provider payloads, or unrestricted metadata;
- reason text outside the Version 1 allowlist;
- unsafe or oversized external references;
- client-supplied verifier identity or decision timestamp;
- later mutation of authoritative terminal provenance.

Transport returns only the approved safe decision projection. It never exposes
contact fingerprints, reference hashes, or internal exception text.

## Transactions and Audit

The row-locked lifecycle transition, decision provenance, Platform Audit event,
and applicable idempotency completion share one unit of work. Repositories
flush without committing; the application service owns commit and rollback.

Audit failure rolls back lifecycle and provenance. Persistence or transaction
failure rolls back audit and idempotency completion. Manual approval,
rejection, and revocation cannot report success unless the authoritative row
and immutable platform event commit together. Organization-owned issuance
continues using its existing organization-scoped audit ownership; the
platform-authority decision uses `org_platform_audit_logs`.

## Migration Authorization

One additive Alembic migration may add the four nullable columns and the
foreign key for `decision_principal_id`. It must:

- preserve every existing row without backfill;
- modify no historical migration;
- add no index unless implementation query evidence demonstrates a concrete
  need;
- provide a safe downgrade that removes only the four new columns and their
  constraint;
- pass existing-database and fresh-chain PostgreSQL upgrade, current,
  downgrade, and re-upgrade verification.

## Repository and Service Boundary

The existing contact-verification model, repository, lifecycle service, unit of
work, Platform Capability Assignment, Platform Audit, and idempotency
infrastructure must be extended and reused. The implementation may add only the
minimum mapping, row-lock validation, decision operation, safe read projection,
typed failures, and transaction composition required by this ADR.

No duplicate evidence service, decision repository, audit system, or authority
model is authorized.

## Required Verification

Focused tests must prove:

- approval stores verifier, reason, optional reference, and timestamp;
- rejection and revocation store the correct authoritative provenance;
- pending and human-decision-free expiry do not invent provenance;
- consumption preserves approval provenance;
- invalid reason codes and unsafe/oversized references are rejected;
- no contact, secret, token, hash, or raw evidence leaks;
- audit and transaction failure roll back lifecycle and provenance;
- existing rows remain valid as `LEGACY_DECISION_PROVENANCE_UNKNOWN`;
- migration upgrade, downgrade, re-upgrade, fresh-chain, foreign-key, and
  nullable-column behavior pass on PostgreSQL.

## Non-Goals

- Implementing the migration or Checkpoint 3 in this decision task.
- Adding email, SMS, OTP, provider, ownership-verification, or Clinic Entry
  behavior.
- Changing requester authorization, platform capability semantics, evidence
  normalization, fingerprinting, opaque references, or consumption.
- Frontend work, Checkpoints 4–5, TG19 acceptance, TG20, Doctor Module, R7, or
  unrelated platform work.

## Consequences

The remaining Checkpoint 3 persistence gap is constitutionally resolved.
Implementation remains a separate bounded prerequisite and must be completed,
verified, committed, and pushed before manual contact verification transport
resumes.

Manual Verification Decision Provenance Architecture Status: **APPROVED**
