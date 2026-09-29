import {
  ONBOARDING_STEP_SUBMIT_OPERATION,
  createPendingMutationRecord,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';
import { usePendingMutationsStore } from '../../features/onboarding/presentation/stores/pending-mutations.store';

const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};
const makeRecord = (mutationId: string, idempotencyKey = mutationId) =>
  createPendingMutationRecord({
    mutationId,
    operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
    scope,
    stepCode: 'operating_hours',
    body: { operating_hours: [] },
    expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
    templateVersion: 'template-v1',
    capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
    idempotencyKey,
    now: 1_000,
  });

describe('TG24.1 synchronous pending mutation store', () => {
  beforeEach(() => usePendingMutationsStore.getState().evict());

  it('isolates loaded scope and rejects cross-tenant records', () => {
    usePendingMutationsStore.getState().replaceScope(scope, []);
    const crossTenant = makeRecord('mutation-1');

    expect(() =>
      usePendingMutationsStore.getState().replaceScope(
        { ...scope, tenantId: 'tenant-2' },
        [crossTenant]
      )
    ).toThrow(expect.objectContaining({ kind: 'SCOPE_MISMATCH' }));
  });

  it('collapses duplicate operation/scope/idempotency identity', () => {
    const first = makeRecord('mutation-1', 'same-key');
    const duplicate = makeRecord('mutation-2', 'same-key');
    usePendingMutationsStore.getState().replaceScope(scope, [first]);

    usePendingMutationsStore.getState().upsert(duplicate);

    expect(usePendingMutationsStore.getState().records).toEqual([first]);
  });

  it('owns synchronous lifecycle state only and evicts without deleting storage', () => {
    const record = makeRecord('mutation-1');
    usePendingMutationsStore.getState().replaceScope(scope, [record]);
    usePendingMutationsStore.getState().transition('mutation-1', {
      state: 'REPLAYING',
      now: 2_000,
      attemptCount: 1,
    });
    expect(usePendingMutationsStore.getState().records[0].state).toBe('REPLAYING');

    usePendingMutationsStore.getState().evict();
    expect(usePendingMutationsStore.getState()).toEqual(
      expect.objectContaining({ scope: null, records: [] })
    );
  });
});
