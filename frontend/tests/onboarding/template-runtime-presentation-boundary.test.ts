import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../features', path), 'utf8');

describe('template runtime presentation boundaries', () => {
  it('keeps GoLive projection-authoritative and retires useReadyToStart', () => {
    const goLive = source('onboarding/presentation/pages/steps/GoLiveScreen.tsx');
    expect(goLive).toContain('useJourneyFoundation');
    expect(goLive).not.toContain('useReadyToStart');
    expect(goLive).toContain('executeOnboardingAction');
  });

  it('keeps profile, configured-service, and department transport outside presentation', () => {
    for (const path of [
      'clinicProfile/presentation/pages/ClinicProfileScreen.tsx',
      'configuredClinicalServices/presentation/pages/ConfiguredClinicalServicesScreen.tsx',
      'departments/presentation/pages/DepartmentsScreen.tsx',
    ]) {
      const value = source(path);
      expect(value).not.toContain('axiosClient');
      expect(value).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it('keeps configured-service category optional and invalidates canonical projections', () => {
    const repository = source('configuredClinicalServices/data/repositories/configuredClinicalServices.repository.impl.ts');
    expect(repository).toContain("['onboarding', 'journey-visibility']");
    expect(repository).toContain("['onboarding', 'ready-to-start']");
    const screen = source('configuredClinicalServices/presentation/pages/ConfiguredClinicalServicesScreen.tsx');
    expect(screen).toContain('useState<string | null>(null)');
    expect(screen).toContain('category_code: categoryCode');
  });

  it('keeps persisted-session routing behind the explicit bootstrap gate', () => {
    const provider = readFileSync(resolve(__dirname, '../../core/providers/AuthProvider.tsx'), 'utf8');
    const store = readFileSync(resolve(__dirname, '../../features/auth/presentation/providers/auth.store.ts'), 'utf8');
    expect(provider).toContain('bootstrapSession');
    expect(store).toContain('application routing gate closed');
  });
});
