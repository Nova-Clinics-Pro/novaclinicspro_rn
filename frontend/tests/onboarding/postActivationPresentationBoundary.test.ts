import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../', path), 'utf8');

describe('post-activation presentation boundaries', () => {
  it('uses the tenant-scoped query for ordinary treatment configuration', () => {
    for (const path of [
      'app/clinic-admin/settings/treatments/[treatmentId].tsx',
      'features/treatments/presentation/pages/TreatmentsScreen.tsx',
    ]) {
      const value = source(path);
      expect(value).toContain('useCurrentTenantQuery');
      expect(value).not.toContain('useTenantQuery(');
    }
  });

  it('keeps the org-admin tenant datasource isolated to its dedicated query hook', () => {
    const datasource = source('features/tenants/data/datasources/tenants.api.ts');
    expect(datasource).toContain('/api/v1/org/tenants/${id}');
    expect(datasource).toContain('/api/v1/tenants/${tenantId}');
  });

  it('exposes multiday only from backend capability and configured-treatment eligibility', () => {
    const screen = source('features/appointments/presentation/pages/CreateAppointmentScreen.tsx');
    expect(screen).toContain('features.appointments.multiday_appointment_types');
    expect(screen).toContain('eligibleMultiDayTreatmentIds');
    expect(screen).toContain('const multiDayAvailable = allowMultiDay');
    expect(screen).not.toContain("isAyurvedaClinic");
  });

  it('gives the DOB field a single label owner', () => {
    const form = source('features/staff/presentation/components/StaffForm.tsx');
    const field = source('features/staff/presentation/components/StaffDateOfBirthField.tsx');
    expect(form).not.toContain('<Text style={styles.label}>Date of Birth');
    expect(field).toContain("dateOfBirth.label");
    expect(field).toContain('CrossPlatformDateTimePicker');
    expect(field).toContain('toCanonicalDate(nextDate)');
  });

  it('keeps permanent configuration destinations in dashboard modules, not the onboarding wizard', () => {
    const actions = source('features/onboarding/presentation/actions/onboardingActionRegistry.ts');
    expect(actions).toContain("'clinic.rooms': () => '/clinic-admin/settings/rooms'");
    expect(actions).toContain("'clinic.staff': () => '/clinic-admin/staff'");
    expect(actions).toContain("'clinic.treatments': () => '/clinic-admin/settings/treatments'");
    expect(actions).toContain("'clinic.operating_hours': () => '/clinic-admin/settings/operating-hours'");
    expect(actions).not.toContain("'clinic.rooms': () => '/onboarding/");
  });
});
