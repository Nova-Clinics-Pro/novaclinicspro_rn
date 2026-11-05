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

    // Regression (NC-UAT-04): the onboarding wizard and the role dashboards used to render their authenticated
    // shell for anonymous visitors (and for visitors whose browser storage had been cleared).
    for (const route of [
      '/onboarding/wizard-flow?tenantId=00000000-0000-0000-0000-000000000001',
      '/onboarding/choice',
      '/doctor',
      '/therapist',
      '/profile',
      '/notifications',
      '/notification-preferences',
    ]) {
      test(`anonymous visit to ${route.split('?')[0]} is redirected to sign-in`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'load' });
        await expect(page.getByTestId('login-email-input'), `${route} must send an anonymous visitor to sign-in`).toBeVisible({ timeout: 60_000 });
      });
    }
  });
  void clinicType;
}
