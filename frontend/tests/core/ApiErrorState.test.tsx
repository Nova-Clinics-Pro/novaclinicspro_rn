import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ApiErrorState } from '../../core/components/ui/ApiErrorState';
import { changeLanguage } from '../../core/localization/i18n';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, canGoBack: () => mockCanGoBack }),
}));

jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ currentUser: { roles: [], ownedClinics: [{ tenantId: 't1' }] } }),
}));

const forbidden = {
  message: 'Request failed with status code 403',
  response: { status: 403, data: { detail: { error_code: 'MISSING_PERMISSION', details: {
    required_permission: 'appointment.create', permitted_roles: ['Doctor', 'Receptionist'] } } } },
};

describe('ApiErrorState', () => {
  beforeEach(() => { changeLanguage('en-US'); mockCanGoBack = true; mockReplace.mockClear(); mockBack.mockClear(); });

  it('explains a permission denial and offers a way forward instead of Retry', () => {
    const onRetry = jest.fn();
    const { getByText, queryByText, queryByLabelText } = render(<ApiErrorState error={forbidden} onRetry={onRetry} />);
    expect(getByText("As a clinic owner, you don't have permission to create appointments. Only doctors and receptionists can do this.")).toBeTruthy();
    expect(queryByText(/status code/i)).toBeNull();
    expect(queryByLabelText('Retry')).toBeNull();
    expect(queryByText('Back to dashboard')).toBeNull(); // a single way out, not two
    fireEvent.press(getByText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('offers the dashboard instead when there is nowhere to go back to', () => {
    mockCanGoBack = false;
    const { getByText, queryByText } = render(<ApiErrorState error={forbidden} />);
    expect(queryByText('Go back')).toBeNull();
    fireEvent.press(getByText('Back to dashboard'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('offers Retry for a server failure', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ApiErrorState error={{ response: { status: 500 } }} onRetry={onRetry} />);
    fireEvent.press(getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(getByText('Go back')).toBeTruthy();
  });

  it('shows the message in Hindi when the user chose Hindi', () => {
    changeLanguage('hi-IN');
    const { getByText } = render(<ApiErrorState error={forbidden} />);
    expect(getByText('क्लिनिक स्वामी के रूप में, आपके पास अपॉइंटमेंट बनाने की अनुमति नहीं है। यह केवल डॉक्टर और रिसेप्शनिस्ट ही कर सकते हैं।')).toBeTruthy();
    expect(getByText('वापस जाएँ')).toBeTruthy();
  });
});
