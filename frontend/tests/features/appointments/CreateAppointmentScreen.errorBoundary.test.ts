import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('CreateAppointmentScreen appointment error boundary', () => {
  const source = readFileSync(
    resolve(__dirname, '../../../features/appointments/presentation/pages/CreateAppointmentScreen.tsx'),
    'utf8'
  );
  const executableSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

  it('uses the canonical Appointments mutation and feature error contract', () => {
    expect(source).toMatch(/useCreateAppointmentMutation/);
    expect(source).toMatch(/createMutation\.mutateAsync/);
    expect(source).toMatch(/AppointmentCreationError/);
  });

  it('contains no appointment transport-envelope inspection', () => {
    expect(executableSource).not.toMatch(/\berr\?*\.response|\berror\?*\.response|\.response\?*\.data|\.response\.data/);
    expect(executableSource).not.toMatch(/AxiosError|isAxiosError|axiosClient|\baxios\b|\/api\/v1\//);
    expect(executableSource).not.toMatch(/data\/datasources|\.api['"]/);
  });
});
