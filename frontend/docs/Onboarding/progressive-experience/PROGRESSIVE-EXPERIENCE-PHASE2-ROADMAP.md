# Progressive Experience Phase 2 Roadmap

Date: 2026-07-20

Status: APPROVED; governing roadmap; no implementation authorized

## Roadmap Governance

| Governance field | Value |
|---|---|
| Version | 1.0 |
| Status | APPROVED |
| Owner | Product Architecture |
| Implementation Phase | Progressive Experience Phase 2 |

### Purpose

This document is the governing roadmap for all remaining Progressive Experience implementation. Future Task Groups TG18–TG31 must implement this roadmap. They must consume the approved roadmap intent and must not redefine product scope.

The roadmap governs what Phase 2 delivers and why. Detailed requirements govern accepted behavior, design governs the approved architecture, and Task Groups govern bounded execution. A Task Group number does not authorize implementation; explicit implementation authorization remains required.

### Roadmap Change Policy

- Product scope changes require roadmap approval.
- Requirements changes require requirements approval.
- Architecture changes require design approval.
- Task Groups may not introduce new product capabilities.
- Implementation evidence may clarify delivery status but may not retroactively redefine product intent.

If a new capability is discovered, it must follow this governance sequence:

```text
Roadmap
↓
Requirements
↓
Design
↓
Task Group
↓
Implementation
```

The sequence must never run in reverse. Implementation must not create de facto product scope, requirements, architecture, or roadmap policy.

### Implementation Governance

Before implementation begins, every future Task Group must explicitly verify and record:

- [ ] Central Theme usage;
- [ ] Localization first;
- [ ] Accessibility;
- [ ] Clean Architecture;
- [ ] Reuse-before-create;
- [ ] Multi-clinic compatibility;
- [ ] Existing repository reuse;
- [ ] Existing component reuse;
- [ ] Existing hook reuse;
- [ ] Existing store reuse.

A Task Group must stop before implementation if any verification is missing, unresolved, or contradicted by its proposed scope.

### Roadmap Freeze

- TG18–TG31 are governed by this roadmap.
- Changes require an approved roadmap revision with an updated version and recorded rationale.
- Task Groups must consume the roadmap and trace their scope to its approved epics and outcomes.
- Task Groups must not redefine, broaden, narrow, reorder, or reinterpret roadmap intent.
- Requirements and design may elaborate approved scope but may not silently amend the roadmap.

### Non-Goals

This roadmap does not authorize:

- Doctor Module work;
- Clinical Workspace work;
- Scheduling;
- Inventory;
- Billing implementation;
- Payment Gateway implementation;
- backend API redesign;
- architecture rewrites.

## 1. Executive Summary

Progressive Experience Phase 2 converts the accepted clinic and commercial journey into an ordered product roadmap. It bridges product vision to requirements, design, epics, future task groups, and eventually implementation while preserving the engineering safety achieved by the recovery checkpoint and Task Groups 1–17.

Phase 2 does not reopen completed production-hardening work. It plans the product capabilities that were missing or only partially represented: journey guidance, clinic identity and Bring Your Clinic, workspace preparation, capability visibility, readiness, commercial trial, subscription conversion, informational dunning, dashboard first actions, and continuous growth. It also plans unresolved recovery foundations—conflict handling, offline mutation recovery, errors, analytics, security, and end-to-end release evidence—where those foundations are prerequisites for the product journey.

This document defines twelve product epics and fourteen future task groups, TG18–TG31. The task groups are planning containers only. A group may enter implementation only after its stop condition, requirements, design, ownership, dependencies, and acceptance criteria are accepted. Creating this roadmap does **not** authorize TG18 or any later group.

## 2. Current Completion Status

| Area | Status | Evidence |
|---|---|---|
| Recovery checkpoint | COMPLETE | Canonical governance, clean paired branches, platform idempotency, localization recovery, and verification evidence are recorded in the recovery documents. |
| Production hardening | COMPLETE in code; release evidence remains | Alias routing, submission safety, query consistency, Android back behavior, and backend platform idempotency are implemented. Staging/device acceptance remains separate. |
| Task Groups 1–17 | COMPLETE as planned | `tasks.md` records implementation and focused evidence through TG17. |
| Traceability audit | COMPLETE | `PROGRESSIVE-EXPERIENCE-TRACEABILITY-AUDIT.md` identifies missing product capabilities and the need for a new planning phase. |
| Dev synchronization | COMPLETE | The feature branch contains the recorded dev synchronization. |
| Production promotion | BLOCKED | Req 11, Req 12, and Req 32 staging/release verification remains unexecuted. |
| Next implementation group | NOT AUTHORIZED | This roadmap must first be reviewed and converted into accepted requirements/design slices. |

## 3. Original Product Vision

The accepted end-to-end journey is:

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

The vision is a progressive activation and commercial experience, not merely a setup wizard. The clinic should always understand what Nova is preparing, what the clinic must do next, why a step matters, whether it is ready, what commercial state it is in, and what action follows activation.

Demo Mode is not part of the target onboarding journey. Sample-clinic or legacy demo behavior may remain for compatibility or education, but it must not own clinic readiness, workspace activation, commercial trial, subscription, or completion truth. Target language uses **Ready to Start**. The commercial trial begins only after Ready to Start.

## 4. Phase 2 Vision

Phase 2 will make the accepted journey explicit and traceable by establishing:

1. a versioned journey and guidance model;
2. clinic entry paths for creating or bringing a clinic;
3. visible workspace preparation without moving server truth into presentation;
4. capability-driven, specialty-extensible setup visibility;
5. an authoritative and understandable Ready-to-Start experience;
6. conflict-safe and offline-safe recovery foundations;
7. a complete post-readiness commercial lifecycle;
8. dashboard first actions and continuous-growth guidance;
9. consistent localization, theme, accessibility, analytics, security, and multi-clinic behavior.

Phase 2 success means every accepted lifecycle capability has an owner, accepted requirements, design, task group, tests, release gate, and traceable implementation evidence. It does not mean every capability must ship in one release.

## 5. Epic Classification

Phase 2 uses two epic classifications:

- **Product Experience Epic:** Delivers or advances a recognizable part of the approved customer journey. Its success is measured through user and commercial outcomes.
- **Platform Foundation Epic:** Supplies safety, consistency, recovery, architecture, or verification capabilities required by one or more Product Experience epics. It exists only to enable product capabilities and is not a standalone user journey, destination, or product proposition.

Platform Foundation work must remain traceable to the Product Experience epics it enables. Completing a Platform Foundation epic must not be reported as completion of an end-user journey stage.

### 5.1 Product-Epic Portfolio

| Epic | Classification | Product outcome | Existing requirement support | Future task groups |
|---|---|---|---|---|
| E1 Journey Foundation and Cards | Product Experience | Versioned, guided journey with reusable cards and progress meaning. | Req 5 follow-up; Req 14, 15, 21, 23–25, 28; accepted vision gap. | TG18 |
| E2 Clinic Entry and Bring Your Clinic | Product Experience | Clear clinic-creation/import paths and complete identity/contact handoff. | Req 11, 19, 24, 25, 30; ownership map and accepted vision gap. | TG19 |
| E3 Workspace Preparation | Product Experience | Users can see Nova preparing their workspace and know when personalization can begin. | Req 11, 15, 23, 24, 25, 27, 28; accepted lifecycle gap. | TG20 |
| E4 Capability Visibility | Product Experience | Relevant steps are server/capability driven and specialty extensible. | Req 1–4, 15, 23–25; ownership/candidate gap. | TG21 |
| E5 Ready-to-Start Experience | Product Experience | Authoritative readiness, missing-action explanation, and safe checklist navigation. | Req 13, 15, 17, 23–28, 32. | TG22 |
| E6 Conflict and Multi-Clinic Recovery | Platform Foundation | Local drafts never silently overwrite newer server or other-device work. | Req 9, 11, 16, 17, 29–32. | TG23 |
| E7 Offline Mutation Recovery | Platform Foundation | Explicit, tenant-safe queue/retry/manual recovery behavior. | Req 8, 12, 20, 22–24, 26, 28, 30, 32. | TG24, TG25 |
| E8 Commercial Trial | Product Experience | Trial begins after readiness and exposes clear active/expiring/expired states. | Req 13, 15, 18, 24–28, 32; accepted lifecycle gap. | TG26 |
| E9 Subscription Conversion and Payment Recovery | Product Experience | A clinic can safely convert, resume verification, and recover failure. | Req 12, 18–20, 23–28, 30, 32. | TG27 |
| E10 Informational Dunning | Product Experience | Timely, non-destructive commercial notices lead to an owned action. | Req 20, 24, 25, 28; accepted lifecycle gap. | TG28 |
| E11 Dashboard First Actions and Progressive Guidance | Product Experience | Activated clinics receive relevant next actions and ongoing guidance. | Req 14, 15, 21, 23–25, 28; ownership-map gap. | TG29, TG30 |
| E12 Cross-Cutting Completion and Release | Platform Foundation | Phase-wide security, analytics, localization, accessibility, theme, and E2E acceptance. | Req 14, 15, 19–25, 28, 30–32. | TG31 |

## 6. Epic Specifications

### E1 — Journey Foundation and Cards

**Purpose:** Define the canonical journey identity, version, stages, progress semantics, and reusable Journey Card contract that later epics consume.

**Business value:** Prevents disconnected screens from becoming the roadmap. It gives users consistent guidance and lets the product evolve the journey without confusing journey version with draft schema version.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Onboarding journey start-to-completion rate; median time from journey start to Ready to Start; Journey Card action completion rate; percentage of sessions with an unknown or unmapped journey state.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; Analytics platform creation.

**User journey:** After clinic entry, the owner sees the current journey stage, why it matters, the next supported action, and progress derived from authoritative server/capability state.

**Requirements covered:** Req 5 future identity follow-up; Req 14, 15, 21, 23, 24, 25, and 28. Journey Cards and Journey Versioning require new accepted Phase 2 requirements because current numbered requirements do not define their product contract.

**Design sections:** Existing Layer Map, Dependency Rules, Theme Compliance, Testing Strategy, and deferred analytics guidance. A new Phase 2 journey-domain design section is mandatory.

**Dependencies:** Product acceptance of journey stages; readiness and capability ownership boundaries; identity compatibility with tenant/user/draft schema keys.

**Risks:** Treating UI order as domain truth; reusing draft schema version as journey version; hardcoding clinic type; cards becoming a second navigation system.

**Future backend work:** Decide whether journey definition/version and card eligibility are server-provided; expose only authoritative state if needed. No backend work is assumed until design acceptance.

**Future frontend work:** Reuse existing step/status/card/navigation primitives; introduce a presentation model only through repositories/application orchestration; render themed/localized accessible cards.

**Localization impact:** All stage names, explanations, states, and actions require `en-US` and `hi-IN` keys with compatible interpolation.

**Accessibility impact:** Cards need semantic headings, progress descriptions, action labels, focus order, and non-color-only state communication.

**Multi-clinic impact:** Journey version and progress must be scoped to the effective clinic/tenant. No cross-clinic cached state.

**Acceptance criteria:**

1. An accepted journey-domain vocabulary separates journey version, draft schema version, tenant, user, stage, card, capability, and readiness.
2. Card visibility and completion never originate from presentation-only rules.
3. Navigation reuses existing routing and cannot bypass readiness or subscription gates.
4. Every visible string, style, icon treatment, and state satisfies the common principles in §9.
5. Tests cover version mismatch, tenant switching, empty/unknown states, ordering, accessibility, and localization parity.

**Implementation sequence:** Product journey contract → ownership decision → Phase 2 requirements → domain/design model → reusable-asset audit → bounded implementation plan.

### E2 — Clinic Entry and Bring Your Clinic

**Purpose:** Define supported clinic entry paths and the identity/contact information required before workspace preparation.

**Business value:** Reduces abandonment and avoids forcing established clinics through a new-clinic-only mental model.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Account-to-clinic-identity completion rate; abandonment rate by clinic-entry path; median time to resolve a tenant and enter workspace preparation; duplicate clinic-creation rate.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; migration of clinical records.

**User journey:** The owner creates an account, chooses a documented clinic path, supplies or confirms clinic identity/contact data, and enters workspace preparation with a resolved tenant.

**Requirements covered:** Req 11, 19, 24, 25, and 30. Bring Your Clinic and identity/contact refinement require new Phase 2 requirements.

**Design sections:** Backend Dependencies, Layer Map, Error Handling, tenant verification checklist, and ownership map. A new clinic-entry application-flow design is required.

**Dependencies:** Product definition of Bring Your Clinic; tenant provisioning and selection contract; data ownership/security classification; existing `ChoiceScreen`, application flows, and `ClinicProfileScreen` audit.

**Risks:** Inventing migration/import behavior; duplicate clinic creation; weak tenant resolution; storing sensitive data locally; Ayurveda-specific fields.

**Future backend work:** Only after acceptance: provisioning/import status, duplicate detection, identity validation, and authoritative clinic association as needed.

**Future frontend work:** Reuse choice/application/profile surfaces and repositories; add only accepted path/status UX.

**Localization impact:** Path descriptions, identity labels, validation, recovery, and status text in both locales.

**Accessibility impact:** Clear choice semantics, field instructions/errors, focus movement, and accessible progress/status.

**Multi-clinic impact:** Explicit selected/effective clinic; existing-clinic association cannot leak another clinic’s onboarding state.

**Acceptance criteria:**

1. Supported entry paths and non-goals are product-approved.
2. Effective tenant resolution is explicit for new, provisional, existing, and multi-clinic owners.
3. Existing components/repositories are audited before additions.
4. Clinic fields remain specialty extensible and centrally validated.
5. Failure/retry paths cannot create duplicate clinics or cross-tenant state.

**Implementation sequence:** Product path decision → tenant/provisioning contract → data/security model → UX design → repository reuse audit → implementation group readiness.

### E3 — Workspace Preparation

**Purpose:** Make Nova’s workspace preparation visible and understandable without placing provisioning truth in the frontend.

**Business value:** Reduces uncertainty between clinic creation and personalization and prevents premature setup actions.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Workspace-preparation completion rate; median preparation duration; preparation failure and manual-retry rate; percentage of clinics that proceed to Review & Personalize after preparation completes.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace feature implementation; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; frontend-owned provisioning logic.

**User journey:** After identity creation, the owner sees preparation progress, safe waiting/retry guidance, completion, and the next permitted action.

**Requirements covered:** Req 11, 15, 23, 24, 25, 27, and 28. Workspace preparation itself requires new accepted Phase 2 requirements.

**Design sections:** Architecture, Error Handling, Backend Dependencies, Query Invalidation, and release verification. A workspace-preparation state-machine contract is required.

**Dependencies:** E2 tenant/provisioning contract; backend ownership of state; error/retry vocabulary; capability/readiness handoff.

**Risks:** Client polling without policy; frontend claiming completion; indefinite ambiguous loading; duplicate provisioning; cross-clinic cache reuse.

**Future backend work:** Authoritative preparation state, timestamps/errors, retry eligibility, and event/query contract if not already reusable.

**Future frontend work:** Repository-backed status presentation, approved refresh behavior, and next-action routing.

**Localization impact:** Preparation stages, wait guidance, errors, retry actions, and durations require both locales.

**Accessibility impact:** Live-region updates must be polite and non-repetitive; progress must be conveyed textually.

**Multi-clinic impact:** Status/query keys and actions must be tenant scoped; switching clinics must cancel or isolate stale UI state.

**Acceptance criteria:**

1. Backend/platform owns preparation truth and allowed transitions.
2. Frontend exposes no invented percentage or completion state.
3. Retry and terminal failure behavior is explicit.
4. Refresh/invalidation is scoped and tested under tenant switching.
5. The completion handoff leads to Review & Personalize without bypassing visibility/readiness rules.

**Implementation sequence:** State ownership → API/repository reuse assessment → state-machine design → UX/accessibility design → focused implementation plan.

### E4 — Capability Visibility

**Purpose:** Show setup steps that are relevant to the clinic’s enabled capabilities and specialty without hardcoded clinic-type branches.

**Business value:** Shortens setup, improves relevance, and preserves extensibility across specialties.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator, Front Desk, Doctor, Therapist.

**Success Metrics:** Percentage of clinics shown only applicable setup steps; unmapped capability/step-code rate; setup completion rate by specialty; step-list change recovery rate without lost drafts.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling workflow implementation; Inventory workflow implementation; specialty-specific clinical behavior; frontend-owned capability truth.

**User journey:** During Review & Personalize, the clinic sees a coherent set of applicable steps and safely handles capability changes.

**Requirements covered:** Req 1–4, 15, and 23–25. Capability-driven visibility requires a new Phase 2 requirement.

**Design sections:** Alias Routing, Property 5, Layer Map, Dependency Rules, and lifecycle changed-step notice.

**Dependencies:** E1 journey contract; authoritative capability source; workspace preparation completion; current backend template/visible-step behavior.

**Risks:** Frontend capability truth; alias drift; disappearing steps with unsaved drafts; specialty assumptions; unstable ordering.

**Future backend work:** Implement the Requirement 33 authoritative capability/template projection identity and visible-step contract.

**Future frontend work:** Map authoritative capabilities through repository/domain models into existing wizard/card surfaces; preserve safe draft behavior.

**Localization impact:** Capability and step labels/descriptions must be keys, never server text rendered without localization policy.

**Accessibility impact:** Updated-step notices, order changes, and unavailable actions must be announced and keyboard/screen-reader coherent.

**Multi-clinic impact:** Capabilities, queries, drafts, and cards must change atomically with effective clinic.

**Acceptance criteria:**

1. No clinic-type or Ayurveda-specific presentation branches are introduced.
2. Unknown capabilities/step codes fail safely and visibly.
3. Alias inventory has one governed source and backend-template audit procedure.
4. Capability changes preserve or intentionally resolve drafts.
5. Tests cover multiple specialty/capability combinations and tenant switching.

**Implementation sequence:** Capability ownership → template/version contract → mapping design → draft-change policy → implementation group readiness.

### E5 — Ready-to-Start Experience

**Purpose:** Turn authoritative readiness into an understandable checklist and safe transition point before the commercial trial.

**Business value:** Gives clinics confidence, prevents premature commercial activation, and reduces support questions about missing setup.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Review-and-Personalize-to-Ready-to-Start conversion rate; median time to resolve readiness blockers; Ready-to-Start checklist completion rate; premature trial-activation count.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; frontend-defined readiness policy.

**User journey:** The owner sees what is ready, what is blocking readiness, how to resolve each item, and a clear Ready-to-Start confirmation. Only then can the commercial trial begin.

**Requirements covered:** Req 13, 15, 17, 23–28, and 32. Readiness providers/explanation need new Phase 2 requirements.

**Design sections:** TG17 checklist routing, Backend Dependencies, Error Handling, Query Invalidation, Theme Compliance, and E2E verification.

**Dependencies:** E3 workspace state; E4 capabilities; authoritative readiness provider/aggregation; E1 cards/guidance; commercial handoff contract.

**Risks:** Frontend owning readiness policy; treating banner action as activation; stale readiness; Demo terminology; hidden blockers.

**Future backend work:** Define readiness provider outputs, blocker identifiers, timestamps, and transition eligibility if current status is insufficient.

**Future frontend work:** Reuse `GoLiveScreen`, `SetupWizardFlow`, `DemoStatusBanner` compatibility path, status repositories, and existing checklist routing.

**Localization impact:** Ready-to-Start terminology, blocker explanations, resolutions, and confirmation in both locales.

**Accessibility impact:** Checklist semantics, status announcements, disabled-reason descriptions, and accessible focus after updates.

**Multi-clinic impact:** Readiness must be calculated and cached per effective clinic; no readiness carry-over.

**Acceptance criteria:**

1. Readiness truth and transition eligibility are backend/domain owned.
2. Every blocker has an understandable localized explanation and owned action or explicit support path.
3. The trial cannot start before authoritative Ready-to-Start confirmation.
4. No target UI reintroduces Demo/Go Live terminology.
5. Slow/stale/error/tenant-switch states are tested.

**Implementation sequence:** Readiness provider contract → blocker/action model → commercial boundary → UI reuse audit → implementation plan.

### E6 — Conflict and Multi-Clinic Recovery

**Purpose:** Prevent silent overwrites when local drafts, server state, multiple devices, or clinic switching diverge.

**Business value:** Protects clinic setup data and user trust.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Silent draft-overwrite count; conflict-resolution completion rate; cross-clinic draft leakage count; multi-device resume success rate; support incidents attributable to stale onboarding state.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; general-purpose synchronization platform.

**User journey:** On resume or clinic switch, the owner sees a clear choice only when needed and never submits a draft under the wrong clinic.

**Requirements covered:** Req 9, 11, 16, 17, and 29–32.

**Design sections:** Deferred `DraftConflictModal`, lifecycle data flow, DTO `updated_at`, tenant verification, and correctness properties.

**Dependencies:** Mandatory per-step backend timestamp contract; accepted comparison/conflict policy; existing TG13–TG15 draft lifecycle; staging tenant tests.

**Risks:** Timestamp ambiguity; wrong overwrite; conflict fatigue; fallback identity migration; cross-tenant leakage.

**Future backend work:** Guarantee non-null per-step `updated_at` and define server revision semantics.

**Future frontend work:** DTO mapping, conflict orchestration, modal/action reuse, draft cleanup, and clinic-switch isolation.

**Localization impact:** Conflict explanation and action consequences in both locales.

**Accessibility impact:** Accessible dialog role, focus trap/return, complete action labels, and announced resolution.

**Multi-clinic impact:** Central to the epic: all comparison, storage, query, and cleanup behavior is tenant/effective-clinic scoped.

**Acceptance criteria:**

1. Backend timestamp/revision contract is accepted and tested.
2. “Use Latest” and “Keep Local” consequences are deterministic and auditable.
3. Missing/invalid timestamps take a documented conservative path.
4. Tenant switching cannot display or submit another clinic’s draft.
5. Multi-device and full tenant-switch integration tests pass before release.

**Implementation sequence:** Backend contract → conflict policy → error/analytics events → accessible UX → multi-device/tenant tests.

### E7 — Offline Mutation Recovery

**Purpose:** Extend TG16’s offline visibility/gating into explicit, safe mutation recovery.

**Business value:** Prevents lost intent and duplicate side effects on unreliable networks.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Offline submission recovery success rate; duplicate side-effect count; dead-letter/manual-recovery rate; median time from reconnection to successful recovery; cross-clinic queue leakage count.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling mutations; Inventory mutations; Billing implementation; Payment Gateway implementation; general-purpose offline or analytics platform.

**User journey:** The owner understands that submission is unavailable or queued according to accepted policy, sees recovery progress, and can manually resolve terminal failure.

**Requirements covered:** Req 8, 12, 20, 22–24, 26, 28, 30, and 32.

**Design sections:** Deferred `PendingMutationStore`, offline data flows, Error Handling, architecture rules, platform idempotency assessment, and E2E Run D.

**Dependencies:** Error catalog; analytics decision; platform idempotency; queue ownership and security review; tenant identity; conflict with newly completed server work.

**Risks:** Hidden background engine; unsafe global Axios retry; replaying under wrong tenant; unbounded retries; domain-order violations; queue becoming completion truth.

**Future backend work:** No new endpoint assumed; confirm every queued operation’s idempotency/replay contract and retention.

**Future frontend work:** First central error/retry policy, then a tenant-scoped serializable queue, FIFO flush, key reuse, attempt limits, and manual recovery.

**Localization impact:** Offline, queued, retrying, failed, and manual-retry copy in both locales.

**Accessibility impact:** Announced state changes without repeated noise; accessible disabled/retry controls and error summaries.

**Multi-clinic impact:** Queue entries, persistence keys, flush identity, and cleanup are strictly tenant scoped; clinic switching cannot flush an old clinic’s queue.

**Acceptance criteria:**

1. Queue ownership and supported operations are explicitly enumerated.
2. Idempotency key is stable for the same attempt and fresh for a new user attempt.
3. FIFO, maximum attempts, dead-letter/manual recovery, and terminal errors are deterministic.
4. No global retry of unsafe mutations is introduced.
5. Kill/restart, offline/online, tenant switch, conflict, and replay E2E cases pass.

**Implementation sequence:** Error/retry contract (TG24) → queue/replay implementation (TG25) → staging replay → offline E2E.

### E8 — Commercial Trial

**Purpose:** Define and present the commercial trial that begins only after Ready to Start.

**Business value:** Makes the product’s value window and next commercial action clear without conflating sample/demo access with onboarding.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator.

**Success Metrics:** Ready-to-Start-to-trial-activation conversion rate; median time from Ready to Start to trial activation; percentage of trial users who view or act on the next commercial action; trial-state support incident rate.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; pricing or plan-policy creation; Demo Mode reintroduction.

**User journey:** After readiness confirmation, the clinic intentionally begins the 30-day commercial trial, sees active/expiring/expired state, and has an owned next action.

**Requirements covered:** Req 13, 15, 18, 24–28, and 32. Trial start/expiry/extension policy requires new Phase 2 requirements.

**Design sections:** DemoStatusBanner compatibility integration, backend subscription dependencies, query invalidation, errors, testing, and release checklist.

**Dependencies:** E5 Ready-to-Start; commercial policy; subscription status authority; error/analytics foundations; no Demo terminology.

**Risks:** Starting trial early; temporary extend API becoming policy; UI-derived dates; unclear expired state; duplicate transitions.

**Future backend work:** Authoritative trial-start eligibility/action, start/end timestamps, extension policy, status transitions, and idempotency as accepted.

**Future frontend work:** Repository-backed trial state/actions using existing banner/status/query assets where appropriate; session/query refresh.

**Localization impact:** Trial duration, dates, states, warnings, and actions with interpolation-compatible keys.

**Accessibility impact:** Time remaining must not rely on color; status/action changes announced; disabled reasons available.

**Multi-clinic impact:** Each clinic has independent readiness and commercial state; switching must refresh and isolate state.

**Acceptance criteria:**

1. Trial can begin only after authoritative Ready-to-Start.
2. Sample/demo compatibility is not the commercial trial domain model.
3. Dates/status/action eligibility come from authoritative data.
4. Extend/transition mutations have explicit idempotency, invalidation, pending, and error rules.
5. Active, expiring, expired, retry, and tenant-switch states are tested.

**Implementation sequence:** Commercial policy → backend/domain contract → migration from compatibility semantics → UX design → implementation plan.

### E9 — Subscription Conversion and Payment Recovery

**Purpose:** Enable safe conversion to paid subscription and recovery of interrupted/pending payment verification.

**Business value:** Protects revenue and avoids forcing clinics to restart payment.

**Primary Personas:** Organization Owner, Organization Admin.

**Success Metrics:** Trial-to-paid-subscription conversion rate; interrupted-payment recovery completion rate; duplicate checkout/payment attempt count; median pending-verification resolution time; payment-recovery abandonment rate.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; billing-ledger implementation; Payment Gateway implementation; pricing or plan-policy creation; storage of protected payment credentials.

**User journey:** The clinic selects the owned conversion action, completes payment, resumes pending verification after interruption, and receives a definitive paid or recoverable failure state.

**Requirements covered:** Req 12, 18–20, 23–28, 30, and 32.

**Design sections:** Deferred payment recovery, backend subscription dependencies, Error Handling, Query Invalidation, and E2E verification.

**Dependencies:** E8 trial state; payment/subscription owner; pending-verification endpoint decision; security classification; error/retry/analytics contracts.

**Risks:** Payment data in AsyncStorage; duplicate checkout; ambiguous verification; exposing raw gateway errors; cross-clinic subscription actions.

**Future backend work:** Pending-verification query, resume/verify contract, idempotent conversion, authoritative subscription result, and safe error taxonomy.

**Future frontend work:** Reuse billing/payment screens and subscription repositories/services; add recovery banner/routing only after endpoint acceptance.

**Localization impact:** Plans, payment status, verification, recovery, failure, and support guidance in both locales; monetary interpolation reviewed.

**Accessibility impact:** Accessible alert/recovery CTA, payment field errors, focus management, and pending status announcements.

**Multi-clinic impact:** Subscription and verification IDs must be bound to the effective clinic and never persisted/replayed under another tenant.

**Acceptance criteria:**

1. Security review proves no protected payment/token data enters inappropriate local storage or analytics.
2. Interrupted payment resumes the existing verification rather than creating an accidental duplicate.
3. Mutation locking, idempotency, invalidation, and session refresh are specified and tested.
4. Every terminal/recoverable state has an owned user action.
5. Cross-tenant, retry-after-timeout, and app-restart tests pass.

**Implementation sequence:** Ownership/security → backend verification contract → error taxonomy → recovery UX → implementation and E2E plan.

### E10 — Informational Dunning

**Purpose:** Communicate upcoming or current commercial consequences without silently disabling the clinic or inventing billing policy.

**Business value:** Improves conversion and reduces surprise/support load.

**Primary Personas:** Organization Owner, Organization Admin.

**Success Metrics:** Dunning notice action rate; subscription conversion after notice; notice dismissal/acknowledgement rate; commercial-state support contact rate; duplicate or superseded notice rate.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; notification-platform creation; client-authored commercial policy.

**User journey:** Before and after relevant commercial milestones, the clinic receives a clear informational notice with timing, consequence, and an owned action.

**Requirements covered:** Req 20, 24, 25, and 28. Dunning requires new Phase 2 product requirements and policy.

**Design sections:** Deferred errors/analytics, theme/i18n/accessibility rules, and subscription dependencies. A dunning policy/presentation design is required.

**Dependencies:** E8/E9 commercial states; accepted policy and schedule; notification ownership; action routing; analytics consent/retention.

**Risks:** Invented deadlines; punitive or inaccurate language; notification fatigue; channel inconsistency; inaccessible urgency cues.

**Future backend work:** Authoritative notice state/schedule and acknowledgement/action metadata if not provided by the subscription domain.

**Future frontend work:** Reuse existing banner/notification/action primitives; render only authoritative notices.

**Localization impact:** Tone-sensitive, date/amount-aware copy in both locales with product/localization review.

**Accessibility impact:** Alert semantics appropriate to urgency, no color-only urgency, dismiss/acknowledgement semantics, accessible actions.

**Multi-clinic impact:** Notices and actions must identify and bind to the relevant clinic without exposing another clinic’s commercial state.

**Acceptance criteria:**

1. Product/commercial owner approves trigger, timing, severity, consequence, and action for every notice.
2. Frontend does not calculate billing truth or deadlines independently.
3. Duplicate/superseded notices are governed.
4. Localization and accessibility reviews are release gates.
5. Tests cover clinic switching, expired data, missing action, and multiple notice states.

**Implementation sequence:** Policy → authoritative data contract → channel/presentation design → localization review → implementation plan.

### E11 — Dashboard First Actions and Progressive Guidance

**Purpose:** Continue the journey after activation with relevant first actions and ongoing clinic-growth guidance.

**Business value:** Converts setup completion into adoption and sustained value.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator, Front Desk, Doctor, Therapist.

**Success Metrics:** First-action completion rate; median time from activation to first action; percentage of clinics completing the recommended first-action set; guidance engagement and completion rate; repeat active-clinic engagement after onboarding.

**Explicitly Out of Scope:** Doctor Module; Clinical Workspace implementation; clinical workflow changes; Scheduling implementation; Inventory implementation; Billing implementation; Payment Gateway implementation; Analytics platform creation.

**User journey:** After paid activation or the accepted activation milestone, the clinic sees prioritized first actions, completes them, and receives progressively relevant guidance.

**Requirements covered:** Req 14, 15, 21, 23–25, and 28. Dashboard first actions, progressive branding, guidance, and continuous growth require new Phase 2 requirements.

**Design sections:** Layer Map, Theme Compliance, Testing Strategy, analytics guidance, ownership map, and E1 Journey Cards contract.

**Dependencies:** E1 journey/card model; E4 capabilities; E5 readiness; E8/E9 commercial state; dashboard ownership boundary; analytics decision.

**Risks:** Crossing into Doctor Module/clinical workflows; generic tasks unrelated to clinic capability; frontend-owned completion; cosmetic branding without criteria.

**Future backend work:** Authoritative action eligibility/completion and guidance inputs only if no reusable capability exists.

**Future frontend work:** Reuse dashboard, navigation, card, and repository assets without modifying Doctor Module or clinical workflows.

**Localization impact:** Action titles, value explanations, progress, celebration, and guidance in both locales.

**Accessibility impact:** Ordered actions, progress meaning, focus behavior, dismiss/defer semantics, and reduced-motion compatibility.

**Multi-clinic impact:** Actions and growth state are per clinic; specialty extensibility is mandatory.

**Acceptance criteria:**

1. Dashboard ownership boundary explicitly excludes Doctor Module and clinical workflow changes.
2. First actions are capability relevant and domain owned.
3. Guidance reuses E1 journey/card semantics and never becomes hidden business logic in UI.
4. Progressive branding uses central tokens/assets and accepted criteria.
5. Tests cover multiple specialties, empty/completed states, and tenant switching.

**Implementation sequence:** Dashboard boundary/first-action model (TG29) → continuous-growth guidance and branding criteria (TG30).

### E12 — Cross-Cutting Completion and Release

**Purpose:** Close Phase 2 with coherent security, analytics, architecture, localization, accessibility, theme, multi-clinic, and release evidence.

**Business value:** Ensures product breadth does not reduce production safety or maintainability.

**Primary Personas:** Organization Owner, Organization Admin, Clinic Administrator, Front Desk, Doctor, Therapist.

**Success Metrics:** Phase 2 critical-journey pass rate; accessibility acceptance pass rate; `en-US`/`hi-IN` parity and review completion; tenant-isolation defect count; production-blocking regression count; percentage of shipped epics with complete traceability evidence.

**Explicitly Out of Scope:** New user-journey features; Doctor Module; Clinical Workspace; Scheduling; Inventory; Billing implementation; Payment Gateway implementation; Analytics platform implementation; unrelated baseline-debt remediation.

**User journey:** Every Phase 2 path behaves consistently across language, assistive technology, specialty, clinic, device lifecycle, network conditions, and commercial state.

**Requirements covered:** Req 14, 15, 19–25, 28, and 30–32.

**Design sections:** Architecture, Error Handling, Correctness Properties, Testing Strategy, E2E Runs A–D, Release Checklist, and Git Delivery Strategy.

**Dependencies:** All planned epics; accepted analytics/security decisions; staging and device access; resolved baseline relevance.

**Risks:** Treating cross-cutting acceptance as cleanup; full-suite debt obscuring regressions; incomplete Hindi review; staging evidence omitted.

**Future backend work:** Focused contract/security/tenant/replay verification only as required by accepted epics.

**Future frontend work:** Cross-epic audits and corrections within Progressive Experience scope; no unrelated refactor.

**Localization impact:** Complete `en-US`/`hi-IN` parity, interpolation validation, and Hindi-literate review.

**Accessibility impact:** Component and journey audits, assistive-technology flows, touch targets, focus, announcements, contrast, and reduced motion.

**Multi-clinic impact:** Full tenant-switch and isolation matrix across journey, drafts, queues, readiness, trial, subscription, notices, and guidance.

**Acceptance criteria:**

1. Every shipped epic maps product outcome → requirement → design → task → code → tests → release evidence.
2. Security, analytics, theme, localization, accessibility, architecture, and multi-clinic reviews pass.
3. Relevant automated suites and documented physical/emulated E2E runs pass.
4. Staging tenant and idempotency/replay sign-off is recorded.
5. No Doctor Module or clinical workflow delta is attributed to Phase 2.

**Implementation sequence:** Continuous per-task checks → pre-release audit → staging/device matrix → release decision → roadmap reconciliation.

## 7. Dependency Graph

```text
Release validation track (Req 11/12/32) ───────────────────────────────┐
                                                                       │
TG18 Journey Foundation ─┬─> TG20 Workspace Preparation ─> TG21 Capability Visibility ─> TG22 Ready to Start
                         │                                                        │                │
TG19 Clinic Entry ───────┘                                                        │                ├─> TG26 Commercial Trial
                                                                                  │                │        │
TG23 Conflict/Multi-Clinic Recovery <─────────────────────────────────────────────┘                │        ├─> TG27 Subscription Recovery
                                                                                                   │        │        │
TG24 Error and Retry Contract ─> TG25 Offline Mutation Recovery                                   │        │        └─> TG28 Dunning
                                                                                                   │        │
                                                                                                   └────────┴─> TG29 Dashboard First Actions
                                                                                                                    │
                                                                                                                    └─> TG30 Growth Guidance

All implemented Phase 2 groups ────────────────────────────────────────────────────────────────────────────────> TG31 Cross-Cutting Exit
```

The graph expresses minimum ordering, not permission to start. TG23 and TG24 may be planned in parallel after their contracts are available. Release validation is independent of new feature implementation and must not be mislabeled as a product task group.

## 8. Future Task Groups

Every group below inherits all mandatory principles in §9.

### TG18 — Journey Foundation and Journey Cards

- **Objective:** Establish accepted journey identity/version, stages, progress semantics, and reusable Journey Card contract.
- **Scope:** Requirements/design/domain planning followed by bounded reusable foundation; no commercial/readiness policy implementation.
- **Requirements:** Req 5 follow-up, 14, 15, 21, 23–25, 28; new E1 requirements required.
- **Design references:** E1; Layer Map; Dependency Rules; Theme Compliance; Testing Strategy.
- **Dependencies:** Product-approved journey; journey-version ownership; reusable-asset audit.
- **Reusable components:** Existing step/status/card/navigation primitives, subject to verification.
- **Reusable repositories:** Onboarding status/query repositories and central query keys, subject to contract fit.
- **Reusable services:** Existing onboarding status services; no new service without gap evidence.
- **Expected tests:** Domain mapping, ordering, unknown/version states, tenant switching, localization parity, accessibility.
- **Expected documentation updates:** New accepted E1 requirements/design, coverage matrix, tasks evidence after implementation.
- **Stop condition:** Stop before code if journey ownership/version or card eligibility is not accepted and domain-owned.

### TG19 — Clinic Entry and Bring Your Clinic Contract

- **Objective:** Define and implement only the accepted clinic-entry/identity slice.
- **Scope:** New-clinic vs Bring Your Clinic path, identity/contact handoff, tenant resolution; no invented import engine.
- **Requirements:** Req 11, 19, 24, 25, 30; new E2 requirements required.
- **Design references:** E2; Backend Dependencies; tenant verification; Error Handling.
- **Dependencies:** Product path decision; provisioning/tenant contract; security classification.
- **Reusable components:** `ChoiceScreen`, application flows, `ClinicProfileScreen`, existing form primitives.
- **Reusable repositories:** Existing auth, application, tenant, and onboarding repositories after reuse audit.
- **Reusable services:** Existing provisioning/application/profile services after contract verification.
- **Expected tests:** Duplicate prevention, validation, provisional/active/multi-clinic paths, tenant isolation, accessibility/i18n.
- **Expected documentation updates:** Entry-path requirements/design, security decision, tenant matrix, task evidence.
- **Stop condition:** Stop if Bring Your Clinic product meaning or tenant/provisioning ownership remains undefined.

### TG20 — Workspace Preparation State and Guidance

- **Objective:** Present authoritative workspace preparation progress and next actions.
- **Scope:** State/query/retry presentation and handoff; no frontend-owned provisioning.
- **Requirements:** Req 11, 15, 23–25, 27, 28; new E3 requirements required.
- **Design references:** E3; Architecture; Error Handling; Backend Dependencies.
- **Dependencies:** TG19 contract; authoritative workspace state; refresh/retry policy.
- **Reusable components:** Existing progress, notice, loading, error, and Journey Card primitives.
- **Reusable repositories:** Existing onboarding/application/provisioning status repositories if suitable.
- **Reusable services:** Existing tenant provisioning/status services after evidence-based audit.
- **Expected tests:** State transitions, stale/error/retry, no invented completion, tenant switch, announcements.
- **Expected documentation updates:** Workspace state machine, API/repository decision, requirements/design/task evidence.
- **Stop condition:** Stop if backend/platform cannot supply authoritative state and transition eligibility.

### TG21 — Capability-Driven Journey Visibility

- **Objective:** Drive applicable journey steps/cards from authoritative capability/template state.
- **Scope:** Mapping, visibility, ordering, unknown-state safety, draft behavior on change.
- **Requirements:** Req 1–4, 15, 23–25; new E4 requirement required.
- **Design references:** E4; Property 5; Alias Routing; lifecycle changed-step flow.
- **Dependencies:** TG18, TG20, capability/template ownership.
- **Reusable components:** Existing wizard step renderer, step cards, alias constants, update notice.
- **Reusable repositories:** Onboarding status/template repositories and central query keys.
- **Reusable services:** Existing template/status services after backend inventory.
- **Expected tests:** Multiple specialties/capabilities, aliases, unknowns, ordering changes, drafts, tenant switching.
- **Expected documentation updates:** Capability contract, alias audit, mapping/design, coverage/task evidence.
- **Stop condition:** Stop if visibility requires hardcoded clinic type or frontend-owned capability truth.

### TG22 — Ready-to-Start Checklist and Readiness Explanation

- **Objective:** Deliver authoritative readiness explanation and safe commercial handoff.
- **Scope:** Checklist/blocker/action UX and confirmation; no trial/subscription activation unless separately authorized.
- **Requirements:** Req 13, 15, 17, 23–28, 32, and Req 34.
- **Design references:** E5 Ready-to-Start Constitutional Contract; TG17 routing; TG20 state ownership; TG21 projection ownership; Backend Dependencies; E2E strategy.
- **Dependencies:** TG18, TG20, TG21, and the approved Req 34/E5 readiness-provider and blocker/action contracts.
- **Reusable components:** `GoLiveScreen`, `SetupWizardFlow`, compatibility `DemoStatusBanner`, step/status/card primitives.
- **Reusable repositories:** Onboarding status/complete/demo-status repositories where semantically valid.
- **Reusable services:** Existing onboarding progress/validation, TG20 Workspace Preparation query, TG21 Journey Visibility query, Effective Tenant, tenant RBAC, and existing resolution owners; no presentation API calls.
- **Expected tests:** Ready/not-ready/stale/error, action routing, disabled reasons, no early trial, tenant switch, a11y/i18n.
- **Expected documentation updates:** Task completion evidence only; Req 34 and E5 are frozen.
- **Implementation order:** TG22.1A backend domain/provider contract; TG22.1B backend application composition; TG22.1C transport/authorization; TG22.2A frontend data/domain; TG22.2B presentation; TG22.3 final acceptance.
- **Constitutional boundary:** Backend composition is the sole aggregate readiness authority; domain providers retain evidence truth; frontend renders only complete authoritative results. Next actions are bounded navigation/refresh/retry/support descriptors to approved existing owners. No override, general Journey Action engine, background processor, readiness persistence, migration, or commercial activation is authorized.
- **Version 1 providers:** `journey_setup_progress` and `workspace_preparation`. Missing, partial, unknown, stale, conflicting, or failed required provider input fails closed.
- **Provider policy freeze:** Req 34/E5 now fixes required versus optional setup behavior, actual validation-severity mapping, every TG20 state/missing/stale/unsupported mapping, one workspace item, aggregate precedence, stable IDs/token families, and the exact four-action owner/target allowlist. No support action is authorized because no dedicated support owner exists.
- **Readiness identity:** `(readiness_contract_version, tenant_id, journey_projection_identity, provider_set_revision, evidence_revision)`.
- **Stop condition:** Stop if readiness eligibility, provider evidence, or blocker resolution cannot be obtained from the approved authoritative owners without redefining their domain contracts.

### TG23 — Draft Conflict and Multi-Clinic Recovery

- **Objective:** Implement deterministic server/local conflict and multi-device/tenant behavior.
- **Scope:** Timestamp mapping, conflict policy/UI, draft cleanup, tenant-switch integration.
- **Requirements:** Req 9, 11, 16, 17, 29–32.
- **Design references:** E6; deferred conflict modal/data flow; tenant checklist.
- **Dependencies:** Backend Req 29 contract; accepted conflict policy; TG13–TG15 foundations.
- **Reusable components:** Existing modal/dialog, inline notice, wizard draft store, status UI.
- **Reusable repositories:** Onboarding status repository and DTO mapping.
- **Reusable services:** Existing status service; backend timestamp contract implementation if authorized.
- **Expected tests:** Use Latest/Keep Local, missing timestamp, multi-device, logout/login, tenant switch, accessibility.
- **Expected documentation updates:** Req 29 contract evidence, conflict design, tenant matrix, task/release evidence.
- **Stop condition:** Stop if per-step revision/timestamp semantics or conflict decisions remain ambiguous.

### TG24 — Central Onboarding Error and Retry Contract

- **Objective:** Establish localized error categories and safe retry eligibility before any offline queue.
- **Scope:** Mapper boundary, catalog, retryable/non-retryable classification, presentation contract; no queue.
- **Requirements:** Req 20, 23, 24, 25, 28.
- **Design references:** E7; Deferred Error Handling; Dependency Rules.
- **Dependencies:** Backend error taxonomy; analytics provider/stub decision; existing utility audit.
- **Reusable components:** Existing error notices/banners and form error primitives.
- **Reusable repositories:** Repository mutation/query error surfaces.
- **Reusable services:** `core/utils/errorHandler.ts`, `useApiErrorHandler`, and existing axios error mapping, subject to reuse audit.
- **Expected tests:** Status/code mapping, safe fallback, interpolation, retry classification, no raw errors, accessibility.
- **Expected documentation updates:** Error taxonomy, localization catalog, analytics events, architecture decision.
- **Stop condition:** Stop if error ownership or retry safety cannot be expressed without a global unsafe interceptor.

### TG25 — Tenant-Scoped Offline Mutation Recovery

- **Objective:** Implement the accepted queue/replay/manual-recovery contract.
- **Scope:** Supported operations, persistence, FIFO flush, stable idempotency keys, attempt limits, dead-letter/manual retry, cleanup.
- **Requirements:** Req 8, 12, 22–24, 26, 28, 30, 32.
- **Design references:** E7; deferred PendingMutationStore/flows; platform idempotency assessment.
- **Dependencies:** TG24; platform idempotency; security approval; staging replay access.
- **Reusable components:** `OfflineBanner`, existing CTA/error/notice primitives.
- **Reusable repositories:** Existing onboarding mutation repositories; queue orchestration must not bypass them.
- **Reusable services:** Platform idempotent endpoints and existing onboarding services; no global retry by default.
- **Expected tests:** Offline/online, kill/restart, FIFO, same-key replay, max attempts, conflict, tenant switch/logout, E2E Run D.
- **Expected documentation updates:** Queue contract, supported-operation list, storage/security decision, replay checklist, task evidence.
- **Stop condition:** Stop if any queued operation lacks an idempotency contract or tenant-safe serialized descriptor.

### TG26 — Ready-to-Start Commercial Trial Lifecycle

- **Objective:** Implement accepted trial start and active/expiring/expired states after readiness.
- **Scope:** Commercial-trial domain/presentation; remove dependency on Demo semantics for target behavior.
- **Requirements:** Req 13, 15, 18, 24–28, 32; new E8 requirements required.
- **Design references:** E8; TG17 compatibility boundary; subscription dependencies.
- **Dependencies:** TG22; commercial policy; backend trial contract; TG24 errors.
- **Reusable components:** Existing status banner/card/countdown and loading/error primitives after semantic audit.
- **Reusable repositories:** Demo/subscription/onboarding repositories only where contracts truly match; rename/refactor requires accepted migration design.
- **Reusable services:** Existing transition/subscription services after endpoint verification.
- **Expected tests:** Start eligibility, dates, active/expiring/expired, idempotency, invalidation/session refresh, tenant switch, a11y/i18n.
- **Expected documentation updates:** Trial policy/requirements/design, terminology migration, task and release evidence.
- **Stop condition:** Stop if trial start/extension/expiry policy or backend authority is unresolved.

### TG27 — Subscription Conversion and Pending Payment Recovery

- **Objective:** Deliver safe paid conversion and resume interrupted verification.
- **Scope:** Pending verification query, recovery CTA/routing, idempotent conversion, definitive outcomes.
- **Requirements:** Req 12, 18–20, 23–28, 30, 32.
- **Design references:** E9; deferred payment recovery; Backend Dependencies.
- **Dependencies:** TG24, TG26; payment/security ownership; accepted endpoint/state contract.
- **Reusable components:** Billing/payment screens, recovery banner/alert patterns, form/status primitives.
- **Reusable repositories:** Existing subscription/payment repositories and query keys.
- **Reusable services:** Existing checkout/transition/payment verification services after contract audit.
- **Expected tests:** Restart/resume, duplicate prevention, pending/success/failure, tenant isolation, protected-data checks, accessibility/i18n.
- **Expected documentation updates:** Payment security decision, endpoint contract, recovery state design, task/release evidence.
- **Stop condition:** Stop if pending-verification ownership/endpoint or secure persistence rules are not accepted.

### TG28 — Informational Dunning

- **Objective:** Present authoritative commercial notices with owned actions.
- **Scope:** Accepted notice states, timing, presentation, acknowledgement/action; no client-created billing policy.
- **Requirements:** Req 20, 24, 25, 28; new E10 requirements required.
- **Design references:** E10; error/analytics/theme/i18n/accessibility sections.
- **Dependencies:** TG26, TG27; commercial policy; notice data/channel ownership.
- **Reusable components:** Existing banner/notification/card/action primitives.
- **Reusable repositories:** Subscription/notification repositories if their contracts fit.
- **Reusable services:** Existing subscription/notification services after reuse audit.
- **Expected tests:** Notice priority/supersession, dates/actions, tenant switch, missing data, localization, accessibility.
- **Expected documentation updates:** Dunning policy, requirements/design, localization review, task/release evidence.
- **Stop condition:** Stop if trigger, severity, consequence, or action is not product/commercial-owner approved.

### TG29 — Dashboard First Actions

- **Objective:** Provide capability-relevant first actions after the accepted activation milestone.
- **Scope:** Dashboard onboarding guidance only; no Doctor Module or clinical workflow changes.
- **Requirements:** Req 14, 15, 21, 23–25, 28; new E11 requirements required.
- **Design references:** E11; E1 Journey Cards; ownership map; Architecture.
- **Dependencies:** TG18, TG21, TG22, TG26/27 activation semantics; dashboard boundary acceptance.
- **Reusable components:** Existing dashboard/card/navigation/progress primitives outside excluded Doctor ownership.
- **Reusable repositories:** Capability/journey/onboarding repositories; no direct APIs.
- **Reusable services:** Existing non-clinical dashboard/onboarding services after scope audit.
- **Expected tests:** Capability relevance, empty/completed states, action routing, specialties, tenant switch, a11y/i18n.
- **Expected documentation updates:** Dashboard ownership boundary, first-action requirements/design, task evidence.
- **Stop condition:** Stop if work requires Doctor Module, clinical workflow changes, or frontend-owned completion truth.

### TG30 — Continuous Growth Guidance and Progressive Branding

- **Objective:** Extend first actions into accepted ongoing guidance with consistent Progressive Experience presentation.
- **Scope:** Guidance lifecycle, defer/dismiss/completion semantics, approved progressive branding criteria.
- **Requirements:** Req 14, 15, 21, 23–25, 28; new E11 requirements required.
- **Design references:** E11; Journey Card contract; Theme Compliance; analytics guidance.
- **Dependencies:** TG29; product growth model; branding/design-system acceptance; analytics decision.
- **Reusable components:** Journey Cards, dashboard guidance, central brand/theme/icon assets.
- **Reusable repositories:** Journey/capability/action repositories.
- **Reusable services:** Existing guidance/analytics services if present; otherwise stop for design.
- **Expected tests:** Prioritization inputs, completed/deferred states, specialty variation, reduced motion, tenant switching, i18n/a11y.
- **Expected documentation updates:** Growth guidance requirements/design, branding criteria, analytics events, task evidence.
- **Stop condition:** Stop if guidance value/eligibility or branding criteria are cosmetic assumptions rather than accepted product rules.

### TG31 — Phase 2 Cross-Cutting Verification and Exit

- **Objective:** Prove Phase 2 traceability, safety, consistency, and release readiness.
- **Scope:** Documentation and relevant corrections inside PE scope; automated/staging/device verification; no unrelated debt cleanup.
- **Requirements:** Req 14, 15, 19–25, 28, 30–32 plus all accepted Phase 2 requirements.
- **Design references:** E12; Testing Strategy; Release Checklist; Git Delivery Strategy.
- **Dependencies:** Every implemented Phase 2 group; safe staging/device access; accepted exit matrix.
- **Reusable components:** Not an implementation objective; audit all used assets.
- **Reusable repositories:** Not an implementation objective; verify boundaries and query scoping.
- **Reusable services:** Not an implementation objective; verify contracts, idempotency, security, and ownership.
- **Expected tests:** Relevant unit/integration suites; full PE journeys; tenants/specialties/locales/accessibility; slow/offline/restart/replay; commercial states.
- **Expected documentation updates:** Final coverage matrix, test/staging evidence, open debt, release decision, roadmap status.
- **Stop condition:** Stop release if any required trace, staging gate, security issue, tenant leak, accessibility blocker, or critical journey run fails.

## 9. Mandatory Architecture and Experience Principles

These principles apply to every future task group and are acceptance gates, not optional cleanup.

### 9.1 Central Theme Only

- All UI uses the central application theme/design system.
- No screen-specific colors, typography, spacing, radii, shadows, or icon styling.
- No inline styling unless already permitted by accepted architecture.
- Existing tokens/assets must be reused before adding a token or visual primitive.
- A touched-file theme audit and focused test/review evidence are required.

### 9.2 Localization First

- No hardcoded user-visible strings.
- Every string is added through the localization framework in `en-US` and `hi-IN`.
- Interpolation variables must match across locales.
- Hindi copy requires a Hindi-literate review before user-facing release.
- Server-provided labels/errors require an accepted localization/mapping policy; raw strings must not silently bypass it.

### 9.3 Accessibility by Contract

- Each new UI state defines semantic role, label, state, focus behavior, live-region behavior, touch target, and non-color representation.
- Dialogs define focus entry, containment, action consequence, and focus return.
- Progress, urgency, errors, pending, disabled, and completion states are understandable without color.
- Reduced motion and assistive-technology flows are included where applicable.

### 9.4 Reuse Before Create

Before introducing a component, store, repository, hook, service, query, or mutation, the task group must record:

1. existing assets searched;
2. candidates inspected;
3. why each candidate is reusable, extensible, or unsuitable;
4. the smallest justified addition if no candidate fits.

Duplicate implementations are prohibited. Convenience is not evidence that reuse is impossible.

### 9.5 Clean Architecture

```text
Presentation
↓
Application
↓
Domain
↓
Repository
↓
Infrastructure
```

- Presentation does not call APIs/services directly.
- Repository hooks own query/mutation setup and scoped invalidation.
- Application/presentation orchestration does not move backend truth into Zustand or component state.
- Business policy does not live in UI components.
- Query keys are centralized and tenant scoped.
- Stores use synchronous state actions; async persistence/orchestration follows accepted boundaries.

### 9.6 Multi-Clinic and Specialty Extensibility

- No assumptions about one clinic, clinic type, or specialty.
- No Ayurveda-specific behavior is hardcoded into shared Progressive Experience flows.
- Effective tenant/clinic is explicit in storage, queries, mutations, navigation, analytics, and errors.
- Tenant switching invalidates or isolates all clinic-specific state.
- Org-admin exceptions require explicit policy and tests.

### 9.7 Progressive Experience Consistency

- Every feature maps to the approved journey.
- Do not reintroduce Demo Mode as target onboarding.
- Use Ready-to-Start terminology.
- Commercial Trial begins only after authoritative Ready to Start.
- Frontend does not own readiness, workspace, subscription, payment, or completion truth.

## 10. Testing Strategy

Every task group must define the smallest relevant automated and human verification matrix before implementation.

| Layer | Required evidence |
|---|---|
| Domain/unit | State mapping, eligibility, ordering, versioning, unknown/error behavior, and pure policy boundaries. |
| Store/persistence | Migration, corruption, expiry, tenant scope, logout/switch cleanup, size/security, kill/restart where applicable. |
| Repository/service | Request/response mapping, scoped query keys, invalidation, idempotency keys, retry classification, and typed errors. |
| Component | Theme tokens, localized copy, accessibility semantics/state, pending/disabled/error/empty states. |
| Integration | Journey navigation, server refresh ordering, tenant switching, multi-device/conflict, capability changes, and commercial transitions. |
| Backend contract | Authorization, tenant isolation, idempotent replay, conflicts, timestamps/revisions, subscription/payment states. |
| E2E | New/direct clinic paths, multiple specialties, Ready-to-Start, trial, payment recovery, slow/offline/restart, and dashboard handoff. |
| Localization/accessibility | EN/HI parity/interpolation, Hindi review, screen reader/focus/touch target/reduced motion checks. |

Req 32 Runs A–D remain mandatory for the existing hardening release. Phase 2 must extend—not replace—that matrix with the journeys each implemented epic introduces. Baseline unrelated failures must be classified with evidence; they cannot be used to ignore new regressions.

## 11. Implementation Order

1. Complete release validation for Req 11/12/32 when staging/device access exists.
2. Review and accept this roadmap.
3. Write/approve E1 requirements and design; only then assess TG18 readiness.
4. Plan TG19 clinic entry and TG20 workspace preparation around authoritative tenant/provisioning contracts.
5. Plan TG21 capability visibility and TG22 readiness after journey/workspace foundations.
6. Resolve Req 29 and plan TG23 conflict/multi-clinic recovery.
7. Accept TG24 error/retry contract before TG25 offline mutation recovery.
8. Accept commercial policy, then TG26 trial, TG27 subscription/payment recovery, and TG28 dunning.
9. Establish dashboard ownership boundary, then TG29 first actions and TG30 growth guidance.
10. Run TG31 cross-cutting verification and release exit only after the selected Phase 2 scope is implemented.

Task groups may be split or reordered after design review. Numbers remain roadmap identifiers, not implementation authorization.

## 12. Release Strategy

- Continue paired frontend/backend feature branches and clean worktrees for any authorized Phase 2 slice.
- Do not merge directly to `dev`; follow the canonical Git Delivery Strategy through feature verification and integration gates.
- Keep release validation separate from feature development.
- A task group is releasable only when its dependencies, automated tests, documentation, localization, accessibility, security, multi-clinic, and relevant staging/E2E gates pass.
- Commercial work requires safe staging tenants/payment configuration and rollback/support ownership.
- Capability/readiness/workspace state must be backward compatible or versioned before rollout.
- Progressive rollout/feature flags may be used only through an existing approved platform capability or a separately accepted design; this roadmap does not invent one.
- Production promotion remains blocked until the recorded Req 11/12/32 gates pass.

## 13. Open Decisions Register

| Decision | Blocks |
|---|---|
| Canonical journey version ownership and delivery model | TG18, TG21, TG29–TG30 |
| Journey Card eligibility/progress source | TG18 and consumers |
| Product definition of Bring Your Clinic | TG19 |
| Effective tenant selection for multi-clinic owners | TG19 and every tenant-sensitive group |
| Workspace preparation state/refresh/retry contract | TG20 |
| Capability/template authority and versioning — resolved by Requirement 33 and the E4 design contract | Resolved for TG21 planning |
| Readiness provider/blocker/action contract | TG22, TG26 |
| Mandatory per-step timestamp/revision contract | TG23 |
| Central error taxonomy and analytics provider/stub | TG24–TG31 |
| Offline queue supported operations, retry, dead-letter, and security policy | TG25 |
| Trial start, duration, extension, expiry, and transition policy | TG26 |
| Pending payment verification endpoint and payment/security ownership | TG27 |
| Dunning triggers, timing, severity, consequence, and channels | TG28 |
| Dashboard ownership boundary and first-action source | TG29 |
| Continuous-growth eligibility and progressive-branding criteria | TG30 |
| Hindi review owner, staging/device access, and Phase 2 release matrix | TG31 |

## 14. Future Phase Exit Criteria

Progressive Experience Phase 2 may be declared complete only when:

1. Every in-scope epic has accepted requirements, design, ownership, dependencies, implementation evidence, tests, and release evidence.
2. Every deferred/out-of-scope epic is explicitly recorded with owner and rationale.
3. No requirements are left without a task or documented non-implementation disposition.
4. No task group claims user-journey completion for recovery/platform work alone.
5. Ready-to-Start and commercial-trial ordering is enforced by authoritative state.
6. Demo Mode is absent from the target onboarding journey.
7. Theme, localization, accessibility, reuse, clean architecture, security, multi-clinic, and specialty-extensibility gates pass.
8. Req 11/12/32 staging and physical/emulated-device verification is recorded as passed.
9. Phase 2 journeys pass the approved E2E matrix without tenant leakage, duplicate side effects, silent data loss, or inaccessible blockers.
10. Canonical documents contain the final product → requirement → design → epic → task → implementation → test → release trace.
11. Doctor Module and clinical workflows remain outside Progressive Experience scope.
12. Production promotion has an explicit GO decision from the appropriate product, engineering, security, localization, accessibility, and release owners.

## 15. Roadmap Governance

This file is the master roadmap for future Progressive Experience onboarding planning. It does not replace detailed accepted requirements, design, or task evidence. Instead, it governs how those artifacts are created and traced.

For every future task group:

1. update canonical requirements and design first when the capability is not already sufficiently specified;
2. record ownership and open decisions;
3. perform the reuse audit;
4. define tests and stop condition;
5. obtain explicit implementation authorization;
6. implement only the bounded accepted scope;
7. update canonical task evidence and coverage;
8. complete release gates before promotion.

No task group in this roadmap is authorized merely because it has a number or an implementation sequence.
