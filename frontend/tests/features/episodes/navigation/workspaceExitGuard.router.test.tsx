/**
 * Exit guard: user-initiated removal of the workspace asks Save / Discard / Cancel; system actions pass through.
 * Real Expo Router, real WorkspaceExitGuard, real unsaved-work registry (no dialog host: decisions are driven directly).
 */
import React, { useEffect } from 'react';
import { render } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';
import { router, useNavigation } from 'expo-router';
import { CommonActions, usePreventRemoveContext, useRoute } from 'expo-router/react-navigation';
import { WorkspaceExitGuard, isGatedRemovalAction } from '../../../../features/episodes/presentation/navigation/WorkspaceExitGuard';
import {
  getUnsavedWorkSnapshot,
  hasDirtyDrafts,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
  type UnsavedDraftHandle,
} from '../../../../core/unsavedWork/unsavedWorkRegistry';
import { buildContext, labels, log, makeProbeScreen, resetHarness, WS } from './routerHarness';

const draft = {
  save: jest.fn<Promise<void>, []>(),
  discard: jest.fn<void, []>(),
  handle: null as UnsavedDraftHandle | null,
  nav: null as any,
  prevented: (() => undefined) as () => boolean | undefined,
};
const Probe = makeProbeScreen('workspace');

const GuardedWorkspace = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { preventedRoutes } = usePreventRemoveContext();
  useEffect(() => {
    draft.prevented = () => preventedRoutes[route.key]?.preventRemove;
  });
  useEffect(() => {
    draft.nav = navigation;
    const handle = registerDraft({
      id: 'rx',
      label: 'Prescription draft',
      save: () => draft.save(),
      discard: () => draft.discard(),
    });
    draft.handle = handle;
    return () => handle.unregister();
  }, [navigation]);
  return (
    <>
      <WorkspaceExitGuard />
      <Probe />
    </>
  );
};

const go = (fn: () => void) => act(() => { fn(); });
const unmounts = () => log.filter((entry) => entry.startsWith('unmount:workspace')).length;
const decide = (decision: 'save' | 'discard' | 'cancel') => act(async () => { await resolveUnsavedWorkDecision(decision); });

/** history: index, other, workspace(a1) with the workspace on top */
const boot = (dirty: boolean) => {
  const view = renderRouter(buildContext({ workspace: GuardedWorkspace }), { initialUrl: '/clinic-admin' });
  go(() => router.push('/clinic-admin/other' as never));
  go(() => router.push(WS('e1', 'a1') as never));
  go(() => draft.handle!.setDirty(dirty));
  expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1)']);
  return view;
};

beforeEach(() => {
  resetHarness();
  resetUnsavedWorkForTests();
  draft.save.mockReset().mockResolvedValue(undefined);
  draft.discard.mockReset();
});

describe('isGatedRemovalAction', () => {
  it.each(['GO_BACK', 'POP', 'POP_TO', 'POP_TO_TOP'])('gates %s', (type) => {
    expect(isGatedRemovalAction({ type })).toBe(true);
  });
  it('gates NAVIGATE only when it pops', () => {
    expect(isGatedRemovalAction({ type: 'NAVIGATE', payload: { pop: true } })).toBe(true);
    expect(isGatedRemovalAction({ type: 'NAVIGATE', payload: {} })).toBe(false);
    expect(isGatedRemovalAction({ type: 'NAVIGATE' })).toBe(false);
  });
  it.each(['REPLACE', 'RESET', 'PUSH', 'JUMP_TO'])('does not gate %s', (type) => {
    expect(isGatedRemovalAction({ type })).toBe(false);
  });
});

describe.each([
  ['GO_BACK (router.back / hardware back)', () => router.back(), ['index', 'other']],
  ['POP (router.dismiss)', () => router.dismiss(), ['index', 'other']],
  ['POP_TO (router.dismissTo)', () => router.dismissTo('/clinic-admin' as never), ['index']],
  ['POP_TO_TOP (router.dismissAll)', () => router.dismissAll(), ['index']],
  ['NAVIGATE with pop, dispatched through the navigator', () => draft.nav.dispatch({ type: 'NAVIGATE', payload: { name: 'index', pop: true } }), ['index']],
] as [string, () => void, string[]][])('dirty draft + %s', (_name, act_, afterProceed) => {
  it('is held: the workspace stays mounted and the shared decision opens', () => {
    const view = boot(true);
    go(() => act_());
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1)']);
    expect(unmounts()).toBe(0);
    expect(isDecisionPending()).toBe(true);
    expect(getUnsavedWorkSnapshot().pending).toEqual({ intent: 'exit', labels: ['Prescription draft'] });
  });

  it('Cancel keeps the workspace and the draft, and nothing was saved or discarded', async () => {
    const view = boot(true);
    go(() => act_());
    await decide('cancel');
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1)']);
    expect(unmounts()).toBe(0);
    expect(hasDirtyDrafts()).toBe(true);
    expect(draft.save).not.toHaveBeenCalled();
    expect(draft.discard).not.toHaveBeenCalled();
  });

  it('Save proceeds with the exact blocked action only after the save succeeded, and is not intercepted again', async () => {
    const view = boot(true);
    let release!: () => void;
    draft.save.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    go(() => act_());
    let deciding!: Promise<void>;
    await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
    expect(unmounts()).toBe(0); // save still in flight
    await act(async () => { release(); await deciding; });
    expect(draft.save).toHaveBeenCalledTimes(1);
    expect(unmounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(afterProceed);
    expect(isDecisionPending()).toBe(false); // no second interception
  });

  it('Save failure keeps the workspace, the draft and the open decision; a retry then proceeds', async () => {
    const view = boot(true);
    draft.save.mockRejectedValueOnce(new Error('boom'));
    go(() => act_());
    await decide('save');
    expect(unmounts()).toBe(0);
    expect(getUnsavedWorkSnapshot().error).toBe('save');
    expect(isDecisionPending()).toBe(true);
    expect(hasDirtyDrafts()).toBe(true);
    await decide('save');
    expect(draft.save).toHaveBeenCalledTimes(2);
    expect(labels(view.getRouterState())).toEqual(afterProceed);
  });

  it('Discard proceeds only after the explicit discard', async () => {
    const view = boot(true);
    go(() => act_());
    expect(draft.discard).not.toHaveBeenCalled();
    await decide('discard');
    expect(draft.discard).toHaveBeenCalledTimes(1);
    expect(unmounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(afterProceed);
  });

  it('a clean draft is not asked about: the action simply happens', () => {
    const view = boot(false);
    go(() => act_());
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(afterProceed);
  });
});

describe('repeated user actions while the decision is open', () => {
  it('a second back press does not stack another decision or remove anything', async () => {
    const view = boot(true);
    go(() => router.back());
    go(() => router.back());
    expect(isDecisionPending()).toBe(true);
    expect(unmounts()).toBe(0);
    await decide('cancel');
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1)']);
    expect(draft.save).not.toHaveBeenCalled();
  });
});

describe('what is deliberately NOT intercepted', () => {
  it('REPLACE (system-driven, e.g. a redirect) passes straight through even with a dirty draft', () => {
    const view = boot(true);
    go(() => router.replace('/clinic-admin/other' as never));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(1);
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'other']);
    expect(draft.save).not.toHaveBeenCalled();
    expect(draft.discard).not.toHaveBeenCalled();
  });

  it('RESET passes straight through (it is never a user back action)', () => {
    boot(true);
    go(() => draft.nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'index' }] })));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(1);
  });

  it('a parent-driven REPLACE of the whole clinic-admin navigator passes through to the nested workspace', () => {
    const view = boot(true);
    go(() => router.replace('/' as never));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(1);
    expect(view.getPathname()).toBe('/');
  });

  it('PUSH never removes the workspace, so it is never held: the draft survives underneath', () => {
    const view = boot(true);
    go(() => router.push('/clinic-admin/other' as never));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(0);
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1)', 'other']);
  });

  it('pushing the SAME appointment (e.g. the next step) reuses the instance without a prompt', () => {
    const view = boot(true);
    go(() => router.push(WS('e1', 'a1', '&step=prescription') as never));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(0);
    expect(labels(view.getRouterState())).toEqual(['index', 'other', 'workspace(a1,prescription)']);
  });
});

describe('guard placement', () => {
  it('is inert and harmless without a navigator (host rendered on its own)', () => {
    const view = render(<WorkspaceExitGuard />);
    expect(view.toJSON()).toBeNull();
  });

  it('native-dismiss prevention is registered while dirty and released when clean (the map NativeStackView reads)', () => {
    boot(true);
    expect(draft.prevented()).toBe(true);
    go(() => draft.handle!.setDirty(false));
    expect(draft.prevented()).toBeUndefined();
    go(() => draft.handle!.setDirty(true));
    expect(draft.prevented()).toBe(true);
  });
});
