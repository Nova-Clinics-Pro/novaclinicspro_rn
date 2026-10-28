import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as theme from '../../../core/theme/useClinicTheme';
import type { ClinicType } from '../../../core/theme/clinicThemes';
import { OperatingHoursScreen } from '../../../features/operatingHours/presentation/pages/OperatingHoursScreen';
import { AppointmentRulesScreen } from '../../../features/appointmentRules/presentation/pages/AppointmentRulesScreen';
import { RoomsScreen } from '../../../features/rooms/presentation/pages/RoomsScreen';
import { TemplatesScreen } from '../../../features/templates/presentation/pages/TemplatesScreen';
import { TreatmentsScreen } from '../../../features/treatments/presentation/pages/TreatmentsScreen';
import TreatmentDetailScreen from '../../../app/clinic-admin/settings/treatments/[treatmentId]';

const mockWrite = jest.fn();
const mockRefetch = jest.fn();
const treatment = { id: 'treatment-a', name: 'Test treatment', code: 'TEST', is_active: true,
  duration_minutes: 30, price: 100, description: 'Treatment description' };
const room = { id: 'room-a', name: 'Test room', capacity: 2, room_type: 'therapy', is_active: true };
const rule = { id: 'rule-a', rule_code: 'slot_duration', is_override_active: false,
  effective_config: { value: 30 }, org_default_config: { value: 30 } };
const template = { id: 'template-a', name: 'Test template', template_type: 'casesheet', variables: [] };
const mockQuery = (items: unknown[]) => ({ data: { items, total: items.length },
  isLoading: false, isError: false, isRefetching: false, refetch: mockRefetch });
const mockMutation = () => ({ mutateAsync: mockWrite, isPending: false });

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ treatmentId: 'treatment-a' }),
}));
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({ currentUser: { tenantId: 'tenant-a' } }),
}));
jest.mock('../../../features/operatingHours/data/repositories/operatingHours.repository.impl', () => ({
  useOperatingHoursListQuery: () => mockQuery([]),
  useCreateOperatingHourMutation: () => mockMutation(),
  useUpdateOperatingHourMutation: () => mockMutation(),
  useDeleteOperatingHourMutation: () => mockMutation(),
}));
jest.mock('../../../features/appointmentRules/data/repositories/appointmentRules.repository.impl', () => ({
  useAppointmentRulesListQuery: () => mockQuery([rule]),
  useUpsertAppointmentRuleMutation: () => mockMutation(),
  useDeleteAppointmentRuleOverrideMutation: () => mockMutation(),
}));
jest.mock('../../../features/rooms/data/repositories/rooms.repository.impl', () => ({
  useRoomsListQuery: () => mockQuery([room]),
  useCreateRoomMutation: () => mockMutation(),
}));
jest.mock('../../../features/templates/data/repositories/templates.repository.impl', () => ({
  useTemplatesListQuery: () => mockQuery([template]),
  useDeleteTemplateMutation: () => mockMutation(),
}));
jest.mock('../../../features/treatments/data/repositories/treatments.repository.impl', () => ({
  useTreatmentsListQuery: () => mockQuery([treatment]),
  useSearchTreatmentsQuery: () => mockQuery([treatment]),
  useDeleteTreatmentMutation: () => mockMutation(),
  useTreatmentDetailQuery: () => ({ data: treatment, isLoading: false, isError: false }),
  useUpdateTreatmentMutation: () => mockMutation(),
}));
jest.mock('../../../features/tenants/data/repositories/tenants.repository.impl', () => ({
  useCurrentTenantQuery: () => ({ data: undefined }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({}), isAyurvedaClinic: () => false,
}));
jest.mock('../../../core/hooks/useDebounce', () => ({ useDebounce: (value: string) => value }));
jest.mock('../../../features/capabilities/presentation/components/MultiDayAppointmentsSetting', () => ({
  MultiDayAppointmentsSetting: () => null,
}));
jest.mock('../../../features/treatments/presentation/components/TreatmentForm', () => ({ TreatmentForm: () => null }));
jest.mock('../../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));

type Screen = ReturnType<typeof render>;
const text = (screen: Screen, value: string) => screen.getByText(value, { includeHiddenElements: true });
const nearestSurface = (element: ReturnType<Screen['getByText']>) => {
  let parent = element.parent;
  while (parent) {
    const color = StyleSheet.flatten(parent.props.style)?.backgroundColor;
    if (color !== undefined) return color;
    parent = parent.parent;
  }
  throw new Error('Missing enclosing surface');
};
const expectSurface = (screen: Screen, label: string, color: string) =>
  expect(nearestSurface(text(screen, label))).toBe(color);

const cases = [
  { name: 'Operating Hours', Component: OperatingHoursScreen,
    open: (screen: Screen) => fireEvent.press(screen.getByLabelText('Edit Monday hours')),
    check: (screen: Screen, normal: string, elevated: string) => {
      expectSurface(screen, 'Configured', normal); // summaryCard
      expectSurface(screen, 'Tuesday', normal); // dayCard
      expectSurface(screen, '09:00', normal); // TimeInput input
      expectSurface(screen, 'Clinic Open', elevated); // modalContent
    } },
  { name: 'Appointment Rules', Component: AppointmentRulesScreen,
    open: (screen: Screen) => fireEvent.press(text(screen, 'Slot Duration')),
    check: (screen: Screen, normal: string, elevated: string) => {
      const labels = screen.getAllByText('Slot Duration', { includeHiddenElements: true });
      expect(labels.map(nearestSurface)).toEqual([normal, elevated]);
    } },
  { name: 'Rooms', Component: RoomsScreen,
    open: (screen: Screen) => fireEvent.press(screen.getByLabelText('Add new room')),
    check: (screen: Screen, normal: string, elevated: string) => {
      expectSurface(screen, 'Test room', normal); // roomCard
      expectSurface(screen, 'Inactive', normal); // unselected statBadge
      expectSurface(screen, 'Active', '#10B98120'); // selected status override is retained
      expectSurface(screen, 'Add New Room', elevated); // modalContainer
    } },
  { name: 'Templates', Component: TemplatesScreen, open: (_screen: Screen) => {},
    check: (screen: Screen, normal: string) => {
      // The selected tab retains its brand fill; the enclosing strip owns the surface.
      const tab = text(screen, 'All');
      expect(nearestSurface(tab)).toBe('#2F6F4E');
      let strip = tab.parent;
      while (strip && StyleSheet.flatten(strip.props.style)?.maxHeight !== 52) strip = strip.parent;
      expect(StyleSheet.flatten(strip?.props.style)?.backgroundColor).toBe(normal); // tabsContainer
      expectSurface(screen, 'Test template', normal); // templateCard
    } },
  { name: 'Treatments', Component: TreatmentsScreen, open: (_screen: Screen) => {},
    check: (screen: Screen, normal: string) => {
      const input = screen.getByPlaceholderText('Search treatments... (min 3 chars)');
      expect(nearestSurface(input)).toBe(normal); // searchContainer
      expectSurface(screen, 'Inactive', normal); // unselected statCard
      expectSurface(screen, 'Active', '#10B98120'); // selected status override is retained
      expectSurface(screen, 'Test treatment', normal); // treatmentCard
    } },
  { name: 'Treatment Detail', Component: TreatmentDetailScreen, open: (_screen: Screen) => {},
    check: (screen: Screen, normal: string) => {
      expectSurface(screen, 'Active', normal); // statusCard
      expectSurface(screen, 'Overview', normal); // section
      expectSurface(screen, 'Description', normal); // reused section
    } },
];
const clinics: ClinicType[] = ['AYURVEDA', 'GENERAL_MEDICINE', 'DENTAL', 'PHYSIOTHERAPY'];
beforeEach(() => {
  jest.clearAllMocks();
  mockWrite.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe.each(cases)('$name bounded semantic surfaces', ({ Component, open, check }) => {
  it.each(clinics)('retains existing white surfaces for %s', (clinic) => {
    const colors = theme.getTheme(clinic).colors;
    expect(colors.surface.default).toBe('#FFFFFF');
    expect(colors.surface.elevated).toBe('#FFFFFF');
    const screen = render(<theme.ThemeProvider clinicType={clinic}><Component /></theme.ThemeProvider>);
    open(screen);
    check(screen, colors.surface.default, colors.surface.elevated);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('propagates distinct surface roles on rerender without losing local input', () => {
    const original = theme.getTheme('AYURVEDA');
    const first = { ...original, colors: { ...original.colors,
      surface: { ...original.colors.surface, default: '#123456', elevated: '#ABCDEF' } } };
    const hook = jest.spyOn(theme, 'useClinicTheme').mockReturnValue(first);
    const screen = render(<Component />);
    open(screen);
    // Retain existing local form/search state while theme colors change.
    if (Component === RoomsScreen) fireEvent.changeText(screen.getByPlaceholderText('e.g., Therapy Room 1'), 'Unsaved room');
    if (Component === TreatmentsScreen) fireEvent.changeText(screen.getByPlaceholderText('Search treatments... (min 3 chars)'), 'T');
    check(screen, '#123456', '#ABCDEF');
    hook.mockReturnValue({ ...first, colors: { ...first.colors,
      surface: { ...first.colors.surface, default: '#654321', elevated: '#FEDCBA' } } });
    screen.rerender(<Component />);
    check(screen, '#654321', '#FEDCBA');
    if (Component === RoomsScreen) expect(screen.getByDisplayValue('Unsaved room')).toBeTruthy();
    if (Component === TreatmentsScreen) expect(screen.getByDisplayValue('T')).toBeTruthy();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

it('updates the Operating Hours applying surface while an existing operation is pending', async () => {
  let finish: () => void = () => {};
  mockWrite.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const original = theme.getTheme('AYURVEDA');
  const hook = jest.spyOn(theme, 'useClinicTheme').mockReturnValue({ ...original, colors: {
    ...original.colors, surface: { ...original.colors.surface, elevated: '#ABCDEF' } } });
  const screen = render(<OperatingHoursScreen />);
  fireEvent.press(screen.getByLabelText('Edit Monday hours'));
  fireEvent.press(text(screen, 'Apply to All Days'));
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  act(() => buttons?.find((button) => button.text === 'Apply')?.onPress?.());
  expectSurface(screen, 'Applying to all days...', '#ABCDEF');
  hook.mockReturnValue({ ...original, colors: { ...original.colors,
    surface: { ...original.colors.surface, elevated: '#FEDCBA' } } });
  screen.rerender(<OperatingHoursScreen />);
  expectSurface(screen, 'Applying to all days...', '#FEDCBA');
  expect(mockWrite).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(mockWrite).toHaveBeenCalledTimes(7);
  expect(mockWrite.mock.calls.map(([payload]) => payload)).toEqual(
    Array.from({ length: 7 }, (_, day) => ({ day_of_week: day, is_open: true,
      open_time: '09:00:00', close_time: '18:00:00', break_start: null, break_end: null, status: 'active' })),
  );
  expect(screen.queryByText('Applying to all days...')).toBeNull();
});
