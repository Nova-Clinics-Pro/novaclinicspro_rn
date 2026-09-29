import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_STEP_SUBMIT_OPERATION,
  createPendingMutationRecord,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';
import {
  getPendingMutationStorageKey,
  loadPendingMutations,
  persistPendingMutations,
} from '../../features/onboarding/data/persistence/pending-mutation.storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};
const record = createPendingMutationRecord({
  mutationId: 'mutation-1',
  operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
  scope,
  stepCode: 'operating_hours',
  body: { operating_hours: [] },
  expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
  templateVersion: 'template-v1',
  capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
  idempotencyKey: 'idempotency-1',
  now: 1_000,
});

describe('TG24.1 pending mutation persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses a composite tenant/user/organization-scoped key', () => {
    expect(getPendingMutationStorageKey(scope)).toBe(
      '@novaclinics/tenant-1/user_user-1/organization_organization-1/pending_mutations_v1'
    );
  });

  it('persists only validated Version 1 records and round-trips them', async () => {
    await persistPendingMutations(scope, [record]);
    const serialized = storage.setItem.mock.calls[0][1];
    storage.getItem.mockResolvedValue(serialized);

    await expect(loadPendingMutations(scope)).resolves.toEqual({
      status: 'LOADED',
      records: [record],
    });
  });

  it.each([
    ['legacy schema', { schemaVersion: 0, ...scope, records: [] }, 'UNSUPPORTED_SCHEMA'],
    ['cross tenant', { schemaVersion: 1, ...scope, tenantId: 'tenant-2', records: [] }, 'SCOPE_MISMATCH'],
    ['prohibited payload', {
      schemaVersion: 1,
      ...scope,
      records: [{ ...record, body: { operating_hours: [], token: 'secret' } }],
    }, 'PROHIBITED_DATA'],
  ])('fails closed and removes unsafe %s data', async (_label, payload, failure) => {
    storage.getItem.mockResolvedValue(JSON.stringify(payload));

    await expect(loadPendingMutations(scope)).resolves.toEqual({
      status: 'RECOVERY_REQUIRED',
      records: [],
      failure,
    });
    expect(storage.removeItem).toHaveBeenCalledWith(
      getPendingMutationStorageKey(scope)
    );
  });

  it('classifies malformed JSON without leaking its contents', async () => {
    storage.getItem.mockResolvedValue('{credential:secret');
    await expect(loadPendingMutations(scope)).resolves.toEqual({
      status: 'RECOVERY_REQUIRED',
      records: [],
      failure: 'CORRUPT',
    });
  });
});
