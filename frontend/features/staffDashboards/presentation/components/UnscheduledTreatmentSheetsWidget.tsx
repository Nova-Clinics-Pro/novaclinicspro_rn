/**
 * Unscheduled Treatment Sheets Widget
 * Shows DRAFT treatment sheets that need scheduling with "Schedule Now" button
 * 
 * Requirements: F2.5 - Admin Dashboard Integration (Refactored from ProposalsAwaitingSchedulingWidget)
 * Location: features/staffDashboards/presentation/components/UnscheduledTreatmentSheetsWidget.tsx
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useFeatures, hasMultiDayAppointments } from '../../../../core/hooks/useFeatures';

// ============================================
// TYPES
// ============================================

interface UnscheduledSheet {
  id: string;
  duration_days: number;
  client_name?: string;
  episode_title?: string;
  created_at: string;
  days_ago: number;
  agreed_package_cost?: number;
}

interface UnscheduledTreatmentSheetsWidgetProps {
  sheets: UnscheduledSheet[];
  isLoading?: boolean;
  onViewAll?: () => void;
  testID?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

// ============================================
// COMPONENT
// ============================================

export const UnscheduledTreatmentSheetsWidget: React.FC<UnscheduledTreatmentSheetsWidgetProps> = ({
  sheets,
  isLoading = false,
  onViewAll,
  testID = 'unscheduled-sheets-widget',
}) => {
  const features = useFeatures();
  const router = useRouter();

  // Don't render if multi-day appointments are not enabled
  if (!hasMultiDayAppointments(features)) {
    return null;
  }

  const handleScheduleNow = (sheetId: string) => {
    router.push({
      pathname: '/clinic-admin/treatment-sheets/[treatmentSheetId]',
      params: { treatmentSheetId: sheetId },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar-outline" size={20} color={colors.warning.main} />
            <Text style={styles.title}>Unscheduled Treatment Sheets</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.warning.main} />
          <Text style={styles.loadingText}>Loading treatment sheets...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (sheets.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar-outline" size={20} color={colors.warning.main} />
            <Text style={styles.title}>Unscheduled Treatment Sheets</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.success.main} />
          <Text style={styles.emptyText}>All treatment sheets have been scheduled</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={20} color={colors.warning.main} />
          <Text style={styles.title}>Unscheduled Treatment Sheets</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} testID={`${testID}-view-all`}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sheet count */}
      <Text style={styles.countText}>
        📅 {sheets.length} treatment sheet{sheets.length !== 1 ? 's' : ''} need{sheets.length === 1 ? 's' : ''} scheduling
      </Text>

      {/* Sheets list */}
      <View style={styles.sheetsList}>
        {sheets.map((sheet) => (
          <View
            key={sheet.id}
            style={styles.sheetCard}
            testID={`${testID}-sheet-${sheet.id}`}
          >
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetName} numberOfLines={1}>
                {sheet.duration_days} Day Treatment
              </Text>
            </View>

            {/* Client info */}
            {!!sheet.client_name && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText}>Client: {sheet.client_name}</Text>
              </View>
            )}

            {/* Episode info */}
            {!!sheet.episode_title && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText}>Episode: {sheet.episode_title}</Text>
              </View>
            )}

            {/* Created date */}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.infoText}>
                Created {sheet.days_ago} day{sheet.days_ago !== 1 ? 's' : ''} ago
              </Text>
            </View>

            {/* Package cost */}
            {!!sheet.agreed_package_cost && (
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText}>
                  Package: {formatCurrency(sheet.agreed_package_cost)}
                </Text>
              </View>
            )}

            {/* Schedule button */}
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => handleScheduleNow(sheet.id)}
              testID={`${testID}-schedule-${sheet.id}`}
            >
              <Ionicons name="calendar" size={16} color={colors.common.white} />
              <Text style={styles.scheduleButtonText}>Schedule Now</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* View all button */}
      {onViewAll && sheets.length > 3 && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAll}
          testID={`${testID}-view-all-bottom`}
        >
          <Text style={styles.viewAllButtonText}>View All Treatment Sheets</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  viewAllText: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
  },
  countText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  sheetsList: {
    gap: spacing.md,
  },
  sheetCard: {
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning.main,
  },
  sheetHeader: {
    marginBottom: spacing.sm,
  },
  sheetName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  scheduleButtonText: {
    ...typography.button,
    color: colors.common.white,
    fontSize: 13,
  },
  viewAllButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  viewAllButtonText: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
  },
});
