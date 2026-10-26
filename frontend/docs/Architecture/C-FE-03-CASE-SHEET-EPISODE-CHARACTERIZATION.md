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
