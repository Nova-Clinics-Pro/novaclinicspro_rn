import fs from 'fs';
import path from 'path';

const hookPath = path.resolve(
  __dirname,
  '../../../features/notifications/presentation/hooks/usePushNotifications.ts'
);

describe('usePushNotifications presentation boundary', () => {
  it('delegates device lifecycle and notification transport to the application service', () => {
    const source = fs.readFileSync(hookPath, 'utf8');

    expect(source).toContain('notificationDeviceLifecycleService');
    expect(source).not.toContain('expo-push.service');
    expect(source).not.toContain('push-notifications.api');
    expect(source).not.toContain('registerDeviceApi');
    expect(source).not.toContain('unregisterDeviceApi');
  });
});
