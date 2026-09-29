# ADR-PF-013: Non-Enumerating Ownership Target Context

Status: Accepted

Version: 1.0

Date: 2026-07-20

Owners: Platform Foundation, Workspace/Tenant, and Platform Security

## Decision

Version 1 uses an opaque approver-issued target reference backed by the existing
`org_ownership_verifications` record. It creates no directory, tenant lookup, or
second verification model.

An authenticated clinic principal with active membership and
`clinic.ownership.verify` selects a tenant only from their own authoritative
clinic context. The Platform Ownership Verification service revalidates that
tenant, destination organization, and intended initiator, then issues the
existing opaque pending reference.

## Issuance Boundary

```text
POST /api/v1/platform/ownership-verifications/targets
```

Input is destination `organizationId`, intended `initiatorId`, authorized-
context `tenantId`, contract version, and `Idempotency-Key`. Tenant ID is never
proof. The server requires caller tenant permission and verifies that the
initiator has active destination membership and
`organization.clinics.associate`.

The response returns the opaque reference once, safe pending status, and expiry.
It exposes no clinic metadata or membership details. The approver transfers it
to the intended initiator through an authenticated product handoff or approved
confidential channel. No public search exists.

## Approval, Status, and Consumption

Creation is not approval. An authorized target-clinic principal explicitly
approves or rejects the same record. Safe status exposes only state, expiry, and
allowed next action. The intended initiator submits the approved reference to
Clinic Entry, which revalidates current authority and consumes atomically.

## Idempotency and Security

Issuance scope is target tenant + destination organization + initiator + purpose
+ actor + key. Equivalent replay returns the same evidence identity and safe
reference-recovery disposition; changed payload conflicts. Decisions and
consumption are concurrency-safe and idempotent under ADR-PF-003.

Wrong actor/org/tenant, inactive authority, and stale context fail without
confirming clinic existence. References and raw authority evidence are redacted.
Issue/access/decision/expiry/replay/consumption are safely audited.

Typed errors: `ownership_target.not_found_or_not_authorized`,
`ownership_target.inactive`, `ownership_target.invalid_destination`,
`ownership_target.pending`, `ownership_target.expired`,
`ownership_target.revoked`, `ownership_target.consumed`,
`ownership_target.idempotency_conflict`,
`ownership_target.retryable_failure`, and
`ownership_target.terminal_failure`.

## Persistence and Non-goals

Existing ownership persistence already contains tenant, organization,
initiator, approver, opaque hash, lifecycle, expiry, correlation, and version;
no migration is required.

No public enumeration, contact-based ownership proof, tenant claiming/transfer/
merge/import, cached-ID authority, frontend orchestration, TG20, or commercial
work.

Ownership Target Context Architecture Status: **APPROVED**
