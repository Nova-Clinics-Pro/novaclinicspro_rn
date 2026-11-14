/**
 * KPI Stat Card Component
 * Displays a single KPI metric in a card format
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { KpiStatCardItem } from '../../data/models/doctorKpis.dtos';

interface KpiStatCardProps {
  item: KpiStatCardItem;
  compact?: boolean;
  testID?: string;
}

export const KpiStatCard: React.FC<KpiStatCardProps> = ({
  item,
  compact = false,
  testID,
}) => {
  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      testID={testID}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={compact ? 18 : 22} color={item.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, compact && styles.valueCompact]}>{item.value}</Text>
        <Text style={styles.label}>{item.label}</Text>
        {!!item.subtext && <Text style={styles.subtext}>{item.subtext}</Text>}
      </View>
      {item.trend && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove'}
            size={14}
            color={
              item.trend === 'up'
                ? colors.success.main
                : item.trend === 'down'
                ? colors.error.main
                : colors.text.tertiary
            }
          />
          {!!item.trendValue && (
            <Text
              style={[
                styles.trendValue,
                {
                  color:
                    item.trend === 'up'
                      ? colors.success.main
                      : item.trend === 'down'
                      ? colors.error.main
                      : colors.text.tertiary,
                },
              ]}
            >
              {item.trendValue}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * KPI Stats Grid Component
 * Displays multiple KPI cards in a grid layout
 */
interface KpiStatsGridProps {
  items: KpiStatCardItem[];
  columns?: 2 | 4;
  testID?: string;
}

export const KpiStatsGrid: React.FC<KpiStatsGridProps> = ({
  items,
  columns = 2,
  testID,
}) => {
  return (
    <View style={[styles.grid, columns === 4 && styles.gridFour]} testID={testID}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.gridItem, columns === 4 && styles.gridItemFour]}
        >
          <KpiStatCard item={item} compact={columns === 4} testID={`${testID}-${index}`} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  containerCompact: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  value: {
    ...typography.h5,
    color: colors.text.primary,
    fontWeight: '700',
  },
  valueCompact: {
    ...typography.h6,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtext: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridFour: {
    gap: spacing.xs,
  },
  gridItem: {
    width: '48%',
  },
  gridItemFour: {
    width: '48%',
  },
});

export default KpiStatCard;
