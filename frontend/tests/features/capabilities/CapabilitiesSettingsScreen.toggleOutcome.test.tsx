/**
 * CapabilitiesSettingsScreen — toggle outcome handling.
 *
 * Pins the sequence: toggle → spinner → outcome status → exactly one alert (none on success) →
 * `reset()` once → back to idle → the row is usable again. `useToggleCapability` is replaced by a small
 * stateful fake that behaves like the real hook (status/rejection live in state; `reset()` returns to idle),
 * so the screen's own effect runs against a realistic status lifecycle.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { CapabilitiesSettingsScreen } from '../../../features/capabilities/presentation/pages/CapabilitiesSettingsScreen';
import { useCapabilities, useCapabilityCatalog } from '../../../core/hooks/useCapabilities';

type Outcome = 'success' | 'conflict' | 'blocks_dependents' | 'plain_rejection' | 'generic_failure';

const mockControl: { outcome: Outcome; gate: Promise<void> | null } = { outcome: 'success', gate: null };
const mockToggleCalls = jest.fn();
const mockResetCalls = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
  Link: ({ children }: any) => children,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({
    currentUser: { permissions: ['capability.manage'], isOrgAdmin: false },
    isAuthenticated: true,
    isLoading: false,
  }),
}));
jest.mock('../../../core/hooks/useCapabilities', () => ({
  useCapabilities: jest.fn(),
  useCapabilityCatalog: jest.fn(),
  useToggleCapability: () => {
    const R = jest.requireActual('react');
    const [status, setStatus] = R.useState('idle');
    const [rejection, setRejection] = R.useState(null);
    const reset = R.useCallback(() => {
      mockResetCalls();
      setStatus('idle');
      setRejection(null);
    }, []);
    const toggle = R.useCallback(async (args: unknown) => {
      mockToggleCalls(args);
      setStatus('toggling');
      setRejection(null);
      if (mockControl.gate) await mockControl.gate;
      switch (mockControl.outcome) {
        case 'success':
          setStatus('success');
          break;
        case 'conflict':
          setRejection({ error: 'version_conflict', message: 'conflict', current_version: 9 });
          setStatus('conflict');
          break;
        case 'blocks_dependents':
          setRejection({
            error: 'blocks_dependents',
            message: 'blocked',
            blocking_capabilities: ['billing', 'inventory'],
          });
          setStatus('error');
          break;
        case 'plain_rejection':
          setRejection({ error: 'not_entitled', message: 'Not entitled to this capability' });
          setStatus('error');
          break;
        default:
          setStatus('error');
      }
    }, []);
    return { toggle, status, errorMessage: null, rejection, currentVersion: null, reset };
  },
}));

const CATALOG = [
  {
    code: 'core',
    name: 'Core',
    description: 'Essential clinic management',
    parent_code: null,
    category: 'core',
    display_order: 0,
    lifecycle_state: 'enabled',
  },
];
const CAPS = {
  core: {
    code: 'core',
    name: 'Core',
    description: '',
    entitled: true,
    tenant_preference: false,
    effective_available: true,
    effective_enabled: false,
    blocked_reason_code: null,
    blocked_reason_label: null,
    unmet_dependencies: [],
    source: 'template_default',
    version: 5,
  },
};

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockControl.outcome = 'success';
  mockControl.gate = null;
  (useCapabilityCatalog as jest.Mock).mockReturnValue({ data: { capabilities: CATALOG }, isLoading: false, error: null });
  (useCapabilities as jest.Mock).mockReturnValue({
    capabilities: CAPS,
    isLoading: false,
    error: null,
    getReason: (code: string) => `Reason: ${code}`,
    refetch: jest.fn(),
  });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => alertSpy.mockRestore());

/** Flip the switch with the outcome held back, so the in-flight (spinner) state can be observed. */
const startToggle = async (u: ReturnType<typeof render>) => {
  let release!: () => void;
  mockControl.gate = new Promise<void>((resolve) => { release = resolve; });
  await act(async () => { fireEvent(u.getByRole('switch'), 'valueChange', true); });
  return release;
};
const finishToggle = async (release: () => void) => {
  mockControl.gate = null;
  await act(async () => { release(); });
};
const toggleOnce = async (u: ReturnType<typeof render>) => finishToggle(await startToggle(u));

describe('CapabilitiesSettingsScreen — toggle outcomes', () => {
  it('shows the in-flight spinner (no switch) while toggling, then restores the switch afterwards', async () => {
    const u = render(<CapabilitiesSettingsScreen />);
    const release = await startToggle(u);
    expect(mockToggleCalls).toHaveBeenCalledWith({ code: 'core', enabled: true, version: 5 });
    expect(u.queryByRole('switch')).toBeNull(); // spinner replaces the switch for the toggling row
    await finishToggle(release);
    await waitFor(() => expect(u.getByRole('switch')).toBeTruthy());
  });

  it('conflict: shows the "Updated elsewhere" alert exactly once and resets once', async () => {
    mockControl.outcome = 'conflict';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy.mock.calls[0][0]).toBe('Updated elsewhere');
    expect(alertSpy.mock.calls[0][1]).toMatch(/changed elsewhere/);
    expect(mockResetCalls).toHaveBeenCalledTimes(1);
    expect(u.getByRole('switch')).toBeTruthy();
  });

  it('blocks_dependents: names the blocking capabilities in a "Cannot disable" alert, once', async () => {
    mockControl.outcome = 'blocks_dependents';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy).toHaveBeenCalledWith(
      'Cannot disable',
      'This is required by: billing, inventory. Disable those first.'
    );
    expect(mockResetCalls).toHaveBeenCalledTimes(1);
  });

  it('plain rejection: shows the server message in an "Unable to update" alert, once', async () => {
    mockControl.outcome = 'plain_rejection';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy).toHaveBeenCalledWith('Unable to update', 'Not entitled to this capability');
    expect(mockResetCalls).toHaveBeenCalledTimes(1);
  });

  it('generic failure: shows the fallback message, once', async () => {
    mockControl.outcome = 'generic_failure';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy).toHaveBeenCalledWith('Unable to update', 'Failed to update this capability. Please try again.');
    expect(mockResetCalls).toHaveBeenCalledTimes(1);
  });

  it('success: no alert at all, but the status is still reset once and the row is usable', async () => {
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(mockResetCalls).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(u.getByRole('switch')).toBeTruthy();
  });

  it('does not alert or reset before any toggle has happened', () => {
    render(<CapabilitiesSettingsScreen />);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockResetCalls).not.toHaveBeenCalled();
  });

  it('a second toggle after a first outcome works: new request, spinner again, its own single alert', async () => {
    mockControl.outcome = 'plain_rejection';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    mockControl.outcome = 'blocks_dependents';
    const release = await startToggle(u);
    expect(mockToggleCalls).toHaveBeenCalledTimes(2);
    expect(u.queryByRole('switch')).toBeNull();
    await finishToggle(release);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1][0]).toBe('Cannot disable');
    expect(mockResetCalls).toHaveBeenCalledTimes(2);
    expect(u.getByRole('switch')).toBeTruthy();
  });

  it('a second toggle after a successful first one is also alert-free and resets again', async () => {
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(mockResetCalls).toHaveBeenCalledTimes(1));
    await toggleOnce(u);
    await waitFor(() => expect(mockResetCalls).toHaveBeenCalledTimes(2));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('re-rendering after an outcome does not replay the alert', async () => {
    mockControl.outcome = 'conflict';
    const u = render(<CapabilitiesSettingsScreen />);
    await toggleOnce(u);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    await act(async () => { u.rerender(<CapabilitiesSettingsScreen />); });
    await act(async () => { u.rerender(<CapabilitiesSettingsScreen />); });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockResetCalls).toHaveBeenCalledTimes(1);
  });
});
