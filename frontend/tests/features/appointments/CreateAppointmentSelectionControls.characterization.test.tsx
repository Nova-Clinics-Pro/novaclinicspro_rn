import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fireEvent, render } from '@testing-library/react-native';

import {
  AppointmentBookedSlots,
  AppointmentSearchableDropdown,
  AppointmentSessionTypeSelector,
  AppointmentTypeSelector,
} from '../../../features/appointments/presentation/components/CreateAppointmentSelectionControls';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('CreateAppointment selection controls characterization', () => {
  it('keeps the extracted controls presentation-only', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../features/appointments/presentation/components/CreateAppointmentSelectionControls.tsx',
      ),
      'utf8',
    );

    expect(source).not.toMatch(/data\/(datasources|repositories)|\.api['"]/);
    expect(source).not.toMatch(/axios|supabase|useQuery|useMutation/);
  });

  it('preserves the booking-type affordances and hides multi-day when capability is unavailable', () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByLabelText, rerender } = render(
      <AppointmentTypeSelector value="SINGLE" onChange={onChange} allowMultiDay={false} />,
    );

    expect(getByLabelText('Single Day appointment').props.accessibilityState).toEqual({ checked: true });
    expect(queryByLabelText('Multi Day therapy series')).toBeNull();

    rerender(<AppointmentTypeSelector value="SINGLE" onChange={onChange} allowMultiDay />);
    fireEvent.press(getByLabelText('Multi Day therapy series'));
    expect(onChange).toHaveBeenCalledWith('MULTI');
  });

  it('preserves therapy visibility and session selection intent', () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByLabelText, rerender } = render(
      <AppointmentSessionTypeSelector value="DOCTOR" onChange={onChange} allowTherapySession={false} />,
    );

    expect(queryByLabelText('Therapy Session')).toBeNull();
    rerender(<AppointmentSessionTypeSelector value="DOCTOR" onChange={onChange} allowTherapySession />);
    fireEvent.press(getByLabelText('Therapy Session'));
    expect(onChange).toHaveBeenCalledWith('THERAPY');
  });

  it('filters choices, emits the selected identity, and closes after a single-select choice', () => {
    const onSelect = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <AppointmentSearchableDropdown
        title="Select Client"
        options={[
          { id: 'client-1', label: 'Ada Lovelace', subtitle: '111' },
          { id: 'client-2', label: 'Grace Hopper', subtitle: '222' },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByLabelText('Select Client: Select...'));
    fireEvent.changeText(getByLabelText('Search options'), 'Grace');
    expect(queryByLabelText('Ada Lovelace')).toBeNull();
    fireEvent.press(getByLabelText('Grace Hopper'));

    expect(onSelect).toHaveBeenCalledWith('client-2');
    expect(queryByLabelText('Search options')).toBeNull();
  });

  it('preserves booked-slot loading, empty, details, and overflow display states', () => {
    const { getByText, rerender } = render(
      <AppointmentBookedSlots appointments={[]} isLoading />,
    );
    expect(getByText('Loading schedule...')).toBeTruthy();

    rerender(<AppointmentBookedSlots appointments={[]} />);
    expect(getByText('No booked slots - Doctor is available')).toBeTruthy();

    rerender(
      <AppointmentBookedSlots
        appointments={Array.from({ length: 6 }, (_, index) => ({
          id: `appointment-${index}`,
          appointment_start: '2026-10-17T09:00:00Z',
          appointment_end: '2026-10-17T09:30:00Z',
          client_name: `Client ${index}`,
        }))}
      />,
    );
    expect(getByText('Already booked slots:')).toBeTruthy();
    expect(getByText('+1 more appointments')).toBeTruthy();
  });
});
