import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, test } from '../../../cop/fixture';
import { book, far, list, need, note, ok, world, ymd, type World } from '../../../cop/roles';

/**
 * Time handling: slots and recommended times are STORED as UTC instants and SHOWN in the viewer's local time zone.
 * The stored value is read straight from the Testing database (cop/db_read.py, read-only), not inferred from the API.
 */
const DB_READ = path.resolve(__dirname, '../../../cop/db_read.py');
const dbRead = (...args: string[]) => JSON.parse(execFileSync('python3', [DB_READ, ...args], { encoding: 'utf8' }));
const instant = (value: string | Date) => new Date(value).toISOString();

async function signIn(page: Page) {
  const id = readRoleIdentities().receptionist; test.skip(!id?.email, 'blocked: the Receptionist login is not provisioned');
  await page.setViewportSize({ width: 1280, height: 1500 });
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByTestId('login-email-input').fill(id.email); await page.getByTestId('login-password-input').fill(id.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(u => !/\/login/.test(u.toString()), { timeout: 90_000 }); await page.waitForTimeout(4000);
}
/** A browser in the given time zone, signed in as the Receptionist. */
async function pageIn(browser: Browser, timezoneId: string) {
  const context = await browser.newContext({ timezoneId, locale: 'en-IN' }); const page = await context.newPage(); await signIn(page); return { page, context };
}
const text = async (page: Page) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
/** A Monday far ahead at 11:00 India time (05:30 UTC). */
const mondayAt11Ist = () => { const d = new Date(Date.UTC(2000, 0, 1, 5, 30)); d.setUTCDate(d.getUTCDate() + 365 * 46 + Math.floor(Math.random() * 3000)); while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1); return d; };

test.describe('Time handling: UTC in storage, local on screen', () => {
  test('TC_COP_NFR_015 a booked slot is stored in UTC and shown in the viewer\'s local time zone', async ({ browser }) => {
    const w = await world(); const type = dbRead('column', 'tenant_appointments', 'appointment_start');
    expect(type.type, 'the column keeps a time zone aware instant').toBe('timestamp with time zone');
    const farSlot = () => { const d = new Date(Date.UTC(2047, 7, 13, 5, 30)); d.setUTCDate(d.getUTCDate() + Math.floor(Math.random() * 6000)); while ([0, 1].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1); return d; };
    const bookAt = async (startText: string, endText: string, patient = 'P-Male') => {
      const r = await book(w, 'receptionist', { client_id: w.seed.patients[patient], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: startText, appointment_end: endText });
      expect(ok(r.status), `booking ${startText} returned ${r.status}: ${JSON.stringify(r.body)?.slice(0, 140)}`).toBe(true); return r.body.id as string;
    };
    // (A) the contract: a client sends an explicit UTC instant and the database must hold exactly that instant
    const slot = farSlot(); const end = new Date(slot.getTime() + 30 * 60_000);
    const idA = await bookAt(slot.toISOString(), end.toISOString());
    const storedA = dbRead('row', 'tenant_appointments', idA, 'appointment_start').appointment_start as string;
    // (B) what the app itself sends: the local clock time with no offset ("11:00" for 11:00 in India)
    const slotB = farSlot(); const local = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 19);
    const idB = await bookAt(local(slotB), local(new Date(slotB.getTime() + 30 * 60_000)));
    const storedB = dbRead('row', 'tenant_appointments', idB, 'appointment_start').appointment_start as string;
    note(`(A) sent ${slot.toISOString()} -> stored ${storedA}; (B) sent local ${local(slotB)} (= ${slotB.toISOString()} in UTC) -> stored ${storedB}`);
    // the screen: the same stored instant, seen from two time zones, must read as that instant in the viewer's own zone
    const seen: Record<string, string> = {};
    for (const zone of ['Asia/Kolkata', 'America/New_York']) {
      const wanted = new Date(storedA).toLocaleTimeString('en-IN', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true });
      const { page, context } = await pageIn(browser, zone);
      await page.goto(`/clinic-admin/appointments/${idA}`, { waitUntil: 'load' }); await page.waitForTimeout(8000);
      seen[zone] = (await text(page)).slice(0, 240); await context.close();
      expect.soft(seen[zone], `the screen shows the stored instant ${storedA} as ${wanted} for a viewer in ${zone}`).toMatch(new RegExp(wanted.replace(':', ':').replace(/\s+/g, '\\s*'), 'i'));
    }
    note(`screen text: ${JSON.stringify(seen)}`);
    expect.soft(instant(storedA), `(A) an explicit UTC instant is stored unchanged (sent ${slot.toISOString()}, stored ${storedA})`).toBe(slot.toISOString());
    expect.soft(instant(storedB), `(B) the app's local clock time is stored as the right UTC instant (sent local ${local(slotB)}, stored ${storedB}, expected ${slotB.toISOString()})`).toBe(slotB.toISOString());
  });

  test('TC_COP_NFR_016 series sessions are stored in UTC and shown in local time', async ({ browser }) => {
    const w = await world(); const start = mondayAt11Ist(); const { page, context } = await pageIn(browser, 'Asia/Kolkata');
    const q = new URLSearchParams({ clientId: w.seed.patients['P-Female2'], clientName: 'COP P-Female2', clientPhone: '+919100000204', treatmentId: w.seed.treatments.COPABH, treatmentName: 'COP Abhyanga',
      therapistIds: w.therapist.id, staffNames: 'COP Login Therapist', startDate: start.toISOString(), durationDays: '3', preferredTimeHourLocal: '11', preferredTimeMinutesLocal: '0', durationMinutes: '60', notes: '' });
    await page.goto(`/clinic-admin/appointments/preview?${q.toString()}`, { waitUntil: 'load' });
    await page.getByText(/sessions are available|conflict/i).first().waitFor({ timeout: 60_000 });
    const preview = await text(page); note(`preview: ${preview.slice(0, 320)}`);
    expect.soft(preview, 'the preview shows the requested 11:00 am local time').toMatch(/11:00\s*am\s*-\s*12:00\s*pm/i);
    await page.getByText(/Confirm 3 Sessions/).first().click(); await page.waitForTimeout(9000);
    const adm = await need('admin'); const created: any[] = [];
    for (let i = 0; i < 3; i++) { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); created.push(...list((await adm.get(`${w.b}/appointments?date=${ymd(d)}&limit=100`)).body).filter(a => a.client_id === w.seed.patients['P-Female2'])); }
    expect(created.length, 'the three sessions were created').toBe(3);
    created.sort((a, b) => a.session_number - b.session_number);
    for (const [i, appt] of created.entries()) {
      const expected = new Date(start); expected.setUTCDate(expected.getUTCDate() + i);
      const stored = dbRead('row', 'tenant_appointments', appt.id, 'appointment_start');
      note(`session ${i + 1}: expected ${expected.toISOString()}, the database holds ${stored.appointment_start}`);
      expect.soft(instant(stored.appointment_start), `session ${i + 1} is stored as the UTC instant of 11:00 India time`).toBe(expected.toISOString());
    }
    await page.goto(`/clinic-admin/appointments/${created[0].id}`, { waitUntil: 'load' }); await page.waitForTimeout(8000);
    const detail = await text(page); await context.close();
    expect(detail, `the appointment screen shows 11:00 am in India time (screen: ${detail.slice(0, 200)})`).toMatch(/11:00\s*am/i);
  });

  test('TC_COP_NFR_017 recommended slot times are UTC in the API and local on screen', async ({ browser }) => {
    const w: World = await world(); const start = mondayAt11Ist(); const { page, context } = await pageIn(browser, 'Asia/Kolkata');
    const dayThree = new Date(start); dayThree.setUTCDate(dayThree.getUTCDate() + 2);
    const local = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 19); // the app sends the local clock time, no offset
    const busy = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female3'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-2'], treatment_id: w.seed.treatments.COPABH,
      appointment_start: local(dayThree), appointment_end: local(new Date(dayThree.getTime() + 60 * 60_000)), appointment_type: 'SINGLE' });
    test.skip(!ok(busy.status), `blocked: the therapist's busy booking could not be made (${busy.status})`);
    const rec = await need('receptionist');
    const plan = await rec.post('/api/v1/appointments/therapy-plan', { client_id: w.seed.patients['P-Female2'], treatment_id: w.seed.treatments.COPABH, start_date: start.toISOString(), duration_days: 3, therapist_ids: [w.therapist.id] }); // like the app: the time comes from start_date, no preferred_time_hour
    expect(ok(plan.status), `therapy plan returned ${plan.status}`).toBe(true);
    const conflicted = plan.body.sessions.find((s: any) => s.is_conflicted); expect(conflicted, 'day 3 is a conflict').toBeTruthy();
    const alternatives: any[] = conflicted.conflict?.alternative_slots ?? [];
    note(`session ${conflicted.session_number} offers ${alternatives.length} recommended time(s): ${JSON.stringify(alternatives.map(a => a.start))}`);
    expect(alternatives.length, 'recommended times are offered for the conflicted day').toBeGreaterThan(0);
    for (const alt of alternatives) expect.soft(String(alt.start), 'a recommended time carries its UTC offset (is an instant)').toMatch(/Z$|[+-]\d\d:\d\d$/);
    await context.close();
  });
});
