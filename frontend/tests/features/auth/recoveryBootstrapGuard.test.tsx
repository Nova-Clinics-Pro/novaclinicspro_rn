import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../../core/providers/AuthProvider';
import { ProtectedRoute } from '../../../core/components/ProtectedRoute';
import { authSessionService } from '../../../features/auth/application/auth-session.service';
const mockReplace = jest.fn();
const mockAuth = { isAuthenticated: false, isLoading: false, currentUser: null };
const mockPath = { current: '/reset-password' };
const mockCompleteBootstrap = jest.fn();
const mockUnsubscribe = jest.fn();
jest.mock('expo-router', () => ({ usePathname: () => mockPath.current, useSegments: () => ['doctor'], useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../core/theme/useClinicTheme', () => ({ ThemeProvider: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({ useAuthStore: Object.assign(() => mockAuth, { getState: () => ({ completeBootstrap: mockCompleteBootstrap }) }) }));
jest.mock('../../../features/auth/application/auth-session.service', () => ({ authSessionService: { bootstrap: jest.fn(), subscribeToAuthState: jest.fn() } }));
describe('recovery bootstrap ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks(); mockPath.current = '/reset-password';
    (authSessionService.bootstrap as jest.Mock).mockResolvedValue({ authenticated: false });
    (authSessionService.subscribeToAuthState as jest.Mock).mockReturnValue(mockUnsubscribe);
  });
  it('does not start ordinary login bootstrap or subscription on the recovery route', () => {
    render(<AuthProvider><Text>Recovery</Text></AuthProvider>);
    expect(authSessionService.bootstrap).not.toHaveBeenCalled();
    expect(authSessionService.subscribeToAuthState).not.toHaveBeenCalled();
  });
  it('resumes normal bootstrap and subscription after leaving recovery', async () => {
    const view = render(<AuthProvider><Text>Recovery</Text></AuthProvider>);
    mockPath.current = '/login';
    view.rerender(<AuthProvider><Text>Login</Text></AuthProvider>);
    await waitFor(() => expect(authSessionService.subscribeToAuthState).toHaveBeenCalledTimes(1));
    expect(authSessionService.bootstrap).toHaveBeenCalledTimes(1);
    expect(mockCompleteBootstrap).toHaveBeenCalledTimes(1);
    mockPath.current = '/reset-password';
    view.rerender(<AuthProvider><Text>Recovery</Text></AuthProvider>);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('ordinary protected routes retain authentication requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
  });

  it('redirects an unauthenticated protected route to login and hides its content', () => {
    const view = render(<ProtectedRoute><Text>Protected clinical content</Text></ProtectedRoute>);
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(view.queryByText('Protected clinical content')).toBeNull();
  });

  it('does not prematurely redirect a protected route during auth hydration', () => {
    mockAuth.isLoading = true;
    const view = render(<ProtectedRoute><Text>Protected clinical content</Text></ProtectedRoute>);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(view.queryByText('Protected clinical content')).toBeNull();
  });

  it('continues rendering an authenticated protected route', () => {
    mockAuth.isAuthenticated = true;
    const view = render(<ProtectedRoute><Text>Protected clinical content</Text></ProtectedRoute>);
    expect(view.getByText('Protected clinical content')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
