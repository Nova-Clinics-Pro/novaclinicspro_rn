import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateConsultationScreen } from '../../../features/episodes/presentation/pages/CreateConsultationScreen';
import { EpisodeWorkspaceScreen } from '../../../features/episodes/presentation/pages/EpisodeWorkspaceScreen';
import { CompleteConsultationScreen } from '../../../features/episodes/presentation/pages/CompleteConsultationScreen';
import { createEpisodeApi } from '../../../features/episodes/data/datasources/episodes.api';
import { transitionCasesheetStatusApi } from '../../../features/casesheets/data/datasources/casesheets.api';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { useConsultationCompletionQuery } from '../../../features/episodes/data/repositories/consultationCompletion.repository.impl';
import { episodeWorkspaceRoute } from '../../../features/doctorDashboard/application/consultationRoutes';

// This suite exercises the doctor consultation flow across the current
// architecture's own screen boundary — CreateConsultationScreen (create) →
// EpisodeWorkspaceScreen (open, current tab set) → CompleteConsultationScreen
// (complete) — using each screen for real and only mocking network-edge
// dependencies. It intentionally does not render ConsultationWorkspaceScreen/
// ClinicalWorkspace (the WorkspaceProvider-wrapped in-place editing shell)
// or exercise resolveCase — both already have dedicated coverage
// (clinicalWorkspaceShell.test.tsx, workspaceProvider.test.tsx,
// caseSheetModule.test.tsx, caseResolver.test.ts) and are outside this
// suite's job of proving the create → open → complete flow works against
// today's EpisodeWorkspaceScreen/useConsultationWorkspace/CaseSheetModule
// architecture (R3A/R4 · T-B.1-3, T-F.2a, T-G.2), not the Phase-1 one it was
// originally written against.

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'ayurveda' }),
  isAyurvedaClinic: () => true,
}));
jest.mock('../../../features/episodes/data/datasources/episodes.api', () => ({
  createEpisodeApi: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  transitionCasesheetStatusApi: jest.fn(),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useAppointmentDetailQuery: () => ({
    data: { id: 'appointment-1', client_name: 'Maya Rao', appointment_start: '2026-06-29T10:00:00' },
  }),
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/consultationCompletion.repository.impl', () => ({
  useConsultationCompletionQuery: jest.fn(),
}));

// Stub the tab panels EpisodeWorkspaceScreen mounts so this suite can assert
// on the wiring (which role gets which capability, which tab is active)
// without exercising each panel's own network calls — the panels have their
// own coverage elsewhere.
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
    visits_count: 2,
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
  casesheet: { id: 'casesheet-1', status: 'DRAFT', data_json: { extensions: [] } },
  casesheetId: 'casesheet-1',
  hasCasesheet: true,
  isCasesheetLoading: false,
  treatmentSheet: { id: 'sheet-1', status: 'FINAL' },
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
// single source this screen now renders. Deliberately does NOT mirror
// workspaceData's shape; the screen must derive nothing from it locally.
const consultationCompletionContract = {
  state: 'ready',
  can_complete: true,
  clinically_ready: true,
  actionable_by_current_user: true,
  outstanding_mandatory: [],
  optional_suggested: ['prescription'],
  warnings: [],
  unresolved_facts: [],
  recommended_action: 'complete_visit',
  recommendation_reason: 'authoring_complete',
  blocking_factors: [],
  waiting_permission: null,
  case_sheet: { exists: true, document_status: 'FINAL', recording_state: 'recorded' },
  prescription: { exists: false, document_status: null, recording_state: 'absent' },
  treatment: { exists: false, lifecycle_status: null, lifecycle_unresolved: false, recording_state: 'absent' },
  billing: {
    clinical_services_exist: false, invoice_exists: null, invoice_count: null, invoice_statuses: [],
    billed_amount: null, paid_amount: null, outstanding_amount: null, currency: null,
    recording_state: 'not_applicable',
  },
  visit: { visit_exists: true, appointment_status: 'IN_PROGRESS', outcome_type: null, recording_state: 'recorded' },
  capability_loss: [],
};

const mockCompletionQuery = (overrides: Record<string, any> = {}) => {
  (useConsultationCompletionQuery as jest.Mock).mockReturnValue({
    data: consultationCompletionContract,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  });
};

describe('doctor consultation flow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(workspaceData);
    mockCompletionQuery();
  });

  it('creates an episode from the appointment and navigates to its consultation workspace route', async () => {
    (createEpisodeApi as jest.Mock).mockResolvedValue({ id: 'episode-1' });
    const { getByText, getByPlaceholderText } = renderWithQueryClient(
      <CreateConsultationScreen appointmentId="appointment-1" clientId="client-1" />,
    );

    fireEvent.changeText(getByPlaceholderText("Primary reason for today's visit"), 'Back pain');
    fireEvent.press(getByText('Start Consultation'));

    await waitFor(() => expect(createEpisodeApi).toHaveBeenCalled());
    expect(router.replace).toHaveBeenCalledWith(
      episodeWorkspaceRoute('episode-1', 'appointment-1', 'client-1', 'doctor'),
    );
  });

  it('opens the doctor workspace with note-editing and prescription-writing enabled', () => {
    const { getByText, getByTestId, queryByText } = render(
      <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
    );

    expect(getByText('Visits')).toBeTruthy();
    expect(getByText('Casesheet')).toBeTruthy();
    expect(getByText('Treatment Plans')).toBeTruthy();
    expect(queryByText('Prescriptions')).toBeNull();
    expect(getByTestId('visits-tab-content').props.children).toContain('canWriteRx:true');

    fireEvent.press(getByText('Casesheet'));
    expect(getByTestId('casesheet-tab-content').props.children).toContain('canCreate:true');
  });

  it('opens the admin workspace with scheduling enabled and note-editing/prescriptions disabled', () => {
    const { getByText, getByTestId } = render(
      <EpisodeWorkspaceScreen mode="admin" episodeId="episode-1" clientId="client-1" />,
    );

    expect(getByTestId('visits-tab-content').props.children).toContain('canWriteRx:false');

    fireEvent.press(getByText('Casesheet'));
    expect(getByTestId('casesheet-tab-content').props.children).toContain('canCreate:false');

    fireEvent.press(getByText('Treatment Plans'));
    expect(getByTestId('treatment-plans-tab-content').props.children).toContain('canCreate:false');
    expect(getByTestId('treatment-plans-tab-content').props.children).toContain('canSchedule:true');
  });

  it('switches the active tab and its content region when a different tab is pressed', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
    );

    // Default tab (initialTab='prescriptions') renders the Visits panel.
    expect(getByTestId('visits-tab-content')).toBeTruthy();
    expect(queryByTestId('casesheet-tab-content')).toBeNull();

    fireEvent.press(getByText('Casesheet'));
    expect(getByTestId('casesheet-tab-content')).toBeTruthy();
    expect(queryByTestId('visits-tab-content')).toBeNull();

    fireEvent.press(getByText('Treatment Plans'));
    expect(getByTestId('treatment-plans-tab-content')).toBeTruthy();
    expect(queryByTestId('casesheet-tab-content')).toBeNull();
  });

  it('hides Treatment Plans until a casesheet exists, and reveals it once one does', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...workspaceData, hasCasesheet: false });
    const { queryByText, rerender } = render(
      <EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />,
    );
    expect(queryByText('Treatment Plans')).toBeNull();

    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(workspaceData);
    rerender(<EpisodeWorkspaceScreen mode="doctor" episodeId="episode-1" clientId="client-1" />);
    expect(queryByText('Treatment Plans')).toBeTruthy();
  });

  it('renders the backend-owned completion state and never calls the local Case Sheet FINAL transition', async () => {
    const { getByTestId, getByText, getAllByText } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );

    expect(useConsultationCompletionQuery).toHaveBeenCalledWith('tenant-1', 'client-1', 'episode-1', 'appointment-1');
    expect(getByTestId('completion-state-label').props.children).toBe('Ready to complete');
    // Optional-suggested item rendered via its backend semantic code, not authored prose
    // (also matches the Prescription document-summary card's own title — both are
    // legitimate backend-driven renderings, hence getAllByText not getByText).
    expect(getAllByText('Prescription').length).toBeGreaterThan(0);

    fireEvent.press(getByText('Complete Consultation'));

    expect(transitionCasesheetStatusApi).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

// T-0.8 target-boundary characterization (replaces the pre-T-0.8
// `deriveSummary` characterization suite — Group -1 · T-0.1, ED-ARCH-004).
// These tests prove the NEW invariant: the screen renders the backend
// contract verbatim and derives no clinical statement of its own. Unlike
// the suite this replaces, passing here DOES endorse the behavior as
// correct — it is the target this task exists to reach, not a defect
// being merely documented.
describe('CompleteConsultationScreen — renders backend contract, derives nothing locally (T-0.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    mockCompletionQuery();
  });

  it('shows a loading state while the completion contract is loading, with no completion action visible', () => {
    mockCompletionQuery({ data: undefined, isLoading: true });
    const { queryByText } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    expect(queryByText('Complete Consultation')).toBeNull();
  });

  it('shows an error state and allows retry when the completion contract fails to load', async () => {
    const refetch = jest.fn();
    mockCompletionQuery({ data: undefined, isError: true, refetch });
    const { getByText } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );

    expect(getByText('Could not load the consultation completion summary. Please try again.')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('the completion action is always disabled — no governed completion mutation exists yet', () => {
    const { getByText, getByTestId } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    const button = getByTestId('complete-consultation-button');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(getByText('This feature is not yet available')).toBeTruthy();
  });

  it('renders ABSENT and UNAVAILABLE distinctly, never as a negative clinical claim like "Not saved"/"Not created"', () => {
    mockCompletionQuery({
      data: {
        ...consultationCompletionContract,
        prescription: { exists: false, document_status: null, recording_state: 'absent' },
        billing: { ...consultationCompletionContract.billing, recording_state: 'unavailable' },
      },
    });
    const { getAllByText, queryByText } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );

    expect(getAllByText('Not recorded').length).toBeGreaterThan(0); // prescription: absent
    expect(getAllByText('Currently unavailable').length).toBeGreaterThan(0); // billing: unavailable
    expect(queryByText('Not saved')).toBeNull();
    expect(queryByText('Not created')).toBeNull();
    expect(queryByText('Not sent')).toBeNull();
  });

  it('renders mandatory, optional, warning and unresolved groups distinctly from backend semantic codes', () => {
    mockCompletionQuery({
      data: {
        ...consultationCompletionContract,
        state: 'not_ready',
        outstanding_mandatory: ['assessment'],
        optional_suggested: ['prescription'],
        warnings: ['outstanding_balance'],
        unresolved_facts: ['treatment_lifecycle_unresolved'],
      },
    });
    const { getByText, getAllByText } = render(
      <CompleteConsultationScreen episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );

    expect(getByText('Outstanding required work')).toBeTruthy();
    // "assessment" stage name renders as "Case Sheet", same text as the
    // Case Sheet document-summary card's own title further down the page.
    expect(getAllByText('Case Sheet').length).toBeGreaterThan(0);
    expect(getByText('Optional suggested work')).toBeTruthy();
    expect(getByText('Warnings')).toBeTruthy();
    expect(getByText('There is an outstanding balance')).toBeTruthy();
    expect(getByText('Unresolved facts')).toBeTruthy();
    expect(getByText('Treatment status is currently unresolved')).toBeTruthy();
  });

  it('does not import or reference the removed hard-coded Ayurveda template check', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../../features/episodes/presentation/pages/CompleteConsultationScreen'),
      'utf8',
    );
    expect(source).not.toMatch(/nadi_pariksha|prakriti|deriveSummary|treatmentSent/);
  });
});
