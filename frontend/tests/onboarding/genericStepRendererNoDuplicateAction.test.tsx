import React from 'react';
import { render } from '@testing-library/react-native';
import { OnboardingRenderer } from '../../features/onboarding/presentation/renderers/onboardingRendererRegistry';

jest.mock('../../features/onboarding/presentation/config/onboardingPresentationRegistry', () => ({
  translateOnboardingToken: (token: string | null | undefined) => token ?? '',
  translateOnboardingBlocker: (token: string | null | undefined) => token ?? '',
}));

const available = {
  kind: 'NAVIGATE', target: 'manage_operating_hours', destination: 'clinic.operating_hours',
  labelToken: 'onboarding.actions.manage_operating_hours.label', availability: 'AVAILABLE',
  fallbackToken: 'onboarding.actions.unavailable', requiredParams: ['tenant_id', 'step_id'],
};

const step = (overrides: Record<string, unknown>) => ({
  stepId: 'operating_hours', rendererKey: 'operating_hours', state: 'NOT_STARTED',
  helpToken: 'onboarding.steps.operating_hours.help', blockers: [],
  correctiveActions: [available], managementActions: [available], ...overrides,
}) as never;

const props = { tenantId: 't-1', router: { push: jest.fn() } as never };

describe('generic step detail has no second action button (the journey card is the control)', () => {
  it('shows guidance but no "Manage" button while the step is unmet', () => {
    const { queryByText, queryByRole } = render(<OnboardingRenderer {...props} step={step({})} />);
    expect(queryByText('onboarding.steps.operating_hours.help')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
    expect(queryByText('onboarding.actions.manage_operating_hours.label')).toBeNull();
  });

  it('shows no "Manage" button once the step is complete', () => {
    const { queryByRole, queryByText } = render(<OnboardingRenderer {...props} step={step({ state: 'COMPLETE' })} />);
    expect(queryByRole('button')).toBeNull();
    expect(queryByText('onboarding.actions.manage_operating_hours.label')).toBeNull();
  });

  it('still surfaces the declared fallback message when the action is unavailable', () => {
    const unavailable = { ...available, availability: 'UNAVAILABLE' };
    const { queryByText } = render(
      <OnboardingRenderer {...props} step={step({ correctiveActions: [unavailable] })} />,
    );
    expect(queryByText('onboarding.actions.unavailable')).toBeTruthy();
  });

  it('renders nothing when there is no guidance, no blocker and no fallback to show', () => {
    const { toJSON } = render(<OnboardingRenderer {...props} step={step({ helpToken: null, correctiveActions: [] })} />);
    expect(toJSON()).toBeNull();
  });
});
