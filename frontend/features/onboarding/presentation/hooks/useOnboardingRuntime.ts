import { useCallback, useMemo, useState } from 'react';
import { buildOnboardingRuntime } from '../../domain/usecases/build-onboarding-runtime.usecase';
import { useJourneyFoundation } from './useJourneyFoundation';

/** Owns the selected step while deriving all runtime facts from one projection. */
export const useOnboardingRuntime = (tenantId: string, enabled = true) => {
  const foundation = useJourneyFoundation(tenantId, { enabled });
  const [requestedStepId, setRequestedStepId] = useState<string | null>(null);
  const runtime = useMemo(
    () => foundation.projection
      ? buildOnboardingRuntime(foundation.projection, requestedStepId)
      : null,
    [foundation.projection, requestedStepId],
  );
  const selectStep = useCallback((stepId: string) => {
    if (runtime?.visibleSteps.some(step => step.stepId === stepId)) {
      setRequestedStepId(stepId);
    }
  }, [runtime?.visibleSteps]);

  return { ...foundation, runtime, selectStep };
};
