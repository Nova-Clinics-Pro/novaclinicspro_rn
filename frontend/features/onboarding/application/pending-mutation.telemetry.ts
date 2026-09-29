import type {
  PendingMutationFailureCategory,
  PendingMutationRecord,
} from '../domain/entities/pending-mutation.entity';

export type PendingMutationTelemetryEventName =
  | 'ENQUEUED'
  | 'REPLAY_STARTED'
  | 'REPLAY_SUCCEEDED'
  | 'REPLAY_FAILED'
  | 'CONFLICT_BLOCKED'
  | 'MANUAL_RECOVERY'
  | 'DISCARDED'
  | 'EXPIRED'
  | 'TERMINAL_OUTCOME';

export interface PendingMutationTelemetryEvent {
  readonly name: PendingMutationTelemetryEventName;
  readonly mutationId: string;
  readonly operationId: PendingMutationRecord['operationId'];
  readonly userId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly attemptCount: number;
  readonly category: PendingMutationFailureCategory | null;
  readonly connectivity: 'ONLINE' | 'OFFLINE';
}

export interface PendingMutationTelemetry {
  emit(event: PendingMutationTelemetryEvent): void | Promise<void>;
}

export const noOpPendingMutationTelemetry: PendingMutationTelemetry =
  Object.freeze({
    emit: () => undefined,
  });
