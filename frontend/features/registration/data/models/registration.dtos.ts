/**
 * Registration DTOs
 * Data Transfer Objects matching the OpenAPI schema
 */

// === Request DTOs ===

export interface ClinicOwnerRegistrationRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  tenant_name: string;
  clinic_type: string;
  business_profile: BusinessProfile;
  contact_details: ContactDetails;
  app_context: AppContext;
  requested_components?: string[];
}

export interface BusinessProfile {
  business_name?: string;
  business_type?: string;
  registration_number?: string;
  tax_id?: string;
  established_year?: number;
  staff_count?: string;
  specializations?: string[];
  services_offered?: string[];
  current_systems?: string[];
  pain_points?: string[];
}

export interface ContactDetails {
  primary_contact: PrimaryContact;
  clinic_address: ClinicAddress;
  operating_hours?: WeeklyOperatingHours;
  emergency_contact?: EmergencyContact;
}

export interface PrimaryContact {
  name: string;
  phone: string;
  email: string;
  designation?: string;
  whatsapp?: string;
}

export interface ClinicAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface WeeklyOperatingHours {
  monday?: OperatingHours;
  tuesday?: OperatingHours;
  wednesday?: OperatingHours;
  thursday?: OperatingHours;
  friday?: OperatingHours;
  saturday?: OperatingHours;
  sunday?: OperatingHours;
}

export interface OperatingHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface EmergencyContact {
  available: boolean;
  phone?: string;
  hours?: string;
}

export interface AppContext {
  source: 'app_store' | 'play_store' | 'web' | 'referral';
  referral_code?: string;
  marketing_campaign?: string;
  device_info?: DeviceInfo;
  onboarding_preferences?: OnboardingPreferences;
  urgency?: 'immediate' | 'within_week' | 'within_month' | 'exploring';
  budget_range?: 'free' | 'basic' | 'premium' | 'enterprise' | 'custom';
}

export interface DeviceInfo {
  platform: string;
  version?: string;
  device_model?: string;
}

export interface OnboardingPreferences {
  demo_mode_requested?: boolean;
  quick_setup?: boolean;
  guided_tour?: boolean;
}

// === Response DTOs ===

export interface ClinicOwnerRegistrationResponse {
  success: boolean;
  user_id: string;
  application_id: string;
  tenant_id?: string;
  component_recommendations: ComponentRecommendation[];
  auto_approval_result: AutoApprovalResult;
  application_status?: string;
  approved_components?: string[];
  completion_percentage?: number;
  validation_errors?: string[];
  next_steps: string[];
  estimated_setup_time?: string;
}

export interface ComponentRecommendation {
  component: string;
  confidence: number;
  reason: string;
}

export interface AutoApprovalResult {
  eligible: boolean;
  risk_score: number;
  risk_factors: string[];
  reason?: string;
}

// === Clinic Types ===
export const CLINIC_TYPES = [
  'general',
  'ayurveda',
  'allopathy',
  'dental',
  'physio',
  'multispeciality',
] as const;

export type ClinicType = typeof CLINIC_TYPES[number];

// === Service Types ===
export const SERVICE_TYPES = [
  'consultation',
  'surgery',
  'diagnostics',
  'pharmacy',
  'laboratory',
  'radiology',
  'therapy',
  'emergency',
  'inpatient',
  'outpatient',
] as const;

// === Pain Points ===
export const PAIN_POINTS = [
  'appointment_scheduling',
  'billing_invoicing',
  'inventory_management',
  'patient_records',
  'staff_management',
  'reporting_analytics',
  'communication',
  'compliance',
] as const;

// === Registration Status DTOs ===

export interface RegistrationStatusResponse {
  status: 'registered' | 'no_applications';
  application_id?: string;
  application_status?: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected'
    | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ONBOARDING' | 'ACTIVE' | 'REJECTED';
  tenant_name?: string;
  tenant_id?: string;
  created_at?: string;
  last_updated?: string;
}

// === Registration Status DTOs ===

export interface RegistrationStatusResponse {
  status: 'registered' | 'no_applications';
  application_id?: string;
  application_status?: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected'
    | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ONBOARDING' | 'ACTIVE' | 'REJECTED';
  tenant_name?: string;
  tenant_id?: string;
  created_at?: string;
  last_updated?: string;
}
