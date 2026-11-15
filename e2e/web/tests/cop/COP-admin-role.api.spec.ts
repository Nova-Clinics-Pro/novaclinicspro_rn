import { ApiSession } from '../../../shared/api';
import { readRoleIdentities } from '../../../cop/provision-roles';
import { expect, readSeed, test } from '../../../cop/fixture';

/**
 * COP cases that need the Clinic Admin's OWN login (not the owner's): what the Admin may and may not do.
 * Skipped with a reason when the Admin login has not been provisioned (cop/provision-roles.ts).
 */
const DAY = 450 + Math.floor(Math.random() * 2500);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
const when = (daysAhead: number, hh: number, mm = 0, minutes = 30) => {
  const d = new Date(); d.setDate(d.getDate() + daysAhead); while (d.getDay() === 0) d.setDate(d.getDate() + 1); d.setHours(hh, mm, 0, 0);
  return { start: iso(d), end: iso(new Date(d.getTime() + minutes * 60_000)), date: iso(d).slice(0, 10) };
};
const ok = (s: number) => s >= 200 && s < 300;
const refused = (s: number) => s >= 400 && s < 500;
const why = (res: { status: number; body: any }, label: string) => test.info().annotations.push({ type: 'refusal-reason', description: `${label}: ${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 240)}` });
const list = (b: any): any[] => (Array.isArray(b) ? b : b?.items ?? b?.data ?? []);

let cached: Promise<{ api: ApiSession; seed: any; t: string; b: string } | null> | null = null;
const admin = () => (cached ??= (async () => {
  const id = readRoleIdentities().admin; const seed = readSeed()?.ayurveda;
  if (!id?.passwordSet || !seed) return null;
  const api = new ApiSession({ email: id.email, password: id.password } as any); await api.signIn(); await api.reconcileTenantClaim();
  return { api, seed, t: seed.tenantId as string, b: `/api/v1/clinic/${seed.tenantId}` };
})());
const need = async () => { const c = await admin(); test.skip(!c, 'blocked: the Admin login is not provisioned (cop/provision-roles.ts)'); return c!; };

test.describe('Clinic Admin: what the role may and may not do', () => {
  test('TC_COP_ADM_001 the Admin signs in with the Admin role and the clinic data loads', async () => {
    const c = await need();
    const me = (await c.api.get('/api/v1/auth/me')).body;
    expect(me.roles, 'role').toContain('Clinic Admin');
    expect(me.tenant_id, 'signed in to the clinic').toBe(c.t);
    // the data behind the admin dashboard cards: appointments, staff, inventory, alerts
    for (const p of ['appointments?limit=10', 'staff?limit=10', 'inventory?limit=10', 'inventory/alerts']) {
      const r = await c.api.get(`${c.b}/${p}`); expect.soft(r.status, `dashboard data ${p}`).toBe(200);
    }
    test.info().annotations.push({ type: 'scope', description: 'API level: role and data calls. The landing screen itself is a UI check.' });
  });

  test('TC_COP_ADM_017 the Admin cannot author clinical documents or open episodes', async () => {
    const c = await need(); const patient = c.seed.patients['P-Male'];
    const calls: [string, () => Promise<{ status: number; body: any }>][] = [
      ['episode create', () => c.api.post(`${c.b}/episodes`, { client_id: patient, title: 'COP admin must not create this' })],
      ['case sheet create', () => c.api.post(`${c.b}/clients/${patient}/casesheets`, { clinic_type: 'ayurveda', data_json: { chief_complaint: 'COP admin must not create this' } })],
      ['prescription create', () => c.api.post(`${c.b}/prescriptions`, { client_id: patient, prescription_data: { medications: [] } })],
    ];
    for (const [label, call] of calls) {
      const res = await call(); why(res, label);
      const detail = JSON.stringify(res.body?.detail ?? res.body) ?? '';
      expect.soft([401, 403], `${label} returned ${res.status}`).toContain(res.status);
      expect.soft(detail, `${label} was refused for a reason other than permission`).not.toMatch(/COMMERCIAL_ENTITLEMENT_REQUIRED|No tenant_id in JWT/);
    }
  });

  test('TC_COP_OWN_013 the Admin cannot delete appointments', async () => {
    const c = await need(); const w = when(DAY + 1, 9, 0);
    const a = await c.api.post(`${c.b}/appointments`, { client_id: c.seed.patients['P-Male'], doctor_id: c.seed.staff.D1, therapist_ids: [], room_id: c.seed.rooms['C-1'], appointment_start: w.start, appointment_end: w.end, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(a.status), `the Admin books: ${a.status} ${JSON.stringify(a.body)?.slice(0, 160)}`).toBe(true);
    const del = await c.api.request('DELETE', `${c.b}/appointments/${a.body.id}`); why(del, 'Admin deletes an appointment');
    expect(refused(del.status), `delete returned ${del.status}`).toBe(true);
    expect(JSON.stringify(del.body)).toMatch(/appointment\.delete|permission/i);
    await c.api.request('PATCH', `${c.b}/appointments/${a.body.id}/cancel`, {});
  });

  test('TC_COP_ADM_009 the Admin approves a therapist\'s leave', async () => {
    const c = await need(); const w = when(DAY + 2, 10, 0, 60);
    const lv = await c.api.post(`${c.b}/staff/${c.seed.staff.T1}/leave`, { leave_type: 'CASUAL', start_date: w.date, end_date: w.date, reason: 'COP_ADM_009' });
    expect(ok(lv.status), `request leave: ${lv.status} ${JSON.stringify(lv.body)?.slice(0, 200)}`).toBe(true);
    try {
      const ap = await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/approve`, {}); why(ap, 'approve leave as the Admin');
      expect(ok(ap.status), `approve returned ${ap.status}`).toBe(true);
      expect(String(ap.body?.status ?? (await c.api.get(`${c.b}/leaves`)).body?.items?.find((l: any) => l.id === lv.body.id)?.status).toUpperCase()).toBe('APPROVED');
    } finally { await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/cancel`, {}); }
  });

  test('TC_COP_CNF_010 a therapist on approved leave cannot be booked', async () => {
    const c = await need(); const w = when(DAY + 3, 10, 0, 60);
    const lv = await c.api.post(`${c.b}/staff/${c.seed.staff.T3}/leave`, { leave_type: 'CASUAL', start_date: w.date, end_date: w.date, reason: 'COP_CNF_010' });
    expect(ok(lv.status), `request leave: ${lv.status}`).toBe(true);
    try {
      const ap = await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/approve`, {}); expect(ok(ap.status), `approve: ${ap.status} ${JSON.stringify(ap.body)?.slice(0, 160)}`).toBe(true);
      const a = await c.api.post(`${c.b}/appointments`, { client_id: c.seed.patients['P-Female3'], therapist_ids: [c.seed.staff.T3], room_id: c.seed.rooms['T-2'], treatment_id: c.seed.treatments.COPABH, appointment_start: w.start, appointment_end: w.end, status: 'scheduled', appointment_type: 'SINGLE' });
      why(a, 'book a therapist on approved leave');
      expect(refused(a.status), `booking T3 on leave returned ${a.status}`).toBe(true);
    } finally { await c.api.request('PATCH', `${c.b}/leave/${lv.body.id}/cancel`, {}); }
  });

  test('TC_COP_OWN_011 an Admin cannot change role permissions (owner-only)', async () => {
    const c = await need();
    const roles = await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles`); why(roles, 'Admin lists roles');
    const adm = list(roles.body).find(r => r.name === 'Clinic Admin');
    const res = adm ? await c.api.request('PUT', `/api/v1/rbac/${c.t}/tenant-roles/${adm.id}/permissions/invoice.read`, { enabled: false }) : roles;
    why(res, 'Admin changes its own role permission');
    expect(refused(res.status), `permission change returned ${res.status}`).toBe(true);
    const after = adm ? list((await c.api.get(`/api/v1/rbac/${c.t}/tenant-roles/${adm.id}/permissions`)).body).find(p => p.code === 'invoice.read') : null;
    if (after) expect(after.effective, 'unchanged').toBe(true);
  });
});
