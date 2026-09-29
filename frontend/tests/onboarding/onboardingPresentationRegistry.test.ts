import { hasTranslation } from '../../core/localization/i18n';
import {
  onboardingIconRendererKeys,
  resolveOnboardingIcon,
  translateOnboardingToken,
} from '../../features/onboarding/presentation/config/onboardingPresentationRegistry';

jest.mock('../../core/utils/errorHandler', () => ({ logError: jest.fn() }));

describe('template-authoritative onboarding presentation registry', () => {
  const activeRendererKeys = [
    'clinic_profile',
    'operating_hours',
    'rooms',
    'configured_clinical_services',
    'treatments',
    'staff',
    'departments',
    'inventory',
    'financials',
    'subscription_payment',
    'go_live_review',
  ];

  const activeStepTokens = [
    'clinic_profile', 'operating_hours', 'rooms_and_therapy_beds',
    'services_and_specialities', 'dental_procedures', 'treatments_and_therapies',
    'staff_and_roles', 'departments_and_specialities', 'inventory_setup',
    'financials_and_tax', 'subscription_payment', 'go_live_checklist',
  ];

  const actionTokens = [
    'edit_clinic_profile', 'manage_operating_hours', 'manage_rooms',
    'manage_treatments', 'manage_services', 'manage_staff', 'manage_inventory',
    'manage_departments', 'review_checklist',
  ];

  const requirementTokens = [
    'clinic_profile', 'operating_hours',
    'validation.rooms.min_therapy_rooms',
    'validation.configured_clinical_services.min_count',
    'validation.treatments.min_therapy', 'validation.treatments.min_dental',
    'validation.treatments.min_physiotherapy',
    'validation.staff.min_count', 'validation.staff.min_doctor',
    'validation.staff.min_therapist', 'validation.staff.min_dentist',
    'validation.staff.min_physiotherapist', 'validation.inventory.min_items',
    'validation.departments.min_count',
  ];

  it('covers every renderer emitted by the six active templates with a valid presentation icon', () => {
    expect([...onboardingIconRendererKeys].sort()).toEqual([...activeRendererKeys].sort());
    activeRendererKeys.forEach(key => expect(resolveOnboardingIcon(key)).toMatch(/-outline$/));
  });

  it('covers every active step and action token in the frontend locale catalog', () => {
    activeStepTokens.forEach(step => {
      expect(hasTranslation(`onboarding.steps.${step}.title`)).toBe(true);
      expect(hasTranslation(`onboarding.steps.${step}.help`)).toBe(true);
    });
    actionTokens.forEach(action => {
      expect(hasTranslation(`onboarding.actions.${action}.label`)).toBe(true);
    });
    requirementTokens.forEach(requirement => {
      expect(hasTranslation(`onboarding.requirements.${requirement}.title`)).toBe(true);
      expect(hasTranslation(`onboarding.requirements.${requirement}.help`)).toBe(true);
      expect(hasTranslation(`onboarding.requirements.${requirement}.blocker`)).toBe(true);
    });
  });

  it('uses a safe icon and localized recovery text for unknown renderer and localization tokens', () => {
    expect(resolveOnboardingIcon('unrecognized_renderer')).toBe('settings-outline');
    expect(translateOnboardingToken('onboarding.steps.unknown.title')).toBe(
      'This setup item is currently unavailable. Please try again.'
    );
  });

  it('resolves backend title, help, and corrective-action label tokens without exposing their identifiers', () => {
    expect(translateOnboardingToken('onboarding.steps.clinic_profile.title')).toBe('Clinic profile');
    expect(translateOnboardingToken('onboarding.steps.clinic_profile.help')).toContain('clinic details');
    expect(translateOnboardingToken('onboarding.actions.manage_rooms.label')).toBe('Manage rooms and beds');
  });
});
