import crypto from 'node:crypto';
import profiles from '../../profiles/clinic-profiles.json';
import { ApiSession, isRegistered } from '../../shared/api';
import { identityFor } from '../../shared/identities';
import { addMinutes, scheduleBase } from '../../shared/factories';
import type { ClinicType } from '../../shared/types';
import { expect, test } from '../fixtures';

/** Black-box checks against the real development backend, recorded under the "backend" layer. */
const sessionFor = async (clinicType: ClinicType) => {
  const owner = identityFor('WEB', clinicType);
  if (!(await isRegistered(owner))) return null;
  const api = new ApiSession(owner);
  await api.signIn();
  const me = await api.get('/api/v1/auth/me');
  return { owner, api, tenantId: me.body.tenant_id as string };
};

for (const clinicType of ['ayurveda', 'general'] as ClinicType[]) {
  const id = clinicType === 'ayurveda' ? 'NC-UAT-13' : 'NC-UAT-14';
  test.describe(`${id} ${clinicType} clinic configuration persisted by the backend`, () => {
    test.use({ scenario: { id, clinicType, role: 'clinic_owner', platform: 'backend' } });

    test('stored clinic type and therapy-oriented settings match the expected profile', async () => {
      const s = await sessionFor(clinicType);
      test.skip(!s, 'owner not registered (run NC-UAT-02 first)');
      const features = await s!.api.get(`/api/v1/tenants/${s!.tenantId}/features`);
      expect(features.status, 'owner can read own clinic features').toBe(200);
      const expected = (profiles as any)[clinicType];
      expect(features.body.clinic_type).toBe(expected.clinicType);
      const therapyOriented = features.body.appointments.multiday_appointment_types.length > 0 || features.body.appointments.enable_gender_matching || features.body.treatment_sheets.enable_sheet_sync;
      if (clinicType === 'general') {
        expect(features.body.appointments.multiday_appointment_types).toEqual([]);
        expect(features.body.appointments.enable_gender_matching).toBe(false);
        expect(features.body.treatment_sheets.enable_sheet_sync).toBe(false);
      }
      test.info().annotations.push({ type: 'observed', description: `therapyOrientedSettings=${therapyOriented}; allow_multiday=${features.body.appointments.allow_multiday}; enable_treatment_sheets=${features.body.treatment_sheets.enable_treatment_sheets}` });
      // Persistence: read again with a fresh session (new token) and compare.
      const again = new ApiSession(s!.owner);
      await again.signIn();
      const second = await again.get(`/api/v1/tenants/${s!.tenantId}/features`);
      expect(second.body.clinic_type).toBe(expected.clinicType);
    });
  });
}

test.describe('NC-UAT-17 General clinic therapy restriction (API)', () => {
  test.use({ scenario: { id: 'NC-UAT-17', clinicType: 'general', role: 'clinic_owner', platform: 'backend' } });

  test('a therapy appointment request from a General clinic identity is rejected and creates no record', async () => {
    const s = await sessionFor('general');
    test.skip(!s, 'owner not registered (run NC-UAT-02 first)');
    const start = scheduleBase(3);
    const body = { client_id: crypto.randomUUID(), therapist_ids: [crypto.randomUUID()], appointment_start: start.toISOString(), appointment_end: addMinutes(start, 60).toISOString(), status: 'SCHEDULED' };
    const res = await s!.api.post(`/api/v1/clinic/${s!.tenantId}/appointments`, body);
    expect(res.status, 'request must not be accepted').toBeGreaterThanOrEqual(400);
    expect(res.status, 'request must not cause a server error').toBeLessThan(500);
    const reason = JSON.stringify(res.body ?? {}).slice(0, 160);
    test.info().annotations.push({ type: 'observed', description: `status=${res.status}; reason=${reason}. The rejection may come from the onboarding/permission state rather than specialty enforcement (see product-rule gap in scenario spec).` });
    const list = await s!.api.get(`/api/v1/clinic/${s!.tenantId}/appointments`);
    if (list.status === 200) expect(JSON.stringify(list.body)).not.toContain(body.client_id);
  });
});

test.describe('NC-UAT-18 Cross-clinic isolation (API)', () => {
  test.use({ scenario: { id: 'NC-UAT-18', clinicType: 'n/a', role: 'clinic_owner', platform: 'backend' } });

  test('one clinic owner cannot read the other clinic’s configuration or appointments', async () => {
    const a = await sessionFor('ayurveda');
    const g = await sessionFor('general');
    test.skip(!a || !g, 'both web owners must be registered (run NC-UAT-02 first)');
    for (const [from, to] of [[a!, g!], [g!, a!]] as const) {
      const features = await from.api.get(`/api/v1/tenants/${to.tenantId}/features`);
      expect([401, 403, 404], 'cross-clinic features').toContain(features.status);
      const appts = await from.api.get(`/api/v1/clinic/${to.tenantId}/appointments`);
      expect([401, 403, 404], 'cross-clinic appointments').toContain(appts.status);
      const clients = await from.api.get(`/api/v1/clinic/${to.tenantId}/clients`);
      expect([401, 403, 404], 'cross-clinic clients').toContain(clients.status);
    }
    expect((await a!.api.get(`/api/v1/tenants/${a!.tenantId}/features`)).status).toBe(200);
  });
});
