import { buildOnboardingRuntime } from '../../features/onboarding/domain/usecases/build-onboarding-runtime.usecase';
import { buildJourneyViewModelFromVisibilityProjection } from '../../features/onboarding/domain/usecases/build-journey-view-model.usecase';
import type { JourneyVisibilityProjection } from '../../features/onboarding/domain/entities/journey-visibility.entity';

const projection = (states: readonly string[]): JourneyVisibilityProjection => ({
  identity: { contractVersion: '1.0', templateVersion: 'test', capabilityRevision: 'test', tenantId: 'tenant-1' },
  projectedAt: new Date(),
  projectionRevision: 'test',
  visibleSteps: states.map((state, order) => ({
    stepId: `step-${order}`,
    order,
    visibility: 'VISIBLE',
    progress: state === 'COMPLETE' ? 'COMPLETED' : 'INCOMPLETE',
  })),
  resolvedSteps: states.map((state, order) => ({
    stepId: `step-${order}`,
    order,
    rendererKey: 'clinic_profile',
    applicable: true,
    required: true,
    state: state as JourneyVisibilityProjection['resolvedSteps'][number]['state'],
    titleToken: null,
    helpToken: null,
    requirements: [],
    blockers: [],
    correctiveActions: [],
    managementActions: [],
    presentation: {},
  })),
});

describe('canonical wizard current-step selection', () => {
  it('selects the first backend-derived non-complete step only when no selection exists', () => {
    expect(buildOnboardingRuntime(projection(['COMPLETE', 'NOT_STARTED', 'IN_PROGRESS']), null).selectedStepIndex).toBe(1);
    expect(buildOnboardingRuntime(projection(['COMPLETE', 'IN_PROGRESS', 'BLOCKED']), null).selectedStepIndex).toBe(1);
  });

  it('preserves a valid non-linear selected step after another step remains incomplete', () => {
    const runtime = buildOnboardingRuntime(projection(['COMPLETE', 'IN_PROGRESS', 'NOT_STARTED']), 'step-2');
    expect(runtime.selectedStepId).toBe('step-2');
    expect(runtime.selectedStepIndex).toBe(2);
    expect(runtime.recommendedNextStepId).toBe('step-1');
  });

  it('keeps a user-selected complete step reopenable while the onboarding projection remains active', () => {
    const runtime = buildOnboardingRuntime(
      projection(['COMPLETE', 'NOT_STARTED']),
      'step-0',
    );

    expect(runtime.selectedStepId).toBe('step-0');
    expect(runtime.selectedStepIndex).toBe(0);
    expect(runtime.selectedStep?.status).toBe('completed');
    expect(runtime.selectedStep?.isOpenable).toBe(true);
    expect(runtime.nextNavigationStepId).toBe('step-1');
  });

  it('keeps complete setup steps openable without treating management metadata as a lock', () => {
    const runtime = buildOnboardingRuntime(
      projection(['COMPLETE', 'COMPLETE', 'IN_PROGRESS']),
      'step-1',
    );

    expect(runtime.selectedStep?.action).toBeNull();
    expect(runtime.selectedStep?.isOpenable).toBe(true);
  });

  it('keeps blocked steps action-gated and never exposes non-applicable steps', () => {
    const blocked = buildOnboardingRuntime(projection(['BLOCKED']), 'step-0');
    expect(blocked.selectedStep?.isOpenable).toBe(false);
    const base = projection(['NOT_APPLICABLE', 'COMPLETE']);
    const runtime = buildOnboardingRuntime(base, 'step-0');
    expect(runtime.visibleSteps.map(step => step.stepId)).toEqual(['step-1']);
  });

  it('projects every complete pre-activation card as openable without using a management action as a lock', () => {
    const cards = buildJourneyViewModelFromVisibilityProjection(
      projection(['COMPLETE', 'COMPLETE', 'IN_PROGRESS']),
    ).cards;

    expect(cards.slice(0, 2).map(card => card.isActionable)).toEqual([true, true]);
  });

  it('uses the central forward destination after the final completed setup step without reusing its management action', () => {
    const base = projection(['COMPLETE', 'COMPLETE', 'COMPLETE']);
    const value: JourneyVisibilityProjection = {
      ...base,
      resolvedSteps: base.resolvedSteps.map((step, index) => {
        if (index === 1) {
          return {
            ...step,
            managementActions: [{
              kind: 'NAVIGATE',
              target: 'manage_staff',
              destination: 'clinic.staff',
              requiredParams: ['tenant_id', 'step_id'],
              labelToken: 'onboarding.actions.manage_staff.label',
              availability: 'AVAILABLE',
              fallbackToken: 'onboarding.actions.unavailable',
            }],
          };
        }
        return index === 2 ? { ...step, rendererKey: 'go_live_review' } : step;
      }),
    };

    const runtime = buildOnboardingRuntime(value, 'step-1');

    expect(runtime.selectedStepId).toBe('step-1');
    expect(runtime.selectedStep?.action?.destination).toBe('clinic.staff');
    expect(runtime.nextNavigationStepId).toBe('step-2');
    expect(runtime.visibleSteps.find(step => step.stepId === runtime.nextNavigationStepId)?.step.rendererKey)
      .toBe('go_live_review');
  });

  it('does not advance an incomplete last setup step', () => {
    const runtime = buildOnboardingRuntime(
      projection(['COMPLETE', 'NOT_STARTED', 'COMPLETE']),
      'step-1',
    );

    expect(runtime.selectedStep?.status).toBe('not_started');
    expect(runtime.nextNavigationStepId).toBeNull();
  });

  it('uses terminal final visible position only after every step is complete', () => {
    expect(buildOnboardingRuntime(projection(['COMPLETE', 'COMPLETE']), null).selectedStepIndex).toBe(1);
  });
});
