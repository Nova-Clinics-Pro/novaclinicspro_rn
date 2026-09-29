# TG19 Final Acceptance

Date: 2026-07-21

Branch: `feature/progressive-experience-recovery`

Decision: **TG19_ACCEPTED**

## Executive decision

Epic 2 Version 1 is accepted. The final audit verified the complete Clinic Entry
boundary, including the three gaps from the prior re-acceptance: authenticated
initial-organization creation for a zero-membership user, executable tests of
the real frontend orchestration hook, and tenant-switch lifecycle cleanup.

The implementation continues to use Supabase Authentication, Supabase
PostgreSQL, Supabase session metadata, and `SupabaseIdentityProvider` behind
`IAuthoritativeIdentityProvider`. No alternate identity, organization, tenant,
or persistence system was introduced.

## Requirement traceability matrix

Totals: **27 `VERIFIED_COMPLETE`, 0 `PARTIAL`, 0 `BLOCKED`, 1
`OUT_OF_SCOPE`, 0 `STAGING_ONLY`** (28 classified requirements).

| Requirement | Final evidence | Status |
|---|---|---|
| E2-FR1 Path presentation | Exactly New Clinic and Bring Your Clinic are presented with localized, accessible forms. | VERIFIED_COMPLETE |
| E2-FR2 New-clinic entry | A zero-membership authenticated user can create an organization, become owner, and continue through clinic creation; existing members reuse their organization. | VERIFIED_COMPLETE |
| E2-FR3 Bring Your Clinic | Opaque ownership request, pending/resume, approval, association, and handoff are implemented and tested. | VERIFIED_COMPLETE |
| E2-FR4 Identity/contact handoff | Exact submitted verified contact and opaque server evidence are used; actor contact is never copied. | VERIFIED_COMPLETE |
| E2-FR5 Effective tenant | Single-clinic automatic selection and explicit multi-clinic selection use the authoritative backend result. | VERIFIED_COMPLETE |
| E2-FR6 Session handoff | Backend metadata projection, backend refresh, Supabase session refresh, context refetch, and tenant-equality gate precede navigation. | VERIFIED_COMPLETE |
| E2-FR7 Duplicate prevention | Fingerprint uniqueness, scoped idempotency, replay, typed conflict mapping, and concurrency behavior are covered. | VERIFIED_COMPLETE |
| E2-FR8 Failure/recovery | Safe typed errors, pending states, phase-specific retry, stale-session recovery, and logout recovery are implemented. | VERIFIED_COMPLETE |
| E2-FR9 Navigation/handoff | Navigation occurs only after refreshed authoritative context matches the intended tenant. | VERIFIED_COMPLETE |
| E2-FR10 Multi-clinic isolation | Explicit selection, cancellation, cache invalidation, draft removal, and stale-state cleanup are implemented. | VERIFIED_COMPLETE |
| NFR Central Theme | UI uses the central Clinic Theme, existing typography, spacing, and icon systems. | VERIFIED_COMPLETE |
| NFR Localization First | English and Hindi catalogs have compatible keys and interpolation; no new visible literal bypasses localization. | VERIFIED_COMPLETE |
| NFR Accessibility | Labels, roles, live/error semantics, focus order, disabled/loading states, and touch targets are preserved. | VERIFIED_COMPLETE |
| NFR Clean Architecture | Presentation performs no direct networking and consumes the existing datasource/repository/hook boundaries. | VERIFIED_COMPLETE |
| NFR Reuse-before-create | Existing auth, query, navigation, wizard, tenant, verification, audit, and repository infrastructure is reused. | VERIFIED_COMPLETE |
| NFR Multi-clinic compatibility | Domain and UI remain specialty-neutral and tenant-isolated. | VERIFIED_COMPLETE |
| NFR Progressive Experience consistency | Successful handoff enters the existing Progressive Experience wizard boundary. | VERIFIED_COMPLETE |
| NFR Security | Server authority, non-enumeration, isolation, fail-closed strategy rules, immutable provenance, and safe errors are verified. | VERIFIED_COMPLETE |
| E2-AC1 Approved paths only | Only the two approved clinic-entry paths are actionable. | VERIFIED_COMPLETE |
| E2-AC5 Effective tenant before onboarding | Tenant equality is required after refresh and before handoff. | VERIFIED_COMPLETE |
| E2-AC6 Retry cannot duplicate/cross tenant | Stable operation idempotency and backend transaction/isolation rules prevent duplicate or cross-tenant mutation. | VERIFIED_COMPLETE |
| E2-AC7 Required reuse | Existing onboarding, auth, tenant, theme, localization, and navigation assets are consumed. | VERIFIED_COMPLETE |
| E2-AC8 No direct presentation API | Source inspection confirms all network calls remain in the datasource/repository boundary. | VERIFIED_COMPLETE |
| E2-AC9 English/Hindi parity | Both catalogs contain the Clinic Entry and initial-organization keys with compatible shapes. | VERIFIED_COMPLETE |
| E2-AC10 Accessible complete flow | Focused presentation and real-orchestration tests cover actionable, pending, retry, selection, and handoff states. | VERIFIED_COMPLETE |
| E2-AC11 Switch/logout cleanup | Active queries are cancelled, outgoing persisted draft and operation state are cleared, caches invalidated, and authoritative context refetched. | VERIFIED_COMPLETE |
| E2-AC13 Workspace-preparation handoff | Validated tenant context routes to the existing wizard flow. | VERIFIED_COMPLETE |
| E2-AC14 Excluded clinical/commercial scope | Doctor Module, clinical workspace, scheduling, inventory, billing, payments, and TG20 remain excluded. | OUT_OF_SCOPE |

## Product journey results

| Journey | Result | Evidence |
|---|---|---|
| A — New user, organization, first clinic | VERIFIED_COMPLETE | Supabase-authenticated zero-membership users create an organization through the bounded auth transport, receive owner membership, create the first clinic, refresh session/context, validate effective tenant, and enter the workspace. |
| B — Existing organization, additional clinic | VERIFIED_COMPLETE | Existing membership is reused; verification, clinic creation, explicit selection when required, cleanup, and workspace handoff are covered. |
| C — Bring Your Clinic | VERIFIED_COMPLETE | `REQUIRED`, `AUTO_APPROVE`, and permitted test-only `DISABLED` ownership modes consume the approved lifecycle; pending/approval and association orchestration are covered. |
| D — Manual verification | VERIFIED_COMPLETE | Request, review, approve, reject, revoke, expire, consume, pending, and resume behavior use the authoritative lifecycle. |
| E — Automatic verification | VERIFIED_COMPLETE | Verified email/mobile normalization, exact matching, evidence, audit, idempotency, rollback, and no-contact-copying rules are covered. |
| F — Tenant switching | VERIFIED_COMPLETE | Cancellation, broad invalidation, persisted-draft removal, operation cleanup, refreshed-context validation, and stale-response rejection are implemented. |
| G — Staff onboarding isolation | VERIFIED_COMPLETE | Staff invitation/RBAC onboarding remains outside clinic contact and ownership verification. |

## Frontend acceptance

The real `useClinicEntryOrchestration` hook is exercised rather than mocked.
Focused tests cover automatic verification, manual pending/resume, ownership
pending/approval, initial organization creation, multi-clinic selection,
session refresh, retry without duplicate clinic mutation, tenant-switch cleanup,
and authoritative navigation. Presentation reuses the existing onboarding
datasource and repository hooks, `useAuth`, React Query, wizard draft storage,
Expo Router, central Theme, localization, and safe error-token infrastructure.
No duplicate frontend architecture or direct presentation networking exists.

## Backend and runtime-composition acceptance

Routers remain transport-only and delegate to application services. Supabase
authentication resolves the actor; organization membership, authorization,
ownership, effective tenant, and tenant association are server-authoritative.
The initial-organization operation reuses
`OrganizationAuthorizationService.create_organization` and atomically creates
the organization, owner membership, and audit record. Clinic Entry reuses the
approved identity, contact, ownership, idempotency, audit, transaction, and
provisioning boundaries.

Runtime composition makes contact `AUTOMATIC`, `MANUAL`, and permitted
`DISABLED`, plus ownership `REQUIRED`, `AUTO_APPROVE`, and test-only `DISABLED`,
operational through dependency injection. Production/staging configuration
fails closed against bypass-capable modes.

## Security acceptance

- No clinic or organization enumeration is exposed.
- Organization, membership, tenant, and association authorization are resolved server-side.
- Cross-organization access, tenant escape, and client-declared verification are rejected.
- Production verification bypass is fail-closed.
- Verification evidence and decision provenance remain immutable and audited.
- Raw evidence, contact values, fingerprints, credentials, and internal exception text are not leaked.
- Platform audit remains append-only; organization audit remains organization-scoped.
- Supabase remains the authoritative authentication, PostgreSQL, and session-metadata system.

## PostgreSQL and Alembic acceptance

- `alembic heads`: single head `20260721_020000`.
- `alembic upgrade head`: passed against the configured Supabase PostgreSQL database.
- `alembic current`: `20260721_020000 (head)`.
- Earlier isolated PostgreSQL evidence verifies the latest downgrade and re-upgrade path.
- The authoritative Supabase runtime was not downgraded during this final gate.
- `alembic check` reaches only the separately audited historical `org_staff` metadata target and reports no TG19-owned drift.

The historical `tenant_treatment_material_usage.deleted_by_staff_id` metadata
reference cannot resolve `org_staff` in Alembic metadata. This predates TG19,
does not identify a TG19 table or migration, and remains owned by the separate
repository schema-reconciliation initiative.

## Verification evidence

- Backend TG19/TG19.1 focused suite: **154 passed, 9 skipped**; the skips are dedicated PostgreSQL tests whose isolated test URLs were not configured in this runtime.
- Prior isolated PostgreSQL TG19/TG19.1 suite: **161 passed**.
- Frontend Clinic Entry acceptance: **4 suites, 15 passed**.
- Focused backend Ruff: passed.
- Backend compileall: passed.
- Focused frontend ESLint: passed.
- Repository-wide frontend TypeScript still reports only established unrelated baseline errors; no touched TG19 acceptance file is reported.
- `git diff --check`: required after this documentation update.

The initial backend run inherited `DEBUG=true` from developer runtime settings,
which intentionally violates the staging-safe-default test. The acceptance run
set `DEBUG=false` for the staging configuration assertion and passed without a
source or environment-file change.

## Release readiness and historical debt

TG19 is implementation-accepted and ready for TG20 architecture and
implementation planning. Production promotion remains subject to the normal
staging/release verification of configured automatic/manual strategies, first
and additional clinic journeys, Bring Your Clinic, multi-clinic selection, and
stale-session recovery.

Remaining historical debt is not TG19-owned:

1. Alembic metadata registration for the historical `org_staff` foreign-key target.
2. Repository-wide frontend TypeScript errors in unrelated modules and legacy Demo Status code.
3. Repository-wide backend lint debt outside the focused TG19 boundary.

## Final decision

All TG19-owned requirements and Epic 2 Version 1 journeys are verified. Runtime
composition, frontend orchestration, initial-organization creation,
tenant-switch cleanup, security boundaries, and Supabase authority satisfy the
approved contracts. No TG19-owned blocker remains.

**TG19_ACCEPTED**
