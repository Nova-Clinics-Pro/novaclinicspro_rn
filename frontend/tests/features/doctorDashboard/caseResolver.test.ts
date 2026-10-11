import {
  CaseResolverOperations,
  resolveCase,
  startConsultationWithGuard,
} from '../../../features/doctorDashboard/application/caseResolver';

describe('Case Resolver', () => {
  const router = { push: jest.fn() };
  let operations: jest.Mocked<CaseResolverOperations>;

  beforeEach(() => {
    jest.clearAllMocks();
    operations = {
      getAppointment: jest.fn(),
      listActiveEpisodes: jest.fn(),
      attachEpisode: jest.fn(),
    };
  });

  it('attaches an active episode and navigates to the canonical workspace with explicit visit context', async () => {
    operations.getAppointment.mockResolvedValue({ episode_id: null });
    operations.listActiveEpisodes.mockResolvedValue({ items: [{ id: 'episode-1' }] });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router, operations);

    expect(operations.getAppointment).toHaveBeenCalledWith('tenant-1', 'appointment-1');
    expect(operations.listActiveEpisodes).toHaveBeenCalledWith('tenant-1', 'client-1');
    expect(operations.attachEpisode).toHaveBeenCalledWith('tenant-1', 'appointment-1', 'episode-1');
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
    );
  });

  it('uses an appointment-linked episode without reattaching another active episode', async () => {
    operations.getAppointment.mockResolvedValue({ episode_id: 'linked-episode' });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router, operations);

    expect(operations.listActiveEpisodes).not.toHaveBeenCalled();
    expect(operations.attachEpisode).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/episodes/linked-episode/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
    );
  });

  it('navigates to start-consultation without creating an episode when no active episode exists', async () => {
    operations.getAppointment.mockResolvedValue({ episode_id: null });
    operations.listActiveEpisodes.mockResolvedValue({ items: [] });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router, operations);

    expect(operations.attachEpisode).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/appointments/appointment-1/start-consultation?clientId=client-1',
    );
  });

  it('preserves tenant identity for every repository operation', async () => {
    operations.getAppointment.mockResolvedValue({ episode_id: null });
    operations.listActiveEpisodes.mockResolvedValue({ items: [{ id: 'episode-1' }] });

    await resolveCase('tenant-a', 'appointment-1', 'client-1', router, operations);

    expect(operations.getAppointment).toHaveBeenCalledWith('tenant-a', 'appointment-1');
    expect(operations.listActiveEpisodes).toHaveBeenCalledWith('tenant-a', 'client-1');
    expect(operations.attachEpisode).toHaveBeenCalledWith('tenant-a', 'appointment-1', 'episode-1');
  });

  it('does not navigate when a canonical operation fails', async () => {
    operations.getAppointment.mockRejectedValue(new Error('network down'));

    await expect(resolveCase('tenant-1', 'appointment-1', 'client-1', router, operations)).rejects.toThrow(
      'network down',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('returns early while another appointment is loading', async () => {
    const setState = jest.fn();

    await startConsultationWithGuard({
      tenantId: 'tenant-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      router,
      operations,
      loadingAppointmentId: 'appointment-0',
      setState,
    });

    expect(operations.getAppointment).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
  });

  it('maps a repository failure to the stable card error contract', async () => {
    const setState = jest.fn();
    operations.getAppointment.mockRejectedValue(new Error('server error'));

    await startConsultationWithGuard({
      tenantId: 'tenant-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      router,
      operations,
      loadingAppointmentId: null,
      setState,
    });

    const errorUpdater = setState.mock.calls[1][0];
    expect(errorUpdater({ loadingAppointmentId: 'appointment-1', error: null })).toEqual({
      loadingAppointmentId: 'appointment-1',
      error: { appointmentId: 'appointment-1', message: 'Could not load this information. Please try again.' },
    });
  });
});
