import { getNotificationHistoryApi } from '../../../features/notifications/data/datasources/push-notifications.api';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn() } }));
const get = axiosClient.get as jest.Mock;

const serverEntry = (over: Record<string, unknown> = {}) => ({
  id: 'n1', notification_type: 'treatment_plan_ordered', title: 'Treatment plan ordered', body: 'Maya: the doctor has ordered a plan.',
  data: { treatment_sheet_id: 'sheet-1' }, status: 'SENT', sent_at: '2026-11-23T10:00:00Z', read_at: null, created_at: '2026-11-23T10:00:00Z', ...over,
});
const page = (notifications: unknown[], extra: Record<string, unknown> = {}) => ({ data: { notifications, total: notifications.length, limit: 20, offset: 0, has_more: false, ...extra } });

describe('the inbox, as the server describes it (DEF_COP_066: the screen showed No Notifications)', () => {
  beforeEach(() => get.mockReset());

  it('reads the server\'s own shape and gives the screen the entries it expects', async () => {
    get.mockResolvedValueOnce(page([serverEntry(), serverEntry({ id: 'n2', read_at: '2026-11-23T11:00:00Z' })], { total: 99, has_more: true }));
    get.mockResolvedValueOnce(page([], { total: 41 }));
    const history = await getNotificationHistoryApi('t1', { page: 1, page_size: 20 });
    expect(history.items.map((item) => item.id)).toEqual(['n1', 'n2']);
    expect(history.items[0]).toMatchObject({ notification_type: 'treatment_plan_ordered', title: 'Treatment plan ordered', is_read: false, data: { treatment_sheet_id: 'sheet-1' }, created_at: '2026-11-23T10:00:00Z' });
    expect(history.items[1].is_read).toBe(true);
    expect(history).toMatchObject({ total: 99, page: 1, page_size: 20, has_next: true, has_prev: false, unread_count: 41 });
  });

  it('turns a page number into the server\'s limit and offset, and counts the unread ones with the server', async () => {
    get.mockResolvedValue(page([]));
    await getNotificationHistoryApi('t1', { page: 3, page_size: 20 });
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/notifications/t1/history', { params: { limit: 20, offset: 40 } });
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/notifications/t1/history', { params: { limit: 1, offset: 0, is_read: false } });
    const later = await getNotificationHistoryApi('t1', { page: 3, page_size: 20 });
    expect(later.has_prev).toBe(true);
  });

  it('asks for unread entries only when the screen does, and never for more than the server allows', async () => {
    get.mockResolvedValue(page([], { total: 7 }));
    const unread = await getNotificationHistoryApi('t1', { unread_only: true, notification_type: 'stock_low', page_size: 500 });
    expect(get).toHaveBeenCalledWith('/api/v1/notifications/t1/history', { params: { limit: 100, offset: 0, is_read: false, notification_type: 'stock_low' } });
    expect(unread.unread_count).toBe(7);
  });

  it('works with no options at all', async () => {
    get.mockResolvedValue(page([serverEntry()]));
    const history = await getNotificationHistoryApi('t1');
    expect(history.items).toHaveLength(1);
    expect(get.mock.calls[0][1].params).toEqual({ limit: 20, offset: 0 });
  });
});
