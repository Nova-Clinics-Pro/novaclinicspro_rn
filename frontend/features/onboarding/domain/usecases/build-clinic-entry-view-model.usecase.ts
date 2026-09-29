import { Application } from '../entities/application.entity';

export type ClinicEntryPathId = 'new_clinic' | 'bring_your_clinic';

export interface ClinicEntryPathViewModel {
  id: ClinicEntryPathId;
  titleKey: string;
  descriptionKey: string;
  badgeKey: string;
  validationKey: string;
  featureKeys: readonly string[];
  iconToken: 'add-circle-outline' | 'business-outline';
}

export interface ClinicEntryChoiceViewModel {
  clinicDisplayName: string;
  paths: readonly ClinicEntryPathViewModel[];
}

const CLINIC_ENTRY_PATHS: readonly ClinicEntryPathViewModel[] = [
  {
    id: 'new_clinic',
    titleKey: 'onboarding.progressiveExperience.clinicEntry.newClinic.title',
    descriptionKey: 'onboarding.progressiveExperience.clinicEntry.newClinic.description',
    badgeKey: 'onboarding.progressiveExperience.clinicEntry.newClinic.badge',
    validationKey: 'onboarding.progressiveExperience.clinicEntry.newClinic.validation',
    featureKeys: [
      'onboarding.progressiveExperience.clinicEntry.newClinic.identity',
      'onboarding.progressiveExperience.clinicEntry.newClinic.contact',
      'onboarding.progressiveExperience.clinicEntry.newClinic.specialty',
    ],
    iconToken: 'add-circle-outline',
  },
  {
    id: 'bring_your_clinic',
    titleKey: 'onboarding.progressiveExperience.clinicEntry.bringYourClinic.title',
    descriptionKey: 'onboarding.progressiveExperience.clinicEntry.bringYourClinic.description',
    badgeKey: 'onboarding.progressiveExperience.clinicEntry.bringYourClinic.badge',
    validationKey: 'onboarding.progressiveExperience.clinicEntry.bringYourClinic.validation',
    featureKeys: [
      'onboarding.progressiveExperience.clinicEntry.bringYourClinic.novaManaged',
      'onboarding.progressiveExperience.clinicEntry.bringYourClinic.approval',
      'onboarding.progressiveExperience.clinicEntry.bringYourClinic.noImport',
    ],
    iconToken: 'business-outline',
  },
];

export const buildClinicEntryViewModel = (
  application: Pick<Application, 'tenantName'>
): ClinicEntryChoiceViewModel | null => {
  const clinicDisplayName = application.tenantName.trim();
  if (!clinicDisplayName) {
    return null;
  }

  return {
    clinicDisplayName,
    paths: CLINIC_ENTRY_PATHS,
  };
};
