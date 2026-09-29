# E7 Constitutional Implementation Readiness

**Epic:** E7 — Offline Mutation Recovery
**Roadmap Task Groups:** TG24–TG25
**Review status:** NOT READY — IMPLEMENTATION NOT AUTHORIZED
**Review scope:** Constitutional readiness only; no implementation task or
checkpoint is created by this review.

## 1. Governing Scope

E7 owns tenant-safe recovery of explicitly approved onboarding mutations across
transient network loss. Its governing requirements are Requirements 8, 12, 20,
22–24, 26, 28, 30, and 32, as assigned by the Phase 2 roadmap and RTM.

The existing offline banner and CTA gating are complete foundations, not a
durable recovery contract. Platform Idempotency is reusable backend
infrastructure, not authority for a frontend queue lifecycle. E6 draft conflict
recovery remains independently authoritative for stale step revisions and must
not be bypassed by replay.

## 2. Constitutional Review

| Review question | Decision | Evidence |
|---|---|---|
| Are all E7 requirements constitutionally complete? | **No** | Requirement 8 describes a proposed queue shape and retry behavior, but does not resolve the approved operation set, payload security, replay authority, dead-letter lifecycle, or interaction with E6 conflicts. Shared Requirements 12, 20, 22–24, 26, 28, 30, and 32 remain partial in the RTM. |
| Does design fully specify ownership? | **No** | The design coverage index classifies E7 as incomplete and explicitly leaves queue operations, persistence security, retry/dead-letter ownership, and replay unresolved. |
| Does the RTM fully cover E7? | **Traceability yes; constitutional fulfillment no** | The RTM maps E7 to its requirements and TG24–TG25, records partial status, and lists the missing contract. No implementation evidence is claimed. |
| Does `tasks.md` authorize implementation? | **No** | `tasks.md` states that TG24 and later groups remain unauthorized. |
| Would implementation require inventing product behavior? | **Yes** | Engineering would have to choose which mutations may be queued, what sensitive data may persist, when retries terminate, what the user may do with terminal entries, and how replay responds to an E6 conflict. |
| Are backend/frontend ownership contracts missing? | **Yes** | The authoritative replay coordinator, backend retry/error contract, frontend persistence boundary, and cross-layer transaction/idempotency responsibilities are not constitutionally assigned. |

## 3. Verified Current Reality

- `SetupWizardFlow` and `OfflineBanner` provide connectivity visibility and
  offline CTA gating.
- The frontend has shared error normalization and onboarding-specific typed
  error mappings, but no approved module-wide E7 taxonomy.
- No onboarding `PendingMutationStore`, durable replay coordinator, or
  dead-letter/manual-recovery owner exists.
- Platform Idempotency provides reusable organization/tenant/actor/operation
  replay protection for supported backend commands.
- E6 provides authoritative step revision conflict detection and explicit
  recovery. A queued step mutation cannot assume its captured revision remains
  current.
- Existing backend retry mechanisms for workspace preparation, notifications,
  and event processing have different owners and lifecycles. They do not
  authorize reuse as the E7 client-mutation executor.

## 4. Missing Constitutional Decisions

### 4.1 Queueable operations and boundaries

Approve the exact Version 1 allowlist of onboarding mutation operations.
Explicitly decide whether step submission, completion, readiness actions,
clinic entry, workspace preparation retry, commercial actions, and payment
actions are queueable or prohibited. Arbitrary URLs, generic HTTP requests, and
unknown operations must be forbidden.

Define the stable operation identity, required scope identity, payload contract,
idempotency-key ownership, and prerequisite evidence for each allowed
operation.

### 4.2 Retry and error authority

Approve one central onboarding error taxonomy and one retry-eligibility owner.
Resolve the boundary between Axios transport retry and durable mutation replay
so one failure cannot be retried independently by competing owners.

Define retryable, blocked, conflict, unauthorized, validation, terminal, and
unsupported outcomes; retry limits and backoff authority; and the treatment of
4xx, 409/E6 conflict, 5xx, timeout, offline, cancellation, and malformed
responses. Raw backend text must remain prohibited.

### 4.3 Persistence and sensitive-data security

Approve the durable record schema and a per-operation field allowlist. Define
which onboarding values may be stored locally and which contact, credential,
payment, verification, token, clinical, or other sensitive values are
prohibited.

Define authenticated-user, organization, Effective Tenant, operation, and
schema-version binding; storage protection; size limits; retention/expiry;
migration and corruption behavior; and tenant-switch, logout, account-removal,
and authorization-loss cleanup. Cross-scope replay or transfer must be
forbidden.

### 4.4 Replay lifecycle and concurrency

Approve the queue lifecycle and its single authoritative executor. Define
enqueue eligibility; FIFO scope and ordering; one-at-a-time versus bounded
parallel execution; claim/lock behavior; restart, foreground, and reconnect
triggers; duplicate suppression; cancellation; success removal; and stale
response rejection.

Define how replay obtains fresh Effective Tenant, authorization, Journey
Visibility, and E6 revision evidence immediately before execution. A captured
revision must not silently overwrite newer server state.

### 4.5 Dead-letter and manual recovery

Approve the terminal/dead-letter criteria, retention, user-visible states, and
owned manual actions. Define whether the user may retry, edit, discard, refresh,
or contact support for each outcome and which actions require fresh
authorization or confirmation. Silent deletion and infinite retry must be
forbidden.

### 4.6 Backend/frontend ownership

Define the backend operations that guarantee idempotent replay, typed failures,
authorization ordering, tenant and organization isolation, audit behavior, and
transaction rollback. Define the frontend as a non-authoritative intent queue
that may only invoke those approved operations through existing datasource,
repository, query-key, Effective Tenant, and localization boundaries.

No second backend idempotency service, generic mutation endpoint, alternate
tenant authority, or duplicate frontend API/repository family may be created.

### 4.7 Telemetry, accessibility, localization, and Theme

Approve the Requirement 28 event owner and safe event schema for enqueue,
retry, recovery, expiry, discard, and terminal outcomes. Payload content and raw
errors must never enter telemetry.

Define complete English/Hindi message and placeholder parity, screen-reader/live
region behavior, focus and disabled/loading semantics, minimum touch targets,
font scaling, and central Theme/error/loading primitive reuse for every queue
state and manual action.

### 4.8 Compatibility, rollback, and acceptance

Define additive schema/version compatibility, legacy/unknown record behavior,
feature rollout order, disablement behavior, and rollback without cross-tenant
replay or silent intent loss.

Approve focused unit, persistence, restart, concurrency, idempotency,
authorization, tenant/organization isolation, E6 conflict, localization,
accessibility, offline/device, staging, rollback, and TG18–TG23 regression
evidence. Requirement 32 device and staging evidence remains a release gate.

## 5. Required Documentation Before Authorization

Before implementation authorization, the approved E7 contract must update:

1. `requirements.md` with the missing invariants, ownership, and prohibitions;
2. `design.md` with the authoritative queue/replay lifecycle and backend/frontend
   boundaries;
3. `requirements-traceability-matrix.md` with the approved E7 contract and
   acceptance ownership; and
4. `tasks.md` with a bounded implementation sequence only after the preceding
   constitutional decisions are approved.

The roadmap sequence remains unchanged. This review does not create TG24
implementation tasks and does not authorize TG24 or TG25.

## 6. Readiness Decision

E7 is traceable but not constitutionally complete. Implementation would require
unapproved product, security, persistence, lifecycle, and ownership decisions.

**E7 IMPLEMENTATION NOT AUTHORIZED**
