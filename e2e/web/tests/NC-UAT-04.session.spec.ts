import { identityFor } from '../../shared/identities';
import { isRegistered } from '../../shared/api';
import type { ClinicType } from '../../shared/types';
import { expect, test } from '../fixtures';
import { signInThroughUi } from '../flows';

for (const clinicType of ['ayurveda', 'general'] as ClinicType[]) {
  test.describe(`NC-UAT-04 Session persistence (${clinicType})`, () => {
    test.use({ scenario: { id: 'NC-UAT-04', clinicType, role: 'clinic_owner' } });
    const owner = identityFor('WEB', clinicType);

    test('session survives a browser reload and ends when browser storage is cleared', async ({ page, context }) => {
      test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');
      await signInThroughUi(page, owner);
      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(4000);
      await expect(page, 'protected area still accessible after reload').not.toHaveURL(/\/login(\?|$)/);
      await context.clearCookies();
      await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
      await page.reload({ waitUntil: 'load' });
      await expect(page.getByTestId('login-email-input')).toBeVisible({ timeout: 60_000 });
    });
  });
}
