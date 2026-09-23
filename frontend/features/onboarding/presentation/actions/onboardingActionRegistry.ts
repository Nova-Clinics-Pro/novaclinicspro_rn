import type { Href, Router } from 'expo-router';
import { logError } from '../../../../core/utils/errorHandler';
import type { JourneyCorrectiveAction } from '../../domain/entities/journey-visibility.entity';

type NavigationContext = Readonly<Record<string, string>>;

export const onboardingDestinations: Readonly<Record<string, (context: NavigationContext) => Href>> = {
  'onboarding.step_detail': context => `/onboarding/step-detail?tenantId=${context.tenant_id}&stepCode=${context.step_id}` as Href,
  'clinic.clinical_services': () => '/clinic-admin/settings/configured-clinical-services' as Href,
  'clinic.operating_hours': () => '/clinic-admin/settings/operating-hours' as Href,
  'clinic.rooms': () => '/clinic-admin/settings/rooms' as Href,
  'clinic.treatments': () => '/clinic-admin/settings/treatments' as Href,
  'clinic.staff': () => '/clinic-admin/staff' as Href,
  'clinic.inventory': () => '/clinic-admin/inventory' as Href,
  'clinic.departments': () => '/clinic-admin/settings/departments' as Href,
  'clinic.profile': () => '/clinic-admin/settings/clinic-profile' as Href,
};

export const executeOnboardingAction = (
  router: Router,
  action: JourneyCorrectiveAction,
  context: NavigationContext,
): boolean => {
  if (action.availability !== 'AVAILABLE' || action.requiredParams.some(parameter => !context[parameter])) {
    logError('onboarding.action.unavailable', new Error(action.fallbackToken));
    return false;
  }
  const destination = onboardingDestinations[action.destination];
  if (!destination) {
    logError('onboarding.action.unknown_destination', new Error(action.destination));
    return false;
  }
  router.push(destination(context));
  return true;
};
