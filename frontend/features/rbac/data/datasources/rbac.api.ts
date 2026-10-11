/**
 * RBAC API Datasource
 * Handles all HTTP calls for RBAC management
 * 
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { normalizeRbacOperationError } from './rbacOperationError';
import {
  // Tenant Roles
  TenantRoleCreate,
  TenantRoleUpdate,
  TenantRoleResponse,
  ListTenantRolesParams,
  PaginatedTenantRolesResponse,
  // Tenant Permissions
  TenantPermissionResponse,
  TenantPermissionToggleActive,
  ListTenantPermissionsParams,
  PaginatedTenantPermissionsResponse,
  // Tenant Users
  TenantUserCreate,
  TenantUserUpdate,
  TenantUserResponse,
  ListTenantUsersParams,
  PaginatedTenantUsersResponse,
  // User Role Assignments
  TenantUserRoleAssign,
  TenantUserRoleUpdate,
  TenantUserRoleResponse,
  TenantUserRoleRemove,
  ListTenantUserRolesParams,
  PaginatedTenantUserRolesResponse,
  // Audit History
  TenantUserRoleHistoryResponse,
  ListRbacAuditParams,
  PaginatedRbacAuditResponse,
} from '../models/rbac.dtos';

const executeRbacRequest = async <T>(
  request: () => Promise<{ data: T }>
): Promise<T> => {
  try {
    return (await request()).data;
  } catch (error) {
    throw normalizeRbacOperationError(error);
  }
};

const executeRbacVoidRequest = async (
  request: () => Promise<unknown>
): Promise<void> => {
  try {
    await request();
  } catch (error) {
    throw normalizeRbacOperationError(error);
  }
};

// ============================================
// TENANT ROLES API
// ============================================

/**
 * List tenant roles
 * GET /api/v1/rbac/{tenant_id}/tenant-roles
 */
export const listTenantRolesApi = async (
  tenantId: string,
  params?: ListTenantRolesParams
): Promise<PaginatedTenantRolesResponse> => {
  return executeRbacRequest(() => axiosClient.get(`/api/v1/rbac/${tenantId}/tenant-roles`, {
    params,
  }));
};

/**
 * Get tenant role by ID
 * GET /api/v1/rbac/{tenant_id}/tenant-roles/{role_id}
 */
export const getTenantRoleApi = async (
  tenantId: string,
  roleId: string
): Promise<TenantRoleResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-roles/${roleId}`
  ));
};

/**
 * Create tenant role
 * POST /api/v1/rbac/{tenant_id}/tenant-roles
 */
export const createTenantRoleApi = async (
  tenantId: string,
  payload: TenantRoleCreate
): Promise<TenantRoleResponse> => {
  return executeRbacRequest(() => axiosClient.post(
    `/api/v1/rbac/${tenantId}/tenant-roles`,
    payload
  ));
};

/**
 * Update tenant role
 * PATCH /api/v1/rbac/{tenant_id}/tenant-roles/{role_id}
 */
export const updateTenantRoleApi = async (
  tenantId: string,
  roleId: string,
  payload: TenantRoleUpdate
): Promise<TenantRoleResponse> => {
  return executeRbacRequest(() => axiosClient.patch(
    `/api/v1/rbac/${tenantId}/tenant-roles/${roleId}`,
    payload
  ));
};

/**
 * Delete tenant role
 * DELETE /api/v1/rbac/{tenant_id}/tenant-roles/{role_id}
 */
export const deleteTenantRoleApi = async (
  tenantId: string,
  roleId: string
): Promise<void> => {
  return executeRbacVoidRequest(() => axiosClient.delete(
    `/api/v1/rbac/${tenantId}/tenant-roles/${roleId}`
  ));
};

// ============================================
// TENANT PERMISSIONS API
// ============================================

/**
 * List tenant permissions
 * GET /api/v1/rbac/{tenant_id}/tenant-permissions
 */
export const listTenantPermissionsApi = async (
  tenantId: string,
  params?: ListTenantPermissionsParams
): Promise<PaginatedTenantPermissionsResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-permissions`,
    { params }
  ));
};

/**
 * Get tenant permission by ID
 * GET /api/v1/rbac/{tenant_id}/tenant-permissions/{permission_id}
 */
export const getTenantPermissionApi = async (
  tenantId: string,
  permissionId: string
): Promise<TenantPermissionResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-permissions/${permissionId}`
  ));
};

/**
 * Toggle tenant permission active status
 * PATCH /api/v1/rbac/{tenant_id}/tenant-permissions/{permission_id}/toggle-active
 */
export const toggleTenantPermissionApi = async (
  tenantId: string,
  permissionId: string,
  payload: TenantPermissionToggleActive
): Promise<TenantPermissionResponse> => {
  return executeRbacRequest(() => axiosClient.patch(
    `/api/v1/rbac/${tenantId}/tenant-permissions/${permissionId}/toggle-active`,
    payload
  ));
};

// ============================================
// TENANT USERS API
// ============================================

/**
 * List tenant users
 * GET /api/v1/rbac/{tenant_id}/tenant-users
 */
export const listTenantUsersApi = async (
  tenantId: string,
  params?: ListTenantUsersParams
): Promise<PaginatedTenantUsersResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-users`,
    { params }
  ));
};

/**
 * Get tenant user by ID
 * GET /api/v1/rbac/{tenant_id}/tenant-users/{tenant_user_id}
 */
export const getTenantUserApi = async (
  tenantId: string,
  tenantUserId: string
): Promise<TenantUserResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-users/${tenantUserId}`
  ));
};

/**
 * Create/invite tenant user
 * POST /api/v1/rbac/{tenant_id}/tenant-users
 */
export const createTenantUserApi = async (
  tenantId: string,
  payload: TenantUserCreate
): Promise<TenantUserResponse> => {
  return executeRbacRequest(() => axiosClient.post(
    `/api/v1/rbac/${tenantId}/tenant-users`,
    payload
  ));
};

/**
 * Update tenant user
 * PATCH /api/v1/rbac/{tenant_id}/tenant-users/{tenant_user_id}
 */
export const updateTenantUserApi = async (
  tenantId: string,
  tenantUserId: string,
  payload: TenantUserUpdate
): Promise<TenantUserResponse> => {
  return executeRbacRequest(() => axiosClient.patch(
    `/api/v1/rbac/${tenantId}/tenant-users/${tenantUserId}`,
    payload
  ));
};

// ============================================
// USER ROLE ASSIGNMENTS API
// ============================================

/**
 * List tenant user role assignments
 * GET /api/v1/rbac/{tenant_id}/tenant-user-roles
 */
export const listTenantUserRolesApi = async (
  tenantId: string,
  params?: ListTenantUserRolesParams
): Promise<PaginatedTenantUserRolesResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-user-roles`,
    { params }
  ));
};

/**
 * Get tenant user role assignment by ID
 * GET /api/v1/rbac/{tenant_id}/tenant-user-roles/{assignment_id}
 */
export const getTenantUserRoleApi = async (
  tenantId: string,
  assignmentId: string
): Promise<TenantUserRoleResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-user-roles/${assignmentId}`
  ));
};

/**
 * Assign role to tenant user
 * POST /api/v1/rbac/{tenant_id}/tenant-user-roles/assign
 */
export const assignTenantUserRoleApi = async (
  tenantId: string,
  payload: TenantUserRoleAssign
): Promise<TenantUserRoleResponse> => {
  return executeRbacRequest(() => axiosClient.post(
    `/api/v1/rbac/${tenantId}/tenant-user-roles/assign`,
    payload
  ));
};

/**
 * Update tenant user role assignment
 * PATCH /api/v1/rbac/{tenant_id}/tenant-user-roles/{assignment_id}
 */
export const updateTenantUserRoleApi = async (
  tenantId: string,
  assignmentId: string,
  payload: TenantUserRoleUpdate
): Promise<TenantUserRoleResponse> => {
  return executeRbacRequest(() => axiosClient.patch(
    `/api/v1/rbac/${tenantId}/tenant-user-roles/${assignmentId}`,
    payload
  ));
};

/**
 * Remove role from tenant user
 * DELETE /api/v1/rbac/{tenant_id}/tenant-user-roles/{assignment_id}
 */
export const removeTenantUserRoleApi = async (
  tenantId: string,
  assignmentId: string,
  payload?: TenantUserRoleRemove
): Promise<void> => {
  return executeRbacVoidRequest(() => axiosClient.delete(
    `/api/v1/rbac/${tenantId}/tenant-user-roles/${assignmentId}`,
    { data: payload }
  ));
};

// ============================================
// RBAC AUDIT HISTORY API
// ============================================

/**
 * List tenant user role history
 * GET /api/v1/rbac/{tenant_id}/tenant-user-role-history
 */
export const listRbacAuditHistoryApi = async (
  tenantId: string,
  params?: ListRbacAuditParams
): Promise<PaginatedRbacAuditResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-user-role-history`,
    { params }
  ));
};

/**
 * Get tenant user role history entry by ID
 * GET /api/v1/rbac/{tenant_id}/tenant-user-role-history/{history_id}
 */
export const getRbacAuditHistoryApi = async (
  tenantId: string,
  historyId: string
): Promise<TenantUserRoleHistoryResponse> => {
  return executeRbacRequest(() => axiosClient.get(
    `/api/v1/rbac/${tenantId}/tenant-user-role-history/${historyId}`
  ));
};
