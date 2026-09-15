import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import {
  CommercialRetentionAction,
  CommercialTrialError,
  useActivateCommercialTrialMutation,
  useCommercialRetentionQuery,
  useGrantCommercialTrialExtensionMutation,
  useRequestCommercialTrialExtensionMutation,
} from '../../../commercialPlatform';
import { useOrganizationContextQuery } from '../../data/repositories/onboarding.repository.impl';
import { ErrorScreen } from '../components/ErrorScreen';
import { LoadingScreen } from '../components/LoadingScreen';

interface CommercialRetentionScreenProps {
  /**
   * Kept temporarily for source compatibility with existing callers. The
   * authoritative organization scope is always read from /auth/me below.
   */
  organizationId?: string;
  tenantId: string;
  onCommercialEligibilityConfirmed?: () => Promise<void>;
}

const ROOT = 'onboarding.progressiveExperience.commercialRetention';
const EXTENSION_REASON_MAX_LENGTH = 160;
const EXTENSION_DAYS_MAX = 30;
const EXTENSION_CHANNELS = ['SUPPORT', 'SALES', 'CUSTOMER_SUCCESS'] as const;

type ExtensionChannel = (typeof EXTENSION_CHANNELS)[number];
type ExtensionAction = Extract<
  CommercialRetentionAction,
  'REQUEST_EXTENSION' | 'GRANT_EXTENSION' | 'RESTORE_WORKSPACE'
>;

const createOperationKey = () => {
  const cryptoRandomUUID = globalThis.crypto?.randomUUID;
  if (cryptoRandomUUID) {
    return cryptoRandomUUID.call(globalThis.crypto);
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export function CommercialRetentionScreen({
  tenantId,
  onCommercialEligibilityConfirmed,
}: CommercialRetentionScreenProps) {
  const theme = useClinicTheme();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const organizationContext = useOrganizationContextQuery();
  const organizationId = organizationContext.data?.effectiveOrganizationId ?? '';
  const scopeMatches = Boolean(
    organizationId &&
      tenantId &&
      organizationContext.data?.effectiveTenantId === tenantId &&
      !organizationContext.data?.selectionRequired &&
      !organizationContext.data?.sessionRefreshRequired
  );
  const query = useCommercialRetentionQuery(organizationId, tenantId);
  const activateMutation = useActivateCommercialTrialMutation(organizationId, tenantId);
  const requestExtensionMutation = useRequestCommercialTrialExtensionMutation(
    organizationId,
    tenantId
  );
  const grantExtensionMutation = useGrantCommercialTrialExtensionMutation(
    organizationId,
    tenantId
  );
  const [extensionAction, setExtensionAction] = useState<ExtensionAction | null>(null);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState('');
  const [extensionChannel, setExtensionChannel] = useState<ExtensionChannel | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    kind: 'success' | 'error';
    token: string;
  } | null>(null);
  const activationKey = useRef<string | null>(null);
  const extensionKey = useRef<string | null>(null);
  const confirmationOpen = useRef(false);
  const submissionInFlight = useRef(false);
  const completionInFlight = useRef(false);
  const [completionPending, setCompletionPending] = useState(false);

  const actionPending =
    activateMutation.isPending ||
    requestExtensionMutation.isPending ||
    grantExtensionMutation.isPending ||
    completionPending;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(value));

  const actionErrorToken = (error: unknown) => {
    if (!(error instanceof CommercialTrialError)) {
      return `${ROOT}.workflow.errors.network`;
    }
    if (error.kind === 'UNAUTHORIZED' || error.kind === 'FORBIDDEN') {
      return `${ROOT}.workflow.errors.permissionDenied`;
    }
    if (error.kind === 'CONFIRMATION_REQUIRED') {
      return `${ROOT}.workflow.errors.confirmationRequired`;
    }
    if (error.kind === 'CONFLICT') {
      return `${ROOT}.workflow.errors.conflict`;
    }
    if (error.kind === 'NOT_READY' || error.kind === 'INVALID_AGGREGATE') {
      return `${ROOT}.workflow.errors.notAvailable`;
    }
    return `${ROOT}.workflow.errors.network`;
  };

  const refreshAfterSuccess = async (successToken: string) => {
    setActionMessage({ kind: 'success', token: successToken });
    const refreshed = await query.refetch();
    if (refreshed.error || !refreshed.data) {
      throw refreshed.error ?? new CommercialTrialError(
        'BACKEND_FAILURE',
        'commercial_trial.authoritative_refresh_unavailable',
        'errors.commercialTrial.application_failure',
        true
      );
    }
    return refreshed.data;
  };

  const completeAfterAuthoritativeCommercialRefresh = async (
    commercialState: string
  ) => {
    if (
      !scopeMatches ||
      !onCommercialEligibilityConfirmed ||
      !['ACTIVE', 'EXPIRING'].includes(commercialState) ||
      completionInFlight.current
    ) {
      if (!['ACTIVE', 'EXPIRING'].includes(commercialState)) {
        setActionMessage({ kind: 'error', token: `${ROOT}.workflow.errors.notAvailable` });
      }
      return;
    }
    completionInFlight.current = true;
    setCompletionPending(true);
    try {
      await onCommercialEligibilityConfirmed();
    } catch {
      setActionMessage({ kind: 'error', token: `${ROOT}.workflow.errors.network` });
    } finally {
      completionInFlight.current = false;
      setCompletionPending(false);
    }
  };

  const refreshIfAuthorityChanged = async (error: unknown) => {
    if (
      error instanceof CommercialTrialError &&
      (error.kind === 'CONFLICT' ||
        error.kind === 'NOT_READY' ||
        error.kind === 'INVALID_AGGREGATE')
    ) {
      await query.refetch();
    }
  };

  const startTrial = () => {
    if (actionPending || confirmationOpen.current || submissionInFlight.current) return;
    confirmationOpen.current = true;
    activationKey.current ??= createOperationKey();
    Alert.alert(
      t(`${ROOT}.workflow.startTrial.confirmTitle`),
      t(`${ROOT}.workflow.startTrial.confirmMessage`),
      [
        {
          text: t(`${ROOT}.workflow.actions.cancel`),
          style: 'cancel',
          onPress: () => {
            confirmationOpen.current = false;
            activationKey.current = null;
          },
        },
        {
          text: t(`${ROOT}.workflow.startTrial.confirmAction`),
          onPress: async () => {
            confirmationOpen.current = false;
            if (
              activateMutation.isPending ||
              submissionInFlight.current ||
              !query.data ||
              !activationKey.current
            ) {
              return;
            }
            submissionInFlight.current = true;
            setActionMessage(null);
            try {
              await activateMutation.mutateAsync({
                aggregateVersion: query.data.aggregateVersion,
                confirmed: true,
                idempotencyKey: activationKey.current,
              });
              activationKey.current = null;
              const refreshed = await refreshAfterSuccess(
                `${ROOT}.workflow.startTrial.success`
              );
              await completeAfterAuthoritativeCommercialRefresh(
                refreshed.commercialState
              );
            } catch (error) {
              setActionMessage({ kind: 'error', token: actionErrorToken(error) });
              await refreshIfAuthorityChanged(error);
            } finally {
              submissionInFlight.current = false;
            }
          },
        },
      ]
    );
  };

  const openExtension = (action: ExtensionAction) => {
    if (actionPending) return;
    extensionKey.current = createOperationKey();
    setExtensionAction(action);
    setExtensionReason('');
    setExtensionDays('');
    setExtensionChannel(null);
    setActionMessage(null);
  };

  const closeExtension = () => {
    if (actionPending) return;
    extensionKey.current = null;
    setExtensionAction(null);
  };

  const submitExtension = async () => {
    if (
      !extensionAction ||
      actionPending ||
      submissionInFlight.current ||
      !query.data ||
      !extensionKey.current
    ) {
      return;
    }
    const trimmedReason = extensionReason.trim();
    if (
      trimmedReason.length === 0 ||
      trimmedReason.length > EXTENSION_REASON_MAX_LENGTH
    ) {
      setActionMessage({ kind: 'error', token: `${ROOT}.workflow.extension.reasonError` });
      return;
    }

    const isGrant =
      extensionAction === 'GRANT_EXTENSION' || extensionAction === 'RESTORE_WORKSPACE';
    const parsedDays = Number(extensionDays);
    if (
      isGrant &&
      (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > EXTENSION_DAYS_MAX)
    ) {
      setActionMessage({ kind: 'error', token: `${ROOT}.workflow.extension.daysError` });
      return;
    }
    if (isGrant && !extensionChannel) {
      setActionMessage({ kind: 'error', token: `${ROOT}.workflow.extension.channelError` });
      return;
    }

    setActionMessage(null);
    submissionInFlight.current = true;
    try {
      if (isGrant) {
        await grantExtensionMutation.mutateAsync({
          aggregateVersion: query.data.aggregateVersion,
          extensionDays: parsedDays,
          reason: trimmedReason,
          channel: extensionChannel as ExtensionChannel,
          idempotencyKey: extensionKey.current,
        });
      } else {
        await requestExtensionMutation.mutateAsync({
          reason: trimmedReason,
          channel: 'IN_APP_REQUEST',
          idempotencyKey: extensionKey.current,
        });
      }
      extensionKey.current = null;
      setExtensionAction(null);
      await refreshAfterSuccess(`${ROOT}.workflow.extension.success`);
    } catch (error) {
      setActionMessage({ kind: 'error', token: actionErrorToken(error) });
      await refreshIfAuthorityChanged(error);
    } finally {
      submissionInFlight.current = false;
    }
  };

  const handleAction = (action: CommercialRetentionAction) => {
    if (action === 'START_TRIAL') {
      startTrial();
    } else if (
      action === 'REQUEST_EXTENSION' ||
      action === 'GRANT_EXTENSION' ||
      action === 'RESTORE_WORKSPACE'
    ) {
      openExtension(action);
    }
  };

  const isExecutableAction = (action: CommercialRetentionAction) =>
    action === 'START_TRIAL' ||
    action === 'REQUEST_EXTENSION' ||
    action === 'GRANT_EXTENSION' ||
    action === 'RESTORE_WORKSPACE';

  if (organizationContext.isPending) {
    return <LoadingScreen message={t(`${ROOT}.loading`)} />;
  }

  if (organizationContext.error || !scopeMatches) {
    return (
      <ErrorScreen
        title={t(`${ROOT}.empty.title`)}
        message={t(`${ROOT}.empty.permissionDenied`)}
        onRetry={organizationContext.error ? () => void organizationContext.refetch() : undefined}
        retryLabel={t(`${ROOT}.actions.retry`)}
      />
    );
  }

  if (query.isPending) {
    return <LoadingScreen message={t(`${ROOT}.loading`)} />;
  }

  if (query.error || !query.data) {
    const kind =
      query.error instanceof CommercialTrialError
        ? query.error.kind
        : 'BACKEND_FAILURE';
    const retryable =
      query.error instanceof CommercialTrialError && query.error.retryable;
    const messageKey =
      kind === 'UNAUTHORIZED' || kind === 'FORBIDDEN'
        ? 'permissionDenied'
        : kind === 'NOT_FOUND'
          ? 'missingWorkspace'
          : kind === 'RETENTION_EVIDENCE_UNAVAILABLE'
            ? 'missingEvidence'
            : kind === 'UNSUPPORTED_CONTRACT' || kind === 'INVALID_AGGREGATE'
              ? 'unsupported'
              : 'network';
    return (
      <ErrorScreen
        title={t(`${ROOT}.empty.title`)}
        message={t(`${ROOT}.empty.${messageKey}`)}
        onRetry={retryable ? () => void query.refetch() : undefined}
        retryLabel={t(`${ROOT}.actions.retry`)}
      />
    );
  }

  const retention = query.data;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      accessibilityLabel={t(`${ROOT}.accessibility.screen`)}
    >
      <View style={styles.header}>
        <Ionicons
          name="business-outline"
          size={theme.spacing.xxl}
          color={theme.colors.primary.default}
        />
        <Text style={styles.title} accessibilityRole="header">
          {t(`${ROOT}.title`)}
        </Text>
        <Text style={styles.introduction}>{t(`${ROOT}.introduction`)}</Text>
      </View>

      <View style={styles.card} accessible>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t(`${ROOT}.workspaceStatus.title`)}
        </Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {t(`${ROOT}.states.${retention.commercialState}`)}
        </Text>
        <Text style={styles.body}>
          {t(`${ROOT}.stateDescriptions.${retention.commercialState}`)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t(`${ROOT}.retention.title`)}
        </Text>
        {retention.archivedAt ? (
          <InformationRow
            label={t(`${ROOT}.retention.archivedAt`)}
            value={formatDate(retention.archivedAt)}
            styles={styles}
          />
        ) : null}
        {retention.retentionUntil ? (
          <InformationRow
            label={t(`${ROOT}.retention.retentionUntil`)}
            value={formatDate(retention.retentionUntil)}
            styles={styles}
          />
        ) : null}
        {retention.legalHoldActive !== null ? (
          <InformationRow
            label={t(`${ROOT}.retention.legalHold`)}
            value={t(
              `${ROOT}.retention.${retention.legalHoldActive ? 'active' : 'notActive'}`
            )}
            styles={styles}
          />
        ) : null}
        {retention.statutoryRetentionActive !== null ? (
          <InformationRow
            label={t(`${ROOT}.retention.statutoryRetention`)}
            value={t(
              `${ROOT}.retention.${
                retention.statutoryRetentionActive ? 'active' : 'notActive'
              }`
            )}
            styles={styles}
          />
        ) : null}
        {!retention.archivedAt &&
        !retention.retentionUntil &&
        retention.legalHoldActive === null &&
        retention.statutoryRetentionActive === null ? (
          <Text style={styles.body}>{t(`${ROOT}.retention.notApplicable`)}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t(`${ROOT}.availableActions.title`)}
        </Text>
        {retention.allowedActions.length === 0 ? (
          <Text style={styles.body}>{t(`${ROOT}.availableActions.none`)}</Text>
        ) : (
          retention.allowedActions.map((action) => (
            <Pressable
              key={action}
              style={styles.actionRow}
              onPress={() => handleAction(action)}
              disabled={actionPending || !isExecutableAction(action)}
              accessibilityRole="button"
              accessibilityState={{
                disabled: actionPending || !isExecutableAction(action),
                busy: actionPending && isExecutableAction(action),
              }}
              accessibilityLabel={`${t(`${ROOT}.actionLabels.${action}`)}. ${t(
                `${ROOT}.actionDescriptions.${action}`
              )}`}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={theme.spacing.xl}
                color={theme.colors.feedback.success}
              />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>
                  {t(`${ROOT}.actionLabels.${action}`)}
                </Text>
                <Text style={styles.body}>
                  {t(`${ROOT}.actionDescriptions.${action}`)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {actionMessage && !extensionAction ? (
        <View
          style={actionMessage.kind === 'error' ? styles.errorMessage : styles.successMessage}
          accessible
          accessibilityRole={actionMessage.kind === 'error' ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.messageText}>{t(actionMessage.token)}</Text>
        </View>
      ) : null}

      {['ACTIVE', 'EXPIRING'].includes(retention.commercialState) &&
      onCommercialEligibilityConfirmed ? (
        <Pressable
          style={[styles.handoffButton, completionPending && styles.disabledButton]}
          onPress={() =>
            void completeAfterAuthoritativeCommercialRefresh(retention.commercialState)
          }
          disabled={actionPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: actionPending, busy: completionPending }}
          accessibilityLabel={t(
            'onboarding.progressiveExperience.readyToStart.presentation.actions.continue'
          )}
        >
          {completionPending ? (
            <ActivityIndicator color={theme.colors.primary.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {t('onboarding.progressiveExperience.readyToStart.presentation.actions.continue')}
            </Text>
          )}
        </Pressable>
      ) : null}

      {retention.ineligibilityReasons.length > 0 ? (
        <View
          style={styles.warningCard}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t(`${ROOT}.unavailable.title`)}
          </Text>
          {retention.ineligibilityReasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Ionicons
                name="information-circle-outline"
                size={theme.spacing.lg}
                color={theme.colors.feedback.warning}
              />
              <Text style={styles.reasonText}>
                {t(`${ROOT}.ineligibilityReasons.${reason}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footer}>{t(`${ROOT}.footer`)}</Text>

      <Modal
        visible={extensionAction !== null}
        transparent
        animationType="fade"
        onRequestClose={closeExtension}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={styles.modalCard}
            accessibilityViewIsModal
            accessibilityLabel={t(`${ROOT}.workflow.extension.title`)}
          >
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t(`${ROOT}.workflow.extension.title`)}
            </Text>
            <Text style={styles.body}>{t(`${ROOT}.workflow.extension.guidance`)}</Text>
            {actionMessage ? (
              <View
                style={
                  actionMessage.kind === 'error'
                    ? styles.errorMessage
                    : styles.successMessage
                }
                accessible
                accessibilityRole={actionMessage.kind === 'error' ? 'alert' : undefined}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.messageText}>{t(actionMessage.token)}</Text>
              </View>
            ) : null}
            <Text style={styles.inputLabel}>
              {t(`${ROOT}.workflow.extension.reasonLabel`)}
            </Text>
            <TextInput
              value={extensionReason}
              onChangeText={setExtensionReason}
              editable={!actionPending}
              multiline
              autoFocus
              maxLength={EXTENSION_REASON_MAX_LENGTH + 1}
              style={styles.textInput}
              accessibilityLabel={t(`${ROOT}.workflow.extension.reasonLabel`)}
              accessibilityHint={t(`${ROOT}.workflow.extension.reasonHint`)}
            />
            <Text style={styles.inputHelp}>
              {t(`${ROOT}.workflow.extension.remaining`, {
                count: Math.max(0, EXTENSION_REASON_MAX_LENGTH - extensionReason.length),
              })}
            </Text>

            {extensionAction === 'GRANT_EXTENSION' ||
            extensionAction === 'RESTORE_WORKSPACE' ? (
              <>
                <Text style={styles.inputLabel}>
                  {t(`${ROOT}.workflow.extension.daysLabel`)}
                </Text>
                <TextInput
                  value={extensionDays}
                  onChangeText={setExtensionDays}
                  editable={!actionPending}
                  keyboardType="number-pad"
                  style={styles.textInput}
                  accessibilityLabel={t(`${ROOT}.workflow.extension.daysLabel`)}
                />
                <Text style={styles.inputLabel}>
                  {t(`${ROOT}.workflow.extension.channelLabel`)}
                </Text>
                <View style={styles.channelGroup}>
                  {EXTENSION_CHANNELS.map((channel) => (
                    <Pressable
                      key={channel}
                      style={[
                        styles.channelButton,
                        extensionChannel === channel && styles.channelButtonSelected,
                      ]}
                      onPress={() => setExtensionChannel(channel)}
                      disabled={actionPending}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: extensionChannel === channel,
                        disabled: actionPending,
                      }}
                    >
                      <Text style={styles.channelButtonText}>
                        {t(`${ROOT}.workflow.extension.channels.${channel}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={closeExtension}
                disabled={actionPending}
                accessibilityRole="button"
                accessibilityState={{ disabled: actionPending }}
              >
                <Text style={styles.secondaryButtonText}>
                  {t(`${ROOT}.workflow.actions.cancel`)}
                </Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={() => void submitExtension()}
                disabled={actionPending}
                accessibilityRole="button"
                accessibilityState={{ disabled: actionPending, busy: actionPending }}
              >
                {actionPending ? (
                  <ActivityIndicator
                    color={theme.colors.primary.onPrimary}
                    accessibilityLabel={t(`${ROOT}.workflow.actions.submitting`)}
                  />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {t(`${ROOT}.workflow.extension.submit`)}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

interface InformationRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}

function InformationRow({ label, value, styles }: InformationRowProps) {
  return (
    <View style={styles.informationRow} accessible accessibilityLabel={`${label}. ${value}`}>
      <Text style={styles.informationLabel}>{label}</Text>
      <Text style={styles.informationValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h3,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    introduction: {
      ...theme.typography.body1,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface.default,
      padding: theme.spacing.lg,
      borderRadius: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.subtle,
      gap: theme.spacing.md,
    },
    warningCard: {
      backgroundColor: theme.colors.feedback.warningLight,
      padding: theme.spacing.lg,
      borderRadius: theme.spacing.md,
      gap: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.h5,
      color: theme.colors.text.primary,
    },
    status: {
      ...theme.typography.h4,
      color: theme.colors.primary.default,
    },
    body: {
      ...theme.typography.body1,
      color: theme.colors.text.secondary,
    },
    informationRow: {
      gap: theme.spacing.xs,
    },
    informationLabel: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
    },
    informationValue: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      minHeight: 44,
      paddingVertical: theme.spacing.sm,
    },
    actionText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    actionTitle: {
      ...theme.typography.h6,
      color: theme.colors.text.primary,
    },
    reasonRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    reasonText: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
      flex: 1,
    },
    footer: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    successMessage: {
      backgroundColor: theme.colors.feedback.successLight,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.md,
    },
    errorMessage: {
      backgroundColor: theme.colors.feedback.errorLight,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.md,
    },
    messageText: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface.overlay,
      padding: theme.spacing.lg,
    },
    modalCard: {
      backgroundColor: theme.colors.surface.default,
      padding: theme.spacing.lg,
      borderRadius: theme.spacing.md,
      gap: theme.spacing.md,
    },
    inputLabel: {
      ...theme.typography.body2,
      color: theme.colors.text.primary,
    },
    inputHelp: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
    },
    textInput: {
      ...theme.typography.body1,
      minHeight: 44,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.default,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.default,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    channelGroup: {
      gap: theme.spacing.sm,
    },
    channelButton: {
      minHeight: 44,
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.default,
      borderRadius: theme.spacing.sm,
    },
    channelButtonSelected: {
      borderColor: theme.colors.primary.default,
      backgroundColor: theme.colors.primary.light,
    },
    channelButtonText: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: theme.spacing.md,
    },
    primaryButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primary.default,
    },
    handoffButton: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.primary.default,
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    disabledButton: {
      backgroundColor: theme.colors.primary.light,
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary.onPrimary,
    },
    secondaryButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border.default,
    },
    secondaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.text.primary,
    },
  });
