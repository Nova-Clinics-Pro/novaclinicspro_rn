/**
 * KPI Stat Card Component
 * Displays a single KPI metric with optional trend indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface KpiStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

export const KpiStatCard: React.FC<KpiStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = colors.primary.main,
  trend,
  isLoading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      
      <Text style={[styles.value, { color }]}>
        {isLoading ? '...' : value}
      </Text>
      
      {!!subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      
      {trend && !isLoading && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={trend.isPositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={trend.isPositive ? colors.success.main : colors.error.main}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend.isPositive ? colors.success.main : colors.error.main },
            ]}
          >
            {trend.value}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  value: {
    ...typography.h4,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4,
  },
  trendText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
