const mockCancelQueries = jest.fn();
const mockClearQueries = jest.fn();
jest.mock('../../../core/api/queryClient', () => ({
  queryClient: { cancelQueries: mockCancelQueries, clear: mockClearQueries },
}));

const mockCleanupForIdentity = jest.fn();
const mockDisposeListeners = jest.fn();
jest.mock('../../../features/notifications/application/notification-device-lifecycle.service', () => ({
  notificationDeviceLifecycleService: {
    cleanupForIdentity: mockCleanupForIdentity,
    disposeListeners: mockDisposeListeners,
  },
}));

const mockClearWizardDraft = jest.fn();
jest.mock('../../../features/onboarding/presentation/stores/wizard.store', () => ({
  clearWizardDraftStorageForIdentity: mockClearWizardDraft,
}));

const mockProviderSignOut = jest.fn();
jest.mock('../../../features/auth/application/auth-session.service', () => ({
  authSessionService: { signOutProviderBestEffort: mockProviderSignOut },
}));

const mockClearSession = jest.fn();
const mockGetState = jest.fn();
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: { getState: mockGetState },
}));

const { UnifiedLogoutService } = require('../../../features/auth/application/unified-logout.service');
const { isLoggingOut } = require('../../../core/api/authGuard');

describe('UnifiedLogoutService', () => {
  const order: string[] = [];
  const identity = { tenantId: 'tenant-a', userId: 'user-a' };

  beforeEach(() => {
    jest.clearAllMocks();
    order.length = 0;
    mockGetState.mockReturnValue({
      currentUser: { ...identity, id: 'user-a' },
      selectedClinicId: null,
      clearSession: mockClearSession,
    });
    mockCleanupForIdentity.mockImplementation(async (value: unknown) => { order.push(`notification:${JSON.stringify(value)}`); });
    mockClearSession.mockImplementation(async () => { order.push('clearSession'); });
    mockCancelQueries.mockImplementation(async () => { order.push('cancelQueries'); });
    mockClearQueries.mockImplementation(() => { order.push('clearQueries'); });
    mockClearWizardDraft.mockImplementation(async () => { order.push('clearDraft'); });
    mockProviderSignOut.mockImplementation(async () => { order.push('providerSignOut'); });
  });

  it('captures outgoing identity, starts notification cleanup, then completes local logout before provider sign-out', async () => {
    const service = new UnifiedLogoutService();
    const navigateToLogin = jest.fn(() => order.push('navigate'));

    await service.logout({ navigateToLogin });

    expect(order).toEqual([
      'notification:{"tenantId":"tenant-a","userId":"user-a"}',
      'clearSession',
      'cancelQueries',
      'clearQueries',
      'clearDraft',
      'navigate',
      'providerSignOut',
    ]);
    expect(mockClearWizardDraft).toHaveBeenCalledWith(identity);
    expect(isLoggingOut()).toBe(false);
  });

  it('does not block local logout when notification or provider remote cleanup fails', async () => {
    const service = new UnifiedLogoutService();
    mockCleanupForIdentity.mockRejectedValueOnce(new Error('notification remote failure'));
    mockProviderSignOut.mockRejectedValueOnce(new Error('provider remote failure'));
    const navigateToLogin = jest.fn();

    await expect(service.logout({ navigateToLogin })).resolves.toBeUndefined();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockCancelQueries).toHaveBeenCalledTimes(1);
    expect(mockClearQueries).toHaveBeenCalledTimes(1);
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(isLoggingOut()).toBe(false);
  });

  it('still clears local auth and navigates when cache cancellation or draft cleanup fails', async () => {
    const service = new UnifiedLogoutService();
    mockCancelQueries.mockRejectedValueOnce(new Error('query cancellation failure'));
    mockClearWizardDraft.mockRejectedValueOnce(new Error('draft cleanup failure'));
    const navigateToLogin = jest.fn();

    await expect(service.logout({ navigateToLogin })).resolves.toBeUndefined();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockClearQueries).toHaveBeenCalledTimes(1);
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(mockProviderSignOut).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight command for duplicate explicit logout triggers', async () => {
    const service = new UnifiedLogoutService();
    let releaseQueries!: () => void;
    mockCancelQueries.mockImplementationOnce(() => new Promise<void>(resolve => { releaseQueries = resolve; }));

    const first = service.logout({ navigateToLogin: jest.fn() });
    const second = service.logout({ navigateToLogin: jest.fn() });
    expect(second).toBe(first);
    expect(mockCleanupForIdentity).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);

    releaseQueries();
    await first;
  });

  it('does not reuse a previous tenant identity after store state changes for the next logout', async () => {
    const service = new UnifiedLogoutService();
    await service.logout({ navigateToLogin: jest.fn() });
    mockGetState.mockReturnValue({
      currentUser: { tenantId: 'tenant-b', userId: 'user-b', id: 'user-b' },
      selectedClinicId: null,
      clearSession: mockClearSession,
    });

    await service.logout({ navigateToLogin: jest.fn() });

    expect(mockCleanupForIdentity).toHaveBeenNthCalledWith(1, identity);
    expect(mockCleanupForIdentity).toHaveBeenNthCalledWith(2, { tenantId: 'tenant-b', userId: 'user-b' });
  });
});
