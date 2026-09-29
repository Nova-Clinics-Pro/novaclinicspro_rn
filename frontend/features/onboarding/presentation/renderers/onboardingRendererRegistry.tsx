import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import { logError } from '../../../../core/utils/errorHandler';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { JourneyResolvedStep } from '../../domain/entities/journey-visibility.entity';
import type { AuthUserSession } from '../../../auth/domain/entities/auth.entity';
import { executeOnboardingAction } from '../actions/onboardingActionRegistry';
import { GoLiveScreen } from '../pages/steps/GoLiveScreen';
import { selectRendererAction } from './rendererActionSelection';
import {
  onboardingRendererKeys,
  type OnboardingRendererKey,
} from './onboardingRendererContract';
import {
  translateOnboardingBlocker,
  translateOnboardingToken,
} from '../config/onboardingPresentationRegistry';

interface RendererProps {
  readonly step: JourneyResolvedStep;
  readonly tenantId: string;
  readonly router: ImperativeRouter;
  readonly applicationStatus?: AuthUserSession['applicationStatus'];
  readonly onCommercialEligibilityConfirmed?: () => Promise<void>;
  readonly onCommercialConfirmationAcknowledged?: () => void;
}

const GenericConfigurationRenderer = ({ step, tenantId, router }: RendererProps) => {
  const declaredAction = selectRendererAction(step);
  const action = declaredAction?.availability === 'AVAILABLE' ? declaredAction : null;
  return <View style={styles.container}>
    {step.helpToken ? <Text style={styles.help}>{translateOnboardingToken(step.helpToken)}</Text> : null}
    {step.blockers.map(blocker => <Text key={blocker.requirementId} style={styles.blocker}>{translateOnboardingBlocker(blocker.blockerToken, blocker.currentValue, blocker.requiredValue, blocker.titleToken)}</Text>)}
    {action ? <TouchableOpacity style={styles.action} onPress={() => executeOnboardingAction(router, action, { tenant_id: tenantId, step_id: step.stepId })} accessibilityRole="button" accessibilityLabel={translateOnboardingToken(action.labelToken, action.fallbackToken)}><Text style={styles.actionText}>{translateOnboardingToken(action.labelToken, action.fallbackToken)}</Text></TouchableOpacity> : declaredAction ? <Text style={styles.blocker}>{translateOnboardingToken(declaredAction.fallbackToken)}</Text> : null}
  </View>;
};

/** Final review is presentation-only; commercial state remains backend-owned. */
const GoLiveReviewRenderer = ({ step, tenantId, applicationStatus, onCommercialEligibilityConfirmed, onCommercialConfirmationAcknowledged }: RendererProps) => (
  <GoLiveScreen
    tenantId={tenantId}
    finalReviewStepId={step.stepId}
    applicationStatus={applicationStatus}
    onCommercialEligibilityConfirmed={onCommercialEligibilityConfirmed}
    onCommercialConfirmationAcknowledged={onCommercialConfirmationAcknowledged}
  />
);

const registry: Readonly<Record<OnboardingRendererKey, React.ComponentType<RendererProps>>> = {
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
  go_live_review: GoLiveReviewRenderer,
};

const rendererKeySet: ReadonlySet<string> = new Set(onboardingRendererKeys);

const isOnboardingRendererKey = (value: string): value is OnboardingRendererKey =>
  rendererKeySet.has(value);

export { onboardingRendererKeys };

export const OnboardingRenderer = ({
  step,
  tenantId,
  router,
  applicationStatus,
  onCommercialEligibilityConfirmed,
  onCommercialConfirmationAcknowledged,
}: RendererProps) => {
  const Renderer = step.rendererKey && isOnboardingRendererKey(step.rendererKey)
    ? registry[step.rendererKey]
    : undefined;
  if (!Renderer) {
    logError('onboarding.renderer.unknown', new Error(step.rendererKey ?? 'missing_renderer_key'));
    return <View style={styles.container}><Text style={styles.blocker}>{translateOnboardingToken(undefined)}</Text></View>;
  }
  return (
    <Renderer
      step={step}
      tenantId={tenantId}
      router={router}
      applicationStatus={applicationStatus}
      onCommercialEligibilityConfirmed={onCommercialEligibilityConfirmed}
      onCommercialConfirmationAcknowledged={onCommercialConfirmationAcknowledged}
    />
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm, padding: spacing.lg },
  help: { ...typography.body1, color: colors.text.secondary },
  blocker: { ...typography.body2, color: colors.error.main },
  action: { alignItems: 'center', borderRadius: 8, padding: spacing.md, backgroundColor: colors.primary.main },
  actionText: { ...typography.button, color: colors.text.light },
});
