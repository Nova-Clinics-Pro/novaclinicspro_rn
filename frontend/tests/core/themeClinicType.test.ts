import { DEFAULT_THEME_CLINIC_TYPE, themeClinicTypeFor } from '../../core/theme/themeClinicType';
import { getClinicTheme } from '../../core/theme/clinicThemes';
import { CLINIC_TYPES } from '../../core/hooks/useFeatures';

describe('which palette a clinic type uses', () => {
  it.each([
    ['ayurveda', 'AYURVEDA'],
    ['general', 'GENERAL_MEDICINE'],
    ['allopathy', 'GENERAL_MEDICINE'],
    ['multispeciality', 'GENERAL_MEDICINE'],
    ['dental', 'DENTAL'],
    ['physio', 'PHYSIOTHERAPY'],
  ])('%s uses %s', (clinicType, palette) => {
    expect(themeClinicTypeFor(clinicType)).toBe(palette);
  });

  it('every clinic type the app knows has a palette', () => {
    for (const clinicType of CLINIC_TYPES) expect(getClinicTheme(themeClinicTypeFor(clinicType))).toBeTruthy();
  });

  it('uses the default palette before anyone is signed in or when the type is unknown', () => {
    expect(DEFAULT_THEME_CLINIC_TYPE).toBe('AYURVEDA');
    expect(themeClinicTypeFor(undefined)).toBe(DEFAULT_THEME_CLINIC_TYPE);
    expect(themeClinicTypeFor('something_else')).toBe(DEFAULT_THEME_CLINIC_TYPE);
  });

  it('gives different clinic types visibly different primary colours', () => {
    const primary = (type: string) => getClinicTheme(themeClinicTypeFor(type)).primary.default;
    expect(new Set([primary('ayurveda'), primary('general'), primary('dental'), primary('physio')]).size).toBe(4);
  });
});
