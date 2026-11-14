import { useSyncExternalStore } from 'react';
import {
  getHasDirtyDraftsSnapshot,
  getUnsavedWorkSnapshot,
  subscribeUnsavedWork,
  type UnsavedWorkSnapshot,
} from './unsavedWorkRegistry';

/** Reactive view of the pending decision (for the dialog host). */
export const useUnsavedWorkSnapshot = (): UnsavedWorkSnapshot =>
  useSyncExternalStore(subscribeUnsavedWork, getUnsavedWorkSnapshot, getUnsavedWorkSnapshot);

/** Reactive "is any registered draft dirty" flag (for navigation guards). */
export const useHasDirtyDrafts = (): boolean =>
  useSyncExternalStore(subscribeUnsavedWork, getHasDirtyDraftsSnapshot, getHasDirtyDraftsSnapshot);
