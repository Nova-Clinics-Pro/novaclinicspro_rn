import { buildJourneyViewModelFromVisibilityProjection } from '../../features/onboarding/domain/usecases/build-journey-view-model.usecase';
import { selectRendererAction } from '../../features/onboarding/presentation/renderers/rendererActionSelection';
import type {
  JourneyCorrectiveAction,
  JourneyResolvedStep,
  JourneyVisibilityProjection,
} from '../../features/onboarding/domain/entities/journey-visibility.entity';

const action: JourneyCorrectiveAction = {
  kind: 'NAVIGATE' as const,
  target: 'manage_clinic_profile',
  destination: 'clinic.profile',
  requiredParams: ['tenant_id', 'step_id'],
  labelToken: 'onboarding.actions.manage_clinic_profile.label',
  availability: 'AVAILABLE' as const,
  fallbackToken: 'onboarding.actions.unavailable',
};

const projection = (
  state: JourneyResolvedStep['state'],
  correctiveActions = [action],
  managementActions = [action],
): JourneyVisibilityProjection => ({
  identity: { contractVersion: '1.0', templateVersion: '1.0', capabilityRevision: 'cap-v1:' + 'a'.repeat(64), tenantId: 'tenant-a' },
  projectedAt: new Date(), projectionRevision: 'projection-a', visibleSteps: [],
  resolvedSteps: [{ stepId: 'clinic_profile', order: 0, rendererKey: 'clinic_profile', applicable: true, required: true, state, titleToken: 'profile.title', helpToken: null, requirements: [], blockers: [], correctiveActions, managementActions, presentation: {} }],
});

describe('canonical management actions', () => {
  it('uses a management action for a complete step', () => {
    const card = buildJourneyViewModelFromVisibilityProjection(projection('COMPLETE')).cards[0];
    expect(card.isActionable).toBe(true);
    expect(card.action?.target).toBe('manage_clinic_profile');
  });

  it('uses corrective action for a blocked step even when management actions exist', () => {
    const corrective = { ...action, target: 'manage_operating_hours', destination: 'clinic.operating_hours' };
    const card = buildJourneyViewModelFromVisibilityProjection(projection('BLOCKED', [corrective], [action])).cards[0];
    expect(card.action?.target).toBe('manage_operating_hours');
  });

  it.each([
    ['NOT_STARTED', 'not_started'],
    ['IN_PROGRESS', 'in_progress'],
    ['BLOCKED', 'blocked'],
  ] as const)(
    'uses backend corrective action for %s and preserves %s card state',
    (state, status) => {
      const corrective = {
        ...action,
        target: 'manage_operating_hours',
        destination: 'clinic.operating_hours',
      };
      const card = buildJourneyViewModelFromVisibilityProjection(
        projection(state, [corrective]),
      ).cards[0];

      expect(card.status).toBe(status);
      expect(card.action?.target).toBe('manage_operating_hours');
    },
  );

  it('keeps a complete step reopenable even when it has no management action', () => {
    const card = buildJourneyViewModelFromVisibilityProjection(
      projection('COMPLETE', [action], []),
    ).cards[0];

    expect(card.isActionable).toBe(true);
    expect(card.action).toBeNull();
  });

  it('excludes non-applicable steps from the journey without assigning a UI state', () => {
    expect(
      buildJourneyViewModelFromVisibilityProjection(
        projection('NOT_APPLICABLE'),
      ).cards,
    ).toEqual([]);
  });

  it('uses backend-declared actions for each incomplete state and never falls back to corrective action for complete state', () => {
    const corrective = {
      ...action,
      target: 'configure_operating_hours',
      destination: 'clinic.operating_hours',
    };
    const unavailableManagement = { ...action, availability: 'UNAVAILABLE' as const };

    expect(selectRendererAction(projection('NOT_STARTED', [corrective]).resolvedSteps[0]))
      .toMatchObject({ target: 'configure_operating_hours' });
    expect(selectRendererAction(projection('IN_PROGRESS', [corrective]).resolvedSteps[0]))
      .toMatchObject({ target: 'configure_operating_hours' });
    expect(selectRendererAction(projection('BLOCKED', [corrective]).resolvedSteps[0]))
      .toMatchObject({ target: 'configure_operating_hours' });
    expect(selectRendererAction(projection('COMPLETE', [corrective], [unavailableManagement]).resolvedSteps[0]))
      .toMatchObject({ target: 'manage_clinic_profile', availability: 'UNAVAILABLE' });
  });
});
