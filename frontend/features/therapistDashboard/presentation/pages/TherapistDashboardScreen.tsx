/**
 * TherapistDashboardScreen
 *
 * Uses the dedicated therapist sessions endpoint (getTherapistSessionsApi)
 * which returns only this therapist's sessions, filtered by date.
 * Each session carries row_id directly — no secondary lookup needed.
 *
 * Requirements: 1.1–1.5, 2.1, 3.1, 3.3, 3.4, 4.1, 4.3, 4.5,
 *               5.1–5.5, 6.1, 6.2, 6.6, 9.1, 10.1, 11.1, 12.6
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

import { useAuth } from '../../../auth/presentation/hooks/useAuth';

// Data layer
import {
  useTherapistSessionsQuery,
  useSheetRowUsablesQuery,
  useCompleteSheetRowMutation,
  useRecordSessionNonExecutionMutation,
  staffDashboardsKeys,
} from '../../../staffDashboards/data/repositories/staffDashboards.repository.impl';
import {
  TherapistSessionItemV2,
  RecordSessionNonExecutionRequest,
  RecordSessionNonExecutionResponse,
} from '../../../staffDashboards/data/models/staffDashboards.dtos';
import { SessionNonExecutionModal } from '../components/SessionNonExecutionModal';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useUpdateAppointmentStatusMutation } from '../../../appointments/data/repositories/appointments.repository.impl';
import {
  useStartSessionMutation,
  useTreatmentOrderOnDemand,
} from '../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';

// Domain / use cases
import { useGetTherapistDashboard } from '../../domain/usecases/get-therapist-dashboard.usecase';

// Presentation components
import { TherapistDashboardSummary } from '../components/TherapistDashboardSummary';
import { TreatmentSessionCompleteModal } from '../components/TreatmentSessionCompleteModal';
import { TherapistKpiSection } from '../components/TherapistKpiSection';
import { LeaveSection } from '../components/LeaveSection';
import { HrSection } from '../components/HrSection';
import { AppointmentRow } from '../../../appointments/presentation/components/AppointmentRow';
import { AppointmentResponse } from '../../../appointments/data/models/appointments.dtos';

import { DateStrip } from '../../../../core/components/DateStrip';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useTherapistDashboardDate } from '../../../staffDashboards/presentation/hooks/useDashboardDate';
import { therapistKeys } from '../../../staffDashboards/data/repositories/staffDashboards.repository.impl';

// Leave / HR data
import {
  useTherapistLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useCancelLeaveRequestMutation,
} from '../../data/repositories/therapistDashboard.repository.impl';
import { getPendingLeaveCount } from '../../domain/entities/therapistDashboard.entity';
import { StaffLeaveCreate } from '../../data/models/therapistDashboard.dtos';

// ============================================
// HELPERS
// ============================================

/**
 * Map a TherapistSessionItemV2 to the AppointmentResponse shape
 * expected by AppointmentRow.
 *
 * scheduled_time / scheduled_end_time: full ISO strings with timezone offset.
 *   Passed directly as appointment_start/end — formatTime() handles UTC conversion.
 * all_therapist_names: all assigned therapists joined with ", " for display.
 */
function sessionToAppointment(
  session: TherapistSessionItemV2,
  tenantId: string
): AppointmentResponse {
  // Build a valid ISO datetime from "HH:MM:SS" + session_date, or pass through full ISO.
  const buildIso = (timeField: string | null): string | null => {
    if (!timeField) return null;
    const isFullIso = timeField.includes('T') || timeField.includes('+');
    if (isFullIso) return timeField;
    const dateBase = session.session_date ?? new Date().toISOString().split('T')[0];
    return `${dateBase}T${timeField}`;
  };

  const appointmentStart = buildIso(session.scheduled_time) ?? session.session_date ?? new Date().toISOString();
  const appointmentEnd = buildIso(session.scheduled_end_time);

  const cardId = session.row_id ?? session.appointment_id ?? '';

  // Build display name: all assigned therapists, falling back to the logged-in one
  const staffDisplayName =
    session.all_therapist_names && session.all_therapist_names.length > 0
      ? session.all_therapist_names.join(', ')
      : (session.therapist_name ?? undefined);

  return {
    id: cardId,
    tenant_id: tenantId,
    client_id: '',
    doctor_id: null,
    therapist_ids: [],
    room_id: session.room_id ?? null,
    treatment_id: null,
    appointment_start: appointmentStart,
    appointment_end: appointmentEnd,
    status: session.status ?? 'scheduled',
    notes: session.instructions ?? null,
    is_active: true,
    created_at: '',
    appointment_type: null,
    series_id: null,
    client_name: session.client_name ?? undefined,
    treatment_name: session.treatment_name ?? undefined,
    room_name: session.room_name ?? undefined,
    staff_name: staffDisplayName,
  } as AppointmentResponse & { staff_name?: string };
}

const getSessionStartDate = (session: TherapistSessionItemV2): Date | null => {
  const value = session.scheduled_time ?? session.session_time ?? session.session_date;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSessionStartDue = (session: TherapistSessionItemV2): boolean => {
  const startDate = getSessionStartDate(session);
  return !startDate || new Date() >= startDate;
};

const isSessionInProgress = (session?: TherapistSessionItemV2 | null): boolean =>
  session?.status?.toLowerCase() === 'in_progress';

/**
 * A Session may have its non-execution recorded whenever it has not already
 * completed. Mirrors the one server-verified restriction (a COMPLETED row
 * rejects non-execution) — no additional client-invented state machine.
 */
const canRecordNonExecution = (session: TherapistSessionItemV2): boolean =>
  session.status?.toLowerCase() !== 'completed';

// ============================================
// COMPONENT
// ============================================

export const TherapistDashboardScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuth();

  // ── Auth context ──────────────────────────────────────────────────────────
  const tenantId: string = currentUser?.tenantId ?? '';
  const staffId: string = currentUser?.userId ?? '';
  const displayName: string = currentUser?.fullName ?? '';
  const userRole: string = (currentUser?.roles?.[0] ?? '').toLowerCase();

  // ── RBAC guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    if (userRole === 'therapist') return;

    if (userRole === 'doctor') {
      router.replace('/doctor');
    } else if (
      userRole === 'clinic admin' ||
      userRole === 'clinic_admin' ||
      userRole === 'receptionist' ||
      userRole === 'tenant admin' ||
      userRole === 'tenant_admin'
    ) {
      router.replace('/clinic-admin');
    } else if (currentUser.isOrgAdmin) {
      router.replace('/super-admin');
    } else {
      router.replace('/');
    }
  }, [currentUser, userRole, router]);

  // ── Completion flow state ─────────────────────────────────────────────────
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [usablesError, setUsablesError] = useState<string | null>(null);
  const [expandedInstructionIds, setExpandedInstructionIds] = useState<Record<string, boolean>>({});

  // ── Date selection ────────────────────────────────────────────────────────
  const {
    selectedDate: therapistSelectedDate,
    setSelectedDate: setTherapistSelectedDate,
    selectedDateStr,
    isToday,
  } = useTherapistDashboardDate();

  // ── Dashboard summary ─────────────────────────────────────────────────────
  // Only used for averageRating — all session counts are derived from sessionsData below.
  const {
    data: dashboardData,
    isError: isDashboardError,
  } = useGetTherapistDashboard(tenantId, displayName);

  // ── Sessions list — dedicated therapist endpoint, filtered by date ─────────
  // This endpoint returns ONLY this therapist's sessions (server-side filtered).
  // Each item has row_id directly — no secondary lookup needed.
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
  } = useTherapistSessionsQuery(
    tenantId,
    { date: selectedDateStr },
    { enabled: !!tenantId }
  );

  // Derive summary stats from sessions — no extra network call needed
  const sessionItems = sessionsData?.items ?? [];
  const totalSessions = sessionsData?.total ?? sessionItems.length;
  const completedSessions = sessionItems.filter((s) => s.status === 'completed').length;
  const pendingSessions = sessionItems.filter(
    (s) => s.status === 'scheduled' || s.status === 'in_progress'
  ).length;

  // ── Usables fetch (fetches when a row is selected, modal opens immediately) ─
  const {
    data: usablesData,
  } = useSheetRowUsablesQuery(tenantId, selectedRowId, {
    enabled: !!tenantId && !!selectedRowId,
  });

  // ── Completion mutation (multi-day: sheet row) ────────────────────────────
  const {
    mutate: completeRow,
    submitStatus,
    errorMessage: completionError,
    reset: resetCompletion,
  } = useCompleteSheetRowMutation(tenantId);

  // ── Completion mutation (single-day: appointment status) ──────────────────
  const updateStatusMutation = useUpdateAppointmentStatusMutation();

  // ── Start session mutation (multi-day: SCHEDULED → IN_PROGRESS) ───────────
  const startSession = useStartSessionMutation(tenantId);
  const fetchTreatmentOrder = useTreatmentOrderOnDemand();
  // Track which row is being started (to show per-card loading)
  const [startingRowId, setStartingRowId] = useState<string | null>(null);
  // Cache for order versions: sheetId → version
  const [orderVersionCache, setOrderVersionCache] = useState<Record<string, number>>({});

  // ── Non-execution flow (T-FE-E.3, T-BE-E.4a) ──────────────────────────────
  const { t } = useTranslation();
  const [nonExecutionRowId, setNonExecutionRowId] = useState<string | null>(null);
  const [nonExecutionSheetId, setNonExecutionSheetId] = useState<string | undefined>(undefined);
  const [nonExecutionModalOpen, setNonExecutionModalOpen] = useState(false);
  // Transient results, keyed by row_id — see RecordSessionNonExecutionResponse
  // docstring for why this cannot be durably re-displayed after a refetch.
  const [nonExecutionResults, setNonExecutionResults] = useState<
    Record<string, RecordSessionNonExecutionResponse>
  >({});
  const nonExecutionMutation = useRecordSessionNonExecutionMutation(tenantId);

  const prevSubmitStatusRef = React.useRef<string>('idle');
  useEffect(() => {
    if (submitStatus === 'conflict') {
      setCompletionModalOpen(false);
      setSelectedRowId(null);
      setSelectedAppointmentId(null);
      resetCompletion();
    } else if (submitStatus === 'idle' && prevSubmitStatusRef.current === 'completing') {
      // Success: mutation went completing → idle, close the modal
      setCompletionModalOpen(false);
      setSelectedRowId(null);
      setSelectedAppointmentId(null);
    }
    prevSubmitStatusRef.current = submitStatus;
  }, [submitStatus, resetCompletion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leave ─────────────────────────────────────────────────────────────────
  const [openLeaveModal, setOpenLeaveModal] = useState(false);
  const {
    data: leaveData,
    isLoading: isLeaveLoading,
  } = useTherapistLeaveRequestsQuery(tenantId, staffId, undefined, {
    enabled: !!tenantId && !!staffId,
  });

  const createLeaveMutation = useCreateLeaveRequestMutation(tenantId, staffId);
  const cancelLeaveMutation = useCancelLeaveRequestMutation(tenantId, staffId);

  const leaves = leaveData?.items ?? [];
  const pendingLeaveCount = getPendingLeaveCount(leaves);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffDashboardsKeys.therapist(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ['staffDashboards', 'therapist', 'kpis', tenantId],
          exact: false,
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, tenantId]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  }, [logout]);

  const toggleInstructions = useCallback((cardId: string) => {
    setExpandedInstructionIds((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  }, []);

  /** Shared helper — invalidates sessions + KPIs after any completion */
  const invalidateAfterCompletion = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['staffDashboards', 'therapist', 'sessions', tenantId],
      exact: false,
    });
    queryClient.invalidateQueries({
      queryKey: staffDashboardsKeys.therapist(tenantId),
    });
    queryClient.invalidateQueries({
      queryKey: ['staffDashboards', 'therapist', 'kpis', tenantId],
      exact: false,
    });
  }, [queryClient, tenantId]);

  /**
   * Called by AppointmentRow's onComplete(cardId).
   * cardId = row_id (multi-day) or appointment_id (single-day).
   * - Multi-day: opens materials modal → completeSheetRowApi
   * - Single-day: shows confirmation → updateAppointmentStatusApi
   */
  const handleAppointmentComplete = useCallback(
    (cardId: string) => {
      const session = (sessionsData?.items ?? []).find(
        (s) => (s.row_id ?? s.appointment_id) === cardId
      );

      if (!isSessionInProgress(session)) {
        Alert.alert('Start Required', 'Please start the therapy session before completing it.');
        return;
      }

      setUsablesError(null);
      setSelectedRowId(session?.row_id ?? null);
      setSelectedAppointmentId(session?.appointment_id ?? null);
      setCompletionModalOpen(true);
    },
    [sessionsData?.items]
  );

  const handleModalClose = useCallback(() => {
    setCompletionModalOpen(false);
    setSelectedRowId(null);
    setSelectedAppointmentId(null);
    resetCompletion();
  }, [resetCompletion]);

  const handleOpenNonExecution = useCallback((session: TherapistSessionItemV2) => {
    if (!session.row_id) return;
    setNonExecutionRowId(session.row_id);
    setNonExecutionSheetId(session.treatment_sheet_id ?? undefined);
    setNonExecutionModalOpen(true);
  }, []);

  const handleNonExecutionClose = useCallback(() => {
    setNonExecutionModalOpen(false);
    setNonExecutionRowId(null);
    setNonExecutionSheetId(undefined);
    nonExecutionMutation.reset();
  }, [nonExecutionMutation]);

  const handleNonExecutionSubmit = useCallback(
    (payload: RecordSessionNonExecutionRequest) => {
      if (!nonExecutionRowId) return;
      nonExecutionMutation.mutate({ rowId: nonExecutionRowId, payload, sheetId: nonExecutionSheetId });
    },
    [nonExecutionMutation, nonExecutionRowId, nonExecutionSheetId]
  );

  // On success, record the transient result for the composed-label display
  // and close the modal. On error the modal stays open (errorMessage shown).
  const prevNonExecutionStatusRef = React.useRef<string>('idle');
  useEffect(() => {
    if (
      nonExecutionMutation.submitStatus === 'idle' &&
      prevNonExecutionStatusRef.current === 'submitting' &&
      nonExecutionMutation.lastResult &&
      nonExecutionRowId
    ) {
      setNonExecutionResults((prev) => ({
        ...prev,
        [nonExecutionRowId]: nonExecutionMutation.lastResult as RecordSessionNonExecutionResponse,
      }));
      setNonExecutionModalOpen(false);
      setNonExecutionRowId(null);
      setNonExecutionSheetId(undefined);
    }
    prevNonExecutionStatusRef.current = nonExecutionMutation.submitStatus;
  }, [nonExecutionMutation.submitStatus, nonExecutionMutation.lastResult, nonExecutionRowId]);

  /**
   * Start a multi-day session row (SCHEDULED → IN_PROGRESS).
   * Fetches the order version on demand if not cached, then calls startSheetRowApi.
   */
  const handleStartSession = useCallback(
    async (session: TherapistSessionItemV2) => {
      if (!isSessionStartDue(session)) {
        Alert.alert('Not Yet Available', 'This therapy can be started only at or after the scheduled start time.');
        return;
      }

      if (!session.row_id || !session.treatment_sheet_id) {
        if (session.appointment_id) {
          updateStatusMutation.mutate(
            { appointmentId: session.appointment_id, status: 'IN_PROGRESS' },
            {
              onSuccess: invalidateAfterCompletion,
              onError: (err: any) => {
                Alert.alert('Error', err?.message || 'Failed to start session.');
              },
            }
          );
        }
        return;
      }
      const sheetId = session.treatment_sheet_id;
      const rowId = session.row_id;

      setStartingRowId(rowId);
      startSession.reset();

      try {
        let version = orderVersionCache[sheetId];
        if (!version) {
          const order = await fetchTreatmentOrder(sheetId, tenantId);
          version = order.version;
          setOrderVersionCache((prev) => ({ ...prev, [sheetId]: version }));
        }
        startSession.mutate({ sheetId, rowId, version });
      } catch {
        Alert.alert('Error', 'Could not fetch session details. Please try again.');
      } finally {
        setStartingRowId(null);
      }
    },
    [startSession, orderVersionCache, tenantId, fetchTreatmentOrder, updateStatusMutation, invalidateAfterCompletion]
  );

  // React to start session status changes
  useEffect(() => {
    if (startSession.status === 'success') {
      setOrderVersionCache({});
      startSession.reset();
    } else if (startSession.status === 'conflict') {
      Alert.alert('Session Updated', startSession.errorMessage ?? 'This session was updated elsewhere. Refreshing…');
      setOrderVersionCache({});
      startSession.reset();
    } else if (startSession.status === 'error' && startSession.errorMessage) {
      Alert.alert('Error', startSession.errorMessage);
      startSession.reset();
    }
  }, [startSession.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModalSubmit = useCallback(
    async (payload: Parameters<typeof completeRow>[0]['payload']) => {
      if (selectedRowId) {
        // Multi-day: complete the sheet row (records materials server-side)
        // Find the session to get treatment_sheet_id for order invalidation
        const session = (sessionsData?.items ?? []).find((s) => s.row_id === selectedRowId);
        completeRow({ rowId: selectedRowId, payload, sheetId: session?.treatment_sheet_id ?? undefined });
      } else if (selectedAppointmentId) {
        // Single-day: mark appointment completed
        updateStatusMutation.mutate(
          { appointmentId: selectedAppointmentId, status: 'COMPLETED' },
          {
            onSuccess: () => {
              setCompletionModalOpen(false);
              setSelectedAppointmentId(null);
              invalidateAfterCompletion();
            },
            onError: (err: any) => {
              Alert.alert('Error', err?.message || 'Failed to complete session.');
            },
          }
        );
      }
    },
    [completeRow, selectedRowId, selectedAppointmentId, updateStatusMutation, invalidateAfterCompletion]
  );

  const handleApplyLeave = useCallback(
    async (payload: StaffLeaveCreate) => {
      await createLeaveMutation.mutateAsync(payload);
    },
    [createLeaveMutation]
  );

  const handleCancelLeave = useCallback(
    async (leaveId: string) => {
      try {
        await cancelLeaveMutation.mutateAsync(leaveId);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to cancel leave request');
      }
    },
    [cancelLeaveMutation]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const initialMaterials = useMemo(() => usablesData?.items ?? [], [usablesData?.items]);

  const modalSubmitStatus: 'idle' | 'completing' | 'error' =
    submitStatus === 'completing'
      ? 'completing'
      : submitStatus === 'error' || submitStatus === 'partial_error'
      ? 'error'
      : 'idle';

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centeredFull}>
          <ActivityIndicator size="large" color={colors.primary.main} accessibilityLabel="Loading dashboard" />
        </View>
      </SafeAreaView>
    );
  }

  if (isDashboardError) {
    // Non-fatal — summary stats are derived from sessions, so just log and continue
    console.warn('[TherapistDashboard] Dashboard endpoint error — using session-derived stats');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Therapist Dashboard"
        subtitle={`Welcome, ${displayName}`}
        onNotificationPress={() => router.push('/notifications' as any)}
        onProfilePress={() => router.push('/profile' as any)}
        onLogoutPress={handleLogout}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Dashboard Summary */}
        <TherapistDashboardSummary
          displayName={displayName}
          totalSessions={totalSessions}
          completedSessions={completedSessions}
          pendingSessions={pendingSessions}
          averageRating={dashboardData?.averageRating ?? null}
          isLoading={isSessionsLoading}
        />

        {/* Usables error banner */}
        {usablesError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{usablesError}</Text>
          </View>
        ) : null}

        {/* Date strip */}
        <View style={styles.dateStripSection}>
          <DateStrip
            selectedDate={therapistSelectedDate}
            onDateChange={setTherapistSelectedDate}
          />
        </View>

        {/* Sessions list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isToday
              ? "Today's Sessions"
              : `Sessions — ${therapistSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </Text>

          {isSessionsLoading ? (
            <View style={styles.centeredSection}>
              <ActivityIndicator size="small" color={colors.primary.main} accessibilityLabel="Loading sessions" />
            </View>
          ) : (sessionsData?.items ?? []).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {isToday
                  ? 'No sessions scheduled for today.'
                  : `No sessions on ${therapistSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
              </Text>
            </View>
          ) : (
            (sessionsData?.items ?? []).map((session) => {
              const cardId = session.row_id ?? session.appointment_id ?? session.id ?? '';
              const hasInstructions = Boolean(
                session.room_name ||
                session.treatment_description ||
                session.medicines_given ||
                session.instructions
              );
              const isInstructionsExpanded = Boolean(expandedInstructionIds[cardId]);
              const nonExecutionResult = session.row_id ? nonExecutionResults[session.row_id] : undefined;
              const canStart =
                ['pending', 'scheduled', 'confirmed'].includes(session.status?.toLowerCase() ?? '') &&
                isSessionStartDue(session) &&
                !session.started_at &&
                !nonExecutionResult;
              const isStarting = startingRowId === session.row_id;
              const showNonExecutionAction =
                !!session.row_id && canRecordNonExecution(session) && !nonExecutionResult;

              return (
                <View key={cardId} style={styles.sessionCardBlock}>
                  <AppointmentRow
                    variant="full"
                    appointment={sessionToAppointment(session, tenantId)}
                    onPress={undefined}
                    showActions={true}
                    userRole="therapist"
                    onComplete={handleAppointmentComplete}
                  />
                  {hasInstructions && (
                    <TouchableOpacity
                      style={[
                        styles.instructionsToggle,
                        isInstructionsExpanded && styles.instructionsToggleExpanded,
                      ]}
                      onPress={() => toggleInstructions(cardId)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={isInstructionsExpanded ? 'Hide treatment instructions' : 'Show treatment instructions'}
                      accessibilityState={{ expanded: isInstructionsExpanded }}
                    >
                      <View style={styles.instructionsToggleLabel}>
                        <Ionicons name="clipboard-outline" size={15} color={colors.text.secondary} />
                        <Text style={styles.instructionsToggleText}>Treatment Instructions</Text>
                      </View>
                      <Ionicons
                        name={isInstructionsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.text.secondary}
                      />
                    </TouchableOpacity>
                  )}
                  {hasInstructions && isInstructionsExpanded && (
                    <View style={styles.instructionsPanel}>
                      {session.room_name && (
                        <View style={styles.instructionsLine}>
                          <Ionicons name="business-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.instructionsText} numberOfLines={1}>{session.room_name}</Text>
                        </View>
                      )}
                      {session.treatment_description && (
                        <View style={styles.instructionsLine}>
                          <Ionicons name="medical-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.instructionsText}>{session.treatment_description}</Text>
                        </View>
                      )}
                      {session.medicines_given && (
                        <View style={styles.instructionsLine}>
                          <Ionicons name="flask-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.instructionsText}>{session.medicines_given}</Text>
                        </View>
                      )}
                      {session.instructions && (
                        <View style={styles.instructionsLine}>
                          <Ionicons name="clipboard-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.instructionsText}>{session.instructions}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {canStart && (
                    <TouchableOpacity
                      style={styles.startSessionBtn}
                      onPress={() => handleStartSession(session)}
                      disabled={isStarting || startSession.status === 'starting'}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Start session"
                    >
                      {isStarting || startSession.status === 'starting' ? (
                        <ActivityIndicator size="small" color={colors.common.white} />
                      ) : (
                        <>
                          <Ionicons name="play-circle-outline" size={16} color={colors.common.white} />
                          <Text style={styles.startSessionBtnText}>Start Session</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {showNonExecutionAction && (
                    <TouchableOpacity
                      style={styles.nonExecutionBtn}
                      onPress={() => handleOpenNonExecution(session)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('therapistExecution.recordNonExecution')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.text.secondary} />
                      <Text style={styles.nonExecutionBtnText}>
                        {t('therapistExecution.recordNonExecution')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {nonExecutionResult && (
                    <View style={styles.nonExecutionResultPanel} accessibilityRole="summary">
                      <Text style={styles.nonExecutionResultLine}>
                        {session.status ?? ''}
                      </Text>
                      <Text style={styles.nonExecutionResultLine}>
                        {t('therapistExecution.executionDidNotOccur')}
                      </Text>
                      <Text style={styles.nonExecutionResultLine}>
                        {nonExecutionResult.non_execution_reason_code
                          ? t(`therapistExecution.reasonCodes.${nonExecutionResult.non_execution_reason_code}`)
                          : ''}
                        {nonExecutionResult.non_execution_reason_text
                          ? ` — ${nonExecutionResult.non_execution_reason_text}`
                          : ''}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* KPI Section */}
        <View style={styles.section}>
          <TherapistKpiSection tenantId={tenantId} staffId={staffId} isLoading={false} />
        </View>

        {/* Leave Section */}
        <View style={styles.section}>
          <LeaveSection
            leaves={leaves}
            pendingCount={pendingLeaveCount}
            isLoading={isLeaveLoading}
            onApplyLeave={handleApplyLeave}
            onCancelLeave={handleCancelLeave}
            isSubmitting={createLeaveMutation.isPending}
            externalOpen={openLeaveModal}
            onExternalOpenHandled={() => setOpenLeaveModal(false)}
          />
        </View>

        {/* HR Section */}
        <View style={styles.section}>
          <HrSection
            onLeavePress={() => setOpenLeaveModal(true)}
            onDocumentsPress={() => Alert.alert('Not Available', 'Document management is not available in this environment.')}
            onBankDetailsPress={() => Alert.alert('Not Available', 'Bank details management is not available in this environment.')}
            onPayslipsPress={() => Alert.alert('Not Available', 'Salary slips are not available in this environment.')}
          />
        </View>
      </ScrollView>

      {/* Completion Modal */}
      {completionModalOpen ? (
        <TreatmentSessionCompleteModal
          visible={completionModalOpen}
          rowId={selectedRowId}
          initialMaterials={initialMaterials}
          onSubmit={handleModalSubmit}
          onClose={handleModalClose}
          isSubmitting={submitStatus === 'completing' || updateStatusMutation.isPending}
          submitStatus={modalSubmitStatus}
          errorMessage={completionError}
        />
      ) : null}

      {/* Non-execution Modal */}
      {nonExecutionModalOpen ? (
        <SessionNonExecutionModal
          visible={nonExecutionModalOpen}
          onSubmit={handleNonExecutionSubmit}
          onClose={handleNonExecutionClose}
          isSubmitting={nonExecutionMutation.submitStatus === 'submitting'}
          errorMessage={nonExecutionMutation.errorMessage}
        />
      ) : null}
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centeredFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centeredSection: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  accessDeniedTitle: {
    ...typography.h5,
    color: colors.error.main,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  backButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.error.main + '15',
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error.main + '40',
  },
  errorBannerText: {
    ...typography.body2,
    color: colors.error.main,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  sessionCardBlock: {
    marginBottom: spacing.md,
  },
  startSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
  },
  startSessionBtnText: {
    ...typography.button,
    color: colors.common.white,
    fontSize: 13,
  },
  nonExecutionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginHorizontal: spacing.md,
    minHeight: 44,
  },
  nonExecutionBtnText: {
    ...typography.button,
    color: colors.text.secondary,
    fontSize: 13,
  },
  nonExecutionResultPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.sm,
    gap: 2,
  },
  nonExecutionResultLine: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  instructionsToggle: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border.light,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.background.paper,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instructionsToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  instructionsToggleText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  instructionsToggleExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  instructionsPanel: {
    marginHorizontal: spacing.md,
    marginTop: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border.light,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.background.paper,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  instructionsLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  instructionsText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
  },
  dateStripSection: {
    marginTop: spacing.md,
  },
});

export default TherapistDashboardScreen;
