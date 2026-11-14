import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ClientForm } from '../../features/clients/presentation/components/ClientForm';
import { calculateAge } from '../../features/clients/data/models/clients.dtos';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const fillRequired = (screen: ReturnType<typeof render>) => {
  fireEvent.changeText(screen.getByPlaceholderText('Enter full name'), 'P-2');
  fireEvent.press(screen.getByText('Female'));
};

describe('ClientForm age', () => {
  it('does not require an age', async () => {
    const onSubmit = jest.fn();
    const screen = render(<ClientForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    expect(screen.queryByText('Age *')).toBeNull();
    fillRequired(screen);
    fireEvent.press(screen.getByText('Add Client'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/expected number/)).toBeNull();
  });

  it('calculates the age from the date of birth and sends it', async () => {
    const onSubmit = jest.fn();
    const screen = render(<ClientForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fillRequired(screen);
    fireEvent.changeText(screen.getByTestId('client-date-of-birth'), '2000-01-01');
    const expected = calculateAge('2000-01-01');
    await waitFor(() => expect(screen.getByDisplayValue(String(expected))).toBeTruthy());
    expect(screen.getByText('Calculated from the date of birth')).toBeTruthy();
    fireEvent.press(screen.getByText('Add Client'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ age: expected, date_of_birth: '2000-01-01' });
  });
});
