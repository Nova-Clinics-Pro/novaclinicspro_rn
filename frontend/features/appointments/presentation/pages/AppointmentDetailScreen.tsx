/**
 * Appointment Detail Screen
 * 
 * REDESIGN (User Requirement B1, B2):
 * - B1: REMOVED redundant Date, Time, Duration, Staff (already on list card)
 * - B2: Show Visit History cards with:
 *   - Visit Date, Visit Type
 *   - Case Sheet link, Prescription link
 *   - Payment details
 *   - Quick actions (same as list card)
 * 
 * QUICK ACTIONS (per FRONTEND_QUICK_ACTIONS_GUIDE.md):
 * - Reschedule, No-Show, Cancel, Complete
 * 
 * WHATSAPP TRIGGERS on status changes:
 * - Confirmed, Rescheduled, Cancelled, No-Show, Completed
 * 
 * NO IDs displayed in UI. All text uses i18n.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CrossPlatformDateTimePicker, {
  DateTimePickerEvent,
} from '../../../../core/components/CrossPlatformDateTimePicker';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useAppointmentDetailQuery,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
  useRescheduleAppointmentMutation,
  useAppointmentsListQuery,
} from '../../data/repositories/appointments.repository.impl';
import {
  useEpisodeQuery,
} from '../../../episodes/data/repositories/episodes.repository.impl';
import { EpisodeCard } from '../../../episodes/presentation/components/EpisodeCard';
import { MultiDayTreatmentSection } from '../components/MultiDayTreatmentSection';
import {
  getStatusLabel,
  getStatusColor,
  calculateDuration,
  formatDuration,
  openWhatsApp,
  generateWhatsAppConfirmationMessage,
  generateWhatsAppCancellationMessage,
  generateWhatsAppRescheduleMessage,
  generateWhatsAppNoShowMessage,
  generateWhatsAppCompletedMessage,
  getStaffName,
} from '../../domain/helpers';
import { formatDate, formatTime } from '../../../../core/utils/dateTimeUtils';
import { isCosV1Enabled, useFeatures } from '../../../../core/hooks/useFeatures';
import {
  episodeWorkspaceRoute,
  startConsultationRoute,
} from '../../../doctorDashboard/application/consultationRoutes';

// ============================================
// SECTION HEADER COMPONENT
// ============================================

interface SectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color={colors.primary.main} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ============================================
// ACTION BUTTON COMPONENT (Quick Actions per FRONTEND_QUICK_ACTIONS_GUIDE.md)
// ============================================

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'filled' | 'outlined';
  testId?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  color, 
  onPress, 
  disabled,
  variant = 'outlined',
  testId,
}) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      variant === 'filled' 
        ? { backgroundColor: color } 
        : { backgroundColor: color + '15', borderWidth: 1, borderColor: color + '30' },
      disabled && styles.actionButtonDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    data-testid={testId}
  >
    <Ionicons 
      name={icon} 
      size={18} 
      color={disabled ? colors.text.tertiary : (variant === 'filled' ? colors.background.default : color)} 
    />
    <Text style={[
      styles.actionButtonText, 
      { color: disabled ? colors.text.tertiary : (variant === 'filled' ? colors.background.default : color) }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ============================================
// B2: VISIT HISTORY CARD COMPONENT (Enhanced)
// ============================================

interface VisitHistoryCardProps {
  appointment: any;
  onPress: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * BUG FIX #4: Visit History Card - Removed navigation and toggle behavior
 * Previous visits should be view-only, showing historical data without interaction
 */
const VisitHistoryCard: React.FC<VisitHistoryCardProps> = ({ appointment, onPress, t }) => {
  const router = useRouter();
  const cosEnabled = isCosV1Enabled(useFeatures());
  const statusColor = getStatusColor(appointment.status);
  
  // Extract data from appointment
  const visitDate = formatDate(appointment.appointment_start);
  const visitTime = formatTime(appointment.appointment_start);
  const visitType = appointment.appointment_type === 'MULTI' 
    ? (t('common.treatment') || 'Treatment') 
    : (t('common.consultation') || 'Consultation');
  
  // FIX #3: Check for Case Sheet and Prescription existence
  const hasCaseSheet = !!(appointment.case_sheet_id || appointment.has_case_sheet);
  const hasPrescription = !!(appointment.prescription_id || appointment.has_prescription);
  const hasPayment = appointment.payment_id || appointment.payment_status;
  const paymentAmount = appointment.payment_amount;
  const paymentStatus = appointment.payment_status;

  // Handler for Case Sheet action
  const handleCaseSheetPress = useCallback(() => {
    const clientId = appointment.client_id;
    if (hasCaseSheet && appointment.case_sheet_id) {
      // View existing case sheet
      router.push(`/clinic-admin/clients/${clientId}/casesheets/${appointment.case_sheet_id}` as any);
    } else {
      // Add new case sheet
      const destination = cosEnabled
        ? appointment.episode_id
          ? episodeWorkspaceRoute(appointment.episode_id, appointment.id, clientId, 'doctor', 'case_sheet')
          : startConsultationRoute(appointment.id, clientId)
        : `/clinic-admin/clients/${clientId}/casesheets/new?appointmentId=${appointment.id}`;
      router.push(destination as any);
    }
  }, [cosEnabled, hasCaseSheet, appointment, router]);

  // Handler for Prescription action
  const handlePrescriptionPress = useCallback(() => {
    const clientId = appointment.client_id;
    if (hasPrescription && appointment.prescription_id) {
      // View existing prescription
      router.push(`/clinic-admin/clients/${clientId}/prescriptions/${appointment.prescription_id}` as any);
    } else {
      // Add new prescription
      const destination = cosEnabled
        ? appointment.episode_id
          ? episodeWorkspaceRoute(appointment.episode_id, appointment.id, clientId, 'doctor', 'prescription')
          : startConsultationRoute(appointment.id, clientId)
        : `/clinic-admin/clients/${clientId}/prescriptions/new?appointmentId=${appointment.id}`;
      router.push(destination as any);
    }
  }, [cosEnabled, hasPrescription, appointment, router]);
  
  // BUG FIX #4: Removed TouchableOpacity and navigation - previous visits are view-only
  return (
    <View 
      style={styles.visitCard}
      data-testid={`visit-card-${appointment.id}`}
    >
      {/* Header: Date + Status */}
      <View style={styles.visitCardHeader}>
        <View style={styles.visitCardDateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary.main} />
          <Text style={styles.visitCardDate}>{visitDate}</Text>
          <Text style={styles.visitCardTime}>{visitTime}</Text>
        </View>
        <View style={[styles.visitCardStatus, { backgroundColor: statusColor + '15' }]}>
          <Text style={[styles.visitCardStatusText, { color: statusColor }]}>
            {getStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>

      {/* Visit Type */}
      <View style={styles.visitCardTypeRow}>
        <Ionicons name="medical-outline" size={14} color={colors.text.secondary} />
        <Text style={styles.visitCardType}>{visitType}</Text>
        {appointment.treatment_name && (
          <Text style={styles.visitCardTreatment} numberOfLines={1}>
            • {appointment.treatment_name}
          </Text>
        )}
      </View>

      {/* FIX #3: Case Sheet & Prescription Links - Show Add/View based on state */}
      <View style={styles.visitCardLinksRow}>
        {/* Case Sheet CTA - Add or View */}
        <TouchableOpacity 
          style={[styles.visitCardLinkButton, hasCaseSheet && styles.visitCardLinkButtonActive]}
          onPress={handleCaseSheetPress}
          data-testid={`case-sheet-cta-${appointment.id}`}
        >
          <Ionicons 
            name={hasCaseSheet ? "document-text" : "add-circle-outline"} 
            size={14} 
            color={hasCaseSheet ? colors.primary.main : colors.text.secondary} 
          />
          <Text style={[
            styles.visitCardLinkText,
            hasCaseSheet && styles.visitCardLinkTextActive,
          ]}>
            {hasCaseSheet 
              ? (t('appointments.viewCaseSheet') || 'View Case Sheet')
              : (t('appointments.addCaseSheet') || 'Add Case Sheet')}
          </Text>
        </TouchableOpacity>

        {/* Prescription CTA - Add or View */}
        <TouchableOpacity 
          style={[styles.visitCardLinkButton, hasPrescription && styles.visitCardLinkButtonActive]}
          onPress={handlePrescriptionPress}
          data-testid={`prescription-cta-${appointment.id}`}
        >
          <Ionicons 
            name={hasPrescription ? "receipt" : "add-circle-outline"} 
            size={14} 
            color={hasPrescription ? colors.success.main : colors.text.secondary} 
          />
          <Text style={[
            styles.visitCardLinkText,
            hasPrescription && { color: colors.success.main },
          ]}>
            {hasPrescription 
              ? (t('appointments.viewPrescription') || 'View Prescription')
              : (t('appointments.addPrescription') || 'Add Prescription')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Details */}
      <View style={styles.visitCardPaymentRow}>
        <Ionicons 
          name="wallet-outline" 
          size={14} 
          color={hasPayment ? colors.success.main : colors.text.tertiary} 
        />
        <Text style={[
          styles.visitCardPaymentText,
          hasPayment && styles.visitCardPaymentActive,
        ]}>
          {hasPayment 
            ? `${paymentStatus || 'Paid'}${paymentAmount ? ` • ₹${paymentAmount}` : ''}`
            : (t('appointments.noPaymentRecorded') || 'No payment recorded')}
        </Text>
      </View>

      {/* BUG FIX #4: Navigation Arrow REMOVED - previous visits should not navigate */}
    </View>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const AppointmentDetailScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const userRole = currentUser?.roles?.[0] || 'clinic_admin';

  // State for reschedule
  const [showReschedulePicker, setShowReschedulePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [showRescheduleTime, setShowRescheduleTime] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState<Date | null>(null);
  // Queries
  const {
    data: appointment,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAppointmentDetailQuery(tenantId, appointmentId || '');

  // Query for visit history (previous appointments for this client)
  const clientId = appointment?.client_id;
  const { data: clientAppointments } = useAppointmentsListQuery(
    tenantId,
    { client_id: clientId, limit: 20 },
    { enabled: !!clientId }
  );

  // Episode queries
  const episodeId = appointment?.episode_id;
  
  // Debug logging for episode
  React.useEffect(() => {
    console.log('[AppointmentDetailScreen] Episode info:', {
      appointmentId,
      episodeId,
      hasEpisodeId: !!episodeId,
      episodeTitle: appointment?.episode_title,
      episodeStatus: appointment?.episode_status,
      appointmentData: appointment,
    });
  }, [appointmentId, episodeId, appointment]);
  
  const {
    data: episode,
    isLoading: isEpisodeLoading,
    error: episodeError,
    refetch: refetchEpisode,
  } = useEpisodeQuery(tenantId, episodeId || '', { enabled: !!episodeId });

  // Query for episode appointments (for "Visits in This Episode" section)
  const {
    data: episodeAppointmentsData,
    isLoading: isEpisodeAppointmentsLoading,
  } = useAppointmentsListQuery(
    tenantId,
    { episode_id: episodeId || undefined, skip: 0, limit: 50 },
    { enabled: !!episodeId }
  );

  const episodeAppointments = (episodeAppointmentsData?.items || [])
    .filter((apt: any) => apt.id !== appointmentId) // Exclude current appointment
    .sort((a: any, b: any) =>
      new Date(b.appointment_start).getTime() - new Date(a.appointment_start).getTime()
    );

  // FIX #4: Filter visit history based on episode context
  // If appointment has episode: show only visits in that episode
  // If no episode: show message about no episode linkage
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  let visitHistory: any[] = [];
  let showEpisodeVisits = false;
  
  if (episodeId) {
    // Show visits in this episode
    showEpisodeVisits = true;
    // We'll fetch episode appointments separately
  } else {
    // No episode - we'll show a message instead
    visitHistory = [];
  }

  // Mutations
  const updateMutation = useUpdateAppointmentMutation(tenantId, appointmentId || '');
  const cancelMutation = useCancelAppointmentMutation(tenantId);
  const rescheduleMutation = useRescheduleAppointmentMutation(tenantId, appointmentId || '');

  // ===== EXTRACT DATA FROM API RESPONSE =====
  const clientName = appointment?.client_name || null;
  const clientPhone = appointment?.client_phone || null;
  const treatmentName = appointment?.treatment_name || null;
  const roomName = appointment?.room_name || null;
  const staffName = appointment ? getStaffName(appointment) : null;

  // ===== RBAC CHECK =====
  const normalizedRole = userRole?.toLowerCase().replace('_', '-') || 'clinic-admin';
  const canModifyAppointment = [
    'clinic-admin', 
    'clinic_admin', 
    'receptionist',
    'tenant admin',
    'tenant_admin',
    'Tenant Admin'
  ].includes(normalizedRole) || [
    'clinic-admin', 
    'clinic_admin', 
    'receptionist',
    'Tenant Admin'
  ].includes(userRole);
  
  const canStartSession = [
    'clinic-admin', 
    'clinic_admin', 
    'doctor', 
    'therapist',
    'tenant admin',
    'tenant_admin',
    'Tenant Admin'
  ].includes(normalizedRole) || [
    'clinic-admin', 
    'clinic_admin', 
    'doctor', 
    'therapist',
    'Tenant Admin'
  ].includes(userRole);
  
  const canCompleteSession = canStartSession;
  const canMarkNoShow = canModifyAppointment;
  
  const canCall = [
    'clinic-admin', 
    'clinic_admin', 
    'receptionist', 
    'doctor', 
    'therapist',
    'tenant admin',
    'tenant_admin',
    'Tenant Admin'
  ].includes(normalizedRole) || [
    'clinic-admin', 
    'clinic_admin', 
    'receptionist', 
    'doctor', 
    'therapist',
    'Tenant Admin'
  ].includes(userRole);
  
  const canWhatsApp = canModifyAppointment;

  // Episode RBAC permissions
  const canLinkAppointment = [
    'clinic-admin', 
    'clinic_admin', 
    'doctor', 
    'receptionist',
    'tenant admin',
    'tenant_admin',
    'Tenant Admin'
  ].includes(normalizedRole) || [
    'clinic-admin', 
    'clinic_admin', 
    'doctor', 
    'receptionist',
    'Tenant Admin'
  ].includes(userRole);
  
  const canCreateEpisode = [
    'clinic-admin', 
    'clinic_admin', 
    'doctor',
    'tenant admin',
    'tenant_admin',
    'Tenant Admin'
  ].includes(normalizedRole) || [
    'clinic-admin', 
    'clinic_admin', 
    'doctor',
    'Tenant Admin'
  ].includes(userRole);

  console.log('[AppointmentDetail] userRole:', userRole);
  console.log('[AppointmentDetail] normalizedRole:', normalizedRole);
  console.log('[AppointmentDetail] canLinkAppointment:', canLinkAppointment);
  console.log('[AppointmentDetail] canCreateEpisode:', canCreateEpisode);

  // Call client directly
  const handleCallClient = useCallback(() => {
    if (!clientPhone) {
      Alert.alert(t('common.error') || 'Error', t('appointments.noPhoneNumber') || 'No phone number available');
      return;
    }
    Linking.openURL(`tel:${clientPhone}`);
  }, [clientPhone, t]);

  // ===== WHATSAPP HANDLERS FOR ALL STATUS CHANGES =====
  
  // Generic WhatsApp sender with status-specific message
  const sendWhatsAppForStatus = useCallback((
    status: string,
    newDateTime?: { date: string; time: string }
  ) => {
    if (!clientPhone || !appointment) return;

    const displayClientName = clientName || t('common.client') || 'Client';
    const displayStaffName = staffName || t('common.staff') || 'Staff';
    const displayTreatment = treatmentName || t('common.appointment') || 'Appointment';
    const clinicPhoneNum = '+91-XXXXXXXXXX';
    const clinicName = t('common.yourClinic') || 'Your Clinic';
    const appointmentType = appointment.appointment_type;

    let message = '';

    switch (status) {
      case 'confirmed':
        message = generateWhatsAppConfirmationMessage(
          displayClientName,
          clinicName,
          formatDate(appointment.appointment_start),
          formatTime(appointment.appointment_start),
          displayStaffName,
          displayTreatment,
          clinicPhoneNum,
          appointmentType
        );
        break;
      case 'cancelled':
        message = generateWhatsAppCancellationMessage(
          displayClientName,
          formatDate(appointment.appointment_start),
          formatTime(appointment.appointment_start),
          displayTreatment,
          clinicPhoneNum
        );
        break;
      case 'rescheduled':
        if (newDateTime) {
          message = generateWhatsAppRescheduleMessage(
            displayClientName,
            formatDate(appointment.appointment_start),
            formatTime(appointment.appointment_start),
            newDateTime.date,
            newDateTime.time,
            displayStaffName,
            displayTreatment,
            appointmentType
          );
        }
        break;
      case 'no_show':
        message = generateWhatsAppNoShowMessage(
          displayClientName,
          formatDate(appointment.appointment_start),
          formatTime(appointment.appointment_start),
          displayTreatment,
          clinicPhoneNum
        );
        break;
      case 'completed':
        message = generateWhatsAppCompletedMessage(
          displayClientName,
          formatDate(appointment.appointment_start),
          displayTreatment,
          clinicPhoneNum
        );
        break;
      default:
        return;
    }

    const url = openWhatsApp(clientPhone, message);
    
    Alert.alert(
      t('appointments.notifyClient'),
      t('appointments.sendWhatsAppConfirmation'),
      [
        { text: t('common.skip'), style: 'cancel' },
        { text: t('appointments.sendWhatsApp'), onPress: () => Linking.openURL(url) },
      ]
    );
  }, [appointment, t]);

  // Handle status update with WhatsApp trigger
  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    if (!appointment) return;

    const statusMessages: Record<string, string> = {
      confirmed: t('appointments.markAsConfirmed'),
      in_progress: t('appointments.startAppointment'),
      completed: t('appointments.markAsCompleted'),
      no_show: t('appointments.markAsNoShow'),
    };

    Alert.alert(
      statusMessages[newStatus] || t('appointments.updateStatus'),
      t('appointments.confirmStatusChange'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({ status: newStatus });
              Alert.alert(t('common.success'), t('appointments.statusUpdated'));
              refetch();

              // Offer WhatsApp notification for status changes
              if (appointment.client_phone && canWhatsApp) {
                setTimeout(() => {
                  sendWhatsAppForStatus(newStatus);
                }, 500);
              }
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('appointments.updateFailed'));
            }
          },
        },
      ]
    );
  }, [appointment, updateMutation, refetch, sendWhatsAppForStatus, t, canWhatsApp]);

  // Handle cancel with WhatsApp trigger
  const handleCancel = useCallback(() => {
    if (!appointment) return;

    Alert.alert(
      t('appointments.cancelAppointment'),
      t('appointments.confirmCancel'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yesCancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(appointmentId || '');
              Alert.alert(t('common.success'), t('appointments.appointmentCancelled'));
              refetch();

              // Offer WhatsApp notification for cancellation
              if (appointment.client_phone && canWhatsApp) {
                setTimeout(() => {
                  sendWhatsAppForStatus('cancelled');
                }, 500);
              }
            } catch (err: any) {
              Alert.alert(t('common.error'), err.message || t('appointments.cancelFailed'));
            }
          },
        },
      ]
    );
  }, [appointment, cancelMutation, appointmentId, refetch, sendWhatsAppForStatus, t, canWhatsApp]);

  // Handle reschedule initiation
  const handleReschedule = useCallback(() => {
    if (!appointment) return;
    setRescheduleDate(new Date(appointment.appointment_start));
    setShowReschedulePicker(true);
  }, [appointment]);

  // Confirm reschedule with WhatsApp trigger
  const confirmReschedule = useCallback(async () => {
    if (!appointment || !rescheduleDate || !rescheduleTime) return;

    const newDateTime = new Date(rescheduleDate);
    newDateTime.setHours(rescheduleTime.getHours(), rescheduleTime.getMinutes());

    const duration = calculateDuration(appointment.appointment_start, appointment.appointment_end) || 60;
    const newEndTime = new Date(newDateTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + duration);

    try {
      await rescheduleMutation.mutateAsync({
        new_start: newDateTime.toISOString(),
        new_end: newEndTime.toISOString(),
      });

      setShowReschedulePicker(false);
      setShowRescheduleTime(false);
      Alert.alert(t('common.success'), t('appointments.appointmentRescheduled'));
      refetch();

      // Offer WhatsApp notification for rescheduling
      if (appointment.client_phone && canWhatsApp) {
        setTimeout(() => {
          sendWhatsAppForStatus('rescheduled', {
            date: formatDate(newDateTime.toISOString()),
            time: formatTime(newDateTime.toISOString()),
          });
        }, 500);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('appointments.rescheduleFailed'));
    }
  }, [appointment, rescheduleDate, rescheduleTime, rescheduleMutation, refetch, sendWhatsAppForStatus, t, canWhatsApp]);

  // Navigate to visit history item
  const handleVisitHistoryPress = useCallback((historyAppointmentId: string) => {
    router.push(`/clinic-admin/appointments/${historyAppointmentId}` as any);
  }, [router]);

  // Episode handlers
  const handleEpisodePress = useCallback(() => {
    if (episode?.id) {
      router.push(`/clinic-admin/episodes/${episode.id}` as any);
    }
  }, [episode, router]);

  const handleLinkEpisodePress = useCallback(() => {
    if (!canLinkAppointment) {
      Alert.alert(
        t('common.error') || 'Error',
        'You do not have permission to link episodes'
      );
      return;
    }
    // Navigate to full-screen link episode sheet
    router.push(
      `/clinic-admin/appointments/${appointmentId}/link-episode?clientId=${clientId}` as any
    );
  }, [canLinkAppointment, t, router, appointmentId, clientId]);

  const handleCreateEpisodePress = useCallback(() => {
    if (!canCreateEpisode) {
      Alert.alert(
        t('common.error') || 'Error',
        'You do not have permission to create episodes'
      );
      return;
    }
    // Navigate to full-screen create episode sheet
    router.push(
      `/clinic-admin/appointments/${appointmentId}/create-episode?clientId=${clientId}` as any
    );
  }, [canCreateEpisode, t, router, appointmentId, clientId]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !appointment) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          <Text style={styles.errorTitle}>{t('appointments.loadFailed')}</Text>
          <Text style={styles.errorText}>
            {error?.message || t('appointments.notFound')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(appointment.status);
  const duration = calculateDuration(appointment.appointment_start, appointment.appointment_end);
  // FIX: Use case-insensitive status comparison
  const canModify = canModifyAppointment && ['scheduled', 'confirmed'].includes(appointment.status?.toLowerCase());
  const canComplete = canCompleteSession && ['confirmed', 'in_progress'].includes(appointment.status?.toLowerCase());
  const isPartOfSeries = appointment.series_id && appointment.session_number;

  // Display values with fallbacks
  const displayClientName = clientName || t('common.unknownClient') || 'Unknown Client';
  const displayClientPhone = clientPhone;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          accessibilityLabel={t('common.goBack') || 'Go back'}
          data-testid="detail-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('navigation.appointments') || 'Appointments'}</Text>
        {/* WhatsApp Button - Show if user has permission */}
        {canWhatsApp && (
          <TouchableOpacity 
            style={[styles.whatsappButton, !displayClientPhone && { opacity: 0.5 }]} 
            onPress={() => displayClientPhone && sendWhatsAppForStatus('confirmed')}
            disabled={!displayClientPhone}
            accessibilityLabel={t('appointments.sendWhatsApp') || 'Send WhatsApp'}
            data-testid="detail-whatsapp-button"
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary.main]} />
        }
      >
        {/* Status Badge Row */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(appointment.status)}
            </Text>
          </View>
          {isPartOfSeries && (
            <View style={styles.sessionBadge}>
              <Ionicons name="repeat" size={14} color={colors.primary.main} />
              <Text style={styles.sessionBadgeText}>
                {t('appointments.session') || 'Session'} {appointment.session_number}/{appointment.total_sessions}
              </Text>
            </View>
          )}
        </View>

        {/* MULTI-DAY TREATMENT SECTION */}
        <MultiDayTreatmentSection
          appointmentId={appointmentId || ''}
          treatmentSheetId={(appointment as any)?.treatment_sheet_id}
          sessionId={(appointment as any)?.session_id || appointment?.id}
        />

        {/* EPISODE SECTION */}
        <View style={styles.section} data-testid="detail-episode-section">
          <SectionHeader title={t('episodes.episode') || 'Episode'} icon="folder" />
          <EpisodeCard
            episode={episode}
            loading={isEpisodeLoading}
            error={!!episodeError}
            appointmentHasEpisode={!!episodeId}
            onRetry={refetchEpisode}
            onEpisodePress={handleEpisodePress}
            onLinkEpisodePress={canLinkAppointment ? handleLinkEpisodePress : undefined}
            onCreateEpisodePress={canCreateEpisode ? handleCreateEpisodePress : undefined}
            onChangeEpisodePress={canLinkAppointment ? handleLinkEpisodePress : undefined}
          />
        </View>

        {/* CLIENT SECTION */}
        <View style={styles.section} data-testid="detail-client-section">
          <SectionHeader title={t('common.client') || 'Client'} icon="person" />
          <View style={styles.clientCard}>
            <View style={styles.clientMainInfo}>
              <Text style={styles.clientName} data-testid="detail-client-name">
                {displayClientName}
              </Text>
              {displayClientPhone && (
                <Text style={styles.clientPhone} data-testid="detail-client-phone">
                  {displayClientPhone}
                </Text>
              )}
            </View>
            {/* Quick Call Action - Always show if user has permission */}
            {canCall && (
              <TouchableOpacity 
                style={[styles.callButton, !displayClientPhone && { opacity: 0.5, backgroundColor: colors.grey[400] }]}
                onPress={handleCallClient}
                disabled={!displayClientPhone}
                accessibilityLabel={t('appointments.callClient') || 'Call client'}
                data-testid="detail-call-button"
              >
                <Ionicons name="call" size={20} color={colors.background.default} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* VISITS IN THIS EPISODE SECTION (Replaces "Previous Visits") */}
        {/* BUG FIX #1: Only show this section if there are previous visits (episodeAppointments.length > 0) */}
        {episodeId && episodeAppointments.length > 0 && (
          <View style={styles.section} data-testid="detail-visit-history-section">
            <SectionHeader 
              title={t('episodes.visitsInEpisode') || 'Visits in This Episode'} 
              icon="time" 
            />
            
            {/* Show visits in this episode */}
            {isEpisodeAppointmentsLoading ? (
              <View style={styles.emptyVisitHistory}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.emptyVisitHistoryText}>
                  {t('common.loading') || 'Loading...'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.visitHistoryContainer}>
                  {episodeAppointments.map((historyItem: any) => (
                    <VisitHistoryCard
                      key={historyItem.id}
                      appointment={historyItem}
                      onPress={() => handleVisitHistoryPress(historyItem.id)}
                      t={t}
                    />
                  ))}
                </View>
                {/* Footer link to view all episodes */}
                <TouchableOpacity
                  style={styles.viewAllEpisodesLink}
                  onPress={() => router.push(`/clinic-admin/clients/${clientId}?tab=episodes` as any)}
                >
                  <Text style={styles.viewAllEpisodesText}>
                    {t('episodes.viewAllEpisodes') || 'View all episodes for this client'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary.main} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Notes Section (keep if exists) */}
        {appointment.notes && (
          <View style={styles.section}>
            <SectionHeader title={t('common.notes') || 'Notes'} icon="document-text" />
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.metaSection}>
          {appointment.created_at && (
            <Text style={styles.metaText}>
              {t('common.created')}: {formatDate(appointment.created_at)}
            </Text>
          )}
          {appointment.updated_at && (
            <Text style={styles.metaText}>
              {t('common.updated')}: {formatDate(appointment.updated_at)}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Reschedule Date Picker */}
      {showReschedulePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t('appointments.selectNewDate')}</Text>
            <CrossPlatformDateTimePicker
              value={rescheduleDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event: DateTimePickerEvent, date?: Date) => {
                if (event.type === 'dismissed') {
                  setShowReschedulePicker(false);
                  return;
                }
                if (date) {
                  setRescheduleDate(date);
                  if (Platform.OS === 'android') {
                    setShowReschedulePicker(false);
                    setRescheduleTime(new Date(appointment.appointment_start));
                    setShowRescheduleTime(true);
                  }
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerButtons}>
                <TouchableOpacity
                  style={styles.pickerCancelButton}
                  onPress={() => setShowReschedulePicker(false)}
                >
                  <Text style={styles.pickerCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerConfirmButton}
                  onPress={() => {
                    setShowReschedulePicker(false);
                    setRescheduleTime(new Date(appointment.appointment_start));
                    setShowRescheduleTime(true);
                  }}
                >
                  <Text style={styles.pickerConfirmText}>{t('common.next')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Reschedule Time Picker */}
      {showRescheduleTime && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>{t('appointments.selectNewTime')}</Text>
            <CrossPlatformDateTimePicker
              value={rescheduleTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: DateTimePickerEvent, time?: Date) => {
                if (event.type === 'dismissed') {
                  setShowRescheduleTime(false);
                  return;
                }
                if (time) {
                  setRescheduleTime(time);
                  if (Platform.OS === 'android') {
                    setShowRescheduleTime(false);
                    confirmReschedule();
                  }
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerButtons}>
                <TouchableOpacity
                  style={styles.pickerCancelButton}
                  onPress={() => setShowRescheduleTime(false)}
                >
                  <Text style={styles.pickerCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerConfirmButton}
                  onPress={confirmReschedule}
                >
                  <Text style={styles.pickerConfirmText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h6,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  whatsappButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },

  // Status Section
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.body2,
    fontWeight: '600',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  sessionBadgeText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Client Card
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  clientMainInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  clientPhone: {
    ...typography.body2,
    color: colors.primary.main,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success.main,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Visit History - B2 Enhanced Cards
  visitHistoryContainer: {
    gap: spacing.sm,
  },
  visitCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: 'relative',
  },
  visitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  visitCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  visitCardDate: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  visitCardTime: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  visitCardStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 8,
  },
  visitCardStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  visitCardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  visitCardType: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visitCardTreatment: {
    ...typography.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
  visitCardLinksRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  visitCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  visitCardLinkActive: {
    // Active links have colored text via inline style
  },
  visitCardLinkText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  visitCardLinkTextActive: {
    color: colors.primary.main,
  },
  // FIX #3: Case Sheet & Prescription button styles
  visitCardLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.grey[100],
  },
  visitCardLinkButtonActive: {
    backgroundColor: colors.primary.main + '10',
  },
  visitCardPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  visitCardPaymentText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  visitCardPaymentActive: {
    color: colors.success.main,
  },
  visitCardArrow: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -9,
  },
  emptyVisitHistory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyVisitHistoryText: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
  // View all episodes link
  viewAllEpisodesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  viewAllEpisodesText: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
  },
  // No episode visits container
  noEpisodeVisitsContainer: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.md,
  },
  noEpisodeVisitsMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noEpisodeVisitsTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  noEpisodeVisitsText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  noEpisodeVisitsHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  noEpisodeVisitsCTAs: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    justifyContent: 'center',
  },
  ctaButtonPrimary: {
    borderWidth: 0,
  },
  ctaButtonText: {
    ...typography.body2,
    fontWeight: '600',
  },
  // Visit History Meta (Prescription/Payment info - User Requirement #2)
  visitHistoryMeta: {
    marginTop: 2,
  },
  visitHistoryMetaText: {
    ...typography.caption,
    fontSize: 11,
  },
  visitHistoryMetaPresent: {
    color: colors.success.main,
  },
  visitHistoryMetaAbsent: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  visitHistoryStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 8,
  },
  visitHistoryStatusText: {
    ...typography.caption,
    fontWeight: '500',
  },

  // Card
  card: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.main + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.body1,
    color: colors.text.primary,
    marginTop: 2,
  },

  // Notes Card
  notesCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  notesText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
  },

  // Actions
  actionsContainer: {
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
    minHeight: 44,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...typography.body2,
    fontWeight: '600',
  },
  // BUG FIX #3: Empty state for actions
  actionsEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.grey[100],
    borderRadius: 8,
    padding: spacing.md,
  },
  actionsEmptyText: {
    ...typography.body2,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Meta
  metaSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: 4,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.default,
  },

  // Picker Overlay
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  pickerTitle: {
    ...typography.h6,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pickerCancelButton: {
    padding: spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  pickerCancelText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  pickerConfirmButton: {
    padding: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    minWidth: 100,
    alignItems: 'center',
  },
  pickerConfirmText: {
    ...typography.button,
    color: colors.background.default,
  },
});

export default AppointmentDetailScreen;
