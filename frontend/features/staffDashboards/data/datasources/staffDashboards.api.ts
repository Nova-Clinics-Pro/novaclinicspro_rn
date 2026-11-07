/**
 * Staff Dashboards API
 * Handles all HTTP calls for role-specific dashboards
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  DoctorDashboardResponse,
  TherapistDashboardResponse,
  FrontdeskDashboardResponse,
} from '../models/staffDashboards.dtos';

/**
 * Get doctor dashboard data
 * GET /api/v1/clinic/{tenant_id}/staff/me/dashboard/doctor
 */
export const getDoctorDashboardApi = async (
  tenantId: string,
  params?: {
    date?: string;
  }
): Promise<DoctorDashboardResponse> => {
  console.log('[API] Fetching doctor dashboard:', {
    tenantId,
    params,
    fullParams: {
      ...params,
      expand: 'staff,client,treatment'
    }
  });
  
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/me/dashboard/doctor`,
    { 
      params: {
        ...params,
        expand: 'staff,client,treatment'
      }
    }
  );
  
  console.log('[API] Doctor dashboard RAW response:', {
    fullResponse: response.data,
    appointmentsArray: response.data?.appointments,
    appointmentsCount: response.data?.appointments?.length || 0,
    totalCount: response.data?.total_count,
    onLeave: response.data?.on_leave_today,
    firstAppointment: response.data?.appointments?.[0],
    firstAppointmentDoctorId: response.data?.appointments?.[0]?.doctor_id,
    requestedDate: params?.date,
  });
  
  console.log('[API] Doctor dashboard - Appointment doctor IDs:', 
    response.data?.appointments?.map((apt: any) => ({
      id: apt.id,
      doctor_id: apt.doctor_id,
      client_name: apt.client_name,
      date: apt.appointment_start?.split('T')[0],
    }))
  );
  
  return response.data;
};

/**
 * Get therapist dashboard data
 * GET /api/v1/clinic/{tenant_id}/staff/me/dashboard/therapist
 */
export const getTherapistDashboardApi = async (
  tenantId: string
): Promise<TherapistDashboardResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/me/dashboard/therapist`
  );
  return response.data;
};

/**
 * Get frontdesk dashboard data
 * GET /api/v1/clinic/{tenant_id}/staff/me/dashboard/frontdesk
 */
export const getFrontdeskDashboardApi = async (
  tenantId: string,
  params?: {
    doctor_id?: string;
    room_id?: string;
    status?: string;
  }
): Promise<FrontdeskDashboardResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/me/dashboard/frontdesk`,
    { params }
  );
  return response.data;
};

// ============================================
// ADMIN DASHBOARD - MULTI-DAY TREATMENTS (F2.5)
// ============================================

import {
  TreatmentStatsResponse,
  PendingProposalItem,
  TodaySessionStatsResponse,
  PausedSeriesItem,
} from '../models/staffDashboards.dtos';

/**
 * Get treatment statistics for admin dashboard
 * GET /api/v1/clinic/{tenant_id}/treatment-stats
 */
export const getTreatmentStatsApi = async (
  tenantId: string
): Promise<TreatmentStatsResponse> => {
  console.log('[API] Fetching treatment stats:', { tenantId });
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-stats`
  );
  console.log('[API] Treatment stats response:', response.data);
  return response.data;
};

/**
 * Get pending proposals for admin dashboard
 * GET /api/v1/clinic/{tenant_id}/treatment-proposals?status=PROPOSED
 */
export const getPendingProposalsApi = async (
  tenantId: string,
  limit: number = 5
): Promise<{ proposals: PendingProposalItem[]; total: number }> => {
  console.log('[API] Fetching pending proposals:', { tenantId, limit });
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-proposals`,
    { 
      params: { 
        status: 'PROPOSED',
        limit,
        expand: 'client,created_by'
      } 
    }
  );
  console.log('[API] Pending proposals response:', response.data);
  return response.data;
};

/**
 * Get today's session statistics for admin dashboard
 * GET /api/v1/clinic/{tenant_id}/today-session-stats
 */
export const getTodaySessionStatsApi = async (
  tenantId: string,
  date?: string
): Promise<TodaySessionStatsResponse> => {
  console.log('[API] Fetching today session stats:', { tenantId, date });
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/today-session-stats`,
    { params: { date } }
  );
  console.log('[API] Today session stats response:', response.data);
  return response.data;
};

/**
 * Get paused series for admin dashboard
 * GET /api/v1/clinic/{tenant_id}/treatment-sheets?status=PAUSED
 */
export const getPausedSeriesApi = async (
  tenantId: string,
  limit: number = 5
): Promise<{ series: PausedSeriesItem[]; total: number }> => {
  console.log('[API] Fetching paused series:', { tenantId, limit });
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/treatment-sheets`,
    { 
      params: { 
        status: 'PAUSED',
        limit,
        expand: 'client'
      } 
    }
  );
  console.log('[API] Paused series response:', response.data);
  return response.data;
};


// ============================================
// THERAPIST DASHBOARD — NEW ROW_ID-BASED FLOW
// ============================================

import {
  TherapistSessionsResponse,
  KpiQueryParams,
  TherapistKpisResponse,
  SheetRowUsablesResponse,
  CompleteSheetRowRequest,
  CompleteSheetRowResponse,
  RecordSessionNonExecutionRequest,
  RecordSessionNonExecutionResponse,
} from '../models/staffDashboards.dtos';

/**
 * Get today's sessions for the authenticated therapist.
 * GET /api/v1/clinic/{tenantId}/staff/me/dashboard/therapist/sessions
 * Requirements: 4.1, 1.7
 */
export const getTherapistSessionsApi = async (
  tenantId: string,
  params?: { cursor?: string; limit?: number; date?: string }
): Promise<TherapistSessionsResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/me/dashboard/therapist/sessions`,
    { params }
  );
  return response.data;
};

/**
 * Get KPI metrics for a staff member.
 * GET /api/v1/clinic/{tenantId}/staff/{staffId}/kpis
 * Requirements: 9.3, 1.7
 */
export const getTherapistKpisApi = async (
  tenantId: string,
  staffId: string,
  params: KpiQueryParams
): Promise<TherapistKpisResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/staff/${staffId}/kpis`,
    { params }
  );
  return response.data;
};

/**
 * Get pre-configured usables (materials) for a treatment sheet row.
 * GET /api/v1/clinic/treatment-sheets/rows/{rowId}/usables
 * Requirements: 5.1, 1.7
 */
export const getSheetRowUsablesApi = async (
  tenantId: string,
  rowId: string
): Promise<SheetRowUsablesResponse> => {
  void tenantId;
  const response = await axiosClient.get(
    `/api/v1/clinic/treatment-sheets/rows/${rowId}/usables`
  );
  return Array.isArray(response.data)
    ? { items: response.data }
    : response.data;
};

/**
 * Complete a treatment sheet row using its row_id.
 * POST /api/v1/clinic/treatment-sheets/rows/{rowId}/complete
 *
 * IMPORTANT: rowId comes from row_id on the session item.
 * NEVER use session_id or completeTreatmentSessionApi here.
 * Requirements: 6.1, 6.5, 1.7
 */
export const completeSheetRowApi = async (
  tenantId: string,
  rowId: string,
  payload: CompleteSheetRowRequest
): Promise<CompleteSheetRowResponse> => {
  void tenantId;
  const response = await axiosClient.post(
    `/api/v1/clinic/treatment-sheets/rows/${rowId}/complete`,
    payload
  );
  return response.data;
};

/**
 * Record why a scheduled treatment sheet row did not execute.
 * POST /api/v1/clinic/treatment-sheets/rows/{rowId}/non-execution
 *
 * IMPORTANT: rowId is the row's stable identity (TreatmentSheetRow.id),
 * the same identifier used by start/complete. Never a session date, day
 * number, or array index.
 */
export const recordSessionNonExecutionApi = async (
  tenantId: string,
  rowId: string,
  payload: RecordSessionNonExecutionRequest
): Promise<RecordSessionNonExecutionResponse> => {
  void tenantId;
  const response = await axiosClient.post(
    `/api/v1/clinic/treatment-sheets/rows/${rowId}/non-execution`,
    payload
  );
  return response.data;
};
