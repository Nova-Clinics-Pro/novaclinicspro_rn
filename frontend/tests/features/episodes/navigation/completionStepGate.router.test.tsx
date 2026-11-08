/**
 * Completion-step gate, exercised through the REAL app/clinic-admin/episodes/[episodeId]/workspace.tsx route component
 * (its heavy children stubbed). With one workspace per appointment, `step=completion` for the same appointment reuses
 * the route instance; the gate must not let that swap unmount a dirty prescription draft without Save / Discard / Cancel.
 */
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import WorkspaceRoute from '../../../../app/clinic-admin/episodes/[episodeId]/workspace';
import {
  getUnsavedWorkSnapshot,
  hasDirtyDrafts,
  isDecisionPending,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../../../core/unsavedWork/unsavedWorkRegistry';
import { buildContext, draftControl, labels, log, resetHarness } from './routerHarness';

let mockCosEnabled = true;
jest.mock('../../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({}),
  isCosV1Enabled: () => mockCosEnabled,
}));
jest.mock('../../../../core/observability/legacyRouteUsage', () => ({ LegacyRouteUsage: () => null }));
jest.mock('../../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen', () => ({
  EpisodeWorkspaceScreen: () => null,
}));
jest.mock('../../../../features/episodes/presentation/pages/CompleteConsultationScreen', () => ({
  CompleteConsultationScreen: jest.requireActual('./routerHarness').makeProbeScreen('completion-screen'),
}));
jest.mock('../../../../features/episodes/presentation/pages/VisitCommandCenter', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const registry = jest.requireActual('../../../../core/unsavedWork/unsavedWorkRegistry');
  const harness = jest.requireActual('./routerHarness');
  return {
    VisitCommandCenter: ({ initialStep }: { initialStep?: string }) => {
      React.useEffect(() => {
        harness.log.push('mount:vcc');
        const handle = registry.registerDraft({
          id: 'rx',
          label: 'Prescription draft',
          save: () => harness.draftControl.save(),
          discard: () => harness.draftControl.discard(),
        });
        harness.draftControl.handle = handle;
        return () => {
          handle.unregister();
          harness.log.push('unmount:vcc');
        };
      }, []);
      return React.createElement(Text, { testID: 'vcc-step' }, String(initialStep));
    },
  };
});

const url = (step: string) => `/clinic-admin/episodes/e1/workspace?appointmentId=a1&clientId=c1&step=${step}`;
const go = (fn: () => void) => act(() => { fn(); });
const vcc = (event: 'mount' | 'unmount') => log.filter((entry) => entry === `${event}:vcc`).length;
const decide = (decision: 'save' | 'discard' | 'cancel') => act(async () => { await resolveUnsavedWorkDecision(decision); });
const shownStep = () => screen.getByTestId('vcc-step').props.children as string;

const boot = (dirty: boolean) => {
  const view = renderRouter(buildContext({ workspace: WorkspaceRoute }), { initialUrl: '/clinic-admin' });
  go(() => router.push(url('prescription') as never));
  go(() => draftControl.handle!.setDirty(dirty));
  return view;
};

beforeEach(() => {
  mockCosEnabled = true;
  resetHarness();
  resetUnsavedWorkForTests();
  draftControl.save.mockReset().mockResolvedValue(undefined);
  draftControl.discard.mockReset();
  draftControl.handle = null;
});

it('the host shows the step it was opened with', () => {
  boot(false);
  expect(shownStep()).toBe('prescription');
});

it('clean draft: moving to completion swaps immediately, without a prompt', () => {
  boot(false);
  go(() => router.push(url('completion') as never));
  expect(isDecisionPending()).toBe(false);
  expect(vcc('unmount')).toBe(1);
  expect(log.filter((entry) => entry.startsWith('mount:completion-screen'))).toHaveLength(1);
});

it('a step other than completion never prompts, even with a dirty draft', () => {
  boot(true);
  go(() => router.push(url('assessment') as never));
  expect(isDecisionPending()).toBe(false);
  expect(vcc('unmount')).toBe(0);
  expect(shownStep()).toBe('assessment');
});

describe('dirty draft + completion', () => {
  it('defers the swap: the workspace stays mounted showing the previous step and the shared decision opens', () => {
    boot(true);
    go(() => router.push(url('completion') as never));
    expect(isDecisionPending()).toBe(true);
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('completion');
    expect(vcc('unmount')).toBe(0);
    expect(shownStep()).toBe('prescription');
    expect(log.some((entry) => entry.startsWith('mount:completion-screen'))).toBe(false);
  });

  it('Cancel restores the previous step with router.setParams: same instance, same stack, draft intact', async () => {
    const view = boot(true);
    go(() => router.push(url('completion') as never));
    await decide('cancel');
    expect(labels(view.getRouterState())).toEqual(['index', 'workspace(a1,prescription)']);
    expect(vcc('mount')).toBe(1);
    expect(vcc('unmount')).toBe(0);
    expect(hasDirtyDrafts()).toBe(true);
    expect(draftControl.save).not.toHaveBeenCalled();
    expect(draftControl.discard).not.toHaveBeenCalled();
    expect(shownStep()).toBe('prescription');
    expect(isDecisionPending()).toBe(false);
  });

  it('Save swaps only AFTER the save succeeded', async () => {
    boot(true);
    let release!: () => void;
    draftControl.save.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    go(() => router.push(url('completion') as never));
    let deciding!: Promise<void>;
    await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
    expect(vcc('unmount')).toBe(0);
    await act(async () => { release(); await deciding; });
    expect(draftControl.save).toHaveBeenCalledTimes(1);
    expect(vcc('unmount')).toBe(1);
    expect(log.filter((entry) => entry.startsWith('mount:completion-screen'))).toHaveLength(1);
  });

  it('Save failure keeps the workspace, the draft and the open decision; retry then swaps', async () => {
    boot(true);
    draftControl.save.mockRejectedValueOnce(new Error('boom'));
    go(() => router.push(url('completion') as never));
    await decide('save');
    expect(vcc('unmount')).toBe(0);
    expect(isDecisionPending()).toBe(true);
    expect(getUnsavedWorkSnapshot().error).toBe('save');
    expect(hasDirtyDrafts()).toBe(true);
    await decide('save');
    expect(vcc('unmount')).toBe(1);
  });

  it('Discard swaps only after the explicit discard', async () => {
    boot(true);
    go(() => router.push(url('completion') as never));
    expect(draftControl.discard).not.toHaveBeenCalled();
    await decide('discard');
    expect(draftControl.discard).toHaveBeenCalledTimes(1);
    expect(vcc('unmount')).toBe(1);
  });

  it('repeated completion navigation while the question is open does not bypass the gate or open a second one', async () => {
    boot(true);
    go(() => router.push(url('completion') as never));
    go(() => router.push(url('completion') as never));
    go(() => router.navigate(url('completion') as never));
    expect(isDecisionPending()).toBe(true);
    expect(vcc('unmount')).toBe(0);
    await decide('cancel');
    expect(vcc('unmount')).toBe(0);
  });

  it('after Cancel the gate is re-armed: a later completion request asks again', async () => {
    boot(true);
    go(() => router.push(url('completion') as never));
    await decide('cancel');
    go(() => router.push(url('completion') as never));
    expect(isDecisionPending()).toBe(true);
    expect(vcc('unmount')).toBe(0);
  });
});

it('with cos_v1 off the gate is inert (the legacy workspace has no draft host)', () => {
  mockCosEnabled = false;
  renderRouter(buildContext({ workspace: WorkspaceRoute }), { initialUrl: '/clinic-admin' });
  go(() => router.push(url('prescription') as never));
  go(() => router.push(url('completion') as never));
  expect(isDecisionPending()).toBe(false);
});
