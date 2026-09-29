/**
 * Phase 1 · T-A.4 (FR-A5, design.md §6.2) — Verifies `clearSession()` marks
 * `isAuthenticated: false` SYNCHRONOUSLY, before its awaited secureStorage
 * removals resolve. Previously, the Zustand `set()` call was the LAST thing
 * clearSession() did, after 3 sequential `await`s — meaning any subscriber
 * (e.g. a guarded useFocusEffect) could still observe `isAuthenticated: true`
 * while those awaits were still pending.
 */
import { useAuthStore } from '../../../features/auth/presentation/providers/auth.store';
import { supabase } from '../../../core/api/supabaseClient';
import { secureStorage } from '../../../core/utils/secureStorage';

jest.mock('../../../core/utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../../core/api/supabaseClient', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
    },
  },
}));

describe('auth.store clearSession (T-A.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      currentUser: { tenantId: 'tenant-1' } as any,
      isAuthenticated: true,
      isLoading: false,
      selectedClinicId: 'clinic-1',
    });
  });

  it('sets isAuthenticated: false synchronously, before the awaited secureStorage.removeItem calls resolve', async () => {
    // Never-resolving promise: if the flag flip were gated behind this
    // await (the pre-T-A.4 behavior), it would never happen within this
    // test at all. Checking synchronously, immediately after invoking
    // (no `await` in between), proves the flip happens before the first
    // `await` inside clearSession() is even reached.
    (secureStorage.removeItem as jest.Mock).mockImplementation(() => new Promise<void>(() => {}));

    const clearPromise = useAuthStore.getState().clearSession();
    clearPromise.catch(() => {}); // this promise intentionally never settles in this test

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().currentUser).toBeNull();
  });

  it('still ends with isAuthenticated: false even if secureStorage.removeItem rejects', async () => {
    (secureStorage.removeItem as jest.Mock).mockRejectedValue(new Error('storage unavailable'));

    await useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().selectedClinicId).toBeNull();
  });

  it('restores secure tokens into Supabase before bootstrap can determine authentication', async () => {
    useAuthStore.setState({ isLoading: true });
    (secureStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'supabase_access_token') return 'access-token';
      if (key === 'supabase_refresh_token') return 'refresh-token';
      return null;
    });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({ error: null });

    await useAuthStore.getState().initializeFromStorage();

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isLoading: true,
    });
  });
});
