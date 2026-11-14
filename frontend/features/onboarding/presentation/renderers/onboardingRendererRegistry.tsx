import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import { logError } from '../../../../core/utils/errorHandler';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { JourneyResolvedStep } from '../../domain/entities/journey-visibility.entity';
import type { AuthUserSession } from '../../../auth/domain/entities/auth.entity';
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

/**
 * Step detail shows only guidance: the step's help text and what is still unmet. The step's card
 * in the journey list is the single control that opens its configuration screen (it carries the
 * template-declared corrective/management action), so there is deliberately no second "manage"
 * button here - it duplicated the card and took a full row of space on small screens. When the
 * declared action is unavailable, the declared fallback message is still surfaced.
 */
const GenericConfigurationRenderer = ({ step }: RendererProps) => {
  const declaredAction = selectRendererAction(step);
  const unavailable = declaredAction && declaredAction.availability !== 'AVAILABLE' ? declaredAction : null;
  if (!step.helpToken && step.blockers.length === 0 && !unavailable) return null;
  return <View style={styles.container}>
    {step.helpToken ? <Text style={styles.help}>{translateOnboardingToken(step.helpToken)}</Text> : null}
    {step.blockers.map(blocker => <Text key={blocker.requirementId} style={styles.blocker}>{translateOnboardingBlocker(blocker.blockerToken, blocker.currentValue, blocker.requiredValue, blocker.titleToken)}</Text>)}
    {unavailable ? <Text style={styles.blocker}>{translateOnboardingToken(unavailable.fallbackToken)}</Text> : null}
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
});
