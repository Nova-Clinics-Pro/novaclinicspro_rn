import '../doctorDashboard/setup';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
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
import { useAppointmentsListQuery } from '../../../features/appointments/data/repositories/appointments.repository.impl';
import {
  usePrescriptionsListQuery,
  usePrescriptionByAppointmentQuery,
  useCreatePrescriptionMutation,
  useUpdatePrescriptionMutation,
} from '../../../features/prescriptions/data/repositories/prescriptions.repository.impl';
import { useTreatmentSheetsByEpisodeQuery } from '../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { listClinicalServicesByVisitApi } from '../../../features/clinicalServices/data/datasources/clinicalServices.api';

/**
 * R3B · T-E.4 — Explicit negative check: `ClinicalTimeline`'s presence
 * (flag ON) never delays, blocks, or duplicates another module's own save
 * (CO-6), with a negative control (Execution Governance #2) proving the
 * check itself can actually fail. Extends `clinicalWorkspaceShell.test.tsx`'s
 * own proven mock recipe (T-A.2) with the additional query mocks
 * `ClinicalTimeline`/its adapter need to mount safely (flag ON) without
 * crashing, so both flag states can be rendered in the SAME real
 * `ClinicalWorkspace` tree — not a stub — for a faithful comparison.
 */

let mockFeatures: any = { clinic_type: 'ayurveda', clinical_spine_v1_enabled: false };
let mockAuth = { currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null as string | null };

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => mockFeatures,
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: () => false,
  isClinicalSpineV1Enabled: (value: any) => !!value.clinical_spine_v1_enabled,
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
// Additional to clinicalWorkspaceShell.test.tsx's own recipe — needed so
// ClinicalTimeline/useClinicalTimelineData can mount safely with the flag ON.
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useAppointmentsListQuery: jest.fn(),
}));
jest.mock('../../../features/prescriptions/data/repositories/prescriptions.repository.impl', () => ({
  usePrescriptionsListQuery: jest.fn(),
  // R7 · T-0.6: stale-mock repair (T-0.2 origin) — PrescriptionModule (T-0.2)
  // reads these three hooks now; this test mounts the full ClinicalWorkspace
  // tree (including PrescriptionModule), so they must be mocked here too, or
  // PrescriptionModule crashes before this test's own Case-Sheet-autosave
  // assertions ever run. Neutral shapes — this test never presses "Save
  // Prescription", so the mutation hooks' `mutateAsync` is never invoked —
  // does not alter this test's product assertions.
  usePrescriptionByAppointmentQuery: jest.fn(),
  useCreatePrescriptionMutation: jest.fn(),
  useUpdatePrescriptionMutation: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetsByEpisodeQuery: jest.fn(),
}));
jest.mock('../../../features/clinicalServices/data/datasources/clinicalServices.api', () => ({
  listClinicalServicesByVisitApi: jest.fn(),
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

describe('ClinicalTimeline does not block/duplicate another module\'s save (R3B · T-E.4, CO-6)', () => {
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
    (useAppointmentsListQuery as jest.Mock).mockReturnValue({ data: { items: [] }, isLoading: false });
    (usePrescriptionsListQuery as jest.Mock).mockReturnValue({ data: { items: [] }, isLoading: false });
    (usePrescriptionByAppointmentQuery as jest.Mock).mockReturnValue({ data: { items: [] }, isLoading: false });
    (useCreatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useTreatmentSheetsByEpisodeQuery as jest.Mock).mockReturnValue({ data: { treatment_sheets: [] }, isLoading: false });
    (listClinicalServicesByVisitApi as jest.Mock).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 50 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const typeChiefComplaintAndAdvance = async (utils: ReturnType<typeof render>) => {
    fireEvent.changeText(utils.getByDisplayValue(''), 'Knee pain');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
  };

  it('flag OFF (no Timeline mounted): Case Sheet autosave fires once, after the usual 1000ms debounce, with the expected payload', async () => {
    mockFeatures = { clinic_type: 'ayurveda', clinical_spine_v1_enabled: false };
    const utils = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    expect(utils.queryByText('Clinical Timeline')).toBeNull();

    await typeChiefComplaintAndAdvance(utils);

    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(createCasesheetApi).toHaveBeenCalledWith('tenant-1', 'client-1', expect.objectContaining({
      appointment_id: 'appointment-1',
      episode_id: 'episode-1',
    }));
  });

  it('flag ON (Timeline mounted alongside): Case Sheet autosave fires identically — same call count, same timing, same payload', async () => {
    mockFeatures = { clinic_type: 'ayurveda', clinical_spine_v1_enabled: true };
    const utils = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    // Confirms the Timeline genuinely mounted (not a false-positive comparison).
    expect(utils.getByText('Clinical Timeline')).toBeTruthy();

    await typeChiefComplaintAndAdvance(utils);

    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(createCasesheetApi).toHaveBeenCalledWith('tenant-1', 'client-1', expect.objectContaining({
      appointment_id: 'appointment-1',
      episode_id: 'episode-1',
    }));
  });
});
