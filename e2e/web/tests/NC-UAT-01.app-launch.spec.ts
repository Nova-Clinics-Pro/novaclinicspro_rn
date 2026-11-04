import { expect, test } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';

for (const clinicType of ['ayurveda'] as const) {
  test.describe('NC-UAT-01 App launch', () => {
    test.use({ scenario: { id: 'NC-UAT-01', clinicType: 'n/a', role: 'anonymous' } });

    test('web application renders the sign-in entry without blocking errors', async ({ page, diagnostics, evidence }) => {
      const login = new LoginPage(page);
      await login.open();
      await expect(login.password()).toBeVisible();
      await expect(login.submit()).toBeVisible();
      await expect(page.getByText('Register as Clinic Owner')).toBeVisible();
      await evidence.shot('launch');
      expect(diagnostics.pageErrors, 'uncaught JavaScript errors').toEqual([]);
      expect(diagnostics.serverErrors, '5xx responses during launch').toEqual([]);
    });

    test('protected routes are not reachable anonymously', async ({ page }) => {
      await page.goto('/clinic-admin', { waitUntil: 'load' });
      await expect(page).toHaveURL(/\/login|\/$/, { timeout: 60_000 });
      await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 60_000 });
    });
  });
  void clinicType;
}
