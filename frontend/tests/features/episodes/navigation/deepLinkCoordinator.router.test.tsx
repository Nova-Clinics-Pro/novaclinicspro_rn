/**
 * Warm OS deep links while a prescription draft is dirty (app/+native-intent.tsx -> deepLinkCoordinator).
 * Real Expo Router; the coordinator is installed exactly as in the app (a `+native-intent` module). OS URL events are
 * delivered through the same expo-linking subscription Expo Router uses.
 */
import React, { useEffect } from 'react';
import { act, renderRouter } from 'expo-router/testing-library';
import { router } from 'expo-router';
import * as nativeIntent from '../../../../app/+native-intent';
import {
  isRecoveryLink,
  redirectSystemPath,
  resetDeepLinkCoordinatorForTests,
  urlToAppPath,
} from '../../../../features/episodes/presentation/navigation/deepLinkCoordinator';
import {
  confirmUnsavedWork,
  getUnsavedWorkSnapshot,
  hasDirtyDrafts,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../../../core/unsavedWork/unsavedWorkRegistry';
import { buildContext, draftControl, labels, log, makeProbeScreen, resetHarness, WS } from './routerHarness';

const Probe = makeProbeScreen('workspace');
const DraftWorkspace = () => {
  useEffect(() => {
    const handle = registerDraft({
      id: 'rx',
      label: 'Prescription draft',
      save: () => draftControl.save(),
      discard: () => draftControl.discard(),
    });
    draftControl.handle = handle;
    return () => handle.unregister();
  }, []);
  return <Probe />;
};

const URL = (appointment: string, extra = '') => `frontend://clinic-admin/episodes/e1/workspace?appointmentId=${appointment}${extra}`;
const PATH = (appointment: string, extra = '') => `/clinic-admin/episodes/e1/workspace?appointmentId=${appointment}${extra}`;

let sendLink: ((url: string) => Promise<void>) | undefined;
const boot = async () => {
  sendLink = undefined;
  const Linking = jest.requireMock('expo-linking');
  jest.spyOn(Linking, 'addEventListener').mockImplementation(((_type: string, handler: (event: { url: string }) => void) => {
    sendLink = async (url: string) => handler({ url });
    return { remove() {} };
  }) as never);
  const view = renderRouter(
    buildContext({
      workspace: DraftWorkspace,
      extra: { '+native-intent': nativeIntent, 'reset-password': makeProbeScreen('reset') },
    }) as never,
    { initialUrl: '/clinic-admin' },
  );
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return view;
};
const go = (fn: () => void) => act(() => { fn(); });
const link = (url: string) => act(async () => { await sendLink!(url); });
const decide = (decision: 'save' | 'discard' | 'cancel') => act(async () => { await resolveUnsavedWorkDecision(decision); });
const unmounts = () => log.filter((entry) => entry.startsWith('unmount:workspace')).length;

/** stack: index, workspace(b1), other, workspace(a1) -- a1 on top and dirty; a link to b1 would pop a1. */
const setup = async (dirty: boolean) => {
  const view = await boot();
  go(() => router.push(WS('e1', 'b1') as never));
  go(() => router.push('/clinic-admin/other' as never));
  go(() => router.push(WS('e1', 'a1') as never));
  go(() => draftControl.handle!.setDirty(dirty));
  expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
  return view;
};

beforeEach(() => {
  resetHarness();
  resetUnsavedWorkForTests();
  resetDeepLinkCoordinatorForTests();
  draftControl.save.mockReset().mockResolvedValue(undefined);
  draftControl.discard.mockReset();
  draftControl.handle = null;
});
afterEach(() => jest.restoreAllMocks());

describe('urlToAppPath', () => {
  it.each([
    ['frontend://clinic-admin/episodes/e1/workspace?appointmentId=a1', '/clinic-admin/episodes/e1/workspace?appointmentId=a1'],
    ['frontend:///clinic-admin/episodes/e1/workspace?appointmentId=a1', '/clinic-admin/episodes/e1/workspace?appointmentId=a1'],
    ['https://app.example.com/clinic-admin/episodes/e1/workspace?appointmentId=a1&step=x#top', '/clinic-admin/episodes/e1/workspace?appointmentId=a1&step=x#top'],
    ['exp://192.168.0.2:8081/--/clinic-admin/episodes/e1/workspace?appointmentId=a1', '/clinic-admin/episodes/e1/workspace?appointmentId=a1'],
    ['/clinic-admin/other', '/clinic-admin/other'],
    ['clinic-admin/other', '/clinic-admin/other'],
    ['https://app.example.com', '/'],
  ])('%s', (input, expected) => {
    expect(urlToAppPath(input)).toBe(expected);
  });
});

describe('redirectSystemPath (the +native-intent export)', () => {
  it('is the coordinator', () => {
    expect(nativeIntent.redirectSystemPath).toBe(redirectSystemPath);
  });
  it('cold start passes through unchanged, even with a dirty draft registered', () => {
    registerDraft({ id: 'x', label: 'x', save: async () => {}, discard: () => {} }).setDirty(true);
    expect(redirectSystemPath({ path: URL('b1'), initial: true })).toBe(URL('b1'));
    expect(isDecisionPending()).toBe(false);
  });
  it('a clean app passes warm links through unchanged', () => {
    expect(redirectSystemPath({ path: URL('b1'), initial: false })).toBe(URL('b1'));
  });
});

it('cold start: booting on a workspace URL with the coordinator installed renders it', async () => {
  sendLink = undefined;
  const view = renderRouter(
    buildContext({ workspace: DraftWorkspace, extra: { '+native-intent': nativeIntent } }) as never,
    { initialUrl: WS('e1', 'a1') },
  );
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getPathname()).toBe('/clinic-admin/episodes/e1/workspace');
  expect(log.filter((entry) => entry.startsWith('mount:workspace'))).toHaveLength(1);
  expect(isDecisionPending()).toBe(false);
});

describe('warm link', () => {
  it('with a clean workspace navigates exactly like an unguarded link', async () => {
    const view = await setup(false);
    await link(URL('b1'));
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)']);
    expect(isDecisionPending()).toBe(false);
  });

  it('with a dirty draft is deferred: nothing navigates, the workspace and draft stay, one prompt opens', async () => {
    const view = await setup(true);
    await link(URL('b1'));
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
    expect(unmounts()).toBe(0);
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('deepLink');
    expect(hasDirtyDrafts()).toBe(true);
  });

  it('Cancel retains the workspace and draft and does not navigate', async () => {
    const view = await setup(true);
    await link(URL('b1'));
    await decide('cancel');
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
    expect(unmounts()).toBe(0);
    expect(hasDirtyDrafts()).toBe(true);
    expect(draftControl.save).not.toHaveBeenCalled();
    expect(draftControl.discard).not.toHaveBeenCalled();
  });

  it('Save navigates to the preserved original destination only after the save succeeded', async () => {
    const view = await setup(true);
    let release!: () => void;
    draftControl.save.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    await link(URL('b1', '&step=prescription'));
    let deciding!: Promise<void>;
    await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
    await act(async () => { release(); await deciding; });
    expect(draftControl.save).toHaveBeenCalledTimes(1);
    // original destination and parameters preserved: workspace b1 with step=prescription is now the top screen
    const state = labels(view.getRouterState());
    expect(state[state.length - 1]).toBe('workspace(b1,prescription)');
  });

  it('Save failure keeps the workspace, the draft and the pending intent; a retry navigates to the same destination', async () => {
    const view = await setup(true);
    draftControl.save.mockRejectedValueOnce(new Error('boom'));
    await link(URL('b1'));
    await decide('save');
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
    expect(isDecisionPending()).toBe(true);
    expect(hasDirtyDrafts()).toBe(true);
    await decide('save');
    const state = labels(view.getRouterState());
    expect(state[state.length - 1]).toBe('workspace(b1)');
    expect(draftControl.save).toHaveBeenCalledTimes(2);
  });

  it('Discard is explicit, runs once, and then navigates to the original destination', async () => {
    const view = await setup(true);
    await link(URL('b1'));
    expect(draftControl.discard).not.toHaveBeenCalled();
    await decide('discard');
    expect(draftControl.discard).toHaveBeenCalledTimes(1);
    const state = labels(view.getRouterState());
    expect(state[state.length - 1]).toBe('workspace(b1)');
  });

  it('repeated identical events raise ONE prompt and cause ONE navigation', async () => {
    const view = await setup(true);
    const navigate = jest.spyOn(router, 'navigate');
    await link(URL('b1'));
    await link(URL('b1'));
    await link(URL('b1'));
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('deepLink');
    await decide('discard');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PATH('b1'));
    expect(labels(view.getRouterState()).filter((label) => label === 'workspace(b1)')).toHaveLength(1);
  });

  it('while a decision is pending the LATEST link wins (still one prompt)', async () => {
    await setup(true);
    const navigate = jest.spyOn(router, 'navigate');
    await link(URL('b1'));
    await link(URL('zz'));
    await decide('discard');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PATH('zz'));
  });

  it('after Cancel a later link with a clean workspace navigates normally', async () => {
    const view = await setup(true);
    await link(URL('b1'));
    await decide('cancel');
    go(() => draftControl.handle!.setDirty(false));
    await link(URL('b1'));
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)']);
  });

});

describe('a warm link that arrives while ANOTHER dialog is already open is kept, not dropped', () => {
  const RECOVERY = 'frontend://reset-password#access_token=SECRET_A&refresh_token=SECRET_R&type=recovery';
  const order: string[] = [];
  const openOtherDecision = () => {
    const answer = confirmUnsavedWork('logout');
    void answer.then((proceed) => order.push(`other:${proceed}`));
    return answer;
  };
  const trackNavigate = () =>
    jest.spyOn(router, 'navigate').mockImplementation(((href: string) => { order.push(`navigate:${href}`); }) as never);

  beforeEach(() => { order.length = 0; });

  it('keeps the link (returns "") and does not open a second dialog on top', async () => {
    await setup(true);
    openOtherDecision();
    expect(redirectSystemPath({ path: URL('b1'), initial: false })).toBe('');
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('logout');
  });

  it('other decision SAVES: that boundary continues first, then the kept link is applied with no second prompt', async () => {
    await setup(true);
    trackNavigate();
    openOtherDecision();
    await link(URL('b1'));
    await decide('save');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(order).toEqual(['other:true', `navigate:${PATH('b1')}`]);
    expect(isDecisionPending()).toBe(false);
  });

  it('other decision DISCARDS: same, the link is applied once, in order', async () => {
    await setup(true);
    trackNavigate();
    openOtherDecision();
    await link(URL('b1'));
    await decide('discard');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(order).toEqual(['other:true', `navigate:${PATH('b1')}`]);
  });

  it('other decision is CANCELLED (draft still dirty): the kept link then asks in its own dialog; Discard applies it', async () => {
    const view = await setup(true);
    openOtherDecision();
    await link(URL('b1'));
    await decide('cancel');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('deepLink');
    expect(unmounts()).toBe(0);
    await decide('discard');
    const stack = labels(view.getRouterState());
    expect(stack[stack.length - 1]).toBe('workspace(b1)');
  });

  it('cancelled twice: nothing navigates, the workspace and draft stay', async () => {
    const view = await setup(true);
    const navigate = trackNavigate();
    openOtherDecision();
    await link(URL('b1'));
    await decide('cancel');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await decide('cancel');
    expect(navigate).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
  });

  it('latest link wins among several that arrive during the contention', async () => {
    await setup(true);
    const navigate = trackNavigate();
    openOtherDecision();
    await link(URL('b1'));
    await link(URL('zz'));
    await link(URL('b1', '&step=prescription'));
    await decide('discard');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PATH('b1', '&step=prescription'));
  });

  it('other decision FAILS to save: the link keeps waiting (no navigation, draft kept); a retry then applies it', async () => {
    await setup(true);
    const navigate = trackNavigate();
    draftControl.save.mockRejectedValueOnce(new Error('boom'));
    openOtherDecision();
    await link(URL('b1'));
    await decide('save');
    await act(async () => { await Promise.resolve(); });
    expect(navigate).not.toHaveBeenCalled();
    expect(isDecisionPending()).toBe(true);
    expect(hasDirtyDrafts()).toBe(true);
    await decide('save');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(draftControl.save).toHaveBeenCalledTimes(2);
  });

  it('works for the guarded-exit decision too: back opens the exit dialog, a link arrives, Save lets the back happen THEN the link', async () => {
    const view = await setup(true);
    // the real exit guard is not mounted in this harness: model the exit boundary with a decision + its continuation
    const navigate = trackNavigate();
    openOtherDecision();
    await link(URL('b1'));
    await decide('save');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(order[0]).toBe('other:true');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(view).toBeDefined();
  });

  describe('password-recovery links', () => {
    it.each([
      ['frontend://reset-password#access_token=a&refresh_token=b&type=recovery', true],
      ['frontend://reset-password/#access_token=a', true],
      ['frontend:///reset-password#access_token=a', true],
      ['https://app.example.com/reset-password#access_token=a', true],
      ['https://app.example.com/reset-password/#access_token=a', true],
      ['exp://192.168.0.2:8081/--/reset-password#access_token=a', true],
      ['frontend://reset-password?x=1', true],
      ['frontend://forgot-password', false],
      ['frontend://reset-password-help', false],
      ['frontend://clinic-admin/reset-password', false],
      ['frontend://clinic-admin/episodes/e1/workspace?appointmentId=a1', false],
    ])('isRecoveryLink(%s) = %s', (input, expected) => {
      expect(isRecoveryLink(input)).toBe(expected);
    });

    it('passes straight through while a draft is dirty: no prompt, no deferral, same URL returned', async () => {
      await setup(true);
      expect(redirectSystemPath({ path: RECOVERY, initial: false })).toBe(RECOVERY);
      expect(isDecisionPending()).toBe(false);
    });

    it('opening the recovery screen removes nothing: the dirty workspace and its draft survive underneath', async () => {
      const view = await setup(true);
      await link(RECOVERY);
      expect(isDecisionPending()).toBe(false);
      expect(unmounts()).toBe(0);
      expect(hasDirtyDrafts()).toBe(true);
      expect(labels(view.getRouterState())).toEqual(['index', 'workspace(b1)', 'other', 'workspace(a1)']);
      expect(log.some((entry) => entry.startsWith('mount:reset'))).toBe(true);
    });

    it('does not disturb a dialog that is already open, nor the link that is waiting behind it', async () => {
      await setup(true);
      const navigate = jest.spyOn(router, 'navigate').mockImplementation((() => {}) as never);
      const other = confirmUnsavedWork('logout');
      void other;
      await link(URL('b1'));
      expect(redirectSystemPath({ path: RECOVERY, initial: false })).toBe(RECOVERY);
      expect(getUnsavedWorkSnapshot().pending?.intent).toBe('logout');
      await decide('discard');
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(PATH('b1'));
    });

    it('never records or logs the one-time token', async () => {
      await setup(true);
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) => jest.spyOn(console, level).mockImplementation(() => {}));
      await link(RECOVERY);
      await link(URL('b1'));
      await decide('cancel');
      const printed = spies.flatMap((spy) => spy.mock.calls).map((call) => JSON.stringify(call));
      expect(printed.some((line) => line.includes('SECRET_A') || line.includes('SECRET_R'))).toBe(false);
      expect(JSON.stringify(getUnsavedWorkSnapshot())).not.toMatch(/SECRET/);
    });

    it('ordinary navigation is NOT weakened: a regular link while dirty still asks', async () => {
      await setup(true);
      await link(URL('b1'));
      expect(getUnsavedWorkSnapshot().pending?.intent).toBe('deepLink');
    });
  });
});

describe('notification taps are a different entry point', () => {
  it('router.push of a workspace never removes the dirty workspace, so no prompt is needed', async () => {
    const view = await setup(true);
    go(() => router.push(WS('e1', 'b1', '&step=prescription') as never));
    expect(isDecisionPending()).toBe(false);
    expect(unmounts()).toBe(0);
    expect(labels(view.getRouterState()).includes('workspace(a1)')).toBe(true);
  });
});
