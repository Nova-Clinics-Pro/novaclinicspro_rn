import type { Page } from '@playwright/test';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, test } from '../../../cop/fixture';
import { consultAndSign, far, need, ok, world } from '../../../cop/roles';

/**
 * WS14: the allergy screens in the browser, signed in through the login screen with the real role logins: recording an allergy on the patient
 * screen, and being stopped (then confirming) when signing a prescription for a medicine the patient is allergic to.
 */
const creds = (role: 'receptionist' | 'doctor') => {
  const id: any = readRoleIdentities()[role];
  test.skip(!id?.email, `blocked: the ${role} login is not provisioned`);
  return id as { email: string; password: string };
};
async function signIn(page: Page, role: 'receptionist' | 'doctor') {
  const id = creds(role);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByTestId('login-email-input').fill(id.email); await page.getByTestId('login-password-input').fill(id.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(u => !/\/login/.test(u.toString()), { timeout: 90_000 });
  await page.waitForTimeout(3000);
}
const open = async (page: Page, route: string, wait = 6000) => { await page.goto(route, { waitUntil: 'load' }); await page.waitForTimeout(wait); };
const status = async (page: Page, id = 'allergy-banner-status') => (await page.getByTestId(id).first().innerText()).trim();

test.describe('WS14 allergies in the web app', () => {
  test('TC_COP_ALG_005 the front desk sees "Not recorded" for a new patient, records an allergy, and the patient screen then lists it', async ({ page }) => {
    const w = await world(); const adm = await need('admin');
    const created = await adm.post(`${w.b}/clients`, { full_name: `COP allergy screen ${Date.now()}`, phone: `+9196${String(Date.now()).slice(-8)}`, gender: 'female', date_of_birth: '1992-04-04' });
    expect(ok(created.status), `patient ${created.status}`).toBe(true); const client = created.body.id as string;
    await signIn(page, 'receptionist'); await open(page, `/clinic-admin/clients/${client}`, 9000);
    await expect(page.getByTestId('allergy-panel')).toBeVisible({ timeout: 45_000 });
    expect(await status(page), 'nobody has recorded anything: not recorded, never an empty list').toBe('Not recorded');
    await page.getByTestId('allergy-substance-input').fill('Penicillin');
    await page.getByTestId('allergy-severity-severe').click();
    await page.getByTestId('allergy-save').click();
    await expect.poll(async () => status(page), { timeout: 30_000 }).toContain('Allergic to: Penicillin');
    expect((await adm.get(`${w.b}/clients/${client}/allergies`)).body, 'the server holds it').toMatchObject({ status: 'has_allergies' });
  });

  test('TC_COP_ALG_006 the doctor is stopped when signing a prescription for a medicine the patient is allergic to, and can sign anyway', async ({ page }) => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female2', far()); const client = w.seed.patients['P-Female2'];
    const allergen = `Allergen${Date.now()}`;
    expect((await doc.post(`${w.b}/clients/${client}/allergies`, { substance: allergen, severity: 'severe' })).status).toBe(201);
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: client, episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: `${allergen} tablet`, dosage: '1', frequency: 'bd', duration: '2 days' }] } });
    expect(ok(rx.status), `prescription ${rx.status}`).toBe(true); const id = rx.body.id as string;
    await doc.request('PATCH', `${w.b}/prescriptions/${id}`, { status: 'FINAL' });
    await signIn(page, 'doctor'); await open(page, `/clinic-admin/clients/${client}/prescriptions/${id}`, 9000);
    expect(await status(page, 'prescription-allergy-banner-status'), 'the allergy is shown on the prescription').toContain(allergen);
    await page.getByText(/^Sign$/).first().click(); await page.waitForTimeout(1500);
    await page.getByText('Confirm', { exact: true }).last().click(); await page.waitForTimeout(4000);
    await expect(page.getByText('Allergy alert')).toBeVisible({ timeout: 20_000 });
    expect(await page.locator('body').innerText(), 'the alert names the medicine and the allergy').toContain(`${allergen} tablet: allergic to ${allergen}`);
    expect((await doc.get(`${w.b}/prescriptions/${id}`)).body.status, 'it is not signed yet').not.toBe('SIGNED');
    await page.getByText('Sign anyway').click(); await page.waitForTimeout(5000);
    expect((await doc.get(`${w.b}/prescriptions/${id}`)).body.status, 'signed after the doctor confirmed').toBe('SIGNED');
  });
});
