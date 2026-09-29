# E2 Operational Contract

Date: 2026-07-20

Status: Version 1 engineering contract

Scope: E2 — Clinic Entry and Bring Your Clinic

## Contract Rules

- **CONFIRMED** — Workspace/Tenant owns clinic creation, association, tenant
  selection, duplicate truth, and persisted tenant identity. Authentication owns
  identity and session refresh. Frontend owns accessible presentation,
  orchestration, and navigation only.
- **CONFIRMED** — Version 1 is additive. Stable path, normalization, error, and
  result identifiers cannot be reinterpreted by later implementations.
- **CONFIRMED** — Central Theme, localization-first (`en-US` and `hi-IN`),
  accessibility, Clean Architecture, reuse-before-create, tenant isolation,
  specialty extensibility, and Progressive Experience consistency are mandatory.
- **OUT OF SCOPE** — Import, migration, merge, unverified claiming, external
  system integration, clinical data, payments, scheduling, inventory, and TG20
  workspace implementation.

## Shared Version 1 Types

### Clinic identity input

`ClinicIdentityInputV1` contains the approved required fields: `clinicName`,
`clinicAddress`, `primaryContactNumber`, one verified `email` or `mobile`, and
`clinicTypeSpecialty`. It may contain the approved optional fields `gst`, `pan`,
`logo`, `website`, and `secondaryContact`. Unknown optional fields are ignored;
unknown required fields require a new contract version.

### Authoritative operation result

Every successful create, associate, or replay returns the same
`ClinicEntryResultV1`: `operationId`, `operation` (`create` or `associate`),
`replayed`, `tenantId`, `clinicDisplayName`, `associationState`,
`effectiveTenantId`, `sessionRefreshRequired`, `nextHandoff`, and
`contractVersion`. `nextHandoff` is `workspace_preparation`; it does not assert
that TG20 work is complete.

The frontend must not derive tenant identity from submitted fields, route state,
cached applications, or ownership evidence.

## New Clinic

1. **CONFIRMED — Authorized actor.** The caller must be authenticated and must
   pass a server-side organization-scoped create-clinic authorization check.
   Current `is_org_admin` is a platform-admin bypass and is not sufficient
   evidence of organization membership. The concrete organization role mapping
   remains the blocker stated in the Readiness Determination.
2. **CONFIRMED — Input.** The request carries `ClinicIdentityInputV1`, an
   explicit organization context, `Idempotency-Key`, and contract version. Client
   organization or actor identifiers are hints only; the server resolves them
   from authenticated authority.
3. **CONFIRMED — Duplicate scope.** The backend compares
   `clinic_identity_v1` only inside the authorized organization. A match returns
   `duplicate` and the safe recovery action; it never reveals another
   organization's clinic.
4. **CONFIRMED — Idempotency.** Scope is organization + authenticated actor +
   `clinic_entry.create.v1` + key. Same key and same normalized payload replays
   the original result. Same key with a different payload is `conflict`.
   Concurrent in-progress replay is retryable and creates no second tenant.
5. **CONFIRMED — Creation.** The Workspace/Tenant application service performs
   one atomic create-and-associate operation, reusing provisioning for tenant,
   owner membership, RBAC seed, and audit behavior. Partial internal success is
   never presented as a second create opportunity.
6. **CONFIRMED — Selection.** One authorized clinic becomes effective
   automatically. If refreshed authority exposes multiple clinics, the response
   does not silently choose; explicit selection is required.
7. **CONFIRMED — Session.** After success or replay, the frontend invokes the
   existing auth refresh boundary, reloads authoritative clinics, validates that
   `effectiveTenantId` is authorized, then clears/isolate stale tenant queries
   and drafts. Refresh failure preserves the server result and offers session
   refresh retry; it never reissues create.
8. **CONFIRMED — Handoff.** Only after the effective tenant is validated may
   navigation proceed to workspace preparation.

## Bring Your Clinic

1. **CONFIRMED — Eligibility.** The clinic is an existing Nova-managed clinic.
   The caller is an authenticated Organization Owner or authorized Organization
   Admin. Clinic Administrator is not authorized for Version 1 association.
2. **CONFIRMED — Evidence.** The server accepts only an opaque, server-issued
   `ownershipVerificationId`. The authoritative verification record must bind
   target tenant, actor, destination organization, verification method/version,
   successful outcome, issuance/expiry, and unused-or-replayable state. Raw
   evidence, secrets, and verification artifacts never enter the operation DTO,
   local drafts, logs, analytics, or user-visible errors.
3. **CONFIRMED — Authorization.** Workspace/Tenant validates the evidence and
   organization role at execution time. The frontend cannot discover arbitrary
   tenants or prove association through a tenant ID, clinic name, route, or
   cached membership.
4. **CONFIRMED — Already associated.** Association to the same organization is
   an idempotent success with the existing authoritative result. Association to
   another organization is a non-disclosing `conflict`; no merge or transfer is
   attempted.
5. **CONFIRMED — Idempotency.** Scope is destination organization + actor +
   `clinic_entry.associate.v1` + key. Same key/equivalent request replays. A
   different payload conflicts. Retry never duplicates membership or audit
   effects.
6. **CONFIRMED — Recovery.** Expired/invalid evidence is terminal for that
   verification and requires a fresh verification. Transport or transient
   persistence failure is retryable with the same idempotency key. Unauthorized
   and cross-organization conflicts disclose no clinic existence or ownership.
7. **CONFIRMED — Handoff.** Successful association follows the same refreshed
   clinic list, single-versus-multiple selection, effective-tenant validation,
   stale-state cleanup, and workspace-preparation handoff as New Clinic.
- **NEW_CONTRACT_REQUIRED** — No repository mechanism currently issues or
  validates `ownershipVerificationId`; Product/Security must approve a bounded
  verification method before implementation can be READY.

## Deterministic Normalization Version 1

The server owns normalization. The frontend may mirror it only for helpful
validation, never duplicate truth.

1. Apply Unicode NFKC, trim leading/trailing whitespace, and collapse internal
   whitespace to one ASCII space to all text.
2. `clinicName`: Unicode case-fold the normalized value.
3. Address: normalize stable components separately (`line1`, `line2`, `city`,
   `state`, `postalCode`, `countryCode`); case-fold text, uppercase ISO country
   code, and remove spaces/hyphens from postal code. Do not geocode or reorder
   components.
4. Telephone values: retain a leading `+` and digits only. Convert to E.164 only
   when an explicit country code makes conversion deterministic; never infer a
   country from locale.
5. Email: NFKC/trim, then Unicode case-fold the complete address for Version 1.
6. `clinicTypeSpecialty`: use the stable canonical key, never localized display
   text.
7. Identity material is canonical JSON in stable field order containing name,
   address components, primary contact, verified contact kind/value, and clinic
   type/specialty. Hash it with SHA-256 as `clinic_identity_v1`.
8. GST, PAN, logo, website, and secondary contact are excluded from Version 1
   duplicate matching. Future matchers are named additive strategies and cannot
   change `clinic_identity_v1` results.

## Local Draft Allowlist and Cleanup

Only these value fields may be locally drafted: clinic name; business address
components; primary business contact number; email or mobile value (without
verification state/evidence); clinic type/specialty stable key; website; logo
reference metadata (not image bytes); and secondary business contact display
value.

The following must never be locally persisted: PAN; GST; logo binary/base64;
ownership evidence or `ownershipVerificationId`; verification codes, tokens,
method results, or verified-state assertions; passwords, access/refresh tokens,
cookies, authorization headers; idempotency records or authoritative operation
results; audit payloads; raw backend errors; arbitrary tenant search results; or
clinical/payment data.

Drafts are scoped to authenticated user plus entry-path context and, once known,
tenant. They expire under the existing wizard-draft policy and are synchronously
cleared on logout, tenant switch, successful submission, and abandonment. The
auth cleanup must remove pre-tenant drafts as well as tenant-scoped drafts.

## Typed Error Contract

The transport uses stable `error_code`, localized-message token, optional safe
field key, retryability, and correlation ID. Raw backend text is diagnostic only
and is never displayed.

| Category | Stable Version 1 codes | Recovery |
|---|---|---|
| validation | `clinic_entry.validation`, `clinic_entry.field_invalid` | Correct the identified field; focus first invalid control. |
| duplicate | `clinic_entry.duplicate` | Use safe existing-association/selection action; disclose only authorized data. |
| unauthorized | `clinic_entry.unauthorized` | Stop; sign in/re-authorize without existence disclosure. |
| already associated | `clinic_entry.already_associated` | Treat same-organization result as idempotent success. |
| conflict | `clinic_entry.idempotency_conflict`, `clinic_entry.association_conflict` | Stop or restart with a new key after user-visible explanation. |
| retryable failure | `clinic_entry.in_progress`, `clinic_entry.transient_failure`, `clinic_entry.session_refresh_failed` | Retry the failed phase; never repeat a completed mutation. |
| terminal failure | `clinic_entry.verification_invalid`, `clinic_entry.verification_expired`, `clinic_entry.unsupported` | Restart verification or exit the path. |

Errors use existing central error presentation, locale resources, focus/live
region behavior, and logging redaction. TG19 does not create the TG24 error
platform.

## Readiness Determination

The operational flow is specified, but repository evidence exposes two missing
prerequisites that this document cannot invent:

1. **OPEN DECISION** — There is no organization aggregate/membership boundary
   distinct from the global platform `is_org_admin` flag. Product Architecture
   and Backend must identify the authoritative organization identity and map
   Organization Owner/authorized Organization Admin to it.
2. **OPEN DECISION** — There is no approved ownership-verification issuer or
   validator for existing Nova clinics. Product/Security must approve the
   Version 1 verification method and accountable owner.

Until both are approved, implementation must stop before TG19.

## ADR-PF-008 Verified Contact Operational Addendum

This is the controlling contact contract. New Clinic accepts email-only,
mobile-only, or dual verified clinic contact. Authentication proves the actor;
it does not prove that the actor's contact belongs to the clinic.

`ClinicIdentityInputV1` retains `verified_contact` as the explicitly primary
verified method, adds an optional distinct-kind `additional_verified_contact`,
and makes `primary_contact_number` optional. One verified method is required. If
mobile is present, its normalized value must agree with any supplied primary
contact number. Duplicate kinds, neither method, or unverified evidence are
typed validation/verification failures.

Provisioning stores email only when the verified clinic email was supplied and
stores the normalized verified mobile first in existing `phones`. It persists
the ADR-PF-008 contract version, primary kind, and safe per-method provenance.
It never copies actor/organization email and never generates a placeholder.

The verified-contact migration/model/DTO/validation checkpoint must complete
before backend Clinic Entry transport resumes.

## ADR-PF-009 Contact Evidence Addendum — Controlling

ADR-PF-009 closes the evidence-model decision without authorizing code. Clients
submit opaque, server-issued evidence references for each declared clinic email
or mobile. They cannot submit trusted verification timestamps, methods, or
outcomes. The Platform Clinic Contact Verification service validates exact
organization, actor, `clinic_entry.create.v1` operation, contact kind,
normalized-value fingerprint, policy, status, and expiry.

Email and mobile require independent evidence. The server-resolved validation
result supplies the safe timestamp and method/version persisted under
ADR-PF-008. Clinic Entry consumes all required evidence atomically with tenant
creation, organization association, idempotency completion, and audit. Rollback
leaves evidence verified and usable; completed operation replay does not consume
again.

The contract uses a separate `org_contact_verifications` lifecycle because
ownership verification proves authority over an existing tenant while contact
verification proves control of a contact before a tenant exists. TG19 Backend
Clinic Entry Transport remains blocked until the bounded ADR-PF-009
implementation is complete and verified.
