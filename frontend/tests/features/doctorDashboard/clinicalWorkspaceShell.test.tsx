import '../doctorDashboard/setup';
import React from 'react';
import { render } from '@testing-library/react-native';
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
import { axiosClient } from '../../../core/api/axiosClient';

// R3A · T-A.2 — ClinicalWorkspace is a shell wrapping the unchanged
// ConsultationWorkspaceScreen in WorkspaceProvider (design §9.A). This test
// proves the doctor's rendered experience is identical to rendering
// ConsultationWorkspaceScreen directly (as consultation.tsx did before this
// task) — zero visible behavior change, since no module reads from context
// yet.

let mockAuth = { currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null as string | null };
// The workspace host mounts WorkspaceExitGuard, which takes its navigation primitives from the public
// 'expo-router/react-navigation' entry. This test renders the host WITHOUT a navigator, so a minimal stand-in
// (no NavigationContext => the guard stays inert) keeps the real, reanimated-dependent module out of the test.
jest.mock('expo-router/react-navigation', () => ({
  NavigationContext: jest.requireActual('react').createContext(undefined),
  usePreventRemove: jest.fn(),
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'ayurveda' }),
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: () => false,
  // R3B · T-C.2: ClinicalWorkspace now also checks this flag to decide
  // whether to mount ClinicalTimeline. Defaulting to false here reproduces
  // this test's own pre-T-C.2 baseline exactly (no Timeline rendered).
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

describe('ClinicalWorkspace shell (R3A · T-A.2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockAuth = { currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(mockWorkspaceData);
    (createCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1' });
    (updateCasesheetApi as jest.Mock).mockResolvedValue({});
    (createPrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1' });
    (updatePrescriptionApi as jest.Mock).mockResolvedValue({});
    (createSimpleTreatmentSheetApi as jest.Mock).mockResolvedValue({ id: 'new-sheet', rows: [], version: 1 });
    (createTreatmentRecommendationApi as jest.Mock).mockResolvedValue({ id: 'new-order', state: 'ORDERED', is_order: true, version: 2 });
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
    (axiosClient.post as jest.Mock).mockResolvedValue({ data: { id: 'new-sheet', rows: [], version: 1 } });
    (sendToSchedulingApi as jest.Mock).mockResolvedValue({ id: 'sheet-1', state: 'ORDERED', is_order: true, version: 1 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the SAME consultation experience as rendering ConsultationWorkspaceScreen directly — same episode title, same sections', () => {
    const { getAllByText, getByText } = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    // Rendered twice today (header title + PatientSummarySection's "Treatment
    // Case" row) — both expected, unchanged from ConsultationWorkspaceScreen.
    expect(getAllByText('Chronic Knee Pain').length).toBe(2);
    expect(getByText('Clinical Notes')).toBeTruthy();
    expect(getByText('Prescription')).toBeTruthy();
    expect(getByText('Treatment Recommendation')).toBeTruthy();
  });

  it('passes episodeId/appointmentId/clientId through to ConsultationWorkspaceScreen unchanged (via the same useEpisodeWorkspaceData call it always made)', () => {
    render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    // useConsultationWorkspace.ts's own internal call to useEpisodeWorkspaceData
    // is completely unmodified by this task — same identifiers, same shape.
    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('tenant-1', 'episode-1', 'client-1');
  });

  it('resolves tenantId via selectedClinicId first, falling back to currentUser.tenantId — matching ConsultationWorkspaceScreen\'s own existing resolution', () => {
    mockAuth = { currentUser: { tenantId: 'tenant-1' }, selectedClinicId: 'tenant-selected' };
    render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('tenant-selected', 'episode-1', 'client-1');
  });
});
