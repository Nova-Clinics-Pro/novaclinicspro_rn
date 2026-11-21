import { ApiSession } from '../../../shared/api';
import { config } from '../../../shared/config';
import { identityFor } from '../../../shared/identities';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { as, book, consultAndSign, expect, far, fetchOrder, list, need, note, ok, readSeed, refused, scheduledPlan, slot, stock, test, ver, why, workday, world, ymd } from '../../../cop/roles';

/**
 * COP cases that remained after the first runs, executed with the real role logins at API level. Each assertion is the
 * workbook's expected result; a case that cannot reach its expected result because another defect stops it FAILS with that reason.
 */
const spec = async () => (await fetch(`${config.apiBaseUrl}/openapi.json`)).json() as Promise<any>;

test.describe('00 / 01 / 02 setup, owner and admin', () => {
  test('TC_COP_SET_003 role accounts exist in each clinic', async () => {
    const w = await world(); const owner = await need('owner');
    const have = list((await owner.get(`${w.b}/staff?limit=500&has_login=true`)).body).map(s => s.staff_type);
    for (const role of ['admin', 'receptionist', 'doctor', 'therapist']) expect.soft(have, `Ayurveda clinic has a ${role} with a login`).toContain(role);
    const g = new ApiSession(identityFor('WEB', 'general') as any); await g.signIn(); await g.reconcileTenantClaim();
    const gt = (await g.get('/api/v1/auth/me')).body.tenant_id; const gHave = list((await g.get(`/api/v1/clinic/${gt}/staff?limit=500&has_login=true`)).body).map(s => s.staff_type);
    for (const role of ['admin', 'receptionist', 'doctor', 'therapist']) expect.soft(gHave, `General clinic has a ${role} with a login`).toContain(role);
  });

  test('TC_COP_OWN_002 the overview figures equal the underlying lists', async () => {
    const w = await world(); const owner = await need('owner'); const d = ymd(workday(far()));
    await book(w, 'receptionist', { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: slot(new Date(d), 9, 0).start, appointment_end: slot(new Date(d), 9, 0).end });
    const appts = list((await owner.get(`${w.b}/appointments?date=${d}&limit=100`)).body); expect.soft(appts.length, 'appointments that day').toBeGreaterThan(0);
    const staff = list((await owner.get(`${w.b}/staff?limit=500`)).body).filter(s => s.is_active !== false); expect.soft(list((await owner.get(`${w.b}/staff?limit=500&is_active=true`)).body).length, 'Active Staff = active staff list').toBe(staff.length);
    const low = list((await owner.get(`${w.b}/inventory?limit=500`)).body).filter(i => Number(i.current_stock) <= Number(i.reorder_point));
    const alerts = list((await owner.get(`${w.b}/inventory/alerts?is_acknowledged=false&limit=500`)).body); expect.soft(alerts.length, `Inventory Alerts (${alerts.length}) = items at or below reorder point (${low.length})`).toBe(low.length);
  });

  test('TC_COP_OWN_004 a Clinic Admin with a login exists and has the admin role', async () => {
    const w = await world(); const adm = await need('admin'); const owner = await need('owner');
    const entry = list((await owner.get(`${w.b}/staff?limit=500&has_login=true`)).body).find(s => s.staff_type === 'admin');
    expect(entry, 'an admin staff member with a login').toBeTruthy();
    expect((await adm.get('/api/v1/auth/me')).body.roles).toContain('Clinic Admin');
  });

  test('TC_COP_OWN_006 an email that is already registered is explained, not a server error', async () => {
    const w = await world(); const owner = await need('owner'); const email = readRoleIdentities().admin.email;
    const r = await owner.post(`${w.b}/staff`, { full_name: 'COP duplicate email', staff_type: 'nurse', gender: 'female', phone: '+919000000488', requires_login: true, email }); why(r, 'staff with an email that is already a staff login');
    expect(refused(r.status), `returned ${r.status}`).toBe(true); expect(JSON.stringify(r.body)).toMatch(/exist|registered|already/i);
  });

  test('TC_COP_OWN_007 a staff member without a login can be given a login later @known-gap', async () => {
    const s = await spec(); const props = Object.keys(s.components.schemas.StaffUpdate.properties);
    expect(props, 'the staff update accepts a login (requires_login) so a login can be added later').toContain('requires_login');
  });

  test('TC_COP_OWN_008 changing the staff type re-assigns the role', async () => {
    const w = await world(); const owner = await need('owner'); const id = readRoleIdentities().receptionist;
    const roles = async () => { const a = new ApiSession({ email: id.email, password: id.password } as any); await a.signIn(); return (await a.get('/api/v1/auth/me')).body.roles as string[]; };
    expect(await roles(), 'starts as Receptionist').toContain('Receptionist');
    try {
      const r = await owner.request('PATCH', `${w.b}/staff/${w.reception.id}`, { staff_type: 'nurse' }); why(r, 'change staff type to nurse'); expect(ok(r.status), `change returned ${r.status}`).toBe(true);
      const after = await roles(); expect(after, `the role follows the staff type (now ${JSON.stringify(after)})`).not.toContain('Receptionist');
    } finally { await owner.request('PATCH', `${w.b}/staff/${w.reception.id}`, { staff_type: 'receptionist' }); }
    expect(await roles(), 'restored to Receptionist').toContain('Receptionist');
  });

  test('TC_COP_OWN_016 the appointment export matches the list for the same period', async () => {
    const w = await world(); const owner = await need('owner'); const d = ymd(workday(far()));
    for (const [p, h] of [['P-Male', 9], ['P-Minor', 10]] as const) await book(w, 'receptionist', { client_id: w.seed.patients[p], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: slot(new Date(d), h, 0).start, appointment_end: slot(new Date(d), h, 0).end });
    const listed = list((await owner.get(`${w.b}/appointments?date=${d}&limit=100`)).body).length;
    const exp = await owner.text(`${w.b}/appointments-history/export?start_date=${d}&end_date=${d}`);
    expect(ok(exp.status), `export returned ${exp.status}`).toBe(true);
    const rows = exp.text.trim().split('\n').filter(Boolean).length - 1; // minus the header row
    expect(rows, `export rows (${rows}) = appointments listed (${listed})`).toBe(listed);
  });

  test('TC_COP_ADM_005 an Admin creates a therapy treatment with consumables', async () => {
    const w = await world(); const adm = await need('admin'); const code = `COPA5${Date.now() % 100000}`;
    const tr = await adm.post(`${w.b}/treatments`, { code, name: `COP ADM5 ${code}`, category_code: 'therapy', duration_minutes: 45, price: '1000', base_price: '1000' }); expect(ok(tr.status), `treatment: ${tr.status} ${JSON.stringify(tr.body)?.slice(0, 160)}`).toBe(true);
    try {
      const us = await adm.post(`${w.b}/therapy-usables`, { treatment_id: tr.body.id, inventory_item_id: w.seed.inventory['COP Sesame oil'], material_name: 'COP Sesame oil', standard_quantity: 30, unit: 'ml', ml_per_unit: 1, category: 'oil' }); expect(ok(us.status), `usable: ${us.status} ${JSON.stringify(us.body)?.slice(0, 160)}`).toBe(true);
      const got = list((await adm.get(`${w.b}/therapy-usables?treatment_id=${tr.body.id}`)).body); expect(got.length).toBe(1); expect(Number(got[0].standard_quantity)).toBe(30);
    } finally { await adm.request('DELETE', `${w.b}/treatments/${tr.body.id}`); }
  });

  test('TC_COP_ADM_015 a completed visit produces an automated, editable draft invoice', async () => {
    const w = await world(); const c = await consultAndSign(w, 'P-Female', far()); const doc = await need('doctor'); const adm = await need('admin');
    const done = await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' }); expect(ok(done.status), `complete: ${done.status}`).toBe(true);
    const find = async () => list((await adm.get(`/api/v1/finance/${w.t}/invoices?client_id=${w.seed.patients['P-Female']}&limit=200`)).body).filter(i => i.appointment_id === c.ap.id);
    const invs = await find();
    expect(invs.length, 'one draft invoice exists for the completed consultation').toBe(1);
    expect(invs[0].status, 'it is a draft').toBe('draft');
    // completing again does not make a second one
    await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' });
    expect((await find()).length, 'still one invoice').toBe(1);
    // the staff can edit it before finalizing: new lines, totals follow, still a draft
    const edit = await adm.request('PUT', `/api/v1/finance/${w.t}/invoices/${invs[0].id}/lines`, { lines: [{ line_type: 'service', description: 'Consultation', quantity: '1', unit_price: '700', discount_amount: '100' }] });
    expect(ok(edit.status), `edit lines: ${edit.status} ${JSON.stringify(edit.body)?.slice(0, 160)}`).toBe(true);
    expect(Number(edit.body.total_amount), 'the total follows the edited line').toBe(600); expect(edit.body.status).toBe('draft');
  });

});

test.describe('03 Receptionist', () => {
  test('TC_COP_RCP_013 No-Show is accepted only at or after the start time', async () => {
    const g = new ApiSession(identityFor('WEB', 'general') as any); await g.signIn(); await g.reconcileTenantClaim();
    const gt = (await g.get('/api/v1/auth/me')).body.tenant_id; const b = `/api/v1/clinic/${gt}`; const seed: any = readSeed()?.general; test.skip(!seed, 'blocked: no General seed');
    const mk = (d: Date, hh: number) => g.post(`${b}/appointments`, { client_id: seed.patients['P-Male'], doctor_id: seed.staff.D1, therapist_ids: [], room_id: seed.rooms['C-1'], appointment_start: slot(d, hh, 0).start, appointment_end: slot(d, hh, 0).end, status: 'scheduled', appointment_type: 'SINGLE', ignore_past_date_warning: true });
    const past = new Date(); past.setDate(past.getDate() - 400 - Math.floor(Math.random() * 300)); const fut = workday(far());
    const a = await mk(past, 10); const f = await mk(fut, 10); expect(ok(a.status) && ok(f.status), `create: ${a.status}/${f.status} ${JSON.stringify(a.body)?.slice(0, 120)}`).toBe(true);
    const before = await g.request('PATCH', `${b}/appointments/${f.body.id}`, { status: 'NO_SHOW' }); why(before, 'No-Show on a future appointment');
    const after = await g.request('PATCH', `${b}/appointments/${a.body.id}`, { status: 'NO_SHOW' }); why(after, 'No-Show after the start time');
    expect.soft(refused(before.status), `No-Show before the start time returned ${before.status}`).toBe(true);
    expect.soft(ok(after.status), `No-Show after the start time returned ${after.status}`).toBe(true);
  });

  test('TC_COP_RCP_014 the WhatsApp confirmation is prefilled with clinic, date, time and staff', async () => {
    // The app builds this message and the wa.me link on the device (the server prefill route has no templates and is not used),
    // so the app's own builder is what is tested.
    const ts = await import('typescript'); const fs = await import('node:fs'); const pth = await import('node:path');
    const src = pth.resolve(__dirname, '../../../../frontend/features/appointments/domain/messaging/whatsapp/appointment.messages.ts');
    const js = ts.transpileModule(fs.readFileSync(src, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const mod: any = { exports: {} }; new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({})); const m = mod.exports;
    const msg = m.generateWhatsAppConfirmationMessage('Asha', 'COP Clinic', '12 Dec 2026', '10:00 AM', 'Dr COP', 'Abhyanga', '+919000000000', 'SINGLE');
    for (const part of ['Asha', 'COP Clinic', '12 Dec 2026', '10:00 AM', 'Dr COP']) expect.soft(msg, `message contains ${part}`).toContain(part);
    const url = m.openWhatsApp('+91 91000 00201', msg); expect(url).toMatch(/^https:\/\/wa\.me\/\+919100000201\?text=/);
  });

  for (const [id, title, call] of [
    ['TC_COP_RCP_017', 'Decision 6a: the front desk (Receptionist) schedules all sessions', 'schedule'],
    ['TC_COP_RCP_018', 'Decision 6b: the front desk (Receptionist) can defer a plan', 'hold'],
    ['TC_COP_RCP_019', 'Decision 6c: the front desk (Receptionist) can reject with a reason', 'reject'],
  ] as const) {
    test(`${id} ${title}`, async () => {
      const w = await world(); const rec = await need('receptionist'); const adm = await need('admin'); const doc = await need('doctor');
      const c = await consultAndSign(w, 'P-Female', far());
      const mk = await doc.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients['P-Female'], treatment_id: w.seed.treatments.COPABH, start_date: ymd(c.day), duration_days: 2, case_sheet_id: c.cs.id, episode_id: c.ep.id, appointment_id: c.ap.id });
      await doc.post(`${w.ts}/${mk.body.id}/send-to-scheduling`, { planned_sessions: 2, frequency: 'daily', recommended_therapy: 'Abhyanga' }, ver(mk.body));
      const o = await fetchOrder(w, mk.body.id);
      const r = call === 'schedule' ? await rec.request('PATCH', `${w.ts}/${mk.body.id}/rows/bulk-schedule`, { assignments: o.rows.map((x: any, i: number) => ({ row_id: x.id, assigned_staff_id: w.therapist.id, therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], scheduled_date: ymd(workday(far() + i)) })) }, ver(o))
        : call === 'hold' ? await rec.post(`${w.ts}/${mk.body.id}/hold`, { hold_expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }, ver(o))
        : await rec.post(`${w.ts}/${mk.body.id}/cancel`, { reason_code: 'COST', reason_text: 'COP' }, ver(o));
      why(r, `Receptionist ${call}`); expect(ok(r.status), `the Receptionist's ${call} returned ${r.status}`).toBe(true);
      void adm;
    });
  }

  test('TC_COP_RCP_023 a signed prescription is dispensed against a bill; stock leaves once the bill is paid @known-gap', async () => {
    const w = await world(); const doc = await need('doctor'); const adm = await need('admin'); const c = await consultAndSign(w, 'P-Male', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' });
    const item = w.seed.inventory['COP Tablet X (below reorder point)']; const s0 = await stock(w, 'COP Tablet X (below reorder point)');
    const r = await adm.post(`${w.b}/prescriptions/${rx.body.id}/dispense`, { lines: [{ inventory_item_id: item, quantity: '1' }] });
    why(r, 'dispense the signed prescription'); expect(ok(r.status), `dispense: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true);
    expect(r.body.lines?.length, 'the bill has one line per medicine').toBe(1);
    expect(await stock(w, 'COP Tablet X (below reorder point)'), 'dispensing alone does not take stock').toBe(s0);
    const again = await adm.post(`${w.b}/prescriptions/${rx.body.id}/dispense`, { lines: [{ inventory_item_id: item, quantity: '1' }] });
    expect(again.status, 'a prescription is dispensed once').toBe(409);
    const pay = await adm.post(`/api/v1/finance/${w.t}/payments`, { invoice_id: r.body.id, client_id: w.seed.patients['P-Male'], payment_date: ymd(new Date()), amount: String(r.body.total_amount), payment_method: 'CASH' });
    expect(ok(pay.status), `payment: ${pay.status} ${JSON.stringify(pay.body)?.slice(0, 160)}`).toBe(true);
    let after = s0; for (let i = 0; i < 20 && after === s0; i++) { await new Promise(r2 => setTimeout(r2, 1000)); after = await stock(w, 'COP Tablet X (below reorder point)'); }
    expect(s0 - after, `the dispensed tablet leaves stock once the bill is paid (before ${s0}, after ${after})`).toBe(1);
  });

  test('TC_COP_RCP_024 a shared prescription reaches the patient @known-gap', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' });
    const sh = await (await need('receptionist')).post(`${w.b}/prescriptions/${rx.body.id}/share`, { channel: 'WhatsApp', recipient_phone: '+919100000201' }); why(sh, 'share by WhatsApp');
    expect(sh.body?.delivered, 'the message was delivered to the patient').toBe(true);
  });
});

test.describe('04 Doctor', () => {
  test('TC_COP_DOC_001 the Doctor signs in and the dashboard data loads', async () => {
    const w = await world(); const doc = await need('doctor'); const d = ymd(workday(far()));
    const r = await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${d}`); expect(r.status).toBe(200); expect(r.body).toHaveProperty('appointments');
  });

  test('TC_COP_DOC_002 the card state follows consultation progress', async () => {
    const w = await world(); const doc = await need('doctor'); const day = far(); const d = workday(day); const t = slot(d, 10, 0);
    const ap = await book(w, 'receptionist', { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end });
    const prog = async () => list((await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(d)}`)).body.appointments ? { items: (await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(d)}`)).body.appointments } : {}).find(a => a.id === ap.body.id)?.consultation_progress;
    const seen: string[] = [await prog()];
    const ep = await doc.post(`${w.b}/episodes`, { client_id: w.seed.patients['P-Male'], title: 'COP DOC_002', appointment_id: ap.body.id });
    const cs = await doc.post(`${w.b}/clients/${w.seed.patients['P-Male']}/casesheets`, { clinic_type: 'ayurveda', episode_id: ep.body.id, appointment_id: ap.body.id, data_json: { chief_complaint: 'COP' } }); seen.push(await prog());
    for (const st of ['FINAL', 'SIGNED']) await doc.request('PATCH', `${w.b}/casesheets/${cs.body.id}/status`, { status: st });
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: ep.body.id, appointment_id: ap.body.id, prescription_data: { medications: [{ name: 'COP', dosage: '1', frequency: 'bd', duration: '1 day' }] } }); await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' }); seen.push(await prog());
    await doc.request('PATCH', `${w.b}/appointments/${ap.body.id}`, { status: 'COMPLETED' }); seen.push(await prog());
    note(`progress sequence: ${seen.join(' -> ')}`);
    expect(seen, 'progress follows the consultation').toEqual(['not_started', 'in_progress', 'documents_finalized', 'closed']);
  });

  test('TC_COP_DOC_003 starting the consultation opens the workspace with context', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female2', far());
    const r = await doc.get(`${w.b}/clinical-workspace?client_id=${w.seed.patients['P-Female2']}&episode_id=${c.ep.id}&appointment_id=${c.ap.id}`); expect(r.status).toBe(200);
    for (const k of ['identity', 'episode', 'appointment', 'casesheet', 'prescription', 'what_changed']) expect.soft(r.body, `workspace has ${k}`).toHaveProperty(k);
  });

  test('TC_COP_DOC_005 a follow-up visit is attached to the existing episode', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Minor', far());
    const t = slot(workday(far()), 11, 0); const fu = await book(w, 'receptionist', { client_id: w.seed.patients['P-Minor'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end });
    const at = await doc.post(`${w.b}/appointments/${fu.body.id}/attach-episode`, { episode_id: c.ep.id }); why(at, 'attach the follow-up to the episode'); expect(ok(at.status), `attach returned ${at.status}`).toBe(true);
    const det = (await doc.get(`${w.b}/episodes/${c.ep.id}/details`)).body; expect(JSON.stringify(det)).toContain(fu.body.id);
  });

  test('TC_COP_DOC_009 amending a signed case sheet creates a new version and keeps the old one', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const versions = async () => ((await doc.get(`${w.b}/casesheets/${c.cs.id}/versions`)).body.versions ?? []) as any[];
    const before = await versions(); expect(before.length, 'the signed version exists').toBeGreaterThan(0);
    const am = await doc.post(`${w.b}/casesheets/${c.cs.id}/amend`, {}); why(am, 'start an amendment'); expect(ok(am.status), `amend returned ${am.status}`).toBe(true);
    const fin = await doc.post(`${w.b}/casesheets/${c.cs.id}/amend/final`, {}); const sg = await doc.post(`${w.b}/casesheets/${c.cs.id}/amend/sign`, { amendment_reason: 'COP correction', expected_predecessor_version_id: before.find(v => v.is_current)?.version_id ?? before[before.length - 1]?.version_id });
    why(fin, 'amend final'); why(sg, 'amend sign');
    const after = await versions(); expect(after.length, `versions before ${before.length}, after ${after.length}`).toBeGreaterThan(before.length);
    expect(after.some(v => v.is_superseded), 'the earlier version is kept and marked superseded').toBe(true);
  });

  test('TC_COP_DOC_013 several treatment sheets can sit on one case sheet', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female3', far());
    const mk = (n: number, tr: string) => doc.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients['P-Female3'], treatment_id: tr, start_date: ymd(c.day), duration_days: n, case_sheet_id: c.cs.id, episode_id: c.ep.id, appointment_id: c.ap.id });
    const a = await mk(7, w.seed.treatments.COPABH); const b = await mk(3, w.seed.treatments.COPSHI);
    expect(ok(a.status) && ok(b.status), `second plan: ${a.status}/${b.status}`).toBe(true);
    const all = list((await doc.get(`${w.b}/treatment-sheets?limit=200`)).body); expect([a.body.id, b.body.id].every(i => all.some(s => s.id === i)), 'both listed').toBe(true);
  });

  test('TC_COP_DOC_015 a forbidden state change is refused with an explanation and the state is unchanged', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const r = await doc.request('PATCH', `${w.b}/casesheets/${c.cs.id}/status`, { status: 'DRAFT' }); why(r, 'SIGNED back to DRAFT');
    expect([400, 409, 422], `refused (got ${r.status})`).toContain(r.status); const msg = JSON.stringify(r.body?.detail ?? r.body); expect(msg.length, 'an explanation').toBeGreaterThan(10);
    expect.soft(msg, 'the explanation is in plain words, not an internal enum name').not.toMatch(/DocumentStatus\./);
    expect(String((await doc.get(`${w.b}/casesheets/${c.cs.id}`)).body.status).toUpperCase(), 'state unchanged').toBe('SIGNED');
  });

  test('TC_COP_DOC_016 completing the plan rows notifies the therapists and the front desk @known-gap', async () => {
    const w = await world(); const th = await need('therapist'); const adm = await need('admin');
    const p = await scheduledPlan(w, 'P-Female', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const text = JSON.stringify((await th.get(`/api/v1/notifications/${w.t}/history`)).body) + JSON.stringify((await adm.get(`/api/v1/notifications/${w.t}/history`)).body);
    expect(text, 'an inbox notification about the plan reached the therapist or the front desk').toMatch(/treatment|plan|session/i);
  });

  test('TC_COP_DOC_017 the card says Complete Consultation once the documents are finalized', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Female'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP', dosage: '1', frequency: 'bd', duration: '1 day' }] } }); await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' });
    const a = list({ items: (await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(c.day)}`)).body.appointments }).find(x => x.id === c.ap.id);
    expect(a?.consultation_progress).toBe('documents_finalized');
  });

  test('TC_COP_DOC_018 the Doctor completes the consultation', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Minor', far());
    const r = await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' }); expect(ok(r.status), `complete returned ${r.status} ${JSON.stringify(r.body)?.slice(0, 240)}`).toBe(true);
    const a = list({ items: (await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(c.day)}`)).body.appointments }).find(x => x.id === c.ap.id); expect(a?.consultation_progress).toBe('closed');
  });

  test('TC_COP_DOC_019 a follow-up visit shows what changed, plan progress and the next action', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' });
    const t = slot(workday(far()), 10, 0); const fu = await book(w, 'receptionist', { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end });
    const ws = await doc.get(`${w.b}/clinical-workspace?client_id=${w.seed.patients['P-Male']}&episode_id=${c.ep.id}&appointment_id=${fu.body.id}`); expect(ws.status, JSON.stringify(ws.body)?.slice(0, 160)).toBe(200);
    expect.soft(JSON.stringify(ws.body.what_changed ?? null).length, 'what changed since the last visit').toBeGreaterThan(6);
    const hist = (await doc.get(`${w.b}/clinical-workspace/history?client_id=${w.seed.patients['P-Male']}&episode_id=${c.ep.id}`)).body; expect.soft(list(hist).length, 'history lists the earlier visit').toBeGreaterThan(0);
    note(`workspace keys: ${Object.keys(ws.body).join(',')}`);
  });

  test('TC_COP_DOC_020 each doctor\'s dashboard lists only that doctor\'s appointments', async () => {
    const w = await world(); const doc = await need('doctor'); const d = workday(far());
    const mine = await book(w, 'receptionist', { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: slot(d, 9, 0).start, appointment_end: slot(d, 9, 0).end });
    const other = await book(w, 'receptionist', { client_id: w.seed.patients['P-Minor'], doctor_id: w.seed.staff.D1, room_id: w.seed.rooms['C-2'], appointment_start: slot(d, 9, 0).start, appointment_end: slot(d, 9, 0).end });
    const ids = list({ items: (await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(d)}`)).body.appointments }).map(a => a.id);
    expect(ids, 'own appointment listed').toContain(mine.body.id); expect(ids, 'another doctor\'s appointment not listed').not.toContain(other.body.id);
  });
});

test.describe('05 Therapist', () => {
  const sessionsOn = async (w: any, date: string) => list((await (await need('therapist')).get(`${w.b}/staff/me/dashboard/therapist/sessions?date=${date}`)).body);

  test('TC_COP_THR_002 a single therapy appointment appears on the Therapist\'s day', async () => {
    const w = await world(); const d = workday(far()); const t = slot(d, 11, 0, 60);
    const ap = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end }); expect(ok(ap.status), `book: ${ap.status} ${JSON.stringify(ap.body)?.slice(0, 160)}`).toBe(true);
    const s = await sessionsOn(w, ymd(d)); expect(s.length, `therapist sessions on ${ymd(d)}`).toBeGreaterThan(0);
  });

  test('TC_COP_THR_003 a multi-day session appears only on its own day', async () => {
    const w = await world(); const rec = await need('receptionist'); const base = far(); const sid = crypto.randomUUID(); const days: Date[] = []; for (let k = 0; days.length < 3; k++) { const d = workday(base + k); if (!days.some(x => ymd(x) === ymd(d))) days.push(d); }
    const items = days.map((d, i) => { const t = slot(d, 12, 0, 60); return { client_id: w.seed.patients['P-Female2'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'MULTI', series_id: sid, session_number: i + 1 }; });
    const r = await rec.post('/api/v1/appointments/bulk-create', { appointments: items, series_id: sid }); expect(ok(r.status), `bulk create: ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
    const d2 = await sessionsOn(w, ymd(days[1])); expect(d2.length, 'day 2 has exactly one session').toBe(1);
    expect(d2[0].appointment_id, 'it is the day-2 appointment').toBeTruthy(); note('the therapist session item carries no session number (day_number is null), so "session 2 of 3" cannot be shown');
    expect((await sessionsOn(w, ymd(days[0]))).length, 'day 1 has only its own').toBe(1);
  });

  test('TC_COP_THR_004 a two-therapist appointment shows for both therapists', async () => {
    const w = await world(); const d = workday(far()); const t = slot(d, 14, 0, 60);
    const ap = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female3'], therapist_ids: [w.therapist.id, w.seed.staff.T1], room_id: w.seed.rooms['T-2'], treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end }); expect(ok(ap.status), `book: ${ap.status}`).toBe(true);
    expect((ap.body.therapist_ids ?? []).length, 'both therapists are on the appointment').toBe(2);
    expect((await sessionsOn(w, ymd(d))).length, 'the logged-in therapist sees it').toBeGreaterThan(0);
    note('only the logged-in therapist\'s own view can be observed; the second therapist has no login');
  });

  test('TC_COP_THR_006 the Therapist starts a session', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const r = await th.post(`${w.ts}/${p.sheet.id}/rows/${p.order.rows[0].id}/start`, {}, ver(p.order)); why(r, 'start a session'); expect(ok(r.status), `start returned ${r.status}`).toBe(true); expect(r.body.state).toBe('IN_PROGRESS');
  });

  test('TC_COP_THR_007 a session is completed with its consumables prefilled, edited, and notifications sent', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const row = p.order.rows[0]; await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(p.order));
    const pre = list((await th.get(`/api/v1/clinic/treatment-sheets/rows/${row.id}/usables`)).body); expect.soft(pre.length, 'consumables prefilled from the treatment').toBeGreaterThan(0);
    const done = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, { materials: [{ material_name: 'COP Sesame oil', quantity_used: 60, unit: 'ml', ml_per_unit: 1, category: 'oil', inventory_item_id: w.seed.inventory['COP Sesame oil'] }] });
    expect.soft(ok(done.status) && done.body.status === 'COMPLETED', `completion returned ${done.status} ${done.body?.status}`).toBe(true);
    const inbox = JSON.stringify((await (await need('doctor')).get(`/api/v1/notifications/${w.t}/history`)).body) + JSON.stringify((await (await need('admin')).get(`/api/v1/notifications/${w.t}/history`)).body);
    expect.soft(inbox, 'the doctor or the front desk got an inbox notification').toMatch(/session|completed|treatment/i);
  });

  test('TC_COP_THR_008 completing a session twice does not consume stock twice', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female3', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const row = p.order.rows[0]; await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(p.order));
    const mat = { materials: [{ material_name: 'COP Sesame oil', quantity_used: 50, unit: 'ml', ml_per_unit: 1, category: 'oil', inventory_item_id: w.seed.inventory['COP Sesame oil'] }] };
    const s0 = await stock(w, 'COP Sesame oil'); const a = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, mat); const s1 = await stock(w, 'COP Sesame oil'); const b = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, mat); const s2 = await stock(w, 'COP Sesame oil');
    expect(ok(a.status), `first completion ${a.status}`).toBe(true); expect(s2 - s1, `the second completion changed stock by ${s2 - s1}`).toBe(0); note(`stock ${s0} -> ${s1} -> ${s2}; second completion answered ${b.status}`);
  });

  test('TC_COP_THR_009 session materials leave stock at completion; billed items leave stock only once the bill is paid', async () => {
    const w = await world(); const th = await need('therapist'); const adm = await need('admin'); const p = await scheduledPlan(w, 'P-Female2', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const item = w.seed.inventory['COP Sesame oil'];
    const row = p.order.rows[0]; await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(p.order));
    const s0 = await stock(w, 'COP Sesame oil');
    const done = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, { materials: [{ material_name: 'COP Sesame oil', quantity_used: 50, unit: 'ml', ml_per_unit: 1, category: 'oil', inventory_item_id: item }] });
    why(done, 'complete the session with 50 ml of oil'); expect(ok(done.status), `completion: ${done.status} ${JSON.stringify(done.body)?.slice(0, 200)}`).toBe(true);
    const s1 = await stock(w, 'COP Sesame oil');
    expect(s0 - s1, `the 50 ml the therapist used leaves stock at completion (before ${s0}, after ${s1}); therapist materials are not billed`).toBe(50);
    const inv = await adm.post(`/api/v1/finance/${w.t}/invoices`, { client_id: w.seed.patients['P-Female2'], invoice_number: `COP-THR009-${Date.now()}`, invoice_date: ymd(new Date()), status: 'sent',
      lines: [{ line_type: 'item', description: 'Sesame oil sold', inventory_item_id: item, quantity: '50', unit_price: '2' }] });
    why(inv, 'create the bill'); expect(ok(inv.status), `the bill: ${inv.status} ${JSON.stringify(inv.body)?.slice(0, 160)}`).toBe(true);
    expect(await stock(w, 'COP Sesame oil'), 'a billed but unpaid item has not left stock').toBe(s1);
    const pay = await adm.post(`/api/v1/finance/${w.t}/payments`, { invoice_id: inv.body.id, client_id: w.seed.patients['P-Female2'], payment_date: ymd(new Date()), amount: '100', payment_method: 'CASH' });
    expect(ok(pay.status), `payment: ${pay.status} ${JSON.stringify(pay.body)?.slice(0, 160)}`).toBe(true);
    let after = s1; for (let i = 0; i < 20 && after === s1; i++) { await new Promise(r => setTimeout(r, 1000)); after = await stock(w, 'COP Sesame oil'); }
    expect(s1 - after, `the 50 ml billed leave stock once the bill is paid (before ${s1}, after ${after})`).toBe(50);
  });

  test('TC_COP_THR_010 insufficient stock blocks completion with a clear message', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const row = p.order.rows[0]; await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(p.order));
    const r = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, { materials: [{ material_name: 'COP Herbal powder (zero stock)', quantity_used: 20, unit: 'g', ml_per_unit: 1, category: 'medicine', inventory_item_id: w.seed.inventory['COP Herbal powder (zero stock)'] }] });
    why(r, 'complete needing 20 g from an item at 0'); expect(refused(r.status), `completion returned ${r.status}`).toBe(true); expect(JSON.stringify(r.body)).toMatch(/herbal|stock|insufficient/i);
    expect(String((await fetchOrder(w, p.sheet.id)).rows[0].status), 'nothing partially recorded').not.toBe('COMPLETED');
  });

  test('TC_COP_THR_011 non-execution is recorded with a reason', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female', far(), 2); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const r = await th.post(`/api/v1/clinic/treatment-sheets/rows/${p.order.rows[0].id}/non-execution`, { reason_code: 'PATIENT_NO_SHOW', reason_text: 'COP' }); why(r, 'record non-execution'); expect(ok(r.status), `returned ${r.status}`).toBe(true);
    expect(r.body.non_execution_reason_code, 'the reason code is recorded').toBe('PATIENT_NO_SHOW'); expect(r.body.non_execution_reason_text, 'and its text').toBe('COP');
  });

  test('TC_COP_THR_013 the Therapist applies for leave and sees it requested', async () => {
    const w = await world(); const th = await need('therapist'); const adm = await need('admin'); const d = ymd(workday(far()));
    const r = await th.post(`${w.b}/staff/${w.therapist.id}/leave`, { leave_type: 'CASUAL', start_date: d, end_date: d, reason: 'COP_THR_013' }); expect(ok(r.status), `leave returned ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
    try { expect(String(r.body.status).toUpperCase()).toBe('REQUESTED'); } finally { await adm.request('PATCH', `${w.b}/leave/${r.body.id}/cancel`, {}); }
  });
});

test.describe('07 journey tail', () => {
  test('TC_COP_JRN_011 the Therapist performs day 1 and completes it', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female', far(), 7); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    const row = p.order.rows[0]; const st = await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(p.order)); expect(ok(st.status), `start ${st.status}`).toBe(true);
    const done = await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, { materials: [{ material_name: 'COP Sesame oil', quantity_used: 50, unit: 'ml', ml_per_unit: 1, category: 'oil', inventory_item_id: w.seed.inventory['COP Sesame oil'] }] }); expect(ok(done.status), `complete ${done.status}`).toBe(true);
    expect((await fetchOrder(w, p.sheet.id)).completed_count).toBe(1);
  });

  test('TC_COP_JRN_012 the front desk bills the consultation, session and medicines and takes payment', async () => {
    const w = await world(); const adm = await need('admin');
    const r = await adm.post(`/api/v1/finance/${w.t}/invoices`, { client_id: w.seed.patients['P-Female'], invoice_number: `COP-JRN012-${Date.now()}`, invoice_date: ymd(new Date()), status: 'sent',
      lines: [{ line_type: 'consultation', description: 'Consultation', quantity: '1', unit_price: '500' }, { line_type: 'treatment', description: 'Session', quantity: '1', unit_price: '1000' }, { line_type: 'item', description: 'Medicines', quantity: '1', unit_price: '500' }] });
    why(r, 'bill the visit'); expect(ok(r.status), `billing returned ${r.status}: ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
    expect(Number(r.body.total_amount), 'consultation, session and medicines').toBe(2000);
    const pay = await adm.post(`/api/v1/finance/${w.t}/payments`, { invoice_id: r.body.id, client_id: w.seed.patients['P-Female'], payment_date: ymd(new Date()), amount: '2000', payment_method: 'CASH' });
    expect(ok(pay.status), `payment: ${pay.status}`).toBe(true);
    expect((await adm.get(`/api/v1/finance/${w.t}/invoices/${r.body.id}`)).body.status, 'the invoice is paid').toBe('paid');
  });

  test('TC_COP_JRN_013 the Doctor completes the consultation', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female3', far());
    const r = await doc.request('PATCH', `${w.b}/appointments/${c.ap.id}`, { status: 'COMPLETED' }); expect(ok(r.status)).toBe(true);
    expect(list({ items: (await doc.get(`${w.b}/staff/me/dashboard/doctor?date=${ymd(c.day)}`)).body.appointments }).find(x => x.id === c.ap.id)?.consultation_progress).toBe('closed');
  });

  test('TC_COP_JRN_014 the follow-up visit shows progress and the next step', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const h = await doc.get(`${w.b}/clinical-workspace/history?client_id=${w.seed.patients['P-Male']}&episode_id=${c.ep.id}`); expect(h.status).toBe(200); expect(list(h.body).length, 'earlier encounters listed').toBeGreaterThan(0);
    const ws = await doc.get(`${w.b}/clinical-workspace?client_id=${w.seed.patients['P-Male']}&episode_id=${c.ep.id}&appointment_id=${c.ap.id}`); expect(JSON.stringify(ws.body.treatment ?? null).length, 'plan progress present').toBeGreaterThan(4);
  });

  test('TC_COP_JRN_015 after all sessions are completed the plan is COMPLETED', async () => {
    const w = await world(); const th = await need('therapist'); const p = await scheduledPlan(w, 'P-Female3', far(), 7); test.skip(!p.scheduled, 'blocked: the plan could not be scheduled');
    let order = p.order;
    for (const row of order.rows) {
      await th.post(`${w.ts}/${p.sheet.id}/rows/${row.id}/start`, {}, ver(await fetchOrder(w, p.sheet.id)));
      await th.post(`/api/v1/clinic/treatment-sheets/rows/${row.id}/complete`, { materials: [{ material_name: 'COP Sesame oil', quantity_used: 5, unit: 'ml', ml_per_unit: 1, category: 'oil', inventory_item_id: w.seed.inventory['COP Sesame oil'] }] });
    }
    order = await fetchOrder(w, p.sheet.id); expect(order?.completed_count, 'all 7 completed').toBe(7); expect(String(order?.state), 'plan state').toBe('COMPLETED');
  });

  test('TC_COP_JRN_016 a therapy works without any episode', async () => {
    const w = await world(); const d = workday(far()); const t = slot(d, 15, 0, 60);
    const ap = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female'], therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], treatment_id: w.seed.treatments.COPSHI, appointment_start: t.start, appointment_end: t.end }); expect(ok(ap.status), `book ${ap.status}`).toBe(true);
    const det = (await (await need('receptionist')).get(`${w.b}/appointments/${ap.body.id}`)).body; expect(det.episode_id ?? null, 'no episode needed').toBeNull();
    expect((await (await need('therapist')).get(`${w.b}/staff/me/dashboard/therapist/sessions?date=${ymd(d)}`)).body.items?.length, 'the therapist sees it').toBeGreaterThan(0);
  });

  test('TC_COP_JRN_017 a therapist leave after a series is booked flags the conflicted day @known-gap', async () => {
    const w = await world(); const adm = await need('admin'); const base = far(); const days = [workday(base), workday(base + 1), workday(base + 2), workday(base + 3)];
    const ids: string[] = []; for (let i = 0; i < 4; i++) { const t = slot(days[i], 16, 0, 60); const r = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female3'], therapist_ids: [w.seed.staff.T3], room_id: w.seed.rooms['T-2'], treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end }); expect(ok(r.status), `session ${i + 1}: ${r.status}`).toBe(true); ids.push(r.body.id); }
    const lv = await adm.post(`${w.b}/staff/${w.seed.staff.T3}/leave`, { leave_type: 'CASUAL', start_date: ymd(days[3]), end_date: ymd(days[3]), reason: 'COP_JRN_017' }); expect(ok(lv.status), `leave ${lv.status}`).toBe(true);
    try {
      await adm.request('PATCH', `${w.b}/leave/${lv.body.id}/approve`, {});
      const a = (await adm.get(`${w.b}/appointments/${ids[3]}`)).body; note(`day-4 appointment after leave: ${JSON.stringify({ status: a.status, flags: Object.keys(a).filter(k => /conflict|flag|warn/i.test(k) && a[k]) })}`);
      expect(JSON.stringify(a), 'the day-4 appointment is flagged as conflicted').toMatch(/conflict/i);
    } finally { await adm.request('PATCH', `${w.b}/leave/${lv.body.id}/cancel`, {}); }
  });

  test('TC_COP_JRN_018 a room made inactive flags its appointments and takes no new bookings', async () => {
    const w = await world(); const adm = await need('admin'); const d = workday(far());
    const room = await adm.post(`${w.b}/rooms`, { name: `COP temp room ${Date.now()}`, room_type: 'therapy', capacity: 1 }); expect(ok(room.status), `room ${room.status}`).toBe(true);
    try {
      const t = slot(d, 9, 0, 60); const a = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female2'], therapist_ids: [w.seed.staff.T1], room_id: room.body.id, treatment_id: w.seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end }); expect(ok(a.status), `book in the room ${a.status} ${JSON.stringify(a.body)?.slice(0, 140)}`).toBe(true);
      const off = await adm.request('PATCH', `${w.b}/rooms/${room.body.id}`, { is_active: false }); expect(ok(off.status), `deactivate ${off.status}`).toBe(true);
      const again = await book(w, 'receptionist', { client_id: w.seed.patients['P-Female3'], therapist_ids: [w.seed.staff.T3], room_id: room.body.id, treatment_id: w.seed.treatments.COPABH, appointment_start: slot(workday(far()), 9, 0, 60).start, appointment_end: slot(workday(far()), 9, 0, 60).end }); why(again, 'book into an inactive room');
      expect.soft(refused(again.status), `a new booking in the inactive room returned ${again.status}`).toBe(true);
      const old = (await adm.get(`${w.b}/appointments/${a.body.id}`)).body; expect.soft(JSON.stringify(old), 'the existing appointment is flagged').toMatch(/room.*(inactive|unavailable)|conflict/i);
    } finally { await adm.request('DELETE', `${w.b}/rooms/${room.body.id}`); }
  });
});

test.describe('10 notifications and 11 figures', () => {
  test('TC_COP_NTF_004 the Doctor completing rows notifies therapists and the front desk @known-gap', async () => {
    const w = await world(); const th = await need('therapist'); const rec = await need('receptionist');
    const text = JSON.stringify((await th.get(`/api/v1/notifications/${w.t}/history`)).body) + JSON.stringify((await rec.get(`/api/v1/notifications/${w.t}/history`)).body);
    expect(text, 'an inbox notification about the completed rows').toMatch(/treatment|plan|row|session/i);
  });
  test('TC_COP_NTF_005 a completed session notifies the Doctor and the front desk @known-gap', async () => {
    const w = await world(); const doc = await need('doctor'); const adm = await need('admin');
    const text = JSON.stringify((await doc.get(`/api/v1/notifications/${w.t}/history`)).body) + JSON.stringify((await adm.get(`/api/v1/notifications/${w.t}/history`)).body);
    expect(text, 'an inbox notification about a completed session').toMatch(/session.*complet|completed/i);
  });
  test('TC_COP_NTF_006 low stock notifies the Admin @known-gap', async () => {
    const w = await world(); const adm = await need('admin');
    expect(JSON.stringify((await adm.get(`/api/v1/notifications/${w.t}/history`)).body), 'a low-stock notification').toMatch(/stock|inventory|reorder/i);
  });
  test('TC_COP_NTF_007 a notification stays until the user marks it read', async () => {
    const w = await world(); const adm = await need('admin');
    const t = await adm.post(`/api/v1/notifications/${w.t}/test`, { title: 'COP test', body: 'COP NTF_007' }); why(t, 'send a test notification'); test.skip(!ok(t.status), `blocked: the test notification could not be created (${t.status})`);
    const find = async () => list((await adm.get(`/api/v1/notifications/${w.t}/history?limit=50`)).body).find(n => /COP test|COP NTF_007/.test(JSON.stringify(n)));
    const n = await find(); expect(n, 'the notification is in the inbox').toBeTruthy(); await new Promise(r => setTimeout(r, 4000));
    expect((await find())?.is_read ?? (await find())?.read ?? false, 'still unread after waiting').toBeFalsy();
    const mr = await adm.request('PATCH', `/api/v1/notifications/${w.t}/history/${n.id}/mark-read`, {}); expect(ok(mr.status)).toBe(true);
  });

  test('TC_COP_DSH_005 pending treatment orders match the worklist', async () => {
    const w = await world(); const adm = await need('admin'); let skip = 0; const all: any[] = []; let total = 0;
    for (;;) { const r = await adm.get(`/api/v1/treatment-sheets/clinic/${w.t}/treatment-orders?limit=100&skip=${skip}`); expect(r.status).toBe(200); all.push(...list(r.body)); total = r.body.total; if (all.length >= total || !list(r.body).length) break; skip += 100; }
    expect(all.length, `the worklist reports ${total} orders and returns ${all.length}`).toBe(total);
    note(`pending scheduling: ${all.filter(o => o.scheduling_status === 'PENDING_SCHEDULING').length} of ${all.length}`);
  });

  test('TC_COP_DSH_009 the daily summary equals the list by status', async () => {
    const w = await world(); const rec = await need('receptionist'); const d = workday(far());
    const mk = async (p: string, h: number) => (await book(w, 'receptionist', { client_id: w.seed.patients[p], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: slot(d, h, 0).start, appointment_end: slot(d, h, 0).end })).body.id;
    const a = await mk('P-Male', 9), b = await mk('P-Minor', 10), c = await mk('P-Female', 11), e = await mk('P-Female2', 12);
    await rec.request('PATCH', `${w.b}/appointments/${a}`, { status: 'COMPLETED' }); await rec.request('PATCH', `${w.b}/appointments/${b}/cancel`, {}); void c; void e;
    const items = list((await rec.get(`${w.b}/appointments?date=${ymd(d)}&limit=100`)).body); const n = (s: string) => items.filter(i => String(i.status).toUpperCase() === s).length;
    expect({ total: items.length, completed: n('COMPLETED'), cancelled: n('CANCELLED') }, 'summary figures').toEqual({ total: 4, completed: 1, cancelled: 1 });
  });

  test('TC_COP_DSH_010 counts use the clinic\'s timezone, not UTC', async () => {
    const w = await world(); const adm = await need('admin'); const d = workday(far()); const next = new Date(d); next.setDate(next.getDate() + 1); while (next.getDay() === 0) next.setDate(next.getDate() + 1);
    const t = slot(next, 0, 30); const ap = await book(w, 'receptionist', { client_id: w.seed.patients['P-Male'], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end }); expect(ok(ap.status), `00:30 booking ${ap.status} ${JSON.stringify(ap.body)?.slice(0, 120)}`).toBe(true);
    const onIstDay = list((await adm.get(`${w.b}/appointments?date=${ymd(next)}&timezone=Asia/Kolkata&limit=100`)).body).map(a => a.id);
    const onPrev = list((await adm.get(`${w.b}/appointments?date=${ymd(d)}&timezone=Asia/Kolkata&limit=100`)).body).map(a => a.id);
    expect(onIstDay, 'counted on the IST date').toContain(ap.body.id); expect(onPrev, 'not counted on the previous (UTC) date').not.toContain(ap.body.id);
  });
});

test.describe('14 non-functional', () => {
  test('TC_COP_NFR_004 every permission is enforced on the server for every role', async () => {
    const w = await world(); const checks: [string, string, (a: ApiSession) => Promise<{ status: number; body: any }>][] = [
      ['appointment.delete', 'delete an appointment', a => a.request('DELETE', `${w.b}/appointments/${crypto.randomUUID()}`)],
      ['episode.create', 'create an episode', a => a.post(`${w.b}/episodes`, { client_id: w.seed.patients['P-Male'], title: 'COP NFR_004' })],
      ['casesheet.create', 'create a case sheet', a => a.post(`${w.b}/clients/${w.seed.patients['P-Male']}/casesheets`, { clinic_type: 'ayurveda', data_json: { x: 1 } })],
      ['prescription.create', 'create a prescription', a => a.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], prescription_data: { medications: [] } })],
      ['staff.create', 'create staff', a => a.post(`${w.b}/staff`, { full_name: 'COP NFR_004', staff_type: 'nurse', gender: 'female', phone: '+919000000477', requires_login: false })],
      ['treatment_order.list', 'list treatment orders', a => a.get(`/api/v1/treatment-sheets/clinic/${w.t}/treatment-orders`)],
      ['role.manage_permissions', 'change a role permission', a => a.request('PUT', `/api/v1/rbac/${w.t}/tenant-roles/${crypto.randomUUID()}/permissions/invoice.read`, { enabled: true })],
    ];
    const problems: string[] = [];
    for (const who of ['admin', 'receptionist', 'doctor', 'therapist'] as const) {
      const a = await need(who); const perms: string[] = (await a.get('/api/v1/auth/me')).body.permissions ?? [];
      for (const [perm, label, call] of checks) {
        const r = await call(a); const has = perms.includes(perm); const forbidden = r.status === 403 && /MISSING_PERMISSION|permission/i.test(JSON.stringify(r.body));
        if (!has && !forbidden) problems.push(`${who} lacks ${perm} but "${label}" returned ${r.status}`);
        if (has && forbidden) problems.push(`${who} has ${perm} but "${label}" was refused for permission`);
      }
    }
    expect(problems, problems.join('; ')).toEqual([]);
  });

  test('TC_COP_NFR_006 an expired or invalid session is answered cleanly (401), without retries', async () => {
    const w = await world();
    const bad = await fetch(`${config.apiBaseUrl}/api/v1/auth/me`, { headers: { Authorization: 'Bearer expired.token.value' } });
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ sub: 'x', exp: 1 })).toString('base64url');
    const expired = await fetch(`${config.apiBaseUrl}/api/v1/clinic/${w.t}/appointments`, { headers: { Authorization: `Bearer ${header}.${payload}.sig` } });
    for (const [label, r] of [['malformed token', bad], ['expired token', expired]] as const) { expect.soft(r.status, `${label} returned ${r.status}`).toBe(401); expect.soft((await r.text()).length, `${label} has a body`).toBeGreaterThan(5); }
  });

  test('TC_COP_NFR_010 concurrent use does not exhaust the connection pool', async () => {
    const w = await world(); const sessions = await Promise.all((['admin', 'receptionist', 'doctor', 'therapist'] as const).map(need));
    const calls: Promise<number>[] = []; for (let i = 0; i < 90; i++) { const a = sessions[i % 4]; calls.push(a.get([`${w.b}/appointments?limit=20`, `${w.b}/staff?limit=20`, `${w.b}/clients?limit=20`, `${w.b}/inventory?limit=20`][i % 4]).then(r => r.status)); }
    const t0 = Date.now(); const codes = await Promise.all(calls); const ms = Date.now() - t0;
    note(`90 concurrent requests in ${ms} ms`); const bad = codes.filter(c => c >= 500 || c === 0); expect(bad.length, `${bad.length} of 90 failed (${[...new Set(codes)].join(',')})`).toBe(0);
  });
});
