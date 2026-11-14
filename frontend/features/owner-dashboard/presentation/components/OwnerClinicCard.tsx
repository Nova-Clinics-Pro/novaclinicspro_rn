/**
 * OwnerClinicCard Component
 * Displays a clinic card in the owner dashboard
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { OwnerClinicSummary } from '../../domain/entities/owner-dashboard.entity';
import { isMetricAvailable } from '../../domain/entities/owner-dashboard.entity';

interface OwnerClinicCardProps {
  clinic: OwnerClinicSummary;
  onOpenDashboard: () => void;
  onManageStaff: () => void;
  testID?: string;
}

export const OwnerClinicCard: React.FC<OwnerClinicCardProps> = ({
  clinic,
  onOpenDashboard,
  onManageStaff,
  testID,
}) => {
  const renderMiniMetric = (
    label: string,
    metric: { status: 'available'; value: number } | { status: 'unavailable'; reason: string },
    icon: string
  ) => {
    const isAvailable = metric.status === 'available';
    return (
      <View style={styles.miniMetric}>
        <Ionicons
          name={icon as any}
          size={14}
          color={isAvailable ? colors.text.secondary : colors.text.tertiary}
        />
        <Text style={[styles.miniMetricText, !isAvailable && styles.miniMetricTextMuted]}>
          {isAvailable ? (metric as any).value : '--'}
        </Text>
        <Text style={styles.miniMetricLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.clinicIcon}>
          <Ionicons name="medical" size={24} color={colors.primary.main} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.nameRow}>
            <Text style={styles.clinicName}>{clinic.clinicName}</Text>
            {clinic.isPrimary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
          </View>
          {!!clinic.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.cityText}>{clinic.city}</Text>
            </View>
          )}
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Owner</Text>
        </View>
      </View>

      {/* Mini Metrics */}
      <View style={styles.metricsRow}>
        {renderMiniMetric('Staff', clinic.activeStaff, 'people-outline')}
        {renderMiniMetric('Today', clinic.appointmentsToday, 'calendar-outline')}
        {renderMiniMetric('Tasks', clinic.pendingTasks, 'checkmark-circle-outline')}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onOpenDashboard}
          testID={`${testID}-open-dashboard`}
        >
          <Ionicons name="grid-outline" size={18} color={colors.common.white} />
          <Text style={styles.primaryButtonText}>Open Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onManageStaff}
          testID={`${testID}-manage-staff`}
        >
          <Ionicons name="people-outline" size={18} color={colors.primary.main} />
          <Text style={styles.secondaryButtonText}>Manage Staff</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  clinicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  clinicName: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  primaryBadge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  primaryBadgeText: {
    ...typography.caption,
    color: colors.success.main,
    fontWeight: '600',
    fontSize: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cityText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  roleBadge: {
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    ...typography.caption,
    color: colors.warning.main,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  miniMetric: {
    alignItems: 'center',
    gap: 4,
  },
  miniMetricText: {
    ...typography.h6,
    color: colors.text.primary,
    fontWeight: '700',
  },
  miniMetricTextMuted: {
    color: colors.text.tertiary,
  },
  miniMetricLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.common.white,
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary.main,
    fontSize: 13,
  },
});

export default OwnerClinicCard;
