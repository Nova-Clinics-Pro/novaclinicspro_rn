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

jest.mock('../../features/auth/data/repositories/auth.repository.impl', () => ({
  authRepository: { getCurrentUser: jest.fn() },
}));

jest.mock('../../features/auth/data/datasources/supabase-auth.provider', () => ({
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

jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: { getState: () => mockState },
}));

import { AuthSessionService } from '../../features/auth/application/auth-session.service';
import { authRepository } from '../../features/auth/data/repositories/auth.repository.impl';
import { authorizationChanged, isSameScope } from '../../features/auth/domain/authorizationChange';

const session = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  tenantId: 'tenant-1',
  fullName: 'Vishnu',
  ownedClinics: [],
  roles: ['staff'],
  roleNames: ['Staff'],
  permissions: ['staff.read'],
  ...overrides,
});

describe('authorizationChanged / isSameScope', () => {
  it('ignores order and detects any role, role-name or permission difference', () => {
    expect(authorizationChanged(session(), session({ permissions: ['staff.read'] }))).toBe(false);
    expect(authorizationChanged(session({ permissions: ['a', 'b'] }), session({ permissions: ['b', 'a'] }))).toBe(false);
    expect(authorizationChanged(session(), session({ permissions: ['staff.read', 'episode.create'] }))).toBe(true);
    expect(authorizationChanged(session(), session({ roles: ['clinic_admin'] }))).toBe(true);
    expect(authorizationChanged(session(), session({ roleNames: ['Clinic Admin'] }))).toBe(true);
  });

  it('a refresh is only ever for the same user in the same clinic', () => {
    expect(isSameScope(session(), session())).toBe(true);
    expect(isSameScope(session(), session({ userId: 'user-2' }))).toBe(false);
    expect(isSameScope(session(), session({ tenantId: 'tenant-2' }))).toBe(false);
  });
});

describe('AuthSessionService.refreshAuthorization', () => {
  const service = () => new AuthSessionService();
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.isAuthenticated = true;
    mockState.currentUser = session();
  });

  it('picks up a role the owner assigned after sign-in, keeping everything else in the session', async () => {
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(
      session({ roles: ['clinic_admin'], roleNames: ['Clinic Admin'], permissions: ['staff.read', 'episode.create'], fullName: 'IGNORED' })
    );
    await service().refreshAuthorization({ force: true });
    expect(mockState.setCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockState.currentUser).toMatchObject({
      roles: ['clinic_admin'],
      roleNames: ['Clinic Admin'],
      permissions: ['staff.read', 'episode.create'],
      fullName: 'Vishnu', // only authorization is replaced
      tenantId: 'tenant-1',
    });
  });

  it('does nothing when authorization is unchanged (no needless re-render)', async () => {
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(session());
    await service().refreshAuthorization({ force: true });
    expect(mockState.setCurrentUser).not.toHaveBeenCalled();
  });

  it('never applies an answer for a different user or clinic', async () => {
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(session({ userId: 'user-2', permissions: ['everything'] }));
    await service().refreshAuthorization({ force: true });
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(session({ tenantId: 'tenant-2', permissions: ['everything'] }));
    await service().refreshAuthorization({ force: true });
    expect(mockState.setCurrentUser).not.toHaveBeenCalled();
  });

  it('keeps the current authorization when the request fails, and does nothing when signed out', async () => {
    (authRepository.getCurrentUser as jest.Mock).mockRejectedValue(new Error('network'));
    await service().refreshAuthorization({ force: true });
    expect(mockState.setCurrentUser).not.toHaveBeenCalled();
    mockState.isAuthenticated = false;
    await service().refreshAuthorization({ force: true });
    expect(authRepository.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('is throttled so focus events and the timer cannot flood /auth/me', async () => {
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(session());
    const svc = service();
    await svc.refreshAuthorization();
    await svc.refreshAuthorization();
    await svc.refreshAuthorization();
    expect(authRepository.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
