# TG19 Implementation Readiness Review

Date: 2026-07-20

Review type: Documentation-only implementation readiness checkpoint

Epic reviewed: E2 — Clinic Entry and Bring Your Clinic

Task group: TG19 — Clinic Entry and Bring Your Clinic Contract

Decision: **READY**

> **Final re-acceptance update — 2026-07-21:** The bounded implementation
> checkpoints are present, but release acceptance remains `TG19_NOT_ACCEPTED`.
> The final audit found no operational organization-creation path for a new user
> with zero memberships, incomplete ADR-PF-011 tenant-switch cleanup, and no
> focused tests that execute the frontend orchestration hook. This does not
> revoke the historical implementation-readiness decision; it records failed
> acceptance evidence. See `TG19-FINAL-ACCEPTANCE.md`.

> **Remaining-blocker implementation update — 2026-07-21:** The bounded initial
> organization transport, real frontend orchestration tests, and ADR-PF-011
> tenant-switch cleanup are implemented. This evidence does not itself rerun or
> change final acceptance; it makes TG19 ready for the separately authorized
> final re-acceptance checkpoint.

> **Version 1 constitutional decision update — 2026-07-20:** Product
> Architecture approved the initial Bring Your Clinic meaning, identity/contact
> field sets, domain ownership, single/multiple-clinic selection rule,
> duplicate/idempotency policy, and security classification. These decisions
> close the corresponding historical blockers below. The source-audit blockers
> are now resolved by accepted platform-wide ADR-PF-002 and ADR-PF-003. TG19 is
> **READY** within the exact boundary in `E2-IMPLEMENTATION-BOUNDARY.md`; see §19.

## 1. Executive Decision

TG19 is **READY** for bounded implementation without unresolved architectural
decisions.

The approved Phase 2 roadmap makes TG19 contract-first. The Epic 2
constitutional documents, operational/source audit, exact implementation
boundary, and accepted Platform Foundation ADRs now define its product and
architecture contracts. Earlier NOT READY findings remain below as historical
decision evidence and are superseded by §19.

The readiness decision is based on acceptance of all of the following:

1. the supported clinic-entry paths and precise product meaning of Bring Your
   Clinic, including explicit non-goals;
2. the identity/contact field contract and authoritative validation ownership;
3. tenant provisioning, association, selection, session-refresh, and recovery
   contracts for new, provisional, existing, and multi-clinic users;
4. duplicate-clinic detection and idempotency behavior;
5. data ownership, storage, privacy, and security classification;
6. new E2 functional/non-functional requirements and acceptance criteria;
7. a clinic-entry application-flow/domain design;
8. an E2-specific source-confirmed reuse audit after those contracts are fixed;
9. an approved backend/frontend file boundary and focused test matrix.

This review authorizes no frontend or backend implementation.

## 2. Authoritative Evidence Reviewed

The following documents were read in the required order:

1. `requirements.md`;
2. `design.md`;
3. `PROGRESSIVE-EXPERIENCE-PHASE2-ROADMAP.md`;
4. `TG18-IMPLEMENTATION-READINESS.md`;
5. `E1-READY-TO-START-REQUIREMENTS.md`;
6. `E1-JOURNEY-DOMAIN-DESIGN.md`;
7. `E1-JOURNEY-VERSIONING.md`;
8. `E1-JOURNEY-CARD-CONTRACT.md`;
9. `E1-REUSE-AUDIT.md`.

The completed TG18 implementation through commit
`66ea54289ee6ee43de4d04876b73653ec002a4b5` was also inspected. TG18 provides a
read-only journey projection and presentation foundation; it does not define or
implement clinic entry, tenant creation/association, or Bring Your Clinic.

## 3. Business Objective

Provide clear, safe clinic-entry paths so an Organization Owner, Organization
Admin, or Clinic Administrator can create a new clinic or use an accepted Bring
Your Clinic path, confirm required identity/contact information, resolve the
effective tenant, and hand off to workspace preparation without duplicate clinic
creation or cross-tenant state.

The roadmap measures success through:

- account-to-clinic-identity completion rate;
- abandonment rate by entry path;
- median time to resolve a tenant and enter workspace preparation;
- duplicate clinic-creation rate.

These outcomes are approved at roadmap level. The behavior needed to measure and
deliver them is not yet an accepted requirements/design contract.

## 4. User Journey

The roadmap-level journey is:

1. The user completes account/application entry.
2. The user chooses a documented clinic-entry path.
3. For a new clinic, the system collects or confirms approved identity/contact
   fields and establishes the authoritative tenant association.
4. For Bring Your Clinic, the system follows a product-approved association or
   import path; no implementation may infer that this means record migration,
   tenant claiming, tenant search, or silent duplicate creation.
5. The system resolves one effective clinic/tenant explicitly.
6. Session and repository state refresh under that tenant.
7. The user enters workspace preparation and later consumes the TG18 journey.

The missing definition in step 4 and ownership uncertainty in steps 3, 5, and 6
prevent an implementation-ready flow.

## 5. Personas

Primary personas from E2:

- Organization Owner;
- Organization Admin;
- Clinic Administrator.

Front Desk, Doctor, and Therapist are not primary TG19 personas. Doctor Module
and clinical workflows are prohibited.

## 6. Requirements Coverage

### Existing requirements that constrain TG19

| Requirement | TG19 relevance | Current disposition |
|---|---|---|
| Req 11 — tenant identity | Requires reliable tenant identity for provisional/live paths and staging verification. | Constraint exists; authoritative new/existing/multi-clinic selection contract is missing. |
| Req 19 — storage security | Requires inspection/classification of locally stored sensitive data. | Security classification and permitted persistence for E2 fields are missing. |
| Req 24 — localization | Requires all new user-visible strings in English and Hindi. | Framework exists; E2 copy/key contract and Hindi review owner are missing. |
| Req 25 — accessibility | Requires accessible controls, disabled states, and touch targets. | General constraint exists; E2 choice/form/error/focus contract is missing. |
| Req 30 — tenant isolation | Requires tenant-scoped state, logout cleanup, and tenant-switch protection. | Existing draft/query patterns exist; effective-clinic selection for multi-clinic owners is unresolved. |

### Missing E2 requirements

New accepted E2 requirements must define:

- every supported clinic-entry path and its eligibility;
- the exact meaning and non-goals of Bring Your Clinic;
- identity/contact fields, required/optional rules, normalization, validation,
  specialty extensibility, and authoritative source;
- create, associate, select, cancel, retry, resume, and failure behavior;
- duplicate detection and idempotency rules;
- tenant/application/user ownership and authorization;
- new, provisional, existing, and multi-clinic state transitions;
- session refresh and effective-tenant handoff;
- loading, empty, validation, conflict, duplicate, stale, partial, unsupported,
  and retry states;
- data classification, permitted local persistence, retention, and cleanup;
- localization, accessibility, analytics intent, and success-metric evidence;
- handoff to workspace preparation without claiming provisioning completion.

No current E1 document can substitute for these product requirements.

## 7. Design References and Missing Design

TG19 is constrained by existing `design.md` sections for Layer Map, Dependency
Rules, Error Handling, Backend Dependencies, tenant verification, Testing
Strategy, Theme Compliance, and Git Delivery Strategy. It also inherits the E1
journey ownership boundary: frontend presentation cannot invent server truth.

A new E2 clinic-entry application-flow design is required. It must define:

- domain vocabulary and state machine for entry path, application, clinic,
  tenant association, effective tenant, provisioning handoff, and duplicate;
- backend/frontend ownership for every transition and validation;
- DTO/domain/presentation mappings;
- repository, query-key, invalidation, cancellation, and session-refresh rules;
- new/provisional/existing/multi-clinic transition matrices;
- duplicate/idempotency and safe retry behavior;
- data/security/storage boundaries;
- navigation and TG18/TG20 handoffs;
- localization and accessibility contracts;
- error taxonomy integration without inventing TG24 architecture;
- exact reuse/extension decisions and test boundaries.

## 8. Existing Implementation Findings

- `ChoiceScreen.tsx` is the active choice surface, but both visible paths call
  `useCreateDemoTenantMutation`; its own comment states direct setup is not
  implemented. It cannot represent accepted new-clinic versus Bring Your Clinic
  semantics today.
- `ChoiceScreen.tsx` reuses application detail, demo creation, auth refresh,
  theme, localization, loading, and error assets, but still contains legacy
  hardcoded copy/styles and fallback behavior that require contract-led cleanup.
- `ClinicProfileScreen.tsx` contains useful identity/contact form behavior and
  draft integration, but it also performs direct Axios calls and includes
  hardcoded user-visible strings. It is a reuse candidate, not an approved E2
  boundary as currently structured.
- Existing onboarding repositories expose application detail, validation,
  demo-tenant creation, setup-wizard, status, submit, and completion operations.
  No accepted Bring Your Clinic operation or contract was found.
- Existing tenant repositories expose organization tenant list/detail/create/
  update/deactivate and current-tenant lookup. Those administrative operations
  are not automatically valid clinic-entry or association APIs.
- TG18 supplies `JourneySurface`, `StepCard`, `ProgressBar`, journey entities,
  pure projection, and `useJourneyFoundation`. These begin only after effective
  tenant resolution and must not be repurposed to create/select a clinic.

## 9. Reuse Audit

### Reuse

| Asset | Required TG19 use |
|---|---|
| Central theme and existing tokens/icons/form primitives | All E2 presentation must use these; no parallel design system or hardcoded visual values. |
| Existing localization framework and `en-US`/`hi-IN` resources | All E2 copy, validation, status, and recovery text; matching interpolation required. |
| Existing application-detail query and centralized `onboardingKeys` | Reuse for accepted application context where contract-compatible. Do not duplicate application fetching. |
| Existing auth/session refresh boundary | Reuse after an authoritative tenant association/selection response. Do not create a second auth state. |
| Existing onboarding and tenant repositories/services/APIs | Reuse only operations proven to match the accepted E2 contract and caller authorization. |
| Existing form and validation primitives | Reuse for approved identity/contact fields. |
| Existing loading/error primitives | Reuse when their semantics, localization, theme, and accessibility fit the accepted E2 states. |
| Existing draft store | Reuse only for its accepted tenant/user-scoped draft responsibility if E2 explicitly permits local persistence. |
| TG18 journey foundation | Reuse after effective tenant handoff; retain journey version, projection, tenant guard, Journey Cards, progress, and edge-state behavior unchanged. |

### Extend

Extensions are provisional until E2 requirements/design approval:

| Asset | Permitted future extension |
|---|---|
| `ChoiceScreen.tsx` | Present only approved entry paths and delegate to repository-backed application actions; local product/provisioning policy is prohibited. |
| `ClinicProfileScreen.tsx` | Extract/reuse approved identity/contact form behavior and remove presentation-to-API violations within an accepted boundary. |
| Application/onboarding DTO and repository boundaries | Extend only for an accepted existing backend contract; use centralized keys and typed mapping. |
| Tenant repository/auth handoff | Extend only if approved ownership and authorization make existing operations suitable for clinic entry. |
| Focused presentation/application orchestration | Add only when no existing hook fits and it composes repositories rather than duplicating them. |

### Do Not Reuse or Create

- Do not use `createDemoTenant` as a hidden implementation of every E2 path.
- Do not reinterpret organization-admin tenant creation as Bring Your Clinic.
- Do not reuse raw `applicationId`, route `tenantId`, or cached tenant data as
  proof of ownership/association without the accepted contract.
- Do not use Wizard Draft, onboarding presentation store, or a new store as
  authoritative tenant/provisioning truth.
- Do not make direct API/Axios calls from `ChoiceScreen`, `ClinicProfileScreen`,
  or any new presentation component.
- Do not duplicate TG18 entities, journey projection, hook, Journey Card,
  ProgressBar, tenant guard, navigation, or localization/theme frameworks.
- Do not create a frontend import/migration engine, tenant-claiming workflow,
  duplicate detector, provisioning state machine, repository, service, API,
  endpoint, or migration without prior Roadmap → Requirements → Design approval.
- Do not reuse Demo Status, Go Live, subscription, payment, scheduling,
  inventory, clinical, or Doctor Module surfaces as E2 implementation.

## 10. Dependencies

### Backend dependencies

The following are unresolved and blocking:

- canonical create/associate/select behavior for every accepted entry path;
- authorization and ownership proof for existing-clinic association;
- authoritative duplicate-detection and idempotency rules;
- tenant provisioning/association result and status contract;
- session/JWT refresh behavior and tenant identity source;
- multi-clinic effective-tenant selection contract;
- identity/contact validation and uniqueness ownership;
- typed errors and safe retry semantics;
- audit/security obligations and data classification.

Backend impact for this review: **none**. Future backend impact is **undecided**;
no API, endpoint, service, model, or migration is authorized.

### Frontend dependencies

Blocking frontend decisions are:

- accepted E2 domain and presentation models;
- exact entry-path eligibility and navigation;
- repository/application orchestration ownership;
- approved reuse/extraction plan for `ChoiceScreen` and `ClinicProfileScreen`;
- effective-tenant/session handoff;
- validation/error/retry states;
- local-persistence permission and cleanup;
- localized copy/key catalog and Hindi review;
- accessibility/focus contract;
- exact file list and focused tests.

Frontend impact for this review: **documentation only**.

## 11. Theme, Localization, Accessibility, and Multi-Clinic

### Theme

- Central theme only; reuse existing tokens, typography, spacing, radii, icons,
  inputs, cards, buttons, and state primitives.
- No hardcoded colors, typography, spacing, radii, or new inline visual system.

### Localization

- No hardcoded user-visible strings.
- Add matching `en-US` and `hi-IN` keys with compatible interpolation.
- Cover path explanations, field labels/help, validation, duplicate/recovery,
  loading/status, and navigation.
- Hindi-literate review ownership is required before release.

### Accessibility

- Choices require clear names, descriptions, selected/disabled/pending state,
  44-by-44 touch targets, and deterministic focus order.
- Forms require programmatic labels/instructions, error association, logical
  keyboard/screen-reader order, and focus movement to the first invalid field.
- Dynamic status/errors require non-color meaning and non-repetitive live-region
  behavior; progress must be textual.
- Back/cancel/retry actions must state their consequences.

### Multi-clinic

- Effective clinic selection must be explicit and authoritative.
- Queries, mutations, drafts, caches, and navigation must retain tenant context.
- Tenant switching must cancel or isolate stale requests and derived TG18 state.
- Existing-clinic association must never expose or mutate another clinic.
- Fields and paths must remain specialty-agnostic; no Ayurveda-specific logic.

## 12. Test Strategy

The accepted E2 plan must include:

### Domain/unit

- path eligibility and state transitions;
- field normalization/validation and specialty-neutral behavior;
- duplicate/unsupported/unknown-state safety;
- effective-tenant and association rules as pure policy where appropriate.

### Repository/service/backend contract

- request/response mapping and typed errors;
- authorization and tenant isolation;
- idempotent create/associate retry and duplicate prevention;
- centralized tenant/application query keys and scoped invalidation;
- session refresh and authoritative tenant result;
- cancellation/stale-response safety during tenant switching.

### Component

- every choice/form/loading/error/duplicate/pending/retry state;
- central theme and existing primitive reuse;
- English/Hindi parity and interpolation;
- labels, descriptions, focus, errors, disabled/pending state, touch targets,
  screen-reader behavior, and non-color-only communication.

### Integration/E2E

- new-clinic, provisional, existing-clinic, and multi-clinic paths;
- rapid repeat action and slow-network duplicate prevention;
- failure/retry/session-refresh and app restart where persistence is approved;
- tenant switch/logout with no cache/draft/journey leakage;
- successful handoff to workspace preparation and TG18 journey;
- Req 11/12/32 staging/device verification remains a release gate.

## 13. Risks

- inventing Bring Your Clinic as migration, import, claim, or duplicate creation;
- unauthorized clinic association or cross-tenant disclosure;
- duplicate tenant/clinic creation under retries or repeated taps;
- conflating application, clinic, tenant, and effective-tenant identities;
- placing provisioning truth or validation policy in presentation;
- persisting sensitive identity/contact data without classification;
- direct API access and duplicated repositories/hooks/stores;
- specialty-specific fields becoming universal requirements;
- stale JWT/cache state handing TG18 the wrong tenant;
- inaccessible path choice, validation, or recovery UX;
- implementing TG20 workspace preparation inside TG19.

## 14. Open Decisions and Blockers

Every item below blocks implementation readiness:

1. What does Bring Your Clinic mean, and what is explicitly excluded?
2. Which entry paths are supported and who is eligible for each?
3. Does an existing clinic already have a Nova tenant, or is association/import
   required? Who proves ownership?
4. Which backend/platform owner creates, associates, selects, and provisions the
   tenant, and which response proves success?
5. How are duplicates detected and idempotently resolved?
6. How is the effective tenant selected for multi-clinic owners?
7. Which identity/contact fields are canonical, who validates them, and which
   may be stored locally?
8. What security/privacy classification, retention, audit, and cleanup applies?
9. What are the state/error/retry/session-refresh contracts?
10. Which existing components, hooks, repositories, services, and APIs fit the
    accepted contract after source confirmation?
11. What exact frontend/backend files and tests are authorized?
12. Who owns Hindi review, accessibility acceptance, and staging verification?

## 15. Implementation Boundary

### Files expected to change now

Only this document:

```text
frontend/docs/Onboarding/progressive-experience/TG19-IMPLEMENTATION-READINESS.md
```

### Provisional future candidate files

No source file is authorized while TG19 is **NOT READY**. After requirements,
design, ownership, security, and reuse gates close, a new readiness decision may
authorize a subset of:

- E2-specific domain entities/use cases and tests;
- `ChoiceScreen.tsx` and its focused tests;
- reusable identity/contact form boundaries derived from
  `ClinicProfileScreen.tsx` and focused tests;
- existing onboarding application DTO/repository/service files only where an
  accepted existing backend contract requires typed extension;
- existing tenant/auth repository/session boundaries only where ownership and
  authorization are accepted;
- `en-US.json` and `hi-IN.json`;
- minimal handoff composition to existing TG18 journey entry.

This is a discovery list, not implementation permission. Exact paths cannot be
fixed safely before the missing E2 contract determines whether backend work is
needed and which existing boundary owns each action.

### Files prohibited from changing

Under this review and until a subsequent READY decision:

- all frontend and backend source and tests;
- APIs, DTOs, schemas, database models, and migrations;
- dependencies, manifests, and lockfiles;
- `requirements.md`, `design.md`, the Phase 2 roadmap, E1 constitutional
  documents, and existing task groups;
- TG18 journey behavior except a later approved handoff;
- TG20 and all later roadmap capabilities;
- Doctor Module, Clinical Workspace, Scheduling, Inventory, Billing, Payment
  Gateway, analytics-platform, R7, main-root, `dev`, and `test` work.

### Documentation updates required before implementation

Separate approved planning work must create E2 requirements, clinic-entry domain
design, tenant/provisioning contract, security decision, tenant/path matrices,
and a source-confirmed E2 reuse audit. This review does not create those files or
change roadmap sequencing.

### Expected focused tests

No source test is required for this documentation-only review. The future
minimum test matrix is defined in §12 and must be converted into exact test files
after the E2 design and implementation boundary are accepted.

## 16. Prerequisites for a READY Decision

TG19 may become READY only when:

- every blocker in §14 has an accepted constitutional resolution;
- new E2 requirements and the application-flow/domain design are approved;
- backend/platform ownership and existing API sufficiency are verified;
- data/security classification is approved;
- the source-confirmed reuse audit records REUSE, EXTEND, and DO NOT REUSE for
  exact assets;
- exact frontend/backend files, behavior, documentation, and focused tests are
  authorized;
- implementation can proceed without inventing product or architecture.

Until then, the only allowed next activity is E2 constitutional planning—not
TG19 implementation.

**TG19 Implementation Status: NOT READY**

## 19. Platform Foundation Decision Closure — Controlling Reassessment

This section is the latest and controlling readiness decision. Historical
`NOT READY` statements above preserve the audit trail and are superseded here.

### Platform decisions accepted

| Blocker | Accepted platform decision | Result |
|---|---|---|
| Authoritative organization identity and roles | `ADR-PF-002-ORGANIZATION-MEMBERSHIP.md` defines a stable Organization aggregate, authoritative Organization Membership, Owner/Administrator roles, Clinic Administrator as tenant-scoped RBAC, lifecycle, invitations, tenant association, authentication boundary, permissions, audit, and additive extension points. Global `is_org_admin` is explicitly not customer organization membership. | CLOSED |
| Ownership-verification issuer and validator | `ADR-PF-003-CLINIC-OWNERSHIP-VERIFICATION.md` defines authenticated in-product approval by an active target-clinic principal with `clinic.ownership.verify`; the Platform Ownership Verification service is the sole issuer/validator; evidence binding, lifecycle, expiry, audit, retry, failure, consumption, replay, non-disclosure, and future methods are fixed. | CLOSED |

### Readiness determination

The new ADRs supply the two platform authorities that the source audit could not
derive from existing code. They are platform-wide and do not redefine the E2
journey. Combined with the five Epic 2 constitutional documents,
`E2-OPERATIONAL-CONTRACT.md`, `E2-SOURCE-REUSE-AUDIT.md`, and
`E2-IMPLEMENTATION-BOUNDARY.md`, TG19 can now proceed without inventing product
behavior, organization authority, or ownership verification.

TG19 implementation is allowed only through the bounded checkpoints and exact
file/behavior/test boundary already approved in `E2-IMPLEMENTATION-BOUNDARY.md`.
Implementation must reuse existing provisioning, auth/session, tenant RBAC,
idempotency, error, audit, draft, theme, localization, navigation, and TG18
assets as classified. It must not implement TG20 or broaden the platform ADRs.

### Remaining gates

There are no remaining product or architecture blockers to beginning TG19.
Hindi review, manual accessibility acceptance, security acceptance, focused
test completion, migration review, and staging/device verification remain
checkpoint or release acceptance criteria. They do not block implementation
from starting and cannot be skipped before the affected checkpoint/release.

**TG19 Implementation Status: READY**

## Appendix A. Historical Post-Audit Operational Reassessment

The required source audit is recorded in:

- `E2-OPERATIONAL-CONTRACT.md`;
- `E2-SOURCE-REUSE-AUDIT.md`;
- `E2-IMPLEMENTATION-BOUNDARY.md`.

### Blockers closed by the audit

| Prior blocker | Resolution | Status |
|---|---|---|
| Existing API/repository fit | Every operation is classified `REUSE_AS_IS`, `EXTEND_EXISTING`, `NEW_CONTRACT_REQUIRED`, or `NOT_APPLICABLE`. The global org-admin tenant API and demo path are explicitly unsuitable. | CLOSED |
| Normalization and duplicates | Deterministic `clinic_identity_v1`, organization scope, canonical fingerprint, replay, and additive matcher rules are defined. | CLOSED |
| Create/associate idempotency | Scope, fingerprint conflict, concurrent request, completed replay, retry, and side-effect rules are defined. | CLOSED |
| DTO/error/session contract | `ClinicIdentityInputV1`, `ClinicEntryResultV1`, stable typed errors, refresh sequence, and mutation-versus-refresh recovery are defined. | CLOSED |
| Local drafts | Positive field allowlist, prohibited values, scope, expiry, and logout/switch/success/abandon cleanup are defined. | CLOSED |
| Implementation/test boundary | Exact permitted/prohibited areas, genuinely conditional migration, focused test matrix, and five bounded checkpoints are defined. | CLOSED |

### Source-confirmed blockers that remain

1. **Authoritative organization identity and roles:** the inspected backend has
   tenant memberships and a global `OrgUser.is_org_admin` platform bypass, but
   no organization aggregate/membership that can enforce “within organization”
   duplicate scope or distinguish Organization Owner from authorized
   Organization Admin. Product Architecture and Backend must identify and
   approve that authority and role mapping.
2. **Ownership-verification mechanism:** no issuer, validator, persistence, or
   accountable owner exists for the required verification of an existing
   Nova-managed clinic. Product/Security must approve the Version 1 verification
   method and owner. The operational contract defines the safe opaque evidence
   boundary but intentionally does not invent the method.

The first blocker determines whether organization association and pre-tenant
idempotency are persisted locally or supplied by an existing external authority;
therefore it also gates the proposed migration. Both decisions must be recorded
and this readiness decision updated before any source change.

Release owners for Hindi review, manual accessibility, security acceptance, and
staging/device verification remain release gates, not implementation-architecture
blockers.

**TG19 Implementation Status: NOT READY**

## Appendix B. Historical Version 1 Decision Closure and Reassessment

### Closed constitutional blockers

| Prior blocker | Approved Version 1 resolution | Status |
|---|---|---|
| Bring Your Clinic meaning | Verified connection of an existing Nova-managed clinic to the caller's organization. Eligible callers are authenticated Organization Owners and authorized Organization Admins. | CLOSED |
| Bring Your Clinic non-goals | Data migration, EMR migration, vendor database import, bulk import, and unverified tenant claim are excluded. | CLOSED |
| Identity/contact field contract | Required minimum: Clinic Name, Clinic Address, Primary Contact Number, Verified Email or Mobile, Clinic Type / Specialty. Optional initial: GST, PAN, Logo, Website, Secondary Contact. Fields extend additively. | CLOSED |
| Domain ownership | Workspace/Tenant owns create/associate/select and tenant truth; Authentication owns identity/session refresh; Frontend owns presentation/navigation/validation presentation. | CLOSED |
| Multi-clinic policy | One authorized clinic auto-selects; multiple authorized clinics require explicit selection; future strategies are additive. | CLOSED |
| Duplicate/idempotency policy | Normalized clinic identity within organization scope; create/associate are idempotent; retry returns the same authoritative result; future match strategies are additive. | CLOSED |
| Security classification | Business-sensitive tenant metadata, not clinical/payment; only approved non-sensitive local drafts; clear on logout/switch; verification/association is auditable. | CLOSED |

### Remaining implementation blockers

1. **Existing contract sufficiency:** No accepted evidence identifies an existing
   Workspace/Tenant API/repository operation that implements verified clinic
   association, normalized organization-scoped duplicate matching, idempotent
   replay, or explicit multi-clinic selection. This review may not invent it.
2. **Operational contract:** Exact DTOs/states, normalized identity algorithm,
   ownership-verification mechanism, audit record, idempotency-key scope and
   retention, and authoritative result are not defined.
3. **Session and failure contract:** Refresh ordering, token claims, Req 11
   fallback retirement, typed errors, retryable/terminal classes, partial
   success, timeout, cancellation, and recovery are unresolved.
4. **Data implementation:** Field normalization/validation ownership per field
   and the approved non-sensitive draft allowlist are not fixed.
5. **Implementation boundary:** Exact components/hooks/repositories/services/APIs
   to reuse or extend, exact file paths, navigation, localization copy/keys,
   focused tests, and backend impact cannot be authorized until blockers 1–4
   are resolved by source-confirmed design.
6. **Release owners:** Hindi review, manual accessibility acceptance, security
   acceptance, and staging/device verification ownership remain required before
   release; they do not authorize implementation by themselves.

### Reassessment

The roadmap's product-definition stop condition is now closed. The technical
stop condition remains: implementation would require guessing the authoritative
Workspace/Tenant integration and ownership-verification behavior. The next
allowed activity is a source-confirmed operational contract and boundary review,
not TG19 code.

**TG19 Implementation Status: NOT READY**

The historical decision above is superseded by §19.

**TG19 Implementation Status: READY**

## 20. Platform Foundation Boundary Reassessment — 2026-07-20

This section is the latest controlling decision. Repository evidence after the
prior READY declaration confirmed that TG19 could not safely start because its
required Platform Foundation files were outside the then-approved implementation
boundary. ADR-PF-004, ADR-PF-005, ADR-PF-006, and
`E2-PLATFORM-FOUNDATION-BOUNDARY.md` now resolve and authorize that prerequisite
without treating planning completion as implementation completion. Historical
statuses above remain audit evidence and are superseded here.

### Resolved architecture decisions

- Organization and membership are new platform persistence, not extensions of
  tenant RBAC or `is_org_admin`.
- `org_organization_tenants` is the authoritative single-active-owner
  organization-to-tenant association and supports multiple clinics per
  organization without granting tenant data access.
- ADR-PF-003 verification uses persisted opaque evidence issued, approved,
  validated, expired/revoked, and consumed by a platform service.
- Pre-tenant operations use `org_idempotency_records`; fake tenant IDs and
  nullable ambiguous scope are prohibited.
- The Clinic Entry application service will own one unit-of-work commit;
  provisioning, verification consumption, association, idempotency completion,
  and transactional audit flush inside it. External effects occur after commit.
- Existing provisioning callers retain a backward-compatible committing wrapper
  while the new orchestration uses a non-committing core.

### Current readiness classifications

**PLATFORM_FOUNDATION_READY_FOR_IMPLEMENTATION** — The constitutional decisions,
exact persistence/port/adapter/service boundary, migration rules, transaction
ownership, compatibility path, prohibited areas, and focused verification are
approved and frozen. Generated migration identity and optional platform router
placement remain source-time `UNKNOWN`; neither is a product or architecture
decision.

**TG19_NOT_READY** — The Platform Foundation is not implemented yet. Therefore
no concrete Clinic Entry service/transport exists for frontend orchestration,
and TG19 cannot be declared implementation-complete or ready for its frontend
integration phase.

### Next authorized activity

Implement only the Platform Foundation checkpoint in
`E2-PLATFORM-FOUNDATION-BOUNDARY.md`. After it is committed and verified, perform
a fresh readiness check before implementing backend Clinic Entry operations.
Do not resume frontend orchestration or TG20.

**TG19 Implementation Status: NOT READY**

## 21. Platform Foundation Implementation Reassessment — 2026-07-20

This section is the latest controlling decision and supersedes §20 for
implementation readiness.

**PLATFORM_FOUNDATION_IMPLEMENTATION_COMPLETE** — The approved organization,
membership, association, ownership-verification, organization-idempotency,
transactional audit, migration, repository, unit-of-work, and transaction-safe
provisioning foundations are implemented and focused verification passes.

The prior backend prerequisite identified before this checkpoint is removed:
Clinic Entry may now consume authoritative organization membership,
organization-to-tenant association, ownership verification, pre-tenant
idempotency, transactional audit, and a non-committing provisioning seam without
inventing platform architecture.

**TG19_READY** — The next authorized activity is the bounded backend Clinic
Entry operations and transport checkpoint defined by
`E2-IMPLEMENTATION-BOUNDARY.md`. This classification does not authorize frontend
orchestration, TG19 final acceptance, TG19 Checkpoint 4, or TG20. Real-PostgreSQL
migration upgrade/downgrade and the historical migration-chain defect remain
verification/release gates; they do not change the source contract or require a
product decision.

**TG19 Implementation Status: READY**

## 22. Clinic Identity Persistence Reassessment — 2026-07-20

This section is the latest controlling decision and supersedes §21.

Repository evidence confirmed that the implemented Platform Foundation does not
persist `clinic_identity_v1` on organization–tenant associations. Consequently,
the approved organization-scoped duplicate contract cannot be made
concurrency-safe by the backend Clinic Entry service without a migration.

ADR-PF-007 selects the smallest additive correction: nullable identity version
and fingerprint fields on `org_organization_tenants`, with a partial unique index
for active authoritative identities. Existing associations are
`LEGACY_IDENTITY_UNKNOWN`, remain valid with null fields, and receive no inferred
backfill.

**CLINIC_IDENTITY_PERSISTENCE_READY_FOR_IMPLEMENTATION** — The exact model,
repository, migration, uniqueness, rollback, legacy compatibility, conflict
mapping, and focused-test boundary is approved.

**TG19_NOT_READY** — TG19 remains blocked until this persistence extension is
implemented and migration/concurrency verification passes. Backend Clinic Entry
service/transport follows that checkpoint; frontend orchestration follows the
backend transport commit. No product or Platform Foundation redesign is needed.

**TG19 Implementation Status: NOT READY**

## 23. Verified Clinic Contact Reassessment — 2026-07-20

This section is the latest controlling decision and supersedes §22.

Clinic identity persistence is implemented and verified. A subsequent source
audit confirmed that Epic 2 permits verified email or mobile while migration
`05aec2bbf49c` requires `org_tenants.email NOT NULL`. The existing provisioning
path therefore cannot create a mobile-only clinic without prohibited contact
fabrication.

ADR-PF-008 resolves the constitutional model and selects the smallest additive
correction: nullable tenant email, continued use of existing `phones`, versioned
primary-contact and per-method provenance fields, no legacy backfill, and a
guarded non-destructive downgrade.

**VERIFIED_CLINIC_CONTACT_PERSISTENCE_READY_FOR_IMPLEMENTATION** — The exact
model, migration, DTO, normalization, provisioning mapping, repository, legacy,
rollback, security, and focused-test boundary is approved.

**TG19_NOT_READY** — Backend Clinic Entry service/transport remains blocked until
the ADR-PF-008 persistence checkpoint is implemented and verified. Frontend
orchestration remains sequenced after the backend transport commit.

**TG19 Implementation Status: NOT READY**

## 24. Clinic Contact Evidence Reassessment — 2026-07-20

This section is the latest controlling decision and supersedes §23.

Verified Clinic Contact persistence is implemented, but source audit confirms
that no server-side clinic-contact evidence issuer/validator exists. Accepting
the current provenance DTO directly at transport would allow clients to assert
verification timestamps and methods, contrary to ADR-PF-008.

ADR-PF-009 selects a separate `org_contact_verifications` lifecycle and defines
opaque references, organization/actor/operation/contact binding, keyed contact
fingerprinting, independent email/mobile evidence, issue/verify/validate/expire/
revoke/consume states, typed failures, safe audit, idempotency, atomic
consumption, rollback, and provider extension points.

**CLINIC_CONTACT_VERIFICATION_IMPLEMENTATION_READY** — The exact future boundary
is frozen in `E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md`. No concrete
email/SMS provider is approved; provider-specific transport remains `UNKNOWN`
until separately authorized.

**TG19_NOT_READY** — Backend Clinic Entry service/transport remains blocked
until the ADR-PF-009 persistence and lifecycle prerequisite is implemented and
verified. Frontend orchestration, final acceptance, and TG20 remain sequenced
after the backend transport checkpoint.

**TG19 Implementation Status: NOT READY**

## 25. Manual Clinic Contact Verification Decision — 2026-07-20

This section is the latest controlling readiness decision and supersedes §24
for the clinic-contact verification method decision.

ADR-PF-010 approves `manual_platform_authority_v1`. Active Organization Owners
and Organization Administrators may request pending clinic-contact evidence.
Only an authenticated, independent Platform Operations or Platform Security
principal explicitly granted the non-bypassable capability
`platform.clinic_contact_verification.approve` may approve, reject, or revoke
it. Organization/tenant roles, self-approval, destination-organization
membership, and platform `is_org_admin` without the capability are insufficient.

The approval records a stable reason/evidence classification, verifier,
timestamp, method/version, immutable audit outcome, and optional safe external
reference without storing raw contact evidence. Approved evidence becomes
`verified` under the existing ADR-PF-009 lifecycle and is later validated and
atomically consumed by Clinic Entry. Approval itself creates or associates no
clinic.

**MANUAL_CLINIC_CONTACT_VERIFICATION_IMPLEMENTATION_READY** — The exact request,
status, platform-review, permission, audit/idempotency, security, file, and test
boundary is authorized in `E2-CONTACT-VERIFICATION-IMPLEMENTATION-BOUNDARY.md`.
No new table or migration is expected; implementation must stop if existing
persistence cannot represent the approved safe decision metadata.

**TG19_FRONTEND_ORCHESTRATION_NOT_READY** — The manual verification transport,
authoritative organization/auth context, authorized clinic-set/effective-tenant
handoff, and ownership-verification transport remain implementation
prerequisites. This planning decision authorizes no code and does not resume
frontend orchestration, final acceptance, or TG20.

**Manual Clinic Contact Verification Implementation Status: READY**

## 26. Final Platform Foundation Dependency Audit — 2026-07-20

`TG19-PLATFORM-FOUNDATION-DEPENDENCY-AUDIT.md` is the controlling recursive
source audit for the frontend-orchestration gate. It classifies 72 dependencies
and consolidates every remaining Platform Foundation prerequisite into one final
phase: authoritative organization/clinic context, an approved effective-tenant
selection contract and transport, manual contact-verification authority
transport and decision persistence, ownership-verification target context and
transport, and a cross-foundation PostgreSQL acceptance gate.

The audit finds three remaining architecture decisions: selection transport/
session semantics, platform manual-capability assignment, and the
non-enumerating ownership target context. Existing append-only organization
audit persistence is sufficient for safe manual-decision evidence, so no new
migration decision is required. No other product or architecture decision was
found necessary for TG19.

**TG19_FRONTEND_ORCHESTRATION_NOT_READY** — Frontend work must not begin until
the complete PF-FINAL-1 through PF-FINAL-5 backlog is implemented and verified
together. This audit authorizes no implementation, TG19 final acceptance, or
TG20 work.

**TG19 Frontend Orchestration Status: NOT READY**

## 27. Final Platform Foundation Architecture Closure — 2026-07-20

ADR-PF-011, ADR-PF-012, and ADR-PF-013 close the final effective-tenant,
manual-capability, and ownership-target decisions identified by the dependency
audit. `TG19-FINAL-PLATFORM-FOUNDATION-IMPLEMENTATION-PLAN.md` governs the
remaining five-checkpoint Platform Foundation phase.

No TG19 Platform Foundation product or architecture decision remains open.
Implementation is still required for authoritative auth/clinic context,
effective-tenant selection/session transport, manual contact verification,
ownership target/verification transport, and cross-foundation PostgreSQL/
security acceptance.

**TG19_FINAL_PLATFORM_FOUNDATION_PLAN_READY**

**TG19_FRONTEND_ORCHESTRATION_NOT_READY** — Frontend orchestration remains
blocked until all five checkpoints are implemented, verified, committed, and
pushed.

## 28. Manual Verification Decision Provenance Persistence — 2026-07-20

This section is the latest controlling readiness decision for TG19 Final
Platform Foundation Checkpoint 3.

Source audit confirmed that implemented `org_contact_verifications` persistence
cannot retain the ADR-PF-010 authoritative verifier, safe decision reason,
distinct optional operational reference, or decision timestamp. Platform Audit
alone is insufficient because the evidence record must retain its own decision
provenance through validation, consumption, revocation, and review.

ADR-PF-016 authorizes the smallest additive correction: nullable
`decision_principal_id`, `decision_reason_code`,
`decision_external_reference`, and `decision_at`; one verifier foreign key; no
backfill; no destructive rewrite; and legacy classification as
`LEGACY_DECISION_PROVENANCE_UNKNOWN`.

**MANUAL_VERIFICATION_DECISION_PERSISTENCE_READY_FOR_IMPLEMENTATION** — The
model, migration, repository, lifecycle, security, transaction, audit, legacy,
and focused-test boundary is approved. No additional product or architecture
decision is required for this persistence checkpoint.

**CHECKPOINT_3_BLOCKED** — Manual Contact Verification Capability & Transport
must not resume until the ADR-PF-016 persistence extension is implemented,
verified on PostgreSQL, committed, and pushed. Checkpoint 4, Checkpoint 5,
frontend orchestration, TG19 acceptance, and TG20 remain unauthorized.

**Manual Verification Provenance Implementation Status: READY**

## 29. Alembic Drift Audit — 2026-07-21

`TG19-ALEMBIC-DRIFT-AUDIT.md` is the controlling evidence for the final
schema-drift acceptance gate. A fresh PostgreSQL database at head produces 226
destructive false-positive operations: 80 table removals and 146 index removals.
All are classified `TG19_REGRESSION`.

Commit `c43ee45` removed all model imports from Alembic's `env.py`, leaving
`Base.metadata` empty during comparison. This causes every reflected
application table—including all TG19 Platform Foundation tables—to appear
database-only. The ancestor already contained separate incomplete-registration
debt, but it did not contain this empty-registry regression.

**TG19_FINAL_ACCEPTANCE_BLOCKED** — Platform Foundation and Database/Migrations
must restore deterministic complete model registration, add a fail-closed TG19
metadata guard, and rerun `alembic check` on a fresh PostgreSQL database. A
release-gate exception is not justified until that bounded TG19 correction is
complete. Residual pre-existing drift, if any, must then be classified under a
separately owned schema-reconciliation initiative.

## 30. Alembic Metadata Registry Correction — 2026-07-21

This section supersedes §29's TG19 final-acceptance blocker.

Deterministic model-module discovery, complete declarative registration
validation, and a fail-closed nine-table TG19 guard restore Alembic metadata
population without changing product behavior or database schema. Fresh
PostgreSQL upgrade, downgrade, re-upgrade, metadata tests, Platform Foundation
regressions, Ruff, and compileall pass.

The former 226 destructive false-positive removals are eliminated. No residual
comparison operation references a TG19 table. Direct `alembic check` now
surfaces only the pre-existing unresolved `org_staff` metadata target; an
analysis-only comparison classifies 217 further operations as historical
missing migrations, stale model metadata, or reflection/naming differences.

**TG19_ALEMBIC_REGRESSION_CORRECTED**

**TG19_FINAL_ACCEPTANCE_READY** — Historical repository metadata reconciliation
remains separately owned and must not be folded into TG19.

## 34. TG19 Final Acceptance Gate — 2026-07-21

**Decision:** `TG19_ACCEPTED`

The final gate verified the three remaining acceptance remediations:

- a Supabase-authenticated zero-membership user can create the initial
  organization and owner membership through the existing audited Platform
  Foundation service before Clinic Entry;
- focused frontend tests execute the real Clinic Entry orchestration for
  automatic, manual-pending, ownership, retry, multi-clinic, session-refresh,
  cleanup, and navigation behavior;
- tenant handoff cancels active queries, invalidates cached state, removes the
  outgoing persisted wizard draft, clears operation/idempotency state, refreshes
  Supabase and backend session context, and rejects a mismatched tenant before
  navigation.

The focused backend suite passed 154 tests with 9 dedicated PostgreSQL tests
skipped because their isolated test URLs were not configured; the previously
recorded isolated PostgreSQL run passed 161 tests. The frontend acceptance suite
passed 4 suites and 15 tests. Focused Ruff, compileall, and ESLint passed.

Supabase PostgreSQL upgraded to and reports the single Alembic head
`20260721_020000`. `alembic check` remains stopped only by the separately audited
historical `org_staff` metadata target; no TG19-owned drift exists. Repository-
wide frontend TypeScript errors remain unrelated baseline debt and do not name
the TG19 acceptance files.

All 28 requirements are classified: 27 `VERIFIED_COMPLETE`, 0 `PARTIAL`, 0
`BLOCKED`, 1 `OUT_OF_SCOPE`, and 0 `STAGING_ONLY`. Production promotion still
requires normal staging/release verification, but no TG19-owned implementation
blocker remains.

**TG19 Implementation Status:** `ACCEPTED`

## 31. ADR-PF-017 Automatic Authority Closure — 2026-07-21

**Decision:** `VERIFICATION_STRATEGY_AUTHORITY_READY`

ADR-PF-018 resolves both ADR-PF-017 implementation-preflight gaps:

- contact `AUTOMATIC` uses the backend-only
  `IAuthoritativeUserIdentityProvider` Supabase adapter and immutable
  `supabase_auth_identity_v1`, with normalized exact-match and fail-closed
  confirmation rules;
- ownership `AUTO_APPROVE` and test-only `DISABLED` use
  `verification_strategy_system_authority` with immutable
  `nonprod_ownership_strategy_v1`, never a real or fabricated human approver.

The additive implementation boundary comprises strategy interfaces and
selection, typed configuration and startup validation, the Supabase adapter,
lifecycle-mediated decisions, and the smallest ownership system-provenance
persistence/migration extension defined by ADR-PF-018. Existing repositories,
lifecycle services, authorization, Platform/organization audit, idempotency,
unit of work, isolation, transactions, and Clinic Entry consumption must be
reused.

Focused verification must cover confirmed/unconfirmed exact matching, adapter
failure, no contact copying, system provenance without a fake user, lifecycle,
audit, idempotency, rollback, no direct association, test/QA restrictions,
staging `REQUIRED`, production rejection, and ambiguous-configuration failure.

No product, frontend orchestration, staff identity, TG20, or clinical scope is
authorized.

**ADR-PF-017 Verification Strategy Implementation Status:** `READY`

## 32. TG19 Final Acceptance — 2026-07-21

`TG19-FINAL-ACCEPTANCE.md` is the controlling final-acceptance evidence.

The isolated PostgreSQL TG19 suite passes 159 tests; fresh migration to the
single `20260721_020000` head and the latest downgrade/re-upgrade pass. Backend
Clinic Entry and Platform Foundation are verified. The known historical
`org_staff` metadata target still prevents a literal clean `alembic check` and
remains separately owned under the completed drift audit.

TG19 is not accepted because the frozen frontend orchestration checkpoint was
not implemented. Choice-card presentation exists, but there is no path-specific
input/mutation, verification integration, retry lifecycle, session refresh,
effective-tenant validation, stale-state cleanup, or authoritative handoff. In
addition, the ADR-PF-017/018 strategy resolvers are not consumed by operational
dependency/transport composition, leaving configured automatic/disabled
strategies unreachable in the product flow.

**TG19_FINAL_ACCEPTANCE_NOT_ACCEPTED**

TG20 remains unauthorized. The next activity must close the already-approved
TG19 frontend orchestration and runtime strategy-composition boundaries, then
repeat final acceptance.

## 33. TG19.1 Runtime Verification Composition — 2026-07-21

The approved ADR-PF-017/018 strategy resolvers are now consumed by the live
clinic-contact request and ownership-target dependency contexts. Contact
`AUTOMATIC`, `MANUAL`, and permitted `DISABLED` modes and ownership `REQUIRED`,
`AUTO_APPROVE`, and test-only `DISABLED` modes therefore reach their existing
authoritative evidence lifecycles through one typed configuration resolver.
Manual review/status transport remains available; no route-level mode branch,
parallel lifecycle, persistence change, or frontend behavior was added.

Focused and full TG19/TG19.1 verification passes **161 tests** on isolated
PostgreSQL. The single Alembic head/current revision remains
`20260721_020000`; the known historical `org_staff` metadata issue remains
separately classified and no TG19-owned drift was introduced.

**TG19_1_RUNTIME_COMPOSITION_COMPLETE**

The only remaining implementation blocker from final acceptance is the frozen
frontend Clinic Entry orchestration checkpoint. TG19 remains not accepted until
that checkpoint is implemented and final acceptance is repeated. TG20 remains
unauthorized.
