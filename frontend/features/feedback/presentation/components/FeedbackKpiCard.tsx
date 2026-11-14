/**
 * Feedback KPI Card Component
 * Displays a KPI metric with icon and optional trend indicator
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { TrendDirection } from '../../data/models/feedback.dtos';
import { getTrendIcon, getTrendColor } from '../../data/models/feedback.dtos';

interface FeedbackKpiCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  subtext?: string;
  trend?: TrendDirection;
  trendValue?: string;
  testID?: string;
}

export const FeedbackKpiCard: React.FC<FeedbackKpiCardProps> = ({
  label,
  value,
  icon,
  color,
  subtext,
  trend,
  trendValue,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons
                name={getTrendIcon(trend) as any}
                size={14}
                color={getTrendColor(trend)}
              />
              {!!trendValue && (
                <Text style={[styles.trendValue, { color: getTrendColor(trend) }]}>
                  {trendValue}
                </Text>
              )}
            </View>
          )}
        </View>
        {!!subtext && <Text style={styles.subtext}>{subtext}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    ...typography.h5,
    color: colors.text.primary,
    fontWeight: '700',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  subtext: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});

export default FeedbackKpiCard;
