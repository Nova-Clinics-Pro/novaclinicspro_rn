import type {
  JourneyCorrectiveAction,
  JourneyResolvedStep,
  JourneyVisibilityProjection,
} from '../entities/journey-visibility.entity';

export type OnboardingRuntimeStatus =
  | 'completed'
  | 'in_progress'
  | 'not_started'
  | 'blocked';

export interface OnboardingRuntimeStep {
  readonly step: JourneyResolvedStep;
  readonly stepId: string;
  readonly index: number;
  readonly status: OnboardingRuntimeStatus;
  readonly action: JourneyCorrectiveAction | null;
  /** One canonical pre-activation rule for opening a resolved setup step. */
  readonly isOpenable: boolean;
}

export interface OnboardingRuntime {
  readonly visibleSteps: readonly OnboardingRuntimeStep[];
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly selectedStepId: string | null;
  readonly selectedStepIndex: number;
  readonly selectedStep: OnboardingRuntimeStep | null;
  readonly recommendedNextStepId: string | null;
  readonly previousStepId: string | null;
  /**
   * Forward navigation is distinct from a selected step's corrective or
   * management action. It is available only after that step is complete.
   */
  readonly nextNavigationStepId: string | null;
}

const toRuntimeStatus = (
  state: JourneyResolvedStep['state'],
): OnboardingRuntimeStatus => {
  switch (state) {
    case 'COMPLETE': return 'completed';
    case 'IN_PROGRESS': return 'in_progress';
    case 'BLOCKED': return 'blocked';
    case 'NOT_STARTED': return 'not_started';
    case 'NOT_APPLICABLE':
      throw new Error('Non-applicable onboarding steps must be excluded before runtime mapping.');
  }
};

/** One frontend action rule; backend remains authoritative for availability. */
export const selectOnboardingRuntimeAction = (
  step: JourneyResolvedStep,
): JourneyCorrectiveAction | null => {
  if (step.state === 'NOT_APPLICABLE') return null;
  const actions = step.state === 'COMPLETE'
    ? step.managementActions
    : step.correctiveActions;
  return actions.find(action => action.availability === 'AVAILABLE') ?? null;
};

/** Presentation may surface the declared fallback token for an unavailable action. */
export const selectOnboardingPresentationAction = (
  step: JourneyResolvedStep,
): JourneyCorrectiveAction | null => {
  const available = selectOnboardingRuntimeAction(step);
  if (available) return available;
  if (step.state === 'NOT_APPLICABLE') return null;
  return (step.state === 'COMPLETE' ? step.managementActions : step.correctiveActions)[0] ?? null;
};

/**
 * Opening a setup step and executing its declared action are separate concerns.
 * While the wizard is active, completed setup remains reopenable even when a
 * legacy template has not yet declared a management action. BLOCKED remains
 * action-gated; non-applicable steps are never exposed.
 */
export const isOnboardingRuntimeStepOpenable = (
  step: JourneyResolvedStep,
): boolean => {
  if (step.state === 'NOT_APPLICABLE') return false;
  if (step.state === 'BLOCKED') return selectOnboardingRuntimeAction(step) !== null;
  return true;
};

export const buildOnboardingRuntime = (
  projection: JourneyVisibilityProjection,
  selectedStepId: string | null,
): OnboardingRuntime => {
  const visibleSteps = projection.resolvedSteps
    .filter(step => step.applicable && step.state !== 'NOT_APPLICABLE')
    .sort((left, right) => left.order - right.order)
    .map((step, index) => ({
      step,
      stepId: step.stepId,
      index,
      status: toRuntimeStatus(step.state),
      action: selectOnboardingRuntimeAction(step),
      isOpenable: isOnboardingRuntimeStepOpenable(step),
    }));
  const fallback = visibleSteps.find(item => item.step.state !== 'COMPLETE')
    ?? visibleSteps[visibleSteps.length - 1]
    ?? null;
  const selected = visibleSteps.find(item => item.stepId === selectedStepId) ?? fallback;
  const selectedIndex = selected?.index ?? -1;

  return {
    visibleSteps,
    totalSteps: visibleSteps.length,
    completedSteps: visibleSteps.filter(item => item.step.state === 'COMPLETE').length,
    selectedStepId: selected?.stepId ?? null,
    selectedStepIndex: selectedIndex,
    selectedStep: selected,
    recommendedNextStepId: fallback?.stepId ?? null,
    previousStepId: selectedIndex > 0 ? visibleSteps[selectedIndex - 1].stepId : null,
    nextNavigationStepId:
      selected?.status === 'completed' &&
      selectedIndex >= 0 &&
      selectedIndex < visibleSteps.length - 1
      ? visibleSteps[selectedIndex + 1].stepId
      : null,
  };
};
