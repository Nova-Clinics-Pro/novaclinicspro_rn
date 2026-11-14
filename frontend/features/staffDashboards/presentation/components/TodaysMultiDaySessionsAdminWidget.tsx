/**
 * Today's Multi-Day Sessions Admin Widget
 * Shows today's treatment sessions grouped by status
 * 
 * Requirements: F2.5 - Admin Dashboard Integration
 * Location: features/staffDashboards/presentation/components/TodaysMultiDaySessionsAdminWidget.tsx
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
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useFeatures, hasMultiDayAppointments } from '../../../../core/hooks/useFeatures';

// ============================================
// TYPES
// ============================================

interface SessionStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
}

interface TodaysMultiDaySessionsAdminWidgetProps {
  stats: SessionStats | null;
  isLoading?: boolean;
  onViewSchedule?: () => void;
  testID?: string;
}

// ============================================
// COMPONENT
// ============================================

export const TodaysMultiDaySessionsAdminWidget: React.FC<TodaysMultiDaySessionsAdminWidgetProps> = ({
  stats,
  isLoading = false,
  onViewSchedule,
  testID = 'todays-multiday-sessions-admin-widget',
}) => {
  const features = useFeatures();

  // Don't render if multi-day appointments are not enabled
  if (!hasMultiDayAppointments(features)) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar" size={20} color={colors.primary.main} />
            <Text style={styles.title}>Today&apos;s Multi-Day Sessions</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </View>
    );
  }

  // Empty/error state
  if (!stats || stats.total === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar" size={20} color={colors.primary.main} />
            <Text style={styles.title}>Today&apos;s Multi-Day Sessions</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.text.disabled} />
          <Text style={styles.emptyText}>No multi-day sessions scheduled today</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color={colors.primary.main} />
          <Text style={styles.title}>Today&apos;s Multi-Day Sessions</Text>
        </View>
      </View>

      {/* Total count */}
      <Text style={styles.totalText}>
        📅 {stats.total} treatment session{stats.total !== 1 ? 's' : ''} scheduled today
      </Text>

      {/* Status breakdown */}
      <View style={styles.statusGrid}>
        {/* Completed */}
        <View style={[styles.statusCard, styles.completedCard]} testID={`${testID}-completed`}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
          </View>
          <Text style={styles.statusValue}>{stats.completed}</Text>
          <Text style={styles.statusLabel}>Completed</Text>
        </View>

        {/* In Progress */}
        <View style={[styles.statusCard, styles.inProgressCard]} testID={`${testID}-in-progress`}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="time" size={20} color={colors.info.main} />
          </View>
          <Text style={styles.statusValue}>{stats.in_progress}</Text>
          <Text style={styles.statusLabel}>In Progress</Text>
        </View>

        {/* Pending */}
        <View style={[styles.statusCard, styles.pendingCard]} testID={`${testID}-pending`}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="hourglass" size={20} color={colors.warning.main} />
          </View>
          <Text style={styles.statusValue}>{stats.pending}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </View>
      </View>

      {/* View schedule button */}
      {onViewSchedule && (
        <TouchableOpacity
          style={styles.viewScheduleButton}
          onPress={onViewSchedule}
          testID={`${testID}-view-schedule`}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary.main} />
          <Text style={styles.viewScheduleButtonText}>View Schedule</Text>
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
  },
  title: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  totalText: {
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
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  completedCard: {
    borderTopWidth: 3,
    borderTopColor: colors.success.main,
  },
  inProgressCard: {
    borderTopWidth: 3,
    borderTopColor: colors.info.main,
  },
  pendingCard: {
    borderTopWidth: 3,
    borderTopColor: colors.warning.main,
  },
  statusIconContainer: {
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h5,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 11,
  },
  viewScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.main,
    gap: spacing.xs,
  },
  viewScheduleButtonText: {
    ...typography.button,
    color: colors.primary.main,
    fontSize: 13,
  },
});
