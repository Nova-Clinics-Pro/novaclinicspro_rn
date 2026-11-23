/**
 * Where tapping an inbox notification goes (DEF_COP_066).
 *
 * The clinic's inbox entries (plans ordered, scheduled and completed, sessions completed, stock alerts) carry the ids of the
 * item they are about. The right screen depends on who is looking: the front desk schedules a new plan, the doctor reads it,
 * the therapist goes to their day, the owner and admin open the stock item. Returns null when the item is not identified or
 * the type is not an inbox type, so the caller stays in the inbox.
 */

type InboxItem = { notification_type: string; data?: Record<string, unknown> };

const FRONT_DESK_ROLES: ReadonlySet<string> = new Set(['receptionist', 'front_desk_employee', 'clinic_admin']);

const roleCode = (role: string): string => role.trim().toLowerCase().replace(/[\s-]+/g, '_');

const idOf = (data: Record<string, unknown> | undefined, key: string): string | null => {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export const getInboxNotificationRoute = (item: InboxItem, roles: readonly string[]): string | null => {
  const codes = roles.map(roleCode);
  const isFrontDesk = codes.some((code) => FRONT_DESK_ROLES.has(code));
  const isTherapistOnly = codes.includes('therapist') && !codes.includes('doctor') && !isFrontDesk;

  switch (item.notification_type) {
    case 'treatment_plan_ordered': {
      const sheetId = idOf(item.data, 'treatment_sheet_id');
      if (!sheetId) return null;
      return isFrontDesk ? `/clinic-admin/treatment-sheets/${sheetId}/schedule` : `/clinic-admin/treatment-sheets/${sheetId}`;
    }
    case 'treatment_plan_scheduled':
    case 'treatment_session_completed':
    case 'treatment_plan_completed': {
      if (!idOf(item.data, 'treatment_sheet_id')) return null;
      if (isTherapistOnly) return '/therapist';
      return `/clinic-admin/treatment-sheets/${idOf(item.data, 'treatment_sheet_id')}`;
    }
    case 'stock_low':
    case 'stock_out': {
      const itemId = idOf(item.data, 'inventory_item_id');
      return itemId ? `/clinic-admin/inventory/${itemId}` : null;
    }
    default:
      return null;
  }
};
