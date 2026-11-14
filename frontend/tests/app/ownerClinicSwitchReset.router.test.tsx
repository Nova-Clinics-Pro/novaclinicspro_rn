/**
 * Clinic switch = navigation reset (decision D7, option B). Workspace routes carry no tenant, so entering another clinic
 * must leave nothing of the previous clinic underneath. Exercises the REAL app/owner/index.tsx inside real Expo Router.
 */
import React, { useEffect } from 'react';
import { fireEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';
import OwnerDashboardScreen from '../../app/owner/index';
import {
  getUnsavedWorkSnapshot,
  hasDirtyDrafts,
  isDecisionPending,
  registerDraft,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../core/unsavedWork/unsavedWorkRegistry';
import { buildContext, draftControl, log, makeProbeScreen, resetHarness, WS } from '../features/episodes/navigation/routerHarness';

const mockSetSelectedClinic = jest.fn();
const mockAuth = {
  currentUser: {
    fullName: 'Olivia Owner',
    ownedClinics: [
      { tenantId: 'clinic-a', clinicName: 'Clinic A' },
      { tenantId: 'clinic-b', clinicName: 'Clinic B' },
    ],
  },
  isLoading: false,
  logout: jest.fn(),
};
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useSelectedClinic: () => ({ setSelectedClinic: mockSetSelectedClinic }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const Probe = makeProbeScreen('workspace');
const DraftWorkspace = () => {
  useEffect(() => {
    const handle = registerDraft({ id: 'rx', label: 'Prescription draft', save: () => draftControl.save(), discard: () => draftControl.discard() });
    draftControl.handle = handle;
    return () => handle.unregister();
  }, []);
  return <Probe />;
};

const rootRouteNames = (state: any): string[] => {
  const root = state?.routes?.[0]?.state;
  return (root?.routes ?? []).map((route: any) => route.name);
};
const go = (fn: () => void) => act(() => { fn(); });
const workspaceUnmounts = () => log.filter((entry) => entry.startsWith('unmount:workspace')).length;
const press = async (testID: string) => act(async () => { fireEvent.press(screen.getByTestId(testID)); });

/** stack: owner, clinic-admin(clinic A, workspace a1), owner again (the owner returned via push) */
const bootWithClinicAWorkspaceUnderneath = (dirty: boolean) => {
  const view = renderRouter(
    buildContext({ workspace: DraftWorkspace, extra: { owner: OwnerDashboardScreen, 'clinic-admin/staff/index': makeProbeScreen('staff') } }) as never,
    { initialUrl: '/owner' },
  );
  go(() => router.push(WS('e1', 'a1') as never));
  go(() => draftControl.handle!.setDirty(dirty));
  go(() => router.push('/owner' as never));
  expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin', 'owner']);
  return view;
};

beforeEach(() => {
  resetHarness();
  resetUnsavedWorkForTests();
  mockSetSelectedClinic.mockClear();
  draftControl.save.mockReset().mockResolvedValue(undefined);
  draftControl.discard.mockReset();
  draftControl.handle = null;
});

it('control: without the reset the previous clinic navigator would stay underneath (what a plain push does)', () => {
  const view = bootWithClinicAWorkspaceUnderneath(false);
  go(() => router.push('/clinic-admin' as never));
  expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin', 'owner', 'clinic-admin']);
});

describe.each([
  ['open dashboard', 'clinic-card-clinic-b-open-dashboard', '/clinic-admin'],
  ['manage staff', 'clinic-card-clinic-b-manage-staff', '/clinic-admin/staff'],
])('entering another clinic via "%s"', (_label, testID, expectedPath) => {
  it('leaves exactly one clinic navigator and no workspace from the previous clinic', async () => {
    const view = bootWithClinicAWorkspaceUnderneath(false);
    await press(testID);
    expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin']);
    expect(workspaceUnmounts()).toBe(1); // clinic A's workspace is gone
    expect(view.getPathname().startsWith(expectedPath)).toBe(true);
    expect(mockSetSelectedClinic).toHaveBeenCalledWith('clinic-b');
  });
});

it('a normal first entry (nothing underneath) still just enters the clinic', async () => {
  const view = renderRouter(buildContext({ extra: { owner: OwnerDashboardScreen, 'clinic-admin/staff/index': makeProbeScreen('staff') } }) as never, { initialUrl: '/owner' });
  await press('clinic-card-clinic-a-open-dashboard');
  expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin']);
  expect(mockSetSelectedClinic).toHaveBeenCalledWith('clinic-a');
});

describe('with an unsaved prescription draft in the previous clinic', () => {
  it('asks first: nothing resets and the clinic is not switched until the user decides', async () => {
    const view = bootWithClinicAWorkspaceUnderneath(true);
    await press('clinic-card-clinic-b-open-dashboard');
    expect(isDecisionPending()).toBe(true);
    expect(getUnsavedWorkSnapshot().pending?.intent).toBe('exit');
    expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin', 'owner']);
    expect(mockSetSelectedClinic).not.toHaveBeenCalled();
  });

  it('Cancel keeps everything as it was, including the draft', async () => {
    const view = bootWithClinicAWorkspaceUnderneath(true);
    await press('clinic-card-clinic-b-open-dashboard');
    await act(async () => { await resolveUnsavedWorkDecision('cancel'); });
    expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin', 'owner']);
    expect(mockSetSelectedClinic).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);
    expect(workspaceUnmounts()).toBe(0);
  });

  it('Discard then switches clinic with the reset', async () => {
    const view = bootWithClinicAWorkspaceUnderneath(true);
    await press('clinic-card-clinic-b-open-dashboard');
    await act(async () => { await resolveUnsavedWorkDecision('discard'); });
    expect(draftControl.discard).toHaveBeenCalledTimes(1);
    expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin']);
    expect(mockSetSelectedClinic).toHaveBeenCalledWith('clinic-b');
    expect(workspaceUnmounts()).toBe(1);
  });

  it('Save then switches clinic only after the save succeeded', async () => {
    const view = bootWithClinicAWorkspaceUnderneath(true);
    let release!: () => void;
    draftControl.save.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    await press('clinic-card-clinic-b-open-dashboard');
    let deciding!: Promise<void>;
    await act(async () => { deciding = resolveUnsavedWorkDecision('save'); });
    expect(mockSetSelectedClinic).not.toHaveBeenCalled();
    await act(async () => { release(); await deciding; });
    expect(draftControl.save).toHaveBeenCalledTimes(1);
    expect(rootRouteNames(view.getRouterState())).toEqual(['owner', 'clinic-admin']);
    expect(mockSetSelectedClinic).toHaveBeenCalledWith('clinic-b');
  });
});
