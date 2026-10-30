import React, { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { t } from '../../../../core/localization';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { usePlatformTenant, usePlatformTenants } from '../hooks/usePlatformTenants';

function ReadState({ loading, failed, retry }: { loading: boolean; failed: boolean; retry: () => void }) {
  if (loading) return <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  if (failed) return <View><Text>{t('errors.tenants.loadFailed')}</Text><Button title={t('common.retry')} onPress={retry} /></View>;
  return null;
}

export default function PlatformTenantsScreen() {
  const [offset, setOffset] = useState(0);
  const page = usePlatformTenants(offset, 25);
  const router = useRouter();
  const theme = useClinicTheme();
  if (page.isPending || page.isError || !page.data) return <ReadState loading={page.isPending} failed={page.isError || !page.data} retry={() => { void page.refetch(); }} />;
  return <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.surface.default }}>
    <Text style={{ color: theme.colors.text.primary }}>{t('platformTenants.title')} ({page.data.total})</Text>
    {page.data.items.length === 0 && <Text>{t('empty.noData')}</Text>}
    {page.data.items.map(tenant => <Button key={tenant.id} title={tenant.name} onPress={() => router.push(`/super-admin/tenants/${tenant.id}`)} />)}
    <Button title={t('common.previous')} disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - 25))} />
    <Button title={t('common.next')} disabled={offset + page.data.items.length >= page.data.total} onPress={() => setOffset(offset + 25)} />
  </ScrollView>;
}

export function PlatformTenantDetailScreen() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const detail = usePlatformTenant(tenantId || '');
  const router = useRouter();
  const theme = useClinicTheme();
  if (detail.isPending || detail.isError || !detail.data) return <ReadState loading={detail.isPending} failed={detail.isError || !detail.data} retry={() => { void detail.refetch(); }} />;
  const tenant = detail.data;
  return <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.surface.default }}>
    <Text accessibilityRole="header" style={{ color: theme.colors.text.primary }}>{tenant.name}</Text>
    <Text>{tenant.code}</Text><Text>{tenant.clinic_type}</Text><Text>{tenant.status}</Text>
    <Button title={t('common.goBack')} onPress={() => router.back()} />
  </ScrollView>;
}
