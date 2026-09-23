import { axiosClient } from '../../../../core/api/axiosClient';

export interface ConfiguredClinicalServiceDTO { id: string; tenant_id: string; code: string; name: string; description: string | null; category_code: string | null; is_active: boolean; sort_order: number; }
export interface ConfiguredClinicalServiceInputDTO { code?: string; name?: string; description?: string | null; category_code?: string | null; is_active?: boolean; sort_order?: number; }
export interface TreatmentCategoryDTO { code: string; display_key: string; is_active: boolean; }
export const listConfiguredClinicalServicesApi = async (tenantId: string) => (await axiosClient.get<ConfiguredClinicalServiceDTO[]>(`/api/v1/clinic/${tenantId}/configured-clinical-services`)).data;
export const createConfiguredClinicalServiceApi = async (tenantId: string, input: ConfiguredClinicalServiceInputDTO) => (await axiosClient.post<ConfiguredClinicalServiceDTO>(`/api/v1/clinic/${tenantId}/configured-clinical-services`, input)).data;
export const updateConfiguredClinicalServiceApi = async (tenantId: string, id: string, input: ConfiguredClinicalServiceInputDTO) => (await axiosClient.patch<ConfiguredClinicalServiceDTO>(`/api/v1/clinic/${tenantId}/configured-clinical-services/${id}`, input)).data;
export const listTreatmentCategoriesApi = async () => (await axiosClient.get<TreatmentCategoryDTO[]>('/api/v1/clinic/treatment-categories')).data;
