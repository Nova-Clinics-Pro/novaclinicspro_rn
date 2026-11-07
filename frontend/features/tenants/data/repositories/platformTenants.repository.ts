import { useCallback } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPlatformTenantRepository } from '../../domain/repositories/platformTenant.repository';
import { PlatformTenant, PlatformTenantPage, PlatformTenantQuery } from '../../domain/entities/platformTenant';
import { PlatformTenantDto } from '../models/platformTenants.dtos';
import { getPlatformTenantApi, listPlatformTenantsApi } from '../datasources/platformTenants.api';

export const mapPlatformTenant = (dto: PlatformTenantDto): PlatformTenant => {
  const { trial, subscription, entitlement } = dto.commercial;
  if (!entitlement || !['not_entitled', 'trial', 'paid', 'inconsistent'].includes(entitlement.state) ||
      typeof entitlement.operationally_entitled !== 'boolean' ||
      entitlement.operationally_entitled !== ['trial', 'paid'].includes(entitlement.state)) {
    throw new Error('platform_tenants.invalid_entitlement');
  }
  return {
    id: dto.id, code: dto.code, name: dto.name, clinicType: dto.clinic_type, status: dto.status, isActive: dto.is_active, createdAt: dto.created_at,
    organization: dto.organization ? { id: dto.organization.id, name: dto.organization.name, status: dto.organization.status, associationId: dto.organization.association_id, associationStatus: dto.organization.association_status } : null,
    trial: trial ? { id: trial.id, state: trial.state, activationAt: trial.activation_at, expiresAt: trial.expires_at, aggregateVersion: trial.aggregate_version, totalExtensionDays: trial.total_extension_days } : null,
    trialCount: dto.commercial.trial_count,
    subscription: subscription ? { id: subscription.id, planCode: subscription.plan_code, status: subscription.status, periodStart: subscription.current_period_start, periodEnd: subscription.current_period_end } : null,
    subscriptionCount: dto.commercial.subscription_count,
    entitlement: { state: entitlement.state, planCode: entitlement.plan_code, validUntil: entitlement.valid_until, denialReason: entitlement.denial_reason, operationallyEntitled: entitlement.operationally_entitled },
    extensions: dto.commercial.extensions.map(e => ({ id: e.id, kind: e.kind, decision: e.decision, days: e.extension_days, decidedAt: e.decided_at, expiresAt: e.resulting_expires_at, approverId: e.approver_id, reason: e.reason ?? null, channel: e.channel ?? null, previousExpiresAt: e.previous_expires_at ?? null })),
    extensionTotal: dto.commercial.extension_total,
    // No approved audit-read capability: the UI never treats raw metadata as authority.
    auditAvailability: 'unavailable',
  };
};
export const platformTenantRepository: IPlatformTenantRepository = {
  async list(offset, limit, query): Promise<PlatformTenantPage> {
    const dto = await listPlatformTenantsApi(offset, limit, query);
    return { items: dto.items.map(mapPlatformTenant), total: dto.total, activeTotal: dto.active_total, offset: dto.offset, limit: dto.limit };
  },
  async get(id) { return mapPlatformTenant(await getPlatformTenantApi(id)); },
};
export const platformTenantKeys = {
  list: (actorId: string | undefined, offset: number, limit: number, query: PlatformTenantQuery) => ['platform-tenants', actorId, offset, limit, query] as const,
  detail: (actorId: string | undefined, id: string) => ['platform-tenant', actorId, id] as const,
};
// Every platform list read persists a mandatory access-audit row. The list queries
// therefore stay fresh for 30 s and are not refetched passively on window focus or
// network reconnect. Mount refetch (when stale), explicit refetch() (Retry, Manage
// refresh) and key changes (filter/pagination) are unchanged. Detail is deliberately
// excluded: it keeps staleTime 0 so a fresh aggregate version is read.
export const platformTenantListQueryPolicy = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;
// B0-approved query boundary consumes the domain contract. Transport/mapping stays below it.
export const usePlatformTenantsQuery = (actorId: string | undefined, offset = 0, limit = 25, query: PlatformTenantQuery = {}, repository: IPlatformTenantRepository = platformTenantRepository) => useQuery({
  queryKey: platformTenantKeys.list(actorId, offset, limit, query), queryFn: () => repository.list(offset, limit, query), enabled: Boolean(actorId), ...platformTenantListQueryPolicy,
  // Keep the previous page's rows on screen while a new search/page loads (isPlaceholderData).
  placeholderData: keepPreviousData,
});
export const usePlatformTenantQuery = (actorId: string | undefined, id: string, repository: IPlatformTenantRepository = platformTenantRepository) => useQuery({
  queryKey: platformTenantKeys.detail(actorId, id), queryFn: () => repository.get(id), enabled: Boolean(actorId && id), staleTime: 0,
});
// Targeted, awaited refresh of ONE tenant through the existing detail query key (staleTime 0).
// The detail endpoint serves the same projection as a list row (same service projection and
// response model), so trial state, expiry and aggregate version are all authoritative here.
// fetchQuery de-duplicates concurrent refreshes of the same tenant and updates the detail cache.
export const usePlatformTenantRefresh = (actorId: string | undefined, repository: IPlatformTenantRepository = platformTenantRepository) => {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string): Promise<PlatformTenant> => queryClient.fetchQuery({ queryKey: platformTenantKeys.detail(actorId, id), queryFn: () => repository.get(id), staleTime: 0 }),
    [queryClient, actorId, repository],
  );
};
