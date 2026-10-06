import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('DoctorDashboard episode-count boundary', () => {
  const source = readFileSync(resolve(__dirname, '../../../app/doctor.tsx'), 'utf8');

  it('uses the tenant-scoped Episodes feature query rather than owning HTTP or a raw query', () => {
    expect(source).toContain('useClientEpisodeCountsQuery(tenantId, uniqueClientIds)');
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/useQuery\(/);
  });
});
