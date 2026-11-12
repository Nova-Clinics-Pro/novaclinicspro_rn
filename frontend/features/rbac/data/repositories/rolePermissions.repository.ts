import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRolePermissionsApi, resetRolePermissionsApi, setRolePermissionApi } from '../datasources/rolePermissions.api';
import type { RolePermissionsDto } from '../models/rolePermissions.dtos';

export const rolePermissionKeys = {
  role: (tenantId: string, roleId: string) => ['rbac', 'role-permissions', tenantId, roleId] as const,
};

export const useRolePermissionsQuery = (tenantId: string, roleId: string | null) =>
  useQuery<RolePermissionsDto>({
    queryKey: rolePermissionKeys.role(tenantId, roleId ?? ''),
    queryFn: () => getRolePermissionsApi(tenantId, roleId as string),
    enabled: Boolean(tenantId && roleId),
    // This screen presents its own localized failure state (a permission refusal must not become a retry loop).
    meta: { apiFailurePresentation: 'feature' },
    retry: false,
  });

export const useSetRolePermissionMutation = (tenantId: string, roleId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      setRolePermissionApi(tenantId, roleId, code, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolePermissionKeys.role(tenantId, roleId) }),
  });
};

export const useResetRolePermissionsMutation = (tenantId: string, roleId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetRolePermissionsApi(tenantId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolePermissionKeys.role(tenantId, roleId) }),
  });
};
