/**
 * Single Save / Discard / Cancel dialog for every unsaved-work boundary (guarded exit, warm deep link, completion step,
 * user-initiated logout). Mounted once in the root layout; it renders the one pending decision from the registry.
 */
import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useTranslation } from '../localization/useTranslation';
import { resolveUnsavedWorkDecision } from './unsavedWorkRegistry';
import { useUnsavedWorkSnapshot } from './useUnsavedWork';

export const UnsavedWorkDialogHost: React.FC = () => {
  const { t } = useTranslation();
  const { pending, busy, error } = useUnsavedWorkSnapshot();

  if (!pending) return null;

  const saving = busy === 'save';
  const discarding = busy === 'discard';
  const disabled = busy !== null;
  const items = pending.labels.join(', ');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!disabled) void resolveUnsavedWorkDecision('cancel');
      }}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityRole="alert" testID="unsaved-work-dialog">
          <Text style={styles.title} accessibilityRole="header">
            {t('unsavedWork.title')}
          </Text>
          <Text style={styles.context}>{t(`unsavedWork.intent.${pending.intent}`)}</Text>
          <Text style={styles.message}>{t('unsavedWork.message', { items })}</Text>
          {error === 'save' ? <Text style={styles.error}>{t('unsavedWork.saveFailed')}</Text> : null}
          {error === 'discard' ? <Text style={styles.error}>{t('unsavedWork.discardFailed')}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primary, disabled && styles.disabled]}
              onPress={() => void resolveUnsavedWorkDecision('save')}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('unsavedWork.save')}
              accessibilityState={{ disabled, busy: saving }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Text style={styles.primaryText}>{t('unsavedWork.save')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondary, disabled && styles.disabled]}
              onPress={() => void resolveUnsavedWorkDecision('discard')}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('unsavedWork.discard')}
              accessibilityState={{ disabled, busy: discarding }}
            >
              {discarding ? (
                <ActivityIndicator size="small" color={colors.error.main} />
              ) : (
                <Text style={styles.discardText}>{t('unsavedWork.discard')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondary, disabled && styles.disabled]}
              onPress={() => void resolveUnsavedWorkDecision('cancel')}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('unsavedWork.cancel')}
              accessibilityState={{ disabled }}
            >
              <Text style={styles.cancelText}>{t('unsavedWork.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.h6, color: colors.text.primary },
  context: { ...typography.body1, color: colors.text.secondary },
  message: { ...typography.body1, color: colors.text.primary },
  error: { ...typography.body1, color: colors.error.main },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  button: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.primary.main },
  secondary: { borderWidth: 1, borderColor: colors.border.main },
  disabled: { opacity: 0.6 },
  primaryText: { ...typography.button, color: colors.common.white },
  discardText: { ...typography.button, color: colors.error.main },
  cancelText: { ...typography.button, color: colors.text.secondary },
});
