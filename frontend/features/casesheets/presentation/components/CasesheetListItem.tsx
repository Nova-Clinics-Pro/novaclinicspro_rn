/**
 * Casesheet List Item Component
 * Displays a single casesheet in a list with key information
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { CasesheetResponse, formatDate } from '../../data/models/casesheets.dtos';
import { CasesheetStatusBadge } from './CasesheetStatusBadge';

interface CasesheetListItemProps {
  casesheet: CasesheetResponse;
  onPress?: () => void;
  showClientInfo?: boolean;
}

export const CasesheetListItem: React.FC<CasesheetListItemProps> = ({
  casesheet,
  onPress,
  showClientInfo = false,
}) => {
  const chiefComplaint = casesheet.chief_complaint || 'No chief complaint recorded';
  const diagnosis = casesheet.final_diagnosis || casesheet.provisional_diagnosis || null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Casesheet from ${formatDate(casesheet.recorded_at)}, status: ${casesheet.status}`}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.dateText}>{formatDate(casesheet.recorded_at)}</Text>
        </View>
        <CasesheetStatusBadge status={casesheet.status} size="small" />
      </View>

      {/* Chief Complaint */}
      <View style={styles.mainContent}>
        <Text style={styles.label}>Chief Complaint</Text>
        <Text style={styles.chiefComplaint} numberOfLines={2}>
          {chiefComplaint}
        </Text>
      </View>

      {/* Diagnosis (if available) */}
      {!!diagnosis && (
        <View style={styles.diagnosisContainer}>
          <Ionicons name="medical-outline" size={14} color={colors.info.main} />
          <Text style={styles.diagnosisText} numberOfLines={1}>
            {diagnosis}
          </Text>
        </View>
      )}

      {/* Footer Row */}
      <View style={styles.footerRow}>
        <View style={styles.versionContainer}>
          <Text style={styles.versionLabel}>v{casesheet.document_version}</Text>
        </View>
        {!!casesheet.signed_at && (
          <View style={styles.signedContainer}>
            <Ionicons name="shield-checkmark" size={12} color={colors.success.main} />
            <Text style={styles.signedText}>Signed {formatDate(casesheet.signed_at)}</Text>
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
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  chiefComplaint: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  diagnosisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.info.main + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  diagnosisText: {
    ...typography.body2,
    color: colors.info.main,
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
  signedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: spacing.sm,
  },
  signedText: {
    ...typography.caption,
    color: colors.success.main,
    fontSize: 11,
  },
});
