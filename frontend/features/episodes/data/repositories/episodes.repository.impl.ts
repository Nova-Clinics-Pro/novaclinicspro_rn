/**
 * Episodes Repository Implementation
 * React Query hooks for episode management
 */

import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  useInfiniteQuery,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import {
  listEpisodesApi,
  getEpisodeApi,
  getEpisodeDetailsApi,
  createEpisodeApi,
  updateEpisodeApi,
  closeEpisodeApi,
  reopenEpisodeApi,
  attachEpisodeToAppointmentApi,
  getClientEpisodeCountsApi,
  ListEpisodesParams,
} from '../datasources/episodes.api';
import {
  Episode,
  EpisodesListResponse,
  EpisodeDetailsResponse,
  EpisodeCreateRequest,
  EpisodeUpdateRequest,
  AttachEpisodeRequest,
  CloseEpisodeRequest,
  EpisodeStatus,
} from '../models/episodes.dtos';

// ============================================
// QUERY KEYS
// ============================================

export const episodesKeys = {
  all: ['episodes'] as const,
  lists: () => [...episodesKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListEpisodesParams) => {
    // Ensure params is serialized correctly for query key
    const serializedParams = params ? JSON.parse(JSON.stringify(params)) : undefined;
    return [...episodesKeys.lists(), tenantId, serializedParams] as const;
  },
  clientEpisodes: (tenantId: string, clientId: string, status?: EpisodeStatus) =>
    ['client-episodes', tenantId, clientId, status] as const,
  clientEpisodeCounts: (tenantId: string, clientIds: string[]) =>
    [...episodesKeys.all, 'client-counts', tenantId, clientIds] as const,
  details: () => [...episodesKeys.all, 'detail'] as const,
  detail: (tenantId: string, episodeId: string) =>
    ['episode', tenantId, episodeId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list episodes for a tenant
 * 
 * @param tenantId - Tenant identifier
 * @param params - Query parameters (client_id, status, skip, limit)
 * @param options - React Query options
 * @returns Query result with episodes list
 */
export const useEpisodesQuery = (
  tenantId: string,
  params?: ListEpisodesParams,
  options?: Omit<UseQueryOptions<EpisodesListResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const defaultEnabled = !!tenantId && tenantId !== 'undefined';
  const finalEnabled = options?.enabled !== undefined ? options.enabled && defaultEnabled : defaultEnabled;
  
  // Log when query is called with invalid tenantId
  if (!tenantId || tenantId === 'undefined') {
    console.error('[useEpisodesQuery] Called with invalid tenantId:', tenantId);
    console.error('[useEpisodesQuery] Stack:', new Error().stack);
  }
  
  return useQuery<EpisodesListResponse, Error>({
    queryKey: episodesKeys.list(tenantId, params),
    queryFn: () => listEpisodesApi(tenantId, params),
    ...options,
    enabled: finalEnabled,
  });
};

/**
 * Read client episode counts for dashboard appointment cards.
 *
 * The sorted, de-duplicated identifier list gives React Query a stable,
 * tenant-scoped identity while preserving the existing five-minute cache.
 */
export const useClientEpisodeCountsQuery = (
  tenantId: string,
  clientIds: string[],
  options?: Omit<UseQueryOptions<Record<string, number>, Error>, 'queryKey' | 'queryFn'>
) => {
  const normalizedClientIds = [...new Set(clientIds)].sort();
  const defaultEnabled = !!tenantId && tenantId !== 'undefined' && normalizedClientIds.length > 0;
  const finalEnabled = options?.enabled !== undefined ? options.enabled && defaultEnabled : defaultEnabled;

  return useQuery<Record<string, number>, Error>({
    queryKey: episodesKeys.clientEpisodeCounts(tenantId, normalizedClientIds),
    queryFn: () => getClientEpisodeCountsApi(tenantId, normalizedClientIds),
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: finalEnabled,
  });
};

/**
 * Hook to list episodes with infinite scroll/pagination
 * 
 * Uses offset-based pagination with skip/limit.
 * Each page returns { items, total, skip, limit }.
 * 
 * @param tenantId - Tenant identifier
 * @param params - Query parameters (client_id, status, limit)
 * @param options - React Query infinite options
 * @returns Infinite query result with paginated episodes
 */
export const useInfiniteEpisodesQuery = (
  tenantId: string,
  params?: Omit<ListEpisodesParams, 'skip'>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnMount?: boolean | 'always';
    refetchOnWindowFocus?: boolean | 'always';
    refetchOnReconnect?: boolean | 'always';
  }
) => {
  const limit = params?.limit || 20;
  
  console.log('[useInfiniteEpisodesQuery] Input params:', params);
  console.log('[useInfiniteEpisodesQuery] tenantId:', tenantId);
  
  // Build clean params object, filtering out undefined values
  const baseParams: Partial<ListEpisodesParams> = {};
  if (params?.client_id) baseParams.client_id = params.client_id;
  if (params?.status) baseParams.status = params.status;
  baseParams.limit = limit;
  
  console.log('[useInfiniteEpisodesQuery] Base params:', baseParams);
  
  const defaultEnabled = !!tenantId && tenantId !== 'undefined';
  const finalEnabled = options?.enabled !== undefined ? options.enabled && defaultEnabled : defaultEnabled;
  
  return useInfiniteQuery<EpisodesListResponse, Error>({
    queryKey: episodesKeys.list(tenantId, baseParams as ListEpisodesParams),
    queryFn: ({ pageParam = 0 }) => {
      const queryParams: ListEpisodesParams = {
        ...baseParams,
        skip: pageParam as number,
      };
      console.log('[useInfiniteEpisodesQuery] Query params for page:', queryParams);
      return listEpisodesApi(tenantId, queryParams);
    },
    getNextPageParam: (lastPage) => {
      // If we got fewer items than the limit, we're at the end
      if (lastPage.items.length < limit) {
        return undefined;
      }
      // Return next skip value
      return lastPage.skip + lastPage.limit;
    },
    initialPageParam: 0,
    enabled: finalEnabled,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
  });
};

/**
 * Hook to get a single episode by ID
 * 
 * @param tenantId - Tenant identifier
 * @param episodeId - Episode identifier
 * @param options - React Query options (use enabled: false to disable auto-fetch)
 * @returns Query result with episode details
 */
export const useEpisodeQuery = (
  tenantId: string,
  episodeId: string,
  options?: Omit<UseQueryOptions<Episode, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Episode, Error>({
    queryKey: episodesKeys.detail(tenantId, episodeId),
    queryFn: () => getEpisodeApi(tenantId, episodeId),
    enabled: !!tenantId && !!episodeId,
    ...options,
  });
};

/**
 * Hook to get comprehensive episode details
 * 
 * Fetches episode with documents (casesheet, treatment sheet) and visits
 * (appointments with prescriptions and payments)
 * 
 * @param tenantId - Tenant identifier
 * @param episodeId - Episode identifier
 * @param options - React Query options
 * @returns Query result with comprehensive episode details
 */
export const useEpisodeDetailsQuery = (
  tenantId: string,
  episodeId: string,
  options?: Omit<UseQueryOptions<EpisodeDetailsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<EpisodeDetailsResponse, Error>({
    queryKey: [...episodesKeys.detail(tenantId, episodeId), 'details'],
    queryFn: () => getEpisodeDetailsApi(tenantId, episodeId),
    enabled: !!tenantId && !!episodeId,
    staleTime: 0,
    refetchOnMount: 'always',
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new episode
 * 
 * Automatically invalidates:
 * - All episode lists
 * - Client episodes queries
 * - Appointment queries (if appointment_id provided)
 * 
 * @returns Mutation hook for creating episodes
 */
export const useCreateEpisodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Episode, Error, { tenantId: string; data: EpisodeCreateRequest }>({
    mutationFn: ({ tenantId, data }) => createEpisodeApi(tenantId, data),
    onSuccess: (episode, { tenantId, data }) => {
      // Invalidate episode lists
      queryClient.invalidateQueries({ queryKey: episodesKeys.lists() });
      
      // Invalidate client episodes
      queryClient.invalidateQueries({ 
        queryKey: ['client-episodes', tenantId, data.client_id] 
      });
      
      // If created from appointment, invalidate appointment queries
      if (data.appointment_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['appointment', tenantId, data.appointment_id] 
        });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        
        // Invalidate dashboard queries to refresh appointment cards
        queryClient.invalidateQueries({ queryKey: ['staffDashboards'] });
      }
      
      // Set the new episode in cache
      queryClient.setQueryData(
        episodesKeys.detail(tenantId, episode.id),
        episode
      );
    },
  });
};

/**
 * Hook to update an existing episode
 * 
 * Automatically invalidates:
 * - The specific episode detail
 * - All episode lists
 * 
 * @returns Mutation hook for updating episodes
 */
export const useUpdateEpisodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Episode,
    Error,
    { tenantId: string; episodeId: string; data: EpisodeUpdateRequest }
  >({
    mutationFn: ({ tenantId, episodeId, data }) =>
      updateEpisodeApi(tenantId, episodeId, data),
    onSuccess: (episode, { tenantId, episodeId }) => {
      // Update the episode in cache
      queryClient.setQueryData(
        episodesKeys.detail(tenantId, episodeId),
        episode
      );
      
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: episodesKeys.lists() });
    },
  });
};

/**
 * Hook to close an active episode
 * 
 * Automatically invalidates:
 * - The specific episode detail
 * - All episode lists
 * 
 * @returns Mutation hook for closing episodes
 */
export const useCloseEpisodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Episode,
    Error,
    { tenantId: string; episodeId: string; notes?: string }
  >({
    mutationFn: ({ tenantId, episodeId, notes }) =>
      closeEpisodeApi(tenantId, episodeId, notes ? { notes } : undefined),
    onSuccess: (episode, { tenantId, episodeId }) => {
      // Update the episode in cache with new status
      queryClient.setQueryData(
        episodesKeys.detail(tenantId, episodeId),
        episode
      );
      
      // Invalidate lists to reflect status change
      queryClient.invalidateQueries({ queryKey: episodesKeys.lists() });
    },
  });
};

/**
 * Hook to reopen a closed episode
 * 
 * Automatically invalidates:
 * - The specific episode detail
 * - All episode lists
 * 
 * @returns Mutation hook for reopening episodes
 */
export const useReopenEpisodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Episode,
    Error,
    { tenantId: string; episodeId: string }
  >({
    mutationFn: ({ tenantId, episodeId }) =>
      reopenEpisodeApi(tenantId, episodeId),
    onSuccess: (episode, { tenantId, episodeId }) => {
      // Update the episode in cache with new status
      queryClient.setQueryData(
        episodesKeys.detail(tenantId, episodeId),
        episode
      );
      
      // Invalidate lists to reflect status change
      queryClient.invalidateQueries({ queryKey: episodesKeys.lists() });
    },
  });
};

/**
 * Hook to attach an appointment to an episode
 * 
 * Automatically invalidates:
 * - The specific appointment
 * - All appointment lists
 * - The specific episode (to update visits_count, last_visit_date)
 * - All episode lists
 * 
 * @returns Mutation hook for attaching episodes to appointments
 */
export const useAttachEpisodeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { tenantId: string; appointmentId: string; episodeId: string }
  >({
    mutationFn: ({ tenantId, appointmentId, episodeId }) =>
      attachEpisodeToAppointmentApi(tenantId, appointmentId, { episode_id: episodeId }),
    onSuccess: (_, { tenantId, appointmentId, episodeId }) => {
      // Invalidate appointment queries
      queryClient.invalidateQueries({ 
        queryKey: ['appointment', tenantId, appointmentId] 
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Invalidate dashboard queries to refresh appointment cards
      queryClient.invalidateQueries({ queryKey: ['staffDashboards'] });
      
      // Invalidate episode queries (visits_count and last_visit_date may change)
      queryClient.invalidateQueries({ 
        queryKey: episodesKeys.detail(tenantId, episodeId) 
      });
      queryClient.invalidateQueries({ queryKey: episodesKeys.lists() });
    },
  });
};
