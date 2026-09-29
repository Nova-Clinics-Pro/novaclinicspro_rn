# TG20 Tasks — Executable Checkpoint Contract

Status: **TG20.0–TG20.7 complete — accepted**

Controlling contracts: `operational-contracts.md` and
`final-authorization-contracts.md`.

Required order:
`TG20.0 → TG20.1 → TG20.2 → TG20.3 → TG20.4 → TG20.5 → TG20.6 → TG20.7`.

Every checkpoint receives a separate review, commit, push, and `HEAD...origin`
verification of `0 0`. No checkpoint may absorb later work. All checkpoints
prohibit unrelated modules, TG21+, clinical workflows, Doctor Module,
financials, inventory, CRM, reports, integrations, commercial behavior, and
Platform Foundation redesign.

## TG20.0 — Source and reuse proof

1. **Objective:** produce the source ownership map, exact implementation file
   matrix, template-resolution/RBAC/Alembic evidence, and unchanged checkpoint
   boundaries. Documentation and test-boundary review only.
2. **Preconditions:** final authorization re-review authorizes TG20.0; both
   worktrees are clean, correctly branched, and synchronized; controlling
   contracts are unchanged.
3. **Allowed files:** `frontend/docs/TG20/` documentation only, specifically a
   TG20.0 source/reuse evidence document and factual cross-references in this
   package.
4. **Prohibited files:** every backend/frontend product source, migration, test,
   dependency manifest, ADR, Product/Platform Architecture document, and any
   documentation outside `frontend/docs/TG20/`.
5. **Dependencies:** current source plus TG19 Final Acceptance and controlling
   contracts.
6. **Schema/migration impact:** none. Record current `alembic heads` and the
   exact predecessor that TG20.1 would use; do not generate a revision.
7. **Responsibilities:** cite the existing template methods; prove RBAC
   migration convention and role codes; map exact existing/new files for
   TG20.1–TG20.5; confirm UoW, audit, idempotency, authorization, router,
   repository/datasource, React Query, navigation, Theme, localization, and
   cleanup reuse.
8. **Focused tests:** no new tests. Inventory the exact existing regression and
   proposed focused test files for later groups.
9. **Commands:** `git status --short`; `git branch --show-current`;
   `git rev-list --left-right --count HEAD...origin/feature/progressive-experience-recovery`;
   `alembic heads`; source searches; `git diff --check`.
10. **Exit criteria:** ownership map, exact file matrix, active clinic-type →
    `general` fallback proof, role/permission migration proof, single-head proof,
    and zero undocumented dependency or open decision.
11. **Recovery:** revert only the uncommitted TG20.0 document edits or issue a
    documentation correction commit; no product state exists.
12. **Stop conditions:** source contradicts AUTH-1/2/3; multiple Alembic heads;
    role codes/migration ownership differ; required reuse has no owner; an ADR or
    product decision would be required.
13. **Commit boundary:** one documentation-only TG20.0 commit.
14. **Push:** push only the feature branch; require both repositories clean and
    synchronized `0 0` before TG20.1.

## TG20.1 — Domain and persistence

1. **Objective:** implement only aggregate/value objects/errors, repository
   port, SQLAlchemy models/adapter, UoW registration, the single authorized
   migration, and focused domain/PostgreSQL/migration tests.
2. **Preconditions:** TG20.0 complete/pushed; its file matrix confirms the paths
   below; current Alembic head matches its evidence.
3. **Allowed backend source-derived directories/files:** new TG20-owned files in
   `app/domain/entities/`, `app/domain/value_objects/`, `app/domain/errors/`, and
   `app/domain/repositories/`; new models plus registry exports in
   `app/infrastructure/db/models/`; one adapter in
   `app/infrastructure/repositories/`; existing SQLAlchemy UoW interface/adapter
   registration files identified by TG20.0; exactly one new file in
   `app/infrastructure/db/migrations/versions/`; TG20-focused files in `tests/`.
   Only TG20-owned additions and minimal import/registration edits are allowed.
4. **Prohibited files:** API routers/schemas/dependencies, application executor/
   query/retry services, frontend files, historical migrations, existing tenant/
   organization/RBAC/audit/idempotency models and repositories except UoW
   registration, and all global architecture redesign.
5. **Dependencies:** TG20.0, ADR-PF-006 transaction ownership, current model and
   migration conventions.
6. **Schema impact:** exactly one revision containing the two tables, claim
   fields, constraints/indexes, permission rows, and default mappings frozen in
   final contracts §4; no other schema change/backfill.
7. **Responsibilities:** deterministic lifecycle/invariants/serialization;
   append-only events; row-lock/CAS repository operations; claim acquire/renew/
   release primitives; flush without commit; typed uniqueness/stale/claim errors;
   UoW exposure.
8. **Focused tests:** `tests/test_workspace_preparation_domain.py`,
   `tests/test_workspace_preparation_repository.py`,
   `tests/test_workspace_preparation_migration.py`, and the existing RBAC/model-
   registry/Alembic drift regressions identified by TG20.0. Tests cover current-
   run uniqueness, event ordering, tenant/organization isolation, claim
   constraints, CAS, expiry/reclaim, stale token, append-only history, permission
   mappings, downgrade/re-upgrade, and empty legacy state.
9. **Commands:** `git diff --check`; `ruff check` on touched backend paths;
   `python -m compileall` on touched backend paths; focused `pytest -q`; isolated
   PostgreSQL `alembic heads`, `upgrade head`, `current`, downgrade one revision,
   re-upgrade, and `alembic check`.
10. **Exit criteria:** one head; exact schema/permission parity; all focused tests
    pass; no TG20-owned drift; repositories never commit; no transport/frontend.
11. **Recovery:** code rollback leaves additive tables unused. Schema downgrade
    follows the fail-closed checks and ordered removal in final contracts §4.3;
    otherwise forward-fix the TG20 revision without editing history after push.
12. **Stop conditions:** migration predecessor changed unexpectedly; required
    existing table/role absent; exact constraint cannot be expressed safely;
    non-TG20 drift is introduced; a second revision or Platform redesign appears
    necessary.
13. **Commit boundary:** one logical domain/persistence/migration commit.
14. **Push:** feature branch only; backend and frontend clean/synchronized `0 0`
    before TG20.2.

## TG20.2 — Executor and query

1. **Objective:** implement evidence adapters, execution-claim orchestration,
   ensure/query services, audit participation, typed projections, DI, and focused
   executor/concurrency tests. No retry endpoint or frontend.
2. **Preconditions:** TG20.1 complete/pushed; persistence and permission rows
   verified on PostgreSQL.
3. **Allowed backend source-derived directories/files:** TG20-owned additions in
   `app/application/onboarding/`; narrow domain service/port additions only if
   listed by TG20.0; minimal dependency/factory wiring in
   `app/api/v1/dependencies/services/` or the existing DI location; focused
   `tests/test_workspace_preparation_executor.py` and
   `tests/test_workspace_preparation_query.py`; minimal UoW composition edits.
4. **Prohibited files:** onboarding router/schemas, retry transport/service,
   migrations/models/schema, template creation/update code, full tenant
   provisioning/Clinic Entry, frontend, background workers/queues.
5. **Dependencies:** TG20.1 repositories/UoW; organization membership,
   association/effective tenant, tenant RBAC, organization audit/idempotency;
   read-only template owner from AUTH-1.
6. **Schema impact:** none.
7. **Responsibilities:** implement ordered four-unit execution; server-time
   acquire/renew/reclaim/release; evidence revalidation; `ensure` idempotency;
   query without mutation; safe projection; application-owned commits/rollback;
   audit atomicity; read-only template resolution and terminal missing-template
   behavior.
8. **Focused tests:** New Clinic/Bring Your Clinic/legacy no-run observation;
   fast complete; each unit outcome; clinic-type and `general` fallback; missing/
   invalid template; no template mutation; restart from first invalid evidence;
   parallel ensure; expired reclaim; renewal invalidates old token; crash/
   cancellation semantics; audit failure rollback; isolation and no secret leak.
9. **Commands:** `git diff --check`; scoped Ruff/compileall; focused executor,
   query, idempotency, audit, authorization, UoW, and PostgreSQL tests.
10. **Exit criteria:** executor is sole writer; query is read-only; all mutations
    verify current claim; no duplicate provisioning/template mutation; exact
    progress/evidence projection; focused tests pass.
11. **Recovery:** roll back the TG20.2 code commit while retaining additive
    schema; interrupted claims expire and are reclaimed under the contract;
    forward-fix any persisted TG20-owned defect without rewriting history.
12. **Stop conditions:** any owner service commits independently; template
    resolution requires mutation; lease cannot be verified atomically; a worker,
    new API, migration, or product decision is required.
13. **Commit boundary:** one executor/query/DI commit.
14. **Push:** feature branch only; both repositories clean/synchronized `0 0`
    before TG20.3.

## TG20.3 — Retry and transport

1. **Objective:** implement retry service/idempotency/authorization composition,
   ensure/query/retry schemas/routes, typed error mapping, and focused transport/
   security tests.
2. **Preconditions:** TG20.2 complete/pushed and executor contract verified.
3. **Allowed backend source-derived directories/files:** TG20 retry additions in
   `app/application/onboarding/`; workspace-preparation schemas in
   `app/api/v1/schemas/`; existing `app/api/v1/routers/onboarding_router.py` and
   `app/api/v1/dependencies/services/onboarding_dependencies.py` or exact TG20.0
   equivalents; router registration only if required; focused TG20 transport/
   security tests in `tests/`.
4. **Prohibited files:** migrations/models/repositories except a proven TG20-
   owned defect under existing contract, frontend, legacy `is_org_admin`
   authority, full provisioning, new auth/RBAC/idempotency/audit systems.
5. **Dependencies:** TG20.2 services/projections; existing Supabase principal,
   membership, association, effective tenant, tenant RBAC, idempotency, audit.
6. **Schema impact:** none.
7. **Responsibilities:** thin routers; exact view/manage decisions; retry max
   three; same-intent replay/conflict; stable transport errors; opaque run and
   idempotency identifiers; no internal exception leakage.
8. **Focused tests:** endpoint registration/schema/serialization/DI; ensure and
   query authorization; owner/admin manage; doctor view-only; custom permission;
   membership/association/effective-tenant failures; retry eligibility,
   exhaustion, replay, conflict, parallel winner, stale claim/version, rollback,
   isolation, and safe errors.
9. **Commands:** `git diff --check`; scoped Ruff/compileall; focused application,
   transport, security, idempotency, audit, and PostgreSQL pytest suites.
10. **Exit criteria:** routes contain no business rules; exact authorization
    matrix passes; retry cannot duplicate TG19 work; stable safe contract passes.
11. **Recovery:** roll back route/service wiring; existing runs remain resumable
    through later compatible code. Forward-fix only within approved contracts.
12. **Stop conditions:** frontend behavior is needed server-side; any schema/
    permission change is required; role boolean shortcut appears; transport must
    expose raw errors; retry owner is ambiguous.
13. **Commit boundary:** one retry/transport commit.
14. **Push:** feature branch only; both repositories clean/synchronized `0 0`
    before TG20.4.

## TG20.4 — Frontend domain and data

1. **Objective:** add frontend projection, extend existing onboarding repository/
   datasource, and implement React Query keys/hooks with focused mapping/cache
   tests. No presentation.
2. **Preconditions:** TG20.3 pushed; backend schemas/error catalogue frozen.
3. **Allowed frontend files/directories:** new TG20-owned entity/use-case files
   under `frontend/features/onboarding/domain/`; minimal extensions to
   `domain/repositories/onboarding.repository.ts`,
   `data/datasources/onboarding.api.ts`, `data/models/onboarding.dtos.ts`, and
   `data/repositories/onboarding.repository.impl.ts`; TG20 query keys/hooks in
   the existing onboarding data/presentation-hook convention identified by
   TG20.0; focused files under `frontend/tests/onboarding/`.
4. **Prohibited files:** pages/components/routes/navigation/localizations,
   backend, global store, new API client/repository family, unrelated onboarding
   flows.
5. **Dependencies:** TG20.3 transport; existing API client, auth, onboarding
   repository/datasource, React Query, TG19 tenant cleanup.
6. **Schema impact:** none.
7. **Responsibilities:** strict DTO mapping; safe unknown version/state/error;
   organization/tenant/run/version/request-generation cache identity; ensure,
   query, retry mutation primitives; stale-response rejection and cleanup hooks.
8. **Focused tests:** DTO/domain/error mapping; repository delegation; key
   isolation; replay; cache invalidation; unsupported state/version; tenant/
   organization switch and logout cleanup; no direct networking.
9. **Commands:** `git diff --check`; focused Jest; ESLint on touched paths;
   scoped TypeScript check using the existing frontend project config.
10. **Exit criteria:** all mappings/hooks pass; no UI/string/theme change; no new
    client/store; cache cannot cross organization/tenant/version.
11. **Recovery:** revert frontend-only TG20.4 commit; backend remains compatible;
    clear only TG20 query keys on deployment/session boundaries.
12. **Stop conditions:** transport contract differs; new global state/client is
    required; exact cleanup identity is unavailable; presentation changes become
    necessary.
13. **Commit boundary:** one frontend domain/data commit.
14. **Push:** feature branch only; both repositories clean/synchronized `0 0`
    before TG20.5.

## TG20.5 — Frontend orchestration and presentation

1. **Objective:** implement one orchestration hook and preparation surface with
   loading/progress/retry/terminal states, navigation handoff, stale/cleanup,
   Theme, localization, accessibility, and focused UI tests.
2. **Preconditions:** TG20.4 complete/pushed; navigation entry/handoff paths from
   TG20.0 remain valid.
3. **Allowed frontend files/directories:** new Workspace Preparation page,
   component(s), and one hook under
   `frontend/features/onboarding/presentation/`; one Expo route under
   `frontend/app/onboarding/`; minimal changes to existing Choice/TG19 handoff
   and onboarding layout/navigation files identified by TG20.0; both
   `frontend/core/localization/translations/en-US.json` and `hi-IN.json`; focused
   `frontend/tests/onboarding/` files.
4. **Prohibited files:** backend, repository/datasource contract redesign,
   unrelated onboarding screens, global Theme/tokens/icons, inline styles,
   hardcoded strings/colors/spacing/typography, new store/client/navigation.
5. **Dependencies:** TG20.4 hooks/domain; existing onboarding navigation, Theme,
   icons, progress/loading/error/button primitives, auth, React Query cleanup.
6. **Schema impact:** none.
7. **Responsibilities:** explicit ensure; pending/preparing/fast-complete/
   retryable/terminal/unsupported states; bounded refresh; accessible determinate
   and indeterminate progress; live-region deduplication/focus order; retry;
   refreshed effective-tenant equality before personalization navigation; stale
   response and switch/logout protection; English/Hindi parity.
8. **Focused tests:** real orchestration (not mocked hook); every state/unit/
   reason; fast completion; refresh bounds/lifecycle; retry/replay; stale
   generation; multi-clinic switch/logout; navigation equality; focus/screen
   reader/progress semantics; Theme/token and localization parity.
9. **Commands:** `git diff --check`; focused Jest; ESLint touched paths; scoped
   TypeScript check; localization parity validation.
10. **Exit criteria:** all UX states measurable and accessible; no hardcoded UI
    value; no cross-tenant render/navigation; TG21/TG22 behavior absent.
11. **Recovery:** revert TG20.5 UI/route commit; TG20 backend/data remain safely
    unused. Remove no shared localization keys already consumed elsewhere.
12. **Stop conditions:** new product copy/state/navigation decision; missing
    Theme/accessibility primitive requiring global redesign; backend change;
    unrelated screen modification.
13. **Commit boundary:** one orchestration/presentation/localization commit.
14. **Push:** feature branch only; both repositories clean/synchronized `0 0`
    before TG20.6.

## TG20.6 — Cross-layer verification

1. **Objective:** verify the accepted implementation and make only narrowly
   required TG20-owned corrections under existing contracts.
2. **Preconditions:** TG20.1–TG20.5 pushed/synchronized; isolated PostgreSQL and
   configured Supabase test boundary available.
3. **Allowed files:** TG20-focused backend/frontend tests, release configuration
   already authorized by TG20.0, TG20 documentation evidence, and only TG20-owned
   source files when a failing accepted test proves a defect.
4. **Prohibited files:** contract redesign, historical migrations, unrelated
   baseline remediation, TG21+, clinical/financial/inventory/CRM, Platform
   Foundation redesign.
5. **Dependencies:** all implementation checkpoints.
6. **Schema impact:** no new migration. Exercise the TG20.1 revision only.
7. **Responsibilities:** Supabase/PostgreSQL integration, concurrency, restart,
   rollback, downgrade/re-upgrade, security, isolation, multi-clinic, frontend/
   backend regressions, release flag/config if already approved.
8. **Focused tests:** complete TG20 suites; TG18/TG19 regressions; claim races;
   idempotency; audit rollback; migration lifecycle/drift; New/Bring/legacy;
   accessibility/localization/Theme; multi-clinic/session cleanup.
9. **Commands:** `git diff --check`; all scoped Ruff/compileall/pytest; Alembic
   lifecycle/check; frontend Jest/ESLint/TypeScript/localization; repository
   synchronization checks.
10. **Exit criteria:** all TG20 gates pass; zero TG20 drift/leakage; unrelated
    baseline failures classified with evidence; no scope expansion.
11. **Recovery:** revert only the narrow TG20.6 fix or forward-fix within the
    accepted contract; ordinary code rollback retains additive data; schema
    downgrade remains fail-closed.
12. **Stop conditions:** failure requires new architecture/product decision,
    second migration, unrelated remediation, or changes outside authorized TG20
    ownership.
13. **Commit boundary:** one verification-evidence/narrow-fix commit; split only
    if the final authorization explicitly requires separate repos.
14. **Push:** both applicable feature branches only; clean/synchronized `0 0`
    before TG20.7.

## TG20.7 — Final acceptance

1. **Objective:** acceptance documentation only, except a narrowly correctable
   TG20-owned defect already covered by an approved contract.
2. **Preconditions:** TG20.6 complete/pushed with all evidence available.
3. **Allowed files:** `frontend/docs/TG20/` acceptance/evidence documents; an
   already authorized TG20-owned source/test file only through a separately
   reviewed correction checkpoint.
4. **Prohibited files:** new product functionality, migration, task group,
   architecture decision, TG21+, and all unrelated modules.
5. **Dependencies:** TG20.6 evidence and `acceptance.md`.
6. **Schema impact:** none.
7. **Responsibilities:** classify every requirement; record domain/backend/
   frontend/security/migration/staging gates; separate historical debt; choose
   exactly `TG20_ACCEPTED` or `TG20_NOT_ACCEPTED`.
8. **Focused tests:** no new behavior tests; rerun only a gate whose evidence is
   stale or disputed.
9. **Commands:** `git diff --check`; required focused re-verification; both git
   status/branch/ahead-behind checks.
10. **Exit criteria:** complete traceability and measurable evidence; no item
    unclassified; precise owner/blocker for any failure.
11. **Recovery:** documentation correction commit; a source defect returns to an
    explicitly authorized narrow correction checkpoint.
12. **Stop conditions:** missing evidence; staging gate incomplete; new decision
    required; any attempted automatic TG21 authorization.
13. **Commit boundary:** one final-acceptance documentation commit.
14. **Push:** feature branch only; both repositories finish clean/synchronized
    `0 0`. Acceptance does not authorize TG21.

### TG20.7 execution record — 2026-07-22

- Requirement matrix: 25 `VERIFIED_COMPLETE`, 0 `BLOCKED`, 6 `OUT_OF_SCOPE`,
  0 `PARTIAL`, 0 `STAGING_ONLY`.
- Journey matrix: B–G `VERIFIED_COMPLETE`; A remains `STAGING_ONLY` because the
  gate did not recreate the entire Supabase Authentication → TG19 Clinic Entry
  chain. Its TG19 handoff and all TG20 behavior remain source/test verified.
- Verification: 63 focused deterministic TG20 backend tests, 77 TG19/Platform
  Foundation regressions, 177 onboarding frontend tests, and 4 logout tests
  passed. One TG19 database fixture skipped due absent
  `CLINIC_ENTRY_TEST_DATABASE_URL`; one TG20 PostgreSQL atomic retry test could
  not be executed against the required Supabase runtime.
- Static gates: backend compileall, scoped Ruff, touched-file ESLint, and single
  Alembic head passed. Repository TypeScript failures are pre-existing and do
  not include TG20-owned files.
- Supabase PostgreSQL gate: approved non-production target connected; exact
  TG20 downgrade/removal/re-upgrade succeeded; final current/head is the single
  `20260721_030000` revision. Direct schema inspection verified tables, keys,
  checks, indexes, two permissions, and five role mappings.
- Concurrency/transaction gate: a disposable existing-clinic fixture proved
  one-winner ensure/claim/retry, stale and expired claim handling, idempotent
  replay, single retry increment, `execute_claimed()` continuation, evidence
  preservation, event ordering/deduplication, no reprovisioning, and atomic
  audit/idempotency rollback.
- Cleanup: zero acceptance fixture residue and zero preparation/event rows were
  verified after dependency-ordered cleanup.
- Drift: `alembic check` remains interrupted only by the already documented
  unrelated `org_staff` metadata-registry defect; no TG20-owned drift was found
  by direct schema parity, lifecycle, or focused migration tests.
- Decision: `TG20_ACCEPTED`. Recovery-branch merge planning may proceed. TG21
  remains separately governed and is not authorized or started here.

## Constitutional references

All groups consume Product Architecture, Platform Foundation Architecture,
Phase 2 E3/TG20, TG19 Final Acceptance, relevant ADR-PF decisions,
`operational-contracts.md`, and `final-authorization-contracts.md`. If a later
implementation prompt conflicts with these contracts, stop and request an
approved documentation revision.
