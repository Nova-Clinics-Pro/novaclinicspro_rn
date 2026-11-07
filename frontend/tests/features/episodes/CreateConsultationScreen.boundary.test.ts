import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('CreateConsultationScreen Episode command boundary', () => {
  const source = readFileSync(
    resolve(
      __dirname,
      '../../../features/episodes/presentation/pages/CreateConsultationScreen.tsx'
    ),
    'utf8'
  );

  it('delegates creation to the canonical Episodes mutation', () => {
    expect(source).toMatch(/useCreateEpisodeMutation/);
    expect(source).toMatch(/createEpisodeMutation\.mutateAsync/);
  });

  it('contains no direct Episode transport or transport-response parsing', () => {
    expect(source).not.toMatch(/createEpisodeApi|axiosClient|\bfetch\s*\(|\/api\/v1\//);
    expect(source).not.toMatch(/data\/datasources|\.api['"]/);
    expect(source).not.toMatch(/response\?*\.data|response\.data/);
  });
});
