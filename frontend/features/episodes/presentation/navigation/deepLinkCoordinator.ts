/**
 * Warm deep-link coordinator (used by app/+native-intent.tsx).
 *
 * An OS link opened while the app is running is delivered as one NAVIGATE to the root with nested params; the child
 * navigator rebuilds its state from those params and never emits `beforeRemove`, so a navigation guard cannot see it
 * (verified in the Stage 0/0.5 spikes). Expo Router does call `redirectSystemPath` first, and a falsy return value
 * means "do not navigate". So:
 *
 *  - cold start (`initial`)          -> passed through unchanged;
 *  - password-recovery links          -> passed through unchanged (see below);
 *  - no dirty draft                   -> passed through unchanged;
 *  - dirty draft (every other link)   -> the link is deferred and the shared Save / Discard / Cancel dialog opens;
 *      Save success / Discard         -> `router.navigate` to the preserved original destination;
 *      Cancel                         -> the current workspace and draft stay, nothing navigates;
 *      Save failure                   -> the decision stays open and the intent is kept for a retry.
 *
 * Repeated events while a decision is pending are deduplicated; the latest link wins. If ANOTHER boundary (a guarded
 * exit, the completion step, logout) already owns the dialog when a link arrives, the link is kept (never dropped)
 * and handled as soon as that decision settles: applied straight away when the draft is no longer dirty, otherwise
 * asked about in its own dialog.
 *
 * Recovery links (`/reset-password`, carrying a one-time token) are a different intent: the route is a leaf screen, so
 * opening it pushes a screen on top and removes nothing (verified by test), and holding the link behind a
 * clinical-draft dialog would only get in the way of a security flow. They are passed through untouched; the URL (and
 * its token) is never stored or logged here.
 *
 * Notification taps use `router.push`, which never removes the workspace, so they do not pass through here.
 */
import { router } from 'expo-router';
import {
  confirmUnsavedWork,
  hasDirtyDrafts,
  isDecisionPending,
  whenNoDecisionPending,
} from '../../../../core/unsavedWork/unsavedWorkRegistry';

let pendingUrl: string | null = null;

/** Convert the raw URL of an OS link into an in-app path (query and hash preserved). */
export const urlToAppPath = (url: string): string => {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/.exec(url);
  if (!match) return url.startsWith('/') ? url : `/${url}`;
  const scheme = match[1].toLowerCase();
  let remainder = match[2];
  if (scheme === 'http' || scheme === 'https') {
    // drop the host
    const slash = remainder.indexOf('/');
    remainder = slash === -1 ? '' : remainder.slice(slash);
  } else if (remainder.includes('/--/')) {
    // Expo Go / dev client: exp://host:port/--/path
    remainder = remainder.slice(remainder.indexOf('/--/') + 3);
  }
  // custom scheme: `scheme://clinic-admin/x` and `scheme:///clinic-admin/x` both mean `/clinic-admin/x`
  return `/${remainder.replace(/^\/+/, '')}`;
};

/** Password-recovery callback (carries a one-time token): never held behind the draft dialog. */
export const isRecoveryLink = (url: string): boolean => {
  const route = urlToAppPath(url).split(/[?#]/)[0].replace(/\/+$/, '');
  return route === '/reset-password';
};

/** Apply or ask about the most recent deferred link. Only ever runs when no other decision is open. */
const settlePendingLink = () => {
  const intent = pendingUrl;
  if (intent === null) return;
  if (!hasDirtyDrafts()) {
    // The draft was saved or discarded by the decision that was in the way: nothing left to ask.
    pendingUrl = null;
    router.navigate(urlToAppPath(intent) as never);
    return;
  }
  void confirmUnsavedWork('deepLink').then((proceed) => {
    const latest = pendingUrl;
    pendingUrl = null;
    if (proceed && latest) router.navigate(urlToAppPath(latest) as never);
  });
};

export const redirectSystemPath = ({ path, initial }: { path: string; initial: boolean }): string => {
  if (initial) return path;
  if (isRecoveryLink(path)) return path;

  if (pendingUrl !== null) {
    // A link is already waiting (for the dialog, or for another decision to settle): dedupe, the latest link wins.
    pendingUrl = path;
    return '';
  }
  if (isDecisionPending()) {
    // Another boundary owns the dialog: keep this link and handle it once that decision settles.
    pendingUrl = path;
    void whenNoDecisionPending().then(settlePendingLink);
    return '';
  }
  if (!hasDirtyDrafts()) return path;

  pendingUrl = path;
  settlePendingLink();
  return '';
};

/** Test support only. */
export const resetDeepLinkCoordinatorForTests = () => {
  pendingUrl = null;
};
