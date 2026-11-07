import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { authSessionService } from '../../../features/auth/application/auth-session.service';
import ResetPasswordScreen from '../../../app/reset-password';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRuntime = { url: 'frontend://reset-password#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh' as string | null };
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock('expo-linking', () => ({ useLinkingURL: () => mockRuntime.url }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../core/theme/useClinicTheme', () => ({ useClinicTheme: () => ({ colors: {
  background: { default: '#fff' }, primary: { default: '#123', onPrimary: '#fff', soft: '#eee' },
  text: { primary: '#111', secondary: '#222', tertiary: '#333' },
  surface: { default: '#fff' }, border: { default: '#aaa' },
  feedback: { error: '#900', errorLight: '#fee', success: '#090', successLight: '#efe' },
} }) }));
jest.mock('../../../features/auth/application/auth-session.service', () => ({ authSessionService: { establishRecoverySession: jest.fn(), completePasswordRecovery: jest.fn() } }));

describe('dedicated password recovery route', () => {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  beforeEach(() => {
    jest.clearAllMocks();
    mockRuntime.url = 'frontend://reset-password#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (authSessionService.establishRecoverySession as jest.Mock).mockResolvedValue(undefined);
    (authSessionService.completePasswordRecovery as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => Object.defineProperty(Platform, 'OS', originalOS));

  it('accepts the native recovery callback and shows the dedicated password form without navigation', async () => {
    const view = render(<ResetPasswordScreen />);
    await waitFor(() => expect(view.getByText('Create New Password')).toBeTruthy());
    expect(authSessionService.establishRecoverySession).toHaveBeenCalledWith({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('allows unauthenticated navigation without callback credentials and stays on recovery error', async () => {
    mockRuntime.url = 'frontend://reset-password';
    const view = render(<ResetPasswordScreen />);
    await waitFor(() => expect(view.getByText('Link Expired')).toBeTruthy());
    expect(authSessionService.establishRecoverySession).not.toHaveBeenCalled();
    expect(view.queryByText('Create New Password')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not show an authorized form or navigate while the provider verifies recovery', async () => {
    let resolveRecovery!: () => void;
    (authSessionService.establishRecoverySession as jest.Mock).mockReturnValue(new Promise<void>(resolve => { resolveRecovery = resolve; }));
    const view = render(<ResetPasswordScreen />);
    expect(view.queryByText('Create New Password')).toBeNull();
    expect(authSessionService.completePasswordRecovery).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    resolveRecovery();
    await waitFor(() => expect(view.getByText('Create New Password')).toBeTruthy());
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('submits a matching password through the application service and shows success', async () => {
    const view = render(<ResetPasswordScreen />);
    await waitFor(() => expect(view.getByText('Create New Password')).toBeTruthy());
    fireEvent.changeText(view.getByPlaceholderText('Enter new password'), 'SyntheticPassword1');
    fireEvent.changeText(view.getByPlaceholderText('Confirm new password'), 'SyntheticPassword1');
    fireEvent.press(view.getByText('Reset Password'));
    await waitFor(() => expect(authSessionService.completePasswordRecovery).toHaveBeenCalledWith('SyntheticPassword1'));
    await waitFor(() => expect(view.getByText('Password Updated!')).toBeTruthy());
  });

  it('clears browser callback tokens before establishing the provider session', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const replaceState = jest.fn();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { href: 'https://uat.example.test/reset-password#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh', pathname: '/reset-password' }, history: { replaceState } } });
    try {
      const view = render(<ResetPasswordScreen />);
      await waitFor(() => expect(view.getByText('Create New Password')).toBeTruthy());
      expect(replaceState).toHaveBeenCalledWith(null, '', '/reset-password');
      expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan((authSessionService.establishRecoverySession as jest.Mock).mock.invocationCallOrder[0]);
      view.unmount();
    } finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); }
  });

  it('shows expired/reused-link recovery instead of using an existing login', async () => {
    mockRuntime.url = 'frontend://reset-password#error_code=otp_expired';
    const view = render(<ResetPasswordScreen />);
    await waitFor(() => expect(view.getByText('Request New Link')).toBeTruthy());
    expect(authSessionService.establishRecoverySession).not.toHaveBeenCalled();
    expect(view.queryByText('Create New Password')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Request New Link'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });

  it('shows the invalid-link state when the provider rejects callback credentials', async () => {
    (authSessionService.establishRecoverySession as jest.Mock).mockRejectedValue(new Error('synthetic provider failure'));
    const view = render(<ResetPasswordScreen />);
    await waitFor(() => expect(view.getByText('Request New Link')).toBeTruthy());
    expect(view.queryByText('Create New Password')).toBeNull();
  });
});
