import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Journey Visibility presentation authority boundary', () => {
  const presentationFiles = [
    'features/onboarding/presentation/hooks/useJourneyFoundation.ts',
    'features/onboarding/presentation/components/JourneySurface.tsx',
    'features/onboarding/presentation/pages/SetupWizardFlow.tsx',
  ];

  it('does not import transport DTOs or the datasource from presentation', () => {
    presentationFiles.slice(0, 2).forEach(file => {
      const content = source(file);
      expect(content).not.toMatch(/data\/models\/onboarding\.dtos/);
      expect(content).not.toMatch(/data\/datasources\/onboarding\.api/);
    });
    expect(source(presentationFiles[2])).not.toMatch(/getJourneyVisibilityApi/);
  });

  it('contains no client capability evaluation, clinic-type branching, or card sorting', () => {
    presentationFiles.forEach(file => {
      const content = source(file);
      expect(content).not.toMatch(/useCapabilities|CapabilityGate|clinicType\s*===/);
      expect(content).not.toMatch(/journey\.cards\.sort|visibleSteps\.sort/);
    });
  });

  it('does not make legacy paid checkout an onboarding presentation authority', () => {
    const wizard = source('features/onboarding/presentation/pages/SetupWizardFlow.tsx');

    expect(wizard).not.toMatch(/createTenantSubscriptionApi/);
    expect(wizard).not.toMatch(/getSubscriptionPlansApi/);
    expect(wizard).not.toMatch(/WebBrowser\.openBrowserAsync/);
  });
});
