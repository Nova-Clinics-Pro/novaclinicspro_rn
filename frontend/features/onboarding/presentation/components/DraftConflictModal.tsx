import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { opacities } from '../../../../core/theme/semanticColors';
import {
  ClinicTheme,
  useClinicTheme,
} from '../../../../core/theme/useClinicTheme';
import { ConflictRecoveryFailure } from '../hooks/useDraftConflictRecovery';

interface DraftConflictModalProps {
  readonly visible: boolean;
  readonly pendingAction: 'USE_LATEST' | 'KEEP_LOCAL' | null;
  readonly failure: ConflictRecoveryFailure | null;
  readonly useLatestDisabled?: boolean;
  readonly keepLocalDisabled?: boolean;
  readonly onUseLatest: () => void;
  readonly onKeepLocal: () => void;
  readonly returnFocusRef?: React.RefObject<View | null>;
}

const failureKey = (failure: ConflictRecoveryFailure) =>
  `onboarding.progressiveExperience.conflict.errors.${{
    REFRESH_FAILED: 'refresh',
    DRAFT_FAILED: 'draft',
    SECOND_CONFLICT: 'secondConflict',
    TENANT_MISMATCH: 'tenantMismatch',
    UNAUTHORIZED: 'unauthorized',
    UNSUPPORTED: 'unsupported',
    BACKEND_FAILED: 'generic',
  }[failure]}`;

export function DraftConflictModal({
  visible,
  pendingAction,
  failure,
  useLatestDisabled = false,
  keepLocalDisabled = false,
  onUseLatest,
  onKeepLocal,
  returnFocusRef,
}: DraftConflictModalProps) {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleRef = useRef<View>(null);
  const wasVisibleRef = useRef(false);
  const isPending = pendingAction !== null;

  useEffect(() => {
    if (!visible) {
      if (wasVisibleRef.current) {
        const node = findNodeHandle(returnFocusRef?.current ?? null);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }
      wasVisibleRef.current = false;
      return;
    }
    wasVisibleRef.current = true;
    const announcement = failure
      ? t(failureKey(failure))
      : t('onboarding.progressiveExperience.conflict.accessibility.opened');
    AccessibilityInfo.announceForAccessibility(announcement);
    const timer = setTimeout(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, theme.spacing.xs);
    return () => clearTimeout(timer);
  }, [failure, returnFocusRef, t, theme.spacing.xs, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => undefined}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          ref={titleRef}
          style={styles.dialog}
          accessible
          accessibilityRole={'dialog' as any}
          accessibilityLabel={t(
            'onboarding.progressiveExperience.conflict.accessibility.dialog'
          )}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name="git-compare-outline"
              size={theme.spacing.xl}
              color={theme.colors.feedback.warning}
            />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {t('onboarding.progressiveExperience.conflict.title')}
          </Text>
          <Text style={styles.description}>
            {t('onboarding.progressiveExperience.conflict.description')}
          </Text>
          <Text style={styles.reassurance}>
            {t('onboarding.progressiveExperience.conflict.reassurance')}
          </Text>

          {failure && (
            <View
              style={styles.error}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Ionicons
                name="alert-circle-outline"
                size={theme.spacing.lg}
                color={theme.colors.feedback.error}
              />
              <Text style={styles.errorText}>{t(failureKey(failure))}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                'onboarding.progressiveExperience.conflict.accessibility.useLatestLabel'
              )}
              accessibilityHint={t(
                'onboarding.progressiveExperience.conflict.accessibility.useLatestHint'
              )}
              accessibilityState={{
                disabled: isPending || useLatestDisabled,
                busy: pendingAction === 'USE_LATEST',
              }}
              disabled={isPending || useLatestDisabled}
              onPress={onUseLatest}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isPending && !useLatestDisabled
                  ? styles.pressed
                  : null,
                isPending || useLatestDisabled ? styles.disabled : null,
              ]}
            >
              {pendingAction === 'USE_LATEST' ? (
                <ActivityIndicator color={theme.colors.primary.default} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {t(
                    'onboarding.progressiveExperience.conflict.actions.useLatest'
                  )}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                'onboarding.progressiveExperience.conflict.accessibility.keepLocalLabel'
              )}
              accessibilityHint={t(
                'onboarding.progressiveExperience.conflict.accessibility.keepLocalHint'
              )}
              accessibilityState={{
                disabled: isPending || keepLocalDisabled,
                busy: pendingAction === 'KEEP_LOCAL',
              }}
              disabled={isPending || keepLocalDisabled}
              onPress={onKeepLocal}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isPending && !keepLocalDisabled
                  ? styles.pressed
                  : null,
                isPending || keepLocalDisabled ? styles.disabled : null,
              ]}
            >
              {pendingAction === 'KEEP_LOCAL' ? (
                <ActivityIndicator color={theme.colors.text.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t(
                    'onboarding.progressiveExperience.conflict.actions.keepLocal'
                  )}
                </Text>
              )}
            </Pressable>
          </View>
          {isPending && (
            <Text accessibilityLiveRegion="polite" style={styles.pendingText}>
              {t(
                `onboarding.progressiveExperience.conflict.pending.${
                  pendingAction === 'USE_LATEST' ? 'useLatest' : 'keepLocal'
                }`
              )}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: theme.colors.surface.overlay,
      padding: theme.spacing.lg,
    },
    dialog: {
      backgroundColor: theme.colors.surface.elevated,
      borderColor: theme.colors.border.default,
      borderRadius: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      padding: theme.spacing.lg,
    },
    iconContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h5,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    description: {
      ...theme.typography.body1,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    reassurance: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.lg,
    },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.feedback.errorLight,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      ...theme.typography.body2,
      color: theme.colors.feedback.error,
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    primaryButton: {
      minHeight: theme.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary.default,
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.text.onPrimary,
      textAlign: 'center',
    },
    secondaryButton: {
      minHeight: theme.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.spacing.sm,
      borderColor: theme.colors.primary.default,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface.default,
    },
    secondaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary.default,
      textAlign: 'center',
    },
    pendingText: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
    pressed: {
      opacity: opacities.subtle,
    },
    disabled: {
      opacity: opacities.disabled,
    },
  });
