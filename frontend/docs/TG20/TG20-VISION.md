# TG20 Vision — Workspace Preparation State and Guidance

Status: **Architecture and product planning**

Epic: **E3 Workspace Preparation**

Classification: **Product Experience Epic**

## Constitutional references

- `../Architecture/NOVA-PRODUCT-ARCHITECTURE.md`
- `../Architecture/NOVA-PLATFORM-FOUNDATION-ARCHITECTURE.md`
- `../Onboarding/progressive-experience/PROGRESSIVE-EXPERIENCE-PHASE2-ROADMAP.md`
- ADR-PF-003 through ADR-PF-018
- `TG19-FINAL-ACCEPTANCE.md` and `TG19-IMPLEMENTATION-READINESS.md`

TG20 consumes the accepted Platform Foundation. It does not redefine identity,
organization, membership, effective tenant, verification, audit, capabilities,
idempotency, runtime strategies, or transaction ownership.

## Purpose

After Clinic Entry resolves an effective tenant, users need a truthful bridge
between “clinic created/associated” and “personalization can begin.” TG20 makes
server-owned workspace preparation visible, understandable, recoverable, and
accessible without moving provisioning truth into frontend code.

## Business goals

1. Reduce abandonment and support contacts during post-entry preparation.
2. Give organization owners and administrators confidence that Nova is working.
3. Distinguish waiting, progress, retryable failure, terminal support need, and
   personalization availability.
4. Preserve a clean handoff from TG19 Clinic Entry to TG18 Journey Cards and the
   existing setup wizard.
5. Establish the authoritative preparation contract required by later
   capability visibility and Ready-to-Start epics.

## User value

- The user sees what stage preparation is in and what Nova is doing.
- The user never has to guess whether a refresh or retry is safe.
- The user receives a clear next action only when the backend authorizes it.
- Multi-clinic users never see another clinic's preparation state.
- Assistive-technology users receive equivalent progress and failure meaning.

## Primary personas

- Organization Owner
- Organization Admin
- Clinic Administrator

Front Desk, Doctor, and Therapist may later consume prepared workspaces but do
not own TG20 preparation or retry decisions.

## Success criteria

- At least 95% of preparation sessions reach `PERSONALIZATION_AVAILABLE` or a
  typed actionable failure rather than an unknown state.
- Median time from TG19 handoff to first authoritative preparation state is
  measurable and tracked.
- Median and 95th-percentile time to personalization availability are measurable.
- Retry completion and repeated-failure rates are measurable by safe reason code.
- Zero navigation events enter personalization when the authoritative state is
  not eligible.
- Zero cross-tenant preparation-state disclosures.
- English/Hindi parity and accessibility checks pass for every state.

Metrics define product outcomes; analytics instrumentation must use the existing
approved analytics boundary and safe metadata. TG20 does not create a general
analytics platform.

## Scope

- Authoritative workspace-preparation state and versioned response contract.
- Tenant-scoped status query and refresh behavior.
- Backend-owned transition and retry eligibility.
- Safe manual retry for retryable failures with scoped idempotency.
- Progress, explanation, next-action, loading, stale, retryable, terminal, and
  unsupported-state presentation.
- Session/effective-tenant validation before every query and handoff.
- Handoff to the existing Progressive Experience journey/personalization route
  only when authorized.
- Central Theme, localization-first, accessibility, React Query, repository,
  datasource, DI, typed error, audit, and transaction compliance.

## Non-goals

- Doctor Module or Clinical Workspace behavior.
- Consultation, case sheet, prescription, treatment, follow-up, or discharge
  implementation.
- Scheduling, inventory, billing, payment, CRM, reports, or integration changes.
- Ready-to-Start policy/checklist (TG22).
- Capability-driven Journey Card visibility (TG21).
- Commercial trial/subscription behavior (TG26+).
- Frontend provisioning, timers that invent progress, or client-authored
  completion.
- Redesign of TG18, TG19, Platform Foundation, Product Architecture, or Supabase.

## Product promise

TG20 promises truthful preparation guidance, not instant preparation and not
clinical readiness. “Personalization available” means the approved onboarding
experience may begin; it does not mean the clinic is Ready to Start, clinically
configured, commercially active, or production-promoted.
