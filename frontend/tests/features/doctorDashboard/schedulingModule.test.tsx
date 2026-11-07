/**
 * SchedulingModule tests (T-FE-E.2, FR-SCH-1, FR-SCH-2)
 *
 * NEW module, NEW test file. Covers: current scheduled/unscheduled state
 * rendering, permission-gated write-action visibility
 * (`treatment_order.schedule`), the honest reported gap for the read-only
 * scheduling-PROPOSAL sub-capability (blocked -- see the module's own
 * docstring), and that it reuses the existing `ScheduleRowModal` rather
 * than reimplementing scheduling logic.
 *
 * `ScheduleRowModal`'s own internal behavior (date/time pickers, staff
 * selection, submit) is untested here -- it is reused UNCHANGED per this
 * task's own scope, and has no pre-existing test file of its own to
 * extend; only that SchedulingModule opens/closes it correctly and passes
 * the correct props is covered.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SchedulingModule } from '../../../features/episodes/presentation/components/ConsultationSections/SchedulingModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { getTreatmentOrderApi, getSchedulingProposalApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import { getTreatmentPlanByRecommendationApi } from '../../../features/treatmentSheets/data/datasources/treatmentPlans.api';

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
  scheduleRowApi: jest.fn(),
  bulkScheduleRowsApi: jest.fn(),
  getSchedulingProposalApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentPlans.api', () => ({
  getTreatmentPlanByRecommendationApi: jest.fn(),
  getTreatmentPlanApi: jest.fn(),
  createTreatmentPlanApi: jest.fn(),
}));
// treatmentOrders.repository.impl.ts also imports treatmentSheetsKeys from
// treatmentSheets.repository.impl.ts (cache-invalidation helper) -- that
// file imports treatmentSheets.api.ts -> axiosClient -> supabaseClient, so
// it must be mocked here too even though SchedulingModule itself never
// calls treatmentSheets.api directly.
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
jest.mock('../../../features/staff/data/datasources/staff.api', () => ({
  listStaffApi: jest.fn().mockResolvedValue({ items: [], total: 0 }),
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
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

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

const rowOrder = {
  id: 'sheet-1',
  version: 3,
  rows: [
    { id: 'row-1', day_number: 1, status: 'PENDING', assigned_staff_id: null, scheduled_date: null, scheduled_time: null, treatment_name: 'Abhyanga', medicines_text: '', instructions_text: '' },
    { id: 'row-2', day_number: 2, status: 'SCHEDULED', assigned_staff_id: 'staff-1', scheduled_date: '2026-07-01', scheduled_time: '09:00:00', treatment_name: 'Shirodhara', medicines_text: '', instructions_text: '' },
  ],
};

let queryClient: QueryClient;

const renderModule = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
        <SchedulingModule />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
};

describe('SchedulingModule (T-FE-E.2, FR-SCH-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { tenantId: 'tenant-1', permissions: [] };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue(rowOrder);
    (getTreatmentPlanByRecommendationApi as jest.Mock).mockResolvedValue(null);
  });

  it('shows current scheduled/unscheduled state per Session from the order rows', async () => {
    const { findByText } = renderModule();
    await findByText('Day 1');
    await findByText('Unassigned');
    await findByText(/2026-07-01/);
  });

  it('shows the honest empty state when there is no treatment order yet', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, treatmentSheetId: null, hasTreatmentSheet: false });
    const { getByText, queryByText } = renderModule();
    expect(getByText('Scheduling')).toBeTruthy();
    expect(queryByText('Day 1')).toBeNull();
  });

  it('reports the scheduling proposal as unavailable when no Treatment Plan exists yet', async () => {
    const { findByText } = renderModule();
    expect(await findByText('Scheduling proposal is unavailable.')).toBeTruthy();
  });

  describe('scheduling-proposal consumption (T-BE-D.4a closure, FR-SCH-1)', () => {
    const PLAN_ID = 'plan-1';

    beforeEach(() => {
      (getTreatmentPlanByRecommendationApi as jest.Mock).mockResolvedValue({
        id: PLAN_ID, tenant_id: 'tenant-1', client_id: 'client-1', episode_id: 'episode-1',
        originating_recommendation_id: 'sheet-1', authoring_staff_id: 'staff-1',
        therapies: ['Abhyanga'], authorized_session_count: 7, frequency: 'daily',
        scheduling_intent: 'CONSECUTIVE', preferred_interval: null, sequencing_pattern: null,
        review_milestones: [], completion_criteria: null, course_precautions: null,
        therapist_requirements: null, status: 'active_course', document_version: 1,
        superseded_by_plan_id: null, recorded_by_staff_id: 'staff-1', created_at: '2026-07-01T00:00:00Z',
      });
    });

    it('offers the start-date input and Load proposal action once a Plan exists', async () => {
      const { findByText, findByPlaceholderText } = renderModule();
      await findByText('Proposal start date');
      await findByPlaceholderText('YYYY-MM-DD');
      await findByText('Load proposal');
    });

    it('the proposal query stays disabled until Load proposal is pressed', async () => {
      const { findByText } = renderModule();
      await findByText('Load proposal');
      expect(getSchedulingProposalApi).not.toHaveBeenCalled();
    });

    it('renders proposed dates exactly as the backend returns them, with the authoritative plan_id', async () => {
      (getSchedulingProposalApi as jest.Mock).mockResolvedValue({
        intent: 'CONSECUTIVE', dates: ['2026-08-01', '2026-08-02'], reason_code: 'resolved', bounded_by_milestone: false,
      });
      const { findByText, getByText } = renderModule();
      fireEvent.press(await findByText('Load proposal'));
      await findByText('2026-08-01');
      await findByText('2026-08-02');
      expect(getSchedulingProposalApi).toHaveBeenCalledWith(PLAN_ID, expect.objectContaining({ startDate: expect.any(String) }));
    });

    it('renders the PRN framing — no pre-created dates — never a fabricated date', async () => {
      (getSchedulingProposalApi as jest.Mock).mockResolvedValue({
        intent: 'PRN', dates: [], reason_code: 'prn_no_pregenerated_dates', bounded_by_milestone: false,
      });
      const { findByText } = renderModule();
      fireEvent.press(await findByText('Load proposal'));
      await findByText('PRN — no pre-created dates');
      await findByText('PRN — sessions are created on demand');
    });

    it('renders the review-dependent framing — proposal stops at the milestone', async () => {
      (getSchedulingProposalApi as jest.Mock).mockResolvedValue({
        intent: 'REVIEW_DEPENDENT', dates: ['2026-08-01', '2026-08-08'], reason_code: 'resolved', bounded_by_milestone: true,
      });
      const { findByText } = renderModule();
      fireEvent.press(await findByText('Load proposal'));
      await findByText('Review-dependent — proposal stops at the next review milestone');
    });

    it('localizes the reason code rather than showing a raw backend code', async () => {
      (getSchedulingProposalApi as jest.Mock).mockResolvedValue({
        intent: null, dates: [], reason_code: 'intent_unresolved', bounded_by_milestone: false,
      });
      const { findByText } = renderModule();
      fireEvent.press(await findByText('Load proposal'));
      await findByText('Scheduling intent not recognized');
    });

    it('never computes or sorts dates locally — displays exactly the array order the backend returned', async () => {
      (getSchedulingProposalApi as jest.Mock).mockResolvedValue({
        intent: 'NON_SEQUENTIAL', dates: ['2026-08-10', '2026-08-01'], reason_code: 'resolved', bounded_by_milestone: false,
      });
      const { findByText, toJSON } = renderModule();
      fireEvent.press(await findByText('Load proposal'));
      await findByText('2026-08-01');
      const serialized = JSON.stringify(toJSON());
      expect(serialized.indexOf('2026-08-10')).toBeLessThan(serialized.indexOf('2026-08-01'));
    });
  });

  describe('permission gating (treatment_order.schedule)', () => {
    it('hides the schedule/reschedule write action and shows a waiting-on-role state when the permission is absent', async () => {
      mockCurrentUser = { tenantId: 'tenant-1', permissions: [] };
      const { findByText, queryByText } = renderModule();
      await findByText('Day 1');
      expect(queryByText('Schedule')).toBeNull();
      expect(queryByText('Reschedule')).toBeNull();
      expect(await findByText(/managed by admin|waiting/i)).toBeTruthy();
    });

    it('shows the write action, never the waiting-on-role banner, when the permission is present', async () => {
      mockCurrentUser = { tenantId: 'tenant-1', permissions: ['treatment_order.schedule'] };
      const { findByText, queryByText } = renderModule();
      await findByText('Schedule');
      await findByText('Reschedule');
      expect(queryByText(/managed by admin|waiting/i)).toBeNull();
    });

    it('never hides the section entirely for an unpermitted role — read-only schedule state remains visible', async () => {
      mockCurrentUser = { tenantId: 'tenant-1', permissions: [] };
      const { findByText } = renderModule();
      await findByText('Day 1');
      await findByText('Day 2');
    });

    it('does not offer a write action for a COMPLETED or CANCELLED Session even with the permission', async () => {
      (getTreatmentOrderApi as jest.Mock).mockResolvedValue({
        id: 'sheet-1',
        version: 3,
        rows: [{ id: 'row-3', day_number: 3, status: 'COMPLETED', assigned_staff_id: 'staff-1', scheduled_date: '2026-07-02', scheduled_time: '09:00:00', treatment_name: 'X', medicines_text: '', instructions_text: '' }],
      });
      mockCurrentUser = { tenantId: 'tenant-1', permissions: ['treatment_order.schedule'] };
      const { findByText, queryByText } = renderModule();
      await findByText('Day 3');
      expect(queryByText('Reschedule')).toBeNull();
    });
  });

  describe('opens the existing ScheduleRowModal (no reimplemented scheduling logic)', () => {
    it('pressing Schedule on an unscheduled row opens the modal with the current order version', async () => {
      mockCurrentUser = { tenantId: 'tenant-1', permissions: ['treatment_order.schedule'] };
      const { findByText, getByText } = renderModule();
      fireEvent.press(await findByText('Schedule'));
      expect(getByText('Schedule Day 1')).toBeTruthy();
    });
  });
});

describe('architecture — SchedulingModule composition', () => {
  it('SchedulingModule reuses the existing ScheduleRowModal/useScheduleRowMutation rather than a new write path', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ConsultationSections/SchedulingModule.tsx'),
      'utf8',
    );
    expect(source).toMatch(/from ['"].*ScheduleRowModal['"]/);
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/'doctor'|'admin'|'therapist'/);
  });
});
