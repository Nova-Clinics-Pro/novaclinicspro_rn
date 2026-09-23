export const PROGRESSIVE_EXPERIENCE_JOURNEY_ID = 'progressive-experience' as const;
export const SUPPORTED_JOURNEY_MAJOR_VERSION = 1;

export type JourneyId = typeof PROGRESSIVE_EXPERIENCE_JOURNEY_ID;

export interface JourneyVersion {
  major: number;
  minor: number;
  patch: number;
}

export const PROGRESSIVE_EXPERIENCE_JOURNEY_VERSION: JourneyVersion = Object.freeze({
  major: 1,
  minor: 0,
  patch: 0,
});

export interface JourneyRuntimeIdentity {
  journeyId: JourneyId;
  journeyVersion: JourneyVersion;
  tenantId: string;
  projection?: {
    readonly templateVersion: string;
    readonly capabilityRevision: string;
  };
}

export interface ExistingJourneyDestination {
  kind: 'wizard_step';
  stepCode: string;
}

export type ExistingThemeIconToken = string;

export interface JourneyCardDefinition {
  cardId: string;
  stepCode: string;
  stageId: string;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string | null;
  destination: ExistingJourneyDestination;
  iconToken: ExistingThemeIconToken;
}

export interface JourneyDefinition {
  id: JourneyId;
  version: JourneyVersion;
  stepMappings: Readonly<Record<string, JourneyCardDefinition>>;
}

const JOURNEY_CARD_DESCRIPTION_KEY =
  'onboarding.progressiveExperience.journeyCard.description';
const JOURNEY_CARD_ACTION_KEY =
  'onboarding.progressiveExperience.journeyCard.action';
const REVIEW_AND_PERSONALIZE_STAGE = 'review_and_personalize';

const createStepCardDefinition = (
  cardId: string,
  stepCode: string,
  titleKey: string,
  iconToken: ExistingThemeIconToken
): JourneyCardDefinition => ({
  cardId,
  stepCode,
  stageId: REVIEW_AND_PERSONALIZE_STAGE,
  titleKey,
  descriptionKey: JOURNEY_CARD_DESCRIPTION_KEY,
  actionLabelKey: JOURNEY_CARD_ACTION_KEY,
  destination: { kind: 'wizard_step', stepCode },
  iconToken,
});

const createAliasDefinitions = (
  cardId: string,
  stepCodes: ReadonlyArray<string>,
  titleKey: string,
  iconToken: ExistingThemeIconToken
): Record<string, JourneyCardDefinition> =>
  Object.fromEntries(
    stepCodes.map((stepCode) => [
      stepCode,
      createStepCardDefinition(cardId, stepCode, titleKey, iconToken),
    ])
  );

export const PROGRESSIVE_EXPERIENCE_JOURNEY_DEFINITION: JourneyDefinition = Object.freeze({
  id: PROGRESSIVE_EXPERIENCE_JOURNEY_ID,
  version: PROGRESSIVE_EXPERIENCE_JOURNEY_VERSION,
  stepMappings: Object.freeze({
    clinic_profile: createStepCardDefinition(
      'clinic-profile',
      'clinic_profile',
      'onboarding.progressiveExperience.stepLabels.clinicProfile',
      'business-outline'
    ),
    operating_hours: createStepCardDefinition(
      'operating-hours',
      'operating_hours',
      'onboarding.progressiveExperience.stepLabels.operatingHours',
      'time-outline'
    ),
    ...createAliasDefinitions(
      'rooms-and-therapy-beds',
      ['rooms_and_therapy_beds', 'treatment_rooms'],
      'onboarding.progressiveExperience.stepLabels.roomsAndTherapyBeds',
      'bed-outline'
    ),
    ...createAliasDefinitions(
      'staff-and-roles',
      ['staff_and_roles', 'staff_setup', 'staff_members'],
      'onboarding.progressiveExperience.stepLabels.staffAndRoles',
      'people-outline'
    ),
    ...createAliasDefinitions(
      'treatments-and-therapies',
      [
        'treatments_and_therapies',
        'services_and_specialities',
        'services',
        'services_offered',
        'treatment_services',
      ],
      'onboarding.progressiveExperience.stepLabels.treatmentsAndTherapies',
      'medkit-outline'
    ),
    inventory_setup: createStepCardDefinition(
      'inventory-readiness',
      'inventory_setup',
      'onboarding.progressiveExperience.stepLabels.inventoryReadiness',
      'cube-outline'
    ),
    ...createAliasDefinitions(
      'billing-preferences',
      ['financials_and_tax', 'billing_setup', 'billing_settings'],
      'onboarding.progressiveExperience.stepLabels.billingPreferences',
      'receipt-outline'
    ),
    ...createAliasDefinitions(
      'payment-methods',
      ['payment_setup', 'payment_methods'],
      'onboarding.progressiveExperience.stepLabels.paymentMethods',
      'card-outline'
    ),
    subscription_payment: createStepCardDefinition(
      'subscription-options',
      'subscription_payment',
      'onboarding.progressiveExperience.stepLabels.subscriptionOptions',
      'pricetag-outline'
    ),
    go_live_checklist: createStepCardDefinition(
      'ready-to-start',
      'go_live_checklist',
      'onboarding.progressiveExperience.stepLabels.readyToStart',
      'checkmark-circle-outline'
    ),
  }),
});

export type JourneyCardStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'blocked'
  | 'unavailable';

export interface JourneyCardModel extends JourneyCardDefinition {
  status: JourneyCardStatus;
  isEligible: true;
  isVisible: true;
  isActionable: boolean;
  order: number;
}

export interface JourneyProgress {
  completed: number;
  total: number;
}

export interface JourneyDiagnostics {
  unknownStepCodes: ReadonlyArray<string>;
  missingValidationStepCodes: ReadonlyArray<string>;
  duplicateStepCodes: ReadonlyArray<string>;
  invalidDefinitionStepCodes: ReadonlyArray<string>;
}

export interface JourneyViewModel {
  identity: JourneyRuntimeIdentity;
  cards: ReadonlyArray<JourneyCardModel>;
  progress: JourneyProgress;
  diagnostics: JourneyDiagnostics;
  availability: 'available' | 'unsupported_version';
}

const JOURNEY_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const parseJourneyVersion = (value: string): JourneyVersion | null => {
  const match = JOURNEY_VERSION_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

export const formatJourneyVersion = (version: JourneyVersion): string =>
  `${version.major}.${version.minor}.${version.patch}`;

export const isSupportedJourneyVersion = (version: JourneyVersion): boolean =>
  version.major === SUPPORTED_JOURNEY_MAJOR_VERSION;
