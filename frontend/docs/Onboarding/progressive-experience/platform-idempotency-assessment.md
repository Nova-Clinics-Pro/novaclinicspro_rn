# Platform Idempotency Assessment

Date: 2026-07-12

## 1. Purpose

This assessment records the Progressive Experience Recovery Checkpoint R0 audit and the subsequent backend platform-idempotency implementation for onboarding step submission. It does not authorize Progressive Experience Phase 1 work.

## 2. Dedicated Worktree Baselines

| Repository | Worktree | Branch | HEAD | Status |
|---|---|---|---|---|
| Frontend | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn-progressive-recovery-codex` | `feature/progressive-experience-recovery` | `248b3410` | Clean at documentation update start |
| Backend | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro-api-progressive-recovery` | `feature/progressive-experience-recovery` | `a2a818b` | Backend idempotency commits pushed |

The dirty frontend main root at `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn` was not used for this audit.

The previous frontend recovery folder at `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn-progressive-recovery` is now on `merge-progressive-phase0-into-test` at `e8fb29aa` and is treated as owned by another workflow. It was not switched, staged, reset, cleaned, stashed, or modified during this update.

## 3. Existing Reusable Platform Capabilities

| Capability | Exists? | File / Symbol | Reusable for onboarding? | Notes |
|---|---|---|---|---|
| Request correlation | Yes | `app/main.py::request_id_middleware`; `app/core/logging.py` | No, observability only | Reads or creates `X-Request-ID` and adds it to logs/response headers. It does not deduplicate requests. |
| CORS allowance for idempotency header | Yes | `app/core/cors.py` | Partial plumbing only | Allows `Idempotency-Key` through CORS, but no backend onboarding handler consumes it. |
| Generic processed-request storage | No | Search found no reusable processed-request table/service | No | There is no platform service that records request key, payload hash, response body, status, and expiry for API replay. |
| Middleware-based request deduplication | No | Search found no idempotency middleware | No | No FastAPI middleware intercepts `Idempotency-Key`. |
| Event outbox retry handling | Yes | `event_outbox` migrations | No | Supports reliable event publishing retries, not synchronous API idempotency. |
| Notification event idempotency | Yes | `org_notification_events` migration | No | Unique event keys prevent duplicate lifecycle notifications only. |
| Domain-specific idempotency checks | Yes | `TenantProvisioningService._create_tenant_user`, `_assign_clinic_owner_role` | Pattern only | These are feature-local read-before-write guards, not a reusable platform contract. |
| Deterministic correlation IDs | Yes | treatment material usage/inventory movement code | Pattern only | Domain-specific material movement idempotency; not appropriate to couple onboarding submissions to this clinical implementation. |
| Row locks / optimistic concurrency | Yes, in clinical domains | treatment sheet lifecycle code and schemas | No | Domain-specific concurrency protection; onboarding step submission does not use it. |
| Unique operation keys | Partial, domain-specific | notification events, inventory movement correlation IDs | No | No reusable tenant/user/operation idempotency key model exists for onboarding. |

Conclusion: the repository has useful patterns, but no reusable platform idempotency capability that onboarding can consume without new foundation work.

## 4. Current Onboarding Submission Flow

| Layer | File / Symbol | Tenant Source | User Source | Transaction Boundary | Side Effects | Duplicate Risk | Retry Behavior | Current Tests |
|---|---|---|---|---|---|---|---|---|
| Frontend request | `frontend/features/onboarding/data/datasources/onboarding.api.ts::submitStepDataApi` | Function `tenantId`; sent in URL and `X-Tenant-ID` | Auth session via axios interceptor | Client-side only | Sends POST with optional `Idempotency-Key` | Frontend can resend same call if network/client retry occurs | Sends same key only when caller provides it | `frontend/tests/onboarding/onboarding.api.test.ts` checks `Idempotency-Key` and `X-Tenant-ID` headers |
| Backend route | `app/api/v1/routers/onboarding_router.py::submit_step_data` | Path `tenant_id`; dependency also receives path tenant | `require_permission("tenant.update")` | Request-scoped DB session dependency | Calls service and builds response | Does not read `Idempotency-Key`; duplicate request reaches service | No same-response replay | No onboarding idempotency tests found |
| Application service | `app/application/services/onboarding_service.py::submit_step` | Route tenant passed from router | `user_context` dict | Shares request DB session via repositories | Calls step handlers and `_mark_step_completed` | Handlers may rerun; unknown steps still mark complete | No key lookup, payload hash check, or cached response | No service idempotency tests found |
| Domain logic | `_handle_clinic_profile`, `_handle_operating_hours`, `_handle_rooms`, etc. | Tenant passed to each handler | Not always used directly | Same request DB session | Updates tenant or delegates entity creation by step | Replaying may repeat updates or entity creation depending on handler | Domain-dependent, not request-idempotent | No request replay tests found |
| Repository | `SQLAlchemySetupProgressRepository` and tenant/entity repositories | Tenant columns and filters | Not a request concept | `flush()` inside repository; commit owned by request/session lifecycle or called by some services | Creates/updates `org_setup_progress` | Read-then-create on progress can race under concurrent duplicate inserts | Unique constraint can reject duplicate row but does not return cached response | No onboarding duplicate-concurrency tests found |
| Database | `org_setup_progress` | `tenant_id` column | None | Database transaction | Unique `(tenant_id, step_code)` row | Protects only the progress row, not all step side effects | Integrity failure path is not handled for idempotent replay | Migration defines unique constraint only |
| Response | `StepSubmissionResponse` | Echoes `step_code`; result has `tenant_id` | None | After service returns | Returns created entities, validation errors, status | Replayed responses are recomputed, not cached | No same-response guarantee | No replay tests found |

## 5. Duplicate and Replay Risk Analysis

| Scenario | Current Behavior | Risk |
|---|---|---|
| Rapid double tap | Frontend guards reduce duplicate dispatch in `SetupWizardFlow`; backend has no idempotency contract. | Medium. Frontend helps, but backend remains unsafe for non-wizard or retried requests. |
| Same request retried after timeout | Same `Idempotency-Key` may be sent, but backend ignores it. | High. Side effects may run again and response may differ. |
| Same key reused with different payload | Backend does not read the key or compare payload hash. | High. No conflict detection. |
| Concurrent duplicate requests | Both requests can enter service. Progress row unique constraint covers only `(tenant_id, step_code)` and no replay response. | High. Possible duplicate side effects or unhandled integrity errors. |
| Browser/app refresh | Status refetch reads `org_setup_progress`; no request replay semantics. | Medium. UI may recover status, but failed retry semantics are not guaranteed. |
| Multiple tabs/devices | Backend has no operation-key locking or processed-request storage. | High. Duplicate submissions can race. |
| Cross-tenant key reuse | No key is read, scoped, or stored. | High. Cannot enforce tenant-scoped key isolation. |
| Same tenant and key used for a different onboarding step | No key is read, scoped, or stored. | High. Cannot detect misuse or return conflict. |

Backend idempotency classification after recovery implementation:

```text
VERIFIED_IN_DEV
```

Implementation evidence:

- ADR: backend `docs/adr/ADR-PF-001-reusable-request-idempotency.md`, commit `c5082fb`.
- Platform foundation and migration: commit `f145dbf`.
- Onboarding integration and focused tests: commit `a2a818b`.
- Migration revision: `20260712_000001`.
- Focused tests: `12 passed` for `tests/test_platform_idempotency_service.py` and `tests/test_onboarding_idempotency_integration.py`.
- Full backend suite: `316 passed`.
- `git diff --check`: passed.
- `alembic heads`: `20260712_000001 (head)`.
- `alembic current`: blocked by missing local database `novaclinics_test`; no database was created or altered for this verification.

## 6. Idempotency Ownership Recommendation

Recommended owner:

```text
PLATFORM_FOUNDATION
```

Responsibility: provide reusable synchronous API idempotency for mutating endpoints that need safe retry/replay.

Ownership boundary: platform middleware/service owns header parsing, key validation, payload hash conflict detection, tenant/user/action scoping, locking or unique insertion, response persistence, and expiry. Feature services own operation naming and declare which endpoints require idempotency.

Consumers: onboarding step submission first; later payment-sensitive, provisioning, and other mutating APIs can adopt the same contract.

Minimum contract:

- require `Idempotency-Key` for opted-in operations;
- scope keys by tenant, authenticated user or org user, route/action, and step or operation identifier;
- store payload hash, response status, response body, error state, and expiry;
- return the original response for exact replay;
- reject same-key different-payload requests with conflict;
- serialize concurrent same-key requests or return an in-progress/conflict response;
- never share replay data across tenants.

Migration impact: new platform storage and endpoint integration are required. Onboarding should consume this once available rather than building a parallel "Super Onboarding Engine." If delivery pressure requires onboarding-first implementation, design it as the first platform consumer, not as an onboarding-only permanent mechanism.

Implementation status: completed in backend recovery branch as Platform Foundation, not as an onboarding-specific duplicate-request store. Onboarding step submission is the first consumer and remains legacy-compatible when `Idempotency-Key` is omitted. When the header is present, the backend validates non-empty keys, fingerprints tenant/step/request payload, scopes by route tenant, authenticated actor, onboarding step operation, and key, replays completed same-payload results, rejects same-key/different-payload conflicts, rejects concurrent in-progress duplicates, and allows same-key/same-payload retry after retryable operation failure.

## 7. Tenant Resolution Flow

| Area | Evidence | Classification |
|---|---|---|
| Authentication | `/auth/me` response model includes `tenant_id`; frontend `CurrentUserResponse` and `mapCurrentUserToDomain` map it to `tenantId`. | VERIFIED_IN_CODE |
| Person/session | `get_current_user` / Supabase provider extracts `app_metadata.tenant_id`; frontend `refreshSession` refreshes Supabase tokens and then refetches `/auth/me`. | VERIFIED_IN_CODE |
| Tenant selection | Frontend has `ownedClinics` helpers, but no end-to-end tenant switching verification was executed. | REQUIRES_STAGING |
| Tenant resolution | Onboarding URL uses function `tenantId`; backend route dependency resolves membership against path `tenant_id`. | VERIFIED_IN_CODE |
| Authorization | `require_permission("tenant.update")` uses `get_tenant_user_context`; non-members are rejected unless org-admin. Service also rejects non-org-admin when `user_context.tenant_id != tenant_id`. | VERIFIED_IN_CODE |
| Onboarding command | `submitStepDataApi` sends URL tenant, `X-Tenant-ID`, and optional `Idempotency-Key`; backend command uses path tenant. | VERIFIED_IN_CODE |
| Repository filtering | Progress and tenant/entity repositories query or write by `tenant_id`; `org_setup_progress` has tenant and step uniqueness. | VERIFIED_IN_CODE |
| Provisional/onboarding tenants | Provisioning syncs Supabase metadata and frontend refreshes session, but actual staging JWT behavior was not executed. | REQUIRES_STAGING |
| Active tenants | `/auth/me` and route membership code support active tenants, but staging validation was not executed. | REQUIRES_STAGING |
| `X-Tenant-ID` fallback | Frontend sends the header; backend onboarding route does not read it directly. | GAP |
| Multi-tenant membership | Code exposes owned clinic list helpers, but selected/effective tenant behavior was not verified end-to-end. | UNKNOWN |

## 8. Tenant Isolation Risks

| Risk | Current Mitigation | Residual Status |
|---|---|---|
| Route tenant differs from authenticated tenant | Backend membership lookup uses path tenant and service compares path tenant to `user_context.tenant_id` for non-org-admins. | VERIFIED_IN_CODE |
| `X-Tenant-ID` disagrees with route/JWT | Backend route does not consume `X-Tenant-ID`; header is not a verified fallback for onboarding. | GAP |
| Provisional tenant JWT missing `tenant_id` | Frontend refreshes token and sends fallback header, but backend route authorization still depends on path tenant membership. | REQUIRES_STAGING |
| Multiple clinics leak prior tenant cache/status | Query keys include tenant ID for onboarding status, but tenant switching behavior was not executed. | REQUIRES_STAGING |
| Expired or inactive tenant membership | `get_tenant_user_context` rejects inactive user or inactive tenant membership. | VERIFIED_IN_CODE |
| Org-admin cross-tenant setup | Explicit org-admin bypass exists for setup/configuration endpoints. | VERIFIED_IN_CODE, requires policy acceptance |

## 9. Staging Verification Checklist

1. New owner with provisional/onboarding clinic: complete registration, create onboarding tenant, refresh session, verify `/auth/me.tenant_id`, JWT `app_metadata.tenant_id`, and onboarding status access.
2. Existing active clinic: sign in, verify `/auth/me.tenant_id`, active status, and onboarding/dashboard route selection.
3. User with access to multiple clinics: verify owned clinic list, selected clinic, query key isolation, and no stale onboarding status after switching.
4. Tenant switching: switch from Tenant A to Tenant B and verify all onboarding status/submission calls use Tenant B.
5. Onboarding submission retry: after backend recovery branch is deployed to staging, submit the same step twice with the same `Idempotency-Key`; verify one side effect and same response.
6. Deliberate cross-tenant request: authenticate as Tenant A, call Tenant B route and/or header, verify rejection unless org-admin.
7. Expired or invalid tenant membership: deactivate membership, refresh token/session, verify onboarding route rejection.
8. `X-Tenant-ID` disagreement with authenticated context: send URL Tenant A with header Tenant B and verify backend behavior is explicit and documented.

No staging success is claimed by this document.

## 10. Tooling and Test Environment Findings

| Area | Command | Outcome | Classification |
|---|---|---|---|
| Frontend package root | `pwd`, `ls`, `cat package.json` in `frontend/` | Package root confirmed; scripts include `test` and `test:ci`; package manager metadata is Yarn 1. | PASS |
| Frontend dependencies | `test -d node_modules && echo "node_modules present" || echo "node_modules missing"` | `node_modules missing`. | MISSING_DEPENDENCY |
| Frontend lockfiles | `ls package-lock.json yarn.lock pnpm-lock.yaml` | `package-lock.json` and `yarn.lock` exist; `pnpm-lock.yaml` missing. | PASS_WITH_AMBIGUITY |
| Frontend tests | `npm test -- --runInBand` | Failed: `jest: command not found`. | MISSING_DEPENDENCY |
| Frontend typecheck | `npm run typecheck` | Failed: package has no `typecheck` script; npm log write also blocked under home npm logs. | ENVIRONMENT_FAILURE |
| Backend project root | `pwd`, `ls`, `find .. -maxdepth 2 ...` | `pyproject.toml`, `requirements.txt`, and `alembic.ini` confirmed. | PASS |
| Backend virtualenv | `python3 -m venv .venv-idempotency`; `.venv-idempotency/bin/pip install -r requirements.txt` | Isolated backend verification environment created in the backend recovery worktree; pinned requirements installed. | PASS |
| Backend focused tests | `DATABASE_URL=... REDIS_URL=... JWT_SECRET_KEY=... .venv-idempotency/bin/pytest -q tests/test_platform_idempotency_service.py tests/test_onboarding_idempotency_integration.py` | `12 passed`; covers first request, same-key/same-payload replay, same-key/different-payload conflict, concurrent duplicate protection, tenant/actor/operation/step isolation, failure retry behavior, missing-key compatibility, and cross-tenant rejection. | PASS |
| Backend full tests | `DATABASE_URL=... REDIS_URL=... JWT_SECRET_KEY=... .venv-idempotency/bin/pytest -q` | `316 passed`; warnings were pre-existing dependency/deprecation/coverage parse warnings. | PASS |
| Backend Alembic heads | `DATABASE_URL=... REDIS_URL=... JWT_SECRET_KEY=... .venv-idempotency/bin/alembic heads` | `20260712_000001 (head)`. | PASS |
| Backend Alembic current | `DATABASE_URL=... REDIS_URL=... JWT_SECRET_KEY=... .venv-idempotency/bin/alembic current` | Failed with `asyncpg.exceptions.InvalidCatalogNameError: database "novaclinics_test" does not exist`; no unknown shared database was created or altered. | ENVIRONMENT_BLOCKER |

Frontend dependencies were not installed in this documentation update. Frontend verification therefore remains blocked by the prior missing `node_modules` / `jest` environment state.

## 11. Recovery Checkpoint Impact

R3 is code-verified in dev after backend commits `c5082fb`, `f145dbf`, and `a2a818b`.

R4 remains partial because important tenant paths are code-verified, but staging still must verify provisional/onboarding tenants, active tenants, tenant switching, and `X-Tenant-ID` disagreement behavior.

R6 remains partial: backend focused and full tests now pass in an isolated virtualenv, but frontend test tooling is still unavailable and `alembic current` was not verified against a configured local database.

The checkpoint decision remains:

```text
Progressive Experience Recovery Checkpoint: NO-GO
```

## 12. Open Questions

1. Should platform idempotency be implemented as generic middleware, an application service/dependency, or endpoint-level decorator?
2. What retention period should processed request records use for onboarding step submission?
3. Should onboarding require `Idempotency-Key` for all mutating step submissions or accept it as optional during migration?
4. Should `X-Tenant-ID` be removed from onboarding clients once staging confirms JWT metadata reliability, or should the backend formalize it as a supported fallback?
5. What is the canonical tenant-selection UX for owners with multiple clinics?
6. Which package manager should be authoritative for the frontend worktree, given both `package-lock.json` and `yarn.lock` exist but `packageManager` names Yarn 1?

## 13. Final Verification Update - 2026-07-13

Database naming correction:

- Final idempotency table name: `tenant_idempotency_records`.
- Unique constraint: `uq_tenant_idempotency_scope_key`.
- Check constraint: `ck_tenant_idempotency_status`.
- Indexes: `idx_tenant_idempotency_lookup`, `idx_tenant_idempotency_expires_at`.
- Rationale: records are scoped by authoritative tenant, authenticated actor, operation, and idempotency key. The table therefore uses the required `tenant_` prefix while Platform Foundation remains the owning capability.
- Shared branch check: commit `a2a818b` was contained only in `origin/feature/progressive-experience-recovery`, not `test` or `dev`, so unpublished migration `20260712_000001` was updated directly.

Backend verification:

- `git diff --check`: PASS.
- Focused backend tests: `12 passed` for `tests/test_platform_idempotency_service.py` and `tests/test_onboarding_idempotency_integration.py`.
- Full backend suite: `316 passed, 18 warnings`.
- `alembic heads`: `20260712_000001 (head)`.
- Fresh local DB target confirmed as local PostgreSQL database `novaclinics_test`.
- Fresh `alembic upgrade head`: still BLOCKED in historical revision `1d51109d8e2d_add_staff_bank_details_table.py`, now at absent `tenant_inventory_batches` after targeted guards for absent `tenant_appointment_rules` and `tenant_inventory_alerts`.
- `alembic current`: not verified at head because the fresh upgrade did not reach `20260712_000001`.

Frontend verification:

- Package root: `frontend/`.
- Package manager: `yarn@1.22.22`.
- `yarn install --frozen-lockfile`: PASS.
- `git diff --check`: PASS.
- `yarn test --runInBand`: FAIL, with unrelated existing dashboard/staff/therapist failures plus onboarding failures in `StepCard` opacity expectation and `wizard.store` AsyncStorage mock setup.
- Focused onboarding tests: `8 passed, 2 failed` suites; `64 passed, 1 failed` tests before Jest open-handle hang was stopped.
- TypeScript: `./node_modules/.bin/tsc --noEmit` FAILS with existing app-wide type errors, including onboarding demo-status and payment setup errors.

Localization:

- Hindi Progressive Experience localization is complete in `hi-IN.json`.
- Key parity check: `hi progressive keys 77`, `en progressive keys 77`, `missing []`, `extra []`.
- Interpolation variables `{{completed}}`, `{{total}}`, and `{{durationDays}}` were preserved.

Checkpoint impact:

```text
Progressive Experience Recovery Checkpoint: NO-GO
```

Remaining blockers are the unresolved fresh database migration chain, failing frontend focused/full verification, failing TypeScript verification, and staging-only tenant/replay checks that remain `NOT_EXECUTED`.
