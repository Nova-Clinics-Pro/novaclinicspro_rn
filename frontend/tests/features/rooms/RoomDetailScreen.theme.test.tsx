import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import RoomDetailScreen from '../../../app/clinic-admin/settings/rooms/[roomId]';
import * as theme from '../../../core/theme/useClinicTheme';
import { changeLanguage } from '../../../core/localization/i18n';
import hiIN from '../../../core/localization/translations/hi-IN.json';
import type { ClinicType } from '../../../core/theme/clinicThemes';

const mockQuery = jest.fn();
const mockMutation = jest.fn();
const mockBack = jest.fn();
const mockMutateAsync = jest.fn();
const room = { id: 'room-a', name: 'Room A', capacity: 2, room_type: 'therapy', is_active: true };

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ roomId: 'room-a' }),
}));
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({ currentUser: { tenantId: 'tenant-a' } }),
}));
jest.mock('../../../features/rooms/data/repositories/rooms.repository.impl', () => ({
  useRoomDetailQuery: (...args: unknown[]) => mockQuery(...args),
  useUpdateRoomMutation: (...args: unknown[]) => mockMutation(...args),
}));
jest.mock('../../../core/components/DashboardHeader', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text, Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    DashboardHeader: ({ title, onBackPress }: { title: string; onBackPress: () => void }) =>
      React.createElement(View, null,
        React.createElement(Text, null, title),
        React.createElement(Pressable, { testID: 'header-back', onPress: onBackPress })),
  };
});
jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: name }, name) };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));

beforeEach(async () => {
  await changeLanguage('en-US');
  jest.clearAllMocks();
  mockQuery.mockReturnValue({ data: room, isLoading: false, isError: false });
  mockMutation.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  mockMutateAsync.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await changeLanguage('en-US'); jest.restoreAllMocks(); });

const screenFor = (clinicType: ClinicType) => (
  <theme.ThemeProvider clinicType={clinicType}><RoomDetailScreen /></theme.ThemeProvider>
);

const nearestSurfaceColor = (element: ReturnType<ReturnType<typeof render>['getByText']>) => {
  let parent = element.parent;
  while (parent) {
    const style = StyleSheet.flatten(parent.props.style);
    if (style?.backgroundColor !== undefined) return style.backgroundColor;
    parent = parent.parent;
  }
  throw new Error('Expected an enclosing card surface');
};

const expectSurfaces = (screen: ReturnType<typeof render>, color: string) => {
  expect(nearestSurfaceColor(screen.getByText('Active'))).toBe(color);
  expect(nearestSurfaceColor(screen.getByText('Room Name'))).toBe(color);
};

describe('Room Detail approved semantic roles', () => {
  it.each(['AYURVEDA', 'GENERAL_MEDICINE', 'DENTAL', 'PHYSIOTHERAPY'] as ClinicType[])(
    'preserves the three approved visual values for %s',
    (clinicType) => {
      const colors = theme.getTheme(clinicType).colors;
      const screen = render(screenFor(clinicType));
      expectSurfaces(screen, colors.surface.default);
      fireEvent.press(screen.getByTestId('pencil'));
      expect(StyleSheet.flatten(screen.getByText('Save Changes').props.style).color).toBe(colors.text.onPrimary);
      expect(colors.surface.default).toBe('#FFFFFF');
      expect(colors.text.onPrimary).toBe('#FFFFFF');
      expect(mockQuery).toHaveBeenCalledWith('tenant-a', 'room-a', { enabled: true });
      expect(mockMutation).toHaveBeenCalledWith('tenant-a', 'room-a');
      expect(mockMutateAsync).not.toHaveBeenCalled();
    },
  );

  it('updates only the approved styles when theme values change during editing', () => {
    const original = theme.getTheme('AYURVEDA');
    const first = {
      ...original,
      colors: { ...original.colors, surface: { ...original.colors.surface, default: '#123456' },
        text: { ...original.colors.text, onPrimary: '#ABCDEF' } },
    };
    const hook = jest.spyOn(theme, 'useClinicTheme').mockReturnValue(first);
    const screen = render(<RoomDetailScreen />);
    fireEvent.press(screen.getByTestId('pencil'));
    fireEvent.changeText(screen.getByPlaceholderText('Room name'), 'Unsaved room name');
    expectSurfaces(screen, '#123456');
    expect(StyleSheet.flatten(screen.getByText('Save Changes').props.style).color).toBe('#ABCDEF');

    hook.mockReturnValue({ ...first, colors: { ...first.colors,
      surface: { ...first.colors.surface, default: '#654321' },
      text: { ...first.colors.text, onPrimary: '#FEDCBA' } } });
    screen.rerender(<RoomDetailScreen />);
    expectSurfaces(screen, '#654321');
    expect(StyleSheet.flatten(screen.getByText('Save Changes').props.style).color).toBe('#FEDCBA');
    expect(screen.getByDisplayValue('Unsaved room name')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('preserves validation, save payload and back navigation', async () => {
    const screen = render(screenFor('AYURVEDA'));
    fireEvent.press(screen.getByTestId('pencil'));
    fireEvent.changeText(screen.getByPlaceholderText('Room name'), '   ');
    fireEvent.press(screen.getByText('Save Changes'));
    expect(Alert.alert).toHaveBeenCalledWith('Validation Error', 'Room name is required');
    expect(mockMutateAsync).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByPlaceholderText('Room name'), '  Updated Room  ');
    fireEvent.changeText(screen.getByPlaceholderText('1'), '3');
    fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({
      name: 'Updated Room', capacity: 3, room_type: 'therapy',
    }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Success', 'Room updated successfully'));
    fireEvent.press(screen.getByTestId('header-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('preserves active-status mutation ownership', async () => {
    const screen = render(screenFor('DENTAL'));
    fireEvent.press(screen.getByText('Deactivate'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledWith({ is_active: false }));
  });

  it('retains loading and error branches when query state changes', () => {
    mockQuery.mockReturnValue({ isLoading: true, isError: false });
    const screen = render(screenFor('GENERAL_MEDICINE'));
    expect(screen.getByText('Loading room details...')).toBeTruthy();
    mockQuery.mockReturnValue({ isLoading: false, isError: true });
    screen.rerender(screenFor('GENERAL_MEDICINE'));
    expect(screen.getByText('Failed to load room')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});

it('uses existing Hindi status and cancel copy while retaining the room edit and accessible back action', async () => {
  const screen = render(screenFor('AYURVEDA'));
  fireEvent.press(screen.getByTestId('pencil'));
  fireEvent.changeText(screen.getByPlaceholderText('Room name'), 'Unsaved Hindi-session edit');
  await act(async () => { await changeLanguage('hi-IN'); });
  screen.rerender(screenFor('AYURVEDA'));
  expect(screen.getByText(hiIN.common.active)).toBeTruthy();
  expect(screen.getByText(hiIN.common.cancel)).toBeTruthy();
  expect(screen.getByDisplayValue('Unsaved Hindi-session edit')).toBeTruthy();
  expect(screen.getByTestId('header-back')).toBeTruthy();
  expect(mockMutateAsync).not.toHaveBeenCalled();
});
