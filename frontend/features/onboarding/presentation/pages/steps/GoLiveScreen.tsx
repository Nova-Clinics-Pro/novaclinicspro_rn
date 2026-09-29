import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTranslation } from '../../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import {
  executeOnboardingAction,
  executeReadinessAction,
} from '../../actions/onboardingActionRegistry';
import { useOnboardingRuntime } from '../../hooks/useOnboardingRuntime';
import { useReadyToStart } from '../../hooks/useReadyToStart';
import {
  useEnsureWorkspacePreparationMutation,
  useOrganizationContextQuery,
} from '../../../data/repositories/onboarding.repository.impl';
import { CommercialRetentionScreen } from '../CommercialRetentionScreen';
import {
  translateOnboardingBlocker,
  translateOnboardingToken,
} from '../../config/onboardingPresentationRegistry';
import type { AuthUserSession } from '../../../../auth/domain/entities/auth.entity';
import { uniqueBlockers } from './goLivePresentation';

interface GoLiveScreenProps {
  readonly tenantId: string;
  readonly finalReviewStepId: string;
  readonly applicationStatus?: AuthUserSession['applicationStatus'];
  readonly onCommercialEligibilityConfirmed?: () => Promise<void>;
  readonly onCommercialConfirmationAcknowledged?: () => void;
}

/**
 * Final review renders only backend-resolved setup and readiness evidence.
 * The workspace handoff is an explicit, backend-owned readiness action.
 */
export function GoLiveScreen({
  tenantId,
  finalReviewStepId,
  applicationStatus,
  onCommercialEligibilityConfirmed,
  onCommercialConfirmationAcknowledged,
}: GoLiveScreenProps) {
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const journey = useOnboardingRuntime(tenantId);
  const readiness = useReadyToStart(tenantId);
  const organizationContext = useOrganizationContextQuery();
  const organizationId = organizationContext.data?.effectiveOrganizationId ?? '';
  const preparation = useEnsureWorkspacePreparationMutation(organizationId, tenantId);
  const attemptedPreparationScope = useRef<string | null>(null);
  const [preparationFailure, setPreparationFailure] = useState(false);
  const projection = journey.projection;
  const runtime = journey.runtime;
  const required = useMemo(
    () =>
      (runtime?.visibleSteps ?? []).filter(
        item => item.step.required && item.stepId !== finalReviewStepId
      ),
    [finalReviewStepId, runtime?.visibleSteps]
  );
  const incompletePrerequisites = required.filter(item => item.status !== 'completed');
  const managementSteps = required.filter(item => item.status === 'completed' && item.action);
  const prerequisitesComplete = incompletePrerequisites.length === 0;
  const preparationAction = readiness.data?.blockers.find(
    blocker => blocker.nextAction?.targetId === 'onboarding.workspace_preparation'
  )?.nextAction;
  const automaticPreparationRequired = prerequisitesComplete && Boolean(preparationAction);
  const readyForTrial = prerequisitesComplete && readiness.data?.authorizesHandoff === true;

  const prepareWorkspace = useCallback(async () => {
    if (!organizationId || !tenantId || preparation.isPending) return;
    setPreparationFailure(false);
    try {
      await preparation.mutateAsync();
      await Promise.all([journey.refetch(), readiness.refresh()]);
    } catch {
      setPreparationFailure(true);
    }
  }, [journey, organizationId, preparation, readiness, tenantId]);

  useEffect(() => {
    const scope = `${organizationId}:${tenantId}`;
    if (!automaticPreparationRequired || !organizationId || attemptedPreparationScope.current === scope) {
      return;
    }
    attemptedPreparationScope.current = scope;
    void prepareWorkspace();
  }, [automaticPreparationRequired, organizationId, prepareWorkspace, tenantId]);

  if (
    journey.isLoading ||
    (prerequisitesComplete && (readiness.loading || preparation.isPending))
  ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary.default} />
      </View>
    );
  }

  if (journey.error || !projection) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t('onboarding.renderers.unavailable')}</Text>
        <TouchableOpacity style={styles.button} onPress={() => void journey.refetch()}>
          <Text style={styles.buttonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} accessibilityRole="summary">
      <Text style={styles.title}>{t('onboarding.progressiveExperience.readyToStart.presentation.title')}</Text>
      <Text style={styles.text}>
        {readyForTrial
          ? t('onboarding.progressiveExperience.readyToStart.presentation.states.READY')
          : t('onboarding.progressiveExperience.readyToStart.presentation.states.NOT_READY')}
      </Text>

      {incompletePrerequisites.map(({ step, action }) => (
        <View key={step.stepId} style={styles.card}>
          <Text style={styles.text}>{translateOnboardingToken(step.titleToken)}</Text>
          {uniqueBlockers(step.blockers).map(blocker => (
            <Text key={blocker.requirementId} style={styles.blocker}>
              {translateOnboardingBlocker(
                blocker.blockerToken,
                blocker.currentValue,
                blocker.requiredValue,
                blocker.titleToken
              )}
            </Text>
          ))}
          {action ? (
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                executeOnboardingAction(router, action, {
                  tenant_id: tenantId,
                  step_id: step.stepId,
                })
              }
            >
              <Text style={styles.buttonText}>
                {translateOnboardingToken(action.labelToken, action.fallbackToken)}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      {managementSteps.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.text}>
            {t('onboarding.progressiveExperience.readyToStart.presentation.manageSetup')}
          </Text>
          {managementSteps.map(({ step, action }) =>
            action ? (
              <TouchableOpacity
                key={step.stepId}
                style={styles.button}
                onPress={() =>
                  executeOnboardingAction(router, action, {
                    tenant_id: tenantId,
                    step_id: step.stepId,
                  })
                }
              >
                <Text style={styles.buttonText}>
                  {translateOnboardingToken(action.labelToken, action.fallbackToken)}
                </Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      ) : null}

      {prerequisitesComplete && readiness.error ? (
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.blocker}>{t('onboarding.renderers.unavailable')}</Text>
          <TouchableOpacity style={styles.button} onPress={() => void readiness.refresh()}>
            <Text style={styles.buttonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {prerequisitesComplete && readiness.data && !readiness.data.authorizesHandoff ? (
        <View style={styles.card} accessibilityRole="summary">
          <Text style={styles.text}>
            {t('onboarding.progressiveExperience.readyToStart.presentation.finalReadiness.title')}
          </Text>
          <Text style={styles.text}>
            {t('onboarding.progressiveExperience.readyToStart.presentation.finalReadiness.message')}
          </Text>
          {preparationFailure ? (
            <TouchableOpacity style={styles.button} onPress={() => {
              attemptedPreparationScope.current = null;
              void prepareWorkspace();
            }}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          ) : null}
          {readiness.data.blockers.filter(
            item => item.nextAction?.targetId !== 'onboarding.workspace_preparation'
          ).map(item => {
            const action = item.nextAction;
            return (
              <View key={`${item.providerId}:${item.itemId}`} style={styles.requirementCard}>
                {action ? (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      executeReadinessAction(
                        router,
                        action,
                        { tenant_id: tenantId },
                        { onRefresh: () => void readiness.refresh() }
                      )
                    }
                  >
                    <Text style={styles.buttonText}>
                      {translateOnboardingToken(action.labelToken)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {readyForTrial ? (
        <CommercialRetentionScreen
          tenantId={tenantId}
          applicationStatus={applicationStatus}
          onCommercialEligibilityConfirmed={onCommercialEligibilityConfirmed}
          onCommercialConfirmationAcknowledged={onCommercialConfirmationAcknowledged}
        />
      ) : null}
    </ScrollView>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    screen: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background.default,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    title: { ...theme.typography.h4, color: theme.colors.text.primary },
    text: { ...theme.typography.body1, color: theme.colors.text.primary },
    blocker: { ...theme.typography.body2, color: theme.colors.feedback.error },
    card: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.surface.default,
    },
    requirementCard: { gap: theme.spacing.sm },
    button: {
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.primary.default,
    },
    buttonText: { ...theme.typography.button, color: theme.colors.text.onPrimary },
  });
