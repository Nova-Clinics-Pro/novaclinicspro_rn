/**
 * SetupWizardFlow
 * Clinic preparation flow with stepper, navigation, and embedded step screens
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, BackHandler, AppState, AppStateStatus, AccessibilityInfo } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  executePendingMutation,
  useDemoStatusQuery,
  useSubmitStepMutation,
} from '../../data/repositories/onboarding.repository.impl';
import { createTenantSubscriptionApi, getSubscriptionPlansApi, SubscriptionPlanInfo } from '../../data/datasources/onboarding.api';
import { WizardStepper } from '../components/WizardStepper';
import { OfflineBanner } from '../components/OfflineBanner';
import { PendingMutationRecoveryBanner } from '../components/PendingMutationRecoveryBanner';
import { DemoStatusBanner } from '../components/DemoStatusBanner';
import { JourneySurface } from '../components/JourneySurface';
import { DraftConflictModal } from '../components/DraftConflictModal';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { ClinicProfileScreen } from './steps/ClinicProfileScreen';
import { BillingSetupScreen } from './steps/BillingSetupScreen';
import { PaymentSetupScreen } from './steps/PaymentSetupScreen';
import { GoLiveScreen } from './steps/GoLiveScreen';
import { getPreparationStepDisplayName, SERVICE_CATALOGUE_ALIASES, ServiceCatalogueAlias } from '../../constants/stepAliases';
import {
  hydrateWizardDraftFromStorage,
  syncWizardDraftToStorage,
  useWizardStore,
} from '../stores/wizard.store';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useJourneyFoundation } from '../hooks/useJourneyFoundation';
import { JourneyVisibilityError } from '../../domain/entities/journey-visibility.entity';
import { createDraftRevisionEvidence } from '../../domain/entities/step-revision.entity';
import {
  RevisionAwareSaveHandler,
  useDraftConflictRecovery,
} from '../hooks/useDraftConflictRecovery';
import {
  PendingMutationReplayCoordinator,
  type ReplayAuthorityResult,
} from '../../application/pending-mutation-replay.coordinator';
import { executeRecoverableStepSubmission } from '../../application/recoverable-step-submission';
import { usePendingMutationReplayLifecycle } from '../hooks/usePendingMutationReplayLifecycle';
import { usePendingMutationsStore } from '../stores/pending-mutations.store';
import type { PendingMutationRecord } from '../../domain/entities/pending-mutation.entity';

interface Step {
  code: string;
  name: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked';
  order: number;
}

const getVisibleStepSignature = (visibleSteps?: string[] | null) =>
  visibleSteps && visibleSteps.length > 0 ? visibleSteps.join('|') : null;

const getJourneyFailureKey = (error: unknown): string => {
  if (!(error instanceof JourneyVisibilityError)) {
    return 'onboarding.progressiveExperience.journey.failure.generic';
  }
  return {
    UNAUTHORIZED: 'onboarding.progressiveExperience.journey.failure.unauthorized',
    FORBIDDEN: 'onboarding.progressiveExperience.journey.failure.forbidden',
    TENANT_MISMATCH: 'onboarding.progressiveExperience.journey.failure.tenantMismatch',
    PROJECTION_UNAVAILABLE: 'onboarding.progressiveExperience.journey.failure.unavailable',
    CONTRACT_MISMATCH: 'onboarding.progressiveExperience.journey.failure.contractMismatch',
    BACKEND_FAILURE: 'onboarding.progressiveExperience.journey.failure.generic',
  }[error.kind];
};

const createSubmissionId = () => {
  const cryptoRandomUUID = globalThis.crypto?.randomUUID;
  if (cryptoRandomUUID) {
    return cryptoRandomUUID.call(globalThis.crypto);
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export function SetupWizardFlow() {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const netInfo = useNetInfo();
  const router = useRouter();
  const { tenantId: tenantIdParam } = useLocalSearchParams<{ tenantId: string }>();
  const { currentUser, isAuthenticated } = useAuth();

  // Use tenantId from URL params, or fall back to currentUser's tenantId
  const tenantId = tenantIdParam || currentUser?.tenantId || '';
  const setWizardTenantId = useWizardStore(state => state.setTenantId);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [hasManuallyNavigated, setHasManuallyNavigated] = useState(false);
  const [isHandlingNext, setIsHandlingNext] = useState(false);
  const [isSettingUpSubscription, setIsSettingUpSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanInfo[]>([]);
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState('BASIC');
  const [showProgressUpdatedNotice, setShowProgressUpdatedNotice] = useState(false);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const [busyRecoveryMutationId, setBusyRecoveryMutationId] =
    useState<string | null>(null);
  const currentStepSaveHandlerRef = useRef<RevisionAwareSaveHandler | null>(null);
  const submissionIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundStepSignatureRef = useRef<string | null>(null);
  const latestVisibleStepsSignatureRef = useRef<string | null>(null);
  const nextButtonRef = useRef<View>(null);
  const currentStep = steps[currentStepIndex];
  const submitMutation = useSubmitStepMutation(tenantId, currentStep?.code || '');
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const isNextPending = isHandlingNext || submitMutation.isPending;
  const isNextDisabled = isNextPending || isOffline;

  // Fetch onboarding status - only if tenantId is available
  const {
    data: statusData,
    isLoading,
    error,
    refetch,
    journey,
    projection,
    isRefreshing,
    revalidateTenant,
    scopeMatches,
    organizationId,
    statusDomain,
  } = useJourneyFoundation(tenantId, {
    enabled: !!tenantId, // Only fetch if tenantId exists
  });
  const refreshReplayAuthority = useCallback(
    async (
      record: PendingMutationRecord,
      signal: AbortSignal
    ): Promise<ReplayAuthorityResult> => {
      if (!isAuthenticated) return { status: 'AUTHORIZATION_LOST' };
      if (signal.aborted) return { status: 'SCOPE_CHANGED' };
      if (!(await revalidateTenant())) return { status: 'SCOPE_CHANGED' };
      const latest = await refetch();
      if (signal.aborted) return { status: 'SCOPE_CHANGED' };
      if (
        latest.data?.tenant_id !== record.tenantId ||
        latest.projection?.identity.tenantId !== record.tenantId
      ) {
        return { status: 'SCOPE_CHANGED' };
      }
      const visible = latest.projection.visibleSteps.some(
        (step) => step.stepId === record.stepCode
      );
      const step = latest.statusDomain?.steps.get(record.stepCode);
      if (!visible || !step || step.isComplete) {
        return { status: 'STEP_UNAVAILABLE' };
      }
      const evidence = step.authoritativeEvidence;
      if (!evidence) return { status: 'E6_CONFLICT' };
      return {
        status: 'READY',
        scope: {
          userId: record.userId,
          organizationId: record.organizationId,
          tenantId: record.tenantId,
        },
        stepCode: record.stepCode,
        expectedRevision: evidence.revision.value,
        templateVersion: evidence.projectionIdentity.templateVersion,
        capabilityRevision:
          evidence.projectionIdentity.capabilityRevision,
      };
    },
    [isAuthenticated, refetch, revalidateTenant]
  );
  const replayCoordinator = useMemo(
    () =>
      new PendingMutationReplayCoordinator({
        refreshAuthority: refreshReplayAuthority,
        execute: executePendingMutation,
      }),
    [refreshReplayAuthority]
  );
  const pendingMutationScope = useMemo(
    () =>
      currentUser?.userId && organizationId && tenantId && scopeMatches
        ? {
          userId: currentUser.userId,
          organizationId,
          tenantId,
        }
        : null,
    [currentUser?.userId, organizationId, scopeMatches, tenantId]
  );
  usePendingMutationReplayLifecycle({
    coordinator: replayCoordinator,
    scope: pendingMutationScope,
    isAuthenticated,
  });
  const pendingMutationRecords = usePendingMutationsStore(
    (state) => state.records
  );
  const pendingMutationRecoveryRequired = usePendingMutationsStore(
    (state) => state.recoveryRequired
  );
  const refreshConflictStatus = useCallback(async () => {
    const result = await refetch();
    return result.statusDomain;
  }, [refetch]);
  const announceConflictResolution = useCallback(
    (outcome: 'USE_LATEST' | 'KEEP_LOCAL') => {
      AccessibilityInfo.announceForAccessibility(
        t(
          `onboarding.progressiveExperience.conflict.success.${
            outcome === 'USE_LATEST' ? 'useLatest' : 'keepLocal'
          }`
        )
      );
    },
    [t]
  );
  const projectedStepCodes = useMemo(
    () => projection?.visibleSteps.map((step) => step.stepId) ?? [],
    [projection?.visibleSteps]
  );
  const conflictRecovery = useDraftConflictRecovery({
    organizationId,
    tenantId,
    status: statusDomain,
    activeStepCode: currentStep?.code ?? null,
    projectedStepCodes,
    refreshStatus: refreshConflictStatus,
    onRecovered: () => setRecoveryVersion((version) => version + 1),
    announce: announceConflictResolution,
  });
  const currentDraftBaseEvidence = useMemo(() => {
    const authoritativeEvidence = currentStep
      ? statusDomain?.steps.get(currentStep.code)?.authoritativeEvidence
      : null;
    if (!authoritativeEvidence || !organizationId) return undefined;
    return createDraftRevisionEvidence({
      organizationId,
      tenantId,
      stepCode: authoritativeEvidence.stepCode,
      revision: authoritativeEvidence.revision.value,
      templateVersion:
        authoritativeEvidence.projectionIdentity.templateVersion,
      capabilityRevision:
        authoritativeEvidence.projectionIdentity.capabilityRevision,
    });
  }, [currentStep, organizationId, statusDomain, tenantId]);
  const isCurrentDemoTenant =
    currentUser?.isDemoTenant === true && currentUser.tenantId === tenantId;
  const { data: demoStatusData } = useDemoStatusQuery(tenantId, {
    enabled: isCurrentDemoTenant,
    retry: false,
  });
  const readyToStartStep = statusData?.per_step_validation?.go_live_checklist;
  const readyToStartStepIndex = steps.findIndex(step => step.code === 'go_live_checklist');
  const canOpenReadyToStartChecklist = readyToStartStepIndex >= 0 && readyToStartStep?.actionable === true;

  useEffect(() => {
    if (tenantId) {
      setWizardTenantId(tenantId);
    }
  }, [tenantId, setWizardTenantId]);

  useEffect(() => {
    void hydrateWizardDraftFromStorage();

    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useWizardStore.subscribe(
      state => state.stepDrafts,
      () => {
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }

        syncTimeout = setTimeout(() => {
          void syncWizardDraftToStorage();
        }, 500);
      }
    );

    return () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      unsubscribe();
    };
  }, []);

  // Refetch status when screen comes into focus (after navigating back from
  // external screens). refetch() bypasses the query's `enabled` guard and
  // always dispatches — guard explicitly so a focus event during/after
  // logout can't fire an authenticated request with no JWT.
  useFocusEffect(
    React.useCallback(() => {
      if (tenantId && isAuthenticated) {
        refetch();
      }
    }, [tenantId, isAuthenticated, refetch])
  );

  useEffect(() => {
    if (!journey || journey.identity.tenantId !== tenantId) {
      setSteps([]);
      return;
    }
    const stepsArray: Step[] = journey.cards.map(card => ({
      code: card.stepCode,
      name: getPreparationStepDisplayName(card.stepCode, t),
      status: card.status === 'complete' ? 'completed' : 'not_started',
      order: card.order,
    }));
    latestVisibleStepsSignatureRef.current = getVisibleStepSignature(
      journey.cards.map(card => card.stepCode)
    );
    setSteps(stepsArray);

    if (!hasManuallyNavigated && stepsArray.length > 0) {
      const firstIncompleteIndex = stepsArray.findIndex(step => step.status === 'not_started');
      setCurrentStepIndex(firstIncompleteIndex >= 0 ? firstIncompleteIndex : stepsArray.length - 1);
    } else if (currentStepIndex >= stepsArray.length && stepsArray.length > 0) {
      setCurrentStepIndex(stepsArray.length - 1);
    }
  }, [currentStepIndex, hasManuallyNavigated, journey, t, tenantId]);

  useEffect(() => {
    setShowProgressUpdatedNotice(false);
  }, [currentStepIndex]);

  const persistDraftOnLifecyclePause = useCallback(async () => {
    backgroundStepSignatureRef.current = latestVisibleStepsSignatureRef.current;

    if (!useWizardStore.getState().isDirty) {
      return;
    }

    await syncWizardDraftToStorage();
  }, []);

  const hydrateDraftAndRefreshStatus = useCallback(async () => {
    await hydrateWizardDraftFromStorage();

    if (!tenantId || !isAuthenticated) {
      return;
    }

    const previousSignature = backgroundStepSignatureRef.current;
    const result = await refetch();
    const refreshedProjection = result.projection;
    const refreshedSignature = getVisibleStepSignature(
      refreshedProjection?.visibleSteps.map(step => step.stepId) ??
        projection?.visibleSteps.map(step => step.stepId)
    );

    latestVisibleStepsSignatureRef.current = refreshedSignature;
    setShowProgressUpdatedNotice(
      Boolean(previousSignature && refreshedSignature && previousSignature !== refreshedSignature)
    );
  }, [tenantId, isAuthenticated, projection, refetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'inactive' || nextAppState === 'background') {
        void persistDraftOnLifecyclePause();
        return;
      }

      if (
        nextAppState === 'active' &&
        (previousAppState === 'inactive' || previousAppState === 'background')
      ) {
        void hydrateDraftAndRefreshStatus();
      }
    });

    return () => subscription.remove();
  }, [hydrateDraftAndRefreshStatus, persistDraftOnLifecyclePause]);

  const handleNext = async () => {
    if (isSubmittingRef.current || isNextPending || isOffline) {
      return;
    }

    isSubmittingRef.current = true;
    const submissionId = createSubmissionId();
    submissionIdRef.current = submissionId;

    // Mark that user has manually navigated
    setHasManuallyNavigated(true);
    setIsHandlingNext(true);

    try {
      const stepAtSubmission = currentStep;
      if (!stepAtSubmission) return;
      const saveHandler = currentStepSaveHandlerRef.current;
      const evidence =
        statusDomain?.steps.get(stepAtSubmission.code)?.authoritativeEvidence;
      const draftData = asRecord(
        useWizardStore.getState().stepDrafts[stepAtSubmission.code]?.data
      );
      const recoveryBody =
        stepAtSubmission.code === 'operating_hours' &&
        Array.isArray(draftData?.schedule)
          ? { operating_hours: draftData.schedule }
          : stepAtSubmission.code === 'rooms_and_therapy_beds' &&
              Array.isArray(draftData?.rooms)
            ? { rooms: draftData.rooms }
            : null;
      await conflictRecovery.executeSubmission({
        stepCode: stepAtSubmission.code,
        idempotencyKey: submissionId,
        submit: async ({ expectedRevision, idempotencyKey }) => {
          const runOriginalSubmission = async () => {
            if (saveHandler) {
              await saveHandler({ expectedRevision, idempotencyKey });
              return;
            }

            await submitMutation.mutateAsync(
              {
                idempotencyKey,
                data: recoveryBody ?? {},
                mark_complete: true,
                expected_revision: expectedRevision,
              },
              {
                onSuccess: () => {
                  if (submissionIdRef.current !== submissionId) return;
                },
                onError: () => {
                  if (submissionIdRef.current !== submissionId) return;
                },
              }
            );
            if (submissionIdRef.current !== submissionId) return;

            await refetch();
            if (submissionIdRef.current !== submissionId) return;
            if (currentStepIndex < steps.length - 1) {
              setCurrentStepIndex(currentStepIndex + 1);
            } else {
              router.replace(`/clinic-admin?tenantId=${tenantId}`);
            }
          };

          if (
            !recoveryBody ||
            !evidence ||
            !currentUser?.userId ||
            !organizationId
          ) {
            await runOriginalSubmission();
            return;
          }

          await executeRecoverableStepSubmission({
            coordinator: replayCoordinator,
            mutationId: submissionId,
            idempotencyKey,
            scope: {
              userId: currentUser.userId,
              organizationId,
              tenantId,
            },
            stepCode: stepAtSubmission.code,
            body: recoveryBody,
            expectedRevision,
            templateVersion: evidence.projectionIdentity.templateVersion,
            capabilityRevision:
              evidence.projectionIdentity.capabilityRevision,
            connectivityAtAttempt:
              netInfo.isConnected === true &&
              netInfo.isInternetReachable !== false
                ? 'ONLINE'
                : 'INDETERMINATE',
            submit: runOriginalSubmission,
          });
        },
      });
    } catch (error) {
      if (submissionIdRef.current !== submissionId) {
        return;
      }
      console.error('[SetupWizardFlow] Error submitting step:', error);
      Alert.alert(
        t('common.error'),
        t('onboarding.progressiveExperience.flow.saveProgressError')
      );
    } finally {
      if (submissionIdRef.current === submissionId) {
        setIsHandlingNext(false);
        isSubmittingRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (currentStep?.code !== 'subscription_payment' || subscriptionPlans.length > 0) {
      return;
    }

    let isMounted = true;
    getSubscriptionPlansApi()
      .then(result => {
        if (!isMounted) {
          return;
        }
        const paidPlans = result.plans.filter(plan => plan.plan_code !== 'FREE');
        setSubscriptionPlans(paidPlans.length > 0 ? paidPlans : result.plans);
        const defaultPlan = paidPlans.find(plan => plan.plan_code === 'BASIC') || paidPlans[0] || result.plans[0];
        if (defaultPlan) {
          setSelectedSubscriptionPlan(defaultPlan.plan_code);
        }
      })
      .catch(error => {
        console.error('[SetupWizardFlow] Failed to load subscription plans:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [currentStep?.code, subscriptionPlans.length]);

  const handleSetupSubscriptionPayment = async () => {
    if (!tenantId || isSettingUpSubscription || isOffline) {
      return;
    }

    setIsSettingUpSubscription(true);
    try {
      const result = await createTenantSubscriptionApi(tenantId, {
        plan_code: selectedSubscriptionPlan,
        billing_cycle: 'monthly',
      });

      const planCode = result.plan_code || selectedSubscriptionPlan;
      const billingCycle = result.billing_cycle || 'monthly';
      const provider = result.provider || 'manual';

      if (result.checkout_url) {
        await WebBrowser.openBrowserAsync(result.checkout_url);
        await submitMutation.mutateAsync({
          idempotencyKey: createSubmissionId(),
          data: {
            subscription_id: result.subscription_id,
            plan_code: planCode,
            billing_cycle: billingCycle,
            provider,
            provider_subscription_id: result.provider_subscription_id,
            checkout_started: true,
          },
          mark_complete: true,
        });
        await handleStepComplete();
        return;
      }

      if (result.requires_internal_payment_setup || provider === 'manual') {
        Alert.alert(
          'Payment Provider Not Configured',
          'Subscription payment must be completed in a real payment provider checkout. Please configure a supported provider such as Razorpay, Stripe, or PayPal, then try again.'
        );
        return;
      }

      await submitMutation.mutateAsync({
        idempotencyKey: createSubmissionId(),
        data: {
          subscription_id: result.subscription_id,
          plan_code: planCode,
          billing_cycle: billingCycle,
          provider,
          provider_subscription_id: result.provider_subscription_id,
          checkout_started: false,
        },
        mark_complete: true,
      });

      await handleStepComplete();
    } catch (error: any) {
      console.error('[SetupWizardFlow] Subscription payment setup failed:', error);
      Alert.alert('Payment Setup Failed', error?.message || 'Unable to set up subscription payment. Please try again.');
    } finally {
      setIsSettingUpSubscription(false);
    }
  };

  // Callback for steps to register their save handler
  const registerSaveHandler = useCallback((handler: RevisionAwareSaveHandler | null) => {
    console.log('[SetupWizardFlow] Registering save handler:', handler ? 'function' : 'null');
    currentStepSaveHandlerRef.current = handler;
  }, []);

  const handleStepComplete = async () => {
    // Mark that user has manually navigated FIRST (to prevent auto-jump during refetch)
    setHasManuallyNavigated(true);

    try {
      // Refetch status before navigation so the next step renders from fresh status.
      console.log('[SetupWizardFlow] Step completed, refetching status before advance...');
      await refetch();

      // Auto-advance to next step only after refetch resolves.
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStepIndex(nextIndex);
      }
    } catch (error) {
      console.error('[SetupWizardFlow] Error refetching after step complete:', error);
      Alert.alert(t('common.error'), t('onboarding.progressiveExperience.flow.refreshProgressError'));
    }
  };

  const handlePrevious = useCallback(async () => {
    // Mark that user has manually navigated
    setHasManuallyNavigated(true);

    await syncWizardDraftToStorage();

    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStepIndex > 0) {
        void handlePrevious();
      }

      return true;
    });

    return () => subscription.remove();
  }, [currentStepIndex, handlePrevious]);

  useEffect(() => {
    return () => {
      submissionIdRef.current = null;
      isSubmittingRef.current = false;
    };
  }, []);

  const handleExit = () => {
    setShowProgressUpdatedNotice(false);
    Alert.alert(
      t('onboarding.progressiveExperience.flow.exitTitle'),
      t('onboarding.progressiveExperience.flow.exitMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.close'), onPress: () => router.replace(`/clinic-admin?tenantId=${tenantId}`) },
      ]
    );
  };

  const navigateToStep = useCallback((stepCode: string) => {
    if (!scopeMatches || journey?.identity.tenantId !== tenantId) return false;
    const stepIndex = steps.findIndex(step => step.code === stepCode);
    if (stepIndex < 0) {
      return false;
    }

    setHasManuallyNavigated(true);
    setShowProgressUpdatedNotice(false);
    setCurrentStepIndex(stepIndex);
    return true;
  }, [journey?.identity.tenantId, scopeMatches, steps, tenantId]);

  const retryPendingMutation = useCallback(
    async (record: PendingMutationRecord) => {
      setBusyRecoveryMutationId(record.mutationId);
      try {
        await replayCoordinator.retry(record.mutationId);
      } catch {
        usePendingMutationsStore.getState().setRecoveryRequired(true);
      } finally {
        setBusyRecoveryMutationId(null);
      }
    },
    [replayCoordinator]
  );

  const confirmDiscardPendingMutation = useCallback(
    (record: PendingMutationRecord, editAfterDiscard = false) => {
      Alert.alert(
        t(
          'onboarding.progressiveExperience.mutationRecovery.discard.title'
        ),
        t(
          'onboarding.progressiveExperience.mutationRecovery.discard.message'
        ),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t(
              'onboarding.progressiveExperience.mutationRecovery.actions.discard'
            ),
            style: 'destructive',
            onPress: () => {
              setBusyRecoveryMutationId(record.mutationId);
              void replayCoordinator
                .discard(record.mutationId)
                .then(() => {
                  if (editAfterDiscard) navigateToStep(record.stepCode);
                })
                .catch(() => {
                  usePendingMutationsStore
                    .getState()
                    .setRecoveryRequired(true);
                })
                .finally(() => setBusyRecoveryMutationId(null));
            },
          },
        ]
      );
    },
    [navigateToStep, replayCoordinator, t]
  );

  const journeyNavigationInFlight = useRef(false);
  const navigateToProjectedStep = useCallback(async (stepCode: string) => {
    if (journeyNavigationInFlight.current || !journey?.cards.some(card => card.stepCode === stepCode)) {
      return;
    }
    journeyNavigationInFlight.current = true;
    try {
      if (await revalidateTenant()) navigateToStep(stepCode);
    } catch {
      return;
    } finally {
      journeyNavigationInFlight.current = false;
    }
  }, [journey?.cards, navigateToStep, revalidateTenant]);

  const handleContinueSetupFromBanner = useCallback(() => {
    const targetStep = statusData?.next_recommended_step;
    if (targetStep && navigateToStep(targetStep)) {
      return;
    }

    const firstActionableStep = steps.find(step => step.status !== 'completed' && step.status !== 'blocked');
    if (firstActionableStep) {
      navigateToStep(firstActionableStep.code);
    }
  }, [navigateToStep, statusData?.next_recommended_step, steps]);

  const handleReadyToStartFromBanner = useCallback(() => {
    if (canOpenReadyToStartChecklist) {
      navigateToStep('go_live_checklist');
    }
  }, [canOpenReadyToStartChecklist, navigateToStep]);

  const renderStepContent = () => {
    if (steps.length === 0) return null;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return null;

    // Service-catalogue aliases all redirect to the Treatments management screen.
    // See SERVICE_CATALOGUE_ALIASES for the full list (Design Property 5, Req 2 AC-2).
    if (SERVICE_CATALOGUE_ALIASES.includes(currentStep.code as ServiceCatalogueAlias)) {
      return (
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
            Treatments & Therapies
          </Text>
          <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
            {t('onboarding.progressiveExperience.flow.treatmentsDescription')}
          </Text>
          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, borderRadius: theme.spacing.sm, alignItems: 'center', marginBottom: theme.spacing.md }]}
            onPress={() => router.push('/clinic-admin/settings/treatments')}
          >
            <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
              Go to Treatments Management
            </Text>
          </TouchableOpacity>
          <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
            Click Next after adding at least one treatment
          </Text>
        </View>
      );
    }

    // Render appropriate screen based on step code
    switch (currentStep.code) {
      case 'clinic_profile':
        return <ClinicProfileScreen
          tenantId={tenantId || ''}
          isWizardMode={true}
          onSuccess={handleStepComplete}
          onRegisterSaveHandler={registerSaveHandler}
          draftBaseEvidence={currentDraftBaseEvidence}
        />;

      case 'operating_hours':
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
              Operating Hours
            </Text>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
              {t('onboarding.progressiveExperience.flow.operatingHoursDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, borderRadius: theme.spacing.sm, alignItems: 'center', marginBottom: theme.spacing.md }]}
              onPress={() => router.push('/clinic-admin/settings/operating-hours')}
            >
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                Go to Operating Hours Management
              </Text>
            </TouchableOpacity>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Click Next after setting your operating hours
            </Text>
          </View>
        );

      case 'rooms_and_therapy_beds':
      case 'treatment_rooms':
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
              Rooms & Therapy Beds
            </Text>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
              {t('onboarding.progressiveExperience.flow.roomsDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, borderRadius: theme.spacing.sm, alignItems: 'center', marginBottom: theme.spacing.md }]}
              onPress={() => router.push('/clinic-admin/settings/rooms')}
            >
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                Go to Rooms Management
              </Text>
            </TouchableOpacity>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Click Next after adding at least one room
            </Text>
          </View>
        );

      case 'staff_and_roles':
      case 'staff_setup':
      case 'staff_members':
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
              Staff & Roles
            </Text>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
              {t('onboarding.progressiveExperience.flow.staffDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, borderRadius: theme.spacing.sm, alignItems: 'center', marginBottom: theme.spacing.md }]}
              onPress={() => router.push('/clinic-admin/staff')}
            >
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                Go to Staff Management
              </Text>
            </TouchableOpacity>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Click Next after adding at least one staff member
            </Text>
          </View>
        );

      case 'inventory_setup':
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
              {t('onboarding.progressiveExperience.flow.inventoryTitle')}
            </Text>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
              {t('onboarding.progressiveExperience.flow.inventoryDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.linkButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, borderRadius: theme.spacing.sm, alignItems: 'center', marginBottom: theme.spacing.md }]}
              onPress={() => router.push('/clinic-admin/inventory')}
            >
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                Go to Inventory Management
              </Text>
            </TouchableOpacity>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
              Click Next after adding inventory items
            </Text>
          </View>
        );

      case 'financials_and_tax':
      case 'billing_setup':
      case 'billing_settings':
        return <BillingSetupScreen
          tenantId={tenantId || ''}
          isWizardMode={true}
          onSuccess={handleStepComplete}
          onRegisterSaveHandler={registerSaveHandler}
          draftBaseEvidence={currentDraftBaseEvidence}
        />;

      case 'payment_setup':
      case 'payment_methods':
        return <PaymentSetupScreen
          tenantId={tenantId || ''}
          isWizardMode={true}
          onSuccess={handleStepComplete}
          onRegisterSaveHandler={registerSaveHandler}
          draftBaseEvidence={currentDraftBaseEvidence}
        />;

      case 'subscription_payment':
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginBottom: theme.spacing.md }]}>
              {t('onboarding.progressiveExperience.flow.subscriptionTitle')}
            </Text>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
              {t('onboarding.progressiveExperience.flow.subscriptionDescription')}
            </Text>
            <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
              {subscriptionPlans.map(plan => {
                const isSelected = selectedSubscriptionPlan === plan.plan_code;
                return (
                  <TouchableOpacity
                    key={plan.plan_code}
                    style={{
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary.default : theme.colors.border.default,
                      backgroundColor: isSelected ? theme.colors.primary.light : theme.colors.background.elevated,
                      padding: theme.spacing.md,
                      borderRadius: theme.spacing.sm,
                    }}
                    onPress={() => setSelectedSubscriptionPlan(plan.plan_code)}
                  >
                    <Text style={[theme.typography.subtitle1, { color: theme.colors.text.primary }]}>
                      {plan.name}
                    </Text>
                    <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
                      ₹{plan.base_price.toLocaleString('en-IN')} / month
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[
                styles.linkButton,
                {
                  backgroundColor: theme.colors.primary.default,
                  padding: theme.spacing.md,
                  borderRadius: theme.spacing.sm,
                  alignItems: 'center',
                  opacity: isSettingUpSubscription || isOffline ? 0.7 : 1,
                },
              ]}
              disabled={isSettingUpSubscription || isOffline}
              accessibilityState={{ disabled: isSettingUpSubscription || isOffline }}
              accessibilityLabel={
                isOffline
                  ? t('onboarding.progressiveExperience.offline.submitDisabled')
                  : t('onboarding.progressiveExperience.flow.reviewSubscription')
              }
              onPress={handleSetupSubscriptionPayment}
            >
              {isSettingUpSubscription ? (
                <ActivityIndicator color={theme.colors.text.onPrimary} />
              ) : (
                <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                  {t('onboarding.progressiveExperience.flow.reviewSubscription')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'go_live_checklist':
        return (
          <GoLiveScreen
            tenantId={tenantId || ''}
            onComplete={() => {
              router.push(`/onboarding/commercial-retention?tenantId=${tenantId}` as any);
            }}
            onNavigateToSetupStep={navigateToProjectedStep}
            onOpenWorkspacePreparation={() => {
              router.push(`/onboarding/workspace-preparation?tenantId=${tenantId}` as any);
            }}
          />
        );

      default:
        return (
          <View style={{ padding: theme.spacing.lg }}>
            <Text style={[theme.typography.body1, { color: theme.colors.text.secondary }]}>
              Step {currentStep.code} is not yet implemented.
            </Text>
          </View>
        );
    }
  };

  if (!tenantId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[theme.typography.body1, { color: theme.colors.feedback.error }]}>
          Missing tenant ID
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingScreen message={t('onboarding.progressiveExperience.journey.loading')} />;
  }

  if (error) {
    const errorMessage = t(getJourneyFailureKey(error));
    return (
      <ErrorScreen
        title={t('onboarding.progressiveExperience.flow.loadPreparationFailed')}
        message={errorMessage}
        retryLabel={t('onboarding.progressiveExperience.journey.retry')}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View
        style={styles.container}
        accessibilityElementsHidden={conflictRecovery.visible}
        importantForAccessibility={
          conflictRecovery.visible ? 'no-hide-descendants' : 'auto'
        }
      >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.default, padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[theme.typography.h5, { color: theme.colors.text.primary }]}>
            {t('onboarding.progressiveExperience.flow.prepareYourClinic')}
          </Text>
          <TouchableOpacity onPress={handleExit}>
            <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stepper */}
      {steps.length > 0 && <WizardStepper steps={steps} currentStepIndex={currentStepIndex} />}

      <OfflineBanner isOffline={isOffline} />
      <PendingMutationRecoveryBanner
        records={pendingMutationRecords}
        recoveryRequired={pendingMutationRecoveryRequired}
        busyMutationId={busyRecoveryMutationId}
        onRetry={(record) => void retryPendingMutation(record)}
        onEdit={(record) => confirmDiscardPendingMutation(record, true)}
        onDiscard={(record) => confirmDiscardPendingMutation(record)}
      />

      {demoStatusData && (
        <View style={{ marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <DemoStatusBanner
            demoExpiresAt={demoStatusData.demo_expires_at}
            trialExpiresAt={demoStatusData.trial_expires_at}
            isDemoExpired={demoStatusData.is_demo_expired}
            isTrialExpired={demoStatusData.is_trial_expired}
            onExtendDemo={handleContinueSetupFromBanner}
            onTransitionToLive={handleReadyToStartFromBanner}
            isExtendDisabled={isNextPending}
            isTransitionDisabled={isNextPending || !canOpenReadyToStartChecklist}
          />
        </View>
      )}

      {showProgressUpdatedNotice && (
        <View
          accessibilityRole="text"
          style={[
            styles.progressUpdatedNotice,
            {
              backgroundColor: theme.colors.feedback.warningLight,
              borderColor: theme.colors.feedback.warning,
              marginHorizontal: theme.spacing.lg,
              marginTop: theme.spacing.md,
              padding: theme.spacing.md,
              borderRadius: theme.spacing.sm,
            },
          ]}
        >
          <Ionicons name="information-circle" size={20} color={theme.colors.feedback.warning} />
          <Text
            style={[
              theme.typography.body2,
              {
                color: theme.colors.text.primary,
                marginLeft: theme.spacing.sm,
                flex: 1,
              },
            ]}
          >
            {t('onboarding.progressiveExperience.flow.progressUpdatedNotice')}
          </Text>
        </View>
      )}

      {/* Step Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ flexGrow: 1 }}
        accessibilityLabel={t('onboarding.progressiveExperience.journey.heading')}
        accessibilityState={{ busy: isRefreshing }}
      >
        {journey && (
          <JourneySurface
            journey={journey}
            onSelectStep={navigateToProjectedStep}
            refreshing={isRefreshing}
          />
        )}
        {journey?.availability === 'available' && journey.cards.length > 0 ? (
          <React.Fragment key={`${tenantId}:${currentStep?.code}:${recoveryVersion}`}>
            {renderStepContent()}
          </React.Fragment>
        ) : null}
      </ScrollView>

      {/* Navigation Footer */}
      {journey?.availability === 'available' &&
        journey.cards.length > 0 &&
        currentStep?.code !== 'go_live_checklist' && (
        <View style={[styles.footer, { backgroundColor: theme.colors.surface.default, padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border.default, flexDirection: 'row', justifyContent: 'space-between' }]}>
        <TouchableOpacity
          style={[
            styles.navButton,
            {
              backgroundColor: currentStepIndex === 0 ? theme.colors.surface.elevated : theme.colors.surface.default,
              borderWidth: 1,
              borderColor: theme.colors.border.default,
              padding: theme.spacing.md,
              borderRadius: theme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: currentStepIndex === 0 || isNextPending ? 0.5 : 1,
              cursor: currentStepIndex === 0 || isNextPending ? ('not-allowed' as any) : ('pointer' as any),
            },
          ]}
          onPress={handlePrevious}
          disabled={currentStepIndex === 0 || isNextPending}
          accessibilityState={{ disabled: currentStepIndex === 0 || isNextPending }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text.primary} />
          <Text style={[theme.typography.button, { color: theme.colors.text.primary, marginLeft: theme.spacing.xs }]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={nextButtonRef}
          style={[
            styles.navButton,
            {
              backgroundColor: theme.colors.primary.default,
              padding: theme.spacing.md,
              borderRadius: theme.spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: isNextDisabled ? 0.7 : 1,
              cursor: isNextDisabled ? ('not-allowed' as any) : ('pointer' as any),
            },
          ]}
          onPress={handleNext}
          disabled={isNextDisabled}
          accessibilityState={{ disabled: isNextDisabled }}
          accessibilityLabel={
            isOffline
              ? t('onboarding.progressiveExperience.offline.submitDisabled')
              : currentStepIndex === steps.length - 1
                ? t('onboarding.progressiveExperience.flow.readyToStart')
                : t('common.next')
          }
        >
          {isNextPending ? (
            <ActivityIndicator size="small" color={theme.colors.text.onPrimary} />
          ) : (
            <>
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary, marginRight: theme.spacing.xs }]}>
                {currentStepIndex === steps.length - 1 ? t('onboarding.progressiveExperience.flow.readyToStart') : t('common.next')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.onPrimary} />
            </>
          )}
        </TouchableOpacity>
        </View>
      )}
      </View>
      <DraftConflictModal
        visible={conflictRecovery.visible}
        pendingAction={conflictRecovery.pendingAction}
        failure={conflictRecovery.failure}
        useLatestDisabled={conflictRecovery.useLatestDisabled}
        keepLocalDisabled={conflictRecovery.keepLocalDisabled}
        onUseLatest={() => void conflictRecovery.useLatest()}
        onKeepLocal={() => void conflictRecovery.keepLocal()}
        returnFocusRef={nextButtonRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // Styles set inline with theme
  },
  content: {
    flex: 1,
  },
  footer: {
    // Styles set inline with theme
  },
  navButton: {
    // Styles set inline with theme
  },
  linkButton: {
    // Styles set inline with theme
  },
  retryButton: {
    // Styles set inline with theme
  },
  progressUpdatedNotice: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
