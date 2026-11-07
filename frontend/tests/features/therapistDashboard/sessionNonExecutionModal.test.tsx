/**
 * SessionNonExecutionModal tests (T-FE-E.3, T-BE-E.4a)
 *
 * The modal itself is a pure form over the governed reason vocabulary — no
 * data-layer imports, so no datasource mocking is needed here (the mutation
 * hook that actually calls the backend is tested separately via the
 * architecture guard + the screen wiring).
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SessionNonExecutionModal } from '../../../features/therapistDashboard/presentation/components/SessionNonExecutionModal';

const renderModal = (overrides: Partial<React.ComponentProps<typeof SessionNonExecutionModal>> = {}) => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <SessionNonExecutionModal
      visible
      onSubmit={onSubmit}
      onClose={onClose}
      isSubmitting={false}
      errorMessage={null}
      {...overrides}
    />
  );
  return { ...utils, onSubmit, onClose };
};

describe('SessionNonExecutionModal', () => {
  it('renders every governed reason code, using the localized label only — no raw backend code visible', async () => {
    const { findByLabelText, queryByText } = renderModal();
    await findByLabelText('Patient did not attend');
    await findByLabelText('Patient cancelled');
    await findByLabelText('Clinic cancelled');
    await findByLabelText('Clinical hold');
    await findByLabelText('Other reason');
    expect(queryByText('PATIENT_NO_SHOW')).toBeNull();
    expect(queryByText('OTHER')).toBeNull();
  });

  it('never renders a "Missed" label anywhere in the reason vocabulary', async () => {
    const { queryByText } = renderModal();
    expect(queryByText(/missed/i)).toBeNull();
  });

  it('requires a reason to be selected before submitting', async () => {
    const { findByLabelText, onSubmit } = renderModal();
    fireEvent.press(await findByLabelText('Submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits PATIENT_NO_SHOW with no reason_text when a non-OTHER reason is selected', async () => {
    const { findByLabelText, onSubmit } = renderModal();
    fireEvent.press(await findByLabelText('Patient did not attend'));
    fireEvent.press(await findByLabelText('Submit'));
    expect(onSubmit).toHaveBeenCalledWith({ reason_code: 'PATIENT_NO_SHOW', reason_text: null });
  });

  it('requires reason_text when OTHER is selected and blocks submit until provided', async () => {
    const { findByLabelText, onSubmit, findByText } = renderModal();
    fireEvent.press(await findByLabelText('Other reason'));
    fireEvent.press(await findByLabelText('Submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    await findByText('Please describe the reason for "Other".');

    fireEvent.changeText(await findByLabelText('Describe the reason'), 'Equipment unavailable');
    fireEvent.press(await findByLabelText('Submit'));
    expect(onSubmit).toHaveBeenCalledWith({ reason_code: 'OTHER', reason_text: 'Equipment unavailable' });
  });

  it('cancel calls onClose without submitting', async () => {
    const { findByLabelText, onSubmit, onClose } = renderModal();
    fireEvent.press(await findByLabelText('Patient did not attend'));
    fireEvent.press(await findByLabelText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit and cancel while submitting, showing a submitting label', async () => {
    const { findByLabelText } = renderModal({ isSubmitting: true });
    const submitButton = await findByLabelText('Submitting…');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    const cancelButton = await findByLabelText('Cancel');
    expect(cancelButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('surfaces a backend error message without exposing a raw error code', async () => {
    const { findByText } = renderModal({ errorMessage: 'You do not have permission to record this outcome.' });
    await findByText('You do not have permission to record this outcome.');
  });
});
