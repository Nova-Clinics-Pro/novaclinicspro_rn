/**
 * Staff API
 * Handles all HTTP calls for staff management
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  StaffCreate,
  StaffUpdate,
  StaffResponse,
  StaffLeaveCreate,
  StaffLeaveResponse,
  LeaveApproveRequest,
  LeaveRejectRequest,
  ListStaffParams,
  ListStaffLeaveParams,
  PaginatedStaffResponse,
  PaginatedLeaveResponse,
  OnboardingStaffSourceItem,
} from '../models/staff.dtos';

// ============================================
// STAFF CRUD
// ============================================

/**
 * List staff members for a tenant
 * GET /api/v1/clinic/{tenant_id}/staff
 */
export const listStaffApi = async (
  tenantId: string,
  params?: ListStaffParams
): Promise<PaginatedStaffResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff`,
    { params }
  );
  return response.data;
};

/**
 * Read the legacy array response used by the onboarding staff form.
 * Successful non-array responses preserve the form's historical empty state.
 */
export const listOnboardingStaffApi = async (
  tenantId: string
): Promise<OnboardingStaffSourceItem[]> => {
  const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/staff`);
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Get a single staff member
 * GET /api/v1/clinic/{tenant_id}/staff/{staff_id}
 */
export const getStaffApi = async (
  tenantId: string,
  staffId: string
): Promise<StaffResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/${staffId}`
  );
  return response.data;
};

/**
 * Create a staff member
 * POST /api/v1/clinic/{tenant_id}/staff
 */
export const createStaffApi = async (
  tenantId: string,
  payload: StaffCreate
): Promise<StaffResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/staff`,
    payload
  );
  return response.data;
};

/**
 * Update a staff member
 * PATCH /api/v1/clinic/{tenant_id}/staff/{staff_id}
 */
export const updateStaffApi = async (
  tenantId: string,
  staffId: string,
  payload: StaffUpdate
): Promise<StaffResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/staff/${staffId}`,
    payload
  );
  return response.data;
};

/**
 * Delete a staff member
 * DELETE /api/v1/clinic/{tenant_id}/staff/{staff_id}
 */
export const deleteStaffApi = async (
  tenantId: string,
  staffId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/staff/${staffId}`
  );
};

// ============================================
// LEAVE MANAGEMENT
// ============================================

/**
 * List leave requests for a staff member
 * GET /api/v1/clinic/{tenant_id}/staff/{staff_id}/leave
 */
export const listStaffLeaveApi = async (
  tenantId: string,
  staffId: string,
  params?: ListStaffLeaveParams
): Promise<PaginatedLeaveResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/${staffId}/leave`,
    { params }
  );
  return response.data;
};

/**
 * List all leave requests across all staff for a tenant (admin view)
 * GET /api/v1/clinic/{tenant_id}/leave
 */
export const listAllStaffLeaveApi = async (
  tenantId: string,
  params?: ListStaffLeaveParams
): Promise<PaginatedLeaveResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/leave`,
    { params }
  );
  return response.data;
};

/**
 * Create a leave request
 * POST /api/v1/clinic/{tenant_id}/staff/{staff_id}/leave
 */
export const createStaffLeaveApi = async (
  tenantId: string,
  staffId: string,
  payload: StaffLeaveCreate
): Promise<StaffLeaveResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/staff/${staffId}/leave`,
    payload
  );
  return response.data;
};

/**
 * Approve a leave request
 * PATCH /api/v1/clinic/{tenant_id}/leave/{leave_id}/approve
 */
export const approveLeaveApi = async (
  tenantId: string,
  leaveId: string,
  payload?: LeaveApproveRequest
): Promise<StaffLeaveResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/leave/${leaveId}/approve`,
    payload || {}
  );
  return response.data;
};

/**
 * Reject a leave request
 * PATCH /api/v1/clinic/{tenant_id}/leave/{leave_id}/reject
 */
export const rejectLeaveApi = async (
  tenantId: string,
  leaveId: string,
  payload: LeaveRejectRequest
): Promise<StaffLeaveResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/leave/${leaveId}/reject`,
    payload
  );
  return response.data;
};

/**
 * Cancel a leave request
 * PATCH /api/v1/clinic/{tenant_id}/leave/{leave_id}/cancel
 */
export const cancelLeaveApi = async (
  tenantId: string,
  leaveId: string
): Promise<StaffLeaveResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/leave/${leaveId}/cancel`
  );
  return response.data;
};

// ============================================
// SEARCH
// ============================================

/**
 * Search staff by phone, email, or name
 * GET /api/v1/clinic/{tenant_id}/staff/search
 * 
 * @param tenantId - Clinic tenant ID
 * @param query - Search query (phone, email, or name)
 * @param limit - Optional limit for results
 */
export const searchStaffApi = async (
  tenantId: string,
  query: string,
  limit?: number
): Promise<PaginatedStaffResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/search`,
    { params: { query, limit } }
  );
  return response.data;
};
