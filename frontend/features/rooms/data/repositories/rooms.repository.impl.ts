/**
 * Rooms Repository Implementation
 * React Query hooks for room management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listRoomsApi,
  getRoomApi,
  createRoomApi,
  updateRoomApi,
  deleteRoomApi,
} from '../datasources/rooms.api';
import {
  RoomCreate,
  RoomUpdate,
  RoomResponse,
  ListRoomsParams,
  PaginatedRoomsResponse,
} from '../models/rooms.dtos';
import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';

// ============================================
// QUERY KEYS
// ============================================

export const roomsKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomsKeys.all, 'list'] as const,
  list: (tenantId: string, params?: ListRoomsParams) =>
    [...roomsKeys.lists(), tenantId, params] as const,
  details: () => [...roomsKeys.all, 'detail'] as const,
  detail: (tenantId: string, roomId: string) =>
    [...roomsKeys.details(), tenantId, roomId] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to list rooms for a tenant
 */
export const useRoomsListQuery = (
  tenantId: string,
  params?: ListRoomsParams,
  options?: Omit<UseQueryOptions<PaginatedRoomsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedRoomsResponse, Error>({
    queryKey: roomsKeys.list(tenantId, params),
    queryFn: () => listRoomsApi(tenantId, params),
    enabled: !!tenantId,
    ...options,
  });
};

/**
 * Hook to get a single room
 */
export const useRoomDetailQuery = (
  tenantId: string,
  roomId: string,
  options?: Omit<UseQueryOptions<RoomResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RoomResponse, Error>({
    queryKey: roomsKeys.detail(tenantId, roomId),
    queryFn: () => getRoomApi(tenantId, roomId),
    enabled: !!tenantId && !!roomId,
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a room
 */
export const useCreateRoomMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<RoomResponse, Error, RoomCreate>({
    mutationFn: (payload) => createRoomApi(tenantId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to update a room
 */
export const useUpdateRoomMutation = (tenantId: string, roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation<RoomResponse, Error, RoomUpdate>({
    mutationFn: (payload) => updateRoomApi(tenantId, roomId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(roomsKeys.detail(tenantId, roomId), data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};

/**
 * Hook to delete a room
 */
export const useDeleteRoomMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (roomId) => deleteRoomApi(tenantId, roomId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKeys.lists() }),
        invalidateCanonicalOnboardingState(queryClient, tenantId),
      ]);
    },
  });
};
