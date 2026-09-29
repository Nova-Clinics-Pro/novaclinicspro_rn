import { buildClinicEntryViewModel } from '../../features/onboarding/domain/usecases/build-clinic-entry-view-model.usecase';

describe('buildClinicEntryViewModel', () => {
  it('maps application identity into the two stable Version 1 paths', () => {
    const result = buildClinicEntryViewModel({ tenantName: '  Nova Clinic  ' });

    expect(result?.clinicDisplayName).toBe('Nova Clinic');
    expect(result?.paths.map((path) => path.id)).toEqual([
      'new_clinic',
      'bring_your_clinic',
    ]);
  });

  it('fails closed when application clinic identity is empty', () => {
    expect(buildClinicEntryViewModel({ tenantName: '   ' })).toBeNull();
  });

  it('keeps path models localization-first and specialty-agnostic', () => {
    const result = buildClinicEntryViewModel({ tenantName: 'Nova Clinic' });

    result?.paths.forEach((path) => {
      expect(path.titleKey).toMatch(/^onboarding\.progressiveExperience\.clinicEntry\./);
      expect(path.descriptionKey).toMatch(/^onboarding\.progressiveExperience\.clinicEntry\./);
      expect(path.featureKeys.length).toBeGreaterThan(0);
    });
    expect(JSON.stringify(result)).not.toMatch(/ayurveda|dental|physio/i);
  });
});
