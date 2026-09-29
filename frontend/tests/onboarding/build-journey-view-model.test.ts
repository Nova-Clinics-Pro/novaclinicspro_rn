import { OnboardingStatus, StepStatus } from '../../features/onboarding/domain/entities/onboarding-status.entity';
import {
  JourneyCardDefinition,
  JourneyDefinition,
  PROGRESSIVE_EXPERIENCE_JOURNEY_ID,
} from '../../features/onboarding/domain/entities/journey.entity';
import {
  buildJourneyViewModel,
  calculateJourneyProgressPercentage,
} from '../../features/onboarding/domain/usecases/build-journey-view-model.usecase';

const card = (stepCode: string): JourneyCardDefinition => ({
  cardId: `card.${stepCode}`,
  stepCode,
  stageId: 'review_and_personalize',
  titleKey: `onboarding.journey.cards.${stepCode}.title`,
  descriptionKey: `onboarding.journey.cards.${stepCode}.description`,
  actionLabelKey: 'onboarding.journey.actions.openStep',
  destination: { kind: 'wizard_step', stepCode },
  iconToken: 'clipboard-outline',
});

const definition = (version = { major: 1, minor: 0, patch: 0 }): JourneyDefinition => ({
  id: PROGRESSIVE_EXPERIENCE_JOURNEY_ID,
  version,
  stepMappings: {
    clinic_profile: card('clinic_profile'),
    staff_setup: card('staff_setup'),
    services: card('services'),
  },
});

const step = (
  code: string,
  status: StepStatus['status'],
  isActionable = true
): StepStatus => ({
  code,
  status,
  isComplete: status === 'completed',
  isValid: status === 'completed',
  issues: [],
  blockedReason: status === 'blocked' ? 'blocked' : null,
  actionUrl: `/onboarding/${code}`,
  entityType: code,
  icon: 'clipboard',
  category: 'setup',
  isVisible: true,
  isActionable,
  evidenceAvailability: 'UNAVAILABLE',
  authoritativeEvidence: null,
});

const onboardingStatus = (overrides: Partial<OnboardingStatus> = {}): OnboardingStatus => ({
  tenantId: 'tenant-a',
  clinicType: 'specialty-neutral',
  totalSteps: 3,
  completedSteps: 1,
  completionPercentage: 33,
  currentStep: 'staff_setup',
  nextRecommendedStep: 'services',
  isReadyToGoLive: false,
  visibleSteps: ['staff_setup', 'clinic_profile', 'services'],
  actionableSteps: ['staff_setup', 'clinic_profile', 'services'],
  steps: new Map([
    ['clinic_profile', step('clinic_profile', 'completed')],
    ['staff_setup', step('staff_setup', 'in_progress')],
    ['services', step('services', 'blocked', false)],
  ]),
  ...overrides,
});

describe('buildJourneyViewModel', () => {
  it('derives display percentage from aggregate domain progress', () => {
    expect(calculateJourneyProgressPercentage({ completed: 2, total: 3 })).toBe(67);
    expect(calculateJourneyProgressPercentage({ completed: 0, total: 0 })).toBe(0);
  });

  it('preserves backend order and maps authoritative status and progress', () => {
    const result = buildJourneyViewModel(definition(), onboardingStatus());

    expect(result.availability).toBe('available');
    expect(result.identity.tenantId).toBe('tenant-a');
    expect(result.cards.map(({ stepCode, status, order, isActionable }) => ({
      stepCode,
      status,
      order,
      isActionable,
    }))).toEqual([
      { stepCode: 'staff_setup', status: 'in_progress', order: 0, isActionable: true },
      { stepCode: 'clinic_profile', status: 'complete', order: 1, isActionable: true },
      { stepCode: 'services', status: 'blocked', order: 2, isActionable: false },
    ]);
    expect(result.progress).toEqual({ completed: 1, total: 3 });
  });

  it('omits unknown steps and records diagnostics without changing known progress', () => {
    const result = buildJourneyViewModel(
      definition(),
      onboardingStatus({ visibleSteps: ['unknown_step', 'clinic_profile'] })
    );

    expect(result.cards.map((item) => item.stepCode)).toEqual(['clinic_profile']);
    expect(result.progress).toEqual({ completed: 1, total: 1 });
    expect(result.diagnostics.unknownStepCodes).toEqual(['unknown_step']);
  });

  it('keeps missing validation visible, non-actionable, and not complete', () => {
    const result = buildJourneyViewModel(
      definition(),
      onboardingStatus({ visibleSteps: ['staff_setup'], steps: new Map() })
    );

    expect(result.cards[0]).toMatchObject({
      stepCode: 'staff_setup',
      status: 'not_started',
      isActionable: false,
    });
    expect(result.progress).toEqual({ completed: 0, total: 1 });
    expect(result.diagnostics.missingValidationStepCodes).toEqual(['staff_setup']);
  });

  it('emits only the first duplicate visible step', () => {
    const result = buildJourneyViewModel(
      definition(),
      onboardingStatus({ visibleSteps: ['clinic_profile', 'clinic_profile'] })
    );

    expect(result.cards).toHaveLength(1);
    expect(result.diagnostics.duplicateStepCodes).toEqual(['clinic_profile']);
  });

  it('omits a structurally invalid destination', () => {
    const invalid = card('clinic_profile');
    invalid.destination = { kind: 'wizard_step', stepCode: 'staff_setup' };

    const result = buildJourneyViewModel(
      { ...definition(), stepMappings: { clinic_profile: invalid } },
      onboardingStatus({ visibleSteps: ['clinic_profile'] })
    );

    expect(result.cards).toEqual([]);
    expect(result.diagnostics.invalidDefinitionStepCodes).toEqual(['clinic_profile']);
  });

  it('fails closed for an unsupported major version', () => {
    const result = buildJourneyViewModel(definition({ major: 2, minor: 0, patch: 0 }), onboardingStatus());

    expect(result.availability).toBe('unsupported_version');
    expect(result.cards).toEqual([]);
    expect(result.progress).toEqual({ completed: 0, total: 0 });
  });

  it('derives each tenant projection from its own normalized status', () => {
    const first = buildJourneyViewModel(definition(), onboardingStatus());
    const second = buildJourneyViewModel(
      definition(),
      onboardingStatus({
        tenantId: 'tenant-b',
        visibleSteps: ['services'],
        steps: new Map([['services', step('services', 'not_started')]]),
      })
    );

    expect(first.identity.tenantId).toBe('tenant-a');
    expect(second.identity.tenantId).toBe('tenant-b');
    expect(second.cards.map((item) => item.stepCode)).toEqual(['services']);
  });
});
