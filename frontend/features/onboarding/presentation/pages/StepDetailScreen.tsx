import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { logError } from '../../../../core/utils/errorHandler';
import { useJourneyFoundation } from '../hooks/useJourneyFoundation';
import { OnboardingRenderer } from '../renderers/onboardingRendererRegistry';
import { LoadingScreen } from '../components/LoadingScreen';

export function StepDetailScreen() {
  const { tenantId, stepCode } = useLocalSearchParams<{ tenantId: string; stepCode: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const journey = useJourneyFoundation(tenantId ?? '');
  const step = journey.projection?.resolvedSteps.find(candidate => candidate.stepId === stepCode);

  if (journey.isLoading) return <LoadingScreen message={t('onboarding.progressiveExperience.journey.loading')} />;
  if (!tenantId || !stepCode || !step) {
    logError('onboarding.step_detail.unavailable', new Error(stepCode ?? 'missing_step_identifier'));
    return <View style={styles.screen}><Text style={styles.message}>{t('onboarding.renderers.unavailable')}</Text><TouchableOpacity style={styles.button} onPress={() => router.back()} accessibilityRole="button"><Text style={styles.buttonText}>{t('common.close')}</Text></TouchableOpacity></View>;
  }

  return <View style={styles.screen}>
    {step.titleToken ? <Text style={styles.title}>{t(step.titleToken)}</Text> : null}
    {step.helpToken ? <Text style={styles.help}>{t(step.helpToken)}</Text> : null}
    {step.requirements.map(requirement => <View key={requirement.requirementId} style={styles.requirement}><Text style={styles.requirementText}>{requirement.titleToken ? t(requirement.titleToken) : requirement.requirementId}</Text><Text style={styles.help}>{String(requirement.currentValue)} / {String(requirement.requiredValue)}</Text>{requirement.blockerToken ? <Text style={styles.blocker}>{t(requirement.blockerToken)}</Text> : null}</View>)}
    <OnboardingRenderer step={step} tenantId={tenantId} router={router} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default, padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.h5, color: colors.text.primary }, help: { ...typography.body2, color: colors.text.secondary }, blocker: { ...typography.body2, color: colors.error.main }, requirement: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border.light, borderRadius: 8 }, requirementText: { ...typography.body1, color: colors.text.primary }, message: { ...typography.body1, color: colors.text.secondary }, button: { backgroundColor: colors.primary.main, borderRadius: 8, padding: spacing.md, alignItems: 'center' }, buttonText: { ...typography.button, color: colors.text.light },
});
