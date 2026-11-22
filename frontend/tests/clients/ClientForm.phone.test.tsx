import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ClientForm } from '../../features/clients/presentation/components/ClientForm';
import type { ClientResponse } from '../../features/clients/data/models/clients.dtos';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const fillNameAndGender = (screen: ReturnType<typeof render>) => {
  fireEvent.changeText(screen.getByPlaceholderText('Enter full name'), 'P-2');
  fireEvent.press(screen.getByText('Female'));
};

describe('ClientForm phone (the server requires a phone for a new client, so the form does too)', () => {
  it('marks the phone as required, not optional', () => {
    const screen = render(<ClientForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByText('Phone (Optional)')).toBeNull();
    expect(screen.getByText('Phone *')).toBeTruthy();
  });

  it('does not save a new client without a phone, and says why', async () => {
    const onSubmit = jest.fn();
    const screen = render(<ClientForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fillNameAndGender(screen);
    fireEvent.press(screen.getByText('Add Client'));
    await waitFor(() => expect(screen.getByText('Phone number is required')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not save a phone the server would refuse as too short', async () => {
    const onSubmit = jest.fn();
    const screen = render(<ClientForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fillNameAndGender(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '12345');
    fireEvent.press(screen.getByText('Add Client'));
    await waitFor(() => expect(screen.getByText('Phone number must be at least 10 digits')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves a new client that has a phone', async () => {
    const onSubmit = jest.fn();
    const screen = render(<ClientForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fillNameAndGender(screen);
    fireEvent.changeText(screen.getByPlaceholderText('Phone number'), '9100000201');
    fireEvent.press(screen.getByText('Add Client'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ phone: '9100000201' });
  });

  it('still lets an existing client who has no phone on record be edited', async () => {
    const onSubmit = jest.fn();
    const existing = { id: 'c1', full_name: 'Old Client', gender: 'Female', phone: null } as unknown as ClientResponse;
    const screen = render(<ClientForm initialData={existing} onSubmit={onSubmit} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
