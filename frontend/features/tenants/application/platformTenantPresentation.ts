/** Display-only adapters. Never grants access or determines command eligibility. */
import { t, getCurrentLocale } from '../../../core/localization';
import type { ClinicType } from '../../../core/hooks/useFeatures';
import { PlatformTenant } from '../domain/entities/platformTenant';

const keys: Record<string, string> = {
  active: 'active', inactive: 'inactive', suspended: 'suspended', onboarding: 'onboarding',
  ACTIVE: 'active', EXPIRED: 'expired', ELIGIBLE: 'eligible', SUSPENDED: 'suspended',
  ARCHIVED: 'archived', DELETED: 'deleted',
  not_entitled: 'accessBlocked', trial: 'trialAccess', paid: 'paidAccess', inconsistent: 'inconsistent',
  past_due: 'pastDue', cancelled: 'cancelled', expired: 'expired',
  
  GRANTED: 'granted', REJECTED: 'rejected', REQUESTED: 'requested', SUPPORT: 'support',
};
export const statusLabel = (value?: string | null): string => t(`platformAdmin.${value ? keys[value] || keys[value.toLowerCase()] || 'unknownStatus' : 'notConfigured'}`);
const reasons: Record<string, string> = {
  no_commercial_evidence: 'noEntitlement', tenant_not_found: 'tenantMissing', commercial_not_started: 'notStarted',
  cross_tenant_evidence: 'inconsistent', multiple_paid_subscriptions: 'inconsistent', multiple_active_trials: 'inconsistent',
  trial_eligible_not_activated: 'notActivated', trial_not_active: 'trialInactive', paid_subscription_not_active: 'subscriptionInactive',
};
export const entitlementReason = (value: string | null) => value ? t(`platformAdmin.${reasons[value] || 'reviewRequired'}`) : t('platformAdmin.noBlock');
export const dateLabel = (value?: string | null): string => {
  if (!value) return t('platformAdmin.notConfigured');
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return t('platformAdmin.invalidDate');
  return new Intl.DateTimeFormat(getCurrentLocale(), dateOnly ? { year: 'numeric', month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(parsed);
};
export function trialLabel(tenant: PlatformTenant, now = Date.now()): string {
  if (!tenant.trial) return t(`platformAdmin.${tenant.trialCount > 1 ? 'inconsistent' : 'notConfigured'}`);
  // Time-based display of stored ACTIVE, not a new entitlement/lifecycle decision.
  const expiry = tenant.trial.expiresAt ? Date.parse(tenant.trial.expiresAt) : NaN;
  return statusLabel(tenant.trial.state === 'ACTIVE' && Number.isFinite(expiry) && expiry <= now ? 'EXPIRED' : tenant.trial.state);
}
// Exhaustive label mapping over the existing canonical clinic-type union; no runtime import.
const clinicTypeKeys: Record<ClinicType, string> = {
  general: 'general', ayurveda: 'ayurveda', allopathy: 'allopathy',
  dental: 'dental', physio: 'physiotherapy', multispeciality: 'multispeciality',
};
export const clinicTypeLabel = (value: string): string => t(`platformAdmin.${clinicTypeKeys[value.toLowerCase() as ClinicType] || 'unknownType'}`);
// Display server lifecycle status independently of commercial access or isActive.
export const operationalStatusLabel = (tenant: PlatformTenant): string => statusLabel(tenant.status);
