# E1 Journey Versioning Contract

Version: 1.0

Status: APPROVED FOR TG18 READINESS ASSESSMENT

Owner: Product Architecture

## 1. Decision

Progressive Experience journey versioning is a product/domain identity for the meaning and structure of the onboarding journey. It is independent from Wizard Draft schema versioning, API versioning, app versioning, backend template versioning, and database migration revision.

For E1, the supported journey definition is client-bundled. Product Architecture approves its semantic version. The frontend onboarding domain ships the approved definition and compatibility logic. Backend onboarding continues to provide authoritative visible-step order and validation/completion state; no backend journey-version API is required.

## 2. Journey Version Identity

Canonical identity:

```text
journeyId = progressive-experience
journeyVersion = MAJOR.MINOR.PATCH
```

Initial E1 identity:

```text
progressive-experience@1.0.0
```

Runtime identity:

```text
effectiveTenantId + journeyId + journeyVersion
```

User ID may be audit/authentication context but does not change journey definition or authoritative progress.

The serialized/display form must remain stable and parseable. Components must not compare free-form strings; the domain version parser owns comparison.

## 3. Ownership

| Concern | Owner |
|---|---|
| Journey semantics and version approval | Product Architecture |
| Client-bundled definition registry | Frontend onboarding domain |
| Version parsing/compatibility | Frontend onboarding domain |
| Visible steps and completion state | Backend onboarding domain |
| Draft schema and migration | Existing Wizard Draft store/module |
| Presentation of unsupported version | Frontend presentation through localization/theme/accessibility contracts |

Task Groups cannot increment or reinterpret journey version without approved Roadmap → Requirements → Design changes.

## 4. Version Increment Rules

### MAJOR

Increment MAJOR when an existing client cannot safely interpret the new journey meaning, including:

- changing stage/card identity semantics;
- changing authoritative completion meaning;
- removing or repurposing an existing card ID;
- changing ordering authority away from the accepted contract;
- changing tenant/runtime identity semantics;
- requiring a different domain contract or incompatible navigation behavior.

An unsupported MAJOR must fail closed with a localized safe-unavailable state and no partial cards.

### MINOR

Increment MINOR for backward-compatible additions understood by the same major contract, including:

- adding new optional mapped step/card definitions;
- adding optional localization keys with safe defaults defined by contract;
- adding non-breaking diagnostic metadata;
- adding a new approved existing destination without changing current cards.

Older clients may ignore unknown backend step codes under E1’s safe-unknown behavior. They must not fabricate substitutes.

### PATCH

Increment PATCH for behavior-preserving corrections, including:

- localization copy corrections with unchanged keys/interpolation;
- corrected mapping metadata where card identity and meaning remain unchanged;
- accessibility metadata corrections;
- diagnostic fixes that do not alter eligibility, order, progress, or completion.

## 5. Upgrade Rules

1. Every version change requires Product Architecture approval and a changelog entry in the future accepted definition registry/documentation.
2. The application may support multiple MAJOR definitions only when separately designed and tested; E1 initially supports major `1` only.
3. Upgrading the bundled definition never mutates server completion data.
4. Progress is re-derived from current authoritative status under the new compatible definition.
5. Removed/renamed step mappings require a MAJOR decision unless stable card/step aliases preserve meaning under an approved mapping.
6. Navigation destinations must already exist and remain gate-safe.
7. A version upgrade must include multi-clinic, localization, accessibility, theme, and regression verification.
8. A version upgrade must not migrate or rewrite Wizard Draft payloads merely because the journey version changed.

## 6. Backward Compatibility

### Supported compatibility

- Same MAJOR with equal or lower MINOR/PATCH definitions follows the major-1 contract.
- Unknown backend step codes are ignored for card rendering, recorded as diagnostics, and excluded from known progress.
- Missing validation for a recognized visible step maps conservatively to not complete.
- Existing completed step state remains authoritative after a compatible definition update.

### Unsupported compatibility

- Unknown MAJOR versions are not partially interpreted.
- A card ID cannot silently change meaning within the same MAJOR.
- A step code cannot be mapped to a semantically unrelated card to preserve appearance.
- A client cannot infer missing server completion/readiness/capability state.

### Safe unsupported state

The unsupported state must:

- render no partially interpreted Journey Cards;
- use central theme tokens;
- use `en-US`/`hi-IN` localized copy;
- expose an accessible status/heading and approved recovery guidance;
- emit only a non-blocking typed diagnostic intent through an approved adapter;
- never clear drafts, submit steps, change tenant state, or navigate around gates.

## 7. Relationship to Wizard Draft Schema

Journey version and draft schema version are independent axes:

| Identity | Purpose | Owner | Change trigger |
|---|---|---|---|
| `journeyVersion` | Meaning, structure, mapping, and compatibility of the Progressive Experience journey. | Product Architecture / frontend onboarding domain | Product/domain journey contract changes. |
| `draftSchemaVersion` | Shape, serialization, compression, migration, and hydration of local form drafts. | Existing Wizard Draft store/module | Local persisted draft data-shape changes. |

Prohibited coupling:

- journey version must not replace `wizard_draft_v1` or any draft schema constant;
- a journey version bump must not automatically bump draft schema version;
- a draft schema bump must not automatically bump journey version;
- journey progress/completion must not be derived from draft content;
- draft migration must not infer server completion;
- Journey Cards must not own or duplicate draft persistence.

Conceptual identity when both concerns are needed by future planning:

```text
effectiveTenantId + userId + journeyVersion + draftSchemaVersion
```

This tuple describes independent context dimensions; it does not require one combined storage key or payload in TG18.

## 8. Migration Strategy

### E1 initial adoption

- Introduce `progressive-experience@1.0.0` as bundled definition metadata.
- Do not migrate backend data.
- Do not migrate Wizard Draft data.
- Derive cards/progress from current status each time.
- Existing status without explicit server journey version uses the bundled supported definition; this is an E1 client contract, not a claim that the backend supplied a version.

### Compatible MINOR/PATCH upgrade

- ship the new bundled definition;
- preserve stable card IDs and existing meaning;
- re-derive current projection from authoritative status;
- leave draft storage untouched;
- add/update tests and localization as required.

### Future incompatible MAJOR upgrade

Before implementation:

1. approve roadmap/requirements/design revision;
2. define whether old/new definitions coexist;
3. define server/template compatibility and rollout;
4. define card-ID and navigation migration;
5. verify draft compatibility independently;
6. define rollback and unsupported-client behavior;
7. complete multi-clinic and cross-version E2E tests.

No future migration may be improvised inside a Task Group.

## 9. Multi-Clinic Rules

- Each effective clinic’s journey projection is keyed by its tenant ID and current supported definition.
- Switching tenants discards the previous derived projection before showing new data.
- Clinics may produce different card sets because authoritative `visible_steps` differ; that is not a version conflict.
- Journey version must not be selected from a previously active clinic’s cache.
- No journey state, diagnostic, or card progress may leak across tenants.
- No clinic-type or Ayurveda-specific version branch is permitted.

## 10. Extension Strategy

Future server-delivered journey versions are permitted only after separate approval. Such an extension must define:

- authenticity and authorization of definitions;
- caching and rollback;
- client-supported-version negotiation;
- localization content ownership;
- tenant/template version selection;
- unknown-version safety;
- migration and release strategy.

E1 does not reserve an API payload or create speculative fields for this future.

## 11. Verification Matrix

| Case | Expected result |
|---|---|
| `1.0.0` supported | Normal deterministic mapping. |
| Compatible `1.x.y` definition | Stable existing card semantics; additions handled per contract. |
| Unknown MAJOR | Safe unsupported state; no partial cards. |
| Unknown step under supported version | Omit fabricated card; diagnostic; known journey continues. |
| Journey PATCH update | Draft schema/storage untouched. |
| Draft schema update | Journey version untouched. |
| Tenant switch with different visible steps | Prior projection discarded; new tenant re-derived. |
| App rollback to older supported major-1 client | Unknown steps safely omitted; no server state mutation. |

## 12. Mandatory Principles

- **Central Theme only:** unsupported/version states use approved tokens and icons.
- **Localization first:** version/error/recovery text uses `en-US` and `hi-IN` keys.
- **Accessibility:** unsupported and changed states have semantic, focus, and non-color communication.
- **Clean Architecture:** version parsing/compatibility is domain logic, not component logic.
- **Reuse-before-create:** reuse existing status, repository, localization, theme, and navigation boundaries.
- **Multi-clinic compatibility:** version/projection context always includes effective tenant.
- **Progressive Experience consistency:** versioning cannot reintroduce Demo Mode or bypass Ready-to-Start/commercial ownership.

## 13. Stop Conditions

Stop implementation if:

- code couples journey version to draft schema version;
- a backend API/migration appears necessary without separate approval;
- version selection is presentation-owned;
- unsupported versions would render partial cards;
- card identity meaning is unstable;
- tenant-switch isolation cannot be proven;
- a version change introduces unlocalized, unthemed, or inaccessible UI.
