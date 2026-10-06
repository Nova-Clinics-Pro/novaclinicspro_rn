/**
 * Operating Hours Screen
 * Weekly calendar view for managing clinic hours
 * 
 * Features:
 * - "Apply to all days" functionality
 * - Improved time input UX with time picker modal
 * - Error sanitization (no raw system errors shown)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useOperatingHoursListQuery,
  useCreateOperatingHourMutation,
  useUpdateOperatingHourMutation,
  useDeleteOperatingHourMutation,
} from '../../data/repositories/operatingHours.repository.impl';
import {
  OperatingHourResponse,
  OperatingHourCreate,
  OperatingHourUpdate,
  DAYS_OF_WEEK,
  formatTimeForDisplay,
  parseTimeToMinutes,
} from '../../data/models/operatingHours.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { normalizeError } from '../../../../core/api/axiosClient';

// ============================================
// TIME PICKER MODAL
// ============================================

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialValue: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title,
  initialValue,
  onSelect,
  onClose,
}) => {
  const [hours, setHours] = useState(() => {
    const parts = initialValue.split(':');
    return parts[0] || '09';
  });
  const [minutes, setMinutes] = useState(() => {
    const parts = initialValue.split(':');
    return parts[1] || '00';
  });

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      const parts = initialValue.split(':');
      setHours(parts[0] || '09');
      setMinutes(parts[1] || '00');
    }
  }, [visible, initialValue]);

  const hourOptions = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
  []);
  
  const minuteOptions = useMemo(() => 
    ['00', '15', '30', '45'],
  []);

  const handleConfirm = () => {
    onSelect(`${hours}:${minutes}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={timePickerStyles.overlay}>
        <View style={timePickerStyles.container}>
          <Text style={timePickerStyles.title}>{title}</Text>
          
          <View style={timePickerStyles.pickerRow}>
            {/* Hours */}
            <View style={timePickerStyles.pickerColumn}>
              <Text style={timePickerStyles.pickerLabel}>Hour</Text>
              <ScrollView style={timePickerStyles.pickerScroll} showsVerticalScrollIndicator={false}>
                {hourOptions.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      timePickerStyles.pickerItem,
                      hours === h && timePickerStyles.pickerItemSelected,
                    ]}
                    onPress={() => setHours(h)}
                  >
                    <Text style={[
                      timePickerStyles.pickerItemText,
                      hours === h && timePickerStyles.pickerItemTextSelected,
                    ]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={timePickerStyles.separator}>:</Text>

            {/* Minutes */}
            <View style={timePickerStyles.pickerColumn}>
              <Text style={timePickerStyles.pickerLabel}>Min</Text>
              <ScrollView style={timePickerStyles.pickerScroll} showsVerticalScrollIndicator={false}>
                {minuteOptions.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      timePickerStyles.pickerItem,
                      minutes === m && timePickerStyles.pickerItemSelected,
                    ]}
                    onPress={() => setMinutes(m)}
                  >
                    <Text style={[
                      timePickerStyles.pickerItemText,
                      minutes === m && timePickerStyles.pickerItemTextSelected,
                    ]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={timePickerStyles.preview}>
            <Text style={timePickerStyles.previewText}>{hours}:{minutes}</Text>
          </View>

          <View style={timePickerStyles.actions}>
            <TouchableOpacity style={timePickerStyles.cancelBtn} onPress={onClose}>
              <Text style={timePickerStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={timePickerStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={timePickerStyles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const timePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  title: {
    ...typography.h6,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerColumn: {
    width: 80,
  },
  pickerLabel: {
    ...typography.caption,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  pickerScroll: {
    height: 150,
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: '#2F6F4E20',
  },
  pickerItemText: {
    ...typography.body1,
    color: '#6B7280',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: '#2F6F4E',
    fontWeight: '600',
  },
  separator: {
    ...typography.h4,
    color: '#1F2937',
    marginHorizontal: spacing.sm,
  },
  preview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  previewText: {
    ...typography.h4,
    color: '#2F6F4E',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.body1,
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#2F6F4E',
    alignItems: 'center',
  },
  confirmBtnText: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ============================================
// TIME INPUT COMPONENT
// ============================================

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const TimeInput: React.FC<TimeInputProps> = ({ label, value, onChange }) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <View style={timeInputStyles.container}>
      <Text style={timeInputStyles.label}>{label}</Text>
      <TouchableOpacity
        style={timeInputStyles.input}
        onPress={() => setPickerVisible(true)}
      >
        <Ionicons name="time-outline" size={18} color="#6B7280" />
        <Text style={timeInputStyles.inputText}>{value || '--:--'}</Text>
      </TouchableOpacity>
      <TimePickerModal
        visible={pickerVisible}
        title={`Select ${label} Time`}
        initialValue={value || '09:00'}
        onSelect={onChange}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
};

const timeInputStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  inputText: {
    ...typography.body1,
    color: '#1F2937',
  },
});

// ============================================
// DAY CARD COMPONENT
// ============================================

interface DayCardProps {
  dayOfWeek: number;
  dayName: string;
  hours: OperatingHourResponse | null;
  onEdit: () => void;
}

const DayCard: React.FC<DayCardProps> = ({ dayOfWeek, dayName, hours, onEdit }) => {
  const isOpen = hours?.is_open ?? false;
  const openTime = hours?.open_time ? formatTimeForDisplay(hours.open_time) : '--:--';
  const closeTime = hours?.close_time ? formatTimeForDisplay(hours.close_time) : '--:--';
  const hasBreak = hours?.break_start && hours?.break_end;

  return (
    <TouchableOpacity
      style={[styles.dayCard, !isOpen && hours && styles.dayCardClosed]}
      onPress={onEdit}
      activeOpacity={0.7}
      accessibilityLabel={`Edit ${dayName} hours`}
    >
      <View style={styles.dayHeader}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayName}>{dayName}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isOpen ? '#10B98115' : hours ? '#EF444415' : '#9CA3AF15' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOpen ? '#10B981' : hours ? '#EF4444' : '#9CA3AF' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isOpen ? '#10B981' : hours ? '#EF4444' : '#9CA3AF' },
              ]}
            >
              {hours ? (isOpen ? 'Open' : 'Closed') : 'Not Set'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>

      {hours && isOpen ? (
        <View style={styles.hoursContainer}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color="#2F6F4E" />
            <Text style={styles.timeText}>
              {openTime} - {closeTime}
            </Text>
          </View>
          {hasBreak && (
            <View style={styles.timeRow}>
              <Ionicons name="cafe-outline" size={16} color="#C28A4B" />
              <Text style={styles.breakText}>
                Break: {formatTimeForDisplay(hours.break_start!)} -{' '}
                {formatTimeForDisplay(hours.break_end!)}
              </Text>
            </View>
          )}
        </View>
      ) : hours ? (
        <Text style={styles.closedText}>Clinic closed on this day</Text>
      ) : (
        <Text style={styles.closedText}>Tap to configure hours</Text>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// EDIT MODAL COMPONENT
// ============================================

interface EditModalProps {
  visible: boolean;
  dayOfWeek: number | null;
  existingHours: OperatingHourResponse | null;
  onClose: () => void;
  onSave: (data: OperatingHourCreate | OperatingHourUpdate, isUpdate: boolean, hoursId?: string) => Promise<void>;
  onDelete: (hoursId: string) => Promise<void>;
  onApplyToAll: (data: { openTime: string; closeTime: string; breakStart: string; breakEnd: string; hasBreak: boolean }) => void;
  isSaving: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  dayOfWeek,
  existingHours,
  onClose,
  onSave,
  onDelete,
  onApplyToAll,
  isSaving,
}) => {
  const dayName = dayOfWeek !== null ? DAYS_OF_WEEK[dayOfWeek]?.label || '' : '';

  // Form state
  const [isOpen, setIsOpen] = useState(existingHours?.is_open ?? true);
  const [openTime, setOpenTime] = useState(existingHours?.open_time?.slice(0, 5) || '09:00');
  const [closeTime, setCloseTime] = useState(existingHours?.close_time?.slice(0, 5) || '18:00');
  const [hasBreak, setHasBreak] = useState(!!(existingHours?.break_start && existingHours?.break_end));
  const [breakStart, setBreakStart] = useState(existingHours?.break_start?.slice(0, 5) || '13:00');
  const [breakEnd, setBreakEnd] = useState(existingHours?.break_end?.slice(0, 5) || '14:00');

  // Reset form when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setIsOpen(existingHours?.is_open ?? true);
      setOpenTime(existingHours?.open_time?.slice(0, 5) || '09:00');
      setCloseTime(existingHours?.close_time?.slice(0, 5) || '18:00');
      setHasBreak(!!(existingHours?.break_start && existingHours?.break_end));
      setBreakStart(existingHours?.break_start?.slice(0, 5) || '13:00');
      setBreakEnd(existingHours?.break_end?.slice(0, 5) || '14:00');
    }
  }, [visible, existingHours]);

  // Validation
  const validateTime = (time: string): boolean => {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  };

  const validateForm = (): string | null => {
    if (!isOpen) return null; // Closed days are always valid

    if (!validateTime(openTime) || !validateTime(closeTime)) {
      return 'Please select valid opening and closing times';
    }

    const openMinutes = parseTimeToMinutes(openTime);
    const closeMinutes = parseTimeToMinutes(closeTime);

    if (closeMinutes <= openMinutes) {
      return 'Closing time must be after opening time';
    }

    if (hasBreak) {
      if (!validateTime(breakStart) || !validateTime(breakEnd)) {
        return 'Please select valid break times';
      }

      const breakStartMinutes = parseTimeToMinutes(breakStart);
      const breakEndMinutes = parseTimeToMinutes(breakEnd);

      if (breakEndMinutes <= breakStartMinutes) {
        return 'Break end must be after break start';
      }

      if (breakStartMinutes < openMinutes || breakEndMinutes > closeMinutes) {
        return 'Break must be within operating hours';
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (dayOfWeek === null) return;

    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    const payload: OperatingHourCreate | OperatingHourUpdate = {
      day_of_week: dayOfWeek,
      is_open: isOpen,
      open_time: isOpen ? `${openTime}:00` : null,
      close_time: isOpen ? `${closeTime}:00` : null,
      break_start: isOpen && hasBreak ? `${breakStart}:00` : null,
      break_end: isOpen && hasBreak ? `${breakEnd}:00` : null,
      status: 'active',
    };

    await onSave(payload, !!existingHours, existingHours?.id);
  };

  const handleDelete = () => {
    if (!existingHours) return;

    Alert.alert(
      'Delete Operating Hours',
      `Are you sure you want to delete the operating hours for ${dayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(existingHours.id),
        },
      ]
    );
  };

  const handleApplyToAll = () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    Alert.alert(
      'Apply to All Days',
      'This will copy the current times to all other days. Existing hours will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            onApplyToAll({
              openTime,
              closeTime,
              breakStart,
              breakEnd,
              hasBreak,
            });
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{dayName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Open/Closed Toggle */}
            <View style={styles.formRow}>
              <View style={styles.formRowLabel}>
                <Ionicons name="power" size={20} color="#2F6F4E" />
                <Text style={styles.formLabel}>Clinic Open</Text>
              </View>
              <Switch
                value={isOpen}
                onValueChange={setIsOpen}
                trackColor={{ false: '#E5E7EB', true: '#2F6F4E50' }}
                thumbColor={isOpen ? '#2F6F4E' : '#9CA3AF'}
              />
            </View>

            {isOpen && (
              <>
                {/* Operating Hours */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Operating Hours</Text>

                  <View style={styles.timeInputRow}>
                    <TimeInput
                      label="Open"
                      value={openTime}
                      onChange={setOpenTime}
                    />
                    <View style={styles.timeArrow}>
                      <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
                    </View>
                    <TimeInput
                      label="Close"
                      value={closeTime}
                      onChange={setCloseTime}
                    />
                  </View>
                </View>

                {/* Break Toggle */}
                <View style={styles.formRow}>
                  <View style={styles.formRowLabel}>
                    <Ionicons name="cafe-outline" size={20} color="#C28A4B" />
                    <Text style={styles.formLabel}>Include Break</Text>
                  </View>
                  <Switch
                    value={hasBreak}
                    onValueChange={setHasBreak}
                    trackColor={{ false: '#E5E7EB', true: '#C28A4B50' }}
                    thumbColor={hasBreak ? '#C28A4B' : '#9CA3AF'}
                  />
                </View>

                {hasBreak && (
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>Break Time</Text>

                    <View style={styles.timeInputRow}>
                      <TimeInput
                        label="Start"
                        value={breakStart}
                        onChange={setBreakStart}
                      />
                      <View style={styles.timeArrow}>
                        <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
                      </View>
                      <TimeInput
                        label="End"
                        value={breakEnd}
                        onChange={setBreakEnd}
                      />
                    </View>
                  </View>
                )}

                {/* Apply to All Days Button */}
                <TouchableOpacity
                  style={styles.applyAllButton}
                  onPress={handleApplyToAll}
                >
                  <Ionicons name="copy-outline" size={20} color="#2F6F4E" />
                  <Text style={styles.applyAllButtonText}>Apply to All Days</Text>
                </TouchableOpacity>
              </>
            )}

            {!isOpen && (
              <View style={styles.closedNotice}>
                <Ionicons name="moon-outline" size={24} color="#6B7280" />
                <Text style={styles.closedNoticeText}>
                  The clinic will be marked as closed on {dayName}. No appointments will be
                  available.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {existingHours && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {existingHours ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const OperatingHoursScreen: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useAuthStore();

  // Get tenant ID from user context
  const tenantId = currentUser?.tenantId || '';

  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingHours, setEditingHours] = useState<OperatingHourResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [applyingToAll, setApplyingToAll] = useState(false);

  // Query operating hours
  const hoursQuery = useOperatingHoursListQuery(
    tenantId,
    { limit: 10 },
    {
      enabled: !!tenantId,
    }
  );

  const createMutation = useCreateOperatingHourMutation(tenantId);
  const deleteMutation = useDeleteOperatingHourMutation(tenantId);

  // Map hours by day of week
  const hoursByDay = useMemo(() => {
    const map = new Map<number, OperatingHourResponse>();
    hoursQuery.data?.items.forEach((hour) => {
      map.set(hour.day_of_week, hour);
    });
    return map;
  }, [hoursQuery.data?.items]);

  const handleRefresh = useCallback(() => {
    hoursQuery.refetch();
  }, [hoursQuery]);

  const handleEditDay = useCallback(
    (dayOfWeek: number) => {
      const existing = hoursByDay.get(dayOfWeek);
      setEditingDay(dayOfWeek);
      setEditingHours(existing || null);
      setModalVisible(true);
    },
    [hoursByDay]
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingDay(null);
    setEditingHours(null);
  }, []);

  // Sanitized error handler - no raw system errors shown to user
  const showUserFriendlyError = useCallback((error: unknown, action: string) => {
    const normalized = normalizeError(error);
    
    // Map error codes to user-friendly messages
    const userMessages: Record<string, string> = {
      'CORS_ERROR': 'Unable to connect to server. Please check your connection and try again.',
      'NETWORK_ERROR': 'Network error. Please check your internet connection.',
      '401': 'Your session has expired. Please log in again.',
      '403': 'You do not have permission to perform this action.',
      '404': 'The requested resource was not found.',
      '422': 'Invalid data provided. Please check your input.',
      '500': 'Server error. Please try again later.',
    };

    const message = userMessages[normalized.code] || 
                   userMessages[normalized.status?.toString() || ''] ||
                   `Unable to ${action}. Please try again.`;

    Alert.alert('Error', message);
  }, []);

  const handleSave = useCallback(
    async (
      data: OperatingHourCreate | OperatingHourUpdate,
      isUpdate: boolean,
      hoursId?: string
    ) => {
      try {
        if (isUpdate && hoursId) {
          // For update, we need to use PATCH which requires the hoursId in the URL
          // The current hook pattern creates a new mutation for each hoursId
          // For simplicity, we'll delete and recreate
          await deleteMutation.mutateAsync(hoursId);
          await createMutation.mutateAsync(data as OperatingHourCreate);
        } else {
          await createMutation.mutateAsync(data as OperatingHourCreate);
        }
        Alert.alert('Success', 'Operating hours saved successfully');
        handleCloseModal();
      } catch (error) {
        showUserFriendlyError(error, 'save operating hours');
      }
    },
    [createMutation, deleteMutation, handleCloseModal, showUserFriendlyError]
  );

  const handleDelete = useCallback(
    async (hoursId: string) => {
      try {
        await deleteMutation.mutateAsync(hoursId);
        Alert.alert('Success', 'Operating hours deleted');
        handleCloseModal();
      } catch (error) {
        showUserFriendlyError(error, 'delete operating hours');
      }
    },
    [deleteMutation, handleCloseModal, showUserFriendlyError]
  );

  // Apply to all days functionality
  const handleApplyToAll = useCallback(
    async (times: { openTime: string; closeTime: string; breakStart: string; breakEnd: string; hasBreak: boolean }) => {
      setApplyingToAll(true);
      
      try {
        // Process each day of the week (0-6)
        for (let day = 0; day < 7; day++) {
          const existing = hoursByDay.get(day);
          
          const payload: OperatingHourCreate = {
            day_of_week: day,
            is_open: true,
            open_time: `${times.openTime}:00`,
            close_time: `${times.closeTime}:00`,
            break_start: times.hasBreak ? `${times.breakStart}:00` : null,
            break_end: times.hasBreak ? `${times.breakEnd}:00` : null,
            status: 'active',
          };

          // Delete existing first if it exists
          if (existing) {
            await deleteMutation.mutateAsync(existing.id);
          }
          
          // Create new
          await createMutation.mutateAsync(payload);
        }

        Alert.alert('Success', 'Applied hours to all days');
        handleCloseModal();
        hoursQuery.refetch();
      } catch (error) {
        showUserFriendlyError(error, 'apply hours to all days');
      } finally {
        setApplyingToAll(false);
      }
    },
    [hoursByDay, createMutation, deleteMutation, handleCloseModal, hoursQuery, showUserFriendlyError]
  );

  // Count configured days
  const configuredDays = hoursQuery.data?.items.filter((h) => h.is_active).length || 0;
  const openDays = hoursQuery.data?.items.filter((h) => h.is_active && h.is_open).length || 0;

  // No tenant context
  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Operating Hours"
          subtitle="No clinic selected"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No clinic context available</Text>
          <Text style={styles.errorSubtext}>Please select a clinic first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Operating Hours"
        subtitle={`${openDays} days open`}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={hoursQuery.isRefetching}
            onRefresh={handleRefresh}
            colors={['#2F6F4E']}
            tintColor="#2F6F4E"
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{configuredDays}</Text>
            <Text style={styles.summaryLabel}>Configured</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{openDays}</Text>
            <Text style={styles.summaryLabel}>Open Days</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              {configuredDays > 0 ? configuredDays - openDays : 0}
            </Text>
            <Text style={styles.summaryLabel}>Closed</Text>
          </View>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <Text style={styles.sectionSubtitle}>Tap any day to configure operating hours</Text>

          {hoursQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F6F4E" />
              <Text style={styles.loadingText}>Loading schedule...</Text>
            </View>
          ) : hoursQuery.isError ? (
            <View style={styles.errorBox}>
              <Ionicons name="cloud-offline-outline" size={24} color="#EF4444" />
              <Text style={styles.errorBoxText}>Failed to load schedule</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            DAYS_OF_WEEK.map((day) => (
              <DayCard
                key={day.value}
                dayOfWeek={day.value}
                dayName={day.label}
                hours={hoursByDay.get(day.value) || null}
                onEdit={() => handleEditDay(day.value)}
              />
            ))
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          <Text style={styles.helpText}>
            Operating hours define when your clinic accepts appointments. Use "Apply to All Days" to quickly set the same hours for every day.
          </Text>
        </View>
      </ScrollView>

      {/* Applying to all overlay */}
      {applyingToAll && (
        <View style={styles.applyingOverlay}>
          <View style={styles.applyingContent}>
            <ActivityIndicator size="large" color="#2F6F4E" />
            <Text style={styles.applyingText}>Applying to all days...</Text>
          </View>
        </View>
      )}

      {/* Edit Modal */}
      <EditModal
        visible={modalVisible}
        dayOfWeek={editingDay}
        existingHours={editingHours}
        onClose={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onApplyToAll={handleApplyToAll}
        isSaving={createMutation.isPending || deleteMutation.isPending}
      />
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  errorSubtext: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  summaryValue: {
    ...typography.h4,
    color: '#1F2937',
  },
  summaryLabel: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
  },
  sectionSubtitle: {
    ...typography.body2,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayCardClosed: {
    opacity: 0.7,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
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
  hoursContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  timeText: {
    ...typography.body2,
    color: '#1F2937',
    fontWeight: '500',
  },
  breakText: {
    ...typography.body2,
    color: '#6B7280',
  },
  closedText: {
    ...typography.body2,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorBoxText: {
    ...typography.body2,
    color: '#991B1B',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  helpText: {
    flex: 1,
    ...typography.caption,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    ...typography.h5,
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  formRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formLabel: {
    ...typography.body1,
    color: '#1F2937',
  },
  formSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  formSectionTitle: {
    ...typography.body2,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timeArrow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  applyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#2F6F4E10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F6F4E30',
  },
  applyAllButtonText: {
    ...typography.body1,
    color: '#2F6F4E',
    fontWeight: '600',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  closedNoticeText: {
    flex: 1,
    ...typography.body2,
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  modalActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    ...typography.body1,
    color: '#6B7280',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#2F6F4E',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  applyingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  applyingText: {
    ...typography.body1,
    color: '#1F2937',
  },
});

export default OperatingHoursScreen;
