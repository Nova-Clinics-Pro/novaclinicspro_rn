/**
 * Exit guard for the consultation workspace.
 *
 * While a registered draft is dirty, a user-initiated removal of this screen (back, header/hardware back, pop,
 * pop-to, pop-to-top, or a navigator-dispatched NAVIGATE with pop) is held and the user is asked Save / Discard /
 * Cancel. On Save or Discard the EXACT blocked action object is re-dispatched through the root container (never a
 * copy, never the screen's nested navigation object), which the navigator recognises as already-visited, so it is not
 * intercepted a second time. Cancel leaves the workspace and draft untouched.
 *
 * Deliberately not intercepted (verified in the Stage 0/0.5 spikes): REPLACE and RESET (system-driven: logout, session
 * expiry, role redirects), PUSH (never removes this screen), warm deep links and browser back/forward (they rebuild
 * navigator state without emitting `beforeRemove`; deep links are handled by the +native-intent coordinator).
 *
 * `usePreventRemove` throws outside a navigator, so the active guard only mounts when a NavigationContext exists.
 */
import React, { useContext } from 'react';
import { useNavigationContainerRef } from 'expo-router';
import { NavigationContext, usePreventRemove } from 'expo-router/react-navigation';
import { confirmUnsavedWork } from '../../../../core/unsavedWork/unsavedWorkRegistry';
import { useHasDirtyDrafts } from '../../../../core/unsavedWork/useUnsavedWork';

interface RemovalAction {
  type: string;
  payload?: { pop?: boolean } | undefined;
}

const GATED_REMOVAL_TYPES = new Set(['GO_BACK', 'POP', 'POP_TO', 'POP_TO_TOP']);

/** The user-initiated removal actions this guard asks about. Everything else passes through. */
export const isGatedRemovalAction = (action: RemovalAction): boolean =>
  GATED_REMOVAL_TYPES.has(action.type) || (action.type === 'NAVIGATE' && action.payload?.pop === true);

const ActiveWorkspaceExitGuard: React.FC = () => {
  const root = useNavigationContainerRef();
  const dirty = useHasDirtyDrafts();

  usePreventRemove(dirty, ({ data }) => {
    const action = data.action;
    if (!isGatedRemovalAction(action as RemovalAction)) {
      // System-driven (REPLACE / RESET / ...): never held. Re-dispatch the exact object straight away.
      root.dispatch(action);
      return;
    }
    void confirmUnsavedWork('exit').then((proceed) => {
      if (proceed) root.dispatch(action);
    });
  });

  return null;
};

export const WorkspaceExitGuard: React.FC = () => {
  const navigation = useContext(NavigationContext);
  return navigation ? <ActiveWorkspaceExitGuard /> : null;
};
