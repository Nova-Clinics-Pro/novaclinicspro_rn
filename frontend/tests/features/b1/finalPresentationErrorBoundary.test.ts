import { readFileSync } from 'fs';
import { resolve } from 'path';

const presentationFiles = [
  'features/appointments/presentation/pages/PreviewAppointmentsScreen.tsx',
  'features/onboarding/presentation/pages/steps/TreatmentRoomsScreen.tsx',
  'features/prescriptions/presentation/pages/CreatePrescriptionScreen.tsx',
  'features/prescriptions/presentation/pages/PrescriptionStandaloneScreen.tsx',
  'features/staff/presentation/pages/StaffDetailScreen.tsx',
  'features/staff/presentation/pages/StaffLeaveScreen.tsx',
  'features/staff/presentation/pages/StaffListScreen.tsx',
  'features/feedback/presentation/pages/FeedbackFormScreen.tsx',
];

describe('B1 final presentation error boundary', () => {
  it.each(presentationFiles)('%s does not parse transport error envelopes', (file) => {
    const source = readFileSync(resolve(__dirname, '../../..', file), 'utf8');
    expect(source).not.toMatch(/(?:error|err)\?*\.response|response\?*\.(?:status|data)|isAxiosError|AxiosError/);
  });

  it.each(presentationFiles)('%s does not own an HTTP client or endpoint', (file) => {
    const source = readFileSync(resolve(__dirname, '../../..', file), 'utf8');
    expect(source).not.toMatch(/axiosClient|\baxios\.|\/api\/v1\//);
  });
});
