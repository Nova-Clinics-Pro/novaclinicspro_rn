# Progressive Experience Traceability Audit

Date: 2026-07-20

Status: Complete product traceability audit; planning evidence only

## 1. Audit Decision

The complete Progressive Experience product vision is **not** represented by the current combination of `requirements.md`, `design.md`, and `tasks.md`.

The canonical specifications are strong and unusually detailed for onboarding production hardening. They trace routing correctness, submission safety, draft recovery, offline awareness, lifecycle recovery, tenant isolation, idempotency, localization, accessibility, and release verification. They do not, however, decompose the full accepted clinic and commercial lifecycle into requirements, design, and implementation tasks.

The accepted lifecycle is:

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

Task Groups 1–17 substantially harden the setup wizard and add bounded recovery and presentation improvements. They do not deliver the full lifecycle above. A new **Progressive Experience planning phase is required before further implementation**, but this audit does not create Task Group 18 or authorize code.

## 2. Canonical Sources and Method

This audit treats the tracked files under `frontend/docs/Onboarding/progressive-experience/` as authoritative and does not use `.kiro` as a source of truth.

| Source | Traceability use |
|---|---|
| `ADR-PE-000.md` | Canonical-document governance and phase terminology. |
| `ownership-map.md` | Broad product boundary: registration, identity, workspace, trial/subscription, readiness, journey, localization, dashboard first actions, branding, financial setup, Bring Your Clinic, and guidance. |
| `onboarding-dev-reconciliation.md` | Original accepted lifecycle, product philosophy, dev evidence, and contradictions between the lifecycle and hardening specifications. |
| `requirements.md` | All 32 accepted hardening requirements and acceptance criteria. |
| `design.md` | Release-now/harden-later architecture, correctness properties, component/data-flow design, verification, and deferred areas. |
| `tasks.md` | Recovery checkpoint, Task Groups 1–17, repeated coverage matrices, evidence, explicit non-goals, and post-dev-sync reconciliation. |
| `current-behavior-inventory.md` | Pre-recovery frontend/backend behavior and unresolved areas. |
| `platform-idempotency-assessment.md` | Backend replay risk, platform ownership decision, implementation evidence, and tenant/staging gaps. |
| `progressive-experience-recovery-checkpoint.md` | Governance recovery, backend idempotency, localization, test baseline, staging blockers, and promotion decision. |
| `migration-fixtures.md` | Required tenant, replay, concurrency, cross-tenant, and localization fixtures. |

Classification used below:

- **COMPLETE**: accepted behavior and focused evidence are recorded as complete.
- **PARTIAL**: a meaningful subset exists, but one or more acceptance criteria or product slices remain.
- **NOT_STARTED**: no implementation task delivers the requirement.
- **STAGING_ONLY**: implementation/code evidence exists, but the acceptance decision requires a deployed environment or device run.
- **OPEN_DECISION**: implementation is blocked by an unresolved contract or ownership decision.
- **DEFERRED**: deliberately excluded from completed task scope.
- **UNREPRESENTED**: present in the accepted product vision or ownership boundary, but absent as an actionable requirement/design/task chain.

## 3. Original Product Vision and End-to-End Journey

The original vision is larger than “make the setup wizard safe.” It is a progressive clinic activation and commercial journey in which the product helps a clinic establish identity, prepares its workspace, guides personalization, proves readiness, begins a time-bound commercial trial only after readiness, communicates approaching commercial consequences, converts the clinic to a paid subscription, and continues to guide growth.

The intended journey can be traced as follows:

| Journey stage | Intended user outcome | Current specification representation | Delivery state |
|---|---|---|---|
| Create Account | A clinic owner establishes an authenticated identity and begins the correct path. | Implied by existing registration/choice flows and ownership map; not decomposed in the 32 requirements. | Existing product surface; not audited as a completed PE task. |
| Create Clinic Identity | The owner creates or brings a clinic and provides identity/contact data. | Ownership map; existing `ChoiceScreen` and `ClinicProfileScreen`; draft integration in TG14. No accepted refinement criteria. | PARTIAL / UNREPRESENTED as a product slice. |
| Nova Prepares Workspace | The platform provisions a usable workspace and explains progress. | Ownership map and candidate reviews only; external management routes exist. No concrete requirement or design. | UNREPRESENTED. |
| Review & Personalize | The owner completes guided setup: profile, hours, rooms, staff, services, billing, and payment configuration. | Strongly represented by wizard routing, drafts, lifecycle sync, offline gating, and existing step screens. | PARTIAL: wizard mechanics are strong; capability-driven guidance and financial completion are incomplete. |
| Ready to Start | The clinic sees authoritative readiness and completes a checklist without the frontend inventing readiness truth. | Existing server status and `GoLiveScreen`; Req 13; TG17 routes the banner to the checklist gate. | PARTIAL: navigation exists; readiness providers/policy and broader dashboard experience are not specified. |
| 30-Day Commercial Trial | Trial begins after readiness and the clinic can understand its commercial state. | Accepted wording, demo-status assets, Req 13, TG17 action wiring. | PARTIAL: no complete trial-start, expiry, extension, or lifecycle contract. |
| Informational Dunning | The clinic receives non-destructive warnings before commercial access changes. | Named in the accepted lifecycle and candidate reviews only. | UNREPRESENTED. |
| Paid Subscription | The clinic completes or resumes payment and transitions safely to paid service. | Req 18, subscription/payment screens and APIs, but no accepted recovery or conversion design. | NOT_STARTED / OPEN_DECISION. |
| Continuous Growth | The activated clinic receives first actions, ongoing guidance, and progressive capability discovery. | Ownership map mentions dashboard first actions, guidance, branding, and continuous growth; no requirements/tasks. | UNREPRESENTED. |

The lifecycle also states that **Demo is not onboarding**. Demo/sample-clinic behavior may remain as guided walkthrough, sales/education material, or legacy compatibility. TG17 correctly treats `DemoStatusBanner` as a compatibility surface and does not allow it to own readiness, activation, workspace, or subscription truth. The specifications still use legacy Demo/Live terminology in Requirement 13, so the conceptual boundary is clearer in reconciliation/task notes than in the requirement title itself.

## 4. Requirements-to-Design-to-Task Traceability

| Req | Requirement | Relevant design | Task/evidence | Current state | Remaining traceability gap |
|---:|---|---|---|---|---|
| 1 | StepDetail service-alias routing | Hardening items 1–2; §1.1; Property 5 | TG1, TG2, TG5 | COMPLETE | Re-audit only if active backend templates change. |
| 2 | SetupWizardFlow alias routing | Hardening items 1–3; §1.2; Property 5 | TG1, TG3, TG5 | COMPLETE | None for the known alias inventory. |
| 3 | Delete unused Treatments screen | Hardening item 4; §1.3 | TG4, TG5 | COMPLETE | None. |
| 4 | Backend template alias audit | Alias design and release validation | TG1/TG5 evidence | PARTIAL | No enduring backend-template inventory task; repeat if templates drift. |
| 5 | WizardDraftStore schema/persistence | Deferred components/data models/flows; dependency rules | TG13, TG15 | COMPLETE | Journey version identity and remote configuration are future concerns, not current schema gaps. |
| 6 | Draft integration in step screens | Deferred components/flows; architecture rules | TG14, TG15 | COMPLETE | Release verification only. |
| 7 | OfflineBanner | Deferred component/error/testing sections | TG16 | COMPLETE | Device/offline E2E remains under Req 32. |
| 8 | Offline gating, queue, retry, and flush | Deferred `PendingMutationStore`, retry flow, error behavior | TG16 delivers banner/gating only | PARTIAL | No task for queue persistence, FIFO flush, retry policy, dead-letter UX, or Axios recovery. |
| 9 | App background/foreground behavior | Deferred lifecycle flow | TG15 | COMPLETE | Conflict resolution and polling were intentionally excluded. |
| 10 | Android hardware back | Hardening item 8; Property 4 | TG10, TG14 | COMPLETE | None. |
| 11 | Tenant identity fix/verification | Backend dependencies and release checklist | TG11 verification remains open | STAGING_ONLY | Provisional/live/multi-clinic/tenant-switch confirmation; removal or formalization of fallback remains unresolved. |
| 12 | Idempotency keys and backend replay | Backend dependencies plus platform assessment | TG6 frontend; R0/backend platform implementation; TG11 staging checks | PARTIAL | Step replay is code-verified; staging replay and full mutating-operation coverage remain. |
| 13 | Demo/live hooks and banner wiring | Existing banner/query architecture; query invalidation rules | TG17 | COMPLETE for bounded banner wiring | The requirement wording suggests real extend/transition actions, while TG17 deliberately provides presentation routing only; subscription conversion/direct activation remain excluded. |
| 14 | Theme compliance | Theme Compliance | Cross-cutting TGs | PARTIAL | Touched PE UI complies; no full legacy audit. |
| 15 | Automated coverage | Testing Strategy | Cross-cutting focused tests | PARTIAL | Baseline frontend debt, unresolved-feature tests, and E2E remain. |
| 16 | Server/local draft conflict modal | Deferred component/property | No implementation group | NOT_STARTED | Blocked by Req 29 and conflict policy. |
| 17 | Multi-device validation | Deferred data flow | No implementation group | NOT_STARTED | Requires timestamp contract and conflict behavior. |
| 18 | Pending payment recovery | Deferred error/backend dependency notes | No implementation group | NOT_STARTED | Subscription endpoint ownership, verification state, navigation, and recovery UX need design. |
| 19 | Storage security audit | Deferred security notes | TG13 field-level assessment only | PARTIAL | No project-level classification or accepted SecureStore decision. |
| 20 | Central onboarding error messages | Deferred Error Handling | No implementation group | NOT_STARTED | Mapper boundary, localized catalog, retry/error ownership, and tests are undefined. |
| 21 | Zero hardcoded design values | Theme Compliance | Cross-cutting touched-file reviews | PARTIAL | No systematic legacy Progressive Experience audit. |
| 22 | Zustand architecture | Dependency Rules | TG13–TG15 | PARTIAL | Current wizard store is compliant; any pending-mutation store requires a new review. |
| 23 | Hook/service architecture | Layer Map and Dependency Rules | Cross-cutting repository/API evidence | PARTIAL | Legacy direct datasource calls remain outside current task authorization. |
| 24 | Internationalization | Theme/i18n governance and error text notes | R0; TG14–TG17 | PARTIAL | Touched copy has parity; future error/payment/conflict/journey copy and Hindi review remain. |
| 25 | Accessibility | Deferred accessibility tests/components | TG16/TG17 touched UI | PARTIAL | Conflict/payment and broader legacy accessibility remain. |
| 26 | Duplicate submission locking | Properties 1–3; submit/refetch flow | TG6, TG7, TG9; later CTA states | PARTIAL | Core step submission is complete; future commercial/payment mutations require equivalent locking. |
| 27 | Query invalidation | Repository rules and submit flow | TG8/TG9; TG15/TG17 bounded behavior | PARTIAL | Demo extend/transition invalidation and session refresh are not delivered as commercial mutations. |
| 28 | Analytics/audit events | Deferred analytics/error notes | Console logging paths only | PARTIAL | No accepted provider/stub, event catalog implementation, or end-to-end support trail. |
| 29 | Mandatory backend per-step `updated_at` | Deferred DTO/backend dependency | Frontend field only | OPEN_DECISION | Backend guarantee and staging proof are absent. |
| 30 | Tenant-scoped draft/mutation storage | Deferred data models plus recovery tenant checklist | TG13–TG15 for drafts | PARTIAL | Draft isolation exists; pending-mutation isolation cannot exist until Req 8 queue design. |
| 31 | Draft expiry | Deferred data model | TG13 | PARTIAL | Core expiry works; remote-config override and structured event remain undecided. |
| 32 | End-to-end release verification | E2E Runs A–D and release checklist | TG11/TG12 checkpoint references | STAGING_ONLY | Runs A–D and explicit tenant/replay sign-off are not executed. |

### Requirements with no implementation task

The requirements that have no completed or authorized implementation group for their central behavior are:

- Req 16 — draft conflict resolution;
- Req 17 — multi-device validation;
- Req 18 — pending payment recovery;
- Req 20 — centralized onboarding error mapping;
- Req 29 — mandatory backend per-step timestamp contract.

Req 8 also lacks a task for most of its central promise: durable pending mutations, automatic retry/flush, FIFO ordering, attempt limits, and dead-letter recovery. Req 28 has incidental console evidence but no task for its structured event catalog. Req 19 has only a bounded field review, not the required full security audit.

Req 11 and Req 32 are not missing implementation tasks in the same sense; their remaining acceptance work is staging/release verification rather than a code slice.

## 5. Design Coverage and Gaps

The design is strongest where the original production-hardening checkpoint is strongest:

- alias consistency and dead-code removal;
- submit/refetch/advance ordering;
- duplicate-submission prevention and stale callback safety;
- scoped query invalidation;
- Android back behavior;
- clean-architecture dependency rules;
- manual release verification and Git delivery gates.

The design records post-release concepts for drafts, offline behavior, conflicts, errors, analytics, accessibility, and backend contracts, but many appear only as deferred component/data-flow notes. Those notes were enough to safely carve out TG13–TG16; they are not sufficient to authorize the remaining queue, conflict, commercial, or analytics work.

The design does not provide product-level decomposition for:

- account and clinic creation variants, including Bring Your Clinic;
- workspace provisioning and preparation feedback;
- journey cards, guidance, and journey versioning;
- capability-driven step visibility;
- authoritative readiness providers and readiness explanation;
- commercial trial start, expiry, extension, and conversion policy;
- informational dunning;
- subscription checkout/recovery ownership and failure states;
- post-activation dashboard first actions and continuous growth;
- progressive branding as a coherent experience rather than isolated copy.

Consequently, the design is an onboarding hardening design, not a complete Progressive Experience product design.

## 6. Completed Task Groups and What They Delivered

| Group | Delivery | Primary classification |
|---|---|---|
| R0 | Canonicalized documentation, created clean paired recovery branches, audited behavior, implemented backend platform idempotency, completed Hindi keys, repaired migration verification, and recorded release blockers. | RECOVERY / GOVERNANCE / PLATFORM HARDENING |
| 1 | Shared service-catalogue alias constant. | USER-JOURNEY DEFECT FIX |
| 2 | StepDetail alias routing. | USER-JOURNEY DEFECT FIX |
| 3 | Embedded wizard alias routing. | USER-JOURNEY DEFECT FIX |
| 4 | Removed unused Treatments onboarding screen. | TECHNICAL CLEANUP |
| 5 | Alias-routing checkpoint and evidence. | VERIFICATION / HARDENING |
| 6 | Duplicate submit lock, stale submission guard, and frontend idempotency key behavior. | RELIABILITY HARDENING |
| 7 | Submit → refetch → advance ordering. | RELIABILITY HARDENING WITH DIRECT UX VALUE |
| 8 | Onboarding-status query invalidation. | DATA-CONSISTENCY HARDENING |
| 9 | Submission-ordering/invalidation checkpoint. | VERIFICATION / HARDENING |
| 10 | Android hardware-back interception and later draft-safe navigation. | USER-JOURNEY DEFECT FIX / RECOVERY |
| 11 | Tenant resolution and backend idempotency verification work. Code evidence is strong; staging items remain open. | RELEASE VERIFICATION / PLATFORM HARDENING |
| 12 | Final production-hardening checkpoint. It remains open because staging/release acceptance is incomplete. | RELEASE GATE, NOT A DELIVERED JOURNEY SLICE |
| 13 | Tenant/user-scoped draft store, schema migration, compression, expiry, cleanup, and safety decisions. | RECOVERY / DATA-SAFETY FEATURE |
| 14 | Draft auto-save/restore/clear integration across required step screens. | END-USER RECOVERY FEATURE |
| 15 | Background sync, foreground hydrate/refetch, and changed-step notice. | END-USER RECOVERY FEATURE |
| 16 | Offline visibility and known-offline submit/complete gating. | END-USER RESILIENCE FEATURE; PARTIAL REQ 8 |
| 17 | Compatibility banner rendering/action wiring and route to the existing Ready-to-Start checklist without bypassing backend/commercial ownership. | BOUNDED END-USER JOURNEY DELIVERY |

Task Groups that were primarily recovery or technical hardening rather than new end-user journey delivery are R0, 4–9, 11, 12, and significant parts of 13. Groups 1–3 and 10 repair journey-breaking defects. Groups 14–17 provide visible recovery/resilience or navigation value, but they still improve an existing setup journey rather than complete the broader clinic/commercial lifecycle.

## 7. Capabilities That Disappeared from the Roadmap

The following capabilities are present in the accepted lifecycle, ownership map, or later candidate reviews but never became an accepted requirement → design → task chain:

| Capability | Where it survived | Roadmap state |
|---|---|---|
| Journey Cards | Candidate reviews in TG15–TG17 | No requirement, design, or task. |
| Journey Versioning | TG13 follow-up and candidate reviews | Draft identity warning only; no journey contract. |
| Capability-driven visibility | Candidate reviews/ownership reasoning | No authoritative capability model or task. |
| Workspace preparation | Accepted lifecycle and ownership map | No product/design slice. |
| Readiness providers | Candidate reviews and server-truth guardrails | No provider contract or explanatory UX design. |
| Informational dunning | Accepted lifecycle | No requirement, policy, design, or task. |
| Progressive branding | Ownership map and localized copy | Deferred without accepted criteria. |
| Bring Your Clinic | Ownership map and existing choice/application assets | Undefined scope; no task. |
| Clinic identity refinement | Ownership map/existing profile screen | No accepted next behavior. |
| Clinic contact refinement | Existing profile behavior | No standalone requirement or task. |
| Progressive financial configuration | Ownership map, Req 18 adjacency, existing screens | No end-to-end financial readiness/conversion design. |
| Dashboard first actions | Ownership map and “Continuous Growth” stage | No requirements/tasks. |
| Onboarding guidance / continuous growth | Ownership map and lifecycle | No post-activation product design. |

These are not minor acceptance-criteria omissions. Together they represent most of the differentiation implied by the name “Progressive Experience.”

## 8. Implemented Work Not Clearly Represented in the Original Journey

Several valuable implementations were necessary but are enabling infrastructure rather than explicit stages in the original clinic journey:

- reusable platform idempotency storage, replay, concurrency conflict, and migration-chain repair;
- canonical documentation governance and branch/worktree recovery controls;
- shared alias catalogs and dead-screen cleanup;
- submission IDs and stale-callback no-op logic;
- React Query invalidation architecture;
- tenant/user-scoped AsyncStorage keys, compression, migration, expiry, and logout cleanup;
- architecture-layer audits and baseline test-debt classification;
- Hindi key parity recovery;
- physical-device/staging verification checklists.

This work is legitimate and often release-critical. It should be labeled as platform, recovery, safety, or release-enablement work so that its completion is not mistaken for completion of the end-user product vision.

## 9. Remaining Work by State

### Partial

- Req 4 active-template audit durability;
- Req 8 mutation queue, retry, flush, and dead-letter behavior;
- Req 12 staging replay and broader mutation coverage;
- Req 14/21 full legacy theme compliance;
- Req 15 complete automated and E2E coverage;
- Req 19 full storage classification/security decision;
- Req 22/23 future-store and legacy-boundary cleanup;
- Req 24 future copy and Hindi review;
- Req 25 broader accessibility;
- Req 26/27 future commercial mutation locking/invalidation;
- Req 28 structured analytics;
- Req 30 pending-mutation tenant isolation;
- Req 31 remote-config expiry and analytics.

### Not started

- Req 16 conflict modal;
- Req 17 multi-device conflict resolution;
- Req 18 pending payment recovery;
- Req 20 onboarding error mapper;
- the unrepresented product capabilities in §7.

### Staging/release only

- Req 11 provisional, active, multi-clinic, and tenant-switch verification;
- Req 12 same-key replay and isolation in staging;
- Req 32 Runs A–D and sign-off;
- production promotion, which remains blocked until these gates and relevant integrated verification pass.

### Open decisions or blocked dependencies

- Req 29 backend `updated_at` contract and conflict policy;
- queue ownership, retry scope, manual recovery, and dead-letter UX;
- centralized error boundary and localized catalog;
- analytics provider/stub and accepted event list;
- subscription/payment ownership and pending-verification endpoint;
- trial start/expiry/extension/conversion policy;
- readiness-provider ownership and capability model;
- selected/effective tenant UX for multi-clinic owners;
- whether `X-Tenant-ID` is removed or formalized after staging proof;
- remote-config ownership for draft expiry.

### Deferred

- direct tenant activation or readiness-policy changes in TG17;
- subscription checkout and payment recovery in TG17;
- pending mutation queues and background replay in TG16/TG17;
- polling/background scheduling;
- broad legacy theme/accessibility refactors outside touched scope;
- progressive branding pending accepted product criteria.

## 10. True Remaining Progressive Experience Roadmap

The next activity must be planning, not implementation. The roadmap should be rebuilt in product-journey order while preserving the release verification gate as a separate track.

### Track A — Release validation (no new feature group)

1. Deploy the paired Progressive Experience branches to a safe staging environment.
2. Complete provisional, active, multi-clinic, tenant-switch, cross-tenant, and `X-Tenant-ID` checks.
3. Complete same-key/same-payload replay and isolation checks.
4. Execute and record Req 32 Runs A–D.
5. Resolve only failures attributable to the audited Progressive Experience scope before promotion.

### Track B — Product and architecture planning phase

Before naming another implementation group, create an accepted product/design package that:

1. Defines the canonical Progressive Experience journey model, including journey version identity and Journey Cards.
2. Defines capability-driven visibility, workspace-preparation ownership, and readiness-provider contracts without moving server truth into the frontend.
3. Defines clinic creation variants: new clinic, clinic identity/contact refinement, and Bring Your Clinic.
4. Defines the complete commercial lifecycle: Ready to Start → trial start → active trial → expiry/extension → informational dunning → payment → paid subscription.
5. Defines pending-payment recovery and subscription verification endpoints, state ownership, security boundaries, and failure UX.
6. Defines the offline mutation architecture: enqueue policy, explicit user intent, retry scope, FIFO behavior, idempotency-key reuse, dead-letter/manual retry UX, and tenant cleanup.
7. Defines the conflict architecture: mandatory backend timestamps, server/local comparison, multi-device behavior, and audit events.
8. Defines centralized localized errors, structured analytics, accessibility acceptance, and storage classification as cross-cutting contracts.
9. Defines dashboard first actions and continuous-growth guidance after activation.
10. Produces a new coverage matrix connecting every accepted lifecycle capability to requirements, design sections, tasks, tests, owners, dependencies, and release gates.

### Track C — Candidate implementation phases after planning approval

The planning phase should sequence later implementation into bounded increments, tentatively:

1. **Journey foundation** — journey version, cards/guidance model, capability/readiness contracts.
2. **Clinic entry and workspace preparation** — clinic identity/contact, Bring Your Clinic, preparation progress.
3. **Conflict-safe recovery** — backend timestamp contract, draft conflict UX, multi-device rules.
4. **Explicit offline recovery** — error mapping first, then pending mutations/retry/manual recovery with platform idempotency.
5. **Commercial lifecycle** — Ready-to-Start transition, trial states, expiry/extension, dunning, payment recovery, subscription conversion.
6. **Activation and growth** — dashboard first actions, guidance, progressive branding, and continuous-growth measurement.
7. **Cross-cutting completion** — structured analytics, security review, full i18n/accessibility/theme audit, and E2E coverage.

These are planning containers, not authorized task groups. Their order may change when product ownership and backend contracts are resolved.

## 11. Direct Answers

### Is the complete product vision represented in current requirements/design/tasks?

No. The current documents comprehensively represent onboarding hardening and selected recovery behavior, but only partially represent clinic creation, workspace preparation, readiness, commercial trial, and payment. They do not represent informational dunning, continuous growth, Journey Cards, capability-driven visibility, Bring Your Clinic, or dashboard first actions as actionable work.

### Which planned capabilities are still missing?

Journey Cards, Journey Versioning, capability-driven visibility, workspace preparation, readiness providers/explanation, clinic identity/contact refinement, Bring Your Clinic, complete trial lifecycle, informational dunning, subscription conversion/payment recovery, progressive financial configuration, dashboard first actions, progressive branding criteria, and continuous-growth guidance. The major hardening gaps are the offline mutation queue/retry, conflict/multi-device resolution, centralized errors, structured analytics, full storage security review, and staging/E2E acceptance.

### Which requirements have no implementation task?

Req 16, Req 17, Req 18, Req 20, and Req 29 have no implementation group for their central behavior. Req 8 and Req 28 have only partial/incidental delivery and no task for most of their accepted scope.

### Which groups were recovery or technical hardening rather than end-user journey delivery?

R0, TG4–TG9, TG11, TG12, and much of TG13. TG1–TG3 and TG10 are journey-breaking defect repairs. TG14–TG17 add visible recovery/resilience/navigation value but remain enhancements to the existing wizard, not completion of the broader lifecycle.

### Is a new planning phase required?

Yes. No additional implementation group should be created until the broader product journey, ownership boundaries, commercial policy, readiness model, offline/conflict architecture, and coverage matrix are accepted.

### What should the next implementation phase contain?

It should contain only the first bounded slice produced by the new planning phase. The preferred first slice is the **journey foundation**: canonical journey identity/version, Journey Cards/guidance contract, capability-driven visibility, and readiness-provider boundaries. If release risk takes priority, staging verification should proceed in parallel as a release track, not be mislabeled as a new feature group.

## 12. Final Conclusion

Task Groups through 17 are complete as recorded, except the historical Task 12 release checkpoint remains open by design and staging-only acceptance remains outstanding. The work has made the existing wizard materially safer, more recoverable, more localized, and more reliable. It has not completed the Progressive Experience product vision.

The true next step is to establish a new product planning phase, reconcile the full lifecycle into accepted requirements and design, and only then authorize the next bounded implementation group. Production promotion remains blocked by staging, device, and integrated release verification.
