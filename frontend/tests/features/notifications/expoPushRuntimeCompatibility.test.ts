/**
 * Expo Go compatibility of the Expo push adapter.
 *
 * Reconstructed 2026-11-03: the original test file referenced by
 * docs/Architecture/NOVA-PRODUCT-ARCHITECTURE.md (Android Expo Go UAT notification
 * boundary) was lost with an uncommitted worktree. These cases re-establish the
 * behavior that note documents; they are not a byte-for-byte restoration.
 */
const NOTIFICATIONS_REQUIRED = jest.fn();

const nativeModule = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5, LOW: 2 },
};

const storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

type Environment = 'storeClient' | 'bare';

const loadAdapter = (environment: Environment) => {
  let loaded: any;
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: environment },
      ExecutionEnvironment: { StoreClient: 'storeClient', Bare: 'bare', Standalone: 'standalone' },
    }));
    jest.doMock('expo-device', () => ({ isDevice: true, modelId: 'test-model' }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: storage }));
    jest.doMock('expo-notifications', () => {
      NOTIFICATIONS_REQUIRED();
      return nativeModule;
    });
    loaded = require('../../../features/notifications/data/datasources/expo-push.service');
  });
  return loaded as typeof import('../../../features/notifications/data/datasources/expo-push.service');
};

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue('cached-native-token');
});

describe('Expo Go (StoreClient) execution environment', () => {
  it('reports native notifications as unavailable and never evaluates expo-notifications', () => {
    const adapter = loadAdapter('storeClient');

    expect(adapter.nativeNotificationsAvailable).toBe(false);
    expect(NOTIFICATIONS_REQUIRED).not.toHaveBeenCalled();
    expect(nativeModule.setNotificationHandler).not.toHaveBeenCalled();
  });

  it('returns denied permission results without touching native APIs', async () => {
    const { expoPushService } = loadAdapter('storeClient');

    await expect(expoPushService.initialize()).resolves.toBe('denied');
    await expect(expoPushService.requestPermissions()).resolves.toBe('denied');
    await expect(expoPushService.getPermissionStatus()).resolves.toBe('denied');
    expect(nativeModule.getPermissionsAsync).not.toHaveBeenCalled();
    expect(nativeModule.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns no push token and never reuses a cached native-build token', async () => {
    const { expoPushService } = loadAdapter('storeClient');

    await expect(expoPushService.getPushToken()).resolves.toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(nativeModule.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('skips device registration', async () => {
    const { expoPushService } = loadAdapter('storeClient');

    await expoPushService.registerDevice('token', 'staff-1', 'tenant-1');

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('provides safe no-op listener disposers', () => {
    const { expoPushService } = loadAdapter('storeClient');

    const disposeReceived = expoPushService.onNotificationReceived(jest.fn());
    const disposeResponse = expoPushService.onNotificationResponse(jest.fn());

    expect(() => { disposeReceived(); disposeResponse(); }).not.toThrow();
    expect(nativeModule.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(nativeModule.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('rejects local scheduling explicitly instead of reporting a false success', async () => {
    const { expoPushService } = loadAdapter('storeClient');

    await expect(
      expoPushService.scheduleLocalNotification({ title: 'Title', body: 'Body' } as any),
    ).rejects.toThrow('Native notifications are unavailable in Expo Go');
    expect(nativeModule.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('keeps badge, cancellation and clear operations safe', async () => {
    const { expoPushService } = loadAdapter('storeClient');

    await expect(expoPushService.getBadgeCount()).resolves.toBe(0);
    await expect(expoPushService.setBadgeCount(3)).resolves.toBeUndefined();
    await expect(expoPushService.cancelScheduledNotification('id')).resolves.toBeUndefined();
    await expect(expoPushService.cancelAllScheduledNotifications()).resolves.toBeUndefined();
    await expect(expoPushService.clearAllNotifications()).resolves.toBeUndefined();
    expect(nativeModule.getBadgeCountAsync).not.toHaveBeenCalled();
    expect(nativeModule.setBadgeCountAsync).not.toHaveBeenCalled();
    expect(nativeModule.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});

describe('compatible bare/standalone execution environment', () => {
  it('loads expo-notifications and registers the foreground handler', () => {
    const adapter = loadAdapter('bare');

    expect(adapter.nativeNotificationsAvailable).toBe(true);
    expect(NOTIFICATIONS_REQUIRED).toHaveBeenCalledTimes(1);
    expect(nativeModule.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('delegates permission status to the native module', async () => {
    nativeModule.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const { expoPushService } = loadAdapter('bare');

    await expect(expoPushService.getPermissionStatus()).resolves.toBe('granted');
    expect(nativeModule.getPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('subscribes listeners through the native module and disposes them', () => {
    const remove = jest.fn();
    nativeModule.addNotificationReceivedListener.mockReturnValue({ remove });
    const { expoPushService } = loadAdapter('bare');

    const dispose = expoPushService.onNotificationReceived(jest.fn());
    dispose();

    expect(nativeModule.addNotificationReceivedListener).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
