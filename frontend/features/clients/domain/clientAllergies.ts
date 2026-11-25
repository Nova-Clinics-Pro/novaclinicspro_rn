/**
 * A patient's allergies. "Not recorded" and "no known allergies" are different statements: nobody asking is not the same as the patient
 * having none, so the screens never show an empty list as a good sign.
 */
export type AllergyStatus = 'unknown' | 'none_known' | 'has_allergies';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface Allergy {
  id: string;
  substance: string;
  reaction: string | null;
  severity: AllergySeverity;
  status: 'active' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface ClientAllergies {
  client_id: string;
  status: AllergyStatus;
  items: Allergy[];
}

export interface NewAllergy {
  substance: string;
  reaction?: string | null;
  severity?: AllergySeverity;
}

export interface AllergyAlert {
  allergy_id: string | null;
  substance: string | null;
  severity: string | null;
  reaction: string | null;
  medicine: string;
}

export const ALLERGY_MANAGE_PERMISSION = 'client.allergy.manage';
export const ALLERGY_ALERT_CODE = 'ALLERGY_ALERT';
export const SEVERITIES: readonly AllergySeverity[] = ['mild', 'moderate', 'severe'];

export const activeAllergies = (items: readonly Allergy[]): Allergy[] => items.filter((item) => item.status === 'active');

/** The allergy alerts in a failed signing, or null when the failure was something else. */
export const allergyAlertsFrom = (error: unknown): AllergyAlert[] | null => {
  const detail = (error as { response?: { data?: { detail?: { error_code?: unknown; alerts?: unknown } } } } | undefined)?.response?.data?.detail;
  if (!detail || typeof detail !== 'object' || detail.error_code !== ALLERGY_ALERT_CODE || !Array.isArray(detail.alerts)) return null;
  return detail.alerts as AllergyAlert[];
};

export type AllergyErrorCode = 'CLIENT_NOT_FOUND' | 'ALLERGY_NOT_FOUND' | 'INVALID_ALLERGY' | 'ALLERGY_ALREADY_RECORDED' | 'ALLERGIES_RECORDED' | 'ALLERGY_FAILED';

export class AllergyError extends Error {
  readonly code: AllergyErrorCode;

  constructor(code: AllergyErrorCode, message: string = code) {
    super(message);
    this.name = 'AllergyError';
    this.code = code;
  }
}
