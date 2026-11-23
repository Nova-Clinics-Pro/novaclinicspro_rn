/** The icon shown beside a notification in the inbox, by its type code (the type the server stored with it). */
export const NOTIFICATION_ICONS: Record<string, string> = {
  appointment_new: 'calendar',
  appointment_updated: 'calendar-outline',
  appointment_cancelled: 'calendar-clear',
  appointment_no_show: 'person-remove',
  schedule_summary: 'today',
  critical_update: 'warning',
  leave_approved: 'checkmark-circle',
  leave_rejected: 'close-circle',
  // the clinic's treatment plans and stock
  treatment_plan_ordered: 'clipboard',
  treatment_plan_scheduled: 'calendar-number',
  treatment_session_completed: 'checkmark-done',
  treatment_plan_completed: 'ribbon',
  stock_low: 'alert-circle',
  stock_out: 'alert-circle',
};

export const DEFAULT_NOTIFICATION_ICON = 'notifications';

export const getNotificationIcon = (type: string): string => NOTIFICATION_ICONS[type] ?? DEFAULT_NOTIFICATION_ICON;
