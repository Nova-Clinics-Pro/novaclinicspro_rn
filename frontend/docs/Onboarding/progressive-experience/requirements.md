# Requirements Document

## Introduction

The NovaClinics Pro onboarding wizard is functionally ~95% complete but needs targeted hardening before production release. This specification takes a **release-now, harden-later** approach: only defects that can directly break onboarding, create data corruption, or generate support tickets immediately after launch are in scope for the initial release.

The 7 absolute release blockers are:
1. Alias routing consistency (Req 1–3 + shared constant)
2. Submit → Refetch → Advance ordering (Req 26 AC-8)
3. Duplicate submission prevention (Req 26 AC-1–5)
4. Query invalidation after submit (Req 27 AC-1)
5. Android back button handling (Req 10)
6. Tenant resolution verification (Req 11)
7. Backend idempotency confirmation (Req 12 AC-6)

Everything else — draft persistence, offline support, conflict resolution, analytics, i18n, accessibility enhancements — is explicitly deferred to a post-release hardening milestone.

### Phase Terminology

Use the Progressive Experience phase naming system for all future onboarding planning:

```text
Progressive Experience Phase 0
Progressive Experience Phase 1
Progressive Experience Phase 2
...
```

Historical mapping:

```text
Legacy "Sprint 1" = Progressive Experience production-hardening checkpoint
Legacy "release gate" = Progressive Experience production-hardening checkpoint
```

Historical commit names and prior branch names are preserved as written; they are not silently reinterpreted.

### Specification Governance Requirement

Accepted Progressive Experience requirements, design decisions, tasks, recovery checkpoints, and reconciliation reports must be version-controlled and traceable to commits.

Canonical tracked documentation path:

```text
frontend/docs/Onboarding/progressive-experience/
```

The Kiro workspace path remains a non-canonical agent/spec workspace mirror:

```text
frontend/.kiro/specs/onboarding-production-hardening/
```

The `.kiro` path must not be the sole source of truth for accepted onboarding architecture or implementation planning.

---

### Release Scope

#### Absolute Release Blockers (ship nothing without these)

These 7 items can cause user-facing breakage, duplicate records, or wizard dead-ends in production. All are low-effort, high-impact fixes.

| # | Req | What | Why it blocks release |
|---|---|---|---|
| 1 | **Req 1–3** | Alias routing — `StepDetailScreen`, `SetupWizardFlow`, delete dead file | Backend templates return unrecognised step codes that silently strand users |
| 2 | **Req 26 AC-8** | Submit → Refetch → Advance ordering | Wizard advances on stale cache under slow networks — classic production bug |
| 3 | **Req 26 AC-1–5** | Duplicate submission prevention (`isPending` lock + spinner) | Double taps on mobile produce duplicate API records |
| 4 | **Req 27 AC-1** | Query invalidation after submit | Without `invalidateQueries`, completed steps reappear as incomplete |
| 5 | **Req 10** | Android hardware back button intercept | Default OS back exits the wizard; users lose context |
| 6 | **Req 11** | Verify tenant resolution (JWT `tenant_id` or working fallback) | Wrong tenant = wrong data. Not a code feature — a release validation item |
| 7 | **Req 12 AC-6** | Confirm backend idempotency before shipping | Frontend duplicate-tap protection is not enough if backend ignores `Idempotency-Key` |

**If these 7 items pass, the onboarding flow is ~90–95% production-safe for an initial release.**

#### Nice to Have (Only If Time Remains)

| Item | Condition |
|---|---|
| `isSubmittingRef` guard in `handleNext` | Only if code review reveals async race conditions beyond `isPending` |

#### Explicitly Deferred — Post-Release Hardening Milestone

All of the following are moved out of the release and into a post-release hardening sprint:

- `WizardDraftStore` rewrite (Req 5/6) — AsyncStorage persistence, lz-string compression, schema migration
- `OfflineBanner` + NetInfo integration (Req 7)
- Offline CTA gating + `PendingMutationStore` (Req 8)
- App lifecycle `AppState` handling (Req 9)
- Draft conflict resolution modal (Req 16)
- Multi-device sync (Req 17)
- Payment recovery banner (Req 18)
- Storage security audit (Req 19)
- Error centralisation (Req 20)
- Analytics stub (Req 28)
- i18n coverage (Req 24)
- Accessibility enhancements (Req 25)
- Tenant logout storage cleanup (Req 30)
- Draft expiry (Req 31)
- Backend `updated_at` contract (Req 29)
- Full architecture audit (Req 22/23)

None of these are likely to stop a clinic from completing onboarding on day one.

---

**Implementation order:**
- **Progressive Experience production-hardening checkpoint** — All 7 blockers: alias routing (Req 1–3), shared alias constant, Android back (Req 10), query invalidation (Req 27 AC-1), duplicate submission lock + submit→refetch→advance ordering (Req 26 AC-1–5, 8), tenant resolution + backend idempotency verification (Req 11, Req 12 AC-6).
- **Post-release Progressive Experience phases** — Draft persistence, offline resilience, conflict resolution, analytics, accessibility, i18n, and all other deferred items above.

All UI work must use `useClinicTheme()` exclusively — zero hardcoded colours, spacing values, font sizes, border radii, or shadow values (except `flex`, `zIndex`, `minHeight`/`minWidth: 44` touch targets, and animation timing). All data access must flow through existing repository hooks; screens must not call API functions directly. All user-visible strings must have entries in `locales/en.json` and `locales/hi.json`.

---

## Glossary

- **SetupWizardFlow**: The top-level wizard orchestrator component at `frontend/features/onboarding/presentation/pages/SetupWizardFlow.tsx`.
- **StepDetailScreen**: The routing screen at `frontend/features/onboarding/presentation/pages/StepDetailScreen.tsx` that redirects certain step codes to external management screens.
- **WizardDraftStore**: The rebuilt Zustand store at `frontend/features/onboarding/presentation/stores/wizard.store.ts` that persists per-step form drafts.
- **Step_Code**: A string identifier returned by the backend in `visible_steps`, e.g. `clinic_profile`, `treatments_and_therapies`, `services`.
- **Alias**: A Step_Code that maps semantically to the same management screen as an existing known code (e.g. `services` aliases to `treatments_and_therapies`).
- **Draft**: Partial form state for a single onboarding step that has been entered by the user but not yet successfully submitted.
- **OfflineBanner**: A non-blocking UI component that informs the user they are offline and that changes are saved locally.
- **PROVISIONAL_Tenant**: A tenant whose account is in demo/provisional state; the backend does not yet include `tenant_id` in `/auth/me` for these tenants.
- **Idempotency_Key**: A UUID v4 header (`Idempotency-Key`) sent with mutating API requests to allow safe retries without duplicate side effects.
- **DemoStatusBanner**: The existing component at `frontend/features/onboarding/presentation/components/DemoStatusBanner.tsx` that displays demo/trial countdown and transition actions.
- **Treatments_Module**: The existing `features/treatments/` module, accessible at `/clinic-admin/settings/treatments`, which fully satisfies the service-catalogue business requirement.
- **DraftConflictModal**: A modal component that presents the user with a choice between the server version and the locally-held draft when both exist with different content after a foreground resume.
- **errorMessages**: A centralised error-mapping module that translates raw backend error strings into user-facing messages; sourced from the project's internationalisation layer.

---

## Requirements

---

### Requirement 1: Service-Category Step Alias Routing — StepDetailScreen

**User Story:** As a clinic admin whose onboarding template uses a service-catalogue step code other than `treatments_and_therapies`, I want the wizard to route me to the Treatments & Services management screen, so that I can complete my service catalogue step without encountering a "not implemented" error.

#### Acceptance Criteria

1. WHEN `StepDetailScreen` processes a Step_Code equal to `services`, `services_offered`, `services_and_specialities`, or `treatment_services`, THE `StepDetailScreen` SHALL redirect the user to `/clinic-admin/settings/treatments` using the same redirect mechanism already used for `treatments_and_therapies`.
2. WHEN `StepDetailScreen` processes a Step_Code that is not present in the `redirectSteps` map, THE `StepDetailScreen` SHALL continue its existing behaviour unchanged.
3. THE `StepDetailScreen` SHALL include all six Step_Codes (`treatments_and_therapies`, `services_and_specialities`, `services`, `services_offered`, `treatment_services`, and any further aliases discovered during the backend audit) in a single unified redirect map entry pointing to `/clinic-admin/settings/treatments`.
4. WHEN the backend audit of onboarding templates reveals additional Step_Code aliases not listed above (e.g. `therapies`, `clinic_services`, `specialities`), THE `StepDetailScreen` SHALL include those aliases in the redirect map before the Phase 1 implementation is merged.

---

### Requirement 2: Service-Category Step Alias Routing — SetupWizardFlow

**User Story:** As a clinic admin using the embedded wizard flow, I want the redirect card for service-catalogue steps to appear for all service-catalogue aliases, so that the "Go to Treatments Management" card is shown regardless of which alias my template uses.

#### Acceptance Criteria

1. WHEN `SetupWizardFlow` renders the step content for a Step_Code equal to `services`, `services_offered`, or `treatment_services`, THE `SetupWizardFlow` SHALL render the same redirect card (with a "Go to Treatments Management" button linking to `/clinic-admin/settings/treatments`) that it already renders for `treatments_and_therapies` and `services_and_specialities`.
2. THE `SetupWizardFlow` SHALL resolve all six service-catalogue aliases (`treatments_and_therapies`, `services_and_specialities`, `services`, `services_offered`, `treatment_services`, and backend-audit additions) to the same redirect card in `renderStepContent`.
3. WHEN `SetupWizardFlow` renders the redirect card for any service-catalogue alias, THE `SetupWizardFlow` SHALL display the label "Treatments & Therapies" in the card heading regardless of which alias triggered the render.

---

### Requirement 3: Delete Unused TreatmentsAndTherapiesScreen

**User Story:** As a developer maintaining the onboarding module, I want the unused `TreatmentsAndTherapiesScreen.tsx` file removed, so that the codebase contains no dead code that could mislead future contributors.

#### Acceptance Criteria

1. THE codebase SHALL NOT contain the file `frontend/features/onboarding/presentation/pages/TreatmentsAndTherapiesScreen.tsx` after Phase 1 is merged.
2. WHEN the file is deleted, THE build and all existing tests SHALL pass without modification to any other source file (confirming no live import depended on it).

---

### Requirement 4: Backend Template Alias Audit

**User Story:** As a developer completing Phase 1, I want a documented audit of all Step_Code values returned by active onboarding templates, so that the alias maps in Phase 1 are complete and no clinic type is left with an unmapped step.

#### Acceptance Criteria

1. THE backend team SHALL provide a list of every distinct Step_Code that any active onboarding template can return for the service-catalogue category.
2. WHEN the audit result is received, THE developer SHALL add any newly discovered aliases to both `StepDetailScreen` and `SetupWizardFlow` before closing Phase 1.
3. THE audit result SHALL be recorded as a comment in the `redirectSteps` map and the `SetupWizardFlow` switch case so future reviewers understand the source of the alias list.

---

### Requirement 5: WizardDraftStore — Schema and Persistence

**User Story:** As a clinic admin filling out a multi-step onboarding wizard, I want my partial form entries saved locally as I type, so that if I close the app or navigate away I do not lose work in progress.

#### Acceptance Criteria

1. THE `WizardDraftStore` SHALL implement the following Zustand state slice. Note that `syncToStorage` and `hydrateFromStorage` are **not** part of the Zustand state slice — they are standalone async functions exported from the same module (see AC-4 and AC-5):
   ```typescript
   // Unified per-step draft entry — data and all metadata co-located to prevent orphan state
   interface DraftEntry {
     data: unknown;       // Form state for this step
     createdAt: number;   // Unix ms — set once on first setStepDraft call; never updated
     lastSavedAt: number; // Unix ms — updated on every setStepDraft call
   }

   // Zustand state slice — synchronous actions only
   interface WizardDraftStoreState {
     version: number;                          // Schema version — currently 1
     stepDrafts: Record<string, DraftEntry>;   // step_code → unified draft entry
     setStepDraft(stepCode: string, data: unknown): void;
     clearStepDraft(stepCode: string): void;
     reset(): void;
   }

   // Standalone async functions exported from wizard.store.ts — NOT part of the slice
   export async function syncWizardDraftToStorage(): Promise<void>;
   export async function hydrateWizardDraftFromStorage(): Promise<void>;
   ```
   **Rationale for unified `DraftEntry`:** Co-locating `data`, `createdAt`, and `lastSavedAt` in a single map entry eliminates the class of bugs where `stepDrafts[stepCode]` exists but `draftMetadata[stepCode]` is undefined (or vice versa). Callers never need defensive null-checks across two separate maps. The previous `draftMetadata` map is removed entirely. The async storage functions are kept outside the Zustand slice to comply with Requirement 22 AC-2.
2. THE `WizardDraftStore` SHALL be built with Zustand using both `immer` and `subscribeWithSelector` middleware, matching the conventions of the existing auth store.
3. WHEN `setStepDraft(stepCode, data)` is called, THE store SHALL update `stepDrafts[stepCode].data` and set `stepDrafts[stepCode].lastSavedAt` to `Date.now()` in a single atomic state mutation. IF `stepDrafts[stepCode]` does not yet exist, THE store SHALL initialise both `createdAt` and `lastSavedAt` to `Date.now()` in that same mutation.
4. WHEN `syncWizardDraftToStorage()` is called, IT SHALL read the current store state via `useWizardDraftStore.getState()` and write a JSON object containing `{ version, stepDrafts }` to `@react-native-async-storage/async-storage` under a stable, versioned, **tenant-scoped** key of the form `@novaclinics/{tenantId}/wizard_draft_v1`. The `tenantId` SHALL be obtained from the auth store via `useAuthStore.getState().tenantId` at call time. IF `tenantId` is unavailable (e.g. PROVISIONAL tenant before backend fix in Req 11), THE function SHALL derive a safe fallback key using the authenticated user's `userId` instead (`@novaclinics/user_{userId}/wizard_draft_v1`) and SHALL emit a `console.warn`.
5. WHEN `hydrateWizardDraftFromStorage()` is called and the stored data parses successfully, IT SHALL check the persisted `version` field. IF the persisted `version` matches the current schema version, IT SHALL call the store's synchronous actions to restore `stepDrafts` into memory. IF the persisted `version` does not match, IT SHALL first attempt to run `migrateDraft(persistedVersion, currentVersion)` — a pure function exported from `wizard.store.ts` that maps known old fields to new ones and returns a migrated payload. IF migration succeeds, the migrated payload SHALL be restored into the store. IF migration is not defined for that version pair or throws, the stored data SHALL be discarded, a warning SHALL be logged, and the function SHALL continue with empty drafts — it SHALL NOT crash or throw.
6. WHEN `hydrateWizardDraftFromStorage()` is called and the stored data is corrupted, fails JSON parsing, or throws any error during deserialization, THE function SHALL log the error with `console.error`, clear the corrupted AsyncStorage entry, and continue with empty drafts without crashing the app.
7. WHEN `syncWizardDraftToStorage()` throws for any reason (quota exceeded, disk full, storage unavailable), THE function SHALL catch the error, log it with `console.error`, emit a telemetry event (see Requirement 28), and return normally — it SHALL NOT re-throw, crash the UI, or block the user from continuing onboarding.
8. BEFORE calling `JSON.stringify` in `syncWizardDraftToStorage()`, THE function SHALL compute the byte size of the serialised payload. IF the payload exceeds `MAX_DRAFT_SIZE_KB` (default: 500 KB), THE function SHALL first attempt **lz-string compression**: compress the JSON string using `lz-string`'s `compressToUTF16` method and write `{ version, compressed: true, payload: <compressed string> }` to AsyncStorage instead of the raw object. IF the compressed payload is still larger than `MAX_DRAFT_SIZE_KB`, THE function SHALL skip the write entirely, emit an `onboarding_storage_sync_failed` telemetry event with `{ reason: 'draft_size_exceeded_after_compression', sizeKB }`, log a `console.warn`, and return normally without crashing. The `MAX_DRAFT_SIZE_KB` constant SHALL be defined at the top of `wizard.store.ts`. WHEN `hydrateWizardDraftFromStorage()` reads a persisted payload with `compressed: true`, IT SHALL decompress it using `lz-string`'s `decompressFromUTF16` before parsing.
9. THE `WizardDraftStore` SHALL export the named selector `selectStepDraft(stepCode)` that returns `stepDrafts[stepCode]?.data`, or `undefined` if absent.
10. THE `WizardDraftStore` SHALL export the named selector `selectStepDraftLastSavedAt(stepCode)` that returns `stepDrafts[stepCode]?.lastSavedAt ?? null`.
11. WHEN `reset()` is called, THE `WizardDraftStore` SHALL clear `stepDrafts`, reset `version` to the current schema version, and remove the persisted entry from AsyncStorage using the same tenant-scoped key described in AC-4.
12. THE `WizardDraftStore` module SHALL export a `migrateDraft(fromVersion: number, toVersion: number, payload: unknown): DraftPayload` pure function. For any version pair not explicitly handled, the function SHALL throw a `DraftMigrationError` so the caller can fall back to discard. A mapping table comment in the source SHALL document every version transition covered. **Migration note for v0→v1:** If a persisted payload uses the old split-map format (`stepDrafts: Record<string, unknown>` + `draftMetadata: Record<string, { lastSavedAt }>`) rather than unified `DraftEntry`, the migration function SHALL merge each pair into `{ data: stepDrafts[k], createdAt: draftMetadata[k]?.lastSavedAt ?? Date.now(), lastSavedAt: draftMetadata[k]?.lastSavedAt ?? Date.now() }` and return the unified structure.

---

### Requirement 6: WizardDraftStore — Step Screen Integration

**User Story:** As a clinic admin, I want each step screen to auto-save my input into the draft store as I type, so that my work is preserved even if I leave mid-form.

#### Acceptance Criteria

1. WHEN a user changes any field in `ClinicProfileScreen`, `OperatingHoursScreen`, `TreatmentRoomsScreen`, `StaffSetupScreen`, `BillingSetupScreen`, or `PaymentSetupScreen`, THE respective screen SHALL call `setStepDraft(stepCode, currentFormState)` via the `WizardDraftStore`, debounced by approximately 500 ms.
2. WHEN a step is submitted successfully, THE step screen SHALL call `clearStepDraft(stepCode)` to remove the no-longer-needed draft.
3. WHEN a step screen mounts and a draft exists in the `WizardDraftStore` for its Step_Code and the server-side data for that step is absent or stale, THE screen SHALL restore the form fields from the draft.
4. WHEN a screen restores form state from a draft on mount, THE screen SHALL display a non-dismissible inline indicator reading "Restored unsaved changes" until the user modifies a field or submits the form.
5. WHEN `SetupWizardFlow` mounts, THE `SetupWizardFlow` SHALL call `hydrateWizardDraftFromStorage()` in its mount effect before rendering step content.

---

### Requirement 7: Offline Banner Component

**User Story:** As a clinic admin using the wizard on an unreliable network, I want a clear non-blocking indicator when I am offline, so that I know my changes are being saved locally rather than submitted to the server.

#### Acceptance Criteria

1. THE `OfflineBanner` component SHALL be created at `frontend/features/onboarding/presentation/components/OfflineBanner.tsx`.
2. THE `OfflineBanner` SHALL use `@react-native-community/netinfo` to detect network connectivity.
3. WHEN the device is offline, THE `OfflineBanner` SHALL display the message "You're offline — changes saved locally."
4. WHEN the device is online, THE `OfflineBanner` SHALL not render any visible UI.
5. THE `OfflineBanner` SHALL use only values from `useClinicTheme()` for all colours and spacing — zero hardcoded values.
6. THE `OfflineBanner` SHALL be non-blocking: it must not prevent the user from scrolling, tapping, or interacting with the wizard content beneath it.

---

### Requirement 8: Offline CTA Gating and Mutation Flush

**User Story:** As a clinic admin, I want the wizard to prevent me from accidentally submitting forms when offline, and to automatically retry my pending submissions when connectivity is restored, so that no data is silently lost.

#### Acceptance Criteria

1. WHEN the device network state transitions to offline, `SetupWizardFlow` SHALL display the `OfflineBanner` and disable the "Next" and "Complete" call-to-action buttons.
2. WHEN the device network state transitions back to online, `SetupWizardFlow` SHALL hide the `OfflineBanner`, re-enable the call-to-action buttons, and flush any pending mutations that were queued during the offline period.
3. THE Axios client SHALL include a retry interceptor that automatically retries requests that fail with `ECONNRESET` or `ERR_NETWORK` errors, up to a maximum of 3 retry attempts using exponential back-off.
4. THE Axios retry interceptor SHALL NOT retry requests that receive a 4xx HTTP response code.
5. WHEN a flush attempt fails after all retries are exhausted, `SetupWizardFlow` SHALL surface an inline error message informing the user that the submission failed and prompting them to retry manually.
6. THE `PendingMutationStore` SHALL be a separate Zustand store (with `persist` middleware backed by AsyncStorage) defined at `frontend/features/onboarding/presentation/stores/pending-mutations.store.ts`. It SHALL hold a queue of serialisable pending mutation descriptors with the shape:
   ```typescript
   interface PendingMutation {
     id: string;              // UUID v4 — doubles as the Idempotency-Key
     stepCode: string;
     payload: unknown;
     enqueuedAt: number;      // Unix ms
     attemptCount: number;
   }
   interface PendingMutationStoreState {
     queue: PendingMutation[];
     enqueue(mutation: Omit<PendingMutation, 'id' | 'enqueuedAt' | 'attemptCount'>): void;
     dequeue(id: string): void;
     incrementAttempt(id: string): void;
     clearAll(): void;
   }
   ```
7. WHEN the app is killed while offline (AppState → `'background'` then process termination), THE `PendingMutationStore`'s persisted AsyncStorage entry SHALL survive the restart. WHEN the app is next launched and connectivity is available, `SetupWizardFlow` SHALL read any entries in `PendingMutationStore.queue` on mount and flush them before allowing new submissions.
8. WHEN a pending mutation is successfully flushed, THE `PendingMutationStore` SHALL call `dequeue(id)`. WHEN a flush fails permanently (all retries exhausted), THE store SHALL call `dequeue(id)` and surface the error per AC-5 above.
9. THE `PendingMutationStore` persistence key SHALL be tenant-scoped using the same `@novaclinics/{tenantId}/pending_mutations_v1` pattern defined for draft storage, ensuring mutations from one tenant are never visible to another on the same device.
10. THE `PendingMutationStore` SHALL define a `MAX_MUTATION_ATTEMPTS` constant (default: 5). WHEN `incrementAttempt(id)` causes `attemptCount` to reach or exceed `MAX_MUTATION_ATTEMPTS`, THE flush logic SHALL immediately call `dequeue(id)` (dead-letter the entry), surface an inline error message to the user (per AC-5), and emit an `onboarding_mutation_dead_lettered` analytics event containing `{ id, stepCode, attemptCount, tenantId }`. This prevents a corrupted or permanently-rejected queue entry from retrying indefinitely.
11. Pending mutations SHALL be flushed in **FIFO order** (by `enqueuedAt` ascending). The flush loop SHALL process one mutation at a time and SHALL NOT dispatch the next mutation until the current one has either succeeded or been dead-lettered. This ensures dependent onboarding steps are submitted in the correct sequence.

---

### Requirement 9: App Lifecycle — Background and Foreground

**User Story:** As a clinic admin who switches away from the app mid-form, I want my in-progress form data to be flushed to persistent storage immediately, so that returning to the app restores my exact state.

#### Acceptance Criteria

1. WHEN the React Native `AppState` transitions to `'background'`, `SetupWizardFlow` SHALL save the current step's form state to the `WizardDraftStore` via `setStepDraft` and then call `syncWizardDraftToStorage()`.
2. WHEN the React Native `AppState` transitions to `'active'`, `SetupWizardFlow` SHALL call `hydrateWizardDraftFromStorage()` and then trigger a refetch of the onboarding status query.
3. WHEN the status query returns after a foreground resume and the `visible_steps` array differs from the locally cached step list, `SetupWizardFlow` SHALL display an inline notice informing the user that the setup steps have been updated.

---

### Requirement 10: Android Back Button Intercept

**User Story:** As a clinic admin using an Android device, I want the hardware back button to navigate to the previous wizard step rather than exiting the wizard, so that I do not accidentally leave the onboarding flow and lose my progress.

#### Acceptance Criteria

1. WHEN a user presses the Android hardware back button while `SetupWizardFlow` is active, THE `SetupWizardFlow` SHALL call `setStepDraft` to save the current step's form state to the `WizardDraftStore` and then call `syncWizardDraftToStorage()`, before navigating to the previous wizard step via the existing `handlePrevious` function.
2. WHEN the Android hardware back button is pressed and `SetupWizardFlow` is on the first step (index 0), THE `SetupWizardFlow` SHALL consume the event and take no navigation action — it SHALL NOT exit the wizard.
3. THE `SetupWizardFlow` SHALL register a `BackHandler` listener that returns `true` to consume all hardware back button events while the component is mounted, preventing the default OS back behaviour.

---

### Requirement 11: Backend — Tenant Identity Fix

**User Story:** As a developer, I want the backend to include `tenant_id` in the `/auth/me` response for PROVISIONAL tenants, so that the frontend no longer needs per-request `X-Tenant-ID` header workarounds.

#### Acceptance Criteria

1. THE backend SHALL return a non-null `tenant_id` field in the `/auth/me` response body for tenants in the PROVISIONAL state.
2. WHEN the backend fix is deployed and verified, THE `onboarding.api.ts` file SHALL remove the `'X-Tenant-ID': tenantId` header from `getOnboardingStatusApi` and `submitStepDataApi`.
3. WHEN the `X-Tenant-ID` header workaround is removed, THE `console.warn` fallback branch in `ChoiceScreen.tsx` that references the missing `tenant_id` SHALL also be removed.
4. IF the backend has not yet deployed the fix, THEN THE `onboarding.api.ts` SHALL retain the existing `X-Tenant-ID` header and `console.warn` fallback with a TODO comment referencing this requirement.

---

### Requirement 12: Backend — Idempotency Keys on Mutating Requests

**User Story:** As a clinic admin on an unreliable connection, I want retried form submissions to be idempotent, so that a transient network failure never causes my step data to be saved twice or applied multiple times.

#### Acceptance Criteria

1. WHEN `submitStepDataApi` is called for a new user-initiated attempt, THE `onboarding.api.ts` SHALL generate a UUID v4 and send it as the `Idempotency-Key` request header.
2. WHEN `submitStepDataApi` is retried due to a network error (i.e. same user action, not a new user action), THE `onboarding.api.ts` SHALL reuse the same `Idempotency-Key` value that was generated for the original attempt.
3. WHEN `completeSetupApi` is called for a new user-initiated attempt, THE `onboarding.api.ts` SHALL generate a UUID v4 and send it as the `Idempotency-Key` request header, reusing it on retries of the same attempt.
4. THE backend SHALL honour the `Idempotency-Key` header on the `/api/v1/onboarding/{tenantId}/steps/{stepCode}` and `/api/v1/onboarding/{tenantId}/complete` endpoints, returning the cached response for duplicate requests with the same key.
5. WHEN a new user-initiated submit action begins (e.g. user taps "Next" again after a prior failure), THE frontend SHALL generate a fresh UUID v4 for the `Idempotency-Key`, discarding the previous key.
6. BEFORE shipping to production, THE team SHALL explicitly verify backend idempotency support by sending two identical `POST /steps/{stepCode}` requests with the same `Idempotency-Key` against a staging environment and confirming: (a) the second request returns the cached response without creating a duplicate record, (b) the onboarding status query after both requests shows the step completed exactly once. IF the backend does not yet honour the header, this SHALL be treated as a P0 blocker and tracked as an open item in the release checklist until confirmed resolved.

---

### Requirement 13: Demo/Live Transition Hooks and DemoStatusBanner Wiring

**User Story:** As a clinic admin in demo mode, I want the "Extend Demo" and "Go Live Now" buttons in the banner to perform real actions rather than being dead UI, so that I can manage my demo period and initiate the transition to a live account from within the onboarding wizard.

#### Acceptance Criteria

1. THE `useExtendDemoMutation` hook SHALL be implemented in `frontend/features/onboarding/data/repositories/` and SHALL call the existing `transitionDemoToLiveApi` (or a dedicated extend-demo endpoint when available) using the project's standard React Query mutation pattern.
2. THE `useTransitionToLiveMutation` hook SHALL be implemented in `frontend/features/onboarding/data/repositories/` and SHALL call `transitionDemoToLiveApi`.
3. WHEN `SetupWizardFlow` renders a PROVISIONAL tenant session, THE `SetupWizardFlow` SHALL render `DemoStatusBanner` and wire the `onExtendDemo` prop to `useExtendDemoMutation.mutate` and the `onTransitionToLive` prop to `useTransitionToLiveMutation.mutate`.
4. WHEN the user taps "Go Live Now" in `DemoStatusBanner`, THE `SetupWizardFlow` SHALL navigate to the `go_live_checklist` step rather than directly completing the transition, preserving the existing go-live checklist gate until the subscription flow is implemented.
5. WHEN `useExtendDemoMutation` or `useTransitionToLiveMutation` returns an error, THE `SetupWizardFlow` SHALL display an inline error message sourced from `useClinicTheme()` colours only.
6. WHERE the backend extend-demo endpoint is not yet implemented, THE `useExtendDemoMutation` hook SHALL call `transitionDemoToLiveApi` as a temporary stand-in and include a TODO comment referencing this requirement.

---

### Requirement 14: Theme Compliance

**User Story:** As a developer reviewing the hardening changes, I want all new UI to use `useClinicTheme()` for every colour and spacing value, so that the codebase remains consistent with the project's design-system convention.

#### Acceptance Criteria

1. THE `OfflineBanner` component SHALL contain zero hardcoded colour hex strings, RGB values, or numeric spacing constants.
2. THE inline notices added to `SetupWizardFlow` for draft restore, offline state, and step-update alerts SHALL obtain all colour and spacing values from `useClinicTheme()`.
3. THE `DemoStatusBanner` integration changes in `SetupWizardFlow` SHALL not introduce any hardcoded style values.
4. WHEN a code review identifies a hardcoded colour or spacing value in any file modified by this spec, THE developer SHALL replace it with the appropriate `useClinicTheme()` token before the PR is merged.

---

### Requirement 15: Test Coverage

**User Story:** As a developer maintaining the onboarding module, I want the hardening changes covered by automated tests, so that regressions are caught in CI without relying on manual testing.

#### Acceptance Criteria

1. THE `SetupWizardFlow.test.tsx` file SHALL include a test that verifies the `OfflineBanner` is rendered when the `netinfo` mock returns `isConnected: false` and is not rendered when `isConnected: true`.
2. THE `SetupWizardFlow.test.tsx` file SHALL include a test that verifies the "Next" CTA is disabled when `netinfo` reports offline and enabled when online.
3. THE `WizardDraftStore` SHALL have a dedicated test file that verifies `hydrateFromStorage()` does not throw when AsyncStorage contains corrupted JSON, and that after recovery the store returns an empty `stepDrafts` map.
4. THE `WizardDraftStore` test SHALL verify the round-trip property: FOR ALL valid `stepDrafts` maps, calling `syncToStorage()` followed by `reset()` followed by `hydrateFromStorage()` SHALL restore `stepDrafts` to the original value.
5. THE `SetupWizardFlow.test.tsx` file SHALL include a test that verifies pressing the Android back button (via `BackHandler` mock) when on a non-first step calls `handlePrevious` and does not call `router.back()` or `router.replace()`.
6. THE existing FR-097 tests in `SetupWizardFlow.test.tsx` SHALL continue to pass without modification after all Phase 1–4 changes are applied.

---

### Requirement 16: Server vs Local Draft Conflict Resolution (GAP 1)

**User Story:** As a clinic admin who resumes the wizard on one device after completing steps on another device, I want to be shown a clear choice between my locally-saved draft and the server's latest state, so that I never silently overwrite completed work with stale local data.

#### Acceptance Criteria

1. WHEN `SetupWizardFlow` resumes from the background (AppState `'active'`) and `hydrateFromStorage()` has restored a draft, THE `SetupWizardFlow` SHALL compare `stepDrafts[stepCode].lastSavedAt` (the per-step draft timestamp from `WizardDraftStore`) against the `updatedAtMs` field on the onboarding status DTO for the corresponding step. **All timestamp comparisons SHALL be performed using Unix millisecond integers.** The frontend SHALL convert the server's ISO-8601 `updated_at` string to Unix ms via `new Date(updated_at).getTime()` immediately upon receipt in the DTO mapping layer (`onboarding.dtos.ts`), storing it as `updatedAtMs: number`. No timezone arithmetic or string comparison SHALL be used for this comparison.
2. WHEN the server's `updated_at` is newer than `lastDraftSyncedAt`, THE `SetupWizardFlow` SHALL present a `DraftConflictModal` that offers the user two explicit actions: **"Use Latest"** (discard local draft, use server state) and **"Keep Local"** (retain draft, do not overwrite with server state).
3. WHEN the local `draftMetadata[stepCode].lastSavedAt` is newer than or equal to the server's `updated_at`, THE `SetupWizardFlow` SHALL silently prefer the local draft and not show the conflict modal.
4. WHEN the user selects **"Use Latest"** in the `DraftConflictModal`, THE `WizardDraftStore` SHALL call `clearStepDraft(stepCode)` and the step screen SHALL re-hydrate from the server response.
5. WHEN the user selects **"Keep Local"** in the `DraftConflictModal`, THE `WizardDraftStore` SHALL retain the existing draft and the step screen SHALL NOT re-hydrate from server data.
6. THE `DraftConflictModal` SHALL use only `useClinicTheme()` values and SHALL have `accessibilityRole="dialog"` and accessible labels on both action buttons.
7. THE backend's onboarding status response SHALL include a reliable `updated_at` (or `last_synced_at`) field per step so the frontend timestamp comparison in AC-1 is possible. If this field is absent, the frontend SHALL default to showing the conflict modal (conservative path).

---

### Requirement 17: Multi-Device Onboarding Validation (GAP 2)

**User Story:** As a clinic admin who uses the setup wizard on two devices simultaneously, I want the wizard to always reflect the most recent server state, so that a step completed on Device A is visible on Device B without requiring a manual refresh.

#### Acceptance Criteria

1. WHEN a step is marked complete on any device, the server SHALL update `per_step_validation[stepCode].status` and `completed_steps` atomically before returning a response.
2. WHEN `SetupWizardFlow` receives a fresh onboarding status response (via `refetch`), THE component SHALL update `steps` state to reflect the server's `per_step_validation` values regardless of any locally-held draft state.
3. WHEN a step's server-side `status` transitions to `'completed'` and the local draft for that step is still present, THE `WizardDraftStore` SHALL automatically call `clearStepDraft(stepCode)` on the next hydration cycle, as the step is no longer pending.
4. THE go-live eligibility check (`is_ready_to_go_live`) SHALL be evaluated exclusively from the server response — the frontend SHALL NOT gate the Go Live action on locally-computed progress.
5. AN integration test SHALL verify the following scenario: Device A mock submits a step, the status query is refetched, Device B mock renders `SetupWizardFlow` with the updated query result, and the completed step is shown with `status: 'completed'` — confirming server state propagates correctly.

---

### Requirement 18: Pending Payment Recovery (GAP 3)

**User Story:** As a clinic admin who force-closes the app during the subscription payment flow, I want the app to detect and surface the pending payment verification on next launch, so that I can resume and complete the payment without having to restart from scratch.

#### Acceptance Criteria

1. WHEN `SetupWizardFlow` mounts for a PROVISIONAL tenant, THE component SHALL check whether a `subscription_payment` step exists in `visible_steps` and its server-side `status` is `'in_progress'` or `'pending_verification'`.
2. WHEN a pending payment verification is detected on mount, THE `SetupWizardFlow` SHALL display an inline recovery banner with the message sourced from `i18n` and a "Resume Payment" CTA, instead of silently proceeding to the next incomplete step.
3. THE `onboarding.api.ts` SHALL expose a `getPendingSubscriptionVerificationApi(tenantId)` function that calls `GET /api/v1/subscription/{tenantId}/pending-verification`. If this endpoint does not yet exist, the function SHALL be a stub that returns `null` and includes a TODO comment referencing this requirement.
4. WHEN the "Resume Payment" CTA is tapped, THE `SetupWizardFlow` SHALL navigate to the `subscription_payment` step in the wizard and pass the existing `verification_id` as a param if available.
5. IF the subscription/payment flow is confirmed as out of scope for the current onboarding implementation, THIS requirement SHALL be explicitly documented as deferred with a reference to the Phase 6 subscription spec.

---

### Requirement 19: Storage Security Audit — AsyncStorage vs SecureStore (GAP 4 — P0 Security)

**User Story:** As a security-conscious developer, I want a documented decision on which data is stored in AsyncStorage versus SecureStore, so that sensitive billing and payment data is never written to unencrypted device storage.

#### Acceptance Criteria

1. THE developer SHALL audit every key written by the onboarding module to `@react-native-async-storage/async-storage` and document each key's data classification (non-sensitive / sensitive) in a comment adjacent to the storage call.
2. WHEN the audit identifies any key whose value contains billing data, payment method tokens, subscription identifiers, or personally-identifiable financial information, THAT key SHALL be migrated to `expo-secure-store` before the spec is closed.
3. THE `WizardDraftStore` MAY use AsyncStorage for `stepDrafts` only if the draft data for billing and payment steps is confirmed to contain no sensitive fields (e.g. only partial form state such as a billing address label, not card numbers or tokens). If billing/payment draft data IS sensitive, those step codes SHALL be excluded from AsyncStorage persistence.
4. AN entry in `SECURITY.md` (or an equivalent project-level security notes file) SHALL document the storage decision for each onboarding data category.

---

### Requirement 20: Error Message Centralisation (GAP 5)

**User Story:** As a clinic admin encountering an error during onboarding, I want error messages to be consistent, human-readable, and free of raw backend strings, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. THE onboarding module SHALL use a centralised error-mapping utility (e.g. `onboardingErrors.ts` or the project-level `errorMessages.ts` if it exists) to translate known backend error codes into user-facing strings.
2. WHEN any `catch` block in an onboarding screen or hook receives an API error, IT SHALL pass the error through the centralised mapping utility before displaying it to the user.
3. THE centralised mapping SHALL cover at minimum: network failures, 401/403 authentication errors, 409 conflict errors on step submission, 422 validation errors from step data, and 500 server errors.
4. NO raw backend error `message`, `detail`, or `error` field SHALL be shown directly to the user — all such strings SHALL be substituted with localised, user-friendly equivalents from the mapping utility.
5. Unmapped errors SHALL fall back to a generic localised message (e.g. "Something went wrong. Please try again.") rather than exposing internal details.

---

### Requirement 21: Theme Compliance — Zero Hardcoded Values (GAP 6 — P0)

**User Story:** As a developer reviewing any onboarding PR, I want a documented checklist that prohibits hardcoded design values, so that the onboarding feature remains fully compatible with future theme changes.

#### Acceptance Criteria

1. EVERY file modified or created by this spec SHALL pass a grep audit that finds zero occurrences of: hex colour strings (e.g. `#2F6F4E`), RGB/RGBA literals, hardcoded spacing/sizing numeric style values (e.g. `padding: 16`, `marginTop: 8`), hardcoded font size literals (e.g. `fontSize: 14`), and hardcoded border-radius values. The following are explicitly permitted and SHALL NOT be flagged: `flex: 1`, `zIndex` values, `minHeight: 44` / `minWidth: 44` (accessibility touch-target constants), and animation timing values.
2. THE PR checklist for every onboarding change SHALL include the item: "Ran grep for hardcoded colours/spacing — zero matches in modified files."
3. The existing files `SetupWizardFlow.tsx`, `StepDetailScreen.tsx`, and all step screens modified in Phase 2 SHALL be backfilled to replace any hardcoded values that currently exist with `useClinicTheme()` tokens as part of the PR that introduces the Phase 2/3 changes.
4. THE `OfflineBanner`, `DraftConflictModal`, and any new inline notice components SHALL be reviewed against this rule before merge.

---

### Requirement 22: Zustand Architecture Compliance (GAP 7 — P0)

**User Story:** As a developer, I want the `WizardDraftStore` to follow the project's established Zustand conventions exactly, so that the store behaves predictably and is safe to use with React's concurrent rendering.

#### Acceptance Criteria

1. THE `WizardDraftStore` SHALL use both `immer` middleware (for immutable state updates) and `subscribeWithSelector` middleware (for fine-grained subscription), applied in the same order as the existing auth store.
2. THE `WizardDraftStore` Zustand state slice SHALL NOT contain any `async` function. All async operations (`syncWizardDraftToStorage`, `hydrateWizardDraftFromStorage`) SHALL be implemented as standalone exported `async` functions in the same module that call synchronous Zustand store actions internally via `useWizardDraftStore.getState()`.
3. THE exported named selectors (`selectStepDraft`, `selectStepDraftLastSavedAt`) SHALL be pure selector functions that accept the store state as their argument and return a derived value — they SHALL NOT be hooks.
4. WHEN the store is used in a component, ALL subscriptions SHALL go through the `useWizardDraftStore(selector)` hook pattern — no component SHALL call `getState()` or `setState()` directly.
5. A code review SHALL verify that no store action performs a `router.push`, API call, or side-effectful operation beyond synchronous state mutation. Side effects are permitted only in the standalone `syncWizardDraftToStorage` and `hydrateWizardDraftFromStorage` functions.

---

### Requirement 23: Hook and Service Architecture Compliance (GAP 8)

**User Story:** As a developer, I want the onboarding module's hooks, services, and stores to respect the project's Clean Architecture layering rules, so that the codebase remains maintainable and testable.

#### Acceptance Criteria

1. STORES SHALL contain only: synchronous state mutations, the two explicitly-permitted async storage functions (`syncToStorage`, `hydrateFromStorage`), and named selectors. Stores SHALL NOT import React hooks, React Query, or Axios.
2. SERVICE FUNCTIONS (in `data/datasources/`) SHALL contain only: Axios calls, DTO mapping, and error normalisation. They SHALL NOT import React hooks or Zustand stores.
3. REPOSITORY HOOKS (in `data/repositories/`) SHALL own React Query setup (`useQuery`, `useMutation`), call service functions, and handle invalidation. They SHALL NOT import Zustand stores directly.
4. PRESENTATION HOOKS (in `presentation/hooks/`) SHALL orchestrate repository hooks and stores. They SHALL NOT call service functions directly.
5. QUERY KEYS for the onboarding feature SHALL be defined in a single centralised location (already present in `onboarding.repository.impl.ts` as `onboardingKeys`). No new query key string SHALL be hard-coded inline in a component.
6. AN architecture review SHALL be performed against all files added or modified by this spec before merge, verifying compliance with AC 1–5 above.

---

### Requirement 24: Internationalisation Coverage (GAP 9)

**User Story:** As a Hindi-speaking clinic admin, I want all new onboarding UI strings to be available in my language, so that the app is fully usable in both English and Hindi.

#### Acceptance Criteria

1. EVERY user-visible string introduced by this spec — including `OfflineBanner` messages, `DraftConflictModal` labels, "Restored unsaved changes" indicators, "Your setup progress was updated" notices, payment recovery banners, and inline error messages — SHALL have a corresponding key in both `locales/en.json` and `locales/hi.json`.
2. NO new component introduced in Phases 2–4 SHALL contain a hardcoded string literal that is displayed to the user. All such strings SHALL be accessed via the project's i18n utility (e.g. `t('onboarding.offlineBanner.message')`).
3. THE `locales/hi.json` translations for new keys SHALL be reviewed by a Hindi-literate team member before the feature is released. Until review is complete, the keys SHALL fall back to English equivalents and SHALL be flagged with a `// TODO: Hindi review` comment.
4. Keys added for this spec SHALL follow the existing namespacing convention (e.g. `onboarding.*`) and SHALL NOT use generic keys that collide with keys from other features.

---

### Requirement 25: Accessibility Compliance (GAP 10 — P2)

**User Story:** As a clinic admin using assistive technologies, I want the new onboarding components to be fully accessible, so that I can complete the setup wizard regardless of how I interact with my device.

#### Acceptance Criteria

1. THE `OfflineBanner` SHALL have `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"` so that screen readers announce it when it appears.
2. THE `DraftConflictModal` SHALL have `accessibilityRole="dialog"` and each action button ("Use Latest", "Keep Local") SHALL have a descriptive `accessibilityLabel` that communicates the full consequence of the action.
3. THE "Go Live Now" button in `DemoStatusBanner`, the "Next" and "Previous" navigation buttons in `SetupWizardFlow`, and any new CTA buttons introduced by this spec SHALL have a minimum touch target of 44 × 44 logical pixels.
4. WHEN a CTA button is disabled (e.g. during offline state), IT SHALL set `accessibilityState={{ disabled: true }}` so screen readers announce the disabled state.
5. THE payment recovery banner introduced in Requirement 18 SHALL have `accessibilityRole="alert"` and the "Resume Payment" CTA SHALL have an `accessibilityLabel` that includes the pending step name.

---

### Requirement 26: Duplicate Submission Locking (Missing Req D — P0)

**User Story:** As a clinic admin with slow connectivity, I want the wizard to prevent me from triggering multiple concurrent submissions by tapping "Next" or "Complete" rapidly, so that duplicate API calls are never made regardless of the idempotency-key protection at the network layer.

#### Acceptance Criteria

1. WHEN a step submission mutation (`useSubmitStepMutation`) is in the `isPending` state, THE `SetupWizardFlow` SHALL disable the "Next" CTA button and set `accessibilityState={{ disabled: true }}` on it.
2. WHEN `useCompleteSetupMutation` is in the `isPending` state, THE `SetupWizardFlow` SHALL disable the "Complete" and "Go Live" CTA buttons.
3. WHEN `useTransitionToLiveMutation` is in the `isPending` state, THE `DemoStatusBanner`'s "Go Live Now" button SHALL be disabled and show a loading indicator.
4. WHEN any of the above mutations is pending, THE disabled CTA SHALL display a loading spinner or activity indicator in place of its normal label, so the user has visual confirmation that their action was received.
5. A UNIT TEST SHALL verify that rapid successive calls to the "Next" handler while `isPending` is `true` do not call `submitStepDataApi` more than once.
6. WHEN `SetupWizardFlow` dispatches a step submission, IT SHALL generate a `submissionId` (UUID v4) and store it in local component state before firing the mutation. WHEN the mutation's `onSuccess` or `onError` callback fires, IT SHALL compare the callback's associated `submissionId` against the component's current `submissionId`. IF they differ (i.e. the user navigated away and back, triggering a new submission cycle), THE callback SHALL be a no-op and SHALL NOT update UI state or navigate. This prevents stale responses from a previous request from clobbering a newer submission in flight.
7. THE `submissionId` SHALL be reset (new UUID generated) each time the user explicitly initiates a new submission attempt (i.e. taps "Next" when `isPending` is `false`).
8. THE submit → refetch → next-step flow SHALL be verified to work reliably under both fast and slow network conditions. Specifically: after `useSubmitStepMutation` resolves successfully, `SetupWizardFlow` SHALL call `refetch()` on the onboarding status query, wait for the refetch to complete, and only then advance to the next step. THE wizard SHALL NOT advance step index before the refetch resolves, to prevent the UI from showing an outdated step list. An integration test SHALL confirm this ordering: submit → refetch response received → `currentStepIndex` increments.

---

### Requirement 27: Query Invalidation Rules (Missing Req E — P1)

**User Story:** As a developer, I want every mutating operation in the onboarding module to invalidate the correct React Query cache entries, so that the UI always reflects the latest server state after any mutation completes.

#### Acceptance Criteria

1. WHEN `useSubmitStepMutation` resolves successfully, ITS `onSuccess` callback SHALL call `queryClient.invalidateQueries({ queryKey: onboardingKeys.status(tenantId) })`.
2. WHEN `useCompleteSetupMutation` resolves successfully, ITS `onSuccess` callback SHALL call `queryClient.invalidateQueries({ queryKey: onboardingKeys.all })` to refresh all onboarding-related queries.
3. WHEN `useExtendDemoMutation` resolves successfully, ITS `onSuccess` callback SHALL invalidate both `onboardingKeys.status(tenantId)` and `onboardingKeys.demo(tenantId)` (or the equivalent demo-status query key).
4. WHEN `useTransitionToLiveMutation` resolves successfully, ITS `onSuccess` callback SHALL invalidate `onboardingKeys.all` and trigger a session refresh so the JWT reflects the tenant's new lifecycle state.
5. NO query invalidation SHALL use `queryClient.invalidateQueries()` without a scoped `queryKey` — broad cache-wide invalidation is prohibited unless a specific requirement justifies it.
6. AN integration test SHALL verify that after a step is submitted, a subsequent render of `SetupWizardFlow` with the refetched query shows the updated `per_step_validation[stepCode].status`.

---

### Requirement 28: Analytics and Audit Events (Missing Req F — P1)

**User Story:** As a support engineer investigating an onboarding issue, I want structured analytics events for all critical onboarding transitions, so that I can reconstruct the exact sequence of user actions that led to a problem.

#### Acceptance Criteria

1. THE onboarding module SHALL emit a structured analytics/audit event for each of the following transitions:
   - `onboarding_step_started` — when the user navigates to a step for the first time
   - `onboarding_step_completed` — when `useSubmitStepMutation` succeeds
   - `onboarding_draft_restored` — when a draft is restored from the `WizardDraftStore` on mount
   - `onboarding_draft_conflict_shown` — when the `DraftConflictModal` is presented
   - `onboarding_draft_conflict_resolved` — when the user selects "Use Latest" or "Keep Local", including which option was chosen
   - `onboarding_offline_submission_queued` — when a form submission is attempted while offline
   - `onboarding_submission_retry` — when the Axios retry interceptor retries a failed request
   - `onboarding_go_live_clicked` — when the user taps "Go Live Now"
   - `onboarding_payment_resume_clicked` — when the user taps "Resume Payment" in the recovery banner
   - `onboarding_storage_sync_failed` — when `syncToStorage()` throws (see Req 5 AC-7)
2. EACH event SHALL include at minimum: `tenantId`, `stepCode` (where applicable), `timestamp` (ISO-8601), and a `sessionId` (a UUID generated once per `SetupWizardFlow` mount).
3. THE analytics emission SHALL use the project's existing analytics/telemetry utility. If no utility exists, a stub module (`analytics.ts`) SHALL be created under `frontend/core/analytics/` that logs events to `console.log` in development and is wired to a real provider in production.
4. Analytics calls SHALL NOT be on the critical path — all emissions SHALL be fire-and-forget and SHALL NOT block UI interactions or await resolution.

---

### Requirement 29: Backend Contract — Mandatory `updated_at` Per Step (Missing Req G — P0)

**User Story:** As a developer implementing draft conflict resolution, I want the backend to guarantee a reliable per-step `updated_at` timestamp in every onboarding status response, so that the frontend conflict comparison is always possible without falling back to showing the conflict modal on every resume.

#### Acceptance Criteria

1. THE `/api/v1/onboarding/{tenant_id}/status` response SHALL include an `updated_at` timestamp (ISO-8601) within each entry in `per_step_validation`, representing the last time the server updated that step's validation state.
2. THE `updated_at` field SHALL be present and non-null for every step returned in `per_step_validation`, regardless of step status (`not_started`, `in_progress`, `completed`, `blocked`).
3. THE `OnboardingStatusResponse` TypeScript DTO in `onboarding.dtos.ts` SHALL be updated to include `updated_at: string` in the `StepValidationDTO` interface.
4. UNTIL the backend deploys this contract change, THE frontend's `DraftConflictModal` logic (Requirement 16) SHALL treat a missing `updated_at` as the conservative case: show the conflict modal rather than silently preferring either version.
5. WHEN the backend contract change is deployed, THE conservative-fallback path in AC-4 SHALL be tested to confirm it is no longer triggered in normal operation — the fallback SHALL remain in the code but SHALL emit a `console.warn` when it fires, so future regressions are visible.

---

### Requirement 30: Tenant-Scoped Draft and Mutation Storage (Data Isolation)

**User Story:** As a clinic admin sharing a device with another clinic admin from a different tenant, I want my onboarding drafts and queued mutations to be completely isolated from theirs, so that logging into a different account never exposes, loads, or overwrites data belonging to a different tenant.

#### Acceptance Criteria

1. ALL AsyncStorage keys written by the onboarding module — including `WizardDraftStore` and `PendingMutationStore` — SHALL include `tenantId` in the key path, following the pattern `@novaclinics/{tenantId}/{store_name}_v{version}` (e.g. `@novaclinics/tenant_abc123/wizard_draft_v1`).
2. WHEN a user logs out, THE logout handler SHALL call `WizardDraftStore.reset()` and `PendingMutationStore.clearAll()` for the outgoing tenant, then remove all AsyncStorage keys belonging to that tenant before the session is cleared. Because AsyncStorage does not support wildcard deletion, the implementation SHALL use the following explicit sequence: `AsyncStorage.getAllKeys()` → filter keys matching the prefix `@novaclinics/{outgoingTenantId}/` → `AsyncStorage.multiRemove(filteredKeys)`. This ensures no residual data is accessible to the next session.
3. WHEN a user authenticates as a different tenant (account switch), THE `SetupWizardFlow` mount effect SHALL load only the AsyncStorage keys scoped to the newly authenticated `tenantId`. It SHALL NOT read or display any data from keys belonging to a different tenant.
4. WHEN `tenantId` is unavailable at storage-write time (e.g. PROVISIONAL tenant pending backend fix from Req 11), THE storage key SHALL fall back to `@novaclinics/user_{userId}/{store_name}_v{version}` as specified in Req 5 AC-4, and a `console.warn` SHALL be emitted. This fallback key SHALL be cleared on logout in the same manner as AC-2.
5. A UNIT TEST SHALL verify the isolation property: given a mock AsyncStorage with entries for `tenantId: 'A'` and `tenantId: 'B'`, mounting `SetupWizardFlow` authenticated as tenant `'A'` SHALL result in `WizardDraftStore.stepDrafts` containing only tenant A's data — no tenant B entries SHALL appear.
6. THE `PendingMutationStore` flush logic SHALL read `tenantId` from the auth store before constructing the storage key, ensuring mutations enqueued during a previous tenant session are never submitted under a new tenant's identity.
7. AN explicit **tenant-switching integration test** SHALL be added covering the full round-trip: (a) Tenant A authenticates and saves a draft; (b) Tenant A logs out — all `@novaclinics/A/*` keys are removed; (c) Tenant B authenticates — `WizardDraftStore.stepDrafts` is empty; (d) Tenant B logs out; (e) Tenant A re-authenticates — Tenant A's draft is NOT restored (because it was cleared in step b). This test SHALL be the canonical coverage for tenant-leakage regression, given that draft leakage across accounts is a severe production issue.

---

### Requirement 31: Draft Expiry

**User Story:** As a clinic admin who started onboarding months ago and never completed it, I want stale draft data discarded automatically when I re-open the wizard, so that I am never presented with obsolete form state from a previous onboarding attempt that is no longer relevant.

#### Acceptance Criteria

1. THE `DraftEntry` interface already includes `createdAt: number` and `lastSavedAt: number` as defined in Requirement 5 AC-1. No additional interface change is needed for expiry support.
2. WHEN `hydrateWizardDraftFromStorage()` processes a restored draft entry, IT SHALL compare `Date.now()` against `stepDrafts[stepCode].lastSavedAt`. IF `lastSavedAt` is older than `DRAFT_EXPIRY_DAYS` (default: 30 days, expressed as `30 * 24 * 60 * 60 * 1000` ms), THE entry SHALL be discarded: `clearStepDraft(stepCode)` SHALL be called in-memory and the affected key SHALL be removed from the persisted payload before writing back to AsyncStorage. Entries that pre-date the `DraftEntry` migration (i.e. were written under the old split-map schema) SHALL be treated as having `lastSavedAt = Date.now()` after migration to avoid immediate expiry.
3. WHEN one or more draft entries are discarded due to expiry during hydration, THE function SHALL emit an `onboarding_draft_expired` analytics event containing `{ tenantId, expiredStepCodes: string[], oldestDraftAgeMs: number }`.
4. THE `DRAFT_EXPIRY_DAYS` constant SHALL be defined at the top of `wizard.store.ts` and SHALL be overridable via a remote config flag, so the expiry window can be adjusted without a mobile release.
5. Draft expiry SHALL apply per step independently — a draft for `clinic_profile` that was saved yesterday SHALL be retained even if a draft for `billing_setup` is 31 days old and discarded.
6. WHEN all drafts for a tenant are expired and discarded during hydration, THE `WizardDraftStore` SHALL call `reset()` and remove the AsyncStorage entry entirely, rather than persisting an empty payload.
7. A UNIT TEST SHALL verify that a draft with `lastSavedAt` older than `DRAFT_EXPIRY_DAYS` is not present in the store after `hydrateWizardDraftFromStorage()` completes, and that a draft with `lastSavedAt` within the window is correctly retained.

---

### Requirement 32: End-to-End Release Verification

**User Story:** As the release owner, I want a documented pass/fail verification of the complete onboarding flow across all critical configurations before any production deployment, so that regressions in the core path are caught before real clinics encounter them.

#### Acceptance Criteria

1. THE following four test runs SHALL be executed and recorded as pass/fail before the onboarding hardening work is declared release-ready. Each run SHALL be performed by a human tester on a physical or emulated device (not just unit tests), and the results SHALL be logged in the release checklist:

   **Run A — Demo clinic, Android, fast network**
   - Create a new demo clinic from `ChoiceScreen`
   - Complete all onboarding steps in order through `SetupWizardFlow`
   - Confirm each step: submit → status refetches → next step advances correctly
   - Reach `go_live_checklist` and confirm `is_ready_to_go_live: true`

   **Run B — Real (direct-setup) clinic, Android, fast network**
   - Same as Run A but using the direct setup path (not demo)
   - Confirm `tenant_id` is present in the JWT after tenant creation

   **Run C — Android physical device, slow/throttled network (3G equivalent)**
   - Throttle network to ~1 Mbps using Android developer options or Charles Proxy
   - Complete at minimum: `clinic_profile` step → submit → confirm step advances without double-submission
   - Tap "Next" rapidly during a slow submission — confirm button is disabled after first tap
   - Confirm `Idempotency-Key` header is present in the request (inspect via network proxy)
   - Confirm the status refetch completes before the wizard advances to the next step (no premature step jump)

   **Run D — Android physical device, intermittent connectivity (offline → online)**
   - Complete `clinic_profile` step fields
   - Toggle airplane mode ON before tapping "Next"
   - Confirm `OfflineBanner` appears and "Next" is disabled
   - Toggle airplane mode OFF
   - Confirm the submission proceeds and the step advances correctly on reconnect
   - Confirm no duplicate step submission occurs (check backend logs or idempotency response)

2. EACH run SHALL explicitly verify the **submit → refetch → next-step ordering**: the step index SHALL NOT increment until the onboarding status query has returned a fresh response after the submission. If the status refetch is still in-flight when `Next` is tapped, the wizard SHALL wait for it to complete rather than advancing on stale data.

3. WHEN any of the four runs fails, THAT failure SHALL block the release. The fix SHALL be implemented, re-verified in the failing run, and all four runs SHALL be re-executed from scratch to confirm no regression was introduced.

4. THE release checklist SHALL include the following explicit sign-off items alongside the automated test results:
   - [ ] Backend confirmed to honour `Idempotency-Key` on step submission (Req 12 AC-6)
   - [ ] Duplicate submission tested: rapid "Next" taps produce exactly one API call (Req 26 AC-5)
   - [ ] Submit → refetch → next-step flow verified on slow network — no premature step advance (Req 26 AC-8)
   - [ ] All four E2E runs (A–D above) passed on physical Android hardware

5. IF a physical Android device is not available for Runs C and D, THE team SHALL use the Android Emulator with network throttling enabled in the AVD settings. Emulator results are acceptable but MUST be noted as such in the release checklist.

---

## E6 Constitutional Product Contract — Draft Conflict and Multi-Clinic Recovery

This contract governs Requirements 9, 11, 16, 17, and 29–32. Where the earlier
timestamp-only comparison wording in Requirements 16 and 29 conflicts with this
contract, this contract is the approved successor. It changes no implementation
status.

### Authority and invariants

1. The backend SHALL be the sole authority for accepted onboarding step state,
   completion, current Journey Visibility identity, and the concurrency revision
   of each visible step. A local draft is non-authoritative user input until an
   authorized backend mutation accepts it.
2. Each visible step SHALL have a backend-issued, non-null, opaque revision and
   a non-null UTC `updated_at`. The revision is the concurrency authority;
   `updated_at` is user-facing freshness evidence and SHALL NOT be the sole
   overwrite guard. Both SHALL change atomically with an authoritative step
   state/content change. The client SHALL never synthesize either value.
3. A step without a persisted progress row, including `not_started`, SHALL still
   receive a backend-authoritative revision and timestamp tied to the current
   projection. The backend owns how that identity is maintained or derived.
4. Accepted mutations capable of replacing step state SHALL be validated against
   the current backend revision. A stale, missing, unknown, or cross-scope
   revision SHALL fail closed without changing authoritative state.
5. Drafts SHALL be scoped to the authenticated user, organization, effective
   tenant, Journey Visibility identity, and stable step code. A draft SHALL
   never be read, displayed, compared, or submitted in another scope.

### Conflict and recovery lifecycle

1. A conflict exists only when a valid local draft was based on an older backend
   revision and the current backend step is still eligible for editing. A local
   timestamp alone SHALL NOT establish that the draft is safe to overwrite.
2. Completed, retired, hidden, or no-longer-applicable server steps SHALL win
   without an overwrite choice. Their stale local drafts SHALL be removed from
   active use and SHALL NOT restore or submit.
3. For an editable conflicting step, the user SHALL receive two explicit,
   localized, accessible choices:
   - **Use Latest** discards the local draft for that scope and displays the
     current server state.
   - **Keep Local** preserves the draft for continued editing but does not write
     it to the server. Any later submission SHALL revalidate against the latest
     server revision and may surface another conflict.
4. Missing, invalid, unsupported, or unavailable revision evidence SHALL preserve
   the local draft, prevent submission, and present a safe retryable recovery
   state. It SHALL NOT silently choose either version.
5. Conflict detection, user choice, revalidation, successful resolution, and
   failed recovery SHALL be auditable without storing draft contents or other
   sensitive values in analytics/audit metadata.

### Multi-device and multi-clinic behavior

1. Devices do not synchronize local drafts with one another. They converge only
   through fresh backend-authoritative state and revision evidence.
2. A successful step mutation SHALL atomically update its authoritative state,
   completion, revision, and timestamp before the response is visible to any
   device. Other devices SHALL treat the next fresh response as authoritative.
3. Effective-tenant switching and logout SHALL cancel or invalidate outgoing
   onboarding reads, unload in-memory drafts, complete the approved outgoing
   draft cleanup, and only then load the new scope. Stale responses from the
   outgoing scope SHALL be rejected.
4. Recovery SHALL remain specialty-agnostic and compatible with multiple clinics
   per organization. Organization membership never grants permission to read a
   different clinic's local or server onboarding state without effective-tenant
   authorization.

### Responsibilities and prohibitions

- The backend owns authoritative revisions/timestamps, atomic state transitions,
  stale-write rejection, tenant authorization, and safe typed failures.
- The frontend owns local draft persistence, scope binding, conflict and recovery
  presentation, user choice, refresh/revalidation requests, and outgoing-scope
  cleanup. It does not decide authoritative freshness.
- The authenticated user owns only the explicit choice for an editable conflict;
  the user cannot override completed, retired, hidden, unauthorized, or
  cross-tenant server state.
- Silent last-write-wins, client clock authority, timestamp-string comparison,
  frontend-generated revisions, cross-tenant caches, automatic stale-draft
  submission, raw server errors, and draft-content telemetry are forbidden.

---

### Requirement 33: Capability-Driven Journey Visibility (E4/TG21)

**User Story:** As a person preparing a clinic workspace, I want the Review &
Personalize journey to show only the setup steps that apply to the clinic's
authoritative enabled capabilities, so that setup stays relevant without
embedding specialty or clinic-type rules in the client.

#### Constitutional Ownership

1. THE Journey Template SHALL own the ordered set of journey steps and their
   stable step identities.
2. THE Capability Registry SHALL own capability definitions and capability
   lifecycle.
3. THE Backend Journey Visibility Projection SHALL be the only component that
   maps Journey Template steps to authoritative tenant capability state.
4. THE frontend SHALL render the backend projection and SHALL NOT derive, own,
   substitute, or repair step-to-capability visibility.

#### Acceptance Criteria

1. THE authoritative projection identity SHALL be the pair
   `(template_version, capability_revision)`.
2. A projection SHALL remain valid only while both its `template_version` and
   `capability_revision` match the current authoritative values. A change to
   either value SHALL require backend recalculation before the replacement
   projection is served.
3. FOR identical tenant input and identical
   `(template_version, capability_revision)`, THE backend projection SHALL
   return the same visible steps and deterministic order.
4. WHEN a step's required capability is unknown, unavailable, disabled,
   unsupported, or missing, THE backend SHALL omit that step from visibility.
   The frontend SHALL NOT substitute visibility or infer a fallback mapping.
5. WHEN the Journey Template or Capability Registry changes during active
   onboarding, THE active session SHALL continue against its current complete
   projection until the backend detects the version mismatch and atomically
   supplies a recalculated projection. The frontend SHALL NOT combine values
   from different projection identities.
6. WHEN a recalculated projection retains a stable step identity, THE backend
   SHALL preserve valid completed progress for that step. Removed steps SHALL
   become retired; newly applicable steps SHALL enter as incomplete. The
   frontend SHALL perform no progress or draft migration logic.
7. THE backend SHALL own visibility calculation, ordering, projection DTO
   generation, typed errors, revision validation, transaction boundaries, and
   rollback. THE frontend SHALL own projection rendering only.
8. THE projection SHALL remain tenant-scoped and SHALL NOT expose or reuse
   capability state, progress, ordering, or projection identity across tenants.
9. TG21 acceptance SHALL include backend and frontend regression evidence for
   template-version changes, capability-revision changes, deterministic
   projection, unknown-capability fail-closed behavior, reordered and removed
   step progress preservation, tenant isolation, and absence of frontend
   capability-mapping logic.

---

### Requirement 34: Ready-to-Start Checklist and Readiness Explanation (E5/TG22)

**User Story:** As an Organization Owner, Organization Admin, or Clinic
Administrator preparing a clinic, I want one plain-language, authoritative
checklist that explains whether the effective clinic is ready and where I can
resolve each blocker, so that I never have to infer readiness from visited
screens, card completion, or local wizard state.

#### Constitutional ownership

1. THE backend Ready-to-Start application composition SHALL be the sole
   aggregate readiness authority. It SHALL compose, but SHALL NOT replace, the
   evidence owned by the applicable domain providers.
2. THE TG21 Journey Visibility Projection SHALL supply the applicable ordered
   setup-step set; existing onboarding progress/validation SHALL own setup-step
   evidence; TG20 Workspace Preparation SHALL own workspace-preparation
   evidence. Commercial activation remains outside TG22.
3. THE frontend SHALL render the complete backend result only. Route visits,
   Journey Card state, locally persisted drafts, and client calculations SHALL
   never establish Ready-to-Start.
4. THE application composition SHALL resolve the authenticated organization and
   effective tenant, verify their active association, and require existing
   tenant RBAC (`tenant.read`) without an `is_org_admin` bypass.

#### Provider and checklist contract

5. EACH provider result SHALL contain a stable provider identifier and version,
   applicability, evidence revision and observed timestamp, outcome
   (`SATISFIED`, `BLOCKER`, or `ADVISORY`), severity, safe localized explanation
   token, and zero or one safe next action. Raw records, contact values,
   capability internals, and provider exceptions SHALL NOT be exposed.
6. Version 1 SHALL compose exactly these domain-owned inputs:
   `journey_setup_progress` from TG21 plus onboarding validation and
   `workspace_preparation` from TG20. A missing required provider or an
   incomplete provider response SHALL fail closed. Additional providers require
   an additive contract revision.
7. EACH checklist item SHALL contain a stable item identifier, title token,
   explanation token, status (`COMPLETE`, `BLOCKED`, `ADVISORY`, `EVALUATING`,
   `UNKNOWN`, `UNAVAILABLE`, or `STALE`), blocker/advisory classification,
   evidence timestamp, source provider, order, applicability, item version, and
   zero or one next action.
8. A next action SHALL use a stable identifier and one of the bounded Version 1
   kinds `NAVIGATE`, `REFRESH`, `RETRY`, or `CONTACT_SUPPORT`. It SHALL identify
   an approved existing owner/route, require fresh effective-tenant validation,
   and expose no action when an owner is missing or stale. TG22 SHALL NOT create
   a general Journey Action Execution engine.

#### Aggregate state and blocker semantics

9. THE aggregate state SHALL be one of `READY`, `NOT_READY`, `EVALUATING`,
   `UNKNOWN`, `UNAVAILABLE`, or `STALE`:
   - `READY`: every applicable required provider returned a complete current
     result and no blocker exists; advisories may coexist;
   - `NOT_READY`: evaluation is complete and at least one blocker exists;
   - `EVALUATING`: a request-driven evaluation is in progress and no readiness
     claim is available;
   - `UNKNOWN`: required evidence or provider applicability cannot be determined;
   - `UNAVAILABLE`: a required provider or aggregate evaluation is unavailable;
   - `STALE`: the returned identity no longer matches current authoritative
     provider/evidence revisions.
10. ONLY `READY` SHALL authorize Ready-to-Start confirmation or handoff. `UNKNOWN`,
    `UNAVAILABLE`, `STALE`, partial results, provider failures, and unsupported
    versions SHALL fail closed.
11. `BLOCKER` prevents `READY`; `ADVISORY` is informational and may coexist with
    `READY`. Items SHALL be deduplicated by `(provider_id, item_id)`, ordered by
    blocker before advisory, provider order, item order, then stable item ID.
    Conflicting results from the same identity SHALL make the aggregate
    `UNAVAILABLE`. Version 1 provides no readiness override.

#### Refresh, versioning, errors, and safety

12. Evaluation SHALL be request-driven. Initial view, explicit refresh,
    successful blocker-resolution return, application foreground, and effective
    tenant change SHALL request a fresh complete evaluation. Logout and tenant
    switch SHALL cancel and remove the outgoing tenant cache.
13. Providers MAY evaluate independently, but the backend SHALL publish only a
    complete aggregate. Partial provider success SHALL NOT be returned as
    readiness. Version 1 adds no background worker or provider cache; existing
    domain stores remain authoritative.
14. Readiness identity SHALL be
    `(readiness_contract_version, tenant_id, journey_projection_identity,
    provider_set_revision, evidence_revision)`. The backend composition owns
    the contract and provider-set revisions; TG21 owns journey projection
    identity; providers own their evidence revisions. Any member change requires
    recalculation and invalidates cached frontend results.
15. Safe typed failures SHALL cover organization unavailable, effective tenant
    unavailable, authorization denied, provider unavailable, unsupported
    contract version, stale result, provider configuration error, and aggregate
    evaluation failure. Raw exceptions and evidence SHALL never cross transport.
16. State-changing next actions remain owned, authorized, transacted, and
    audited by their existing domain services; this read-only readiness
    composition SHALL NOT mutate provider state.

#### Localization, accessibility, and acceptance

17. Titles, explanations, statuses, errors, and action labels SHALL use
    localization tokens with `en-US`/`hi-IN` key and placeholder parity. Copy
    SHALL use plain operational language and SHALL NOT expose provider,
    capability, revision, or database terminology.
18. Loading/evaluating SHALL expose busy semantics; unavailable and blocking
    state changes SHALL use appropriate alert/live-region semantics; checklist
    order SHALL equal focus order; actions SHALL expose role, label, disabled
    state, and compliant touch targets; no meaning SHALL rely only on color.
    Layout SHALL support font scaling and longer Hindi text.
19. TG22 acceptance SHALL prove deterministic aggregation, domain ownership,
    fail-closed unknown/partial/provider-failure behavior, blocker/advisory
    distinction, tenant and organization isolation, RBAC, approved action
    owners, empty/loading/stale/unavailable/not-ready/ready states,
    localization/accessibility/security leakage, multi-clinic switching, TG18–
    TG21 regressions, and defined rollback to the prior read-only journey
    experience. TG22 SHALL NOT activate a trial, subscription, payment, or
    commercial lifecycle.

#### Version 1 provider-specific readiness policy

20. `journey_setup_progress` SHALL evaluate exactly the current TG21 projected
    steps. The template owner's `setupsteps[].optional` field SHALL be the sole
    required/optional authority: absent or `false` means required and `true`
    means optional. Version 1 has no informational-step template value;
    introducing one requires an additive template/readiness contract revision.
21. A required visible incomplete step SHALL produce `BLOCKED`/`BLOCKER` and
    prevent `READY`. An optional visible incomplete step SHALL produce
    `ADVISORY`/`ADVISORY` and SHALL NOT prevent `READY`. Completed required and
    optional steps SHALL remain visible as `COMPLETE` with no classification or
    action. Non-projected and hidden steps SHALL be omitted; retired steps SHALL
    remain governed by TG21 and SHALL NOT re-enter the current checklist.
22. Existing validation severity `blocker` SHALL map to
    `BLOCKED`/`BLOCKER`; existing severity `warning` SHALL map to
    `ADVISORY`/`ADVISORY`. No other severity is accepted in Version 1. A missing
    or malformed validation `error_key`, unknown severity, unavailable evidence,
    or stale TG21 identity SHALL fail closed without raw validation text.
23. Setup item IDs SHALL be `journey_setup_progress.step.<step_code>` and
    validation item IDs SHALL be
    `journey_setup_progress.validation.<step_code>.<error_key>`. IDs SHALL use
    authoritative codes only. They SHALL NOT use titles, translated text,
    routes, database IDs, or frontend state. Current computed setup evidence
    SHALL use the evaluation timestamp as its evidence timestamp; that timestamp
    SHALL NOT enter an evidence-revision hash.
24. `workspace_preparation` SHALL emit one provider-owned current-state item,
    not one item per TG20 unit. Supported state mapping SHALL be:
    `PENDING → NOT_READY/BLOCKED/BLOCKER`,
    `PREPARING → EVALUATING/EVALUATING/BLOCKER`,
    `PERSONALIZATION_AVAILABLE → READY/COMPLETE/no classification`,
    `RETRYABLE_FAILURE → NOT_READY/BLOCKED/BLOCKER`, and
    `TERMINAL_FAILURE → NOT_READY/BLOCKED/BLOCKER`.
    A missing run SHALL be `NOT_READY/BLOCKED/BLOCKER`; unsupported or unknown
    contract/state SHALL be `UNKNOWN/UNKNOWN/BLOCKER`; stale evidence SHALL be
    `STALE/STALE/BLOCKER`; an unavailable query SHALL use the typed
    `readiness.provider_unavailable` failure. Partial TG20 unit progress SHALL
    follow its authoritative enclosing state and SHALL NOT become another state.
25. The workspace item ID SHALL remain `workspace_preparation.workspace` for
    every supported lifecycle state. Typed exceptional items, when a complete
    safe result exists, SHALL use `workspace_preparation.system.missing`,
    `.unknown`, `.stale`, or `.unavailable`. Its evidence timestamp SHALL be the
    TG20 `updated_at`. Its evidence revision SHALL canonically include safe
    semantic TG20 identity/state/version/progress/retry/unit-version inputs and
    SHALL exclude timestamps, correlation IDs, raw reasons, and evidence payloads.
26. Aggregate state precedence SHALL be `STALE`, `UNAVAILABLE`, `UNKNOWN`,
    `EVALUATING`, `NOT_READY`, then `READY`. Only two complete, applicable,
    current Version 1 provider results with no blocker may yield `READY`.
    Both Version 1 providers are required and applicable after authoritative
    effective-tenant resolution; false/unknown applicability is a fail-closed
    provider-configuration/`UNKNOWN` condition. Provider exceptions and missing
    providers SHALL return a safe typed application failure and no partial
    aggregate. Conflicting duplicate item values SHALL yield `UNAVAILABLE`;
    identical duplicates collapse by `(provider_id, item_id)`.
27. Checklist status/classification SHALL be exact:
    `COMPLETE → none`, `ADVISORY → ADVISORY`, and `BLOCKED`, `EVALUATING`,
    `UNKNOWN`, `UNAVAILABLE`, or `STALE → BLOCKER`. Blockers sort before
    advisories, then provider order, provider item order, and item ID.
28. Version 1 SHALL allow only these descriptors: setup navigation
    (`readiness.navigate_setup_step`, `NAVIGATE`, owner `setup_wizard`, target
    `setup_step.<step_code>`, `tenant.read`); readiness refresh
    (`readiness.refresh`, `REFRESH`, owner `ready_to_start`, no target,
    `tenant.read`); workspace navigation/start handoff
    (`readiness.open_workspace_preparation`, `NAVIGATE`, owner
    `workspace_preparation`, target `onboarding.workspace_preparation`,
    `tenant.read`); and TG20 retry (`readiness.retry_workspace_preparation`,
    `RETRY`, owner `workspace_preparation`, target
    `workspace_preparation.retry`,
    `onboarding.workspace_preparation.manage`). Every action requires fresh
    effective-tenant validation. Arbitrary URLs, unknown owners/targets, stale
    actions, and frontend-supplied targets SHALL be rejected. No
    `CONTACT_SUPPORT` action SHALL be emitted until a dedicated owner exists.
29. Backend outputs SHALL use safe localization tokens under
    `onboarding.progressive_experience.ready_to_start.providers.<provider>`.
    Step tokens SHALL be keyed by authoritative step code; validation tokens by
    validated `error_key`; workspace tokens by approved state/failure class.
    Version 1 permits no interpolation. Missing tokens or `en-US`/`hi-IN`
    parity failure SHALL fall back to the generic localized unavailable token,
    omit actions, and fail acceptance; raw keys, reasons, exceptions, provider
    jargon, and capability jargon SHALL never be presented.

### E7 Offline Mutation Recovery Constitutional Contract

#### Version 1 scope and queueable operation

1. E7 SHALL provide durable recovery only for the existing onboarding step
   submission operation identified as `onboarding.step.submit.v1`.
2. A queueable record SHALL target one current Journey-visible step through the
   existing onboarding step datasource/repository boundary. It SHALL contain the
   existing step submission body, an existing opaque E6 expected revision and
   projection identity, and one frontend-generated idempotency key.
3. The step submission body SHALL pass a versioned per-step field allowlist
   before persistence. Version 1 SHALL permit only JSON onboarding-configuration
   fields already accepted by that step contract. Credentials, authentication
   tokens, verification evidence, contact values, payment or banking data,
   clinical/patient payloads, files/blobs, raw errors, and unknown fields SHALL
   NOT be queued.
4. Clinic Entry, organization/tenant creation or association, setup completion,
   workspace preparation start/retry, readiness actions, ownership/contact
   verification, trial, subscription, payment, billing, dunning, and every
   clinical mutation SHALL NOT be queueable in Version 1.
5. Arbitrary HTTP methods, URLs, headers, operation names, and unknown step
   contracts SHALL be rejected. E7 SHALL NOT create a generic request queue.
6. When connectivity is known offline, existing CTA gating SHALL prevent a new
   submission. E7 enqueue is permitted only after a user submission began while
   connectivity was online or indeterminate and then failed with an eligible
   transient transport outcome.

#### Single retry authority and outcomes

7. The E7 replay coordinator SHALL be the sole retry authority for a persisted
   mutation. Axios or any other transport layer SHALL perform zero independent
   automatic retries for that queued attempt.
8. A queued attempt SHALL have at most four executions: the original execution
   plus three replays. Replay backoff SHALL be 2, 4, then 8 seconds after
   connectivity is confirmed. Time spent offline SHALL not consume an attempt.
9. Network loss, `ERR_NETWORK`, `ECONNRESET`, timeout without an authoritative
   response, and safe 5xx typed failures SHALL be retryable. User cancellation,
   app backgrounding, logout, tenant switch, or executor cancellation SHALL not
   consume an attempt.
10. Validation, authentication/authorization denial, tenant/organization
    mismatch, malformed or unsupported response, idempotency conflict, and
    non-E6 4xx failures SHALL terminate automatic replay.
11. An E6 stale/missing/projection revision conflict SHALL enter
    `CONFLICT_BLOCKED`, preserve the safe intent, and delegate to E6 refresh and
    explicit Use Latest/Keep Local recovery. It SHALL never automatically
    replace the captured revision or overwrite newer state.

#### Durable record and isolation

12. The Version 1 durable record SHALL contain only: schema version; mutation
    ID; operation ID; authenticated user ID; organization ID; effective tenant
    ID; step code; allowlisted step body; opaque E6 revision and projection
    identity; idempotency key; lifecycle state; enqueue/update/expiry
    timestamps; attempt count; next-attempt time; and safe failure category.
13. Lifecycle states SHALL be `PENDING`, `REPLAYING`, `CONFLICT_BLOCKED`,
    `MANUAL_ACTION_REQUIRED`, `SUCCEEDED`, `DISCARDED`, and `EXPIRED`.
14. Records SHALL use the existing tenant/user-scoped local-storage boundary
    with Version 1 schema validation. Unknown schema versions, corruption,
    missing scope identity, prohibited fields, or failed migration SHALL fail
    closed, never replay, preserve no unrestricted payload, and surface a safe
    localized recovery notice.
15. Pending records expire seven days after enqueue and become `EXPIRED`;
    terminal records may be retained for acknowledgement for at most 30 days.
    Expiry SHALL be visible and telemetered. Silent deletion is forbidden.
16. Tenant switch SHALL cancel execution and evict the outgoing queue from
    memory/cache; its durable records remain inaccessible and suspended under
    their original user/organization/tenant scope until that exact scope
    returns or they expire. Logout/account removal SHALL delete that user's
    durable queue. Authorization loss SHALL enter
    `MANUAL_ACTION_REQUIRED` and prevent replay.

#### Replay, locking, and duplicate safety

17. Enqueue SHALL validate operation, scope, payload allowlist, current Journey
    visibility, E6 evidence, and a non-empty idempotency key before one atomic
    durable write. Duplicate mutation IDs or identical active operation/scope/
    idempotency identities SHALL collapse to one record.
18. Replay SHALL be FIFO by `(enqueued_at, mutation_id)` within one effective
    tenant. Exactly one mutation per tenant may execute at a time. A
    process-local claim/lock SHALL prevent concurrent foreground, reconnect, or
    restart executors from replaying the same record.
19. Restart, confirmed reconnect, and foreground resume SHALL request replay.
    Before every execution the coordinator SHALL refresh and verify the
    authenticated user, organization, Effective Tenant, authorization, Journey
    visibility, current step eligibility, and E6 revision/projection evidence.
20. A successful authoritative response SHALL update/invalidate the existing
    onboarding query family, remove the durable record atomically, and announce
    recovery. Failed deletion SHALL leave a safely replayable idempotent record.
21. User cancellation SHALL stop only the in-flight local executor and retain
    the record. It SHALL NOT cancel or reverse a backend command whose
    authoritative outcome is unknown; the next replay SHALL reuse the same
    idempotency key to resolve that outcome.

#### Dead letter and manual recovery

22. Exhausted attempts, validation/authorization/unsupported terminal outcomes,
    and unresolved malformed responses SHALL enter
    `MANUAL_ACTION_REQUIRED`. E6 conflicts use `CONFLICT_BLOCKED`.
23. Manual actions SHALL be limited by outcome: refresh authority; reopen and
    edit the owning step; retry after fresh validation; discard with explicit
    confirmation; or use an existing support route when one is available.
    Unsupported actions SHALL not be shown.
24. Manual retry SHALL revalidate all scope, authorization, visibility, payload,
    and E6 evidence and SHALL create a fresh execution cycle while preserving
    the original mutation identity and idempotency key. Editing creates a new
    user attempt with a new mutation/idempotency identity after the old intent
    is explicitly discarded or resolved.
25. Infinite retry, silent deletion, cross-tenant transfer, background
    overwrite, and automatic conflict resolution are forbidden.

#### Ownership, telemetry, experience, and rollback

26. The backend SHALL remain authoritative for replay acceptance,
    authorization, organization/tenant isolation, idempotency, transaction,
    audit, mutation state, E6 conflict detection, and safe typed failures.
27. The frontend SHALL own only the non-authoritative durable intent,
    allowlisted persistence, single replay coordinator, safe presentation, and
    calls through existing datasource/repository/query boundaries. A second
    backend replay engine, second idempotency service, alternate tenant
    authority, duplicate repository family, or new generic API is forbidden.
28. The onboarding application telemetry boundary SHALL own fire-and-forget
    events for enqueue, replay started/succeeded/failed, conflict blocked,
    manual recovery, discard, expiry, and terminal outcome. Events SHALL contain
    only mutation/operation IDs, safe scope identifiers, attempt count, safe
    category, duration, and connectivity state; payloads, contact/clinical/
    payment data, tokens, evidence, and raw errors are forbidden. If no external
    provider is configured, a safe no-op adapter SHALL preserve product flow.
29. All queue, retry, conflict, terminal, and recovery copy SHALL have `en-US`
    and `hi-IN` key/placeholder parity. Presentation SHALL use central Theme,
    existing loading/error primitives, live-region announcements, deterministic
    focus, disabled/busy state, non-color meaning, 44×44 minimum touch targets,
    font scaling, and hardware-back behavior that cannot dismiss an unresolved
    decision silently.
30. Schema evolution SHALL be additive with explicit pure migrations. Legacy or
    unknown records SHALL never replay until validated/migrated. Rollout SHALL
    enable typed backend/idempotency support before queue enablement.
    Disablement SHALL stop enqueue/replay while retaining valid scoped records;
    rollback SHALL return to offline gating without executing or transferring
    retained intents.
31. Acceptance SHALL cover allowlist/prohibited data, schema migration and
    corruption, FIFO/locking/concurrent triggers, restart/reconnect/foreground,
    retry taxonomy/backoff/exhaustion, idempotency, E6 conflicts, Effective
    Tenant/authorization/Journey refresh, tenant switch/logout, dead-letter
    actions, localization/accessibility/Theme, telemetry leakage, rollback,
    TG18–TG23 regressions, and Requirement 32 device/staging evidence.

### E8 Commercial Trial Constitutional Requirements

`E8-CONSTITUTIONAL-DECISIONS.md` is the approved Product and Architecture
authority for E8. The following requirements are frozen:

1. The trial SHALL be a clinic-scoped commercial entitlement. Ready to Start
   SHALL establish `ELIGIBLE` only and SHALL NOT start the trial. The clinic MAY
   remain eligible indefinitely until an authorized actor explicitly confirms
   Start Trial.
2. The backend SHALL own the immutable trial identity, policy, server-UTC clock,
   commercial configuration, lifecycle, persistence, scheduled transitions,
   authorization, audit, transactions, concurrency, retries, rollback, and
   versioned typed APIs. The frontend SHALL never be commercial authority.
3. The Trial Lifecycle SHALL be `ELIGIBLE` → `ACTIVE` → derived `EXPIRING` →
   `EXPIRED` and SHALL end at `EXPIRED`. The separate Commercial Retention
   Lifecycle SHALL begin after expiry and SHALL be `SUSPENDED` → `ARCHIVED` →
   `DELETED`. This conceptual separation SHALL preserve the approved behavior
   while keeping E8 trial authority distinct from future E9 subscription
   authority. Extension SHALL return the same immutable trial to `ACTIVE`,
   SHALL NOT create a second trial, and SHALL change only the authoritative end
   timestamp.
4. Super Admin SHALL be platform commercial authority. Organization Admin SHALL
   be customer commercial authority and MAY activate or request an extension.
   Clinic Admin SHALL have no commercial authority and SHALL NOT activate,
   approve extension, or override commercial state.
5. Activation SHALL require `trial.activate`, current authoritative
   Ready-to-Start evidence, `ELIGIBLE` state, effective-tenant and organization
   authority, and explicit confirmation. The backend SHALL record immutable
   evidence and SHALL make activation idempotent and concurrency-safe.
6. Newly activated E8 trials SHALL use a configuration-driven default of 30
   consecutive days. Configuration changes SHALL affect future activations
   only. Existing active trials SHALL retain their agreed duration.
7. Super Admin alone SHALL approve manual extensions. Each extension SHALL be
   no more than 30 days and SHALL record a business reason, approval channel,
   approver, timestamp, and audit evidence. Organization Admin MAY request an
   extension. There SHALL be no constitutional count limit on Super
   Admin-approved extensions.
8. Retention defaults SHALL be configuration-driven: 90 days `SUSPENDED`, 90
   days `ARCHIVED`, and seven days final deletion notice. During retained
   states, Organization Admin MAY view backend-authoritative commercial status,
   retention timing, restoration and deletion eligibility, hold awareness, and
   allowed commercial actions. Normal application mutations SHALL be blocked.
   `ARCHIVED` SHALL mean an archived workspace whose data remains retained by
   policy; it SHALL NOT mean an artifact repository, export library, filesystem,
   or object-storage catalog.
9. Commercial Retention MAY expose whether a Workspace Data Export request is
   permitted, but SHALL NOT own export requests, generation, packages,
   metadata, retrieval, download, expiry, audit, storage, or export lifecycle.
   Export SHALL be an action, not a commercial, archive, retention, or runtime
   state. Deletion SHALL wait for an approved export already in progress to
   complete or reach its governed timeout. Commercial deletion SHALL NOT bypass
   legal hold, regulatory preservation, or mandatory statutory retention;
   commercial policy SHALL NOT override legal obligations.
   After `DELETED`, operational customer data SHALL be unavailable and
   unrecoverable subject to legal-retention obligations outside the operational
   platform.
10. Super Admin MAY restore a retained trial through an approved extension.
    Paid subscription handoff SHALL belong to E9. Workspace Data Export SHALL
    be a separate future bounded capability. E8 SHALL NOT implement
    subscription, payment, invoicing, dunning, legal-retention policy,
    secure-deletion infrastructure, export formats, or export-package
    lifecycle.
11. Existing paid organizations and seven-day trials SHALL retain their terms.
    No existing trial or Demo state SHALL restart or convert automatically.
    Ambiguous legacy organizations SHALL require governed review. The new
    30-day policy SHALL apply only to newly activated E8 trials.
12. The frontend SHALL present backend-authoritative commercial and retention
    state through existing Clean Architecture, repository/datasource, React
    Query, Theme, localization, and accessibility boundaries. It SHALL NOT
    calculate commercial policy, expiry, entitlement, retention, or authority.
13. Commercial state SHALL remain organization/tenant isolated and SHALL NOT
    alter authorization, clinical ownership, or clinical truth.
14. Version 1 TG26.5 presentation SHALL use the E8-owned Commercial Retention
    destination at `/onboarding/commercial-retention`. It MAY present only
    backend-authoritative workspace status, archived date, retention end,
    restoration eligibility, permanent-deletion eligibility, extension
    eligibility, legal/statutory hold awareness, allowed commercial actions,
    and localized informational support guidance. It SHALL NOT present
    downloadable artifacts, export packages, archive files, retained-record
    collections, or an export-package lifecycle.
15. `Request Workspace Data Export` SHALL be a governed handoff to the future
    Workspace Data Export capability only when Commercial Retention says the
    request is permitted. TG26.5 SHALL NOT claim that an export request,
    package, retrieval, or download exists. Missing or unavailable future
    capability authority SHALL fail closed with localized informational
    presentation. Exact export content and all export lifecycle behavior remain
    future Workspace Data Export decisions.
16. Version 1 support SHALL be a deferred informational capability. TG26.5
    SHALL NOT invent an in-app route, external URL, email address, phone number,
    provider, or support request. It MAY present localized support guidance
    without an enabled navigation action. A future governed support owner MUST
    define any navigable handoff.
17. Before E9 exists, the subscription action SHALL be a deferred
    informational action. TG26.5 SHALL NOT navigate to billing, pricing, or
    payment, and SHALL NOT claim that a subscription request was persisted.
    Future E9 SHALL own its destination and may consume a typed handoff carrying
    organization ID, effective tenant ID, commercial-trial ID, aggregate
    version, and contract version.
18. An extension reason SHALL be mandatory trimmed free text. It SHALL contain
    1 through 160 characters after trimming, SHALL map unchanged after trimming
    to the existing `reason` transport field, and SHALL use localized labels,
    guidance, and validation. Guidance SHALL prohibit clinical details,
    patient information, credentials, payment data, and other sensitive
    content.
19. `approval channel` SHALL mean the provenance of the extension request or
    approval interaction, not an approval state. Version 1 values SHALL be
    `IN_APP_REQUEST`, `SUPPORT`, `SALES`, or `CUSTOMER_SUCCESS`.
    Organization Admin requests SHALL submit the Product-defined
    `IN_APP_REQUEST` without a user-selectable control. Super Admin direct
    grants SHALL select the verified offline channel from `SUPPORT`, `SALES`,
    or `CUSTOMER_SUCCESS`. Unknown values SHALL fail closed in TG26.5
    presentation. Product owns the vocabulary; the backend retains existing
    authorization, bounded transport validation, persistence, and audit
    ownership; the frontend localizes presentation but SHALL NOT translate the
    submitted value.

The former retained-artifact and archive-content assumptions are superseded.
Commercial Retention is not an artifact domain. No TG26 task may invent export
content, package state, retrieval behavior, or storage integration.

These requirements constitutionally authorize TG26 only. They do not authorize
TG27 or redefine E9.

## Requirements Governance and Current-State Authority

Requirement numbers 1–34 are permanent. This file remains the authority for
product intent and acceptance criteria; it is not an execution ledger. Current
implementation, verification, roadmap, design, and Task Group ownership are
governed by `requirements-traceability-matrix.md`, with `tasks.md` retaining the
execution record.

As reconciled after TG18–TG22, the requirements inventory is:

- 11 `COMPLETE`;
- 19 `PARTIALLY COMPLETE`;
- 3 `NOT STARTED`;
- 1 `SUPERSEDED`.

Requirement 13 is the sole superseded requirement. Its direct Demo/Live
mutation and Demo Mode contract was replaced by the accepted E5 Ready-to-Start
contract in Requirement 34 and by the approved E8 commercial-trial ownership in
TG26. Its reusable non-commercial status/navigation intent survives through
those contracts; the obsolete mutation behavior is not an implementation gap.
The original wording is retained above as historical evidence and must not be
implemented independently.

E1–E3 were delivered from their approved constitutional requirement and design
documents before numbered Requirements 33 and 34 established the later E4/E5
pattern. They are not renumbered or duplicated here. Their acceptance and
implementation ownership is mapped explicitly in the RTM. E6–E12 remain owned
by their existing numbered requirements and roadmap destinations; no future
Task Group may treat roadmap prose alone as sufficient implementation
authorization.

### Documentation Governance Model v1.0

The mandatory, non-duplicating authority chain is:

```text
requirements.md
↓
design.md
↓
requirements-traceability-matrix.md
↓
tasks.md
```

- `requirements.md` records approved product intent and acceptance criteria.
- `design.md` records approved implementation design and architecture.
- `requirements-traceability-matrix.md` records implementation fulfillment,
  ownership, status, and evidence.
- `tasks.md` records execution and acceptance history.

Product intent may be changed only here through approval. A Task Group must not
use the RTM, design, or execution ledger to create or redefine a requirement.
Every future constitutional approval for TG23–TG31 must update all four
authorities consistently before implementation is authorized.
