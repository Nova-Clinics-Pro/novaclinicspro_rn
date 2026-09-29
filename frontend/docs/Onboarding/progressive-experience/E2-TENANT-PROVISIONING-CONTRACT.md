# E2 Tenant Provisioning Contract

Date: 2026-07-20

Status: Version 1 ownership and policy approved; operational integration remains open

## Version 1 Approved Contract Register

This register controls and closes conflicting earlier `OPEN DECISION` statements.
It does not invent a service, endpoint, DTO, or ownership-verification mechanism.

### Ownership

- **CONFIRMED** — Workspace/Tenant domain owns tenant creation, tenant
  association, tenant selection, authoritative tenant results, and tenant truth.
- **CONFIRMED** — Authentication owns authenticated identity and session refresh.
- **CONFIRMED** — Frontend owns presentation, navigation, and validation
  presentation; it never owns or synthesizes tenant truth.

### Tenant creation and association

- **CONFIRMED** — New-clinic creation is an authoritative Workspace/Tenant
  operation.
- **CONFIRMED** — Bring Your Clinic association connects an existing
  Nova-managed clinic to the authenticated caller's organization only after
  successful ownership verification.
- **CONFIRMED** — Only an authenticated Organization Owner or authorized
  Organization Admin is eligible for Version 1 association.
- **OUT OF SCOPE** — Data/EMR/vendor migration, bulk import, and unverified tenant
  claiming.

### Selection and effective tenant

- **CONFIRMED** — Exactly one authorized clinic is selected automatically as the
  effective tenant.
- **CONFIRMED** — More than one authorized clinic requires explicit tenant
  selection before tenant-sensitive onboarding.
- **CONFIRMED** — Future selection strategies are additive named strategies and
  do not change Version 1 behavior.

### Duplicate and idempotency

- **CONFIRMED** — Version 1 duplicate prevention uses normalized clinic identity
  within organization scope.
- **CONFIRMED** — Create and associate operations are idempotent.
- **CONFIRMED** — A retry of the same logical operation returns the same
  authoritative result and does not repeat the side effect.
- **CONFIRMED** — Future matching strategies are additive and versioned.

### Security

- **CONFIRMED** — Clinic identity/contact is business-sensitive tenant metadata,
  not clinical data and not payment data.
- **CONFIRMED** — Local drafts are permitted only for fields on an approved
  non-sensitive allowlist.
- **CONFIRMED** — Logout and tenant switching clear permitted local drafts.
- **CONFIRMED** — Ownership-verification and association actions require an
  auditable record.
- **CONFIRMED** — Future classification categories are additive.

### Remaining operational decisions

- **OPEN DECISION** — Existing API sufficiency and exact Workspace/Tenant
  repository/service ownership.
- **OPEN DECISION** — Normalization algorithm and canonical identity key.
- **OPEN DECISION** — Ownership-verification method, evidence, expiry, and audit
  event shape.
- **OPEN DECISION** — Command identity/idempotency-key generation, scope, and
  retention window.
- **OPEN DECISION** — Session-refresh ordering, token claims, failure recovery,
  and Req 11 fallback retirement.
- **OPEN DECISION** — Typed failure taxonomy, partial-success recovery, offline
  disposition, DTOs, and focused contract tests.

## Classification Rule

- **CONFIRMED** — Canonical evidence establishes the boundary.
- **OPEN DECISION** — Product, architecture, backend, or security approval is
  missing; implementation must stop.
- **OUT OF SCOPE** — E2/TG19 does not authorize the behavior.

## Contract Purpose

- **CONFIRMED** — This contract separates tenant creation, association,
  selection, effective-tenant use, session refresh, and downstream handoff.
- **CONFIRMED** — It documents constraints only and invents no backend API.
- **OPEN DECISION** — No complete accepted provisioning contract currently
  exists.

## Terminology

| Classification | Term | Boundary |
|---|---|---|
| CONFIRMED | Application | Existing onboarding application context; it is not itself proof of an effective tenant. |
| CONFIRMED | Clinic | Product identity/contact concept; canonical relationship to tenant is not fully documented. |
| CONFIRMED | Tenant | Backend-authoritative isolation identity used by tenant-scoped APIs and state. |
| CONFIRMED | Provisional tenant | Existing demo/provisional state referenced by Req 11. |
| CONFIRMED | Effective tenant | Explicit tenant used for current downstream onboarding operations. |
| OPEN DECISION | Tenant association | Authorized relation among user, organization, clinic, application, and tenant. |
| OPEN DECISION | Provisioning | Exact states, owner, operation, completion, and TG19/TG20 boundary. |

## Tenant Creation

- **CONFIRMED** — The roadmap includes a new-clinic entry path.
- **CONFIRMED** — Backend/platform owns authoritative creation and persisted
  tenant identity.
- **CONFIRMED** — Current repository evidence includes demo tenant creation and
  organization-admin tenant creation, but neither is automatically the accepted
  E2 new-clinic contract.
- **OPEN DECISION** — Eligibility, application prerequisite, creating service,
  request/response, idempotency key, initial lifecycle state, and provisioning
  completion are undefined.
- **OUT OF SCOPE** — This document does not authorize use of `createDemoTenant`
  for the target new-clinic path or reuse of super/org-admin creation without
  contract approval.

## Tenant Association

- **CONFIRMED** — Bring Your Clinic may require some relationship to an existing
  clinic, but canonical evidence does not define that relationship.
- **CONFIRMED** — Backend must authorize and persist any accepted association.
- **OPEN DECISION** — Whether association exists, its ownership proof, search/
  discovery rules, consent, invitation, conflict behavior, result, and audit are
  undefined.
- **OUT OF SCOPE** — No tenant claim, merge, record transfer, or clinical-data
  migration is authorized.

## Tenant Selection

- **CONFIRMED** — Multi-clinic owners require an explicit selected/effective
  tenant before tenant-sensitive work.
- **CONFIRMED** — Selection may not expose a tenant the authenticated user is not
  authorized to access.
- **OPEN DECISION** — Tenant list source, default selection, selector owner,
  persisted preference, selection mutation, session effect, and unavailable
  tenant behavior are undefined.
- **OUT OF SCOPE** — A route parameter or cached tenant ID alone is not
  authoritative selection proof.

## Effective Tenant

- **CONFIRMED** — The effective tenant shall scope onboarding queries,
  mutations, drafts, caches, navigation, diagnostics, and TG18 projection.
- **CONFIRMED** — TG18 suppresses onboarding status that does not match the
  requested tenant.
- **CONFIRMED** — On tenant change, old derived journey state shall not remain
  visible as truth.
- **OPEN DECISION** — Canonical source precedence between refreshed auth,
  approved selection state, and route context requires acceptance.

## Session Refresh

- **CONFIRMED** — Existing auth/session refresh must be reused after an
  authoritative creation/association/selection result.
- **CONFIRMED** — Req 11 requires `tenant_id` for provisional tenants or the
  documented `X-Tenant-ID` fallback until backend deployment and staging proof.
- **CONFIRMED** — Fallback removal is gated by verified backend behavior.
- **OPEN DECISION** — Refresh trigger, sequencing, retry, timeout, failure UX,
  token claims for multi-clinic users, and success validation are undefined.
- **OUT OF SCOPE** — No second auth/session implementation.

## Multi-Clinic Behavior

- **CONFIRMED** — Every query key and mutation context must include the effective
  tenant where tenant-sensitive.
- **CONFIRMED** — Tenant switching must cancel or isolate stale requests and
  prevent draft/cache/journey leakage.
- **CONFIRMED** — Logout cleanup must preserve Req 30 tenant isolation.
- **OPEN DECISION** — Clinic selector placement, switching during pending work,
  unsaved-input handling, re-authentication, and navigation reset are undefined.

## Duplicate and Idempotency Policy

- **CONFIRMED** — Repeated taps, network retries, and stale callbacks must not
  create duplicate clinics or associations.
- **CONFIRMED** — Existing idempotency patterns shall be reused when the accepted
  operation supports them.
- **CONFIRMED** — Duplicate detection and persisted uniqueness remain backend
  responsibilities.
- **OPEN DECISION** — Duplicate keys, match confidence, same-key replay semantics,
  idempotency scope/duration, response shape, user resolution, and audit are
  undefined.
- **OUT OF SCOPE** — Frontend-owned duplicate detection or silent merging.

## Failure and Retry Ownership

| Classification | Failure class | Owner/boundary |
|---|---|---|
| CONFIRMED | Client validation presentation | Frontend presents approved localized accessible feedback. |
| CONFIRMED | Authorization, duplicate, persistence, provisioning | Backend is authoritative. |
| CONFIRMED | Transport/query orchestration | Existing repository/datasource layers own requests; presentation does not call APIs. |
| CONFIRMED | Stale response after tenant change | Frontend/repository must suppress or isolate it. |
| OPEN DECISION | Retryable vs terminal taxonomy | Not accepted. |
| OPEN DECISION | Partial success and recovery token/state | Not accepted. |
| OPEN DECISION | Offline create/associate support | Not accepted and cannot borrow TG25 policy. |
| OUT OF SCOPE | New centralized error/retry platform | TG24 governs that later capability. |

## Security Boundaries

- **CONFIRMED** — Tenant authorization is server-enforced; frontend context is
  not sufficient authority.
- **CONFIRMED** — Sensitive identity/contact data and storage require Req 19 and
  Req 30 compliance.
- **CONFIRMED** — No cross-tenant data may be disclosed, persisted, restored, or
  mutated.
- **CONFIRMED** — Logs/errors/analytics must not leak sensitive values.
- **OPEN DECISION** — Field classification, encryption, local-storage allowance,
  retention, deletion, audit, consent, ownership-proof data, and Security owner
  are undefined.
- **OUT OF SCOPE** — No clinical record or payment data processing.

## Frontend/Backend Boundary

| Classification | Frontend | Backend/platform |
|---|---|---|
| CONFIRMED | Present approved paths and inputs. | Authorize and persist accepted create/associate/select operations. |
| CONFIRMED | Use repositories and typed results. | Return authoritative tenant identity and state. |
| CONFIRMED | Refresh existing session and verify consistent tenant context. | Provide accepted session/tenant claims and authorization. |
| CONFIRMED | Preserve pending/disabled/error/accessibility state. | Enforce uniqueness, idempotency, isolation, and audit. |
| OPEN DECISION | Exact request orchestration. | Exact service, API, DTO, state model, and error contract. |

## Required Contract Matrix Before Implementation

| Classification | Scenario | Required approved outcome |
|---|---|---|
| OPEN DECISION | New user/new clinic | Eligibility, creation result, effective tenant, session handoff. |
| OPEN DECISION | Provisional tenant | Identity source, promotion/retention behavior, fallback policy. |
| OPEN DECISION | Existing clinic/Bring Your Clinic | Meaning, proof, association/import behavior, result. |
| OPEN DECISION | Multi-clinic owner | Authorized list, selection, switch, session and cache behavior. |
| OPEN DECISION | Duplicate/repeated request | Detection, idempotent response, recovery, audit. |
| OPEN DECISION | Partial success/session refresh failure | Retry/resume/cancel behavior and source of truth. |

## Mandatory Principles

- **CONFIRMED — Central Theme:** any future UI uses central assets only.
- **CONFIRMED — Localization First:** all states in both locales.
- **CONFIRMED — Accessibility:** explicit status, action consequence, focus, and
  non-color meaning.
- **CONFIRMED — Clean Architecture:** presentation → orchestration → repository
  → datasource; no direct API calls.
- **CONFIRMED — Reuse-before-create:** existing auth/tenant/onboarding boundaries
  first; duplicates prohibited.
- **CONFIRMED — Multi-clinic:** explicit tenant scope and leakage prevention.
- **CONFIRMED — Progressive Experience:** no Demo Mode as target, no frontend
  provisioning truth, and no later-epic gate bypass.

## Contract Determination

- **OPEN DECISION** — The operational tenant/provisioning contract remains
  incomplete and blocks TG19 implementation.

E2 Tenant Provisioning Policy Status: **VERSION 1 APPROVED**

E2 Tenant Provisioning Integration Status: **NOT READY**
