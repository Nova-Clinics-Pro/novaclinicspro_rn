// Route: /clinic-admin/appointments/{appointmentId}/start-consultation?clientId={clientId}
import { useLocalSearchParams } from 'expo-router';
import { CreateConsultationScreen } from '../../../../features/episodes/presentation/pages/CreateConsultationScreen';
import { isCosV1Enabled, useFeatures } from '../../../../core/hooks/useFeatures';

export default function StartConsultationRoute() {
  const { appointmentId, clientId } = useLocalSearchParams<{
    appointmentId: string;
    clientId: string;
  }>();
  const cosEnabled = isCosV1Enabled(useFeatures());
  return (
    <CreateConsultationScreen
      appointmentId={appointmentId}
      clientId={clientId}
      destination={cosEnabled ? 'workspace' : 'consultation'}
    />
  );
}
