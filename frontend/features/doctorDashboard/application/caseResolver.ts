import { useRouter } from 'expo-router';
import { axiosClient } from '../../../core/api/axiosClient';
import { episodeWorkspaceRoute, startConsultationRoute } from './consultationRoutes';

export interface CaseResolverState {
  loadingAppointmentId: string | null;
  error: { appointmentId: string; message: string } | null;
}

export async function resolveCase(
  tenantId: string,
  appointmentId: string,
  clientId: string,
  router: Pick<ReturnType<typeof useRouter>, 'push'>,
): Promise<void> {
  const appointmentResponse = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/appointments/${appointmentId}`,
    { params: { expand: 'staff' } },
  );
  const linkedEpisodeId = appointmentResponse.data?.episode_id;

  if (linkedEpisodeId) {
    router.push(episodeWorkspaceRoute(linkedEpisodeId, appointmentId, clientId, 'doctor') as any);
    return;
  }

  const episodesResponse = await axiosClient.get(
    `/api/v1/clinic/${tenantId}/episodes?client_id=${clientId}&status=ACTIVE&limit=1`,
  );

  if (episodesResponse.data.total > 0) {
    const episode = episodesResponse.data.items[0];
    await axiosClient.post(
      `/api/v1/clinic/${tenantId}/appointments/${appointmentId}/attach-episode`,
      { episode_id: episode.id },
    );
    router.push(episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor') as any);
    return;
  }

  router.push(startConsultationRoute(appointmentId, clientId) as any);
}

export async function startConsultationWithGuard(params: {
  tenantId: string;
  appointmentId: string;
  clientId: string;
  router: Pick<ReturnType<typeof useRouter>, 'push'>;
  loadingAppointmentId: string | null;
  setState: (state: CaseResolverState | ((prev: CaseResolverState) => CaseResolverState)) => void;
}): Promise<void> {
  const { tenantId, appointmentId, clientId, router, loadingAppointmentId, setState } = params;
  if (loadingAppointmentId !== null) return;

  setState({ loadingAppointmentId: appointmentId, error: null });
  try {
    await resolveCase(tenantId, appointmentId, clientId, router);
  } catch (err: any) {
    setState((prev) => ({
      ...prev,
      error: { appointmentId, message: err?.message || 'Something went wrong. Please retry.' },
    }));
  } finally {
    setState((prev) => ({ ...prev, loadingAppointmentId: null }));
  }
}
