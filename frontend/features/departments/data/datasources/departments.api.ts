import { axiosClient } from '../../../../core/api/axiosClient';

export interface DepartmentDTO {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface DepartmentInputDTO {
  code?: string;
  name?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export const listDepartmentsApi = async (tenantId: string): Promise<DepartmentDTO[]> =>
  (await axiosClient.get<DepartmentDTO[]>(`/api/v1/clinic/${tenantId}/departments`)).data;

export const createDepartmentApi = async (tenantId: string, input: DepartmentInputDTO): Promise<DepartmentDTO> =>
  (await axiosClient.post<DepartmentDTO>(`/api/v1/clinic/${tenantId}/departments`, input)).data;

export const updateDepartmentApi = async (
  tenantId: string,
  departmentId: string,
  input: DepartmentInputDTO,
): Promise<DepartmentDTO> =>
  (await axiosClient.patch<DepartmentDTO>(
    `/api/v1/clinic/${tenantId}/departments/${departmentId}`,
    input,
  )).data;
