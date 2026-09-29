/**
 * Onboarding Layout
 * Layout for onboarding flow screens
 */

import { Stack } from 'expo-router';
import { useClinicTheme } from '../../core/theme/useClinicTheme';
import { useTranslation } from '../../core/localization/useTranslation';

export default function OnboardingLayout() {
  const theme = useClinicTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface.default,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          ...theme.typography.h6,
        },
      }}
    >
      <Stack.Screen 
        name="choice" 
        options={{ title: 'Get Started' }} 
      />
      <Stack.Screen 
        name="pending-review" 
        options={{ title: t('applicationStatus.pendingReview.title') }}
      />
      <Stack.Screen
        name="draft"
        options={{ title: t('applicationStatus.draft.title') }}
      />
      <Stack.Screen 
        name="setup-wizard" 
        options={{ title: t('onboarding.progressiveExperience.routes.prepareClinic') }} 
      />
      <Stack.Screen 
        name="wizard-flow" 
        options={{ 
          title: t('onboarding.progressiveExperience.routes.clinicPreparation'),
          headerShown: false, // Hide header since wizard has its own
        }} 
      />
      <Stack.Screen
        name="workspace-preparation"
        options={{ title: t('onboarding.progressiveExperience.routes.workspacePreparation') }}
      />
      <Stack.Screen
        name="commercial-retention"
        options={{ title: t('onboarding.progressiveExperience.routes.commercialRetention') }}
      />
      <Stack.Screen 
        name="step-detail" 
        options={{ title: t('onboarding.progressiveExperience.routes.reviewStep') }} 
      />
      <Stack.Screen 
        name="rejected" 
        options={{ title: t('applicationStatus.rejected.title') }}
      />
    </Stack>
  );
}
