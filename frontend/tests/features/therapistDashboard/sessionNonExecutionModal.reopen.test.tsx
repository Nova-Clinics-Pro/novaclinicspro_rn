/**
 * SessionNonExecutionModal — reopen / reset behavior.
 *
 * The form is reset when `visible` turns true (a render-phase adjustment that replaced an effect during the
 * lint remediation). These tests pin the observable contract: every open starts empty, and nothing the user
 * typed is lost while the modal stays open.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SessionNonExecutionModal } from '../../../features/therapistDashboard/presentation/components/SessionNonExecutionModal';

type Props = React.ComponentProps<typeof SessionNonExecutionModal>;

const setup = (initial: Partial<Props> = {}) => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();
  const base: Props = { visible: true, onSubmit, onClose, isSubmitting: false, errorMessage: null };
  const utils = render(<SessionNonExecutionModal {...base} {...initial} />);
  const update = (next: Partial<Props>) => utils.rerender(<SessionNonExecutionModal {...base} {...initial} {...next} />);
  const radio = (label: string) => utils.getByLabelText(label);
  const isSelected = (label: string) => Boolean(radio(label).props.accessibilityState?.selected);
  return { ...utils, update, onSubmit, onClose, isSelected };
};

describe('SessionNonExecutionModal — reopen resets the form', () => {
  it('opens with nothing selected', () => {
    const u = setup();
    expect(u.isSelected('Patient did not attend')).toBe(false);
    expect(u.isSelected('Other reason')).toBe(false);
  });

  it('forgets the previous reason after being closed and reopened', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Patient cancelled'));
    expect(u.isSelected('Patient cancelled')).toBe(true);
    u.update({ visible: false });
    u.update({ visible: true });
    expect(u.isSelected('Patient cancelled')).toBe(false);
  });

  it('forgets the free-text reason and the OTHER selection after reopening', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Other reason'));
    fireEvent.changeText(u.getByLabelText('Describe the reason'), 'Equipment unavailable');
    u.update({ visible: false });
    u.update({ visible: true });
    expect(u.isSelected('Other reason')).toBe(false);
    expect(u.queryByLabelText('Describe the reason')).toBeNull();
    // Selecting OTHER again starts from an empty text box, not the old text.
    fireEvent.press(u.getByLabelText('Other reason'));
    expect(u.getByLabelText('Describe the reason').props.value).toBe('');
  });

  it('clears a validation error from the previous attempt when reopened', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Other reason'));
    fireEvent.press(u.getByLabelText('Submit'));
    expect(u.getByText('Please describe the reason for "Other".')).toBeTruthy();
    u.update({ visible: false });
    u.update({ visible: true });
    expect(u.queryByText('Please describe the reason for "Other".')).toBeNull();
  });

  it('submits nothing from a previous session after reopening without a new selection', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Clinic cancelled'));
    u.update({ visible: false });
    u.update({ visible: true });
    fireEvent.press(u.getByLabelText('Submit'));
    expect(u.onSubmit).not.toHaveBeenCalled();
  });

  it('can be filled and submitted normally after a reopen', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Clinic cancelled'));
    u.update({ visible: false });
    u.update({ visible: true });
    fireEvent.press(u.getByLabelText('Patient did not attend'));
    fireEvent.press(u.getByLabelText('Submit'));
    expect(u.onSubmit).toHaveBeenCalledWith({ reason_code: 'PATIENT_NO_SHOW', reason_text: null });
  });

  it('starts empty when it is first mounted closed and then opened', () => {
    const u = setup({ visible: false });
    u.update({ visible: true });
    expect(u.isSelected('Patient did not attend')).toBe(false);
    fireEvent.press(u.getByLabelText('Patient did not attend'));
    expect(u.isSelected('Patient did not attend')).toBe(true);
  });
});

describe('SessionNonExecutionModal — no loss of input while open', () => {
  it('keeps the selection and typed text across re-renders that do not change visibility', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Other reason'));
    fireEvent.changeText(u.getByLabelText('Describe the reason'), 'Equipment unavailable');
    u.update({ isSubmitting: true });
    u.update({ isSubmitting: false, errorMessage: 'Something went wrong' });
    expect(u.isSelected('Other reason')).toBe(true);
    expect(u.getByLabelText('Describe the reason').props.value).toBe('Equipment unavailable');
  });

  it('keeps the form when the modal stays open and only the error message changes (a failed submit)', () => {
    const u = setup();
    fireEvent.press(u.getByLabelText('Patient cancelled'));
    u.update({ errorMessage: 'You do not have permission to record this outcome.' });
    expect(u.isSelected('Patient cancelled')).toBe(true);
    expect(u.getByText('You do not have permission to record this outcome.')).toBeTruthy();
  });
});
