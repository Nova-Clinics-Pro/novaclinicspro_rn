import {
  createAuthoritativeStepRevision,
  createStepProjectionIdentity,
  type AuthoritativeStepRevision,
  type StepProjectionIdentity,
} from './step-revision.entity';

export const PENDING_MUTATION_SCHEMA_VERSION = 1 as const;
export const ONBOARDING_STEP_SUBMIT_OPERATION = 'onboarding.step.submit.v1' as const;
export const PENDING_MUTATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const TERMINAL_MUTATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_MUTATION_EXECUTIONS = 4;
export const REPLAY_BACKOFF_MS = Object.freeze([2_000, 4_000, 8_000] as const);

export const PENDING_MUTATION_STATES = Object.freeze([
  'PENDING',
  'REPLAYING',
  'CONFLICT_BLOCKED',
  'MANUAL_ACTION_REQUIRED',
  'SUCCEEDED',
  'DISCARDED',
  'EXPIRED',
] as const);

export type PendingMutationState = (typeof PENDING_MUTATION_STATES)[number];

export const PENDING_MUTATION_FAILURE_CATEGORIES = Object.freeze([
  'NETWORK',
  'TIMEOUT',
  'RETRYABLE_SERVER',
  'VALIDATION',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'SCOPE_MISMATCH',
  'UNSUPPORTED',
  'MALFORMED_RESPONSE',
  'IDEMPOTENCY_CONFLICT',
  'E6_REVISION_CONFLICT',
  'RETRY_EXHAUSTED',
] as const);

export type PendingMutationFailureCategory =
  (typeof PENDING_MUTATION_FAILURE_CATEGORIES)[number];

export type PendingMutationExecutionResult =
  | { readonly status: 'SUCCEEDED' }
  | {
    readonly status: 'RETRYABLE_FAILURE';
    readonly category: 'NETWORK' | 'TIMEOUT' | 'RETRYABLE_SERVER';
  }
  | {
    readonly status: 'TERMINAL_FAILURE';
    readonly category:
      | 'VALIDATION'
      | 'AUTHENTICATION'
      | 'AUTHORIZATION'
      | 'SCOPE_MISMATCH'
      | 'UNSUPPORTED'
      | 'MALFORMED_RESPONSE'
      | 'IDEMPOTENCY_CONFLICT';
  }
  | { readonly status: 'E6_CONFLICT' }
  | { readonly status: 'CANCELLED' };

export interface PendingMutationScope {
  readonly userId: string;
  readonly organizationId: string;
  readonly tenantId: string;
}

export interface OperatingHoursMutationBody {
  readonly operating_hours: readonly {
    readonly day: string;
    readonly is_open: boolean;
    readonly open_time?: string;
    readonly close_time?: string;
  }[];
}

export interface RoomsMutationBody {
  readonly rooms: readonly {
    readonly name: string;
    readonly room_type: string;
    readonly capacity: number;
  }[];
}

export type SafeOnboardingStepBody =
  | OperatingHoursMutationBody
  | RoomsMutationBody;

export interface PendingMutationRevisionEvidence {
  readonly revision: AuthoritativeStepRevision;
  readonly projectionIdentity: StepProjectionIdentity;
}

export interface PendingMutationRecord {
  readonly schemaVersion: typeof PENDING_MUTATION_SCHEMA_VERSION;
  readonly mutationId: string;
  readonly operationId: typeof ONBOARDING_STEP_SUBMIT_OPERATION;
  readonly userId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly stepCode: 'operating_hours' | 'rooms_and_therapy_beds';
  readonly body: SafeOnboardingStepBody;
  readonly revisionEvidence: PendingMutationRevisionEvidence;
  readonly idempotencyKey: string;
  readonly state: PendingMutationState;
  readonly enqueuedAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number;
  readonly attemptCount: number;
  readonly nextAttemptAt: number | null;
  readonly failureCategory: PendingMutationFailureCategory | null;
}

export type PendingMutationErrorKind =
  | 'UNSUPPORTED_SCHEMA'
  | 'UNSUPPORTED_OPERATION'
  | 'UNSUPPORTED_STEP'
  | 'PROHIBITED_FIELD'
  | 'MALFORMED_RECORD'
  | 'SCOPE_MISMATCH'
  | 'INVALID_TRANSITION'
  | 'EXPIRED';

export class PendingMutationContractError extends Error {
  constructor(
    readonly kind: PendingMutationErrorKind,
    readonly code: string
  ) {
    super(code);
    this.name = 'PendingMutationContractError';
  }
}

const required = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim() === value;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): boolean => {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  return requiredKeys.every((key) => key in value) &&
    Object.keys(value).every((key) => allowed.has(key));
};

const fail = (kind: PendingMutationErrorKind, code: string): never => {
  throw new PendingMutationContractError(kind, code);
};

const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

const validateOperatingHoursBody = (
  value: unknown
): OperatingHoursMutationBody => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['operating_hours']) ||
    !Array.isArray(value.operating_hours)
  ) {
    return fail('PROHIBITED_FIELD', 'pending_mutation.body_not_allowlisted');
  }

  const operatingHours = value.operating_hours.map((entry) => {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ['day', 'is_open'], ['open_time', 'close_time']) ||
      !required(entry.day) ||
      typeof entry.is_open !== 'boolean' ||
      (entry.open_time !== undefined && !required(entry.open_time)) ||
      (entry.close_time !== undefined && !required(entry.close_time))
    ) {
      return fail('PROHIBITED_FIELD', 'pending_mutation.body_not_allowlisted');
    }
    return {
      day: entry.day,
      is_open: entry.is_open,
      ...(entry.open_time === undefined ? {} : { open_time: entry.open_time }),
      ...(entry.close_time === undefined ? {} : { close_time: entry.close_time }),
    };
  });

  return deepFreeze({ operating_hours: operatingHours });
};

const validateRoomsBody = (value: unknown): RoomsMutationBody => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['rooms']) ||
    !Array.isArray(value.rooms)
  ) {
    return fail('PROHIBITED_FIELD', 'pending_mutation.body_not_allowlisted');
  }

  const rooms = value.rooms.map((entry) => {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ['name', 'room_type', 'capacity']) ||
      !required(entry.name) ||
      !required(entry.room_type) ||
      !Number.isInteger(entry.capacity) ||
      Number(entry.capacity) < 1
    ) {
      return fail('PROHIBITED_FIELD', 'pending_mutation.body_not_allowlisted');
    }
    return {
      name: entry.name,
      room_type: entry.room_type,
      capacity: Number(entry.capacity),
    };
  });

  return deepFreeze({ rooms });
};

export const validateStepMutationBody = (
  stepCode: unknown,
  value: unknown
): SafeOnboardingStepBody => {
  if (stepCode === 'operating_hours') return validateOperatingHoursBody(value);
  if (stepCode === 'rooms_and_therapy_beds') return validateRoomsBody(value);
  return fail('UNSUPPORTED_STEP', 'pending_mutation.step_not_queueable');
};

const validateTimestamp = (value: unknown, code: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fail('MALFORMED_RECORD', code);
  }
  return value;
};

const validateScope = (value: unknown): string => {
  if (!required(value)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.scope_required');
  }
  return value;
};

const validateState = (value: unknown): PendingMutationState => {
  if (!(PENDING_MUTATION_STATES as readonly unknown[]).includes(value)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.state_invalid');
  }
  return value as PendingMutationState;
};

const validateFailureCategory = (
  value: unknown
): PendingMutationFailureCategory | null => {
  if (value === null) return null;
  if (!(PENDING_MUTATION_FAILURE_CATEGORIES as readonly unknown[]).includes(value)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.failure_category_invalid');
  }
  return value as PendingMutationFailureCategory;
};

const RECORD_KEYS = Object.freeze([
  'schemaVersion',
  'mutationId',
  'operationId',
  'userId',
  'organizationId',
  'tenantId',
  'stepCode',
  'body',
  'revisionEvidence',
  'idempotencyKey',
  'state',
  'enqueuedAt',
  'updatedAt',
  'expiresAt',
  'attemptCount',
  'nextAttemptAt',
  'failureCategory',
]);

export const parsePendingMutationRecord = (
  value: unknown,
  expectedScope?: PendingMutationScope
): PendingMutationRecord => {
  if (!isRecord(value) || !hasExactKeys(value, RECORD_KEYS)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.record_invalid');
  }
  if (value.schemaVersion !== PENDING_MUTATION_SCHEMA_VERSION) {
    return fail('UNSUPPORTED_SCHEMA', 'pending_mutation.schema_unsupported');
  }
  if (value.operationId !== ONBOARDING_STEP_SUBMIT_OPERATION) {
    return fail('UNSUPPORTED_OPERATION', 'pending_mutation.operation_unsupported');
  }

  const scope = {
    userId: validateScope(value.userId),
    organizationId: validateScope(value.organizationId),
    tenantId: validateScope(value.tenantId),
  };
  if (
    expectedScope &&
    (scope.userId !== expectedScope.userId ||
      scope.organizationId !== expectedScope.organizationId ||
      scope.tenantId !== expectedScope.tenantId)
  ) {
    return fail('SCOPE_MISMATCH', 'pending_mutation.scope_mismatch');
  }

  if (!required(value.mutationId) || !required(value.idempotencyKey)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.identity_required');
  }
  if (!isRecord(value.revisionEvidence)) {
    return fail('MALFORMED_RECORD', 'pending_mutation.revision_evidence_invalid');
  }
  if (
    !hasExactKeys(value.revisionEvidence, ['revision', 'projectionIdentity']) ||
    !isRecord(value.revisionEvidence.revision) ||
    !isRecord(value.revisionEvidence.projectionIdentity)
  ) {
    return fail('MALFORMED_RECORD', 'pending_mutation.revision_evidence_invalid');
  }

  const enqueuedAt = validateTimestamp(
    value.enqueuedAt,
    'pending_mutation.enqueued_at_invalid'
  );
  const updatedAt = validateTimestamp(
    value.updatedAt,
    'pending_mutation.updated_at_invalid'
  );
  const expiresAt = validateTimestamp(
    value.expiresAt,
    'pending_mutation.expires_at_invalid'
  );
  if (
    expiresAt !== enqueuedAt + PENDING_MUTATION_EXPIRY_MS ||
    updatedAt < enqueuedAt
  ) {
    return fail('MALFORMED_RECORD', 'pending_mutation.timestamps_invalid');
  }
  if (
    !Number.isInteger(value.attemptCount) ||
    Number(value.attemptCount) < 0 ||
    Number(value.attemptCount) > MAX_MUTATION_EXECUTIONS
  ) {
    return fail('MALFORMED_RECORD', 'pending_mutation.attempt_count_invalid');
  }
  const nextAttemptAt =
    value.nextAttemptAt === null
      ? null
      : validateTimestamp(
        value.nextAttemptAt,
        'pending_mutation.next_attempt_at_invalid'
      );

  const stepCode = value.stepCode;
  const body = validateStepMutationBody(stepCode, value.body);
  const revision = createAuthoritativeStepRevision(
    value.revisionEvidence.revision.value
  );
  const projectionIdentity = createStepProjectionIdentity(
    value.revisionEvidence.projectionIdentity.templateVersion,
    value.revisionEvidence.projectionIdentity.capabilityRevision
  );

  return deepFreeze({
    schemaVersion: PENDING_MUTATION_SCHEMA_VERSION,
    mutationId: value.mutationId,
    operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
    ...scope,
    stepCode: stepCode as PendingMutationRecord['stepCode'],
    body,
    revisionEvidence: { revision, projectionIdentity },
    idempotencyKey: value.idempotencyKey,
    state: validateState(value.state),
    enqueuedAt,
    updatedAt,
    expiresAt,
    attemptCount: Number(value.attemptCount),
    nextAttemptAt,
    failureCategory: validateFailureCategory(value.failureCategory),
  });
};

export const createPendingMutationRecord = (input: {
  mutationId: unknown;
  operationId: unknown;
  scope: PendingMutationScope;
  stepCode: unknown;
  body: unknown;
  expectedRevision: unknown;
  templateVersion: unknown;
  capabilityRevision: unknown;
  idempotencyKey: unknown;
  initialAttemptCount?: 0 | 1;
  nextAttemptAt?: number | null;
  failureCategory?: PendingMutationFailureCategory | null;
  now?: number;
}): PendingMutationRecord => {
  const now = input.now ?? Date.now();
  return parsePendingMutationRecord({
    schemaVersion: PENDING_MUTATION_SCHEMA_VERSION,
    mutationId: input.mutationId,
    operationId: input.operationId,
    userId: input.scope.userId,
    organizationId: input.scope.organizationId,
    tenantId: input.scope.tenantId,
    stepCode: input.stepCode,
    body: input.body,
    revisionEvidence: {
      revision: { value: input.expectedRevision },
      projectionIdentity: {
        templateVersion: input.templateVersion,
        capabilityRevision: input.capabilityRevision,
      },
    },
    idempotencyKey: input.idempotencyKey,
    state: 'PENDING',
    enqueuedAt: now,
    updatedAt: now,
    expiresAt: now + PENDING_MUTATION_EXPIRY_MS,
    attemptCount: input.initialAttemptCount ?? 0,
    nextAttemptAt: input.nextAttemptAt ?? null,
    failureCategory: input.failureCategory ?? null,
  });
};

const ALLOWED_TRANSITIONS: Readonly<
  Record<PendingMutationState, readonly PendingMutationState[]>
> = Object.freeze({
  PENDING: Object.freeze<PendingMutationState[]>([
    'REPLAYING',
    'MANUAL_ACTION_REQUIRED',
    'DISCARDED',
    'EXPIRED',
  ]),
  REPLAYING: Object.freeze<PendingMutationState[]>([
    'PENDING',
    'CONFLICT_BLOCKED',
    'MANUAL_ACTION_REQUIRED',
    'SUCCEEDED',
    'EXPIRED',
  ]),
  CONFLICT_BLOCKED: Object.freeze<PendingMutationState[]>([
    'PENDING',
    'MANUAL_ACTION_REQUIRED',
    'DISCARDED',
    'EXPIRED',
  ]),
  MANUAL_ACTION_REQUIRED: Object.freeze<PendingMutationState[]>([
    'PENDING',
    'DISCARDED',
    'EXPIRED',
  ]),
  SUCCEEDED: Object.freeze<PendingMutationState[]>([]),
  DISCARDED: Object.freeze<PendingMutationState[]>([]),
  EXPIRED: Object.freeze<PendingMutationState[]>(['DISCARDED']),
});

export const transitionPendingMutation = (
  record: PendingMutationRecord,
  input: {
    state: PendingMutationState;
    now?: number;
    attemptCount?: number;
    nextAttemptAt?: number | null;
    failureCategory?: PendingMutationFailureCategory | null;
  }
): PendingMutationRecord => {
  if (!ALLOWED_TRANSITIONS[record.state].includes(input.state)) {
    return fail('INVALID_TRANSITION', 'pending_mutation.transition_invalid');
  }
  const now = input.now ?? Date.now();
  return parsePendingMutationRecord({
    ...record,
    state: input.state,
    updatedAt: now,
    attemptCount: input.attemptCount ?? record.attemptCount,
    nextAttemptAt: input.nextAttemptAt ?? null,
    failureCategory: input.failureCategory ?? null,
  });
};

export const expirePendingMutation = (
  record: PendingMutationRecord,
  now = Date.now()
): PendingMutationRecord => {
  if (now < record.expiresAt) return record;
  if (record.state === 'EXPIRED') return record;
  if (record.state === 'SUCCEEDED' || record.state === 'DISCARDED') return record;
  return transitionPendingMutation(record, {
    state: 'EXPIRED',
    now,
    failureCategory: null,
  });
};

export const isTerminalPendingMutation = (
  record: PendingMutationRecord
): boolean =>
  record.state === 'SUCCEEDED' ||
  record.state === 'DISCARDED' ||
  record.state === 'EXPIRED';

export const isTerminalMutationRetentionExpired = (
  record: PendingMutationRecord,
  now = Date.now()
): boolean =>
  isTerminalPendingMutation(record) &&
  now >= record.updatedAt + TERMINAL_MUTATION_RETENTION_MS;
