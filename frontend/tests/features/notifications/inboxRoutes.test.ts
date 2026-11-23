import { getInboxNotificationRoute } from '../../../features/notifications/presentation/utils/inboxRoutes';

const SHEET = 'sheet-1';
const ITEM = 'item-1';
const note = (notification_type: string, data: Record<string, unknown> = {}) => ({ notification_type, data });
const plan = { treatment_sheet_id: SHEET };

describe('tapping an inbox notification opens the related item (DEF_COP_066)', () => {
  it.each([['receptionist'], ['front_desk_employee'], ['clinic_admin']])('%s: a newly ordered plan opens its scheduling screen', (role) => {
    expect(getInboxNotificationRoute(note('treatment_plan_ordered', plan), [role])).toBe(`/clinic-admin/treatment-sheets/${SHEET}/schedule`);
  });

  it('the front desk opens the plan itself for the plan and session updates', () => {
    for (const kind of ['treatment_plan_scheduled', 'treatment_session_completed', 'treatment_plan_completed']) {
      expect(getInboxNotificationRoute(note(kind, plan), ['receptionist'])).toBe(`/clinic-admin/treatment-sheets/${SHEET}`);
    }
  });

  it('the doctor opens the plan for every plan notification', () => {
    for (const kind of ['treatment_plan_ordered', 'treatment_plan_scheduled', 'treatment_session_completed', 'treatment_plan_completed']) {
      expect(getInboxNotificationRoute(note(kind, plan), ['doctor'])).toBe(`/clinic-admin/treatment-sheets/${SHEET}`);
    }
  });

  it('the therapist opens their own day', () => {
    expect(getInboxNotificationRoute(note('treatment_plan_scheduled', plan), ['therapist'])).toBe('/therapist');
    expect(getInboxNotificationRoute(note('treatment_session_completed', { ...plan, row_id: 'r1' }), ['therapist'])).toBe('/therapist');
  });

  it('the clinic owner and admin open the inventory item for a stock alert', () => {
    for (const kind of ['stock_low', 'stock_out']) {
      for (const role of ['clinic_owner', 'clinic_admin']) {
        expect(getInboxNotificationRoute(note(kind, { inventory_item_id: ITEM }), [role])).toBe(`/clinic-admin/inventory/${ITEM}`);
      }
    }
  });

  it('role names are matched however the backend spells them', () => {
    expect(getInboxNotificationRoute(note('treatment_plan_ordered', plan), ['Front Desk Employee'])).toBe(`/clinic-admin/treatment-sheets/${SHEET}/schedule`);
  });

  it('someone who is both a doctor and front desk gets the target of the notification they were sent', () => {
    expect(getInboxNotificationRoute(note('treatment_plan_ordered', plan), ['doctor', 'clinic_admin'])).toBe(`/clinic-admin/treatment-sheets/${SHEET}/schedule`);
    expect(getInboxNotificationRoute(note('treatment_plan_scheduled', plan), ['doctor', 'therapist'])).toBe(`/clinic-admin/treatment-sheets/${SHEET}`);
  });

  it('stays in the inbox when the item is not identified or the type is not known', () => {
    expect(getInboxNotificationRoute(note('treatment_plan_ordered', {}), ['receptionist'])).toBeNull();
    expect(getInboxNotificationRoute(note('stock_low', {}), ['clinic_admin'])).toBeNull();
    expect(getInboxNotificationRoute(note('something_else', plan), ['doctor'])).toBeNull();
    expect(getInboxNotificationRoute({ notification_type: 'treatment_plan_ordered' }, ['doctor'])).toBeNull();
  });
});
