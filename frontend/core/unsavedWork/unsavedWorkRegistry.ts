/**
 * Unsaved-work registry.
 *
 * A neutral, framework-free module that lets a screen declare "I hold unsaved work" and lets any navigation or
 * session boundary ask the user what to do about it (Save / Discard / Cancel) before proceeding.
 *
 * - Drafts register once and report their dirty state; they own their own Save and Discard behavior.
 * - A boundary calls `confirmUnsavedWork(intent)`. It resolves `true` when the boundary may proceed (nothing was
 *   dirty, or the user saved / discarded successfully) and `false` when it must not (the user cancelled, or another
 *   decision is already open).
 * - Exactly one decision can be pending. The dialog host (core/unsavedWork/UnsavedWorkDialogHost) renders it.
 * - Save is single-flight per draft: concurrent Save requests share one operation.
 * - A failed Save or Discard keeps the decision open with an error, so the user can retry, discard or cancel.
 *
 * Forced exits (session expiry, security resets, browser back/forward, reload, app kill) never pass through here.
 */

export type UnsavedWorkIntent = 'exit' | 'deepLink' | 'completion' | 'logout';
export type UnsavedWorkDecision = 'save' | 'discard' | 'cancel';

export interface UnsavedDraftRegistration {
  /** Unique id of this draft instance. */
  id: string;
  /** Human label shown in the dialog (already translated). */
  label: string;
  /** Persist the draft against its ORIGINAL identity. Must reject on failure and must never sign or finalize. */
  save: () => Promise<void>;
  /** Explicitly drop the draft. May reject. */
  discard: () => void | Promise<void>;
}

export interface UnsavedDraftHandle {
  setDirty: (dirty: boolean) => void;
  unregister: () => void;
}

export interface UnsavedWorkSnapshot {
  pending: null | { intent: UnsavedWorkIntent; labels: string[] };
  busy: null | 'save' | 'discard';
  error: null | 'save' | 'discard';
}

interface Entry {
  registration: UnsavedDraftRegistration;
  dirty: boolean;
  inFlightSave: Promise<void> | null;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

let pending: null | { intent: UnsavedWorkIntent; resolve: (proceed: boolean) => void } = null;
let busy: UnsavedWorkSnapshot['busy'] = null;
let error: UnsavedWorkSnapshot['error'] = null;
let snapshot: UnsavedWorkSnapshot = { pending: null, busy: null, error: null };
let dirtySnapshot = false;

const dirtyEntries = (): Entry[] => [...entries.values()].filter((entry) => entry.dirty);

const emit = () => {
  dirtySnapshot = dirtyEntries().length > 0;
  snapshot = {
    pending: pending ? { intent: pending.intent, labels: dirtyEntries().map((entry) => entry.registration.label) } : null,
    busy,
    error,
  };
  listeners.forEach((listener) => listener());
};

export const subscribeUnsavedWork = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getUnsavedWorkSnapshot = (): UnsavedWorkSnapshot => snapshot;
export const getHasDirtyDraftsSnapshot = (): boolean => dirtySnapshot;
export const hasDirtyDrafts = (): boolean => dirtyEntries().length > 0;
/** True while a Save / Discard / Cancel decision is open. */
export const isDecisionPending = (): boolean => pending !== null;

const settleWaiters: (() => void)[] = [];
const flushSettleWaiters = () => {
  settleWaiters.splice(0).forEach((resolve) => resolve());
};

/**
 * Resolves once no decision is open (immediately when none is). Waiters are released AFTER the decision's own caller has
 * been resolved, so a boundary that was waiting on that decision (e.g. a guarded back action) continues first.
 */
export const whenNoDecisionPending = (): Promise<void> => {
  if (pending === null) return Promise.resolve();
  return new Promise<void>((resolve) => {
    settleWaiters.push(resolve);
  });
};

export const registerDraft = (registration: UnsavedDraftRegistration): UnsavedDraftHandle => {
  const entry: Entry = { registration, dirty: false, inFlightSave: null };
  entries.set(registration.id, entry);
  emit();
  return {
    setDirty: (dirty) => {
      if (entry.dirty === dirty || entries.get(registration.id) !== entry) return;
      entry.dirty = dirty;
      emit();
    },
    unregister: () => {
      if (entries.get(registration.id) === entry) {
        entries.delete(registration.id);
        emit();
      }
    },
  };
};

/**
 * Ask whether a boundary may proceed. Resolves immediately (no extra tick is added for callers that check
 * `hasDirtyDrafts()` first) when nothing is dirty.
 */
export const confirmUnsavedWork = (intent: UnsavedWorkIntent): Promise<boolean> => {
  if (!hasDirtyDrafts()) return Promise.resolve(true);
  // One decision at a time. A second boundary arriving while the dialog is open is refused rather than stacked.
  if (pending) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    pending = { intent, resolve };
    busy = null;
    error = null;
    emit();
  });
};

const saveOnce = (entry: Entry): Promise<void> => {
  if (!entry.inFlightSave) {
    entry.inFlightSave = entry.registration.save().finally(() => {
      entry.inFlightSave = null;
    });
  }
  return entry.inFlightSave;
};

const settle = (proceed: boolean) => {
  const current = pending;
  pending = null;
  busy = null;
  error = null;
  emit();
  current?.resolve(proceed);
  flushSettleWaiters();
};

export const resolveUnsavedWorkDecision = async (decision: UnsavedWorkDecision): Promise<void> => {
  if (!pending || busy) return;
  if (decision === 'cancel') {
    settle(false);
    return;
  }
  busy = decision;
  error = null;
  emit();
  try {
    for (const entry of dirtyEntries()) {
      if (decision === 'save') {
        await saveOnce(entry);
      } else {
        await entry.registration.discard();
      }
      entry.dirty = false;
    }
  } catch {
    busy = null;
    error = decision;
    emit();
    return;
  }
  settle(true);
};

/** Test support only. */
export const resetUnsavedWorkForTests = () => {
  entries.clear();
  const current = pending;
  pending = null;
  busy = null;
  error = null;
  emit();
  current?.resolve(false);
  flushSettleWaiters();
};
