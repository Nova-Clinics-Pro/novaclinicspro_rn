# E2 Implementation Boundary

Date: 2026-07-20

Status: Frozen phased boundary; Platform Foundation implementation authorized

This boundary is governed by ADR-PF-002 through ADR-PF-006 and
`E2-PLATFORM-FOUNDATION-BOUNDARY.md`. It separates the prerequisite Platform
Foundation from Clinic Entry operations and frontend orchestration. No phase
authorizes TG20 or permits a later phase to redefine an earlier contract.

## Frontend Responsibilities

- Present the two approved entry paths, approved fields, validation, status,
  errors, retries, and navigation with central Theme and icons.
- Localize every user-visible string in `en-US` and `hi-IN` with compatible
  interpolation.
- Use accessible labels/hints, minimum target sizes, logical focus order,
  first-invalid focus, live-region status, non-color meaning, and disabled/
  pending duplicate-submit protection.
- Map presentation input to typed repository commands; never call APIs directly.
- Apply the draft allowlist, refresh the existing auth session after an
  authoritative result, validate the effective tenant, cancel/isolate stale
  queries, clear old drafts, and navigate to the TG20 boundary.

## Backend Responsibilities

- Authenticate and authorize the actor against an authoritative destination
  organization and tenant relationship.
- Validate ownership evidence, DTOs, normalization, duplicates, association,
  idempotency, tenant isolation, and typed errors.
- Reuse provisioning, membership/RBAC, metadata sync, audit, and platform
  idempotency behavior.
- Return only `ClinicEntryResultV1`; refreshable auth data must reflect the new
  authorized clinic without leaking unrelated tenants.

## Exact Frontend Files Allowed to Change

Existing files:

- `frontend/features/onboarding/presentation/pages/ChoiceScreen.tsx`
- `frontend/features/onboarding/presentation/pages/steps/ClinicProfileScreen.tsx`
- `frontend/features/onboarding/domain/repositories/onboarding.repository.ts`
- `frontend/features/onboarding/data/repositories/onboarding.repository.impl.ts`
- the existing onboarding remote datasource interface and implementation files
  resolved in that feature (no second datasource)
- the existing onboarding DTO/entity mapper files resolved in that feature
- `frontend/features/onboarding/presentation/stores/wizard.store.ts`
- `frontend/features/auth/presentation/providers/auth.store.ts`
- `frontend/features/auth/presentation/hooks/useAuth.ts`
- `frontend/core/localization/errorTokens.ts`
- `frontend/core/localization/translations/en-US.json`
- `frontend/core/localization/translations/hi-IN.json`
- existing E2-focused test files adjacent to these modules

New files, only if the repository has no equivalent after a fresh reuse check:

- one E2 domain contract/mapping module under
  `frontend/features/onboarding/domain/`
- one E2 orchestration hook under
  `frontend/features/onboarding/presentation/hooks/`
- focused E2 test files mirroring the allowed modules

No new store, repository, API client, theme, navigation system, or generic error
platform is allowed.

## Exact Backend Files Allowed to Change

Existing files:

- `app/application/onboarding/tenant_provisioning_service.py`
- `app/application/platform/idempotency_service.py`
- `app/infrastructure/repositories/platform_idempotency_repository.py`
- `app/infrastructure/db/models/platform_idempotency_record.py`
- `app/api/v1/schemas/error_response.py`
- `app/api/v1/routers/auth_router.py` and its existing auth response schema
- existing tenant/user repository interfaces and SQLAlchemy implementations,
  only for organization-scoped lookup/association and normalized duplicate lookup
- existing audit repository/model and event definitions, only for E2 events
- dependency wiring/router registration files strictly required to expose the
  approved E2 application operation
- focused tests for the above modules

New files, because no compatible contract exists:

- `app/domain/dto/clinic_entry.py`
- `app/domain/services/i_clinic_entry_service.py`
- `app/application/onboarding/clinic_entry_service.py`
- `app/domain/clinic_identity.py`
- `app/api/v1/schemas/clinic_entry.py`
- `app/api/v1/routers/clinic_entry_router.py`
- one migration for organization association/normalized identity and pre-tenant
  idempotency scope, but only after the two readiness blockers are approved and
  only if the accepted existing schema cannot enforce them
- focused unit/contract/integration tests matching these files

File names are fixed for the proposed boundary; implementation must first verify
they do not collide with a later repository descendant. If an equivalent exists,
extend it and update this boundary before code rather than duplicate it.

## Files and Areas Prohibited from Changing

- Requirements, design, Phase 2 roadmap, tasks, E1/TG18 contracts, and unrelated
  documentation (except a completion note in TG19 readiness after implementation).
- TG18 journey domain, Journey Cards, projection, progress, or tests except a
  focused handoff assertion requiring no semantic change.
- Doctor Module, Clinical Workspace, scheduling, inventory, billing, payment,
  clinical records, R7, main worktrees, `dev`, and `test` branches.
- Existing global org-admin tenant behavior, demo/provisional lifecycle semantics,
  authentication provider replacement, architecture rewrites, and external
  integrations.

## Migration Determination

Repository evidence shows no destination-organization association or normalized
identity constraint, and platform idempotency requires `tenant_id`. A migration
is therefore genuinely expected if the approved organization model is persisted
in this service. It must add, not reinterpret, Version 1 organization association,
`clinic_identity_v1` uniqueness within organization, and a valid pre-tenant
idempotency scope. No migration may be designed until the authoritative
organization aggregate and verification owner are approved. If that authority
is provided by another existing service, use its contract and omit the local
migration.

## Exact Focused Test Matrix

| Layer | Required cases |
|---|---|
| Domain unit | NFKC/whitespace/case normalization; address/phone/email/canonical-key rules; stable hash; optional-field exclusion; additive unknown optional field. |
| Repository unit | DTO mapping; typed errors; no raw message display; draft positive allowlist; prohibited-field omission; logout/tenant-switch/success cleanup. |
| Frontend presentation | both paths; validation and first-invalid focus; pending double-submit; retry phase; screen-reader labels/live status; single auto and multiple explicit selection; specialty-neutral rendering. |
| Contract | create/associate request and `ClinicEntryResultV1`; every stable error code; same-key replay equality; different-payload conflict; session-refresh-required result. |
| Backend integration | atomic create+association; provisioning reuse; already-associated replay; expired verification; transient retry; refresh data contains authorized clinic; workspace handoff only after effective tenant validation. |
| Tenant isolation | duplicate lookup scoped to destination organization; unauthorized/cross-org responses disclose no existence; stale cache/draft suppression; actor cannot select an unauthorized tenant. |
| Idempotency | concurrent same request creates once; completed replay returns identical authoritative result; conflict on fingerprint change; retry after retryable failure; audit side effects occur once. |
| Localization | all new keys exist in both catalogs; interpolation names match; raw backend text absent; long Hindi copy does not change semantics. |
| Accessibility | labels/hints/roles; focus order; first error focus; live-region loading/error/success; non-color states; touch targets; screen-reader path consequence. |
| Multi-clinic | zero/one/many authorized clinics; stale persisted selection; explicit selection for many; switch cancels/isolate requests and clears draft; no clinic-type assumptions. |

Focused TypeScript and Python checks for touched modules plus `git diff --check`
are mandatory. Full unrelated suites are outside the checkpoint unless a shared
contract change warrants them.

## Bounded Implementation Checkpoints

The checkpoint sequence below supersedes the historical five-step proposal in
this section wherever names or ordering conflict.

1. **PF checkpoint — Platform Foundation:** implement only the persistence,
   ports/adapters, organization authorization, ownership-verification lifecycle,
   organization-scoped idempotency, organization audit, migration, and
   transaction-safe provisioning seam authorized by
   `E2-PLATFORM-FOUNDATION-BOUNDARY.md`. No Clinic Entry API or frontend work.
2. **Backend Clinic Entry operations:** after the PF checkpoint passes, implement
   `clinic_entry_service.py`, transport schemas/router, dependency wiring,
   typed mapping, create/associate orchestration, effective-tenant result, and
   focused contract/integration/isolation tests. It consumes rather than
   recreates the Platform Foundation.
3. **Frontend Clinic Entry orchestration:** after backend transport is committed
   and source-confirmed, extend the existing onboarding repository/datasource,
   typed mapping, error tokens, draft allowlist/cleanup, auth refresh, effective
   tenant validation, retry lifecycle, and focused tests. No new repository,
   store, API client, or product behavior.
4. **Final TG19 acceptance:** run focused cross-layer, localization,
   accessibility, tenant-isolation, idempotency, multi-clinic, migration, and
   staging evidence checks; update completion evidence only. No TG20 work.

### Manual contact-verification transport prerequisite

ADR-PF-010 closes the Version 1 provider/method decision with the bounded
`manual_platform_authority_v1` contract. Before frontend Clinic Entry
orchestration resumes, implement only the transport authorized by
`E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md`: organization-authorized
request/status, independent platform-authority review decisions, explicit
non-bypassable permission, typed schemas/errors, audit/idempotency composition,
and focused tests. No provider integration, public callback, migration, Clinic
Entry mutation change, frontend source, final acceptance, or TG20 is authorized.

### Final Platform Foundation phase

ADR-PF-011 through ADR-PF-013 and
`TG19-FINAL-PLATFORM-FOUNDATION-IMPLEMENTATION-PLAN.md` govern the remaining
authenticated-context, effective-selection, manual-capability/contact
transport, ownership-target/transport, and cross-foundation verification work.
That five-checkpoint phase must complete before Frontend Clinic Entry
orchestration begins. It changes neither roadmap sequencing nor E2 product
scope.

### Freeze rule

Each phase may change only files named by this document or the Platform
Foundation boundary. An equivalent discovered in a later descendant must be
extended rather than duplicated. A genuinely necessary unnamed file requires a
reviewed boundary revision before code. Task checkpoints consume this boundary;
they do not redefine it.

### Historical checkpoint proposal

The following list is retained only as historical planning evidence and is not
the implementation sequence:

1. **Checkpoint 1 — Backend constitutional foundation:** only after blockers
   close, add organization/verification ports, Version 1 normalization/DTO/error
   types, repository constraints/migration, and unit/contract tests. No UI.
2. **Checkpoint 2 — Backend operations:** create/associate orchestration using
   provisioning/idempotency/audit, auth clinic refresh projection, integration,
   isolation, and concurrency tests. No presentation expansion.
3. **Checkpoint 3 — Frontend data/application boundary:** typed repository/
   datasource mapping, error tokens, draft allowlist/cleanup, auth refresh and
   effective-tenant validation tests. No unrelated onboarding screens.
4. **Checkpoint 4 — Entry presentation:** approved path/form integration,
   localization, accessibility, loading/recovery, navigation handoff, and focused
   presentation/multi-clinic tests.
5. **Checkpoint 5 — Verification only:** cross-layer focused regression and
   documentation evidence. No TG20 implementation.

Every checkpoint begins with reuse verification and stops on an undocumented
dependency. Task Groups consume this boundary; they cannot redefine it.

## Readiness Gate

Implementation remains prohibited until the authoritative organization
identity/role model and the ownership-verification method/owner are approved and
recorded. Those decisions may alter the proposed backend file/migration boundary;
the readiness document must then be re-evaluated before code.

## ADR-PF-007 Identity Persistence Prerequisite

Before the Backend Clinic Entry operations checkpoint, implement the bounded
identity-persistence addendum in `E2-PLATFORM-FOUNDATION-BOUNDARY.md`.

The checkpoint may change only the existing organization–tenant model, its
domain port and SQLAlchemy adapter, one additive migration from the current
merged head, required registration, and focused tests. It must persist
`clinic_identity_v1` version/fingerprint on the active association and enforce
database uniqueness within organization scope. Legacy rows remain null and
valid; no backfill is authorized.

After its migration and concurrency tests pass, the Backend Clinic Entry
operations checkpoint may consume the repository extension and map only its
named uniqueness conflict to `clinic_entry.duplicate`. Frontend orchestration
remains sequenced after the backend transport commit.

## ADR-PF-008 Verified Contact Persistence Prerequisite

Before the Backend Clinic Entry operations checkpoint resumes, implement the
exact verified-contact addendum in `E2-PLATFORM-FOUNDATION-BOUNDARY.md`.

The checkpoint is limited to the existing tenant model/repository mapping,
Clinic Entry contact DTO/normalization, transaction-safe provisioning mapping,
one additive migration, and focused tests. It must support email-only,
mobile-only, and dual-contact creation, enforce one verified method, persist safe
provenance and explicit primary semantics, preserve legacy rows, and prohibit
actor-email copying or placeholder generation.

After implementation and migration verification pass, the Backend Clinic Entry
service/transport checkpoint may resume. Frontend orchestration remains blocked
until that later transport commit.

## ADR-PF-009 Contact Evidence Prerequisite

The Backend Clinic Entry operations checkpoint may not begin until
`E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md` is implemented and
verified. That prerequisite owns the separate `org_contact_verifications`
model/migration, repository port/adapter, Platform Clinic Contact Verification
lifecycle service, trusted provider port, typed evidence errors, organization
audit/idempotency integration, unit-of-work registration, and focused tests.

Clinic Entry transport must accept opaque evidence references and consume only
server-resolved verification results. It must never expose the ADR-PF-008
provenance DTO as client-asserted verification truth. No Clinic Entry source is
authorized during the evidence prerequisite.
