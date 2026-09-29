import {
  MAX_MUTATION_EXECUTIONS,
  ONBOARDING_STEP_SUBMIT_OPERATION,
  PENDING_MUTATION_EXPIRY_MS,
  PendingMutationContractError,
  createPendingMutationRecord,
  expirePendingMutation,
  isTerminalMutationRetentionExpired,
  parsePendingMutationRecord,
  transitionPendingMutation,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';

const revision = `step-rev-v1:${'a'.repeat(64)}`;
const capabilityRevision = `cap-v1:${'b'.repeat(64)}`;
const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};

const createRecord = (overrides: Record<string, unknown> = {}) =>
  createPendingMutationRecord({
    mutationId: 'mutation-1',
    operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
    scope,
    stepCode: 'operating_hours',
    body: {
      operating_hours: [
        { day: 'Monday', is_open: true, open_time: '09:00', close_time: '18:00' },
      ],
    },
    expectedRevision: revision,
    templateVersion: 'template-v1',
    capabilityRevision,
    idempotencyKey: 'idempotency-1',
    now: 1_000,
    ...overrides,
  });

describe('TG24.1 pending mutation domain contract', () => {
  it('creates a deterministic immutable Version 1 safe record', () => {
    const record = createRecord();

    expect(record).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
        state: 'PENDING',
        expiresAt: 1_000 + PENDING_MUTATION_EXPIRY_MS,
        attemptCount: 0,
      })
    );
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.body)).toBe(true);
  });

  it.each([
    ['unknown operation', { operationId: 'billing.submit.v1' }],
    ['clinic contact data', { body: { operating_hours: [], email: 'a@b.test' } }],
    ['raw token data', { body: { operating_hours: [], access_token: 'secret' } }],
    ['payment step', { stepCode: 'payment_setup', body: { payment_methods: ['cash'] } }],
    ['clinical step', { stepCode: 'patient_assessment', body: {} }],
  ])('rejects prohibited %s', (_label, overrides) => {
    expect(() => createRecord(overrides)).toThrow(PendingMutationContractError);
  });

  it('accepts only exact room fields for the second approved safe step body', () => {
    const record = createRecord({
      stepCode: 'rooms_and_therapy_beds',
      body: { rooms: [{ name: 'Room 1', room_type: 'therapy', capacity: 1 }] },
    });
    expect(record.stepCode).toBe('rooms_and_therapy_beds');
  });

  it('fails closed for unknown schema, record fields, and scope', () => {
    const record = createRecord();
    expect(() =>
      parsePendingMutationRecord({ ...record, schemaVersion: 2 })
    ).toThrow(expect.objectContaining({ kind: 'UNSUPPORTED_SCHEMA' }));
    expect(() =>
      parsePendingMutationRecord({ ...record, rawError: 'secret' })
    ).toThrow(expect.objectContaining({ kind: 'MALFORMED_RECORD' }));
    expect(() =>
      parsePendingMutationRecord(record, { ...scope, tenantId: 'tenant-2' })
    ).toThrow(expect.objectContaining({ kind: 'SCOPE_MISMATCH' }));
  });

  it('enforces lifecycle invariants and bounded execution count', () => {
    const replaying = transitionPendingMutation(createRecord(), {
      state: 'REPLAYING',
      now: 2_000,
      attemptCount: 1,
    });
    const conflict = transitionPendingMutation(replaying, {
      state: 'CONFLICT_BLOCKED',
      now: 3_000,
      failureCategory: 'E6_REVISION_CONFLICT',
    });
    expect(conflict.revisionEvidence.revision.value).toBe(revision);
    expect(() =>
      transitionPendingMutation(conflict, {
        state: 'SUCCEEDED',
        now: 4_000,
      })
    ).toThrow(expect.objectContaining({ kind: 'INVALID_TRANSITION' }));
    expect(() =>
      parsePendingMutationRecord({
        ...replaying,
        attemptCount: MAX_MUTATION_EXECUTIONS + 1,
      })
    ).toThrow(expect.objectContaining({ kind: 'MALFORMED_RECORD' }));
  });

  it('expires pending records at seven days without silently deleting them', () => {
    const record = createRecord();
    expect(expirePendingMutation(record, record.expiresAt - 1)).toBe(record);
    const expired = expirePendingMutation(record, record.expiresAt);
    expect(expired).toEqual(
      expect.objectContaining({ state: 'EXPIRED' })
    );
    expect(
      isTerminalMutationRetentionExpired(expired, expired.updatedAt + 30 * 24 * 60 * 60 * 1000)
    ).toBe(true);
  });
});
