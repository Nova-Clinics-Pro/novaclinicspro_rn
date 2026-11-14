/**
 * Empty Treatment Sheets State Component
 * Shows when there are no treatment sheets or errors
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface EmptyTreatmentSheetsStateProps {
  variant?: 'empty' | 'error' | 'loading';
  title?: string;
  message?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const EmptyTreatmentSheetsState: React.FC<EmptyTreatmentSheetsStateProps> = ({
  variant = 'empty',
  title,
  message,
  actionLabel,
  onActionPress,
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          iconColor: colors.error.main,
          defaultTitle: 'Unable to Load',
          defaultMessage: 'Could not load treatment sheets. Please try again.',
        };
      case 'loading':
        return {
          icon: 'hourglass-outline' as const,
          iconColor: colors.primary.main,
          defaultTitle: 'Loading...',
          defaultMessage: 'Please wait while we load the treatment sheets.',
        };
      case 'empty':
      default:
        return {
          icon: 'fitness-outline' as const,
          iconColor: colors.text.tertiary,
          defaultTitle: 'No Treatment Sheets',
          defaultMessage: 'Treatment sheets are created from casesheets.',
        };
    }
  };

  const config = getVariantConfig();

  return (
    <View style={styles.container} testID="empty-treatment-sheets-state">
      <View style={styles.iconContainer}>
        <Ionicons name={config.icon} size={48} color={config.iconColor} />
      </View>
      <Text style={styles.title}>{title || config.defaultTitle}</Text>
      <Text style={styles.message}>{message || config.defaultMessage}</Text>
      {!!(actionLabel && onActionPress) && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          testID="empty-state-action-button"
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  actionButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
});

export default EmptyTreatmentSheetsState;
