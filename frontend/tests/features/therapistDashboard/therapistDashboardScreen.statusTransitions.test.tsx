/**
 * TherapistDashboardScreen — status-transition regression tests.
 *
 * Covers the two render-phase state adjustments that replaced effects (lint remediation,
 * react-hooks/set-state-in-effect):
 *   1. completion-modal close on completeSheetRow submit-status change (conflict / completing → idle)
 *   2. order-version cache clear on start-session status change (success / conflict)
 * and the effects that deliberately stayed (resetCompletion on conflict; alerts + startSession.reset()).
 *
 * The data layer and presentational children are mocked; the screen's own state logic is real.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TherapistDashboardScreen } from '../../../features/therapistDashboard/presentation/pages/TherapistDashboardScreen';

// ── Controllable hook state (names must start with "mock" for jest.mock factories) ──
const mockState = {
  submitStatus: 'idle' as string,
  startStatus: 'idle' as string,
  startErrorMessage: null as string | null,
};
const mockResetCompletion = jest.fn();
const mockStartReset = jest.fn();
const mockStartMutate = jest.fn();
const mockFetchOrder = jest.fn();

const mockSessions = [
  {
    id: 's1',
    row_id: 'row-1',
    appointment_id: null,
    treatment_sheet_id: 'sheet-1',
    status: 'in_progress',
    scheduled_time: '2020-01-01T09:00:00Z',
    started_at: '2020-01-01T09:05:00Z',
    client_name: 'Asha',
  },
  {
    id: 's2',
    row_id: 'row-2',
    appointment_id: null,
    treatment_sheet_id: 'sheet-2',
    status: 'scheduled',
    scheduled_time: '2020-01-01T10:00:00Z',
    started_at: null,
    client_name: 'Ravi',
  },
];

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: { tenantId: 't1', userId: 'u1', fullName: 'Thera Pist', roles: ['Therapist'] },
    logout: jest.fn(),
  }),
}));
jest.mock('../../../features/staffDashboards/data/repositories/staffDashboards.repository.impl', () => ({
  staffDashboardsKeys: { therapist: (t: string) => ['staffDashboards', 'therapist', t] },
  therapistKeys: {},
  useTherapistSessionsQuery: () => ({ data: { items: mockSessions, total: 2 }, isLoading: false }),
  useSheetRowUsablesQuery: () => ({ data: undefined }),
  useCompleteSheetRowMutation: () => ({
    mutate: jest.fn(),
    submitStatus: mockState.submitStatus,
    errorMessage: null,
    reset: mockResetCompletion,
  }),
  useRecordSessionNonExecutionMutation: () => ({
    mutate: jest.fn(),
    submitStatus: 'idle',
    errorMessage: null,
    lastResult: null,
    reset: jest.fn(),
  }),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useUpdateAppointmentStatusMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl', () => ({
  useStartSessionMutation: () => ({
    status: mockState.startStatus,
    errorMessage: mockState.startErrorMessage,
    mutate: mockStartMutate,
    reset: mockStartReset,
  }),
  useTreatmentOrderOnDemand: () => mockFetchOrder,
}));
jest.mock('../../../features/therapistDashboard/data/repositories/therapistDashboard.repository.impl', () => ({
  useTherapistLeaveRequestsQuery: () => ({ data: { items: [] }, isLoading: false }),
  useCreateLeaveRequestMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCancelLeaveRequestMutation: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('../../../features/therapistDashboard/domain/usecases/get-therapist-dashboard.usecase', () => ({
  useGetTherapistDashboard: () => ({ data: undefined, isError: false }),
}));
jest.mock('../../../features/staffDashboards/presentation/hooks/useDashboardDate', () => ({
  useTherapistDashboardDate: () => ({
    selectedDate: new Date('2026-01-01T00:00:00Z'),
    setSelectedDate: jest.fn(),
    selectedDateStr: '2026-01-01',
    isToday: true,
  }),
}));
jest.mock('../../../core/components/DateStrip', () => ({ DateStrip: () => null }));
jest.mock('../../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../../features/therapistDashboard/presentation/components/TherapistDashboardSummary', () => ({
  TherapistDashboardSummary: () => null,
}));
jest.mock('../../../features/therapistDashboard/presentation/components/TherapistKpiSection', () => ({
  TherapistKpiSection: () => null,
}));
jest.mock('../../../features/therapistDashboard/presentation/components/LeaveSection', () => ({
  LeaveSection: () => null,
}));
jest.mock('../../../features/therapistDashboard/presentation/components/HrSection', () => ({
  HrSection: () => null,
}));
jest.mock('../../../features/therapistDashboard/presentation/components/SessionNonExecutionModal', () => ({
  SessionNonExecutionModal: () => null,
}));
jest.mock('../../../features/appointments/presentation/components/AppointmentRow', () => {
  const R = jest.requireActual('react');
  const { TouchableOpacity: Touch, Text: Txt } = jest.requireActual('react-native');
  return {
    AppointmentRow: ({ appointment, onComplete }: any) =>
      R.createElement(
        Touch,
        { testID: `complete-${appointment.id}`, onPress: () => onComplete(appointment.id) },
        R.createElement(Txt, null, `row ${appointment.id}`)
      ),
  };
});
jest.mock('../../../features/therapistDashboard/presentation/components/TreatmentSessionCompleteModal', () => {
  const R = jest.requireActual('react');
  const { Text: Txt } = jest.requireActual('react-native');
  return {
    TreatmentSessionCompleteModal: ({ rowId }: any) =>
      R.createElement(Txt, { testID: 'completion-modal' }, `completion-modal:${rowId}`),
  };
});


const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderScreen = () => {
  const client = makeClient();
  // A fresh element each time: re-rendering with the identical element would bail out and never re-read the mocks.
  const makeTree = () => (
    <QueryClientProvider client={client}>
      <TherapistDashboardScreen />
    </QueryClientProvider>
  );
  const utils = render(makeTree());
  const setStatus = (patch: Partial<typeof mockState>) => {
    Object.assign(mockState, patch);
    utils.rerender(makeTree());
  };
  return { ...utils, setStatus };
};

const openCompletionModal = (utils: ReturnType<typeof renderScreen>) => {
  fireEvent.press(utils.getByTestId('complete-row-1'));
  expect(utils.getByTestId('completion-modal')).toBeTruthy();
};

const pressStart = async (utils: ReturnType<typeof renderScreen>) => {
  await act(async () => {
    fireEvent.press(utils.getByLabelText('Start session'));
  });
};

describe('TherapistDashboardScreen status transitions', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockState.submitStatus = 'idle';
    mockState.startStatus = 'idle';
    mockState.startErrorMessage = null;
    mockResetCompletion.mockClear();
    mockStartReset.mockClear();
    mockStartMutate.mockClear();
    mockFetchOrder.mockReset();
    mockFetchOrder.mockResolvedValue({ version: 3 });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('completion modal (submit status)', () => {
    it('opens for an in-progress session and stays open while the submit status is idle', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      expect(utils.getByText('completion-modal:row-1')).toBeTruthy();
    });

    it('does not open a completion modal for a session that has not been started', () => {
      const utils = renderScreen();
      fireEvent.press(utils.getByTestId('complete-row-2'));
      expect(utils.queryByTestId('completion-modal')).toBeNull();
      expect(alertSpy).toHaveBeenCalledWith('Start Required', expect.any(String));
    });

    it('closes the modal on conflict and still resets the completion mutation (effect kept)', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      utils.setStatus({ submitStatus: 'conflict' });
      expect(utils.queryByTestId('completion-modal')).toBeNull();
      expect(mockResetCompletion).toHaveBeenCalledTimes(1);
    });

    it('can be reopened after a conflict once the mutation is back to idle (no stale selection)', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      utils.setStatus({ submitStatus: 'conflict' });
      utils.setStatus({ submitStatus: 'idle' });
      // idle after conflict is NOT a success transition; nothing is open, nothing is forced shut later
      expect(utils.queryByTestId('completion-modal')).toBeNull();
      openCompletionModal(utils);
      expect(utils.getByText('completion-modal:row-1')).toBeTruthy();
    });

    it('closes the modal when a submit goes completing → idle (success)', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      utils.setStatus({ submitStatus: 'completing' });
      expect(utils.getByTestId('completion-modal')).toBeTruthy();
      utils.setStatus({ submitStatus: 'idle' });
      expect(utils.queryByTestId('completion-modal')).toBeNull();
    });

    it('keeps the modal open when a submit fails (completing → error)', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      utils.setStatus({ submitStatus: 'completing' });
      utils.setStatus({ submitStatus: 'error' });
      expect(utils.getByTestId('completion-modal')).toBeTruthy();
      expect(mockResetCompletion).not.toHaveBeenCalled();
    });

    it('a reopened modal is not closed by an unrelated re-render with an unchanged status', () => {
      const utils = renderScreen();
      openCompletionModal(utils);
      utils.setStatus({ submitStatus: 'completing' });
      utils.setStatus({ submitStatus: 'idle' });
      openCompletionModal(utils);
      utils.setStatus({});
      expect(utils.getByTestId('completion-modal')).toBeTruthy();
    });
  });

  describe('start session (order-version cache + alerts)', () => {
    it('fetches the order version once and reuses the cache for a repeated start', async () => {
      const utils = renderScreen();
      await pressStart(utils);
      expect(mockFetchOrder).toHaveBeenCalledTimes(1);
      expect(mockStartMutate).toHaveBeenLastCalledWith({ sheetId: 'sheet-2', rowId: 'row-2', version: 3 });
      await pressStart(utils);
      expect(mockFetchOrder).toHaveBeenCalledTimes(1);
      expect(mockStartMutate).toHaveBeenCalledTimes(2);
    });

    it('clears the order-version cache on success, resets the mutation, and shows no alert', async () => {
      const utils = renderScreen();
      await pressStart(utils);
      mockFetchOrder.mockResolvedValue({ version: 4 });
      utils.setStatus({ startStatus: 'success' });
      await waitFor(() => expect(mockStartReset).toHaveBeenCalled());
      utils.setStatus({ startStatus: 'idle' });
      await pressStart(utils);
      expect(mockFetchOrder).toHaveBeenCalledTimes(2);
      expect(mockStartMutate).toHaveBeenLastCalledWith({ sheetId: 'sheet-2', rowId: 'row-2', version: 4 });
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('on conflict: alerts once with the server message, resets the mutation, and clears the cache', async () => {
      const utils = renderScreen();
      await pressStart(utils);
      mockFetchOrder.mockResolvedValue({ version: 5 });
      utils.setStatus({ startStatus: 'conflict', startErrorMessage: 'Changed elsewhere' });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Session Updated', 'Changed elsewhere'));
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(mockStartReset).toHaveBeenCalled();
      utils.setStatus({ startStatus: 'idle', startErrorMessage: null });
      await pressStart(utils);
      expect(mockStartMutate).toHaveBeenLastCalledWith({ sheetId: 'sheet-2', rowId: 'row-2', version: 5 });
    });

    it('on error: alerts and resets, but keeps the cached order version', async () => {
      const utils = renderScreen();
      await pressStart(utils);
      expect(mockFetchOrder).toHaveBeenCalledTimes(1);
      utils.setStatus({ startStatus: 'error', startErrorMessage: 'Boom' });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Boom'));
      expect(mockStartReset).toHaveBeenCalled();
      utils.setStatus({ startStatus: 'idle', startErrorMessage: null });
      await pressStart(utils);
      expect(mockFetchOrder).toHaveBeenCalledTimes(1);
    });
  });
});
