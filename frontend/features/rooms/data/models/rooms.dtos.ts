/**
 * Rooms DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

/** Room type options */
export const ROOM_TYPES = [
  { value: 'therapy', label: 'Therapy Room', icon: 'fitness' },
  { value: 'consultation', label: 'Consultation Room', icon: 'chatbubbles' },
  { value: 'examination', label: 'Examination Room', icon: 'medical' },
  { value: 'treatment', label: 'Treatment Room', icon: 'bandage' },
  { value: 'procedure', label: 'Procedure Room', icon: 'medkit' },
] as const;

export type RoomType = 'therapy' | 'consultation' | 'examination' | 'treatment' | 'procedure';

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create a room */
export interface RoomCreate {
  name: string;
  capacity?: number; // Default: 1
  room_type?: RoomType | null;
}

/** Request to update a room */
export interface RoomUpdate {
  name?: string | null;
  capacity?: number | null;
  room_type?: RoomType | null;
  is_active?: boolean | null;
}

/** Parameters for listing rooms */
export interface ListRoomsParams {
  is_active?: boolean;
  room_type?: RoomType;
  skip?: number;
  limit?: number;
  lang?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Response for a room */
export interface RoomResponse {
  id: string;
  tenant_id: string;
  name: string;
  capacity: number;
  room_type: RoomType | null;
  is_active: boolean;
  created_at: string;
}

/** Paginated response for rooms */
export interface PaginatedRoomsResponse {
  items: RoomResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Legacy onboarding room shape accepted by the setup form. */
export interface OnboardingRoomSourceItem {
  id?: string | null;
  name?: string | null;
  room_type?: string | null;
  type?: string | null;
  capacity?: number | string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get room type label */
export const getRoomTypeLabel = (roomType: RoomType | null): string => {
  if (!roomType) return 'General';
  return ROOM_TYPES.find(r => r.value === roomType)?.label || roomType;
};

/** Get room type icon */
export const getRoomTypeIcon = (roomType: RoomType | null): string => {
  if (!roomType) return 'cube';
  return ROOM_TYPES.find(r => r.value === roomType)?.icon || 'cube';
};
