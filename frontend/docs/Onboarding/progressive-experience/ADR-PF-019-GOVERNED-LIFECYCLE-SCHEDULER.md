# ADR-PF-019: Governed Lifecycle Scheduler and Executor Authority

Status: Accepted

Version: 1.0

Date: 2026-07-29

Owners: Platform Foundation, Platform Operations, and owning lifecycle domains

## Context

E8 requires backend-authoritative, time-driven commercial lifecycle
transitions. TG26.1 proved that the repository has useful execution primitives
but no governed production authority for scheduling lifecycle work.

The outbox worker provides durable event delivery, polling, row locking,
bounded retries, and restart safety, but it processes already-created events
and does not discover time-due domain transitions. The workspace-preparation
executor provides a strong execution-claim pattern, but it is owned by one
onboarding workflow. The in-process async processor, FastAPI lifespan,
repair-on-read sweeps, and legacy billing job service are not durable,
registered production schedulers.

TG26.3 must not promote any of those mechanisms into platform authority by
convention alone. This ADR establishes the minimum additive authority needed
for TG26.3 without authorizing general-purpose scheduling product features.

## Source Reuse Classification

| Candidate | Classification | Evidence and disposition |
| --- | --- | --- |
| `app/infrastructure/events/worker.py` and `worker_startup.py` | Reusable with extension | Reuse its separate-process, polling, graceful-shutdown, `FOR UPDATE SKIP LOCKED`, bounded-retry, and restart-safe patterns. The outbox worker remains event-delivery authority and MUST NOT become commercial lifecycle policy authority. |
| `app/infrastructure/db/models/event_outbox.py` and event handler registry | Not suitable | They dispatch persisted events after a producer action; they do not establish when a domain transition becomes due. Scheduled commercial transitions MUST NOT be fabricated as speculative outbox events. |
| `app/application/onboarding/workspace_preparation_service.py` | Approved for reuse | Reuse its domain-owned executor, execution-claim, optimistic-concurrency, audit, transaction, and typed-failure patterns. The onboarding executor itself remains E3-owned and MUST NOT execute E8 work. |
| Active SQLAlchemy Unit of Work, repositories, organization audit, platform audit, typed errors, and organization idempotency | Approved for reuse | These remain authoritative transaction, persistence, evidence, failure, and command-replay boundaries for scheduled lifecycle execution. |
| `app/core/performance.py` `AsyncProcessor` | Not suitable | `asyncio.create_task` state is process-local, non-durable, not restart-safe, and has no tenancy, audit, idempotency, or lifecycle registration contract. |
| `app/main.py` FastAPI lifespan | Not suitable | API startup owns dependency initialization and health validation, not durable scheduled execution. API process count or restart MUST NOT determine transition correctness. |
| `app/application/billing/billing_job_service.py` | Not governed | This legacy service has in-memory job history, mock or legacy billing behaviors, direct session input, and no production registration or execution authority. It MUST NOT govern E8 or E9. |
| Treatment-order repair-on-read sweeps | Not suitable | These are explicitly request-triggered repair mechanisms, not time-driven or production-scheduled lifecycle authority. |
| E7 replay and retry coordinators | Not suitable | They own user mutation replay and transport recovery, not server-time commercial transitions. |

No existing candidate is approved unchanged as the production lifecycle
scheduler. The approved path is a small Platform Foundation extension that
reuses the proven worker and executor patterns while preserving domain
ownership.

## Decision

Platform Foundation owns one governed **Lifecycle Scheduler** contract and its
production process boundary. Each participating domain owns its registered
**Lifecycle Executor** and all transition policy.

The scheduler owns only:

- obtaining authoritative database UTC time;
- discovering registered work that is due through a domain-provided query;
- bounded batch dispatch;
- concurrency-safe claim coordination;
- retry cadence and worker recovery;
- process startup, health, shutdown, and operational observability; and
- invoking the registered executor without deciding a business transition.

The owning domain executor owns:

- due-work eligibility and lifecycle invariants;
- authorization of the system execution authority;
- loading and transitioning exactly one scoped aggregate;
- optimistic-concurrency and idempotency checks;
- transaction commit or rollback;
- domain history, organization audit, and safe platform-operational audit; and
- typed retryable or terminal outcomes.

The scheduler MUST NOT contain commercial policy, calculate a trial state,
mutate a domain repository directly, infer organization or tenant scope, or
commit a domain transaction.

## Registration Model

Version 1 registration is code-owned and explicit. A registration has:

- a stable job key and immutable contract version;
- one due-work provider;
- one lifecycle executor;
- a bounded batch size and poll cadence from typed backend configuration;
- a claim/lease policy;
- a bounded retry policy; and
- safe operational metadata.

Dynamic customer-created schedules, database-authored job definitions, public
registration APIs, and an administrative scheduling UI are out of scope.
Unknown job keys or versions fail closed.

TG26.3 may register only the E8 commercial-trial lifecycle job. Adding another
domain requires an approved additive registration under this platform
contract; it does not grant that domain E8 authority.

## Tenancy and Security

The scheduler is a platform system actor, not a user, organization member,
Effective Tenant session, Super Admin, or subscription authority. It receives
no blanket cross-tenant mutation permission.

The due-work provider may discover work globally, but every returned item MUST
carry authoritative organization and tenant scope. The executor MUST validate
that scope against the persisted aggregate and process one aggregate in one
Unit of Work. A batch MUST NOT share a domain transaction across organizations
or tenants. Failure or compromise of one item MUST NOT expose or mutate another
scope.

No customer payload, clinical content, contact value, credential, token,
fingerprint, raw exception, or unrestricted metadata may enter scheduler logs
or platform audit.

## Claims, Idempotency, and Execution Guarantees

The Version 1 guarantee is **at-least-once invocation with effectively-once
domain transition**. Exactly-once delivery is not claimed.

- Database locking, a lease, or compare-and-swap MUST prevent concurrent
  workers from authoritatively applying the same transition.
- The execution identity MUST be deterministic from the job contract,
  aggregate identity, due transition, and expected aggregate version or
  equivalent immutable transition identity.
- A repeated invocation after commit MUST observe the completed transition and
  become a safe no-op.
- A failed or rolled-back invocation MUST remain eligible for bounded retry.
- Expired claims may be reclaimed; active claims may not be stolen.
- Authoritative database UTC determines due status. Work may execute late
  after an outage, but MUST NOT execute before it is due.

The platform coordinator may use the existing outbox worker's process and
locking patterns, but MUST have a distinct lifecycle contract and registry.
No API-process `asyncio` task or request path is an acceptable production
substitute.

## Failure, Audit, and Transaction Boundaries

Each item executes independently. Retryable infrastructure failures roll back
the domain transition and are retried within configured bounds. Unsupported
versions, invalid scope, invariant violations, and unsafe ambiguity fail
closed as typed terminal outcomes and require governed operational review.

The domain transition, lifecycle history, and organization-scoped audit MUST
participate in the same caller-owned Unit of Work. Platform-operational audit
records the safe system actor, job/version, outcome, reason classification,
correlation identity, attempt, and timestamp. An audit failure that is required
by the protected operation MUST roll back that operation.

Raw exceptions MUST NOT be persisted or returned as lifecycle reason text.
Repeated failures MUST produce safe operational visibility; they MUST NOT
silently advance commercial state.

## E8 Interaction and TG26.3 Boundary

E8 remains sole owner of commercial-trial and retention policy. The Platform
Foundation scheduler may only ask the E8 provider for due work and invoke the
E8 executor. The executor must preserve immutable trial identity, captured
terms, server-UTC authority, organization/effective-tenant isolation, legal
hold, export-in-progress protection, E5 readiness ownership, and E9
subscription ownership.

This ADR removes the scheduler-authority blocker for TG26.3. TG26.3 is
authorized to implement only:

- the minimum governed scheduler/executor contracts and separate-process
  runtime required by this ADR;
- the single E8 registration, due-work provider, and lifecycle executor
  required by canonical TG26.3;
- typed configuration, dependency composition, audit integration, and focused
  tests required for those boundaries; and
- the other backend application and transport work already authorized by
  canonical TG26.3.

This ADR does not authorize frontend work, E9 behavior, general scheduling
features, public scheduler APIs, customer-authored schedules, or unrelated
background-job migration.

## Rollback

The lifecycle worker and E8 registration can be disabled without deleting E8
records or rewriting elapsed commercial time. When restored, database-UTC
due-work discovery resumes overdue transitions safely. Rollback MUST preserve
trial identity, history, audit evidence, retained access, legal holds,
in-progress export protection, and clinical truth.

## Required TG26.3 Verification

TG26.3 must prove separate-process startup/shutdown, registration fail-closed
behavior, database-UTC due selection, batch bounds, multi-worker claim safety,
late-but-never-early execution, idempotent replay, expired-claim recovery,
retry exhaustion, per-item rollback, audit rollback, organization/tenant
isolation, safe logging, E8 transition invariants, worker disable/restore, and
non-interference with the existing outbox worker and API lifespan.

Governed Lifecycle Scheduler and Executor Authority Status: **APPROVED**
