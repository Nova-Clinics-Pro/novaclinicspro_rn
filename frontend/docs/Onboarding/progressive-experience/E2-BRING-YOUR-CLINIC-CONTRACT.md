# E2 Bring Your Clinic Contract

Date: 2026-07-20

Status: Version 1 product meaning approved

## Version 1 Approved Product Contract

This section is controlling. It closes every conflicting historical assumption
or `OPEN DECISION` below about the Version 1 meaning, eligibility, ownership
domain, and explicit non-goals. Other implementation details remain open.

### Definition

- **CONFIRMED** — Bring Your Clinic Version 1 allows an authenticated
  Organization Owner or authorized Organization Admin to connect an existing
  Nova-managed clinic to their organization after successful ownership
  verification.

### Required Minimum Set (Version 1)

- **CONFIRMED** — The clinic must be an existing Nova-managed clinic.
- **CONFIRMED** — The caller must be authenticated.
- **CONFIRMED** — The caller must be an Organization Owner or authorized
  Organization Admin.
- **CONFIRMED** — Ownership verification must succeed before association.
- **CONFIRMED** — Workspace/Tenant returns the authoritative association/tenant
  result; Authentication refreshes identity/session; Frontend presents and
  navigates.

### Optional Initial Set (Version 1)

- **CONFIRMED** — No optional Bring Your Clinic behavior is approved in Version
  1 beyond presentation details that do not change eligibility or association
  semantics.

### Explicit non-goals

- **OUT OF SCOPE** — Data migration.
- **OUT OF SCOPE** — EMR migration.
- **OUT OF SCOPE** — Importing another vendor's database.
- **OUT OF SCOPE** — Bulk data import.
- **OUT OF SCOPE** — Tenant claiming without verification.

### Extension points

- **CONFIRMED** — Future meanings require roadmap approval and are represented
  as new versioned entry-path capabilities, not reinterpretations of Version 1.
- **CONFIRMED** — Future ownership-verification, matching, and selection
  strategies are additive named strategies behind the stable Version 1 result
  boundary.
- **OPEN DECISION** — Exact clinic locator/input, ownership-verification method,
  normalized identity algorithm, association API/DTO, audit record, errors,
  retries, navigation, and localized copy require technical/UX approval.

## Classification Rule

- **CONFIRMED** — Explicit canonical statement.
- **OPEN DECISION** — Missing decision or an assumption that must not be treated
  as product behavior.
- **OUT OF SCOPE** — Explicit exclusion.
- **CONFIRMED** — The requested `ASSUMED` section below inventories plausible
  interpretations only; every assumption is classified `OPEN DECISION` because
  assumptions are not constitutional authority.

## CONFIRMED

| Classification | Canonical statement | Source |
|---|---|---|
| CONFIRMED | Phase 2 includes “clinic identity and Bring Your Clinic” among missing or partially represented product capabilities. | Phase 2 roadmap §2. |
| CONFIRMED | The end-to-end journey includes clinic-entry paths for creating or bringing a clinic. | Phase 2 roadmap §3. |
| CONFIRMED | E2 is a Product Experience epic named “Clinic Entry and Bring Your Clinic.” | Phase 2 roadmap §4/§5 E2. |
| CONFIRMED | E2 must define supported clinic-entry paths and identity/contact information required before workspace preparation. | Phase 2 roadmap E2 Purpose. |
| CONFIRMED | E2 should avoid forcing established clinics through a new-clinic-only mental model. | Phase 2 roadmap E2 Business value. |
| CONFIRMED | Primary personas are Organization Owner, Organization Admin, and Clinic Administrator. | Phase 2 roadmap E2 Personas. |
| CONFIRMED | The journey is account → documented clinic path → supply/confirm clinic identity/contact → resolved tenant → workspace preparation. | Phase 2 roadmap E2 User journey. |
| CONFIRMED | Existing Req 11, 19, 24, 25, and 30 constrain E2. | Phase 2 roadmap E2 Requirements. |
| CONFIRMED | Bring Your Clinic and identity/contact refinement require new Phase 2 requirements. | Phase 2 roadmap E2 Requirements. |
| CONFIRMED | A new clinic-entry application-flow design is required. | Phase 2 roadmap E2 Design sections. |
| CONFIRMED | Product definition of Bring Your Clinic is an explicit TG19 dependency and Open Decisions Register item. | Phase 2 roadmap E2/TG19/§13. |
| CONFIRMED | Tenant provisioning/selection and data/security classification are TG19 dependencies. | Phase 2 roadmap E2/TG19. |
| CONFIRMED | Existing `ChoiceScreen`, application flows, and `ClinicProfileScreen` require reuse audit. | Phase 2 roadmap E2. |
| CONFIRMED | TG19 scope names “New-clinic vs Bring Your Clinic path, identity/contact handoff, tenant resolution; no invented import engine.” | Phase 2 roadmap TG19. |
| CONFIRMED | TG19 must stop if Bring Your Clinic product meaning or tenant/provisioning ownership remains undefined. | Phase 2 roadmap TG19 stop condition. |
| CONFIRMED | The traceability audit lists Bring Your Clinic as absent from the actionable requirement/design/task chain. | Traceability audit missing capability findings. |
| CONFIRMED | TG19 readiness found no accepted association/import operation or contract. | TG19 readiness §§8–10. |
| CONFIRMED | Current `ChoiceScreen` calls demo-tenant creation for both existing visible choices; repository behavior does not define Bring Your Clinic. | TG19 readiness implementation findings/source inspection. |

## ASSUMED — Not Authorized

| Classification | Possible interpretation | Disposition |
|---|---|---|
| OPEN DECISION | “Bring” could mean associate an already existing Nova tenant. | No canonical evidence chooses this meaning. |
| OPEN DECISION | “Bring” could mean claim a clinic by proving ownership. | No ownership-proof or claim contract exists. |
| OPEN DECISION | “Bring” could mean import identity/contact information for a clinic not yet represented in Nova. | No import source, payload, mapping, or validation contract exists. |
| OPEN DECISION | “Bring” could mean migrate clinical or operational records. | This conflicts with explicit E2 non-goals unless separately roadmapped. |
| OPEN DECISION | “Bring” could mean select another tenant already available to a multi-clinic owner. | Multi-clinic selection is required but not defined as Bring Your Clinic. |
| OPEN DECISION | “Bring” could reuse organization-admin tenant creation. | That administrative API is not approved as an onboarding association contract. |
| OPEN DECISION | “Bring” could reuse demo tenant creation. | Demo Mode is not the target journey and cannot define the product path. |
- **CONFIRMED** — None of the interpretations in this section may be implemented
  until Product explicitly selects and specifies behavior.

## OPEN DECISION

### Product meaning

- **OPEN DECISION** — What user problem does Bring Your Clinic solve?
- **OPEN DECISION** — Is the clinic already represented in Nova?
- **OPEN DECISION** — Is the operation selection, association, claim, import, or
  another approved behavior?
- **OPEN DECISION** — Which inputs and evidence must the user provide?
- **OPEN DECISION** — Who is eligible: Organization Owner, Organization Admin,
  Clinic Administrator, or a subset?
- **OPEN DECISION** — What makes the path successful and what is the resulting
  tenant/application/clinic state?

### Ownership and authorization

- **OPEN DECISION** — Which backend/platform owner performs the operation?
- **OPEN DECISION** — How is clinic ownership/authorization proven?
- **OPEN DECISION** — How are organization membership and multi-clinic access
  verified?
- **OPEN DECISION** — What audit/consent evidence is required?

### Data and validation

- **OPEN DECISION** — Which identity/contact fields are supplied, imported, or
  confirmed?
- **OPEN DECISION** — Which system is authoritative for each field?
- **OPEN DECISION** — How are duplicates, matches, mismatches, conflicts, and
  unsupported clinics handled?
- **OPEN DECISION** — What sensitive data may be stored, for how long, and under
  which security classification?

### Tenant and provisioning

- **OPEN DECISION** — Does success create a tenant, associate an existing tenant,
  or select an already associated tenant?
- **OPEN DECISION** — What authoritative result supplies the effective tenant?
- **OPEN DECISION** — What session refresh and cache invalidation are required?
- **OPEN DECISION** — Where does TG19 stop and TG20 workspace preparation begin?

### Failure and retry

- **OPEN DECISION** — What operations are idempotent and what key/replay policy
  applies?
- **OPEN DECISION** — What failures are retryable, terminal, or require support?
- **OPEN DECISION** — How are partial success, timeout, cancellation, and restart
  handled?

### Experience

- **OPEN DECISION** — Approved name, description, eligibility explanation,
  confirmation, errors, recovery copy, and success message.
- **OPEN DECISION** — Navigation, back/cancel behavior, focus behavior, and
  accessibility acceptance.
- **OPEN DECISION** — Analytics event intents, targets, and privacy boundary.

## OUT OF SCOPE

- **OUT OF SCOPE** — Doctor Module and clinical workflows.
- **OUT OF SCOPE** — Clinical Workspace, Scheduling, Inventory, Billing, and
  Payment Gateway implementation.
- **OUT OF SCOPE** — Clinical-record migration.
- **OUT OF SCOPE** — An inferred generic import engine.
- **OUT OF SCOPE** — Silent tenant claim, merge, duplicate resolution, or record
  transfer without approved product/security/backend contracts.
- **OUT OF SCOPE** — Frontend-owned provisioning, authorization, or duplicate
  truth.
- **OUT OF SCOPE** — TG20 workspace preparation and all later roadmap epics.
- **OUT OF SCOPE** — New APIs, migrations, or architecture inferred by this
  contract.

## Mandatory Principles

- **CONFIRMED — Central Theme:** future presentation must use central assets.
- **CONFIRMED — Localization First:** all approved copy in English and Hindi.
- **CONFIRMED — Accessibility:** path meaning, consequence, input, status, and
  errors must be accessible.
- **CONFIRMED — Clean Architecture:** presentation never calls APIs directly.
- **CONFIRMED — Reuse-before-create:** existing assets audited after meaning is
  approved; duplicate implementations prohibited.
- **CONFIRMED — Multi-clinic:** authorization and effective-tenant isolation are
  mandatory.
- **CONFIRMED — Progressive Experience:** no Demo Mode target or gate bypass.

## Product Approval Gate

- **OPEN DECISION** — Product approval of the meaning and non-goals is the first
  unresolved gate; architecture, backend, security, UX, and implementation
  planning cannot close before it.

Bring Your Clinic Product Contract Status: **VERSION 1 APPROVED**

Bring Your Clinic Technical Contract Status: **NOT READY**
