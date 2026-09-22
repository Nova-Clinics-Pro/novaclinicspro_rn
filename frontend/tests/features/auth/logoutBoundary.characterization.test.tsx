/**
 * Phase 1 · T-0.4 (baseline) / T-A.4 (fix) — Logout boundary / post-logout
 * authenticated-call behavior. See
 * .kiro/specs/phase-1-clinical-platform-trust/design.md §4.A(5)/§6.2 and
 * Document 09 finding V4 (Critical).
 *
 * T-0.4 ORIGINALLY documented the pre-fix baseline: signOut → clearSession →
 * cancel → clear → navigate, where a signOut() failure meant clearSession()
 * and the cache cleanup were NEVER reached — the user stayed fully
 * authenticated locally despite attempting to log out. T-A.4 fixed this
 * (order is now: authGuard flag → clearSession → cancel → clear → navigate,
 * with signOut moved to best-effort AFTER local cleanup) — this file is
 * updated to verify the FIX, per the same pattern used elsewhere in this
 * phase when a characterization file's own governed behavior changes
 * in-scope (e.g. T-D.2's update to startBehavior.characterization.test.ts).
 */
import { act, renderHook } from '@testing-library/react-native';
import { queryClient } from '../../../core/api/queryClient';
import { supabase } from '../../../core/api/supabaseClient';
import { isLoggingOut } from '../../../core/api/authGuard';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));
// useAuth.ts imports `InteractionManager` from the top-level `react-native`
// package. Nothing else in this test's dependency chain needs real
// react-native (useAuthStore, and its secureStorage dependency, are fully
// mocked below), so a minimal mock is used here — a full `requireActual`
// re-export would pull in native-only modules unavailable in this jest
// environment (e.g. the DevMenu turbo module). This makes the deferred
// post-logout navigation run synchronously instead of waiting on the real
// interaction queue.
jest.mock('react-native', () => ({
  InteractionManager: { runAfterInteractions: (cb: () => void) => cb() },
  // Expo SDK 57 initializes expo-modules-core while the test imports its
  // dependencies. Its Platform bridge requires this minimal React Native
  // Platform shape; the test's intentionally narrow native mock otherwise
  // leaves Platform undefined before the logout assertions can run.
  Platform: {
    OS: 'ios',
    select: (values: Record<string, unknown>) => values.ios ?? values.default,
  },
}));
jest.mock('../../../core/api/supabaseClient', () => ({
  supabase: { auth: { signOut: jest.fn(), signInWithPassword: jest.fn(), getSession: jest.fn(), refreshSession: jest.fn() } },
}));
jest.mock('../../../features/auth/data/repositories/auth.repository.impl', () => ({
  authRepository: { getCurrentUser: jest.fn() },
}));
jest.mock('../../../features/auth/domain/usecases/bootstrap-session.usecase', () => ({
  BootstrapSessionUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
}));

const callOrder: string[] = [];
const mockClearSession = jest.fn(async () => {
  callOrder.push('clearSession');
});

jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({
    currentUser: null,
    isAuthenticated: true,
    isLoading: false,
    selectedClinicId: null,
    setTokens: jest.fn(),
    setCurrentUser: jest.fn(),
    setSelectedClinic: jest.fn(),
    clearSession: mockClearSession,
  }),
}));

import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';

describe('Logout boundary (T-0.4 baseline, T-A.4 fix)', () => {
  afterEach(() => {
    // `jest.spyOn(queryClient, ...).mockImplementation(...)` (used in
    // individual tests below) is not undone by clearAllMocks() — it must be
    // restored, or a later test's real `queryClient.clear()` call would
    // still run a previous test's fake implementation instead.
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    callOrder.length = 0;
    jest.clearAllMocks();
    (supabase.auth.signOut as jest.Mock).mockImplementation(async () => {
      callOrder.push('supabaseSignOut');
    });
  });

  it('T-A.4 FIX: logout clears the local session, cancels and clears the query cache, THEN attempts Supabase signOut (moved to best-effort, after local cleanup)', async () => {
    jest.spyOn(queryClient, 'cancelQueries').mockImplementation(async () => {
      callOrder.push('cancelQueries');
      return 0;
    });
    jest.spyOn(queryClient, 'clear').mockImplementation(() => {
      callOrder.push('clear');
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(callOrder).toEqual(['clearSession', 'cancelQueries', 'clear', 'supabaseSignOut']);
  });

  it('T-A.4 FIX: the authGuard flag is set synchronously before local cleanup starts, and cleared once logout completes', async () => {
    expect(isLoggingOut()).toBe(false);

    const { result } = renderHook(() => useAuth());
    const logoutPromise = act(async () => {
      await result.current.logout();
    });
    // The flag must already be true synchronously, before any awaited step
    // (clearSession/cancelQueries/clear/signOut) has had a chance to run.
    expect(isLoggingOut()).toBe(true);

    await logoutPromise;
    expect(isLoggingOut()).toBe(false);
  });

  it('BASELINE: logout empties the query cache, so a query cached before logout no longer exists to be (re)fetched afterward', async () => {
    // Seed the cache as if a screen had an active/cached query (e.g. the
    // doctor dashboard's appointment list) before logout.
    queryClient.setQueryData(['pre-logout-query'], { some: 'cached-data' });
    expect(queryClient.getQueryData(['pre-logout-query'])).toEqual({ some: 'cached-data' });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    // CURRENT BEHAVIOR: the cache is empty after logout. A stray
    // `useFocusEffect`-driven `refetch()` on a screen that is still mounted
    // during the navigation transition has nothing left to refetch, which is
    // what currently prevents the previously-observed post-logout
    // "Authorization header required" 401 (see useAuth.ts logout() comment).
    expect(queryClient.getQueryData(['pre-logout-query'])).toBeUndefined();
  });

  it('T-A.4 FIX: if Supabase signOut fails, local cleanup (clearSession + cache cancel/clear) still happens, and logout() does NOT re-throw', async () => {
    // This is the exact gap T-0.4 originally documented: previously, a
    // signOut failure meant clearSession/cancelQueries/clear were NEVER
    // reached at all, and logout() re-threw — leaving the user fully
    // authenticated locally despite attempting to log out. Local logout
    // must not depend on the remote signOut call succeeding.
    (supabase.auth.signOut as jest.Mock).mockRejectedValue(new Error('network error'));
    const cancelSpy = jest.spyOn(queryClient, 'cancelQueries');
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.logout()).resolves.toBeUndefined();
    });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    // The signOut failure is swallowed, not surfaced — local logout already
    // succeeded, so there's nothing left for the UI to retry.
    expect(isLoggingOut()).toBe(false);
  });
});
