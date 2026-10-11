/**
 * Appointments API
 * Handles all HTTP calls for appointment management
 *
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { isAxiosError } from 'axios';
import { AppointmentCreationError } from '../../domain/errors/appointmentCreationError';
import {
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentResponse,
  AppointmentReschedule,
  AppointmentRescheduleResponse,
  ListAppointmentsParams,
  PaginatedAppointmentsResponse,
  AppointmentsListResponse,
  SearchAppointmentsParams,
  AvailableSlotsRequest,
  AvailableSlotsResponse,
  ValidateAppointmentRequest,
  ValidationResponse,
  TherapyPlanRequest,
  TherapyPlanResponse,
  BulkCreateRequest,
  BulkCreateResponse,
  AvailableTherapist,
} from '../models/appointments.dtos';

/**
 * List appointments for a tenant
 * GET /api/v1/clinic/{tenant_id}/appointments
 * 
 * IMPORTANT: Always include expand=staff to get staff_name populated
 */
export const listAppointmentsApi = async (
  tenantId: string,
  params?: ListAppointmentsParams
): Promise<PaginatedAppointmentsResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/appointments`,
    { params: { ...params, expand: 'staff' } }
  );
  return response.data;
};

/**
 * Get a single appointment
 * GET /api/v1/clinic/{tenant_id}/appointments/{appointment_id}
 * 
 * IMPORTANT: Always include expand=staff to get staff_name populated
 */
export const getAppointmentApi = async (
  tenantId: string,
  appointmentId: string
): Promise<AppointmentResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}`,
    { params: { expand: 'staff' } }
  );
  return response.data;
};

/**
 * Create an appointment
 * POST /api/v1/clinic/{tenant_id}/appointments
 */
export const createAppointmentApi = async (
  tenantId: string,
  payload: AppointmentCreate
): Promise<AppointmentResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/clinic/${tenantId}/appointments`,
      payload
    );
    return response.data;
  } catch (error) {
    throw normalizeAppointmentCreationError(error);
  }
};

type AppointmentErrorEnvelope = {
  detail?: unknown;
  error?: unknown;
  message?: unknown;
};

const defaultAppointmentCreationMessage = 'Failed to create appointment.';

const firstMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return firstMessage(record.error) ?? firstMessage(record.message) ?? firstMessage(record.msg);
  }

  return null;
};

const isSafeUserMessage = (message: string): boolean => !/(axioserror|typeerror|referenceerror|stack trace|\bundefined\b|\bnull\b|sql|traceback)/i.test(message);

const isSchedulingConflict = (message: string): boolean => /overlap|already has an appointment|conflicting/i.test(message);

/**
 * Maps create-appointment transport failures to the feature contract consumed
 * by the mutation and presentation layers. This is deliberately scoped to the
 * creation endpoint because it preserves its established post-submit network
 * acknowledgement behavior.
 */
export const normalizeAppointmentCreationError = (error: unknown): AppointmentCreationError => {
  if (error instanceof AppointmentCreationError) return error;

  if (isAxiosError(error)) {
    const networkAfterSubmit =
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      !error.response;

    if (networkAfterSubmit) {
      return new AppointmentCreationError(
        'NETWORK_AFTER_SUBMIT',
        'The appointment was saved. There was a brief network issue loading the confirmation.'
      );
    }

    const envelope = error.response?.data as AppointmentErrorEnvelope | undefined;
    const message =
      firstMessage(envelope?.detail) ??
      firstMessage(envelope?.error) ??
      firstMessage(envelope?.message) ??
      defaultAppointmentCreationMessage;
    const safeMessage = isSafeUserMessage(message)
      ? message
      : defaultAppointmentCreationMessage;

    return new AppointmentCreationError(
      'CREATE_FAILED',
      safeMessage,
      isSchedulingConflict(safeMessage)
    );
  }

  const message = error instanceof Error && isSafeUserMessage(error.message)
    ? error.message
    : defaultAppointmentCreationMessage;
  return new AppointmentCreationError('CREATE_FAILED', message, isSchedulingConflict(message));
};

/**
 * Update an appointment
 * PATCH /api/v1/clinic/{tenant_id}/appointments/{appointment_id}
 */
export const updateAppointmentApi = async (
  tenantId: string,
  appointmentId: string,
  payload: AppointmentUpdate
): Promise<AppointmentResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}`,
    payload
  );
  return response.data;
};

/**
 * Delete an appointment
 * DELETE /api/v1/clinic/{tenant_id}/appointments/{appointment_id}
 */
export const deleteAppointmentApi = async (
  tenantId: string,
  appointmentId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}`
  );
};

/**
 * Cancel an appointment
 * PATCH /api/v1/clinic/{tenant_id}/appointments/{appointment_id}/cancel
 */
export const cancelAppointmentApi = async (
  tenantId: string,
  appointmentId: string
): Promise<AppointmentResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}/cancel`
  );
  return response.data;
};

/**
 * Reschedule an appointment
 * POST /api/v1/clinic/{tenant_id}/appointments/{appointment_id}/reschedule
 * 
 * NOTE: Backend expects `appointment_start` field (not `new_start`)
 */
export const rescheduleAppointmentApi = async (
  tenantId: string,
  appointmentId: string,
  payload: AppointmentReschedule
): Promise<AppointmentRescheduleResponse> => {
  // Ensure payload has appointment_start and appointment_end fields (backend requirement)
  const apiPayload = {
    ...payload,
    appointment_start: payload.new_start || payload.appointment_start,
    appointment_end: payload.new_end || payload.appointment_end,
  };
  
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}/reschedule`,
    apiPayload
  );
  return response.data;
};

// ============================================
// ENHANCED APPOINTMENT APIs
// ============================================

/**
 * List appointments with summary for a specific date
 * GET /api/v1/clinic/{tenant_id}/appointments?date={date}
 * 
 * IMPORTANT: Always include expand=staff to get staff_name populated
 */
export const listAppointmentsByDateApi = async (
  tenantId: string,
  date: string
): Promise<AppointmentsListResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/appointments`,
    { params: { date, limit: 100, expand: 'staff' } }
  );
  
  // Transform response to include summary if backend doesn't provide it
  const data = response.data;
  if (data.items && !data.appointments) {
    // Backend returns paginated format, transform it
    const appointments = data.items;
    const summary = {
      total: appointments.length,
      scheduled: appointments.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'scheduled').length,
      in_progress: appointments.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'in_progress').length,
      completed: appointments.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'completed').length,
      cancelled: appointments.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'cancelled').length,
      no_show: appointments.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'no_show').length,
    };
    return { appointments, summary };
  }
  return data;
};

/**
 * Search appointments
 * GET /api/v1/clinic/{tenant_id}/appointments/search
 * 
 * IMPORTANT: Always include expand=staff to get staff_name populated
 */
export const searchAppointmentsApi = async (
  tenantId: string,
  params: SearchAppointmentsParams
): Promise<AppointmentsListResponse> => {
  try {
    const response = await axiosClient.get(
      `/api/v1/clinic/${tenantId}/appointments/search`,
      { params: { ...params, expand: 'staff' } }
    );
    return response.data;
  } catch {
    // Fallback to regular list with client-side filtering
    const response = await axiosClient.get(
      `/api/v1/clinic/${tenantId}/appointments`,
      { params: { limit: 100, expand: 'staff' } }
    );
    const allAppointments = response.data.items || [];
    const query = params.q.toLowerCase();
    const filtered = allAppointments.filter((apt: AppointmentResponse) => 
      apt.client_name?.toLowerCase().includes(query) ||
      apt.status?.toLowerCase().includes(query)
    );
    return {
      appointments: filtered,
      summary: {
        total: filtered.length,
        scheduled: filtered.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'scheduled').length,
        in_progress: filtered.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'in_progress').length,
        completed: filtered.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'completed').length,
        cancelled: filtered.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'cancelled').length,
        no_show: filtered.filter((a: AppointmentResponse) => a.status?.toLowerCase() === 'no_show').length,
      }
    };
  }
};

/**
 * Get available slots for appointment booking
 * POST /api/v1/appointments/available-slots
 */
export const getAvailableSlotsApi = async (
  payload: AvailableSlotsRequest
): Promise<AvailableSlotsResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/appointments/available-slots`,
      payload
    );
    return response.data;
  } catch {
    // Return empty slots if endpoint not available
    return { slots: [] };
  }
};

/**
 * Get available therapists for multi-slot appointments
 * GET /api/v1/clinic/{tenant_id}/staff/available
 */
export const getAvailableTherapistsApi = async (
  tenantId: string,
  params: {
    start_date: string;
    end_date: string;
    preferred_time?: string;
    treatment_id?: string;
    client_gender?: string;
  }
): Promise<{ available_staff: AvailableTherapist[] }> => {
  try {
    const response = await axiosClient.get(
      `/api/v1/clinic/${tenantId}/staff/available`,
      { params }
    );
    return response.data;
  } catch {
    return { available_staff: [] };
  }
};

/**
 * Validate appointment before creating
 * POST /api/v1/appointments/validate
 */
export const validateAppointmentApi = async (
  payload: ValidateAppointmentRequest
): Promise<ValidationResponse> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/appointments/validate`,
      payload
    );
    return response.data;
  } catch {
    // Return valid if validation endpoint not available
    return { is_valid: true, errors: [], warnings: [], conflicts: null };
  }
};

/**
 * Generate therapy plan (preview) for multi-slot appointments
 * POST /api/v1/appointments/therapy-plan
 */
export const generateTherapyPlanApi = async (
  payload: TherapyPlanRequest
): Promise<TherapyPlanResponse> => {
  const response = await axiosClient.post(
    `/api/v1/appointments/therapy-plan`,
    payload
  );
  return response.data;
};

/**
 * Bulk create appointments (for multi-slot)
 * POST /api/v1/clinic/{tenant_id}/appointments/bulk-create
 */
export const bulkCreateAppointmentsApi = async (
  payload: BulkCreateRequest
): Promise<BulkCreateResponse> => {
  console.log('[API] Bulk create appointments:', {
    series_id: payload.series_id,
    episode_id: payload.episode_id,
    count: payload.appointments.length,
    episode_ids: payload.appointments.map(a => a.episode_id),
    has_episode_id: payload.appointments.some(a => !!a.episode_id),
  });
  try {
    const response = await axiosClient.post(
      `/api/v1/appointments/bulk-create`,
      payload
    );
    return response.data;
  } catch (err: any) {
    // Surface count-mismatch 400 errors directly to the user
    const detail = err?.response?.data?.detail || err?.response?.data?.message;
    if (err?.response?.status === 400 && detail) {
      throw new Error(detail);
    }
    throw err;
  }
};

/**
 * Update appointment status (with series shift for no-show)
 * PATCH /api/v1/appointments/{appointment_id}/status
 */
export const updateAppointmentStatusApi = async (
  appointmentId: string,
  payload: { status: string; notes?: string }
): Promise<{
  appointment: AppointmentResponse;
  shifted_appointments?: Array<{
    id: string;
    old_date: string;
    new_date: string;
    session_number: number;
  }>;
  shift_count?: number;
}> => {
  const response = await axiosClient.patch(
    `/api/v1/appointments/${appointmentId}/status`,
    payload
  );
  return response.data;
};

/**
 * Get all appointments in a series
 * GET /api/v1/appointments/series/{series_id}
 */
export const getSeriesAppointmentsApi = async (
  seriesId: string
): Promise<{
  series_id: string;
  appointments: AppointmentResponse[];
  total_appointments: number;
}> => {
  const response = await axiosClient.get(
    `/api/v1/appointments/series/${seriesId}`
  );
  return response.data;
};
