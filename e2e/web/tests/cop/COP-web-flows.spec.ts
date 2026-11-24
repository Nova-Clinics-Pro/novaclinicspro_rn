import type { Page } from '@playwright/test';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, test } from '../../../cop/fixture';
import { identityFor } from '../../../shared/identities';
import { consultAndSign, eventually, far, need, note, ok, world } from '../../../cop/roles';

/**
 * WS12: real-use checks in the web app (Chromium against the running web app, signed in through the login screen with the real role logins)
 * for defects that were Fixed but never clicked through: the dispense screen (DEF_COP_003), tapping an inbox entry (DEF_COP_066) and the
 * accessibility audit (DEF_COP_011).
 */
const ROUTE: Record<string, string> = { owner: '/owner', admin: '/clinic-admin', receptionist: '/clinic-admin', doctor: '/doctor', therapist: '/therapist' };
type Role = keyof typeof ROUTE;

const creds = (role: Role) => {
  const id: any = role === 'owner' ? identityFor('WEB', 'ayurveda') : readRoleIdentities()[role];
  test.skip(!id?.email, `blocked: the ${role} login is not provisioned`);
  return id as { email: string; password: string };
};
async function signIn(page: Page, role: Role) {
  const id = creds(role);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByTestId('login-email-input').fill(id.email); await page.getByTestId('login-password-input').fill(id.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(u => !/\/login/.test(u.toString()), { timeout: 90_000 });
  await page.waitForTimeout(3000);
}
const open = async (page: Page, route: string, wait = 5000) => { await page.goto(route, { waitUntil: 'load' }); await page.waitForTimeout(wait); };
const TABLET = 'COP Tablet X (below reorder point)';

test.describe('WS12 real-use checks in the web app', () => {
  test('TC_COP_DSP_004 a signed prescription is dispensed through the screen: queue, quantity, bill created, then it leaves the queue', async ({ page }) => {
    const w = await world(); const doc = await need('doctor'); const adm = await need('admin');
    const c = await consultAndSign(w, 'P-Male', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    expect(ok(rx.status), `prescription ${rx.status}`).toBe(true); const id = rx.body.id as string;
    expect(ok((await doc.request('PATCH', `${w.b}/prescriptions/${id}`, { status: 'SIGNED' })).status)).toBe(true);

    await signIn(page, 'receptionist');
    await open(page, '/clinic-admin/dispensing', 6000);
    const entry = page.getByTestId(`queue-item-${id}`);
    expect(await entry.count(), 'the signed prescription is in the Ready to dispense list').toBe(1);
    await entry.click(); await page.waitForTimeout(4000);
    const pick = page.getByTestId('dispense-pick-0');
    await expect(pick, 'the stock item was suggested from the medicine name').toContainText('COP Tablet X', { timeout: 45_000 });
    await page.getByTestId('dispense-quantity-0').fill('1');
    expect(await page.getByTestId('dispense-estimate').innerText(), 'an estimate of the bill is shown').toMatch(/\d/);
    await page.getByTestId('dispense-confirm').click();
    await page.getByTestId('dispense-done-title').waitFor({ timeout: 30_000 });
    note(`screen after dispensing: ${(await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 200)}`);
    expect(await page.getByTestId('dispense-collect').count(), 'the front desk is offered Take payment').toBe(1);
    const status = (await adm.get(`${w.b}/dispensing/prescriptions/${id}`)).body;
    expect(status.dispensed, 'the server shows it as dispensed with a bill').toBe(true);
    await page.getByTestId('dispense-done').click(); await page.waitForTimeout(4000);
    expect(await page.getByTestId(`queue-item-${id}`).count(), 'and it has left the queue').toBe(0);
  });

  test('TC_COP_NTF_009 tapping a plan notification in the inbox opens the plan\'s scheduling screen for the front desk', async ({ page }) => {
    const w = await world(); const doc = await need('doctor'); const adm = await need('admin');
    const c = await consultAndSign(w, 'P-Female3', far());
    const mk = await doc.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients['P-Female3'], treatment_id: w.seed.treatments.COPABH, start_date: c.day.toISOString().slice(0, 10), duration_days: 2, case_sheet_id: c.cs.id, episode_id: c.ep.id, appointment_id: c.ap.id });
    expect(ok(mk.status), `sheet ${mk.status}`).toBe(true); const sheet = mk.body.id as string;
    const sent = await doc.post(`${w.ts}/${sheet}/send-to-scheduling`, { planned_sessions: 2, frequency: 'daily', recommended_therapy: 'Abhyanga' }, { 'If-Match': String(Math.floor(Number(mk.body.version ?? 1))) });
    expect(ok(sent.status), `ordered ${sent.status}`).toBe(true);
    const inbox = await eventually(async () => JSON.stringify((await adm.get(`/api/v1/notifications/${w.t}/history?limit=50`)).body), (v) => v.includes(sheet), 60_000);
    expect(inbox, 'the admin\'s inbox has the plan notification (the outbox worker delivered it)').toContain(sheet);

    await signIn(page, 'admin');
    await open(page, '/notifications', 6000);
    const entry = page.getByText('Treatment plan ordered').first();
    expect(await entry.count(), `the inbox shows the notification (screen: ${(await page.locator('body').innerText()).slice(0, 160).replace(/\n+/g, ' | ')})`).toBe(1);
    await entry.click(); await page.waitForTimeout(5000);
    const url = page.url().replace(/^https?:\/\/[^/]+/, ''); note(`after the tap: ${url}`);
    expect(url, 'the tap opens the plan\'s scheduling screen, not just the inbox').toMatch(/\/clinic-admin\/treatment-sheets\/[0-9a-f-]+\/schedule/);
  });
});

/** Every visible control: does it have a name a screen reader can read, and is it at least 44 px each way? */
const audit = (page: Page) => page.evaluate(() => {
  const SELECTOR = 'button, a[href], input, textarea, select, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="menuitem"]';
  const strip = (s: string) => s.replace(/[-]/g, '').replace(/\s+/g, ' ').trim();
  const nameOf = (el: HTMLElement): string => {
    const labelled = el.getAttribute('aria-labelledby');
    return strip(el.getAttribute('aria-label') ?? '') || (labelled ? strip(labelled.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ')) : '')
      || strip(el.getAttribute('title') ?? '') || strip((el as HTMLInputElement).placeholder ?? '') || strip(el.innerText ?? '') || strip(el.querySelector('img')?.getAttribute('alt') ?? '');
  };
  const unlabelled: string[] = []; const small: string[] = []; let checked = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))) {
    const style = getComputedStyle(el); const box = el.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || box.height === 0) continue;
    if ((el as HTMLInputElement).type === 'hidden' || el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) continue;
    checked++;
    const label = strip(el.getAttribute('aria-label') ?? '') || strip(el.innerText ?? '') || strip((el as HTMLInputElement).placeholder ?? '');
    const where = `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''}${label ? ` "${label.slice(0, 28)}"` : ''}`;
    if (!nameOf(el)) unlabelled.push(where);
    if (box.width < 44 || box.height < 44) small.push(`${where} ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  return { checked, unlabelled, small };
});

const SCREENS: Record<string, string[]> = {
  admin: ['/clinic-admin', '/clinic-admin/appointments', '/clinic-admin/staff', '/clinic-admin/inventory', '/clinic-admin/reports', '/clinic-admin/dispensing', '/clinic-admin/settings'],
  doctor: ['/doctor'], therapist: ['/therapist'], owner: ['/owner'],
};

test.describe('WS12 accessibility audit (UIX_010)', () => {
  test('TC_COP_UIX_010 controls on the core screens have names for a screen reader and are at least 44 px', async ({ page }) => {
    const problems: string[] = []; let checked = 0;
    for (const [role, routes] of Object.entries(SCREENS) as [Role, string[]][]) {
      await signIn(page, role);
      for (const route of routes) {
        await open(page, route, 5000); const r = await audit(page); checked += r.checked;
        if (r.unlabelled.length) problems.push(`${role} ${route}: ${r.unlabelled.length} unnamed (${[...new Set(r.unlabelled)].slice(0, 8).join(', ')})`);
        if (r.small.length) problems.push(`${role} ${route}: ${r.small.length} under 44 px (${[...new Set(r.small)].slice(0, 8).join(', ')})`);
      }
      await page.context().clearCookies(); await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ } }).catch(() => undefined);
    }
    note(`${checked} controls checked; ${problems.length} screens with problems`);
    expect(problems, `accessibility problems: ${problems.join(' || ')}`).toHaveLength(0);
  });
});
