import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) =>
  readFileSync(resolve(__dirname, '../../', path), 'utf8');

describe('Package A production logging boundary', () => {
  it('does not log doctor dashboard clinical or identifier-bearing payloads', () => {
    const doctorDashboard = source('app/doctor.tsx');

    expect(doctorDashboard).not.toMatch(/console\.(?:log|warn|error|debug)/);
  });

  it('does not serialize or log payment setup responses', () => {
    const paymentSetup = source(
      'features/onboarding/presentation/pages/steps/PaymentSetupScreen.tsx',
    );

    expect(paymentSetup).not.toMatch(/console\.(?:log|warn|error|debug)/);
    expect(paymentSetup).not.toContain('JSON.stringify(result');
  });
});
