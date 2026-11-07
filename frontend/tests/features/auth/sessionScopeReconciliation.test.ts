/**
 * Regression: NC-WEB-001. A clinic provisioned at registration has no tenant claim
 * in the provider token, so /auth/me reports session_refresh_required=true and
 * every tenant-scoped onboarding surface fails closed ("selected clinic changed").
 * Hydration must run the canonical handshake (server-side claim projection, then a
 * provider token refresh) instead of leaving the owner stuck.
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
  authRepository: { getCurrentUser: jest.fn(), refreshEffectiveTenantSession: jest.fn() },
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
import { setLoggingOut } from '../../../core/api/authGuard';

const repo = authRepository as unknown as Record<string, jest.Mock>;
const provider = supabaseAuthProvider as unknown as Record<string, jest.Mock>;

const ORG = '11111111-1111-4111-8111-111111111111';
const TENANT = '22222222-2222-4222-8222-222222222222';
const userWith = (sessionScope: any, clinicType: string) => ({
  userId: 'user-1',
  id: 'user-1',
  email: `owner-${clinicType}@example.test`,
  tenantId: TENANT,
  clinicType,
  ownedClinics: [],
  sessionScope,
});
const stale = { effectiveOrganizationId: ORG, effectiveTenantId: TENANT, sessionRefreshRequired: true };
const fresh = { effectiveOrganizationId: ORG, effectiveTenantId: TENANT, sessionRefreshRequired: false };

describe.each(['AYURVEDA', 'GENERAL'])('session scope reconciliation (%s clinic)', clinicType => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLoggingOut(false);
    mockState.currentUser = null;
    mockState.isAuthenticated = false;
    provider.signInWithPassword.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    provider.refreshSession.mockResolvedValue({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    repo.refreshEffectiveTenantSession.mockResolvedValue(undefined);
  });

  it('runs claim projection, then a provider token refresh, then re-hydrates when the claims lag behind the backend scope', async () => {
    const reconciled = userWith(fresh, clinicType);
    repo.getCurrentUser.mockResolvedValueOnce(userWith(stale, clinicType)).mockResolvedValueOnce(reconciled);
    const order: string[] = [];
    repo.refreshEffectiveTenantSession.mockImplementation(async () => { order.push('projectClaims'); });
    provider.refreshSession.mockImplementation(async () => { order.push('refreshToken'); return { accessToken: 'access-2', refreshToken: 'refresh-2' }; });

    const result = await new AuthSessionService().login('owner@example.test', 'pw');

    expect(repo.refreshEffectiveTenantSession).toHaveBeenCalledWith(ORG);
    expect(order).toEqual(['projectClaims', 'refreshToken']);
    expect(mockState.setTokens).toHaveBeenLastCalledWith('access-2', 'refresh-2');
    expect(repo.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(result).toBe(reconciled);
    expect(mockState.currentUser).toBe(reconciled);
  });

  it('does nothing when the claims already match the backend scope', async () => {
    repo.getCurrentUser.mockResolvedValue(userWith(fresh, clinicType));

    await new AuthSessionService().login('owner@example.test', 'pw');

    expect(repo.refreshEffectiveTenantSession).not.toHaveBeenCalled();
    expect(provider.refreshSession).not.toHaveBeenCalled();
    expect(repo.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('never selects a tenant on the client: no reconciliation when the backend has not resolved an effective tenant', async () => {
    const unresolved = { effectiveOrganizationId: ORG, effectiveTenantId: null, sessionRefreshRequired: true };
    repo.getCurrentUser.mockResolvedValue(userWith(unresolved, clinicType));

    await new AuthSessionService().login('owner@example.test', 'pw');

    expect(repo.refreshEffectiveTenantSession).not.toHaveBeenCalled();
    expect(provider.refreshSession).not.toHaveBeenCalled();
  });

  it('stays fail-closed (no throw, no retry loop) when the backend cannot project the claims', async () => {
    const staleUser = userWith(stale, clinicType);
    repo.getCurrentUser.mockResolvedValue(staleUser);
    repo.refreshEffectiveTenantSession.mockRejectedValue(new Error('503 retryable'));

    const result = await new AuthSessionService().login('owner@example.test', 'pw');

    expect(result).toBe(staleUser);
    expect(repo.refreshEffectiveTenantSession).toHaveBeenCalledTimes(1);
    expect(provider.refreshSession).not.toHaveBeenCalled();
    expect(repo.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('attempts reconciliation once per hydration even if the backend still reports the claims as stale', async () => {
    repo.getCurrentUser.mockResolvedValue(userWith(stale, clinicType));

    await new AuthSessionService().login('owner@example.test', 'pw');

    expect(repo.refreshEffectiveTenantSession).toHaveBeenCalledTimes(1);
    expect(provider.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('ignores the provider auth event produced by its own token refresh (no re-entrant hydration loop)', async () => {
    const service = new AuthSessionService();
    repo.getCurrentUser.mockResolvedValue(userWith(stale, clinicType));
    provider.refreshSession.mockImplementation(async () => {
      await service.handleAuthStateChange({ accessToken: 'access-2', refreshToken: 'refresh-2' });
      return { accessToken: 'access-2', refreshToken: 'refresh-2' };
    });

    await service.login('owner@example.test', 'pw');

    expect(repo.refreshEffectiveTenantSession).toHaveBeenCalledTimes(1);
    expect(provider.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('abandons reconciliation if the user logs out meanwhile and does not re-establish the session', async () => {
    repo.getCurrentUser.mockResolvedValue(userWith(stale, clinicType));
    provider.refreshSession.mockImplementation(async () => {
      setLoggingOut(true);
      setLoggingOut(false);
      return { accessToken: 'access-2', refreshToken: 'refresh-2' };
    });

    await new AuthSessionService().login('owner@example.test', 'pw');

    expect(mockState.setTokens).not.toHaveBeenCalledWith('access-2', 'refresh-2');
    expect(repo.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
