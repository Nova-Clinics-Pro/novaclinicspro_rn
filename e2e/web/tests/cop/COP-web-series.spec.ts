import type { Page } from '@playwright/test';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, test } from '../../../cop/fixture';
import { book, far, list, need, note, ok, slot, world, ymd, type World } from '../../../cop/roles';

/**
 * Multi-day (series) booking through the real web UI as the Receptionist: preview, conflicts and their suggestions, confirmation.
 * Needs the series switched on for the clinic (Settings > Capabilities > Multi-Day Appointments; Capability Platform flag on) and the
 * therapy templates carrying `multiday_appointment_types` (migration 20261116_000001). Each test books on its own far-away Monday so
 * runs never collide; the series is daily, so a 7-day series runs Monday to Sunday.
 */
const THERAPY = 'COP Abhyanga';
/** A 6-day series (Monday to Saturday): the clinic is closed on Sundays, so a 7-day series from a Monday always has one closed day. */
const CLEAN_DAYS = 6;

async function signIn(page: Page) {
  const id = readRoleIdentities().receptionist; test.skip(!id?.email, 'blocked: the Receptionist login is not provisioned');
  await page.setViewportSize({ width: 1280, height: 1900 });
  await page.goto('/login', { waitUntil: 'load' });
  await page.getByTestId('login-email-input').fill(id.email); await page.getByTestId('login-password-input').fill(id.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(u => !/\/login/.test(u.toString()), { timeout: 90_000 }); await page.waitForTimeout(4000);
}
const text = async (page: Page) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ');
const monday = () => { const d = new Date(); d.setDate(d.getDate() + far()); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** The preview screen the booking form leads to, opened with the same parameters the form passes. */
async function openPreview(page: Page, w: World, o: { start: Date; days?: number; patient?: string }) {
  const patient = o.patient ?? 'P-Female2';
  const q = new URLSearchParams({
    clientId: w.seed.patients[patient], clientName: `COP ${patient}`, clientPhone: '+919100000204', treatmentId: w.seed.treatments.COPABH, treatmentName: THERAPY,
    therapistIds: w.therapist.id, staffNames: 'COP Login Therapist', startDate: o.start.toISOString(), durationDays: String(o.days ?? CLEAN_DAYS),
    preferredTimeHourLocal: String(o.start.getHours()), preferredTimeMinutesLocal: String(o.start.getMinutes()), durationMinutes: '60', notes: '',
  });
  const t0 = Date.now(); await page.goto(`/clinic-admin/appointments/preview?${q.toString()}`, { waitUntil: 'load' });
  await page.getByText(/sessions are available|conflict\(s\) remaining|conflict/i).first().waitFor({ timeout: 60_000 });
  return Date.now() - t0;
}

/** A Monday with the therapist busy at the series time on the given day numbers (1-based): real appointments for another patient.
 *  Leftovers from earlier runs can occupy a slot, so a Monday whose setup is refused is skipped and the next one tried. */
async function busyStart(w: World, dayNumbers: number[]) {
  let last = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const start = monday(); let allBooked = true;
    for (const n of dayNumbers) {
      const t = slot(addDays(start, n - 1), start.getHours(), start.getMinutes(), 60);
      const r = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female3'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-2'], treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, appointment_type: 'SINGLE' });
      if (!ok(r.status)) { allBooked = false; last = r.status; break; }
    }
    if (allBooked) return start;
  }
  throw new Error(`setup: the therapist's busy bookings were refused on six different weeks (last status ${last})`);
}

/** Series appointments created for the client over the week starting at `start` (read through the API, as the clinic would see them). */
async function seriesCreated(w: World, start: Date, patient = 'P-Female2', days = 7) {
  const adm = await need('admin'); const found: any[] = [];
  for (let i = 0; i < days; i++) {
    const r = await adm.get(`${w.b}/appointments?date=${ymd(addDays(start, i))}&limit=100`);
    found.push(...list(r.body).filter(a => a.client_id === w.seed.patients[patient]));
  }
  return found;
}

test.describe('Web UI: multi-day series booking', () => {
  test('TC_COP_RCP_009 a 7-day series can be previewed before booking', async ({ page }) => {
    const w = await world(); const start = monday(); await signIn(page);
    await openPreview(page, w, { start, days: 7 }); const t = await text(page); note(`preview: ${t.slice(0, 700)}`);
    const dated = (t.match(/Session \d \| (Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d+ \w+/g) ?? []).length;
    expect(dated, 'seven dated sessions are listed').toBe(7);
    expect(t, 'the therapist is named').toContain('COP Login Therapist');
    expect(t, 'no therapy session is placed in a consultation room').not.toMatch(/Consultation/);
    expect(t, 'six sessions have a therapy room').toMatch(/Therapy/);
    // the 7th day is a Sunday and the clinic is closed: it is marked as a conflict instead of being offered
    expect(t, 'the closed Sunday is the one conflict').toMatch(/1 conflict\(s\) remaining/);
    const rows = t.split(/Session (?=\d)/).slice(1); expect(rows.map((r, i) => /Not assigned/.test(r) ? i + 1 : 0).filter(Boolean), 'only day 7 is unassigned').toEqual([7]);
  });

  test('TC_COP_RCP_010 the series is confirmed as one series with a session number on each appointment', async ({ page }) => {
    const w = await world(); const start = monday(); await signIn(page);
    await openPreview(page, w, { start });
    await page.getByText(new RegExp(`Confirm ${CLEAN_DAYS} Sessions`)).first().click(); await page.waitForTimeout(9000);
    const created = await seriesCreated(w, start, 'P-Female2', CLEAN_DAYS); note(`created: ${created.length}; after confirm: ${(await text(page)).slice(0, 200)}`);
    expect(created.length, `${CLEAN_DAYS} appointments were created`).toBe(CLEAN_DAYS);
    const ids = new Set(created.map(a => a.series_id)); expect(ids.size, 'all in one series').toBe(1); expect([...ids][0], 'with a series id').toBeTruthy();
    expect(created.map(a => a.session_number).sort(), `numbered 1 to ${CLEAN_DAYS}`).toEqual([1, 2, 3, 4, 5, 6]);
    const rooms = list((await (await need('admin')).get(`${w.b}/rooms?limit=100`)).body); const kinds = [...new Set(created.map(a => rooms.find(r => r.id === a.room_id)?.room_type))];
    expect.soft(kinds, `therapy sessions are booked in therapy rooms (booked in: ${kinds.join(', ')})`).toEqual(['therapy']);
    await page.goto(`/clinic-admin/appointments/${created.find(a => a.session_number === 2).id}`, { waitUntil: 'load' }); await page.waitForTimeout(8000);
    expect(await text(page), 'the appointment card shows its place in the series').toMatch(/Session 2\s*(\/|of)\s*6|Day 2\s*(\/|of)\s*6/i);
  });

  test('TC_COP_CNF_011 conflicted series days are shown with alternatives', async ({ page }) => {
    const w = await world(); const start = await busyStart(w, [3, 5]); await signIn(page);
    await openPreview(page, w, { start }); const t = await text(page); note(`preview: ${t.slice(0, 500)}`);
    expect(t, 'two conflicts are reported').toMatch(/2 conflict\(s\) remaining/);
    const rows = t.split(/Session (?=\d)/).slice(1); const unassigned = rows.map((r, i) => /Not assigned/.test(r) ? i + 1 : 0).filter(Boolean);
    expect(unassigned, 'days 3 and 5 are the conflicted ones and the other days are clean').toEqual([3, 5]);
    await page.getByText('Session 3', { exact: true }).first().click(); await page.waitForTimeout(4000);
    const open = await text(page); note(`session 3 opened: ${open.slice(open.indexOf('Session 3'), open.indexOf('Session 3') + 260)}`);
    expect.soft(open, 'a raw translation key is shown to the user').not.toMatch(/appointments\.[a-zA-Z]+/);
    expect(open, 'the conflicted day offers an alternative therapist, room or time').toMatch(/alternative (therapist|room|time|slot)s?:|Use .*(instead|at)|\d{1,2}:\d{2}\s*(am|pm).*(available|alternative)/i);
  });

  test('TC_COP_CNF_012 accepting alternatives lets the whole series be confirmed without conflicts', async ({ page }) => {
    const w = await world(); const start = await busyStart(w, [3, 5]); await signIn(page);
    await openPreview(page, w, { start });
    /** Opens a conflicted day and taps its first recommended time (the first time range listed after "Select an alternative:"). */
    const acceptFirstAlternative = async (day: number) => {
      await page.getByText(`Session ${day}`, { exact: true }).first().click(); await page.waitForTimeout(3500);
      const first = page.locator("xpath=(//*[not(*) and contains(normalize-space(.),'Select an alternative')]/following::*[not(*) and contains(normalize-space(.),' - ') and (contains(.,'am') or contains(.,'pm'))])[1]");
      const offered = await first.count(); note(`day ${day}: alternatives offered: ${offered > 0 ? await first.innerText() : 'none'}`);
      expect(offered, `a recommended time is offered for day ${day}`).toBeGreaterThan(0);
      await first.click(); await page.waitForTimeout(2500);
    };
    await acceptFirstAlternative(3); await acceptFirstAlternative(5);
    const screen = await text(page); note(`after accepting: ${screen.slice(0, 300)}`);
    expect(screen, 'no conflict remains after both alternatives are accepted').not.toMatch(/conflict\(s\) remaining/);
    await page.getByText(new RegExp(`Confirm ${CLEAN_DAYS} Sessions`)).first().click(); await page.waitForTimeout(9000);
    const made = await seriesCreated(w, start, 'P-Female2', CLEAN_DAYS);
    note(`created ${made.length}: ${JSON.stringify(made.map(a => [a.session_number, a.appointment_start]))}`);
    expect(made.length, `every session was created (created ${made.length} of ${CLEAN_DAYS})`).toBe(CLEAN_DAYS);
  });

  test('TC_COP_CNF_013 confirming with a conflict left unresolved is refused, or books only the clean days with a clear summary', async ({ page }) => {
    const w = await world(); const start = await busyStart(w, [3, 5]); await signIn(page);
    await openPreview(page, w, { start });
    await page.getByText(new RegExp(`Confirm ${CLEAN_DAYS} Sessions`)).first().click(); await page.waitForTimeout(9000);
    const created = await seriesCreated(w, start, 'P-Female2', CLEAN_DAYS); const after = await text(page); note(`created ${created.length}; screen: ${after.slice(0, 400)}`);
    const days = created.map(a => a.session_number ?? ymd(new Date(a.appointment_start)));
    expect(created.length === 0 || (created.length === CLEAN_DAYS - 2 && !days.includes(3) && !days.includes(5)), `an unresolved conflict was booked: ${created.length} appointments created`).toBe(true);
    if (created.length === CLEAN_DAYS - 2) expect(after, 'a clear summary of what was and was not booked').toMatch(/4 of 6|skipped|not booked|conflict/i);
  });

  test('TC_COP_NFR_009 a 21-day series preview opens within 3 seconds', async ({ page }) => {
    const w = await world(); const start = monday(); await signIn(page);
    const ms = await openPreview(page, w, { start, days: 21 }); const t = await text(page); note(`21-day preview ready in ${ms} ms (development bundle, includes page load)`);
    expect((t.match(/Session \d+ \|/g) ?? []).length, 'twenty-one sessions are listed').toBe(21);
    expect(ms, `preview ready in ${ms} ms`).toBeLessThanOrEqual(3000);
  });
});
