/**
 * Treatment Sheet Row Item Component
 * Displays a single row (day) in a treatment sheet
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  TreatmentSheetRowResponse,
  getRowCompletionStatus,
  getRowStatusColor,
  formatDate,
} from '../../data/models/treatmentSheets.dtos';

interface TreatmentSheetRowItemProps {
  row: TreatmentSheetRowResponse;
  onPress?: () => void;
  onComplete?: () => void;
  isEditable?: boolean;
}

export const TreatmentSheetRowItem: React.FC<TreatmentSheetRowItemProps> = ({
  row,
  onPress,
  onComplete,
  isEditable = false,
}) => {
  const status = getRowCompletionStatus(row);
  const statusColor = getRowStatusColor(row);

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'scheduled':
        return 'time';
      default:
        return 'ellipse-outline';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Scheduled';
      default:
        return 'Pending';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Day ${row.day_number}, ${getStatusLabel()}`}
    >
      {/* Day Number */}
      <View style={[styles.dayBadge, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.dayNumber, { color: statusColor }]}>
          Day {row.day_number}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Date */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.dateText}>
            {row.session_date ? formatDate(row.session_date) : 'Not scheduled'}
          </Text>
        </View>

        {/* Treatment Description */}
        {!!row.treatment_description && (
          <Text style={styles.treatmentText} numberOfLines={2}>
            {row.treatment_description}
          </Text>
        )}

        {/* Medicines */}
        {!!row.medicines_given && (
          <View style={styles.medicinesRow}>
            <Ionicons name="medkit-outline" size={12} color={colors.success.main} />
            <Text style={styles.medicinesText} numberOfLines={1}>
              {row.medicines_given}
            </Text>
          </View>
        )}

        {/* Instructions */}
        {!!row.instructions && (
          <View style={styles.instructionsRow}>
            <Ionicons name="information-circle-outline" size={12} color={colors.info.main} />
            <Text style={styles.instructionsText} numberOfLines={1}>
              {row.instructions}
            </Text>
          </View>
        )}
      </View>

      {/* Status / Actions */}
      <View style={styles.statusSection}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Ionicons name={getStatusIcon()} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel()}
          </Text>
        </View>

        {/* Complete Button */}
        {isEditable && status !== 'completed' && onComplete && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onComplete();
            }}
            accessibilityRole="button"
            accessibilityLabel="Mark as complete"
          >
            <Ionicons name="checkmark" size={16} color={colors.background.default} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  dayNumber: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  treatmentText: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  medicinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  medicinesText: {
    ...typography.caption,
    color: colors.success.main,
    flex: 1,
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructionsText: {
    ...typography.caption,
    color: colors.info.main,
    flex: 1,
  },
  statusSection: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
