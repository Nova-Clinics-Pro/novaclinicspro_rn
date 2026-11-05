import { ApiSession, isRegistered } from '../../shared/api';
import { config } from '../../shared/config';
import { identityFor } from '../../shared/identities';
import { expect, test } from '../fixtures';
import { logoutThroughRoute, signInThroughUi } from '../flows';

const me = (token: string) =>
  fetch(`${config.apiBaseUrl}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });

test.describe('NC-UAT-19 Server-side access-token revocation (ayurveda)', () => {
  test.use({ scenario: { id: 'NC-UAT-19', clinicType: 'ayurveda', role: 'clinic_owner' } });
  const owner = identityFor('WEB', 'ayurveda');

  test('a token captured from the browser is rejected after logout, cannot be restored by refresh, and other sessions survive', async ({ page }) => {
    test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');

    // An independent second session of the same user (e.g. another device).
    const otherDevice = new ApiSession(owner);
    await otherDevice.signIn();
    expect((await otherDevice.get('/api/v1/auth/me')).status).toBe(200);

    await signInThroughUi(page, owner);
    const captured = await page.evaluate(() => {
      const key = Object.keys(window.localStorage).find(k => /^sb-.*-auth-token$/.test(k));
      const session = key ? JSON.parse(window.localStorage.getItem(key) as string) : null;
      return session ? { access: session.access_token as string, refresh: session.refresh_token as string } : null;
    });
    expect(captured, 'browser holds a session after sign-in').not.toBeNull();
    expect((await me(captured!.access)).status, 'captured token works before logout').toBe(200);

    await logoutThroughRoute(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 60_000 });

    // Replay the exact captured token: still validly signed and unexpired, but rejected.
    const replay = await me(captured!.access);
    expect(replay.status, 'captured token replayed after logout').toBe(401);
    expect(JSON.stringify(await replay.json())).toContain('session_revoked');

    // The browser keeps no restorable session through reload or direct navigation.
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 60_000 });
    for (const route of ['/clinic-admin', '/profile', '/onboarding/wizard-flow']) {
      await page.goto(route, { waitUntil: 'load' });
      await expect(page.getByTestId('login-email-input'), `direct navigation to ${route}`).toBeVisible({ timeout: 60_000 });
    }

    // Refresh cannot silently recreate the revoked session.
    const refreshed = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: captured!.refresh }),
    });
    if (refreshed.ok) {
      expect((await me((await refreshed.json()).access_token)).status, 'refresh-minted token of revoked session').toBe(401);
    }

    // Revocation is per session: the other device is untouched.
    expect((await otherDevice.get('/api/v1/auth/me')).status, 'independent session after logout').toBe(200);
  });
});
