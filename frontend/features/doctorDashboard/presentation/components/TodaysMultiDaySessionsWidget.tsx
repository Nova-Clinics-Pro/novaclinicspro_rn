/**
 * Today's Multi-Day Sessions Widget
 * Shows today's treatment sessions with day number and progress
 * 
 * Requirements: F2.4 - Doctor Dashboard Integration
 * Location: features/doctorDashboard/presentation/components/TodaysMultiDaySessionsWidget.tsx
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

interface MultiDaySession {
  id: string;
  client_id: string;
  client_name: string;
  treatment_sheet_id: string;
  treatment_name: string;
  day_number: number;
  total_days: number;
  scheduled_time: string;
  progress_percentage: number;
}

interface TodaysMultiDaySessionsWidgetProps {
  sessions: MultiDaySession[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onDocumentTreatment?: (sessionId: string, treatmentSheetId: string, dayNumber: number) => void;
  testID?: string;
}

// ============================================
// COMPONENT
// ============================================

export const TodaysMultiDaySessionsWidget: React.FC<TodaysMultiDaySessionsWidgetProps> = ({
  sessions,
  isLoading = false,
  onViewAll,
  onDocumentTreatment,
  testID = 'todays-multiday-sessions-widget',
}) => {
  const router = useRouter();
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

  // Empty state
  if (sessions.length === 0) {
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
          <Text style={styles.emptyText}>No multi-day sessions today</Text>
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
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} testID={`${testID}-view-all`}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Session count */}
      <Text style={styles.countText}>
        📅 {sessions.length} treatment session{sessions.length !== 1 ? 's' : ''} scheduled
      </Text>

      {/* Sessions list */}
      <View style={styles.sessionsList}>
        {sessions.map((session) => (
          <View key={session.id} style={styles.sessionCard} testID={`${testID}-session-${session.id}`}>
            {/* Time and client */}
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTime}>{session.scheduled_time}</Text>
              <Text style={styles.clientName}>{session.client_name}</Text>
            </View>

            {/* Treatment info */}
            <View style={styles.treatmentInfo}>
              <Text style={styles.treatmentName}>{session.treatment_name}</Text>
              <Text style={styles.dayInfo}>
                Day {session.day_number}/{session.total_days} ({Math.round(session.progress_percentage)}%)
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${session.progress_percentage}%` }
                ]} 
              />
            </View>

            {/* Action button */}
            {onDocumentTreatment && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDocumentTreatment(session.id, session.treatment_sheet_id, session.day_number)}
                testID={`${testID}-document-${session.id}`}
              >
                <Text style={styles.actionButtonText}>Document Treatment</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
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
  sessionsList: {
    gap: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sessionTime: {
    ...typography.subtitle2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  clientName: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  treatmentInfo: {
    marginBottom: spacing.sm,
  },
  treatmentName: {
    ...typography.body1,
    color: colors.text.primary,
    marginBottom: 2,
  },
  dayInfo: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.background.paper,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 3,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.button,
    color: colors.common.white,
    fontSize: 13,
  },
});
