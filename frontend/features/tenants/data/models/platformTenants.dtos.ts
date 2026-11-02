export interface PlatformTenantDto {
  id: string; code: string; name: string; clinic_type: string; status: string; is_active: boolean; created_at: string;
  organization_id: string | null;
  organization: { id: string; name: string; status: string; association_id: string; association_status: string } | null;
  commercial: {
    trial: { id: string; state: string; activation_at: string | null; expires_at: string | null; aggregate_version: number; total_extension_days: number } | null;
    trial_count: number;
    subscription: { id: string; plan_code: string; status: string; current_period_start: string; current_period_end: string } | null;
    subscription_count: number;
    entitlement: { state: string; plan_code: string | null; valid_until: string | null; denial_reason: string | null; operationally_entitled: boolean };
    extensions: { id: string; kind: string; decision: string; extension_days: number | null; decided_at: string; resulting_expires_at: string | null; approver_id: string | null; reason?: string | null; channel?: string | null; previous_expires_at?: string | null }[];
    extension_total: number;
  };
  audit: { availability: string; reason: string };
  actions: string[];
}
export interface PlatformTenantPageDto { items: PlatformTenantDto[]; total: number; active_total: number; offset: number; limit: number }
