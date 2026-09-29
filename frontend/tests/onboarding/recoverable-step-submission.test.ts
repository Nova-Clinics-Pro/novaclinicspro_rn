import { executeRecoverableStepSubmission } from '../../features/onboarding/application/recoverable-step-submission';
import { StepConflictError } from '../../features/onboarding/domain/entities/step-revision.entity';

const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};

const input = (overrides: Record<string, unknown> = {}) => ({
  coordinator: {
    enqueue: jest.fn().mockResolvedValue({
      status: 'ENQUEUED',
      record: { mutationId: 'mutation-1' },
    }),
  },
  mutationId: 'mutation-1',
  idempotencyKey: 'original-idempotency-key',
  scope,
  stepCode: 'operating_hours',
  body: {
    operating_hours: [{ day: 'Monday', is_open: true }],
  },
  expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
  templateVersion: 'template-v1',
  capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
  connectivityAtAttempt: 'ONLINE' as const,
  submit: jest.fn().mockRejectedValue(
    new StepConflictError(
      'BACKEND_FAILURE',
      'onboarding.step_submission_network_failure',
      'errors.onboarding.stepSubmissionNetworkFailure',
      true
    )
  ),
  ...overrides,
});

describe('E7 production enqueue authority', () => {
  it('enqueues exactly once after an approved transient production submission failure', async () => {
    const request = input();

    const result = await executeRecoverableStepSubmission(request);

    expect(result.status).toBe('QUEUED');
    expect(request.submit).toHaveBeenCalledTimes(1);
    expect(request.coordinator.enqueue).toHaveBeenCalledTimes(1);
  });

  it('never enqueues a successful online submission', async () => {
    const request = input({
      submit: jest.fn().mockResolvedValue({ step_code: 'operating_hours' }),
    });

    await expect(executeRecoverableStepSubmission(request)).resolves.toEqual({
      status: 'SUBMITTED',
      response: { step_code: 'operating_hours' },
    });
    expect(request.coordinator.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    [
      'validation',
      new StepConflictError(
        'BACKEND_FAILURE',
        'onboarding.step_submission_validation_failed',
        'errors.onboarding.stepSubmissionValidationFailed',
        false
      ),
    ],
    [
      'authorization',
      new StepConflictError(
        'FORBIDDEN',
        'onboarding.step_submission_forbidden',
        'errors.onboarding.stepSubmissionForbidden',
        false
      ),
    ],
  ])('never enqueues a %s failure', async (_name, error) => {
    const request = input({ submit: jest.fn().mockRejectedValue(error) });

    await expect(executeRecoverableStepSubmission(request)).rejects.toBe(error);
    expect(request.coordinator.enqueue).not.toHaveBeenCalled();
  });

  it('never enqueues an unsupported operation or prohibited payload', async () => {
    const transient = new StepConflictError(
      'BACKEND_FAILURE',
      'onboarding.step_submission_network_failure',
      'errors.onboarding.stepSubmissionNetworkFailure',
      true
    );
    const unsupported = input({
      stepCode: 'clinic_profile',
      submit: jest.fn().mockRejectedValue(transient),
    });
    await expect(executeRecoverableStepSubmission(unsupported)).rejects.toBe(
      transient
    );
    expect(unsupported.coordinator.enqueue).not.toHaveBeenCalled();

    const prohibited = input({
      body: {
        operating_hours: [{ day: 'Monday', is_open: true }],
        token: 'must-not-persist',
      },
    });
    await expect(
      executeRecoverableStepSubmission(prohibited)
    ).rejects.toBeInstanceOf(StepConflictError);
    expect(prohibited.coordinator.enqueue).not.toHaveBeenCalled();
  });

  it('preserves original identity, evidence, scope, and approved payload', async () => {
    const request = input();

    await executeRecoverableStepSubmission(request);

    expect(request.coordinator.enqueue).toHaveBeenCalledWith({
      mutationId: 'mutation-1',
      idempotencyKey: 'original-idempotency-key',
      scope,
      stepCode: 'operating_hours',
      body: {
        operating_hours: [{ day: 'Monday', is_open: true }],
      },
      expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
      templateVersion: 'template-v1',
      capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
      originalFailure: 'NETWORK',
      connectivityAtAttempt: 'ONLINE',
    });
  });

  it('returns the existing coordinator duplicate result without a second enqueue', async () => {
    const enqueue = jest.fn().mockResolvedValue({
      status: 'DUPLICATE',
      record: { mutationId: 'mutation-1' },
    });
    const request = input({ coordinator: { enqueue } });

    const result = await executeRecoverableStepSubmission(request);

    expect(result).toEqual({
      status: 'QUEUED',
      queueResult: {
        status: 'DUPLICATE',
        record: { mutationId: 'mutation-1' },
      },
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('preserves TG23 stale-revision ownership without enqueueing', async () => {
    const stale = new StepConflictError(
      'STALE_REVISION',
      'onboarding.step_revision_conflict',
      'errors.onboarding.stepRevisionConflict',
      false
    );
    const request = input({ submit: jest.fn().mockRejectedValue(stale) });

    await expect(executeRecoverableStepSubmission(request)).rejects.toBe(stale);
    expect(request.coordinator.enqueue).not.toHaveBeenCalled();
  });
});
