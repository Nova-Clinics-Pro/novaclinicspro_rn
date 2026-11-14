/**
 * Empty Dashboard State Component
 * Shows when no data is available or on error
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface EmptyDashboardStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  variant?: 'empty' | 'error' | 'info';
}

export const EmptyDashboardState: React.FC<EmptyDashboardStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onActionPress,
  variant = 'empty',
}) => {
  const getIconColor = () => {
    switch (variant) {
      case 'error':
        return colors.error.main;
      case 'info':
        return colors.info.main;
      default:
        return colors.text.secondary;
    }
  };

  const defaultIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (variant) {
      case 'error':
        return 'alert-circle-outline';
      case 'info':
        return 'information-circle-outline';
      default:
        return 'calendar-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
        <Ionicons
          name={icon || defaultIcon()}
          size={40}
          color={getIconColor()}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {!!(actionLabel && onActionPress) && (
        <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
          <Ionicons 
            name={actionLabel.toLowerCase().includes('back') ? 'arrow-back' : actionLabel.toLowerCase().includes('login') ? 'log-in' : 'refresh'} 
            size={16} 
            color={colors.primary.main} 
          />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
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
