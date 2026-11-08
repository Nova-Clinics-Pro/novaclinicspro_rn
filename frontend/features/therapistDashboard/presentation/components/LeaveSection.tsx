/**
 * Leave Section Component
 * Displays leave balance, history, and apply form
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import CrossPlatformDateTimePicker, {
  DateTimePickerEvent,
} from '../../../../core/components/CrossPlatformDateTimePicker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StaffLeaveResponse, StaffLeaveCreate } from '../../../staff/data/models/staff.dtos';
import {
  getLeaveStatusColor,
  getLeaveTypeLabel,
} from '../../data/models/therapistDashboard.dtos';
import { canCancelLeave, calculateLeaveDays } from '../../domain/entities/therapistDashboard.entity';

interface LeaveSectionProps {
  leaves: StaffLeaveResponse[];
  pendingCount: number;
  isLoading?: boolean;
  onApplyLeave: (payload: StaffLeaveCreate) => Promise<void>;
  onCancelLeave?: (leaveId: string) => Promise<void>;
  isSubmitting?: boolean;
  /** When true, opens the apply modal (controlled externally) */
  externalOpen?: boolean;
  onExternalOpenHandled?: () => void;
}

const LEAVE_TYPES = ['SICK', 'CASUAL', 'VACATION', 'PERSONAL', 'OTHER'];

export const LeaveSection: React.FC<LeaveSectionProps> = ({
  leaves,
  pendingCount,
  isLoading = false,
  onApplyLeave,
  onCancelLeave,
  isSubmitting = false,
  externalOpen,
  onExternalOpenHandled,
}) => {
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Open modal when triggered externally (e.g. HR section button). The modal state is adjusted during render
  // when the trigger changes; the parent is told it was handled by the effect below.
  const [syncedExternalOpen, setSyncedExternalOpen] = useState<boolean | undefined | null>(null);
  if (syncedExternalOpen !== externalOpen) {
    setSyncedExternalOpen(externalOpen);
    if (externalOpen) {
      setShowApplyModal(true);
    }
  }
  React.useEffect(() => {
    if (externalOpen) {
      onExternalOpenHandled?.();
    }
  }, [externalOpen]);
  const [leaveType, setLeaveType] = useState<string>('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Date picker state
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  // iOS-only: Android uses DateTimePickerAndroid.open() imperatively
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateFromISODate = (value: string) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const setStartDateValue = (value: string) => {
    setStartDate(value);
    setStartDateObj(dateFromISODate(value));
    if (endDate && value > endDate) {
      setEndDate(value);
      setEndDateObj(dateFromISODate(value));
    }
  };

  const setEndDateValue = (value: string) => {
    setEndDate(value);
    setEndDateObj(dateFromISODate(value));
  };

  const handleStartDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    // iOS inline picker: keep showing until user navigates away
    setShowStartPicker(false);
    if (selected) {
      setStartDateValue(toISODate(selected));
    }
  };

  const handleEndDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowEndPicker(false);
    if (selected) {
      setEndDateValue(toISODate(selected));
    }
  };

  const openStartDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDateObj ?? new Date(),
        mode: 'date',
        display: 'calendar',
        onChange: (_evt, selected) => {
          if (selected) setStartDateValue(toISODate(selected));
        },
      });
    } else {
      setShowStartPicker(true);
    }
  };

  const openEndDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDateObj ?? (startDateObj ?? new Date()),
        mode: 'date',
        display: 'calendar',
        minimumDate: startDateObj ?? undefined,
        onChange: (_evt, selected) => {
          if (selected) setEndDateValue(toISODate(selected));
        },
      });
    } else {
      setShowEndPicker(true);
    }
  };

  const handleApply = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Validation', 'Please enter start and end dates');
      return;
    }

    try {
      await onApplyLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });
      setShowApplyModal(false);
      resetForm();
      Alert.alert('Success', 'Leave request submitted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit leave request');
    }
  };

  const handleCancel = (leave: StaffLeaveResponse) => {
    Alert.alert(
      'Cancel Leave',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => onCancelLeave?.(leave.id),
        },
      ]
    );
  };

  const resetForm = () => {
    setLeaveType('CASUAL');
    setStartDate('');
    setEndDate('');
    setStartDateObj(null);
    setEndDateObj(null);
    setReason('');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Leave Requests</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{pendingCount} pending</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => setShowApplyModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Apply for leave"
        >
          <Ionicons name="add" size={18} color={colors.common.white} />
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Leave Balance Notice */}
      <View style={styles.balanceNotice}>
        <Ionicons name="information-circle" size={16} color={colors.info.main} />
        <Text style={styles.balanceNoticeText}>
          Leave balance information is not available in this environment
        </Text>
      </View>

      {/* Leave History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Requests</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.main} />
          </View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={32} color={colors.grey[400]} />
            <Text style={styles.emptyText}>No leave requests found</Text>
          </View>
        ) : (
          <View style={styles.leaveList}>
            {leaves.slice(0, 5).map((leave) => {
              const statusColor = getLeaveStatusColor(leave.status);
              const days = calculateLeaveDays(leave.start_date, leave.end_date);
              const canCancel = canCancelLeave(leave);

              return (
                <View key={leave.id} style={styles.leaveItem}>
                  <View style={styles.leaveItemMain}>
                    <View style={styles.leaveItemHeader}>
                      <Text style={styles.leaveItemType}>
                        {getLeaveTypeLabel(leave.leave_type)}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {leave.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.leaveItemDates}>
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)} ({days} day{days > 1 ? 's' : ''})
                    </Text>
                    {leave.reason && (
                      <Text style={styles.leaveItemReason} numberOfLines={1}>
                        {leave.reason}
                      </Text>
                    )}
                  </View>
                  {canCancel && onCancelLeave && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancel(leave)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel leave request"
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error.main} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Apply Leave Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            <TouchableOpacity onPress={() => setShowApplyModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Leave Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Leave Type</Text>
              <View style={styles.leaveTypeGrid}>
                {LEAVE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.leaveTypeOption,
                      leaveType === type && styles.leaveTypeOptionActive,
                    ]}
                    onPress={() => setLeaveType(type)}
                  >
                    <Text
                      style={[
                        styles.leaveTypeText,
                        leaveType === type && styles.leaveTypeTextActive,
                      ]}
                    >
                      {getLeaveTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openStartDatePicker}
                accessibilityRole="button"
                accessibilityLabel="Select start date"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary.main} />
                <Text style={[styles.datePickerText, !startDate && styles.datePickerPlaceholder]}>
                  {startDate || 'Select start date'}
                </Text>
              </TouchableOpacity>
              {/* iOS inline spinner — Android uses DateTimePickerAndroid.open() */}
              {showStartPicker && Platform.OS === 'ios' && (
                <CrossPlatformDateTimePicker
                  value={startDateObj ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleStartDateChange}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openEndDatePicker}
                accessibilityRole="button"
                accessibilityLabel="Select end date"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary.main} />
                <Text style={[styles.datePickerText, !endDate && styles.datePickerPlaceholder]}>
                  {endDate || 'Select end date'}
                </Text>
              </TouchableOpacity>
              {/* iOS inline spinner — Android uses DateTimePickerAndroid.open() */}
              {showEndPicker && Platform.OS === 'ios' && (
                <CrossPlatformDateTimePicker
                  value={endDateObj ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleEndDateChange}
                  minimumDate={startDateObj ?? undefined}
                />
              )}
            </View>

            {/* Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reason (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textInputMultiline]}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason for leave..."
                placeholderTextColor={colors.grey[400]}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowApplyModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleApply}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    flexGrow: 1,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  title: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  pendingBadge: {
    backgroundColor: colors.warning.main + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingText: {
    ...typography.caption,
    color: colors.warning.main,
    fontWeight: '600',
    fontSize: 11,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    minHeight: 36,
    flexShrink: 0,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.common.white,
    fontSize: 13,
  },
  balanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info.main + '10',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  balanceNoticeText: {
    ...typography.caption,
    color: colors.info.main,
    flex: 1,
  },
  historySection: {
    marginTop: spacing.sm,
  },
  historyTitle: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  leaveList: {
    gap: spacing.sm,
  },
  leaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey[50],
    borderRadius: 8,
    padding: spacing.sm,
  },
  leaveItemMain: {
    flex: 1,
  },
  leaveItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leaveItemType: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  leaveItemDates: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  leaveItemReason: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cancelButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  leaveTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  leaveTypeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.grey[100],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  leaveTypeOptionActive: {
    backgroundColor: colors.primary.main + '15',
    borderColor: colors.primary.main,
  },
  leaveTypeText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  leaveTypeTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
    backgroundColor: colors.background.default,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.background.default,
  },
  datePickerText: {
    ...typography.body1,
    color: colors.text.primary,
  },
  datePickerPlaceholder: {
    color: colors.grey[400],
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelModalButton: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.grey[100],
  },
  cancelModalButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
});

export default LeaveSection;
