import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

import {
  getCurrentStepScrollOffset,
  updateStepOffsets,
  WizardStepper,
} from '../../features/onboarding/presentation/components/WizardStepper';
import { getStepperScrollOffset } from '../../features/onboarding/presentation/components/wizardStepperGeometry';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text>{name}</Text> };
});
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      surface: { default: '#fff', elevated: '#eee' },
      border: { default: '#ddd' },
      primary: { default: '#060' },
      feedback: { success: '#0a0' },
      text: { primary: '#000', secondary: '#666', disabled: '#999', onPrimary: '#fff' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: { body2: {}, caption: {} },
  }),
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key === 'onboarding.progressiveExperience.flow.currentStepPosition'
        ? `Current step ${values?.current} of ${values?.total}`
        : key,
  }),
}));

describe('WizardStepper', () => {
  it('uses canonical completion rather than cursor position for checkmarks and progress', () => {
    const screen = render(
      <WizardStepper
        currentStepIndex={3}
        steps={[
          { code: 'clinic_profile', name: 'Clinic profile', status: 'completed', order: 0 },
          { code: 'hours', name: 'Hours', status: 'in_progress', order: 1 },
          { code: 'rooms', name: 'Rooms', status: 'blocked', order: 2 },
          { code: 'review', name: 'Review', status: 'not_started', order: 3 },
        ]}
      />,
    );

    expect(screen.getByText('Current step 4 of 4')).toBeTruthy();
    expect(screen.getAllByText('checkmark')).toHaveLength(1);
  });

  it('captures the primitive layout coordinate before scheduling the state update and keeps current-step scrolling', () => {
    const screen = render(
      <WizardStepper
        currentStepIndex={1}
        steps={[
          { code: 'profile', name: 'Profile', status: 'completed', order: 0 },
          { code: 'hours', name: 'Hours', status: 'not_started', order: 1 },
          { code: 'rooms', name: 'Rooms', status: 'in_progress', order: 2 },
          { code: 'staff', name: 'Staff', status: 'blocked', order: 3 },
          { code: 'review', name: 'Review', status: 'not_started', order: 4 },
        ]}
      />,
    );
    const layoutEvent = {
      nativeEvent: { layout: { x: 48, y: 0, width: 0, height: 0 } },
    } as LayoutChangeEvent;

    act(() => {
      screen.getByTestId('wizard-step-hours').props.onLayout(layoutEvent);
      layoutEvent.nativeEvent = null as never;
    });

    expect(screen.getAllByText('checkmark')).toHaveLength(1);
  });

  it('stores changed measurements and returns the same offsets object for an identical measurement', () => {
    const initial = { 0: 12 };
    expect(updateStepOffsets(initial, 1, 48)).toEqual({ 0: 12, 1: 48 });
    expect(updateStepOffsets(initial, 0, 12)).toBe(initial);
    expect(getCurrentStepScrollOffset(48, 16)).toBe(32);
    expect(getCurrentStepScrollOffset(4, 16)).toBe(0);
    expect(getStepperScrollOffset({ itemX: 180, itemWidth: 90, contentWidth: 720, viewportWidth: 180 })).toBe(135);
  });
});
