import {
  createPendingMutationExecutor,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { StepSubmissionDatasourceError } from '../../features/onboarding/data/models/onboarding.dtos';
import {
  ONBOARDING_STEP_SUBMIT_OPERATION,
  createPendingMutationRecord,
  type PendingMutationRecord,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const revision = `step-rev-v1:${'a'.repeat(64)}`;
const response = {
  step_code: 'operating_hours',
  status: 'completed' as const,
  created_entities: [],
  validation_errors: [],
  next_step: null,
  message: 'completed',
  revision: `step-rev-v1:${'b'.repeat(64)}`,
  template_version: 'template-v1',
  capability_revision: `cap-v1:${'c'.repeat(64)}`,
};

const record = (): PendingMutationRecord =>
  createPendingMutationRecord({
    mutationId: 'mutation-1',
    operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
    scope: {
      userId: 'user-1',
      organizationId: 'org-1',
      tenantId: 'tenant-1',
    },
    stepCode: 'operating_hours',
    body: {
      operating_hours: [
        {
          day: 'monday',
          is_open: true,
          open_time: '09:00',
          close_time: '17:00',
        },
      ],
    },
    expectedRevision: revision,
    templateVersion: 'template-v1',
    capabilityRevision: `cap-v1:${'c'.repeat(64)}`,
    idempotencyKey: 'original-key',
    now: 1,
  });

describe('TG24.3 pending mutation datasource/repository integration', () => {
  const submitStep = jest.fn();
  const invalidateCurrentStatus = jest.fn();
  const execute = createPendingMutationExecutor({
    submitStep,
    invalidateCurrentStatus,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    submitStep.mockResolvedValue(response);
    invalidateCurrentStatus.mockResolvedValue(undefined);
  });

  it('executes only the allowlisted step using original scope, body, revision and idempotency identity', async () => {
    const controller = new AbortController();

    await expect(execute(record(), controller.signal)).resolves.toEqual({
      status: 'SUCCEEDED',
    });

    expect(submitStep).toHaveBeenCalledWith(
      'tenant-1',
      'operating_hours',
      {
        data: {
          operating_hours: [
            {
              day: 'monday',
              is_open: true,
              open_time: '09:00',
              close_time: '17:00',
            },
          ],
        },
        mark_complete: true,
        expected_revision: revision,
      },
      'original-key',
      {
        signal: controller.signal,
        skipAuthRefreshRetry: true,
      }
    );
    expect(invalidateCurrentStatus).toHaveBeenCalledWith('org-1', 'tenant-1');
  });

  it('rejects a mutated arbitrary operation before transport execution', async () => {
    const unsupported = {
      ...record(),
      operationId: 'http.request.v1',
    } as unknown as PendingMutationRecord;

    await expect(
      execute(unsupported, new AbortController().signal)
    ).resolves.toEqual({
      status: 'TERMINAL_FAILURE',
      category: 'UNSUPPORTED',
    });
    expect(submitStep).not.toHaveBeenCalled();
  });

  it('delegates E6 conflict without replacing queued revision evidence', async () => {
    const queued = record();
    submitStep.mockRejectedValueOnce(
      new StepSubmissionDatasourceError(
        'STALE_REVISION',
        'onboarding.step_revision_conflict',
        'errors.onboarding.stepRevisionConflict',
        false,
        {
          classification: 'STALE_REVISION',
          step_code: queued.stepCode,
          current_revision: `step-rev-v1:${'d'.repeat(64)}`,
          template_version: 'template-v2',
          capability_revision: `cap-v1:${'e'.repeat(64)}`,
        }
      )
    );

    await expect(
      execute(queued, new AbortController().signal)
    ).resolves.toEqual({ status: 'E6_CONFLICT' });
    expect(queued.revisionEvidence.revision.value).toBe(revision);
    expect(invalidateCurrentStatus).not.toHaveBeenCalled();
  });

  it.each([
    ['UNAUTHORIZED', 'AUTHENTICATION'],
    ['FORBIDDEN', 'AUTHORIZATION'],
    ['TENANT_MISMATCH', 'SCOPE_MISMATCH'],
    ['ORGANIZATION_MISMATCH', 'SCOPE_MISMATCH'],
    ['VALIDATION', 'VALIDATION'],
    ['UNSUPPORTED', 'UNSUPPORTED'],
    ['MALFORMED_CONFLICT', 'MALFORMED_RESPONSE'],
    ['IDEMPOTENCY_CONFLICT', 'IDEMPOTENCY_CONFLICT'],
  ] as const)('maps %s to terminal %s', async (kind, category) => {
    submitStep.mockRejectedValueOnce(
      new StepSubmissionDatasourceError(
        kind,
        'safe.code',
        'errors.safe',
        false
      )
    );

    await expect(
      execute(record(), new AbortController().signal)
    ).resolves.toEqual({ status: 'TERMINAL_FAILURE', category });
    expect(invalidateCurrentStatus).not.toHaveBeenCalled();
  });

  it.each([
    ['NETWORK', 'NETWORK'],
    ['TIMEOUT', 'TIMEOUT'],
    ['BACKEND_FAILURE', 'RETRYABLE_SERVER'],
  ] as const)('maps retryable %s to %s', async (kind, category) => {
    submitStep.mockRejectedValueOnce(
      new StepSubmissionDatasourceError(
        kind,
        'safe.code',
        'errors.safe',
        true
      )
    );

    await expect(
      execute(record(), new AbortController().signal)
    ).resolves.toEqual({ status: 'RETRYABLE_FAILURE', category });
  });

  it('maps cancellation without invalidating current data', async () => {
    submitStep.mockRejectedValueOnce(
      new StepSubmissionDatasourceError(
        'CANCELLED',
        'safe.code',
        'errors.safe',
        false
      )
    );

    await expect(
      execute(record(), new AbortController().signal)
    ).resolves.toEqual({ status: 'CANCELLED' });
    expect(invalidateCurrentStatus).not.toHaveBeenCalled();
  });

  it('fails closed on malformed success evidence', async () => {
    submitStep.mockResolvedValueOnce({
      ...response,
      revision: null,
    });

    await expect(
      execute(record(), new AbortController().signal)
    ).resolves.toEqual({
      status: 'TERMINAL_FAILURE',
      category: 'MALFORMED_RESPONSE',
    });
    expect(invalidateCurrentStatus).not.toHaveBeenCalled();
  });
});
