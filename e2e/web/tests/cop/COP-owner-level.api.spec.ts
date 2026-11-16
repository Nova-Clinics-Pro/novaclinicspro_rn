import { ApiSession } from '../../../shared/api';
import { identityFor } from '../../../shared/identities';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, readSeed, test } from '../../../cop/fixture';

/**
 * COP cases that can run with the clinic OWNER's login: setup data, admin settings, scheduling rules, inventory, billing,
 * permissions and sign-out. The owner holds the admin and front-desk permissions, so cases written for the Admin or the
 * Receptionist are executed here and say so in their result ("executed as Clinic Owner"): a pass is not proof for the role
 * the case names. Cases that need a Doctor, Therapist, Admin or Receptionist session are in COP-blocked-needs-role-login.
 *
 * Every refusal reason is recorded. Data created here is removed or restored in the same test where the API allows.
 */
/** A random window far ahead, so reruns never collide with bookings left by earlier executions. */
const DAY = 450 + Math.floor(Math.random() * 2500);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
const ymd = (d: Date) => iso(d).slice(0, 10);
/** daysAhead days out, moved to the next Mon-Sat (or, for `sunday`, to the next Sunday), at hh:mm. */
const when = (daysAhead: number, hh: number, mm = 0, minutes = 30, sunday = false) => {
  const d = new Date(); d.setDate(d.getDate() + daysAhead);
  if (sunday) { while (d.getDay() !== 0) d.setDate(d.getDate() + 1); } else { while (d.getDay() === 0) d.setDate(d.getDate() + 1); }
  d.setHours(hh, mm, 0, 0);
  return { start: iso(d), end: iso(new Date(d.getTime() + minutes * 60_000)), date: ymd(d) };
};
/** The role a case is written for; need() then uses that role's own login when it exists, and says so when it falls back. */
let wantedRole = 'owner';
const asOwner = (role: string) => { wantedRole = role.toLowerCase(); };
const why = (res: { status: number; body: any }, label = 'response') => test.info().annotations.push({ type: 'refusal-reason', description: `${label}: ${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 220)}` });
const list = (b: any): any[] => (Array.isArray(b) ? b : b?.items ?? b?.data ?? b?.appointments ?? []);
const ok = (s: number) => s >= 200 && s < 300;
const refused = (s: number) => s >= 400 && s < 500;

type Ctx = { api: ApiSession; seed: any; t: string; b: string };
const sessions: Record<string, Promise<Ctx | null>> = {};
const sessionFor = (role: string): Promise<Ctx | null> => (sessions[role] ??= (async () => {
  const seed = readSeed()?.ayurveda; if (!seed) return null;
  const login = role === 'owner' ? identityFor('WEB', 'ayurveda') : readRoleIdentities()[role];
  if (!login?.email || (role !== 'owner' && !(login as any).passwordSet)) return null;
  const api = new ApiSession({ email: login.email, password: login.password } as any); await api.signIn(); await api.reconcileTenantClaim();
  return { api, seed, t: seed.tenantId as string, b: `/api/v1/clinic/${seed.tenantId}` };
})());
const owner = () => sessionFor('owner');
/** The session for the role the case names; else the nearest higher login (admin, then owner), recorded in the result. */
const need = async (): Promise<Ctx> => {
  const role = wantedRole; wantedRole = 'owner';
  const chain = role === 'owner' ? ['owner'] : role === 'admin' ? ['admin', 'owner'] : [role, 'admin', 'owner'];
  for (const r of chain) {
    const c = await sessionFor(r);
    if (c) {
      if (r !== role) test.info().annotations.push({ type: 'executed-as', description: `${r === 'admin' ? 'Clinic Admin' : 'Clinic Owner'} (the case is written for the ${role}; that login is not available)` });
      return c;
    }
  }
  test.skip(true, 'seed data not available: run register-owners.ts then seed.ts --apply');
  return null as never;
};
const book = (c: any, over: Record<string, unknown>) => c.api.post(`${c.b}/appointments`, { status: 'scheduled', appointment_type: 'SINGLE', therapist_ids: [], ...over });
/** Billing cases need an invoice. While invoice creation answers 500 (recorded by TC_COP_ADM_014) they cannot evaluate their own
 *  assertions, so they are Blocked by that defect rather than failed for the same reason a second time. */
const invoiceOrBlock = async (c: any, body: Record<string, unknown>) => {
  const res = await c.api.post(`/api/v1/finance/${c.t}/invoices`, body);
  test.skip(res.status >= 500, `blocked: invoice creation answers ${res.status} (see TC_COP_ADM_014)`);
  expect(ok(res.status), `invoice: ${res.status} ${JSON.stringify(res.body)?.slice(0, 260)}`).toBe(true);
  return res;
};
const consult = (c: any, patient: string, doctor: string, room: string, w: { start: string; end: string }) => book(c, { client_id: c.seed.patients[patient], doctor_id: c.seed.staff[doctor], room_id: c.seed.rooms[room], appointment_start: w.start, appointment_end: w.end });

// ------------------------------------------------------------------------------------------------ 00 setup and data

test.describe('00_Setup_And_Data', () => {
  test('TC_COP_SET_001 the run targets the Testing environment only', async () => {
    const c = await need();
    const health = await fetch(`${process.env.NC_API_BASE_URL ?? 'http://localhost:8000'}/health`);
    expect(health.status).toBe(200);
    const me = (await c.api.get('/api/v1/auth/me')).body;
    const tenant = (await c.api.get(`/api/v1/tenants/${c.t}`)).body;
    expect(tenant.name, 'clinic name').toMatch(/^NC-WEB-UAT-/);
    expect(me.tenant_id).toBe(c.t);
  });

  test('TC_COP_SET_002 two clinics exist: Ayurveda with gender matching ON, and General', async () => {
    const c = await need();
    const ay = (await c.api.get(`/api/v1/tenants/${c.t}/features`)).body;
    expect(ay.clinic_type).toBe('ayurveda');
    expect(ay.appointments.enable_gender_matching, 'Ayurveda: gender matching setting').toBe(true);
    const general = new ApiSession(identityFor('WEB', 'general')); await general.signIn(); await general.reconcileTenantClaim();
    const gt = (await general.get('/api/v1/auth/me')).body.tenant_id;
    const g = (await general.get(`/api/v1/tenants/${gt}/features`)).body;
    expect(g.clinic_type).toBe('general');
    expect(g.appointments.enable_gender_matching, 'General: gender matching not enforced').toBe(false);
    const hours = list((await c.api.get(`${c.b}/operating-hours?limit=50`)).body);
    expect(hours.length, 'operating hours configured').toBeGreaterThanOrEqual(7);
  });

  test('TC_COP_SET_004 rooms exist by purpose', async () => {
    const c = await need();
    const rooms = list((await c.api.get(`${c.b}/rooms?limit=500`)).body);
    expect(rooms.filter(r => r.room_type === 'consultation').length).toBeGreaterThanOrEqual(2);
    expect(rooms.filter(r => r.room_type === 'therapy').length).toBeGreaterThanOrEqual(2);
  });

  test('TC_COP_SET_005 treatments have duration, price and consumables', async () => {
    const c = await need();
    const t = list((await c.api.get(`${c.b}/treatments?limit=500&code=COPABH`)).body)[0];
    expect(t, 'Abhyanga exists').toBeTruthy();
    expect(Number(t.duration_minutes)).toBe(60);
    expect(Number(t.price)).toBe(1500);
    const usables = list((await c.api.get(`${c.b}/therapy-usables?treatment_id=${t.id}`)).body);
    expect(usables.length, 'consumables linked').toBeGreaterThan(0);
    expect(usables[0].unit).toBeTruthy(); expect(Number(usables[0].standard_quantity)).toBeGreaterThan(0);
  });

  test('TC_COP_SET_006 stock includes an item at zero and one below its reorder point', async () => {
    const c = await need();
    const inv = list((await c.api.get(`${c.b}/inventory?limit=500`)).body).filter(i => /^COP /.test(i.name));
    expect(inv.some(i => Number(i.current_stock) === 0), 'an item at zero').toBe(true);
    expect(inv.some(i => Number(i.current_stock) > 0 && Number(i.current_stock) < Number(i.reorder_point)), 'an item below its reorder point').toBe(true);
  });

  test('TC_COP_SET_007 patients exist and age is calculated from date of birth', async () => {
    const c = await need();
    const clients = list((await c.api.get(`${c.b}/clients?limit=500`)).body);
    const minor = clients.find(x => x.full_name === 'COP Patient Minor');
    expect(minor, 'P-Minor').toBeTruthy();
    const dob = new Date('2015-03-10'); const now = new Date();
    const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    expect(Number(minor.age), 'age derived from date of birth').toBe(age);
  });
});

// ------------------------------------------------------------------------------------------------ 01 owner and 02 admin

test.describe('01_Owner and 02_Admin settings', () => {
  test('TC_COP_ADM_003 operating hours, break and weekly off are configured', async () => {
    asOwner('Admin'); const c = await need();
    const hours = list((await c.api.get(`${c.b}/operating-hours?limit=50`)).body);
    const byDay = (d: number) => hours.find(h => Number(h.day_of_week) === d);
    // day_of_week: 0 = Monday ... 6 = Sunday (the app's convention)
    expect(byDay(6)?.is_open, 'Sunday is the weekly off').toBe(false);
    for (const d of [0, 1, 2, 3, 4, 5]) {
      expect(byDay(d)?.is_open, `day ${d} open`).toBe(true);
      expect(String(byDay(d)?.open_time).slice(0, 5)).toBe('09:00'); expect(String(byDay(d)?.close_time).slice(0, 5)).toBe('18:00');
      expect(String(byDay(d)?.break_start).slice(0, 5)).toBe('13:00'); expect(String(byDay(d)?.break_end).slice(0, 5)).toBe('14:00');
    }
  });

  test('TC_COP_ADM_004 rooms can be created with a purpose, and an invalid purpose is refused', async () => {
    asOwner('Admin'); const c = await need();
    const bad = await c.api.post(`${c.b}/rooms`, { name: `COP bad type ${Date.now()}`, room_type: 'not-a-type', capacity: 1 });
    why(bad, 'invalid room type'); expect(refused(bad.status)).toBe(true);
    const good = await c.api.post(`${c.b}/rooms`, { name: `COP ADM temp ${Date.now()}`, room_type: 'consultation', capacity: 1 });
    expect(ok(good.status), `valid room: ${good.status} ${JSON.stringify(good.body)?.slice(0, 160)}`).toBe(true);
    expect(good.body.room_type).toBe('consultation');
    await c.api.request('DELETE', `${c.b}/rooms/${good.body.id}`);
  });

  test('TC_COP_ADM_006 editing a price does not change an invoice already issued', async () => {
    asOwner('Admin'); const c = await need();
    const tr = list((await c.api.get(`${c.b}/treatments?limit=500&code=COPABH`)).body)[0];
    const inv = await invoiceOrBlock(c, {
      client_id: c.seed.patients['P-Male'], invoice_number: `COP-ADM006-${Date.now()}`, invoice_date: ymd(new Date()), status: 'issued',
      subtotal_amount: '1500', tax_amount: '0', discount_amount: '0', total_amount: '1500',
      lines: [{ line_type: 'treatment', treatment_id: tr.id, description: 'Abhyanga', quantity: '1', unit_price: '1500', discount_amount: '0', tax_percentage: '0', tax_amount: '0', line_total: '1500' }],
    });
    try {
      const patch = await c.api.request('PATCH', `${c.b}/treatments/${tr.id}`, { price: '1600', base_price: '1600' });
      expect(ok(patch.status), `price edit: ${patch.status}`).toBe(true);
      const after = (await c.api.get(`/api/v1/finance/${c.t}/invoices/${inv.body.id}`)).body;
      const line = (after.lines ?? [])[0];
      expect(Number(line?.unit_price ?? after.total_amount), 'the issued invoice keeps the old price').toBe(1500);
    } finally { await c.api.request('PATCH', `${c.b}/treatments/${tr.id}`, { price: '1500', base_price: '1500' }); }
  });

  test('TC_COP_ADM_007 booking enforcement can be configured and saved again', async () => {
    asOwner('Admin'); const c = await need();
    const cfg = { enforce_past_booking: true, enforce_operating_hours: false, enforce_break_time: true, enforce_weekly_off: true };
    const rules = async () => list((await c.api.get(`${c.b}/appointment-rules`)).body).find(r => r.rule_code === 'BOOKING_ENFORCEMENT');
    if (!(await rules()).tenant_override_config) {
      const first = await c.api.request('PUT', `${c.b}/appointment-rules/BOOKING_ENFORCEMENT`, { override_config: cfg, is_override_active: true });
      expect(ok(first.status), `first save: ${first.status} ${JSON.stringify(first.body)?.slice(0, 160)}`).toBe(true);
    }
    expect((await rules()).effective_config, 'the rule is saved and in force').toMatchObject(cfg);
    // The settings screen is saved more than once: the same save a second time must succeed.
    const again = await c.api.request('PUT', `${c.b}/appointment-rules/BOOKING_ENFORCEMENT`, { override_config: cfg, is_override_active: true });
    why(again, 'second save of the same rule');
    expect.soft(ok(again.status), `second save returned ${again.status}`).toBe(true);
    // ...and a rule can be taken back to the organisation default.
    const del = await c.api.request('DELETE', `${c.b}/appointment-rules/BOOKING_ENFORCEMENT`);
    why(del, 'remove the override');
    expect.soft(ok(del.status), `removing the override returned ${del.status}`).toBe(true);
    if (!ok(del.status)) test.info().annotations.push({ type: 'state-left', description: 'the strict override stays in force on this clinic (it cannot be removed through the API); the scheduling cases below use it' });
    // Put the strict rule back if the delete did work, so the scheduling cases are evaluated in strict mode.
    if (!(await rules()).tenant_override_config) await c.api.request('PUT', `${c.b}/appointment-rules/BOOKING_ENFORCEMENT`, { override_config: cfg, is_override_active: true });
  });

  test('TC_COP_ADM_008 the gender matching rule is on and strict for Ayurveda', async () => {
    asOwner('Admin'); const c = await need();
    const rule = list((await c.api.get(`${c.b}/appointment-rules`)).body).find(r => r.rule_code === 'GENDER_MATCH');
    expect(rule, 'GENDER_MATCH rule listed').toBeTruthy();
    expect(rule.effective_config.enabled).toBe(true); expect(rule.effective_config.strict).toBe(true);
    expect(rule.effective_config.enforce_for_clinic_types).toContain('ayurveda');
  });

  test('TC_COP_ADM_014 an invoice can be created for a consultation', async () => {
    asOwner('Admin'); const c = await need(); const w = when(DAY + 5, 9, 0);
    const a = await consult(c, 'P-Male', 'D1', 'C-1', w); expect(ok(a.status), `appointment: ${a.status}`).toBe(true);
    const inv = await c.api.post(`/api/v1/finance/${c.t}/invoices`, {
      client_id: c.seed.patients['P-Male'], appointment_id: a.body.id, invoice_number: `COP-ADM014-${Date.now()}`, invoice_date: ymd(new Date()), status: 'issued',
      subtotal_amount: '500', tax_amount: '0', discount_amount: '0', total_amount: '500',
      lines: [{ line_type: 'service', description: 'Consultation fee', quantity: '1', unit_price: '500', discount_amount: '0', tax_percentage: '0', tax_amount: '0', line_total: '500' }],
    });
    why(inv, 'create invoice');
    expect(ok(inv.status), `invoice for the consultation returned ${inv.status}`).toBe(true);
  });

  test('OWNER-LEAVE the clinic owner approves a leave (evidence for DEF_COP_023)', async () => {
    const c = await sessionFor('owner') as Ctx; const w = when(DAY + 15, 10, 0, 60);
    const lv = await c.api.post(`${c.b}/staff/${c.seed.staff.T1}/leave`, { leave_type: 'CASUAL', start_date: w.date, end_date: w.date, reason: 'COP_ADM_009' });
    expect(ok(lv.status), `leave: ${lv.status} ${JSON.stringify(lv.body)?.slice(0, 200)}`).toBe(true);
    try {
      const ap = await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/approve`, {});
      why(ap, 'approve leave as the clinic owner');
      expect(ok(ap.status), `approve returned ${ap.status}`).toBe(true);
    } finally { await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/cancel`, {}); }
  });

  test('TC_COP_ADM_016 books, reschedules and cancels an appointment', async () => {
    asOwner('Admin'); const c = await need(); const w = when(DAY + 6, 9, 0); const w2 = when(DAY + 6, 11, 0);
    const a = await consult(c, 'P-Female', 'D2', 'C-2', w); expect(ok(a.status), `book: ${a.status} ${JSON.stringify(a.body)?.slice(0, 160)}`).toBe(true);
    const r = await c.api.post(`${c.b}/appointments/${a.body.id}/reschedule`, { appointment_start: w2.start, appointment_end: w2.end, reason: 'COP_ADM_016' });
    expect(ok(r.status), `reschedule: ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`).toBe(true);
    const moved = r.body?.new_appointment ?? r.body?.[1] ?? r.body;
    const id2 = moved?.id ?? a.body.id;
    const cancel = await c.api.request('PATCH', `${c.b}/appointments/${id2}/cancel`, {}); expect(ok(cancel.status), `cancel: ${cancel.status}`).toBe(true);
  });

  test('TC_COP_ADM_010 an item and a batch can be added; stock follows the batch', async () => {
    asOwner('Admin'); const c = await need();
    const item = await c.api.post(`${c.b}/inventory`, { name: `COP ADM item ${Date.now()}`, unit: 'ml', current_stock: '0', reorder_point: 5, location: {}, batch_tracking_enabled: true });
    expect(ok(item.status), `item: ${item.status} ${JSON.stringify(item.body)?.slice(0, 200)}`).toBe(true);
    const batch = await c.api.post(`${c.b}/inventory/${item.body.id}/batches`, { batch_number: `B-${Date.now()}`, quantity: '25', expiry_date: ymd(new Date(Date.now() + 365 * 864e5)) });
    expect(ok(batch.status), `batch: ${batch.status} ${JSON.stringify(batch.body)?.slice(0, 200)}`).toBe(true);
    const after = (await c.api.get(`${c.b}/inventory/${item.body.id}`)).body;
    expect(Number(after.current_stock), `stock after a batch of 25 (item reports ${JSON.stringify({ current_stock: after.current_stock, batches: after.batches?.length })})`).toBe(25);
  });

  test('TC_COP_ADM_011 a manual stock adjustment is recorded with its reason', async () => {
    asOwner('Admin'); const c = await need();
    const item = list((await c.api.get(`${c.b}/inventory?limit=500`)).body).find(i => i.name === 'COP Sesame oil');
    const before = Number(item.current_stock);
    const res = await c.api.post(`${c.b}/inventory/${item.id}/adjust-stock`, { quantity: '-20', notes: 'Spillage (COP_ADM_011)' });
    expect(ok(res.status), `adjust: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
    try {
      const after = Number((await c.api.get(`${c.b}/inventory/${item.id}`)).body.current_stock);
      expect(after, 'stock reduced by 20').toBe(before - 20);
      const mv = list((await c.api.get(`${c.b}/inventory/${item.id}/movements`)).body);
      expect(JSON.stringify(mv), 'movement carries the reason').toContain('Spillage');
    } finally { await c.api.post(`${c.b}/inventory/${item.id}/adjust-stock`, { quantity: '20', notes: 'COP restore' }); }
  });

  test('TC_COP_ADM_012 a low-stock item appears in the alerts @known-gap', async () => {
    asOwner('Admin'); const c = await need();
    const alerts = list((await c.api.get(`${c.b}/inventory/alerts`)).body);
    expect(JSON.stringify(alerts), 'Tablet X (10 in stock, reorder point 20) is listed as an alert').toContain('Tablet X');
  });

  test('TC_COP_ADM_013 the therapy consumables catalog lists quantity and unit', async () => {
    asOwner('Admin'); const c = await need();
    const tr = list((await c.api.get(`${c.b}/treatments?limit=500&code=COPABH`)).body)[0];
    const u = list((await c.api.get(`${c.b}/therapy-usables?treatment_id=${tr.id}`)).body);
    expect(u.length).toBeGreaterThan(0); expect(u[0].material_name).toBeTruthy(); expect(u[0].unit).toBeTruthy();
  });

  test('TC_COP_OWN_005 a staff member with a phone already in use is refused and nothing is created', async () => {
    const c = await need();
    const before = list((await c.api.get(`${c.b}/staff?limit=500`)).body).length;
    const res = await c.api.post(`${c.b}/staff`, { full_name: 'COP Duplicate Phone', staff_type: 'nurse', gender: 'female', phone: '+919000000103', requires_login: false });
    why(res, 'duplicate phone'); expect(refused(res.status), `returned ${res.status}`).toBe(true);
    const after = list((await c.api.get(`${c.b}/staff?limit=500`)).body).length;
    expect(after, 'no staff row was created').toBe(before);
  });

  test('TC_COP_OWN_009 the owner can customize an operational permission and reset it', async () => {
    const c = await need();
    const roles = list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles`)).body); const admin = roles.find(r => r.name === 'Clinic Admin');
    const perms = async () => list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles/${admin.id}/permissions`)).body);
    const p = (await perms()).find(x => x.code === 'invoice.read'); expect(p.locked).toBe(false);
    try {
      const off = await c.api.request('PUT', `/api/v1/rbac/${c.t}/tenant-roles/${admin.id}/permissions/invoice.read`, { enabled: !p.effective });
      expect(ok(off.status), `change: ${off.status} ${JSON.stringify(off.body)?.slice(0, 160)}`).toBe(true);
      expect((await perms()).find(x => x.code === 'invoice.read').effective, 'effective value follows the change').toBe(!p.effective);
    } finally { await c.api.post(`/api/v1/rbac/${c.t}/tenant-roles/${admin.id}/permissions/reset`); }
    expect((await perms()).find(x => x.code === 'invoice.read').effective, 'reset restores the default').toBe(p.effective);
  });

  test('TC_COP_OWN_010 clinical authoring cannot be granted to a non-doctor role', async () => {
    const c = await need();
    const admin = list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles`)).body).find(r => r.name === 'Clinic Admin');
    const res = await c.api.request('PUT', `/api/v1/rbac/${c.t}/tenant-roles/${admin.id}/permissions/casesheet.create`, { enabled: true });
    why(res, 'grant casesheet.create to Clinic Admin'); expect(refused(res.status), `returned ${res.status}`).toBe(true);
    const p = list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles/${admin.id}/permissions`)).body).find(x => x.code === 'casesheet.create');
    expect(p.effective, 'still not granted').toBe(false);
  });

  test('TC_COP_OWN_011 owner-only permissions cannot be taken from the owner role', async () => {
    const c = await need();
    const own = list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles`)).body).find(r => r.name === 'Clinic Owner');
    const before = list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles/${own.id}/permissions`)).body);
    const target = before.find(p => p.locked && p.effective);
    expect(target, 'the owner role has locked permissions').toBeTruthy();
    const res = await c.api.request('PUT', `/api/v1/rbac/${c.t}/tenant-roles/${own.id}/permissions/${target.code}`, { enabled: false });
    why(res, `revoke ${target.code} from Clinic Owner`); expect(refused(res.status), `returned ${res.status}`).toBe(true);
    expect(list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles/${own.id}/permissions`)).body).find(p => p.code === target.code).effective).toBe(true);
  });

  test('TC_COP_OWN_012 the owner deletes an appointment and it disappears from lists', async () => {
    const c = await need(); const w = when(DAY + 1, 9, 0);
    const a = await consult(c, 'P-Male', 'D1', 'C-1', w); expect(ok(a.status), `create: ${a.status} ${JSON.stringify(a.body)?.slice(0, 200)}`).toBe(true);
    const del = await c.api.request('DELETE', `${c.b}/appointments/${a.body.id}`); expect(ok(del.status), `delete: ${del.status}`).toBe(true);
    const listed = list((await c.api.get(`${c.b}/appointments?date=${w.date}&limit=100`)).body).map(x => x.id);
    expect(listed).not.toContain(a.body.id);
    expect((await c.api.get(`${c.b}/appointments/${a.body.id}`)).status, 'detail is gone').toBeGreaterThanOrEqual(400);
  });

  test('TC_COP_OWN_017 sign-out succeeds', async () => {
    const c = await need();
    const s = new ApiSession(identityFor('WEB', 'ayurveda')); await s.signIn();
    const out = await s.post('/api/v1/auth/logout'); expect(ok(out.status), `logout: ${out.status}`).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ 03 front desk

test.describe('03_Receptionist (front-desk work)', () => {
  test('TC_COP_RCP_002 a patient is registered and the age is calculated from the date of birth', async () => {
    asOwner('Receptionist'); const c = await need();
    const res = await c.api.post(`${c.b}/clients`, { full_name: `COP RCP patient ${Date.now()}`, phone: `+9199${String(Date.now()).slice(-8)}`, gender: 'female', date_of_birth: '1999-04-04' });
    expect(ok(res.status), `create: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
    const dob = new Date('1999-04-04'); const now = new Date();
    const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    expect(Number(res.body.age)).toBe(age);
    await c.api.request('DELETE', `${c.b}/clients/${res.body.id}`);
  });

  test('TC_COP_RCP_003 a patient can be saved without a phone, as the form says @known-gap', async () => {
    asOwner('Receptionist'); const c = await need();
    const res = await c.api.post(`${c.b}/clients`, { full_name: `COP no phone ${Date.now()}`, gender: 'male', date_of_birth: '1990-01-01' });
    why(res, 'patient without phone');
    expect(ok(res.status), `returned ${res.status}`).toBe(true);
    if (ok(res.status)) await c.api.request('DELETE', `${c.b}/clients/${res.body.id}`);
  });

  test('TC_COP_RCP_007 two therapists on one therapy', async () => {
    asOwner('Receptionist'); const c = await need(); const w = when(DAY + 2, 10, 0, 60);
    const res = await book(c, { client_id: c.seed.patients['P-Female2'], therapist_ids: [c.seed.staff.T1, c.seed.staff.T3], room_id: c.seed.rooms['T-1'], treatment_id: c.seed.treatments.COPABH, appointment_start: w.start, appointment_end: w.end });
    expect(ok(res.status), `create: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
    expect((res.body.therapist_ids ?? []).length).toBe(2);
  });

  test('TC_COP_RCP_011 an appointment is rescheduled and the original is kept in history', async () => {
    asOwner('Receptionist'); const c = await need(); const w = when(DAY + 3, 10, 0); const w2 = when(DAY + 3, 12, 0);
    const a = await consult(c, 'P-Male', 'D1', 'C-1', w); expect(ok(a.status), `create: ${a.status}`).toBe(true);
    const r = await c.api.post(`${c.b}/appointments/${a.body.id}/reschedule`, { appointment_start: w2.start, appointment_end: w2.end, reason: 'COP_RCP_011' });
    expect(ok(r.status), `reschedule: ${r.status} ${JSON.stringify(r.body)?.slice(0, 200)}`).toBe(true);
    const orig = (await c.api.get(`${c.b}/appointments/${a.body.id}`)).body;
    expect(String(orig.status).toUpperCase(), 'original is no longer an active booking').toMatch(/RESCHEDULED|CANCELLED/);
  });

  test('TC_COP_RCP_012 cancelling an appointment sets Cancelled and frees the slot', async () => {
    asOwner('Receptionist'); const c = await need(); const w = when(DAY + 4, 10, 0);
    const a = await consult(c, 'P-Male', 'D1', 'C-1', w); expect(ok(a.status)).toBe(true);
    const cancel = await c.api.request('PATCH', `${c.b}/appointments/${a.body.id}/cancel`, {}); expect(ok(cancel.status), `cancel: ${cancel.status} ${JSON.stringify(cancel.body)?.slice(0, 160)}`).toBe(true);
    expect(String((await c.api.get(`${c.b}/appointments/${a.body.id}`)).body.status).toUpperCase()).toBe('CANCELLED');
    const again = await consult(c, 'P-Minor', 'D1', 'C-1', w);
    expect(ok(again.status), `the freed slot can be booked again: ${again.status} ${JSON.stringify(again.body)?.slice(0, 160)}`).toBe(true);
  });

  test('TC_COP_RCP_021 an invoice is created with correct totals and paid in full', async () => {
    asOwner('Receptionist'); const c = await need();
    const tr = list((await c.api.get(`${c.b}/treatments?limit=500&code=COPABH`)).body)[0];
    const mk = await invoiceOrBlock(c, {
      client_id: c.seed.patients['P-Male'], invoice_number: `COP-RCP021-${Date.now()}`, invoice_date: ymd(new Date()), status: 'issued',
      subtotal_amount: '2000', tax_amount: '0', discount_amount: '0', total_amount: '2000',
      lines: [
        { line_type: 'service', description: 'Consultation fee', quantity: '1', unit_price: '500', discount_amount: '0', tax_percentage: '0', tax_amount: '0', line_total: '500' },
        { line_type: 'treatment', treatment_id: tr.id, description: 'Abhyanga', quantity: '1', unit_price: '1500', discount_amount: '0', tax_percentage: '0', tax_amount: '0', line_total: '1500' },
      ],
    });
    expect(Number(mk.body.total_amount)).toBe(2000);
    const pay = await c.api.post(`/api/v1/finance/${c.t}/payments`, { invoice_id: mk.body.id, client_id: c.seed.patients['P-Male'], payment_date: ymd(new Date()), amount: '2000', payment_method: 'cash' });
    expect(ok(pay.status), `payment: ${pay.status} ${JSON.stringify(pay.body)?.slice(0, 200)}`).toBe(true);
    const inv = (await c.api.get(`/api/v1/finance/${c.t}/invoices/${mk.body.id}`)).body;
    expect(String(inv.status).toLowerCase(), 'invoice status').toMatch(/paid/);
    expect(String(inv.status).toLowerCase()).not.toMatch(/partial/);
  });

  test('TC_COP_RCP_022 a partial payment leaves the balance outstanding', async () => {
    asOwner('Receptionist'); const c = await need();
    const mk = await invoiceOrBlock(c, {
      client_id: c.seed.patients['P-Male'], invoice_number: `COP-RCP022-${Date.now()}`, invoice_date: ymd(new Date()), status: 'issued',
      subtotal_amount: '2000', tax_amount: '0', discount_amount: '0', total_amount: '2000',
      lines: [{ line_type: 'service', description: 'Course of therapy', quantity: '1', unit_price: '2000', discount_amount: '0', tax_percentage: '0', tax_amount: '0', line_total: '2000' }],
    });
    const pay = await c.api.post(`/api/v1/finance/${c.t}/payments`, { invoice_id: mk.body.id, client_id: c.seed.patients['P-Male'], payment_date: ymd(new Date()), amount: '1000', payment_method: 'cash' });
    expect(ok(pay.status), `payment: ${pay.status}`).toBe(true);
    const inv = (await c.api.get(`/api/v1/finance/${c.t}/invoices/${mk.body.id}`)).body;
    expect(String(inv.status).toLowerCase(), 'status').toMatch(/partial/);
    const paid = list((await c.api.get(`/api/v1/finance/${c.t}/invoices/${mk.body.id}/payments`)).body).reduce((s, p) => s + Number(p.amount), 0);
    expect(2000 - paid, 'outstanding').toBe(1000);
  });
});

// ------------------------------------------------------------------------------------------------ 08 scheduling rules

test.describe('08_Conflicts_And_Scheduling: booking rules (Past, Break, Weekly off blocked; Outside hours warns)', () => {
  test.beforeAll(async () => {
    const c = await owner(); if (!c) return;
    const r = list((await c.api.get(`${c.b}/appointment-rules`)).body).find(x => x.rule_code === 'BOOKING_ENFORCEMENT');
    if (!r?.tenant_override_config) await c.api.request('PUT', `${c.b}/appointment-rules/BOOKING_ENFORCEMENT`, { override_config: { enforce_past_booking: true, enforce_operating_hours: false, enforce_break_time: true, enforce_weekly_off: true }, is_override_active: true });
  });
  // The rule is read with an owner session: reading the rules settings is not a front-desk permission, and the booking itself
  // is made with the role the case names.
  const strict = async (c: any) => {
    const o = (await owner())!;
    const r = list((await o.api.get(`${o.b}/appointment-rules`)).body).find((x: any) => x.rule_code === 'BOOKING_ENFORCEMENT');
    test.skip(!(r.effective_config.enforce_break_time && r.effective_config.enforce_weekly_off && r.effective_config.enforce_past_booking && !r.effective_config.enforce_operating_hours), 'blocked: the clinic is not in the configured rule mode (see TC_COP_ADM_007)');
  };

  test('TC_COP_CNF_006 a booking outside operating hours is accepted with a warning flag; inside hours is clean', async () => {
    asOwner('Receptionist'); const c = await need(); await strict(c);
    // one day per booking: nothing but the time of day can decide the outcome
    const late = when(DAY + 10, 17, 30, 60); const edge = when(DAY + 11, 18, 0, 30); const inside = when(DAY + 12, 17, 0, 60);
    const a = await consult(c, 'P-Male', 'D2', 'C-1', late); why(a, '17:30-18:30');
    const b = await consult(c, 'P-Minor', 'D2', 'C-2', edge); why(b, '18:00');
    const d = await consult(c, 'P-Female', 'D1', 'C-2', inside); why(d, '17:00-18:00');
    expect.soft(ok(d.status), `inside hours: ${d.status} ${JSON.stringify(d.body)?.slice(0, 160)}`).toBe(true);
    expect.soft(d.body.is_outside_operating_hours, '17:00-18:00 is not flagged').toBeFalsy();
    expect.soft(ok(a.status), `17:30-18:30 (warn, accepted): ${a.status}`).toBe(true);
    expect.soft(a.body.is_outside_operating_hours, '17:30-18:30 ends after closing time: should be flagged').toBe(true);
    expect.soft(ok(b.status), `18:00 (warn, accepted): ${b.status}`).toBe(true);
    expect.soft(b.body.is_outside_operating_hours, '18:00 starts at closing time: should be flagged').toBe(true);
  });

  test('TC_COP_CNF_007 a booking that overlaps the break is blocked; after the break is allowed', async () => {
    asOwner('Receptionist'); const c = await need(); await strict(c);
    const w1 = when(DAY + 13, 12, 30, 60); const w2 = when(DAY + 14, 13, 0, 30); const w3 = when(DAY + 15, 14, 0, 30);
    const a = await consult(c, 'P-Male', 'D2', 'C-1', w1); why(a, '12:30-13:30');
    const b = await consult(c, 'P-Minor', 'D2', 'C-2', w2); why(b, '13:00');
    const d = await consult(c, 'P-Female', 'D1', 'C-2', w3); why(d, '14:00');
    expect.soft(refused(a.status), `12:30-13:30 overlaps the break but returned ${a.status}`).toBe(true);
    expect.soft(refused(b.status), `13:00 (break start) returned ${b.status}`).toBe(true);
    expect.soft(ok(d.status), `14:00 (after the break) returned ${d.status} ${JSON.stringify(d.body)?.slice(0, 160)}`).toBe(true);
  });

  test('TC_COP_CNF_008 a booking on the weekly off is blocked', async () => {
    asOwner('Receptionist'); const c = await need(); await strict(c); const w = when(DAY + 16, 10, 0, 30, true);
    const a = await consult(c, 'P-Male', 'D2', 'C-1', w); why(a, 'Sunday 10:00');
    expect(refused(a.status), `Sunday returned ${a.status}`).toBe(true);
  });

  test('TC_COP_CNF_009 a booking in the past is blocked', async () => {
    asOwner('Receptionist'); const c = await need(); await strict(c); const d = new Date(); d.setDate(d.getDate() - 1); while (d.getDay() === 0) d.setDate(d.getDate() - 1); d.setHours(10, 0, 0, 0);
    const a = await consult(c, 'P-Male', 'D2', 'C-1', { start: iso(d), end: iso(new Date(d.getTime() + 30 * 60_000)) }); why(a, 'yesterday 10:00');
    expect(refused(a.status), `yesterday returned ${a.status}`).toBe(true);
  });

  test('TC_COP_CNF_015 consulting rooms only for consultations, therapy rooms only for therapies', async () => {
    asOwner('Receptionist'); const c = await need(); const w = when(DAY + 14, 11, 0, 60);
    const a = await book(c, { client_id: c.seed.patients['P-Minor'], doctor_id: c.seed.staff.D2, room_id: c.seed.rooms['T-2'], appointment_start: w.start, appointment_end: w.end });
    const b = await book(c, { client_id: c.seed.patients['P-Female3'], therapist_ids: [c.seed.staff.T3], room_id: c.seed.rooms['C-2'], treatment_id: c.seed.treatments.COPABH, appointment_start: w.start, appointment_end: w.end });
    why(a, 'consultation in therapy room'); why(b, 'therapy in consulting room');
    expect(refused(a.status), `consultation in a therapy room returned ${a.status}`).toBe(true);
    expect(refused(b.status), `therapy in a consulting room returned ${b.status}`).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ 11 lists and figures

test.describe('11_Dashboards_Metrics: figures come from the same lists', () => {
  test('TC_COP_DSH_001 the appointments for a day equal what was booked that day', async () => {
    asOwner('Owner'); const c = await need(); const w = when(DAY + 20, 9, 0); const w2 = when(DAY + 20, 10, 0);
    const a = await consult(c, 'P-Male', 'D1', 'C-1', w); const b = await consult(c, 'P-Minor', 'D1', 'C-1', w2);
    expect(ok(a.status) && ok(b.status), `create: ${a.status}/${b.status}`).toBe(true);
    await c.api.request('PATCH', `${c.b}/appointments/${b.body.id}/cancel`, {});
    const items = list((await c.api.get(`${c.b}/appointments?date=${w.date}&limit=100&expand=staff`)).body);
    expect(items.length, 'two appointments that day, one of them cancelled').toBe(2);
    expect(items.filter(i => String(i.status).toUpperCase() === 'CANCELLED').length).toBe(1);
  });

  test('TC_COP_DSH_002 active staff equals the staff list', async () => {
    asOwner('Owner'); const c = await need();
    const staff = list((await c.api.get(`${c.b}/staff?limit=500`)).body);
    const active = staff.filter(s => s.is_active !== false);
    expect(active.length).toBeGreaterThanOrEqual(9);
    const filtered = list((await c.api.get(`${c.b}/staff?limit=500&is_active=true`)).body);
    expect(filtered.length, 'is_active filter agrees with the list').toBe(active.length);
  });

  test('TC_COP_DSH_003 inventory alerts equal the items at or below their reorder point @known-gap', async () => {
    asOwner('Owner'); const c = await need();
    const inv = list((await c.api.get(`${c.b}/inventory?limit=500`)).body);
    const low = inv.filter(i => Number(i.current_stock) <= Number(i.reorder_point));
    const alerts = list((await c.api.get(`${c.b}/inventory/alerts`)).body);
    expect(alerts.length, `alerts (${alerts.length}) vs items at or below reorder point (${low.length})`).toBe(low.length);
  });
});

// ------------------------------------------------------------------------------------------------ 14 isolation

test.describe('14_NonFunctional_Arch_Perf_RLS', () => {
  test('TC_COP_NFR_001 a user of one clinic cannot read or write another clinic\'s data through the API', async () => {
    const c = await need();
    const g = new ApiSession(identityFor('WEB', 'general')); await g.signIn(); await g.reconcileTenantClaim();
    const other = (await g.get('/api/v1/auth/me')).body.tenant_id as string;
    const reads = ['clients', 'appointments', 'rooms', 'staff', 'inventory', 'treatments', 'operating-hours', 'appointment-rules', 'leaves', 'clinical-services', 'prescriptions'];
    for (const p of reads) {
      const res = await c.api.get(`/api/v1/clinic/${other}/${p}`);
      expect.soft([401, 403, 404], `reading General ${p} as the Ayurveda owner returned ${res.status}`).toContain(res.status);
    }
    for (const p of [`/api/v1/finance/${other}/invoices`, `/api/v1/notifications/${other}/history`, `/api/v1/rbac/${other}/tenant-roles`, `/api/v1/rbac/${other}/tenant-user-roles`, `/api/v1/rbac/${other}/tenant-user-role-history`, `/api/v1/treatment-sheets/clinic/${other}/treatment-orders`, `/api/v1/${other}/setup-progress`]) {
      const res = await c.api.get(p);
      expect.soft([401, 403, 404], `reading ${p.replace(other, '{other}')} returned ${res.status}`).toContain(res.status);
    }
    const write = await c.api.post(`/api/v1/clinic/${other}/clients`, { full_name: 'COP cross-clinic write', phone: '+919199999999', gender: 'male' });
    why(write, 'write into another clinic');
    // remove what this test just wrote, so a failing run does not leave a record in the other clinic
    if (ok(write.status) && write.body?.id) await g.request('DELETE', `/api/v1/clinic/${other}/clients/${write.body.id}`);
    expect.soft([401, 403, 404], `creating a client in General as the Ayurveda owner returned ${write.status}`).toContain(write.status);
    const roomWrite = await c.api.post(`${c.b}/appointments`, { client_id: (await g.get(`/api/v1/clinic/${other}/clients?limit=1`)).body?.items?.[0]?.id, doctor_id: c.seed.staff.D1, appointment_start: when(DAY + 30, 9).start, appointment_end: when(DAY + 30, 9).end, status: 'scheduled', appointment_type: 'SINGLE', therapist_ids: [] });
    why(roomWrite, 'book a patient from another clinic');
    expect.soft(refused(roomWrite.status), `booking another clinic's patient in this clinic returned ${roomWrite.status}`).toBe(true);
    if (ok(roomWrite.status) && roomWrite.body?.id) await c.api.request('PATCH', `${c.b}/appointments/${roomWrite.body.id}/cancel`, {});
  });
});
