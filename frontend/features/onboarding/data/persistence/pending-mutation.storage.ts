import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PENDING_MUTATION_SCHEMA_VERSION,
  PendingMutationContractError,
  type PendingMutationRecord,
  type PendingMutationScope,
  parsePendingMutationRecord,
} from '../../domain/entities/pending-mutation.entity';

const STORAGE_FAMILY = 'pending_mutations';

export interface PendingMutationStoragePayload {
  readonly schemaVersion: typeof PENDING_MUTATION_SCHEMA_VERSION;
  readonly userId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly records: readonly PendingMutationRecord[];
}

export type PendingMutationLoadResult =
  | {
    readonly status: 'LOADED';
    readonly records: readonly PendingMutationRecord[];
  }
  | {
    readonly status: 'EMPTY';
    readonly records: readonly [];
  }
  | {
    readonly status: 'RECOVERY_REQUIRED';
    readonly records: readonly [];
    readonly failure:
      | 'UNSUPPORTED_SCHEMA'
      | 'CORRUPT'
      | 'SCOPE_MISMATCH'
      | 'PROHIBITED_DATA';
  };

const required = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim() === value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getPendingMutationStorageKey = (
  scope: PendingMutationScope
): string => {
  if (
    !required(scope.userId) ||
    !required(scope.organizationId) ||
    !required(scope.tenantId)
  ) {
    throw new PendingMutationContractError(
      'MALFORMED_RECORD',
      'pending_mutation.scope_required'
    );
  }
  return `@novaclinics/${scope.tenantId}/user_${scope.userId}/organization_${scope.organizationId}/${STORAGE_FAMILY}_v${PENDING_MUTATION_SCHEMA_VERSION}`;
};

const mapLoadFailure = (
  error: unknown
): Exclude<PendingMutationLoadResult, { status: 'LOADED' | 'EMPTY' }>['failure'] => {
  if (error instanceof PendingMutationContractError) {
    if (error.kind === 'UNSUPPORTED_SCHEMA') return 'UNSUPPORTED_SCHEMA';
    if (error.kind === 'SCOPE_MISMATCH') return 'SCOPE_MISMATCH';
    if (error.kind === 'PROHIBITED_FIELD') return 'PROHIBITED_DATA';
  }
  return 'CORRUPT';
};

export const parsePendingMutationStoragePayload = (
  raw: string,
  scope: PendingMutationScope
): PendingMutationStoragePayload => {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) {
    throw new PendingMutationContractError(
      'MALFORMED_RECORD',
      'pending_mutation.storage_invalid'
    );
  }
  const allowedKeys = new Set([
    'schemaVersion',
    'userId',
    'organizationId',
    'tenantId',
    'records',
  ]);
  if (
    Object.keys(value).some((key) => !allowedKeys.has(key)) ||
    value.schemaVersion !== PENDING_MUTATION_SCHEMA_VERSION ||
    value.userId !== scope.userId ||
    value.organizationId !== scope.organizationId ||
    value.tenantId !== scope.tenantId ||
    !Array.isArray(value.records)
  ) {
    if (value.schemaVersion !== PENDING_MUTATION_SCHEMA_VERSION) {
      throw new PendingMutationContractError(
        'UNSUPPORTED_SCHEMA',
        'pending_mutation.schema_unsupported'
      );
    }
    if (
      value.userId !== scope.userId ||
      value.organizationId !== scope.organizationId ||
      value.tenantId !== scope.tenantId
    ) {
      throw new PendingMutationContractError(
        'SCOPE_MISMATCH',
        'pending_mutation.scope_mismatch'
      );
    }
    throw new PendingMutationContractError(
      'MALFORMED_RECORD',
      'pending_mutation.storage_invalid'
    );
  }

  return Object.freeze({
    schemaVersion: PENDING_MUTATION_SCHEMA_VERSION,
    userId: scope.userId,
    organizationId: scope.organizationId,
    tenantId: scope.tenantId,
    records: Object.freeze(
      value.records.map((record) => parsePendingMutationRecord(record, scope))
    ),
  });
};

export const migratePendingMutationStoragePayload = (
  fromVersion: number,
  raw: string,
  scope: PendingMutationScope
): PendingMutationStoragePayload => {
  if (fromVersion !== PENDING_MUTATION_SCHEMA_VERSION) {
    throw new PendingMutationContractError(
      'UNSUPPORTED_SCHEMA',
      'pending_mutation.schema_unsupported'
    );
  }
  return parsePendingMutationStoragePayload(raw, scope);
};

export const persistPendingMutations = async (
  scope: PendingMutationScope,
  records: readonly PendingMutationRecord[]
): Promise<void> => {
  const validatedRecords = records.map((record) =>
    parsePendingMutationRecord(record, scope)
  );
  const payload: PendingMutationStoragePayload = {
    schemaVersion: PENDING_MUTATION_SCHEMA_VERSION,
    userId: scope.userId,
    organizationId: scope.organizationId,
    tenantId: scope.tenantId,
    records: validatedRecords,
  };
  await AsyncStorage.setItem(
    getPendingMutationStorageKey(scope),
    JSON.stringify(payload)
  );
};

export const loadPendingMutations = async (
  scope: PendingMutationScope
): Promise<PendingMutationLoadResult> => {
  const storageKey = getPendingMutationStorageKey(scope);
  const raw = await AsyncStorage.getItem(storageKey);
  if (raw === null) return { status: 'EMPTY', records: [] };

  try {
    const payload = parsePendingMutationStoragePayload(raw, scope);
    return { status: 'LOADED', records: payload.records };
  } catch (error) {
    await AsyncStorage.removeItem(storageKey);
    return {
      status: 'RECOVERY_REQUIRED',
      records: [],
      failure: mapLoadFailure(error),
    };
  }
};

export const clearPendingMutationsForScope = async (
  scope: PendingMutationScope
): Promise<void> => {
  await AsyncStorage.removeItem(getPendingMutationStorageKey(scope));
};

export const clearPendingMutationsForUser = async (
  userId: string
): Promise<void> => {
  if (!required(userId)) {
    throw new PendingMutationContractError(
      'MALFORMED_RECORD',
      'pending_mutation.scope_required'
    );
  }
  const keys = await AsyncStorage.getAllKeys();
  const userSegment = `/user_${userId}/`;
  const matchingKeys = keys.filter(
    (key) =>
      key.startsWith('@novaclinics/') &&
      key.includes(userSegment) &&
      key.endsWith(
        `/${STORAGE_FAMILY}_v${PENDING_MUTATION_SCHEMA_VERSION}`
      )
  );
  if (matchingKeys.length > 0) {
    await AsyncStorage.multiRemove(matchingKeys);
  }
};
