/**
 * Multi-Day Treatment Section Component
 * Displays treatment series information when an appointment is part of a multi-day treatment
 * 
 * Features:
 * - Shows treatment series name and progress
 * - Displays day number (e.g., "Day 8 of 21")
 * - Shows treatment plan from previous row
 * - Action buttons (View Full Treatment Sheet, Document Today's Treatment)
 * - Loading skeleton and conditional rendering
 * 
 * Task: F2.3 - Appointment Detail Page Integration
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTreatmentSheetDetailQuery } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { ProgressBar } from '../../../treatmentSheets/presentation/components/ProgressBar';
import { TreatmentSheetRowResponse } from '../../../treatmentSheets/data/models/treatmentSheets.dtos';

// ============================================
// TYPES
// ============================================

interface MultiDayTreatmentSectionProps {
  /** Appointment ID to check for multi-day treatment linkage */
  appointmentId: string;
  /** Treatment sheet ID (if available from appointment) */
  treatmentSheetId?: string | null;
  /** Session ID (if available from appointment) */
  sessionId?: string | null;
}

// ============================================
// COMPONENT
// ============================================

export const MultiDayTreatmentSection: React.FC<MultiDayTreatmentSectionProps> = ({
  appointmentId,
  treatmentSheetId,
  sessionId,
}) => {
  const theme = useClinicTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const isAdmin = ['clinic_admin', 'clinic admin', 'receptionist'].includes(
    (currentUser?.roles?.[0] || '').toLowerCase()
  );

  // Only fetch if we have a treatment sheet ID
  const {
    data: treatmentSheet,
    isLoading,
    isError,
  } = useTreatmentSheetDetailQuery(treatmentSheetId || '', tenantId, {
    enabled: !!treatmentSheetId,
  });

  // Don't render if no treatment sheet ID
  if (!treatmentSheetId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface.elevated, borderColor: theme.colors.border.default }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary.default} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Loading treatment information...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Error or no data - silently hide section
  if (isError || !treatmentSheet) {
    return null;
  }

  // Find the current row by session_id
  const currentRow = treatmentSheet.rows?.find((row: TreatmentSheetRowResponse) => row.session_id === sessionId);

  // Calculate progress
  const completedDays = treatmentSheet.rows?.filter((row: TreatmentSheetRowResponse) =>
    row.treatment_description && row.treatment_description.trim() !== ''
  ).length || 0;
  const totalDays = treatmentSheet.duration_days || treatmentSheet.rows?.length || 0;
  const progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  // For DRAFT/ORDERED sheets there are no sessions yet — still show the card
  // so admin can schedule. Only hide if we have rows AND none match (stale session_id).
  const hasRows = (treatmentSheet.rows?.length ?? 0) > 0;
  const isDraftOrOrdered = treatmentSheet.status === 'DRAFT' || (treatmentSheet as any).state === 'ORDERED';
  if (!currentRow && hasRows && !isDraftOrOrdered) {
    return null;
  }

  // Get treatment plan from previous row (if available)
  const previousRow = treatmentSheet.rows?.find((row: TreatmentSheetRowResponse) => 
    row.day_number === (currentRow?.day_number ?? 0) - 1
  );
  const treatmentPlan = previousRow?.treatment_description || currentRow?.treatment_description;

  // Get treatment series name
  const treatmentName = (treatmentSheet as any).proposal?.name || 'Multi-Day Treatment';
  const sheetStatus: string = treatmentSheet.status ?? (treatmentSheet as any).state ?? 'DRAFT';
  const isOrderedOrDraft = sheetStatus === 'DRAFT' || sheetStatus === 'ORDERED';
  const isScheduled = sheetStatus === 'SCHEDULED' || sheetStatus === 'IN_PROGRESS';

  // Handlers
  const handleViewSheet = () => {
    router.push({
      pathname: '/clinic-admin/treatment-sheets/[treatmentSheetId]',
      params: { treatmentSheetId: treatmentSheet.id },
    });
  };

  const handleSchedulePlan = () => {
    // Reuse CreateAppointmentScreen (MULTI tab) pre-filled from the treatment sheet.
    router.push(
      `/clinic-admin/appointments/create?tab=MULTI&treatmentSheetId=${treatmentSheet.id}` as any
    );
  };

  const handleDocumentTreatment = () => {
    router.push({
      pathname: '/clinic-admin/treatment-sheets/[treatmentSheetId]',
      params: {
        treatmentSheetId: treatmentSheet.id,
        highlightRowId: currentRow?.id ?? '',
      },
    });
  };

  return (
    <View style={styles.section}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface.elevated, borderColor: theme.colors.border.default }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.feedback.info + '15' }]}>
            <Ionicons name="calendar" size={20} color={theme.colors.feedback.info} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Part of Multi-Day Treatment
          </Text>
        </View>

        {/* Treatment Name */}
        <Text style={[styles.treatmentName, { color: theme.colors.text.primary }]}>
          {treatmentName}
        </Text>

        {/* Day Number — only when we have a matched row */}
        {currentRow && (
          <Text style={[styles.dayNumber, { color: theme.colors.text.secondary }]}>
            This is Day {currentRow.day_number} of {totalDays}
          </Text>
        )}

        {/* Sessions summary when no current row */}
        {!currentRow && (
          <Text style={[styles.dayNumber, { color: theme.colors.text.secondary }]}>
            {totalDays} session{totalDays !== 1 ? 's' : ''} planned
            {isOrderedOrDraft ? ' · Pending scheduling' : ''}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.colors.text.secondary }]}>
              Progress
            </Text>
            <Text style={[styles.progressValue, { color: theme.colors.text.primary }]}>
              {Math.round(progressPercentage)}% complete
            </Text>
          </View>
          <ProgressBar progress={progressPercentage} height={8} />
        </View>

        {/* Treatment Plan — only when we have a matched row */}
        {treatmentPlan && currentRow && (
          <View style={styles.treatmentPlanSection}>
            <Text style={[styles.treatmentPlanLabel, { color: theme.colors.text.secondary }]}>
              Treatment Plan:
            </Text>
            <View style={styles.treatmentPlanContent}>
              {treatmentPlan.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => (
                <View key={index} style={styles.treatmentPlanItem}>
                  <Text style={[styles.bullet, { color: theme.colors.text.tertiary }]}>•</Text>
                  <Text style={[styles.treatmentPlanText, { color: theme.colors.text.primary }]}>
                    {line.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.default },
            ]}
            onPress={handleViewSheet}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={16} color={theme.colors.primary.default} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.primary.default }]}>
              View Treatment Sheet
            </Text>
          </TouchableOpacity>

          {/* Admin: Schedule Plan (DRAFT/ORDERED) or View Schedule (SCHEDULED/IN_PROGRESS) */}
          {isAdmin && isOrderedOrDraft && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#3B82F6' }]}
              onPress={handleSchedulePlan}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-number-outline" size={16} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                Schedule Plan
              </Text>
            </TouchableOpacity>
          )}

          {isAdmin && isScheduled && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#8B5CF6' }]}
              onPress={handleSchedulePlan}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                View / Edit Schedule
              </Text>
            </TouchableOpacity>
          )}

          {/* Doctor/Therapist: Document treatment */}
          {!isAdmin && currentRow && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary.default }]}
              onPress={handleDocumentTreatment}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.surface.elevated} />
              <Text style={[styles.primaryButtonText, { color: theme.colors.surface.elevated }]}>
                Document Today's Treatment
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 14,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  treatmentPlanSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  treatmentPlanLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  treatmentPlanContent: {
    gap: 6,
  },
  treatmentPlanItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  treatmentPlanText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionsRow: {
    gap: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
