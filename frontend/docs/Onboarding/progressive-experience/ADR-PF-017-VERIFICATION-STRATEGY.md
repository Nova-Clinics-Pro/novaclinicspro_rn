# ADR-PF-017: Verification Strategy

Status: Accepted

Version: 1.0

Date: 2026-07-21

Owners: Platform Foundation, Platform Security, Authentication, and Platform Operations

## Context

Nova Clinics must support production verification and safe development/test
workflows without branching around the verification architecture. Environment
policy may change how a decision is produced, but it must not change the
evidence, lifecycle, authority, persistence, audit, idempotency, transaction,
isolation, or error contracts that make the decision trustworthy.

This ADR defines a reusable strategy boundary for clinic-contact verification,
clinic-ownership verification, and future verification types. It authorizes no
implementation.

## Decision

A verification strategy selects only the **source of a verification decision**.
It receives an already-authorized verification context and produces a typed
decision for the existing verification application service to apply.

The surrounding service remains authoritative for:

- evidence issuance and binding;
- lifecycle validation and transitions;
- authorization and independence rules;
- persistence and row locking;
- organization-scoped idempotency;
- Platform or organization audit, according to existing ownership;
- transaction commit and rollback;
- tenant and organization isolation;
- typed errors and safe transport projections.

The boundary is reusable and additive. A future verification type may add its
own strategy enum and decision payload while preserving these invariants. A
strategy is not a repository, lifecycle service, transport, authorization
mechanism, or permission source.

## Clinic-contact Verification Strategies

### `AUTOMATIC`

An approved authoritative source, such as an already verified email or mobile
identity, produces the clinic-contact decision. The submitted clinic contact
must explicitly match the verified value under the approved normalization
contract.

The strategy must reject absent or mismatched values. It must never silently
copy the actor's email or mobile, invent a contact, infer clinic ownership, or
turn authentication alone into clinic-contact evidence.

### `MANUAL`

The existing Platform Authority request, independent review, approval,
rejection, revocation, provenance, Platform Audit, and capability-enforcement
flow produces the decision. Manual verification remains available for fallback,
recovery, disputes, and high-risk cases.

### `DISABLED`

This strategy is restricted to development and automated tests. It produces an
approved decision **through the normal contact-verification service and
lifecycle**.

It must still issue and bind evidence, execute lifecycle transitions, persist
the authoritative row, write the applicable audit records, complete
idempotency, and commit transactionally. It must not return success early,
fabricate a transport response, skip authorization, or bypass the verification
service.

## Clinic-ownership Verification Strategies

### `REQUIRED`

The approved ownership-target and ownership-review flow produces the decision.
Opaque target issuance, current authority checks, explicit approval or
rejection, lifecycle persistence, audit, idempotency, and transactional
consumption remain mandatory.

### `AUTO_APPROVE`

This development/test strategy submits approval through the normal
ownership-verification lifecycle, audit, idempotency, authorization, and
transaction boundaries. It may automate the decision source; it may not mutate
the evidence row directly or create an organization–clinic association.

### `DISABLED`

This strategy is reserved for narrowly controlled integration tests. It must
still call the ownership-verification service and persist approved lifecycle
evidence through the normal transaction and audit paths.

It must not directly associate a clinic, synthesize consumed evidence, skip
tenant or organization isolation, or report success without authoritative
persistence.

## Recommended Environment Mapping

| Environment | Contact verification | Ownership verification |
|---|---|---|
| Development | `DISABLED` | `AUTO_APPROVE` |
| Automated test | Configurable per test | Configurable per test |
| QA | `AUTOMATIC` or `MANUAL` | `AUTO_APPROVE` or `REQUIRED` |
| Staging | `AUTOMATIC` | `REQUIRED` |
| Production | `AUTOMATIC` | `REQUIRED` |

Overrides must be explicit, securely configured, reviewed at the appropriate
environment boundary, and observable without exposing secrets or evidence.
Application services must not hardcode environment names or environment-specific
behavior.

## Startup Safety

A future implementation must define an explicit production safety guard, for
example `ALLOW_VERIFICATION_BYPASS`, through the existing configuration
framework. This ADR defines its required semantics but does not create a
configuration key.

- Production must refuse to start when `DISABLED`, `AUTO_APPROVE`, or any
  other bypass-capable strategy is enabled.
- Production must fail closed when strategy or guard configuration is missing,
  invalid, contradictory, or ambiguous.
- `DISABLED` and `AUTO_APPROVE` are prohibited in production regardless of
  a generic debug setting.
- Staging exceptions require explicit reviewed configuration; no implicit
  downgrade to development behavior is allowed.
- There is no fallback from an unknown strategy to a permissive strategy.
- A simple `DEBUG` check must never approve verification.
- Startup logs may report selected strategy names and validation outcomes, but
  must not expose contacts, opaque evidence, hashes, tokens, credentials, or
  secrets.
- Configuration changes must be auditable where operationally appropriate.

## Mandatory Reuse

Every strategy must reuse:

- the existing contact-verification service and lifecycle;
- the existing ownership-verification service and lifecycle;
- existing verification evidence and persistence;
- organization-scoped idempotency;
- Platform and organization audit according to established ownership;
- existing transaction boundaries and unit of work;
- existing authorization and capability/permission checks;
- existing typed errors;
- existing dependency-injection and configuration framework.

No parallel verification repository, evidence model, audit path, lifecycle,
authority system, or transaction owner is permitted.

## Absolute Bypass Prohibition

No strategy may bypass:

- evidence issuance;
- lifecycle transitions;
- persistence;
- authorization;
- audit;
- idempotency;
- transaction ownership;
- tenant or organization isolation;
- typed error handling.

The strategy may alter only the source that produces the typed verification
decision. Even a development or test strategy must leave the same authoritative
lifecycle evidence and transactionally consistent audit/idempotency outcome as
the corresponding normal flow.

## Security and Scope

- New-clinic contact verification may use `AUTOMATIC` when an approved source
  explicitly verifies the submitted clinic contact.
- Connecting an existing Nova clinic uses ownership verification, not contact
  verification.
- Staff identity verification remains owned by Authentication and the
  invitation/RBAC flows.
- A verification strategy grants no clinic, organization, staff, clinical, or
  platform permission.
- Manual verification remains an available fallback for recovery, disputes,
  exceptional risk, and authoritative operational review.
- Strategy selection must not weaken cross-organization, cross-tenant,
  self-approval, independence, or current-authority checks.

## Future Implementation Boundary

A separately authorized implementation may add only:

- reusable strategy interfaces and the approved strategy implementations;
- typed configuration enums and strict validation;
- dependency-injection selection using the existing composition framework;
- fail-closed startup safety validation;
- focused unit and integration tests proving lifecycle equivalence, rollback,
  audit, idempotency, isolation, and production rejection;
- environment configuration and operations documentation.

Implementation must remain additive and reuse-first. New APIs, migrations,
evidence tables, repositories, services, lifecycle models, permissions, or
product flows require their own approved boundary and are not authorized here.

## Consequences

Development and tests can choose deterministic decision production without
creating a hidden bypass. Production remains fail-closed and restricted to
approved authoritative strategies. The verification architecture retains one
evidence model, one lifecycle per verification type, and one auditable
transaction path.

Verification Strategy Architecture Status: **APPROVED**

## ADR-PF-018 Authority Clarification

ADR-PF-018 controls the Version 1 authority implementations authorized here.
Contact `AUTOMATIC` uses only `IAuthoritativeUserIdentityProvider`, the explicit
Supabase backend adapter, and immutable method/version
`supabase_auth_identity_v1`. Ownership `AUTO_APPROVE` and test-only `DISABLED`
use only the non-human `verification_strategy_system_authority` classification
and immutable method/version `nonprod_ownership_strategy_v1`; they never
fabricate or borrow a human approver.

ADR-PF-018's environment restrictions, startup validation, system-decision
provenance, and additive ownership persistence boundary are mandatory. This
clarification changes no evidence, lifecycle, authorization, audit,
idempotency, isolation, transaction, or Clinic Entry ownership.
