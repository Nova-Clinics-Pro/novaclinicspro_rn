import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../../', relativePath), 'utf8');

describe('Doctor Dashboard repository and error boundaries', () => {
  const resolver = read('features/doctorDashboard/application/caseResolver.ts');
  const dashboard = read('app/doctor.tsx');

  it('keeps case resolution transport-free and supplied by canonical operations', () => {
    expect(resolver).toContain('export interface CaseResolverOperations');
    expect(resolver).not.toMatch(/axiosClient|axios|\/api\/v1\//);
    expect(resolver).not.toMatch(/response\.(status|data)|error\.response|AxiosError/);
  });

  it('keeps Doctor presentation free of raw transport-envelope parsing', () => {
    expect(dashboard).toContain('toDoctorDashboardError');
    expect(dashboard).not.toMatch(/\.response\?\.|\.response\.|AxiosError|isAxiosError/);
  });

  it('composes repository reads with canonical keys and the existing attach mutation', () => {
    expect(dashboard).toContain('appointmentsKeys.detail');
    expect(dashboard).toContain('episodesKeys.list');
    expect(dashboard).toContain('getAppointmentDetail');
    expect(dashboard).toContain('listEpisodes');
    expect(dashboard).toContain('useAttachEpisodeMutation');
    expect(dashboard).not.toMatch(/axiosClient|\/api\/v1\//);
  });
});
