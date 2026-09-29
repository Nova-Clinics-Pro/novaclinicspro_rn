# ADR-PF-014: Initial Platform Capability Bootstrap

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Product Architecture, Platform Security/Platform Operations, and Release/Deployment

## Decision

Version 1 uses the deployment-controlled configuration key
`PLATFORM_CAPABILITY_BOOTSTRAP_ORG_USER_ID` to identify the first principal
authorized to manage platform capability assignments.

The value is an environment-specific existing `org_user_id`. It is supplied
securely outside Git during deployment. Canonical documentation, application
source, migrations, seed data, fixtures, and logs must not contain a real
environment user ID.

The bootstrap grants only `platform.capabilities.manage`. It grants no contact-
verification approval capability or other platform, organization, tenant, or
clinic authority.

## Eligibility and Approval

The configured principal must:

- already exist in authoritative `org_users` persistence;
- be active at execution time;
- be explicitly selected for that environment by Product Architecture and
  Platform Security or Platform Operations;
- be included in a reviewed deployment change approved by the Release/
  Deployment owner;
- receive no automatic entitlement from any other identity or role.

The bootstrap must never infer the principal from `is_org_admin`, organization
membership, tenant RBAC, clinic roles, email domain, registration order,
environment ownership, database-superuser identity, or any other heuristic.

Production approval requires all three accountable functions: Product
Architecture, Platform Security or Platform Operations, and the Release/
Deployment owner. Separate explicitly approved non-production identities are
permitted per environment. This ADR identifies accountable roles, not people.

## One-Time Bootstrap Operation

The deployment invokes one authenticated operational command or application
service that is not exposed as a public runtime API. Within one transaction it:

1. reads `PLATFORM_CAPABILITY_BOOTSTRAP_ORG_USER_ID`;
2. parses and validates the configured identifier;
3. locks and verifies that the referenced `org_user` exists and is active;
4. checks the authoritative capability-assignment repository for
   `platform.capabilities.manage`;
5. returns the existing active assignment when it belongs to the same
   configured principal;
6. fails on a conflicting bootstrap assignment instead of transferring
   authority;
7. creates the initial active assignment when none exists;
8. records the grantor as deployment bootstrap/system authority, with a stable
   bootstrap reason and correlation identity;
9. writes immutable, non-sensitive audit evidence through the
   `org_platform_audit_logs` boundary defined by ADR-PF-015 in the same
   transaction;
10. commits the assignment and audit atomically.

The deployment step is successful only after the authoritative assignment and
audit commit. It must not continue by selecting or granting another user.

## Idempotency and Conflict Handling

Repeated execution with the same configured user returns the same authoritative
active assignment and does not create another assignment or duplicate grant
audit event.

Changing the configured value does not transfer, replace, revoke, or create
authority automatically. A different configured user while an initial
assignment exists is a conflict and fails closed. Authority changes use the
normal reviewed capability-management flow: an authorized manager grants the
new assignment and explicitly revokes the old one.

The bootstrap operation uses a stable deployment/bootstrap idempotency scope.
Equivalent replay succeeds; conflicting identity or payload reuse fails with a
safe typed outcome.

## Audit and Security

Immutable audit evidence records only safe operational facts: assignment ID,
principal `org_user_id`, capability code, bootstrap policy/version, deployment
correlation identity, outcome, and server timestamps. It must not contain
credentials, tokens, environment secrets, raw configuration payloads, or
unapproved deployment metadata.

The implementation must preserve least privilege, database-authoritative
authorization, explicit lifecycle status, transactional audit, and immediate
revocation. No JWT claim, cached permission, generic administrator bypass, or
fallback identity may create or retain bootstrap authority.

The configuration value is stored in the environment's approved secret or
deployment-configuration system, is access-controlled, and is never committed
to Git. Logs may identify the safe principal ID and outcome but must never log
configuration sources or secrets.

## Failure Behavior

The bootstrap step stops or is marked failed when:

- configuration is missing or blank;
- the configured value is malformed;
- the user does not exist;
- the user is inactive;
- a conflicting bootstrap or management assignment exists;
- assignment persistence fails;
- immutable audit persistence fails;
- the transaction cannot commit.

Any failure rolls back assignment and audit changes together. Deployment must
not grant authority to another user, infer a replacement, partially continue,
or fall back to `is_org_admin`.

## Rotation and Recovery

Normal rotation is:

1. an existing authorized capability administrator grants
   `platform.capabilities.manage` to a second reviewed active principal;
2. authorization and audit evidence for the second administrator are verified;
3. the original bootstrap assignment is explicitly revoked;
4. deployment configuration is updated only as reviewed operational state, not
   as an automatic transfer mechanism.

The original bootstrap assignment must not be revoked until another active,
verified capability administrator exists.

Emergency recovery requires a separately reviewed deployment bootstrap event
approved by the same accountable functions. It records a distinct recovery
reason and audit correlation. Recovery never automatically reactivates an old
assignment or grants authority through `is_org_admin`, membership, tenant RBAC,
clinic role, or database access.

## Required Verification

Implementation must prove:

- an explicitly configured active user receives the initial management
  capability;
- same-user replay is idempotent;
- missing, blank, malformed, nonexistent, and inactive identities fail closed;
- `is_org_admin` and organization membership provide no fallback;
- a conflicting configured identity cannot silently transfer authority;
- assignment and immutable audit commit atomically;
- database or audit failure rolls back all effects;
- no actual environment user ID is committed to source.

## Non-Goals

- Selecting or naming an actual bootstrap user in canonical documentation.
- Implementing the bootstrap, capability table, repository, service, migration,
  deployment command, transport, or tests in this decision task.
- Providing an unauthenticated or public bootstrap endpoint.
- Granting `platform.clinic_contact_verification.approve` automatically.
- Changing organization, tenant, clinic, RBAC, or authentication semantics.
- Frontend work, TG19 Checkpoints 3–5, TG19 acceptance, or TG20.

## Consequences

The initial authority source required by ADR-PF-012 is constitutionally
defined. Platform Capability Bootstrap remains blocked until ADR-PF-015
platform-audit persistence is implemented and verified. TG19 Final Platform
Foundation Checkpoint 3 remains blocked until the bounded platform-audit,
bootstrap, and capability-assignment foundations are implemented and verified.

Platform Capability Bootstrap Architecture Status: **APPROVED**
