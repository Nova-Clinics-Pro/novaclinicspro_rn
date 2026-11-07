/**
 * ScheduleRowModal
 *
 * Allows clinic admin to assign a date, time, and therapist to a single
 * treatment order row. Calls PATCH /treatment-sheets/{id}/rows/{rowId}/schedule.
 *
 * Requires If-Match: <version> — caller passes current order version.
 * On 409 VERSION_CONFLICT: shows toast, caller should refetch order.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import CrossPlatformDateTimePicker, {
  DateTimePickerEvent,
} from '../../../../core/components/CrossPlatformDateTimePicker';
import { useStaffListQuery } from '../../../staff/data/repositories/staff.repository.impl';
import { useScheduleRowMutation } from '../../data/repositories/treatmentOrders.repository.impl';
import { TreatmentRowOrderResponse } from '../../data/models/treatmentOrders.dtos';
import { isTreatmentVersionConflict, treatmentErrorMessage } from '../../application/treatmentErrorPresentation';

// ============================================
// PROPS
// ============================================

interface ScheduleRowModalProps {
  visible: boolean;
  tenantId: string;
  sheetId: string;
  row: TreatmentRowOrderResponse;
  orderVersion: number;
  onClose: () => void;
  /** Called with updated order after successful schedule */
  onScheduled: () => void;
  /** Called on 409 VERSION_CONFLICT so parent can refetch */
  onVersionConflict: () => void;
}

// ============================================
// HELPERS
// ============================================

const toDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toTimeStr = (d: Date): string => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}:00`;
};

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDisplayTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

// ============================================
// COMPONENT
// ============================================

export const ScheduleRowModal: React.FC<ScheduleRowModalProps> = ({
  visible,
  tenantId,
  sheetId,
  row,
  orderVersion,
  onClose,
  onScheduled,
  onVersionConflict,
}) => {
  const [date, setDate] = useState<Date>(() => {
    if (row.scheduled_date) {
      const d = new Date(row.scheduled_date + 'T00:00:00');
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });

  const [time, setTime] = useState<Date>(() => {
    if (row.scheduled_time) {
      const [h, m] = row.scheduled_time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    row.assigned_staff_id ?? ''
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const scheduleRow = useScheduleRowMutation(tenantId);

  const { data: therapistsData, isLoading: isLoadingTherapists } = useStaffListQuery(
    tenantId,
    { staff_type: 'therapist', is_active: true, limit: 100 },
    { enabled: !!tenantId }
  );

  const therapists = useMemo(
    () =>
      (therapistsData?.items ?? []).filter(
        (s: any) => (s.staff_type ?? '').toLowerCase() === 'therapist'
      ),
    [therapistsData]
  );

  const handleSave = async () => {
    if (!selectedStaffId) {
      Alert.alert('Required', 'Please select a therapist.');
      return;
    }

    try {
      await scheduleRow.mutateAsync({
        sheetId,
        rowId: row.id,
        version: orderVersion,
        payload: {
          assigned_staff_id: selectedStaffId,
          scheduled_date: toDateStr(date),
          scheduled_time: toTimeStr(time),
        },
      });
      onScheduled();
    } catch (error: unknown) {
      if (isTreatmentVersionConflict(error)) {
        Alert.alert(
          'Plan Updated',
          'This treatment plan was updated elsewhere. Refreshing…',
          [{ text: 'OK', onPress: onVersionConflict }]
        );
      } else {
        Alert.alert('Error', treatmentErrorMessage(error, 'Failed to schedule row.'));
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Day {row.day_number}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary.main} />
              <Text style={styles.pickerButtonText}>{formatDisplayDate(date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <CrossPlatformDateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_: DateTimePickerEvent, d?: Date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) {
                    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                    setDate(local);
                  }
                }}
              />
            )}

            {/* Time */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary.main} />
              <Text style={styles.pickerButtonText}>{formatDisplayTime(time)}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <CrossPlatformDateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_: DateTimePickerEvent, t?: Date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (t) {
                    const local = new Date();
                    local.setHours(t.getHours(), t.getMinutes(), 0, 0);
                    setTime(local);
                  }
                }}
              />
            )}

            {/* Therapist */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>Therapist</Text>
            {isLoadingTherapists ? (
              <ActivityIndicator size="small" color={colors.primary.main} style={{ marginTop: spacing.sm }} />
            ) : (
              therapists.map((s: any) => {
                const isSelected = selectedStaffId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.staffRow, isSelected && styles.staffRowSelected]}
                    onPress={() => setSelectedStaffId(s.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.staffRadio, isSelected && styles.staffRadioSelected]}>
                      {isSelected && <View style={styles.staffRadioDot} />}
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={[styles.staffName, isSelected && styles.staffNameSelected]}>
                        {s.full_name || s.name || 'Unknown'}
                      </Text>
                      {s.designation && (
                        <Text style={styles.staffDesignation}>{s.designation}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Save */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, scheduleRow.isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={scheduleRow.isPending}
              activeOpacity={0.8}
            >
              {scheduleRow.isPending ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.common.white} />
                  <Text style={styles.saveBtnText}>Confirm Schedule</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: { ...typography.h6, color: colors.text.primary },
  closeBtn: { padding: spacing.xs },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.xs },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background.paper,
  },
  pickerButtonText: { ...typography.body2, color: colors.text.primary },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.paper,
  },
  staffRowSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '0D',
  },
  staffRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffRadioSelected: { borderColor: colors.primary.main },
  staffRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.main,
  },
  staffInfo: { flex: 1 },
  staffName: { ...typography.body2, color: colors.text.primary },
  staffNameSelected: { color: colors.primary.main, fontWeight: '600' },
  staffDesignation: { ...typography.caption, color: colors.text.secondary },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  saveBtnText: { ...typography.button, color: colors.common.white },
});

export default ScheduleRowModal;
