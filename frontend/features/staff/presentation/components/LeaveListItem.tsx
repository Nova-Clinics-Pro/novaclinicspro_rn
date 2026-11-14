/**
 * Leave List Item Component
 * Displays a single leave request in a list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  StaffLeaveResponse,
  getLeaveTypeLabel,
  getLeaveStatusColor,
  formatDate,
  calculateLeaveDays,
} from '../../data/models/staff.dtos';

interface LeaveListItemProps {
  leave: StaffLeaveResponse;
  onApprove?: (leave: StaffLeaveResponse) => void;
  onReject?: (leave: StaffLeaveResponse) => void;
  showActions?: boolean;
  /** Staff member name — shown in all-staff admin view */
  staffName?: string;
}

export const LeaveListItem: React.FC<LeaveListItemProps> = ({
  leave,
  onApprove,
  onReject,
  showActions = false,
  staffName,
}) => {
  const statusColor = getLeaveStatusColor(leave.status);
  const duration = calculateLeaveDays(leave.start_date, leave.end_date);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Ionicons name="calendar" size={20} color={colors.primary.main} />
          <Text style={styles.leaveType}>{getLeaveTypeLabel(leave.leave_type)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {leave.status}
          </Text>
        </View>
      </View>

      {staffName ? (
        <View style={styles.staffNameRow}>
          <Ionicons name="person-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.staffNameText}>{staffName}</Text>
        </View>
      ) : null}
      <View style={styles.dateRow}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>From</Text>
          <Text style={styles.dateValue}>{formatDate(leave.start_date)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.text.tertiary} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>To</Text>
          <Text style={styles.dateValue}>{formatDate(leave.end_date)}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {duration} {duration === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      {!!leave.reason && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{leave.reason}</Text>
        </View>
      )}

      {!!leave.review_notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Review Notes:</Text>
          <Text style={styles.notesText}>{leave.review_notes}</Text>
        </View>
      )}

      {showActions && (leave.status === 'PENDING' || leave.status === 'REQUESTED') && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => onReject?.(leave)}
          >
            <Ionicons name="close-circle" size={18} color={colors.error.main} />
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => onApprove?.(leave)}
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.background.default} />
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leaveType: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  dateValue: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },
  durationBadge: {
    backgroundColor: colors.grey[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  reasonContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.grey[50],
    borderRadius: 8,
  },
  reasonLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  reasonText: {
    ...typography.body2,
    color: colors.text.primary,
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.info.main + '10',
    borderRadius: 8,
  },
  notesLabel: {
    ...typography.caption,
    color: colors.info.main,
    marginBottom: 4,
  },
  notesText: {
    ...typography.body2,
    color: colors.text.primary,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  staffNameText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  rejectText: {
    ...typography.button,
    color: colors.error.main,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.success.main,
  },
  approveText: {
    ...typography.button,
    color: colors.background.default,
  },
});
