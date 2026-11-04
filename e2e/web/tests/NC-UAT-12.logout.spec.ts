import { ApiSession, isRegistered } from '../../shared/api';
import { identityFor } from '../../shared/identities';
import { expect, test } from '../fixtures';
import { logoutThroughRoute, signInThroughUi } from '../flows';

test.describe('NC-UAT-12 Logout and login again (ayurveda)', () => {
  test.use({ scenario: { id: 'NC-UAT-12', clinicType: 'ayurveda', role: 'clinic_owner' } });
  const owner = identityFor('WEB', 'ayurveda');

  test('logout denies protected access and a new sign-in restores the same identity', async ({ page }) => {
    test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');
    await signInThroughUi(page, owner);
    await logoutThroughRoute(page);
    await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 60_000 });
    await page.goto('/clinic-admin', { waitUntil: 'load' });
    await expect(page.getByTestId('login-email-input'), 'protected route after logout').toBeVisible({ timeout: 60_000 });
    await signInThroughUi(page, owner);
    const api = new ApiSession(owner);
    await api.signIn();
    expect((await api.get('/api/v1/auth/me')).body.email.toLowerCase()).toBe(owner.email.toLowerCase());
  });
});
