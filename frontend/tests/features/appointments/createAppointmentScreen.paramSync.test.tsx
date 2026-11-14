/**
 * CreateAppointmentScreen — route-param / query synchronization regression tests.
 *
 * Covers the render-phase state adjustments that replaced effects (lint remediation,
 * react-hooks/set-state-in-effect): route params → selected client, ordering-doctor query → multi-day doctor,
 * sheet params → MULTI type, treatment-sheet prefill → multi-day form + client, and the MULTI/THERAPY
 * availability fallbacks.
 *
 * The data layer is mocked; the screen and its selection controls are real, and assertions use what a
 * user sees (dropdown values, the checked appointment-type radio, the session counter).
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CreateAppointmentScreen } from '../../../features/appointments/presentation/pages/CreateAppointmentScreen';

const mockParams: Record<string, string | undefined> = {};
const mockData = {
  treatments: [] as any[],
  orderingDoctor: undefined as string | undefined,
  prefill: undefined as any,
};

const TREATMENTS = [
  { id: 'tr1', code: 'PK', category_code: 'PK', name: 'Panchakarma', duration_minutes: 60 },
  { id: 'tr2', code: 'AB', category_code: 'PK', name: 'Abhyanga', duration_minutes: 45 },
];
const CLIENTS = [
  { id: 'c1', full_name: 'Asha Rao', phone: '111' },
  { id: 'c2', full_name: 'Ravi Kumar', phone: '222' },
];
const DOCTORS = [
  { id: 'd1', full_name: 'Dr Alpha', staff_type: 'doctor' },
  { id: 'd2', full_name: 'Dr Beta', staff_type: 'doctor' },
  { id: 'd3', full_name: 'Dr Gamma', staff_type: 'doctor' },
];
const MULTIDAY_TYPES = ['PK'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('../../../core/components/CrossPlatformDateTimePicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 't1', userId: 'u1', roles: ['Clinic Admin'] } }),
}));
jest.mock('../../../core/hooks/useFeatures', () => {
  const features = {
    appointments: { allow_multiday: true, multiday_appointment_types: MULTIDAY_TYPES },
    treatment_sheets: { enable_treatment_sheets: true },
  };
  return { useFeatures: () => features };
});
jest.mock('../../../features/clients/data/repositories/clients.repository.impl', () => ({
  useClientsListQuery: () => ({ data: { items: CLIENTS }, isLoading: false }),
  useSearchClientsQuery: () => ({ data: undefined, isLoading: false }),
  useCreateClientMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('../../../features/treatments/data/repositories/treatments.repository.impl', () => ({
  useTreatmentsListQuery: () => ({ data: { items: mockData.treatments }, isLoading: false }),
}));
jest.mock('../../../features/staff/data/repositories/staff.repository.impl', () => ({
  useStaffListQuery: () => ({ data: { items: DOCTORS }, isLoading: false, isFetched: true }),
}));
jest.mock('../../../features/rooms/data/repositories/rooms.repository.impl', () => ({
  useRoomsListQuery: () => ({ data: { items: [] }, isLoading: false }),
}));
jest.mock('../../../features/operatingHours/data/repositories/operatingHours.repository.impl', () => ({
  useOperatingHoursListQuery: () => ({ data: { items: [] } }),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useCreateAppointmentMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useAppointmentsByDateQuery: () => ({ data: undefined, isLoading: false }),
  useValidateAppointmentMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  AppointmentCreationError: class AppointmentCreationError extends Error {},
}));
jest.mock('../../../features/appointments/data/repositories/orderingDoctor.repository.impl', () => ({
  useOrderingDoctorQuery: () => ({ data: mockData.orderingDoctor }),
  useTreatmentSheetPrefillQuery: () => ({ data: mockData.prefill }),
}));


const setParams = (next: Record<string, string | undefined>) => {
  Object.keys(mockParams).forEach(k => delete mockParams[k]);
  Object.assign(mockParams, next);
};

const renderScreen = () => {
  const utils = render(<CreateAppointmentScreen />);
  // Fresh element on each call: an identical element would bail out and never re-read the mocked hooks.
  const refresh = () => utils.rerender(<CreateAppointmentScreen />);
  return { ...utils, refresh };
};

type Screen = ReturnType<typeof renderScreen>;

const dropdownValue = (s: Screen, title: string): string => {
  const node = s.getByLabelText(new RegExp(`^${title}:`));
  return String(node.props.accessibilityLabel).slice(title.length + 2);
};
const pick = (s: Screen, title: string, optionLabel: string) => {
  fireEvent.press(s.getByLabelText(new RegExp(`^${title}:`)));
  fireEvent.press(s.getByLabelText(optionLabel));
};
const isMulti = (s: Screen) => s.queryByLabelText('Decrease sessions') !== null;
const sessions = (s: Screen) => s.getByLabelText(/^\d+ sessions$/).props.accessibilityLabel as string;

beforeEach(() => {
  setParams({});
  mockData.treatments = TREATMENTS;
  mockData.orderingDoctor = undefined;
  mockData.prefill = undefined;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('CreateAppointmentScreen — route params → selected client', () => {
  it('starts with no client selected when there are no params', () => {
    const s = renderScreen();
    expect(dropdownValue(s, 'Select Client')).not.toMatch(/Asha|Ravi|Walk/);
    expect(dropdownValue(s, 'Select Client')).toBe('Select...');
  });

  it('selects the client from params on first render, including a client that is not in the loaded list', () => {
    setParams({ clientId: 'c-ext', clientName: 'Meera Iyer', clientPhone: '999' });
    const s = renderScreen();
    expect(dropdownValue(s, 'Select Client')).toBe('Meera Iyer');
  });

  it('uses the listed client record when the param id is in the list', () => {
    setParams({ clientId: 'c1' });
    const s = renderScreen();
    expect(dropdownValue(s, 'Select Client')).toBe('Asha Rao');
  });

  it('follows a change of route params', () => {
    setParams({ clientId: 'c1' });
    const s = renderScreen();
    setParams({ clientId: 'c2' });
    s.refresh();
    expect(dropdownValue(s, 'Select Client')).toBe('Ravi Kumar');
  });

  it('does not select the param client when a treatment sheet drives the screen (the prefill owns the client)', () => {
    setParams({ clientId: 'c1', treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    expect(dropdownValue(s, 'Select Client')).toBe('Select...');
  });

  it('keeps a client the user picked when the screen re-renders with unchanged params', () => {
    setParams({ clientId: 'c1' });
    const s = renderScreen();
    pick(s, 'Select Client', 'Ravi Kumar');
    expect(dropdownValue(s, 'Select Client')).toBe('Ravi Kumar');
    s.refresh();
    s.refresh();
    expect(dropdownValue(s, 'Select Client')).toBe('Ravi Kumar');
  });

  it('a genuinely new set of params replaces the user pick (params are the source of truth when they change)', () => {
    setParams({ clientId: 'c1' });
    const s = renderScreen();
    pick(s, 'Select Client', 'Ravi Kumar');
    setParams({ clientId: 'c1', clientName: 'Asha Rao', clientPhone: '111' });
    s.refresh();
    expect(dropdownValue(s, 'Select Client')).toBe('Asha Rao');
  });
});

describe('CreateAppointmentScreen — MULTI type from sheet params', () => {
  it('opens in MULTI for a treatment-sheet deep link when multi-day treatments are available', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    expect(isMulti(s)).toBe(true);
    expect(s.getByLabelText('Multi Day therapy series').props.accessibilityState.checked).toBe(true);
  });

  it('stays SINGLE when there is no treatment sheet, or the tab is not MULTI', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'SINGLE' });
    expect(isMulti(renderScreen())).toBe(false);
  });

  it('falls back to SINGLE (and does not loop) when multi-day treatments are not available yet', () => {
    mockData.treatments = [];
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    expect(isMulti(s)).toBe(false);
    expect(s.queryByLabelText('Multi Day therapy series')).toBeNull();
  });

  it('falls back to SINGLE when the available treatments are not multi-day eligible', () => {
    mockData.treatments = [{ id: 'x', code: 'XX', category_code: 'XX', name: 'Other', duration_minutes: 30 }];
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    expect(isMulti(renderScreen())).toBe(false);
  });

  it('a user switch back to SINGLE is not undone by re-renders with unchanged params', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    expect(isMulti(s)).toBe(true);
    fireEvent.press(s.getByLabelText('Single Day appointment'));
    expect(isMulti(s)).toBe(false);
    s.refresh();
    s.refresh();
    expect(isMulti(s)).toBe(false);
  });

  it('a changed sheet id re-applies MULTI after the user had switched away', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    fireEvent.press(s.getByLabelText('Single Day appointment'));
    setParams({ treatmentSheetId: 'sheet-2', tab: 'MULTI' });
    s.refresh();
    expect(isMulti(s)).toBe(true);
  });

  it('a tab change away from MULTI does not force the type back to SINGLE', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    const s = renderScreen();
    setParams({ treatmentSheetId: 'sheet-1', tab: 'OTHER' });
    s.refresh();
    expect(isMulti(s)).toBe(true);
  });
});

describe('CreateAppointmentScreen — ordering doctor → multi-day doctor', () => {
  const openMulti = () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    return renderScreen();
  };

  it('leaves the multi-day doctor empty until the ordering doctor resolves, then fills it', () => {
    const s = openMulti();
    expect(dropdownValue(s, 'Select Doctor')).toBe('Select...');
    mockData.orderingDoctor = 'd1';
    s.refresh();
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Alpha');
  });

  it('preserves a doctor the user chose over the resolved ordering doctor on later re-renders', () => {
    const s = openMulti();
    mockData.orderingDoctor = 'd1';
    s.refresh();
    pick(s, 'Select Doctor', 'Dr Beta');
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Beta');
    s.refresh();
    s.refresh();
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Beta');
  });

  it('does not clobber other multi-day fields when the ordering doctor resolves', () => {
    const s = openMulti();
    fireEvent.press(s.getByLabelText('Increase sessions'));
    expect(sessions(s)).toBe('8 sessions');
    mockData.orderingDoctor = 'd2';
    s.refresh();
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Beta');
    expect(sessions(s)).toBe('8 sessions');
  });

  it('applies a different ordering doctor when the resolved value itself changes', () => {
    const s = openMulti();
    mockData.orderingDoctor = 'd1';
    s.refresh();
    pick(s, 'Select Doctor', 'Dr Beta');
    mockData.orderingDoctor = 'd3';
    s.refresh();
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Gamma');
  });
});

describe('CreateAppointmentScreen — treatment-sheet prefill', () => {
  const PREFILL = {
    selectedDoctorId: 'd1',
    treatmentId: 'tr1',
    numberOfSessions: 5,
    clientId: 'c2',
    clientInfo: { name: 'Ravi Kumar', phone: '222' },
  };
  const openMulti = () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    return renderScreen();
  };

  it('prefills treatment, doctor, session count and client when the prefill is already available on first render', () => {
    mockData.prefill = PREFILL;
    const s = openMulti();
    expect(dropdownValue(s, 'Select Treatment')).toBe('Panchakarma');
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Alpha');
    expect(sessions(s)).toBe('5 sessions');
    expect(dropdownValue(s, 'Select Client')).toBe('Ravi Kumar');
  });

  it('prefills when the data arrives after the first render', () => {
    const s = openMulti();
    expect(sessions(s)).toBe('7 sessions');
    mockData.prefill = PREFILL;
    s.refresh();
    expect(sessions(s)).toBe('5 sessions');
    expect(dropdownValue(s, 'Select Treatment')).toBe('Panchakarma');
    expect(dropdownValue(s, 'Select Client')).toBe('Ravi Kumar');
  });

  it('keeps values the user edited after the prefill when the same prefill is re-read (unchanged data)', () => {
    mockData.prefill = PREFILL;
    const s = openMulti();
    fireEvent.press(s.getByLabelText('Increase sessions'));
    pick(s, 'Select Treatment', 'Abhyanga');
    pick(s, 'Select Doctor', 'Dr Gamma');
    s.refresh();
    s.refresh();
    expect(sessions(s)).toBe('6 sessions');
    expect(dropdownValue(s, 'Select Treatment')).toBe('Abhyanga');
    expect(dropdownValue(s, 'Select Doctor')).toBe('Dr Gamma');
  });

  it('only applies the fields the prefill actually provides (partial prefill leaves the rest alone)', () => {
    const s = openMulti();
    fireEvent.press(s.getByLabelText('Increase sessions'));
    mockData.prefill = { treatmentId: 'tr2' };
    s.refresh();
    expect(dropdownValue(s, 'Select Treatment')).toBe('Abhyanga');
    expect(sessions(s)).toBe('8 sessions');
    expect(dropdownValue(s, 'Select Client')).toBe('Select...');
  });

  it('a refetch that returns different prefill data re-applies it (parity with the previous effect)', () => {
    mockData.prefill = PREFILL;
    const s = openMulti();
    fireEvent.press(s.getByLabelText('Increase sessions'));
    mockData.prefill = { ...PREFILL, numberOfSessions: 9 };
    s.refresh();
    expect(sessions(s)).toBe('9 sessions');
  });

  it('ignores the prefill when the sheet is not in MULTI mode (query is disabled, no data)', () => {
    setParams({ treatmentSheetId: 'sheet-1', tab: 'SINGLE' });
    const s = renderScreen();
    expect(isMulti(s)).toBe(false);
    expect(dropdownValue(s, 'Select Client')).toBe('Select...');
  });
});

describe('CreateAppointmentScreen — availability fallbacks during render', () => {
  it('renders without a re-render loop for the unavailable-MULTI deep link (treatments loading)', () => {
    mockData.treatments = [];
    setParams({ treatmentSheetId: 'sheet-1', tab: 'MULTI' });
    expect(() => renderScreen()).not.toThrow();
  });

  it('reflects treatments becoming available later: the type selector appears and MULTI can be chosen', () => {
    mockData.treatments = [];
    const s = renderScreen();
    expect(s.queryByLabelText('Multi Day therapy series')).toBeNull();
    mockData.treatments = TREATMENTS;
    s.refresh();
    fireEvent.press(s.getByLabelText('Multi Day therapy series'));
    expect(isMulti(s)).toBe(true);
  });
});
