import React from 'react';
import { render } from '@testing-library/react-native';
import { StepDetailScreen } from '../../features/onboarding/presentation/pages/StepDetailScreen';

const doctor = {
  requirementId: 'validation.staff.min_doctor',
  satisfied: false,
  currentValue: 0,
  requiredValue: 1,
  titleToken: 'onboarding.requirements.validation.staff.min_doctor.title',
  helpToken: null,
  blockerToken: 'validation.staff.min_doctor',
  correctiveAction: null,
};

const therapist = {
  ...doctor,
  requirementId: 'validation.staff.min_therapist',
  titleToken: 'onboarding.requirements.validation.staff.min_therapist.title',
  blockerToken: 'validation.staff.min_therapist',
};

let mockRequirements = [doctor];

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ tenantId: 'tenant-1', stepCode: 'staff_and_roles' }),
}));

jest.mock('../../features/onboarding/presentation/hooks/useJourneyFoundation', () => ({
  useJourneyFoundation: () => ({
    isLoading: false,
    projection: {
      resolvedSteps: [{
        stepId: 'staff_and_roles',
        titleToken: 'onboarding.steps.staff_and_roles.title',
        helpToken: null,
        requirements: mockRequirements,
        blockers: mockRequirements.filter(requirement => !requirement.satisfied),
        rendererKey: 'staff',
      }],
    },
  }),
}));

jest.mock('../../features/onboarding/presentation/renderers/onboardingRendererRegistry', () => ({
  OnboardingRenderer: () => null,
}));

jest.mock('../../features/onboarding/presentation/config/onboardingPresentationRegistry', () => ({
  translateOnboardingToken: (token: string | null) => token ?? '',
}));

jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (token: string) => token }),
}));

describe('Staff & Roles projection presentation', () => {
  it('shows only the Doctor requirement for a consultation-only resolved projection', () => {
    mockRequirements = [doctor];
    const { getByText, queryByText } = render(<StepDetailScreen />);

    expect(getByText(doctor.titleToken)).toBeTruthy();
    expect(queryByText(therapist.titleToken)).toBeNull();
  });

  it('renders any additional staff requirement only when the backend includes it', () => {
    mockRequirements = [doctor, therapist];
    const { getByText } = render(<StepDetailScreen />);

    expect(getByText(doctor.titleToken)).toBeTruthy();
    expect(getByText(therapist.titleToken)).toBeTruthy();
  });
});
