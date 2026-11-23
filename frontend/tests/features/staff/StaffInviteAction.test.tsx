import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { StaffInviteAction } from '../../../features/staff/presentation/components/StaffInviteAction';
import { StaffOperationError } from '../../../features/staff/domain/errors/staffOperationError';
import { changeLanguage } from '../../../core/localization/i18n';

const mockMutateAsync = jest.fn();
jest.mock('../../../features/staff/data/repositories/staff.repository.impl', () => ({
  useInviteStaffToSignInMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

describe('Invite to sign in', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    changeLanguage('en-US');
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('is offered only to a staff member who cannot sign in yet', () => {
    expect(render(<StaffInviteAction tenantId="t" staffId="s" hasLogin />).queryByTestId('staff-invite-open')).toBeNull();
    expect(render(<StaffInviteAction tenantId="t" staffId="s" hasLogin={false} />).getByTestId('staff-invite-open')).toBeTruthy();
  });

  it('asks for an email, refuses an empty or malformed one, and sends nothing', async () => {
    const view = render(<StaffInviteAction tenantId="t" staffId="s" hasLogin={false} />);
    fireEvent.press(view.getByTestId('staff-invite-open'));
    fireEvent.press(view.getByTestId('staff-invite-send'));
    expect(view.getByTestId('staff-invite-error')).toBeTruthy();
    fireEvent.changeText(view.getByTestId('staff-invite-email'), 'not-an-email');
    fireEvent.press(view.getByTestId('staff-invite-send'));
    expect(view.getByTestId('staff-invite-error')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('sends the trimmed email, closes, and says the invitation went out', async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const view = render(<StaffInviteAction tenantId="t" staffId="s" hasLogin={false} />);
    fireEvent.press(view.getByTestId('staff-invite-open'));
    fireEvent.changeText(view.getByTestId('staff-invite-email'), '  asha@example.com ');
    fireEvent.press(view.getByTestId('staff-invite-send'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith('asha@example.com'));
    await waitFor(() => expect(view.queryByTestId('staff-invite-email')).toBeNull());
    expect(Alert.alert).toHaveBeenCalledWith('Invitation sent', expect.stringContaining('asha@example.com'));
  });

  it('keeps the dialog open and explains the reason when the invitation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new StaffOperationError('RATE_LIMITED'));
    const view = render(<StaffInviteAction tenantId="t" staffId="s" hasLogin={false} />);
    fireEvent.press(view.getByTestId('staff-invite-open'));
    fireEvent.changeText(view.getByTestId('staff-invite-email'), 'asha@example.com');
    fireEvent.press(view.getByTestId('staff-invite-send'));
    await waitFor(() => expect(view.getByTestId('staff-invite-error').props.children).toMatch(/wait a while and try again/));
    expect(view.getByTestId('staff-invite-email')).toBeTruthy();
  });
});
