import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { t } from '../../../../core/localization';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { ThemedButton } from '../../../../core/components/ui/ThemedButton';
import { ThemedCard } from '../../../../core/components/ui/ThemedCard';
import { ThemedSelect } from '../../../../core/components/ui/ThemedSelect';
import { ThemedInput } from '../../../../core/components/ui/ThemedInput';
import { ThemedText } from '../../../../core/components/ui/ThemedText';
import { StatusBadge } from '../../../../core/components/ui/StatusBadge';
import { clinicTypeLabel, dateLabel, operationalStatusLabel, statusLabel, trialLabel } from '../../application/platformTenantPresentation';
import { DataColumn, DataTable } from '../../../../core/components/ui/DataTable';
import { PlatformTenant, PlatformTenantQuery } from '../../domain/entities/platformTenant';
import { usePlatformTenant, usePlatformTenants } from '../hooks/usePlatformTenants';
import { PlatformAdminShell } from '../components/PlatformAdminShell';
import { PlatformTenantManage } from '../components/PlatformTenantManage';

function ReadState({ loading, failed, retry }: { loading: boolean; failed: boolean; retry: () => void }) {
  const theme = useClinicTheme();
  if (loading) return <ActivityIndicator color={theme.colors.primary.default} accessibilityLabel={t('common.loading')} />;
  if (failed) return <View><ThemedText accessibilityRole="alert">{t('errors.tenants.loadFailed')}</ThemedText><ThemedButton variant="subtle" label={t('common.retry')} onPress={retry} /></View>;
  return null;
}

export function PlatformClinicWorkspace({ showBack = false }: { showBack?: boolean }) {
  const theme = useClinicTheme();
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState<PlatformTenantQuery>({ sort: 'created_desc' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const totals = usePlatformTenants(0, 1, {});
  const page = usePlatformTenants(offset, limit, query);
  const changeQuery = (next: PlatformTenantQuery) => { setQuery(next); setOffset(0); setExpandedId(null); };
  const columns: DataColumn<PlatformTenant>[] = [
    { key: 'identity', weight: 2, label: t('platformAdmin.name'), render: row => <><ThemedText variant="subtitle2">{row.name}</ThemedText><ThemedText>{row.code}</ThemedText></> },
    { key: 'type', label: t('platformAdmin.type'), render: row => <ThemedText>{clinicTypeLabel(row.clinicType)}</ThemedText> },
    { key: 'status', label: t('platformAdmin.status'), render: row => <StatusBadge label={operationalStatusLabel(row)} tone={row.isActive && row.status === 'active' ? 'success' : 'warning'} /> },
    { key: 'organization', weight: 2, label: t('platformAdmin.organization'), render: row => <ThemedText>{row.organization?.name ?? t('platformAdmin.notConfigured')}</ThemedText> },
    { key: 'trial', label: t('platformAdmin.trial'), render: row => <><StatusBadge label={trialLabel(row)} tone="neutral" /><ThemedText variant="caption">{dateLabel(row.trial?.expiresAt)}</ThemedText></> },
    { key: 'subscription', label: t('platformAdmin.subscription'), render: row => <><StatusBadge label={row.subscription ? statusLabel(row.subscription.status) : t(row.subscriptionCount > 1 ? 'platformAdmin.inconsistent' : 'platformAdmin.notConfigured')} />{row.subscription && <ThemedText variant="caption">{row.subscription.planCode}</ThemedText>}</> },
    { key: 'entitlement', label: t('platformAdmin.entitlement'), render: row => <StatusBadge label={statusLabel(row.entitlement.state)} tone={row.entitlement.operationallyEntitled ? 'success' : 'error'} /> },
    { key: 'manage', label: t('platformAdmin.manage'), render: row => <ThemedButton variant="outline" icon={expandedId === row.id ? 'chevron-up' : 'chevron-down'} accessibilityLabel={`${t(expandedId === row.id ? 'common.close' : 'platformAdmin.manage')} ${row.name}`} label={t(expandedId === row.id ? 'common.close' : 'platformAdmin.manage')} expanded={expandedId === row.id} onPress={() => setExpandedId(expandedId === row.id ? null : row.id)} /> },
  ];
  const summary = (key: string, count: number | undefined, icon: keyof typeof Ionicons.glyphMap, unsupported = false) => <ThemedCard testID={`summary-${key}`} style={{ flexGrow: 1, flexShrink: 1, flexBasis: theme.sizes.adminCardMinWidth }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ padding: theme.spacing.sm, backgroundColor: theme.colors.primary.soft, borderRadius: theme.radii.pill }}><Ionicons name={icon} size={theme.sizes.iconMedium} color={theme.colors.primary.default} /></View>
      <View style={{ flex: 1 }}><ThemedText variant="caption">{t(`platformAdmin.${key}`)}</ThemedText><ThemedText variant="h5">{count === undefined ? t(!unsupported && totals.isPending ? 'common.loading' : 'platformAdmin.unavailable') : count}</ThemedText></View>
    </View>
    {unsupported && <ThemedText variant="caption">{t('platformAdmin.metricContractMissing')}</ThemedText>}
    {!unsupported && totals.isError && <ThemedButton variant="subtle" label={t('platformAdmin.retrySummary')} onPress={() => { void totals.refetch(); }} />}
  </ThemedCard>;
  const totalsReady = !totals.isError && !totals.isPending && totals.data;
  const currentPage = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil((page.data?.total || 0) / limit));
  return <PlatformAdminShell showBack={showBack}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {summary('totalClinics', totalsReady ? totals.data?.total : undefined, 'business-outline')}
      {summary('operationallyActive', totalsReady ? totals.data?.activeTotal : undefined, 'checkmark-circle-outline')}
      {summary('commercialAttention', undefined, 'warning-outline', true)}
      {summary('expiringSoon', undefined, 'time-outline', true)}
    </View>
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flexGrow: 1, flexBasis: theme.sizes.adminCardMinWidth }}><ThemedInput label={t('common.search')} value={query.search || ''} onChangeText={search => changeQuery({ ...query, search })} /></View>
        <ThemedSelect label={t('platformAdmin.operationalStatus')} value={query.status || ''} options={['', 'active', 'inactive', 'suspended'].map(value => ({ value, label: t(`platformAdmin.${value || 'all'}`) }))} onChange={value => changeQuery({ ...query, status: value as PlatformTenantQuery['status'] || undefined })} />
        <ThemedSelect label={t('platformAdmin.type')} value="" options={[{ value: '', label: t('platformAdmin.allTypes') }]} onChange={() => {}} disabled />
        <ThemedSelect label={t('platformAdmin.organization')} value="" options={[{ value: '', label: t('platformAdmin.allOrganizations') }]} onChange={() => {}} disabled />
        <ThemedButton variant="subtle" label={t('platformAdmin.clearFilters')} onPress={() => changeQuery({ sort: 'created_desc' })} />
        <ThemedSelect label={t('platformAdmin.sortBy')} value={query.sort || 'created_desc'} options={['created_desc','name_asc','name_desc'].map(value => ({ value, label: t(`platformAdmin.${value}`) }))} onChange={value => changeQuery({ ...query, sort: value as PlatformTenantQuery['sort'] })} />
      </View>
      <ThemedText variant="caption">{t('platformAdmin.filterContractMissing')}</ThemedText>
    </View>
    {page.isPending || page.isError || !page.data ? <ReadState loading={page.isPending} failed={page.isError || !page.data} retry={() => { void page.refetch(); }} /> : <>
      <ThemedText variant="caption">{t('platformTenants.title')} ({page.data.total})</ThemedText>
      {page.data.items.length === 0 ? <ThemedText>{t('empty.noData')}</ThemedText> : <DataTable rows={page.data.items} columns={columns} expandedId={expandedId} details={row => expandedId === row.id ? <PlatformTenantManage tenant={row} onRefresh={() => page.refetch()} /> : null} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flexGrow: 1 }}><ThemedText variant="caption">{t('platformAdmin.showing', { start: page.data.total ? offset + 1 : 0, end: Math.min(offset + page.data.items.length, page.data.total), total: page.data.total })}</ThemedText></View>
        <ThemedButton variant="outline" icon="chevron-back" label={t('common.previous')} disabled={offset === 0} onPress={() => { setOffset(Math.max(0, offset - limit)); setExpandedId(null); }} />
        <ThemedText variant="caption">{t('platformAdmin.page')} {currentPage} / {pageCount}</ThemedText>
        <ThemedButton variant="outline" icon="chevron-forward" label={t('common.next')} disabled={offset + page.data.items.length >= page.data.total} onPress={() => { setOffset(offset + limit); setExpandedId(null); }} />
        <ThemedSelect label={t('platformAdmin.perPage')} value={String(limit)} options={[10,25,50].map(value => ({ value: String(value), label: t('platformAdmin.pageSize', { count: value }) }))} onChange={value => { setLimit(Number(value)); setOffset(0); setExpandedId(null); }} />
      </View>
    </>}
  </PlatformAdminShell>;
}

export default function PlatformTenantsScreen() { return <PlatformClinicWorkspace showBack />; }

export function PlatformTenantDetailScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const detail = usePlatformTenant(tenantId || '');
  return <PlatformAdminShell showBack>{detail.isPending || detail.isError || !detail.data ? <ReadState loading={detail.isPending} failed={detail.isError || !detail.data} retry={() => { void detail.refetch(); }} /> : <PlatformTenantManage tenant={detail.data} onRefresh={() => detail.refetch()} />}</PlatformAdminShell>;
}
