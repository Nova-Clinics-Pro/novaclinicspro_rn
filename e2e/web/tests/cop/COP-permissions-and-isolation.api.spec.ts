import { ApiSession, isRegistered } from '../../../shared/api';
import { identityFor } from '../../../shared/identities';
import { expect, test } from '../../../cop/fixture';

/**
 * COP workbook: OWN_014 (the Owner cannot author clinical documents) and NFR_002 (tenant id in the URL must match
 * the signed-in clinic). Permission is checked on the server, so these call the API the way the app does.
 */
const isDenied = (s: number) => s === 403 || s === 401;
/**
 * A refusal only proves the permission rule when it is not caused by something else. An unprovisioned clinic is refused
 * with COMMERCIAL_ENTITLEMENT_REQUIRED or "No tenant_id in JWT", which would make this test pass for the wrong reason.
 */
const refusedByPermission = (res: { status: number; body: any }, what: string) => {
  const detail = JSON.stringify(res.body?.detail ?? res.body) ?? '';
  test.info().annotations.push({ type: 'refusal-reason', description: `${what}: ${res.status} ${detail.slice(0, 200)}` });
  expect(isDenied(res.status), `${what} returned ${res.status}`).toBe(true);
  expect(detail, `${what} was refused for a reason other than permission`).not.toMatch(/COMMERCIAL_ENTITLEMENT_REQUIRED|No tenant_id in JWT/);
};

test.describe('Owner clinical-authoring boundary', () => {
  test('TC_COP_OWN_014 owner cannot create episodes, case sheets or prescriptions', async ({ clinic }) => {
    const c = await clinic('ayurveda');
    test.skip(!c, 'seed data not available: run NC-UAT-02 then `npx tsx cop/seed.ts --apply`');
    const { api, seed } = c!;
    const base = `/api/v1/clinic/${seed.tenantId}`;
    const patient = seed.patients['P-Male'];

    const episode = await api.post(`${base}/episodes`, { client_id: patient, title: 'COP owner must not create this' });
    refusedByPermission(episode, 'episode create');

    const caseSheet = await api.post(`${base}/clients/${patient}/casesheets`, { clinic_type: 'ayurveda', data_json: { chief_complaint: 'COP owner must not create this' } });
    refusedByPermission(caseSheet, 'case sheet create');

    const rx = await api.post(`${base}/prescriptions`, { client_id: patient, prescription_data: { medications: [] } });
    refusedByPermission(rx, 'prescription create');
  });
});

test.describe('Tenant isolation', () => {
  test('TC_COP_NFR_002 a tenant id that is not the signed-in clinic is refused', async ({ clinic }) => {
    const a = await clinic('ayurveda');
    test.skip(!a, 'seed data not available: run NC-UAT-02 then `npx tsx cop/seed.ts --apply`');
    const general = identityFor('WEB', 'general');
    test.skip(!(await isRegistered(general)), 'General clinic owner not registered (NC-UAT-02)');
    const g = new ApiSession(general); await g.signIn();
    const otherTenant = (await g.get('/api/v1/auth/me')).body.tenant_id as string;
    expect(otherTenant).not.toBe(a!.seed.tenantId);

    for (const p of ['clients', 'appointments', 'rooms', 'staff', 'inventory']) {
      const res = await a!.api.get(`/api/v1/clinic/${otherTenant}/${p}`);
      expect([401, 403, 404], `Ayurveda owner reading the General clinic's ${p} returned ${res.status}`).toContain(res.status);
    }
  });
});
