import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTranslation } from '../../../../../core/localization/useTranslation';
import { colors } from '../../../../../core/theme/colors';
import { spacing } from '../../../../../core/theme/spacing';
import { typography } from '../../../../../core/theme/typography';
import { executeOnboardingAction } from '../../actions/onboardingActionRegistry';
import { useJourneyFoundation } from '../../hooks/useJourneyFoundation';
import {
  translateOnboardingBlocker,
  translateOnboardingToken,
} from '../../config/onboardingPresentationRegistry';

interface GoLiveScreenProps {
  readonly tenantId: string;
  readonly onComplete: () => void;
  /** Compatibility-only; canonical projection actions supersede these callbacks. */
  readonly onNavigateToSetupStep?: (stepCode: string) => void | Promise<void>;
  readonly onOpenWorkspacePreparation?: () => void | Promise<void>;
}

/**
 * Final review only.  Its blockers, values, and corrective actions are the
 * same resolved template projection used by Journey; this screen owns none.
 */
export function GoLiveScreen({ tenantId, onComplete }: GoLiveScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const journey = useJourneyFoundation(tenantId);
  const projection = journey.projection;
  const required = useMemo(
    () => (projection?.resolvedSteps ?? []).filter(step => step.applicable && step.required && step.stepId !== 'go_live_checklist'),
    [projection],
  );
  const blockers = required.filter(step => step.state !== 'COMPLETE');

  if (journey.isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary.main} /></View>;
  if (journey.error || !projection) return <View style={styles.center}><Text style={styles.text}>{t('onboarding.renderers.unavailable')}</Text><TouchableOpacity style={styles.button} onPress={() => void journey.refetch()}><Text style={styles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View>;

  return <ScrollView contentContainerStyle={styles.screen} accessibilityRole="summary">
    <Text style={styles.title}>{t('onboarding.progressiveExperience.readyToStart.presentation.title')}</Text>
    <Text style={styles.text}>{blockers.length === 0 ? t('onboarding.progressiveExperience.readyToStart.presentation.states.READY') : t('onboarding.progressiveExperience.readyToStart.presentation.states.NOT_READY')}</Text>
    {required.map(step => <View key={step.stepId} style={styles.card}>
      <Text style={styles.text}>{translateOnboardingToken(step.titleToken)}</Text>
      {step.blockers.map(blocker => <Text key={blocker.requirementId} style={styles.blocker}>{translateOnboardingBlocker(blocker.blockerToken, blocker.currentValue, blocker.requiredValue)}</Text>)}
      {step.correctiveActions.map(action => action.availability === 'AVAILABLE' ? <TouchableOpacity key={action.target} style={styles.button} onPress={() => executeOnboardingAction(router, action, { tenant_id: tenantId, step_id: step.stepId })}><Text style={styles.buttonText}>{translateOnboardingToken(action.labelToken, action.fallbackToken)}</Text></TouchableOpacity> : <Text key={action.target} style={styles.blocker}>{translateOnboardingToken(action.fallbackToken)}</Text>)}
    </View>)}
    <TouchableOpacity style={styles.button} disabled={blockers.length !== 0} onPress={onComplete} accessibilityRole="button"><Text style={styles.buttonText}>{t('onboarding.progressiveExperience.readyToStart.presentation.actions.continue')}</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background.default }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md }, title: { ...typography.h4, color: colors.text.primary }, text: { ...typography.body1, color: colors.text.primary }, blocker: { ...typography.body2, color: colors.error.main }, card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, backgroundColor: colors.background.paper }, button: { alignItems: 'center', padding: spacing.md, borderRadius: 8, backgroundColor: colors.primary.main }, buttonText: { ...typography.button, color: colors.text.light } });
