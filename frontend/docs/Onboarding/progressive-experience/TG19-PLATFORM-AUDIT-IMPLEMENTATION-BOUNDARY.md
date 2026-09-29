# TG19 Platform Audit Implementation Boundary

Date: 2026-07-20

Status: **FROZEN — READY FOR BOUNDED IMPLEMENTATION**

Governing decision: `ADR-PF-015-PLATFORM-AUDIT-LOG.md`

## Purpose

This boundary authorizes only the reusable platform-wide audit persistence
required before Platform Capability Bootstrap and TG19 Final Platform
Foundation Checkpoint 3 can proceed.

It does not implement the bootstrap, capability assignment lifecycle, manual
contact verification, verification transport, or frontend behavior.

## Authorized Persistence

Create one additive table:

`org_platform_audit_logs`

The authorized SQLAlchemy model and migration contain only:

- event UUID primary key;
- bounded stable event type;
- bounded actor type;
- nullable authenticated actor `org_user_id` foreign key;
- nullable target-principal `org_user_id` foreign key;
- bounded capability/protected-resource identifier;
- bounded safe outcome/status;
- bounded safe reason classification;
- bounded correlation/request identifier;
- safe JSON metadata payload;
- immutable server-created timestamp.

The migration may add check constraints for approved actor types and required
actor/target combinations, plus indexes supporting event type, actor, target,
capability/resource, correlation, and creation-time review. It must not alter
historical migrations or backfill events.

## Authorized Backend Files and Responsibilities

Future implementation may create or extend only:

- one platform-audit SQLAlchemy model under the existing model convention;
- one additive Alembic migration from the verified current head;
- one repository protocol/port;
- one SQLAlchemy repository adapter exposing append and controlled read only;
- model exports and Alembic model registration where required;
- unit-of-work registration for the repository;
- stable typed platform-audit persistence failures;
- transaction integration points used later by bootstrap and capability-
  management services;
- focused unit and PostgreSQL-backed tests.

Repository `add` must flush but never commit. Application services own commit
and rollback so capability assignment and audit can be atomic.

## Immutability and Security Requirements

- No repository update/delete method is authorized.
- No service may accept unrestricted client metadata.
- Metadata keys and values must be allowlisted/bounded by the owning operation.
- Actor types are limited to those approved by ADR-PF-015.
- System/bootstrap events may omit authenticated actor identity; authenticated
  platform events may not.
- The table has no `organization_id` and no fabricated organization scope.
- Secrets, raw tokens, evidence references, contact values, fingerprints,
  credentials, provider payloads, and arbitrary sensitive reasons are
  prohibited.
- Database-role update/delete restrictions and tamper-evident signing remain
  deployable extension points; the application repository must already be
  append-only.
- There is no public audit transport in this boundary.

## Transaction Integration Contract

The platform-audit repository joins the caller's existing unit of work. Later
bootstrap and capability-management application services must:

1. persist or mutate the capability assignment;
2. append the corresponding platform audit event;
3. flush both without committing in either repository;
4. commit once through the application service;
5. roll back both when either write or commit fails.

Platform audit failure is never downgraded to a warning. Bootstrap or
capability mutation cannot report success without the immutable event.

## Explicitly Prohibited

- Changing or relaxing `org_audit_logs.organization_id`.
- Fabricating, inferring, or creating a system organization.
- Writing organization-scoped events to platform audit without a legitimate
  approved platform purpose.
- Duplicating every organization audit event into the new table.
- Public audit list/read/write APIs or unauthenticated transport.
- Frontend changes.
- Unrelated analytics, logging, event-bus, outbox, SIEM, or export work.
- Implementing capability assignment, bootstrap execution, manual verification,
  TG19 Checkpoints 3–5, TG20, Doctor Module, or clinical functionality.

## Required Focused Tests

### Model and repository

- platform audit insert with no organization ID;
- authenticated platform actor event;
- deployment bootstrap/system actor event;
- emergency recovery actor event;
- capability grant and revoke event shapes;
- approved constraints reject invalid actor semantics;
- expected indexes exist;
- repository exposes append but no normal update/delete behavior.

### Transaction behavior

- assignment failure rolls back audit;
- audit failure rolls back assignment;
- commit failure leaves neither side committed;
- idempotent mutation replay creates no duplicate mutation event;
- concurrent mutation produces one authoritative assignment/audit result.

### Security and compatibility

- safe allowlisted metadata persists;
- prohibited sensitive fields are rejected or never accepted;
- no organization identifier is required or synthesized;
- existing `org_audit_logs` model, repository, constraints, and behavior remain
  unchanged;
- no public router is registered.

### Migration and quality

- Alembic reports one head;
- migration upgrades an existing database;
- downgrade removes only platform audit persistence;
- re-upgrade succeeds;
- a fresh database reaches head;
- expected foreign keys, checks, and indexes exist in PostgreSQL;
- Ruff, compileall, focused Pytest, and `git diff --check` pass.

## Completion Gate

Platform audit implementation is complete only after the model, migration,
append-only repository, UoW registration, typed errors, transaction test
harness, PostgreSQL migration/constraint evidence, commit, push, and clean
synchronized worktree are verified.

Only then may a fresh task resume Platform Capability Bootstrap implementation.
TG19 Final Platform Foundation Checkpoint 3 remains blocked until both platform
audit and bootstrap prerequisites are implemented and verified.

Platform Audit Implementation Boundary Status: **READY**
