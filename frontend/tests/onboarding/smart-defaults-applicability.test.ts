import { buildOnboardingRuntime } from '../../features/onboarding/domain/usecases/build-onboarding-runtime.usecase';
import type { JourneyVisibilityProjection } from '../../features/onboarding/domain/entities/journey-visibility.entity';

const projection: JourneyVisibilityProjection = {
  identity: { contractVersion: '1.0', templateVersion: 'template-a', capabilityRevision: 'capability-a', tenantId: 'tenant-a' },
  projectedAt: new Date('2026-10-23T00:00:00Z'),
  projectionRevision: 'revision-a',
  visibleSteps: [],
  resolvedSteps: [
    {
      stepId: 'clinic_profile', order: 0, rendererKey: 'clinic_profile', applicable: true, required: true,
      state: 'NOT_STARTED', titleToken: 'profile', helpToken: null, requirements: [], blockers: [], correctiveActions: [], managementActions: [], presentation: {},
    },
    {
      stepId: 'specialty-only-rooms', order: 1, rendererKey: 'rooms', applicable: false, required: false,
      state: 'NOT_APPLICABLE', titleToken: 'rooms', helpToken: null, requirements: [], blockers: [], correctiveActions: [], managementActions: [], presentation: {},
    },
  ],
};

describe('smart-default applicability boundary', () => {
  it('uses the template/capability-resolved applicability result without client specialty defaults', () => {
    const runtime = buildOnboardingRuntime(projection, null);

    expect(runtime.visibleSteps.map(step => step.stepId)).toEqual(['clinic_profile']);
    expect(runtime.recommendedNextStepId).toBe('clinic_profile');
  });
});
