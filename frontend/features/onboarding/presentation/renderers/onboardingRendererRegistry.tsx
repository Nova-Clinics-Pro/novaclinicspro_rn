import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import { logError } from '../../../../core/utils/errorHandler';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { JourneyResolvedStep } from '../../domain/entities/journey-visibility.entity';
import { executeOnboardingAction } from '../actions/onboardingActionRegistry';
import { translateOnboardingToken } from '../config/onboardingPresentationRegistry';

interface RendererProps {
  readonly step: JourneyResolvedStep;
  readonly tenantId: string;
  readonly router: ImperativeRouter;
}

const GenericConfigurationRenderer = ({ step, tenantId, router }: RendererProps) => {
  const declaredAction = step.correctiveActions[0] ?? step.blockers[0]?.correctiveAction;
  const action = declaredAction?.availability === 'AVAILABLE' ? declaredAction : null;
  return <View style={styles.container}>
    {step.helpToken ? <Text style={styles.help}>{translateOnboardingToken(step.helpToken)}</Text> : null}
    {step.blockers.map(blocker => <Text key={blocker.requirementId} style={styles.blocker}>{translateOnboardingToken(blocker.blockerToken)}</Text>)}
    {action ? <TouchableOpacity style={styles.action} onPress={() => executeOnboardingAction(router, action, { tenant_id: tenantId, step_id: step.stepId })} accessibilityRole="button" accessibilityLabel={translateOnboardingToken(action.labelToken, action.fallbackToken)}><Text style={styles.actionText}>{translateOnboardingToken(action.labelToken, action.fallbackToken)}</Text></TouchableOpacity> : declaredAction ? <Text style={styles.blocker}>{translateOnboardingToken(declaredAction.fallbackToken)}</Text> : null}
  </View>;
};

const registry: Readonly<Record<string, React.ComponentType<RendererProps>>> = {
  clinic_profile: GenericConfigurationRenderer,
  operating_hours: GenericConfigurationRenderer,
  rooms: GenericConfigurationRenderer,
  configured_clinical_services: GenericConfigurationRenderer,
  treatments: GenericConfigurationRenderer,
  staff: GenericConfigurationRenderer,
  departments: GenericConfigurationRenderer,
  inventory: GenericConfigurationRenderer,
  financials: GenericConfigurationRenderer,
  subscription_payment: GenericConfigurationRenderer,
  go_live_review: GenericConfigurationRenderer,
};

/** Exported only for registry-conformance tests; rendering still resolves by renderer_key. */
export const onboardingRendererKeys = Object.freeze(Object.keys(registry));

export const OnboardingRenderer = ({ step, tenantId, router }: RendererProps) => {
  const Renderer = step.rendererKey ? registry[step.rendererKey] : undefined;
  if (!Renderer) {
    logError('onboarding.renderer.unknown', new Error(step.rendererKey ?? 'missing_renderer_key'));
    return <View style={styles.container}><Text style={styles.blocker}>{translateOnboardingToken(undefined)}</Text></View>;
  }
  return <Renderer step={step} tenantId={tenantId} router={router} />;
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm, padding: spacing.lg },
  help: { ...typography.body1, color: colors.text.secondary },
  blocker: { ...typography.body2, color: colors.error.main },
  action: { alignItems: 'center', borderRadius: 8, padding: spacing.md, backgroundColor: colors.primary.main },
  actionText: { ...typography.button, color: colors.text.light },
});
