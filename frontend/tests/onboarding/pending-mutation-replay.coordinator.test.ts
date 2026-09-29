import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type PendingMutationRecord,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';
import {
  PendingMutationReplayCoordinator,
  type EnqueuePendingMutationInput,
  type ReplayAuthorityResult,
  type ReplayExecutionResult,
} from '../../features/onboarding/application/pending-mutation-replay.coordinator';
import { usePendingMutationsStore } from '../../features/onboarding/presentation/stores/pending-mutations.store';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};
const revision = `step-rev-v1:${'a'.repeat(64)}`;
const capabilityRevision = `cap-v1:${'b'.repeat(64)}`;

const enqueueInput = (
  mutationId: string,
  overrides: Partial<EnqueuePendingMutationInput> = {}
): EnqueuePendingMutationInput => ({
  mutationId,
  scope,
  stepCode: 'operating_hours',
  body: { operating_hours: [] },
  expectedRevision: revision,
  templateVersion: 'template-v1',
  capabilityRevision,
  idempotencyKey: `key-${mutationId}`,
  originalFailure: 'NETWORK',
  connectivityAtAttempt: 'ONLINE',
  ...overrides,
});

const readyAuthority = (
  overrides: Partial<Extract<ReplayAuthorityResult, { status: 'READY' }>> = {}
): ReplayAuthorityResult => ({
  status: 'READY',
  scope,
  stepCode: 'operating_hours',
  expectedRevision: revision,
  templateVersion: 'template-v1',
  capabilityRevision,
  ...overrides,
});

describe('TG24.2 pending mutation replay coordinator', () => {
  let memory: Map<string, string>;
  let now: number;
  let scheduled: { callback: () => void; delay: number }[];

  beforeEach(() => {
    memory = new Map();
    now = 1_000;
    scheduled = [];
    jest.clearAllMocks();
    storage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    storage.setItem.mockImplementation(async (key, value) => {
      memory.set(key, value);
    });
    storage.removeItem.mockImplementation(async (key) => {
      memory.delete(key);
    });
    storage.getAllKeys.mockImplementation(async () => [...memory.keys()]);
    storage.multiRemove.mockImplementation(async (keys) => {
      keys.forEach((key) => memory.delete(key));
    });
    usePendingMutationsStore.getState().evict();
  });

  const coordinator = (
    execute: (
      record: PendingMutationRecord,
      signal: AbortSignal
    ) => Promise<ReplayExecutionResult>,
    authority: () => Promise<ReplayAuthorityResult> = async () => readyAuthority()
  ) =>
    new PendingMutationReplayCoordinator({
      refreshAuthority: authority,
      execute,
      now: () => now,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      },
      cancelScheduled: jest.fn(),
    });

  it('enqueues one validated durable intent after the consumed original attempt', async () => {
    const replay = coordinator(async () => ({ status: 'SUCCEEDED' }));
    await replay.initialize(scope);

    const result = await replay.enqueue(enqueueInput('mutation-1'));

    expect(result).toEqual(
      expect.objectContaining({
        status: 'ENQUEUED',
        record: expect.objectContaining({
          attemptCount: 1,
          nextAttemptAt: 3_000,
          failureCategory: 'NETWORK',
          idempotencyKey: 'key-mutation-1',
        }),
      })
    );
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('collapses duplicate operation/scope/idempotency identity', async () => {
    const replay = coordinator(async () => ({ status: 'SUCCEEDED' }));
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1', { idempotencyKey: 'same' }));

    const duplicate = await replay.enqueue(
      enqueueInput('mutation-2', { idempotencyKey: 'same' })
    );

    expect(duplicate.status).toBe('DUPLICATE');
    expect(usePendingMutationsStore.getState().records).toHaveLength(1);
  });

  it('uses one tenant lock and deterministic FIFO across concurrent triggers', async () => {
    const executed: string[] = [];
    const replay = coordinator(async (record) => {
      executed.push(record.mutationId);
      return { status: 'SUCCEEDED' };
    });
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-b'));
    now += 1;
    await replay.enqueue(enqueueInput('mutation-a'));
    now = 5_000;
    replay.setConnectivity(true);

    await Promise.all([
      replay.requestReplay('RECONNECT'),
      replay.requestReplay('FOREGROUND'),
    ]);

    expect(executed).toEqual(['mutation-b', 'mutation-a']);
    expect(usePendingMutationsStore.getState().records).toEqual([]);
  });

  it('recovers an interrupted process-local claim on restart with the same identity', async () => {
    const first = coordinator(async () => ({ status: 'SUCCEEDED' }));
    await first.initialize(scope);
    await first.enqueue(enqueueInput('mutation-1'));
    const [key, serialized] = [...memory.entries()][0];
    const payload = JSON.parse(serialized);
    payload.records[0] = {
      ...payload.records[0],
      state: 'REPLAYING',
      attemptCount: 2,
      updatedAt: 3_000,
      nextAttemptAt: null,
      failureCategory: null,
    };
    memory.set(key, JSON.stringify(payload));
    usePendingMutationsStore.getState().evict();
    now = 4_000;
    const restarted = coordinator(async () => ({ status: 'SUCCEEDED' }));

    await restarted.initialize(scope);

    expect(usePendingMutationsStore.getState().records[0]).toEqual(
      expect.objectContaining({
        mutationId: 'mutation-1',
        idempotencyKey: 'key-mutation-1',
        state: 'PENDING',
        attemptCount: 2,
        nextAttemptAt: 4_000,
      })
    );
  });

  it('applies bounded 2/4/8 retry timing with the original key unchanged', async () => {
    const observedKeys: string[] = [];
    const replay = coordinator(async (record) => {
      observedKeys.push(record.idempotencyKey);
      return { status: 'RETRYABLE_FAILURE', category: 'NETWORK' };
    });
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);

    await replay.requestReplay('BACKOFF');

    expect(usePendingMutationsStore.getState().records[0]).toEqual(
      expect.objectContaining({
        state: 'PENDING',
        attemptCount: 2,
        nextAttemptAt: 7_000,
        idempotencyKey: 'key-mutation-1',
      })
    );
    expect(observedKeys).toEqual(['key-mutation-1']);
    expect(scheduled.at(-1)?.delay).toBe(4_000);
  });

  it('moves exhausted and terminal outcomes to manual action without looping', async () => {
    const replay = coordinator(async () => ({
      status: 'TERMINAL_FAILURE',
      category: 'VALIDATION',
    }));
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);

    await replay.requestReplay('BACKOFF');

    expect(usePendingMutationsStore.getState().records[0]).toEqual(
      expect.objectContaining({
        state: 'MANUAL_ACTION_REQUIRED',
        failureCategory: 'VALIDATION',
        attemptCount: 2,
      })
    );
  });

  it('stops after the original plus three replay executions', async () => {
    const replay = coordinator(async () => ({
      status: 'RETRYABLE_FAILURE',
      category: 'RETRYABLE_SERVER',
    }));
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    replay.setConnectivity(true);

    for (const replayAt of [3_000, 7_000, 15_000]) {
      now = replayAt;
      await replay.requestReplay('BACKOFF');
    }

    expect(usePendingMutationsStore.getState().records[0]).toEqual(
      expect.objectContaining({
        state: 'MANUAL_ACTION_REQUIRED',
        failureCategory: 'RETRY_EXHAUSTED',
        attemptCount: 4,
      })
    );
  });

  it('delegates stale evidence to E6 conflict state without replacing evidence', async () => {
    const replay = coordinator(
      async () => ({ status: 'E6_CONFLICT' })
    );
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);

    await replay.requestReplay('RECONNECT');

    const record = usePendingMutationsStore.getState().records[0];
    expect(record.state).toBe('CONFLICT_BLOCKED');
    expect(record.failureCategory).toBe('E6_REVISION_CONFLICT');
    expect(record.revisionEvidence.revision.value).toBe(revision);
  });

  it('fails closed before execution for authorization loss and scope change', async () => {
    const execute = jest.fn(async () => ({ status: 'SUCCEEDED' as const }));
    let authority: ReplayAuthorityResult = readyAuthority();
    const replay = coordinator(execute, async () => authority);
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);
    authority = { status: 'AUTHORIZATION_LOST' };

    await replay.requestReplay('RECONNECT');

    expect(execute).not.toHaveBeenCalled();
    expect(usePendingMutationsStore.getState().records[0].state).toBe(
      'MANUAL_ACTION_REQUIRED'
    );
  });

  it('evicts memory and retains the original scoped record when authority changes scope', async () => {
    const execute = jest.fn(async () => ({ status: 'SUCCEEDED' as const }));
    let authority: ReplayAuthorityResult = readyAuthority();
    const replay = coordinator(execute, async () => authority);
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);
    authority = { status: 'SCOPE_CHANGED' };

    await replay.requestReplay('RECONNECT');

    expect(execute).not.toHaveBeenCalled();
    expect(usePendingMutationsStore.getState().records).toEqual([]);
    const stored = [...memory.values()].map((value) => JSON.parse(value))[0];
    expect(stored.records[0]).toEqual(
      expect.objectContaining({
        mutationId: 'mutation-1',
        tenantId: 'tenant-1',
        state: 'PENDING',
      })
    );
  });

  it('cancels a tenant-switch execution without consuming an attempt or transferring it', async () => {
    let started!: () => void;
    const didStart = new Promise<void>((resolve) => {
      started = resolve;
    });
    const replay = coordinator(
      async (_record, signal) =>
        new Promise<ReplayExecutionResult>((resolve) => {
          started();
          signal.addEventListener('abort', () =>
            resolve({ status: 'CANCELLED' })
          );
        })
    );
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);
    const flushing = replay.requestReplay('RECONNECT');
    await didStart;

    await replay.cancelAndEvict();
    await flushing;

    expect(usePendingMutationsStore.getState().records).toEqual([]);
    const stored = [...memory.values()].map((value) => JSON.parse(value))[0];
    expect(stored.records[0]).toEqual(
      expect.objectContaining({
        state: 'PENDING',
        attemptCount: 1,
        tenantId: 'tenant-1',
      })
    );
  });

  it('deletes only the outgoing user queue on logout', async () => {
    const replay = coordinator(async () => ({ status: 'SUCCEEDED' }));
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    memory.set(
      '@novaclinics/tenant-2/user_user-2/organization_org-2/pending_mutations_v1',
      '{}'
    );

    await replay.logout('user-1');

    expect([...memory.keys()]).toEqual([
      '@novaclinics/tenant-2/user_user-2/organization_org-2/pending_mutations_v1',
    ]);
  });

  it('supports explicit manual retry with the original mutation and idempotency identity', async () => {
    const executedKeys: string[] = [];
    let terminal = true;
    const replay = new PendingMutationReplayCoordinator({
      refreshAuthority: async () => readyAuthority(),
      execute: async (record) => {
        executedKeys.push(record.idempotencyKey);
        return terminal
          ? { status: 'TERMINAL_FAILURE', category: 'VALIDATION' }
          : { status: 'SUCCEEDED' };
      },
      now: () => now,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      },
    });
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);
    await replay.requestReplay('BACKOFF');
    terminal = false;

    await replay.retry('mutation-1');

    expect(executedKeys).toEqual(['key-mutation-1', 'key-mutation-1']);
    expect(usePendingMutationsStore.getState().records).toEqual([]);
  });

  it('persists explicit discard and emits only safe lifecycle metadata', async () => {
    const emit = jest.fn();
    const replay = new PendingMutationReplayCoordinator({
      refreshAuthority: async () => readyAuthority(),
      execute: async () => ({ status: 'E6_CONFLICT' }),
      telemetry: { emit },
      now: () => now,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length as unknown as ReturnType<typeof setTimeout>;
      },
    });
    await replay.initialize(scope);
    await replay.enqueue(enqueueInput('mutation-1'));
    now = 3_000;
    replay.setConnectivity(true);
    await replay.requestReplay('BACKOFF');

    await replay.discard('mutation-1');

    expect(usePendingMutationsStore.getState().records[0]).toEqual(
      expect.objectContaining({
        state: 'DISCARDED',
        idempotencyKey: 'key-mutation-1',
      })
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'DISCARDED',
        mutationId: 'mutation-1',
        operationId: 'onboarding.step.submit.v1',
        userId: 'user-1',
        organizationId: 'organization-1',
        tenantId: 'tenant-1',
      })
    );
    expect(JSON.stringify(emit.mock.calls)).not.toContain('operating_hours');
  });
});
