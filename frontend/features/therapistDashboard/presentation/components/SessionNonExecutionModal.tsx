/**
 * SessionNonExecutionModal (T-FE-E.3, T-BE-E.4a)
 *
 * Records why a scheduled treatment sheet row did not execute. Reason
 * vocabulary is the exact backend enum (SessionNonExecutionReason) — no
 * client-invented reasons, no raw codes shown to the user.
 *
 * Renders separately from schedule state and execution outcome — never a
 * single ambiguous "Missed" status. See staffDashboards.dtos.ts for why
 * the recorded result is shown only transiently here (no durable list
 * re-display contract exists yet).
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import {
  RecordSessionNonExecutionRequest,
  SessionNonExecutionReasonCode,
} from '../../../staffDashboards/data/models/staffDashboards.dtos';

const REASON_CODES: SessionNonExecutionReasonCode[] = [
  'PATIENT_NO_SHOW',
  'PATIENT_CANCELLED',
  'CLINIC_CANCELLED',
  'CLINICAL_HOLD',
  'OTHER',
];

interface SessionNonExecutionModalProps {
  visible: boolean;
  onSubmit: (payload: RecordSessionNonExecutionRequest) => void;
  onClose: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const SessionNonExecutionModal: React.FC<SessionNonExecutionModalProps> = ({
  visible,
  onSubmit,
  onClose,
  isSubmitting,
  errorMessage,
}) => {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<SessionNonExecutionReasonCode | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReasonCode(null);
      setReasonText('');
      setValidationError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!reasonCode) {
      setValidationError(t('therapistExecution.reasonLabel'));
      return;
    }
    if (reasonCode === 'OTHER' && reasonText.trim().length === 0) {
      setValidationError(t('therapistExecution.otherReasonRequired'));
      return;
    }
    setValidationError(null);
    onSubmit({
      reason_code: reasonCode,
      reason_text: reasonCode === 'OTHER' ? reasonText.trim() : null,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {t('therapistExecution.recordNonExecution')}
          </Text>

          <Text style={styles.label}>{t('therapistExecution.reasonLabel')}</Text>
          <View style={styles.reasonList} accessibilityRole="radiogroup">
            {REASON_CODES.map((code) => {
              const selected = reasonCode === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                  onPress={() => {
                    setReasonCode(code);
                    setValidationError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`therapistExecution.reasonCodes.${code}`)}
                >
                  <Text style={[styles.reasonOptionText, selected && styles.reasonOptionTextSelected]}>
                    {t(`therapistExecution.reasonCodes.${code}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {reasonCode === 'OTHER' && (
            <View style={styles.otherField}>
              <TextInput
                style={styles.input}
                value={reasonText}
                onChangeText={setReasonText}
                placeholder={t('therapistExecution.otherReasonPlaceholder')}
                accessibilityLabel={t('therapistExecution.otherReasonPlaceholder')}
                multiline
              />
            </View>
          )}

          {(validationError || errorMessage) && (
            <Text style={styles.errorText}>{validationError ?? errorMessage}</Text>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('therapistExecution.cancel')}
            >
              <Text style={styles.cancelButtonText}>{t('therapistExecution.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isSubmitting ? t('therapistExecution.submitting') : t('therapistExecution.submit')}
            >
              {isSubmitting && <ActivityIndicator size="small" color={colors.common.white} />}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? t('therapistExecution.submitting') : t('therapistExecution.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  reasonList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reasonOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.common.white,
    minHeight: 44,
    justifyContent: 'center',
  },
  reasonOptionSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  reasonOptionText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  reasonOptionTextSelected: {
    color: colors.common.white,
  },
  otherField: {
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.common.white,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: colors.error.main,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.white,
  },
});

export default SessionNonExecutionModal;
