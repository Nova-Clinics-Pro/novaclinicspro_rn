# E6 Implementation Readiness — Draft Conflict and Multi-Clinic Recovery

## 1. Decision

**IMPLEMENTATION AUTHORIZED**

The constitutional contract is complete and current source supplies the required
tenant authority, progress persistence, query, draft, idempotency, audit, Theme,
localization, and accessibility foundations. The missing revision, conflict, and
presentation behavior can be added within those owners. No unresolved product or
architecture decision blocks implementation.

## 2. Epic Scope

E6 prevents stale device-local drafts from silently overwriting newer server
state or crossing organization/clinic boundaries. It covers Requirements 9, 11,
16, 17, and 29–32 under the E6 product and design contracts.

The implementation outcome is backend-authoritative per-step revision and UTC
timestamp evidence; guarded step submission; deterministic Use Latest/Keep
Local recovery; completed/retired/hidden draft cleanup; multi-device convergence;
effective-tenant isolation; safe audit outcomes; and accessible, localized,
Theme-compliant presentation.

E6 excludes E7 offline mutation queues, field-level merging, peer-to-peer draft
synchronization, cross-tenant transfer, commercial lifecycle work, Doctor Module,
Clinical Workspace, scheduling, inventory implementation, billing/payment
implementation, and any general synchronization or action engine.

## 3. Source Reuse Audit

### Backend

| Classification | Existing owner | E6 treatment |
|---|---|---|
| `EXTEND` | `app/infrastructure/db/models/org_setup_progress.py` | Retain tenant/step uniqueness, status, metadata, and `updated_at`; add the persisted numeric revision. |
| `EXTEND` | `app/domain/repositories/i_setup_progress_repository.py` and `SQLAlchemySetupProgressRepository` in `app/infrastructure/repositories/sqlalchemy_repositories.py` | Preserve the repository family; add revision projection and concurrency-safe conditional update/locking primitives. |
| `EXTEND` | `app/application/services/onboarding_service.py` | Preserve status and step orchestration; expose authoritative evidence and delegate conflict validation without adding router business rules. |
| `EXTEND` | `app/api/v1/schemas/onboarding.py` | Add optional additive read fields, expected-revision input, and safe typed conflict output. |
| `EXTEND` | `app/api/v1/routers/onboarding_router.py` | Reuse the status/step routes, permission dependency, idempotency, and response mapping. No new route family. |
| `REUSE` | `app/application/onboarding/journey_visibility_query_service.py` and TG21 projection values | Bind step evidence to the accepted template/capability projection identity and stable step code. Do not redefine visibility. |
| `REUSE` | `AuthenticatedOrganizationContextService`, organization membership/tenant association repositories, and Effective Tenant selection | Validate actor, organization, active association, requested tenant, and session freshness. |
| `REUSE` | `require_permission("tenant.update")` and existing tenant read authorization | Reads remain membership/effective-tenant scoped; mutation remains permission protected. |
| `EXTEND` | Active `SQLAlchemyUnitOfWork` composition from `get_uow` | Register the existing setup-progress repository and ensure progress, audit, and step mutation share caller-owned commit/rollback. Do not add another UoW. |
| `REUSE` | `OrganizationAuditLog` and `OrganizationAuditRepository` | Append safe conflict/recovery outcomes transactionally; never persist draft content. |
| `REUSE` | `PlatformIdempotencyService` on step submission | Preserve organization/tenant/actor/step request replay protection; expected revision participates in the fingerprint. |
| `CREATE` | One additive Alembic revision after current head | Add only the progress revision column/constraint described in Section 6. |
| `OUT OF SCOPE` | `DraftService` server draft payloads | E6 does not create a second draft authority or synchronize device-local draft content to this service. |

### Frontend

| Classification | Existing owner | E6 treatment |
|---|---|---|
| `EXTEND` | `frontend/features/onboarding/presentation/stores/wizard.store.ts` | Upgrade the persisted DraftEntry schema with server base revision and TG21 projection identity while preserving data, timestamps, expiry, compression, and scoped keys. |
| `EXTEND` | `frontend/features/onboarding/data/models/onboarding.dtos.ts` | Add optional revision/timestamp fields, expected-revision input, and typed conflict DTOs. |
| `EXTEND` | `frontend/features/onboarding/domain/entities/onboarding-status.entity.ts` | Validate/map immutable server evidence; reject malformed evidence rather than synthesize it. |
| `EXTEND` | `frontend/features/onboarding/data/datasources/onboarding.api.ts` | Reuse the existing API client; send expected revision, normalize typed errors, and preserve the Req 11 fallback until separately verified removable. |
| `EXTEND` | `frontend/features/onboarding/data/repositories/onboarding.repository.impl.ts` | Reuse `onboardingKeys.status(tenantId)`, current hooks, scoped invalidation, idempotency input, and stale-response handling. No second repository/query-key family. |
| `REUSE` | `useJourneyFoundation.ts` | Reuse Effective Tenant, TG21 projection, parallel status/projection refresh, cache cleanup, and revalidation. |
| `CREATE` | E6 conflict/recovery domain value and presentation hook under existing onboarding domain/presentation layers | Own pure comparison eligibility and orchestration without placing business rules in the screen or store. |
| `EXTEND` | `SetupWizardFlow.tsx` | Trigger recovery after hydration plus fresh status/projection, delegate decisions, suppress duplicate actions, and preserve existing lifecycle/refetch behavior. |
| `CREATE` | Onboarding-specific `DraftConflictModal` | Required because shared `ConfirmationDialog` contains hardcoded strings/styles and lacks E6 two-consequence/focus semantics; reuse React Native Modal and central Theme patterns, not the non-compliant component as-is. |
| `REUSE` | Existing progress-updated inline notice in `SetupWizardFlow.tsx` | Extend only where it can safely explain refreshed/non-conflicting state. |
| `REUSE` | `useClinicEntryOrchestration.ts`, `clearWizardDraftStorageForIdentity`, auth store, and onboarding cache cleanup | Preserve outgoing-scope cancellation, draft cleanup, session refresh, effective-tenant validation, and stale-response rejection. |
| `REUSE` | `en-US.json`, `hi-IN.json`, `useTranslation`, `useClinicTheme`, existing icon system | Add parity-checked E6 strings and use only established tokens. |
| `OUT OF SCOPE` | Pending mutation/offline store | E7 owns durable queued mutation recovery. |

Nothing authorizes a duplicate store, datasource, repository, tenant authority,
audit system, idempotency system, or generic modal framework.

## 4. Engineering Truth Inventory

### Verified facts

- `org_setup_progress` has a unique `(tenant_id, step_code)`, authoritative
  status/metadata, and non-null timezone-aware `updated_at`; it has no revision.
- `SQLAlchemySetupProgressRepository` already reads and flushes progress through
  the request session, but has no conditional update/lock contract.
- the current status service emits status/validation values but omits per-step
  `updated_at`, revision, and TG21 projection identity; `not_started` steps have
  no progress row;
- `StepValidationStatus`, `StepSubmissionRequest`, and their frontend DTO/domain
  counterparts contain no revision/timestamp evidence;
- the step route already uses `tenant.update` and Platform Idempotency, while the
  current onboarding dependency uses a raw session rather than the active UoW;
- the active database provider commits the request session and rolls back on an
  exception; the active SQLAlchemy UoW and organization audit repository already
  provide the stronger composition needed by E6;
- Wizard Draft schema v1 persists `{data, createdAt, lastSavedAt}` under
  tenant+user or user fallback keys, with migration, compression, corruption
  handling, per-step expiry, and explicit identity cleanup;
- the draft has no organization ID, TG21 projection identity, or server base
  revision;
- `SetupWizardFlow` hydrates on mount/foreground, refetches status plus TG21
  projection, detects visible-step signature changes, and has no conflict state;
- step screens clear drafts after successful saves, but there is no centralized
  completed/retired/hidden cleanup after a fresh server response;
- Clinic Entry handoff cancels queries, clears an outgoing clinic/user draft,
  refreshes session/context, verifies Effective Tenant, and then switches;
- organization-scoped append-only audit and safe metadata already exist;
- a database migration is required for a durable monotonic progress revision.

### Accepted design consequences

- server revision, not device time, is the overwrite/concurrency authority;
- local `lastSavedAt` remains display/expiry evidence only;
- Keep Local preserves editing but every submission revalidates the server
  revision; Use Latest clears only the matching scoped draft;
- completed, retired, hidden, or unauthorized state cannot be overridden;
- missing/legacy evidence preserves the draft and blocks E6 submission until a
  fresh supported snapshot is available;
- no cross-tenant response, cache, draft, audit, or mutation is accepted.

### Engineering-owned detail

Engineering may choose internal token encoding, locking statement, helper names,
and file decomposition within the owners above. Those choices must keep the
transport revision opaque, atomically update revision/status/timestamp, preserve
backward compatibility, and satisfy the tests below.

## 5. Implementation Boundary

### Backend authority

E6 will extend progress persistence with a monotonic numeric revision. The read
projection will expose an opaque step revision, UTC timestamp, and TG21 projection
identity for every visible step. For a step with no row, the backend supplies the
defined baseline revision bound to stable step code and current projection; the
client never constructs it.

Step submission will accept the last observed opaque revision. Within one UoW it
will revalidate Effective Tenant/organization/permission, lock or conditionally
compare progress, apply the existing step mutation, increment revision and
timestamp atomically, append safe organization audit evidence, then commit. A
stale/missing/cross-scope revision produces a stable typed conflict and no partial
write. Idempotent replay of an identical accepted request remains supported.

### Frontend data and domain

The frontend will validate/map revision, timestamp, and projection identity;
represent current, conflict, unavailable, completed/ineligible, and resolved
outcomes immutably; store the revision/projection on which each draft was based;
and normalize safe typed conflict failures. The current datasource, repository,
query keys, and TG21/Effective Tenant hooks remain authoritative.

### Frontend application and presentation

After hydration plus fresh scoped status/projection, orchestration will remove
drafts for completed/retired/hidden steps, restore matching drafts, or surface a
single editable conflict. Use Latest clears/syncs the matching draft and renders
server state. Keep Local retains it for editing with the new base evidence; a
later save passes that evidence and can conflict again. Missing evidence blocks
submission and offers refresh without deleting the draft.

Tenant switch/logout will preserve the existing cancel-clean-refresh-validate
order. The modal will prevent duplicate decisions, preserve focus order and
return, announce dialog/loading/disabled states, scale text, meet touch targets,
use central Theme/icons only, and have English/Hindi placeholder parity.

### Explicit exclusions

No generic offline queue, arbitrary merge editor, automatic field merge,
cross-tenant transfer, client-generated authoritative revision, second draft
store, second repository/API client, onboarding monolith, commercial lifecycle,
Doctor Module, Clinical Workspace, scheduling, inventory, billing, or payment
implementation is authorized.

## 6. Data and Compatibility Decision

**One additive database migration is authorized.** It extends
`org_setup_progress` with `revision BIGINT NOT NULL DEFAULT 1` plus a positive
revision constraint. Existing rows receive the safe baseline revision `1`; no
draft, status, timestamp, or clinical/business value is fabricated. New persisted
rows begin at `1`; an unpersisted visible step uses a backend-defined baseline
token bound to TG21 projection identity until its first authoritative mutation.

The read response adds optional `revision`, `updated_at`, and projection identity
fields. Step submission adds optional expected-revision input during rollout.
Existing clients continue to parse responses. E6 remains disabled until the
updated frontend is present; when enabled, missing expected revision fails closed
with a typed precondition/conflict response. This compatibility phase is not
permission for the E6 UI to silently overwrite.

Wizard Draft storage advances independently from v1 to v2 and migrates valid v1
draft data/timestamps while marking server base evidence unavailable. Such drafts
are preserved and require a fresh server snapshot before submission.

Downgrade first disables E6 enforcement and rolls back the frontend, then removes
the additive revision constraint/column. Existing status/data remain intact.
Audit rows remain append-only. No bulk progress-row or draft-content backfill is
authorized.

## 7. Implementation Sequence

### TG23.1 — Backend Per-Step Revision Foundation

- **Objective:** Add revision persistence, domain/typed errors, repository
  projection and concurrency-safe compare/update primitives, and status evidence.
- **Likely owners:** progress model/migration; setup-progress repository port and
  adapter; onboarding schemas/status application mapping; active UoW registration.
- **Dependencies:** current Alembic head, TG21 projection identity, existing
  `updated_at` and tenant/step uniqueness.
- **Tests:** migration upgrade/downgrade/re-upgrade; historical/new/absent rows;
  revision increment; concurrent compare; timestamp/revision atomicity; response
  compatibility; tenant isolation.
- **Stop:** stop if the migration graph is not single-head/current, authoritative
  evidence cannot be produced for every visible step, or compare/update cannot be
  atomic without changing the accepted E6 contract.
- **Completion evidence:** focused PostgreSQL/domain/repository/status tests,
  Ruff, compileall, Alembic checks, reviewed backend commit and push.

### TG23.2 — Backend Conflict-Aware Submission and Transport

- **Objective:** Compose Effective Tenant, permission, expected revision,
  idempotency, existing step mutation, audit, typed conflict, and rollback through
  the active UoW.
- **Likely owners:** onboarding service/factory/dependency, step transport/schema,
  existing setup-progress/idempotency/audit repositories.
- **Dependencies:** TG23.1.
- **Tests:** accepted/stale/missing/cross-projection revision; concurrent update;
  organization/tenant/permission denial; idempotent replay/conflict; safe 409/typed
  failures; audit success/failure; protected-operation rollback.
- **Stop:** stop if a router must own business rules, a second mutation path is
  required, or any existing step handler commits outside the composed transaction.
- **Completion evidence:** focused service/transport/PostgreSQL tests, TG19/TG21/
  TG22 regressions, Ruff, compileall, reviewed backend commit and push.

### TG23.3 — Frontend Revision and Conflict Data/Domain Integration

- **Objective:** Add DTO/domain/error mapping, draft schema v2, base revision and
  projection binding, repository input, scoped cleanup, and pure recovery rules.
- **Likely owners:** onboarding DTO/entity/datasource/repository; wizard store;
  E6 domain values/use case; `useJourneyFoundation` only where extension is needed.
- **Dependencies:** TG23.2 transport contract.
- **Tests:** DTO validation, v1→v2 migration, missing/malformed evidence, no
  conflict/conflict/ineligible cases, stale response, tenant/user/projection
  isolation, expiry and existing draft regressions.
- **Stop:** stop if frontend must invent authority, duplicate queries/stores, or
  calculate backend revision.
- **Completion evidence:** focused Jest, scoped ESLint/TypeScript, localization
  parity check, reviewed frontend commit and push.

### TG23.4 — Frontend Conflict and Recovery Presentation

- **Objective:** Integrate recovery orchestration, DraftConflictModal, Use Latest,
  Keep Local, unavailable refresh, automatic ineligible cleanup, and tenant switch.
- **Likely owners:** E6 presentation hook/modal, `SetupWizardFlow`, existing inline
  notice, both locale catalogs, central Theme/accessibility patterns.
- **Dependencies:** TG23.3.
- **Tests:** all frontend scenarios in Section 8, duplicate decision protection,
  focus/screen-reader/touch/font behavior, Hindi parity, Theme, TG13–TG22 regressions.
- **Stop:** stop if an action lacks an existing owner, draft deletion precedes a
  confirmed safe outcome, or cross-scope data can render.
- **Completion evidence:** focused and regression Jest, scoped ESLint/TypeScript,
  reviewed frontend commit and push.

### TG23.5 — Final E6 Verification and Acceptance

- **Objective:** Verify the whole accepted E6 contract; fix only verified E6
  defects and update RTM/task evidence.
- **Dependencies:** TG23.1–TG23.4 synchronized.
- **Tests:** complete backend/frontend matrix, isolated PostgreSQL migration and
  concurrency verification, static checks, Req 32 manual/staging subset, rollback
  rehearsal, tenant-isolation and no-data-loss evidence.
- **Stop:** E6 is not accepted with any unverified stale-write, missing-evidence,
  multi-device, tenant-switch, localization, accessibility, audit, rollback, or
  migration gate.
- **Completion evidence:** final acceptance record, evidence-based RTM/task status,
  clean synchronized worktrees.

## 8. Test Strategy

Backend focused coverage includes historical/new/absent revision creation;
monotonic update; deterministic opaque token; stale/missing/malformed revision;
tenant and organization mismatch; authorization; simultaneous submissions;
idempotency; audit contents; audit/protected-write rollback; migration upgrade,
current, downgrade and re-upgrade; and existing-client response compatibility.

Frontend focused coverage includes no-conflict resume; Use Latest; Keep Local and
repeat conflict; missing revision; stale query response; completed, retired,
hidden and new step handling; Device A/Device B propagation; tenant switch;
logout/login; cross-tenant rejection; duplicate action prevention; v1 draft
migration; expiry; English/Hindi key and placeholder parity; focus, dialog/live/
disabled semantics, touch targets and font scaling; and Theme-only styling.

Regressions include TG13–TG15 draft/lifecycle suites, TG18 journey identity/version,
TG19 Effective Tenant/isolation, TG21 projection/snapshot, TG22 readiness, current
onboarding status/repository/API, and SetupWizardFlow tests.

Requirement 32 still requires recorded device/emulator and staging verification,
including slow/intermittent connectivity and tenant switching. Automated
checkpoint completion does not substitute for that final manual release evidence.

## 9. Rollback and Release Safety

- Deploy additive backend read fields before enabling the frontend; retain legacy
  parsing and keep E6 enforcement behind a rollout gate until both sides support it.
- Disable enforcement and revert frontend presentation before database downgrade.
- Legacy/missing revisions always preserve drafts and block overwrite; rollback
  never auto-submits or deletes an unresolved editable draft.
- Downgrade removes only the new revision column/constraint; status, timestamps,
  drafts, organization audit, and accepted onboarding data remain intact.
- Tenant-isolation and stale-response tests are release gates in both directions.
- Audit records are append-only and retain only safe identifiers/outcomes.

## 10. Implementation Authorization

- **Authorized task:** TG23 — Draft Conflict and Multi-Clinic Recovery.
- **First checkpoint:** TG23.1 — Backend Per-Step Revision Foundation.
- **Prerequisites satisfied:** E6 roadmap ownership, constitutional requirements,
  constitutional design, source reuse audit, migration/compatibility decision,
  test/rollback strategy, bounded task sequence, RTM and task authorization.
- **Blockers remaining:** none.
- **Authority:** implementation may begin only with TG23.1 and must stop after its
  verification/commit/push. Later checkpoints require separate execution prompts.

**E6 IMPLEMENTATION AUTHORIZED**
