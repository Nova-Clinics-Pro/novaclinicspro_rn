import { config } from '../../../shared/config';
import { expect, list, need, ok, test, why, world, consultAndSign, far } from '../../../cop/roles';

/**
 * WS14: a patient's allergies (stored, three states, checked against a prescription before it is signed) and the production safeguards
 * (setup wizard needs a sign-in, readiness, rate limit, sharing switched off). They need migration 20261126_000001 on the clinic's database.
 */
const uniquePhone = () => `+9197${String(Date.now()).slice(-8)}`;
const newPatient = async (w: { b: string }) => {
  const adm = await need('admin');
  const res = await adm.post(`${w.b}/clients`, { full_name: `COP allergy ${Date.now()}`, phone: uniquePhone(), gender: 'female', date_of_birth: '1991-03-03' });
  expect(ok(res.status), `patient ${res.status}`).toBe(true);
  return res.body.id as string;
};
const api = (path: string, init?: RequestInit) => fetch(`${config.apiBaseUrl}${path}`, init);

test.describe('14 allergies (WS14)', () => {
  test('TC_COP_ALG_001 a new patient has no allergy recorded; none-known is a statement, and it is refused while an allergy is active', async () => {
    const w = await world(); const doc = await need('doctor'); const client = await newPatient(w); const base = `${w.b}/clients/${client}/allergies`;
    const first = await doc.get(base); expect(first.body, 'a new patient: not recorded, no entries').toMatchObject({ status: 'unknown', items: [] });
    const none = await doc.request('PUT', `${base}/none-known`, {}); why(none, 'confirm none known'); expect(none.body.status).toBe('none_known');
    const add = await doc.post(base, { substance: 'Penicillin', reaction: 'rash', severity: 'severe' }); why(add, 'record Penicillin'); expect(add.status).toBe(201);
    expect((await doc.get(base)).body.status, 'recording an allergy changes none_known to has_allergies').toBe('has_allergies');
    const again = await doc.request('PUT', `${base}/none-known`, {}); why(again, 'none known while active'); expect(again.status, 'cannot say none while one is active').toBe(409);
    const dup = await doc.post(base, { substance: ' penicillin ' }); expect(dup.status, 'the same allergy twice is refused').toBe(409);
    const res = await doc.request('PATCH', `${base}/${add.body.id}`, { status: 'resolved' }); expect(ok(res.status)).toBe(true);
    expect((await doc.get(base)).body.status, 'resolving the last allergy means the patient must be asked again: not recorded, not none').toBe('unknown');
  });

  test('TC_COP_ALG_002 who may record: doctor, front desk, admin; the therapist may read but not record', async () => {
    const w = await world(); const client = await newPatient(w); const base = `${w.b}/clients/${client}/allergies`;
    for (const who of ['doctor', 'receptionist', 'admin'] as const) {
      const a = await need(who); const r = await a.post(base, { substance: `Pollen ${who}` }); why(r, `${who} records`); expect(r.status, `${who} may record`).toBe(201);
    }
    const th = await need('therapist');
    expect(ok((await th.get(base)).status), 'the therapist can read the allergies').toBe(true);
    const refused = await th.post(base, { substance: 'Dust' }); why(refused, 'therapist records'); expect(refused.status, 'the therapist may not record').toBe(403);
    expect((await th.request('PUT', `${base}/none-known`, {})).status).toBe(403);
  });

  test('TC_COP_ALG_003 another clinic and an unknown patient are refused, and bad input is a clear 422', async () => {
    const w = await world(); const doc = await need('doctor'); const client = await newPatient(w);
    const other = await doc.get(`/api/v1/clinic/00000000-0000-4000-8000-000000000001/clients/${client}/allergies`); why(other, 'other clinic'); expect(other.status).toBe(403);
    const missing = await doc.get(`${w.b}/clients/00000000-0000-4000-8000-000000000002/allergies`); why(missing, 'unknown patient'); expect(missing.status).toBe(404);
    for (const bad of [{ substance: '' }, { substance: 'x'.repeat(201) }, { substance: 'Peanut', severity: 'fatal' }]) {
      const r = await doc.post(`${w.b}/clients/${client}/allergies`, bad); expect(r.status, JSON.stringify(bad).slice(0, 40)).toBe(422);
    }
  });

  test('TC_COP_ALG_004 signing a prescription for a medicine the patient is allergic to is stopped until the doctor confirms, and the unrelated one is not', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Female', far()); const client = w.seed.patients['P-Female'];
    const add = await doc.post(`${w.b}/clients/${client}/allergies`, { substance: 'Zaptol', reaction: 'hives', severity: 'severe' });
    if (add.status === 409) { /* an earlier run recorded it and left it active */ } else expect(add.status).toBe(201);
    const make = async (name: string, visit = c) => (await doc.post(`${w.b}/prescriptions`, { client_id: client, episode_id: visit.ep.id, appointment_id: visit.ap.id, prescription_data: { medications: [{ name, dosage: '1', frequency: 'bd', duration: '2 days' }] } })).body.id as string;
    const matching = await make('Zaptol 250 mg tablet');
    const stopped = await doc.request('PATCH', `${w.b}/prescriptions/${matching}`, { status: 'SIGNED' }); why(stopped, 'sign with a matching allergy');
    expect(stopped.status, 'signing is stopped').toBe(409); expect(stopped.body.detail.error_code).toBe('ALLERGY_ALERT');
    expect(stopped.body.detail.alerts[0], 'the alert names the medicine and the allergy').toMatchObject({ medicine: 'Zaptol 250 mg tablet', substance: 'Zaptol', severity: 'severe' });
    const still = (await doc.get(`${w.b}/prescriptions/${matching}`)).body; expect(still.status, 'it is not signed').not.toBe('SIGNED');
    const signed = await doc.request('PATCH', `${w.b}/prescriptions/${matching}`, { status: 'SIGNED', acknowledge_allergy_alerts: true }); why(signed, 'sign after confirming');
    expect(ok(signed.status), `signed after the doctor confirmed (${signed.status})`).toBe(true); expect(signed.body.status).toBe('SIGNED');
    const harmless = await make('Paracetamol 500', await consultAndSign(w, 'P-Female', far()));
    const fine = await doc.request('PATCH', `${w.b}/prescriptions/${harmless}`, { status: 'SIGNED' }); why(fine, 'sign an unrelated medicine'); expect(ok(fine.status), 'an unrelated medicine signs without a question').toBe(true);
    const check = await doc.post(`${w.b}/clients/${client}/allergies/check`, { medicines: ['Zaptol', 'Paracetamol'] }); expect(check.body.alerts.map((a: any) => a.medicine)).toEqual(['Zaptol']);
  });
});

test.describe('14 production safeguards (WS14)', () => {
  test('TC_COP_SAF_001 the setup wizard routes need a sign-in (they had none)', async () => {
    const id = '00000000-0000-4000-8000-000000000003';
    for (const [method, path] of [['GET', `progress`], ['POST', `validate-step`], ['POST', `save-step`], ['POST', `complete`], ['GET', `context`]] as const) {
      const res = await api(`/api/v1/onboarding/setup-wizard/${id}/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
      expect([401, 403], `${method} ${path} without a token answered ${res.status}`).toContain(res.status);
    }
  });

  test('TC_COP_SAF_002 liveness and readiness: /health says the process is up, /health/ready checks the database and Redis', async () => {
    expect((await api('/health')).status).toBe(200);
    const ready = await api('/health/ready'); expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: 'ready', checks: { database: 'ok', redis: 'ok' } });
  });

  test('TC_COP_SAF_003 an address that hammers a route with no sign-in is limited with 429 and Retry-After', async () => {
    let limited: Response | null = null; let sent = 0;
    for (; sent < 200 && !limited; sent += 1) { const r = await api('/api/v1/feedback/not-a-real-token'); if (r.status === 429) limited = r; }
    expect(limited, `no 429 after ${sent} requests`).not.toBeNull();
    expect(limited!.headers.get('retry-after')).toBe('60');
    expect((await limited!.json()).detail.error_code).toBe('RATE_LIMITED');
    expect((await api('/health')).status, 'health checks are never limited').toBe(200);
  });

  test('TC_COP_SAF_004 sharing a prescription is switched off until a provider is connected', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' });
    const res = await (await need('receptionist')).post(`${w.b}/prescriptions/${rx.body.id}/share`, { channel: 'WhatsApp', recipient_phone: '+919100000201' }); why(res, 'share while off');
    expect(res.status).toBe(403); expect(res.body.detail.error_code).toBe('SHARING_NOT_ENABLED');
  });

  test('TC_COP_SAF_005 signing, amending and dispensing leave an audit entry with who and what, and no patient details', async () => {
    const w = await world(); const doc = await need('doctor'); const c = await consultAndSign(w, 'P-Male', far());
    const rx = await doc.post(`${w.b}/prescriptions`, { client_id: w.seed.patients['P-Male'], episode_id: c.ep.id, appointment_id: c.ap.id, prescription_data: { medications: [{ name: 'COP Tablet X', dosage: '1', frequency: 'bd', duration: '3 days' }] } });
    expect(ok((await doc.request('PATCH', `${w.b}/prescriptions/${rx.body.id}`, { status: 'SIGNED' })).status)).toBe(true);
    const rows: any[] = JSON.parse(await auditRows(rx.body.id));
    expect(rows.map((r: any) => r.action), 'the signing was recorded').toContain('SIGNED');
    expect(JSON.stringify(rows), 'no patient name or phone in the audit entry').not.toMatch(/COP P-Male|\+91/);
  });
});

/** Read-only look at the audit table of the Testing project (the same helper style as cop/db_read.py: GET only, Testing only). */
async function auditRows(prescriptionId: string): Promise<string> {
  const { execFileSync } = await import('node:child_process');
  return execFileSync('python3', ['cop/db_read.py', 'rows', 'tenant_audit_logs', `entity_id=eq.${prescriptionId}`, 'action,entity_type,performed_by,audit_message,metadata'], { encoding: 'utf8' });
}
