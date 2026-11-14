/**
 * User-initiated logout asks Save / Discard / Cancel when a draft is unsaved; the /logout route leaves its loading
 * screen when the user cancels. Forced logout / session invalidation do not go through useAuth().logout at all.
 */
import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import LogoutScreen from '../../../app/logout';
import { unifiedLogoutService } from '../../../features/auth/application/unified-logout.service';
import {
  confirmUnsavedWork,
  getUnsavedWorkSnapshot,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../../core/unsavedWork/unsavedWorkRegistry';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockAuthState = { isAuthenticated: true };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return jest.requireActual('react').createElement(Text, { testID: 'redirect' }, href);
  },
}));
jest.mock('../../../features/auth/application/unified-logout.service', () => ({
  unifiedLogoutService: { logout: jest.fn() },
}));
jest.mock('../../../features/auth/presentation/providers/auth.store', () => {
  const store: any = () => ({});
  store.getState = () => mockAuthState;
  return { useAuthStore: store };
});

const dirtyDraft = (opts: { save?: () => Promise<void> } = {}) => {
  const save = jest.fn(opts.save ?? (async () => {}));
  const discard = jest.fn();
  const handle = registerDraft({ id: 'rx', label: 'Prescription draft', save, discard });
  handle.setDirty(true);
  return { save, discard };
};
const logoutService = unifiedLogoutService.logout as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetUnsavedWorkForTests();
  mockAuthState.isAuthenticated = true;
  mockRouter.canGoBack.mockReturnValue(true);
  logoutService.mockResolvedValue(undefined);
});
afterEach(() => resetUnsavedWorkForTests());

describe('useAuth().logout', () => {
  it('with nothing unsaved, starts the canonical logout immediately (no extra async hop)', () => {
    const { result } = renderHook(() => useAuth());
    void result.current.logout();
    expect(logoutService).toHaveBeenCalledTimes(1);
    expect(isDecisionPending()).toBe(false);
  });

  it('with an unsaved draft, logout does NOT start: the shared decision opens first', () => {
    dirtyDraft();
    const { result } = renderHook(() => useAuth());
    void result.current.logout();
    expect(logoutService).not.toHaveBeenCalled();
    expect(getUnsavedWorkSnapshot().pending).toEqual({ intent: 'logout', labels: ['Prescription draft'] });
  });

  it('Cancel resolves without logging out and keeps the draft', async () => {
    const draft = dirtyDraft();
    const { result } = renderHook(() => useAuth());
    let done!: Promise<unknown>;
    act(() => { done = result.current.logout(); });
    await act(async () => { await resolveUnsavedWorkDecision('cancel'); });
    await done;
    expect(logoutService).not.toHaveBeenCalled();
    expect(draft.save).not.toHaveBeenCalled();
    expect(draft.discard).not.toHaveBeenCalled();
  });

  it('Save logs out only after the save succeeded', async () => {
    let release!: () => void;
    const draft = dirtyDraft({ save: () => new Promise<void>((resolve) => { release = resolve; }) });
    const { result } = renderHook(() => useAuth());
    let done!: Promise<unknown>;
    act(() => { done = result.current.logout(); });
    let deciding!: Promise<void>;
    await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
    expect(logoutService).not.toHaveBeenCalled();
    await act(async () => { release(); await deciding; await done; });
    expect(draft.save).toHaveBeenCalledTimes(1);
    expect(logoutService).toHaveBeenCalledTimes(1);
  });

  it('Save failure keeps the user signed in and the decision open; retry then logs out', async () => {
    const draft = dirtyDraft({ save: jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined) as never });
    const { result } = renderHook(() => useAuth());
    let done!: Promise<unknown>;
    act(() => { done = result.current.logout(); });
    await act(async () => { await resolveUnsavedWorkDecision('save'); });
    expect(logoutService).not.toHaveBeenCalled();
    expect(isDecisionPending()).toBe(true);
    await act(async () => { await resolveUnsavedWorkDecision('save'); await done; });
    expect(draft.save).toHaveBeenCalledTimes(2);
    expect(logoutService).toHaveBeenCalledTimes(1);
  });

  it('Discard logs out after the explicit discard', async () => {
    const draft = dirtyDraft();
    const { result } = renderHook(() => useAuth());
    let done!: Promise<unknown>;
    act(() => { done = result.current.logout(); });
    await act(async () => { await resolveUnsavedWorkDecision('discard'); await done; });
    expect(draft.discard).toHaveBeenCalledTimes(1);
    expect(logoutService).toHaveBeenCalledTimes(1);
  });
});

describe('the /logout route', () => {
  it('after a CANCELLED logout (still signed in) it goes back instead of staying on the loading screen', async () => {
    dirtyDraft();
    render(<LogoutScreen />);
    await act(async () => { await Promise.resolve(); });
    expect(isDecisionPending()).toBe(true);
    await act(async () => { await resolveUnsavedWorkDecision('cancel'); });
    expect(logoutService).not.toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('with no history to go back to it redirects home instead', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    dirtyDraft();
    const view = render(<LogoutScreen />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await resolveUnsavedWorkDecision('cancel'); });
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(view.getByTestId('redirect').props.children).toBe('/');
  });

  it('a normal logout (no draft) signs out and does not navigate back', async () => {
    logoutService.mockImplementation(async () => { mockAuthState.isAuthenticated = false; });
    render(<LogoutScreen />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(logoutService).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

it('confirmUnsavedWork is the same single decision the other boundaries use', () => {
  dirtyDraft();
  void confirmUnsavedWork('exit');
  const { result } = renderHook(() => useAuth());
  void result.current.logout(); // refused while another decision is open: logout must not start
  expect(logoutService).not.toHaveBeenCalled();
});
