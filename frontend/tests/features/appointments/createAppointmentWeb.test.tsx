/**
 * Web behavior of the Create Appointment flow: a real browser time/date control (react-native-web's
 * TextInput forces type="text"), working alerts (react-native-web's Alert.alert is empty), and
 * navigation to the appointment that was just created.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../../../core/theme/useClinicTheme';
import CrossPlatformDateTimePicker from '../../../core/components/CrossPlatformDateTimePicker';
import { installWebAlert, showWebAlert } from '../../../core/utils/webAlert';

const originalOS = Platform.OS;
afterEach(() => { (Platform as any).OS = originalOS; jest.restoreAllMocks(); });

describe('web date/time control', () => {
  it('renders a real input of the requested type and reports a valid typed time as a local Date', () => {
    (Platform as any).OS = 'web';
    const onChange = jest.fn();
    const base = new Date(2026, 10, 2, 9, 5, 0, 0);
    const view = render(<CrossPlatformDateTimePicker value={base} mode="time" onChange={onChange} />);
    const input = view.UNSAFE_getByType('input' as any);
    expect(input.props.type).toBe('time');
    expect(input.props.value).toBe('09:05');
    fireEvent(input, 'change', { target: { value: '14:30' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const picked: Date = onChange.mock.calls[0][1];
    expect([picked.getHours(), picked.getMinutes()]).toEqual([14, 30]);
    fireEvent(input, 'change', { target: { value: '' } }); // cleared field is ignored
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('date mode uses type=date with a minimum', () => {
    (Platform as any).OS = 'web';
    const view = render(<CrossPlatformDateTimePicker value={new Date(2026, 10, 2)} mode="date" minimumDate={new Date(2026, 10, 1)} onChange={jest.fn()} />);
    const input = view.UNSAFE_getByType('input' as any);
    expect([input.props.type, input.props.value, input.props.min]).toEqual(['date', '2026-11-02', '2026-11-01']);
  });
});

describe('web alerts render in-app', () => {
  const { WebAlertHost } = require('../../../core/components/WebAlertHost');
  const { currentWebAlert, resolveWebAlert } = require('../../../core/utils/webAlert');
  afterEach(() => { while (currentWebAlert()) resolveWebAlert(); });

  it('never touches window dialogs (embedded browsers suppress them)', () => {
    const confirm = jest.fn(() => false); const alert = jest.fn();
    (global as any).window = Object.assign((global as any).window ?? {}, { confirm, alert });
    showWebAlert('t', 'm', [{ text: 'OK' }]);
    expect(confirm).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows a single-button notice and runs its callback when dismissed', () => {
    (Platform as any).OS = 'web';
    const onPress = jest.fn();
    const view = render(<ThemeProvider><WebAlertHost /></ThemeProvider>);
    act(() => showWebAlert('Appointment Created', 'Saved', [{ text: 'Got it', onPress }]));
    expect(view.getByText('Appointment Created')).toBeTruthy();
    expect(view.getByText('Saved')).toBeTruthy();
    expect(view.queryByLabelText('Cancel')).toBeNull();
    fireEvent.press(view.getByLabelText('Got it'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Appointment Created')).toBeNull();
  });

  it('maps the confirm button to the non-cancel action and cancel to the cancel action', () => {
    (Platform as any).OS = 'web';
    const skip = jest.fn(); const proceed = jest.fn();
    const buttons = [{ text: 'No, Cancel', style: 'cancel' as const, onPress: skip }, { text: 'Yes, Proceed', onPress: proceed }];
    const view = render(<ThemeProvider><WebAlertHost /></ThemeProvider>);
    act(() => showWebAlert('Booking Warning', 'Outside hours', buttons));
    fireEvent.press(view.getByLabelText('Yes, Proceed'));
    expect([proceed.mock.calls.length, skip.mock.calls.length]).toEqual([1, 0]);
    act(() => showWebAlert('Booking Warning', 'Outside hours', buttons));
    fireEvent.press(view.getByLabelText('No, Cancel'));
    expect([proceed.mock.calls.length, skip.mock.calls.length]).toEqual([1, 1]);
  });

  it('queues alerts and shows them one at a time', () => {
    (Platform as any).OS = 'web';
    const view = render(<ThemeProvider><WebAlertHost /></ThemeProvider>);
    act(() => { showWebAlert('First', 'a'); showWebAlert('Second', 'b'); });
    expect(view.getByText('First')).toBeTruthy();
    expect(view.queryByText('Second')).toBeNull();
    fireEvent.press(view.getByLabelText('OK'));
    expect(view.getByText('Second')).toBeTruthy();
  });

  it('renders nothing off web, and installs only on web', () => {
    (Platform as any).OS = 'ios';
    const native = Alert.alert; installWebAlert();
    expect(Alert.alert).toBe(native);
    const view = render(<ThemeProvider><WebAlertHost /></ThemeProvider>);
    expect(view.toJSON()).toBeNull();
    (Platform as any).OS = 'web'; installWebAlert();
    expect(Alert.alert).toBe(showWebAlert);
    Alert.alert = native;
  });
});

describe('create appointment navigation', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../../features/appointments/presentation/pages/CreateAppointmentScreen.tsx'), 'utf8');
  const single = source.slice(source.indexOf('const handleCreateSingle'), source.indexOf('const handleCreateSingle') + 9000);
  const success = single.slice(single.indexOf('await createMutation.mutateAsync(payload)'), single.indexOf('} catch (error)'));

  it('lands on the appointments list (on the new appointment\'s day) after every successful outcome instead of going back', () => {
    expect(success).toMatch(/router\.replace\(appointmentsListRoute\(toISODateString\(startDateTime\)\)/);
    expect(success).not.toMatch(/router\.back\(\)/);
    expect(success).not.toMatch(/\/clinic-admin\/appointments\/\$\{/); // not the appointment's own page
    expect((success.match(/openCreated\(\)/g) ?? []).length).toBe(3);
  });

  it('keeps web pickers open while a native control is being edited', () => {
    expect(source).toMatch(/setShowTimePicker\(Platform\.OS === 'ios' \|\| Platform\.OS === 'web'\)/);
    expect(source).toMatch(/setShowDatePicker\(Platform\.OS === 'ios' \|\| Platform\.OS === 'web'\)/);
  });
});

describe('appointment detail renders no raw empty strings', () => {
  // react-native-web throws "Unexpected text node" when `'' && <View/>` leaves an empty string
  // as a child of a View; a just-created appointment has empty notes and no phone.
  const source = fs.readFileSync(path.resolve(__dirname, '../../../features/appointments/presentation/pages/AppointmentDetailScreen.tsx'), 'utf8');
  it.each(['displayClientPhone', 'appointment.notes', 'appointment.created_at', 'appointment.updated_at'])('guards %s with a boolean', (name) => {
    const escaped = name.replace(/\./g, '\\.');
    expect(source).not.toMatch(new RegExp(`\\{${escaped} && `));
    expect(source).toMatch(new RegExp(`\\{!!${escaped} && `));
  });
});
