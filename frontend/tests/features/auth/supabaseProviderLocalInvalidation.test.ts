/**
 * Regression: NC-UAT-04 / NC-UAT-12. The provider adapter must be able to remove
 * the persisted provider session without waiting for the SDK's network call.
 */
const mockRemoveItem = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../../core/api/supabaseClient', () => ({
  SUPABASE_AUTH_STORAGE_KEY: 'sb-testref-auth-token',
  supabaseAuthStorage: { removeItem: (...args: unknown[]) => mockRemoveItem(...args) },
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

import { SupabaseAuthProvider } from '../../../features/auth/data/datasources/supabase-auth.provider';

describe('SupabaseAuthProvider local invalidation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes the persisted provider session and returns the token to revoke', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } }, error: null });

    await expect(new SupabaseAuthProvider().invalidateLocalSession()).resolves.toBe('tok-1');

    expect(mockRemoveItem).toHaveBeenCalledWith('sb-testref-auth-token');
  });

  it('removes the persisted session even when the session lookup throws', async () => {
    mockGetSession.mockRejectedValue(new Error('lock acquisition failed'));

    await expect(new SupabaseAuthProvider().invalidateLocalSession()).rejects.toThrow('lock acquisition failed');

    expect(mockRemoveItem).toHaveBeenCalledWith('sb-testref-auth-token');
  });

  it('returns null when there is nothing to revoke', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(new SupabaseAuthProvider().invalidateLocalSession()).resolves.toBeNull();
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
  });

  it('signs out with local scope only, so other sessions of the user are not ended', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await new SupabaseAuthProvider().signOut();
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });

    mockSignOut.mockResolvedValue({ error: { message: 'boom' } });
    await expect(new SupabaseAuthProvider().signOut()).rejects.toThrow();
  });
});
