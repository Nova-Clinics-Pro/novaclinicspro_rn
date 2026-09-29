# ADR-PF-018: Automatic Verification Authority

Status: Accepted

Version: 1.0

Date: 2026-07-21

Owners: Platform Foundation, Platform Security, Authentication, and Platform Operations

## Context

ADR-PF-017 permits configuration to change the source of a verification
decision, but never the evidence lifecycle. Version 1 requires an authoritative
identity source for automatic clinic-contact verification and a non-human
authority for controlled non-production ownership decisions.

Repository evidence shows that Supabase Auth is the configured authentication
provider. Its validated JWT payload is retained as provider metadata, while the
provider-neutral authenticated principal and `/auth/me` expose an email without
asserting confirmation and expose no confirmed mobile. Profile, application,
organization, and tenant contacts are therefore not verification truth.

The ownership lifecycle requires a real tenant-authorized human approver for
`REQUIRED`. Persistence permits a null `approver_id`, but has no typed system
decision provenance. A fake user or borrowed human principal is prohibited.

## Decision 1: Authoritative User Identity Provider

Platform Authentication shall expose an application-layer port:

```text
IAuthoritativeUserIdentityProvider
```

For the authenticated user, it returns only:

- immutable provider user ID;
- verified email and authoritative confirmation state or timestamp, when confirmed;
- verified mobile and authoritative confirmation state or timestamp, when confirmed;
- provider identity;
- immutable provider method/version key.

The Version 1 implementation is `SupabaseAuthoritativeUserIdentityAdapter`. It
uses a server-validated Supabase authentication response or signed claims whose
confirmation semantics are explicitly supported by the backend integration. It
must not trust client fields, `/auth/me`, cached frontend state,
`user_metadata`, or application, organization, and tenant profiles.

The immutable Version 1 method/version key is:

```text
supabase_auth_identity_v1
```

If confirmed state cannot be distinguished, the attribute is absent from the
authoritative result. Unavailability, invalid claims, ambiguity, or unsupported
confirmation semantics fail closed. A configured fallback requires the already
approved `MANUAL` flow; it never automatically approves.

## Automatic Exact-match Rule

The user must explicitly submit the clinic contact. `AUTOMATIC` may approve
only when the submitted email or mobile, normalized with `clinic_identity_v1`,
equals the corresponding Supabase-confirmed value normalized by the same
contract. Email and mobile are independent; two clinic contacts require two
matching evidence records.

The implementation must never copy an actor contact into clinic data, infer a
missing contact or clinic ownership, accept client confirmation, treat login
alone as clinic evidence, or substitute cached/profile values.

## Automatic Evidence Behavior

`AUTOMATIC` changes only the decision source. The existing Platform Clinic
Contact Verification service must authorize and issue opaque evidence; bind it
to organization, actor, contact kind, keyed normalized fingerprint, intended
operation, and policy; persist `supabase_auth_identity_v1`; apply the decision
through the lifecycle; persist provenance; audit; complete organization-scoped
idempotency; and participate in the existing unit-of-work transaction.
Consumption remains owned by Clinic Entry. No new evidence table, repository,
or parallel verification service is authorized.

## Decision 2: Non-production Ownership System Authority

The approved non-human actor classification is:

```text
verification_strategy_system_authority
```

Its immutable method/version key is:

```text
nonprod_ownership_strategy_v1
```

This classification is only a verification-decision source. It is not a human
principal, organization member, clinic approver, tenant-RBAC user,
`is_org_admin`, platform capability administrator, or holder of clinic access.
No real or fabricated user ID represents it.

For `AUTO_APPROVE` or ownership `DISABLED`, the existing target service still
issues normal ownership evidence. The ownership-verification service applies
the system decision, persists provenance, writes Platform Audit, completes
idempotency, and uses the existing transaction. Only Clinic Entry may later
associate the clinic and consume the evidence.

## System-decision Provenance

The current human `approver_id` remains authoritative for `REQUIRED` and is null
for a system decision. The smallest additive extension to
`org_ownership_verifications` records:

- `decision_actor_type`;
- nullable `decision_principal_id` for human decisions only;
- nullable `decision_strategy`;
- nullable `decision_environment`;
- `decision_method_version`;
- `decision_reason_code`;
- `decision_at`.

New constraints must make human and system provenance mutually exclusive,
require all system fields for `verification_strategy_system_authority`, and
prohibit a human principal ID for system decisions. Existing rows keep their
meaning and may remain legacy provenance; no historical value is fabricated.

Platform Audit records actor classification, strategy, environment,
method/version, safe reason, timestamp, and safe correlation/request ID. It
must not contain contacts, evidence references, tokens, or raw exceptions.

## Environment and Configuration Contract

The authoritative environment signal is the backend's existing `environment`
setting. Typed strategy configuration uses:

```text
CONTACT_VERIFICATION_MODE
OWNERSHIP_VERIFICATION_MODE
ALLOW_VERIFICATION_BYPASS
```

`DEBUG` never grants authority. Missing, invalid, contradictory, or ambiguous
environment/strategy configuration fails startup.

| Environment | Contact | Ownership |
|---|---|---|
| Development | `DISABLED`, `AUTOMATIC`, or `MANUAL` | `AUTO_APPROVE` or `REQUIRED` |
| Automated/integration test | Explicit per test | `DISABLED`, `AUTO_APPROVE`, or `REQUIRED` |
| QA | `AUTOMATIC` or `MANUAL` | `REQUIRED`; reviewed `AUTO_APPROVE` only |
| Staging | `AUTOMATIC` | `REQUIRED` |
| Production | `AUTOMATIC` | `REQUIRED` |

Bypass-capable development, test, or QA modes require explicit non-production
allowance. Ownership `DISABLED` is test-only. Production refuses startup when
bypass is enabled, contact `DISABLED` is selected, ownership `AUTO_APPROVE` or
`DISABLED` is selected, or environment classification is ambiguous. Staging
remains `REQUIRED` and does not inherit development defaults.

Startup diagnostics may expose safe environment and strategy names only—not
contacts, claims, tokens, evidence, fingerprints, credentials, or secrets.

## Invariants and Prohibitions

Both authorities reuse existing authorization, evidence, lifecycle,
persistence, audit, idempotency, unit of work, typed errors, isolation, and
concurrency boundaries. Strategies cannot mutate evidence directly, commit
independently, create tenants or associations, select tenants, or grant access.

Human `REQUIRED` decisions retain every ADR-PF-003 membership, permission,
independence, and current-authority check. Staff identity and onboarding are not
affected.

## Required Future Tests

Tests must cover verified email/mobile exact and normalized matches;
unconfirmed, mismatched, unavailable, and ambiguous identity failures; no
contact copying or client assertion; method persistence; normal lifecycle,
audit, idempotency, and rollback; system rather than human ownership provenance;
no fake approver; normal target/evidence persistence; no direct association;
environment restrictions; staging/production rejection; and fail-closed
ambiguous configuration.

## Future Extensibility

Future identity providers require a new adapter and immutable method/version
behind `IAuthoritativeUserIdentityProvider`. Future ownership automation
requires an additive authority method/version and approved security policy.
Neither may reinterpret Version 1 evidence or weaken lifecycle invariants.

Automatic Verification Authority Status: **APPROVED**
