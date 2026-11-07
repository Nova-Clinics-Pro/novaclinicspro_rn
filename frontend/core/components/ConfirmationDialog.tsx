/**
 * Confirmation Dialog Component
 * Modal dialog for confirming destructive actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { elevations } from '../theme/elevations';
import { opacities } from '../theme/semanticColors';
import { useClinicTheme } from '../theme/useClinicTheme';

// ============================================
// TYPES
// ============================================

interface ConfirmationDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether the action is destructive (red button) */
  destructive?: boolean;
  /** Whether to show a reason input field */
  requireReason?: boolean;
  /** Placeholder for reason input */
  reasonPlaceholder?: string;
  /** Whether the action is loading */
  loading?: boolean;
  /** Opt-in: show only the confirm action (for single-button notices). */
  hideCancel?: boolean;
  /** Disables the confirm action (e.g. while required data is loading or invalid). */
  confirmDisabled?: boolean;
  /**
   * Opt-in: bound the dialog to a fraction of the window height and scroll
   * the message/fields, keeping the title and the action buttons in view.
   * Default off, so existing dialogs (e.g. logout) are unchanged.
   */
  scrollBody?: boolean;
  /** Optional, caller-owned fields shown before the confirmation buttons. */
  children?: React.ReactNode;
  /** Callback when confirmed */
  onConfirm: (reason?: string) => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  requireReason = false,
  reasonPlaceholder = 'Enter reason (optional)',
  loading = false,
  confirmDisabled = false,
  hideCancel = false,
  scrollBody = false,
  children,
  onConfirm,
  onCancel,
}) => {
  const theme = useClinicTheme();
  const styles = makeStyles(theme);
  const [reason, setReason] = useState('');
  const { height: windowHeight } = useWindowDimensions();

  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
    setReason(''); // Reset for next time
  };

  const handleCancel = () => {
    onCancel();
    setReason(''); // Reset for next time
  };

  const confirmButtonColor = destructive
    ? theme.colors.feedback.error
    : theme.colors.primary.default;

  const bodyContent = (
    <>
      {/* Message */}
      <Text
        style={[
          styles.message,
          { color: theme.colors.text.secondary },
        ]}
      >
        {message}
      </Text>

      {/* Reason Input (if required) */}
      {requireReason && (
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background.muted,
              borderColor: theme.colors.border.default,
              color: theme.colors.text.primary,
            },
          ]}
          placeholder={reasonPlaceholder}
          placeholderTextColor={theme.colors.text.tertiary}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!loading}
          accessibilityLabel="Reason input"
        />
      )}

      {children}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
          accessibilityLabel="Close dialog"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.dialog,
                { backgroundColor: theme.colors.background.default },
                scrollBody ? { maxHeight: windowHeight * theme.sizes.dialogMaxHeightRatio } : null,
              ]}
            >
              {/* Title */}
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.text.primary },
                ]}
              >
                {title}
              </Text>

              {scrollBody ? (
                <ScrollView
                  testID="confirmation-dialog-body"
                  style={styles.scrollBody}
                  contentContainerStyle={styles.scrollBodyContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {bodyContent}
                </ScrollView>
              ) : (
                bodyContent
              )}

              {/* Buttons */}
              <View style={styles.buttons}>
                {!hideCancel && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: theme.colors.border.default },
                  ]}
                  onPress={handleCancel}
                  disabled={loading}
                  accessibilityLabel={cancelText}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.text.secondary },
                    ]}
                  >
                    {cancelText}
                  </Text>
                </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: confirmButtonColor },
                    (loading || confirmDisabled) && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={loading || confirmDisabled}
                  accessibilityLabel={confirmText}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.text.onPrimary} size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const makeStyles = (theme: ReturnType<typeof useClinicTheme>) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    ...elevations.dialog,
    width: theme.sizes.dialogWidth,
    maxWidth: theme.sizes.dialogMaxWidth,
    borderRadius: theme.radii.large,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.h5,
  },
  message: {
    ...theme.typography.body2,
  },
  input: {
    borderWidth: theme.borderWidths.default,
    borderRadius: theme.radii.medium,
    padding: theme.spacing.sm,
    ...theme.typography.body2,
    minHeight: theme.sizes.inputMultilineMinHeight,
  },
  scrollBody: {
    flexShrink: 1,
  },
  scrollBodyContent: {
    gap: theme.spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.sizes.touchTarget,
  },
  cancelButton: {
    borderWidth: theme.borderWidths.default,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  buttonDisabled: {
    opacity: opacities.disabled,
  },
  buttonText: {
    ...theme.typography.body2,
    fontWeight: theme.typography.button.fontWeight,
  },
  confirmButtonText: {
    ...theme.typography.body2,
    fontWeight: theme.typography.button.fontWeight,
    color: theme.colors.text.onPrimary,
  },
});
