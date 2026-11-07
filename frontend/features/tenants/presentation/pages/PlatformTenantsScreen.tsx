import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { t } from '../../../../core/localization';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { opacities } from '../../../../core/theme/semanticColors';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import { ThemedButton } from '../../../../core/components/ui/ThemedButton';
import { ThemedCard } from '../../../../core/components/ui/ThemedCard';
import { ThemedSelect } from '../../../../core/components/ui/ThemedSelect';
import { ThemedInput } from '../../../../core/components/ui/ThemedInput';
import { ThemedText } from '../../../../core/components/ui/ThemedText';
import { StatusBadge } from '../../../../core/components/ui/StatusBadge';
import { clinicTypeLabel, dateLabel, operationalStatusLabel, statusLabel, trialLabel } from '../../application/platformTenantPresentation';
import { DataColumn, DataTable } from '../../../../core/components/ui/DataTable';
import { PlatformTenant, PlatformTenantQuery } from '../../domain/entities/platformTenant';
import { usePlatformTenant, usePlatformTenantRefresh, usePlatformTenants } from '../hooks/usePlatformTenants';
import { usePlatformTrialCommands } from '../hooks/usePlatformTrialCommands';
import { PlatformAdminShell } from '../components/PlatformAdminShell';
import { PlatformTenantManage } from '../components/PlatformTenantManage';

/** Applied after this long without a keystroke; clearing the search applies immediately. */
const SEARCH_DEBOUNCE_MS = 300;
/** Matches the backend `search` constraint (max_length=100). */
const SEARCH_MAX_LENGTH = 100;
const DEFAULT_SORT: NonNullable<PlatformTenantQuery['sort']> = 'created_desc';
type TenantFilters = Pick<PlatformTenantQuery, 'status' | 'sort'>;
type ViewState = { identity: string; offset: number; expandedId: string | null };

function ReadState({ loading, failed, retry }: { loading: boolean; failed: boolean; retry: () => void }) {
  const theme = useClinicTheme();
  if (loading) return <ActivityIndicator color={theme.colors.primary.default} accessibilityLabel={t('common.loading')} />;
  if (failed) return <View><ThemedText accessibilityRole="alert">{t('errors.tenants.loadFailed')}</ThemedText><ThemedButton variant="subtle" label={t('common.retry')} onPress={retry} /></View>;
  return null;
}

export function PlatformClinicWorkspace({ showBack = false }: { showBack?: boolean }) {
  const theme = useClinicTheme();
  const [filters, setFilters] = useState<TenantFilters>({ sort: DEFAULT_SORT });
  // Immediate input state is separate from the applied (debounced) search. Whitespace-only and
  // cleared input mean "no search" and apply immediately, restoring the exact unfiltered key.
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const search = searchInput.trim() === '' ? '' : debouncedSearch.trim();
  const query = useMemo<PlatformTenantQuery>(() => ({ sort: filters.sort, ...(filters.status ? { status: filters.status } : {}), ...(search ? { search } : {}) }), [filters, search]);
  const queryIdentity = JSON.stringify(query);
  const [limit, setLimit] = useState(10);
  // Pagination and the open row belong to one applied query: when the applied search, status or
  // sort changes the view falls back to the first page in the same render (no wasted request).
  const [viewState, setViewState] = useState<ViewState>({ identity: queryIdentity, offset: 0, expandedId: null });
  const view: ViewState = viewState.identity === queryIdentity ? viewState : { identity: queryIdentity, offset: 0, expandedId: null };
  const { offset, expandedId } = view;
  const patchView = (patch: Partial<Omit<ViewState, 'identity'>>) => setViewState(prev => ({ ...(prev.identity === queryIdentity ? prev : { identity: queryIdentity, offset: 0, expandedId: null }), ...patch }));
  const setOffset = (next: number) => patchView({ offset: next, expandedId: null });
  const setExpandedId = (id: string | null) => patchView({ expandedId: id });
  const totals = usePlatformTenants(0, 1, {});
  const page = usePlatformTenants(offset, limit, query);
  const refreshTenant = usePlatformTenantRefresh();
  const trialCommands = usePlatformTrialCommands();
  const showingPlaceholder = Boolean(page.isPlaceholderData);
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
        <View style={{ flexGrow: 1, flexBasis: theme.sizes.adminCardMinWidth }}><ThemedInput label={t('common.search')} value={searchInput} maxLength={SEARCH_MAX_LENGTH} onChangeText={setSearchInput} /></View>
        <ThemedSelect label={t('platformAdmin.operationalStatus')} value={filters.status || ''} options={['', 'active', 'inactive', 'suspended'].map(value => ({ value, label: t(`platformAdmin.${value || 'all'}`) }))} onChange={value => setFilters(current => ({ ...current, status: value as PlatformTenantQuery['status'] || undefined }))} />
        <ThemedSelect label={t('platformAdmin.type')} value="" options={[{ value: '', label: t('platformAdmin.allTypes') }]} onChange={() => {}} disabled />
        <ThemedSelect label={t('platformAdmin.organization')} value="" options={[{ value: '', label: t('platformAdmin.allOrganizations') }]} onChange={() => {}} disabled />
        <ThemedButton variant="subtle" label={t('platformAdmin.clearFilters')} onPress={() => { setFilters({ sort: DEFAULT_SORT }); setSearchInput(''); }} />
        <ThemedSelect label={t('platformAdmin.sortBy')} value={filters.sort || DEFAULT_SORT} options={['created_desc','name_asc','name_desc'].map(value => ({ value, label: t(`platformAdmin.${value}`) }))} onChange={value => setFilters(current => ({ ...current, sort: value as PlatformTenantQuery['sort'] }))} />
      </View>
      <ThemedText variant="caption">{t('platformAdmin.filterContractMissing')}</ThemedText>
    </View>
    {page.isPending || page.isError || !page.data ? <ReadState loading={page.isPending} failed={page.isError || !page.data} retry={() => { void page.refetch(); }} /> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {/* While showing the previous query's rows, its total would misrepresent the new result. */}
        <ThemedText variant="caption">{showingPlaceholder ? t('platformTenants.title') : <>{t('platformTenants.title')} ({page.data.total})</>}</ThemedText>
        {(showingPlaceholder || page.isFetching) && <ActivityIndicator testID="table-refreshing" size="small" color={theme.colors.primary.default} accessibilityLabel={t('common.loading')} />}
      </View>
      <View accessibilityState={{ busy: showingPlaceholder }} style={{ opacity: showingPlaceholder ? opacities.disabled : 1 }}>
        {page.data.items.length === 0 ? <ThemedText>{t('empty.noData')}</ThemedText> : <DataTable rows={page.data.items} columns={columns} expandedId={expandedId} details={row => expandedId === row.id ? <PlatformTenantManage tenant={row} onRefresh={refreshTenant} commands={trialCommands} /> : null} />}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flexGrow: 1 }}>{!showingPlaceholder && <ThemedText variant="caption">{t('platformAdmin.showing', { start: page.data.total ? offset + 1 : 0, end: Math.min(offset + page.data.items.length, page.data.total), total: page.data.total })}</ThemedText>}</View>
        <ThemedButton variant="outline" icon="chevron-back" label={t('common.previous')} disabled={offset === 0 || showingPlaceholder} onPress={() => { setOffset(Math.max(0, offset - limit)); setExpandedId(null); }} />
        {!showingPlaceholder && <ThemedText variant="caption">{t('platformAdmin.page')} {currentPage} / {pageCount}</ThemedText>}
        <ThemedButton variant="outline" icon="chevron-forward" label={t('common.next')} disabled={showingPlaceholder || offset + page.data.items.length >= page.data.total} onPress={() => { setOffset(offset + limit); setExpandedId(null); }} />
        <ThemedSelect label={t('platformAdmin.perPage')} value={String(limit)} options={[10,25,50].map(value => ({ value: String(value), label: t('platformAdmin.pageSize', { count: value }) }))} onChange={value => { setLimit(Number(value)); setOffset(0); setExpandedId(null); }} />
      </View>
    </>}
  </PlatformAdminShell>;
}

export default function PlatformTenantsScreen() { return <PlatformClinicWorkspace showBack />; }

export function PlatformTenantDetailScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const detail = usePlatformTenant(tenantId || '');
  const refreshTenant = usePlatformTenantRefresh();
  const trialCommands = usePlatformTrialCommands();
  return <PlatformAdminShell showBack>{detail.isPending || detail.isError || !detail.data ? <ReadState loading={detail.isPending} failed={detail.isError || !detail.data} retry={() => { void detail.refetch(); }} /> : <PlatformTenantManage tenant={detail.data} onRefresh={refreshTenant} commands={trialCommands} />}</PlatformAdminShell>;
}
