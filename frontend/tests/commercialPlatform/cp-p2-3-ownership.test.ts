import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const frontendRoot = join(__dirname, '..', '..');
const source = (relativePath: string) =>
  readFileSync(join(frontendRoot, relativePath), 'utf8');

describe('CP-P2.3 commercial ownership boundary', () => {
  it('keeps commercial transport, repository, and contracts outside onboarding', () => {
    expect(
      source('features/onboarding/data/datasources/onboarding.api.ts')
    ).not.toMatch(/commercial-trial|CommercialTrial|commercialTrial/);
    expect(
      source('features/onboarding/data/repositories/onboarding.repository.impl.ts')
    ).not.toMatch(/CommercialTrial|commercialTrial|CommercialRetention/);
    expect(
      source('features/onboarding/domain/repositories/onboarding.repository.ts')
    ).not.toContain('ICommercialTrialRepository');
  });

  it('keeps the commercial implementation independent of onboarding internals', () => {
    for (const relativePath of [
      'features/commercialPlatform/data/datasources/commercial-trial.api.ts',
      'features/commercialPlatform/data/repositories/commercial-trial.repository.impl.ts',
      'features/commercialPlatform/domain/repositories/commercial-trial.repository.ts',
    ]) {
      expect(source(relativePath)).not.toMatch(/features\/onboarding|\.\.\/onboarding/);
    }
  });
});
