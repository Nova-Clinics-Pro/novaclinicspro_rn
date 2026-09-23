import { onboardingDestinations } from '../../features/onboarding/presentation/actions/onboardingActionRegistry';
import { onboardingRendererKeys } from '../../features/onboarding/presentation/renderers/onboardingRendererRegistry';

describe('template-authoritative onboarding registries', () => {
  it('resolves every approved corrective destination and omits nonblocking financials', () => {
    expect(Object.keys(onboardingDestinations).sort()).toEqual([
      'clinic.clinical_services',
      'clinic.departments',
      'clinic.inventory',
      'clinic.operating_hours',
      'clinic.profile',
      'clinic.rooms',
      'clinic.staff',
      'clinic.treatments',
      'onboarding.step_detail',
    ]);
    expect(onboardingDestinations['onboarding.step_detail']({ tenant_id: 'tenant-1', step_id: 'go_live_checklist' }))
      .toContain('/onboarding/step-detail');
    expect(onboardingDestinations['clinic.financials']).toBeUndefined();
  });

  it('contains every active renderer key and has no step-code renderer authority', () => {
    expect([...onboardingRendererKeys].sort()).toEqual([
      'clinic_profile',
      'configured_clinical_services',
      'departments',
      'financials',
      'go_live_review',
      'inventory',
      'operating_hours',
      'rooms',
      'staff',
      'subscription_payment',
      'treatments',
    ]);
  });
});
