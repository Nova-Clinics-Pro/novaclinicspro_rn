/**
 * Treatment Orders Worklist
 * Admin screen — lists all treatment orders (is_order = true).
 * Allows filtering by state / scheduling_status.
 * "Schedule Plan" deep-links to the multi-day appointment creation screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import { colors } from '../../../core/theme/colors';
import { spacing } from '../../../core/theme/spacing';
import { typography } from '../../../core/theme/typography';
import {
  useTreatmentOrdersQuery,
  useCancelTreatmentOrderMutation,
  usePlaceTreatmentOrderOnHoldMutation,
  useExtendTreatmentOrderHoldMutation,
} from '../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import {
  TreatmentOrderResponse,
  TreatmentOrderState,
  getOrderStateLabel,
  getPrimaryOrderStatusLabel,
  getPrimaryOrderStatusColor,
} from '../../../features/treatmentSheets/data/models/treatmentOrders.dtos';
import { useClientDetailQuery } from '../../../features/clients/data/repositories/clients.repository.impl';
import { useStaffDetailQuery } from '../../../features/staff/data/repositories/staff.repository.impl';
import { PatientScheduleModal } from '../../../features/treatmentSheets/presentation/components/PatientScheduleModal';

// ============================================
// HELPERS
// ============================================

const formatShortDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

// ============================================
// FILTER CHIPS
// ============================================

// Canonical patient-decline reasons (mirror backend TreatmentDenialReason enum).
// Captured for later analysis of why patients decline recommendations.
const DECLINE_REASONS: { code: string; label: string }[] = [
  { code: 'financial', label: 'Financial / cost' },
  { code: 'time_constraints', label: 'Time / scheduling constraints' },
  { code: 'second_opinion', label: 'Wants second opinion / undecided' },
  { code: 'distance', label: 'Distance / travel' },
  { code: 'other', label: 'Other' },
];

// Phase 4 (R4) · T-D.1 — hold-duration presets (days from now).
const HOLD_DURATION_PRESETS: { days: number; label: string }[] = [
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
];

const STATE_FILTERS: { label: string; value: TreatmentOrderState | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Ordered', value: 'ORDERED' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

// ============================================
// ORDER CARD
// ============================================

interface OrderCardProps {
  order: TreatmentOrderResponse;
  tenantId: string;
  onSchedule: (order: TreatmentOrderResponse) => void;
  onViewSheet: (order: TreatmentOrderResponse) => void;
  onSendSchedule: (order: TreatmentOrderResponse) => void;
  onPatientDeclined: (order: TreatmentOrderResponse) => void;
  onHold: (order: TreatmentOrderResponse) => void;
  isCancelling: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  tenantId,
  onSchedule,
  onViewSheet,
  onSendSchedule,
  onPatientDeclined,
  onHold,
  isCancelling,
}) => {
  // R3B · T-D.2 (FR-D2) — exactly one primary status pill, via the same
  // shared resolution `TreatmentSheetInfoCard.tsx` uses (T-D.1). This
  // replaces the previous two-pill display (a state chip plus a
  // conditional scheduling-status chip) — the "needs re-scheduling" drift
  // signal that second chip existed to catch is preserved inside
  // `getPrimaryOrderStatusLabel` itself (see its own docstring), not lost.
  const primaryStatusLabel = getPrimaryOrderStatusLabel(order);
  const primaryStatusColor = getPrimaryOrderStatusColor(order);

  const progress = order.planned_sessions && order.planned_sessions > 0
    ? Math.round((order.scheduled_count / order.planned_sessions) * 100)
    : 0;

  // Fetch client name — cached by React Query, no waterfall
  const { data: client } = useClientDetailQuery(tenantId, order.client_id, {
    staleTime: 5 * 60 * 1000,
  });
  const clientName = client?.full_name ?? '—';

  // Fetch doctor name — use ordered_by_name if API returns it, else fetch by recorded_by_staff_id
  const doctorStaffId = order.recorded_by_staff_id ?? '';
  const { data: doctorStaff } = useStaffDetailQuery(tenantId, doctorStaffId, {
    enabled: !!doctorStaffId && !order.ordered_by_name,
    staleTime: 5 * 60 * 1000,
  });
  const doctorName = order.ordered_by_name ?? doctorStaff?.full_name ?? null;

  const sessions = order.planned_sessions ?? order.duration_days;
  // Therapy as submitted by the doctor — prefer the recommendation field, then
  // fall back to the first row's description for legacy row-based sheets.
  const therapy = order.recommended_therapy ?? order.rows?.[0]?.treatment_name ?? null;
  const canCancelPending =
    order.state === 'ORDERED' ||
    order.scheduling_status === 'PENDING_SCHEDULING' ||
    order.scheduling_status === 'PARTIALLY_SCHEDULED';
  // Phase 4 (R4) · T-D.1 (ADR-R4-01) — On Hold is only valid while
  // state==='ORDERED' (matches the backend's own place_on_hold guard);
  // does not change `state`, so Schedule/Decline stay available too.
  const isOnHold = order.scheduling_status === 'ON_HOLD';
  const canPlaceOnHold = order.state === 'ORDERED' && !isOnHold;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewSheet(order)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Treatment order for ${clientName}`}
    >
      {/* Client name — primary identifier */}
      <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>

      {/* Doctor who ordered */}
      {!!doctorName && (
        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={13} color={colors.text.secondary} />
          <Text style={styles.cardMeta}>Dr. {doctorName}</Text>
        </View>
      )}

      {/* Recommended therapy — as submitted by the doctor */}
      {!!therapy && (
        <View style={styles.metaRow}>
          <Ionicons name="medical-outline" size={13} color={colors.text.secondary} />
          <Text style={styles.cardMeta} numberOfLines={2}>{therapy}</Text>
        </View>
      )}

      {/* Single primary status pill (R3B · T-D.2, FR-D2) */}
      <View style={styles.cardTopRow}>
        <View style={[styles.pill, { backgroundColor: primaryStatusColor + '18', borderColor: primaryStatusColor + '50' }]}>
          <View style={[styles.pillDot, { backgroundColor: primaryStatusColor }]} />
          <Text style={[styles.pillText, { color: primaryStatusColor }]}>{primaryStatusLabel}</Text>
        </View>
      </View>

      {/* Sessions + ordered date */}
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.text.secondary} />
        <Text style={styles.cardMeta}>
          {sessions ? `${sessions} sessions` : 'Sessions TBD'}
        </Text>
        {!!order.ordered_at && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.cardMeta}>Ordered {formatShortDate(order.ordered_at)}</Text>
          </>
        )}
      </View>

      {/* Phase 4 (R4) · T-D.1 — On-Hold fact, shown directly from raw fields
          (not a derived status label — re-pointing the main pill to the
          backend resolver is T-E.1's own scope, not duplicated here). */}
      {isOnHold && (
        <View style={styles.metaRow}>
          <Ionicons name="pause-circle-outline" size={13} color={colors.warning?.main ?? colors.text.secondary} />
          <Text style={styles.cardMeta}>
            On hold{order.hold_expires_at ? ` until ${formatShortDate(order.hold_expires_at)}` : ''}
          </Text>
          {order.hold_notes ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{order.hold_notes}</Text>
            </>
          ) : null}
        </View>
      )}

      {/* Progress bar — only when partially/fully scheduled */}
      {order.planned_sessions != null && order.planned_sessions > 0 && order.scheduled_count > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: primaryStatusColor }]} />
          </View>
          <Text style={styles.progressLabel}>
            {order.scheduled_count}/{order.planned_sessions} scheduled
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        {canCancelPending && (
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => onSchedule(order)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={14} color={colors.common.white} />
            <Text style={styles.scheduleBtnText}>Schedule Plan</Text>
          </TouchableOpacity>
        )}
        {canCancelPending && (
          <TouchableOpacity
            style={[styles.declineBtn, isCancelling && styles.disabledBtn]}
            onPress={() => onPatientDeclined(order)}
            disabled={isCancelling}
            activeOpacity={0.7}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.error.main} />
            ) : (
              <Ionicons name="close-circle-outline" size={14} color={colors.error.main} />
            )}
            <Text style={styles.declineBtnText}>Patient Declined</Text>
          </TouchableOpacity>
        )}
        {order.state === 'SCHEDULED' && order.scheduling_status === 'FULLY_SCHEDULED' && (
          <TouchableOpacity
            style={styles.sendScheduleBtn}
            onPress={() => onSendSchedule(order)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={14} color={colors.common.white} />
            <Text style={styles.scheduleBtnText}>Send Schedule</Text>
          </TouchableOpacity>
        )}
        {/* Phase 4 (R4) · T-D.1 — Scheduling On Hold action, added to the
            existing scheduling worklist screen (no new scheduling screen). */}
        {(canPlaceOnHold || isOnHold) && (
          <TouchableOpacity
            style={styles.holdBtn}
            onPress={() => onHold(order)}
            activeOpacity={0.7}
          >
            <Ionicons name="pause-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.holdBtnText}>{isOnHold ? 'Extend Hold' : 'On Hold'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => onViewSheet(order)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewBtnText}>View Sheet</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary.main} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// SCREEN
// ============================================

export default function TreatmentOrdersScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId ?? '';

  const [stateFilter, setStateFilter] = useState<TreatmentOrderState | undefined>(undefined);
  const [scheduleModalOrder, setScheduleModalOrder] = useState<TreatmentOrderResponse | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  // Patient-decline flow: select a reason BEFORE cancelling.
  const [declineOrder, setDeclineOrder] = useState<TreatmentOrderResponse | null>(null);
  const [declineReasonCode, setDeclineReasonCode] = useState<string | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState('');
  const cancelOrderMutation = useCancelTreatmentOrderMutation(tenantId);

  // Phase 4 (R4) · T-D.1 — Scheduling On Hold flow (place or extend, same modal).
  const [holdOrder, setHoldOrder] = useState<TreatmentOrderResponse | null>(null);
  const [holdDurationDays, setHoldDurationDays] = useState<number>(HOLD_DURATION_PRESETS[0].days);
  const [holdNotesText, setHoldNotesText] = useState('');
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);
  const placeOnHoldMutation = usePlaceTreatmentOrderOnHoldMutation(tenantId);
  const extendHoldMutation = useExtendTreatmentOrderHoldMutation(tenantId);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTreatmentOrdersQuery(
    tenantId,
    { state: stateFilter, limit: 50 },
    { enabled: !!tenantId }
  );

  const orders = data?.items ?? [];

  const handleSchedule = useCallback(
    (order: TreatmentOrderResponse) => {
      router.push({
        pathname: '/clinic-admin/appointments/create',
        params: {
          tab: 'MULTI',
          treatmentSheetId: order.id,
          ...(order.episode_id ? { episodeId: order.episode_id } : {}),
          ...(order.case_sheet_id ? { caseSheetId: order.case_sheet_id } : {}),
          ...(order.planned_sessions ? { durationDays: String(order.planned_sessions) } : {}),
        },
      } as any);
    },
    [router]
  );

  const handleViewSheet = useCallback(
    (order: TreatmentOrderResponse) => {
      router.push(
        `/clinic-admin/treatment-sheets/${order.id}` as any
      );
    },
    [router]
  );

  const handleSendSchedule = useCallback(
    (order: TreatmentOrderResponse) => {
      setScheduleModalOrder(order);
    },
    []
  );

  // Step 1: open the reason picker. Cancellation does NOT happen yet — the plan
  // (recommendation history) stays intact until the admin picks a reason + confirms.
  const handlePatientDeclined = useCallback(
    (order: TreatmentOrderResponse) => {
      setDeclineReasonCode(null);
      setDeclineReasonText('');
      setDeclineOrder(order);
    },
    []
  );

  const closeDeclineModal = useCallback(() => {
    setDeclineOrder(null);
    setDeclineReasonCode(null);
    setDeclineReasonText('');
  }, []);

  // Step 2: confirm — only now do we cancel, recording the chosen reason.
  const confirmDecline = useCallback(async () => {
    if (!declineOrder || !declineReasonCode) return;
    if (declineReasonCode === 'other' && !declineReasonText.trim()) return;

    const order = declineOrder;
    setCancellingOrderId(order.id);
    setDeclineOrder(null);
    try {
      await cancelOrderMutation.mutateAsync({
        sheetId: order.id,
        version: order.version,
        reason_code: declineReasonCode,
        reason_text: declineReasonText.trim() || undefined,
      });
      Alert.alert('Recorded', 'Patient decline recorded and removed from the scheduling worklist.');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to record the decline.');
    } finally {
      setCancellingOrderId(null);
      setDeclineReasonCode(null);
      setDeclineReasonText('');
    }
  }, [declineOrder, declineReasonCode, declineReasonText, cancelOrderMutation]);

  // Phase 4 (R4) · T-D.1 — open the hold modal (works for both the initial
  // "On Hold" action and "Extend Hold" on an already-held order).
  const handleHold = useCallback((order: TreatmentOrderResponse) => {
    setHoldDurationDays(HOLD_DURATION_PRESETS[0].days);
    setHoldNotesText(order.hold_notes ?? '');
    setHoldOrder(order);
  }, []);

  const closeHoldModal = useCallback(() => {
    setHoldOrder(null);
    setHoldNotesText('');
  }, []);

  const confirmHold = useCallback(async () => {
    if (!holdOrder) return;
    const order = holdOrder;
    const holdExpiresAt = new Date(Date.now() + holdDurationDays * 24 * 60 * 60 * 1000).toISOString();
    setIsSubmittingHold(true);
    try {
      if (order.scheduling_status === 'ON_HOLD') {
        await extendHoldMutation.mutateAsync({
          sheetId: order.id,
          version: order.version,
          hold_expires_at: holdExpiresAt,
        });
        Alert.alert('Hold extended', 'The scheduling hold has been extended.');
      } else {
        await placeOnHoldMutation.mutateAsync({
          sheetId: order.id,
          version: order.version,
          hold_expires_at: holdExpiresAt,
          hold_notes: holdNotesText.trim() || undefined,
        });
        Alert.alert('Placed on hold', 'Scheduling has been paused for this treatment plan.');
      }
      setHoldOrder(null);
      setHoldNotesText('');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to update the hold.');
    } finally {
      setIsSubmittingHold(false);
    }
  }, [holdOrder, holdDurationDays, holdNotesText, placeOnHoldMutation, extendHoldMutation]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={48} color={colors.text.disabled} />
        <Text style={styles.emptyTitle}>No treatment orders</Text>
        <Text style={styles.emptyMessage}>
          {stateFilter
            ? `No orders with state "${getOrderStateLabel(stateFilter)}".`
            : 'No treatment orders found.'}
        </Text>
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        {/* R3B · T-D.2 (FR-D1, Doc 03 §19) — "Treatment Plans" matches the
            app's own already-established task-oriented term for this same
            entity (app/clinic-admin/index.tsx's "Treatment Plan(s) to
            Schedule" widget navigates to this exact screen), replacing the
            raw entity name "Treatment Orders". */}
        <Text style={styles.headerTitle}>Treatment Plans</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
          <Ionicons name="refresh" size={22} color={isRefetching ? colors.text.disabled : colors.primary.main} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {STATE_FILTERS.map((f) => {
          const active = stateFilter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStateFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error.main} />
          <Text style={styles.errorText}>Failed to load orders.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              tenantId={tenantId}
              onSchedule={handleSchedule}
              onViewSheet={handleViewSheet}
              onSendSchedule={handleSendSchedule}
              onPatientDeclined={handlePatientDeclined}
              onHold={handleHold}
              isCancelling={cancellingOrderId === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
        />
      )}
    </SafeAreaView>

    {scheduleModalOrder && (
      <PatientScheduleModal
        visible={!!scheduleModalOrder}
        order={scheduleModalOrder}
        onClose={() => setScheduleModalOrder(null)}
      />
    )}

    <Modal
      visible={!!declineOrder}
      transparent
      animationType="fade"
      onRequestClose={closeDeclineModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Patient Declined</Text>
          <Text style={styles.modalSubtitle}>
            Select why the patient declined this treatment. This is recorded for analysis;
            the recommendation history is kept.
          </Text>

          {DECLINE_REASONS.map((r) => {
            const selected = declineReasonCode === r.code;
            return (
              <TouchableOpacity
                key={r.code}
                style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                onPress={() => setDeclineReasonCode(r.code)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected ? colors.primary.main : colors.text.secondary}
                />
                <Text style={styles.reasonLabel}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}

          {declineReasonCode === 'other' && (
            <TextInput
              style={styles.reasonInput}
              placeholder="Add a brief reason"
              placeholderTextColor={colors.text.disabled}
              value={declineReasonText}
              onChangeText={setDeclineReasonText}
              multiline
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeDeclineModal} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Keep Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                (!declineReasonCode || (declineReasonCode === 'other' && !declineReasonText.trim())) &&
                  styles.disabledBtn,
              ]}
              onPress={confirmDecline}
              disabled={!declineReasonCode || (declineReasonCode === 'other' && !declineReasonText.trim())}
              activeOpacity={0.7}
            >
              <Text style={styles.modalConfirmText}>Confirm Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Phase 4 (R4) · T-D.1 (ADR-R4-01) — Scheduling On Hold / Extend Hold.
        Same modal for both actions; confirmHold decides which mutation to
        call based on the order's current scheduling_status. */}
    <Modal
      visible={!!holdOrder}
      transparent
      animationType="fade"
      onRequestClose={closeHoldModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {holdOrder?.scheduling_status === 'ON_HOLD' ? 'Extend Hold' : 'Place On Hold'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {holdOrder?.scheduling_status === 'ON_HOLD'
              ? 'Extend the scheduling pause for this treatment plan.'
              : 'Pause scheduling for this treatment plan temporarily. Admin can still Schedule or record a Decline at any time before the hold expires.'}
          </Text>

          {HOLD_DURATION_PRESETS.map((preset) => {
            const selected = holdDurationDays === preset.days;
            return (
              <TouchableOpacity
                key={preset.days}
                style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                onPress={() => setHoldDurationDays(preset.days)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selected ? colors.primary.main : colors.text.secondary}
                />
                <Text style={styles.reasonLabel}>{preset.label}</Text>
              </TouchableOpacity>
            );
          })}

          {holdOrder?.scheduling_status !== 'ON_HOLD' && (
            <TextInput
              style={styles.reasonInput}
              placeholder="Optional notes (e.g. why the hold was placed)"
              placeholderTextColor={colors.text.disabled}
              value={holdNotesText}
              onChangeText={setHoldNotesText}
              multiline
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeHoldModal} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, isSubmittingHold && styles.disabledBtn]}
              onPress={confirmHold}
              disabled={isSubmittingHold}
              activeOpacity={0.7}
            >
              {isSubmittingHold ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Text style={styles.modalConfirmText}>
                  {holdOrder?.scheduling_status === 'ON_HOLD' ? 'Extend Hold' : 'Confirm Hold'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: { ...typography.h6, color: colors.text.primary },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  filterChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  filterChipText: { ...typography.caption, color: colors.text.secondary },
  filterChipTextActive: { color: colors.common.white, fontWeight: '600' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientName: { ...typography.subtitle1, color: colors.text.primary, fontWeight: '700' },
  cardTopRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaDot: { color: colors.text.disabled, fontSize: 12 },
  cardMeta: { ...typography.caption, color: colors.text.secondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.grey[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { ...typography.caption, color: colors.text.secondary, minWidth: 80 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  scheduleBtnText: { ...typography.caption, color: colors.common.white, fontWeight: '600' },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error.main + '12',
    borderColor: colors.error.main + '35',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  declineBtnText: { ...typography.caption, color: colors.error.main, fontWeight: '600' },
  disabledBtn: { opacity: 0.55 },
  holdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.text.secondary + '12',
    borderColor: colors.text.secondary + '35',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  holdBtnText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  sendScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { ...typography.caption, color: colors.primary.main, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.subtitle1, color: colors.text.primary },
  emptyMessage: { ...typography.body2, color: colors.text.secondary, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.body2, color: colors.text.secondary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.error.main + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error.main + '40',
  },
  errorText: { ...typography.body2, color: colors.error.main, flex: 1 },
  retryText: { ...typography.body2, color: colors.primary.main, fontWeight: '600' },
  // ── Decline reason modal ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  modalTitle: { ...typography.h6, color: colors.text.primary },
  modalSubtitle: { ...typography.body2, color: colors.text.secondary, marginBottom: spacing.xs },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  reasonRowSelected: { borderColor: colors.primary.main, backgroundColor: colors.primary.main + '10' },
  reasonLabel: { ...typography.body2, color: colors.text.primary, flex: 1 },
  reasonInput: {
    ...typography.body2,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 64,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  modalCancelText: { ...typography.button, color: colors.text.secondary },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.error.main,
    alignItems: 'center',
  },
  modalConfirmText: { ...typography.button, color: colors.common.white },
});
