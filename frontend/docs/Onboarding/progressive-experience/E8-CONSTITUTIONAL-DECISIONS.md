# E8 Constitutional Decisions

**Version:** 1.2

**Status:** APPROVED

**Owners:** Product Owner and Solution Architect

**Epic:** E8 — Ready-to-Start Commercial Trial Lifecycle

**Implementation authorization:** TG26 AUTHORIZED

## 1. Purpose

This document is the authoritative Product and Architecture source for E8. It
freezes the constitutional commercial-trial decisions that govern requirements,
design, RTM, tasks, and TG26 implementation.

E8 separates operational readiness from commercial entitlement. Ready to Start
establishes eligibility only. An explicit, authorized Start Trial action begins
the commercial lifecycle. The backend is the sole commercial authority.

TG26 implementation is authorized only within this contract. TG26 MUST NOT
redefine these decisions or begin E9 subscription/payment implementation.

## 2. Commercial Trial Philosophy

The E8 trial MUST be a clinic-scoped commercial entitlement for evaluating Nova
Clinics after the clinic is operationally Ready to Start.

- Ready to Start MUST NOT automatically start the trial.
- A clinic MAY remain `ELIGIBLE` indefinitely.
- The trial MUST begin only through an explicit **Start Trial** action.
- The backend MUST own commercial authority and the commercial clock.
- Commercial state MUST NOT alter authentication, authorization, clinical
  ownership, or clinical truth.
- Trial state MUST NOT be represented as Demo Mode, workspace preparation,
  readiness, subscription, or payment state.
- Trial state MUST remain isolated by organization and effective tenant.

Product owns commercial policy. The backend enforces that policy. The frontend
presents backend-authoritative state and actions.

## 3. Trial and Commercial Retention Lifecycles

The authoritative **Trial Lifecycle** is:

```text
ELIGIBLE
    ↓
ACTIVE
    ↓
EXPIRING (derived)
    ↓
EXPIRED
```

The Trial Lifecycle ends at `EXPIRED`. After expiry, the organization enters
the separate **Commercial Retention Lifecycle**:

```text
SUSPENDED
    ↓
ARCHIVED
    ↓
DELETED
```

`ELIGIBLE` means authoritative Ready-to-Start evidence exists and the clinic
has not activated its immutable trial identity. `ACTIVE` means the explicit
activation succeeded and the commercial clock is running. `EXPIRING` is a
derived view of the same active trial near its authoritative end. `EXPIRED`
means its authoritative end timestamp has passed and the Trial Lifecycle has
ended. `SUSPENDED`, `ARCHIVED`, and `DELETED` belong to the backend-owned
Commercial Retention Lifecycle that begins after expiry.

This conceptual separation keeps E8 trial authority distinct from future E9
subscription authority. It does not alter any approved transition, access,
retention, recovery, or deletion behavior.

The following invariants are mandatory:

- Each clinic MUST have exactly one immutable trial identity once E8 eligibility
  is established.
- Activation and extension MUST NOT create a second trial.
- Server UTC MUST own all commercial timestamps and state derivation.
- The frontend MUST NOT calculate authoritative commercial state or expiry.
- Extension is an administrative action that returns the same trial to
  `ACTIVE`; only the authoritative end timestamp changes.
- Trial identity, activation evidence, original terms, extensions, transitions,
  and retention evidence MUST remain auditable.
- Unknown states or unsupported versions MUST fail closed.
- Organization or tenant switching MUST NOT transfer, merge, or leak trial
  state.
- Commercial transitions MUST NOT rewrite clinical truth.

## 4. Administrative Hierarchy and Trial Activation

### Administrative hierarchy

**Super Admin** is Nova Clinics platform authority. Super Admin owns commercial
override, trial-extension approval, migration, support, and customer-success
authority.

**Organization Admin** is customer commercial authority. Organization Admin may
start a trial, request an extension, make organization commercial decisions,
and initiate subscription.

**Clinic Admin** is an operational clinic administrator. Clinic Admin has no
commercial authority and MUST NOT activate a trial, approve an extension, or
override commercial state.

### Activation contract

- Activation MUST require the `trial.activate` permission.
- `trial.activate` MUST be granted by default to Organization Admin and Super
  Admin.
- The target clinic MUST have current authoritative Ready-to-Start evidence.
- The trial MUST be `ELIGIBLE`.
- The actor MUST explicitly confirm Start Trial.
- The backend MUST validate readiness, authorization, organization scope, and
  effective-tenant scope.
- The backend MUST record immutable activation evidence.
- Activation MUST be idempotent and concurrency-safe.
- Concurrent valid activation attempts MUST converge on one activation.
- Conflicting reuse of an idempotency identity MUST fail with a typed conflict.
- Activation MUST start only the commercial clock. It MUST NOT mutate
  readiness, authorization, clinical ownership, or subscription/payment truth.

## 5. Trial Duration

- The default trial duration MUST be 30 consecutive days.
- Duration MUST be configuration-driven and backend-authoritative.
- The configured duration MUST be captured when activation succeeds.
- Configuration changes MUST affect future activations only.
- Existing active trials MUST retain their agreed duration.
- Device clock, locale, timezone, offline time, app restart, or tenant switching
  MUST NOT change the authoritative start or end timestamp.
- `EXPIRING` MUST be derived from backend-authoritative policy and timestamps;
  the client MAY format the returned state and duration but MUST NOT define the
  threshold.

Legacy seven-day pre-readiness trial behavior MUST NOT govern new E8
activations. New 30-day policy applies only to newly activated E8 trials.

## 6. Extension Policy

- An individual extension MUST NOT exceed 30 consecutive days.
- Super Admin is the sole extension approval authority.
- Organization Admin MAY request an extension but MUST NOT approve it.
- Super Admin MAY grant an extension directly following an offline support,
  sales, or customer-success interaction.
- There is no constitutional limit on the number of Super Admin-approved
  extensions.
- Every extension MUST be manually approved.
- Every extension MUST record a mandatory business reason, approval channel,
  approver, decision timestamp, and immutable audit evidence.
- Extension MUST preserve the trial identity and original activation evidence.
- Only the authoritative end timestamp changes.
- Extension MUST return the same retained trial to `ACTIVE`.
- Extension MUST be idempotent and concurrency-safe.
- Extension MUST NOT imply payment, subscription conversion, new readiness, or
  a second trial.

## 7. Expiry, Retention, and Recovery

After the authoritative trial end, the lifecycle MUST progress through
`EXPIRED` to `SUSPENDED`.

Default retention policy is configuration-driven:

- `SUSPENDED`: 90 days;
- `ARCHIVED`: 90 days;
- final deletion notice: 7 days.

Configuration changes MUST govern future retention transitions and MUST NOT
silently rewrite already captured customer terms unless an approved migration
contract explicitly permits it.

### SUSPENDED

During `SUSPENDED`, Organization Admin MAY:

- log in;
- view backend-authoritative commercial status and retention timing;
- view restoration, extension, deletion, and export-request eligibility;
- request subscription; and
- request an extension.

Normal application mutations MUST be prohibited. Commercial access MUST NOT
grant clinical or operational mutation authority.

### ARCHIVED

During `ARCHIVED`, Organization Admin MAY:

- view the backend-authoritative archived workspace status;
- view the archived date and retention/deletion timeline;
- view restoration, extension, deletion, and export-request eligibility;
- view legal/statutory hold awareness where applicable; and
- use only the backend-authorized commercial actions presented for that
  workspace.

Normal application usage MUST be prohibited.

`ARCHIVED` means a commercial workspace that is no longer operational while
its data remains retained according to policy. It is not a filesystem,
document repository, object-storage catalog, retained-artifact domain, export
library, or archive-file collection.

### Final deletion notice and DELETED

If the future Workspace Data Export capability has an approved download
available during final notice, that capability owns its continued availability.
Commercial deletion MUST wait when the governed export-protection evidence says
an approved export is already in progress, until that work completes or reaches
its governed timeout. Commercial Retention does not own the export lifecycle.

After `DELETED`, operational customer data MUST be unavailable and
unrecoverable, subject only to legal-retention obligations outside the
operational platform. E8 defines the commercial lifecycle obligation but does
not own legal-retention policy or secure-deletion infrastructure.

### Commercial recovery

Super Admin MAY restore a retained trial from `SUSPENDED` or `ARCHIVED` through
an approved extension. The same trial identity MUST return to `ACTIVE`. Paid
subscription initiation and conversion belong to E9.

```text
SUSPENDED
      │
      ├── Extension ─────► ACTIVE
      │
      └── Subscription ─► E9

ARCHIVED
      │
      ├── Extension ─────► ACTIVE
      │
      └── Subscription ─► E9
```

Extension restores the same immutable trial; it MUST NOT create a second trial.
Subscription hands commercial authority to E9.

### Legal hold and statutory preservation

Commercial deletion MUST NOT bypass legal hold, regulatory preservation, or
mandatory statutory retention. Commercial policy cannot override legal
obligations. Ownership and execution of those obligations remain outside E8.

### Commercial Retention and Workspace Data Export

Commercial Retention owns the commercial lifecycle, archive status, retention
countdown, restoration eligibility, permanent-deletion eligibility,
legal/statutory hold awareness, extension eligibility, and whether a Workspace
Data Export request is permitted.

Workspace Data Export is a separate future bounded capability. It owns export
requests, content scope, generation, package lifecycle, metadata, retrieval,
download, expiry, audit, and storage integration. Export is a user-requested
business action, not a workspace, archive, retention, or runtime state.
Commercial Retention MUST NOT derive export status or represent export
packages.

TG26.5 may present a governed `Request Workspace Data Export` handoff when the
backend-authoritative Commercial Retention read model permits it. That handoff
does not assert that the future capability, request, package, or download
exists. Runtime owns execution, retries, and scheduling; infrastructure owns
storage providers, streaming, object storage, and file transport. Presentation
consumes only backend-authoritative read models.

## 8. Backend Constitutional Ownership

The backend MUST own:

- lifecycle and transition policy;
- commercial configuration and server-UTC clock;
- authorization, organization isolation, and effective-tenant isolation;
- immutable activation, extension, transition, and retention audit evidence;
- persistence and lifecycle history;
- scheduled expiry, suspension, archival, final-notice, and deletion
  transitions;
- typed, versioned APIs and failures;
- transaction, concurrency, idempotency, and retry safety; and
- compatibility classification, migration execution, rollout, and rollback.

State-changing commands and mandatory audit evidence MUST succeed or roll back
atomically. Scheduled transitions MUST be deterministic, replay-safe, and
idempotent. Unknown state or version MUST fail closed. Rollback MUST disable new
commands without deleting lifecycle history, reversing elapsed commercial time,
or corrupting retention evidence.

The backend MUST NOT expose raw internal exceptions, clinical content, contact
values, credentials, tokens, or payment data through commercial APIs or audit.
The frontend is never commercial authority.

## 9. Frontend Constitutional Ownership

The frontend owns presentation, orchestration, navigation, and user interaction
through existing Clean Architecture boundaries.

The frontend MUST reuse, where contract fit is verified:

- existing repositories and datasource boundaries;
- React Query and tenant-scoped canonical query keys;
- central Theme and existing design tokens;
- `en-US` and `hi-IN` localization;
- accessibility primitives; and
- existing status, loading, error, confirmation, download, and navigation
  patterns.

The frontend MUST:

- present backend-authoritative commercial and retention states;
- present only backend-authorized actions;
- present Workspace Data Export only as a future governed request handoff when
  backend authority permits it;
- isolate or invalidate trial state on tenant switch, logout, authorization
  loss, and relevant successful commands;
- prevent stale responses from overwriting newer authority;
- show safe loading, unavailable, error, and disabled states;
- preserve screen-reader semantics, focus, announcements, touch targets, and
  font scaling;
- maintain `en-US`/`hi-IN` key and placeholder parity; and
- use central Theme without hardcoded or duplicate visual tokens.

The frontend MUST NOT calculate commercial policy, authoritative expiry,
entitlement, retention, or commercial authority. Offline or stale client state
MUST NOT advance the lifecycle.

## 10. Compatibility

- Existing paid organizations MUST remain paid.
- Existing seven-day trials MUST retain their original terms.
- Existing trials MUST NOT restart automatically.
- Existing trials MUST NOT convert automatically to 30 days.
- Demo state MUST NOT convert automatically into an E8 trial.
- New 30-day policy MUST apply only to newly activated E8 trials.
- Ambiguous legacy organizations MUST require governed review.
- Migration MUST NOT silently shorten, lengthen, restart, merge, or convert an
  existing commercial lifecycle.
- Existing organizations without an active trial MUST NOT receive one merely
  because they are provisioned, become ready, sign in, deploy new code, or
  undergo migration.
- Rollout MUST classify legacy cohorts before enabling new E8 activation.
- Rollback MUST preserve existing terms, trial identities, lifecycle history,
  retention evidence, and already elapsed commercial time.

## 11. Explicit Out of Scope

E8 does not own:

- subscription implementation;
- payment, invoicing, or dunning;
- clinical workflows or clinical ownership;
- legal-retention policy;
- secure-deletion infrastructure;
- export file format;
- export requests, export packages, package lifecycle, retrieval, download,
  expiry, audit, or storage integration;
- recurring trials;
- pause/resume;
- trial transfer between clinics;
- new platform infrastructure; or
- E9 subscription/payment lifecycle implementation.

Commercial state MUST NOT rewrite clinical truth.

## 12. Approved Constitutional Requirements

Product and Architecture approve and freeze:

- [x] the clinic-scoped commercial entitlement model;
- [x] indefinite `ELIGIBLE` state and explicit Start Trial activation;
- [x] the Trial Lifecycle through `EXPIRED`, with derived `EXPIRING`, and the
  separate Commercial Retention Lifecycle through `DELETED`;
- [x] immutable trial identity and server-UTC commercial clock;
- [x] Super Admin, Organization Admin, and Clinic Admin commercial hierarchy;
- [x] `trial.activate`, Ready-to-Start validation, explicit confirmation,
  immutable evidence, idempotency, and concurrency safety;
- [x] configuration-driven 30-day default duration for future activations;
- [x] Super Admin-only manual extensions of up to 30 days, with no
  constitutional count limit and mandatory reason/channel/audit;
- [x] configuration-driven 90-day suspension, 90-day archive, and seven-day
  final-notice defaults;
- [x] Commercial Retention ownership of archived-workspace status, retention,
  recovery/deletion/extension eligibility, and hold awareness;
- [x] separate future Workspace Data Export ownership and request-handoff
  boundary;
- [x] export-in-progress protection before deletion;
- [x] legal-hold, regulatory-preservation, and mandatory-statutory-retention
  precedence over commercial deletion;
- [x] E9 ownership of paid subscription handoff;
- [x] backend lifecycle, policy, persistence, scheduling, authorization, audit,
  transaction, concurrency, retry, rollback, and versioning ownership;
- [x] frontend presentation, orchestration, navigation, reuse, cache,
  accessibility, localization, and Theme ownership;
- [x] legacy compatibility, governed review, rollout, and rollback principles;
  and
- [x] the explicit E8 non-goals.

E8 constitutional review is complete. TG26 implementation is authorized within
this contract. TG27 remains unauthorized.
