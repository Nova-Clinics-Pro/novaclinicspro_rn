# R7 GROUP 0A — Independent Architecture Remediation — Closure

**Verdict:** **GROUP 0A PASSED — BACKEND CONTRACT PREREQUISITES MAY BEGIN.
FINAL GROUP 0/M1 REMAINS OPEN.**

**Date:** 2026-07-19. **Scope:** T-0.1 through T-0.7 (ED-ARCH-001 remediation
of the 8 R7-composed modules named in `tasks.md`). This artifact is the
Group 0A exit-criteria evidence referenced by the 2026-07-19 controlled
sequencing amendment to `tasks.md` (§"Controlled Amendment: Group 0
sequencing correction").

## 1. Task status, commit hashes, tests and counts

| Task | Module(s) | Commit | Violations removed | Tests |
|---|---|---|---|---|
| **T-0.1** | Characterization baseline | `871e9493` | n/a (test-only task) | +12 new characterization tests: 9 for `deriveSummary` (`consultationFlow.integration.test.tsx`), 3 for `useClinicalTimelineData` (history-hierarchy defect characterization) |
| **T-0.2** | `PrescriptionModule.tsx` | `200d850d` | 2 imports removed (`axiosClient`, direct datasource) — live `axiosClient.get` eliminated; repointed to `usePrescriptionByAppointmentQuery`/`useCreatePrescriptionMutation`/`useUpdatePrescriptionMutation` | `prescriptionModule.test.tsx` 12/12 green |
| **T-0.3** | `CaseSheetModule.tsx` | `2437132c` | 1 import removed (datasource); repointed to `useCreateCasesheetMutation`/`useUpdateCasesheetMutation` | `caseSheetModule.test.tsx` + related suites green |
| **T-0.4** | `TreatmentRecommendationModule.tsx` | `19631819` | 1 import removed (`sendToSchedulingApi`/`createTreatmentRecommendationApi` datasource); repointed to two new minimal `treatmentOrders.repository.impl.ts` hooks | 7 suites / 45 tests green (core + `consultationFlow.integration`, `persistentContextContinuity`, `sectionSwitchingContext`, `workspaceReloadRestoration`, `clinicalWorkspaceShell`, `workspaceProvider`) |
| **T-0.5** | `ClinicalServicesModule.tsx` | `7053b065` | 1 import removed (`createClinicalServiceApi` datasource); repointed to new `useCreateClinicalServiceMutation` | 6 suites / 56 tests green |
| **T-0.6** | `useClinicalTimelineData.ts` | `6167ff00` | 1 import removed (`listClinicalServicesByVisitApi` datasource, repointed via new `clinicalServicesByVisitQueryOptions` factory) + false `completedSessionCount`/`sessionCount` local formula removed outright (verified dead in production — the backing endpoint's `rows` field is always empty server-side) | 6 suites / 42 tests + 9 suites / 65 tests (broader regression) green. Narrow, explicitly authorized T-0.2-origin stale-mock repair applied to `clinicalTimelineDoesNotBlockModuleSave.test.tsx` (no product assertion changed) |
| **T-0.7** | `TreatmentSheetDetailScreen.tsx` + `useTreatmentSheetRows.ts` | `05c31094` | 3 imports removed (`axiosClient` for `handleScheduleAppointments`, `lifecycleApi.ts` datasource for pause/resume/cancel, datasource for row update/bulk-update) — repointed to `useEpisodeQuery`, new `treatmentSheetLifecycle.repository.impl.ts` hooks, and re-shaped/new `treatmentSheets.repository.impl.ts` row-mutation hooks | New characterization-first suites: `useTreatmentSheetRows.test.tsx` 10/10, `treatmentSheetDetailScreen.test.tsx` 13/13 (both run pre- and post-remediation per the Characterization-First Gate). Broader regression: 9 suites / 74 tests green |

**All seven Group 0A tasks: complete.**

## 2. Architecture violations removed (ED-ARCH-001)

Across T-0.2–T-0.7: 9 direct Presentation→datasource/`axiosClient` import
violations removed from the 8 named R7-composed modules/hooks, all
repointed through governed repository/application-layer hooks (reused
where they already existed correctly-shaped; added as the smallest new
hook only where Engineering Truth proved none existed — `treatmentOrders`
create/send hooks (T-0.4), `useCreateClinicalServiceMutation` (T-0.5),
`clinicalServicesByVisitQueryOptions` (T-0.6), `useUpdateAllTreatmentSheetRowsMutation`
+ re-shaped `useUpdateTreatmentSheetRowMutation` + the new
`treatmentSheetLifecycle.repository.impl.ts` file (T-0.7, split out after
Engineering Truth showed co-locating it with row hooks broke unrelated
tests via a transitive `axiosClient`/`supabaseClient` import chain)).
Zero new datasource/transport authorities were introduced; zero duplicate
query-key families were introduced.

## 3. Known findings intentionally left open (not fixed in Group 0A)

- **`workspaceHeader.test.tsx`** — one known failure (`shows the error
  tone when any one module reports a save failure...`), traced to T-0.2's
  `PrescriptionModule` read-path change surfacing a gap in this test
  file's own mock (outside T-0.2's declared test surface at the time).
  Verified via `git stash` control test to pre-date T-0.4 and reproduce
  identically through T-0.7. **Not fixed** — explicitly out of scope for
  every Group 0A task; reproduces unchanged as of `05c31094`.
- **`useTreatmentSheetHeaderData.ts` direct `axiosClient` access** —
  discovered during T-0.7 (it is called by `TreatmentSheetDetailScreen.tsx`
  but lives in a separate file, outside T-0.7's two named primary files).
  **Not fixed** — recorded in T-0.7's own commit docstring as a follow-up
  finding. **No task currently owns it.** Recommended for a future
  ED-ARCH-001 follow-up task (not created here — no new task ID is
  authorized by this closure artifact).
- **T-0.8 backend dependency** — `CompleteConsultationScreen.tsx`'s
  `deriveSummary` (ED-ARCH-004) remains exactly as it was; verified
  formally blocked by `T-BE-F.3` (see
  [R7-T-0.8-BLOCKED-BACKEND-DEPENDENCY.md](R7-T-0.8-BLOCKED-BACKEND-DEPENDENCY.md)).
  No frontend fallback was introduced.
- **T-0.9 backend workflow dependency** — `useConsultationWorkspace.ts`'s
  `buildSectionConfig()` (ED-ARCH-006) remains exactly as it is; formally
  blocked by `T-BE-B.2` per `tasks.md`'s own, unchanged, "Blocked by"
  field. Not attempted this session (T-0.9 was never in scope for any
  task executed to date).

## 4. No-New-Debt verification (Group 0A, T-0.2–T-0.7 combined)

Verified across every individual task's own completion report and
re-confirmed by inspection while preparing this closure:

- No Presentation→`axiosClient`/datasource/infrastructure-implementation
  access remains in any of the 8 named modules (one pre-existing,
  unrelated, type-only import of `ClinicalReviewOutcome` in
  `TreatmentSheetDetailScreen.tsx` is the sole documented exception,
  matching identical precedent already established inside
  `treatmentOrders.repository.impl.ts` itself).
- No duplicate query-key family introduced.
- No duplicate mutation/read authority introduced.
- No frontend clinical aggregation formula introduced (T-0.6 *removed*
  one rather than replacing it).
- No R7 Treatment Plan, stable-Session, hierarchical-history, or
  workflow-resolver feature implemented early.
- No hard-coded reusable styling or unlocalized visible string
  introduced in any touched file.
- No unrelated module refactored.
- No known baseline failure silently absorbed (`workspaceHeader.test.tsx`
  confirmed unmodified at every checkpoint via `git diff --stat`).

## 5. Backend prerequisite tasks now authorized

Per the 2026-07-19 controlled sequencing amendment to `tasks.md`, the
following **existing, unchanged** backend tasks are now authorized to
begin (not implemented by this artifact or this invocation):

`T-BE-A.1` · `T-BE-B.1` · `T-BE-B.2` · `T-BE-F.1` · `T-BE-F.2` · `T-BE-F.3`

## 6. Explicit statement: M1 / Group 0 is not yet complete

Group 0A closing does **not** close Group 0 and does **not** satisfy
milestone M1. Final Group 0 / M1 requires Group 0A **+** the Backend
Contract Prerequisite Window **+** Group 0B (T-0.8, T-0.9) — all three.
Gate OR-1 does not trigger on this closure. See `tasks.md`'s own "GROUP 0
FINAL GATE" and amended "M1" section.
