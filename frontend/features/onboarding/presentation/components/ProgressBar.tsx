/**
 * ProgressBar Component
 * Displays setup progress with percentage and accessible textual meaning.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  accessibilityLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  showLabel = true,
  accessibilityLabel,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(
    () => createStyles(theme, percentage),
    [theme, percentage]
  );
  const defaultLabel = t('onboarding.progressiveExperience.flow.clinicPreparation');

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
    >
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{defaultLabel}</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      )}
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
    </View>
  );
};

const createStyles = (theme: ClinicTheme, percentage: number) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    label: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
    },
    percentage: {
      ...theme.typography.h6,
      color: theme.colors.primary.default,
    },
    track: {
      overflow: 'hidden',
      backgroundColor: theme.colors.border.subtle,
      height: theme.spacing.sm,
      borderRadius: theme.spacing.xs,
    },
    fill: {
      width: `${percentage}%`,
      backgroundColor: theme.colors.primary.default,
      height: theme.spacing.sm,
      borderRadius: theme.spacing.xs,
    },
  });
