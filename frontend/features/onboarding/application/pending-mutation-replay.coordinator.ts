import {
  MAX_MUTATION_EXECUTIONS,
  ONBOARDING_STEP_SUBMIT_OPERATION,
  REPLAY_BACKOFF_MS,
  createPendingMutationRecord,
  expirePendingMutation,
  parsePendingMutationRecord,
  transitionPendingMutation,
  type PendingMutationFailureCategory,
  type PendingMutationExecutionResult,
  type PendingMutationRecord,
  type PendingMutationScope,
} from '../domain/entities/pending-mutation.entity';
import {
  clearPendingMutationsForScope,
  clearPendingMutationsForUser,
  loadPendingMutations,
  persistPendingMutations,
  type PendingMutationLoadResult,
} from '../data/persistence/pending-mutation.storage';
import { usePendingMutationsStore } from '../presentation/stores/pending-mutations.store';
import {
  noOpPendingMutationTelemetry,
  type PendingMutationTelemetry,
  type PendingMutationTelemetryEventName,
} from './pending-mutation.telemetry';

export type ReplayTrigger =
  | 'RESTART'
  | 'RECONNECT'
  | 'FOREGROUND'
  | 'BACKOFF'
  | 'MANUAL';

export type ReplayAuthorityResult =
  | {
    readonly status: 'READY';
    readonly scope: PendingMutationScope;
    readonly stepCode: PendingMutationRecord['stepCode'];
    readonly expectedRevision: string;
    readonly templateVersion: string;
    readonly capabilityRevision: string;
  }
  | { readonly status: 'AUTHORIZATION_LOST' }
  | { readonly status: 'SCOPE_CHANGED' }
  | { readonly status: 'STEP_UNAVAILABLE' }
  | { readonly status: 'E6_CONFLICT' };

export type ReplayExecutionResult = PendingMutationExecutionResult;

export interface PendingMutationReplayPorts {
  readonly refreshAuthority: (
    record: PendingMutationRecord,
    signal: AbortSignal
  ) => Promise<ReplayAuthorityResult>;
  readonly execute: (
    record: PendingMutationRecord,
    signal: AbortSignal
  ) => Promise<ReplayExecutionResult>;
  readonly now?: () => number;
  readonly schedule?: (
    callback: () => void,
    delayMs: number
  ) => ReturnType<typeof setTimeout>;
  readonly cancelScheduled?: (handle: ReturnType<typeof setTimeout>) => void;
  readonly telemetry?: PendingMutationTelemetry;
}

export interface EnqueuePendingMutationInput {
  readonly mutationId: string;
  readonly scope: PendingMutationScope;
  readonly stepCode: PendingMutationRecord['stepCode'];
  readonly body: unknown;
  readonly expectedRevision: string;
  readonly templateVersion: string;
  readonly capabilityRevision: string;
  readonly idempotencyKey: string;
  readonly originalFailure: 'NETWORK' | 'TIMEOUT' | 'RETRYABLE_SERVER';
  readonly connectivityAtAttempt: 'ONLINE' | 'INDETERMINATE';
}

export type EnqueuePendingMutationResult =
  | { readonly status: 'ENQUEUED'; readonly record: PendingMutationRecord }
  | { readonly status: 'DUPLICATE'; readonly record: PendingMutationRecord };

export class PendingMutationReplayError extends Error {
  constructor(
    readonly kind:
      | 'SCOPE_NOT_LOADED'
      | 'AUTHORITY_UNAVAILABLE'
      | 'AUTHORITY_MISMATCH'
      | 'RECOVERY_REQUIRED'
  ) {
    super(`pending_mutation.replay.${kind.toLowerCase()}`);
    this.name = 'PendingMutationReplayError';
  }
}

interface ActiveClaim {
  readonly scope: PendingMutationScope;
  readonly beforeClaim: PendingMutationRecord;
  readonly controller: AbortController;
}

const tenantLocks = new Map<string, Promise<void>>();

const scopeMatches = (
  left: PendingMutationScope,
  right: PendingMutationScope
): boolean =>
  left.userId === right.userId &&
  left.organizationId === right.organizationId &&
  left.tenantId === right.tenantId;

const evidenceMatches = (
  authority: Extract<ReplayAuthorityResult, { status: 'READY' }>,
  record: PendingMutationRecord
): boolean =>
  authority.stepCode === record.stepCode &&
  authority.expectedRevision === record.revisionEvidence.revision.value &&
  authority.templateVersion ===
    record.revisionEvidence.projectionIdentity.templateVersion &&
  authority.capabilityRevision ===
    record.revisionEvidence.projectionIdentity.capabilityRevision;

const fifo = (
  left: PendingMutationRecord,
  right: PendingMutationRecord
): number =>
  left.enqueuedAt - right.enqueuedAt ||
  left.mutationId.localeCompare(right.mutationId);

const isActive = (record: PendingMutationRecord): boolean =>
  record.state === 'PENDING' || record.state === 'REPLAYING';

const initialBackoffAt = (now: number): number => now + REPLAY_BACKOFF_MS[0];

export class PendingMutationReplayCoordinator {
  private readonly now: () => number;
  private readonly schedule: NonNullable<PendingMutationReplayPorts['schedule']>;
  private readonly cancelScheduled:
    NonNullable<PendingMutationReplayPorts['cancelScheduled']>;
  private scope: PendingMutationScope | null = null;
  private online = false;
  private generation = 0;
  private activeClaim: ActiveClaim | null = null;
  private scheduled: ReturnType<typeof setTimeout> | null = null;
  private readonly telemetry: PendingMutationTelemetry;

  constructor(private readonly ports: PendingMutationReplayPorts) {
    this.now = ports.now ?? Date.now;
    this.schedule = ports.schedule ?? setTimeout;
    this.cancelScheduled = ports.cancelScheduled ?? clearTimeout;
    this.telemetry = ports.telemetry ?? noOpPendingMutationTelemetry;
  }

  setConnectivity(online: boolean): void {
    this.online = online;
  }

  async initialize(
    scope: PendingMutationScope
  ): Promise<PendingMutationLoadResult> {
    const generation = this.generation + 1;
    this.generation = generation;
    this.scope = Object.freeze({ ...scope });
    this.cancelTimer();
    const loaded = await loadPendingMutations(scope);
    if (
      generation !== this.generation ||
      !this.scope ||
      !scopeMatches(this.scope, scope)
    ) {
      return { status: 'EMPTY', records: [] };
    }
    if (loaded.status === 'RECOVERY_REQUIRED') {
      usePendingMutationsStore.getState().replaceScope(scope, []);
      usePendingMutationsStore.getState().setRecoveryRequired(true);
      return loaded;
    }

    const now = this.now();
    const records = loaded.records
      .map((record) => {
        const expired = expirePendingMutation(record, now);
        if (expired.state !== 'REPLAYING') return expired;
        return transitionPendingMutation(expired, {
          state: 'PENDING',
          now,
          attemptCount: expired.attemptCount,
          nextAttemptAt: now,
          failureCategory: 'NETWORK',
        });
      })
      .sort(fifo);
    if (
      records.some((record, index) => record !== loaded.records[index])
    ) {
      await persistPendingMutations(scope, records);
    }
    usePendingMutationsStore.getState().replaceScope(scope, records);
    this.scheduleNext(records);
    return loaded.status === 'EMPTY'
      ? loaded
      : { status: 'LOADED', records };
  }

  async enqueue(
    input: EnqueuePendingMutationInput
  ): Promise<EnqueuePendingMutationResult> {
    const scope = this.requireScope();
    if (!scopeMatches(scope, input.scope)) {
      throw new PendingMutationReplayError('AUTHORITY_MISMATCH');
    }
    if (
      !(['NETWORK', 'TIMEOUT', 'RETRYABLE_SERVER'] as const).includes(
        input.originalFailure
      ) ||
      !(['ONLINE', 'INDETERMINATE'] as const).includes(
        input.connectivityAtAttempt
      )
    ) {
      throw new PendingMutationReplayError('AUTHORITY_UNAVAILABLE');
    }
    const now = this.now();
    const candidate = createPendingMutationRecord({
      mutationId: input.mutationId,
      operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
      scope: input.scope,
      stepCode: input.stepCode,
      body: input.body,
      expectedRevision: input.expectedRevision,
      templateVersion: input.templateVersion,
      capabilityRevision: input.capabilityRevision,
      idempotencyKey: input.idempotencyKey,
      initialAttemptCount: 1,
      nextAttemptAt: initialBackoffAt(now),
      failureCategory: input.originalFailure,
      now,
    });
    const authority = await this.ports.refreshAuthority(
      candidate,
      new AbortController().signal
    );
    if (
      authority.status !== 'READY' ||
      !scopeMatches(authority.scope, input.scope) ||
      !evidenceMatches(authority, candidate)
    ) {
      throw new PendingMutationReplayError('AUTHORITY_UNAVAILABLE');
    }

    const records = usePendingMutationsStore.getState().records;
    const duplicate = records.find(
      (record) =>
        record.mutationId === candidate.mutationId ||
        (isActive(record) &&
          record.operationId === candidate.operationId &&
          scopeMatches(record, candidate) &&
          record.idempotencyKey === candidate.idempotencyKey)
    );
    if (duplicate) return { status: 'DUPLICATE', record: duplicate };

    const next = [...records, candidate].sort(fifo);
    await this.commit(next);
    this.emit('ENQUEUED', candidate);
    this.scheduleNext(next);
    return { status: 'ENQUEUED', record: candidate };
  }

  requestReplay(trigger: ReplayTrigger): Promise<void> {
    const scope = this.requireScope();
    if (!this.online) return Promise.resolve();
    const existing = tenantLocks.get(scope.tenantId);
    if (existing) return existing;

    const generation = this.generation;
    const execution = this.flush(generation, trigger).finally(() => {
      if (tenantLocks.get(scope.tenantId) === execution) {
        tenantLocks.delete(scope.tenantId);
      }
    });
    tenantLocks.set(scope.tenantId, execution);
    return execution;
  }

  async cancelAndEvict(): Promise<void> {
    this.generation += 1;
    this.cancelTimer();
    const claim = this.activeClaim;
    this.activeClaim = null;
    claim?.controller.abort();
    if (claim) {
      const current = usePendingMutationsStore.getState().records;
      const restored = current.map((record) =>
        record.mutationId === claim.beforeClaim.mutationId
          ? claim.beforeClaim
          : record
      );
      await persistPendingMutations(claim.scope, restored);
    }
    this.scope = null;
    usePendingMutationsStore.getState().evict();
  }

  async logout(userId: string): Promise<void> {
    await this.cancelAndEvict();
    await clearPendingMutationsForUser(userId);
  }

  async clearCurrentScope(): Promise<void> {
    const scope = this.requireScope();
    await this.cancelAndEvict();
    await clearPendingMutationsForScope(scope);
  }

  async retry(mutationId: string): Promise<void> {
    const record = this.findRecord(mutationId);
    if (record.state !== 'MANUAL_ACTION_REQUIRED') {
      throw new PendingMutationReplayError('RECOVERY_REQUIRED');
    }
    const pending = transitionPendingMutation(record, {
      state: 'PENDING',
      now: this.now(),
      attemptCount: 1,
      nextAttemptAt: this.now(),
      failureCategory: null,
    });
    await this.replace(record, pending);
    this.emit('MANUAL_RECOVERY', pending);
    await this.requestReplay('MANUAL');
  }

  async discard(mutationId: string): Promise<void> {
    const record = this.findRecord(mutationId);
    if (
      record.state === 'REPLAYING' ||
      record.state === 'SUCCEEDED' ||
      record.state === 'DISCARDED'
    ) {
      throw new PendingMutationReplayError('RECOVERY_REQUIRED');
    }
    const discarded = transitionPendingMutation(record, {
      state: 'DISCARDED',
      now: this.now(),
      attemptCount: record.attemptCount,
      failureCategory: record.failureCategory,
    });
    await this.replace(record, discarded);
    this.emit('DISCARDED', discarded);
  }

  private async flush(
    generation: number,
    _trigger: ReplayTrigger
  ): Promise<void> {
    this.cancelTimer();
    while (this.online && generation === this.generation) {
      const scope = this.requireScope();
      const now = this.now();
      const currentRecords = usePendingMutationsStore.getState().records;
      const previousById = new Map(
        currentRecords.map((record) => [record.mutationId, record])
      );
      const records = currentRecords
        .map((record) => expirePendingMutation(record, now))
        .sort(fifo);
      records.forEach((record) => {
        const previous = previousById.get(record.mutationId);
        if (record.state === 'EXPIRED' && previous?.state !== 'EXPIRED') {
          this.emit('EXPIRED', record);
        }
      });
      const candidate = records.find(
        (record) =>
          record.state === 'PENDING' &&
          (record.nextAttemptAt === null || record.nextAttemptAt <= now)
      );
      if (!candidate) {
        if (records.some((record, index) => record !== usePendingMutationsStore.getState().records[index])) {
          await this.commit(records);
        }
        this.scheduleNext(records);
        return;
      }

      const authorityController = new AbortController();
      const authority = await this.ports.refreshAuthority(
        candidate,
        authorityController.signal
      );
      if (generation !== this.generation) return;
      if (authority.status === 'SCOPE_CHANGED') {
        await this.cancelAndEvict();
        return;
      }
      if (authority.status === 'AUTHORIZATION_LOST') {
        await this.transition(candidate, 'MANUAL_ACTION_REQUIRED', {
          category: 'AUTHORIZATION',
        });
        this.emit('TERMINAL_OUTCOME', candidate, 'AUTHORIZATION');
        continue;
      }
      if (
        authority.status === 'E6_CONFLICT' ||
        (authority.status === 'READY' &&
          (!scopeMatches(authority.scope, scope) ||
            !evidenceMatches(authority, candidate)))
      ) {
        await this.transition(candidate, 'CONFLICT_BLOCKED', {
          category: 'E6_REVISION_CONFLICT',
        });
        this.emit('CONFLICT_BLOCKED', candidate, 'E6_REVISION_CONFLICT');
        continue;
      }
      if (authority.status === 'STEP_UNAVAILABLE') {
        await this.transition(candidate, 'MANUAL_ACTION_REQUIRED', {
          category: 'UNSUPPORTED',
        });
        this.emit('TERMINAL_OUTCOME', candidate, 'UNSUPPORTED');
        continue;
      }

      const beforeClaim = candidate;
      const claimed = transitionPendingMutation(candidate, {
        state: 'REPLAYING',
        now,
        attemptCount: candidate.attemptCount + 1,
      });
      await this.replace(candidate, claimed);
      this.emit('REPLAY_STARTED', claimed);
      const controller = new AbortController();
      this.activeClaim = { scope, beforeClaim, controller };
      const result = await this.ports.execute(claimed, controller.signal);
      this.activeClaim = null;
      if (generation !== this.generation) return;
      await this.handleResult(beforeClaim, claimed, result);
    }
  }

  private async handleResult(
    beforeClaim: PendingMutationRecord,
    claimed: PendingMutationRecord,
    result: ReplayExecutionResult
  ): Promise<void> {
    if (result.status === 'SUCCEEDED') {
      const records = usePendingMutationsStore
        .getState()
        .records.filter((record) => record.mutationId !== claimed.mutationId);
      await this.commit(records);
      this.emit('REPLAY_SUCCEEDED', claimed);
      return;
    }
    if (result.status === 'CANCELLED') {
      await this.replace(claimed, beforeClaim);
      return;
    }
    if (result.status === 'E6_CONFLICT') {
      await this.transition(claimed, 'CONFLICT_BLOCKED', {
        category: 'E6_REVISION_CONFLICT',
      });
      this.emit('CONFLICT_BLOCKED', claimed, 'E6_REVISION_CONFLICT');
      return;
    }
    if (result.status === 'TERMINAL_FAILURE') {
      await this.transition(claimed, 'MANUAL_ACTION_REQUIRED', {
        category: result.category,
      });
      this.emit('TERMINAL_OUTCOME', claimed, result.category);
      return;
    }
    if (claimed.attemptCount >= MAX_MUTATION_EXECUTIONS) {
      await this.transition(claimed, 'MANUAL_ACTION_REQUIRED', {
        category: 'RETRY_EXHAUSTED',
      });
      this.emit('TERMINAL_OUTCOME', claimed, 'RETRY_EXHAUSTED');
      return;
    }
    const delay = REPLAY_BACKOFF_MS[claimed.attemptCount - 1];
    await this.transition(claimed, 'PENDING', {
      category: result.category,
      nextAttemptAt: this.now() + delay,
    });
    this.emit('REPLAY_FAILED', claimed, result.category);
  }

  private async transition(
    record: PendingMutationRecord,
    state: 'PENDING' | 'CONFLICT_BLOCKED' | 'MANUAL_ACTION_REQUIRED',
    options: {
      category: PendingMutationFailureCategory;
      nextAttemptAt?: number | null;
    }
  ): Promise<void> {
    const transitioned = transitionPendingMutation(record, {
      state,
      now: this.now(),
      attemptCount: record.attemptCount,
      nextAttemptAt: options.nextAttemptAt ?? null,
      failureCategory: options.category,
    });
    await this.replace(record, transitioned);
  }

  private async replace(
    current: PendingMutationRecord,
    replacement: PendingMutationRecord
  ): Promise<void> {
    const records = usePendingMutationsStore.getState().records.map((record) =>
      record.mutationId === current.mutationId ? replacement : record
    );
    await this.commit(records);
  }

  private async commit(records: readonly PendingMutationRecord[]): Promise<void> {
    const scope = this.requireScope();
    const validated = records.map((record) =>
      parsePendingMutationRecord(record, scope)
    );
    await persistPendingMutations(scope, validated);
    usePendingMutationsStore.getState().replaceScope(scope, validated);
  }

  private scheduleNext(records: readonly PendingMutationRecord[]): void {
    this.cancelTimer();
    if (!this.online) return;
    const now = this.now();
    const next = records
      .filter(
        (record) =>
          record.state === 'PENDING' && record.nextAttemptAt !== null
      )
      .sort((left, right) =>
        (left.nextAttemptAt ?? 0) - (right.nextAttemptAt ?? 0) || fifo(left, right)
      )[0];
    if (!next?.nextAttemptAt) return;
    const delay = Math.max(0, next.nextAttemptAt - now);
    this.scheduled = this.schedule(() => {
      this.scheduled = null;
      void this.requestReplay('BACKOFF');
    }, delay);
  }

  private cancelTimer(): void {
    if (this.scheduled !== null) {
      this.cancelScheduled(this.scheduled);
      this.scheduled = null;
    }
  }

  private requireScope(): PendingMutationScope {
    if (!this.scope) throw new PendingMutationReplayError('SCOPE_NOT_LOADED');
    return this.scope;
  }

  private findRecord(mutationId: string): PendingMutationRecord {
    this.requireScope();
    const record = usePendingMutationsStore
      .getState()
      .records.find((item) => item.mutationId === mutationId);
    if (!record) throw new PendingMutationReplayError('RECOVERY_REQUIRED');
    return record;
  }

  private emit(
    name: PendingMutationTelemetryEventName,
    record: PendingMutationRecord,
    category: PendingMutationFailureCategory | null =
      record.failureCategory
  ): void {
    try {
      void Promise.resolve(
        this.telemetry.emit({
          name,
          mutationId: record.mutationId,
          operationId: record.operationId,
          userId: record.userId,
          organizationId: record.organizationId,
          tenantId: record.tenantId,
          attemptCount: record.attemptCount,
          category,
          connectivity: this.online ? 'ONLINE' : 'OFFLINE',
        })
      ).catch(() => undefined);
    } catch {
      // Telemetry is fire-and-forget and must never block recovery.
    }
  }
}
