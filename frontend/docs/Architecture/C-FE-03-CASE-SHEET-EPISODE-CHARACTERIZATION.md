# C-FE-03 — Case-Sheet / Episode Composition Characterization

**Status:** Characterization complete locally; no extraction authorized.
**Baseline:** `b061018c1e44cb9f9ba78053f3136e387a9e79d6` (`refactor/package-c-fe-03`).
**Scope:** Package C C-FE-03 evidence only. This record does not assert that R7 is complete, nor that uncommitted work in another worktree is present in this baseline.

## Sources examined

- Package C proposed requirements, design, and task inventory in the backend working tree: C-FE-03 is characterization-only and protects the canonical CaseSheetTab writer boundary.
- `clinical-documents-episodes` requirements, design, tasks, and verification records.
- `phase-2-clinical-workflow-alignment` requirements, design, and task records.
- The baseline frontend routes, screens, hooks, repository hooks, and tests listed below.

The specification records retain their stated status. Current-code observations below are baseline-specific evidence, not a claim that every historical verification statement has been re-executed.

## Verified current runtime composition

```text
Patient identity
  → appointment route/action
  → caseResolver (tenant-scoped appointment read)
      → linked episode: doctor episode workspace route
      → active episode: attach appointment, then doctor episode workspace route
      → no active episode: start-consultation route
  → CreateConsultationScreen (new episode command with client_id + appointment_id)
  → episode workspace / ClinicalWorkspace / VisitCommandCenter (feature-gated route shell)
  → CaseSheetModule (the consultation writer)
  → case-sheet repository mutation hooks → data layer/API
```

### Route and component ownership

| Concern | Verified baseline owner | Evidence |
| --- | --- | --- |
| Appointment-to-episode resolution | `features/doctorDashboard/application/caseResolver.ts` coordinates existing-link, active-episode attachment, or new-consultation routing. | `resolveCase()` receives `tenantId`, `appointmentId`, `clientId` and invokes caller-provided repository-bound operations. |
| New episode creation | `CreateConsultationScreen` validates chief complaint, calls `useCreateEpisodeMutation`, supplies `client_id` and `appointment_id`, invalidates affected appointment/episode surfaces, then replaces to the resolved route. | `features/episodes/presentation/pages/CreateConsultationScreen.tsx`. |
| Workspace routing | Expo routes carry episode, appointment, and client IDs. `cos_v1` selects `VisitCommandCenter`; the legacy branch renders `EpisodeWorkspaceScreen`. | `app/clinic-admin/episodes/[episodeId]/workspace.tsx`; `consultation.tsx`. |
| Episode read composition | `useEpisodeWorkspaceData` reads tenant-scoped episode details; that response is the source of document IDs, then the hook reads details by ID. | `features/episodes/presentation/hooks/useEpisodeWorkspaceData.ts`. |
| Case-sheet writer | `CaseSheetModule` owns local draft, autosave, create/update repository mutation hooks, error presentation, and visit attribution. | `features/episodes/presentation/components/ConsultationSections/CaseSheetModule.tsx`. |
| Read-only summary | `CasesheetTab` renders a summary, gates actions through its `canCreate` input, and calls callbacks only. `EpisodeWorkspaceScreen` owns navigation to the canonical edit/create routes. | `CasesheetTab.tsx`; `EpisodeWorkspaceScreen.tsx`. |
| Detail screen | `CasesheetDetailScreen` composes tenant-scoped case sheet/client/episode/treatment-sheet queries and its existing document actions. | `features/casesheets/presentation/pages/CasesheetDetailScreen.tsx`. |
| Episode detail screen | `EpisodeDetailScreen` owns its detail/list query composition, close/reopen/update commands, document navigation callbacks, focus refresh, and local UI states. | `features/episodes/presentation/pages/EpisodeDetailScreen.tsx`. |

## State, authorization, and freshness characterization

- **Tenant scope:** the workspace uses the authenticated tenant ID for episode and dependent document queries. The resolver accepts tenant ID from its caller; the UI does not manufacture one.
- **Role/capability surface:** `EpisodeWorkspaceScreen` takes a role mode and reads `episodeWorkspaceConfigByRole[mode]`; its tab affordances are configured at that boundary. `CasesheetTab` receives its write affordance as `canCreate`; it has no independent role derivation.
- **Writer identity:** `CaseSheetModule` creates with both `appointment_id` and `episode_id`; updates provide the current `appointment_id`. It prevents a missing appointment context from falling through to a create command.
- **Read-only versus editable:** `CasesheetTab` does not import a form or case-sheet mutation hook. Edit is a navigation callback to the canonical edit route. Signed source state is rendered through `CaseSheetVersionPanel` by the module.
- **Freshness:** the module invokes `refetchEpisode()` after create and, when the freshness flag is enabled, updates/invalidates the established case-sheet keys. `EpisodeDetailScreen` refetches details when it regains focus, avoiding a stale post-create document flag. `CreateConsultationScreen` invalidates appointment, episode, client-episode, and dashboard query surfaces after creation.
- **Loading/error/retry:** workspace and detail screens have explicit loading/error/retry paths. `CaseSheetModule` records save errors locally and marks section save state as error; `saveAndSubmit` refuses navigation if flush fails. No new behavior was added or assessed beyond these observed paths.
- **Specialty visibility:** the canonical writer enables the established Ayurvedic assessment templates only when `isAyurvedaClinic(features)` is true. This is an existing feature boundary, not a C-FE-03 decision.

## R7 compatibility and dependency matrix

| Concern | Current implementation | R7 contract | Difference | Risk | Classification |
| --- | --- | --- | --- | --- | --- |
| Episode ownership | Resolver reuses/attaches an active episode before routing; creation includes appointment linkage. | Episode is the longitudinal container; attachment validates the episode lifecycle server-side. | No frontend authority to validate attachment observed. | Medium if server enforcement regresses; not a frontend decomposition defect. | Confirmed compliant at the presentation boundary. |
| Case-sheet writer | `CaseSheetModule` uses repository hooks and carries visit/episode attribution. `CasesheetTab` is summary-only. | One canonical authoring surface; contributions are visit-attributed while the sheet is episode-owned. | Historical standalone edit/create routes coexist as canonical navigation destinations; C-FE-03 does not consolidate them. | High clinical sensitivity; protected from extraction. | Confirmed compliant for tab-vs-module boundary; R7 implementation pending/externally governed for any broader consolidation. |
| Consultation navigation | Route builders preserve episode, appointment, and client identity; COS route is feature-gated. | Navigation must preserve clinical context and not synthesize lifecycle facts. | Multiple feature-gated shells are present by design. No equivalence claim was made for uncommitted R7 work outside baseline. | Medium. | R7 implementation pending where feature-gated behavior is not covered by this characterization. |
| Mutation ownership | Case-sheet create/update stays in the writer through repository hooks; read-only tab does not mutate. | Frontend must not bypass data/repository boundary; backend remains clinical authority. | No direct datasource bypass found in characterized writer/tab paths. | Low for the examined boundary. | Confirmed compliant. |
| Cache freshness | Existing invalidation/refetch patterns remain owned by the writer/entry screen/detail focus effect. | Current facts must refresh after mutation without duplicate authoring. | Existing flag-gated asymmetry is preserved; C-FE-03 does not redesign it. | Medium; regression-tested only for established paths. | Existing technical debt / accepted current behavior; not remediated. |
| Role/tenant gating | Tenant comes from authenticated context; workspace role config and callback affordances gate UI. | Backend owns authorization; frontend must preserve tenant/role context. | This task did not exercise backend authorization at runtime. | Medium. | Confirmed compliant in composition; backend enforcement not revalidated. |

## Evidence and tests

Existing baseline tests run before C-FE-03 changes:

- `casesheetTabReadOnlySummary.test.tsx`
- `caseSheetModule.test.tsx`
- `caseSheetModuleComposition.test.tsx`
- `consultationFlow.integration.test.tsx`
- `consultationRoutes.test.ts`
- `CasesheetDetailScreen.test.tsx`
- `treatmentLifecycleActionsStatusRepoint.test.tsx`

Result: **7 suites, 62 tests passed**. Existing test output includes theme/console warnings and a Jest open-handle notice after successful completion; no test failed.

New characterization guard:

- `tests/features/episodes/CFE03CaseSheetEpisodeComposition.characterization.test.ts`

It locks the current resolver path, new-consultation identity preservation, repository-hook writer boundary, and read-only-tab/edit-route split. It does not prescribe a future component structure.

## Confirmed deviations and exclusions

1. **No direct datasource bypass confirmed** in the characterized case-sheet writer, tab, or detail-screen paths.
2. **No competing CaseSheetTab writer confirmed**. The historic duplicate-editor condition is protected by existing tests and is not reopened.
3. `CasesheetDetailScreen` and `EpisodeDetailScreen` remain large mixed composition screens. File size alone does not establish a safe extraction boundary.
4. The case-sheet-to-treatment recommendation `ensureCasesheetExists` bridge is explicitly transitional in current source. Its removal would change cross-module behavior and is **NOT AUTHORIZED**.
5. The R7 design/requirement records describe broader workflow intentions, while this baseline has feature-gated workspace shells. This is a **contract/version dependency**, not a C-FE-03 regression.

## Future candidates — NOT AUTHORIZED

- Presentation-only extraction candidates within `CasesheetDetailScreen` and `EpisodeDetailScreen` require separate approval, a frozen behavior matrix, and verification that no mutation/navigation/cache owner moves.
- Any consolidation of standalone and workspace case-sheet authoring must first reconcile the R7 canonical-authoring contract and is outside C-FE-03.
- Any change to lifecycle derivation, role policy, tenant authority, appointment attachment, or backend contracts is outside Package C C-FE-03.

## Rollback

Revert only the C-FE-03 documentation and characterization-test commit. There are no production, API, schema, or persisted-data changes in this task.


## A–F frontend integration verification — 2026-10-26

Authority: the owner authorized reuse and isolated integration of C-FE-01,
C-FE-02 and C-FE-03, without new clinical workflow changes or a Git commit.
The existing Package C requirements/design/task inventory remains a proposed
umbrella; individual completed tasks and this bounded integration do not approve
its remaining decomposition candidates.

### Reconciled task status

| Task | Preserved implementation and current gate |
| --- | --- |
| C-FE-01 | Reused `43f05b5b65787c128314c212950b3b255a28bc5b`: creation selection controls extracted; screen retains commands, navigation and data ownership. Isolated combined verification passed; Git inclusion and destination integration remain pending. |
| C-FE-02 | Reused `b061018c1e44cb9f9ba78053f3136e387a9e79d6`: preview presentation extracted; screen retains commands, selection coordination and navigation ownership. Same integration gates apply. |
| C-FE-03 | Reused `a8a113cbb5a4cb61140c05e176f55540f2750740`: characterization only. No case-sheet/episode production extraction or writer consolidation was performed. |
| C-BE-01 / C-BE-02 | Not implemented by this work; existing backend/R7 lifecycle, transaction and ownership prerequisites still apply. |
| C-FE-04 | Not implemented; remains subject to existing registration-policy/security and task-specific authorization gates. |

Original authority references: `PACKAGE-C-REQUIREMENTS.md`,
`PACKAGE-C-DESIGN.md` and `PACKAGE-C-TASKS.md` in the existing backend
`.kiro/specs/package-c-component-service-decomposition/` directory. Those
original documents and all original worktrees were left unchanged.

### Combined baseline and scope

Base: frontend Package A `c7fc019486d171a44f723376dc72d185e66b6079`.
C and base diverge from `df93d1389928fb4a7a9c08071df7e20b203d9b11`;
changed-path intersection is empty. The eight C paths were copied byte-for-byte
from the C tip before this evidence-only addition. No conflict resolution or
reimplementation was needed. Canonical clinical writers and all other tracked
paths must remain byte-identical to the Package A base.

### Current offline evidence

Existing dependencies only: Node 20.19.4, Jest 29.7.0, jest-expo 57.0.5,
TypeScript 6.0.3. The external runner preserves the native preset's `ios`
default platform and `android,ios,native` platform list while adding
`forceNodeFilesystemAPI: true`. Runs use `--runInBand --no-cache
--watchman=false --runTestsByPath` under pre-import network/process guards;
no repository test configuration or dependency declaration changed.

Focused selection: **3 suites, 14 passed**, zero failed/skipped, exit 0:

- `tests/features/appointments/CreateAppointmentSelectionControls.characterization.test.tsx`
- `tests/features/appointments/PreviewAppointmentsPresentation.characterization.test.tsx`
- `tests/features/episodes/CFE03CaseSheetEpisodeComposition.characterization.test.ts`

Regression selection: **15 suites, 91 passed**, zero failed/skipped:

- `tests/features/appointments/AppointmentRow.characterization.test.tsx`
- `tests/features/appointments/appointmentCreationErrorBoundary.test.ts`
- `tests/features/appointments/CreateAppointmentScreen.errorBoundary.test.ts`
- `tests/features/doctorDashboard/casesheetTabReadOnlySummary.test.tsx`
- `tests/features/doctorDashboard/caseSheetModule.test.tsx`
- `tests/features/doctorDashboard/caseSheetModuleComposition.test.tsx`
- `tests/features/doctorDashboard/consultationFlow.integration.test.tsx`
- `tests/features/doctorDashboard/consultationRoutes.test.ts`
- `tests/features/casesheets/CasesheetDetailScreen.test.tsx`
- `tests/features/doctorDashboard/treatmentLifecycleActionsStatusRepoint.test.tsx`
- `tests/architecture/b1-presentation-boundary-guard.test.ts`
- `tests/security/packageALoggingBoundary.test.ts`
- `tests/onboarding/PaymentSetupScreen.draft.test.tsx`
- `tests/features/doctorDashboard/doctorLogoutPlatform.test.ts`
- `tests/features/doctorDashboard/doctorDashboardError.test.ts`

Regression runner exit: **0**, after delayed natural teardown. Jest emitted
an open-handle warning after all assertions passed; no force-exit, process
interruption or assertion suppression was used. This remains inherited test
cleanup debt, not a failed assertion. Both guarded runs completed without a
guard-violation marker; their process exits were 0.
Existing console output includes theme-provider fallbacks and missing synthetic
wizard-draft identity. No warning suppression or assertion changes were made.
Production `tsc --noEmit --project tsconfig.production.json` passed. Static
import checks found no transport, datasource, repository or use-case imports
in either extracted presentation component.

These tests establish bounded offline composition compatibility, not backend
RBAC, database, device, R7-wide or release acceptance. Package A remains
preserved in the base. No migration, API contract, clinical authority, backend,
Commercial Platform, push, merge or deployment operation belongs to this work.

Scoped ESLint of the four reused production files exits 1: six errors and ten
warnings. A controlled stdin comparison against the Package A base confirms
all six `react-hooks/set-state-in-effect` errors target identical unchanged
syntax nodes in CreateAppointmentScreen; the base has the same six errors and
seven warnings. PreviewAppointmentsScreen has zero errors and three warnings
(base: zero errors, six warnings). The extracted components add no lint findings.
This is inherited lint debt, not an authorized Package C behavior change.

### A–F frontend integration runner correction (2026-10-28)

Candidate: `codex/af-frontend-integration`, HEAD
`1677534401518e629b8829c672419a00939e91c4`. The candidate started clean.
The owner's Frontend Integration Regression Unblock directive authorizes this
bounded diagnosis and evidence update, without production or assertion changes.

**Verified root cause:** the temporary runner called Jest's `runCLI` API
directly with `process.env.NODE_ENV` undefined. Installed Jest 29.7.0's
`jest-cli/bin/jest.js` normally initializes this variable to `test` before
calling Jest. The external API runner bypassed that CLI bootstrap. Expo's
preset and native mocks were present; neither haste nor browser mocks were the
cause of these two failures.

React Native 0.86.3 `TouchableOpacity._setOpacityTo` starts `Animated.timing`
with `useNativeDriver: true`. On the disabled-to-enabled rerender and the
consultation action update, `AnimatedProps.#connectAnimatedView` receives no
native handle from react-test-renderer. Its existing test-mode branch uses
the synthetic tag `-1`; outside `NODE_ENV=test`, it throws `Unable to locate
attached view in the native tree`. No code in that branch was patched, caught,
or suppressed. Passing suites do not necessarily exercise this animation
transition, so their success did not establish correct runner initialization.

**Correction:** external runners initialize `process.env.NODE_ENV = 'test'`
after installing the network/process guard and before importing Jest or
transformed test modules. Canonical Jest CLI invocation should likewise use
an explicit `NODE_ENV=test` for this verification. The existing Expo preset,
`ios` default, `android,ios,native` platforms, `forceNodeFilesystemAPI`,
run-in-band/no-cache/no-watchman options and guards remain unchanged. No
repository Jest setup/configuration, test, mock, dependency or application
file requires a correction. Native-device animation correctness is not
established by react-test-renderer's documented-in-source test fallback.

Controlled individual runs changed only runner initialization:

| Existing suite | Before | After |
| --- | --- | --- |
| PreviewAppointmentsPresentation characterization | 4 passed / 1 failed | 5 passed |
| consultationFlow integration | 11 passed / 1 failed | 12 passed |

All assertions, rerenders, clinical commands and navigation checks are
byte-identical to HEAD. The approved 14-suite selection then passed **114/114**
in 9.351 seconds; the existing 15-suite regression selection passed **91/91**
in 8.829 seconds. These selections overlap by six tests: **199 unique tests**
passed, zero failed/skipped. This includes Package A's ten focused checks,
payment's two tests, Package C's fourteen characterization checks and Package
D's ninety-six checks, including the B1 architecture guard. Exact suite lists
are the prior selections above and the existing Package D architecture
evidence, not a new acceptance scope.

Both individual corrected runs and both approved selection runs exited 0.
Corrected external runners are `/private/tmp/nova-unblock-frontend-run.cjs`
and `/private/tmp/nova-unblock-frontend-regression-run.cjs`; their only
execution change from the earlier runners is test-environment initialization
(result output paths are separate to preserve the failing evidence).

The consultation-containing runs retain delayed natural teardown. The fixture
creates a QueryClient with retry disabled but no explicit GC/cleanup setting;
installed query-core defaults to a five-minute GC timer outside server mode.
This is consistent with the observed delay and existing cleanup debt, not a
new assertion failure. No force-exit, timer override or fixture change is used.

Production TypeScript passed (exit 0). Scoped ESLint over the same twenty
changed TS/TSX files returned exit 1 with **12 errors / 20 warnings**; exact
messages match the prior candidate run. The earlier comparison against B27
has 12 errors / 23 warnings and no new rule/severity/message summaries.
No lint rule or suppression changed. Existing theme-provider fallback and
synthetic wizard-identity console warnings remain; they were not suppressed.

Environment: Node 20.19.4, Jest 29.7.0, jest-expo 57.0.5, React 19.2.3,
React Native 0.86.3, RNTL 13.3.3, TypeScript 6.0.3 and ESLint 9.31.0;
existing installed dependencies only. Python/JavaScript-level guards are not
OS-level isolation. No database, external service or dependency installation
was used. Temporary dependency linkage is removed after verification.

The external runner fix is not an application change or completed additional
Package C decomposition. Package C's remaining implementation, Package D
native/Hindi/accessibility disposition, inherited lint and other A–F
acceptance gates remain separate. This evidence-only repository change
requires owner review and local commit approval; no commit, push, merge,
CI execution or destination promotion is authorized here.


## A–F continuation: current Package C verification and authorization boundary — 2026-10-28

Authority: owner's A–F Refactoring Continuation directive permits the highest-value
bounded read-only verification when no remaining task is already implementation-
authorized. Both clean candidates were verified at their named branches/HEADs:
frontend `codex/af-frontend-integration` / dd7173cfad058b0322320c3ad011d266bdc247f8;
backend `codex/af-backend-integration` / a205c3d0bd2b0e7b67442a2b57cca03e721818f5.
Both began clean. No historical test result was substituted for this run.

The original backend `package-c-component-service-decomposition/PACKAGE-C-TASKS.md`
still says PROPOSED / NOT APPROVED and requires task-specific approval after
preconditions. C-FE-01/02 remain preserved implemented work. C-FE-03 remains
characterization only; its existing Future candidates section does not authorize
production extraction. C-FE-04 retains B2.7 prerequisites; C-BE-01/02 retain
R7/B2 transaction/ownership prerequisites. No remaining extraction was silently
authorized by the general continuation instruction. Protected appointment,
case-sheet, episode and doctor-dashboard production paths are byte-identical
at Git tree level to preserved C integration commit 1b463580af91c64edf23557af3bfdb92690dc9b2.

Fresh guarded selection: the three C characterization suites (14 tests), the
seven original canonical-writer/clinical regression suites listed above (62),
and B1 architecture (2): **11 suites / 78 passed, zero failed or skipped**;
Jest test duration **7.695 seconds**. Exact suite/assertion results are in
`/private/tmp/nova-c-continuation-results.json`; external runner/log are
`/private/tmp/nova-c-continuation-run.cjs` and
`/private/tmp/nova-c-continuation.log`. Uses existing pre-import
network/process guard, NODE_ENV=test before Jest, preserved native haste options,
forceNodeFilesystemAPI, runInBand/no-cache/watchman=false and exact suite paths.
No guard-violation markers. Existing theme/console output was not suppressed.
Runner teardown/exit is recorded below independently of assertion success.

Production TypeScript (`tsc --noEmit --project tsconfig.production.json`) passed,
exit 0. Scoped ESLint on the four C production TSX paths and three characterization
tests returned exit 1: **6 inherited errors / 10 inherited warnings**. Every
rule/severity/message/line signature matches the preserved integration baseline;
no source, assertion, lint rule, configuration or suppression changed. Existing
Node 20.19.4/dependencies reused; no dependency installation. Native Python 3.11
was unavailable at checked standard locations; Package E's existing runtime
acceptance gap remains unverified, not solved by this frontend run.

Next implementation decision: task-specific authorization for an exact C-FE-03
presentation-only extraction boundary, with R7/B2 current-contract prerequisites
confirmed and canonical writer/navigation/cache/tenant authority retained. This
record does not approve extraction, clinical redesign or registration work.
Package D still needs its recorded copy/appearance/native acceptance disposition;
Package B security/lifecycle approvals remain; Package F credential use stays on
explicit hold. No database activity, credentials access, source/test edits, Git
staging/commit, push, merge or promotion was performed. This evidence-only update
requires separate local Git-inclusion review.


Final runner process exited naturally with **exit 0**, after delayed teardown
(approximately five minutes after assertion results). No forced exit, timer
mock or assertion suppression was introduced. This inherited cleanup behavior
is not declared fixed. Temporary dependency linkage was removed. Installed
Jest 29.7.0, jest-expo 57.0.5, TypeScript 6.0.3, ESLint 9.31.0, React 19.2.3
and React Native 0.86.3 were reused. Original B27 frontend/backend snapshot
checks passed: 1300/1670 recorded content hashes and their Git statuses match.
Only this frontend evidence document and backend Engineering Truth changed;
indexes remain empty. Local results are not GitHub-hosted, native-device,
database, destination-integration or package-acceptance evidence.
