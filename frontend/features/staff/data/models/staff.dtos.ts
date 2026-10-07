/**
 * Staff DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// ============================================
// ENUMS & TYPES
// ============================================

/** Staff type enum matching backend */
export type StaffType =
  | 'doctor'
  | 'therapist'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'physiotherapist'
  | 'dentist'
  | 'admin';

/** Leave type enum */
export type LeaveType = 'SICK' | 'CASUAL' | 'VACATION' | 'PERSONAL' | 'OTHER';

/** Leave status enum */
export type LeaveStatus = 'PENDING' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** Gender options */
export type Gender = 'Male' | 'Female' | 'Other';

// ============================================
// REQUEST DTOs
// ============================================

/** Request to create a staff member */
export interface StaffCreate {
  full_name: string;
  requires_login: boolean;
  phone: string;
  gender: string;
  staff_type: StaffType;
  email?: string | null;
  date_of_birth?: string | null; // ISO date
  staff_code?: string | null;
  designation?: string | null;
  // Professional details
  specialization?: string | null;
  qualifications?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  hourly_rate?: number | null;
  // Address fields (detailed)
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pin?: string | null;
  // Emergency contact (detailed)
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  // Employment dates
  employment_start_date?: string | null; // ISO date
  employment_end_date?: string | null; // ISO date
  metadata?: Record<string, any> | null;
}

/** Request to update a staff member */
export interface StaffUpdate {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  staff_type?: StaffType | null;
  staff_code?: string | null;
  designation?: string | null;
  // Professional details
  specialization?: string | null;
  qualifications?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  hourly_rate?: number | null;
  // Address fields (detailed)
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pin?: string | null;
  // Emergency contact (detailed)
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  // Employment dates
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  is_active?: boolean | null;
  metadata?: Record<string, any> | null;
}

/** Request to create a leave request */
export interface StaffLeaveCreate {
  leave_type: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  start_time?: string | null; // ISO datetime (for partial days)
  end_time?: string | null; // ISO datetime
  reason?: string | null;
}

/** Request to approve leave */
export interface LeaveApproveRequest {
  review_notes?: string | null;
}

/** Request to reject leave */
export interface LeaveRejectRequest {
  review_notes: string;
}

/** Parameters for listing staff */
export interface ListStaffParams {
  staff_type?: StaffType;
  is_active?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

/** Parameters for listing leaves */
export interface ListStaffLeaveParams {
  status?: LeaveStatus;
  skip?: number;
  limit?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Response for a staff member */
export interface StaffResponse {
  id: string;
  tenant_id: string;
  tenant_user_id: string;
  org_user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: string;
  date_of_birth: string | null;
  staff_type: StaffType;
  staff_code: string | null;
  designation: string | null;
  // Professional details
  specialization: string | null;
  qualifications: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  hourly_rate: number | null;
  // Address fields (detailed)
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin: string | null;
  // Legacy address field (for backward compatibility)
  address: string | null;
  // Emergency contact (detailed)
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  // Legacy emergency contact (for backward compatibility)
  emergency_contact: string | null;
  // Employment dates
  employment_start_date: string | null;
  employment_end_date: string | null;
  // Legacy joining_date (for backward compatibility)
  joining_date: string | null;
  is_active: boolean;
  has_login: boolean;
  metadata_: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/** Response for a leave request */
export interface StaffLeaveResponse {
  id: string;
  tenant_id: string;
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: LeaveStatus;
  requested_at: string;
  requested_by_staff_id: string;
  reviewed_at: string | null;
  reviewed_by_staff_id: string | null;
  review_notes: string | null;
}

/** Paginated response for staff */
export interface PaginatedStaffResponse {
  items: StaffResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Legacy staff shape consumed by the onboarding staff setup form. */
export interface OnboardingStaffSourceItem {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Paginated response for leaves */
export interface PaginatedLeaveResponse {
  items: StaffLeaveResponse[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get display name for staff type */
export const getStaffTypeLabel = (type: StaffType): string => {
  const labels: Record<StaffType, string> = {
    doctor: 'Doctor',
    therapist: 'Therapist',
    nurse: 'Nurse',
    receptionist: 'Receptionist',
    pharmacist: 'Pharmacist',
    physiotherapist: 'Physiotherapist',
    dentist: 'Dentist',
    admin: 'Admin',
  };
  return labels[type] || type;
};

/** Get color for staff type */
export const getStaffTypeColor = (type: StaffType): string => {
  const colors: Record<StaffType, string> = {
    doctor: '#2563eb', // Blue
    therapist: '#10b981', // Green
    nurse: '#ec4899', // Pink
    receptionist: '#8b5cf6', // Purple
    pharmacist: '#f59e0b', // Amber
    physiotherapist: '#06b6d4', // Cyan
    dentist: '#6366f1', // Indigo
    admin: '#6b7280', // Gray
  };
  return colors[type] || '#6b7280';
};

/** Get display name for leave type */
export const getLeaveTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SICK: 'Sick Leave',
    CASUAL: 'Casual Leave',
    VACATION: 'Vacation',
    PERSONAL: 'Personal Leave',
    OTHER: 'Other',
  };
  return labels[type] || type;
};

/** Get color for leave status */
export const getLeaveStatusColor = (status: LeaveStatus): string => {
  const colors: Record<LeaveStatus, string> = {
    PENDING: '#f59e0b',    // Amber
    REQUESTED: '#f59e0b',  // Amber — same as PENDING (backend alias)
    APPROVED: '#10b981',   // Green
    REJECTED: '#ef4444',   // Red
    CANCELLED: '#6b7280',  // Gray
  };
  return colors[status] || '#6b7280';
};

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

/** Calculate leave duration in days */
export const calculateLeaveDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};
