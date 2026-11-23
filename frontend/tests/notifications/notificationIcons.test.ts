import { DEFAULT_NOTIFICATION_ICON, getNotificationIcon } from '../../features/notifications/presentation/utils/notificationIcons';

describe('notification icons', () => {
  it.each([
    ['treatment_plan_ordered', 'clipboard'],
    ['treatment_plan_scheduled', 'calendar-number'],
    ['treatment_session_completed', 'checkmark-done'],
    ['treatment_plan_completed', 'ribbon'],
    ['stock_low', 'alert-circle'],
    ['stock_out', 'alert-circle'],
    ['appointment_new', 'calendar'],
  ])('%s shows %s', (type, icon) => {
    expect(getNotificationIcon(type)).toBe(icon);
  });

  it('falls back to the bell for a type it does not know', () => {
    expect(getNotificationIcon('something_new')).toBe(DEFAULT_NOTIFICATION_ICON);
  });
});
