import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../../', path), 'utf8');

describe('session restoration boundary', () => {
  it('keeps the store provider-free and assigns provider restoration to the session boundary', () => {
    const store = source('features/auth/presentation/providers/auth.store.ts');
    const coordinator = source('features/auth/application/auth-session.service.ts');
    expect(store).not.toContain('supabase.auth');
    expect(coordinator).toContain('supabaseAuthProvider.setSession');
    expect(coordinator).toContain('supabaseAuthProvider.getSession');
  });

  it('keeps AuthProvider as lifecycle host without direct Supabase access', () => {
    const provider = source('core/providers/AuthProvider.tsx');
    expect(provider).toContain('authSessionService.bootstrap');
    expect(provider).toContain('authSessionService.subscribeToAuthState');
    expect(provider).not.toContain('supabase.auth');
  });

  it('keeps presentation and domain free of Supabase Auth imports', () => {
    expect(source('features/auth/presentation/hooks/useAuth.ts')).not.toContain('supabaseClient');
    expect(existsSync(resolve(__dirname, '../../../features/auth/domain/usecases/bootstrap-session.usecase.ts'))).toBe(false);
  });
});
