/**
 * BulkSchedulePlanScreen
 *
 * Admin screen for scheduling all rows of a treatment order at once.
 * Loads TreatmentOrderResponse (which contains all scheduling context).
 * Admin assigns therapist + date + time to each PENDING row, then submits bulk.
 *
 * Entry point: /clinic-admin/treatment-sheets/{treatmentSheetId}/schedule
 * Deep-linked from the Treatment Orders worklist "Schedule Plan" button.
 *
 * API: PATCH /api/v1/treatment-sheets/{sheetId}/rows/bulk-schedule
 *      If-Match: <version>
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CrossPlatformDateTimePicker, {
  DateTimePickerEvent,
} from '../../../../core/components/CrossPlatformDateTimePicker';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { useTreatmentOrderQuery, useBulkScheduleRowsMutation } from '../../data/repositories/treatmentOrders.repository.impl';
import { TreatmentRowOrderResponse } from '../../data/models/treatmentOrders.dtos';
import { useStaffListQuery } from '../../../staff/data/repositories/staff.repository.impl';
import { StaffResponse } from '../../../staff/data/models/staff.dtos';
import { useRoomsListQuery } from '../../../rooms/data/repositories/rooms.repository.impl';
import { RoomResponse } from '../../../rooms/data/models/rooms.dtos';
import { buildBulkScheduleAssignments } from '../utils/bulkScheduleAssignments';
import { isTreatmentVersionConflict, treatmentErrorMessage } from '../../application/treatmentErrorPresentation';

// ============================================
// HELPERS
// ============================================

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDisplayTime = (d: Date): string =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const MAX_THERAPISTS_PER_SESSION = 2;

// ============================================
// ROW ASSIGNMENT STATE
// ============================================

interface RowAssignment {
  rowId: string;
  dayNumber: number;
  currentStatus: TreatmentRowOrderResponse['status'];
  staffId: string;
  therapistIds: string[];
  roomId: string;
  date: Date;
  time: Date;
  /** Pre-filled from existing scheduled_date/time if row was already scheduled */
  isPreFilled: boolean;
}

// ============================================
// THERAPIST PICKER ROW
// ============================================

interface TherapistPickerProps {
  staff: StaffResponse[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const TherapistPicker: React.FC<TherapistPickerProps> = ({ staff, selectedIds, onToggle }) => {
  const theme = useClinicTheme();
  const therapists = staff.filter(s => (s.staff_type ?? '').toLowerCase() === 'therapist' && s.is_active);

  if (therapists.length === 0) {
    return (
      <Text style={[styles.noTherapistText, { color: theme.colors.text.secondary }]}>
        No active therapists found
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.therapistScroll}>
      {therapists.map(t => {
        const selected = selectedIds.includes(t.id);
        return (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.therapistChip,
              {
                backgroundColor: selected ? theme.colors.primary.default : theme.colors.background.elevated,
                borderColor: selected ? theme.colors.primary.default : theme.colors.border.subtle,
              },
            ]}
            onPress={() => onToggle(t.id)}
            activeOpacity={0.7}
          >
            {selected && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.colors.primary.onPrimary}
                style={styles.therapistChipIcon}
              />
            )}
            <Text
              style={[
                styles.therapistChipText,
                { color: selected ? theme.colors.primary.onPrimary : theme.colors.text.primary },
              ]}
              numberOfLines={1}
            >
              {t.full_name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

interface RoomPickerProps {
  rooms: RoomResponse[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const RoomPicker: React.FC<RoomPickerProps> = ({ rooms, selectedId, onSelect }) => {
  const theme = useClinicTheme();
  const activeRooms = rooms.filter(r => r.is_active);

  if (activeRooms.length === 0) {
    return (
      <Text style={[styles.noTherapistText, { color: theme.colors.text.secondary }]}>
        No active rooms found
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.therapistScroll}>
      {activeRooms.map(room => {
        const selected = room.id === selectedId;
        return (
          <TouchableOpacity
            key={room.id}
            style={[
              styles.therapistChip,
              {
                backgroundColor: selected ? theme.colors.primary.default : theme.colors.background.elevated,
                borderColor: selected ? theme.colors.primary.default : theme.colors.border.subtle,
              },
            ]}
            onPress={() => onSelect(room.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.therapistChipText,
                { color: selected ? theme.colors.primary.onPrimary : theme.colors.text.primary },
              ]}
              numberOfLines={1}
            >
              {room.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const BulkSchedulePlanScreen: React.FC = () => {
  const theme = useClinicTheme();
  const router = useRouter();
  const { treatmentSheetId } = useLocalSearchParams<{ treatmentSheetId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId ?? '';
  const sheetId = treatmentSheetId ?? '';

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: order, isLoading, isError, refetch } = useTreatmentOrderQuery(sheetId, tenantId, {
    enabled: !!sheetId && !!tenantId,
  });

  const { data: staffData, isLoading: isStaffLoading } = useStaffListQuery(tenantId, {
    staff_type: 'therapist',
    is_active: true,
    limit: 100,
  });

  const { data: roomsData, isLoading: isRoomsLoading } = useRoomsListQuery(tenantId, {
    is_active: true,
    limit: 100,
  });

  const staff = staffData?.items ?? [];
  const rooms = roomsData?.items ?? [];

  const bulkMutation = useBulkScheduleRowsMutation(tenantId);

  // ── Row assignments state ─────────────────────────────────────────────────
  // Initialised once when order loads; keyed by row id
  const [assignments, setAssignments] = useState<Record<string, RowAssignment>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialise assignments from order rows (runs once)
  React.useEffect(() => {
    if (order && !initialized) {
      const now = new Date();
      const defaultTime = new Date(now);
      defaultTime.setHours(9, 0, 0, 0);

      const init: Record<string, RowAssignment> = {};
      order.rows.forEach(row => {
        if (row.status === 'CANCELLED') return; // skip cancelled rows
        const existingDate = row.scheduled_date
          ? new Date(row.scheduled_date + 'T00:00:00')
          : new Date(now);
        const existingTime = row.scheduled_time
          ? (() => {
              const [h, m] = row.scheduled_time.split(':').map(Number);
              const t = new Date();
              t.setHours(h, m, 0, 0);
              return t;
            })()
          : defaultTime;

        init[row.id] = {
          rowId: row.id,
          dayNumber: row.day_number,
          currentStatus: row.status,
          staffId: row.assigned_staff_id ?? '',
          therapistIds: row.assigned_staff_id ? [row.assigned_staff_id] : [],
          roomId: '',
          date: existingDate,
          time: existingTime,
          isPreFilled: !!row.scheduled_date,
        };
      });
      setAssignments(init);
      setInitialized(true);
    }
  }, [order, initialized]);

  // ── Date/time picker state ────────────────────────────────────────────────
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [pickerVisible, setPickerVisible] = useState(false);

  const openPicker = useCallback((rowId: string, mode: 'date' | 'time') => {
    setPickerRowId(rowId);
    setPickerMode(mode);
    setPickerVisible(true);
  }, []);

  const handlePickerChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setPickerVisible(false);
      if (!selected || !pickerRowId) return;
      setAssignments(prev => {
        const row = prev[pickerRowId];
        if (!row) return prev;
        return {
          ...prev,
          [pickerRowId]: {
            ...row,
            date: pickerMode === 'date' ? selected : row.date,
            time: pickerMode === 'time' ? selected : row.time,
          },
        };
      });
    },
    [pickerRowId, pickerMode]
  );

  const toggleTherapist = useCallback((rowId: string, staffId: string) => {
    const currentRow = assignments[rowId];
    if (
      currentRow &&
      !currentRow.therapistIds.includes(staffId) &&
      currentRow.therapistIds.length >= MAX_THERAPISTS_PER_SESSION
    ) {
      Alert.alert('Limit Reached', `Only ${MAX_THERAPISTS_PER_SESSION} therapists can be assigned to one session.`);
      return;
    }

    setAssignments(prev => {
      const row = prev[rowId];
      if (!row) return prev;

      const isSelected = row.therapistIds.includes(staffId);
      if (!isSelected && row.therapistIds.length >= MAX_THERAPISTS_PER_SESSION) {
        return prev;
      }

      const therapistIds = isSelected
        ? row.therapistIds.filter(id => id !== staffId)
        : [...row.therapistIds, staffId];

      return {
        ...prev,
        [rowId]: {
          ...row,
          staffId: therapistIds[0] ?? '',
          therapistIds,
        },
      };
    });
  }, [assignments]);

  const updateRoom = useCallback((rowId: string, roomId: string) => {
    setAssignments(prev => ({
      ...prev,
      [rowId]: { ...prev[rowId], roomId },
    }));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const pendingRows = useMemo(
    () => Object.values(assignments).filter(a => a.currentStatus === 'PENDING'),
    [assignments]
  );

  const allRows = useMemo(() => Object.values(assignments), [assignments]);

  const isValid = useMemo(
    () => allRows.every(a => a.therapistIds.length > 0 && a.roomId !== ''),
    [allRows]
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!order) return;
    if (!isValid) {
      Alert.alert('Incomplete', 'Please assign a therapist to every session.');
      return;
    }

    const payload = buildBulkScheduleAssignments(allRows);

    bulkMutation.mutate(
      { sheetId, version: order.version, payload: { assignments: payload } },
      {
        onSuccess: () => {
          Alert.alert('Scheduled', 'All sessions have been scheduled.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (error: unknown) => {
          if (isTreatmentVersionConflict(error)) {
            Alert.alert(
              'Plan Updated Elsewhere',
              'This plan was updated by someone else. Refreshing latest data.',
              [{ text: 'OK', onPress: () => { setInitialized(false); refetch(); } }]
            );
          } else {
            Alert.alert('Error', treatmentErrorMessage(error, 'Failed to schedule'));
          }
        },
      }
    );
  }, [order, isValid, allRows, sheetId, bulkMutation, router, refetch]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading || isStaffLoading || isRoomsLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Loading plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.feedback.error} />
          <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>Failed to load treatment plan</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.colors.primary.default }]} onPress={() => refetch()}>
            <Text style={[styles.retryBtnText, { color: theme.colors.primary.onPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pickerValue = pickerRowId
    ? (pickerMode === 'date' ? assignments[pickerRowId]?.date : assignments[pickerRowId]?.time) ?? new Date()
    : new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Schedule Plan</Text>
          <Text style={[styles.headerSub, { color: theme.colors.text.secondary }]}>
            {order.planned_sessions ?? allRows.length} sessions
            {order.preferred_time_window ? `  ·  ${order.preferred_time_window}` : ''}
            {order.frequency ? `  ·  ${order.frequency}` : ''}
          </Text>
        </View>
      </View>

      {/* Doctor notes banner */}
      {order.order_notes ? (
        <View style={[styles.notesBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Ionicons name="document-text-outline" size={16} color="#B45309" />
          <Text style={[styles.notesText, { color: '#92400E' }]} numberOfLines={3}>
            Doctor's notes: {order.order_notes}
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {allRows
          .sort((a, b) => a.dayNumber - b.dayNumber)
          .map(assignment => {
            const row = order.rows.find(r => r.id === assignment.rowId);
            const isCompleted = assignment.currentStatus === 'COMPLETED';
            const isCancelled = assignment.currentStatus === 'CANCELLED';

            return (
              <View
                key={assignment.rowId}
                style={[
                  styles.rowCard,
                  {
                    backgroundColor: theme.colors.background.elevated,
                    borderColor: theme.colors.border.subtle,
                    opacity: isCancelled ? 0.5 : 1,
                  },
                ]}
              >
                {/* Row header */}
                <View style={styles.rowCardHeader}>
                  <View style={[styles.dayBadge, { backgroundColor: theme.colors.primary.default + '18' }]}>
                    <Text style={[styles.dayBadgeText, { color: theme.colors.primary.default }]}>
                      Day {assignment.dayNumber}
                    </Text>
                  </View>
                  {assignment.isPreFilled && !isCompleted && (
                    <View style={[styles.preFillBadge, { backgroundColor: '#10B98118', borderColor: '#10B98150' }]}>
                      <Text style={styles.preFillBadgeText}>Rescheduling</Text>
                    </View>
                  )}
                  {isCompleted && (
                    <View style={[styles.preFillBadge, { backgroundColor: '#10B98118', borderColor: '#10B98150' }]}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={[styles.preFillBadgeText, { color: '#10B981' }]}>Completed</Text>
                    </View>
                  )}
                  {isCancelled && (
                    <View style={[styles.preFillBadge, { backgroundColor: '#EF444418', borderColor: '#EF444450' }]}>
                      <Text style={[styles.preFillBadgeText, { color: '#EF4444' }]}>Cancelled</Text>
                    </View>
                  )}
                  {row?.treatment_name && (
                    <Text style={[styles.treatmentName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                      {row.treatment_name}
                    </Text>
                  )}
                </View>

                {/* Date + Time pickers */}
                <View style={styles.pickerRow}>
                  <TouchableOpacity
                    style={[styles.pickerBtn, { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.default }]}
                    onPress={() => openPicker(assignment.rowId, 'date')}
                    disabled={isCompleted || isCancelled}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.primary.default} />
                    <Text style={[styles.pickerBtnText, { color: theme.colors.text.primary }]}>
                      {formatDisplayDate(assignment.date)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickerBtn, { borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.default }]}
                    onPress={() => openPicker(assignment.rowId, 'time')}
                    disabled={isCompleted || isCancelled}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.colors.primary.default} />
                    <Text style={[styles.pickerBtnText, { color: theme.colors.text.primary }]}>
                      {formatDisplayTime(assignment.time)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Therapist picker */}
                {!isCompleted && !isCancelled && (
                  <>
                    <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>
                      Therapists ({assignment.therapistIds.length}/{MAX_THERAPISTS_PER_SESSION})
                    </Text>
                    <TherapistPicker
                      staff={staff}
                      selectedIds={assignment.therapistIds}
                      onToggle={id => toggleTherapist(assignment.rowId, id)}
                    />
                    {assignment.therapistIds.length === 0 && (
                      <Text style={styles.validationText}>Required</Text>
                    )}
                    <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>Room</Text>
                    <RoomPicker
                      rooms={rooms}
                      selectedId={assignment.roomId}
                      onSelect={id => updateRoom(assignment.rowId, id)}
                    />
                    {assignment.roomId === '' && (
                      <Text style={styles.validationText}>Required</Text>
                    )}
                  </>
                )}
              </View>
            );
          })}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: isValid ? theme.colors.primary.default : theme.colors.text.disabled },
          ]}
          onPress={handleSubmit}
          disabled={!isValid || bulkMutation.isPending}
          activeOpacity={0.8}
        >
          {bulkMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          )}
          <Text style={styles.submitBtnText}>
            {bulkMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Picker */}
      {pickerVisible && pickerRowId && (
        <CrossPlatformDateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
          minimumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      )}
      {/* iOS: dismiss spinner */}
      {Platform.OS === 'ios' && pickerVisible && (
        <TouchableOpacity
          style={[styles.iosDismiss, { backgroundColor: theme.colors.background.elevated }]}
          onPress={() => setPickerVisible(false)}
        >
          <Text style={[styles.iosDismissText, { color: theme.colors.primary.default }]}>Done</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.sm },
  errorText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 8, marginTop: spacing.sm },
  retryBtnText: { fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSub: { fontSize: 12, marginTop: 2 },
  notesBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  notesText: { flex: 1, fontSize: 13, lineHeight: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  rowCard: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  rowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: { fontSize: 12, fontWeight: '700' },
  preFillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  preFillBadgeText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
  treatmentName: { fontSize: 12, flex: 1 },
  pickerRow: { flexDirection: 'row', gap: spacing.sm },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerBtnText: { fontSize: 13, flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  therapistScroll: { flexGrow: 0 },
  therapistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  therapistChipIcon: { marginLeft: -2 },
  therapistChipText: { fontSize: 13, fontWeight: '500' },
  noTherapistText: { fontSize: 13, fontStyle: 'italic' },
  validationText: { fontSize: 11, color: '#EF4444' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  iosDismiss: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  iosDismissText: { fontSize: 16, fontWeight: '600' },
});

export default BulkSchedulePlanScreen;
