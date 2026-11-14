/**
 * Phase 1 · T-C.1 — Unified appointment-row presentation component.
 *
 * Per ADR-P1-03 (.kiro/specs/phase-1-clinical-platform-trust/design.md §4.C):
 * one presentational component, parameterized by `variant` (+ role),
 * reproducing the current surface's visible behavior EXACTLY. This file does
 * not change any behavior — it is a behavior-preserving port of
 * `features/appointments/presentation/components/AppointmentListItem.tsx`
 * (role-branched Appointments list card), now the sole `variant="full"`.
 *
 * Owner (design §8): Appointment module (`features/appointments`).
 *
 * T-C.2 migrated all 3 production consumers (`app/doctor.tsx`,
 * `AppointmentsListScreen.tsx`, `TherapistDashboardScreen.tsx`) to this
 * component and deleted both original duplicate files.
 *
 * T-C.4 (FR-B4/AC-6, verified-dead-code removal): this file originally also
 * ported a `variant="minimal"` branch from
 * `features/staffDashboards/presentation/components/AppointmentListItem.tsx`.
 * T-C.2's consumer audit found that original had zero production consumers
 * even before Phase 1; no later phase claimed it either. Per explicit user
 * decision, the minimal branch (and its characterization tests) was removed
 * as verified-dead code rather than kept as untested-in-production surface
 * area. `variant: 'full'` remains a required, explicit prop for API clarity
 * even though it is now the only value.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useFeatures, hasMultiDayAppointments } from '../../../../core/hooks/useFeatures';
import { AppointmentResponse } from '../../data/models/appointments.dtos';
import { getStatusLabel, getStatusColor, getStaffName } from '../../domain/helpers';
import { formatTime, formatDate } from '../../../../core/utils/dateTimeUtils';
import { useTreatmentSheetDetailQuery } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { appointmentActionAccess } from '../../domain/appointmentActionAccess';
import { consultationActionKey } from '../../domain/consultationAction';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';

// ============================================================================
// FULL VARIANT — port of appointments/.../AppointmentListItem.tsx
// ============================================================================

interface FullAppointmentRowProps {
  appointment: AppointmentResponse;
  onPress?: (appointment: AppointmentResponse) => void;
  userRole?: string;
  /** The user's effective permissions. When given, front-desk actions follow them instead of the role name. */
  permissions?: readonly string[];
  showActions?: boolean;
  onStatusUpdate?: (appointmentId: string, newStatus: string) => void;
  onCancel?: (appointmentId: string) => void;
  onReschedule?: (appointmentId: string) => void;
  onLinkEpisode?: (appointmentId: string, clientId: string) => void;
  onCreateEpisode?: (appointmentId: string, clientId: string) => void;
  onViewEpisode?: (episodeId: string) => void;
  onViewAllEpisodes?: (clientId: string, clientName: string) => void;
  clientEpisodesCount?: number;
  onComplete?: (appointmentId: string) => void;
  onStartConsultation?: (appointmentId: string, clientId: string) => void;
  isStartingConsultation?: boolean;
}

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <View
      style={[fullStyles.statusBadge, { backgroundColor: statusColor + '15' }]}
      accessibilityLabel={`Status: ${statusLabel}`}
    >
      <View style={[fullStyles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={[fullStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
    </View>
  );
};

interface QuickActionIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor?: string;
  onPress: () => void;
  testId: string;
  disabled?: boolean;
}

const QuickActionIconButton: React.FC<QuickActionIconButtonProps> = ({
  icon,
  label,
  color,
  backgroundColor,
  onPress,
  testId,
  disabled = false,
}) => (
  <TouchableOpacity
    style={[
      fullStyles.quickActionIconBtn,
      { backgroundColor: backgroundColor || color + '12', borderColor: color + '30' },
      disabled && fullStyles.quickActionIconBtnDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={label}
    accessibilityHint={disabled ? 'Available at appointment start time' : `Tap to ${label.toLowerCase()}`}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    data-testid={testId}
  >
    <Ionicons name={icon} size={20} color={disabled ? colors.grey[400] : color} />
    <Text style={[fullStyles.quickActionTooltip, { color: disabled ? colors.grey[400] : color }]} numberOfLines={2}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface CompleteTickIconProps {
  onPress: () => void;
  disabled?: boolean;
}

const CompleteTickIcon: React.FC<CompleteTickIconProps> = ({ onPress, disabled }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchableOpacity
      style={[
        fullStyles.completeTickButton,
        isPressed && fullStyles.completeTickButtonPressed,
        disabled && fullStyles.completeTickButtonDisabled,
      ]}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      accessibilityLabel="Mark as Complete"
      accessibilityHint="Tap to mark this appointment as completed"
      accessibilityRole="button"
      data-testid="action-complete-tick"
    >
      <Ionicons name="checkmark-circle" size={28} color={isPressed ? colors.success.main : colors.success.main} />
    </TouchableOpacity>
  );
};

const FullAppointmentRow: React.FC<FullAppointmentRowProps> = ({
  appointment,
  onPress,
  userRole = 'clinic_admin',
  permissions,
  showActions = true,
  onStatusUpdate,
  onCancel,
  onReschedule,
  onLinkEpisode,
  onCreateEpisode,
  onViewEpisode,
  onViewAllEpisodes,
  clientEpisodesCount = 0,
  onComplete,
  onStartConsultation,
  isStartingConsultation = false,
}) => {
  // Debug logging for episode information
  React.useEffect(() => {
    if (userRole === 'doctor') {
      console.log('[AppointmentRow] Episode info:', {
        appointmentId: appointment.id,
        clientId: appointment.client_id,
        clientName: appointment.client_name,
        episodeId: appointment.episode_id,
        episodeTitle: appointment.episode_title,
        clientEpisodesCount,
        hasEpisodeId: !!appointment.episode_id,
      });
    }
  }, [appointment.id, appointment.episode_id, appointment.client_id, clientEpisodesCount, userRole]);
  const router = useRouter();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const features = useFeatures();
  const theme = useClinicTheme();
  const { colors: themeColors, spacing: themeSpacing, typography: themeTypography } = theme;
  const onPrimaryColor = themeColors.text.onPrimary;
  const statusColor = getStatusColor(appointment.status);

  // ===== MULTI-DAY TREATMENT SUPPORT =====
  const isMultiDayEnabled = hasMultiDayAppointments(features);
  const treatmentSheetId = appointment.treatment_sheet_id;
  const sessionId = appointment.session_id;
  const isMultiDayAppointment = isMultiDayEnabled && (!!treatmentSheetId || !!sessionId);

  const { data: treatmentSheet, isLoading: isLoadingSheet } = useTreatmentSheetDetailQuery(
    treatmentSheetId || '',
    currentUser?.tenantId || '',
    { enabled: !!isMultiDayAppointment && !!treatmentSheetId && !!currentUser?.tenantId }
  );

  const sessionRow = treatmentSheet?.rows?.find((row) => row.session_id === sessionId);
  const dayNumber = sessionRow?.day_number;
  const totalDays = treatmentSheet?.duration_days;
  const multiDayTreatmentName = treatmentSheet?.rows?.[0]?.treatment_description || 'Multi-Day Treatment';

  const completedDays =
    treatmentSheet?.rows?.filter((row) => {
      return row.treatment_description && row.treatment_description.trim().length > 0;
    }).length || 0;
  const progressPercentage = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;

  // ===== EXTRACT DATA FROM API RESPONSE =====
  const clientName = appointment.client_name || null;
  const treatmentName = appointment.treatment_name || null;
  const staffName = getStaffName(appointment);

  // ===== ACTION HANDLERS =====
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(appointment);
    } else {
      router.push(`/clinic-admin/appointments/${appointment.id}` as any);
    }
  }, [appointment, onPress, router]);

  // ===== RBAC CHECK =====
  const normalizedRole = (userRole || '').toLowerCase().replace(/[_\-\s]+/g, '');
  const isClinicAdmin = normalizedRole.includes('clinicadmin') || normalizedRole.includes('admin');
  const isReceptionist = normalizedRole.includes('receptionist');
  const isDoctor = normalizedRole.includes('doctor');
  const isTherapist = normalizedRole.includes('therapist');
  // The doctor card's main button follows how far the consultation has got: Start -> Continue -> Complete.
  const consultationActionLabel = t(`appointments.consultationAction.${consultationActionKey(appointment.consultation_progress)}`);
  const access = permissions ? appointmentActionAccess(permissions) : null;
  // Front-desk actions (reschedule, record visit, no-show, cancel): by permission when known, else by role name.
  const isFrontDesk = access ? !isDoctor && !isTherapist && access.canUpdate : isClinicAdmin || isReceptionist;
  const mayCancel = access ? access.canCancel : true;
  const canModify = isFrontDesk || isDoctor || isTherapist;

  // ===== STATUS-BASED ACTION VISIBILITY =====
  const status = (appointment.status || '').toLowerCase();
  const terminalStatuses = ['completed', 'cancelled', 'no_show'];
  const isTerminalStatus = terminalStatuses.includes(status);

  const canComplete = canModify && (isTherapist ? status === 'in_progress' : ['confirmed', 'in_progress'].includes(status));

  const now = new Date();
  const appointmentStartStr = appointment.appointment_start;
  const appointmentStartLocal = new Date(appointmentStartStr);
  const isAtOrAfterStartTime = now >= appointmentStartLocal;

  const canRecordVisit = canModify && ['scheduled', 'confirmed', 'in_progress'].includes(status);

  // ===== DISPLAY VALUES =====
  const displayClientName = clientName || t('common.unknownClient') || 'Unknown Client';
  const displayStaffName = staffName;
  const dateDisplay = formatDate(appointment.appointment_start);
  const timeDisplay = formatTime(appointment.appointment_start);
  const endTimeDisplay = appointment.appointment_end ? formatTime(appointment.appointment_end) : null;
  const isSeriesAppointment = appointment.series_id && appointment.session_number;

  const isTherapyAppointment = appointment.therapist_ids && appointment.therapist_ids.length > 0;
  const staffIcon = isTherapyAppointment ? 'people-outline' : 'person-circle-outline';

  return (
    <View
      style={[
        fullStyles.container,
        { borderLeftColor: statusColor },
        isTherapyAppointment && fullStyles.therapyAppointmentContainer,
      ]}
      data-testid="appointment-list-item"
    >
      {/* Main Row - Full width clickable only if onPress is provided */}
      <TouchableOpacity
        style={fullStyles.mainRow}
        onPress={onPress ? handlePress : undefined}
        activeOpacity={onPress ? 0.7 : 1}
        accessibilityRole={onPress ? 'button' : 'none'}
        accessibilityLabel={`Appointment for ${clientName} at ${timeDisplay}`}
      >
        <View style={fullStyles.content}>
          {/* Top Row: Date + Status */}
          <View style={fullStyles.topRow}>
            <View style={fullStyles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color={themeColors.primary.default} />
              <Text style={fullStyles.dateText} data-testid="appointment-date">
                {dateDisplay}
              </Text>
            </View>
            <StatusBadge status={appointment.status} />
          </View>

          {/* Time Row */}
          <View style={fullStyles.timeRow}>
            <Ionicons name="time-outline" size={14} color={themeColors.text.secondary} />
            <Text style={fullStyles.timeText} data-testid="appointment-time">
              {timeDisplay}
              {!!endTimeDisplay && <Text style={fullStyles.timeEndText}> - {endTimeDisplay}</Text>}
            </Text>
          </View>

          {/* Multi-Day Treatment Indicator */}
          {isMultiDayAppointment && (
            <View style={fullStyles.multiDayIndicator} data-testid="multi-day-indicator">
              <View style={fullStyles.multiDayBadge}>
                <View style={fullStyles.blueDot} />
                {isLoadingSheet ? (
                  <ActivityIndicator size="small" color={themeColors.primary.default} />
                ) : (
                  <>
                    <Text style={fullStyles.multiDayText} numberOfLines={1}>
                      {multiDayTreatmentName}
                    </Text>
                    {!!(dayNumber && totalDays) && (
                      <Text style={fullStyles.dayNumberText}>
                        {' '}
                        • Day {dayNumber}/{totalDays}
                      </Text>
                    )}
                  </>
                )}
              </View>
              {!isLoadingSheet && progressPercentage > 0 && (
                <View style={fullStyles.progressContainer}>
                  <View style={fullStyles.progressBar}>
                    <View style={[fullStyles.progressFill, { width: `${progressPercentage}%` }]} />
                  </View>
                  <Text style={fullStyles.progressText}>{progressPercentage}%</Text>
                </View>
              )}
            </View>
          )}

          {/* Client Info */}
          <Text style={fullStyles.clientName} numberOfLines={1} data-testid="appointment-client-name">
            {displayClientName}
          </Text>

          {/* Staff & Treatment Info */}
          <View style={fullStyles.detailsRow}>
            <View style={fullStyles.detailItem}>
              <Ionicons name={staffIcon} size={14} color={themeColors.text.secondary} />
              <Text style={fullStyles.detailText} numberOfLines={1} data-testid="appointment-staff-name">
                {displayStaffName}
              </Text>
            </View>
            {!!treatmentName && (
              <View style={fullStyles.detailItem}>
                <Ionicons name="medical-outline" size={14} color={themeColors.text.secondary} />
                <Text style={fullStyles.detailText} numberOfLines={1} data-testid="appointment-treatment">
                  {treatmentName}
                </Text>
              </View>
            )}
          </View>

          {/* Series Badge (if applicable) */}
          {!!isSeriesAppointment && (
            <View style={fullStyles.seriesBadge} data-testid="appointment-series-badge">
              <Ionicons name="repeat" size={12} color={themeColors.primary.default} />
              <Text style={fullStyles.seriesText}>
                {t('appointments.session') || 'Session'} {appointment.session_number}
                {!!appointment.total_sessions && `/${appointment.total_sessions}`}
              </Text>
            </View>
          )}
        </View>

        {/* Right side: Complete tick (for confirmed/in_progress) + Navigation arrow */}
        <View style={fullStyles.rightActionsContainer}>
          {canComplete && onStatusUpdate && (
            <CompleteTickIcon
              onPress={() => {
                Alert.alert(
                  t('appointments.markAsCompleted') || 'Mark as Completed',
                  t('appointments.confirmComplete') || 'Mark this appointment as completed?',
                  [
                    { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                    { text: t('common.yes') || 'Yes', onPress: () => onStatusUpdate(appointment.id, 'COMPLETED') },
                  ]
                );
              }}
            />
          )}

          {onPress && (
            <View style={fullStyles.navigationArrow} data-testid="appointment-nav-arrow">
              <Ionicons name="chevron-forward" size={20} color={themeColors.primary.default} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Quick Actions Row */}
      {showActions && canModify && !isTerminalStatus && !isDoctor && (
        <View style={fullStyles.quickActionsRow} data-testid="appointment-quick-actions">
          {isFrontDesk && ['scheduled', 'confirmed', 'in_progress'].includes(status) && (
            <>
              {['scheduled', 'confirmed'].includes(status) && (
                <QuickActionIconButton
                  icon="calendar-outline"
                  label="Reschedule"
                  color={themeColors.primary.default}
                  onPress={() => {
                    if (onReschedule) {
                      Alert.alert(
                        'Reschedule',
                        'Open reschedule options for this appointment?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Yes', onPress: () => onReschedule(appointment.id) },
                        ]
                      );
                    } else {
                      handlePress();
                    }
                  }}
                  testId="action-reschedule"
                />
              )}

              {canRecordVisit && onStatusUpdate && (
                <QuickActionIconButton
                  icon="clipboard-outline"
                  label="Record Visit"
                  color={themeColors.feedback.success}
                  disabled={!isAtOrAfterStartTime}
                  onPress={() => {
                    Alert.alert(
                      'Record Visit',
                      'Mark this appointment as completed?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Yes', onPress: () => onStatusUpdate(appointment.id, 'COMPLETED'), style: 'default' },
                      ]
                    );
                  }}
                  testId="action-record-visit"
                />
              )}

              {['scheduled', 'confirmed'].includes(status) && onStatusUpdate && (
                <QuickActionIconButton
                  icon="person-remove-outline"
                  label="No-Show"
                  color={themeColors.feedback.warning}
                  disabled={!isAtOrAfterStartTime}
                  onPress={() => {
                    Alert.alert(
                      'Mark as No-Show',
                      'Are you sure the patient did not show up?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Yes', onPress: () => onStatusUpdate(appointment.id, 'NO_SHOW') },
                      ]
                    );
                  }}
                  testId="action-noshow"
                />
              )}

              {['scheduled', 'confirmed'].includes(status) && onCancel && mayCancel && (
                <QuickActionIconButton
                  icon="close-circle-outline"
                  label="Cancel"
                  color={themeColors.feedback.error}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Appointment',
                      'Are you sure you want to cancel this appointment?',
                      [
                        { text: 'No', style: 'cancel' },
                        { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(appointment.id) },
                      ]
                    );
                  }}
                  testId="action-cancel"
                />
              )}

              {!!(isMultiDayAppointment && appointment.treatment_sheet_id) && (
                <QuickActionIconButton
                  icon="calendar-number-outline"
                  label="Schedule"
                  color={themeColors.feedback.info}
                  onPress={() => {
                    router.push(`/clinic-admin/treatment-sheets/${appointment.treatment_sheet_id}` as any);
                  }}
                  testId="action-schedule-treatment"
                />
              )}
            </>
          )}

          {isTherapist && ['pending', 'scheduled', 'confirmed', 'in_progress'].includes(status) && (
            <>
              {canComplete && (onComplete || onStatusUpdate) && (
                <QuickActionIconButton
                  icon="checkmark-circle-outline"
                  label="Complete"
                  color={themeColors.feedback.success}
                  onPress={() => {
                    if (onComplete) {
                      onComplete(appointment.id);
                    } else {
                      Alert.alert(
                        'Mark as Complete',
                        'Mark this appointment as completed?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Yes', onPress: () => onStatusUpdate!(appointment.id, 'COMPLETED') },
                        ]
                      );
                    }
                  }}
                  testId="action-complete"
                />
              )}
            </>
          )}
        </View>
      )}

      {/* Doctor-role: Start Consultation CTA + secondary links (non-terminal) */}
      {isDoctor && !isTerminalStatus && (
        <View style={fullStyles.doctorActionsContainer}>
          <TouchableOpacity
            style={[fullStyles.startConsultationBtn, isStartingConsultation && fullStyles.startConsultationBtnLoading]}
            onPress={() => onStartConsultation?.(appointment.id, appointment.client_id)}
            disabled={isStartingConsultation}
            accessibilityRole="button"
            accessibilityLabel={consultationActionLabel}
            testID="action-start-consultation"
          >
            {isStartingConsultation ? (
              <ActivityIndicator size="small" color={onPrimaryColor} />
            ) : (
              <Text style={[fullStyles.startConsultationText, { color: onPrimaryColor }]}>{consultationActionLabel}</Text>
            )}
          </TouchableOpacity>

          <View style={fullStyles.secondaryLinksRow}>
            <TouchableOpacity
              onPress={() => router.push(`/clinic-admin/clients/${appointment.client_id}` as any)}
              accessibilityRole="button"
              accessibilityLabel="View Patient History"
            >
              <Text style={fullStyles.secondaryLink}>View Patient History</Text>
            </TouchableOpacity>
            <Text style={fullStyles.secondaryLinkSep}>·</Text>
            <TouchableOpacity
              onPress={() => router.push(`/clinic-admin/clients/${appointment.client_id}/episodes` as any)}
              accessibilityRole="button"
              accessibilityLabel="View Cases"
            >
              <Text style={fullStyles.secondaryLink}>View Cases</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Doctor-role: terminal status — status badge only, no CTA */}
      {isDoctor && isTerminalStatus && (
        <View style={fullStyles.terminalStatusRow}>
          <StatusBadge status={appointment.status} />
        </View>
      )}
    </View>
  );
};

const fullStyles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  therapyAppointmentContainer: { backgroundColor: colors.grey[50] },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, padding: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs / 2 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateText: { ...typography.body2, fontWeight: '600', color: colors.primary.main },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  timeText: { ...typography.caption, color: colors.text.secondary },
  timeEndText: { color: colors.text.tertiary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    gap: spacing.xs / 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  clientName: { ...typography.body1, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.xs },
  viewEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    gap: spacing.xs / 2,
  },
  viewEpisodeText: { ...typography.caption, color: colors.primary.main, fontWeight: '600', flex: 1 },
  episodeBadgeContainer: { marginBottom: spacing.xs },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2 },
  detailText: { ...typography.caption, color: colors.text.secondary, maxWidth: 120 },
  seriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs,
    backgroundColor: colors.primary.main + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  seriesText: { ...typography.caption, color: colors.primary.main, fontWeight: '500' },
  navigationArrow: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center' },
  rightActionsContainer: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xs },
  completeTickButton: { padding: spacing.sm, borderRadius: 20, backgroundColor: colors.success.main + '15', marginRight: spacing.xs },
  completeTickButtonPressed: { backgroundColor: colors.success.main + '30', transform: [{ scale: 0.95 }] },
  completeTickButtonDisabled: { opacity: 0.5 },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.xs,
  },
  quickActionIconBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs / 2,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 64,
  },
  quickActionIconBtnDisabled: { opacity: 0.6, backgroundColor: colors.grey[50] },
  quickActionTooltip: { ...typography.caption, fontWeight: '600', fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 14 },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.background.paper,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  quickActionText: { ...typography.caption, fontWeight: '600' },
  viewAllEpisodesLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xs },
  viewAllEpisodesText: { fontSize: 13, color: colors.primary.main, fontWeight: '500' },
  multiDayIndicator: {
    marginBottom: spacing.xs,
    backgroundColor: colors.primary.main + '08',
    borderRadius: 8,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
  },
  multiDayBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2, marginBottom: spacing.xs / 2 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary.main },
  multiDayText: { ...typography.body2, fontWeight: '600', color: colors.primary.main, flex: 1 },
  dayNumberText: { ...typography.caption, fontWeight: '600', color: colors.primary.main },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.grey[200], borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary.main, borderRadius: 2 },
  progressText: { ...typography.caption, color: colors.primary.main, fontWeight: '600', minWidth: 35, textAlign: 'right' },
  doctorActionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  startConsultationBtn: {
    backgroundColor: colors.primary.main,
    borderRadius: 10,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  startConsultationBtnLoading: { opacity: 0.75 },
  startConsultationText: { ...typography.body2, fontWeight: '700' },
  secondaryLinksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  secondaryLink: { ...typography.caption, color: colors.primary.main, fontWeight: '600' },
  secondaryLinkSep: { ...typography.caption, color: colors.text.secondary },
  terminalStatusRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    alignItems: 'flex-start',
  },
});

// ============================================================================
// DISPATCHER — the single exported component (ADR-P1-03)
// ============================================================================

export type AppointmentRowProps = { variant: 'full' } & FullAppointmentRowProps;

/**
 * Single exported appointment-row component. `variant` remains a required,
 * explicit prop for API clarity even though `'full'` is currently the only
 * value — the `'minimal'` branch was removed as verified-dead code (T-C.4,
 * FR-B4/AC-6: zero production consumers, no later-phase claim). See file
 * header for the ADR-P1-03 rationale and T-C.4 removal note.
 */
export const AppointmentRow: React.FC<AppointmentRowProps> = (props) => {
  const { variant: _variant, ...rest } = props;
  return <FullAppointmentRow {...rest} />;
};

export default AppointmentRow;
