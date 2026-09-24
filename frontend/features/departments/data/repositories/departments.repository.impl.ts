import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Department, DepartmentInput, DepartmentUpdate } from '../../domain/entities/department.entity';
import {
  createDepartmentApi,
  listDepartmentsApi,
  updateDepartmentApi,
  type DepartmentDTO,
} from '../datasources/departments.api';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

const mapDepartment = (dto: DepartmentDTO): Department => Object.freeze({
  id: dto.id,
  tenantId: dto.tenant_id,
  code: dto.code,
  name: dto.name,
  description: dto.description,
  isActive: dto.is_active,
  sortOrder: dto.sort_order,
});

export const departmentKeys = {
  all: ['departments'] as const,
  list: (tenantId: string) => [...departmentKeys.all, tenantId] as const,
};

const refreshOnboardingProjection = async (client: ReturnType<typeof useQueryClient>, tenantId: string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: departmentKeys.list(tenantId) }),
    invalidateCanonicalOnboardingState(client, tenantId),
  ]);
};

export const useDepartmentsQuery = (tenantId: string) => useQuery<Department[], Error>({
  queryKey: departmentKeys.list(tenantId),
  queryFn: async () => (await listDepartmentsApi(tenantId)).map(mapDepartment),
  enabled: Boolean(tenantId),
});

export const useCreateDepartmentMutation = (tenantId: string) => {
  const client = useQueryClient();
  return useMutation<Department, Error, DepartmentInput>({
    mutationFn: async input => mapDepartment(await createDepartmentApi(tenantId, { code: input.code, name: input.name, description: input.description, sort_order: input.sortOrder })),
    onSuccess: async () => refreshOnboardingProjection(client, tenantId),
  });
};

export const useUpdateDepartmentMutation = (tenantId: string, departmentId: string) => {
  const client = useQueryClient();
  return useMutation<Department, Error, DepartmentUpdate>({
    mutationFn: async input => mapDepartment(await updateDepartmentApi(tenantId, departmentId, { code: input.code, name: input.name, description: input.description, sort_order: input.sortOrder, is_active: input.isActive })),
    onSuccess: async () => refreshOnboardingProjection(client, tenantId),
  });
};

export const useSetDepartmentActiveMutation = (tenantId: string) => {
  const client = useQueryClient();
  return useMutation<Department, Error, Pick<Department, 'id' | 'isActive'>>({
    mutationFn: async ({ id, isActive }) => mapDepartment(await updateDepartmentApi(tenantId, id, { is_active: isActive })),
    onSuccess: async () => refreshOnboardingProjection(client, tenantId),
  });
};
