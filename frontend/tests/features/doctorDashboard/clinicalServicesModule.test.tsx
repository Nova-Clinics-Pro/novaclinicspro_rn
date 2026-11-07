import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicalServicesModule } from '../../../features/episodes/presentation/components/ConsultationSections/ClinicalServicesModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createClinicalServiceApi } from '../../../features/clinicalServices/data/datasources/clinicalServices.api';
import { clinicalServicesKeys } from '../../../features/clinicalServices/data/repositories/clinicalServices.repository.impl';

// R3A · T-B.4 — ClinicalServicesModule's own tests. This is the first
// frontend surface for Clinical Services (Phase 2 backend, design §9.F) —
// there is no prior hook/screen state to migrate from, unlike
// CaseSheetModule/PrescriptionModule/TreatmentRecommendationModule.
//
// Deliberately does NOT import tests/features/doctorDashboard/setup, same
// reason as the other module test files — its mocked useQueryClient()
// would defeat the invalidation-spy tests below.

let mockFeatures: any = { clinic_type: 'ayurveda', freshness_v1_enabled: false };

jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => mockFeatures,
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: (value: any) => !!value.freshness_v1_enabled,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/clinicalServices/data/datasources/clinicalServices.api', () => ({
  createClinicalServiceApi: jest.fn(),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', main: '#2563EB', onPrimary: '#FFFFFF', soft: '#EFF6FF' },
      secondary: { default: '#7C3AED', onSecondary: '#FFFFFF' },
      background: { default: '#F9FAFB', elevated: '#FFFFFF', muted: '#F3F4F6' },
      surface: { default: '#FFFFFF', elevated: '#FFFFFF', muted: '#F9FAFB' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6', focus: '#2563EB' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF', link: '#2563EB', onPrimary: '#FFFFFF' },
      feedback: {
        success: '#10B981', successLight: '#ECFDF5', warning: '#F59E0B', warningLight: '#FFFBEB',
        error: '#EF4444', errorLight: '#FEF2F2', info: '#3B82F6', infoLight: '#EFF6FF',
      },
      common: { white: '#FFFFFF' },
      grey: { 50: '#F9FAFB', 400: '#9CA3AF' },
      success: { main: '#10B981' },
      info: { main: '#3B82F6' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h5: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
      h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
      subtitle1: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
      subtitle2: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
      body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
      body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
      button: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    },
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const baseWorkspaceData = {
  episodeDetails: {
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
  },
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  casesheet: undefined,
  casesheetId: null,
  hasCasesheet: false,
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

const CLINICAL_SERVICE_RESPONSE = {
  id: 'cs-1',
  tenant_id: 'tenant-1',
  visit_id: 'visit-1',
  service_type: 'Abhyanga',
  description: null,
  delivered_by_staff_id: null,
  delivered_at: '2026-07-03T10:00:00Z',
  created_at: '2026-07-03T10:00:00Z',
};

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
      <WorkspaceSaveStatusProvider>{children}</WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  </QueryClientProvider>
);

const renderModule = () =>
  render(
    <ClinicalServicesModule expandedSections={new Set(['clinicalServices'])} onToggleSection={jest.fn()} />,
    { wrapper },
  );

describe('ClinicalServicesModule (R3A · T-B.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: false };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (createClinicalServiceApi as jest.Mock).mockResolvedValue(CLINICAL_SERVICE_RESPONSE);
  });

  it('records a Clinical Service against the active appointment via the create endpoint', async () => {
    const utils = renderModule();
    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(utils.getByText('Record Service'));

    await waitFor(() =>
      expect(createClinicalServiceApi).toHaveBeenCalledWith('tenant-1', {
        appointment_id: 'appointment-1',
        service_type: 'Abhyanga',
        description: undefined,
      }),
    );
  });

  it('disables Record Service until a service type is entered', () => {
    const utils = renderModule();
    expect(utils.getByText('Record Service').props.accessibilityState?.disabled ?? true).toBeTruthy();
  });

  it('shows the newly recorded service in the session list and clears the draft', async () => {
    const utils = renderModule();
    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(utils.getByText('Record Service'));

    await waitFor(() => expect(utils.getByText('Abhyanga')).toBeTruthy());
    expect(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing').props.value).toBe('');
  });

  it('supports recording more than one service in the same session', async () => {
    (createClinicalServiceApi as jest.Mock)
      .mockResolvedValueOnce({ ...CLINICAL_SERVICE_RESPONSE, id: 'cs-1', service_type: 'Abhyanga' })
      .mockResolvedValueOnce({ ...CLINICAL_SERVICE_RESPONSE, id: 'cs-2', service_type: 'Shirodhara' });
    const utils = renderModule();

    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(utils.getByText('Record Service'));
    await waitFor(() => expect(utils.getByText('Abhyanga')).toBeTruthy());

    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Shirodhara');
    fireEvent.press(utils.getByText('Record Service'));
    await waitFor(() => expect(utils.getByText('Shirodhara')).toBeTruthy());

    expect(createClinicalServiceApi).toHaveBeenCalledTimes(2);
  });

  it('shows a save confirmation that fades back to idle 2s later (same pattern as PrescriptionModule)', async () => {
    jest.useFakeTimers();
    const utils = renderModule();
    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(utils.getByText('Record Service'));
    await waitFor(() => expect(utils.getByText('✓ Recorded')).toBeTruthy());

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(utils.queryByText('✓ Recorded')).toBeNull();
    jest.useRealTimers();
  });

  it('preserves the draft and shows an error message when recording fails', async () => {
    (createClinicalServiceApi as jest.Mock).mockRejectedValue(new Error('service record failed'));
    const utils = renderModule();
    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');

    // fireEvent.press() returns the pressed handler's own return value (RTL's
    // fire-event.js) — awaiting/catching it here avoids an unhandled
    // rejection without changing any production code, same technique used
    // in prescriptionModule.test.tsx.
    await act(async () => {
      await (fireEvent.press(utils.getByText('Record Service')) as unknown as Promise<void>)?.catch(() => {});
    });

    expect(utils.getByText('Save failed')).toBeTruthy();
    expect(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing').props.value).toBe('Abhyanga');
  });

  it('does NOT record anything on unmount, even with an unsaved draft (no debounce/versioning concept, unlike Prescription/Case Sheet)', async () => {
    const utils = renderModule();
    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    utils.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(createClinicalServiceApi).not.toHaveBeenCalled();
  });

  describe('save invalidation (flag ON)', () => {
    beforeEach(() => {
      mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: true };
    });

    it('invalidates the Clinical Services list query on a successful record', async () => {
      const utils = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
      fireEvent.press(utils.getByText('Record Service'));

      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: clinicalServicesKeys.lists() }),
      );
    });
  });

  it('flag OFF: recording still calls the API, but does NOT invalidate the query cache', async () => {
    const utils = renderModule();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.changeText(utils.getByPlaceholderText('e.g. Abhyanga, Wound Dressing'), 'Abhyanga');
    fireEvent.press(utils.getByText('Record Service'));

    await waitFor(() => expect(createClinicalServiceApi).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
