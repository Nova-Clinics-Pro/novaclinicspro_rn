# E2 Clinic Entry Requirements

Date: 2026-07-20

Status: Version 1 product decisions approved; implementation prerequisites remain open

## Version 1 Approved Decision Register

This register is additive and controlling. Any earlier `OPEN DECISION` in this
document that conflicts with a row marked `CONFIRMED` below is superseded and
closed. Unlisted implementation detail remains `OPEN DECISION`.

| Classification | Area | Version 1 decision |
|---|---|---|
| CONFIRMED | Bring Your Clinic | An authenticated Organization Owner or authorized Organization Admin may connect an existing Nova-managed clinic to their organization after successful ownership verification. |
| OUT OF SCOPE | Bring Your Clinic non-goals | Data migration, EMR migration, another vendor's database import, bulk data import, and tenant claiming without verification. Future meanings require roadmap approval. |
| CONFIRMED | Required Minimum Set (Version 1) | Clinic Name; Clinic Address; Primary Contact Number; Verified Email or Mobile; Clinic Type / Specialty. |
| CONFIRMED | Optional Initial Set (Version 1) | GST; PAN; Logo; Website; Secondary Contact. |
| CONFIRMED | Field extension point | Fields are stable keyed definitions grouped as required or optional for a contract version. Future approved fields are additive; consumers ignore unknown optional fields and shall not require schema redesign. |
| CONFIRMED | Tenant ownership | Workspace/Tenant domain owns tenant creation, tenant association, and tenant selection. Authentication owns identity and session refresh. Frontend owns presentation, navigation, and validation presentation—never tenant truth. |
| CONFIRMED | Multi-clinic Version 1 | A single authorized clinic becomes the automatic effective tenant. Multiple authorized clinics require explicit tenant selection. Future strategies are additive. |
| CONFIRMED | Duplicate/idempotency Version 1 | Duplicate prevention uses normalized clinic identity within organization scope. Create/associate operations are idempotent; retry returns the same authoritative result. Future matching strategies are additive. |
| CONFIRMED | Security Version 1 | Clinic identity/contact is business-sensitive tenant metadata, not clinical or payment data. Local drafts are allowed only for approved non-sensitive fields and are cleared on logout and tenant switch. Ownership verification and association actions are auditable. Future classification categories are additive. |

### Versioned Extension Rules

- **CONFIRMED** — Entry paths use stable identifiers and declared eligibility;
  future paths are additions approved through the roadmap and do not redefine
  Version 1 semantics.
- **CONFIRMED** — Field definitions carry stable keys, requirement level,
  localization keys, validation metadata, and security classification; the
  required/optional sets may grow additively through an approved contract
  version.
- **CONFIRMED** — New matching or tenant-selection strategies are named,
  versioned additions; Version 1 normalized-identity and single/multiple clinic
  behavior remain backward compatible.
- **OPEN DECISION** — Exact normalization rules, ownership-verification method,
  API/DTO representation, error taxonomy, and optional-field draft allowlist
  require technical contract approval before implementation.

## Classification Rule

- **CONFIRMED** — directly supported by canonical requirements, design, tasks,
  roadmap, traceability, TG19 readiness, or accepted E1 documents.
- **OPEN DECISION** — required for implementation but not resolved by canonical
  evidence.
- **OUT OF SCOPE** — expressly excluded from E2/TG19.
- **CONFIRMED** — No unclassified product behavior in this document is
  implementation authority.

## Business Objective

- **CONFIRMED** — E2 defines supported clinic-entry paths and identity/contact
  information required before workspace preparation.
- **CONFIRMED** — The intended outcome is a resolved effective tenant without
  duplicate clinic creation or cross-tenant state.
- **CONFIRMED** — The business value is reduced abandonment and avoidance of a
  new-clinic-only mental model for established clinics.
- **OPEN DECISION** — The product meaning of established-clinic entry is not
  defined beyond the name “Bring Your Clinic.”

## Personas

- **CONFIRMED** — Primary personas are Organization Owner, Organization Admin,
  and Clinic Administrator.
- **OUT OF SCOPE** — Front Desk, Doctor, and Therapist are not primary E2
  personas.

## Supported Clinic-Entry Paths

| Classification | Path | Constitutional disposition |
|---|---|---|
| CONFIRMED | New clinic | The roadmap distinguishes a new-clinic path and requires clinic identity/contact handoff plus tenant resolution. |
| CONFIRMED | Bring Your Clinic | The roadmap names this as a distinct path for established clinics. The name alone does not define behavior. |
| OPEN DECISION | New-clinic eligibility and entry point | Canonical evidence does not define who may create a new clinic, whether application approval is always required, or whether demo/provisional creation remains part of the target journey. |
| OPEN DECISION | Bring Your Clinic eligibility and behavior | Association, claim, import, lookup, verification, migration, and existing-Nova-tenant cases are not defined. |
| OPEN DECISION | Multi-clinic selection path | The roadmap requires an explicit effective clinic, but selection UX and authority are undefined. |
| OUT OF SCOPE | Additional inferred paths | No implementation may add migration, bulk import, record transfer, tenant claim, merge, or third-party onboarding paths without product approval. |

## Functional Requirements

### E2-FR1 — Path presentation

- **CONFIRMED** — The user shall choose only from product-approved clinic-entry
  paths.
- **CONFIRMED** — Path labels, explanations, states, and errors shall be
  localized in English and Hindi.
- **OPEN DECISION** — Exact path names, descriptions, eligibility, order,
  default/recommended state, and availability rules require Product approval.

### E2-FR2 — New-clinic entry

- **CONFIRMED** — The new-clinic path shall collect or confirm approved clinic
  identity/contact information before workspace preparation.
- **CONFIRMED** — Tenant creation/provisioning truth shall remain backend-owned.
- **OPEN DECISION** — The required fields, application prerequisite, validation,
  creation operation, provisioning response, and completion criteria are not
  defined.

### E2-FR3 — Bring Your Clinic

- **CONFIRMED** — Bring Your Clinic shall remain a separate product concept from
  the new-clinic path.
- **OPEN DECISION** — Its exact meaning, eligibility, ownership proof, data
  handling, association/import behavior, and completion criteria require Product,
  Architecture, Backend, and Security approval.
- **OUT OF SCOPE** — This requirements document does not infer an import engine,
  clinical-data migration, tenant claim, or record merge.

### E2-FR4 — Identity and contact handoff

- **CONFIRMED** — Clinic identity/contact information must be complete enough for
  the accepted handoff to workspace preparation.
- **CONFIRMED** — Fields must remain specialty-extensible and must not embed
  Ayurveda-specific assumptions.
- **OPEN DECISION** — Canonical field names, required/optional status,
  normalization, authoritative source, uniqueness rules, and update ownership
  are undefined.

### E2-FR5 — Effective tenant

- **CONFIRMED** — Successful clinic entry shall resolve an explicit effective
  tenant before tenant-sensitive onboarding and TG18 journey projection.
- **CONFIRMED** — Tenant-scoped state from another clinic shall never be shown or
  mutated.
- **OPEN DECISION** — Selection authority and behavior for new, provisional,
  existing, active, and multi-clinic users are undefined.

### E2-FR6 — Session handoff

- **CONFIRMED** — Existing auth/session refresh boundaries shall be reused after
  authoritative tenant creation, association, or selection.
- **CONFIRMED** — Req 11 requires non-null tenant identity for provisional
  tenants or retention of the documented fallback until staging verification.
- **OPEN DECISION** — The response that triggers refresh, refresh success
  criteria, failure recovery, and fallback retirement are unresolved.

### E2-FR7 — Duplicate prevention

- **CONFIRMED** — Failure and retry paths must not create duplicate clinics.
- **CONFIRMED** — Existing idempotency conventions must be reused where their
  accepted contract applies.
- **OPEN DECISION** — Duplicate identity, detection authority, idempotency-key
  scope, replay response, and user resolution behavior are undefined.

### E2-FR8 — Failure and recovery

- **CONFIRMED** — Loading, pending, validation, failure, and retry states shall
  be explicit, localized, accessible, and non-destructive.
- **CONFIRMED** — Presentation shall not claim tenant/provisioning success without
  authoritative state.
- **OPEN DECISION** — Error taxonomy, retry eligibility, cancellation, resume,
  partial-success, timeout, and stale-response policies require approval.

### E2-FR9 — Navigation and handoff

- **CONFIRMED** — Navigation shall reuse existing routing and preserve effective
  tenant context.
- **CONFIRMED** — E2 hands off to workspace preparation; TG18 journey behavior is
  consumed only after effective tenant resolution.
- **OPEN DECISION** — Exact routes, back/cancel outcomes, workspace-preparation
  entry condition, and recovery destination are undefined.

### E2-FR10 — Multi-clinic isolation

- **CONFIRMED** — Queries, mutations, drafts, caches, and derived journey state
  shall be scoped to the effective tenant.
- **CONFIRMED** — Switching clinics shall isolate or cancel stale state.
- **OPEN DECISION** — The clinic selector owner, default selection, persisted
  selection policy, and simultaneous in-flight transition behavior are undefined.

## Non-Functional Requirements

- **CONFIRMED — Central Theme:** Use only central theme tokens, typography,
  spacing, radii, icons, and reusable primitives; no new hardcoded visual system.
- **CONFIRMED — Localization First:** No hardcoded user-visible copy; `en-US` and
  `hi-IN` keys and interpolation shall remain compatible.
- **CONFIRMED — Accessibility:** Choices, forms, errors, pending states, and
  navigation require names, instructions, state, logical focus, non-color
  meaning, and minimum 44-by-44 touch targets.
- **CONFIRMED — Clean Architecture:** Presentation may orchestrate hooks and
  stores but shall not call APIs directly; repository hooks own React Query;
  datasources own transport.
- **CONFIRMED — Reuse-before-create:** Existing application, auth, tenant,
  onboarding, form, theme, localization, navigation, and TG18 assets must be
  evaluated before additions; duplicates are prohibited.
- **CONFIRMED — Multi-clinic compatibility:** Every tenant-sensitive operation
  shall use explicit tenant identity and preserve isolation.
- **CONFIRMED — Progressive Experience consistency:** No Demo Mode as target
  product journey; no frontend-owned workspace/readiness/commercial truth.
- **CONFIRMED — Security:** Req 19 and Req 30 govern sensitive local data and
  tenant-scoped cleanup.
- **OPEN DECISION — Security classification:** E2 field classification,
  permitted persistence, retention, audit, encryption, and deletion need
  Security approval.

## Acceptance Criteria

| ID | Classification | Criterion |
|---|---|---|
| E2-AC1 | CONFIRMED | Only product-approved entry paths are presented. |
| E2-AC2 | OPEN DECISION | Product approves the exact meaning and non-goals of Bring Your Clinic. |
| E2-AC3 | OPEN DECISION | Architecture/Backend approve create, associate, select, and provisioning ownership and contracts. |
| E2-AC4 | OPEN DECISION | Product/Backend approve canonical identity/contact fields and validation ownership. |
| E2-AC5 | CONFIRMED | Effective tenant is explicit before tenant-sensitive onboarding or TG18 projection. |
| E2-AC6 | CONFIRMED | Repeated actions and retries cannot create duplicate clinics or cross-tenant side effects. |
| E2-AC7 | CONFIRMED | Existing repositories, auth refresh, theme, localization, navigation, form primitives, and TG18 foundation are reused where contract-compatible. |
| E2-AC8 | CONFIRMED | No presentation component calls an API directly in new or refactored E2 behavior. |
| E2-AC9 | CONFIRMED | All new copy has English/Hindi parity and no hardcoded user-visible strings. |
| E2-AC10 | CONFIRMED | Choice, form, validation, pending, failure, and navigation behavior passes accessibility acceptance. |
| E2-AC11 | CONFIRMED | Tenant switching/logout causes no cache, draft, mutation, or journey leakage. |
| E2-AC12 | OPEN DECISION | Security approves data classification, local persistence, retention, and cleanup. |
| E2-AC13 | CONFIRMED | The flow hands off to workspace preparation without frontend-owned completion truth. |
| E2-AC14 | OUT OF SCOPE | No Doctor Module, Clinical Workspace, Scheduling, Inventory, Billing, Payment Gateway, clinical-record migration, or TG20+ implementation is delivered. |

## Success Metrics

- **CONFIRMED** — Account-to-clinic-identity completion rate.
- **CONFIRMED** — Abandonment rate by approved clinic-entry path.
- **CONFIRMED** — Median time to resolve a tenant and enter workspace
  preparation.
- **CONFIRMED** — Duplicate clinic-creation rate.
- **OPEN DECISION** — Event names, event owner/provider, denominator definitions,
  targets, reporting window, and privacy classification are not approved.
- **OUT OF SCOPE** — This document does not create an analytics platform.

## Explicit Non-Goals

- **OUT OF SCOPE** — Doctor Module and clinical workflows.
- **OUT OF SCOPE** — Clinical Workspace implementation.
- **OUT OF SCOPE** — Scheduling, Inventory, Billing implementation, and Payment
  Gateway implementation.
- **OUT OF SCOPE** — Clinical-record migration or a generic import engine.
- **OUT OF SCOPE** — Workspace-preparation state implementation (TG20).
- **OUT OF SCOPE** — Capability visibility, Ready-to-Start, commercial trial,
  subscription/payment recovery, dunning, dashboard first actions, and growth.
- **OUT OF SCOPE** — Backend API redesign, new endpoints, migrations, or
  architecture rewrites without separate constitutional approval.

## Planning Determination

- **OPEN DECISION** — E2 cannot be implementation-ready until the OPEN DECISION
  acceptance criteria are approved and traced into design and reuse boundaries.

Epic 2 Constitutional Product Status: **VERSION 1 APPROVED**

Epic 2 Implementation Planning Status: **NOT READY**

## ADR-PF-008 Verified Contact Correction — Controlling Addendum

- **CONFIRMED** — Version 1 supports a verified clinic email only, verified
  clinic mobile only, or both; at least one verified clinic contact is required.
- **CONFIRMED** — Authentication identity is not clinic-contact truth. Actor or
  organization contact data cannot be copied unless explicitly supplied and
  verified for the clinic.
- **CONFIRMED** — With one verified method it is primary. With both, the request
  explicitly selects the primary kind; no email-first/mobile-first default is
  inferred.
- **CONFIRMED** — `org_tenants.email` becomes nullable through the bounded
  ADR-PF-008 implementation. Existing values are preserved and no placeholder
  or synthetic contact is authorized.
- **CONFIRMED** — `ClinicIdentityInputV1` must represent one or two distinct
  verified methods and reject neither/unverified/duplicate-kind input.
- **OUT OF SCOPE** — Authentication-contact transfer, placeholder generation,
  silent mobile-only rejection, contact discovery, and a parallel subsystem.

This addendum supersedes earlier required-field language that would make both a
primary telephone number and email mandatory. The authoritative minimum is at
least one verified clinic email or mobile under ADR-PF-008.

Verified Clinic Contact Planning Status:
**VERIFIED_CLINIC_CONTACT_PERSISTENCE_READY_FOR_IMPLEMENTATION**
