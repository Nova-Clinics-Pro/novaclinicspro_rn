import type { ClinicType as ThemeClinicType } from './clinicThemes';

/** The palette used before anyone signs in, and for a clinic type that has none. */
export const DEFAULT_THEME_CLINIC_TYPE: ThemeClinicType = 'AYURVEDA';

/**
 * Which of the four clinic palettes a clinic type uses. Allopathy and multispeciality clinics have no palette of their own and use the
 * General Medicine one.
 */
const PALETTE_BY_CLINIC_TYPE: Record<string, ThemeClinicType> = {
  ayurveda: 'AYURVEDA',
  general: 'GENERAL_MEDICINE',
  allopathy: 'GENERAL_MEDICINE',
  multispeciality: 'GENERAL_MEDICINE',
  dental: 'DENTAL',
  physio: 'PHYSIOTHERAPY',
};

export const themeClinicTypeFor = (clinicType?: string | null): ThemeClinicType =>
  (clinicType && PALETTE_BY_CLINIC_TYPE[clinicType.toLowerCase()]) || DEFAULT_THEME_CLINIC_TYPE;
