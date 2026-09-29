import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { PendingMutationReplayCoordinator } from '../../features/onboarding/application/pending-mutation-replay.coordinator';
import { usePendingMutationReplayLifecycle } from '../../features/onboarding/presentation/hooks/usePendingMutationReplayLifecycle';

let mockNetInfo = {
  isConnected: false as boolean | null,
  isInternetReachable: false as boolean | null,
};

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockNetInfo,
}));

const scope = {
  userId: 'user-1',
  organizationId: 'organization-1',
  tenantId: 'tenant-1',
};

describe('TG24.2 replay lifecycle triggers', () => {
  it('shares restart, reconnect, foreground, switch, and logout with one coordinator', async () => {
    let appStateListener: ((state: 'active' | 'background' | 'inactive') => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as typeof appStateListener;
      return { remove: jest.fn() };
    });
    const coordinator = {
      setConnectivity: jest.fn(),
      initialize: jest.fn().mockResolvedValue({ status: 'EMPTY', records: [] }),
      requestReplay: jest.fn().mockResolvedValue(undefined),
      cancelAndEvict: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
    } as unknown as PendingMutationReplayCoordinator;

    const { rerender, unmount } = renderHook(
      (props: { activeScope: typeof scope | null; authenticated: boolean }) =>
        usePendingMutationReplayLifecycle({
          coordinator,
          scope: props.activeScope,
          isAuthenticated: props.authenticated,
        }),
      { initialProps: { activeScope: scope, authenticated: true } }
    );

    await waitFor(() => {
      expect(coordinator.initialize).toHaveBeenCalledWith(scope);
      expect(coordinator.requestReplay).toHaveBeenCalledWith('RESTART');
    });

    mockNetInfo = { isConnected: true, isInternetReachable: true };
    rerender({ activeScope: scope, authenticated: true });
    expect(coordinator.requestReplay).toHaveBeenCalledWith('RECONNECT');

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    expect(coordinator.requestReplay).toHaveBeenCalledWith('FOREGROUND');

    rerender({ activeScope: null, authenticated: false });
    await waitFor(() => expect(coordinator.logout).toHaveBeenCalledWith('user-1'));

    unmount();
    expect(coordinator.cancelAndEvict).toHaveBeenCalled();
  });
});
