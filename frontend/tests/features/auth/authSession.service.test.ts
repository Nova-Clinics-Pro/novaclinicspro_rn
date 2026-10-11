const mockState = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  currentUser: null as any,
  isAuthenticated: false,
  initializeFromStorage: jest.fn(),
  setTokens: jest.fn(async (accessToken: string, refreshToken: string) => {
    mockState.accessToken = accessToken;
    mockState.refreshToken = refreshToken;
  }),
  setCurrentUser: jest.fn((user: any) => {
    mockState.currentUser = user;
    mockState.isAuthenticated = true;
  }),
  clearSession: jest.fn(async () => {
    mockState.accessToken = null;
    mockState.refreshToken = null;
    mockState.currentUser = null;
    mockState.isAuthenticated = false;
  }),
};

jest.mock('../../../features/auth/data/repositories/auth.repository.impl', () => ({
  authRepository: { getCurrentUser: jest.fn() },
}));

jest.mock('../../../features/auth/data/datasources/supabase-auth.provider', () => ({
  AuthProviderError: class AuthProviderError extends Error {},
  supabaseAuthProvider: {
    signInWithPassword: jest.fn(),
    getSession: jest.fn(),
    setSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updatePassword: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: { getState: () => mockState },
}));

import { AuthSessionService } from '../../../features/auth/application/auth-session.service';
import { authRepository } from '../../../features/auth/data/repositories/auth.repository.impl';
import { supabaseAuthProvider } from '../../../features/auth/data/datasources/supabase-auth.provider';

const user = { userId: 'user-1', tenantId: 'tenant-1', ownedClinics: [] };

describe('AuthSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.accessToken = null;
    mockState.refreshToken = null;
    mockState.currentUser = null;
    mockState.isAuthenticated = false;
  });

  it('owns provider login, token persistence, and backend current-user hydration', async () => {
    (supabaseAuthProvider.signInWithPassword as jest.Mock).mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(user);

    const result = await new AuthSessionService().login('doctor@example.test', 'password');

    expect(supabaseAuthProvider.signInWithPassword).toHaveBeenCalledWith('doctor@example.test', 'password');
    expect(mockState.setTokens).toHaveBeenCalledWith('access-1', 'refresh-1');
    expect(authRepository.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockState.setCurrentUser).toHaveBeenCalledWith(user);
    expect(result).toBe(user);
  });

  it('refreshes provider tokens before rehydrating backend context', async () => {
    (supabaseAuthProvider.refreshSession as jest.Mock).mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(user);

    await new AuthSessionService().refresh();

    expect(mockState.setTokens).toHaveBeenCalledWith('access-2', 'refresh-2');
    expect(authRepository.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('installs one provider subscription and returns its cleanup', () => {
    const unsubscribe = jest.fn();
    (supabaseAuthProvider.subscribe as jest.Mock).mockReturnValue(unsubscribe);

    const dispose = new AuthSessionService().subscribeToAuthState();

    expect(supabaseAuthProvider.subscribe).toHaveBeenCalledTimes(1);
    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('owns registration finalization and password-reset requests', async () => {
    await new AuthSessionService().finalizeRegistrationSession();
    await new AuthSessionService().requestPasswordReset('doctor@example.test', 'novaclinicspro://reset-password');

    expect(supabaseAuthProvider.signOut).toHaveBeenCalledTimes(1);
    expect(supabaseAuthProvider.resetPasswordForEmail).toHaveBeenCalledWith(
      'doctor@example.test',
      'novaclinicspro://reset-password'
    );
  });

  it('establishes a supplied recovery session then updates the password and signs out', async () => {
    (supabaseAuthProvider.getSession as jest.Mock).mockResolvedValue(null);
    (supabaseAuthProvider.setSession as jest.Mock).mockResolvedValue({ accessToken: 'recovery-access', refreshToken: 'recovery-refresh' });

    const service = new AuthSessionService();
    await service.establishRecoverySession({ accessToken: 'recovery-access', refreshToken: 'recovery-refresh' });
    await service.completePasswordRecovery('ValidPassword1');

    expect(supabaseAuthProvider.setSession).toHaveBeenCalledWith({ accessToken: 'recovery-access', refreshToken: 'recovery-refresh' });
    expect(supabaseAuthProvider.updatePassword).toHaveBeenCalledWith('ValidPassword1');
    expect(supabaseAuthProvider.signOut).toHaveBeenCalledTimes(1);
  });
});
