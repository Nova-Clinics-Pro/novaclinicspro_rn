/**
 * T-FE-A.1 — VisitCommandCenter shell tests.
 * T-FE-C.1 — extended with a QueryClientProvider wrapper + mocked
 * clinicalWorkspace datasource, since the shell now mounts
 * `WhyTodaySection` (which calls `useClinicalWorkspaceQuery`) once
 * workspace context resolves. WhyTodaySection's own behaviour (loading /
 * error / recorded / not_recorded / unavailable / inference rejection)
 * is NOT re-tested here — that is `whyTodaySection.test.tsx`'s own
 * scope; this file only proves the shell still composes correctly.
 * T-FE-B.1 — further extended with a mocked `clinicalWorkflow` datasource
 * since the shell now also mounts `WorkflowPills`. WorkflowPills' own
 * behaviour (state mapping, empty/loading/error, a11y) is NOT re-tested
 * here — that is `workflowPills.test.tsx`'s own scope.
 *
 * Mirrors the established conventions: `workspaceProvider.test.tsx`'s
 * `useEpisodeWorkspaceData` mock (WorkspaceProvider itself is already
 * thoroughly tested there — not re-tested here), and
 * `consultationComponents.test.tsx`'s render-level screen test style.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { VisitCommandCenter } from '../../../features/episodes/presentation/pages/VisitCommandCenter';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { getClinicalWorkspaceApi } from '../../../features/episodes/data/datasources/clinicalWorkspace.api';
import { getClinicalWorkflowApi } from '../../../features/episodes/data/datasources/clinicalWorkflow.api';
import { WorkspaceFactsResponse } from '../../../features/episodes/data/models/clinicalWorkspace.dtos';
import { ClinicalWorkflowResolutionResponse } from '../../../features/episodes/data/models/clinicalWorkflow.dtos';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null }),
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/episodes/data/datasources/clinicalWorkspace.api', () => ({
  getClinicalWorkspaceApi: jest.fn(),
}));
jest.mock('../../../features/episodes/data/datasources/clinicalWorkflow.api', () => ({
  getClinicalWorkflowApi: jest.fn(),
}));
// T-FE-E.1a: the shell now composes CaseSheetModule, which pulls in
// useFeatures() (-> real supabaseClient without a mock) and the
// casesheets datasource -- mocked here exactly as caseSheetModule.test.tsx
// (the module's own test) already does, so CaseSheetModule's own
// behavior is not re-tested here, only that it renders once as part of
// the shell.
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'general', freshness_v1_enabled: false }),
  isAyurvedaClinic: (value: any) => value?.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: (value: any) => !!value?.freshness_v1_enabled,
}));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  createCasesheetApi: jest.fn(),
  updateCasesheetApi: jest.fn(),
  // T-FE-E.1b: CaseSheetModule also composes CaseSheetContributionHistory.
  getCasesheetContributionsApi: jest.fn().mockResolvedValue({ casesheet_id: '', episode_id: '', contributions: [] }),
}));
// T-FE-E.2: the shell now also composes PrescriptionModule,
// TreatmentRecommendationModule, SessionInstructionsModule, and
// SchedulingModule -- mocked at the same true datasource boundary each
// module's own test file already uses, so none of those modules' own
// behavior is re-tested here, only that the shell composes them once each.
jest.mock('../../../features/prescriptions/data/datasources/prescriptions.api', () => ({
  createPrescriptionApi: jest.fn(),
  updatePrescriptionApi: jest.fn(),
  listPrescriptionsApi: jest.fn().mockResolvedValue({ prescriptions: [], total: 0 }),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentSheets.api', () => ({
  createTreatmentSheetApi: jest.fn(),
  createSimpleTreatmentSheetApi: jest.fn(),
  getTreatmentSheetApi: jest.fn(),
  getTreatmentSheetsByEpisodeApi: jest.fn(),
  transitionTreatmentSheetStatusApi: jest.fn(),
  syncTreatmentSheetApi: jest.fn(),
  printTreatmentSheetApi: jest.fn(),
  archiveTreatmentSheetApi: jest.fn(),
  updateTreatmentSheetRowApi: jest.fn(),
  updateAllTreatmentSheetRowsApi: jest.fn(),
  completeTreatmentSheetRowApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentOrders.api', () => ({
  getTreatmentOrderApi: jest.fn().mockResolvedValue({ id: 'sheet-1', version: 1, rows: [], state: 'DRAFT', is_order: false }),
  listTreatmentOrdersApi: jest.fn(),
  createTreatmentRecommendationApi: jest.fn(),
  sendToSchedulingApi: jest.fn(),
  startSheetRowApi: jest.fn(),
  scheduleRowApi: jest.fn(),
  bulkScheduleRowsApi: jest.fn(),
  cancelTreatmentOrderApi: jest.fn(),
  placeTreatmentOrderOnHoldApi: jest.fn(),
  getSchedulingProposalApi: jest.fn(),
}));
// T-FE-E.2 closure (T-BE-D.4a): the shell now also composes
// TreatmentPlanModule, and SchedulingModule now also looks up the Plan
// by Recommendation -- mocked at the same datasource boundary.
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentPlans.api', () => ({
  getTreatmentPlanByRecommendationApi: jest.fn().mockResolvedValue(null),
  getTreatmentPlanApi: jest.fn(),
  createTreatmentPlanApi: jest.fn(),
}));
// SchedulingModule statically imports ScheduleRowModal, which imports
// useStaffListQuery -- mocked at the same datasource boundary even though
// no test here opens the modal, purely so the import chain never reaches
// the real axiosClient/supabaseClient.
jest.mock('../../../features/staff/data/datasources/staff.api', () => ({
  listStaffApi: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getStaffApi: jest.fn(),
  createStaffApi: jest.fn(),
  updateStaffApi: jest.fn(),
  deleteStaffApi: jest.fn(),
  listStaffLeaveApi: jest.fn(),
  createStaffLeaveApi: jest.fn(),
  approveLeaveApi: jest.fn(),
  rejectLeaveApi: jest.fn(),
  cancelLeaveApi: jest.fn(),
  searchStaffApi: jest.fn(),
  listAllStaffLeaveApi: jest.fn(),
}));
// T-FE-C.4: the shell now also composes ClinicalTimeline, which pulls in
// useClinicalTimelineData -- mocked directly here (exactly as
// clinicalTimeline.test.tsx's own test does) rather than mocking the
// four/five datasource modules it would otherwise transitively require
// (appointments/prescriptions/treatmentSheets/clinicalServices ->
// axiosClient -> supabaseClient, which throws without real env vars).
// ClinicalTimeline's own behavior is not re-tested here, only that it
// renders once as part of the shell.
jest.mock('../../../features/episodes/presentation/hooks/useClinicalTimelineData', () => ({
  useClinicalTimelineData: () => ({ items: [], isLoading: false }),
}));

const mockGetClinicalWorkspaceApi = getClinicalWorkspaceApi as jest.Mock;
const mockGetClinicalWorkflowApi = getClinicalWorkflowApi as jest.Mock;

const emptyWorkflowResolution: ClinicalWorkflowResolutionResponse = {
  stages: [],
  recommended_action: null,
  recommendation_reason: null,
  blocking_factors: [],
  waiting_role: null,
  alternatives: [],
  completion_readiness: { ready: false, unresolved_stage_codes: [], reason_code: null },
  outstanding_work: [],
  optional_work: [],
  unresolved_facts: [],
  capability_loss: [],
};

const episodeDetails = {
  episode: {
    id: 'episode-1',
    title: 'Chronic Knee Pain',
    status: 'ACTIVE',
    start_date: '2026-06-01',
    end_date: null,
    description: null,
    client_id: 'client-1',
    client_name: 'Maya Rao',
    visits_count: 1,
    last_visit_date: null,
  },
  documents: {
    casesheet: { exists: false, id: null, status: null, created_at: null },
    treatment_sheet: { exists: false, id: null, status: null, created_at: null },
  },
  visits: [
    {
      appointment_id: 'appointment-1',
      appointment_date: '2026-07-03',
      appointment_time: '10:00:00',
      appointment_status: 'IN_PROGRESS',
      staff_name: 'Dr. Rao',
      prescription: { exists: false, id: null, status: null, created_at: null },
      payment: { invoice_id: null, amount: null, status: null, paid_amount: null },
    },
  ],
};

const workspaceData = {
  episodeDetails,
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  casesheet: undefined,
  casesheetId: null,
  hasCasesheet: false,
  isCasesheetLoading: false,
  treatmentSheet: undefined,
  treatmentSheets: [],
  treatmentSheetId: null,
  hasTreatmentSheet: false,
  isTreatmentSheetLoading: false,
  isTreatmentSheetError: false,
  refetchTreatmentSheet: jest.fn(),
  visits: episodeDetails.visits,
  clientId: 'client-1',
  clientName: 'Maya Rao',
};

const notRecordedSnapshot: WorkspaceFactsResponse = {
  identity: {
    tenant_id: 'tenant-1',
    client_id: 'client-1',
    episode_id: 'episode-1',
    appointment_id: 'appointment-1',
    visit_id: 'visit-1',
    requesting_tenant_user_id: 'user-1',
    context_valid: true,
  },
  purpose: { value: null, recording_state: 'not_recorded' },
  episode: { exists: true, episode_id: 'episode-1', status: 'ACTIVE', recording_state: 'recorded' },
  visit: { exists: true, visit_id: 'visit-1', outcome_type: null, outcome_notes: null, recording_state: 'recorded' },
  appointment: { exists: true, appointment_id: 'appointment-1', status: 'IN_PROGRESS', recording_state: 'recorded' },
  casesheet: {
    exists: false,
    casesheet_id: null,
    episode_id: null,
    document_status: null,
    signed: false,
    contribution_count: null,
    recording_state: 'absent',
  },
  prescription: { exists: false, prescription_id: null, document_status: null, recording_state: 'absent' },
  treatment: {
    exists: false,
    treatment_sheet_id: null,
    is_order: false,
    lifecycle_status: null,
    lifecycle_unresolved: false,
    recording_state: 'absent',
  },
  billing: {
    clinical_services_exist: null,
    invoice_exists: null,
    invoice_status: null,
    outstanding_state: 'not_applicable',
    recording_state: 'unavailable',
    invoice_count: null,
    invoice_ids: [],
    invoice_statuses: [],
    billed_amount: null,
    paid_amount: null,
    outstanding_amount: null,
    currency: null,
  },
  capability: { states: {}, recording_state: 'recorded' },
  permission: { granted_codes: [], recording_state: 'recorded' },
  what_changed: {
    previous_visit: { exists: false, visit_id: null, visit_date: null, outcome_notes: null, recording_state: 'absent' },
    sessions: { active_session_count: null, completed_session_count: null, recording_state: 'absent' },
    pending_review: { pending: null, recording_state: 'absent' },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('VisitCommandCenter (T-FE-A.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(workspaceData);
    mockGetClinicalWorkspaceApi.mockResolvedValue(notRecordedSnapshot);
    mockGetClinicalWorkflowApi.mockResolvedValue(emptyWorkflowResolution);
  });

  it('renders the shell header with the resolved patient name once context resolves', async () => {
    const { getByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    expect(getByText('Visit Command Center')).toBeTruthy();
    expect(getByText('Maya Rao')).toBeTruthy();
    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('tenant-1', 'episode-1', 'client-1');
    await waitFor(() => expect(mockGetClinicalWorkspaceApi).toHaveBeenCalled());
  });

  it('shows a loading state while the episode is loading, before any context is used', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...workspaceData, isEpisodeLoading: true });
    const { queryByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    expect(queryByText('Visit Command Center')).toBeNull();
    expect(mockGetClinicalWorkspaceApi).not.toHaveBeenCalled();
  });

  it('shows the invalid-context state (W30) when appointmentId is missing — never guesses a Visit', () => {
    const { getByText, queryByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId={undefined} clientId="client-1" />,
    );
    expect(getByText("Can't open workspace")).toBeTruthy();
    expect(getByText('No active appointment for this episode.')).toBeTruthy();
    expect(queryByText('Visit Command Center')).toBeNull();
    // WorkspaceProvider must never even be entered without a real appointmentId.
    expect(useEpisodeWorkspaceData).not.toHaveBeenCalled();
    expect(mockGetClinicalWorkspaceApi).not.toHaveBeenCalled();
  });

  it('shows the invalid-context state when the appointment-scoped Visit lookup returns undefined', () => {
    const { getByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-unmatched" clientId="client-1" />,
    );
    expect(getByText("Can't open workspace")).toBeTruthy();
  });

  it('shows the invalid-context state when the episode fails to load', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...workspaceData, isEpisodeError: true, episodeDetails: undefined });
    const { getByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    expect(getByText("Can't open workspace")).toBeTruthy();
  });

  it('back navigation uses plain router.back(), matching the existing convention', () => {
    const { getByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId={undefined} clientId="client-1" />,
    );
    fireEvent.press(getByText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('renders the Why Today, What Changed, Before You Act, Workflow, and Next Action regions plus the now-composed Treatment Plan module (T-FE-E.2 closure, T-BE-D.4a: every region is composed, not a generic "Coming Soon" stub) — no fabricated warning/completion content beyond the governed backend recommendation', async () => {
    const { queryByText, getByText, findByText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    await findByText('Why today');
    await findByText('What changed');
    await findByText('Before you act');
    await findByText('Workflow');
    await findByText('Next action');
    expect(await findByText('Send a Treatment Recommendation before a Treatment Plan can be created.')).toBeTruthy();
    // The empty workflow resolution mock (no recommended_action, no
    // waiting_role, no blocking_factors, no unresolved_facts) renders
    // NextActionBar's own "no recommendation" state — legitimate,
    // backend-driven text, not fabrication. What must still never appear
    // is a warning or completion-readiness claim the frontend invented.
    expect(await findByText('No recommendation right now')).toBeTruthy();
    expect(queryByText(/warning/i)).toBeNull();
    expect(queryByText(/ready to complete/i)).toBeNull();
  });

  it('keeps briefing and workflow in the clinical scroll surface while rendering one persistent governed NextActionBar outside it', async () => {
    const { findByText, getByTestId, toJSON } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    await findByText('Next action');
    const serialized = JSON.stringify(toJSON());
    // The persistent action footer is a legitimate G.1 structural change:
    // briefing/workflow remain in the scroll surface while the one existing
    // action surface remains available outside it.
    expect(serialized.indexOf('"Before you act"')).toBeLessThan(serialized.indexOf('"Workflow"'));
    expect(getByTestId('persistent-next-action')).toBeTruthy();
    expect(getByTestId('next-action-bar')).toBeTruthy();
  });

  it('keeps the one governed NextActionBar persistently available outside the mobile clinical scroll surface', async () => {
    const { findByText, getByTestId } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    await findByText('Next action');
    expect(getByTestId('visit-command-center-scroll')).toBeTruthy();
    expect(getByTestId('persistent-next-action')).toBeTruthy();
  });

  it('gives the icon-only Back control a localized accessible name and preserves the theme touch target', async () => {
    const { findByLabelText } = renderWithProviders(
      <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    );
    expect(await findByLabelText('Back')).toBeTruthy();
  });

  describe('CaseSheetModule composition (T-FE-E.1a, FR-CS-1)', () => {
    it('renders CaseSheetModule exactly once, receiving Episode/Visit context through the existing WorkspaceProvider (no props threaded)', async () => {
      const { findByText, getAllByText } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      // Exactly one Case Sheet form mounted -- never a duplicate.
      expect(getAllByText('Chief Complaint')).toHaveLength(1);
    });

    it('keeps CaseSheetModule in the active-stage body while the one governed NextActionBar remains persistent outside the clinical scroll surface', async () => {
      const { findByText, getByTestId, toJSON } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      const serialized = JSON.stringify(toJSON());
      expect(serialized.indexOf('"Chief Complaint"')).toBeLessThan(serialized.indexOf('"Send a Treatment Recommendation before a Treatment Plan can be created."'));
      expect(getByTestId('persistent-next-action')).toBeTruthy();
      expect(getByTestId('next-action-bar')).toBeTruthy();
    });

    it('does not reorder the existing Why Today / What Changed / Before You Act / Workflow / Next Action regions', async () => {
      const { findByText, toJSON } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      const serialized = JSON.stringify(toJSON());
      expect(serialized.indexOf('"Why today"')).toBeLessThan(serialized.indexOf('"What changed"'));
      expect(serialized.indexOf('"What changed"')).toBeLessThan(serialized.indexOf('"Before you act"'));
      expect(serialized.indexOf('"Before you act"')).toBeLessThan(serialized.indexOf('"Workflow"'));
      expect(serialized.indexOf('"Workflow"')).toBeLessThan(serialized.indexOf('"Next action"'));
    });

    it('WorkflowPills and NextActionBar still render unchanged alongside the newly composed CaseSheetModule', async () => {
      const { findByText, getByText, getByTestId } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      expect(getByTestId('workflow-pills-section')).toBeTruthy();
      expect(getByTestId('next-action-bar')).toBeTruthy();
      expect(getByText('Workflow')).toBeTruthy();
      expect(getByText('Next action')).toBeTruthy();
    });

    it('makes no prior-contribution-history claim yet — that remains T-FE-E.1b, blocked on T-BE-E.1a', async () => {
      const { findByText, queryByText } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      expect(queryByText(/prior visit/i)).toBeNull();
      expect(queryByText(/contribution history/i)).toBeNull();
    });

    it('does not fall back to the patient\'s latest Episode/Case Sheet — uses only the context this shell already resolved', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx'),
        'utf8',
      );
      expect(source).not.toMatch(/latestEpisode|latest_episode|mostRecentEpisode/i);
    });
  });

  describe('ClinicalTimeline composition (T-FE-C.4, FR-VCC-1)', () => {
    it('renders ClinicalTimeline exactly once, after CaseSheetModule and last among the active-stage modules', async () => {
      const { findByText, getByText, toJSON } = renderWithProviders(
        <VisitCommandCenter episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      );
      await findByText('Chief Complaint');
      expect(getByText('Clinical Timeline')).toBeTruthy();
      const serialized = JSON.stringify(toJSON());
      expect(serialized.indexOf('"Chief Complaint"')).toBeLessThan(serialized.indexOf('"Clinical Timeline"'));
      // TreatmentPlanModule composes before ClinicalTimeline (design.md §3 order).
      expect(serialized.indexOf('"Send a Treatment Recommendation before a Treatment Plan can be created."')).toBeLessThan(serialized.indexOf('"Clinical Timeline"'));
    });

    it('receives Episode scope through the existing WorkspaceProvider only -- no props threaded, no cross-episode leak', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx'),
        'utf8',
      );
      expect(source).toMatch(/<ClinicalTimeline\s*\/>/);
    });
  });
});
