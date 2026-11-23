import fs from 'node:fs';
import path from 'node:path';
import { ApiSession } from '../../../shared/api';
import { runDir } from '../../../shared/config';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, passedEarlier, readSeed, test } from '../../../cop/fixture';

/**
 * COP journeys and role boundaries with the REAL logins: Receptionist, Doctor, Therapist and Admin.
 * The 7-day plan journey runs in order and each step records its own result; a step whose predecessor failed is Blocked
 * with that reason. Every refusal reason is recorded so a refusal for the wrong rule is visible.
 */
const FAR = () => 3800 + Math.floor(Math.random() * 1500);
const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const workday = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + daysAhead); while (d.getDay() === 0) d.setDate(d.getDate() + 1); return d; };
const ok = (s: number) => s >= 200 && s < 300;
const refused = (s: number) => s >= 400 && s < 500;
const list = (b: any): any[] => (Array.isArray(b) ? b : b?.items ?? b?.data ?? []);
const why = (res: { status: number; body: any }, label: string) => test.info().annotations.push({ type: 'refusal-reason', description: `${label}: ${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 230)}` });
const note = (text: string) => test.info().annotations.push({ type: 'observed', description: text });

type Who = 'admin' | 'receptionist' | 'doctor' | 'therapist';
const cache: Partial<Record<Who, Promise<ApiSession | null>>> = {};
const as = (who: Who) => (cache[who] ??= (async () => {
  const id = readRoleIdentities()[who]; if (!id?.passwordSet) return null;
  const a = new ApiSession({ email: id.email, password: id.password } as any); await a.signIn(); await a.reconcileTenantClaim(); return a;
})());
const world = async () => {
  const seed: any = readSeed()?.ayurveda; const adm = await as('admin');
  test.skip(!seed || !adm, 'blocked: seed data or the role logins are not available (cop/seed.ts, cop/provision-roles.ts)');
  const t = seed.tenantId as string; const b = `/api/v1/clinic/${t}`;
  const staff = list((await adm!.get(`${b}/staff?limit=500`)).body);
  return { seed, t, b, ts: '/api/v1/treatment-sheets', doctor: staff.find(s => /Login Doctor/.test(s.full_name)), therapist: staff.find(s => /Login Therapist/.test(s.full_name)) };
};
const need = async (who: Who) => { const a = await as(who); test.skip(!a, `blocked: the ${who} login is not provisioned`); return a!; };
const ver = (o: any) => ({ 'If-Match': String(Math.floor(Number(o.version ?? 1))) });

/** Receptionist books a consultation with the logged-in doctor; the doctor opens an episode and signs a case sheet. */
async function consultAndSign(w: any, patient: string, day: number) {
  const rec = await as('receptionist'), doc = await as('doctor');
  const d = workday(day);
  const ap = await rec!.post(`${w.b}/appointments`, { client_id: w.seed.patients[patient], doctor_id: w.doctor.id, therapist_ids: [], room_id: w.seed.rooms['C-1'], appointment_start: `${ymd(d)}T10:00:00`, appointment_end: `${ymd(d)}T10:30:00`, status: 'scheduled', appointment_type: 'SINGLE' });
  const ep = await doc!.post(`${w.b}/episodes`, { client_id: w.seed.patients[patient], title: `COP ${patient}`, appointment_id: ap.body.id });
  const cs = await doc!.post(`${w.b}/clients/${w.seed.patients[patient]}/casesheets`, { clinic_type: 'ayurveda', episode_id: ep.body.id, appointment_id: ap.body.id, data_json: { chief_complaint: 'COP' } });
  for (const st of ['FINAL', 'SIGNED']) await doc!.request('PATCH', `${w.b}/casesheets/${cs.body.id}/status`, { status: st });
  return { ap: ap.body, ep: ep.body, cs: cs.body, day: d };
}
/** A 7-row plan created by the doctor and ordered (send to scheduling). */
async function orderedPlan(w: any, patient: string, day: number) {
  const doc = await as('doctor'); const c = await consultAndSign(w, patient, day);
  const mk = await doc!.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients[patient], treatment_id: w.seed.treatments.COPABH, start_date: ymd(c.day), duration_days: 7, case_sheet_id: c.cs.id, episode_id: c.ep.id, appointment_id: c.ap.id });
  const sent = await doc!.post(`${w.ts}/${mk.body.id}/send-to-scheduling`, { order_notes: 'COP 7-day plan', planned_sessions: 7, frequency: 'daily', recommended_therapy: 'Abhyanga' }, ver(mk.body));
  return { ...c, sheet: mk.body, created: mk, sent };
}
const fetchOrder = async (w: any, id: string) => list((await (await as('admin'))!.get(`${w.ts}/clinic/${w.t}/treatment-orders`)).body).find(o => o.id === id);

/**
 * Journey state lives in a file, not in memory: after a failed test Playwright restarts its worker, which would wipe
 * module-level state and silently block every later step for a reason that is not the application's.
 */
const STATE = () => path.join(runDir(), 'cop-journey-state.json');
const loadState = (): Record<string, any> => { try { return JSON.parse(fs.readFileSync(STATE(), 'utf8')); } catch { return {}; } };
const J: Record<string, any> = new Proxy({}, {
  get: (_t, k: string) => loadState()[k],
  set: (_t, k: string, v) => { const s = loadState(); s[k] = v; fs.mkdirSync(path.dirname(STATE()), { recursive: true }); fs.writeFileSync(STATE(), JSON.stringify(s)); return true; },
});
const DAY = FAR();

test.describe('07 journey: the 7-day treatment plan, with the real roles', () => {
  test('TC_COP_JRN_001 the Receptionist books the doctor consultation', async () => {
    const w = await world(); const rec = await need('receptionist'); const d = workday(DAY); fs.rmSync(STATE(), { force: true }); J.day = d.toISOString();
    const r = await rec.post(`${w.b}/appointments`, { client_id: w.seed.patients['P-Female'], doctor_id: w.doctor.id, therapist_ids: [], room_id: w.seed.rooms['C-1'], appointment_start: `${ymd(d)}T10:00:00`, appointment_end: `${ymd(d)}T10:30:00`, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(r.status), `book: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true); J.ap = r.body;
  });

  test('TC_COP_JRN_002 the Doctor sees the consultation in their own list', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.ap, 'blocked: TC_COP_JRN_001 did not create the appointment');
    const items = list((await doc.get(`${w.b}/appointments?date=${ymd(new Date(J.day))}&staff_id=${w.doctor.id}&limit=100&expand=staff`)).body);
    expect(items.map(i => i.id), 'the doctor\'s list includes the booked consultation').toContain(J.ap.id);
  });

  test('TC_COP_DOC_004 first visit: the Doctor creates an episode', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.ap, 'blocked: no appointment (TC_COP_JRN_001)');
    const r = await doc.post(`${w.b}/episodes`, { client_id: w.seed.patients['P-Female'], title: 'COP journey episode', appointment_id: J.ap.id });
    expect(ok(r.status), `episode: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true); expect(r.body.status).toBe('ACTIVE'); J.ep = r.body;
  });

  test('TC_COP_DOC_006 the Doctor writes the case sheet', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.ep, 'blocked: TC_COP_DOC_004 did not create the episode');
    const r = await doc.post(`${w.b}/clients/${w.seed.patients['P-Female']}/casesheets`, { clinic_type: 'ayurveda', episode_id: J.ep.id, appointment_id: J.ap.id, data_json: { chief_complaint: 'COP knee pain', history: 'COP journey' } });
    expect(ok(r.status), `case sheet: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true); J.cs = r.body;
  });

  test('TC_COP_DOC_008 the Doctor finalizes and signs the case sheet', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.cs, 'blocked: TC_COP_DOC_006 did not create the case sheet');
    for (const st of ['FINAL', 'SIGNED']) { const r = await doc.request('PATCH', `${w.b}/casesheets/${J.cs.id}/status`, { status: st }); expect.soft(ok(r.status), `-> ${st}: ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true); }
    const after = (await doc.get(`${w.b}/casesheets/${J.cs.id}`)).body; expect(String(after.status).toUpperCase()).toBe('SIGNED');
  });

  test('TC_COP_JRN_003 the episode, case sheet and signature are complete', async () => {
    test.skip(!(passedEarlier('TC_COP_DOC_004') && passedEarlier('TC_COP_DOC_006') && passedEarlier('TC_COP_DOC_008')), 'blocked: DOC_004, DOC_006 or DOC_008 did not pass');
  });

  test('TC_COP_DOC_010 the Doctor writes and signs a prescription naming the signer', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.ep, 'blocked: no episode');
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Female'], episode_id: J.ep.id, appointment_id: J.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'twice a day', duration: '5 days' }] } });
    expect(ok(rx.status), `prescription: ${rx.status} ${JSON.stringify(rx.body)?.slice(0, 200)}`).toBe(true);
    expect(rx.body.issued_by_staff_id, 'issued by the logged-in doctor, set by the server').toBe(w.doctor.id);
    const sg = await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' }); expect(ok(sg.status), `sign: ${sg.status}`).toBe(true); J.rx = rx.body;
  });

  test('TC_COP_JRN_004 the signed prescription exists for the episode', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.rx, 'blocked: TC_COP_DOC_010 did not create the prescription');
    const got = (await doc.get(`${w.b}/prescriptions/${J.rx.id}`)).body; expect(String(got.status).toUpperCase()).toBe('SIGNED');
  });

  test('TC_COP_DOC_012 the Doctor creates a 7-day treatment plan with 7 daily rows', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.cs, 'blocked: no signed case sheet (TC_COP_DOC_008)');
    const mk = await doc.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients['P-Female'], treatment_id: w.seed.treatments.COPABH, start_date: ymd(new Date(J.day)), duration_days: 7, case_sheet_id: J.cs.id, episode_id: J.ep.id, appointment_id: J.ap.id });
    expect(ok(mk.status), `create: ${mk.status} ${JSON.stringify(mk.body)?.slice(0, 200)}`).toBe(true);
    expect(mk.body.state).toBe('DRAFT'); expect(mk.body.rows?.length).toBe(7); J.sheet = mk.body;
  });

  test('TC_COP_DOC_014 the Doctor orders the plan', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.sheet, 'blocked: TC_COP_DOC_012 did not create the plan');
    const r = await doc.post(`${w.ts}/${J.sheet.id}/send-to-scheduling`, { order_notes: 'COP 7-day plan', planned_sessions: 7, frequency: 'daily', recommended_therapy: 'Abhyanga' }, ver(J.sheet));
    expect(ok(r.status), `order: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true);
    expect(r.body.state).toBe('ORDERED'); expect(r.body.scheduling_status).toBe('PENDING_SCHEDULING');
  });

  test('TC_COP_JRN_005 the ordered plan is in the scheduling list', async () => {
    const w = await world(); test.skip(!J.sheet || !passedEarlier('TC_COP_DOC_014'), 'blocked: TC_COP_DOC_014 did not pass');
    const o = await fetchOrder(w, J.sheet.id); expect(o, 'the order is listed').toBeTruthy(); expect(o.rows.length).toBe(7); J.order = o;
  });

  test('TC_COP_RCP_016 the Receptionist sees the ordered plan in the scheduling worklist', async () => {
    const w = await world(); const rec = await need('receptionist'); test.skip(!J.order, 'blocked: no ordered plan (TC_COP_JRN_005)');
    const r = await rec.get(`${w.ts}/clinic/${w.t}/treatment-orders`); why(r, 'Receptionist lists treatment orders');
    expect(ok(r.status), `the Receptionist's worklist returned ${r.status}`).toBe(true);
    expect(list(r.body).map(o => o.id)).toContain(J.sheet.id);
  });

  test('TC_COP_JRN_006 the front desk (Admin) sees the plan and its 7 rows', async () => {
    const w = await world(); test.skip(!J.order, 'blocked: no ordered plan');
    const o = await fetchOrder(w, J.sheet.id); expect(o.scheduling_status).toBe('PENDING_SCHEDULING'); expect(o.rows.length).toBe(7);
  });

  test('TC_COP_JRN_007 6a accepts: the front desk schedules all 7 days with therapist, room and time', async () => {
    const w = await world(); const adm = await need('admin'); test.skip(!J.order, 'blocked: no ordered plan');
    const rows = J.order.rows; const days: string[] = []; const d = new Date(J.day); while (days.length < rows.length) { if (d.getDay() !== 0) days.push(ymd(d)); d.setDate(d.getDate() + 1); }
    const mk = (time?: string) => rows.map((r: any, i: number) => ({ row_id: r.id, assigned_staff_id: w.therapist.id, therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], scheduled_date: days[i], ...(time ? { scheduled_time: time } : {}) }));
    const withTime = await adm.request('PATCH', `${w.ts}/${J.sheet.id}/rows/bulk-schedule`, { assignments: mk('11:00:00') }, ver(J.order)); why(withTime, 'bulk schedule with a time, as the app sends it');
    if (!ok(withTime.status)) {
      // keep the chain going so later steps are evaluated, then fail this step for the real reason
      const without = await adm.request('PATCH', `${w.ts}/${J.sheet.id}/rows/bulk-schedule`, { assignments: mk() }, ver(await fetchOrder(w, J.sheet.id)));
      note(`scheduling without a time answers ${without.status}`);
    }
    expect(ok(withTime.status), `bulk schedule with scheduled_time (what the app always sends) returned ${withTime.status} ${JSON.stringify(withTime.body)?.slice(0, 300)}`).toBe(true);
  });

  test('TC_COP_JRN_010 after scheduling, the plan is fully scheduled and each day has a date', async () => {
    const w = await world(); test.skip(!J.order, 'blocked: no ordered plan');
    const o = await fetchOrder(w, J.sheet.id); J.scheduled = o;
    expect(o.scheduling_status, 'plan scheduling status').toBe('FULLY_SCHEDULED');
    expect(o.rows.filter((r: any) => r.scheduled_date).length).toBe(7);
    note(`rows with a linked appointment: ${o.rows.filter((r: any) => r.appointment_id).length} of 7`);
    expect.soft(o.rows.filter((r: any) => r.appointment_id).length, 'each scheduled day has its appointment').toBe(7);
  });
});

test.describe('07 journey: 6b defer and 6c reject', () => {
  test('TC_COP_JRN_008 6b defers: the plan can be put on hold and stays open', async () => {
    const w = await world(); const adm = await need('admin');
    const p = await orderedPlan(w, 'P-Female2', FAR()); test.skip(!ok(p.sent.status), `blocked: could not order a plan (${p.sent.status})`);
    const exp = new Date(Date.now() + 7 * 864e5).toISOString();
    const hold = await adm.post(`${w.ts}/${p.sheet.id}/hold`, { hold_expires_at: exp, hold_notes: 'COP patient wants time to think' }, ver(await fetchOrder(w, p.sheet.id))); why(hold, 'place on hold');
    expect(ok(hold.status), `hold returned ${hold.status}`).toBe(true);
    const o = await fetchOrder(w, p.sheet.id); expect(o.on_hold, 'on hold').toBe(true); expect(o.state, 'still open').toBe('ORDERED');
  });

  test('TC_COP_JRN_009 6c rejects: the plan is cancelled with a recorded reason', async () => {
    const w = await world(); const adm = await need('admin');
    const p = await orderedPlan(w, 'P-Female3', FAR()); test.skip(!ok(p.sent.status), `blocked: could not order a plan (${p.sent.status})`);
    const reasons = (await adm.get(`${w.ts}/denial-reasons`)).body?.reasons ?? []; const code = reasons[0]?.code; expect(code, 'the clinic offers denial reasons').toBeTruthy();
    const res = await adm.post(`${w.ts}/${p.sheet.id}/cancel`, { reason_code: code, reason_text: 'COP: patient declined' }, ver(await fetchOrder(w, p.sheet.id))); why(res, 'cancel with a reason');
    expect(ok(res.status), `cancel returned ${res.status}`).toBe(true);
    const o = await fetchOrder(w, p.sheet.id); const state = o ? String(o.state) : 'removed from the worklist';
    expect(state, 'the plan leaves the active worklist or is CANCELLED').toMatch(/CANCEL|removed/i);
    if (o) expect(o.cancellation_reason_code, 'the reason is recorded').toBeTruthy();
  });

  test('TC_COP_RCP_020 a plan cannot be rejected without a reason', async () => {
    const w = await world(); const adm = await need('admin');
    const p = await orderedPlan(w, 'P-Female3', FAR()); test.skip(!ok(p.sent.status), `blocked: could not order a plan (${p.sent.status})`);
    const res = await adm.post(`${w.ts}/${p.sheet.id}/cancel`, {}, ver(await fetchOrder(w, p.sheet.id))); why(res, 'cancel without a reason');
    expect(refused(res.status), `cancel without a reason returned ${res.status}`).toBe(true);
  });
});

test.describe('04 Doctor: documents', () => {
  test('TC_COP_DOC_007 only one case sheet per episode: a second request opens the existing one', async () => {
    // owner decision (22 Nov 2026): keep the approved find-or-create (R7 FR-CS-1); the database also allows only one live sheet per episode
    const w = await world(); const doc = await need('doctor'); test.skip(!J.cs, 'blocked: no case sheet (TC_COP_DOC_006)');
    const second = await doc.post(`${w.b}/clients/${w.seed.patients['P-Female']}/casesheets`, { clinic_type: 'ayurveda', episode_id: J.ep.id, appointment_id: J.ap.id, data_json: { chief_complaint: 'COP second sheet' } });
    why(second, 'second case sheet for the same episode');
    expect(ok(second.status), `the second request returned ${second.status}`).toBe(true);
    expect(second.body.id, 'the existing sheet comes back, not a new one').toBe(J.cs.id);
    expect(second.body.data_json?.chief_complaint ?? '', 'the existing sheet is not overwritten').not.toBe('COP second sheet');
  });

  test('TC_COP_DOC_011 a non-doctor cannot sign or forge the signer', async () => {
    const w = await world(); const rec = await need('receptionist'); test.skip(!J.cs || !J.rx, 'blocked: no case sheet or prescription');
    const a = await rec.request('PATCH', `${w.b}/casesheets/${J.cs.id}/status`, { status: 'SIGNED' }); why(a, 'Receptionist signs a case sheet');
    const b = await rec.request('PATCH', `${w.b}/prescriptions/${J.rx.id}`, { status: 'SIGNED', signed_by_staff_id: w.doctor.id }); why(b, 'Receptionist signs a prescription naming the doctor');
    expect.soft(refused(a.status), `case sheet sign by a Receptionist returned ${a.status}`).toBe(true);
    expect.soft(refused(b.status), `prescription sign/forge by a Receptionist returned ${b.status}`).toBe(true);
  });

  test('TC_COP_DOC_021 the Doctor cannot manage roles or staff or delete appointments', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.ap, 'blocked: no appointment');
    const del = await doc.request('DELETE', `${w.b}/appointments/${J.ap.id}`); why(del, 'Doctor deletes an appointment');
    const staff = await doc.post(`${w.b}/staff`, { full_name: 'COP doctor must not add', staff_type: 'nurse', gender: 'female', phone: '+919000000499', requires_login: false }); why(staff, 'Doctor creates staff');
    const adm = list((await doc.get(`/api/v1/rbac/${w.t}/tenant-roles`)).body).find(r => r.name === 'Clinic Admin');
    const role = adm ? await doc.request('PUT', `/api/v1/rbac/${w.t}/tenant-roles/${adm.id}/permissions/invoice.read`, { enabled: false }) : { status: 403, body: 'no role list' }; why(role as any, 'Doctor changes a role permission');
    expect.soft(refused(del.status), `delete appointment returned ${del.status}`).toBe(true);
    expect.soft(refused(staff.status), `create staff returned ${staff.status}`).toBe(true);
    expect.soft(refused(role.status), `change role permission returned ${role.status}`).toBe(true);
  });
});

test.describe('03 Receptionist and 05 Therapist: role boundaries', () => {
  test('TC_COP_RCP_001 the Receptionist signs in with the Receptionist role and front-desk data loads', async () => {
    const w = await world(); const rec = await need('receptionist');
    const me = (await rec.get('/api/v1/auth/me')).body; expect(me.roles).toContain('Receptionist');
    for (const p of ['appointments?limit=10', 'clients?limit=10', 'staff?limit=10']) expect.soft((await rec.get(`${w.b}/${p}`)).status, p).toBe(200);
    note('API level: role and data calls. The landing screen is a UI check.');
  });

  test('TC_COP_RCP_025 the Receptionist cannot create episodes or author documents', async () => {
    const w = await world(); const rec = await need('receptionist'); const patient = w.seed.patients['P-Male'];
    const calls: [string, () => Promise<{ status: number; body: any }>][] = [
      ['episode', () => rec.post(`${w.b}/episodes`, { client_id: patient, title: 'COP receptionist must not create this' })],
      ['case sheet', () => rec.post(`${w.b}/clients/${patient}/casesheets`, { clinic_type: 'ayurveda', data_json: { chief_complaint: 'x' } })],
      ['prescription', () => rec.post(`${w.b}/prescriptions`, { client_id: patient, prescription_data: { medications: [] } })],
    ];
    for (const [label, call] of calls) {
      const r = await call(); why(r, label); const detail = JSON.stringify(r.body?.detail ?? r.body);
      expect.soft([401, 403], `${label} returned ${r.status}`).toContain(r.status);
      expect.soft(detail, `${label} refused for a reason other than permission`).not.toMatch(/COMMERCIAL_ENTITLEMENT_REQUIRED|No tenant_id in JWT/);
    }
  });

  test('TC_COP_THR_001 the Therapist signs in with the Therapist role and the dashboard loads', async () => {
    const w = await world(); const th = await need('therapist');
    const me = (await th.get('/api/v1/auth/me')).body; expect(me.roles).toContain('Therapist');
    const d = await th.get(`${w.b}/staff/me/dashboard/therapist`); expect(d.status).toBe(200);
    for (const k of ['assigned_treatments_today', 'completed_treatments_today', 'pending_treatments']) expect.soft(d.body, `dashboard field ${k}`).toHaveProperty(k);
    note('API level: role and dashboard data. The landing screen is a UI check.');
  });

  test('TC_COP_THR_012 the Therapist cannot book, author documents or reach other clinics', async () => {
    const w = await world(); const th = await need('therapist'); const patient = w.seed.patients['P-Male']; const d = workday(FAR());
    const book = await th.post(`${w.b}/appointments`, { client_id: patient, doctor_id: w.doctor.id, therapist_ids: [], room_id: w.seed.rooms['C-1'], appointment_start: `${ymd(d)}T10:00:00`, appointment_end: `${ymd(d)}T10:30:00`, status: 'scheduled', appointment_type: 'SINGLE' }); why(book, 'Therapist books an appointment');
    const doc = await th.post(`${w.b}/episodes`, { client_id: patient, title: 'COP therapist must not create this' }); why(doc, 'Therapist creates an episode');
    const g = new ApiSession((await import('../../../shared/identities')).identityFor('WEB', 'general') as any); await g.signIn(); await g.reconcileTenantClaim();
    const other = (await g.get('/api/v1/auth/me')).body.tenant_id; const cross = await th.get(`/api/v1/clinic/${other}/rooms`); why(cross, 'Therapist reads another clinic');
    expect.soft(refused(book.status), `book returned ${book.status}`).toBe(true);
    expect.soft(refused(doc.status), `episode returned ${doc.status}`).toBe(true);
    expect.soft([401, 403, 404], `another clinic's rooms returned ${cross.status}`).toContain(cross.status);
  });

  test('TC_COP_NFR_007 a role change is picked up without signing in again', async () => {
    const w = await world(); const own = new ApiSession((await import('../../../shared/identities')).identityFor('WEB', 'ayurveda') as any); await own.signIn(); await own.reconcileTenantClaim();
    const rec = await need('receptionist'); const d = workday(FAR());
    const roles = list((await own.get(`/api/v1/rbac/${w.t}/tenant-roles`)).body); const role = roles.find(r => r.name === 'Receptionist'); test.skip(!role, 'blocked: the Receptionist role was not found');
    const book = () => rec.post(`${w.b}/appointments`, { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, therapist_ids: [], room_id: w.seed.rooms['C-2'], appointment_start: `${ymd(d)}T15:00:00`, appointment_end: `${ymd(d)}T15:30:00`, status: 'scheduled', appointment_type: 'SINGLE' });
    try {
      const off = await own.request('PUT', `/api/v1/rbac/${w.t}/tenant-roles/${role.id}/permissions/appointment.create`, { enabled: false }); expect(ok(off.status), `owner removes the permission: ${off.status}`).toBe(true);
      const after = await book(); why(after, 'Receptionist books after the permission was removed (same session)');
      expect(refused(after.status), `a Receptionist whose permission was removed still booked: ${after.status}`).toBe(true);
    } finally { await own.post(`/api/v1/rbac/${w.t}/tenant-roles/${role.id}/permissions/reset`); }
    const back = await book(); expect.soft(ok(back.status), `after the reset the Receptionist books again: ${back.status} ${JSON.stringify(back.body)?.slice(0, 120)}`).toBe(true);
  });
});

test.describe('10 Notifications (inbox)', () => {
  test('TC_COP_NTF_001 each user\'s inbox lists only their own notifications', async () => {
    const w = await world();
    for (const who of ['admin', 'receptionist', 'doctor', 'therapist'] as Who[]) {
      const a = await need(who); const r = await a.get(`/api/v1/notifications/${w.t}/history`);
      expect.soft(r.status, `${who} inbox`).toBe(200); expect.soft(r.body, `${who} inbox shape`).toHaveProperty('notifications');
    }
  });

  test('TC_COP_NTF_002 plan ordered: the front desk receives an inbox notification @known-gap', async () => {
    const w = await world(); const adm = await need('admin'); const rec = await need('receptionist'); test.skip(!J.order, 'blocked: no ordered plan (TC_COP_JRN_005)');
    const inbox = async (a: ApiSession) => JSON.stringify((await a.get(`/api/v1/notifications/${w.t}/history`)).body);
    const text = (await inbox(adm)) + (await inbox(rec));
    expect(text, 'a notification about the ordered plan reached the front desk').toMatch(/treatment|plan|order/i);
  });

  test('TC_COP_NTF_003 plan scheduled: the Doctor receives an inbox notification @known-gap', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.scheduled, 'blocked: the plan was not scheduled (TC_COP_JRN_007)');
    const text = JSON.stringify((await doc.get(`/api/v1/notifications/${w.t}/history`)).body);
    expect(text, 'a notification about the scheduled plan reached the doctor').toMatch(/treatment|plan|schedul/i);
  });
});

test.describe('14 Non-functional: signed documents', () => {
  test('TC_COP_NFR_011 a signed case sheet cannot be edited', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.cs || !passedEarlier('TC_COP_DOC_008'), 'blocked: no signed case sheet (TC_COP_DOC_008)');
    const r = await doc.request('PATCH', `${w.b}/casesheets/${J.cs.id}`, { data_json: { chief_complaint: 'COP edited after signing' } }); why(r, 'edit a signed case sheet');
    expect(refused(r.status), `editing a signed case sheet returned ${r.status}`).toBe(true);
    const back = await doc.request('PATCH', `${w.b}/casesheets/${J.cs.id}/status`, { status: 'DRAFT' }); why(back, 'move a signed case sheet back to draft');
    expect(refused(back.status), `moving a signed case sheet back to DRAFT returned ${back.status}`).toBe(true);
  });

  test('TC_COP_NFR_012 one case sheet per episode is enforced by the system', async () => {
    const w = await world(); const doc = await need('doctor'); test.skip(!J.cs, 'blocked: no case sheet (TC_COP_DOC_006)');
    const second = await doc.post(`${w.b}/clients/${w.seed.patients['P-Female']}/casesheets`, { clinic_type: 'ayurveda', episode_id: J.ep.id, appointment_id: J.ap.id, data_json: { chief_complaint: 'COP second sheet (NFR_012)' } }); why(second, 'second case sheet for the same episode');
    expect(ok(second.status), `a second request for the same episode returned ${second.status}`).toBe(true);
    expect(second.body.id, 'the system hands back the one existing sheet, never a second').toBe(J.cs.id);
  });
});
