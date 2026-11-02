import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../../core/components/ui/ThemedText';
import { ThemedButton } from '../../../../core/components/ui/ThemedButton';
import { ThemedCard } from '../../../../core/components/ui/ThemedCard';
import { ThemedNotice } from '../../../../core/components/ui/ThemedNotice';
import { ThemedInput } from '../../../../core/components/ui/ThemedInput';
import { ThemedSelect } from '../../../../core/components/ui/ThemedSelect';
import { StatusBadge } from '../../../../core/components/ui/StatusBadge';
import { ConfirmationDialog } from '../../../../core/components/ConfirmationDialog';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { PlatformTenant } from '../../domain/entities/platformTenant';
import { clinicTypeLabel, dateLabel, entitlementReason, operationalStatusLabel, statusLabel, trialLabel } from '../../application/platformTenantPresentation';

export function PlatformTenantManage({ tenant, onRefresh }: { tenant: PlatformTenant; onRefresh?: () => Promise<unknown> | void }) {
  const theme = useClinicTheme();
  const { width } = useWindowDimensions();
  const narrow = width < theme.sizes.wideLayout;
  const [identifiers, setIdentifiers] = useState(false);
  const [history, setHistory] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(false);
  const [extensionDialog, setExtensionDialog] = useState(false);
  const [extensionDays, setExtensionDays] = useState('30');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionPrepared, setExtensionPrepared] = useState(false);
  const extensionValid = Number.isInteger(Number(extensionDays)) && Number(extensionDays) >= 1 && Number(extensionDays) <= 30 && extensionReason.trim().length > 0 && extensionReason.trim().length <= 160;
  const openExtensionPreparation = () => {
    setExtensionPrepared(false);
    void onRefresh?.();
    setExtensionDialog(true);
  };
  const field = (label: string, value: React.ReactNode) => <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
    <ThemedText variant="caption" style={{ flex: 1, color: theme.colors.text.secondary }}>{t(`platformAdmin.${label}`)}</ThemedText>
    <View style={{ flex: 1, minWidth: 0 }}>{typeof value === 'string' || typeof value === 'number' ? <ThemedText variant="caption">{value}</ThemedText> : value ?? <ThemedText variant="caption">{t('platformAdmin.notConfigured')}</ThemedText>}</View>
  </View>;
  const cardStyle = { alignSelf: 'flex-start' as const, flexGrow: 1, flexShrink: 1, padding: theme.spacing.sm, gap: theme.spacing.sm, flexBasis: narrow ? '100%' as const : width >= theme.sizes.adminFourColumnLayout ? '23%' as const : '47%' as const };
  const badge = (label: string) => <StatusBadge label={label} />;
  return <ThemedCard testID={`manage-${tenant.id}`} style={{ padding: theme.spacing.sm }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md }}>
      <Ionicons name="business-outline" size={theme.sizes.iconLarge} color={theme.colors.primary.default} />
      <View style={{ flexGrow: 1 }}><ThemedText variant="h5">{tenant.name}</ThemedText><ThemedText variant="caption">{tenant.code} · {clinicTypeLabel(tenant.clinicType)}</ThemedText></View>
      <StatusBadge label={operationalStatusLabel(tenant)} tone={tenant.status === 'active' && tenant.isActive ? 'success' : 'warning'} />
      <StatusBadge label={trialLabel(tenant)} tone="warning" />
      <StatusBadge label={statusLabel(tenant.entitlement.state)} tone={tenant.entitlement.operationallyEntitled ? 'success' : 'error'} />
      {badge(tenant.subscription ? statusLabel(tenant.subscription.status) : t('platformAdmin.noSubscription'))}
    </View>
    <View testID={narrow ? 'manage-grid-mobile' : 'manage-grid-desktop'} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: theme.spacing.sm }}>
      <ThemedCard testID="manage-card-overview" title={t('platformAdmin.overview')} icon="document-text-outline" style={cardStyle}>
        {field('name', tenant.name)}{field('code', tenant.code)}{field('type', clinicTypeLabel(tenant.clinicType))}
        {field('status', <StatusBadge label={operationalStatusLabel(tenant)} tone={tenant.status === 'active' && tenant.isActive ? 'success' : 'warning'} />)}
        {field('createdAt', dateLabel(tenant.createdAt))}
        <ThemedButton variant="outline" icon="chevron-down" label={t(`platformAdmin.${identifiers ? 'hideIdentifiers' : 'showIdentifiers'}`)} expanded={identifiers} onPress={() => setIdentifiers(!identifiers)} />
        {identifiers && <>{field('clinicId', tenant.id)}{field('organizationId', tenant.organization?.id)}{field('associationId', tenant.organization?.associationId)}{field('version', tenant.trial?.aggregateVersion)}</>}
      </ThemedCard>
      <ThemedCard testID="manage-card-organization" title={t('platformAdmin.organization')} icon="business-outline" style={cardStyle}>
        {field('organization', tenant.organization?.name)}{field('associationStatus', badge(statusLabel(tenant.organization?.associationStatus)))}
        {field('organizationStatus', statusLabel(tenant.organization?.status))}
      </ThemedCard>
      <ThemedCard testID="manage-card-commercial" title={t('platformAdmin.commercial')} icon="card-outline" style={cardStyle}>
        {field('trial', <StatusBadge label={trialLabel(tenant)} tone="warning" />)}{field('storedState', statusLabel(tenant.trial?.state))}
        {field('activatedAt', dateLabel(tenant.trial?.activationAt))}{field('expiresAt', dateLabel(tenant.trial?.expiresAt))}
        {field('plan', tenant.subscription?.planCode)}{field('subscription', tenant.subscriptionCount > 1 && !tenant.subscription ? t('platformAdmin.inconsistent') : tenant.subscription ? statusLabel(tenant.subscription.status) : t('platformAdmin.noSubscription'))}
        {field('periodStart', tenant.subscription ? dateLabel(tenant.subscription.periodStart) : null)}{field('periodEnd', tenant.subscription ? dateLabel(tenant.subscription.periodEnd) : null)}
        {field('extensionHistory', tenant.extensionTotal)}
        <ThemedButton variant="outline" icon="time-outline" label={t('platformAdmin.viewExtensions')} expanded={history} onPress={() => setHistory(!history)} />
      </ThemedCard>
      <ThemedCard testID="manage-card-entitlement" title={t('platformAdmin.entitlement')} icon="shield-checkmark-outline" style={cardStyle}>
        {field('accessStatus', <StatusBadge label={statusLabel(tenant.entitlement.state)} tone={tenant.entitlement.operationallyEntitled ? 'success' : 'error'} />)}
        {field('entitledUntil', dateLabel(tenant.entitlement.validUntil))}{field('reason', entitlementReason(tenant.entitlement.denialReason))}
        {!tenant.entitlement.operationallyEntitled && <ThemedNotice tone="error">{t('platformAdmin.accessWarning')}</ThemedNotice>}
      </ThemedCard>
    </View>
    <View style={{ flexDirection: narrow ? 'column' : 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
      <ThemedCard testID="manage-card-administration" title={t('platformAdmin.administration')} icon="settings-outline" style={{ flex: narrow ? undefined : 2, width: narrow ? '100%' : undefined }}>
        <ThemedNotice tone="warning">{t('platformAdmin.adminGate')}</ThemedNotice>
        <View style={{ flexDirection: narrow ? 'column' : 'row', gap: theme.spacing.md }}>
          <View style={{ flex: narrow ? undefined : 1, gap: theme.spacing.sm }}>
            <ThemedText variant="subtitle2">{t('platformAdmin.extendTrial')}</ThemedText><ThemedText variant="caption">{t('platformAdmin.extensionOperation')}</ThemedText><StatusBadge label={t('platformAdmin.unavailable')} tone="warning" />
            <ThemedText variant="caption">{t('platformAdmin.extensionGate')}</ThemedText>
            <ThemedButton label={t('platformAdmin.prepareExtension')} onPress={openExtensionPreparation} icon="calendar-outline" />
          </View>
          <View style={{ flex: narrow ? undefined : 1, gap: theme.spacing.sm }}>
            <ThemedText variant="subtitle2">{t('platformAdmin.manageSubscription')}</ThemedText><StatusBadge label={t('platformAdmin.unavailable')} />
            <ThemedText variant="caption">{t('platformAdmin.subscriptionReadOnly')}</ThemedText>
            <ThemedButton label={t('platformAdmin.viewSubscription')} expanded={subscriptionDetails} onPress={() => setSubscriptionDetails(!subscriptionDetails)} icon="card-outline" />
            {subscriptionDetails && <View testID="subscription-details" style={{ gap: theme.spacing.xs }}>
              {tenant.subscription ? <>{field('plan', tenant.subscription.planCode)}{field('subscription', statusLabel(tenant.subscription.status))}{field('periodStart', dateLabel(tenant.subscription.periodStart))}{field('periodEnd', dateLabel(tenant.subscription.periodEnd))}</> : <ThemedText variant="caption">{t('platformAdmin.noSubscription')}</ThemedText>}
            </View>}
          </View>
        </View>
      </ThemedCard>
      <ThemedCard testID="manage-card-history" title={t('platformAdmin.history')} icon="time-outline" style={{ flex: narrow ? undefined : 1, width: narrow ? '100%' : undefined }}>
        <ThemedNotice>{t('platformAdmin.auditUnavailable')}</ThemedNotice>
        {field('recentAudit', t('platformAdmin.unavailable'))}{field('recentCommercial', t('platformAdmin.unavailable'))}{field('extensionHistory', tenant.extensionTotal)}
        <ThemedButton variant="outline" icon="document-text-outline" label={t('platformAdmin.viewHistory')} expanded={history} onPress={() => setHistory(!history)} />
        {history && <View testID="extension-history" style={{ gap: theme.spacing.sm }}>
          {tenant.extensions.length === 0 ? <ThemedText variant="caption">{t('empty.noData')}</ThemedText> : tenant.extensions.map(e => <View key={e.id} style={{ gap: theme.spacing.xs }}>
            <StatusBadge label={statusLabel(e.decision)} />{field('days', e.days)}{field('createdAt', dateLabel(e.decidedAt))}{field('previousExpiry', dateLabel(e.previousExpiresAt))}{field('newExpiry', dateLabel(e.expiresAt))}{field('extensionReasonLabel', e.reason)}{field('channel', e.channel ? statusLabel(e.channel) : null)}{field('actor', e.approverId)}
          </View>)}
          {tenant.extensionTotal > tenant.extensions.length && <ThemedText variant="caption">{t('platformAdmin.boundedHistory')}</ThemedText>}
        </View>}
      </ThemedCard>
    </View>
    <ThemedText variant="caption">{t('platformAdmin.localTime')}</ThemedText>
    <ConfirmationDialog
      visible={extensionDialog}
      title={t('platformAdmin.extensionDialogTitle')}
      message={t('platformAdmin.extensionDialogMessage')}
      confirmText={t('platformAdmin.prepareExtension')}
      onCancel={() => setExtensionDialog(false)}
      onConfirm={() => { if (extensionValid) setExtensionPrepared(true); }}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <ThemedText variant="caption">{tenant.name} · {t('platformAdmin.extensionCurrentExpiry')}: {dateLabel(tenant.trial?.expiresAt)}</ThemedText>
        <ThemedSelect label={t('platformAdmin.extensionDays')} value={extensionDays} options={[1, 7, 14, 30].map(days => ({ value: String(days), label: String(days) }))} onChange={setExtensionDays} />
        <ThemedInput label={t('platformAdmin.extensionReason')} value={extensionReason} onChangeText={setExtensionReason} />
        {!extensionValid && <ThemedNotice tone="warning">{t('platformAdmin.extensionValidation')}</ThemedNotice>}
        {extensionPrepared && <ThemedNotice tone="info">{t('platformAdmin.extensionPendingGate')}</ThemedNotice>}
      </View>
    </ConfirmationDialog>
  </ThemedCard>;
}
