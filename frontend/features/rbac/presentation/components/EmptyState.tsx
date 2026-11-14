/**
 * EmptyState Component
 * Displays when there's no data to show
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useRbacTheme();

  return (
    <View style={styles.container} accessible={true}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary.bg }]}>
        <Ionicons name={icon} size={48} color={colors.primary.main} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {!!(actionLabel && onAction) && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary.main }]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
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
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h6,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body2,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  buttonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
