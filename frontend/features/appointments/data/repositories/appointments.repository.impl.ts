/**
 * Appointments Repository Implementation
 * React Query hooks for appointment management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listAppointmentsApi,
  getAppointmentApi,
  createAppointmentApi,
  updateAppointmentApi,
  deleteAppointmentApi,
  cancelAppointmentApi,
  rescheduleAppointmentApi,
  listAppointmentsByDateApi,
  searchAppointmentsApi,
  getAvailableSlotsApi,
  getAvailableTherapistsApi,
  validateAppointmentApi,
  generateTherapyPlanApi,
  bulkCreateAppointmentsApi,
  updateAppointmentStatusApi,
  getSeriesAppointmentsApi,
} from '../datasources/appointments.api';
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
import { AppointmentCreationError } from '../../domain/errors/appointmentCreationError';

export { AppointmentCreationError } from '../../domain/errors/appointmentCreationError';

// ============================================
// QUERY KEYS
// ============================================

export const appointmentsKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentsKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListAppointmentsParams) =>
    [...appointmentsKeys.lists(), tenantId, params] as const,
  byDate: (tenantId: string, date: string) =>
    [...appointmentsKeys.lists(), tenantId, 'date', date] as const,
  search: (tenantId: string, params: SearchAppointmentsParams) =>
    [...appointmentsKeys.lists(), tenantId, 'search', params] as const,
  details: () => [...appointmentsKeys.all, 'detail'] as const,
  detail: (tenantId: string, appointmentId: string) =>
    [...appointmentsKeys.details(), tenantId, appointmentId] as const,
  series: (seriesId: string) =>
    [...appointmentsKeys.all, 'series', seriesId] as const,
  availableSlots: (params: AvailableSlotsRequest) =>
    [...appointmentsKeys.all, 'slots', params] as const,
  availableTherapists: (tenantId: string, params: Record<string, string>) =>
    [...appointmentsKeys.all, 'therapists', tenantId, params] as const,
};

/**
 * Canonical tenant-scoped appointment-detail command.
 *
 * Non-React application orchestration uses this alongside
 * `appointmentsKeys.detail`; presentation continues to use the query hook
 * below. Keeping both paths here prevents application code from reaching into
 * the datasource or central client directly.
 */
export const getAppointmentDetail = (
  tenantId: string,
  appointmentId: string,
): Promise<AppointmentResponse> => getAppointmentApi(tenantId, appointmentId);

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list appointments for a tenant
 */
export const useAppointmentsListQuery = (
  tenantId: string,
  params?: ListAppointmentsParams,
  options?: Omit<UseQueryOptions<PaginatedAppointmentsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedAppointmentsResponse, Error>({
    queryKey: appointmentsKeys.list(tenantId, params),
    queryFn: () => listAppointmentsApi(tenantId, params),
    enabled: !!tenantId,
    ...options,
  });
};

/**
 * Hook to list appointments by date with summary
 */
export const useAppointmentsByDateQuery = (
  tenantId: string,
  date: string,
  options?: Omit<UseQueryOptions<AppointmentsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentsListResponse, Error>({
    queryKey: appointmentsKeys.byDate(tenantId, date),
    queryFn: () => listAppointmentsByDateApi(tenantId, date),
    enabled: !!tenantId && !!date,
    staleTime: 30000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to search appointments
 */
export const useSearchAppointmentsQuery = (
  tenantId: string,
  params: SearchAppointmentsParams,
  options?: Omit<UseQueryOptions<AppointmentsListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentsListResponse, Error>({
    queryKey: appointmentsKeys.search(tenantId, params),
    queryFn: () => searchAppointmentsApi(tenantId, params),
    enabled: !!tenantId && params.q.length >= 3,
    staleTime: 30000,
    ...options,
  });
};

/**
 * Hook to get a single appointment
 */
export const useAppointmentDetailQuery = (
  tenantId: string,
  appointmentId: string,
  options?: Omit<UseQueryOptions<AppointmentResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AppointmentResponse, Error>({
    queryKey: appointmentsKeys.detail(tenantId, appointmentId),
    queryFn: () => getAppointmentDetail(tenantId, appointmentId),
    enabled: !!tenantId && !!appointmentId,
    ...options,
  });
};

/**
 * Hook to get available slots
 */
export const useAvailableSlotsQuery = (
  params: AvailableSlotsRequest,
  options?: Omit<UseQueryOptions<AvailableSlotsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<AvailableSlotsResponse, Error>({
    queryKey: appointmentsKeys.availableSlots(params),
    queryFn: () => getAvailableSlotsApi(params),
    enabled: !!params.start_date && !!params.end_date,
    staleTime: 60000, // 1 minute
    ...options,
  });
};

/**
 * Hook to get available therapists for multi-slot
 */
export const useAvailableTherapistsQuery = (
  tenantId: string,
  params: {
    start_date: string;
    end_date: string;
    preferred_time?: string;
    treatment_id?: string;
    client_gender?: string;
  },
  options?: Omit<UseQueryOptions<{ available_staff: AvailableTherapist[] }, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<{ available_staff: AvailableTherapist[] }, Error>({
    queryKey: appointmentsKeys.availableTherapists(tenantId, params as Record<string, string>),
    queryFn: () => getAvailableTherapistsApi(tenantId, params),
    enabled: !!tenantId && !!params.start_date && !!params.end_date,
    staleTime: 60000,
    ...options,
  });
};

/**
 * Hook to get series appointments
 */
export const useSeriesAppointmentsQuery = (
  seriesId: string,
  options?: Omit<UseQueryOptions<{ series_id: string; appointments: AppointmentResponse[]; total_appointments: number }, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: appointmentsKeys.series(seriesId),
    queryFn: () => getSeriesAppointmentsApi(seriesId),
    enabled: !!seriesId,
    ...options,
  });
};

/**
 * Hook to get appointments for an episode
 * Alias for useAppointmentsListQuery with episode_id filter
 */
export const useEpisodeAppointmentsQuery = (
  tenantId: string,
  episodeId: string | null,
  options?: Omit<UseQueryOptions<PaginatedAppointmentsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useAppointmentsListQuery(
    tenantId,
    episodeId ? { episode_id: episodeId, limit: 100 } : undefined,
    {
      ...options,
      enabled: !!tenantId && !!episodeId && (options?.enabled !== false),
    }
  );
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create an appointment
 */
export const useCreateAppointmentMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<AppointmentResponse, AppointmentCreationError, AppointmentCreate>({
    mutationFn: (payload) => createAppointmentApi(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};

/**
 * Hook to update an appointment
 */
export const useUpdateAppointmentMutation = (tenantId: string, appointmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation<AppointmentResponse, Error, AppointmentUpdate>({
    mutationFn: (payload) => updateAppointmentApi(tenantId, appointmentId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(appointmentsKeys.detail(tenantId, appointmentId), data);
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};

/**
 * Hook to delete an appointment
 */
export const useDeleteAppointmentMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (appointmentId) => deleteAppointmentApi(tenantId, appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};

/**
 * Hook to cancel an appointment
 * BUG FIX #8: Added optimistic updates for faster UI response
 */
export const useCancelAppointmentMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  type QueryData = [readonly unknown[], unknown];
  
  return useMutation<AppointmentResponse, Error, string, { previousQueries: QueryData[] }>({
    mutationFn: (appointmentId) => cancelAppointmentApi(tenantId, appointmentId),
    onMutate: async (appointmentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentsKeys.lists() });
      
      // Snapshot the previous value
      const previousQueries = queryClient.getQueriesData({ queryKey: appointmentsKeys.lists() }) as QueryData[];
      
      // Optimistically update to 'cancelled' status
      queryClient.setQueriesData(
        { queryKey: appointmentsKeys.lists() },
        (old: any) => {
          if (!old) return old;
          
          if (old.appointments) {
            return {
              ...old,
              appointments: old.appointments.map((apt: any) =>
                apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
              ),
            };
          }
          
          if (old.items) {
            return {
              ...old,
              items: old.items.map((apt: any) =>
                apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
              ),
            };
          }
          
          return old;
        }
      );
      
      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(appointmentsKeys.detail(tenantId, data.id), data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};

/**
 * Hook to reschedule an appointment
 * Supports two usage patterns:
 * 1. useRescheduleAppointmentMutation() - pass tenantId, appointmentId, newStart, newEnd in mutate
 * 2. useRescheduleAppointmentMutation(tenantId, appointmentId) - pass only new date in mutate
 */
export function useRescheduleAppointmentMutation(): ReturnType<typeof useMutation<AppointmentRescheduleResponse, Error, { tenantId: string; appointmentId: string; newStart: string; newEnd?: string }>>;
export function useRescheduleAppointmentMutation(tenantId: string, appointmentId: string): ReturnType<typeof useMutation<AppointmentRescheduleResponse, Error, { new_start: string; new_end?: string }>>;
export function useRescheduleAppointmentMutation(tenantId?: string, appointmentId?: string) {
  const queryClient = useQueryClient();

  // If tenantId and appointmentId are provided, use the legacy signature
  if (tenantId && appointmentId) {
    return useMutation<AppointmentRescheduleResponse, Error, { new_start: string; new_end?: string }>({
      mutationFn: (payload) => {
        return rescheduleAppointmentApi(tenantId, appointmentId, payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
        queryClient.invalidateQueries({ queryKey: appointmentsKeys.detail(tenantId, appointmentId) });
      },
    });
  }

  // New signature: pass everything in mutate call
  return useMutation<AppointmentRescheduleResponse, Error, { tenantId: string; appointmentId: string; newStart: string; newEnd?: string }>({
    mutationFn: ({ tenantId: tid, appointmentId: aid, newStart, newEnd }) => {
      return rescheduleAppointmentApi(tid, aid, { 
        new_start: newStart, 
        new_end: newEnd,
        appointment_start: newStart 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
}

/**
 * Hook to validate appointment
 */
export const useValidateAppointmentMutation = () => {
  return useMutation<ValidationResponse, Error, ValidateAppointmentRequest>({
    mutationFn: (payload) => validateAppointmentApi(payload),
  });
};

/**
 * Hook to generate therapy plan (preview)
 */
export const useGenerateTherapyPlanMutation = () => {
  return useMutation<TherapyPlanResponse, Error, TherapyPlanRequest>({
    mutationFn: (payload) => generateTherapyPlanApi(payload),
  });
};

/**
 * Hook to bulk create appointments
 */
export const useBulkCreateAppointmentsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<BulkCreateResponse, Error, BulkCreateRequest>({
    mutationFn: (payload) => bulkCreateAppointmentsApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};

/**
 * Hook to update appointment status (with series shift support)
 * BUG FIX #8: Added optimistic updates for faster UI response
 */
export const useUpdateAppointmentStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, status, notes }: { appointmentId: string; status: string; notes?: string }) =>
      updateAppointmentStatusApi(appointmentId, { status, notes }),
    onMutate: async ({ appointmentId, status }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: appointmentsKeys.lists() });
      
      // Snapshot the previous value for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: appointmentsKeys.lists() });
      
      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: appointmentsKeys.lists() },
        (old: any) => {
          if (!old) return old;
          
          // Update appointments array if it exists
          if (old.appointments) {
            return {
              ...old,
              appointments: old.appointments.map((apt: any) =>
                apt.id === appointmentId ? { ...apt, status: status.toLowerCase() } : apt
              ),
            };
          }
          
          // Update items array if paginated
          if (old.items) {
            return {
              ...old,
              items: old.items.map((apt: any) =>
                apt.id === appointmentId ? { ...apt, status: status.toLowerCase() } : apt
              ),
            };
          }
          
          return old;
        }
      );
      
      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.lists() });
    },
  });
};
