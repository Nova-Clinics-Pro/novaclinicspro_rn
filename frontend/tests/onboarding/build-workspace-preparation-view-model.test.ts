import {
  InvalidWorkspacePreparationProjectionError,
  UnsupportedWorkspacePreparationContractError,
  WorkspacePreparationError,
} from '../../features/onboarding/domain/entities/workspace-preparation.entity';
import {
  buildWorkspacePreparationViewModel,
  deriveWorkspacePreparationState,
  translateWorkspacePreparationError,
} from '../../features/onboarding/domain/usecases/build-workspace-preparation-view-model.usecase';

const projection = () => ({
  contractVersion: 'workspace_preparation_v1',
  runId: 'run-1',
  state: 'PREPARING',
  aggregateVersion: 3,
  progress: { completed: 1, total: 4, indeterminate: false },
  units: [
    {
      code: 'TENANT_FOUNDATION',
      outcome: 'SATISFIED',
      evidenceVersion: 'tenant_foundation_v1',
      attempt: 1,
      observedAt: '2026-07-21T12:00:00Z',
      recordedAt: '2026-07-21T12:00:01Z',
    },
  ],
  reasonCode: null,
  retryAllowed: false,
  userRetryCount: 0,
  maxUserRetries: 3,
  nextAction: 'WAIT',
  refreshAfterSeconds: 2,
  supportCorrelationId: 'correlation-1',
  updatedAt: '2026-07-21T12:00:01Z',
});

describe('buildWorkspacePreparationViewModel', () => {
  it('maps safe transport primitives into domain dates and camel-case fields', () => {
    const result = buildWorkspacePreparationViewModel(projection());
    expect(result.state).toBe('PREPARING');
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.units[0].observedAt).toBeInstanceOf(Date);
    expect(result.progress).toEqual({ completed: 1, total: 4, indeterminate: false });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.progress)).toBe(true);
    expect(Object.isFrozen(result.units)).toBe(true);
  });

  it('derives evidence-only progress, remaining units, and retry availability', () => {
    const result = deriveWorkspacePreparationState(
      buildWorkspacePreparationViewModel({
        ...projection(),
        state: 'RETRYABLE_FAILURE',
        retryAllowed: true,
        userRetryCount: 2,
        reasonCode: 'TRANSIENT_DEPENDENCY_FAILURE',
        nextAction: 'RETRY',
        refreshAfterSeconds: null,
      })
    );
    expect(result.progress.percentage).toBe(25);
    expect(result.progress.completedUnits).toEqual(['TENANT_FOUNDATION']);
    expect(result.progress).toMatchObject({
      currentUnit: null,
      completed: 1,
      total: 4,
    });
    expect(result.progress.remainingUnits).toEqual([
      'ACCESS_FOUNDATION',
      'ONBOARDING_FOUNDATION',
      'PERSONALIZATION_HANDOFF',
    ]);
    expect(result.retry).toEqual({
      available: true,
      exhausted: false,
      used: 2,
      maximum: 3,
      remaining: 1,
    });
    expect(result.failure.kind).toBe('RETRYABLE');
  });

  it('derives retry exhaustion without granting another retry', () => {
    const result = deriveWorkspacePreparationState(
      buildWorkspacePreparationViewModel({
        ...projection(),
        state: 'RETRYABLE_FAILURE',
        retryAllowed: true,
        userRetryCount: 3,
        reasonCode: 'RETRY_LIMIT_REACHED',
        nextAction: 'CONTACT_SUPPORT',
        refreshAfterSeconds: null,
      })
    );
    expect(result.retry).toMatchObject({ available: false, exhausted: true, remaining: 0 });
  });

  it('requires complete authoritative evidence before personalization availability', () => {
    const incomplete = deriveWorkspacePreparationState(
      buildWorkspacePreparationViewModel({
        ...projection(),
        state: 'PERSONALIZATION_AVAILABLE',
        nextAction: 'ENTER_PERSONALIZATION',
        refreshAfterSeconds: null,
      })
    );
    expect(incomplete.personalizationAvailable).toBe(false);

    const units = ['TENANT_FOUNDATION', 'ACCESS_FOUNDATION', 'ONBOARDING_FOUNDATION', 'PERSONALIZATION_HANDOFF'].map(
      (code, index) => ({
        code,
        outcome: 'SATISFIED',
        evidenceVersion: `${code.toLowerCase()}_v1`,
        attempt: 1,
        observedAt: `2026-07-21T12:00:0${index}Z`,
        recordedAt: `2026-07-21T12:00:0${index}Z`,
      })
    );
    const complete = deriveWorkspacePreparationState(
      buildWorkspacePreparationViewModel({
        ...projection(),
        state: 'PERSONALIZATION_AVAILABLE',
        progress: { completed: 4, total: 4, indeterminate: false },
        units,
        nextAction: 'ENTER_PERSONALIZATION',
        refreshAfterSeconds: null,
      })
    );
    expect(complete.personalizationAvailable).toBe(true);
  });

  it('translates typed and unknown errors into safe domain failures', () => {
    expect(
      translateWorkspacePreparationError(
        new WorkspacePreparationError('workspace_preparation.stale_version', 'safe.token', true)
      )
    ).toEqual({
      kind: 'RETRYABLE',
      reasonCode: 'workspace_preparation.stale_version',
      messageToken: 'safe.token',
    });
    expect(translateWorkspacePreparationError(new Error('provider secret'))).toEqual({
      kind: 'RETRYABLE',
      reasonCode: 'workspace_preparation.execution_failure',
      messageToken: 'errors.workspacePreparation.execution_failure',
    });
  });

  it('fails closed for an unknown contract version', () => {
    expect(() =>
      buildWorkspacePreparationViewModel({ ...projection(), contractVersion: 'future_v2' })
    ).toThrow(UnsupportedWorkspacePreparationContractError);
  });

  it('fails closed for unknown states and impossible progress', () => {
    expect(() =>
      buildWorkspacePreparationViewModel({ ...projection(), state: 'UNKNOWN' })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
    expect(() =>
      buildWorkspacePreparationViewModel({
        ...projection(),
        progress: { completed: 5, total: 4, indeterminate: false },
      })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
    expect(() =>
      buildWorkspacePreparationViewModel({
        ...projection(),
        units: [{ ...projection().units[0], code: 'UNKNOWN_UNIT' }],
      })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
  });

  it.each([
    ['PENDING', 'START'],
    ['PREPARING', 'REFRESH'],
  ] as const)('accepts backend-authoritative %s/%s projection', (state, nextAction) => {
    expect(
      buildWorkspacePreparationViewModel({ ...projection(), state, nextAction }).nextAction
    ).toBe(nextAction);
  });

  it('fails closed for invalid state/action, refresh, evidence, and reason combinations', () => {
    expect(() =>
      buildWorkspacePreparationViewModel({ ...projection(), nextAction: 'CONTACT_SUPPORT' })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
    expect(() =>
      buildWorkspacePreparationViewModel({ ...projection(), refreshAfterSeconds: 31 })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
    expect(() =>
      buildWorkspacePreparationViewModel({ ...projection(), reasonCode: 'RAW_BACKEND_REASON' })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
    expect(() =>
      buildWorkspacePreparationViewModel({
        ...projection(),
        progress: { completed: 2, total: 4, indeterminate: false },
      })
    ).toThrow(InvalidWorkspacePreparationProjectionError);
  });
});
