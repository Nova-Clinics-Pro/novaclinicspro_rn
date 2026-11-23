/**
 * Rating Distribution Bar Component
 * Displays rating distribution as horizontal bars
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface RatingDistributionProps {
  distribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  testID?: string;
}

export const RatingDistributionBars: React.FC<RatingDistributionProps> = ({
  distribution,
  testID,
}) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // Reverse to show 5 stars at top
  const sortedDistribution = [...distribution].sort((a, b) => b.rating - a.rating);

  return (
    <View style={styles.container} testID={testID}>
      {sortedDistribution.map((item) => (
        <View key={item.rating} style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.ratingLabel}>{item.rating}</Text>
            <Ionicons name="star" size={12} color={theme.colors.feedback.warning} />
          </View>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                { width: `${Math.max(item.percentage, 2)}%` },
                item.rating >= 4 && styles.barGood,
                item.rating === 3 && styles.barNeutral,
                item.rating <= 2 && styles.barPoor,
              ]}
            />
          </View>
          <Text style={styles.countText}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 24,
    gap: 2,
  },
  ratingLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.background.muted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  barGood: {
    backgroundColor: theme.colors.feedback.success,
  },
  barNeutral: {
    backgroundColor: theme.colors.feedback.warning,
  },
  barPoor: {
    backgroundColor: theme.colors.feedback.error,
  },
  countText: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    width: 30,
    textAlign: 'right',
  },
});

export default RatingDistributionBars;
