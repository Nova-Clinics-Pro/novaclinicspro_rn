# TG19 Final Platform Foundation Implementation Plan

Date: 2026-07-20

Status: **TG19_FINAL_PLATFORM_FOUNDATION_PLAN_READY**

Scope: One bounded backend phase completing PF-FINAL-1 through PF-FINAL-5

## Governance and Reuse

The five checkpoints execute in order, each as one logical commit. They reuse
existing authentication/Supabase refresh, organization/member/association and
tenant repositories, audit, idempotency, unit of work, contact/ownership
verification, Clinic Entry transport, error conventions, FastAPI composition,
and Alembic graph.

No checkpoint authorizes frontend source, TG19 frontend orchestration/final
acceptance, TG20, provider integration, public clinic search, product changes,
or unrelated platform refactoring. Any unnamed persistence or authority need is
a stop condition.

## Checkpoint 1 — Authenticated Organization and Authorized-Clinic Context

**Objective:** Implement ADR-PF-011 database-authoritative context using current
organizations, memberships, associations, tenants, auth user mapping, and
`/auth/me`.

**Allowed backend areas:** `auth_router.py` and its response schema; organization
membership/tenant/tenant ports and adapters; one focused platform context
application service if needed; existing auth/UOW dependency composition; focused
tests. Extend `/api/v1/auth/me`; do not create a parallel auth endpoint/model.

**Contract:** Return actor, active membership IDs/roles/status, each
organization's active safe clinic set, per-organization effective tenant,
selection-required flag, safe context version, and session-refresh status.
Exclude inactive/revoked state and ignore stale JWT tenant as authority.

**Authorization/errors/audit:** authentication plus current membership;
non-disclosing organization-context errors. Read-only context needs no mutation
idempotency. Reuse security audit for denied scope access.

**Tests:** zero/one/many organizations and clinics; Owner/Admin; inactive/
revoked membership/association/tenant; platform admin without membership; stale
JWT; cross-org isolation; Clinic Entry association visible after refresh; route,
schema, and DI. Real PostgreSQL must verify joins, filtering, isolation, and a
concurrent revocation race.

**Migration/frontend impact:** none; future frontend DTO extension only.

**Stop/commit:** stop on an unnamed repository or identity-mapping gap. Commit
`Implement TG19 authoritative organization context`.

## Checkpoint 2 — Effective-Tenant Selection and Session Transport

**Objective/dependency:** Implement ADR-PF-011 after Checkpoint 1 context is
authoritative.

**Allowed backend areas:** organization membership model/port/adapter; one
additive migration; auth router/schema/application composition; existing auth
metadata-sync boundary; audit, idempotency, UOW; focused tests.

**Persistence:** add nullable indexed `effective_tenant_id` FK to
`org_organization_members`. No backfill.

**Endpoint:** `PUT /api/v1/auth/organizations/{organizationId}/effective-tenant`
with typed tenant/contract request, `Idempotency-Key`, and refreshed context
response. Lock/revalidate membership, association, and tenant; persist/audit;
auto-select only the sole authorized clinic; require explicit selection for
many; reject stale/unauthorized targets.

**Session:** synchronize projected auth metadata after commit, return
`sessionRefreshRequired`, and retry projection/refresh without replaying
selection or Clinic Entry.

**Errors/tests:** every ADR-PF-011 error, replay/conflict, concurrent selections,
revocation/deactivation races, metadata failure, refresh recovery, and redaction.
PostgreSQL verifies migration/downgrade, FK/index, locks, races, and isolation.

**Stop/commit:** stop if metadata sync cannot reuse the existing post-commit
boundary. Frontend remains untouched. Commit
`Implement TG19 effective tenant selection`.

## Checkpoint 3 — Manual Contact Verification Capability and Transport

**Objective/dependencies:** Implement ADR-PF-010/012 using ADR-PF-009 evidence,
ADR-PF-016 decision provenance, audit, idempotency, organization authorization,
and UOW. Checkpoint 3 remains paused until the bounded ADR-PF-016 persistence
extension is implemented, verified, committed, and pushed.

**Allowed backend areas:** one platform-capability assignment model, port,
adapter, application service, and additive migration; registrations/exports;
central permission codes only for the two named capabilities; existing contact
service/port/repository; one focused schema/router/dependency family and router
registration; focused tests.

**Persistence:** reuse `org_platform_capability_assignments`; add only the
ADR-PF-016-authorized nullable decision-provenance fields to the existing
`org_contact_verifications` table through one additive migration. Manual
platform-authority decisions use immutable Platform Audit; no other contact
schema change is authorized.

**Endpoints:** organization Owner/Admin contact request and requester-safe
status; platform-authority pending list/read and approve/reject/revoke; Platform
Security grant/suspend/revoke and safe capability list/read.

**Authorization/idempotency/audit:** explicit database capability, never
`is_org_admin`; reject requester, destination member, and dual-role verifier.
Assignment and review mutations are idempotent and transactionally audited with
safe reasons. No raw contacts/references/fingerprints/secrets.

**Tests:** bootstrap, grant/revoke, independence, lifecycle, every typed error,
replay/conflict/concurrency, audit/redaction/isolation, and Clinic Entry
consumption. PostgreSQL verifies migration, constraints/indexes, row locks,
concurrent grant/revoke/use and decisions, rollback, and single head.

**Stop/commit:** stop without reviewed bootstrap identity or if a generic admin
bypass cannot be avoided locally. No provider. Commit
`Implement TG19 manual contact verification transport`.

## Checkpoint 4 — Ownership Target Context and Verification Transport

**Objective/dependencies:** Implement ADR-PF-013/003 after Checkpoints 1–2 expose
authorized target context.

**Allowed backend areas:** existing ownership service/port/repository/model for
compatible behavior; organization idempotency/audit and tenant permission
validation; one focused schema/router/dependency family and registration;
focused tests. No migration expected.

**Endpoints:** approver-authorized target-reference issue; requester/approver
safe status; approve, reject, revoke. Derive authority from the approver's
refreshed clinic set, revalidate server-side, and bind destination organization
and initiator. Creation never implies approval.

**Errors/authorization/audit/idempotency:** ADR-PF-013 non-disclosing errors;
initiator associate permission and approver tenant verify permission;
organization idempotency for issue/decisions; lifecycle audit, expiry, replay,
and atomic Clinic Entry consumption.

**Tests:** no enumeration; wrong/stale/inactive actor/org/tenant; multi-clinic
approver; full lifecycle; replay/conflict; concurrent decisions; isolation;
redaction; Clinic Entry association; route/DI. PostgreSQL verifies locks,
concurrent issue/approval/consumption, rollback, and audit atomicity.

**Stop/commit:** stop if existing ownership persistence cannot represent the
binding. Frontend remains untouched. Commit
`Implement TG19 ownership verification transport`.

## Checkpoint 5 — Cross-Foundation PostgreSQL and Security Verification

**Objective:** Prove the entire Platform Foundation path without frontend code.

**Allowed areas:** focused backend tests/fixtures and implementation-evidence
updates to TG19 readiness/audit. Production defects return to their owning
checkpoint; unrelated source changes are prohibited.

**Integration matrix:**

- contact request → independent manual approval → New Clinic → consumption →
  refreshed clinic context → selection/session handoff;
- ownership target → explicit approval → Bring Your Clinic → consumption →
  refreshed zero/one/many context;
- revocation/races at membership, association, evidence, and selection edges;
- stale JWT rejection, isolation, idempotent replay/conflict, rollback, exactly-
  once audit, redaction, schemas/routes/DI, typed errors;
- Alembic heads/current, fresh upgrade, both new downgrade policies, Ruff,
  compileall, and focused regression.

**Migration:** none beyond Checkpoints 2 and 3.

**Stop/commit:** any failure returns to its checkpoint. Commit
`Verify TG19 final Platform Foundation`.

## Completion Gate

All five commits must be pushed; backend must be clean/synchronized; real
PostgreSQL and security verification must pass; readiness/audit must classify
all PF-FINAL items implemented. Only then may a fresh pre-check authorize TG19
Frontend Orchestration.

TG19 Final Platform Foundation Implementation Plan: **READY**
