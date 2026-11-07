/**
 * Feedback API Service
 * Handles all HTTP requests for feedback-related endpoints
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import axios from 'axios';
import { FeedbackFormError } from '../../domain/errors/feedbackFormError';
import type {
  FeedbackFormData,
  FeedbackSubmitPayload,
  FeedbackSubmitResponse,
  StaffKPIQueryParams,
  StaffKPIResponse,
  StaffFeedbackListQueryParams,
  StaffFeedbackListResponse,
  ClinicFeedbackSummaryQueryParams,
  ClinicFeedbackSummaryResponse,
} from '../models/feedback.dtos';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// ==================== Patient Feedback Form (Public - No Auth) ====================

/**
 * Get feedback form data for a given token (public, no auth required)
 * GET /api/v1/feedback/{token}
 */
export async function getFeedbackFormApi(token: string): Promise<FeedbackFormData> {
  try {
    const response = await axios.get<FeedbackFormData>(
      `${API_BASE}/api/v1/feedback/${token}`
    );
    return response.data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    throw new FeedbackFormError(status === 404 ? 'INVALID_LINK' : status === 400 ? 'ALREADY_SUBMITTED' : 'LOAD_FAILED');
  }
}

/**
 * Submit feedback for a given token (public, no auth required)
 * POST /api/v1/feedback/{token}
 */
export async function submitFeedbackApi(
  token: string,
  payload: FeedbackSubmitPayload
): Promise<FeedbackSubmitResponse> {
  // Use raw axios for public endpoint (no auth header)
  const response = await axios.post<FeedbackSubmitResponse>(
    `${API_BASE}/api/v1/feedback/${token}`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// ==================== Staff KPIs & Feedback (Authenticated) ====================

/**
 * Get staff KPI metrics
 * GET /api/v1/clinic/{tenant_id}/staff/{staff_id}/kpis
 */
export async function getStaffKpisApi(
  tenantId: string,
  staffId: string,
  params: StaffKPIQueryParams
): Promise<StaffKPIResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('period', params.period);
  queryParams.set('staff_type', params.staff_type);
  if (params.from_date) queryParams.set('from_date', params.from_date);
  if (params.to_date) queryParams.set('to_date', params.to_date);

  const response = await axiosClient.get<StaffKPIResponse>(
    `/api/v1/clinic/${tenantId}/staff/${staffId}/kpis?${queryParams.toString()}`
  );
  return response.data;
}

/**
 * Get staff feedback list
 * GET /api/v1/feedback/clinic/{tenant_id}/staff/{staff_id}/feedback
 */
export async function getStaffFeedbackListApi(
  tenantId: string,
  staffId: string,
  params: StaffFeedbackListQueryParams
): Promise<StaffFeedbackListResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('staff_type', params.staff_type);
  if (params.from_date) queryParams.set('from_date', params.from_date);
  if (params.to_date) queryParams.set('to_date', params.to_date);
  if (params.limit !== undefined) queryParams.set('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.set('offset', params.offset.toString());

  const response = await axiosClient.get<StaffFeedbackListResponse>(
    `/api/v1/feedback/clinic/${tenantId}/staff/${staffId}/feedback?${queryParams.toString()}`
  );
  return response.data;
}

// ==================== Clinic Feedback Summary (Admin) ====================

/**
 * Get clinic-wide feedback summary
 * GET /api/v1/feedback/clinic/{tenant_id}/summary
 */
export async function getClinicFeedbackSummaryApi(
  tenantId: string,
  params?: ClinicFeedbackSummaryQueryParams
): Promise<ClinicFeedbackSummaryResponse> {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.set('from_date', params.from_date);
  if (params?.to_date) queryParams.set('to_date', params.to_date);

  const queryString = queryParams.toString();
  const url = `/api/v1/feedback/clinic/${tenantId}/summary${queryString ? `?${queryString}` : ''}`;
  
  const response = await axiosClient.get<ClinicFeedbackSummaryResponse>(url);
  return response.data;
}
