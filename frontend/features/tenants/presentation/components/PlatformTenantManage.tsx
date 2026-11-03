import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../../../core/components/ui/ThemedText';
import { ThemedButton } from '../../../../core/components/ui/ThemedButton';
import { ThemedCard } from '../../../../core/components/ui/ThemedCard';
import { ThemedNotice } from '../../../../core/components/ui/ThemedNotice';
import { ThemedInput } from '../../../../core/components/ui/ThemedInput';
import { StatusBadge } from '../../../../core/components/ui/StatusBadge';
import { ConfirmationDialog } from '../../../../core/components/ConfirmationDialog';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { PlatformTenant } from '../../domain/entities/platformTenant';
import { PlatformTrialCommandResult, PlatformTrialFailure, createOperationKey, toPlatformTrialFailure, usePlatformTrialCommands } from '../hooks/usePlatformTrialCommands';
import { clinicTypeLabel, dateLabel, entitlementReason, operationalStatusLabel, statusLabel, trialLabel } from '../../application/platformTenantPresentation';

const EXTENSION_DAY_OPTIONS = [1, 7, 14, 30];
const DEFAULT_EXTENSION_DAYS = '30';
const EXTENSION_REASON_MAX = 160;
type CommandStatus = { status: 'idle' | 'submitting' | 'failed'; failure: PlatformTrialFailure | null };
const IDLE_COMMAND: CommandStatus = { status: 'idle', failure: null };
export type PlatformTrialCommands = ReturnType<typeof usePlatformTrialCommands>;
type ExtensionRefresh = { status: 'idle' | 'refreshing' | 'ready' | 'failed'; tenant: PlatformTenant | null };
const IDLE_REFRESH: ExtensionRefresh = { status: 'idle', tenant: null };

/**
 * `onRefresh` performs an awaited, single-tenant read of the latest authoritative projection
 * (trial state, expiry, aggregate version). The extension preparation flow waits for it and never
 * proceeds on a stale or failed read. Without it, the supplied tenant is used as-is.
 */
export function PlatformTenantManage({ tenant, onRefresh, commands }: { tenant: PlatformTenant; onRefresh?: (tenantId: string) => Promise<PlatformTenant>; commands?: PlatformTrialCommands }) {
  const theme = useClinicTheme();
  const { width } = useWindowDimensions();
  const narrow = width < theme.sizes.wideLayout;
  const [identifiers, setIdentifiers] = useState(false);
  const [history, setHistory] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(false);
  const [extensionDialog, setExtensionDialog] = useState(false);
  const [extensionDays, setExtensionDays] = useState(DEFAULT_EXTENSION_DAYS);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionPrepared, setExtensionPrepared] = useState(false);
  const [extensionRefresh, setExtensionRefresh] = useState<ExtensionRefresh>(IDLE_REFRESH);
  const [initializeDialog, setInitializeDialog] = useState(false);
  const [initializeCommand, setInitializeCommand] = useState<CommandStatus>(IDLE_COMMAND);
  const [grantCommand, setGrantCommand] = useState<CommandStatus>(IDLE_COMMAND);
  const [outcome, setOutcome] = useState<{ kind: 'initialized' | 'granted'; result: PlatformTrialCommandResult } | null>(null);
  const operationKey = useRef<string | null>(null);
  const commandInFlight = useRef(false);
  const organizationId = tenant.organization?.id ?? null;
  const canInitialize = Boolean(commands && organizationId && tenant.trial === null && tenant.trialCount === 0);
  const refreshInFlight = useRef(false);
  const refreshGeneration = useRef(0);
  useEffect(() => () => { refreshGeneration.current += 1; }, []);
  const extensionValid = Number.isInteger(Number(extensionDays)) && Number(extensionDays) >= 1 && Number(extensionDays) <= 30 && extensionReason.trim().length > 0 && extensionReason.trim().length <= EXTENSION_REASON_MAX;
  const authoritativeVersion = extensionRefresh.status === 'ready' ? (extensionRefresh.tenant ?? tenant).trial?.aggregateVersion ?? null : null;
  const canReviewExtension = extensionRefresh.status === 'ready' && extensionValid && authoritativeVersion !== null;
  // The read-only review is reachable only after a successful refresh and valid input.
  const reviewing = extensionPrepared && canReviewExtension;
  // Authoritative values are shown only after a successful refresh; never the possibly stale row.
  const authoritative = extensionRefresh.status === 'ready' ? (extensionRefresh.tenant ?? tenant) : null;
  const refreshForExtension = async () => {
    if (refreshInFlight.current) return; // repeated presses never start a second refresh
    if (!onRefresh) { setExtensionRefresh({ status: 'ready', tenant: null }); return; }
    const generation = ++refreshGeneration.current;
    refreshInFlight.current = true;
    setExtensionRefresh({ status: 'refreshing', tenant: null });
    try {
      const fresh = await onRefresh(tenant.id);
      if (generation === refreshGeneration.current) setExtensionRefresh({ status: 'ready', tenant: fresh });
    } catch {
      if (generation === refreshGeneration.current) setExtensionRefresh({ status: 'failed', tenant: null });
    } finally {
      if (generation === refreshGeneration.current) refreshInFlight.current = false;
    }
  };
  const openExtensionPreparation = () => {
    if (extensionDialog || refreshInFlight.current) return;
    setOutcome(null);
    setGrantCommand(IDLE_COMMAND);
    setExtensionPrepared(false);
    setExtensionDialog(true);
    void refreshForExtension();
  };
  const closeExtensionDialog = () => {
    refreshGeneration.current += 1; // discard any in-flight result
    refreshInFlight.current = false;
    setExtensionDialog(false);
    setExtensionDays(DEFAULT_EXTENSION_DAYS);
    setExtensionReason('');
    setExtensionPrepared(false);
    setExtensionRefresh(IDLE_REFRESH);
    setGrantCommand(IDLE_COMMAND);
    operationKey.current = null;
  };
  const retryOrRotateKey = (failure: PlatformTrialFailure) => { if (!failure.retryable) operationKey.current = null; };
  const submitGrant = async () => {
    if (!reviewing || !commands || !organizationId || authoritativeVersion === null || commandInFlight.current) return;
    commandInFlight.current = true;
    operationKey.current ??= createOperationKey();
    setGrantCommand({ status: 'submitting', failure: null });
    try {
      const result = await commands.grant(organizationId, tenant.id, { aggregateVersion: authoritativeVersion, extensionDays: Number(extensionDays), reason: extensionReason.trim(), idempotencyKey: operationKey.current });
      closeExtensionDialog();
      setOutcome({ kind: 'granted', result });
    } catch (error) {
      const failure = toPlatformTrialFailure(error);
      retryOrRotateKey(failure);
      setGrantCommand({ status: 'failed', failure });
    } finally {
      commandInFlight.current = false;
    }
  };
  const openInitialize = () => { operationKey.current = null; setOutcome(null); setInitializeCommand(IDLE_COMMAND); setInitializeDialog(true); };
  const closeInitialize = () => { if (commandInFlight.current) return; operationKey.current = null; setInitializeDialog(false); setInitializeCommand(IDLE_COMMAND); };
  const submitInitialize = async () => {
    if (!commands || !organizationId || commandInFlight.current) return;
    commandInFlight.current = true;
    operationKey.current ??= createOperationKey();
    setInitializeCommand({ status: 'submitting', failure: null });
    try {
      const result = await commands.initialize(organizationId, tenant.id, operationKey.current);
      operationKey.current = null;
      setInitializeDialog(false);
      setInitializeCommand(IDLE_COMMAND);
      setOutcome({ kind: 'initialized', result });
    } catch (error) {
      const failure = toPlatformTrialFailure(error);
      retryOrRotateKey(failure);
      setInitializeCommand({ status: 'failed', failure });
    } finally {
      commandInFlight.current = false;
    }
  };
  const failureText = (failure: PlatformTrialFailure) => t(failure.kind === 'FORBIDDEN' || failure.kind === 'UNAUTHORIZED' ? 'platformAdmin.commandForbidden' : failure.kind === 'CONFLICT' || failure.kind === 'NOT_FOUND' ? 'platformAdmin.commandConflict' : 'platformAdmin.commandFailed');
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
            <ThemedText variant="subtitle2">{t('platformAdmin.extendTrial')}</ThemedText><ThemedText variant="caption">{t('platformAdmin.extensionOperation')}</ThemedText>
            <ThemedText variant="caption">{t(canInitialize ? 'platformAdmin.initializeTrialGate' : 'platformAdmin.extensionGate')}</ThemedText>
            {canInitialize
              ? <ThemedButton label={t('platformAdmin.initializeTrial')} onPress={openInitialize} icon="play-circle-outline" />
              : <ThemedButton label={t('platformAdmin.prepareExtension')} onPress={openExtensionPreparation} icon="calendar-outline" />}
            {outcome && <ThemedNotice testID="trial-command-outcome" tone="success">{t(outcome.kind === 'granted' ? 'platformAdmin.extensionGranted' : 'platformAdmin.trialInitialized', { expiry: dateLabel(outcome.result.expiresAt) })}</ThemedNotice>}
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
      visible={initializeDialog}
      title={t('platformAdmin.initializeTrialTitle')}
      message={t('platformAdmin.initializeTrialMessage')}
      confirmText={t('platformAdmin.initializeTrial')}
      loading={initializeCommand.status === 'submitting'}
      scrollBody
      onCancel={closeInitialize}
      onConfirm={() => { void submitInitialize(); }}
    >
      {initializeCommand.status === 'failed' && initializeCommand.failure && <ThemedNotice tone="error">{failureText(initializeCommand.failure)}</ThemedNotice>}
    </ConfirmationDialog>
    <ConfirmationDialog
      visible={extensionDialog}
      title={t('platformAdmin.extensionDialogTitle')}
      message={reviewing ? t('platformAdmin.extensionReviewGate') : t('platformAdmin.extensionDialogMessage')}
      confirmText={reviewing ? t('platformAdmin.grantExtension') : t('platformAdmin.reviewExtension')}
      cancelText={reviewing ? t('common.close') : undefined}
      loading={grantCommand.status === 'submitting'}
      confirmDisabled={reviewing ? !commands || !organizationId : !canReviewExtension}
      scrollBody
      onCancel={closeExtensionDialog}
      onConfirm={() => { if (reviewing) void submitGrant(); else if (canReviewExtension) setExtensionPrepared(true); }}
    >
      {reviewing && authoritative ? <View testID="extension-review" style={{ gap: theme.spacing.md }}>
        <ThemedNotice tone="warning">{t('platformAdmin.extensionNotSentYet')}</ThemedNotice>
        <View style={{ gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.radii.medium, backgroundColor: theme.colors.surface.muted }}>
          <ThemedText variant="subtitle2">{tenant.name}</ThemedText>
          {field('storedState', statusLabel(authoritative.trial?.state))}
          {field('extensionCurrentExpiry', dateLabel(authoritative.trial?.expiresAt))}
          {field('extensionDays', extensionDays)}
          {field('extensionReason', extensionReason.trim())}
        </View>
        {grantCommand.status === 'failed' && grantCommand.failure && <ThemedNotice tone="error">{failureText(grantCommand.failure)}</ThemedNotice>}
        <ThemedButton variant="outline" icon="arrow-back" label={t('platformAdmin.backToEdit')} disabled={grantCommand.status === 'submitting'} onPress={() => { setExtensionPrepared(false); setGrantCommand(IDLE_COMMAND); operationKey.current = null; }} />
      </View> : <View style={{ gap: theme.spacing.md }}>
        <View testID="extension-trial-summary" style={{ gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.radii.medium, backgroundColor: theme.colors.surface.muted }}>
          <ThemedText variant="subtitle2">{tenant.name}</ThemedText>
          {field('storedState', authoritative ? statusLabel(authoritative.trial?.state) : t('platformAdmin.unavailable'))}
          {field('extensionCurrentExpiry', authoritative ? dateLabel(authoritative.trial?.expiresAt) : t('platformAdmin.unavailable'))}
        </View>
        {extensionRefresh.status === 'refreshing' && <View testID="extension-refreshing" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <ActivityIndicator color={theme.colors.primary.default} accessibilityLabel={t('common.loading')} />
          <ThemedText variant="caption" style={{ flex: 1 }}>{t('platformAdmin.extensionRefreshing')}</ThemedText>
        </View>}
        {extensionRefresh.status === 'failed' && <View style={{ gap: theme.spacing.sm }}>
          <ThemedNotice tone="error">{t('platformAdmin.extensionRefreshFailed')}</ThemedNotice>
          <ThemedButton variant="outline" icon="refresh" label={t('common.retry')} onPress={() => { void refreshForExtension(); }} />
        </View>}
        <View style={{ gap: theme.spacing.xs }}>
          <ThemedText variant="subtitle2">{t('platformAdmin.extensionDays')}</ThemedText>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('platformAdmin.extensionDays')} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {EXTENSION_DAY_OPTIONS.map(days => {
              const selected = String(days) === extensionDays;
              return <ThemedButton key={days} fullWidth variant="outline" selected={selected} icon={selected ? 'checkmark-circle' : undefined} label={String(days)} accessibilityLabel={`${t('platformAdmin.extensionDays')}: ${days}`} onPress={() => { setExtensionDays(String(days)); setExtensionPrepared(false); operationKey.current = null; }} />;
            })}
          </View>
        </View>
        <View style={{ gap: theme.spacing.xs }}>
          <ThemedInput label={t('platformAdmin.extensionReason')} value={extensionReason} multiline maxLength={EXTENSION_REASON_MAX} onChangeText={value => { setExtensionReason(value); setExtensionPrepared(false); operationKey.current = null; }} />
          <ThemedText variant="caption" style={{ alignSelf: 'flex-end', color: theme.colors.text.secondary }}>{t('platformAdmin.extensionReasonCount', { count: extensionReason.length, max: EXTENSION_REASON_MAX })}</ThemedText>
        </View>
        {!extensionValid && <ThemedNotice tone="warning">{t('platformAdmin.extensionValidation')}</ThemedNotice>}
      </View>}
    </ConfirmationDialog>
  </ThemedCard>;
}
