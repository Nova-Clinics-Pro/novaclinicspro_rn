import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentRow } from '../../../features/appointments/presentation/components/AppointmentRow';
import { CreateConsultationScreen } from '../../../features/episodes/presentation/pages/CreateConsultationScreen';
import { EpisodeWorkspaceScreen } from '../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen';
import { CompleteConsultationScreen } from '../../../features/episodes/presentation/pages/CompleteConsultationScreen';
import { createEpisodeApi } from '../../../features/episodes/data/datasources/episodes.api';
import { transitionCasesheetStatusApi } from '../../../features/casesheets/data/datasources/casesheets.api';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { useConsultationCompletionQuery } from '../../../features/episodes/data/repositories/consultationCompletion.repository.impl';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'ayurveda' }),
  isAyurvedaClinic: () => true,
  hasMultiDayAppointments: () => false,
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetDetailQuery: () => ({ data: undefined, isLoading: false }),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useAppointmentDetailQuery: () => ({
    data: {
      id: 'appointment-1',
      client_name: 'Maya Rao',
      appointment_start: '2026-06-29T10:00:00',
    },
  }),
}));
jest.mock('../../../features/episodes/data/datasources/episodes.api', () => ({
  createEpisodeApi: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  transitionCasesheetStatusApi: jest.fn(),
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/consultationCompletion.repository.impl', () => ({
  useConsultationCompletionQuery: jest.fn(),
}));

// EpisodeWorkspaceScreen renders these tab panels for real. Stub them so this
// file exercises the screen's own orchestration (loading/error states, the
// current tab set, Treatment Plans gating) without pulling in each tab's own
// network dependencies (treatment orders, prescriptions, etc. — each has its
// own dedicated coverage elsewhere).
jest.mock('../../../features/episodes/presentation/components/CasesheetTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    CasesheetTab: (props: any) =>
      React.createElement(Text, { testID: 'casesheet-tab-content' }, `canCreate:${props.canCreate}`),
  };
});
jest.mock('../../../features/episodes/presentation/components/TreatmentPlansTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    TreatmentPlansTab: (props: any) =>
      React.createElement(
        Text,
        { testID: 'treatment-plans-tab-content' },
        `canCreate:${props.canCreate}:canSchedule:${props.canSchedule}`,
      ),
  };
});
jest.mock('../../../features/episodes/presentation/components/VisitsTab', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VisitsTab: (props: any) =>
      React.createElement(Text, { testID: 'visits-tab-content' }, `canWriteRx:${props.canWriteRx}`),
  };
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const appointment = {
  id: 'appointment-1',
  tenant_id: 'tenant-1',
  client_id: 'client-1',
  doctor_id: 'doctor-1',
  therapist_ids: [],
  room_id: null,
  treatment_id: null,
  appointment_start: '2026-06-29T10:00:00',
  appointment_end: null,
  status: 'scheduled',
  notes: null,
  is_active: true,
  created_at: '2026-06-29T09:00:00',
  appointment_type: 'SINGLE',
  series_id: null,
  client_name: 'Maya Rao',
};

const episodeDetails = {
  episode: {
    id: 'episode-1',
    title: 'Back pain',
    status: 'ACTIVE',
    start_date: '2026-06-29',
    end_date: null,
    description: null,
    client_id: 'client-1',
    client_name: 'Maya Rao',
    visits_count: 1,
    last_visit_date: null,
  },
  documents: {
    casesheet: { exists: true, id: 'casesheet-1', status: 'DRAFT', created_at: null, last_updated: null },
    treatment_sheet: { exists: true, id: 'sheet-1', status: 'FINAL', created_at: null, last_updated: null },
  },
  visits: [{
    appointment_id: 'appointment-1',
    appointment_date: '2026-06-29',
    appointment_time: '10:00:00',
    appointment_status: 'scheduled',
    staff_name: 'Dr A',
    prescription: { exists: true, id: 'rx-1', status: 'DRAFT', created_at: null },
    payment: { exists: false, invoice_id: null, amount: null, status: null, paid_amount: null },
  }],
};

const workspaceData = {
  episodeDetails,
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  casesheet: { id: 'casesheet-1', status: 'DRAFT', data_json: { extensions: [{ template_id: 'nadi_pariksha', data: { nadi_type: 'Vata' } }] } },
  casesheetId: 'casesheet-1',
  hasCasesheet: true,
  isCasesheetLoading: false,
  treatmentSheet: { id: 'sheet-1', status: 'DRAFT', state: 'ORDERED' },
  treatmentSheets: [],
  treatmentSheetId: 'sheet-1',
  hasTreatmentSheet: true,
  isTreatmentSheetLoading: false,
  isTreatmentSheetError: false,
  refetchTreatmentSheet: jest.fn(),
  visits: episodeDetails.visits,
  clientId: 'client-1',
  clientName: 'Maya Rao',
};

// Backend-owned consultation completion contract (T-BE-F.3/T-0.8) — the
// single source CompleteConsultationScreen now renders.
const consultationCompletionContract = {
  state: 'ready',
  can_complete: true,
  clinically_ready: true,
  actionable_by_current_user: true,
  outstanding_mandatory: [],
  optional_suggested: [],
  warnings: [],
  unresolved_facts: [],
  recommended_action: 'complete_visit',
  recommendation_reason: 'authoring_complete',
  blocking_factors: [],
  waiting_permission: null,
  case_sheet: { exists: true, document_status: 'DRAFT', recording_state: 'recorded' },
  prescription: { exists: true, document_status: 'DRAFT', recording_state: 'recorded' },
  treatment: { exists: true, lifecycle_status: 'in_therapy', lifecycle_unresolved: false, recording_state: 'recorded' },
  billing: {
    clinical_services_exist: false, invoice_exists: null, invoice_count: null, invoice_statuses: [],
    billed_amount: null, paid_amount: null, outstanding_amount: null, currency: null,
    recording_state: 'not_applicable',
  },
  visit: { visit_exists: true, appointment_status: 'IN_PROGRESS', outcome_type: null, recording_state: 'recorded' },
  capability_loss: [],
};

describe('consultation components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(workspaceData);
    (useConsultationCompletionQuery as jest.Mock).mockReturnValue({
      data: consultationCompletionContract,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  describe('AppointmentRow', () => {
    it('renders doctor Start Consultation without episode actions', () => {
      const onStart = jest.fn();
      const screen = render(
        <AppointmentRow variant="full" appointment={appointment as any} userRole="doctor" onStartConsultation={onStart} />,
      );

      expect(screen.getByText('Start Consultation')).toBeTruthy();
      expect(screen.queryByText('Link Episode')).toBeNull();
      expect(screen.queryByText('New Episode')).toBeNull();
      fireEvent.press(screen.getByTestId('action-start-consultation'));
      expect(onStart).toHaveBeenCalledWith('appointment-1', 'client-1');
    });

    it('shows loading and disables doctor CTA while starting', () => {
      const { getByTestId } = render(
        <AppointmentRow variant="full" appointment={appointment as any} userRole="doctor" isStartingConsultation />,
      );
      expect(getByTestId('action-start-consultation').props.accessibilityState?.disabled ?? true).toBe(true);
    });

    it('hides doctor CTA for terminal appointments', () => {
      const { queryByText, getAllByLabelText } = render(
        <AppointmentRow variant="full" appointment={{ ...appointment, status: 'completed' } as any} userRole="doctor" />,
      );
      expect(queryByText('Start Consultation')).toBeNull();
      expect(getAllByLabelText('Status: Completed').length).toBeGreaterThan(0);
    });

    it('keeps non-doctor quick actions visible', () => {
      const { getByText } = render(
        <AppointmentRow variant="full"
          appointment={appointment as any}
          userRole="receptionist"
          onReschedule={jest.fn()}
          onStatusUpdate={jest.fn()}
          onCancel={jest.fn()}
        />,
      );
      expect(getByText('Reschedule')).toBeTruthy();
    });
  });

  describe('CreateConsultationScreen', () => {
    it('validates empty chief complaint before creating a consultation', () => {
      const { getByText } = renderWithQueryClient(
        <CreateConsultationScreen appointmentId="appointment-1" clientId="client-1" />,
      );
      fireEvent.press(getByText('Start Consultation'));
      expect(getByText('Chief Complaint is required.')).toBeTruthy();
      expect(createEpisodeApi).not.toHaveBeenCalled();
    });

    it('creates an episode and navigates to the COS assessment workspace', async () => {
      (createEpisodeApi as jest.Mock).mockResolvedValue({ id: 'episode-1' });
      const { getByText, getByPlaceholderText } = renderWithQueryClient(
        <CreateConsultationScreen appointmentId="appointment-1" clientId="client-1" />,
      );

      fireEvent.changeText(getByPlaceholderText("Primary reason for today's visit"), 'Back pain');
      fireEvent.press(getByText('Start Consultation'));

      await waitFor(() => expect(createEpisodeApi).toHaveBeenCalled());
      expect(router.replace).toHaveBeenCalledWith(
        '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor&step=assessment',
      );
    });

    it('retains create form data after API failure and keeps patient context visible', async () => {
      (createEpisodeApi as jest.Mock).mockRejectedValue(new Error('failed'));
      const { getByText, getByDisplayValue, getByPlaceholderText } = renderWithQueryClient(
        <CreateConsultationScreen appointmentId="appointment-1" clientId="client-1" />,
      );

      fireEvent.changeText(getByPlaceholderText("Primary reason for today's visit"), 'Back pain');
      fireEvent.press(getByText('Start Consultation'));

      await waitFor(() => expect(getByText('failed')).toBeTruthy());
      expect(getByText('Maya Rao')).toBeTruthy();
      expect(getByDisplayValue('Back pain')).toBeTruthy();
    });
  });

  describe('EpisodeWorkspaceScreen', () => {
    it('shows a loading state while the episode is loading', () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...workspaceData,
        isEpisodeLoading: true,
        episodeDetails: undefined,
      });
      const { getByText } = render(
        <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
      );
      expect(getByText('Loading episode...')).toBeTruthy();
    });

    it('shows an error state and retries via refetchEpisode', () => {
      const refetchEpisode = jest.fn();
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...workspaceData,
        isEpisodeError: true,
        episodeDetails: undefined,
        refetchEpisode,
      });
      const { getByText } = render(
        <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
      );
      expect(getByText('Could not load episode workspace. Please try again.')).toBeTruthy();
      fireEvent.press(getByText('Retry'));
      expect(refetchEpisode).toHaveBeenCalled();
    });

    it('renders the current tab set (Visits, Casesheet, Treatment Plans) with no legacy Prescriptions tab', () => {
      const { getByText, queryByText } = render(
        <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
      );
      expect(getByText('Visits')).toBeTruthy();
      expect(getByText('Casesheet')).toBeTruthy();
      expect(getByText('Treatment Plans')).toBeTruthy();
      // The workspace's 'prescriptions' tab key now renders the Visits panel
      // under a "Visits" label — there is no longer a separate Prescriptions
      // tab (folded into Casesheet, per T-F.2a). Guard against reintroducing
      // that assumption.
      expect(queryByText('Prescriptions')).toBeNull();
    });

    it('hides the Treatment Plans tab until a casesheet exists', () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...workspaceData, hasCasesheet: false });
      const { queryByText } = render(
        <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
      );
      expect(queryByText('Treatment Plans')).toBeNull();
    });
  });

  describe('CompleteConsultationScreen (T-0.8 — renders the backend contract, derives nothing locally)', () => {
    it('renders the backend-owned completion state and requests the exact context identifiers', () => {
      const { getByTestId } = render(
        <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      expect(useConsultationCompletionQuery).toHaveBeenCalledWith('tenant-1', 'client-1', 'episode-1', 'appointment-1');
      expect(getByTestId('completion-state-label').props.children).toBe('Ready to complete');
    });

    it('never calls the local Case Sheet FINAL transition — the completion action fails closed', () => {
      const { getByTestId, getByText } = render(
        <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );

      fireEvent.press(getByTestId('complete-consultation-button'));

      expect(transitionCasesheetStatusApi).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalledWith('/doctor');
      expect(getByText('This feature is not yet available')).toBeTruthy();
    });

    it('renders backend readiness state even when mandatory work is outstanding, without any local derivation', () => {
      (useConsultationCompletionQuery as jest.Mock).mockReturnValue({
        data: {
          ...consultationCompletionContract,
          state: 'not_ready',
          can_complete: false,
          clinically_ready: false,
          outstanding_mandatory: ['assessment'],
        },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      });
      const { getByTestId } = render(
        <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      expect(getByTestId('completion-state-label').props.children).toBe('Not ready to complete');
    });
  });
});
