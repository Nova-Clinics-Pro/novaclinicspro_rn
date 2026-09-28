import { axiosClient } from '../../../../core/api/axiosClient';

export interface MultiDayAppointmentSettingDTO {
  enabled: boolean;
  available: boolean;
  version: number;
}

export const getMultiDayAppointmentSettingApi = async (tenantId: string) =>
  (await axiosClient.get<MultiDayAppointmentSettingDTO>(`/api/v1/clinic/${tenantId}/appointment-settings/multiday`)).data;

export const updateMultiDayAppointmentSettingApi = async (
  tenantId: string,
  input: Pick<MultiDayAppointmentSettingDTO, 'enabled' | 'version'>,
) => (await axiosClient.put<MultiDayAppointmentSettingDTO>(`/api/v1/clinic/${tenantId}/appointment-settings/multiday`, input)).data;
