/**
 * Star Rating Display Component
 * Read-only star rating display for feedback views
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { getStarIcons, getRatingLabel, getRatingColor } from '../../domain/entities/feedback.entity';

interface StarRatingDisplayProps {
  rating: number;
  showLabel?: boolean;
  showNumeric?: boolean;
  size?: number;
  testID?: string;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  showLabel = false,
  showNumeric = true,
  size = 16,
  testID,
}) => {
  const theme = useClinicTheme();
  const stars = getStarIcons(rating);
  const ratingColor = getRatingColor(rating);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.starsRow}>
        {stars.map((star, index) => (
          <Ionicons
            key={index}
            name={star}
            size={size}
            color={theme.colors.feedback.warning}
          />
        ))}
        {showNumeric && (
          <Text style={[styles.numericRating, { color: ratingColor }]}>
            {rating.toFixed(1)}
          </Text>
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: ratingColor }]}>
          {getRatingLabel(rating)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  numericRating: {
    ...typography.body2,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default StarRatingDisplay;
