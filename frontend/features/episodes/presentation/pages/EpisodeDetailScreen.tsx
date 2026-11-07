/**
 * Episode Detail Screen
 * Displays comprehensive episode information with visits and documents
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import {
  useEpisodeQuery,
  useEpisodeDetailsQuery,
  useCloseEpisodeMutation,
  useReopenEpisodeMutation,
  useUpdateEpisodeMutation,
} from '../../data/repositories/episodes.repository.impl';
import { EpisodeStatusBadge } from '../components/EpisodeStatusBadge';
import { EpisodeDetailMetadataGrid } from '../components/EpisodeDetailMetadataGrid';
import { EpisodeFormModal } from '../components/EpisodeFormModal';
import { TreatmentPlansSection } from '../components/TreatmentPlansSection';
import { TreatmentSheetsSection } from '../components/TreatmentSheetsSection';
import { formatEpisodeDate, EpisodeUpdateRequest } from '../../data/models/episodes.dtos';
import { useAppointmentsListQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { AppointmentResponse } from '../../../appointments/data/models/appointments.dtos';
import { formatDate, formatTime } from '../../../../core/utils/dateTimeUtils';
import { getStatusLabel, getStatusColor, getStaffName } from '../../../appointments/domain/helpers';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';

// ============================================
// TYPES
// ============================================

interface EpisodeDetailScreenProps {
  tenantId: string;
  episodeId: string;
  onNavigateToAppointment?: (appointmentId: string) => void;
  onNavigateToCasesheet?: (casesheetId: string) => void;
  onNavigateToTreatmentSheet?: (treatmentSheetId: string) => void;
  onNavigateToPrescription?: (prescriptionId: string) => void;
  onCreateCasesheet?: () => void;
  onCreateTreatmentSheet?: () => void;
  onCreatePrescription?: (appointmentId: string) => void;
  onBack?: () => void;
}

// ============================================
// VISIT ITEM COMPONENT WITH PRESCRIPTION AND PAYMENT
// ============================================

interface VisitItemProps {
  appointment: AppointmentResponse;
  onVisitPress?: () => void;
  onPrescriptionPress?: () => void;
  onCreatePrescription?: () => void;
  hasPrescription: boolean;
}

const VisitItem: React.FC<VisitItemProps> = ({
  appointment,
  onVisitPress,
  onPrescriptionPress,
  onCreatePrescription,
  hasPrescription,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const statusColor = getStatusColor(appointment.status);

  return (
    <View style={[styles.visitCard, { backgroundColor: theme.colors.background.default }]}>
      {/* Visit Header - Clickable */}
      <TouchableOpacity
        style={styles.visitHeader}
        onPress={onVisitPress}
        activeOpacity={0.7}
      >
        <View style={styles.visitDateTimeContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDate, { color: theme.colors.text.primary }]}>
            {formatDate(appointment.appointment_start)}
          </Text>
          <Ionicons name="time-outline" size={16} color={theme.colors.text.tertiary} style={styles.timeIcon} />
          <Text style={[styles.visitTime, { color: theme.colors.text.secondary }]}>
            {formatTime(appointment.appointment_start)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(appointment.status)}
          </Text>
        </View>
      </TouchableOpacity>

      {getStaffName(appointment) !== 'Unassigned' && (
        <View style={styles.visitDetail}>
          <Ionicons name="person-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDetailText, { color: theme.colors.text.secondary }]}>
            {getStaffName(appointment)}
          </Text>
        </View>
      )}

      {appointment.treatment_name && (
        <View style={styles.visitDetail}>
          <Ionicons name="medical-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDetailText, { color: theme.colors.text.secondary }]}>
            {appointment.treatment_name}
          </Text>
        </View>
      )}

      {/* Document Actions */}
      <View style={styles.documentActions}>
        {/* Row 1: Prescription */}
        <TouchableOpacity
          style={[styles.documentActionButton, { borderColor: theme.colors.border.default }]}
          onPress={() => {
            console.log('[VisitItem] Prescription button pressed, hasPrescription:', hasPrescription);
            if (hasPrescription) {
              onPrescriptionPress?.();
            } else {
              onCreatePrescription?.();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={hasPrescription ? 'document-text' : 'add-circle-outline'}
            size={20}
            color={theme.colors.primary.default}
          />
          <Text style={[styles.documentActionText, { color: theme.colors.primary.default }]}>
            {hasPrescription ? t('episodes.viewPrescription') : t('episodes.addPrescription')}
          </Text>
        </TouchableOpacity>

        {/* Row 2: Payment Details */}
        <TouchableOpacity
          style={[styles.documentActionButton, { borderColor: theme.colors.border.default }]}
          onPress={() => {
            console.log('[VisitItem] Payment details button pressed for appointment:', appointment.id);
            // TODO: Navigate to payment details or show payment info
            Alert.alert(
              'Payment Details',
              'Payment details screen is not yet implemented. This will show payment information for this visit.',
              [{ text: 'OK' }]
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="cash-outline" size={20} color={theme.colors.text.secondary} />
          <Text style={[styles.documentActionText, { color: theme.colors.text.secondary }]}>
            {t('episodes.paymentDetails')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// CLOSE EPISODE DIALOG
// ============================================

interface CloseEpisodeDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  loading: boolean;
}

const CloseEpisodeDialog: React.FC<CloseEpisodeDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  loading,
}) => {
  const theme = useClinicTheme();
  const [notes, setNotes] = useState('');

  if (!visible) return null;

  return (
    <View style={styles.dialogOverlay}>
      <View style={[styles.dialogContainer, { backgroundColor: theme.colors.background.default }]}>
        <Text style={[styles.dialogTitle, { color: theme.colors.text.primary }]}>
          Close Episode
        </Text>
        <Text style={[styles.dialogMessage, { color: theme.colors.text.secondary }]}>
          Are you sure you want to close this episode? No new appointments can be linked after closing.
        </Text>
        
        {/* Optional notes field - placeholder for future implementation */}
        
        <View style={styles.dialogActions}>
          <TouchableOpacity
            style={[styles.dialogButton, { borderColor: theme.colors.border.default }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.dialogButtonText, { color: theme.colors.text.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dialogButton, styles.dialogButtonPrimary, { backgroundColor: theme.colors.feedback.error }]}
            onPress={() => onConfirm(notes || undefined)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.background.default} />
            ) : (
              <Text style={[styles.dialogButtonText, { color: theme.colors.background.default }]}>
                Close Episode
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EpisodeDetailScreen: React.FC<EpisodeDetailScreenProps> = ({
  tenantId,
  episodeId,
  onNavigateToAppointment,
  onNavigateToCasesheet,
  onNavigateToTreatmentSheet,
  onNavigateToPrescription,
  onCreateCasesheet,
  onCreateTreatmentSheet,
  onCreatePrescription,
  onBack,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCloseDialogVisible, setIsCloseDialogVisible] = useState(false);

  // Fetch episode data
  const {
    data: episode,
    isLoading,
    error,
    refetch,
  } = useEpisodeQuery(tenantId, episodeId);

  // Fetch comprehensive episode details (documents and visits)
  const {
    data: episodeDetails,
    isLoading: isDetailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useEpisodeDetailsQuery(tenantId, episodeId);

  // Refetch episode details whenever this screen regains focus. Expo Router
  // does NOT unmount this screen when navigating forward (e.g. to "Add Case
  // Sheet" and back) — it stays mounted underneath, so `refetchOnMount`
  // never fires on return. Without this, the casesheet/treatment-sheet
  // existence flags stay stale after creating a document elsewhere and
  // returning, leaving the "Add Case Sheet" button showing even though one
  // now exists (and a second tap re-POSTs, which the backend correctly
  // rejects as a duplicate).
  //
  // T-A.4 (FR-A5): guarded on isAuthenticated — refetch() bypasses the
  // query's `enabled` guard, so without this check a focus event firing
  // during/after logout could still issue a request. Matches the same
  // pattern already used in app/clinic-admin/index.tsx and SetupWizardFlow.tsx.
  useFocusEffect(
    useCallback(() => {
      if (tenantId && episodeId && isAuthenticated) {
        refetchDetails();
      }
    }, [tenantId, episodeId, isAuthenticated, refetchDetails])
  );

  // Debug log the full API response
  React.useEffect(() => {
    if (episodeDetails) {
      console.log('[EpisodeDetail] Full episode details response:', JSON.stringify(episodeDetails, null, 2));
      console.log('[EpisodeDetail] Documents object:', episodeDetails.documents);
      console.log('[EpisodeDetail] Casesheet object:', episodeDetails.documents?.casesheet);
      console.log('[EpisodeDetail] Casesheet exists:', episodeDetails.documents?.casesheet?.exists);
      console.log('[EpisodeDetail] Casesheet ID:', episodeDetails.documents?.casesheet?.id);
    }
  }, [episodeDetails]);

  // Extract document and visit information from details
  // Check multiple possible response structures for robustness
  const hasCasesheet = Boolean(
    episodeDetails?.documents?.casesheet?.exists || 
    episodeDetails?.documents?.casesheet?.id ||
    (episodeDetails as any)?.has_casesheet // Fallback for different backend structure
  );
  const hasTreatmentSheet = Boolean(
    episodeDetails?.documents?.treatment_sheet?.exists || 
    episodeDetails?.documents?.treatment_sheet?.id ||
    (episodeDetails as any)?.has_treatment_sheet // Fallback for different backend structure
  );
  const casesheetId = episodeDetails?.documents?.casesheet?.id || null;
  const treatmentSheetId = episodeDetails?.documents?.treatment_sheet?.id || null;
  
  // Debug log extracted values
  React.useEffect(() => {
    console.log('[EpisodeDetail] Extracted values:', {
      hasCasesheet,
      hasTreatmentSheet,
      casesheetId,
      treatmentSheetId,
    });
  }, [hasCasesheet, hasTreatmentSheet, casesheetId, treatmentSheetId]);
  
  // Function to get prescription ID for a visit
  const getPrescriptionForVisit = (appointmentId: string) => {
    const visit = episodeDetails?.visits?.find(v => v.appointment_id === appointmentId);
    return visit?.prescription?.id || null;
  };

  // Function to check if visit has prescription
  const hasPrescriptionForVisit = (appointmentId: string) => {
    const visit = episodeDetails?.visits?.find(v => v.appointment_id === appointmentId);
    return visit?.prescription?.exists || false;
  };

  // Fetch visits/appointments for this episode
  const {
    data: visitsData,
    isLoading: visitsLoading,
    error: visitsError,
    refetch: refetchVisits,
  } = useAppointmentsListQuery(
    tenantId,
    { episode_id: episodeId, skip: 0, limit: 50 },
    { enabled: !!tenantId && !!episodeId }
  );

  // Mutations
  const closeEpisodeMutation = useCloseEpisodeMutation();
  const reopenEpisodeMutation = useReopenEpisodeMutation();
  const updateEpisodeMutation = useUpdateEpisodeMutation();

  // Handlers
  const handleEdit = () => {
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async (data: any) => {
    await updateEpisodeMutation.mutateAsync({
      tenantId,
      episodeId,
      data: data as EpisodeUpdateRequest,
    });
    setIsEditModalVisible(false);
    refetch();
  };

  const handleCloseEpisode = () => {
    setIsCloseDialogVisible(true);
  };

  const handleConfirmClose = async (notes?: string) => {
    try {
      await closeEpisodeMutation.mutateAsync({
        tenantId,
        episodeId,
        notes,
      });
      setIsCloseDialogVisible(false);
      Alert.alert('Success', 'Episode closed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to close episode. Please try again.');
    }
  };

  const handleReopenEpisode = () => {
    Alert.alert(
      'Reopen Episode',
      'Are you sure you want to reopen this episode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: async () => {
            try {
              await reopenEpisodeMutation.mutateAsync({
                tenantId,
                episodeId,
              });
              Alert.alert('Success', 'Episode reopened successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to reopen episode. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    refetch();
    refetchDetails();
    refetchVisits();
  };

  const visits = visitsData?.items || [];

  // Loading state
  if (isLoading || isDetailsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading episode details...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || detailsError || !episode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.feedback.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Failed to Load Episode
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.text.secondary }]}>
            Unable to load episode details. Please try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary.default}
          />
        }
      >
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.default }]}>
          {/* Back Button */}
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          )}

          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {episode.title}
              </Text>
              <EpisodeStatusBadge status={episode.status} />
            </View>
            <TouchableOpacity
              style={[styles.editButton, { borderColor: theme.colors.border.default }]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.primary.default} />
              <Text style={[styles.editButtonText, { color: theme.colors.primary.default }]}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          {episode.description && (
            <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
              {episode.description}
            </Text>
          )}

          {/* Episode Metadata */}
          <EpisodeDetailMetadataGrid
            startDateText={formatEpisodeDate(episode.start_date)}
            endDateText={episode.end_date ? formatEpisodeDate(episode.end_date) : undefined}
            lastVisitDateText={episode.last_visit_date ? formatEpisodeDate(episode.last_visit_date) : undefined}
            showEndDate={Boolean(episode.end_date)}
            showLastVisit={Boolean(episode.last_visit_date)}
            visitsCount={episode.visits_count}
            textColors={theme.colors.text}
          />

          {/* Diagnosis Code */}
          {episode.episode_code && (
            <View style={styles.diagnosisContainer}>
              <Ionicons name="medical-outline" size={16} color={theme.colors.text.tertiary} />
              <View style={styles.diagnosisContent}>
                <Text style={[styles.diagnosisLabel, { color: theme.colors.text.tertiary }]}>
                  Diagnosis Code
                </Text>
                <Text style={[styles.diagnosisValue, { color: theme.colors.text.primary }]}>
                  {episode.episode_code}
                  {episode.episode_code_system && ` (${episode.episode_code_system})`}
                </Text>
                {episode.episode_code_display && (
                  <Text style={[styles.diagnosisDisplay, { color: theme.colors.text.secondary }]}>
                    {episode.episode_code_display}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Episode-Level Documents Section */}
        <View style={[styles.documentsSection, { backgroundColor: theme.colors.background.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Episode Documents
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
            One casesheet per episode, updated across all visits
          </Text>

          <View style={styles.documentButtonsRow}>
            {/* Casesheet Button */}
            <TouchableOpacity
              style={[
                styles.documentButton,
                { 
                  backgroundColor: hasCasesheet 
                    ? theme.colors.background.default 
                    : theme.colors.primary.default,
                  borderColor: theme.colors.border.default,
                  borderWidth: hasCasesheet ? 1 : 0,
                }
              ]}
              onPress={() => {
                console.log('[EpisodeDetail] Casesheet button pressed, hasCasesheet:', hasCasesheet, 'casesheetId:', casesheetId);
                if (hasCasesheet && casesheetId) {
                  onNavigateToCasesheet?.(casesheetId);
                } else {
                  onCreateCasesheet?.();
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.documentButtonContent}>
                <Ionicons
                  name={hasCasesheet ? 'document-text' : 'add-circle'}
                  size={20}
                  color={hasCasesheet ? theme.colors.primary.default : theme.colors.background.default}
                />
                <Text
                  style={[
                    styles.documentButtonText,
                    { color: hasCasesheet ? theme.colors.primary.default : theme.colors.background.default }
                  ]}
                >
                  {hasCasesheet ? t('episodes.viewCasesheet') : t('episodes.addCasesheet')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.documentNote, { color: theme.colors.text.tertiary }]}>
            Treatment sheets are created from the casesheet
          </Text>
        </View>

        {/* Treatment Plans Section */}
        <TreatmentPlansSection
          episodeId={episodeId}
        />

        {/* Treatment Sheets Section */}
        <TreatmentSheetsSection
          tenantId={tenantId}
          episodeId={episodeId}
          onNavigateToSheet={(sheetId) => {
            console.log('Navigate to treatment sheet:', sheetId);
            onNavigateToTreatmentSheet?.(sheetId);
          }}
        />

        {/* Visits Section */}
        <View style={styles.visitsSection}>
          <View style={styles.visitsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              {t('episodes.visitsInEpisode')}
            </Text>
            {visits.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.colors.primary.light }]}>
                <Text style={[styles.countText, { color: theme.colors.primary.default }]}>
                  {visits.length}
                </Text>
              </View>
            )}
          </View>

          {visitsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.default} />
              <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
                Loading visits...
              </Text>
            </View>
          ) : visitsError ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.feedback.error} />
              <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
                Failed to load visits
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
                onPress={() => refetchVisits()}
              >
                <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
                  {t('common.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : visits.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
                {t('episodes.noVisitsInEpisode')}
              </Text>
            </View>
          ) : (
            <View style={styles.visitsList}>
              {visits.map((visit) => (
                <VisitItem
                  key={visit.id}
                  appointment={visit}
                  onVisitPress={() => onNavigateToAppointment?.(visit.id)}
                  onPrescriptionPress={() => {
                    const prescriptionId = getPrescriptionForVisit(visit.id);
                    if (prescriptionId) {
                      onNavigateToPrescription?.(prescriptionId);
                    }
                  }}
                  onCreatePrescription={() => onCreatePrescription?.(visit.id)}
                  hasPrescription={hasPrescriptionForVisit(visit.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Danger Zone - At Bottom */}
        <View style={[styles.dangerZone, { backgroundColor: theme.colors.background.default, borderColor: theme.colors.feedback.error }]}>
          <Text style={[styles.dangerZoneTitle, { color: theme.colors.feedback.error }]}>
            {t('episodes.dangerZone')}
          </Text>
          
          {episode.status === 'ACTIVE' && (
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: theme.colors.feedback.error }]}
              onPress={handleCloseEpisode}
              disabled={closeEpisodeMutation.isPending}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.background.default} />
              <Text style={[styles.dangerButtonText, { color: theme.colors.background.default }]}>
                Close Episode
              </Text>
            </TouchableOpacity>
          )}

          {episode.status === 'CLOSED' && (
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: theme.colors.feedback.success }]}
              onPress={handleReopenEpisode}
              disabled={reopenEpisodeMutation.isPending}
            >
              <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.background.default} />
              <Text style={[styles.dangerButtonText, { color: theme.colors.background.default }]}>
                Reopen Episode
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <EpisodeFormModal
        visible={isEditModalVisible}
        mode="edit"
        initialData={episode}
        onClose={() => setIsEditModalVisible(false)}
        onSubmit={handleEditSubmit}
        isLoading={updateEpisodeMutation.isPending}
      />

      {/* Close Episode Dialog */}
      <CloseEpisodeDialog
        visible={isCloseDialogVisible}
        onClose={() => setIsCloseDialogVisible(false)}
        onConfirm={handleConfirmClose}
        loading={closeEpisodeMutation.isPending}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diagnosisContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 8,
    marginBottom: 16,
  },
  diagnosisContent: {
    flex: 1,
  },
  diagnosisLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  diagnosisValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  diagnosisDisplay: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  documentsSection: {
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  documentButtonsRow: {
    flexDirection: 'column',
    gap: 12,
  },
  documentButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  documentNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  visitsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  visitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  visitsList: {
    gap: 16,
  },
  visitCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  visitHeader: {
    marginBottom: 8,
  },
  visitDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeIcon: {
    marginLeft: 8,
  },
  visitTime: {
    fontSize: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  visitDetailText: {
    fontSize: 13,
  },
  documentActions: {
    marginTop: 12,
    gap: 8,
  },
  documentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  documentActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
  },
  dangerZone: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  dialogMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dialogButtonPrimary: {
    borderWidth: 0,
  },
  dialogButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
