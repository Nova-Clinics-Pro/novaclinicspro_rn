# ADR-PF-020: Platform Background Runtime Catalog

Status: Accepted

Version: 1.0

Date: 2026-07-29

Owners: Platform Foundation and Platform Operations

## 1. Purpose

Nova Clinics maintains this catalog so that asynchronous, deferred, scheduled,
startup, and request-triggered execution cannot acquire authority merely by
being able to run code outside a normal application-service call.

Every governed background runtime has exactly one runtime owner. Runtime
ownership covers triggering, dispatch, process behavior, recovery, and
operational guarantees. Business ownership remains with the domain that decides
whether an operation is valid, owns its invariants, and records its
authoritative result. A runtime MUST NOT become business authority.

Future epics MUST reuse a catalogued runtime when its trigger and guarantees
fit. A new execution mechanism requires an accepted Platform Foundation ADR
before implementation. Reuse MUST preserve the catalogued owner, tenancy,
persistence, retry, audit, and prohibited-use boundaries.

This catalog distinguishes:

- **Governed production runtime** — accepted for its stated production purpose;
- **Governed scoped coordinator or executor** — accepted only inside its owning
  workflow and trigger boundary;
- **Infrastructure utility** — usable synchronously or in-process, but not a
  durable background authority; and
- **Legacy or non-governed mechanism** — source evidence only and prohibited as
  authority for new work.

The catalog does not assert that a source-defined process is deployed in every
environment. Deployment, health, and operational activation require separate
environment evidence.

## 2. Runtime Inventory

### 2.1 Outbox Worker

- **Catalog status:** Governed production runtime for durable event delivery.
- **Source:** `app/infrastructure/events/worker.py`,
  `app/infrastructure/events/worker_startup.py`, the event handler registry,
  and `event_outbox` persistence.
- **Runtime owner:** Platform Events infrastructure and Platform Operations.
- **Business owner:** The event producer and registered event handler retain
  their domain responsibilities.
- **Responsibility:** Poll already-persisted outbox events and dispatch them to
  registered handlers.
- **Authority:** Delivery only. It does not decide that a business transition
  is due and does not create speculative domain events.
- **Execution trigger:** Separate worker process polling pending outbox rows.
- **Tenancy behavior:** The worker is platform-operated. Tenant and
  organization enforcement belongs to the event contract and handler; opaque
  payloads do not grant cross-tenant authority.
- **Persistence guarantees:** Database-backed pending state, ordered batches,
  row locks with `SKIP LOCKED`, attempt state, and restart-safe discovery.
- **Retry model:** Bounded attempts with persisted exponential-backoff timing.
- **Audit model:** The outbox row is delivery evidence, not a substitute for
  required organization or platform audit. A handler must write its governed
  audit through its own transaction boundary.
- **Allowed reuse:** Durable delivery of an event that an authoritative
  transaction has already emitted, using registered handlers and safe payloads.
- **Prohibited reuse:** Time-based due-work discovery, lifecycle policy,
  customer-created schedules, command orchestration, or using an outbox event
  to bypass a domain transition.

### 2.2 Lifecycle Scheduler

- **Catalog status:** Governed production runtime contract; runtime
  implementation is authorized only through ADR-PF-019 and its approved task
  boundary.
- **Authority:** `ADR-PF-019-GOVERNED-LIFECYCLE-SCHEDULER.md`.
- **Runtime owner:** Platform Foundation and Platform Operations.
- **Business owner:** Each registered lifecycle domain.
- **Responsibility:** Obtain authoritative database UTC, discover due work
  through a registered provider, coordinate bounded dispatch and claims, and
  invoke the registered lifecycle executor.
- **Authority:** Scheduling and execution coordination only.
- **Execution trigger:** Separate production process polling explicit,
  code-owned registrations.
- **Tenancy behavior:** Global discovery is permitted only through the
  registered provider. Each work item carries authoritative organization and
  tenant scope and executes independently in one Unit of Work.
- **Persistence guarantees:** Due state remains domain-owned. Claims,
  optimistic concurrency, or equivalent database coordination must make
  invocation restart-safe and transitions effectively once.
- **Retry model:** At-least-once invocation, bounded retry of typed retryable
  failures, expired-claim recovery, and fail-closed terminal outcomes.
- **Audit model:** Safe platform-operational audit for execution plus the
  domain-required organization audit and lifecycle history in the protected
  transaction.
- **Allowed reuse:** Server-time lifecycle transitions whose due-work provider
  and executor are explicitly registered under ADR-PF-019.
- **Prohibited reuse:** Business-policy calculation, direct repository
  mutation, request retry, event delivery, general cron replacement, dynamic
  customer schedules, or an Effective Tenant user session.

### 2.3 Lifecycle Executors

- **Catalog status:** Governed executor contract. Each concrete executor is
  separately owned and approved by its lifecycle domain.
- **Authority:** ADR-PF-019 plus the participating domain's accepted contract.
- **Runtime owner:** The invoking governed runtime; an executor is not an
  independently self-starting runtime.
- **Business owner:** The registered lifecycle domain.
- **Responsibility:** Validate scope and eligibility, load one aggregate, apply
  one legal transition, persist history and audit, and commit or roll back
  through the active Unit of Work.
- **Authority:** Domain transition execution only.
- **Execution trigger:** Invocation by the Lifecycle Scheduler after a
  registered provider identifies due work.
- **Tenancy behavior:** One authoritative organization/tenant scope and one
  aggregate per transaction.
- **Persistence guarantees:** Domain repository, optimistic concurrency,
  deterministic execution identity, and transactional audit.
- **Retry model:** Return typed retryable, terminal, completed, or no-op
  outcomes; never run an independent retry loop.
- **Audit model:** Domain history and required organization audit are part of
  the protected transaction; safe platform execution audit follows ADR-PF-019.
- **Allowed reuse:** Reuse executor interfaces and claim/transaction patterns;
  create a new concrete executor only for an approved domain registration.
- **Prohibited reuse:** Cross-domain policy, self-scheduling, shared
  cross-tenant transactions, bypassing application authorization, or becoming
  a generic task callback.

### 2.4 E7 Replay Coordinator

- **Catalog status:** Governed scoped client coordinator for E7 offline
  onboarding mutation recovery.
- **Source:** `pending-mutation-replay.coordinator.ts`,
  `usePendingMutationReplayLifecycle.ts`, and E7 safe local persistence.
- **Runtime owner:** Frontend E7 application orchestration.
- **Business owner:** Existing onboarding mutation, E6 revision, backend
  authorization, and Effective Tenant authorities remain unchanged.
- **Responsibility:** Enqueue the single approved operation, preserve its
  idempotency and revision evidence, serialize tenant FIFO replay, refresh
  authority, and coordinate safe recovery.
- **Authority:** Version 1 `onboarding.step.submit.v1` replay only.
- **Execution trigger:** App restart, reconnect, foreground, bounded backoff, or
  explicit manual recovery while the authenticated scoped app is running.
- **Tenancy behavior:** User, organization, and tenant-scoped durable records;
  one active claim per tenant; cancellation and eviction on switch, logout, or
  authorization loss.
- **Persistence guarantees:** Allowlisted local durable record with validation,
  expiry, corruption recovery, deterministic ordering, and no prohibited data.
- **Retry model:** Original attempt plus three bounded replays, with fresh
  authority before execution and transport retry suppression.
- **Audit model:** Safe frontend lifecycle telemetry only. Backend mutation
  audit and idempotency remain authoritative.
- **Allowed reuse:** Only the approved E7 operation family and its existing
  datasource/repository path.
- **Prohibited reuse:** Server jobs, lifecycle scheduling, arbitrary HTTP
  requests, additional operation families without constitutional approval, or
  business-state derivation.

### 2.5 Workspace Preparation Executor

- **Catalog status:** Governed scoped backend executor for E3 Workspace
  Preparation.
- **Source:** `app/application/onboarding/workspace_preparation_service.py`.
- **Runtime owner:** E3 Workspace Preparation application layer.
- **Business owner:** E3 Workspace Preparation domain.
- **Responsibility:** Ensure the aggregate, acquire and renew its execution
  claim, validate ordered evidence, execute approved units, and record the
  authoritative result.
- **Authority:** Workspace Preparation only.
- **Execution trigger:** Existing application/query/retry composition; it has no
  independent clock or worker process.
- **Tenancy behavior:** Trusted organization, tenant, and
  organization-tenant-association context is revalidated against the aggregate.
- **Persistence guarantees:** Database execution claims, optimistic
  concurrency, per-unit evidence, Unit-of-Work commits, and restart/reclaim
  behavior.
- **Retry model:** Governed user retry and expired-claim recovery with typed
  retryable or terminal evidence failures.
- **Audit model:** Workspace lifecycle event plus organization audit through
  the active Unit of Work.
- **Allowed reuse:** Its claim, renewal, domain-executor, evidence, transaction,
  and typed-failure patterns.
- **Prohibited reuse:** Executing another domain, acting as a clock-driven
  scheduler, or importing E3 business rules into a Platform Foundation
  runtime.

### 2.6 FastAPI Lifespan

- **Catalog status:** Governed startup/shutdown hook, not a background runtime.
- **Source:** `app/main.py`.
- **Runtime owner:** Backend API composition.
- **Business owner:** None.
- **Responsibility:** Initialize providers and Redis, verify database health,
  validate the capability graph, and close resources at process shutdown.
- **Authority:** Process lifecycle and fail-loud startup validation only.
- **Execution trigger:** API process startup and shutdown.
- **Tenancy behavior:** No customer or Effective Tenant execution authority.
- **Persistence guarantees:** None for deferred work.
- **Retry model:** Process/environment restart policy only; no durable item
  retry.
- **Audit model:** Structured operational logging, not domain audit.
- **Allowed reuse:** Bounded dependency initialization, health checks, and
  startup invariant validation.
- **Prohibited reuse:** Durable jobs, polling loops, delayed work, domain
  mutation, commercial transitions, or correctness that depends on one API
  process running.

### 2.7 AsyncProcessor

- **Catalog status:** Infrastructure utility, not a governed production
  background runtime.
- **Source:** `app/core/performance.py`.
- **Runtime owner:** Backend performance utility.
- **Business owner:** The synchronous caller.
- **Responsibility:** Apply semaphore-limited in-process concurrency and track
  process-local `asyncio` tasks.
- **Authority:** None beyond the caller's existing authority.
- **Execution trigger:** Direct caller invocation or `asyncio.create_task`.
- **Tenancy behavior:** None; callers must enforce all scope.
- **Persistence guarantees:** None. Active-task state is process-local and is
  lost at restart.
- **Retry model:** None.
- **Audit model:** Logging/metrics only; no governed audit.
- **Allowed reuse:** Non-authoritative bounded computation whose loss does not
  affect correctness or durable customer state.
- **Prohibited reuse:** Production scheduling, durable work, detached domain
  mutation, retries, lifecycle transitions, or work requiring guaranteed
  completion.

### 2.8 Repair-on-read Mechanisms

- **Catalog status:** Governed request-path reconciliation pattern where
  explicitly approved by the owning domain; not a background runtime.
- **Source evidence:** Treatment-order hold sweep in
  `sqlalchemy_treatment_order_repository.py` and its repository contract.
- **Runtime owner:** The owning request/application service.
- **Business owner:** The owning domain.
- **Responsibility:** Reconcile narrowly approved stale derived state while an
  authorized scoped read already occurs.
- **Authority:** Only the exact repair invariant defined by the owning domain.
- **Execution trigger:** Authorized request/read path or explicit governed
  maintenance call.
- **Tenancy behavior:** Required tenant scope in the same repository operation.
- **Persistence guarantees:** Database transaction and row locking of the
  request path.
- **Retry model:** Normal request/transaction retry only.
- **Audit model:** Whatever the owning mutation contract requires; the pattern
  itself provides no audit authority.
- **Allowed reuse:** A small, idempotent, domain-approved reconciliation where
  late execution is acceptable and absence of reads does not violate policy.
- **Prohibited reuse:** Time-bound lifecycle obligations, cross-tenant sweeps,
  hidden business transitions, commercial expiry/retention, or replacing a
  governed scheduler.

### 2.9 Legacy Billing Job Service

- **Catalog status:** Legacy and not governed; prohibited as authority for new
  work.
- **Source:** `app/application/billing/billing_job_service.py`.
- **Runtime owner:** None approved.
- **Business owner:** Legacy billing code only; it has no E8 or E9 authority.
- **Responsibility:** Source describes daily, weekly, monthly, and cleanup job
  methods, but portions retain in-memory history and placeholder behavior.
- **Authority:** None for new commercial, subscription, payment, or retention
  work.
- **Execution trigger:** Direct/manual invocation; no governed production
  registration is present.
- **Tenancy behavior:** Caller-supplied database session; no catalogued
  organization/effective-tenant orchestration.
- **Persistence guarantees:** No durable job identity, claim, or history
  guarantee.
- **Retry model:** No governed coordinator; local error aggregation is not a
  platform retry contract.
- **Audit model:** No approved platform/domain audit contract.
- **Allowed reuse:** Read-only compatibility evidence while replacing or
  isolating legacy behavior through an approved task.
- **Prohibited reuse:** E8 trial lifecycle, E9 billing or subscription
  authority, production scheduling, tenant-wide mutation, or extension into a
  new background runtime.

## 3. Runtime Selection Rules

Use this constitutional decision path:

```text
Is the work required to produce the current request result?
├─ Yes
│  └─ Use the synchronous application service/request transaction.
│     Do not detach correctness-critical work.
└─ No
   ├─ Did an authoritative transaction already emit a durable event?
   │  └─ Use the Outbox Worker and a registered event handler.
   ├─ Is work due because authoritative server/database time crossed a
   │  lifecycle boundary?
   │  └─ Use the Lifecycle Scheduler with the owning domain's registered
   │     Lifecycle Executor.
   ├─ Is this the approved E7 client mutation recovering after connectivity
   │  failure?
   │  └─ Use the E7 Replay Coordinator.
   ├─ Has another governed caller already claimed one domain execution?
   │  └─ Invoke that domain's approved executor; the executor does not
   │     schedule itself.
   ├─ Is this bounded API-process initialization or invariant validation?
   │  └─ Use FastAPI lifespan.
   └─ None fits
      └─ Stop. Obtain a Platform Foundation ADR before creating a runtime.
```

A normal request handler MUST delegate business rules to an application
service. A synchronous application service remains the default when the caller
needs the result, the transaction can complete within the request contract,
and no durable deferred guarantee is required.

`AsyncProcessor` may assist non-authoritative in-process computation.
Repair-on-read may be used only where an accepted domain contract permits
request-triggered reconciliation. Neither appears as a production-runtime
choice in the decision tree.

## 4. Runtime Ownership Matrix

| Mechanism | Catalog class | Runtime owner | Business owner | Durable authority | Permitted trigger |
| --- | --- | --- | --- | --- | --- |
| Outbox Worker | Governed production runtime | Platform Events / Operations | Event producer and handler domain | Event delivery | Persisted outbox event |
| Lifecycle Scheduler | Governed production runtime contract | Platform Foundation / Operations | Registered lifecycle domain | Due-work coordination | Database-UTC due discovery |
| Lifecycle Executor | Governed scoped executor | Invoking governed runtime | Registered lifecycle domain | One legal domain transition | Scheduler invocation |
| E7 Replay Coordinator | Governed scoped client coordinator | Frontend E7 application | Existing onboarding/E6/backend owners | Allowlisted local mutation recovery | Restart, reconnect, foreground, backoff, manual |
| Workspace Preparation Executor | Governed scoped backend executor | E3 application | E3 domain | Claimed Workspace Preparation execution | Existing ensure/retry composition |
| FastAPI Lifespan | Startup/shutdown hook | API composition | None | None | Process startup/shutdown |
| AsyncProcessor | Infrastructure utility | Performance utility | Caller | None | Direct in-process call |
| Repair-on-read | Scoped reconciliation pattern | Request/application owner | Owning domain | Request transaction only | Authorized scoped read |
| Legacy Billing Job Service | Legacy/non-governed | None approved | Legacy code only | None governed | Direct/manual call |

Runtime ownership MUST remain singular. A domain can supply a handler, provider,
or executor without owning the runtime that invokes it. Conversely, a runtime
owner cannot redefine the domain operation.

## 5. Runtime Boundaries

The following boundaries are constitutional:

- The Lifecycle Scheduler MUST NOT become business authority.
- The Outbox Worker MUST NOT become a scheduler or determine that work is due.
- The E7 Replay Coordinator MUST NOT become a server scheduler, generic request
  queue, or additional mutation authority.
- A Lifecycle Executor MUST NOT self-schedule or execute another domain's
  policy.
- The Workspace Preparation Executor MUST remain E3-owned.
- FastAPI lifespan MUST NOT host durable execution, polling loops, or
  correctness-critical detached work.
- `AsyncProcessor` MUST NOT become a production scheduler, durable queue, or
  transaction owner.
- Repair-on-read MUST NOT satisfy time-bound lifecycle obligations.
- The Legacy Billing Job Service MUST NOT be treated as E8 or E9 authority.
- Request processing MUST NOT return success while silently detaching a
  correctness-critical mutation into an ungoverned task.
- No runtime may weaken organization, tenant, user, authorization, audit,
  idempotency, legal-retention, or clinical-truth ownership.

## 6. Future Expansion

A proposed runtime is allowed only when no catalogued mechanism meets its
trigger and guarantee requirements. Its ADR must:

1. identify the unmet execution requirement with source evidence;
2. explain why each existing runtime is unsuitable;
3. assign one runtime owner and separate business owner;
4. define trigger, tenancy, persistence, retry, audit, idempotency,
   concurrency, execution guarantee, deployment, health, and rollback;
5. define allowed and prohibited reuse;
6. identify migration and operational requirements;
7. provide fail-closed registration and versioning rules;
8. define focused tests and production verification; and
9. update this catalog and the applicable design/task governance.

An additional handler, provider, or executor registered under an existing
runtime is not automatically a new runtime. It still requires the owning
domain's approved contract and must fit every catalogued runtime boundary.

Platform Background Runtime Catalog Status: **APPROVED**
