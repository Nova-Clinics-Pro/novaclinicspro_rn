# Progressive Experience Recovery Checkpoint

Execution date: 2026-07-13

## 1. Purpose

This checkpoint must close before further Progressive Experience implementation. It converts the ignored Kiro spec work into version-controlled governance, corrects unverified conclusions, and defines the gates required before any new onboarding behavior work begins.

## 2. Current Baseline

Frontend recovery worktree:

```text
/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn-progressive-recovery-codex
```

Frontend branch:

```text
feature/progressive-experience-recovery
```

Frontend `origin/dev` base:

```text
45c13b04 Merge branch 'test' into dev
```

Backend recovery worktree:

```text
/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro-api-progressive-recovery
```

Backend branch:

```text
feature/progressive-experience-recovery
```

Backend `origin/dev` base:

```text
9dba7d1 Implement R4 treatment state ownership backend
```

Backend recovery branch current pushed head:

```text
a82103d Repair fresh database migration chain
```

## 2.1 Worktree Ownership

| Agent | Repository | Worktree | Branch | Purpose |
|---|---|---|---|---|
| Codex | Frontend | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn-progressive-recovery-codex` | `feature/progressive-experience-recovery` | Onboarding recovery documentation |
| Codex | Backend | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro-api-progressive-recovery` | `feature/progressive-experience-recovery` | Onboarding recovery |

The previous frontend recovery folder at `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn-progressive-recovery` is now on `merge-progressive-phase0-into-test` at `e8fb29aa` and is treated as owned by another workflow. It was not switched or modified. No other agent worktree was modified. Doctor Module work remains out of scope.

## 3. Branch Decision

- Stale frontend `origin/feature/progressive-experience-phase-1` must not be reused.
- Clean paired frontend/backend recovery branches were created from latest `origin/dev`.
- Both recovery branches were pushed to origin.
- New implementation work must continue to use the same paired branch name:

```text
feature/progressive-experience-recovery
```

Do not merge into `test` or `dev` during R0.

## 4. Recovery Gate Results

| Gate | Status | Evidence | Unresolved Blocker | Owner / Next Action |
|---|---|---|---|---|
| R1 - Canonical Specs in Git | PASS | `git check-ignore -v frontend/docs/Onboarding/progressive-experience/requirements.md` reports the narrow `.gitignore` unignore rule. `git ls-files frontend/docs/Onboarding/progressive-experience` lists the nine canonical docs. `.kiro` remains ignored via `.gitignore:240:.kiro/`. Documentation commit `4cc02477` was pushed to `origin/feature/progressive-experience-recovery`. | None. | Keep canonical docs in `frontend/docs/Onboarding/progressive-experience/`; treat `.kiro` as a workspace mirror only. |
| R2 - Clean Paired Branches | PASS | Frontend branch `feature/progressive-experience-recovery` created from `45c13b04` and pushed. Backend branch `feature/progressive-experience-recovery` created from `9dba7d1` and pushed. Backend worktree is clean. Frontend worktree contains only reviewed docs and `.gitignore` changes for R0. | None for branch creation. | Codex/user: keep branch pair clean; do not reuse `origin/feature/progressive-experience-phase-1`. |
| R3 - Backend Onboarding Idempotency Verification | PASS_IN_DEV | Backend commits `c5082fb`, `f145dbf`, `a2a818b`, `bc6d446`, and `a82103d` implement Platform Foundation request idempotency, migration `20260712_000001`, onboarding step submission integration, approved tenant-scoped persistence naming, fresh database migration-chain repair, and focused tests. Full backend suite: `316 passed`; `git diff --check` passed; `alembic heads` and `alembic current` both report `20260712_000001 (head)` after a zero rebuild of local `novaclinics_test`. | Staging retry verification still required after deployment. | Backend/platform owner: run staging same-key replay checks with real credentials and deployed backend. |
| R4 - Tenant Resolution Verification | PARTIAL | Frontend sends route tenant and `X-Tenant-ID` fallback in onboarding status and step submit APIs. Backend `/auth/me` response maps `tenant_id` to frontend `tenantId`. Backend route authorization resolves membership from the path `tenant_id`; onboarding service also checks user tenant against route tenant. Backend tests verify duplicate replay, same-key conflict, tenant/step isolation, missing-key compatibility, and cross-tenant rejection in code. | Staging verification was not executed in this thread for provisional tenants, active tenants, multi-clinic users, tenant switching, retry after timeout, duplicate retry, `X-Tenant-ID` mismatch, or cross-tenant rejection. | Backend/frontend owners: run staging checklist below with real credentials and deployed backend. |
| R5 - Hindi Localization Completion Decision | PASS | `onboarding.progressiveExperience` in `hi-IN.json` now has Hindi values for all audited keys. Key parity is `77` Hindi keys and `77` English keys; missing keys: none; interpolation variables preserved. | None for R0. | Product/localization owner: review translation quality before user-facing Hindi launch. |
| R6 - Focused Verification | PASS_FOR_RECOVERY | Backend verification passes in `.venv-idempotency`: focused tests `12 passed`, full tests `316 passed`, `git diff --check` passed, `alembic heads` passed, and fresh local `alembic upgrade head` plus `alembic current` reached `20260712_000001`. Frontend dependencies are present; `git diff --check` passed. The frontend package root is `frontend/`; `packageManager` is Yarn 1; no TypeScript verification script exists in `frontend/package.json`, so `./node_modules/.bin/tsc --noEmit` was used. Frontend Jest and TypeScript failures are unchanged from `origin/dev` and are classified as baseline debt, not recovery regressions. | Production promotion remains blocked by baseline frontend Jest/TypeScript debt and staging tenant/replay checks that are `NOT_EXECUTED` because no staging credentials/config were available in the worktree. | Phase implementation may begin. Integration into `test` remains blocked pending relevant verification; promotion to `dev` remains blocked pending integrated tests and staging verification. |

## 5. Backend Idempotency Evidence

Conclusion after backend recovery implementation:

```text
VERIFIED_IN_DEV
```

| Concern | Evidence | Status |
|---|---|---|
| Header read | `submit_step_data` accepts optional `Idempotency-Key` via FastAPI `Header`. Missing key preserves legacy behavior; present empty key returns platform validation error. | PASS_IN_DEV |
| Scope | Platform scope includes route tenant, authenticated actor, onboarding step operation, and idempotency key. Request fingerprint includes tenant, step code, and request body. | PASS_IN_DEV |
| Duplicate prevention | `PlatformIdempotencyService` atomically claims a scoped key through `tenant_idempotency_records` unique scope/key storage. | PASS_IN_DEV |
| Same-response retry | Completed same-key/same-payload requests replay the stored response body. | PASS_IN_DEV |
| Concurrent duplicate handling | Concurrent same-scope/same-key in-progress requests receive conflict and do not execute duplicate domain side effects in focused tests. | PASS_IN_DEV |
| Tests | `tests/test_platform_idempotency_service.py` and `tests/test_onboarding_idempotency_integration.py` cover first request, replay, conflict, concurrency, tenant/actor/operation/step isolation, retryable failure, missing-key compatibility, and cross-tenant rejection. | PASS_IN_DEV |

Recommended owner:

```text
PLATFORM_FOUNDATION
```

Rationale: the backend contains request correlation, CORS header allowance, event outbox retry infrastructure, notification event uniqueness, and domain-specific idempotency patterns, but no reusable processed-request store or request-level idempotency middleware/service. Onboarding should consume a reusable platform contract rather than creating a permanent onboarding-only mechanism.

## 6. Tenant Resolution Evidence

| Concern | Evidence | Status |
|---|---|---|
| `/auth/me` | `CurrentUserResponse` includes `tenant_id`; handler returns `user.tenant_id` and tenant status/name when present. | VERIFIED_IN_CODE |
| Current tenant/session resolution | Frontend auth entity maps `/auth/me` `tenant_id` to `tenantId`; auth hooks refresh session after demo/sample clinic creation to pick up tenant metadata. | VERIFIED_IN_CODE |
| Onboarding/provisional tenant behavior | Frontend has explicit `X-Tenant-ID` workaround and warning for missing JWT `tenant_id`; backend path-tenant dependency does not rely on the header and requires tenant membership unless org-admin bypass applies. | VERIFIED_IN_CODE; NOT_EXECUTED_IN_STAGING |
| Live tenant behavior | Code supports tenant ID in `/auth/me`, route tenant IDs, and path-tenant membership resolution. | VERIFIED_IN_CODE; NOT_EXECUTED_IN_STAGING |
| `X-Tenant-ID` compatibility | Frontend sends header, but backend onboarding route does not directly read it in the route signature inspected; backend uses path tenant. | VERIFIED_IN_CODE_AS_IGNORED_BY_ONBOARDING; NOT_EXECUTED_IN_STAGING |
| Tenant switching | Frontend auth maps `owned_clinics` and onboarding calls accept an explicit `tenantId`; end-to-end selected/effective tenant switching was not executed. | VERIFIED_IN_CODE_PARTIAL; NOT_EXECUTED_IN_STAGING |
| Cross-tenant submission safety | `OnboardingService.submit_step` rejects non-org-admin users when `user_context.tenant_id != tenant_id`. | VERIFIED_IN_CODE |
| Multi-tenant ownership | Frontend auth maps `owned_clinics`, `hasMultipleClinics`, and `getPrimaryClinic`; selected/effective tenant switching was not executed end-to-end. | VERIFIED_IN_CODE_PARTIAL; NOT_EXECUTED_IN_STAGING |

### Tenant Verification Matrix

| Case | Code evidence | Staging evidence | Status |
|---|---|---|---|
| Onboarding tenant | `/auth/me` maps `tenant_id`; onboarding status/submit calls use explicit path `tenantId`; backend path-tenant dependency checks membership. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Active tenant | Same path-tenant membership and `/auth/me` tenant mapping support active tenants. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Multi-clinic user | Frontend maps `owned_clinics`; helper functions identify multiple clinics and primary clinic. | Not executed. | VERIFIED_IN_CODE_PARTIAL; NOT_EXECUTED |
| Tenant switching | Onboarding APIs take explicit `tenantId`; query/cache behavior was not exercised. | Not executed. | VERIFIED_IN_CODE_PARTIAL; NOT_EXECUTED |
| Retry after timeout | Platform idempotency allows same-key/same-payload retry after `FAILED_RETRYABLE`; covered by backend unit tests. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Duplicate retry | Onboarding integration test verifies same key and same payload replays without a second domain call. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |
| `X-Tenant-ID` mismatch | Backend onboarding route ignores `X-Tenant-ID` and uses path tenant plus authenticated membership context. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Cross-tenant request rejection | `OnboardingService.submit_step` rejects non-org-admin mismatched tenant; integration test covers rejection. | Not executed. | VERIFIED_IN_CODE; NOT_EXECUTED |

### Staging Checklist

1. Provisional onboarding tenant: create/sign in, verify `/auth/me` has expected `tenant_id` or documented fallback behavior.
2. Active tenant: verify `/auth/me` returns active tenant and onboarding/dashboard routes use it.
3. Multi-tenant user: verify selected/effective tenant does not leak prior tenant onboarding status.
4. Tenant switch: switch tenants and verify onboarding/status/query cache isolation.
5. Onboarding step retry: submit same step twice with same `Idempotency-Key` after backend implementation, verify one side effect and same response.
6. Cross-tenant rejection: authenticated Tenant A user attempts Tenant B onboarding route/header, verify rejection unless org-admin.
7. Expired or invalid tenant membership: deactivate membership, refresh token/session, verify onboarding route rejection.
8. `X-Tenant-ID` disagreement: send URL Tenant A with header Tenant B and verify backend behavior is explicit and documented.

## 7. Hindi Localization Evidence

Outcome:

```text
COMPLETE
```

Reason: all 77 audited `onboarding.progressiveExperience` leaf keys in `hi-IN.json` now have Hindi values. The key set matches `en-US.json`, and interpolation variables such as `{{completed}}`, `{{total}}`, and `{{durationDays}}` are preserved.

Owner: Product/localization owner for final copy review before any user-facing Hindi launch.

Full script result: `total=77`, `missing=0`, `extra=0`; interpolation variables preserved.

## 8. Verification Results

| Area | Command | Result | Classification |
|---|---|---|---|
| Frontend | `git diff --check` | Passed with no output. | PASS |
| Frontend | Dependency inspection | `frontend/node_modules` present; `frontend/package.json` declares `packageManager` as Yarn 1 and includes both `package-lock.json` and `yarn.lock`. No install was required. | PASS |
| Frontend | `npm test -- --runInBand tests/onboarding/StepCard.test.tsx tests/onboarding/wizard.store.test.ts --detectOpenHandles` | Failed: `StepCard` opacity assertion and `wizard.store` AsyncStorage mock setup failure. | FAIL_PRE_EXISTING_VS_ORIGIN_DEV |
| Frontend | `npm test -- --runInBand` | Failed: 8 failed suites, 65 passed suites; 21 failed tests, 584 passed tests. Jest hung after summary and was interrupted after result collection. | FAIL_PRE_EXISTING_VS_ORIGIN_DEV |
| Frontend | TypeScript verification discovery | `frontend/package.json` has no `typecheck` or `tsc` script; repository-local `./node_modules/.bin/tsc --noEmit` was used. | PASS |
| Frontend | `./node_modules/.bin/tsc --noEmit` | Failed with existing app-wide TypeScript errors, including onboarding demo-status and payment setup errors. | FAIL_PRE_EXISTING_VS_ORIGIN_DEV |
| Backend | `git diff --check` | Passed with no output. | PASS |
| Backend | `.venv-idempotency/bin/pytest -q` | `316 passed`. | PASS |
| Backend | `.venv-idempotency/bin/alembic heads` | `20260712_000001 (head)`. | PASS |
| Backend | `dropdb novaclinics_test`; `createdb novaclinics_test` | Succeeded; recreated only the local development database requested for verification. | PASS |
| Backend | `.venv-idempotency/bin/alembic upgrade head` | Passed from zero against local `novaclinics_test`. | PASS |
| Backend | `.venv-idempotency/bin/alembic current` | `20260712_000001 (head)`. | PASS |
| Backend | Idempotency table inspection via `psql` | Only `tenant_idempotency_records` exists; constraints and indexes match the approved tenant-scoped names. | PASS |
| Staging | Tenant/replay checklist | Not executed: no staging URL, credentials, or safe staging test tenant configuration was available in this worktree. | NOT_EXECUTED |

Backend product verification now claims the focused and full pytest results above. Frontend product tests are still not claimed as passing.

## 8.1 Backend Recovery Commits

| Commit | Message | Scope |
|---|---|---|
| `c5082fb` | `Define reusable request idempotency architecture` | Backend ADR for platform ownership and replay contract. |
| `f145dbf` | `Implement platform request idempotency foundation` | Platform service, SQLAlchemy model/repository/dependency, migration `20260712_000001`, Alembic model metadata. |
| `a2a818b` | `Integrate onboarding submission with platform idempotency` | Onboarding step submission consumer and focused idempotency/onboarding tests. |
| `bc6d446` | `Align idempotency persistence with tenant naming convention` | Renamed persistence to `tenant_idempotency_records` and approved tenant-scoped constraints/indexes. |
| `a82103d` | `Repair fresh database migration chain` | Repaired historical migration-chain blockers so local zero rebuild reaches `20260712_000001`. |

## 9. Go / No-Go Decision

```text
Recovery / implementation readiness: GO
Production promotion readiness: NO-GO
```

The recovery checkpoint is GO for resuming Progressive Experience implementation because the remaining failures are not caused by recovery changes:

- focused onboarding Jest failures are in files unchanged from `origin/dev`;
- full Jest and TypeScript failures are existing baseline debt;
- the frontend recovery branch's only functional code delta is completed Hindi localization;
- backend migration, idempotency, fresh-database rebuild, and all 316 backend tests pass;
- staging verification could not run because no safe staging access was available, not because verification failed.

Release protection remains unchanged: integration into `test` is blocked pending relevant verification, and promotion to `dev` is blocked pending integrated tests and staging tenant/replay verification.

## 10. Tracked Release Blockers

1. Baseline frontend Jest debt:
   - `StepCard` opacity assertion.
   - `wizard.store` AsyncStorage mock setup.
   - other unchanged full-suite Jest failures.
2. Baseline frontend TypeScript debt:
   - existing app-wide TypeScript errors, including onboarding demo-status and payment setup errors.
3. Staging verification:
   - must run before merging into `test` or promoting to `dev`;
   - cannot run until staging URL, credentials, and safe tenants are provided.

## 11. Next Authorized Work

Progressive Experience Phase 1 is authorized.

Next authorized work:

```text
Execute the first incomplete task group in tasks.md
```

Integration into `test`:

```text
BLOCKED pending relevant verification
```

Promotion to `dev`:

```text
BLOCKED pending integrated tests and staging verification
```

No Doctor Module changes are authorized.

## 12. Final Verification Update - 2026-07-13

This section supersedes earlier interim environment findings in this checkpoint.

### Database Naming

Backend idempotency persistence now complies with the Nova table naming rule:

- table: `tenant_idempotency_records`;
- unique constraint: `uq_tenant_idempotency_scope_key`;
- check constraint: `ck_tenant_idempotency_status`;
- indexes: `idx_tenant_idempotency_lookup`, `idx_tenant_idempotency_expires_at`;
- migration: unpublished revision `20260712_000001` was updated directly because backend commit `a2a818b` is contained only in `origin/feature/progressive-experience-recovery`, not `test` or `dev`.

### Migration Chain

The approved historical migration repair in `1d51109d8e2d_add_staff_bank_details_table.py` adds SQLAlchemy inspection guards for fresh-build-only legacy artifacts and recreates inventory tracking tables that were referenced by later migrations but missing from a zero database build:

- `tenant_appointment_rules` table/index cleanup is skipped when the legacy table is absent;
- `tenant_inventory_alerts`, `tenant_inventory_batches`, and `tenant_inventory_movements` cleanup is skipped when the legacy tables are absent;
- missing legacy inventory tracking tables are created before later migrations extend them.

Fresh local rebuild now reaches head. After dropping and recreating only the confirmed local `novaclinics_test` database, `alembic upgrade head` completed and `alembic current` reported:

```text
20260712_000001 (head)
```

No staging, production, Supabase, or shared database was modified.

### Backend Verification

| Command | Result |
|---|---|
| `git diff --check` | PASS |
| `.venv-idempotency/bin/pytest -q tests/test_platform_idempotency_service.py tests/test_onboarding_idempotency_integration.py` | `12 passed` |
| `.venv-idempotency/bin/pytest -q` | `316 passed, 18 warnings` |
| `.venv-idempotency/bin/alembic heads` | `20260712_000001 (head)` |
| `.venv-idempotency/bin/alembic upgrade head` against fresh local `novaclinics_test` | PASS |
| `.venv-idempotency/bin/alembic current` | `20260712_000001 (head)` |
| `psql` idempotency table/constraint/index inspection | PASS: `tenant_idempotency_records`, `uq_tenant_idempotency_scope_key`, `ck_tenant_idempotency_status`, `idx_tenant_idempotency_lookup`, and `idx_tenant_idempotency_expires_at` present |

### Frontend Verification

| Command | Result |
|---|---|
| Dependency inspection | PASS: `node_modules` present; package root is `frontend/`; repository package manager declares Yarn 1 |
| `git diff --check` | PASS |
| `npm test -- --runInBand` | FAIL: 8 failed suites, 65 passed suites; 21 failed tests, 584 passed tests; Jest open-handle hang stopped after failure summary |
| `npm test -- --runInBand tests/onboarding/StepCard.test.tsx tests/onboarding/wizard.store.test.ts --detectOpenHandles` | FAIL: 2 failed suites, 1 failed test, 11 passed tests |
| `./node_modules/.bin/tsc --noEmit` | FAIL: existing app-wide TypeScript errors, including onboarding demo-status and payment setup type errors |

Frontend failure classification: pre-existing verification debt relative to `origin/dev`. `git diff --name-only origin/dev...HEAD -- frontend/tests frontend/features frontend/app frontend/core` reports only `frontend/core/localization/translations/hi-IN.json`, and each failing Jest/TypeScript source file checked is unchanged from `origin/dev`.

### Tenant and Replay Matrix

| Case | Automated/local evidence | Staging evidence | Status |
|---|---|---|---|
| Authorized onboarding tenant | Onboarding integration tests submit with matching path tenant and user tenant. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Active tenant | Same path-tenant authorization code path applies. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Same-key replay | Focused tests verify same key and same payload replay without a second domain call. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Same key in different tenants | Focused tests verify tenant-scoped independent execution. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| `X-Tenant-ID` mismatch | Backend onboarding route uses path tenant plus membership context, not the header. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Cross-tenant rejection | Focused integration test verifies non-org-admin tenant mismatch rejection. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Different onboarding steps same key | Focused tests verify operation/step scoping. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE; NOT_EXECUTED |
| Multi-clinic membership authorization | Code maps owned clinics and route membership context; no end-to-end selected-tenant staging run. | Not executed: no staging URL, credentials, or safe staging tenant configuration available. | VERIFIED_IN_CODE_PARTIAL; NOT_EXECUTED |

### Localization

Hindi Progressive Experience localization is complete.

- `onboarding.progressiveExperience` key parity: `77` Hindi keys, `77` English keys.
- Missing keys: none.
- Extra keys: none.
- Interpolation variables preserved: `{{completed}}`, `{{total}}`, `{{durationDays}}`.

### Final Decision

```text
Progressive Experience Recovery Checkpoint: GO
```

Release blockers retained:

1. Frontend full and focused onboarding Jest verification fails.
2. Frontend TypeScript verification fails.
3. Staging-only tenant/replay checks remain `NOT_EXECUTED`.

Next authorized work:

```text
Execute the first incomplete task group in tasks.md
```

Integration into `test`:

```text
BLOCKED pending relevant verification
```

Promotion to `dev`:

```text
BLOCKED pending integrated tests and staging verification
```
