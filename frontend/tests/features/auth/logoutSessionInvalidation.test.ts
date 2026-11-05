/**
 * Regression: NC-UAT-04 / NC-UAT-12 (web). Logout must be fail-closed.
 *
 * Root cause covered here: the provider SDK removes its persisted session only
 * AFTER its network sign-out resolves, and the /logout route runs logout
 * concurrently with startup bootstrap. A page unload (or provider/network
 * failure) before the sign-out settled left a restorable session behind, and a
 * concurrent bootstrap could re-persist tokens over the logout.
 */
const mockState = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  currentUser: null as any,
  isAuthenticated: false,
  initializeFromStorage: jest.fn(async () => undefined),
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
    invalidateLocalSession: jest.fn(),
    revokeRemoteSession: jest.fn(),
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
import { isLoggingOut, setLoggingOut } from '../../../core/api/authGuard';

const provider = supabaseAuthProvider as unknown as Record<string, jest.Mock>;
const user = { userId: 'user-1', tenantId: 'tenant-1', ownedClinics: [] };
const session = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('bootstrap never restores a session over a logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLoggingOut(false);
    mockState.accessToken = null;
    mockState.refreshToken = null;
    mockState.currentUser = null;
    mockState.isAuthenticated = false;
  });

  it('a bootstrap that starts while logout is running returns unauthenticated without touching the provider', async () => {
    setLoggingOut(true);

    const result = await new AuthSessionService().bootstrap();

    expect(result.authenticated).toBe(false);
    expect(provider.getSession).not.toHaveBeenCalled();
    expect(mockState.setTokens).not.toHaveBeenCalled();
    expect(authRepository.getCurrentUser).not.toHaveBeenCalled();
  });

  it('a bootstrap already awaiting the provider when logout begins does not persist tokens or hydrate the user', async () => {
    let releaseSession!: (value: typeof session) => void;
    provider.getSession.mockImplementation(() => new Promise(resolve => { releaseSession = resolve; }));
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(user);

    const pending = new AuthSessionService().bootstrap();
    await new Promise(resolve => setTimeout(resolve, 0));
    setLoggingOut(true); // logout starts while the provider lookup is in flight
    releaseSession(session);
    const result = await pending;

    expect(result).toMatchObject({ authenticated: false, session: null });
    expect(mockState.setTokens).not.toHaveBeenCalled();
    expect(authRepository.getCurrentUser).not.toHaveBeenCalled();
    expect(mockState.isAuthenticated).toBe(false);
    expect(mockState.accessToken).toBeNull();
    expect(mockState.clearSession).toHaveBeenCalled();
  });

  it('a logout that completes while /auth/me hydration is in flight discards the hydrated session', async () => {
    provider.getSession.mockResolvedValue(session);
    let releaseUser!: (value: typeof user) => void;
    (authRepository.getCurrentUser as jest.Mock).mockImplementation(() => new Promise(resolve => { releaseUser = resolve; }));

    const pending = new AuthSessionService().bootstrap();
    await new Promise(resolve => setTimeout(resolve, 0));
    setLoggingOut(true);
    setLoggingOut(false); // logout finished before the response arrived
    releaseUser(user);
    const result = await pending;

    expect(result.authenticated).toBe(false);
    expect(mockState.isAuthenticated).toBe(false);
    expect(mockState.clearSession).toHaveBeenCalled();
  });

  it('a session event delivered by the provider during logout does not re-establish authentication', async () => {
    setLoggingOut(true);

    await new AuthSessionService().handleAuthStateChange(session);

    expect(mockState.setTokens).not.toHaveBeenCalled();
    expect(authRepository.getCurrentUser).not.toHaveBeenCalled();
  });

  it('after logout has completed a fresh login still works (the guard is not sticky)', async () => {
    setLoggingOut(true);
    setLoggingOut(false);
    provider.signInWithPassword.mockResolvedValue(session);
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(user);

    await expect(new AuthSessionService().login('a@example.test', 'pw')).resolves.toBe(user);
    expect(isLoggingOut()).toBe(false);
  });
});

describe('expired or consumed sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLoggingOut(false);
    mockState.currentUser = null;
    mockState.isAuthenticated = false;
  });

  it('a persisted session whose refresh token is expired ends unauthenticated, is cleared, and never calls /auth/me', async () => {
    mockState.accessToken = 'expired-access';
    mockState.refreshToken = 'expired-refresh';
    mockState.initializeFromStorage.mockResolvedValue(undefined);
    provider.getSession.mockResolvedValue(null);
    provider.setSession.mockRejectedValue(new Error('Invalid Refresh Token: Refresh Token Not Found'));

    const result = await new AuthSessionService().bootstrap();

    expect(result.authenticated).toBe(false);
    expect(mockState.clearSession).toHaveBeenCalled();
    expect(mockState.isAuthenticated).toBe(false);
    expect(authRepository.getCurrentUser).not.toHaveBeenCalled();
  });

  it('with neither a provider session nor persisted tokens the user stays unauthenticated', async () => {
    provider.getSession.mockResolvedValue(null);

    const result = await new AuthSessionService().bootstrap();

    expect(result).toMatchObject({ authenticated: false, session: null });
    expect(mockState.setTokens).not.toHaveBeenCalled();
  });
});

describe('AuthSessionService provider invalidation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a failed local invalidation as null instead of throwing into logout', async () => {
    provider.invalidateLocalSession.mockRejectedValue(new Error('storage unavailable'));

    await expect(new AuthSessionService().invalidateLocalProviderSession()).resolves.toBeNull();
  });

  it('revokes the captured token remotely before the SDK sign-out, and still signs out locally if revocation fails', async () => {
    provider.revokeRemoteSession.mockRejectedValue(new Error('offline'));
    provider.signOut.mockResolvedValue(undefined);

    await expect(new AuthSessionService().signOutProviderBestEffort('captured-token')).resolves.toBeUndefined();

    expect(provider.revokeRemoteSession).toHaveBeenCalledWith('captured-token');
    expect(provider.signOut).toHaveBeenCalledTimes(1);
  });
});
