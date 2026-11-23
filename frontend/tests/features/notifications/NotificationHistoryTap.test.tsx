import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NotificationHistoryScreen } from '../../../features/notifications/presentation/pages/NotificationHistoryScreen';

const mockPush = jest.fn();
const mockMarkRead = jest.fn();
let mockRoles: string[] = ['receptionist'];
let mockItems: any[] = [];

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 't1', roles: mockRoles } }),
}));
jest.mock('../../../features/notifications/data/repositories/push-notifications.repository.impl', () => ({
  useNotificationHistory: () => ({ data: { items: mockItems, total: mockItems.length, unread_count: 0, has_next: false }, isLoading: false, isFetching: false, refetch: jest.fn(), error: null }),
  useMarkNotificationReadMutation: () => ({ mutate: mockMarkRead }),
  useMarkAllNotificationsReadMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteNotificationMutation: () => ({ mutate: jest.fn() }),
}));

const entry = (over: Record<string, unknown>) => ({
  id: 'n1', tenant_id: 't1', user_id: 'u1', title: 'Treatment plan ordered', body: 'Maya: the doctor has ordered a treatment plan.',
  notification_type: 'treatment_plan_ordered', data: { treatment_sheet_id: 'sheet-1' }, is_read: false, read_at: null,
  created_at: new Date().toISOString(), ...over,
});

describe('tapping an inbox notification', () => {
  beforeEach(() => { mockPush.mockClear(); mockMarkRead.mockClear(); });

  it('marks it read and opens the item for the front desk, not just the inbox', () => {
    mockRoles = ['receptionist']; mockItems = [entry({})];
    const view = render(<NotificationHistoryScreen />);
    fireEvent.press(view.getByText('Treatment plan ordered'));
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/treatment-sheets/sheet-1/schedule');
  });

  it('opens the plan for the doctor', () => {
    mockRoles = ['doctor']; mockItems = [entry({})];
    const view = render(<NotificationHistoryScreen />);
    fireEvent.press(view.getByText('Treatment plan ordered'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/treatment-sheets/sheet-1');
  });

  it('a notification that carries its own link still uses it', () => {
    mockRoles = ['doctor']; mockItems = [entry({ deep_link: '/somewhere/else' })];
    const view = render(<NotificationHistoryScreen />);
    fireEvent.press(view.getByText('Treatment plan ordered'));
    expect(mockPush).toHaveBeenCalledWith('/somewhere/else');
  });

  it('stays on the inbox when the item is not identified', () => {
    mockRoles = ['doctor']; mockItems = [entry({ data: {} })];
    const view = render(<NotificationHistoryScreen />);
    fireEvent.press(view.getByText('Treatment plan ordered'));
    expect(mockMarkRead).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
