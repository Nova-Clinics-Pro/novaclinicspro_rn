/**
 * Role-permission customization API (owner only).
 *
 * These calls deliberately use the raw axios client: the screen needs the backend's error body
 * (error_code, who can do this) to explain a refusal in the user's language, which the generic RBAC
 * error normalizer would discard.
 */
import { axiosClient } from '../../../../core/api/axiosClient';
import type { ResetRolePermissionsDto, RolePermissionItemDto, RolePermissionsDto } from '../models/rolePermissions.dtos';

const base = (tenantId: string, roleId: string) => `/api/v1/rbac/${tenantId}/tenant-roles/${roleId}/permissions`;

export const getRolePermissionsApi = async (tenantId: string, roleId: string): Promise<RolePermissionsDto> =>
  (await axiosClient.get<RolePermissionsDto>(base(tenantId, roleId))).data;

export const setRolePermissionApi = async (
  tenantId: string,
  roleId: string,
  permissionCode: string,
  enabled: boolean
): Promise<RolePermissionItemDto> =>
  (await axiosClient.put<RolePermissionItemDto>(`${base(tenantId, roleId)}/${encodeURIComponent(permissionCode)}`, { enabled })).data;

export const resetRolePermissionsApi = async (tenantId: string, roleId: string): Promise<ResetRolePermissionsDto> =>
  (await axiosClient.post<ResetRolePermissionsDto>(`${base(tenantId, roleId)}/reset`)).data;
