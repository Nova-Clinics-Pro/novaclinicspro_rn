import { supabase } from '../../../core/api/supabaseClient';
import { SupabaseAuthProvider } from '../../../features/auth/data/datasources/supabase-auth.provider';
jest.mock('../../../core/api/supabaseClient', () => ({ supabase: { auth: { resetPasswordForEmail: jest.fn(), setSession: jest.fn(), updateUser: jest.fn() } } }));
describe('Supabase recovery provider contract', () => {
  beforeEach(() => jest.clearAllMocks());
  it('passes the exact callback through resetPasswordForEmail', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
    await new SupabaseAuthProvider().resetPasswordForEmail('synthetic@example.test', 'http://192.168.50.20:8081/reset-password');
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('synthetic@example.test', { redirectTo: 'http://192.168.50.20:8081/reset-password' });
  });
  it('establishes callback credentials using setSession', async () => {
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' } }, error: null });
    await expect(new SupabaseAuthProvider().setSession({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' })).resolves.toEqual({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
    expect(supabase.auth.setSession).toHaveBeenCalledWith({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' });
  });
  it('updates the password using updateUser and propagates provider failures', async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'synthetic provider rejection' } });
    const provider = new SupabaseAuthProvider();
    await provider.updatePassword('SyntheticPassword1');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'SyntheticPassword1' });
    await expect(provider.updatePassword('SyntheticPassword2')).rejects.toThrow('Authentication service is unavailable');
  });
});
