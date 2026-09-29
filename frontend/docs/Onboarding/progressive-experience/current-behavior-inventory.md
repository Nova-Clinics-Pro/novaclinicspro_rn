# Progressive Experience Current Behavior Inventory

Date: 2026-07-11

## Purpose

This inventory records the audited `origin/dev` onboarding behavior at the recovery checkpoint. It is planning evidence only and does not authorize implementation.

## Frontend `origin/dev`

Commit audited:

```text
45c13b04 Merge branch 'test' into dev
```

Verified onboarding behavior:

- Shared service-catalogue alias constant exists for Treatments & Services routing.
- `StepDetailScreen` maps service-catalogue aliases to `/clinic-admin/settings/treatments`.
- `SetupWizardFlow` renders the Treatments redirect card for service-catalogue aliases.
- The unused `TreatmentsAndTherapiesScreen.tsx` file is absent from onboarding.
- `SetupWizardFlow` prevents duplicate Next submissions with pending/submission guards.
- Frontend step submission forwards `Idempotency-Key` when provided.
- `SetupWizardFlow` awaits onboarding status `refetch()` before advancing.
- Onboarding submit mutation invalidates onboarding status query.
- Android hardware back is intercepted inside `SetupWizardFlow`.
- English Progressive Experience copy uses Prepare/Ready to Start/commercial trial language in the audited keys.

Partial or unresolved frontend behavior:

- Hindi Progressive Experience keys exist but contain English placeholder values.
- Legacy demo/sample-clinic code remains for compatibility and is not part of target onboarding.
- Full verification commands were not run during the documentation-governance task.

## Backend `origin/dev`

Commit audited:

```text
9dba7d1 Implement R4 treatment state ownership backend
```

Verified onboarding API surfaces:

- `/api/v1/onboarding/{tenant_id}/status`
- `/api/v1/onboarding/{tenant_id}/steps/{step_code}`
- `/api/v1/onboarding/{tenant_id}/complete`
- `/auth/me` schema includes `tenant_id` when available.
- Subscription status and checkout routes exist for tenant subscriptions.

Unverified backend areas:

- Backend onboarding idempotency could not be verified from the audited `origin/dev` code and requires explicit confirmation or implementation.
- Staging tenant resolution for onboarding/provisional tenants and live tenants is not recorded.
- Cross-tenant submission safety with JWT tenant ID plus `X-Tenant-ID` compatibility requires focused verification.

## Branch State

- Frontend `origin/feature/progressive-experience-phase-1` exists but must not be reused because it is stale and contains unrelated Doctor/clinical changes relative to `origin/dev`.
- Backend has no visible onboarding feature branch.
- New recovery work must use clean paired branches named `feature/progressive-experience-recovery`.
