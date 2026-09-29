import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, '../../', relativePath), 'utf8');

describe('canonical clinic profile boundary', () => {
  const screen = read('features/clinicProfile/presentation/pages/ClinicProfileScreen.tsx');

  it('preserves the four profile sections without legacy transport', () => {
    expect(screen).toContain("['basic', 'contact', 'business', 'branding']");
    expect(screen).not.toContain('axiosClient');
    expect(screen).not.toContain('useSubmitStepMutation');
  });

  it('keeps readiness fields distinct from optional enrichment fields', () => {
    expect(screen).toContain("input(t('clinicProfile.fields.name'), name, setName, true)");
    expect(screen).toContain("input(t('clinicProfile.fields.website'), website, setWebsite, false");
    expect(screen).toContain("input(t('clinicProfile.fields.registration'), registration, setRegistration)");
  });

  it('uses the canonical repository mutations for profile and branding persistence', () => {
    expect(screen).toContain('useUpdateCurrentTenantClinicProfileMutation');
    expect(screen).toContain('useUploadCurrentTenantClinicLogoMutation');
  });
});
