import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { StaffForm } from '../../../features/staff/presentation/components/StaffForm';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (token: string) => token }),
}));

jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { text: { primary: '#000', secondary: '#666' }, border: { default: '#ddd' } },
    spacing: { xs: 4, md: 16, xxl: 48 },
    typography: { body2: {} },
  }),
}));

jest.mock('../../../core/components/CrossPlatformDateTimePicker', () => {
  const { Text } = require('react-native');
  return () => <Text testID="staff-date-picker">picker</Text>;
});

describe('StaffForm date of birth field', () => {
  it('renders one visible label in the actual Add Staff form path and opens the picker', () => {
    const screen = render(
      <StaffForm onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );
    const label = 'onboarding.progressiveExperience.staff.dateOfBirth.label';

    expect(screen.getAllByText(label)).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: label }));

    expect(screen.getByTestId('staff-date-picker')).toBeTruthy();
  });
});
