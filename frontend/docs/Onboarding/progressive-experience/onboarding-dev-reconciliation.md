# Onboarding Dev Reconciliation

Date: 2026-07-11

## 1. Executive Summary

The onboarding specification set in `frontend/.kiro/specs/onboarding-production-hardening` currently contains `requirements.md`, `design.md`, `tasks.md`, and `.config.kiro`. Requested companion artifacts such as ADRs, ownership map, current behavior inventory, migration fixtures, gap analysis, target architecture, Progressive Experience Canvas, phase completion records, recovery notes, and engineering-debt records were not present in this directory.

Frontend `origin/dev` contains the core Progressive Experience production-hardening checkpoint implementation: shared service-catalogue aliases, StepDetail and SetupWizard alias routing, removal of the dead TreatmentsAndTherapies screen, duplicate submission locking, `Idempotency-Key` forwarding, submit-then-refetch-before-advance ordering, onboarding query invalidation, Android back interception, and focused tests.

Backend `origin/dev` contains general onboarding/status/subscription APIs. Backend onboarding idempotency could not be verified from the audited `origin/dev` code and requires explicit confirmation or implementation. Tenant resolution is partially present through `/auth/me` returning `tenant_id` when available, but staging verification remains pending.

Next onboarding implementation should not start until the unresolved validation items are closed: backend idempotency confirmation, tenant resolution staging confirmation, Hindi localization completion, and a clean branch strategy reset. The current frontend remote `feature/progressive-experience-phase-1` is stale and contains broad unrelated Doctor/clinical changes relative to `origin/dev`; it must not be used as the onboarding recovery baseline.

## 2. Repository and Branch Baselines

### Frontend

| Field | Value |
|---|---|
| Absolute path | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro_rn` |
| Current branch | `dev` |
| Current HEAD / `origin/dev` | `45c13b04 Merge branch 'test' into dev` |
| Working tree status | Clean: `## dev...origin/dev` |
| Remote URL | `origin https://github.com/ayurparishkarkendra/novaclinicspro_rn.git` |
| Local branches | `dev`, `main`, `merge-progressive-phase0-into-test`, `test` |
| Remote branches | `origin/main`, `origin/dev`, `origin/test`, `origin/feature/progressive-experience-phase-1` |
| `main` exists | Yes, local and remote |
| `dev` exists | Yes, local and remote |
| `test` exists | Yes, local and remote |
| Onboarding feature branch exists | Remote only: `origin/feature/progressive-experience-phase-1` |
| `git diff --stat origin/dev` | Empty |

Note: `frontend/.kiro/` is ignored by `.gitignore` and is now treated as an agent/spec workspace mirror. The canonical tracked documentation path is `frontend/docs/Onboarding/progressive-experience/`.

### Backend

| Field | Value |
|---|---|
| Absolute path | `/Users/ayurparishkar/Projects/NovaClinics/novaclinicspro-api/novaclinicspro-api` |
| Current branch | `dev` |
| Current HEAD / `origin/dev` | `9dba7d1 Implement R4 treatment state ownership backend` |
| Working tree status | Clean: `## dev...origin/dev` |
| Remote URL | `origin https://github.com/ayurparishkarkendra/novaclinicspro-api.git` |
| Local branches | `dev`, `main`, `test` |
| Remote branches | `origin/main`, `origin/dev`, `origin/test` |
| `main` exists | Yes, local and remote |
| `dev` exists | Yes, local and remote |
| `test` exists | Yes, local and remote |
| Onboarding feature branch exists | No onboarding feature branch shown locally or remotely |
| `git diff --stat origin/dev` | Empty |

## 3. Onboarding Specification Inventory

| File | Purpose | Status | Last Modified | Onboarding Relevance |
|---|---|---|---|---|
| `requirements.md` | Product and acceptance criteria for onboarding production hardening | Present, ignored by Git | 2026-06-16 18:20:21 before this reconciliation | Defines release blockers, deferred hardening, and acceptance criteria |
| `design.md` | Technical design and Progressive Experience production-hardening checkpoint approach | Present, updated | Updated 2026-07-11 | Defines implementation approach, testing strategy, backend dependencies, and now Git Delivery Strategy |
| `tasks.md` | Task checklist and dependency graph | Present, updated | Updated 2026-07-11 | Source of completed and pending task status; now references Git Delivery Strategy |
| `.config.kiro` | Kiro/spec config metadata | Present | Not inspected for product status | Low product relevance |
| `onboarding-dev-reconciliation.md` | This reconciliation report | Created | 2026-07-11 | Records dev audit, branch strategy, and next-stage recommendation |

Accepted product philosophy: release-now, harden-later. The initial release focuses only on defects likely to break onboarding, corrupt data, or generate immediate support tickets.

Accepted lifecycle:

```text
Create Account
→ Create Clinic Identity
→ Nova Prepares Workspace
→ Review & Personalize
→ Ready to Start
→ 30-Day Commercial Trial
→ Informational Dunning
→ Paid Subscription
→ Continuous Growth
```

Demo is not part of onboarding. It may remain only as sample clinic, guided walkthrough, educational/internal sales material, or legacy compatibility until safely removed.

Contradictions and stale assumptions:

- `requirements.md` still uses older production-hardening language centered on setup wizard release blockers, while newer code and translations use Progressive Experience wording.
- `tasks.md` marks most Progressive Experience production-hardening checkpoint implementation complete, but task 11 staging verification and final checkpoint remain pending.
- Hindi onboarding progressive translations exist structurally but are English text, so localization is not actually complete.
- Specs are ignored by Git, so spec updates will not be committed unless `.gitignore` strategy changes or files are force-added intentionally.

## 4. Completed Task Verification

| Task | Document Status | Frontend Evidence | Backend Evidence | Tests | Actual Status |
|---|---|---|---|---|---|
| Progressive Experience Phase 0 documentation checkpoint | Implied by remote branch commit name, not explicit in tasks | Specs exist locally but are ignored by Git | None | None | DOCUMENT_ONLY |
| 1. Shared `SERVICE_CATALOGUE_ALIASES` constant | Complete | `frontend/features/onboarding/constants/stepAliases.ts` includes five aliases and display mapping | Not required | Indirect coverage in StepDetail/SetupWizard tests | VERIFIED_IN_DEV |
| 2. StepDetail alias routing | Complete | `StepDetailScreen.tsx` imports aliases and maps all service aliases to `/clinic-admin/settings/treatments` | Not required | `frontend/tests/onboarding/StepDetailScreen.test.tsx` covers service aliases | VERIFIED_IN_DEV |
| 3. SetupWizardFlow alias routing | Complete | `SetupWizardFlow.tsx` renders Treatments redirect for `SERVICE_CATALOGUE_ALIASES` | Not required | `SetupWizardFlow.test.tsx` covers `services`, `services_and_specialities`, `treatment_services` | VERIFIED_IN_DEV |
| 4. Delete TreatmentsAndTherapiesScreen | Complete | No `TreatmentsAndTherapiesScreen.tsx` found under `frontend/features/onboarding` | Not required | Type/build not rerun in this audit | VERIFIED_IN_DEV |
| 5. Alias routing checkpoint | Pending | Implementation present | Not required | Focused tests exist | PARTIALLY_IN_DEV |
| 6. Duplicate submission lock and `submissionId` guard | Complete | `SetupWizardFlow.tsx` uses `isSubmittingRef`, `isHandlingNext`, `submitMutation.isPending`, `submissionIdRef` | Not required | Rapid tap/idempotency tests in `SetupWizardFlow.test.tsx` | VERIFIED_IN_DEV |
| 6.3 `Idempotency-Key` header in frontend API | Complete | `onboarding.api.ts` accepts `idempotencyKey` and sends `Idempotency-Key` | Backend onboarding idempotency could not be verified from audited `origin/dev` | `onboarding.api.test.ts` covers header behavior | PARTIALLY_IN_DEV |
| 7. Submit -> refetch -> advance ordering | Complete | `SetupWizardFlow.tsx` awaits `refetch()` before step advance in `handleNext` and `handleStepComplete` | Backend status endpoint exists | `SetupWizardFlow.test.tsx` covers no advance until refetch resolves | VERIFIED_IN_DEV |
| 8. Query invalidation after submit | Complete | `useSubmitStepMutation` invalidates `onboardingKeys.status(tenantId)` on success | Not required | `onboarding.repository.test.tsx` covers invalidation | VERIFIED_IN_DEV |
| 10. Android hardware back intercept | Complete | `BackHandler.addEventListener('hardwareBackPress')` consumes event and calls `handlePrevious` when appropriate | Not required | `SetupWizardFlow.test.tsx` covers hardware back cases | VERIFIED_IN_DEV |
| 11.1 Tenant resolution staging verification | Pending | Frontend retains `X-Tenant-ID` TODO fallback | `/auth/me` schema exposes `tenant_id` when available | No staging verification found | UNKNOWN |
| 11.2 Backend idempotency staging verification | Pending | Frontend sends header | Backend onboarding idempotency could not be verified from audited `origin/dev` | No backend onboarding idempotency test found | UNVERIFIED_IN_DEV |
| 12. Final Progressive Experience production-hardening checkpoint | Pending | Core frontend implementation present | Backend verification pending | Full test suite not rerun in this audit | PARTIALLY_IN_DEV |
| Progressive Experience Phase 1 localization-safe language changes | Not explicit in tasks | `en-US.json` has Progressive Experience wording | Not required | No localization tests found | PARTIALLY_IN_DEV |
| Hindi translation keys | Not explicit in tasks | `hi-IN.json` has keys, but values are English | Not required | No localization tests found | PARTIALLY_IN_DEV |
| Removal of Demo from target onboarding language | Accepted philosophy | Demo language changed to Sample Clinic in many UI strings, legacy demo APIs/components remain | Backend still has `demo_service.py` | Demo legacy remains by design | PARTIALLY_IN_DEV |
| Ready to Start terminology | Accepted lifecycle | `Ready to Start` appears in English and Hindi key blocks and GoLive flow | Backend complete endpoint still describes go-live | No dedicated tests found | PARTIALLY_IN_DEV |
| Trial-after-Ready-to-Start wording | Accepted lifecycle | `subscriptionDescription` says trial starts after Ready to Start | Subscription APIs exist | No dedicated tests found | VERIFIED_IN_DEV |
| Onboarding dashboard language | Accepted scope | Translation keys exist for finishing clinic preparation/readiness | Not audited beyond onboarding scope | No dedicated tests found | PARTIALLY_IN_DEV |
| Setup wizard language transformation | Accepted scope | SetupWizardFlow uses Prepare/Preparation wording in several places | Backend still uses onboarding/setup naming | No dedicated tests found | PARTIALLY_IN_DEV |

## 5. Missing or Partially Recovered Onboarding Work

- Backend onboarding idempotency could not be verified from the audited `origin/dev` code and requires explicit confirmation or implementation.
- Staging verification for tenant resolution and idempotency is still pending.
- Hindi localization is structurally present but not localized; values are English.
- Progressive Experience Phase 0 documentation is not traceable as committed because `.kiro/` is ignored.
- Final release checklist in `design.md` is still unsigned.
- Full frontend/backend verification commands were not run in this reconciliation to avoid starting implementation work or disturbing clean baselines.

## 6. Branches Containing Relevant Onboarding Work

Frontend relevant branches:

- `dev` / `origin/dev`: contains the verified Progressive Experience production-hardening checkpoint frontend implementation.
- `test` / `origin/test`: points at `e8fb29aa Remove stale recovery tests and fix test import`, behind or different from current `dev`.
- `origin/feature/progressive-experience-phase-1`: exists, commit `1bce3861 Done Phase 0 changes. To be continued`, but is stale relative to `origin/dev`.

`origin/feature/progressive-experience-phase-1` must not be used as a recovery baseline. `git diff --stat origin/dev..origin/feature/progressive-experience-phase-1` shows broad unrelated Doctor/clinical route, casesheet, prescription, treatment-sheet, and doctorDashboard test deletions/changes. That branch violates the current scope boundary for this reconciliation.

Backend relevant branches:

- `dev` / `origin/dev`: contains backend onboarding APIs but no committed onboarding idempotency feature evidence.
- `test` / `origin/test`: same commit as backend `dev`.
- No backend onboarding feature branch is present.

## 7. Uncommitted Onboarding Work

Before documentation updates, both frontend and backend working trees were clean against `origin/dev`.

This reconciliation initially changed ignored onboarding spec files and now establishes canonical tracked documentation:

- `frontend/.kiro/specs/onboarding-production-hardening/design.md`
- `frontend/.kiro/specs/onboarding-production-hardening/tasks.md`
- `frontend/.kiro/specs/onboarding-production-hardening/onboarding-dev-reconciliation.md`
- `frontend/docs/Onboarding/progressive-experience/`

Because `.kiro/` is ignored by `.gitignore`, accepted changes must be synchronized into `frontend/docs/Onboarding/progressive-experience/` for durable Git history.

## 8. Unrelated Doctor Module Work Excluded

No Doctor Module R5 files were modified.

Unrelated Doctor/clinical work was observed only while comparing the stale frontend remote feature branch to `origin/dev`. Examples include doctor route, casesheet, prescription, treatment sheet, clinical workspace, and doctorDashboard test paths. Those files were not inspected in detail, staged, reset, moved, deleted, or reconciled.

## 9. Git Strategy Documentation Changes

`design.md` now contains a `Git Delivery Strategy` section covering:

- start from latest `dev`;
- paired frontend/backend feature branches named `feature/progressive-experience-recovery` for the current initiative;
- immediate remote branch creation;
- logical commits with reviewed staging only;
- merge from `origin/dev` while the feature branch is shared;
- final frontend/backend verification commands;
- merge into `test`, integrated testing, promotion to `dev`;
- feature branch merge confirmation and deletion;
- final branch verification;
- multi-agent rule: one agent = one branch = one clean clone or worktree.

`tasks.md` now includes a `Git Delivery Strategy` reminder and the same multi-agent working rule.

## 10. Specification Governance Decision

Canonical tracked documentation path:

```text
frontend/docs/Onboarding/progressive-experience/
```

Decision rationale:

- the repository already has onboarding documentation under `frontend/docs/Onboarding/`;
- root-level `docs/` does not exist in this repository;
- `.kiro/` is ignored and must remain an agent/spec workspace, not the sole source of truth;
- `.gitignore` now narrowly unignores only `frontend/docs/Onboarding/progressive-experience/**`.

Canonical documents created or updated:

- `requirements.md`
- `design.md`
- `tasks.md`
- `ADR-PE-000.md`
- `current-behavior-inventory.md`
- `ownership-map.md`
- `migration-fixtures.md`
- `onboarding-dev-reconciliation.md`
- `progressive-experience-recovery-checkpoint.md`

## 11. Recovery Checkpoint Status

Progressive Experience Recovery Checkpoint:

```text
Status: NO-GO
```

Open mandatory gates:

- R1 Canonical Specs in Git: partially complete until committed/traceable.
- R2 Clean Paired Branches: not started.
- R3 Backend Onboarding Idempotency Verification: `UNVERIFIED_IN_DEV`.
- R4 Tenant Resolution Verification: not started.
- R5 Hindi Localization Completion Decision: not started.
- R6 Focused Verification Plan: defined, not executed.

Next onboarding implementation is blocked until Recovery Checkpoint status becomes GO.

## 12. Recommended Next Onboarding Stage

Do not start the next onboarding implementation stage yet.

Recommended next authorized action is a verification/recovery checkpoint:

1. Create clean paired frontend/backend onboarding feature branches from latest `dev` using the documented Git strategy.
2. Confirm whether backend onboarding `Idempotency-Key` handling is already implemented, partially implemented, or requires implementation.
3. Verify `/auth/me` tenant resolution for provisional/onboarding and live tenants on staging.
4. Complete real Hindi localization for the onboarding progressive keys.
5. Run the final frontend/backend verification commands and update the release checklist.

Next onboarding implementation is blocked until Recovery Checkpoint status becomes GO.

## 13. Blockers and UNKNOWNs

- BLOCKER: backend onboarding idempotency status is `UNVERIFIED_IN_DEV`; explicit confirmation or implementation is required.
- BLOCKER: staging tenant resolution verification is not recorded.
- BLOCKER: current frontend `origin/feature/progressive-experience-phase-1` contains unrelated Doctor/clinical changes and should not be reused.
- UNKNOWN: whether the backend has idempotency support in an external/staging branch not visible in this local remote list.
- RESOLVED: `.kiro/` remains ignored; canonical docs live in `frontend/docs/Onboarding/progressive-experience/`.
- UNKNOWN: whether full test suites currently pass; this audit identified test files but did not run the complete suites.
