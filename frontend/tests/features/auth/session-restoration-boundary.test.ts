import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../../', path), 'utf8');

describe('session restoration boundary', () => {
  it('serializes storage restoration and persists the Supabase-issued session', () => {
    const store = source('features/auth/presentation/providers/auth.store.ts');
    expect(store).toContain('let storageBootstrap: Promise<void> | null');
    expect(store).toContain('if (storageBootstrap) return storageBootstrap');
    expect(store).toContain('const { data, error } = await supabase.auth.setSession');
    expect(store).toContain('await get().setTokens(data.session.access_token, data.session.refresh_token)');
  });

  it('persists Supabase refresh and sign-in session events', () => {
    const provider = source('core/providers/AuthProvider.tsx');
    expect(provider).toContain('supabase.auth.onAuthStateChange');
    expect(provider).toContain('setTokens(session.access_token, session.refresh_token)');
  });
});
