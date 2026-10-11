jest.mock('expo-device', () => ({ deviceName: 'Test device', modelName: 'Test model' }));

jest.mock('../../../features/notifications/data/datasources/expo-push.service', () => ({
  expoPushService: {
    initialize: jest.fn(),
    requestPermissions: jest.fn(),
    getPushToken: jest.fn(),
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    onNotificationReceived: jest.fn(),
    onNotificationResponse: jest.fn(),
    clearAllNotifications: jest.fn(),
    setBadgeCount: jest.fn(),
    getBadgeCount: jest.fn(),
    scheduleLocalNotification: jest.fn(),
    cancelScheduledNotification: jest.fn(),
    cancelAllScheduledNotifications: jest.fn(),
  },
}));

jest.mock('../../../features/notifications/data/repositories/push-notifications.repository.impl', () => ({
  notificationRepository: {
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

const { NotificationDeviceLifecycleService } = require('../../../features/notifications/application/notification-device-lifecycle.service');
const { expoPushService } = require('../../../features/notifications/data/datasources/expo-push.service');
const { notificationRepository } = require('../../../features/notifications/data/repositories/push-notifications.repository.impl');

describe('NotificationDeviceLifecycleService', () => {
  const identity = { tenantId: 'tenant-a', userId: 'user-a' };
  const disposeReceived = jest.fn();
  const disposeResponse = jest.fn();
  const mockInitialize = expoPushService.initialize as jest.Mock;
  const mockRequestPermissions = expoPushService.requestPermissions as jest.Mock;
  const mockGetPushToken = expoPushService.getPushToken as jest.Mock;
  const mockRegisterDevice = expoPushService.registerDevice as jest.Mock;
  const mockUnregisterDevice = expoPushService.unregisterDevice as jest.Mock;
  const mockOnNotificationReceived = expoPushService.onNotificationReceived as jest.Mock;
  const mockOnNotificationResponse = expoPushService.onNotificationResponse as jest.Mock;
  const mockRegisterRemoteDevice = notificationRepository.registerDevice as jest.Mock;
  const mockUnregisterRemoteDevice = notificationRepository.unregisterDevice as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue('granted');
    mockRequestPermissions.mockResolvedValue('granted');
    mockGetPushToken.mockResolvedValue('ExponentPushToken[token-a]');
    mockRegisterRemoteDevice.mockResolvedValue(undefined);
    mockUnregisterRemoteDevice.mockResolvedValue(undefined);
    mockRegisterDevice.mockResolvedValue(undefined);
    mockUnregisterDevice.mockResolvedValue(undefined);
    mockOnNotificationReceived.mockReturnValue(disposeReceived);
    mockOnNotificationResponse.mockReturnValue(disposeResponse);
  });

  it('registers the current tenant and user through the repository and provider boundaries', async () => {
    const service = new NotificationDeviceLifecycleService();

    await service.initialize(identity, jest.fn(), jest.fn());

    expect(mockRegisterRemoteDevice).toHaveBeenCalledWith('tenant-a', expect.objectContaining({
      push_token: 'ExponentPushToken[token-a]',
      device_name: 'Test device',
      device_model: 'Test model',
    }));
    expect(mockRegisterDevice).toHaveBeenCalledWith('ExponentPushToken[token-a]', 'user-a', 'tenant-a');
    expect(mockOnNotificationReceived).toHaveBeenCalledTimes(1);
    expect(mockOnNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it('does not acquire or register a token when initialization is denied', async () => {
    const service = new NotificationDeviceLifecycleService();
    mockInitialize.mockResolvedValueOnce('denied');

    const result = await service.initialize(identity, jest.fn(), jest.fn());

    expect(result).toEqual({ permissionStatus: 'denied', token: null });
    expect(mockGetPushToken).not.toHaveBeenCalled();
    expect(mockRegisterRemoteDevice).not.toHaveBeenCalled();
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('acquires and registers a token when permission is granted after a request', async () => {
    const service = new NotificationDeviceLifecycleService();

    const result = await service.requestPermissions(identity);

    expect(result).toEqual({ permissionStatus: 'granted', token: 'ExponentPushToken[token-a]' });
    expect(mockRegisterRemoteDevice).toHaveBeenCalledWith('tenant-a', expect.objectContaining({
      push_token: 'ExponentPushToken[token-a]',
    }));
    expect(mockRegisterDevice).toHaveBeenCalledWith('ExponentPushToken[token-a]', 'user-a', 'tenant-a');
  });

  it('replaces listeners instead of accumulating them on reinitialization', async () => {
    const service = new NotificationDeviceLifecycleService();
    await service.initialize(identity, jest.fn(), jest.fn());
    await service.initialize(identity, jest.fn(), jest.fn());

    expect(disposeReceived).toHaveBeenCalledTimes(1);
    expect(disposeResponse).toHaveBeenCalledTimes(1);
    expect(mockOnNotificationReceived).toHaveBeenCalledTimes(2);
    expect(mockOnNotificationResponse).toHaveBeenCalledTimes(2);
  });

  it('cleans prior registration before accepting a different tenant or user identity', async () => {
    const service = new NotificationDeviceLifecycleService();
    await service.initialize(identity, jest.fn(), jest.fn());

    await service.initialize({ tenantId: 'tenant-b', userId: 'user-b' }, jest.fn(), jest.fn());

    expect(mockUnregisterRemoteDevice).toHaveBeenCalledWith('tenant-a', 'ExponentPushToken[token-a]');
    expect(mockUnregisterDevice).toHaveBeenCalledWith('ExponentPushToken[token-a]', 'user-a');
    expect(mockRegisterRemoteDevice).toHaveBeenLastCalledWith('tenant-b', expect.any(Object));
    expect(mockRegisterDevice).toHaveBeenLastCalledWith('ExponentPushToken[token-a]', 'user-b', 'tenant-b');
  });

  it('maps repository preference reads and updates through the lifecycle boundary', async () => {
    const service = new NotificationDeviceLifecycleService();
    const dto = {
      user_id: 'user-a', tenant_id: 'tenant-a', appointment_new: true, appointment_updated: true,
      appointment_cancelled: false, appointment_no_show: true, daily_schedule_summary: false,
      critical_updates: true, leave_updates: true, schedule_summary_time: '07:00',
      enable_midday_summary: false, midday_summary_time: '12:00', quiet_hours_enabled: false,
      quiet_hours_start: '22:00', quiet_hours_end: '07:00', updated_at: '2026-01-01T00:00:00.000Z',
    };
    (notificationRepository.getPreferences as jest.Mock).mockResolvedValueOnce(dto);
    (notificationRepository.updatePreferences as jest.Mock).mockResolvedValueOnce(dto);

    expect(await service.getPreferences(identity)).toEqual(expect.objectContaining({
      tenantId: 'tenant-a', staffId: 'user-a', cancellationsNoShows: true,
    }));
    await service.updatePreferences(identity, { quietHoursEnabled: true });
    expect(notificationRepository.updatePreferences).toHaveBeenCalledWith('tenant-a', {
      quiet_hours_enabled: true,
    });
  });

  it('cleans both remote and local registration and disposes listeners on identity cleanup', async () => {
    const service = new NotificationDeviceLifecycleService();
    await service.initialize(identity, jest.fn(), jest.fn());

    await service.cleanupForIdentity(identity);

    expect(disposeReceived).toHaveBeenCalledTimes(1);
    expect(disposeResponse).toHaveBeenCalledTimes(1);
    expect(mockUnregisterRemoteDevice).toHaveBeenCalledWith('tenant-a', 'ExponentPushToken[token-a]');
    expect(mockUnregisterDevice).toHaveBeenCalledWith('ExponentPushToken[token-a]', 'user-a');
  });

  it('still cleans local registration when remote unregister is unavailable', async () => {
    const service = new NotificationDeviceLifecycleService();
    mockUnregisterRemoteDevice.mockRejectedValueOnce(new Error('network unavailable'));
    await service.initialize(identity, jest.fn(), jest.fn());

    await service.cleanupForIdentity(identity);

    expect(mockUnregisterDevice).toHaveBeenCalledWith('ExponentPushToken[token-a]', 'user-a');
  });

  it('shares in-flight cleanup so logout and unauthenticated observation cannot duplicate unregister work', async () => {
    const service = new NotificationDeviceLifecycleService();
    await service.initialize(identity, jest.fn(), jest.fn());
    let releaseRemote!: () => void;
    mockUnregisterRemoteDevice.mockImplementationOnce(
      () => new Promise<void>(resolve => { releaseRemote = resolve; })
    );

    const first = service.cleanupForIdentity(identity);
    const second = service.cleanupForIdentity(identity);
    expect(mockUnregisterRemoteDevice).toHaveBeenCalledTimes(1);
    expect(mockUnregisterDevice).toHaveBeenCalledTimes(1);

    releaseRemote();
    await first;
    await second;
  });
});
