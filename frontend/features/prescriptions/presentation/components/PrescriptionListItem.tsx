/**
 * Prescription List Item Component
 * Displays a single prescription in a list with medication summary
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { PrescriptionResponse, formatDate, getMedicationCount } from '../../data/models/prescriptions.dtos';
import { PrescriptionStatusBadge } from './PrescriptionStatusBadge';

interface PrescriptionListItemProps {
  prescription: PrescriptionResponse;
  onPress?: () => void;
  showClientInfo?: boolean;
}

export const PrescriptionListItem: React.FC<PrescriptionListItemProps> = ({
  prescription,
  onPress,
  showClientInfo = false,
}) => {
  const medicationCount = getMedicationCount(prescription.prescription_data);
  const firstMedication = prescription.prescription_data.medications?.[0];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Prescription from ${formatDate(prescription.created_at)}, ${medicationCount} medications, status: ${prescription.status}`}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.dateText}>{formatDate(prescription.created_at)}</Text>
        </View>
        <PrescriptionStatusBadge status={prescription.status} size="small" />
      </View>

      {/* Medication Count */}
      <View style={styles.mainContent}>
        <View style={styles.medicationIconContainer}>
          <Ionicons name="medkit" size={24} color={colors.primary.main} />
        </View>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationCount}>
            {medicationCount} medication{medicationCount !== 1 ? 's' : ''}
          </Text>
          {firstMedication && (
            <Text style={styles.medicationPreview} numberOfLines={1}>
              {firstMedication.name}
              {medicationCount > 1 && ` + ${medicationCount - 1} more`}
            </Text>
          )}
        </View>
      </View>

      {/* Notes (if available) */}
      {!!prescription.notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.notesText} numberOfLines={1}>
            {prescription.notes}
          </Text>
        </View>
      )}

      {/* Footer Row */}
      <View style={styles.footerRow}>
        <View style={styles.versionContainer}>
          <Text style={styles.versionLabel}>v{prescription.document_version}</Text>
        </View>
        {!!prescription.next_visit_days && (
          <View style={styles.nextVisitContainer}>
            <Ionicons name="time-outline" size={12} color={colors.info.main} />
            <Text style={styles.nextVisitText}>Follow-up in {prescription.next_visit_days} days</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medicationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationCount: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  medicationPreview: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.grey[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  notesText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionContainer: {
    backgroundColor: colors.grey[200],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
  },
  nextVisitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: spacing.sm,
  },
  nextVisitText: {
    ...typography.caption,
    color: colors.info.main,
    fontSize: 11,
  },
});
