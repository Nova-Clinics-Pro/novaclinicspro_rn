/** Declared presentation renderer keys; template data remains runtime authority. */
export const onboardingRendererKeys = Object.freeze([
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
] as const);

export type OnboardingRendererKey = (typeof onboardingRendererKeys)[number];
