/**
 * Progress Bar Component
 * Displays treatment completion progress with percentage
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

// ============================================
// TYPES
// ============================================

interface ProgressBarProps {
  /** Current progress value (0-100) */
  progress: number;
  /** Total number of items (e.g., days) */
  total?: number;
  /** Completed number of items */
  completed?: number;
  /** Show percentage label */
  showPercentage?: boolean;
  /** Show count label (e.g., "8/21 days") */
  showCount?: boolean;
  /** Count label suffix (e.g., "days", "sessions") */
  countLabel?: string;
  /** Height of the progress bar */
  height?: number;
  /** Custom color for the progress bar */
  color?: string;
}

// ============================================
// COMPONENT
// ============================================

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  total,
  completed,
  showPercentage = true,
  showCount = false,
  countLabel = 'days',
  height = 8,
  color,
}) => {
  const theme = useClinicTheme();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Determine progress color based on completion
  const progressColor = color || (
    clampedProgress === 100
      ? theme.colors.feedback.success
      : clampedProgress >= 50
      ? theme.colors.primary.default
      : theme.colors.feedback.warning
  );

  // Build label text
  const labelParts: string[] = [];
  if (showCount && completed !== undefined && total !== undefined) {
    labelParts.push(`${completed}/${total} ${countLabel}`);
  }
  if (showPercentage) {
    labelParts.push(`${Math.round(clampedProgress)}%`);
  }
  const labelText = labelParts.join(' • ');

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Progress: ${labelText}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: clampedProgress,
      }}
    >
      {!!labelText && (
        <Text
          style={[
            styles.label,
            { color: theme.colors.text.secondary },
          ]}
        >
          {labelText}
        </Text>
      )}
      <View
        style={[
          styles.track,
          { height, backgroundColor: theme.colors.background.muted },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
