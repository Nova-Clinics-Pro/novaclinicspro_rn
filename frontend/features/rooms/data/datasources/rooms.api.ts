/**
 * Rooms API
 * Handles all HTTP calls for room management
 * 
 * IMPORTANT: All paths must start with /api/v1/...
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import {
  RoomCreate,
  RoomUpdate,
  RoomResponse,
  ListRoomsParams,
  PaginatedRoomsResponse,
  OnboardingRoomSourceItem,
} from '../models/rooms.dtos';

const normalizeOnboardingRooms = (data: any): OnboardingRoomSourceItem[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/**
 * Read rooms for the legacy onboarding form.
 *
 * The historical treatment-rooms endpoint is attempted only when the canonical
 * rooms endpoint returns 404. Other failures remain failures.
 */
export const listOnboardingRoomsApi = async (
  tenantId: string
): Promise<OnboardingRoomSourceItem[]> => {
  try {
    const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/rooms`);
    return normalizeOnboardingRooms(response.data);
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    const response = await axiosClient.get(
      `/api/v1/clinic/${tenantId}/treatment-rooms`
    );
    return normalizeOnboardingRooms(response.data);
  }
};

/**
 * List rooms for a tenant
 * GET /api/v1/clinic/{tenant_id}/rooms
 */
export const listRoomsApi = async (
  tenantId: string,
  params?: ListRoomsParams
): Promise<PaginatedRoomsResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/rooms`,
    { params }
  );
  return response.data;
};

/**
 * Get a single room
 * GET /api/v1/clinic/{tenant_id}/rooms/{room_id}
 */
export const getRoomApi = async (
  tenantId: string,
  roomId: string
): Promise<RoomResponse> => {
  const response = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/rooms/${roomId}`
  );
  return response.data;
};

/**
 * Create a room
 * POST /api/v1/clinic/{tenant_id}/rooms
 */
export const createRoomApi = async (
  tenantId: string,
  payload: RoomCreate
): Promise<RoomResponse> => {
  const response = await axiosClient.post(
    `/api/v1/clinic/${tenantId}/rooms`,
    payload
  );
  return response.data;
};

/**
 * Update a room
 * PATCH /api/v1/clinic/{tenant_id}/rooms/{room_id}
 */
export const updateRoomApi = async (
  tenantId: string,
  roomId: string,
  payload: RoomUpdate
): Promise<RoomResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/clinic/${tenantId}/rooms/${roomId}`,
    payload
  );
  return response.data;
};

/**
 * Delete a room
 * DELETE /api/v1/clinic/{tenant_id}/rooms/{room_id}
 */
export const deleteRoomApi = async (
  tenantId: string,
  roomId: string
): Promise<void> => {
  await axiosClient.delete(
    `/api/v1/clinic/${tenantId}/rooms/${roomId}`
  );
};
