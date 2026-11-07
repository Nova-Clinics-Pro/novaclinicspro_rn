import { useRouter } from 'expo-router';
import { toDoctorDashboardError } from './doctorDashboardError';
import { episodeWorkspaceRoute, startConsultationRoute } from './consultationRoutes';

type Router = ReturnType<typeof useRouter>;

export interface CaseResolverState {
  loadingAppointmentId: string | null;
  error: { appointmentId: string; message: string } | null;
}

/**
 * Tenant-scoped commands supplied by the screen's canonical repository/query
 * boundary. This application service only coordinates the clinical decision.
 */
export interface CaseResolverOperations {
  getAppointment: (tenantId: string, appointmentId: string) => Promise<{ episode_id?: string | null }>;
  listActiveEpisodes: (
    tenantId: string,
    clientId: string,
  ) => Promise<{ items: Array<{ id: string }> }>;
  attachEpisode: (tenantId: string, appointmentId: string, episodeId: string) => Promise<void>;
}

export async function resolveCase(
  tenantId: string,
  appointmentId: string,
  clientId: string,
  router: Pick<Router, 'push'>,
  operations: CaseResolverOperations,
): Promise<void> {
  const appointment = await operations.getAppointment(tenantId, appointmentId);
  const linkedEpisodeId = appointment.episode_id;

  if (linkedEpisodeId) {
    router.push(episodeWorkspaceRoute(linkedEpisodeId, appointmentId, clientId, 'doctor') as any);
    return;
  }

  const episodesResponse = await operations.listActiveEpisodes(tenantId, clientId);

  if (episodesResponse.items.length > 0) {
    const episode = episodesResponse.items[0];
    await operations.attachEpisode(tenantId, appointmentId, episode.id);
    router.push(episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor') as any);
    return;
  }

  router.push(startConsultationRoute(appointmentId, clientId) as any);
}

export async function startConsultationWithGuard(params: {
  tenantId: string;
  appointmentId: string;
  clientId: string;
  router: Pick<Router, 'push'>;
  operations: CaseResolverOperations;
  loadingAppointmentId: string | null;
  setState: (state: CaseResolverState | ((prev: CaseResolverState) => CaseResolverState)) => void;
}): Promise<void> {
  const { tenantId, appointmentId, clientId, router, operations, loadingAppointmentId, setState } = params;
  if (loadingAppointmentId !== null) return;

  setState({ loadingAppointmentId: appointmentId, error: null });
  try {
    await resolveCase(tenantId, appointmentId, clientId, router, operations);
  } catch (err: unknown) {
    setState((prev) => ({
      ...prev,
      error: { appointmentId, message: toDoctorDashboardError(err).message },
    }));
  } finally {
    setState((prev) => ({ ...prev, loadingAppointmentId: null }));
  }
}
