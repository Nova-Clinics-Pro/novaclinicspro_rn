import { PlatformTenantDto } from '../../features/tenants/data/models/platformTenants.dtos';
export const platformDto: PlatformTenantDto = {
  id: 'synthetic-id', name: 'Synthetic clinic', code: 'SYN', clinic_type: 'general', status: 'active', is_active: true, created_at: '2026-10-30T00:00:00Z', organization_id: 'synthetic-org',
  organization: { id: 'synthetic-org', name: 'Synthetic organization', status: 'active', association_id: 'synthetic-association', association_status: 'active' },
  commercial: { trial: { id: 'trial', state: 'ACTIVE', activation_at: '2026-09-01T00:00:00Z', expires_at: '2026-10-01T00:00:00Z', aggregate_version: 2, total_extension_days: 0 }, trial_count: 1,
    subscription: null, subscription_count: 0,
    entitlement: { state: 'not_entitled', plan_code: null, valid_until: null, denial_reason: 'no_commercial_evidence', operationally_entitled: false }, extensions: [], extension_total: 0 },
  audit: { availability: 'unavailable', reason: 'explicit_platform_audit_read_capability_required' }, actions: [],
};
