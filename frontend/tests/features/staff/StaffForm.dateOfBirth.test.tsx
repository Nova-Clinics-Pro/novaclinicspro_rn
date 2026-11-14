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
  const DatePickerMock = () => <Text testID="staff-date-picker">picker</Text>;
  DatePickerMock.displayName = 'DatePickerMock';
  return DatePickerMock;
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

describe('StaffForm sign-in access needs an email', () => {
  it('explains that an email is required instead of submitting and failing on the server', async () => {
    const { Switch } = require('react-native');
    const { waitFor } = require('@testing-library/react-native');
    const onSubmit = jest.fn();
    const screen = render(<StaffForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    fireEvent(screen.UNSAFE_getByType(Switch), 'valueChange', true);
    fireEvent.press(screen.getByText('Add Staff'));

    await waitFor(() =>
      expect(screen.getByText('Email is required when the staff member can sign in')).toBeTruthy(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
