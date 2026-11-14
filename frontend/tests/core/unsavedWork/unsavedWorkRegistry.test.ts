/**
 * Unsaved-work registry: the shared Save / Discard / Cancel decision state machine.
 */
import {
  confirmUnsavedWork,
  getUnsavedWorkSnapshot,
  hasDirtyDrafts,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
  whenNoDecisionPending,
} from '../../../core/unsavedWork/unsavedWorkRegistry';

const makeDraft = (overrides: Partial<{ save: () => Promise<void>; discard: () => void | Promise<void>; label: string; id: string }> = {}) => {
  const save = jest.fn(overrides.save ?? (async () => {}));
  const discard = jest.fn(overrides.discard ?? (() => {}));
  const handle = registerDraft({ id: overrides.id ?? 'd1', label: overrides.label ?? 'Prescription draft', save, discard });
  return { save, discard, handle };
};

afterEach(() => resetUnsavedWorkForTests());

describe('dirty tracking', () => {
  it('has no dirty drafts until a registered draft reports dirty', () => {
    const { handle } = makeDraft();
    expect(hasDirtyDrafts()).toBe(false);
    handle.setDirty(true);
    expect(hasDirtyDrafts()).toBe(true);
    handle.setDirty(false);
    expect(hasDirtyDrafts()).toBe(false);
  });

  it('unregistering removes the draft', () => {
    const { handle } = makeDraft();
    handle.setDirty(true);
    handle.unregister();
    expect(hasDirtyDrafts()).toBe(false);
  });

  it('a stale handle cannot affect a re-registered draft with the same id', () => {
    const first = makeDraft();
    first.handle.unregister();
    const second = makeDraft();
    second.handle.setDirty(true);
    first.handle.setDirty(false);
    first.handle.unregister();
    expect(hasDirtyDrafts()).toBe(true);
  });
});

describe('confirmUnsavedWork', () => {
  it('resolves true immediately when nothing is dirty (no dialog)', async () => {
    makeDraft();
    await expect(confirmUnsavedWork('exit')).resolves.toBe(true);
    expect(getUnsavedWorkSnapshot().pending).toBeNull();
  });

  it('opens one decision with the draft labels when something is dirty', () => {
    const { handle } = makeDraft({ label: 'Prescription draft' });
    handle.setDirty(true);
    void confirmUnsavedWork('logout');
    expect(isDecisionPending()).toBe(true);
    expect(getUnsavedWorkSnapshot().pending).toEqual({ intent: 'logout', labels: ['Prescription draft'] });
  });

  it('refuses a second boundary while a decision is open (resolves false, does not stack)', async () => {
    const { handle } = makeDraft();
    handle.setDirty(true);
    void confirmUnsavedWork('exit');
    await expect(confirmUnsavedWork('completion')).resolves.toBe(false);
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('exit');
  });
});

describe('decisions', () => {
  it('Cancel resolves false and leaves the draft dirty and untouched', async () => {
    const { handle, save, discard } = makeDraft();
    handle.setDirty(true);
    const answer = confirmUnsavedWork('exit');
    await resolveUnsavedWorkDecision('cancel');
    await expect(answer).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(discard).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);
    expect(getUnsavedWorkSnapshot().pending).toBeNull();
  });

  it('Save resolves true only after the save succeeded, saving each dirty draft once', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { handle, save } = makeDraft({ save: () => gate });
    handle.setDirty(true);
    const answer = confirmUnsavedWork('deepLink');
    const settled = jest.fn();
    void answer.then(settled);
    const deciding = resolveUnsavedWorkDecision('save');
    await Promise.resolve();
    expect(getUnsavedWorkSnapshot().busy).toBe('save');
    expect(settled).not.toHaveBeenCalled();
    release();
    await deciding;
    await expect(answer).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(hasDirtyDrafts()).toBe(false);
  });

  it('Save failure keeps the decision open with an error; the draft stays dirty; retry can succeed', async () => {
    let fail = true;
    const { handle, save } = makeDraft({ save: async () => { if (fail) throw new Error('boom'); } });
    handle.setDirty(true);
    const answer = confirmUnsavedWork('exit');
    const settled = jest.fn();
    void answer.then(settled);

    await resolveUnsavedWorkDecision('save');
    expect(getUnsavedWorkSnapshot()).toEqual({
      pending: { intent: 'exit', labels: ['Prescription draft'] },
      busy: null,
      error: 'save',
    });
    expect(settled).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);

    fail = false;
    await resolveUnsavedWorkDecision('save');
    await expect(answer).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('Discard calls the draft discard and resolves true; a discard failure keeps the decision open', async () => {
    let fail = true;
    const { handle, discard } = makeDraft({ discard: () => { if (fail) throw new Error('nope'); } });
    handle.setDirty(true);
    const answer = confirmUnsavedWork('logout');
    const settled = jest.fn();
    void answer.then(settled);

    await resolveUnsavedWorkDecision('discard');
    expect(getUnsavedWorkSnapshot().error).toBe('discard');
    expect(settled).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);

    fail = false;
    await resolveUnsavedWorkDecision('discard');
    await expect(answer).resolves.toBe(true);
    expect(discard).toHaveBeenCalledTimes(2);
    expect(hasDirtyDrafts()).toBe(false);
  });

  it('saves every dirty draft, and skips clean ones', async () => {
    const a = makeDraft({ id: 'a', label: 'A' });
    const b = makeDraft({ id: 'b', label: 'B' });
    const c = makeDraft({ id: 'c', label: 'C' });
    a.handle.setDirty(true);
    b.handle.setDirty(true);
    const answer = confirmUnsavedWork('logout');
    expect(getUnsavedWorkSnapshot().pending?.labels).toEqual(['A', 'B']);
    await resolveUnsavedWorkDecision('save');
    await expect(answer).resolves.toBe(true);
    expect(a.save).toHaveBeenCalledTimes(1);
    expect(b.save).toHaveBeenCalledTimes(1);
    expect(c.save).not.toHaveBeenCalled();
  });

  it('single-flight: pressing Save twice shares one save operation', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { handle, save } = makeDraft({ save: () => gate });
    handle.setDirty(true);
    const answer = confirmUnsavedWork('exit');
    const first = resolveUnsavedWorkDecision('save');
    const second = resolveUnsavedWorkDecision('save'); // ignored while busy
    release();
    await Promise.all([first, second]);
    await expect(answer).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('ignores decisions when nothing is pending', async () => {
    const { save } = makeDraft();
    await resolveUnsavedWorkDecision('save');
    expect(save).not.toHaveBeenCalled();
  });
});

describe('whenNoDecisionPending', () => {
  it('resolves immediately when nothing is open', async () => {
    await expect(whenNoDecisionPending()).resolves.toBeUndefined();
  });

  it('resolves only after the open decision settles, and AFTER that decision\'s own caller continued', async () => {
    const { handle } = makeDraft();
    handle.setDirty(true);
    const order: string[] = [];
    const decision = confirmUnsavedWork('logout').then((proceed) => order.push(`decision:${proceed}`));
    const waited = whenNoDecisionPending().then(() => order.push('waiter'));
    await Promise.resolve();
    expect(order).toEqual([]);
    await resolveUnsavedWorkDecision('discard');
    await Promise.all([decision, waited]);
    expect(order).toEqual(['decision:true', 'waiter']);
  });

  it('keeps waiting while a failed Save leaves the decision open', async () => {
    const { handle } = makeDraft({ save: async () => { throw new Error('boom'); } });
    handle.setDirty(true);
    void confirmUnsavedWork('exit');
    let released = false;
    void whenNoDecisionPending().then(() => { released = true; });
    await resolveUnsavedWorkDecision('save');
    await Promise.resolve();
    expect(released).toBe(false);
    await resolveUnsavedWorkDecision('cancel');
    await Promise.resolve();
    expect(released).toBe(true);
  });
});
