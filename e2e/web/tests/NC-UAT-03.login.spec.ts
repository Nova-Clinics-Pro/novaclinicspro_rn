import { ApiSession, isRegistered } from '../../shared/api';
import { identityFor } from '../../shared/identities';
import type { ClinicType } from '../../shared/types';
import { expect, test } from '../fixtures';
import { signInThroughUi } from '../flows';
import { LoginPage } from '../pages/LoginPage';

for (const clinicType of ['ayurveda', 'general'] as ClinicType[]) {
  test.describe(`NC-UAT-03 Login (${clinicType})`, () => {
    test.use({ scenario: { id: 'NC-UAT-03', clinicType, role: 'clinic_owner' } });
    const owner = identityFor('WEB', clinicType);

    test('invalid credentials are rejected and no session is created', async ({ page }) => {
      test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');
      const login = new LoginPage(page);
      await login.open();
      await login.signIn(owner, owner.password + 'wrong');
      await page.waitForTimeout(4000);
      await expect(page).toHaveURL(/\/login/);
      await expect(login.email()).toBeVisible();
    });

    test('valid credentials sign in and the account identity matches', async ({ page, evidence }) => {
      test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');
      await signInThroughUi(page, owner);
      await evidence.shot('signed-in');
      const api = new ApiSession(owner);
      await api.signIn();
      const me = await api.get('/api/v1/auth/me');
      expect(me.status).toBe(200);
      expect(me.body.email.toLowerCase()).toBe(owner.email.toLowerCase());
      expect(me.body.clinic_names).toContain(owner.clinicName);
    });
  });
}
