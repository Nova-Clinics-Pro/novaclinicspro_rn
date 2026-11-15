import { expect, passedEarlier, slot, test } from '../../../cop/fixture';

/**
 * COP workbook tabs 03_Receptionist and 08_Conflicts_And_Scheduling, run against the API (the same calls the app
 * makes). Needs: NC-UAT-02 (owner registered) and `npx tsx cop/seed.ts --apply`.
 * Every execution books on its own day (derived from the clock), so a re-run never collides with bookings left by an
 * earlier execution. Doctor bookings send therapist_ids: [] exactly as the app does; see DEF_COP_014 for what happens when
 * an API client omits the field.
 */
const DAY = 30 + (Math.floor(Date.now() / 60_000) % 400);
const ok = (s: number) => s === 200 || s === 201;
const rejected = (s: number) => s >= 400 && s < 500;
/** Keep the server's reason in the report, so a refusal for the WRONG rule is visible. */
const why = (res: { status: number; body: any }) => test.info().annotations.push({ type: 'refusal-reason', description: `${res.status} ${JSON.stringify(res.body?.detail ?? res.body)?.slice(0, 240)}` });
const apptPath = (tenant: string) => `/api/v1/clinic/${tenant}/appointments`;

const needSeed = (c: unknown, why = 'run NC-UAT-02 then `npx tsx cop/seed.ts --apply`') => test.skip(!c, `seed data not available: ${why}`);


test.describe('Ayurveda clinic: booking and conflicts', () => {
  test('TC_COP_RCP_004 single-slot doctor appointment is created', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 10, 0);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Male'], doctor_id: seed.staff.D1, therapist_ids: [], room_id: seed.rooms['C-1'], appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(res.status), `create returned ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
    expect(res.body.id).toBeTruthy();
  });

  test('TC_COP_CNF_001 doctor already booked at the same time is refused', async ({ clinic }) => {
    test.skip(!passedEarlier('TC_COP_RCP_004'), 'prerequisite TC_COP_RCP_004 (the first D1 booking) did not pass');
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 10, 15);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female'], doctor_id: seed.staff.D1, therapist_ids: [], room_id: seed.rooms['C-2'], appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `double-booking D1 returned ${res.status}; expected a 4xx conflict`).toBe(true);
  });

  test('TC_COP_RCP_006 one therapist in a therapy room is created', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 11, 0, 60);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female'], therapist_ids: [seed.staff.T1], room_id: seed.rooms['T-1'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(res.status), `create returned ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
  });

  test('TC_COP_CNF_002 therapist double-booked is refused', async ({ clinic }) => {
    test.skip(!passedEarlier('TC_COP_RCP_006'), 'prerequisite TC_COP_RCP_006 (the first T1 booking) did not pass');
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 11, 30, 60);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female2'], therapist_ids: [seed.staff.T1], room_id: seed.rooms['T-2'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `double-booking T1 returned ${res.status}; expected a 4xx conflict`).toBe(true);
  });

  test('TC_COP_CNF_003 room double-booked is refused', async ({ clinic }) => {
    test.skip(!passedEarlier('TC_COP_RCP_006'), 'prerequisite TC_COP_RCP_006 (the first booking of room T-1) did not pass');
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 11, 30, 60);
    // P-Female3 has no other booking and T3 is free and the same gender, so only the room (T-1, taken by RCP_006) can cause a refusal.
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female3'], therapist_ids: [seed.staff.T3], room_id: seed.rooms['T-1'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `double-booking room T-1 returned ${res.status}; expected a 4xx conflict`).toBe(true);
  });

  test('TC_COP_CNF_004 opposite-gender therapist is blocked in an Ayurveda clinic', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    // Tests the behaviour, not a settings flag: SET_002 expects gender matching ON for an Ayurveda clinic, and the booking
    // enforcement spec (1A) makes it strict by default for that clinic type. The features flag is recorded for the report.
    const features = await api.get(`/api/v1/tenants/${seed.tenantId}/features`);
    test.info().annotations.push({ type: 'features-flag', description: `enable_gender_matching=${features.body?.appointments?.enable_gender_matching}` });
    const t = slot(DAY, 15, 0, 60);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female'], therapist_ids: [seed.staff.T2], room_id: seed.rooms['T-2'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `female patient with male therapist returned ${res.status}; an Ayurveda clinic should block it`).toBe(true);
    // Gender matching is on by default for an Ayurveda clinic, so the setting the app is shown must say so (DEF_COP_015).
    expect(features.body?.appointments?.enable_gender_matching, 'the gender matching setting shown to the app').toBe(true);
  });

  test('TC_COP_CNF_016 a doctor booking made without therapist_ids still detects a double booking', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    // An API client may omit therapist_ids (optional in the schema). That used to store a JSON null, and the next overlapping
    // booking for the doctor failed with a 500 instead of a conflict message (DEF_COP_016).
    const t = slot(DAY, 14, 30);
    const first = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Male'], doctor_id: seed.staff.D2, room_id: seed.rooms['C-2'], appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(first.status), `first booking (no therapist_ids) returned ${first.status}: ${JSON.stringify(first.body)?.slice(0, 200)}`).toBe(true);
    const overlap = slot(DAY, 14, 45);
    const second = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Minor'], doctor_id: seed.staff.D2, room_id: seed.rooms['C-1'], appointment_start: overlap.start, appointment_end: overlap.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(second);
    expect(second.status, 'an overlapping booking must be a conflict (4xx), never a server error').not.toBeGreaterThanOrEqual(500);
    expect(rejected(second.status), `overlapping booking for the same doctor returned ${second.status}`).toBe(true);
  });

  test('TC_COP_RCP_005 consultation in a therapy room is refused @known-gap', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 16, 0);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Minor'], doctor_id: seed.staff.D2, therapist_ids: [], room_id: seed.rooms['T-2'], appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `consultation in therapy room T-2 returned ${res.status}; README §5-16: room type is not enforced yet`).toBe(true);
  });

  test('TC_COP_RCP_008 therapy in a consultation room is refused @known-gap', async ({ clinic }) => {
    const c = await clinic('ayurveda'); needSeed(c);
    const { api, seed } = c!;
    const t = slot(DAY, 16, 30, 60);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female'], therapist_ids: [seed.staff.T3], room_id: seed.rooms['C-2'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    why(res);
    expect(rejected(res.status), `therapy in consultation room C-2 returned ${res.status}; README §5-16: room type is not enforced yet`).toBe(true);
  });
});

test.describe('General clinic: therapy is not gender-restricted', () => {
  test('TC_COP_CNF_005 any gender is allowed in a General clinic', async ({ clinic }) => {
    const c = await clinic('general'); needSeed(c);
    const { api, seed } = c!;
    const features = await api.get(`/api/v1/tenants/${seed.tenantId}/features`);
    // NC-UAT-17 establishes that a General clinic rejects therapy appointments altogether; then there is nothing to book.
    test.skip(features.body?.appointments?.multiday_appointment_types?.length === 0 && !features.body?.treatment_sheets?.enable_treatment_sheets, 'General clinic has therapy appointments disabled (NC-UAT-17): case applies to clinics with therapy enabled');
    const t = slot(DAY, 11, 0, 60);
    const res = await api.post(apptPath(seed.tenantId), { client_id: seed.patients['P-Female'], therapist_ids: [seed.staff.T2], room_id: seed.rooms['T-1'], treatment_id: seed.treatments.COPABH, appointment_start: t.start, appointment_end: t.end, status: 'scheduled', appointment_type: 'SINGLE' });
    expect(ok(res.status), `returned ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`).toBe(true);
  });
});
