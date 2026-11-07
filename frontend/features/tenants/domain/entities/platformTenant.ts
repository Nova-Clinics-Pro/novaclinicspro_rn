/** Transport-independent platform administrative models. No clinical records. */
export interface OrganizationSummary { id: string; name: string; status: string; associationId: string; associationStatus: string }
export interface TrialSummary { id: string; state: string; activationAt: string | null; expiresAt: string | null; aggregateVersion: number; totalExtensionDays: number }
export interface SubscriptionSummary { id: string; planCode: string; status: string; periodStart: string; periodEnd: string }
export interface ExtensionSummary { id: string; kind: string; decision: string; days: number | null; decidedAt: string; expiresAt: string | null; approverId: string | null; reason?: string | null; channel?: string | null; previousExpiresAt?: string | null }
export interface PlatformTenant {
  id: string; code: string; name: string; clinicType: string; status: string; isActive: boolean; createdAt: string;
  organization: OrganizationSummary | null;
  trial: TrialSummary | null; trialCount: number;
  subscription: SubscriptionSummary | null; subscriptionCount: number;
  entitlement: { state: string; planCode: string | null; validUntil: string | null; denialReason: string | null; operationallyEntitled: boolean };
  extensions: ExtensionSummary[]; extensionTotal: number;
  auditAvailability: 'unavailable';
}
export interface PlatformTenantPage { items: PlatformTenant[]; total: number; activeTotal: number; offset: number; limit: number }
export interface PlatformTenantQuery { search?: string; status?: 'active' | 'inactive' | 'suspended'; sort?: 'created_desc' | 'name_asc' | 'name_desc' }
