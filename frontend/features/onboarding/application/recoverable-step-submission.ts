import {
  type EnqueuePendingMutationResult,
  type PendingMutationReplayCoordinator,
} from './pending-mutation-replay.coordinator';
import {
  type PendingMutationFailureCategory,
  type PendingMutationRecord,
  type PendingMutationScope,
  validateStepMutationBody,
} from '../domain/entities/pending-mutation.entity';
import { StepConflictError } from '../domain/entities/step-revision.entity';

export type RecoverableSubmissionResult<T> =
  | { readonly status: 'SUBMITTED'; readonly response: T }
  | {
      readonly status: 'QUEUED';
      readonly queueResult: EnqueuePendingMutationResult;
    };

export interface RecoverableStepSubmissionInput<T> {
  readonly coordinator: Pick<PendingMutationReplayCoordinator, 'enqueue'>;
  readonly mutationId: string;
  readonly idempotencyKey: string;
  readonly scope: PendingMutationScope;
  readonly stepCode: string;
  readonly body: unknown;
  readonly expectedRevision: string;
  readonly templateVersion: string;
  readonly capabilityRevision: string;
  readonly connectivityAtAttempt: 'ONLINE' | 'INDETERMINATE';
  readonly submit: () => Promise<T>;
}

const queueableStep = (
  stepCode: string
): stepCode is PendingMutationRecord['stepCode'] =>
  stepCode === 'operating_hours' ||
  stepCode === 'rooms_and_therapy_beds';

const retryCategory = (
  error: unknown
): Extract<
  PendingMutationFailureCategory,
  'NETWORK' | 'TIMEOUT' | 'RETRYABLE_SERVER'
> | null => {
  if (!(error instanceof StepConflictError) || !error.retryable) return null;
  if (error.code === 'onboarding.step_submission_network_failure') {
    return 'NETWORK';
  }
  if (error.code === 'onboarding.step_submission_timeout') return 'TIMEOUT';
  return error.kind === 'BACKEND_FAILURE' ? 'RETRYABLE_SERVER' : null;
};

/**
 * The single production enqueue initiation point for an original onboarding
 * step submission. It preserves the original identity/evidence and delegates
 * all durable validation, duplicate collapse, and fresh authority checks to
 * the existing replay coordinator.
 */
export const executeRecoverableStepSubmission = async <T>(
  input: RecoverableStepSubmissionInput<T>
): Promise<RecoverableSubmissionResult<T>> => {
  let safeBody: PendingMutationRecord['body'] | null = null;
  if (queueableStep(input.stepCode)) {
    try {
      safeBody = validateStepMutationBody(input.stepCode, input.body);
    } catch {
      safeBody = null;
    }
  }

  try {
    return { status: 'SUBMITTED', response: await input.submit() };
  } catch (error) {
    const originalFailure = retryCategory(error);
    if (!safeBody || !queueableStep(input.stepCode) || !originalFailure) {
      throw error;
    }
    const queueResult = await input.coordinator.enqueue({
      mutationId: input.mutationId,
      scope: input.scope,
      stepCode: input.stepCode,
      body: safeBody,
      expectedRevision: input.expectedRevision,
      templateVersion: input.templateVersion,
      capabilityRevision: input.capabilityRevision,
      idempotencyKey: input.idempotencyKey,
      originalFailure,
      connectivityAtAttempt: input.connectivityAtAttempt,
    });
    return { status: 'QUEUED', queueResult };
  }
};
