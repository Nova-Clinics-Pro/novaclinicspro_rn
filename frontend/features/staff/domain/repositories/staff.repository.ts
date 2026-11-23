/**
 * Staff Repository Interface
 * Defines the contract for staff data operations
 */

import {
  StaffCreate,
  StaffUpdate,
  StaffResponse,
  StaffLeaveCreate,
  StaffLeaveResponse,
  ListStaffParams,
  ListStaffLeaveParams,
  PaginatedStaffResponse,
  PaginatedLeaveResponse,
  LeaveApproveRequest,
  LeaveRejectRequest,
} from '../../data/models/staff.dtos';

/**
 * Staff repository interface
 */
export interface IStaffRepository {
  // Staff CRUD
  listStaff(tenantId: string, params?: ListStaffParams): Promise<PaginatedStaffResponse>;
  getStaff(tenantId: string, staffId: string): Promise<StaffResponse>;
  createStaff(tenantId: string, data: StaffCreate): Promise<StaffResponse>;
  updateStaff(tenantId: string, staffId: string, data: StaffUpdate): Promise<StaffResponse>;
  inviteStaffToSignIn(tenantId: string, staffId: string, email: string): Promise<StaffResponse>;
  deleteStaff(tenantId: string, staffId: string): Promise<void>;

  // Leave management
  listStaffLeave(
    tenantId: string,
    staffId: string,
    params?: ListStaffLeaveParams
  ): Promise<PaginatedLeaveResponse>;
  createLeave(
    tenantId: string,
    staffId: string,
    data: StaffLeaveCreate
  ): Promise<StaffLeaveResponse>;
  approveLeave(
    tenantId: string,
    leaveId: string,
    data?: LeaveApproveRequest
  ): Promise<StaffLeaveResponse>;
  rejectLeave(
    tenantId: string,
    leaveId: string,
    data: LeaveRejectRequest
  ): Promise<StaffLeaveResponse>;
  cancelLeave(tenantId: string, leaveId: string): Promise<StaffLeaveResponse>;
}
