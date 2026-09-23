import { authRepository } from '../../../features/auth/data/repositories/auth.repository.impl';
import { BootstrapSessionUseCase } from '../../../features/auth/domain/usecases/bootstrap-session.usecase';
import { useAuthStore } from '../../../features/auth/presentation/providers/auth.store';
import { supabase } from '../../../core/api/supabaseClient';
import { secureStorage } from '../../../core/utils/secureStorage';

jest.mock('../../../core/api/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

jest.mock('../../../core/utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../../features/auth/data/repositories/auth.repository.impl', () => ({
  authRepository: {
    getCurrentUser: jest.fn(),
  },
}));

describe('persisted auth bootstrap', () => {
  let restoredSession: unknown = null;

  beforeEach(() => {
    jest.clearAllMocks();
    restoredSession = null;
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: true,
      selectedClinicId: null,
    });
    (supabase.auth.getSession as jest.Mock).mockImplementation(async () => ({
      data: { session: restoredSession },
      error: null,
    }));
    (supabase.auth.setSession as jest.Mock).mockImplementation(
      async ({
        access_token,
        refresh_token,
      }: {
        access_token: string;
        refresh_token: string;
      }) => {
        restoredSession = { access_token, refresh_token };
        return { data: { session: restoredSession }, error: null };
      }
    );
  });

  it('restores the persisted session before /auth/me is evaluated', async () => {
    (secureStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'supabase_access_token') return 'persisted-access-token';
      if (key === 'supabase_refresh_token') return 'persisted-refresh-token';
      return null;
    });
    const user = { userId: 'user-1', applicationStatus: 'onboarding' };
    (authRepository.getCurrentUser as jest.Mock).mockResolvedValue(user);

    await useAuthStore.getState().initializeFromStorage();
    const result = await new BootstrapSessionUseCase(authRepository).execute();

    expect(
      (supabase.auth.setSession as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (supabase.auth.getSession as jest.Mock).mock.invocationCallOrder[0]
    );
    expect(authRepository.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ authenticated: true, session: user });
  });

  it('does not call /auth/me when storage contains no session', async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);

    await useAuthStore.getState().initializeFromStorage();
    const result = await new BootstrapSessionUseCase(authRepository).execute();

    expect(authRepository.getCurrentUser).not.toHaveBeenCalled();
    expect(result.authenticated).toBe(false);
  });
});
