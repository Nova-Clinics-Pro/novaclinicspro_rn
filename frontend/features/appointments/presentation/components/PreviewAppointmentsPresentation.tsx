import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { extractTimePattern, formatDayOfWeek, formatShortDate, formatTimeFromParts } from '../../../../core/utils/dateTimeUtils';

export interface PreviewEffectiveTime {
  start: string;
  end: string;
  staff_id: string | null;
  staff_ids: string[];
  staff_name: string | null;
  room_id: string | null;
  room_name: string | null;
  is_resolved: boolean;
}

export interface PreviewPlanLevelAlternative {
  time_pattern: string;
  start_hour: number;
  start_minute: number;
  coverage_count: number;
  total_sessions: number;
  covered_sessions: number[];
}

export interface PreviewAlternativeSlot {
  start: string;
  end: string;
  available_staff: {
    staff_id: string;
    full_name: string;
    staff_type: string;
  }[];
  available_rooms: {
    room_id: string;
    name: string;
    room_type: string;
  }[];
  score: number;
  plan_level?: boolean;
}

export interface PreviewSessionData {
  session_number: number;
  appointment_start: string;
  appointment_end: string;
  doctor_id?: string | null;
  therapist_ids?: string[];
  staff_name: string | null;
  staff_assignments?: { id: string; name: string }[] | null;
  room_id: string | null;
  room_name: string | null;
  is_conflicted: boolean;
  conflict?: {
    day_index: number;
    requested_time: string;
    conflict_type: string;
    message: string;
    alternative_slots: PreviewAlternativeSlot[];
  } | null;
}

export type PreviewTranslation = (key: string, params?: Record<string, string | number>) => string;

const formatLocalTime = (isoString: string): string => {
  if (!isoString) return '—';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  return formatTimeFromParts(date.getHours(), date.getMinutes());
};

interface PreviewPlanStateProps {
  isLoading: boolean;
  hasError: boolean;
  hasFetched: boolean;
  hasSessions: boolean;
  errorMessage: string;
  t: PreviewTranslation;
  onRetry: () => void;
  onBack: () => void;
}

export const PreviewPlanState: React.FC<PreviewPlanStateProps> = ({
  isLoading,
  hasError,
  hasFetched,
  hasSessions,
  errorMessage,
  t,
  onRetry,
  onBack,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>{t('appointments.generatingPlan')}</Text>
        <Text style={styles.loadingSubtext}>{t('appointments.checkingAvailability')}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={64} color={colors.error.main} />
        <Text style={styles.errorTitle}>{t('appointments.validationUnavailable') || 'Validation Unavailable'}</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Text style={styles.errorHelp}>
          {t('appointments.cannotProceedWithoutValidation') || 'Cannot proceed without backend validation. Please try again.'}
        </Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.grey[400], marginLeft: spacing.md }]}
            onPress={onBack}
          >
            <Text style={styles.retryButtonText}>{t('common.goBack') || 'Go Back'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!hasSessions && hasFetched) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.warning.main} />
        <Text style={styles.errorTitle}>{t('appointments.noSessionsReturned') || 'No Sessions Available'}</Text>
        <Text style={styles.errorText}>
          {t('appointments.backendReturnedEmpty') || 'The server returned no sessions for this therapy plan.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>{t('common.goBack') || 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

interface PreviewClientSummaryProps {
  clientName: string;
  clientPhone: string;
  treatmentName: string;
  sessionCount: number;
  staffNames: string;
  startDateText: string;
  preferredTimeHour: number;
  preferredTimeMinutes: number;
  durationMinutes: number;
  t: PreviewTranslation;
}

export const PreviewClientSummary: React.FC<PreviewClientSummaryProps> = ({
  clientName,
  clientPhone,
  treatmentName,
  sessionCount,
  staffNames,
  startDateText,
  preferredTimeHour,
  preferredTimeMinutes,
  durationMinutes,
  t,
}) => (
  <View style={styles.clientCard} data-testid="preview-client-card">
    <View style={styles.clientIconContainer}>
      <Ionicons name="person" size={24} color={colors.primary.main} />
    </View>
    <View style={styles.clientInfo}>
      <Text style={styles.clientName}>{clientName}</Text>
      {!!clientPhone && <Text style={styles.clientPhone}>{clientPhone}</Text>}
      <Text style={styles.clientDetails}>{treatmentName} • {sessionCount} {t('appointments.sessions')}</Text>
      <Text style={styles.clientDetails}>{staffNames || t('appointments.therapistsAssigned')}</Text>
      <Text style={styles.clientDetails}>
        {t('appointments.starting')} {startDateText} at {formatTimeFromParts(preferredTimeHour, preferredTimeMinutes)} • {durationMinutes} {t('common.minEach')}
      </Text>
    </View>
  </View>
);

interface PreviewConflictBannerProps {
  hasConflicts: boolean;
  allConflictsResolved: boolean;
  unresolvedCount: number;
  sessionCount: number;
  t: PreviewTranslation;
}

export const PreviewConflictBanner: React.FC<PreviewConflictBannerProps> = ({
  hasConflicts,
  allConflictsResolved,
  unresolvedCount,
  sessionCount,
  t,
}) => {
  if (hasConflicts) {
    return (
      <View style={[styles.conflictBanner, allConflictsResolved && styles.conflictBannerResolved]}>
        <Ionicons
          name={allConflictsResolved ? 'checkmark-circle' : 'warning'}
          size={20}
          color={allConflictsResolved ? colors.success.main : colors.warning.main}
        />
        <Text style={[styles.conflictBannerText, allConflictsResolved && styles.conflictBannerTextResolved]}>
          {allConflictsResolved ? t('appointments.allConflictsResolved') : `${unresolvedCount} ${t('appointments.conflictsRemaining')}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.successBanner} data-testid="no-conflicts-banner">
      <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
      <Text style={styles.successBannerText}>{t('appointments.allSessionsAvailable', { count: sessionCount })}</Text>
    </View>
  );
};

interface PreviewGlobalAlternativesProps {
  alternatives: PreviewPlanLevelAlternative[];
  selectedPattern: string | null;
  onApply: (alternative: PreviewPlanLevelAlternative) => void;
  t: PreviewTranslation;
}

export const PreviewGlobalAlternatives: React.FC<PreviewGlobalAlternativesProps> = ({
  alternatives,
  selectedPattern,
  onApply,
  t,
}) => {
  if (alternatives.length === 0) return null;

  return (
    <View style={styles.globalAlternativesSection} data-testid="global-alternatives-section">
      <Text style={styles.globalAlternativesTitle}>{t('appointments.applyToAllSlots') || 'Apply to all sessions'}</Text>
      <Text style={styles.globalAlternativesSubtitle}>{t('appointments.highCoverageOptions') || 'These times work for most sessions'}</Text>
      {alternatives.map((alternative, index) => {
        const isSelected = selectedPattern === alternative.time_pattern;
        const coverageText = `${alternative.coverage_count}/${alternative.total_sessions}`;

        return (
          <TouchableOpacity
            key={`global-alt-${index}-${alternative.time_pattern}`}
            style={[styles.globalAlternativeOption, isSelected && styles.globalAlternativeOptionSelected]}
            onPress={() => onApply(alternative)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            data-testid={`global-alternative-${index}`}
          >
            <View style={styles.globalAlternativeContent}>
              <View style={styles.globalAlternativeTimeRow}>
                <Ionicons name="time-outline" size={18} color={isSelected ? colors.primary.main : colors.text.secondary} />
                <Text style={[styles.globalAlternativeTime, isSelected && styles.globalAlternativeTimeSelected]}>
                  {formatTimeFromParts(alternative.start_hour, alternative.start_minute)}
                </Text>
              </View>
              <Text style={styles.globalAlternativeCoverage}>
                {t('appointments.worksForSessions', { count: alternative.coverage_count, total: alternative.total_sessions }) || `Works for ${coverageText} sessions`}
              </Text>
            </View>
            {isSelected ? <Ionicons name="checkmark-circle" size={24} color={colors.primary.main} /> : <View style={styles.globalAlternativeRadio} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

interface PreviewSessionCardProps {
  session: PreviewSessionData;
  effectiveTime: PreviewEffectiveTime;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectAlternative: (alternative: PreviewAlternativeSlot) => void;
  onOpenCustomTimePicker: (sessionNumber: number) => void;
  t: PreviewTranslation;
}

export const PreviewSessionCard: React.FC<PreviewSessionCardProps> = ({
  session,
  effectiveTime,
  isExpanded,
  onToggle,
  onSelectAlternative,
  onOpenCustomTimePicker,
  t,
}) => {
  const hasConflict = session.is_conflicted;
  const isResolved = effectiveTime.is_resolved;
  const displayRoomName = effectiveTime.room_name || session.room_name || 'Not assigned';
  const alternatives = (session.conflict?.alternative_slots || []).filter((alternative) => !alternative.plan_level);
  const conflictMessage = session.conflict?.message;
  const usesCustomTime = effectiveTime.is_resolved
    && alternatives.every((alternative) => extractTimePattern(alternative.start) !== extractTimePattern(effectiveTime.start));

  return (
    <View style={[styles.sessionCard, hasConflict && !isResolved && styles.sessionCardConflict]} data-testid={`session-card-${session.session_number}`}>
      <TouchableOpacity
        style={styles.sessionHeader}
        onPress={hasConflict ? onToggle : undefined}
        activeOpacity={hasConflict ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Session ${session.session_number}${hasConflict && !isResolved ? ', has conflict' : ''}`}
      >
        <View style={styles.sessionStatus}>
          {hasConflict && !isResolved ? (
            <View style={styles.conflictIcon}><Ionicons name="warning" size={20} color={colors.error.main} /></View>
          ) : (
            <View style={styles.successIcon}><Ionicons name="checkmark-circle" size={20} color={colors.success.main} /></View>
          )}
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTitleRow}>
            <Text style={styles.sessionNumber}>{t('appointments.session')} {session.session_number}</Text>
            <Text style={styles.sessionDate}>{formatDayOfWeek(session.appointment_start)}, {formatShortDate(session.appointment_start)}</Text>
          </View>
          <Text style={styles.sessionTime}>{formatLocalTime(effectiveTime.start)} - {formatLocalTime(effectiveTime.end)}</Text>
          <Text style={styles.sessionRoom}>{displayRoomName}</Text>
        </View>
        {hasConflict && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.secondary} />}
      </TouchableOpacity>

      {hasConflict && isExpanded && (
        <View style={styles.conflictSection}>
          {!!conflictMessage && (
            <View style={styles.conflictReason}>
              <Ionicons name="alert-circle" size={16} color={colors.error.main} />
              <Text style={styles.conflictReasonText}>{conflictMessage}</Text>
            </View>
          )}
          {alternatives.length > 0 ? (
            <View style={styles.alternativesSection}>
              <Text style={styles.alternativesTitle}>{t('appointments.selectAlternative') || 'Select an alternative'}:</Text>
              {alternatives.map((alternative, index) => {
                const firstStaff = alternative.available_staff?.[0];
                const firstRoom = alternative.available_rooms?.[0];
                const isSelected = effectiveTime.is_resolved && extractTimePattern(effectiveTime.start) === extractTimePattern(alternative.start);
                const scorePercent = Math.round((alternative.score || 0) * 100);
                const scoreColor = scorePercent >= 90 ? colors.success.main : scorePercent >= 70 ? colors.warning.main : colors.text.secondary;

                return (
                  <TouchableOpacity
                    key={`alt-${index}-${alternative.start}`}
                    style={[styles.alternativeOption, isSelected && styles.alternativeOptionSelected]}
                    onPress={() => onSelectAlternative(alternative)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    data-testid={`alternative-slot-${session.session_number}-${index}`}
                  >
                    <View style={styles.alternativeContent}>
                      <Text style={[styles.alternativeTime, isSelected && styles.alternativeTextSelected]}>{formatLocalTime(alternative.start)} - {formatLocalTime(alternative.end)}</Text>
                      <Text style={[styles.alternativeStaff, isSelected && styles.alternativeTextSelected]}>
                        {firstStaff?.full_name || t('common.therapist') || 'Therapist'}{!!firstRoom?.name && ` • ${firstRoom.name}`}
                      </Text>
                      {alternative.available_staff?.length > 1 && <Text style={styles.moreOptionsText}>+{alternative.available_staff.length - 1} more staff options</Text>}
                    </View>
                    <View style={styles.alternativeScore}>
                      <Text style={[styles.scoreText, { color: scoreColor }]}>{scorePercent}%</Text>
                      <Text style={styles.scoreLabel}>{scorePercent >= 90 ? (t('common.best') || 'Best') : scorePercent >= 70 ? (t('common.good') || 'Good') : (t('common.fair') || 'Fair')}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noAlternatives}><Text style={styles.noAlternativesText}>{t('appointments.noAlternativeSlotsAvailable') || 'No alternative slots available.'}</Text></View>
          )}
          <View style={styles.customTimeSection}>
            <TouchableOpacity
              style={[styles.customTimeRow, usesCustomTime && styles.customTimeRowSelected]}
              onPress={() => onOpenCustomTimePicker(session.session_number)}
              data-testid={`custom-time-${session.session_number}`}
            >
              <Ionicons name={usesCustomTime ? 'checkmark-circle' : 'time-outline'} size={18} color={usesCustomTime ? colors.success.main : colors.primary.main} />
              <View style={styles.customTimeContent}>
                <Text style={styles.customTimeText}>{t('appointments.chooseDifferentTime') || 'Choose a different time…'}</Text>
                {usesCustomTime && <Text style={styles.customTimeSelectedText}>{t('appointments.selectedTime') || 'Selected'}: {formatLocalTime(effectiveTime.start)} - {formatLocalTime(effectiveTime.end)}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

interface PreviewActionBarProps {
  canProceed: boolean;
  isCreating: boolean;
  sessionCount: number;
  t: PreviewTranslation;
  onBack: () => void;
  onConfirm: () => void;
}

export const PreviewActionBar: React.FC<PreviewActionBarProps> = ({ canProceed, isCreating, sessionCount, t, onBack, onConfirm }) => (
  <View style={styles.actionBar}>
    <TouchableOpacity style={styles.cancelButton} onPress={onBack} data-testid="preview-back-button">
      <Text style={styles.cancelButtonText}>{t('common.back')}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.confirmButton, !canProceed && styles.confirmButtonDisabled]}
      onPress={onConfirm}
      disabled={isCreating || !canProceed}
      data-testid="preview-confirm-button"
    >
      {isCreating ? <ActivityIndicator size="small" color={colors.background.default} /> : <><Ionicons name="checkmark" size={20} color={colors.background.default} /><Text style={styles.confirmButtonText}>{t('appointments.confirmSessions', { count: sessionCount })}</Text></>}
    </TouchableOpacity>
  </View>
);

interface PreviewValidationToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export const PreviewValidationToast: React.FC<PreviewValidationToastProps> = ({ visible, message, type }) => {
  if (!visible) return null;

  return (
    <View style={[styles.validationToast, type === 'error' ? styles.validationToastError : styles.validationToastSuccess]}>
      <Ionicons name={type === 'error' ? 'close-circle' : 'checkmark-circle'} size={20} color="#fff" />
      <Text style={styles.validationToastText}>{message}</Text>
    </View>
  );
};

interface PreviewSuccessModalProps {
  visible: boolean;
  createdCount: number;
  whatsappUrl: string | null;
  t: PreviewTranslation;
  onDone: () => void;
  onSendWhatsApp: () => void;
}

export const PreviewSuccessModal: React.FC<PreviewSuccessModalProps> = ({ visible, createdCount, whatsappUrl, t, onDone, onSendWhatsApp }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
    <View style={styles.modalOverlay}>
      <View style={styles.successModalContent}>
        <View style={styles.successModalIcon}><Ionicons name="checkmark-circle" size={64} color={colors.success.main} /></View>
        <Text style={styles.successModalTitle}>{t('appointments.appointmentsCreated') || 'Appointments Created!'}</Text>
        <Text style={styles.successModalText}>{createdCount} {t('appointments.sessionsScheduled') || 'sessions have been scheduled'}</Text>
        <View style={styles.successModalActions}>
          <TouchableOpacity style={styles.successModalDoneButton} onPress={onDone}><Text style={styles.successModalDoneText}>{t('common.done') || 'Done'}</Text></TouchableOpacity>
          {!!whatsappUrl && <TouchableOpacity style={styles.successModalWhatsAppButton} onPress={onSendWhatsApp}><Ionicons name="logo-whatsapp" size={20} color="#fff" /><Text style={styles.successModalWhatsAppText}>{t('appointments.sendWhatsApp') || 'Send WhatsApp'}</Text></TouchableOpacity>}
        </View>
      </View>
    </View>
  </Modal>
);

export const PreviewSessionsList: React.FC<{
  hasConflicts: boolean;
  allConflictsResolved: boolean;
  alternatives: PreviewPlanLevelAlternative[];
  selectedGlobalPattern: string | null;
  onApplyGlobal: (alternative: PreviewPlanLevelAlternative) => void;
  sessions: PreviewSessionData[];
  effectiveTimes: Map<number, PreviewEffectiveTime>;
  expandedSession: number | null;
  onToggleSession: (sessionNumber: number) => void;
  onSelectAlternative: (sessionNumber: number, alternative: PreviewAlternativeSlot) => void;
  onOpenCustomTimePicker: (sessionNumber: number) => void;
  t: PreviewTranslation;
}> = ({ hasConflicts, allConflictsResolved, alternatives, selectedGlobalPattern, onApplyGlobal, sessions, effectiveTimes, expandedSession, onToggleSession, onSelectAlternative, onOpenCustomTimePicker, t }) => (
  <ScrollView style={styles.sessionsList} contentContainerStyle={styles.sessionsContent} showsVerticalScrollIndicator={false}>
    {hasConflicts && !allConflictsResolved && alternatives.length > 0 && <PreviewGlobalAlternatives alternatives={alternatives} selectedPattern={selectedGlobalPattern} onApply={onApplyGlobal} t={t} />}
    {sessions.map((session) => {
      const effectiveTime = effectiveTimes.get(session.session_number);
      if (!effectiveTime) return null;
      return <PreviewSessionCard key={session.session_number} session={session} effectiveTime={effectiveTime} isExpanded={expandedSession === session.session_number} onToggle={() => onToggleSession(session.session_number)} onSelectAlternative={(alternative) => onSelectAlternative(session.session_number, alternative)} onOpenCustomTimePicker={onOpenCustomTimePicker} t={t} />;
    })}
    <View style={{ height: 100 }} />
  </ScrollView>
);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.h6, color: colors.text.primary, marginTop: spacing.md },
  loadingSubtext: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { ...typography.h6, color: colors.text.primary, marginTop: spacing.md, textAlign: 'center' },
  errorText: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' },
  errorHelp: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm, textAlign: 'center' },
  errorButtons: { flexDirection: 'row', marginTop: spacing.lg },
  retryButton: { backgroundColor: colors.primary.main, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: spacing.sm },
  retryButtonText: { ...typography.button, color: colors.background.default },
  clientCard: { flexDirection: 'row', backgroundColor: colors.background.default, margin: spacing.md, padding: spacing.md, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border.light },
  clientIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary.main + '10', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  clientInfo: { flex: 1 },
  clientName: { ...typography.h6, color: colors.text.primary },
  clientPhone: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.xs },
  clientDetails: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  conflictBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warning.main + '10', marginHorizontal: spacing.md, padding: spacing.sm, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.warning.main + '30' },
  conflictBannerResolved: { backgroundColor: colors.success.main + '10', borderColor: colors.success.main + '30' },
  conflictBannerText: { ...typography.body2, color: colors.warning.main, fontWeight: '600' },
  conflictBannerTextResolved: { color: colors.success.main },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success.main + '10', marginHorizontal: spacing.md, padding: spacing.sm, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.success.main + '30' },
  successBannerText: { ...typography.body2, color: colors.success.main, fontWeight: '600' },
  globalAlternativesSection: { margin: spacing.md, padding: spacing.md, backgroundColor: colors.primary.main + '08', borderRadius: spacing.md, borderWidth: 1, borderColor: colors.primary.main + '20' },
  globalAlternativesTitle: { ...typography.h6, color: colors.text.primary },
  globalAlternativesSubtitle: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.sm },
  globalAlternativeOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.background.default, borderRadius: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border.light },
  globalAlternativeOptionSelected: { borderColor: colors.primary.main, backgroundColor: colors.primary.main + '10' },
  globalAlternativeContent: { flex: 1 },
  globalAlternativeTimeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  globalAlternativeTime: { ...typography.body1, color: colors.text.primary, fontWeight: '600' },
  globalAlternativeTimeSelected: { color: colors.primary.main },
  globalAlternativeCoverage: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  globalAlternativeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border.dark },
  sessionsList: { flex: 1 },
  sessionsContent: { paddingBottom: spacing.xl },
  sessionCard: { backgroundColor: colors.background.default, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  sessionCardConflict: { borderColor: colors.warning.main + '70' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  sessionStatus: { marginRight: spacing.sm },
  conflictIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.error.main + '10', alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success.main + '10', alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionNumber: { ...typography.body1, color: colors.text.primary, fontWeight: '600' },
  sessionDate: { ...typography.caption, color: colors.text.secondary },
  sessionTime: { ...typography.body2, color: colors.primary.main, marginTop: spacing.xs, fontWeight: '500' },
  sessionRoom: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  sessionStaff: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  conflictSection: { borderTopWidth: 1, borderTopColor: colors.border.light, padding: spacing.md, backgroundColor: colors.background.paper },
  conflictReason: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', backgroundColor: colors.error.main + '08', padding: spacing.sm, borderRadius: spacing.sm },
  conflictReasonText: { ...typography.body2, color: colors.error.main, flex: 1 },
  alternativesSection: { marginTop: spacing.md },
  alternativesTitle: { ...typography.body2, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
  alternativeOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.background.default, borderWidth: 1, borderColor: colors.border.light, borderRadius: spacing.sm, marginBottom: spacing.sm },
  alternativeOptionSelected: { borderColor: colors.primary.main, backgroundColor: colors.primary.main + '10' },
  alternativeContent: { flex: 1 },
  alternativeTime: { ...typography.body2, color: colors.text.primary, fontWeight: '600' },
  alternativeStaff: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
  alternativeTextSelected: { color: colors.primary.main },
  moreOptionsText: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xs },
  alternativeScore: { alignItems: 'flex-end', marginLeft: spacing.sm },
  scoreText: { ...typography.body2, fontWeight: '700' },
  scoreLabel: { ...typography.caption, color: colors.text.secondary },
  noAlternatives: { padding: spacing.md, backgroundColor: colors.background.default, borderRadius: spacing.sm },
  noAlternativesText: { ...typography.body2, color: colors.text.secondary, textAlign: 'center' },
  customTimeSection: { marginTop: spacing.md },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.background.default, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.border.light },
  customTimeRowSelected: { borderColor: colors.success.main, backgroundColor: colors.success.main + '10' },
  customTimeContent: { flex: 1, marginLeft: spacing.sm },
  customTimeText: { ...typography.body2, color: colors.primary.main, fontWeight: '500' },
  customTimeSelectedText: { ...typography.caption, color: colors.success.main, marginTop: spacing.xs },
  actionBar: { flexDirection: 'row', padding: spacing.md, gap: spacing.md, backgroundColor: colors.background.default, borderTopWidth: 1, borderTopColor: colors.border.light },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.border.main, borderRadius: spacing.sm },
  cancelButtonText: { ...typography.button, color: colors.text.primary },
  confirmButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.primary.main, borderRadius: spacing.sm },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { ...typography.button, color: colors.background.default },
  validationToast: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: spacing.sm },
  validationToastError: { backgroundColor: colors.error.main },
  validationToastSuccess: { backgroundColor: colors.success.main },
  validationToastText: { ...typography.body2, color: '#fff', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  successModalContent: { width: '100%', maxWidth: 400, backgroundColor: colors.background.default, borderRadius: spacing.lg, padding: spacing.lg, alignItems: 'center' },
  successModalIcon: { marginBottom: spacing.md },
  successModalTitle: { ...typography.h5, color: colors.text.primary, textAlign: 'center' },
  successModalText: { ...typography.body2, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  successModalActions: { width: '100%', gap: spacing.sm, marginTop: spacing.lg },
  successModalDoneButton: { alignItems: 'center', padding: spacing.md, backgroundColor: colors.primary.main, borderRadius: spacing.sm },
  successModalDoneText: { ...typography.button, color: colors.background.default },
  successModalWhatsAppButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#25D366', borderRadius: spacing.sm },
  successModalWhatsAppText: { ...typography.button, color: '#fff' },
});
