/**
 * Tenants DTOs
 * Data Transfer Objects matching OpenAPI schemas
 */

// === Request DTOs ===

export interface OrgTenantCreate {
  name: string;
  clinic_type: string;
  email?: string | null;
  phones?: string[] | Record<string, any> | null;
  website_address?: string | null;
  clinic_logo?: string | null;
  clinic_registration?: string | null;
  clinic_pan?: string | null;
  clinic_gst?: string | null;
  language: string;
  timezone: string;
  currency: string;
  address?: Record<string, any> | null;
}

export interface OrgTenantUpdate {
  name?: string;
  clinic_type?: string;
  email?: string | null;
  phones?: string[] | Record<string, any> | null;
  website_address?: string | null;
  clinic_logo?: string | null;
  clinic_registration?: string | null;
  clinic_pan?: string | null;
  clinic_gst?: string | null;
  language?: string;
  timezone?: string;
  currency?: string;
  address?: Record<string, any> | null;
  is_active?: boolean;
}

/** Tenant-scoped, purpose-limited clinic profile write contract. */
export interface TenantClinicProfileUpdate {
  name?: string;
  email?: string | null;
  phones?: string[] | null;
  address?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
}

export interface TenantClinicProfile {
  id: string;
  name: string;
  email?: string | null;
  phones?: string[] | null;
  address?: { city?: string | null; state?: string | null; country?: string | null } | null;
}

export interface ListTenantsParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  clinic_type?: string;
}

// === Response DTOs ===

export interface OrgTenantResponse {
  id: string;
  code: string;
  name: string;
  clinic_type: string;
  status: string;
  email?: string | null;
  phones?: Record<string, any> | null;
  website_address?: string | null;
  clinic_logo?: string | null;
  clinic_registration?: string | null;
  clinic_pan?: string | null;
  clinic_gst?: string | null;
  language: string;
  timezone: string;
  currency: string;
  address?: Record<string, any> | null;
  subscription_plan: string;
  subscription_status: string;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  trial_end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

// === Constants ===

export const CLINIC_TYPES = [
  'general',
  'ayurveda',
  'allopathy',
  'dental',
  'physio',
  'multispeciality',
] as const;

export const TENANT_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'active',
  'suspended',
  'inactive',
] as const;

export const SUBSCRIPTION_PLANS = [
  'free',
  'trial',
  'basic',
  'professional',
  'enterprise',
] as const;

export const SUBSCRIPTION_STATUSES = [
  'trial',
  'active',
  'cancelled',
  'expired',
  'suspended',
] as const;
