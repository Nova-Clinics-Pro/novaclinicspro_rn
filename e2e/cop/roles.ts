/** Shared helpers for the COP specs that use the REAL role logins (Admin, Receptionist, Doctor, Therapist, plus the Owner). */
import { ApiSession } from '../shared/api';
import { identityFor } from '../shared/identities';
import { readRoleIdentities } from './provision-roles';
import { expect, readSeed, test } from './fixture';

export const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
export const workday = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + daysAhead); while (d.getDay() === 0) d.setDate(d.getDate() + 1); return d; };
export const far = () => 5200 + Math.floor(Math.random() * 3000);
export const ok = (s: number) => s >= 200 && s < 300;
export const refused = (s: number) => s >= 400 && s < 500;
export const list = (b: any): any[] => (Array.isArray(b) ? b : b?.items ?? b?.data ?? b?.notifications ?? []);
export const why = (res: { status: number; body: any }, label: string) => test.info().annotations.push({ type: 'refusal-reason', description: `${label}: ${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 230)}` });
export const note = (text: string) => test.info().annotations.push({ type: 'observed', description: text });
export const ver = (o: any) => ({ 'If-Match': String(Math.floor(Number(o.version ?? 1))) });

export type Who = 'owner' | 'admin' | 'receptionist' | 'doctor' | 'therapist';
const cache: Partial<Record<Who, Promise<ApiSession | null>>> = {};
export const as = (who: Who) => (cache[who] ??= (async () => {
  const id: any = who === 'owner' ? identityFor('WEB', 'ayurveda') : readRoleIdentities()[who];
  if (!id?.email || (who !== 'owner' && !id.passwordSet)) return null;
  const a = new ApiSession({ email: id.email, password: id.password } as any); await a.signIn(); await a.reconcileTenantClaim(); return a;
})());
export const need = async (who: Who) => { const a = await as(who); test.skip(!a, `blocked: the ${who} login is not provisioned`); return a!; };

export const world = async () => {
  const seed: any = readSeed()?.ayurveda; const adm = await as('admin');
  test.skip(!seed || !adm, 'blocked: seed data or the role logins are not available');
  const t = seed.tenantId as string; const b = `/api/v1/clinic/${t}`;
  const staff = list((await adm!.get(`${b}/staff?limit=500`)).body);
  return { seed, t, b, ts: '/api/v1/treatment-sheets', staff, doctor: staff.find(s => /Login Doctor/.test(s.full_name)), therapist: staff.find(s => /Login Therapist/.test(s.full_name)), reception: staff.find(s => /Login Receptionist/.test(s.full_name)) };
};
export type World = Awaited<ReturnType<typeof world>>;

export const book = async (w: World, who: Who, o: Record<string, unknown>) => (await need(who)).post(`${w.b}/appointments`, { status: 'scheduled', appointment_type: 'SINGLE', therapist_ids: [], ...o });
export const slot = (d: Date, hh: number, mm: number, minutes = 30) => { const s = new Date(d); s.setHours(hh, mm, 0, 0); const e = new Date(s.getTime() + minutes * 60_000); const f = (x: Date) => `${ymd(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:00`; return { start: f(s), end: f(e) }; };

/** Receptionist books a consultation with the logged-in doctor; the doctor opens an episode and signs a case sheet. */
export async function consultAndSign(w: World, patient: string, day: number) {
  const d = workday(day); const t = slot(d, 10, 0);
  const ap = await book(w, 'receptionist', { client_id: w.seed.patients[patient], doctor_id: w.doctor.id, room_id: w.seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end });
  const doc = await need('doctor');
  const ep = await doc.post(`${w.b}/episodes`, { client_id: w.seed.patients[patient], title: `COP ${patient}`, appointment_id: ap.body.id });
  const cs = await doc.post(`${w.b}/clients/${w.seed.patients[patient]}/casesheets`, { clinic_type: 'ayurveda', episode_id: ep.body.id, appointment_id: ap.body.id, data_json: { chief_complaint: 'COP' } });
  for (const st of ['FINAL', 'SIGNED']) await doc.request('PATCH', `${w.b}/casesheets/${cs.body.id}/status`, { status: st });
  return { ap: ap.body, ep: ep.body, cs: cs.body, day: d, patient };
}
/** The events behind a notification are handled by the worker (it polls every few seconds), so the inbox is read until it says what is expected. */
export async function eventually<T>(read: () => Promise<T>, done: (value: T) => boolean, timeoutMs = 45_000, stepMs = 2_000): Promise<T> {
  const until = Date.now() + timeoutMs; let value = await read();
  while (!done(value) && Date.now() < until) { await new Promise(r => setTimeout(r, stepMs)); value = await read(); }
  return value;
}
/** A person's notification inbox as text (their own history). */
export const inboxText = async (w: { t: string }, a: ApiSession) => JSON.stringify((await a.get(`/api/v1/notifications/${w.t}/history?limit=100`)).body);
export const fetchOrder = async (w: World, id: string) => list((await (await need('admin')).get(`${w.ts}/clinic/${w.t}/treatment-orders`)).body).find(o => o.id === id);

/** A plan with `rows` daily rows, ordered and scheduled (without a time: scheduling with a time answers 500, DEF_COP_029) to the logged-in therapist. */
export async function scheduledPlan(w: World, patient: string, day: number, rows = 3) {
  // The suite reuses one therapist and picks random far-off dates, so a date can already be taken by an earlier run's plan: the
  // booking rules then refuse the clash (correctly). Try another date rather than report a blocked plan.
  let plan = await schedulePlanOnce(w, patient, day, rows);
  for (let attempt = 0; attempt < 4 && !plan.scheduled && /already has an appointment/i.test(plan.scheduleError); attempt++) plan = await schedulePlanOnce(w, patient, far(), rows);
  return plan;
}
async function schedulePlanOnce(w: World, patient: string, day: number, rows: number) {
  const c = await consultAndSign(w, patient, day); const doc = await need('doctor'); const adm = await need('admin');
  const mk = await doc.post(`/api/v1/clinic/tenants/${w.t}/treatment-sheets`, { client_id: w.seed.patients[patient], treatment_id: w.seed.treatments.COPABH, start_date: ymd(c.day), duration_days: rows, case_sheet_id: c.cs.id, episode_id: c.ep.id, appointment_id: c.ap.id });
  await doc.post(`${w.ts}/${mk.body.id}/send-to-scheduling`, { planned_sessions: rows, frequency: 'daily', recommended_therapy: 'Abhyanga', recommended_treatment_id: w.seed.treatments.COPABH }, ver(mk.body));
  const o = await fetchOrder(w, mk.body.id); const days: string[] = []; const d = new Date(c.day); while (days.length < o.rows.length) { if (d.getDay() !== 0) days.push(ymd(d)); d.setDate(d.getDate() + 1); }
  const sc = await adm.request('PATCH', `${w.ts}/${mk.body.id}/rows/bulk-schedule`, { assignments: o.rows.map((r: any, i: number) => ({ row_id: r.id, assigned_staff_id: w.therapist.id, therapist_ids: [w.therapist.id], room_id: w.seed.rooms['T-1'], scheduled_date: days[i] })) }, ver(o));
  const sched = await fetchOrder(w, mk.body.id);
  return { ...c, sheet: mk.body, order: sched, days, scheduled: ok(sc.status), scheduleError: ok(sc.status) ? '' : `${sc.status} ${JSON.stringify(sc.body).slice(0, 200)}` };
}
/**
 * Runs repeat on the same clinic and each dispensing, once paid, takes stock away. Top the item up before a case that needs some on the shelf,
 * but only to `target`: "COP Tablet X (below reorder point)" is a fixture that other cases (SET_006, ADM_012) need to stay below its reorder point.
 */
export const ensureStock = async (w: World, name: string, minimum = 5, target = 10) => {
  const adm = await need('admin');
  const item = list((await adm.get(`${w.b}/inventory?limit=500`)).body).find(i => i.name === name);
  if (item && Number(item.current_stock) < minimum) await adm.post(`${w.b}/inventory/${item.id}/adjust-stock`, { quantity: String(target - Number(item.current_stock)), notes: 'COP restock before a dispensing case' });
};
export const stock = async (w: World, name: string) => Number(list((await (await need('admin')).get(`${w.b}/inventory?limit=500`)).body).find(i => i.name === name)?.current_stock);

export { expect, readSeed, test };
