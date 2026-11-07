/**
 * TreatmentPlanModule tests (T-FE-E.2 closure, T-BE-D.4a, FR-TP-1, FR-TR-1)
 *
 * NEW module, NEW test file. Covers every required state: no
 * Recommendation, load error/retry, ineligible Recommendation, eligible
 * Recommendation with no Plan, create in-progress/error, Plan exists
 * (every clinical-intent field rendered), and that no amendment/version
 * controls are ever shown.
 */
import React from 'react';
import { AxiosError } from 'axios';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreatmentPlanModule } from '../../../features/episodes/presentation/components/ConsultationSections/TreatmentPlanModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { getTreatmentOrderApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import {
  createTreatmentPlanApi,
  getTreatmentPlanByRecommendationApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentPlans.api';

let mockCurrentUser: any = { tenantId: 'tenant-1', permissions: [] };

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser, selectedClinicId: null }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'ayurveda' }),
  isAyurvedaClinic: (v: any) => v.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: () => false,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentOrders.api', () => ({
  getTreatmentOrderApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentPlans.api', () => ({
  getTreatmentPlanByRecommendationApi: jest.fn(),
  getTreatmentPlanApi: jest.fn(),
  createTreatmentPlanApi: jest.fn(),
}));
// treatmentOrders.repository.impl.ts also imports treatmentSheetsKeys from
// treatmentSheets.repository.impl.ts (cache-invalidation helper) -- that
// file imports treatmentSheets.api.ts -> axiosClient -> supabaseClient.
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
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB' },
      surface: { default: '#FFFFFF', elevated: '#FFFFFF', muted: '#F9FAFB', overlay: '#00000080' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6', strong: '#D1D5DB', focus: '#2563EB' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF', disabled: '#D1D5DB', inverse: '#FFFFFF', onPrimary: '#FFFFFF', link: '#2563EB' },
      feedback: {
        success: '#10B981', successLight: '#ECFDF5', warning: '#F59E0B', warningLight: '#FFFBEB',
        error: '#EF4444', errorLight: '#FEF2F2', info: '#3B82F6', infoLight: '#EFF6FF',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
      body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
      button: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    },
    radii: { small: 4, medium: 8, large: 16 },
    borderWidths: { default: 1 },
    sizes: { touchTarget: 44 },
  }),
}));

const baseWorkspaceData = {
  episodeDetails: {
    episode: { id: 'episode-1', title: 'Chronic Knee Pain', status: 'ACTIVE', start_date: '2026-06-01', end_date: null, description: null, client_id: 'client-1', client_name: 'Maya Rao', visits_count: 1, last_visit_date: null },
    documents: {
      casesheet: { exists: false, id: null, status: null, created_at: null },
      treatment_sheet: { exists: true, id: 'sheet-1', status: 'ORDERED', created_at: '2026-06-01T00:00:00Z' },
    },
    visits: [],
  },
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  casesheet: undefined,
  casesheetId: null,
  hasCasesheet: false,
  treatmentSheet: { id: 'sheet-1', status: 'ORDERED' },
  treatmentSheets: [],
  treatmentSheetId: 'sheet-1',
  hasTreatmentSheet: true,
  isTreatmentSheetLoading: false,
  isTreatmentSheetError: false,
  refetchTreatmentSheet: jest.fn(),
  visits: [],
  clientId: 'client-1',
  clientName: 'Maya Rao',
};

const eligibleOrder = {
  id: 'sheet-1', tenant_id: 'tenant-1', client_id: 'client-1', episode_id: 'episode-1',
  state: 'ORDERED', is_order: true, scheduling_status: 'unscheduled', documentation_status: 'DRAFT',
  planned_sessions: 7, frequency: 'daily', preferred_time_window: null, order_notes: null,
  recommended_therapy: 'Abhyanga', ordered_at: '2026-07-01T00:00:00Z', version: 1, rows: [],
  scheduled_count: 0, completed_count: 0,
};

const createdPlan = {
  id: 'plan-1', tenant_id: 'tenant-1', client_id: 'client-1', episode_id: 'episode-1',
  originating_recommendation_id: 'sheet-1', authoring_staff_id: 'staff-1',
  therapies: ['Abhyanga'], authorized_session_count: 7, frequency: 'daily',
  scheduling_intent: 'CONSECUTIVE', preferred_interval: null, sequencing_pattern: null,
  review_milestones: ['after session 4'], completion_criteria: 'Symptom relief',
  course_precautions: 'Avoid heat', therapist_requirements: 'Senior therapist',
  status: 'active_course', document_version: 1, superseded_by_plan_id: null,
  recorded_by_staff_id: 'staff-1', created_at: '2026-07-05T00:00:00Z',
};

let queryClient: QueryClient;

const renderModule = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
        <TreatmentPlanModule />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
};

describe('TreatmentPlanModule (T-FE-E.2 closure, T-BE-D.4a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { tenantId: 'tenant-1', permissions: ['treatment_sheet.order'] };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue(eligibleOrder);
    (getTreatmentPlanByRecommendationApi as jest.Mock).mockResolvedValue(null);
  });

  it('shows the honest empty state when there is no Recommendation yet', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, treatmentSheetId: null, hasTreatmentSheet: false });
    const { getByText, queryByText } = renderModule();
    expect(getByText('Treatment Plan')).toBeTruthy();
    expect(getByText('Send a Treatment Recommendation before a Treatment Plan can be created.')).toBeTruthy();
    expect(queryByText('Create Treatment Plan')).toBeNull();
  });

  it('shows a load error with retry when the order fetch fails', async () => {
    (getTreatmentOrderApi as jest.Mock).mockRejectedValue(new Error('network down'));
    const { findByText } = renderModule();
    await findByText('Failed to load data. Please try again.');
    await findByText('Retry');
  });

  it('shows the ineligible state for a DRAFT (not-yet-sent) order, offering no create action', async () => {
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue({ ...eligibleOrder, state: 'DRAFT', is_order: false });
    const { findByText, queryByText } = renderModule();
    await findByText('This Recommendation is not yet eligible for a Treatment Plan.');
    expect(queryByText('Create Treatment Plan')).toBeNull();
  });

  it('shows the ineligible state for a CANCELLED order', async () => {
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue({ ...eligibleOrder, state: 'CANCELLED' });
    const { findByText } = renderModule();
    await findByText('This Recommendation is not yet eligible for a Treatment Plan.');
  });

  it('shows the waiting-on-role state for an eligible Recommendation when the permission is absent', async () => {
    mockCurrentUser = { tenantId: 'tenant-1', permissions: [] };
    const { findByText, queryByText } = renderModule();
    await findByText('Treatment Plan approval is managed by another role.');
    expect(queryByText('Create Treatment Plan')).toBeNull();
  });

  it('offers the create action for an eligible Recommendation with no Plan yet', async () => {
    const { findByText } = renderModule();
    await findByText('This Recommendation is eligible. Create a Treatment Plan to record the intended course.');
    await findByText('Create Treatment Plan');
  });

  it('creating a Plan sends only caller-authored fields, deriving the Recommendation id from context', async () => {
    (createTreatmentPlanApi as jest.Mock).mockResolvedValue(createdPlan);
    const { findByText } = renderModule();
    fireEvent.press(await findByText('Create Treatment Plan'));

    await waitFor(() => expect(createTreatmentPlanApi).toHaveBeenCalled());
    const [payload] = (createTreatmentPlanApi as jest.Mock).mock.calls[0];
    expect(payload.originating_recommendation_id).toBe('sheet-1');
    expect(payload.client_id).toBe('client-1');
    expect(payload.episode_id).toBe('episode-1');
    expect(payload).not.toHaveProperty('tenant_id');
    expect(payload).not.toHaveProperty('authoring_staff_id');
  });

  it('shows a Plan-creation error without crashing, and does not silently retry', async () => {
    (createTreatmentPlanApi as jest.Mock).mockRejectedValue({ response: { status: 422, data: { detail: 'already exists' } } });
    const { findByText } = renderModule();
    fireEvent.press(await findByText('Create Treatment Plan'));
    await findByText('Could not create the Treatment Plan. Please try again.');
    expect(createTreatmentPlanApi).toHaveBeenCalledTimes(1);
  });

  it('maps a 404 (ineligible/not-found) creation response to the ineligible-recommendation message', async () => {
    (createTreatmentPlanApi as jest.Mock).mockRejectedValue(
      new AxiosError('not found', undefined, undefined, undefined, { status: 404, data: {} } as any),
    );
    const { findByText, getAllByText } = renderModule();
    fireEvent.press(await findByText('Create Treatment Plan'));
    await waitFor(() => expect(getAllByText('This Recommendation is not yet eligible for a Treatment Plan.').length).toBeGreaterThan(0));
  });

  it('renders every clinical-intent field once a Plan exists, and no amendment/version control', async () => {
    (getTreatmentPlanByRecommendationApi as jest.Mock).mockResolvedValue(createdPlan);
    const { findByText, queryByText } = renderModule();
    await findByText('Abhyanga');
    await findByText('7');
    await findByText('daily');
    await findByText('CONSECUTIVE');
    await findByText('after session 4');
    await findByText('Symptom relief');
    await findByText('Avoid heat');
    await findByText('Senior therapist');
    await findByText('Active course');
    expect(queryByText('Create Treatment Plan')).toBeNull();
    expect(queryByText(/amend/i)).toBeNull();
    expect(queryByText(/version/i)).toBeNull();
    expect(queryByText(/supersede/i)).toBeNull();
  });

  it('never reconstructs the Plan from schedule/session rows — Plan fields come only from the Plan response', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ConsultationSections/TreatmentPlanModule.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/scheduled_date|scheduled_time|\.rows\.map/);
  });
});

describe('architecture — TreatmentPlanModule composition', () => {
  it('does not call axios/datasource directly from the presentation module', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ConsultationSections/TreatmentPlanModule.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/from ['"].*treatmentPlans\.api['"]/);
    expect(source).not.toMatch(/useQuery\(|useMutation\(/);
    expect(source).not.toMatch(/'doctor'|'admin'|'therapist'/);
  });
});
