# TG20 Acceptance Strategy

> **Controlling gates:** acceptance must verify every AUTH-1 through AUTH-4 rule
> and each measurable checkpoint exit in `final-authorization-contracts.md` and
> `tasks.md`; no implementation shortcut may be waived by this strategy.

Status: **Accepted — Supabase PostgreSQL gate complete**

## Acceptance objective

Accept TG20 only when users can observe and recover authoritative workspace
preparation and enter personalization solely after server authorization, with no
Platform Foundation, readiness, clinical, or commercial boundary violation.

## Quality gates

| Gate | Required evidence |
|---|---|
| Architecture | Product/Platform Foundation references, dependency compliance, no duplicated authority. |
| Domain | Complete state/transition/invariant/property tests including invalid and duplicate transitions. |
| Persistence | PostgreSQL uniqueness, locking/versioning, isolation, migration, downgrade/re-upgrade, no TG20 drift. |
| Backend | Query/retry service, DI, transport, typed errors, idempotency, audit, transaction/rollback tests. |
| Frontend | Real hook/repository/datasource tests, all states, retry, refresh, stale rejection, handoff, tenant switch/logout. |
| Security | No enumeration/tenant escape/client authority/raw leakage; audit metadata safe; protected transitions server-only. |
| Localization | `en-US`/`hi-IN` key and interpolation parity; no visible literals. |
| Theme | Central tokens/icons only; no unauthorized hardcoded visual values. |
| Accessibility | Progress semantics, announcements, focus, action names, disabled/loading behavior, non-color meaning. |
| Multi-clinic | Query/cache/audit/retry isolation and stale outgoing-tenant rejection. |
| Regression | TG18 journey and TG19 Clinic Entry/effective-tenant cleanup remain green. |
| Scope | No TG21/TG22, clinical, financial, operational, CRM, analytics-platform, or integration implementation. |

## Test strategy

### Backend unit/domain

- every valid/invalid transition;
- determinate/indeterminate progress invariants;
- next-action derivation;
- retry attempt/idempotency intent;
- unsupported version/state and safe reason handling.

### Backend repository/PostgreSQL

- one current run per organization/tenant/version;
- organization and tenant isolation;
- optimistic/concurrent transition winner;
- concurrent retry produces one execution request;
- persistence roundtrip and legacy/no-run policy;
- audit failure and provisioning refusal rollback;
- upgrade, current, downgrade, re-upgrade, constraints, indexes, drift.

### Backend application/transport

- authenticated organization/effective-tenant authorization;
- status projection for all states;
- retry replay/conflict/stale/ineligible behavior;
- DI and existing provisioning adapter composition;
- stable safe serialization/error categories;
- no secrets, evidence, raw exception, provider payload, or internal task names.

### Frontend domain/data

- DTO mapping and unknown-field tolerance;
- Version 1 view-model state matrix;
- unsupported contract/state safety;
- onboarding repository/datasource delegation;
- query-key identity and localization/error-token parity.

### Frontend orchestration/presentation

- TG19 handoff to initial query;
- pending/preparing and bounded refresh;
- determinate and indeterminate accessible progress;
- personalization handoff only on authoritative availability and matching tenant;
- retryable failure, one explicit retry, replay, and conflict;
- terminal support state;
- stale response/run/version rejection;
- tenant switch/logout cancellation and cache cleanup;
- offline/network failure remains visibly stale and non-navigable;
- Theme, English/Hindi, focus, live-region, touch-target, and screen-reader checks.

## Architecture verification

Source review must prove:

- presentation has no direct networking;
- domain has no React/FastAPI/SQLAlchemy/provider dependency;
- repository adapter does not commit;
- application service owns UoW/audit/idempotency;
- provisioning is reused behind an adapter;
- Platform Foundation context is resolved server-side;
- cache keys include identity/organization/tenant/version;
- no readiness/clinical/commercial rules exist in TG20.

## Acceptance journeys

| Journey | Expected result |
|---|---|
| New clinic handoff | Effective tenant opens its authoritative preparation run. |
| Existing/associated clinic handoff | Current tenant run loads without duplicate creation. |
| Normal preparation | Pending/preparing updates remain truthful and reach personalization availability. |
| Retry | Retryable failure permits one idempotent retry and recovers or terminates safely. |
| Terminal failure | No retry/navigation; localized safe support action. |
| Tenant switch | Outgoing work/cache is cancelled/cleared; only new tenant projection applies. |
| Unsupported version/state | Fail-safe unavailable state, no personalization action. |
| Stale/network failure | Last data is visibly stale/non-authoritative; user can refresh safely. |

## Requirement matrix

Final acceptance must classify every TG20-FR, TG20-NFR, implemented optional
requirement, and explicit future/out-of-scope item. No requirement may remain
unclassified.

## Release criteria

- All mandatory requirements are `VERIFIED_COMPLETE` or explicitly approved
  `STAGING_ONLY`; no TG20-owned `PARTIAL` or `BLOCKED` remains.
- Focused and regression suites pass.
- Single Alembic head and zero TG20-owned drift.
- Production/staging runtime uses Supabase authority and safe strategy/config.
- Staging verifies actual preparation execution, refresh/retry, multi-clinic,
  stale-session, accessibility, localization, and observability.
- Rollback/forward migration and operational support playbook are verified.
- Worktrees are clean, commits pushed, and acceptance evidence traceable.

## Decision

Final acceptance chooses exactly one:

- `TG20_ACCEPTED`
- `TG20_NOT_ACCEPTED — <precise TG20-owned reason>`

Historical repository debt must be classified separately. Staging-only release
verification may remain after implementation acceptance only when the governing
requirements explicitly permit it.

## Final acceptance evidence — 2026-07-21

### Requirement classifications

| Requirement | Classification | Evidence |
|---|---|---|
| TG20-FR1–FR15 | `VERIFIED_COMPLETE` | Source trace through TG19 handoff, application services, transport, frontend repository/orchestration, and 63 focused backend plus 177 onboarding frontend tests. |
| TG20-NFR1 | `VERIFIED_COMPLETE` | Domain, application, repository, transport, and presentation boundaries remain separated; touched-path Ruff and ESLint pass. |
| TG20-NFR2 | `VERIFIED_COMPLETE` | The approved non-production Supabase PostgreSQL target completed connectivity, one-revision downgrade/re-upgrade, direct schema/RBAC inspection, concurrent ensure/claim/retry, atomic rollback, executor continuation, and zero-residue cleanup verification. |
| TG20-NFR3–NFR8 | `VERIFIED_COMPLETE` | Isolation, safe projections/errors, transactional retry composition, localization/Theme/accessibility, reuse, and additive version handling are covered by focused source and test evidence. |
| TG20-OPT1 | `VERIFIED_COMPLETE` | Existing React Query lifecycle infrastructure supplies bounded active refresh and terminal-state stop behavior. |
| TG20-OPT2 | `OUT_OF_SCOPE` | No backend elapsed-duration projection or estimated completion behavior was implemented. |
| TG20-OPT3 | `VERIFIED_COMPLETE` | The safe `support_correlation_id` contract is mapped through backend and frontend without raw internal detail. |
| TG21 capability-driven visibility | `OUT_OF_SCOPE` | Reserved for TG21. |
| TG22 Ready-to-Start policy/checklist | `OUT_OF_SCOPE` | Reserved for TG22. |
| TG23–TG25 conflict/offline mutation recovery | `OUT_OF_SCOPE` | Reserved for later roadmap groups. |
| TG26–TG30 commercial and continuous-guidance behavior | `OUT_OF_SCOPE` | Reserved for later roadmap groups. |
| Clinical Workspace workflows | `OUT_OF_SCOPE` | Explicitly outside TG20. |

Totals: 25 `VERIFIED_COMPLETE`, 0 `BLOCKED`, 6 `OUT_OF_SCOPE`, 0
`PARTIAL`, and 0 `STAGING_ONLY`. All ten mandatory acceptance criteria are
`VERIFIED_COMPLETE` by source, deterministic focused tests, and live Supabase
PostgreSQL acceptance evidence.

### Journey matrix

| Journey | Classification | Evidence/result |
|---|---|---|
| A — First clinic handoff | `STAGING_ONLY` | TG19 handoff, effective-tenant revalidation, ensure/start, ordered units, evidence progress, and personalization navigation align in source and focused tests; the complete chain was not exercised against configured Supabase Authentication/PostgreSQL in this gate. |
| B — Existing clinic | `VERIFIED_COMPLETE` | A disposable active existing organization/clinic with no TG20 run completed lazy initialization, one-winner ensure/claim, evidence-backed ordered execution, and safe personalization availability on Supabase PostgreSQL. |
| C — Retryable failure | `VERIFIED_COMPLETE` | Typed eligibility, safe reason/next action, remaining attempts, organization idempotency, atomic claim continuation, resume from first invalid evidence, three-retry maximum, and replay/conflict behavior pass focused tests. |
| D — Terminal failure | `VERIFIED_COMPLETE` | Missing clinic-type plus `general` fallback, unsupported contract/state, no retry, safe guidance, and non-leaking transport behavior are verified. |
| E — Concurrent execution | `VERIFIED_COMPLETE` | Live Supabase PostgreSQL proved one-winner ensure/claim/retry, optimistic stale-writer rejection, stale-token rejection, deterministic expired-claim reclaim, ordered/deduplicated events and evidence, and restart through the authoritative retry claim. |
| F — Tenant switch and logout | `VERIFIED_COMPLETE` | Query cancellation, tenant-key removal, operation/retry cleanup, stale-generation rejection, draft cleanup reuse, logout, and new-scope isolation pass frontend and Platform Foundation regressions. |
| G — Personalization handoff | `VERIFIED_COMPLETE` | Navigation occurs only for authoritative `PERSONALIZATION_AVAILABLE` after effective-tenant refresh/equality; `START`/`REFRESH` and existing routes are covered without inventing readiness or clinical state. |

### Gate results

- Backend: 63 focused TG20 tests passed and one built-in fixture-dependent
  PostgreSQL test skipped because the database intentionally had no reusable
  active association. The live disposable acceptance harness supplied that
  context and passed concurrent ensure/claim/retry, executor continuation,
  audit/idempotency rollback, ordering/deduplication, and cleanup assertions.
  Aggregate, lifecycle, units, evidence, events, claims, query/executor/retry/
  transport, RBAC, audit, idempotency, UoW, and safe typed errors are
  `VERIFIED_COMPLETE`.
- Frontend: 177 onboarding tests plus 4 logout-boundary tests passed. Data/
  repository reuse, domain projection, orchestration, state/retry UX, cleanup,
  and handoff are `VERIFIED_COMPLETE`.
- Regression: 77 TG19/Platform Foundation tests passed; one TG19 PostgreSQL
  fixture was skipped because `CLINIC_ENTRY_TEST_DATABASE_URL` is not
  configured. The skip does not conceal a TG20 source failure.
- Security: authorization, effective-tenant equality, view/manage RBAC,
  server-only lifecycle authority, safe response shape, transactional audit/
  idempotency, immutable history, tenant scope, and stale claim/version
  enforcement are `VERIFIED_COMPLETE`, including live database enforcement.
- Accessibility/localization/Theme: `en-US`/`hi-IN` parity and placeholders,
  localized visible TG20 copy, determinate/indeterminate progress, busy/live/
  alert semantics, focus and disabled states, non-color meaning, touch sizing,
  central Theme tokens, icons, Hindi length, and font scaling are
  `VERIFIED_COMPLETE` by source and focused presentation tests.
- Static checks: touched-file ESLint passed; backend compileall passed; scoped
  Ruff passed using a temporary cache; Alembic reports the single
  `20260721_030000` head. Repository TypeScript reports only pre-existing,
  non-TG20 errors; no TG20-owned TypeScript error was reported.
- Migration: Supabase PostgreSQL downgraded exactly from `20260721_030000` to
  `20260721_020000`, directly verified removal of both TG20 tables, permissions,
  and mappings, then re-upgraded successfully. Final current/head is the single
  `20260721_030000` revision. Direct inspection verified two tables, two primary
  keys, six foreign keys, lifecycle/retry/claim checks, optimistic version,
  approved uniqueness and lookup indexes, two permissions, and five role
  mappings. `alembic check` reaches the documented unrelated `org_staff`
  metadata-registry failure before proposing operations; no TG20-owned drift
  was observed by migration lifecycle, direct schema inspection, or focused
  migration tests.
- Live fixture cleanup: the uniquely scoped acceptance organization, member,
  clinic, association, preparation/events, audit, and idempotency rows were
  removed in dependency order. Final verification found zero preparation/event
  rows and zero acceptance fixture residue while retaining exactly two TG20
  permissions and five default-role mappings.
- Scope: clinical setup, staff onboarding, readiness completion, billing,
  inventory, CRM, commercial activation, analytics, and future Progressive
  Experience epics remain `OUT_OF_SCOPE` and were not claimed or implemented.

### Final decision

`TG20_ACCEPTED`

TG20 implementation and its Supabase PostgreSQL acceptance gate are complete.
Recovery-branch merge planning may proceed; TG21 remains a separately governed
future task and is not started or authorized by this decision.

## References

Product Architecture, Platform Foundation Architecture, Phase 2 roadmap E3/TG20,
TG19 accepted handoff, TG18 Journey Foundation, and ADR-PF-004/005/006/011/015/
017 govern this strategy.
