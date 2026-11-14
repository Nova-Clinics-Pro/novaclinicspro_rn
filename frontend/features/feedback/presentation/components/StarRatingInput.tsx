/**
 * Star Rating Input Component
 * Interactive 1-5 star rating selector for feedback forms
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  size?: number;
  testID?: string;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  size = 32,
  testID,
}) => {
  const handlePress = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {!!label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            onPress={() => handlePress(rating)}
            disabled={disabled}
            style={styles.starButton}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${rating} out of 5 stars`}
            accessibilityState={{ selected: rating <= value }}
            testID={`${testID}-star-${rating}`}
          >
            <Ionicons
              name={rating <= value ? 'star' : 'star-outline'}
              size={size}
              color={rating <= value ? colors.warning.main : colors.grey[300]}
            />
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  labelError: {
    color: colors.error.main,
  },
  required: {
    color: colors.error.main,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starButton: {
    padding: spacing.xs / 2,
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
});

export default StarRatingInput;
