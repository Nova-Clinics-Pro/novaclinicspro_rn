import {
  resolveCase,
  startConsultationWithGuard,
} from '../../../features/doctorDashboard/application/caseResolver';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockGet = axiosClient.get as jest.Mock;
const mockPost = axiosClient.post as jest.Mock;

describe('Case Resolver', () => {
  const router = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches an active episode and navigates to the canonical workspace with explicit visit context', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { episode_id: null } })
      .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 'episode-1' }] } });
    mockPost.mockResolvedValue({ data: {} });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-1/appointments/appointment-1',
      { params: { expand: 'staff' } },
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-1/episodes?client_id=client-1&status=ACTIVE&limit=1',
    );
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-1/appointments/appointment-1/attach-episode',
      { episode_id: 'episode-1' },
    );
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
    );
  });

  it('uses an appointment-linked episode without reattaching another active episode', async () => {
    mockGet.mockResolvedValue({ data: { episode_id: 'new-episode' } });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/episodes/new-episode/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
    );
  });

  it('navigates to start-consultation when no active episode exists', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { episode_id: null } })
      .mockResolvedValueOnce({ data: { total: 0, items: [] } });

    await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

    expect(mockPost).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      '/clinic-admin/appointments/appointment-1/start-consultation?clientId=client-1',
    );
  });

  it('propagates GET errors without navigation', async () => {
    await expect(async () => {
      mockGet.mockRejectedValue(new Error('network down'));
      await resolveCase('tenant-1', 'appointment-1', 'client-1', router);
    }).rejects.toThrow('network down');

    expect(router.push).not.toHaveBeenCalled();
  });

  it('propagates PATCH errors without navigation', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { episode_id: null } })
      .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 'episode-1' }] } });
    mockPost.mockRejectedValue(new Error('attach failed'));

    await expect(resolveCase('tenant-1', 'appointment-1', 'client-1', router)).rejects.toThrow(
      'attach failed',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  describe('Navigation purity (FR-C3, T-D.3): "navigation SHALL NOT modify clinical/business data"', () => {
    it('is pure (no writes) when the appointment already has a linked episode', async () => {
      mockGet.mockResolvedValueOnce({ data: { episode_id: 'episode-1' } });

      await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

      expect(mockPost).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith(
        '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
      );
    });

    it('is pure (no writes) when no active episode exists (falls back to start-consultation)', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { episode_id: null } })
        .mockResolvedValueOnce({ data: { total: 0, items: [] } });

      await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('DOES perform a write (attach-episode POST) when an active episode is found but not yet linked to this appointment — a documented exception, not asserted as pure', async () => {
      // Finding (T-D.3): this is the one path where `resolveCase` performs a
      // clinical/business-data write (linking an existing active episode to
      // this appointment) before navigating. It is pre-existing behavior
      // (already characterized by the "attaches an active episode..." test
      // above), not introduced by T-D.1/T-D.2. Whether this is in tension
      // with FR-C3's stated purity principle, and how to classify/resolve
      // it, is a judgment call flagged to the user rather than decided here
      // — see T-D.3's report. This test exists so the exception is explicit
      // and intentional rather than an unexamined side effect.
      mockGet
        .mockResolvedValueOnce({ data: { episode_id: null } })
        .mockResolvedValueOnce({ data: { total: 1, items: [{ id: 'episode-1' }] } });
      mockPost.mockResolvedValue({ data: {} });

      await resolveCase('tenant-1', 'appointment-1', 'client-1', router);

      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/clinic/tenant-1/appointments/appointment-1/attach-episode',
        { episode_id: 'episode-1' },
      );
    });
  });

  it('returns early while another appointment is loading', async () => {
    const setState = jest.fn();

    await startConsultationWithGuard({
      tenantId: 'tenant-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      router,
      loadingAppointmentId: 'appointment-0',
      setState,
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sets per-card error when resolver fails', async () => {
    const setState = jest.fn();
    mockGet.mockRejectedValue(new Error('server error'));

    await startConsultationWithGuard({
      tenantId: 'tenant-1',
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      router,
      loadingAppointmentId: null,
      setState,
    });

    const errorUpdater = setState.mock.calls[1][0];
    expect(errorUpdater({ loadingAppointmentId: 'appointment-1', error: null })).toEqual({
      loadingAppointmentId: 'appointment-1',
      error: { appointmentId: 'appointment-1', message: 'server error' },
    });
  });
});
