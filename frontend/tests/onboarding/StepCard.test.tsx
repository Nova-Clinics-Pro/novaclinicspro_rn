/** Projection-derived StepCard tests. */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StepCard } from '../../features/onboarding/presentation/components/StepCard';
import type { JourneyCardModel } from '../../features/onboarding/domain/entities/journey.entity';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB' },
      text: {
        primary: '#111827',
        secondary: '#6B7280',
        disabled: '#9CA3AF',
        link: '#2563EB',
      },
      feedback: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        errorLight: '#FEE2E2',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xxl: 48 },
    typography: {
      h6: { fontSize: 16, fontWeight: '600' },
      body2: { fontSize: 14, fontWeight: '400' },
      caption: { fontSize: 12 },
      button: { fontSize: 14, fontWeight: '600' },
    },
  }),
}));

describe('StepCard', () => {
  const onPress = jest.fn();
  const createJourneyCard = (
    overrides: Partial<JourneyCardModel> = {}
  ): JourneyCardModel => ({
    cardId: 'card.staff_setup',
    stepCode: 'staff_setup',
    stageId: 'review_and_personalize',
    titleKey: 'onboarding.progressiveExperience.stepLabels.staffAndRoles',
    descriptionKey: 'onboarding.progressiveExperience.flow.staffDescription',
    actionLabelKey: 'onboarding.progressiveExperience.routes.reviewStep',
    destination: { kind: 'wizard_step', stepCode: 'staff_setup' },
    iconToken: 'people-outline',
    status: 'in_progress',
    isEligible: true,
    isVisible: true,
    isActionable: true,
    order: 0,
    ...overrides,
  });

  beforeEach(() => onPress.mockClear());

  it('renders projection-derived localized content without raw identifiers', () => {
    const { getByText, queryByText } = render(
      <StepCard journeyCard={createJourneyCard()} onPress={onPress} />
    );

    expect(getByText('Staff & Roles')).toBeTruthy();
    expect(getByText(/Review staff members/)).toBeTruthy();
    expect(getByText('In progress')).toBeTruthy();
    expect(queryByText('Review Step')).toBeNull();
    expect(queryByText('staff_setup')).toBeNull();
  });

  it('uses canonical card status and actionability', () => {
    const { getByRole, getByText } = render(
      <StepCard
        journeyCard={createJourneyCard({ status: 'complete', isActionable: true })}
        onPress={onPress}
      />
    );

    expect(getByText('Complete')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not display an unavailable action for a complete card without a corrective action', () => {
    const { getByText, queryByText } = render(
      <StepCard
        journeyCard={createJourneyCard({
          status: 'complete',
          isActionable: false,
          actionLabelKey: null,
        })}
        onPress={onPress}
      />
    );

    expect(getByText('Complete')).toBeTruthy();
    expect(queryByText('This action is currently unavailable')).toBeNull();
  });

  it('does not compete with the selected-step CTA for a blocked card', () => {
    const { getByText, queryByText } = render(
      <StepCard
        journeyCard={createJourneyCard({
          status: 'blocked',
          isActionable: true,
          actionLabelKey: 'onboarding.actions.manage_rooms.label',
        })}
        onPress={onPress}
      />
    );

    expect(getByText('Blocked')).toBeTruthy();
    expect(queryByText('Manage rooms and beds')).toBeNull();
  });

  it('exposes disabled accessibility semantics from the canonical card', () => {
    const { getByRole } = render(
      <StepCard
        journeyCard={createJourneyCard({ status: 'unavailable', isActionable: false })}
        onPress={onPress}
      />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toContain('Unavailable');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
