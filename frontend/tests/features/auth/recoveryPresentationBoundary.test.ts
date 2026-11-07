import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../../', path), 'utf8');

describe('AUTH-2 recovery presentation boundary', () => {
  it.each(['app/register.tsx', 'app/forgot-password.tsx', 'app/reset-password.tsx'])('%s has no direct Supabase dependency', path => {
    expect(source(path)).not.toContain('supabaseClient');
  });

  it('keeps recovery-link parsing in the presentation adapter and provider operations in AuthSessionService', () => {
    expect(source('app/reset-password.tsx')).toContain('parsePasswordRecoveryCallback');
    expect(source('features/auth/presentation/recovery-links.ts')).toContain('URLSearchParams');
    expect(source('app/reset-password.tsx')).toContain('authSessionService.establishRecoverySession');
    const service = source('features/auth/application/auth-session.service.ts');
    expect(service).toContain('requestPasswordReset');
    expect(service).toContain('completePasswordRecovery');
    expect(service).toContain('finalizeRegistrationSession');
  });
});
