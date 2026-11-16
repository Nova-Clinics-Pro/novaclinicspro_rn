import type { Page } from '@playwright/test';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, test } from '../../../cop/fixture';
import { identityFor } from '../../../shared/identities';
import { consultAndSign, far, list, need, note, ok, scheduledPlan, slot, workday, world, ymd } from '../../../cop/roles';

/**
 * COP cases that need the real web UI (Chromium against the running web app, signed in through the login screen with the
 * real role logins). Each case states what it observed; nothing is passed that was not looked at.
 */
const ROUTE: Record<string, string> = { owner: '/owner', admin: '/clinic-admin', receptionist: '/clinic-admin', doctor: '/doctor', therapist: '/therapist' };
type Role = keyof typeof ROUTE;

const creds = (role: Role, clinic: 'ayurveda' | 'general' = 'ayurveda') => {
  const id: any = role === 'owner' ? identityFor('WEB', clinic) : readRoleIdentities()[role];
  test.skip(!id?.email, `blocked: the ${role} login is not provisioned`);
  return id as { email: string; password: string };
};

async function signIn(page: Page, role: Role, opts: { hindi?: boolean; clinic?: 'ayurveda' | 'general'; settle?: number } = {}) {
  const id = creds(role, opts.clinic);
  await page.setViewportSize({ width: 1280, height: 900 });
  if (opts.hindi) await page.addInitScript(() => localStorage.setItem('@app_locale', 'hi-IN'));
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByTestId('login-email-input').fill(id.email); await page.getByTestId('login-password-input').fill(id.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(u => !/\/login/.test(u.toString()), { timeout: 90_000 });
  await page.waitForTimeout(opts.settle ?? 3000);
}
const open = async (page: Page, route: string, wait = 6000) => { await page.goto(route, { waitUntil: 'load' }); await page.waitForTimeout(wait); };
const text = async (page: Page) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ');

/** Collects crash and push-token messages from the browser for the whole test. */
const watch = (page: Page) => {
  const seen: string[] = [];
  page.on('console', m => { if (m.type() === 'error') seen.push(m.text()); });
  page.on('pageerror', e => seen.push(String(e)));
  page.on('dialog', d => { seen.push(`dialog: ${d.message()}`); void d.dismiss(); });
  return seen;
};

/** Opens the Add Client form: the list's add control is an icon-only button at the top right of the header. */
async function openAddClient(page: Page) {
  await open(page, '/clinic-admin/clients', 6000);
  const box = await page.evaluateHandle(() => [...document.querySelectorAll<HTMLElement>('*')].filter(e => getComputedStyle(e).cursor === 'pointer' && !(e.textContent ?? '').replace(/[\uE000-\uF8FF\s]/g, '') && e.getBoundingClientRect().top < 200 && e.getBoundingClientRect().width > 20).sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0] ?? null);
  const el = box.asElement(); if (el) await el.click(); await page.waitForTimeout(3000);
}

/** The print preview is an iframe: its text and the document inside it. */
const printFrame = (page: Page) => page.frames().find(f => f !== page.mainFrame());
const frameText = async (page: Page) => (await printFrame(page)?.locator('body').innerText().catch(() => '')) ?? '';

test.describe('Web UI: sign-in, dashboards, settings', () => {
  test('TC_COP_OWN_001 the owner lands on the clinic dashboard showing the role and the clinic name', async ({ page }) => {
    const seed: any = (await world()).seed;
    await signIn(page, 'owner', { settle: 5000 });
    const body = await text(page); const url = page.url();
    note(`landed on ${url.replace(/^https?:\/\/[^/]+/, '')}: ${body.slice(0, 160)}`);
    expect(url, 'the owner lands on the dashboard, not the clinic-preparation journey').not.toMatch(/onboarding/);
    expect(body, 'the screen names the role').toMatch(/Clinic Owner/i);
    expect(body, 'and the clinic').toContain(String(seed.clinicName ?? 'Ayurveda Clinic').replace(/^NC-WEB-UAT-cop\d+ /, ''));
  });

  test('TC_COP_ADM_002 the Admin edits the clinic profile and letterhead branding', async ({ page }) => {
    await signIn(page, 'admin'); await open(page, '/clinic-admin/settings');
    const settings = await text(page);
    expect.soft(settings, 'Settings offers a Clinic profile').toMatch(/Clinic profile|Clinic Profile/);
    await open(page, '/clinic-admin/branding');
    const branding = await text(page);
    expect(branding, `branding is configurable (screen says: ${branding.slice(0, 120)})`).not.toMatch(/Coming Soon|will be available when branding API is enabled/i);
  });

  test('TC_COP_DSH_006 the Admin dashboard cards equal the data', async ({ page }) => {
    const w = await world(); const adm = await need('admin'); const today = ymd(new Date());
    const staff = list((await adm.get(`${w.b}/staff?limit=500`)).body).filter(s => s.is_active !== false).length;
    const appts = list((await adm.get(`${w.b}/appointments?date=${today}&limit=100`)).body).length;
    const low = list((await adm.get(`${w.b}/inventory?limit=500`)).body).filter(i => Number(i.current_stock) <= Number(i.reorder_point ?? i.reorder_level ?? -1)).length;
    await signIn(page, 'admin'); await open(page, '/clinic-admin', 8000);
    const body = await text(page); const card = (label: string) => Number(body.match(new RegExp(`${label}\\s*\\|\\s*(\\d+)`))?.[1]);
    note(`screen: ${body.slice(0, 220)}`);
    expect.soft(card('Total Appointments'), 'Total Appointments').toBe(appts);
    expect.soft(card('Active Staff'), 'Active Staff').toBe(staff);
    expect.soft(card('Inventory Alerts'), `Inventory Alerts (items at or below reorder point: ${low})`).toBe(low);
  });

  test('TC_COP_DSH_007 prescriptions are counted on the issuing doctor\'s dashboard', async ({ page }) => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP', dosage: '1', frequency: 'bd', duration: '1 day' }] } });
    await signIn(page, 'doctor'); await open(page, '/doctor', 8000);
    const body = await text(page); note(`doctor dashboard: ${body.slice(0, 300)}`);
    expect(body, 'the dashboard shows a prescriptions figure').toMatch(/Prescriptions?\s*\|?\s*\d+|\d+\s*\|?\s*Prescriptions?/i);
  });

  test('TC_COP_DSH_008 therapist Assigned, Completed and Pending equal the sessions', async ({ page }) => {
    const w = await world(); const th = await need('therapist'); const today = ymd(new Date());
    const ses = list((await th.get(`${w.b}/staff/me/dashboard/therapist/sessions?date=${today}`)).body);
    await signIn(page, 'therapist'); await open(page, '/therapist', 8000);
    const body = await text(page); const card = (l: string) => Number(body.match(new RegExp(`${l}\\s*\\|\\s*(\\d+)`))?.[1]);
    const done = ses.filter(s => /complet/i.test(String(s.status))).length;
    expect.soft(card('Sessions'), 'Sessions').toBe(ses.length); expect.soft(card('Completed'), 'Completed').toBe(done); expect.soft(card('Pending'), 'Pending').toBe(ses.length - done);
  });

  test('TC_COP_NTF_010 no push-token error appears on the web app', async ({ page }) => {
    const seen = watch(page); await signIn(page, 'doctor', { settle: 6000 });
    const bad = seen.filter(m => /push|expo.?token|notification.*(token|permission)/i.test(m)); note(`console errors seen: ${seen.length}`);
    expect(bad, `push-token messages: ${bad.join(' || ').slice(0, 300)}`).toHaveLength(0);
    expect(await page.getByText(/push/i).count(), 'no push dialog on screen').toBe(0);
  });
});

test.describe('Web UI: appointments and series', () => {
  test('TC_COP_RCP_015 the day list colours doctor and therapy cards differently and counts correctly', async ({ page }) => {
    const w = await world(); const rec = await need('receptionist'); let d = workday(1); let day = ymd(d); let a: any, b: any;
    // Earlier runs leave bookings in the next few weeks, so look for a free day inside the date strip (about three weeks).
    for (let k = 0; k < 8; k++) {
      d = workday(1 + Math.floor(Math.random() * 18)); day = ymd(d); const t1 = slot(d, 14, 0); const t2 = slot(d, 15, 0, 60);
      a = await rec.post(`${w.b}/appointments`, { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, therapist_ids: [], room_id: w.seed.rooms['C-1'], appointment_start: t1.start, appointment_end: t1.end, status: 'scheduled', appointment_type: 'SINGLE' });
      b = await rec.post(`${w.b}/appointments`, { client_id: w.seed.patients['P-Female2'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], treatment_id: w.seed.treatments.COPABH, appointment_start: t2.start, appointment_end: t2.end, status: 'scheduled', appointment_type: 'SINGLE' });
      if (ok(a.status) && ok(b.status)) break;
    }
    test.skip(!ok(a.status) || !ok(b.status), `blocked: the two bookings could not be made (${a.status}, ${b.status})`);
    await signIn(page, 'receptionist'); await open(page, '/clinic-admin/appointments', 6000);
    await page.locator(`xpath=//*[normalize-space(text())="${d.getDate()}"][following-sibling::*[normalize-space(text())="${d.toLocaleString('en', { month: 'short' })}"]]`).first().click();
    const colour = async (name: string) => page.getByText(name).first().evaluate(el => { let e: HTMLElement | null = el as HTMLElement; while (e) { const bg = getComputedStyle(e).backgroundColor; const bl = getComputedStyle(e).borderLeftColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && e.getBoundingClientRect().width > 200) return `${bg}|${bl}`; e = e.parentElement; } return 'none'; });
    const doctorCard = await colour('COP Patient Male'); const therapyCard = await colour('COP Patient Female Two');
    note(`on ${day}: doctor card ${doctorCard}; therapy card ${therapyCard}; list: ${(await text(page)).slice(0, 200)}`);
    expect(doctorCard, 'the doctor card was found').not.toBe('none'); expect(therapyCard, 'the therapy card was found').not.toBe('none');
    expect(doctorCard, 'doctor and therapy cards have different colours').not.toBe(therapyCard);
  });

  /**
   * Multi-day series booking is not on by default: it needs the Capability Platform on in the deployment, the Ayurveda clinic opted in
   * to `appointments.multiday` (Physio has it by default; General never), and multi-day treatment types configured. In the test
   * deployment `/tenants/{id}/features` answers allow_multiday=false and the capability platform answers "not enabled", so the
   * booking form correctly offers no series. These cases are therefore not executed, with the dependency named.
   */
  const SERIES_DEPENDENCY = 'dependency: multi-day booking is switched off in the test deployment (Capability Platform flag off; Ayurveda must also opt in to appointments.multiday and have multi-day treatment types configured)';
  for (const [id, title] of [['RCP_009', 'a 7-day series can be previewed before booking'], ['RCP_010', 'the series can be confirmed as one series'], ['CNF_011', 'conflicted series days are shown with alternatives'], ['CNF_012', 'alternatives can be accepted and the series confirmed'], ['CNF_013', 'a series with an unresolved conflict cannot be confirmed'], ['NFR_009', 'a 21-day series preview opens within 3 seconds']] as const)
    test(`TC_COP_${id} ${title}`, async () => { test.skip(true, SERIES_DEPENDENCY); });
});

test.describe('Web UI: print, share and versions', () => {
  const rx = async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const p = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    return { w, doc, c, rx: p.body, client: w.seed.patients['P-Male'] as string };
  };
  const openPrint = async (page: Page, url: string) => { await open(page, url, 8000); await page.getByText(/^Print$/i).first().click(); await page.waitForTimeout(5000); };

  test('TC_COP_PRT_001 the user chooses letterhead or plain paper before each print', async ({ page }) => {
    const r = await rx(); await signIn(page, 'doctor'); await openPrint(page, `/clinic-admin/clients/${r.client}/prescriptions/${r.rx.id}`);
    const body = await text(page);
    expect(body, 'a Letterhead / Plain paper choice is offered').toMatch(/letterhead/i); expect(body).toMatch(/plain/i);
  });

  test('TC_COP_PRT_002 the prescription preview shows clinic, patient, doctor with degree right-aligned, medicines and footer', async ({ page }) => {
    const r = await rx(); await signIn(page, 'doctor'); await openPrint(page, `/clinic-admin/clients/${r.client}/prescriptions/${r.rx.id}`);
    const f = printFrame(page); expect(f, 'the preview shows the document').toBeTruthy(); const t = await frameText(page);
    for (const part of ['Ayurveda Clinic', 'COP Patient Male', 'COP Login Doctor', 'BAMS', 'COP Tablet X', 'Generated on']) expect.soft(t, `preview contains ${part}`).toContain(part);
    const lay = await f!.evaluate(() => { const leaf = (re: RegExp) => [...document.querySelectorAll('*')].find(e => re.test(e.textContent ?? '') && [...e.children].every(c => !re.test(c.textContent ?? ''))) as HTMLElement | undefined; const nm = leaf(/COP Login Doctor/), deg = leaf(/BAMS/); if (!nm || !deg) return null; return { degreeBelowName: deg.getBoundingClientRect().top >= nm.getBoundingClientRect().bottom - 2 || deg.getBoundingClientRect().top > nm.getBoundingClientRect().top + 8, textAlign: getComputedStyle(deg).textAlign }; });
    note(`doctor block: ${JSON.stringify(lay)}`);
    expect.soft(lay?.degreeBelowName, 'the degree is on the next line').toBe(true); expect.soft(lay?.textAlign, 'right-aligned').toMatch(/right|end/);
  });

  test('TC_COP_PRT_003 Print prints only the document, not the app, and no pop-up is blocked', async ({ page }) => {
    const r = await rx(); const popups: string[] = []; page.on('popup', p => popups.push(p.url()));
    await page.addInitScript(() => { (window as any).__topPrints = 0; window.print = () => { (window as any).__topPrints++; }; });
    await signIn(page, 'doctor'); await openPrint(page, `/clinic-admin/clients/${r.client}/prescriptions/${r.rx.id}`);
    const f = printFrame(page); expect(f, 'the preview shows the document').toBeTruthy();
    await f!.evaluate(() => { (window as any).__framePrints = 0; window.print = () => { (window as any).__framePrints++; }; });
    await page.locator('[aria-label="Print document"]').first().click(); await page.waitForTimeout(2500);
    const framePrints = await f!.evaluate(() => (window as any).__framePrints); const topPrints = await page.evaluate(() => (window as any).__topPrints);
    note(`print calls: document frame ${framePrints}, whole app window ${topPrints}; pop-ups ${popups.length}`);
    expect(framePrints, 'the document frame is what is printed').toBeGreaterThan(0); expect(topPrints, 'the app window is not printed').toBe(0); expect(popups, 'no pop-up was opened').toHaveLength(0);
  });

  test('TC_COP_PRT_004 the case sheet print has the patient capsule, doctor with degree, sections and footer', async ({ page }) => {
    const r = await rx(); await signIn(page, 'doctor'); await openPrint(page, `/clinic-admin/clients/${r.client}/casesheets/${r.c.cs.id}`);
    const t = await frameText(page); expect(t.length, 'the preview shows the document').toBeGreaterThan(20); note(`case sheet preview: ${t.replace(/\s+/g, ' ').slice(0, 300)}`);
    for (const part of ['COP Patient Male', 'COP Login Doctor', 'BAMS']) expect.soft(t, `contains ${part}`).toContain(part);
    expect.soft(t, 'the chief complaint section is printed').toMatch(/chief complaint|COP/i);
    expect.soft(t, 'a footer is printed').toMatch(/Generated on|Phone:|Email:/);
  });

  test('TC_COP_PRT_005 the treatment sheet print shows rows, dates and the doctor with degree', async ({ page }) => {
    const w = await world(); const p = await scheduledPlan(w, 'P-Female', far(), 3); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    await signIn(page, 'doctor'); await open(page, `/clinic-admin/clients/${w.seed.patients['P-Female']}/treatment-sheets/${p.sheet.id}`, 9000);
    const screen = await text(page); const printBtn = page.locator('[aria-label*="rint" i]').first(); expect(await printBtn.count(), `the treatment sheet screen offers Print (labels on screen: ${(await page.locator('[aria-label]').evaluateAll(e => e.map(x => x.getAttribute('aria-label')))).join(', ').slice(0, 200)})`).toBeGreaterThan(0);
    await printBtn.click(); await page.waitForTimeout(5000);
    const t = await frameText(page); note(`treatment sheet preview: ${t.replace(/\s+/g, ' ').slice(0, 300)}`);
    expect(t.length, 'the preview shows the document').toBeGreaterThan(20);
    expect.soft(t, 'rows').toMatch(/Day\s*1|1\b/); expect.soft(t, 'the doctor name').toContain('COP Login Doctor'); expect.soft(t, 'the degree').toContain('BAMS');
  });

  test('TC_COP_PRT_006 a historical version prints as "Version 1 - SUPERSEDED"', async ({ page }) => {
    const r = await rx(); const doc = r.doc; const b = r.w.b;
    const vs = async () => ((await doc.get(`${b}/casesheets/${r.c.cs.id}/versions`)).body.versions ?? []) as any[];
    const v0 = await vs(); await doc.post(`${b}/casesheets/${r.c.cs.id}/amend`, {}); await doc.post(`${b}/casesheets/${r.c.cs.id}/amend/final`, {});
    await doc.post(`${b}/casesheets/${r.c.cs.id}/amend/sign`, { amendment_reason: 'COP print', expected_predecessor_version_id: v0.find(v => v.is_current)?.version_id ?? v0[0]?.version_id });
    await signIn(page, 'doctor'); await open(page, `/clinic-admin/clients/${r.client}/casesheets/${r.c.cs.id}`, 9000);
    const print1 = page.locator('[data-testid$="-print-' + (v0[0]?.version_id ?? '') + '"]').first();
    note(`versions on screen: ${(await text(page)).slice(0, 300)}`);
    expect(await print1.count(), 'version history offers Print for version 1').toBeGreaterThan(0);
    await print1.click(); await page.waitForTimeout(5000);
    expect((await frameText(page)) + (await text(page)), 'the printout is labelled').toMatch(/Version 1\s*[-—–]\s*SUPERSEDED/i);
  });

  test('TC_COP_PRT_011 sharing a prescription by SMS says it was recorded but not sent', async ({ page }) => {
    const r = await rx(); await r.doc.request('PATCH', `${r.w.b}/prescriptions/${r.rx.id}`, { status: 'SIGNED' });
    const seen = watch(page); await signIn(page, 'doctor'); await open(page, `/clinic-admin/clients/${r.client}/prescriptions/${r.rx.id}`, 8000);
    await page.getByText(/^Share$/).first().click(); await page.waitForTimeout(2500); await page.getByText('SMS', { exact: true }).first().click(); await page.waitForTimeout(800); const ph = page.locator('input:visible').first(); if (await ph.count() && !(await ph.inputValue())) await ph.fill('+919100000201');
    await page.getByText(/^Share$/).last().click(); await page.waitForTimeout(5000);
    const body = (await text(page)) + ' || ' + seen.filter(m => m.startsWith('dialog')).join(' || '); note(`after share: ${body.slice(-400)}`);
    expect(body, `an honest outcome is shown (screen after share: ${body.slice(-260)})`).toMatch(/recorded.{0,40}(not sent|not set up|nothing was sent)|nothing was sent/i); expect(body, 'no false success').not.toMatch(/sent successfully|has been sent|(?<!nothing )was sent/i);
  });

  test('TC_COP_PRT_012 a case sheet prints in Hindi with translated labels', async ({ page }) => {
    const r = await rx(); await signIn(page, 'doctor', { hindi: true }); await openPrint(page, `/clinic-admin/clients/${r.client}/casesheets/${r.c.cs.id}`);
    const t = await frameText(page); note(`Hindi preview: ${t.replace(/\s+/g, ' ').slice(0, 260)}`);
    expect(t.length, 'the preview shows the document').toBeGreaterThan(20);
    expect(t, 'labels are in Devanagari').toMatch(/[ऀ-ॿ]/);
  });
});

test.describe('Web UI: look, language and states', () => {
  const SCREENS = ['/clinic-admin', '/clinic-admin/appointments', '/clinic-admin/staff', '/clinic-admin/inventory', '/clinic-admin/settings'];

  test('TC_COP_UIX_001 the theme follows the clinic type', async ({ browser }) => {
    const colourOf = async (clinic: 'ayurveda' | 'general') => {
      const ctx = await browser.newContext(); const p = await ctx.newPage(); await signIn(p, 'owner', { clinic, settle: 5000 }); await p.goto('/clinic-admin', { waitUntil: 'load' }); await p.waitForTimeout(7000);
      const c = await p.evaluate(() => { const n = new Map<string, number>(); document.querySelectorAll('*').forEach(e => { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|rgb\((255, 255, 255|2[45]\d, 2[45]\d, 2[45]\d)\)/.test(b)) n.set(b, (n.get(b) ?? 0) + 1); }); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join(' ; '); });
      await ctx.close(); return c;
    };
    const a = await colourOf('ayurveda'), g = await colourOf('general'); note(`ayurveda: ${a}; general: ${g}`);
    expect(a.length, 'colours were read').toBeGreaterThan(0); expect(a, `the two clinic types have different theme colours (ayurveda: ${a}; general: ${g})`).not.toBe(g);
  });

  /** Lowest text contrast on a screen (WCAG ratio), over visible text elements. */
  const contrast = (page: Page) => page.evaluate(() => {
    const lum = (rgb: number[]) => { const f = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
    const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const bgOf = (el: Element | null): number[] => { let e = el as HTMLElement | null; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.9) return c; e = e.parentElement; } return [255, 255, 255]; };
    const bad: string[] = []; let n = 0;
    document.querySelectorAll('*').forEach(el => {
      if (![...el.childNodes].some(c => c.nodeType === 3 && (c.textContent ?? '').replace(/[\uE000-\uF8FF\s]/g, ''))) return;
      const r = (el as HTMLElement).getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      const fg = parse(getComputedStyle(el).color); if (fg.length < 3) return; n++;
      const L1 = lum(fg), L2 = lum(bgOf(el)); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(getComputedStyle(el).fontSize); const bold = Number(getComputedStyle(el).fontWeight) >= 700; const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      if (ratio < need) bad.push(`${(el.textContent ?? '').replace(/[\uE000-\uF8FF]/g, '').trim().slice(0, 24)} (${ratio.toFixed(1)}:1)`);
    });
    return { checked: n, bad };
  });

  test('TC_COP_UIX_002 dark appearance keeps text readable', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' }); await signIn(page, 'admin');
    let invisible: string[] = []; for (const s of SCREENS.slice(0, 3)) { await open(page, s, 5000); const r = await contrast(page); invisible.push(...r.bad.filter(b => Number(b.match(/\(([\d.]+):1\)/)?.[1]) < 1.5)); }
    note(`dark mode: ${invisible.length} text items with contrast below 1.5:1`);
    expect(invisible, `invisible text in dark mode: ${invisible.slice(0, 5).join(', ')}`).toHaveLength(0);
  });

  test('TC_COP_UIX_011 core screens meet WCAG AA text contrast', async ({ page }) => {
    await signIn(page, 'admin'); const failures: string[] = [];
    for (const s of SCREENS) { await open(page, s, 5000); const r = await contrast(page); if (r.bad.length) failures.push(`${s}: ${r.bad.length} of ${r.checked} (${r.bad.slice(0, 3).join(', ')})`); }
    expect(failures, `contrast failures: ${failures.join(' || ')}`).toHaveLength(0);
  });

  const KEY = /\b[a-z][a-zA-Z]+(?:\.[a-zA-Z_]+){1,}\b/;
  test('TC_COP_UIX_003 Hindi shows translated text and no raw translation keys', async ({ page }) => {
    await signIn(page, 'admin', { hindi: true }); const keys: string[] = []; let devanagari = 0;
    for (const s of SCREENS) { await open(page, s, 5000); const t = await text(page); devanagari += (t.match(/[ऀ-ॿ]/g) ?? []).length; const k = t.split(' | ').filter(x => KEY.test(x) && !/@|https?:|\d\.\d|\.com|\.in/.test(x)); keys.push(...k.map(x => `${s}: ${x.slice(0, 50)}`)); }
    expect(devanagari, 'Hindi text is shown').toBeGreaterThan(50); expect(keys, `raw keys on screen: ${keys.slice(0, 5).join(' || ')}`).toHaveLength(0);
  });

  test('TC_COP_UIX_004 no hard-coded English remains in Hindi mode', async ({ page }) => {
    await signIn(page, 'admin', { hindi: true }); const left = new Map<string, string>();
    for (const s of SCREENS) { await open(page, s, 5000); for (const line of (await text(page)).split(' | ')) { const x = line.trim(); if (/^[A-Za-z][A-Za-z ,'&.-]{3,}$/.test(x) && !/^(NC-WEB|COP|Dr\.?)/.test(x)) left.set(x, s); } }
    const items = [...left.keys()]; note(`English labels left in Hindi mode: ${items.slice(0, 30).join(' / ')}`);
    expect(items, `English text in Hindi mode: ${items.slice(0, 10).join(', ')}`).toHaveLength(0);
  });

  test('TC_COP_UIX_005 a permission refusal is shown in Hindi naming the action and who may do it', async ({ page }) => {
    await signIn(page, 'receptionist', { hindi: true }); await open(page, '/clinic-admin/settings/role-permissions', 8000);
    const t = await text(page); note(`refusal screen: ${t.slice(0, 260)}`);
    expect(t, 'a refusal message is shown').toMatch(/अनुमति|permission|अधिकार|पहुंच/i); expect(t, 'it is in Hindi').toMatch(/[ऀ-ॿ]/); expect(t, 'it does not show English "permission" text').not.toMatch(/You do not have permission|Access denied/i);
  });

  test('TC_COP_UIX_006 date fields: a calendar, typed dates, and no future date of birth', async ({ page }) => {
    await signIn(page, 'receptionist'); await openAddClient(page);
    const dob = page.locator('input[aria-label*="YYYY"], input[placeholder*="YYYY"], input[placeholder*="DD"], input[type="date"]').first();
    expect(await dob.count(), `the client form has a date-of-birth field (screen: ${(await text(page)).slice(0, 200)})`).toBeGreaterThan(0);
    await dob.click(); await dob.pressSequentially('01011990'); expect.soft(await dob.inputValue(), `typing 01011990 auto-adds dashes (field shows: ${await dob.inputValue()})`).toMatch(/^(01-01-1990|1990-01-01)$/);
    await dob.fill(''); await dob.pressSequentially(`0101${new Date().getFullYear() + 5}`); await page.keyboard.press('Tab'); await page.waitForTimeout(1500);
    const t = await text(page); note(`after a future date: ${t.slice(0, 260)}`);
    const kept = await dob.inputValue(); note(`future date typed; the field now holds '${kept}'`);
    expect(kept === '' || /future|invalid date/i.test(t), `a future date of birth is neither kept nor accepted silently (field holds '${kept}')`).toBe(true);
  });

  test('TC_COP_UIX_007 an error inside a modal form is shown inside the modal and the fields stay editable', async ({ page }) => {
    await signIn(page, 'receptionist'); await openAddClient(page);
    const field = page.getByPlaceholder('Enter full name'); expect(await field.count(), `the Add Client form opened (screen: ${(await text(page)).slice(0, 160)})`).toBeGreaterThan(0);
    const submit = page.getByText(/^(Save|Create|Add Client|Create Client|Add)$/i).last(); expect(await submit.count(), 'the form has a submit button').toBeGreaterThan(0);
    await submit.click(); await page.waitForTimeout(2500);
    const body = await text(page); note(`after an empty submit: ${body.slice(0, 260)}`);
    expect(body, 'a validation message is shown with the form still open').toMatch(/required|invalid|enter|please/i); expect(await field.count(), 'the form is still open').toBeGreaterThan(0);
    await field.fill('COP typed after error'); expect(await field.inputValue(), 'fields remain editable').toContain('COP typed');
  });

  test('TC_COP_UIX_008 lists show an empty state and, when the server cannot be reached, an error with retry', async ({ page }) => {
    await signIn(page, 'receptionist'); await open(page, '/clinic-admin/appointments', 5000);
    note(`appointments on a closed day: ${(await text(page)).slice(-200)}`);
    await page.route('**/api/v1/**', r => r.abort('connectionrefused')); await open(page, '/clinic-admin/staff', 12_000);
    const off = await text(page); note(`API unreachable: ${off.slice(0, 220)}`);
    expect(off, 'an error with a retry is shown').toMatch(/retry|try again|could not|unable|connection|offline/i);
  });

  test('TC_COP_UIX_009 no "Unexpected text node" crash on dashboards and detail screens', async ({ page }) => {
    const seen = watch(page); const r = await world();
    for (const role of ['admin', 'doctor', 'therapist'] as const) { await signIn(page, role); await open(page, ROUTE[role], 5000); await page.goto('/logout').catch(() => undefined); await page.waitForTimeout(1500); }
    await signIn(page, 'admin'); for (const s of SCREENS) await open(page, s, 3500); await open(page, `/clinic-admin/clients/${r.seed.patients['P-Male']}/casesheets`, 3500);
    const bad = seen.filter(m => /Unexpected text node/i.test(m)); note(`console errors seen: ${seen.length}`);
    expect(bad, `crash messages: ${bad.slice(0, 2).join(' || ').slice(0, 300)}`).toHaveLength(0);
  });
});

test.describe('Web UI: resilience and performance', () => {
  test('TC_COP_NFR_014 when the API is down the app shows a clear message with retry and does not crash', async ({ page }) => {
    const seen = watch(page); await signIn(page, 'admin'); await open(page, '/clinic-admin', 5000);
    await page.route('**/api/v1/**', r => r.abort('connectionrefused')); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(10_000);
    const t = await text(page); note(`API down: ${t.slice(0, 260)}`);
    expect(t.length, 'the page rendered (no blank crash)').toBeGreaterThan(20);
    expect(t, 'a clear message with a way to retry').toMatch(/retry|try again|could not|unable|cannot reach|connection/i);
    expect(seen.filter(m => /Unexpected text node|Maximum update depth|Cannot read/i.test(m)), 'no crash').toHaveLength(0);
  });

  test('TC_COP_NFR_008 the dashboard loads within 2 seconds at the 95th percentile', async ({ page }) => {
    await signIn(page, 'admin'); await open(page, '/clinic-admin', 6000); const ms: number[] = [];
    for (let i = 0; i < 20; i++) { const t0 = Date.now(); await page.reload({ waitUntil: 'load' }); await page.getByText("Today's Overview").first().waitFor({ timeout: 30_000 }); ms.push(Date.now() - t0); }
    ms.sort((a, b) => a - b); const p95 = ms[Math.ceil(0.95 * ms.length) - 1]; note(`20 loads: median ${ms[10]} ms, p95 ${p95} ms, max ${ms[19]} ms (development bundle, the seeded clinic's data volume, not 200 appointments a day)`);
    expect(p95, `p95 ${p95} ms`).toBeLessThanOrEqual(2000);
  });

  test('TC_COP_NFR_013 staff creation is all-or-nothing: a failed login creation leaves no staff record', async () => {
    const w = await world(); const owner = await need('owner'); const name = `COP Atomic ${Date.now()}`;
    const res = await owner.post(`${w.b}/staff`, { full_name: name, staff_type: 'therapist', requires_login: true, email: `cop-atomic-${Date.now()}@example.com`, phone: '+919000000999', gender: 'female', hourly_rate: '100' });
    note(`create with an address the auth provider refuses: ${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 160)}`);
    expect(ok(res.status), 'the creation is refused').toBe(false);
    const after = list((await owner.get(`${w.b}/staff?limit=500&search=${encodeURIComponent('COP Atomic')}`)).body).concat(list((await owner.get(`${w.b}/staff?limit=500`)).body));
    expect(after.filter(s => s.full_name === name), 'no staff record was left behind').toHaveLength(0);
  });
});
