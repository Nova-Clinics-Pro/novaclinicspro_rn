# TG20 Requirements — Workspace Preparation

Status: **Proposed constitutional requirements for E3**

These requirements are subordinate to the Product Architecture, Platform
Foundation Architecture, Phase 2 roadmap, and ADR-PF-003 through ADR-PF-018.

## Vocabulary

- **Preparation:** backend-owned work required before personalization may begin.
- **Preparation run:** one versioned, tenant-scoped execution/lifecycle record.
- **Personalization available:** preparation has completed sufficiently to enter
  the existing Progressive Experience; it is not TG22 Ready to Start.
- **Retry:** server-authorized re-execution after a retryable failure.
- **Stale:** a response whose tenant, run, version, or request generation is no
  longer current for the UI.

## Mandatory functional requirements

| ID | Requirement |
|---|---|
| TG20-FR1 | After TG19 handoff, the product shall query authoritative preparation state for the effective tenant. |
| TG20-FR2 | The backend shall expose exactly one current preparation projection per effective tenant, including contract version, run ID, state, progress meaning, safe reason, retry eligibility, next action, and timestamps. |
| TG20-FR3 | The Version 1 state vocabulary shall be `PENDING`, `PREPARING`, `PERSONALIZATION_AVAILABLE`, `RETRYABLE_FAILURE`, and `TERMINAL_FAILURE`; unknown values shall fail safe. |
| TG20-FR4 | Progress shall come from authoritative completed/total preparation units or be explicitly indeterminate; the frontend shall not synthesize percentage or time remaining. |
| TG20-FR5 | `PERSONALIZATION_AVAILABLE` shall be the only state that authorizes handoff to personalization. |
| TG20-FR6 | A retry shall be accepted only for the current effective tenant/run in `RETRYABLE_FAILURE`, and shall use organization/tenant-scoped idempotency. |
| TG20-FR7 | Retry replay shall return the authoritative result; mismatched key reuse shall return a typed conflict. |
| TG20-FR8 | The user shall receive localized loading, pending, preparing, success, retryable, terminal, stale, unsupported, and transport-failure guidance. |
| TG20-FR9 | Query refresh shall use backend hints and bounded React Query policy; it shall stop on terminal or handoff-eligible state. |
| TG20-FR10 | Tenant switch/logout shall cancel queries, reject stale responses, clear tenant-sensitive preparation state, and reuse accepted Platform Foundation cleanup. |
| TG20-FR11 | Every request shall resolve authenticated organization membership and effective tenant server-side; route tenant mismatch shall be rejected. |
| TG20-FR12 | The frontend shall reuse onboarding repository/datasource, Journey Card/status primitives, navigation, auth, query keys, Theme, icons, and localization where contract-fit is proven. |
| TG20-FR13 | Safe status and retry events shall be auditable without storing secrets, contact values, verification evidence, or raw exceptions. |
| TG20-FR14 | The response shall distinguish unsupported contract version and unknown state from retryable preparation failure. |
| TG20-FR15 | Handoff shall refetch authoritative effective-tenant context and reject tenant mismatch before navigation. |

## Mandatory acceptance criteria

1. No frontend rule can mark preparation complete.
2. No loading animation or elapsed timer is presented as real progress.
3. Refresh/retry cannot create a duplicate run or cross organization/tenant.
4. A stale response from a prior tenant/run cannot alter current UI or navigate.
5. Unknown versions/states render a localized unavailable state and no
   personalization action.
6. English and Hindi keys have compatible interpolation placeholders.
7. Status/progress has accessible name, value/indeterminate semantics, live
   announcements, focus-on-actionable-error, and non-color-only meaning.
8. Central Theme supplies visible color, spacing, typography, radius, and icon
   treatment.
9. Backend audit/idempotency/retry mutation participates in the existing UoW.
10. Multi-clinic and specialty-neutral tests prove isolation and no hardcoded
    specialty workflow.

## Mandatory non-functional requirements

| ID | Requirement |
|---|---|
| TG20-NFR1 | Clean Architecture dependency direction shall be preserved. |
| TG20-NFR2 | Supabase Authentication/PostgreSQL/session metadata remain authoritative. |
| TG20-NFR3 | Status reads shall be tenant-scoped, cache-safe, and free of sensitive payloads. |
| TG20-NFR4 | Retry shall be concurrency safe, idempotent, auditable, and transactional. |
| TG20-NFR5 | The UI shall be localization-first, centrally themed, accessible, and screen-size resilient. |
| TG20-NFR6 | Typed safe error categories shall replace raw backend/provider/database text. |
| TG20-NFR7 | Existing repositories/services/components shall be extended before new ones are approved. |
| TG20-NFR8 | Contract versioning shall be additive and independent of journey and draft-schema versions. |

## Optional requirements

Optional items may be implemented only after all mandatory requirements pass:

- TG20-OPT1: background refresh while the app remains active, using existing app
  lifecycle/query infrastructure.
- TG20-OPT2: safe stage-level elapsed-duration display when supplied by the
  backend, without estimated completion time.
- TG20-OPT3: a support correlation reference suitable for user-assisted support,
  never raw internal details.

## Future requirements

- Capability-driven step visibility belongs to TG21.
- Ready-to-Start policy and missing-action checklist belong to TG22.
- Conflict/offline mutation recovery belongs to TG23–TG25.
- Trial, subscription, payment, dunning, dashboard-first-action, and continuous
  guidance behavior belongs to TG26–TG30.
- Clinical Workspace workflows remain outside Progressive Experience TG20.

## Traceability

TG20 refines Phase 2 roadmap E3 and existing Progressive Experience Requirements
11, 15, 23, 24, 25, 27, and 28. Where earlier requirements describe general
loading/error/security/localization behavior, this document specializes them for
the Workspace Preparation product boundary without modifying the originals.
