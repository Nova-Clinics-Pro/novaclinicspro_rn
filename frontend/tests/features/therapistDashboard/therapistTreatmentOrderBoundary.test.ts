import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('Therapist Dashboard Treatment Order boundary', () => {
  const screenSource = read('../../../features/therapistDashboard/presentation/pages/TherapistDashboardScreen.tsx');

  it('uses the canonical on-demand Treatment Order query for the start-session version', () => {
    expect(screenSource).toMatch(/useTreatmentOrderOnDemand/);
    expect(screenSource).toMatch(/fetchTreatmentOrder\(sheetId, tenantId\)/);
  });

  it('does not own Treatment Order transport', () => {
    expect(screenSource).not.toMatch(/getTreatmentOrderApi/);
    expect(screenSource).not.toMatch(/treatmentOrders\.api/);
    expect(screenSource).not.toMatch(/axiosClient|(?<![A-Za-z.])fetch\(|\/api\/v1\//);
  });
});
