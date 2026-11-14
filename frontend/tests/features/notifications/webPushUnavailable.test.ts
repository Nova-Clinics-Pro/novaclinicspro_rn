import { webPushUnavailable } from '../../../features/notifications/data/datasources/expo-push.service';

describe('web push token', () => {
  it('is skipped on the web when no VAPID key is configured (it used to throw on every load)', () => {
    expect(webPushUnavailable('web', undefined)).toBe(true);
    expect(webPushUnavailable('web', {})).toBe(true);
    expect(webPushUnavailable('web', { vapidPublicKey: '' })).toBe(true);
  });

  it('is requested on the web once a VAPID key is configured', () => {
    expect(webPushUnavailable('web', { vapidPublicKey: 'BKey' })).toBe(false);
  });

  it('never affects the native platforms', () => {
    expect(webPushUnavailable('android', undefined)).toBe(false);
    expect(webPushUnavailable('ios', undefined)).toBe(false);
  });
});
