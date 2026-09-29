import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import {
  type ClinicTheme,
  useClinicTheme,
} from '../../../../core/theme/useClinicTheme';
import type { PendingMutationRecord } from '../../domain/entities/pending-mutation.entity';

interface PendingMutationRecoveryBannerProps {
  readonly records: readonly PendingMutationRecord[];
  readonly recoveryRequired: boolean;
  readonly busyMutationId: string | null;
  readonly onRetry: (record: PendingMutationRecord) => void;
  readonly onEdit: (record: PendingMutationRecord) => void;
  readonly onDiscard: (record: PendingMutationRecord) => void;
}

const priority: Record<PendingMutationRecord['state'], number> = {
  CONFLICT_BLOCKED: 0,
  MANUAL_ACTION_REQUIRED: 1,
  EXPIRED: 2,
  REPLAYING: 3,
  PENDING: 4,
  SUCCEEDED: 5,
  DISCARDED: 6,
};

const canRetry = (record: PendingMutationRecord): boolean =>
  record.state === 'MANUAL_ACTION_REQUIRED' &&
  (record.failureCategory === 'VALIDATION' ||
    record.failureCategory === 'RETRY_EXHAUSTED' ||
    record.failureCategory === 'NETWORK' ||
    record.failureCategory === 'TIMEOUT' ||
    record.failureCategory === 'RETRYABLE_SERVER');

const canEdit = (record: PendingMutationRecord): boolean =>
  record.state === 'CONFLICT_BLOCKED' ||
  record.state === 'MANUAL_ACTION_REQUIRED' ||
  record.state === 'EXPIRED';

export function PendingMutationRecoveryBanner({
  records,
  recoveryRequired,
  busyMutationId,
  onRetry,
  onEdit,
  onDiscard,
}: PendingMutationRecoveryBannerProps) {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useRef<Text>(null);
  const activeRecords = useMemo(
    () =>
      records.filter(
        (item) => item.state !== 'SUCCEEDED' && item.state !== 'DISCARDED'
      ),
    [records]
  );
  const record = useMemo(
    () =>
      [...activeRecords]
        .sort(
          (left, right) =>
            priority[left.state] - priority[right.state] ||
            left.enqueuedAt - right.enqueuedAt ||
            left.mutationId.localeCompare(right.mutationId)
        )[0] ?? null,
    [activeRecords]
  );
  const state = recoveryRequired ? 'RECOVERY_REQUIRED' : record?.state ?? null;
  const busy = Boolean(record && busyMutationId === record.mutationId);

  useEffect(() => {
    if (!state) return;
    AccessibilityInfo.announceForAccessibility(
      t(`onboarding.progressiveExperience.mutationRecovery.states.${state}`)
    );
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, theme.spacing.xs);
    return () => clearTimeout(timer);
  }, [state, t, theme.spacing.xs]);

  if (!state) return null;

  return (
    <View style={styles.container}>
      <Ionicons
        name={state === 'REPLAYING' ? 'sync-outline' : 'cloud-done-outline'}
        size={theme.spacing.xl}
        color={theme.colors.feedback.warning}
      />
      <View style={styles.content}>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion={
            state === 'CONFLICT_BLOCKED' ||
            state === 'MANUAL_ACTION_REQUIRED'
              ? 'assertive'
              : 'polite'
          }
        >
          <Text ref={titleRef} style={styles.title} accessibilityRole="header">
            {t('onboarding.progressiveExperience.mutationRecovery.title')}
          </Text>
          <Text style={styles.message}>
            {t(
              `onboarding.progressiveExperience.mutationRecovery.states.${state}`
            )}
          </Text>
          {record && activeRecords.length > 1 ? (
            <Text style={styles.summary}>
              {t(
                'onboarding.progressiveExperience.mutationRecovery.pendingCount',
                { count: activeRecords.length }
              )}
            </Text>
          ) : null}
        </View>
        {record && (
          <View style={styles.actions}>
            {canRetry(record) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'onboarding.progressiveExperience.mutationRecovery.actions.retry'
                )}
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={() => onRetry(record)}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && !busy ? styles.pressed : null,
                  busy ? styles.disabled : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.text.onPrimary} />
                ) : (
                  <Text style={styles.primaryActionText}>
                    {t(
                      'onboarding.progressiveExperience.mutationRecovery.actions.retry'
                    )}
                  </Text>
                )}
              </Pressable>
            )}
            {canEdit(record) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'onboarding.progressiveExperience.mutationRecovery.actions.edit'
                )}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => onEdit(record)}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && !busy ? styles.pressed : null,
                  busy ? styles.disabled : null,
                ]}
              >
                <Text style={styles.secondaryActionText}>
                  {t(
                    'onboarding.progressiveExperience.mutationRecovery.actions.edit'
                  )}
                </Text>
              </Pressable>
            )}
            {record.state !== 'REPLAYING' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'onboarding.progressiveExperience.mutationRecovery.actions.discard'
                )}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => onDiscard(record)}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && !busy ? styles.pressed : null,
                  busy ? styles.disabled : null,
                ]}
              >
                <Text style={styles.secondaryActionText}>
                  {t(
                    'onboarding.progressiveExperience.mutationRecovery.actions.discard'
                  )}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.feedback.warningLight,
      borderColor: theme.colors.feedback.warning,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
    },
    message: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    summary: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    primaryAction: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary.default,
      borderRadius: theme.spacing.sm,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.md,
    },
    primaryActionText: {
      ...theme.typography.button,
      color: theme.colors.text.onPrimary,
    },
    secondaryAction: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface.default,
      borderColor: theme.colors.border.default,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.md,
    },
    secondaryActionText: {
      ...theme.typography.button,
      color: theme.colors.text.primary,
    },
    pressed: {
      opacity: 0.8,
    },
    disabled: {
      opacity: 0.5,
    },
  });
