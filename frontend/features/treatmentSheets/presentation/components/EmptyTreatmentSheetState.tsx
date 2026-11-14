/**
 * Empty Treatment Sheets State Component
 * Shows when no treatment sheet is available
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface EmptyTreatmentSheetStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  variant?: 'empty' | 'error';
}

export const EmptyTreatmentSheetState: React.FC<EmptyTreatmentSheetStateProps> = ({
  title = 'No Treatment Sheet',
  message = 'No treatment sheet has been created for this casesheet yet.',
  actionLabel,
  onActionPress,
  variant = 'empty',
}) => {
  const iconColor = variant === 'error' ? colors.error.main : colors.text.secondary;
  const icon = variant === 'error' ? 'alert-circle-outline' : 'fitness-outline';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={48} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!(actionLabel && onActionPress) && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary.main} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary.main + '15',
    borderRadius: 8,
    gap: spacing.xs,
  },
  actionText: {
    ...typography.button,
    color: colors.primary.main,
  },
});
