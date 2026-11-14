/**
 * Completion-step gate for the consultation workspace route.
 *
 * With one workspace instance per appointment, a navigation to `step=completion` for the same appointment reuses the
 * route instance and only changes its `step` param, which makes the route swap the workspace for the completion screen
 * in place: the workspace (and its prescription draft) would unmount without any navigator removal. This hook
 * decides which step the route may DISPLAY:
 *
 *  - clean draft, or any other step: the requested step is displayed immediately;
 *  - dirty draft + completion: the current step stays displayed, the shared Save / Discard / Cancel dialog opens, and
 *      Save / Discard  -> the swap happens only after the operation succeeded;
 *      Cancel          -> the previous `step` param is restored with router.setParams (stack and draft untouched).
 *
 * Repeated completion navigation while the question is open or the restore is in flight does not bypass the gate.
 * State is adjusted during render (no setState in effects); the asynchronous decision is applied from a promise
 * callback.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { confirmUnsavedWork, hasDirtyDrafts } from '../../../../core/unsavedWork/unsavedWorkRegistry';

interface PendingCompletion<T extends string> {
  target: T;
  restoreTo: T | undefined;
  phase: 'asking' | 'restoring';
}

export const COMPLETION_STEP = 'completion';

export const useCompletionStepGate = <T extends string>(requestedStep: T | undefined, enabled: boolean): T | undefined => {
  const router = useRouter();
  const [committedStep, setCommittedStep] = useState<T | undefined>(requestedStep);
  const [pending, setPending] = useState<PendingCompletion<T> | undefined>(undefined);

  if (pending?.phase === 'restoring') {
    // The previous step was written back to the route; once the route no longer shows the requested step we are done.
    if (requestedStep !== pending.target) setPending(undefined);
  } else if (pending?.phase === 'asking') {
    // The user navigated somewhere else while the question was open: follow the route, ignore the stale answer.
    if (requestedStep !== pending.target) {
      setPending(undefined);
      setCommittedStep(requestedStep);
    }
  } else if (requestedStep !== committedStep) {
    if (enabled && requestedStep === COMPLETION_STEP && committedStep !== COMPLETION_STEP && hasDirtyDrafts()) {
      setPending({ target: requestedStep, restoreTo: committedStep, phase: 'asking' });
    } else {
      setCommittedStep(requestedStep);
    }
  }

  const asking = pending?.phase === 'asking' ? pending : undefined;
  useEffect(() => {
    if (!asking) return;
    let active = true;
    void confirmUnsavedWork('completion').then((proceed) => {
      if (!active) return;
      if (proceed) {
        setCommittedStep(asking.target);
        setPending(undefined);
      } else {
        setPending({ ...asking, phase: 'restoring' });
        router.setParams({ step: asking.restoreTo } as never);
      }
    });
    return () => {
      active = false;
    };
  }, [asking, router]);

  return committedStep;
};
