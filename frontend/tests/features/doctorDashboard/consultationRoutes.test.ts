import {
  consultationRoute,
  episodeWorkspaceRoute,
  startConsultationRoute,
} from '../../../features/doctorDashboard/application/consultationRoutes';

describe('consultation route builders', () => {
  it('builds the canonical doctor workspace destination with explicit episode, client, and appointment identity', () => {
    expect(episodeWorkspaceRoute('episode-1', 'appointment-1', 'client-1', 'doctor')).toBe(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor',
    );
  });

  it('builds the canonical admin workspace destination with explicit episode, client, and appointment identity', () => {
    expect(episodeWorkspaceRoute('episode-1', 'appointment-1', 'client-1', 'admin')).toBe(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=admin',
    );
  });

  it('carries an explicit COS workspace stage without changing the clinical identity', () => {
    expect(episodeWorkspaceRoute('episode-1', 'appointment-1', 'client-1', 'doctor', 'prescription')).toBe(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor&step=prescription',
    );
  });

  it('retains the legacy consultation deep-link builder and the pre-Episode start-consultation builder', () => {
    expect(consultationRoute('episode-1', 'appointment-1', 'client-1')).toBe(
      '/clinic-admin/episodes/episode-1/consultation?appointmentId=appointment-1&clientId=client-1',
    );
    expect(startConsultationRoute('appointment-1', 'client-1')).toBe(
      '/clinic-admin/appointments/appointment-1/start-consultation?clientId=client-1',
    );
  });
});
