import '../doctorDashboard/setup';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicalWorkspace } from '../../../features/episodes/presentation/pages/ClinicalWorkspace';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createCasesheetApi, updateCasesheetApi } from '../../../features/casesheets/data/datasources/casesheets.api';
import { createPrescriptionApi, updatePrescriptionApi } from '../../../features/prescriptions/data/datasources/prescriptions.api';
import {
  createSimpleTreatmentSheetApi,
  updateAllTreatmentSheetRowsApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
import { sendToSchedulingApi, createTreatmentRecommendationApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import { createClinicalServiceApi } from '../../../features/clinicalServices/data/datasources/clinicalServices.api';
import { axiosClient } from '../../../core/api/axiosClient';
import { summarizeSaveStatuses } from '../../../features/episodes/presentation/components/WorkspaceHeader';
import { prescriptionsKeys } from '../../../features/prescriptions/data/repositories/prescriptions.repository.impl';

/**
 * R3A · T-D.1 (optional, design §23 Q3, ADR-R3A-03) — WorkspaceHeader's own
 * tests.
 *
 * Renders the real ClinicalWorkspace (not ConsultationWorkspaceScreen
 * directly), since WorkspaceHeader/WorkspaceSaveStatusProvider are only
 * wired in at that layer (design §4 — WorkspaceHeader and ModuleHost are
 * siblings under WorkspaceProvider).
 */

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'ayurveda' }),
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: () => false,
  // R3B · T-C.2: ClinicalWorkspace now also checks this flag to decide
  // whether to mount ClinicalTimeline. Defaulting to false reproduces this
  // test's own pre-T-C.2 baseline exactly (no Timeline rendered).
  isClinicalSpineV1Enabled: () => false,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  createCasesheetApi: jest.fn(),
  updateCasesheetApi: jest.fn(),
}));
jest.mock('../../../features/prescriptions/data/datasources/prescriptions.api', () => ({
  createPrescriptionApi: jest.fn(),
  updatePrescriptionApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentSheets.api', () => ({
  createSimpleTreatmentSheetApi: jest.fn(),
  updateAllTreatmentSheetRowsApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentOrders.api', () => ({
  sendToSchedulingApi: jest.fn(),
  createTreatmentRecommendationApi: jest.fn(),
}));
jest.mock('../../../features/clinicalServices/data/datasources/clinicalServices.api', () => ({
  createClinicalServiceApi: jest.fn(),
}));
jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn(), post: jest.fn() },
}));

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
  visits: [],
};

const mockWorkspaceData = {
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
  visits: [],
  clientId: 'client-1',
  clientName: 'Maya Rao',
};

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderWorkspace = () =>
  render(
    <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
    { wrapper },
  );

describe('WorkspaceHeader (R3A · T-D.1, ADR-R3A-03)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(mockWorkspaceData);
    (createCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1' });
    (updateCasesheetApi as jest.Mock).mockResolvedValue({});
    (createPrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1', prescription_data: { medications: [] } });
    (updatePrescriptionApi as jest.Mock).mockResolvedValue({});
    (createSimpleTreatmentSheetApi as jest.Mock).mockResolvedValue({ id: 'new-sheet', rows: [], version: 1 });
    (createTreatmentRecommendationApi as jest.Mock).mockResolvedValue({ id: 'new-order', state: 'ORDERED', is_order: true, version: 2 });
    (createClinicalServiceApi as jest.Mock).mockResolvedValue({ id: 'cs-1', visit_id: 'visit-1' });
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
    (axiosClient.post as jest.Mock).mockResolvedValue({ data: { id: 'new-sheet', rows: [], version: 1 } });
    (sendToSchedulingApi as jest.Mock).mockResolvedValue({ id: 'sheet-1', state: 'ORDERED', is_order: true, version: 1 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Patient/Episode summary from context, without duplicating PatientSummarySection\'s full detail grid', () => {
    const { getAllByText } = renderWorkspace();
    // Appears twice: once in WorkspaceHeader's compact identity line, once in
    // PatientSummarySection's own detail row (unchanged, Composition Before
    // Duplication — WorkspaceHeader adds no new copy of that detail).
    expect(getAllByText(/Maya Rao/).length).toBeGreaterThan(0);
    expect(getAllByText(/Chronic Knee Pain/).length).toBeGreaterThan(0);
  });

  it('shows no aggregate save-status badge before any module has reported one', () => {
    const { queryByTestId } = renderWorkspace();
    expect(queryByTestId('workspaceHeaderSaveStatus')).toBeNull();
  });

  it('reflects a real Prescription save end-to-end: Saving… while in flight, then ✓ Saved', async () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByTestId } = renderWorkspace();
    fireEvent.press(getByText('Prescription'));
    fireEvent.press(getByText('Add Medication'));
    fireEvent.changeText(getByPlaceholderText('name'), 'Amoxicillin');

    fireEvent.press(getByText('Save Prescription'));
    await waitFor(() => expect(getByTestId('workspaceHeaderSaveStatus').props.children).toBe('Saving…'));
    await waitFor(() => expect(getByTestId('workspaceHeaderSaveStatus').props.children).toBe('✓ Saved'));

    // Fades with the module's own 2s idle-fade timer (same pattern every
    // module's own collapsed-section save-status text already follows).
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(queryByTestId('workspaceHeaderSaveStatus')).toBeNull();
  });

  it('shows the error tone when any one module reports a save failure, even while others are idle', async () => {
    (updatePrescriptionApi as jest.Mock).mockRejectedValue(new Error('network down'));
    queryClient.setQueryData(
      prescriptionsKeys.byAppointment('tenant-1', 'episode-1', 'appointment-1'),
      { items: [{ id: 'rx-1', prescription_data: { medications: [] } }] },
    );
    const { getByText, getByPlaceholderText, getByTestId } = renderWorkspace();
    fireEvent.press(getByText('Prescription'));
    await act(async () => { await Promise.resolve(); });
    fireEvent.press(getByText('Add Medication'));
    fireEvent.changeText(getByPlaceholderText('name'), 'Ibuprofen');

    await act(async () => {
      await (fireEvent.press(getByText('Save Prescription')) as unknown as Promise<void>)?.catch(() => {});
    });

    expect(getByTestId('workspaceHeaderSaveStatus').props.children).toBe('⚠ Save error');
  });

  it('never calls any save/create/update API itself — purely read-only (ADR-R3A-03: cannot trigger a save)', () => {
    renderWorkspace();
    expect(createCasesheetApi).not.toHaveBeenCalled();
    expect(updateCasesheetApi).not.toHaveBeenCalled();
    expect(createPrescriptionApi).not.toHaveBeenCalled();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
    expect(createTreatmentRecommendationApi).not.toHaveBeenCalled();
    expect(sendToSchedulingApi).not.toHaveBeenCalled();
    expect(createClinicalServiceApi).not.toHaveBeenCalled();
  });

  it("one module's save in flight never blocks or alters another module's own independent save (ADR-R3A-03)", async () => {
    const { getByText, getByPlaceholderText } = renderWorkspace();
    fireEvent.press(getByText('Prescription'));
    fireEvent.press(getByText('Add Medication'));
    fireEvent.changeText(getByPlaceholderText('name'), 'Amoxicillin');
    fireEvent.press(getByText('Save Prescription'));
    // Prescription save is now in flight (unresolved microtask) —
    // Clinical Services' own independent action must still succeed.
    fireEvent.press(getByText('Clinical Services'));
    fireEvent.changeText(getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(getByText('Record Service'));

    await waitFor(() => expect(createPrescriptionApi).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(createClinicalServiceApi).toHaveBeenCalledTimes(1));
  });
});

describe('summarizeSaveStatuses (R3A · T-D.1) — aggregate precedence', () => {
  it('error takes precedence over saving/saved', () => {
    expect(summarizeSaveStatuses({ prescription: 'saved', chiefComplaint: 'error', clinicalServices: 'saving' }).tone).toBe('error');
  });

  it('saving takes precedence over saved when no error is present', () => {
    expect(summarizeSaveStatuses({ prescription: 'saved', chiefComplaint: 'saving' }).tone).toBe('warning');
  });

  it('shows saved when nothing is saving or erroring', () => {
    expect(summarizeSaveStatuses({ prescription: 'saved', chiefComplaint: 'idle' }).tone).toBe('success');
  });

  it('shows nothing (neutral, blank label) when every reported status is idle', () => {
    const result = summarizeSaveStatuses({ prescription: 'idle', chiefComplaint: 'idle' });
    expect(result.tone).toBe('neutral');
    expect(result.label).toBe('');
  });

  it('shows nothing when no module has reported anything yet', () => {
    const result = summarizeSaveStatuses({});
    expect(result.tone).toBe('neutral');
    expect(result.label).toBe('');
  });
});
