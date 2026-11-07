/**
 * Episode Detail Page
 * Full-page view of a single episode with visits and documents
 */

import React from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EpisodeDetailScreen } from '../../../../features/episodes/presentation/pages/EpisodeDetailScreen';
import { useAuth } from '../../../../features/auth/presentation/hooks/useAuth';
import { useEpisodeDetailsQuery } from '../../../../features/episodes/data/repositories/episodes.repository.impl';

export default function EpisodeDetailPage() {
  const router = useRouter();
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Fetch episode details to get client info
  const { data: episodeDetails } = useEpisodeDetailsQuery(tenantId, episodeId || '');
  const clientId = episodeDetails?.episode?.client_id || '';

  const handleNavigateToAppointment = (appointmentId: string) => {
    router.push(`/clinic-admin/appointments/${appointmentId}` as any);
  };

  // Casesheet navigation
  const handleNavigateToCasesheet = (casesheetId: string) => {
    const resolvedClientId = episodeDetails?.episode?.client_id || clientId;
    if (!resolvedClientId) return;
    router.push(`/clinic-admin/clients/${resolvedClientId}/casesheets/${casesheetId}` as any);
  };

  const handleCreateCasesheet = () => {
    const resolvedClientId = episodeDetails?.episode?.client_id || clientId;
    if (!resolvedClientId) return;
    const firstVisit = episodeDetails?.visits?.[0];
    if (firstVisit) {
      router.push(`/clinic-admin/clients/${resolvedClientId}/casesheets/new?appointmentId=${firstVisit.appointment_id}&episodeId=${episodeId}` as any);
    } else {
      router.push(`/clinic-admin/clients/${resolvedClientId}/casesheets/new?episodeId=${episodeId}` as any);
    }
  };

  // Treatment sheet navigation
  const handleNavigateToTreatmentSheet = (treatmentSheetId: string) => {
    router.push(`/clinic-admin/clients/${clientId}/treatment-sheets/${treatmentSheetId}` as any);
  };

  const handleCreateTreatmentSheet = () => {
    // Treatment sheets require a casesheet
    // Check if episode has a casesheet
    const casesheetId = episodeDetails?.documents?.casesheet?.id;
    
    if (casesheetId) {
      // Navigate to casesheet detail where they can create treatment sheet
      router.push(`/clinic-admin/clients/${clientId}/casesheets/${casesheetId}` as any);
    } else {
      // No casesheet yet - need to create one first
      Alert.alert(
        'Casesheet Required',
        'A casesheet is required before creating a treatment sheet. Would you like to create a casesheet first?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Casesheet', 
            onPress: () => {
              const firstVisit = episodeDetails?.visits?.[0];
              if (firstVisit) {
                router.push(`/clinic-admin/clients/${clientId}/casesheets/new?appointmentId=${firstVisit.appointment_id}&episodeId=${episodeId}` as any);
              } else {
                router.push(`/clinic-admin/clients/${clientId}/casesheets/new?episodeId=${episodeId}` as any);
              }
            }
          },
        ]
      );
    }
  };

  // Prescription navigation
  const handleNavigateToPrescription = (prescriptionId: string) => {
    router.push(`/clinic-admin/clients/${clientId}/prescriptions/${prescriptionId}` as any);
  };

  const handleCreatePrescription = (appointmentId: string) => {
    // Navigate to create prescription with appointmentId
    router.push(`/clinic-admin/clients/${clientId}/prescriptions/new?appointmentId=${appointmentId}` as any);
  };

  return (
    <EpisodeDetailScreen 
      tenantId={tenantId}
      episodeId={episodeId || ''} 
      onNavigateToAppointment={handleNavigateToAppointment}
      onNavigateToCasesheet={handleNavigateToCasesheet}
      onNavigateToTreatmentSheet={handleNavigateToTreatmentSheet}
      onNavigateToPrescription={handleNavigateToPrescription}
      onCreateCasesheet={handleCreateCasesheet}
      onCreateTreatmentSheet={handleCreateTreatmentSheet}
      onCreatePrescription={handleCreatePrescription}
      onBack={() => router.back()}
    />
  );
}
