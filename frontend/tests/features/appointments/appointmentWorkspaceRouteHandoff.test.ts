import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../../../features/appointments/presentation/pages/AppointmentsListScreen.tsx'),
  'utf8',
);

describe('Appointment List R7 workspace handoff', () => {
  it('uses the canonical route builder for an appointment that already has an Episode', () => {
    expect(source).toContain("episodeWorkspaceRoute(appointment.episode_id, appointment.id, appointment.client_id, 'admin')");
  });

  it('preserves the no-Episode path to appointment detail for creation or attachment', () => {
    expect(source).toContain('router.push(`/clinic-admin/appointments/${appointment.id}` as any);');
  });

  it('uses the selected appointment identity when opening an Episode from the row action', () => {
    expect(source).toContain("episodeWorkspaceRoute(episodeId, item.id, item.client_id, 'admin')");
  });
});
