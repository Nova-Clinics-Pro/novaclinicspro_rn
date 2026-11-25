import { axiosClient } from '../../../../core/api/axiosClient';
import { AllergyError, type Allergy, type AllergyAlert, type AllergyErrorCode, type ClientAllergies, type NewAllergy } from '../../domain/clientAllergies';

const base = (tenantId: string, clientId: string) => `/api/v1/clinic/${tenantId}/clients/${clientId}/allergies`;
const KNOWN: readonly string[] = ['CLIENT_NOT_FOUND', 'ALLERGY_NOT_FOUND', 'INVALID_ALLERGY', 'ALLERGY_ALREADY_RECORDED', 'ALLERGIES_RECORDED'];

const toError = (error: unknown): AllergyError => {
  const detail = (error as { response?: { data?: { detail?: { error_code?: unknown; message?: unknown } | string } } } | undefined)?.response?.data?.detail;
  if (detail && typeof detail === 'object' && typeof detail.error_code === 'string' && KNOWN.includes(detail.error_code)) {
    return new AllergyError(detail.error_code as AllergyErrorCode, typeof detail.message === 'string' ? detail.message : detail.error_code);
  }
  return new AllergyError('ALLERGY_FAILED');
};

const guarded = async <T>(call: () => Promise<{ data: T }>): Promise<T> => {
  try {
    return (await call()).data;
  } catch (error) {
    throw toError(error);
  }
};

export const getClientAllergiesApi = (tenantId: string, clientId: string): Promise<ClientAllergies> =>
  guarded(() => axiosClient.get<ClientAllergies>(base(tenantId, clientId)));

export const addAllergyApi = (tenantId: string, clientId: string, allergy: NewAllergy): Promise<Allergy> =>
  guarded(() => axiosClient.post<Allergy>(base(tenantId, clientId), allergy));

export const changeAllergyApi = (tenantId: string, clientId: string, allergyId: string, changes: Partial<NewAllergy> & { status?: 'active' | 'resolved' }): Promise<Allergy> =>
  guarded(() => axiosClient.patch<Allergy>(`${base(tenantId, clientId)}/${allergyId}`, changes));

export const confirmNoKnownAllergiesApi = (tenantId: string, clientId: string): Promise<ClientAllergies> =>
  guarded(() => axiosClient.put<ClientAllergies>(`${base(tenantId, clientId)}/none-known`));

export const checkAllergiesApi = async (tenantId: string, clientId: string, medicines: string[]): Promise<AllergyAlert[]> =>
  (await guarded(() => axiosClient.post<{ alerts: AllergyAlert[] }>(`${base(tenantId, clientId)}/check`, { medicines }))).alerts;
