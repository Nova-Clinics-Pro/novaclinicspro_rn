export interface RegistrationRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  tenant_name: string;
  clinic_type: string;
  business_profile: { business_name?: string };
  contact_details: {
    primary_contact: { name: string; phone: string; email: string };
    clinic_address: { street: string; city: string; state: string; pincode: string; country: string };
  };
  app_context: { source: 'app_store' | 'play_store' | 'web' | 'referral'; device_info?: { platform: string }; urgency?: 'immediate' | 'within_week' | 'within_month' | 'exploring' };
  requested_components?: string[];
}

export interface RegistrationResponse {
  success: boolean;
  user_id: string;
  application_id: string;
  tenant_id?: string;
  application_status?: string;
  auto_approval_result: { eligible: boolean; risk_score: number; risk_factors: string[]; reason?: string };
  next_steps: string[];
  validation_errors?: string[];
}

export interface RegistrationStatus {
  status: 'registered' | 'no_applications';
  application_id?: string;
  /** Backend lifecycle status is canonical lowercase; uppercase is retained for legacy responses. */
  application_status?: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected'
    | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ONBOARDING' | 'ACTIVE' | 'REJECTED';
  tenant_name?: string;
  tenant_id?: string;
  created_at?: string;
  last_updated?: string;
}
