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

/**
 * R3A · T-C.2 — Verify a hard reload of ClinicalWorkspace restores the same
 * context (design §9.G, FR-E3, AC-2).
 *
 * "Hard reload" here means ClinicalWorkspace itself is destroyed and
 * recreated with the SAME route params — exactly what consultation.tsx's
 * `key={freshnessEnabled ? undefined : \`${episodeId}:${appointmentId}\`}`
 * (T-A.6, RB-1) does when the freshness flag is OFF, and what a real
 * navigate-away-and-back would do regardless of the flag. This is
 * distinct from clinicalWorkspaceShell.test.tsx (T-A.2), which only proves
 * a SINGLE mount renders correctly — it never exercises an unmount+remount
 * cycle. It's also distinct from persistentContextContinuity.test.tsx
 * (T-C.1), which proves context is STABLE (same object) across an
 * in-component toggle that never reaches WorkspaceProvider; a hard reload
 * is the opposite case — WorkspaceProvider genuinely is destroyed and
 * recreated, so a NEW context object is expected and correct. What must be
 * proven instead is that the identifiers survive the reload unchanged and
 * the workspace re-populates with the real Episode/Visit data — not an
 * empty/default state — using the same QueryClient instance a real
 * in-app reload would still have (QueryClientProvider sits above the route
 * stack, not remounted per-navigation).
 */

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

describe('Workspace reload restoration (R3A · T-C.2, FR-E3/AC-2)', () => {
  // Deliberately created ONCE per test (not per render) — a real app
  // navigate-away-and-back keeps the same QueryClient instance, since it
  // lives above the route stack; only ClinicalWorkspace itself is
  // destroyed/recreated by the route's key-based remount (T-A.6).
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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

  it('re-resolves to the identical tenantId/episodeId/appointmentId/clientId after a hard reload with the same route params', () => {
    const first = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('tenant-1', 'episode-1', 'client-1');
    const callsBeforeReload = (useEpisodeWorkspaceData as jest.Mock).mock.calls.length;

    // Simulate a hard reload: destroy ClinicalWorkspace entirely, then
    // recreate it with the exact same route params the URL still carries
    // (the same simulation T-A.6's key-based remount performs when the
    // freshness flag is OFF).
    first.unmount();
    render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );

    const callsAfterReload = (useEpisodeWorkspaceData as jest.Mock).mock.calls.slice(callsBeforeReload);
    expect(callsAfterReload.length).toBeGreaterThan(0);
    callsAfterReload.forEach(([tenantId, episodeId, clientId]) => {
      expect(tenantId).toBe('tenant-1');
      expect(episodeId).toBe('episode-1');
      expect(clientId).toBe('client-1');
    });
  });

  it('shows the real Episode/Visit data after a hard reload — not an empty or default state', () => {
    const first = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    expect(first.getAllByText('Chronic Knee Pain').length).toBe(2);

    first.unmount();
    const second = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );

    // Same real episode content, not a blank/loading/default screen — the
    // reload re-populated from the same identifiers, it didn't reset to
    // nothing.
    expect(second.getAllByText('Chronic Knee Pain').length).toBe(2);
    expect(second.getByText('Clinical Notes')).toBeTruthy();
    expect(second.getByText('Prescription')).toBeTruthy();
    expect(second.getByText('Treatment Recommendation')).toBeTruthy();
  });

  it('a reload with DIFFERENT route params (a genuine case switch, not a reload) re-resolves to the new identifiers, not the old ones', () => {
    const first = render(
      <ClinicalWorkspace episodeId="episode-1" appointmentId="appointment-1" clientId="client-1" />,
      { wrapper },
    );
    first.unmount();

    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
      ...mockWorkspaceData,
      episodeDetails: {
        ...episodeDetails,
        episode: { ...episodeDetails.episode, id: 'episode-2', title: 'New Ankle Sprain', client_id: 'client-2' },
      },
      clientId: 'client-2',
      clientName: 'Rohan Iyer',
    });

    const second = render(
      <ClinicalWorkspace episodeId="episode-2" appointmentId="appointment-2" clientId="client-2" />,
      { wrapper },
    );

    expect(useEpisodeWorkspaceData).toHaveBeenCalledWith('tenant-1', 'episode-2', 'client-2');
    expect(second.getAllByText('New Ankle Sprain').length).toBe(2);
    expect(second.queryByText('Chronic Knee Pain')).toBeNull();
  });
});
