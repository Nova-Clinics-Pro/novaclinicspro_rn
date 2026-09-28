import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(__dirname, '../../', path), 'utf8');

describe('canonical current-step submission', () => {
  it('captures the selected step identity in the submission variables', () => {
    const flow = source('features/onboarding/presentation/pages/SetupWizardFlow.tsx');
    expect(flow).toContain('stepCode: stepAtSubmission.code');
    expect(flow).toContain('useSubmitStepMutation(tenantId)');
  });

  it('separates completed-step management from the central forward navigation destination', () => {
    const flow = source('features/onboarding/presentation/pages/SetupWizardFlow.tsx');
    expect(flow).toContain("runtime?.selectedStep?.status === 'completed'");
    expect(flow).toContain('runtime.nextNavigationStepId');
    expect(flow).toContain('buildOnboardingRuntime(');
    expect(flow).toContain('refreshedRuntime.nextNavigationStepId');
    expect(flow).not.toContain('executeOnboardingAction(router, stepAtSubmission');
    expect(flow).not.toContain('subscription_payment');
  });
});
