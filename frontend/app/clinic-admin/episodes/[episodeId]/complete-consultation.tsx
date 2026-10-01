// Route: /clinic-admin/episodes/{episodeId}/complete-consultation?appointmentId={id}&clientId={id}
import { Redirect, useLocalSearchParams } from 'expo-router';
import { CompleteConsultationScreen } from '../../../../features/episodes/presentation/pages/CompleteConsultationScreen';
import { isCosV1Enabled, useFeatures } from '../../../../core/hooks/useFeatures';
import { episodeWorkspaceRoute } from '../../../../features/doctorDashboard/application/consultationRoutes';

export default function CompleteConsultationRoute() {
  const { episodeId, appointmentId, clientId } = useLocalSearchParams<{
    episodeId: string;
    appointmentId: string;
    clientId: string;
  }>();
  if (isCosV1Enabled(useFeatures())) {
    return (
      <Redirect
        href={episodeWorkspaceRoute(
          episodeId,
          appointmentId,
          clientId,
          'doctor',
          'completion',
        ) as never}
      />
    );
  }
  return (
    <CompleteConsultationScreen
      episodeId={episodeId}
      appointmentId={appointmentId}
      clientId={clientId}
    />
  );
}
