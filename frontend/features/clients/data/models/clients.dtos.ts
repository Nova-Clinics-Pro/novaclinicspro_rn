/**
 * Clients DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create a client */
export interface ClientCreate {
  full_name: string;
  gender: string; // Required
  age?: number | null; // Optional: calculated from date_of_birth when that is given
  phone?: string | null;
  mobile_code?: string;
  alt_mobile?: string | null;
  alt_mobile_code?: string | null;
  email?: string | null;
  date_of_birth?: string | null; // ISO date
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  occupation?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  external_ref?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
}

/** Request to update a client */
export interface ClientUpdate {
  full_name?: string | null;
  phone?: string | null;
  mobile_code?: string | null;
  alt_mobile?: string | null;
  alt_mobile_code?: string | null;
  email?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  occupation?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  medical_history?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  external_ref?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, any> | null;
}

/** Parameters for listing clients */
export interface ListClientsParams {
  search?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Response for a client */
export interface ClientResponse {
  id: string;
  tenant_id: string;
  external_ref: string | null;
  full_name: string;
  phone: string | null;
  mobile_code: string;
  alt_mobile: string | null;
  alt_mobile_code: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  age: number | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  occupation: string | null;
  blood_group: string | null;
  allergies: string | null;
  medical_history: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  metadata_: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/** Paginated response for clients */
export interface PaginatedClientsResponse {
  items: ClientResponse[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Format date for display */
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/** Calculate age from date of birth */
export const calculateAge = (dateOfBirth: string | null): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/** Get gender color */
export const getGenderColor = (gender: string | null): string => {
  switch (gender?.toLowerCase()) {
    case 'male':
      return '#3B82F6'; // Blue
    case 'female':
      return '#EC4899'; // Pink
    default:
      return '#8B5CF6'; // Purple
  }
};

/** Format phone with country code */
export const formatPhone = (phone: string | null, code: string = '+91'): string => {
  if (!phone) return '—';
  return `${code} ${phone}`;
};

/** Blood group options */
export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'
];

/** Gender options */
export const GENDERS = ['Male', 'Female', 'Other'];
