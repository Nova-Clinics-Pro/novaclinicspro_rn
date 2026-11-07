import { anonymous, ApiSession, isRegistered, registrationPayload } from '../../shared/api';
import { identityFor } from '../../shared/identities';
import { config, expect, test } from '../fixtures';
import { RegisterPage } from '../pages/RegisterPage';
import crypto from 'node:crypto';
import type { ClinicType } from '../../shared/types';

const STATUSES = ['registration_submitted', 'pending_review', 'approved', 'rejected', 'provisioning_pending', 'provisioning_in_progress', 'provisioning_completed', 'provisioning_recovery_required'];

for (const clinicType of ['ayurveda', 'general'] as ClinicType[]) {
  test.describe(`NC-UAT-02 Clinic-owner registration (${clinicType})`, () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ scenario: { id: 'NC-UAT-02', clinicType, role: 'clinic_owner' } });
    const owner = identityFor('WEB', clinicType);

    test('client-side validation blocks an empty first step', async ({ page }) => {
      const reg = new RegisterPage(page);
      await reg.open();
      await reg.next().click();
      await expect(page.getByPlaceholder('Your Clinic Name')).toHaveCount(0);
      await expect(page.getByText('Personal Information')).toBeVisible();
    });

    test('mismatched passwords are rejected', async ({ page }) => {
      const reg = new RegisterPage(page);
      await reg.open();
      await reg.fillPersonal(owner, owner.password + 'x');
      await reg.next().click();
      await expect(page.getByPlaceholder('Your Clinic Name')).toHaveCount(0);
    });

    test('valid registration succeeds through the UI and returns to sign-in', async ({ page, evidence, diagnostics }) => {
      test.skip(await isRegistered(owner), 'owner already registered in this run (safe re-run: no duplicate registration)');
      const reg = new RegisterPage(page);
      await reg.open();
      await reg.register(owner);
      await expect(page).toHaveURL(/\/login/, { timeout: 120_000 });
      await evidence.shot('after-registration');
      expect(diagnostics.serverErrors).toEqual([]);
    });

    test('registration status is readable by the authenticated applicant only', async () => {
      const api = new ApiSession(owner);
      await api.signIn();
      const status = await api.get('/api/v1/auth/registration-status/me');
      expect(status.status).toBe(200);
      expect(STATUSES).toContain(status.body.status);
      expect(await anonymous('GET', '/api/v1/auth/registration-status/me')).toBe(401);
    });
  });
}

test.describe('NC-UAT-02 Registration contract and idempotency (API)', () => {
  test.use({ scenario: { id: 'NC-UAT-02', clinicType: 'general', role: 'anonymous' } });
  test('missing Idempotency-Key is rejected and replay with the same key creates no second applicant', async () => {
    const probe = { ...identityFor('WEB', 'general'), email: `nc-web-uat-${config.runId}-idem-probe-${crypto.randomBytes(2).toString('hex')}@${config.emailDomain}`, clinicName: `NC-WEB-UAT-${config.runId} Idempotency Probe ${crypto.randomBytes(2).toString('hex')}`, phone: `+9170${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}` };
    // Missing header: rejected by contract. Body is valid, so the header is the only defect.
    const noKey = await fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registrationPayload(probe)) });
    expect(noKey.status).toBe(422);
    expect(JSON.stringify(await noKey.json()).toLowerCase()).toContain('idempotency');
    // Replay: same key + same payload twice -> same applicant (one registration).
    const key = `nc-uat-${crypto.randomUUID()}`;
    const post = () => fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(registrationPayload(probe)) });
    const first = await post();
    expect([200, 201]).toContain(first.status);
    const a = await first.json();
    const second = await post();
    expect([200, 201]).toContain(second.status);
    const b = await second.json();
    expect(b.application_id).toBe(a.application_id);
    // Same key with a different payload is rejected.
    const changed = await fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ ...registrationPayload(probe), full_name: 'Changed Name' }) });
    expect(changed.status).toBe(409);
  });
});

test.describe('NC-UAT-02 Duplicate clinic name handling (API)', () => {
  test.use({ scenario: { id: 'NC-UAT-02', clinicType: 'general', role: 'anonymous' } });
  test('registering a second clinic with an existing clinic name is rejected as a conflict, not a server error', async () => {
    const existing = identityFor('WEB', 'general');
    const other = { ...existing, email: `nc-web-uat-${config.runId}-dupname-${crypto.randomBytes(2).toString('hex')}@${config.emailDomain}`, phone: `+9171${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}` };
    const res = await fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `nc-uat-${crypto.randomUUID()}` }, body: JSON.stringify(registrationPayload(other)) });
    // NC-BE-002: the clinic-name collision is an expected conflict, never a server error. No naming policy is
    // implied beyond the existing unique tenant code derived from the name.
    expect(res.status, 'a name collision must be reported as a conflict').toBe(409);
    expect((await res.json()).detail?.error, 'a meaningful, stable error code').toBe('clinic_name_unavailable');
    // The rejection happens before any external identity exists, so the same applicant can correct the name and register.
    const corrected = { ...other, clinicName: `${other.clinicName} ${crypto.randomBytes(2).toString('hex')}` };
    const retry = await fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `nc-uat-${crypto.randomUUID()}` }, body: JSON.stringify(registrationPayload(corrected)) });
    expect(retry.status, 'a corrected clinic name registers normally').toBe(201);
  });
});
