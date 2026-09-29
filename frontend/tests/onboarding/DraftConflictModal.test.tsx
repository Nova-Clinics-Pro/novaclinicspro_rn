import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from 'react-native';

import { DraftConflictModal } from '../../features/onboarding/presentation/components/DraftConflictModal';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('DraftConflictModal', () => {
  it('renders localized, non-technical choices with dialog accessibility semantics', () => {
    const screen = render(
      <DraftConflictModal
        visible
        pendingAction={null}
        failure={null}
        onUseLatest={jest.fn()}
        onKeepLocal={jest.fn()}
      />
    );

    expect(
      screen.getByLabelText('Clinic setup changes need your choice')
    ).toHaveProp('accessibilityRole', 'dialog');
    expect(screen.getByText('Use Latest')).toBeTruthy();
    expect(screen.getByText('Keep Local')).toBeTruthy();
    expect(screen.queryByText(/step-rev|cap-v1|revision/i)).toBeNull();
  });

  it('blocks accidental system dismissal and dispatches only explicit actions', () => {
    const useLatest = jest.fn();
    const keepLocal = jest.fn();
    const screen = render(
      <DraftConflictModal
        visible
        pendingAction={null}
        failure={null}
        onUseLatest={useLatest}
        onKeepLocal={keepLocal}
      />
    );

    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(useLatest).not.toHaveBeenCalled();
    expect(keepLocal).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Use the latest clinic setup'));
    expect(useLatest).toHaveBeenCalledTimes(1);
  });

  it('disables both choices and exposes busy semantics while an action is pending', () => {
    const screen = render(
      <DraftConflictModal
        visible
        pendingAction="KEEP_LOCAL"
        failure={null}
        onUseLatest={jest.fn()}
        onKeepLocal={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Use the latest clinic setup')).toHaveProp(
      'accessibilityState',
      { disabled: true, busy: false }
    );
    expect(screen.getByLabelText('Keep and save local changes')).toHaveProp(
      'accessibilityState',
      { disabled: true, busy: true }
    );
    expect(screen.getByText('Saving your local changes...')).toHaveProp(
      'accessibilityLiveRegion',
      'polite'
    );
  });

  it('shows a safe localized failure without backend details', () => {
    const screen = render(
      <DraftConflictModal
        visible
        pendingAction={null}
        failure="SECOND_CONFLICT"
        onUseLatest={jest.fn()}
        onKeepLocal={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        'Clinic setup changed again. Review the choices and try again.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveProp(
      'accessibilityLiveRegion',
      'assertive'
    );
  });
});
