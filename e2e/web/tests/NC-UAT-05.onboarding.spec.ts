import { ApiSession, isRegistered } from '../../shared/api';
import { identityFor } from '../../shared/identities';
import type { ClinicType } from '../../shared/types';
import { expect, test } from '../fixtures';
import { signInThroughUi } from '../flows';

for (const clinicType of ['ayurveda', 'general'] as ClinicType[]) {
  test.describe(`NC-UAT-05 Clinic onboarding (${clinicType})`, () => {
    test.use({ scenario: { id: 'NC-UAT-05', clinicType, role: 'clinic_owner' } });
    const owner = identityFor('WEB', clinicType);

    test('a newly registered owner can open the onboarding journey after sign-in', async ({ page, evidence, diagnostics }) => {
      test.skip(!(await isRegistered(owner)), 'owner not registered (run NC-UAT-02 first)');
      const api = new ApiSession(owner);
      await api.signIn();
      const me = await api.get('/api/v1/auth/me');
      expect(['onboarding', 'approved', 'pending_review', 'active']).toContain(me.body.application_status);

      await signInThroughUi(page, owner);
      await expect(page).toHaveURL(/onboarding/, { timeout: 60_000 });
      await page.waitForTimeout(6000);
      await evidence.shot('onboarding');
      // Regression NC-WEB-001: a fresh owner's token has no tenant claim yet (/auth/me session_refresh_required). The session
      // must be reconciled so the wizard loads its journey instead of a tenant-mismatch error.
      await expect(page.getByText('Unable to load clinic preparation'), 'onboarding journey failed to load').toHaveCount(0);
      await expect(page.getByText('Your clinic preparation journey'), 'the preparation journey is rendered').toBeVisible({ timeout: 30_000 });
      // The handshake persisted the tenant claim: a brand-new sign-in token no longer reports stale claims.
      const afterHandshake = new ApiSession(owner);
      await afterHandshake.signIn();
      expect((await afterHandshake.get('/api/v1/auth/me')).body.session_refresh_required, 'claims reconciled after the UI handshake').toBe(false);
      expect(diagnostics.pageErrors).toEqual([]);
    });
  });
}
