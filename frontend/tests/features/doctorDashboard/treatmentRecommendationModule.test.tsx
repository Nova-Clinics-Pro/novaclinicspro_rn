import React, { createRef } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  TreatmentRecommendationModule,
  TreatmentRecommendationModuleHandle,
} from '../../../features/episodes/presentation/components/ConsultationSections/TreatmentRecommendationModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import {
  createSimpleTreatmentSheetApi,
  updateAllTreatmentSheetRowsApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
import {
  sendToSchedulingApi,
  createTreatmentRecommendationApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import { listTreatmentsApi } from '../../../features/treatments/data/datasources/treatments.api';
import { treatmentOrderKeys } from '../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { treatmentSheetsKeys } from '../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl';

// R3A · T-B.3 — TreatmentRecommendationModule's own tests. Migrated from
// useConsultationWorkspace.test.tsx (send-to-scheduling / create-order /
// bridge-failure / pre-populate), consultationSaveConfirmationAndTransition
// .test.tsx (FR-A4 unmount-flush), consultationSaveInvalidation.test.tsx
// (flag-ON invalidation), freshnessFeatureFlag.test.tsx (flag-OFF), and
// consultationSaveFreshness.characterization.test.tsx (episode/appointment
// context-change re-sync) — that state now lives in
// TreatmentRecommendationModule, unchanged in substance.
//
// Deliberately does NOT import tests/features/doctorDashboard/setup — same
// reason as caseSheetModule.test.tsx / prescriptionModule.test.tsx (its
// mocked useQueryClient() defeats jest.spyOn(realQueryClient, ...)).

let mockFeatures: any = { clinic_type: 'ayurveda', freshness_v1_enabled: false };

jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => mockFeatures,
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: (value: any) => !!value.freshness_v1_enabled,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentSheets.api', () => ({
  createSimpleTreatmentSheetApi: jest.fn(),
  updateAllTreatmentSheetRowsApi: jest.fn(),
}));
jest.mock('../../../features/treatments/data/datasources/treatments.api', () => ({
  listTreatmentsApi: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentOrders.api', () => ({
  sendToSchedulingApi: jest.fn(),
  createTreatmentRecommendationApi: jest.fn(),
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
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

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

let queryClient: QueryClient;
let mockEnsureCasesheetExists: jest.Mock;

const buildTree = (episodeId: string, appointmentId: string, ref?: React.Ref<TreatmentRecommendationModuleHandle>) => (
  <QueryClientProvider client={queryClient}>
    <WorkspaceProvider tenantId="tenant-1" episodeId={episodeId} appointmentId={appointmentId} clientId="client-1">
      <WorkspaceSaveStatusProvider>
        <TreatmentRecommendationModule
          ref={ref}
          expandedSections={new Set(['treatmentRecommendation'])}
          onToggleSection={jest.fn()}
          ensureCasesheetExists={mockEnsureCasesheetExists}
        />
      </WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  </QueryClientProvider>
);

const renderModule = () => {
  const ref = createRef<TreatmentRecommendationModuleHandle>();
  const utils = render(buildTree('episode-1', 'appointment-1', ref));
  return { ...utils, ref };
};

describe('TreatmentRecommendationModule (R3A · T-B.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: false };
    mockEnsureCasesheetExists = jest.fn().mockResolvedValue('casesheet-1');
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (createSimpleTreatmentSheetApi as jest.Mock).mockResolvedValue({ id: 'new-sheet', rows: [], version: 1 });
    (createTreatmentRecommendationApi as jest.Mock).mockResolvedValue({ id: 'new-order', state: 'ORDERED', is_order: true, version: 2 });
    (sendToSchedulingApi as jest.Mock).mockResolvedValue({ id: 'sheet-1', state: 'ORDERED', is_order: true, version: 1 });
    (listTreatmentsApi as jest.Mock).mockResolvedValue({
      items: [{ id: 'treatment-abhyanga', name: 'Abhyanga', duration_minutes: 45 }, { id: 'treatment-shirodhara', name: 'Shirodhara', duration_minutes: 60 }],
    });
  });

  it('sendTreatmentToAdmin calls send-to-scheduling and never calls PATCH status when a sheet already exists', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
      ...baseWorkspaceData,
      treatmentSheet: { id: 'sheet-1', status: 'DRAFT', rows: [], duration_days: 7, state: 'DRAFT' },
      treatmentSheetId: 'sheet-1',
      hasTreatmentSheet: true,
    });

    const { getByPlaceholderText, ref } = renderModule();
    fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Abhyanga');
    await act(async () => {
      await ref.current!.sendTreatmentToAdmin();
    });

    expect(sendToSchedulingApi).toHaveBeenCalledWith('sheet-1', expect.any(Number), expect.any(Object));
    expect(mockEnsureCasesheetExists).not.toHaveBeenCalled();
  });

  it('sendTreatmentToAdmin creates a recommendation ORDER (no rows) when no sheet exists, calling the CaseSheetModule bridge first', async () => {
    const { getByPlaceholderText, ref } = renderModule();
    fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Shirodhara');
    await act(async () => {
      await ref.current!.sendTreatmentToAdmin();
    });

    expect(mockEnsureCasesheetExists).toHaveBeenCalledTimes(1);
    expect(createTreatmentRecommendationApi).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        client_id: 'client-1',
        episode_id: 'episode-1',
        appointment_id: 'appointment-1',
        recommended_therapy: 'Shirodhara',
        planned_sessions: expect.any(Number),
      }),
    );
    expect(createSimpleTreatmentSheetApi).not.toHaveBeenCalled();
    expect(updateAllTreatmentSheetRowsApi).not.toHaveBeenCalled();
    expect(sendToSchedulingApi).not.toHaveBeenCalled();
  });

  it('sendTreatmentToAdmin fails with a clear error when the casesheet bridge cannot produce a casesheetId', async () => {
    mockEnsureCasesheetExists = jest.fn().mockResolvedValue(null);
    const { getByPlaceholderText, ref } = renderModule();
    fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Shirodhara');

    await expect(ref.current!.sendTreatmentToAdmin()).rejects.toThrow(
      'Please add consultation notes before sending to scheduling.',
    );
    expect(createTreatmentRecommendationApi).not.toHaveBeenCalled();
  });

  it('keeps ordered treatment values pre-populated and re-enables send after further edits', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
      ...baseWorkspaceData,
      treatmentSheet: {
        id: 'sheet-ordered',
        status: 'DRAFT',
        duration_days: 14,
        state: 'ORDERED',
        rows: [{ id: 'row-1', treatment_description: 'Abhyanga', instructions: '{"notesForAdmin":"Morning"}' }],
      },
      treatmentSheetId: 'sheet-ordered',
      hasTreatmentSheet: true,
    });

    const { getByDisplayValue } = renderModule();
    expect(getByDisplayValue('Abhyanga')).toBeTruthy();
  });

  describe('DEF_COP_065: the plan is linked to the treatment the doctor picks', () => {
    const pick = async (utils: ReturnType<typeof renderModule>, name: string) => {
      const input = utils.getByPlaceholderText('Type to search therapies...');
      fireEvent(input, 'focus');
      fireEvent.press(await utils.findByText(name));
    };

    it('offers the clinic\'s own treatments and sends the picked treatment with the recommendation', async () => {
      const utils = renderModule();
      await pick(utils, 'Abhyanga');
      await act(async () => {
        await utils.ref.current!.sendTreatmentToAdmin();
      });
      expect(createTreatmentRecommendationApi).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ recommended_therapy: 'Abhyanga', recommended_treatment_id: 'treatment-abhyanga' }),
      );
    });

    it('typing the exact name of a clinic treatment links it too', async () => {
      const utils = renderModule();
      fireEvent(utils.getByPlaceholderText('Type to search therapies...'), 'focus');
      await utils.findByText('Abhyanga');                                    // only in the clinic's list: it has loaded
      fireEvent.changeText(utils.getByPlaceholderText('Type to search therapies...'), 'shirodhara');
      await act(async () => {
        await utils.ref.current!.sendTreatmentToAdmin();
      });
      expect(createTreatmentRecommendationApi).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ recommended_treatment_id: 'treatment-shirodhara' }),
      );
    });

    it('free text that is not one of the clinic\'s treatments still works and sends no link', async () => {
      const utils = renderModule();
      await pick(utils, 'Abhyanga');
      fireEvent.changeText(utils.getByPlaceholderText('Type to search therapies...'), 'Custom herbal wrap');
      await act(async () => {
        await utils.ref.current!.sendTreatmentToAdmin();
      });
      const body = (createTreatmentRecommendationApi as jest.Mock).mock.calls[0][1];
      expect(body.recommended_therapy).toBe('Custom herbal wrap');
      expect(body.recommended_treatment_id ?? null).toBeNull();
    });

    it('an already ordered plan keeps its link and sends it again with the re-order', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        treatmentSheet: { id: 'sheet-1', status: 'DRAFT', rows: [], duration_days: 7, state: 'DRAFT', recommended_therapy: 'Abhyanga', recommended_treatment_id: 'treatment-abhyanga' },
        treatmentSheetId: 'sheet-1',
        hasTreatmentSheet: true,
      });
      const utils = renderModule();
      await act(async () => {
        await utils.ref.current!.sendTreatmentToAdmin();
      });
      expect(sendToSchedulingApi).toHaveBeenCalledWith('sheet-1', expect.any(Number), expect.objectContaining({ recommended_treatment_id: 'treatment-abhyanga' }));
    });
  });

  describe('FR-A4: save-before-transition (unmount-flush, own effect per design §6.4)', () => {
    it('auto-sends an unsent, non-empty treatment recommendation draft on unmount', async () => {
      const { getByPlaceholderText, unmount } = renderModule();
      fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Shirodhara');
      expect(createTreatmentRecommendationApi).not.toHaveBeenCalled();

      unmount();
      await waitFor(() =>
        expect(createTreatmentRecommendationApi).toHaveBeenCalledWith(
          'tenant-1',
          expect.objectContaining({ recommended_therapy: 'Shirodhara' }),
        ),
      );
    });

    it('does NOT auto-send on unmount if the therapy field is empty', async () => {
      const { getByPlaceholderText, unmount } = renderModule();
      fireEvent.changeText(getByPlaceholderText('Scheduling notes, contraindications, or preferences'), 'some note but no therapy');
      unmount();
      await act(async () => {
        await Promise.resolve();
      });
      expect(createTreatmentRecommendationApi).not.toHaveBeenCalled();
    });

    it('does NOT re-send on unmount if the recommendation was already sent and nothing changed since', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        treatmentSheet: { id: 'sheet-1', status: 'DRAFT', rows: [], duration_days: 7, state: 'DRAFT' },
        treatmentSheetId: 'sheet-1',
        hasTreatmentSheet: true,
      });

      const { getByPlaceholderText, ref, unmount } = renderModule();
      fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Abhyanga');
      await act(async () => {
        await ref.current!.sendTreatmentToAdmin();
      });
      expect(sendToSchedulingApi).toHaveBeenCalledTimes(1);

      unmount();
      await act(async () => {
        await Promise.resolve();
      });

      expect(sendToSchedulingApi).toHaveBeenCalledTimes(1);
      expect(createTreatmentRecommendationApi).not.toHaveBeenCalled();
    });
  });

  describe('save invalidation (flag ON) — moved from consultationSaveInvalidation.test.tsx (T-A.2)', () => {
    beforeEach(() => {
      mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: true };
    });

    it('sendTreatmentToAdmin (create order) invalidates treatment-order surfaces via the shared helper', async () => {
      const { getByPlaceholderText, ref } = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Shirodhara');
      await act(async () => {
        await ref.current!.sendTreatmentToAdmin();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentOrderKeys.detail('new-order') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentSheetsKeys.detail('new-order') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentOrderKeys.worklists('tenant-1'), exact: false });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentSheetsKeys.all, exact: false });
    });

    it('sendTreatmentToAdmin (update existing order) invalidates treatment-order surfaces via the shared helper', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        treatmentSheet: { id: 'sheet-1', status: 'DRAFT', rows: [], duration_days: 7, state: 'DRAFT' },
        treatmentSheetId: 'sheet-1',
        hasTreatmentSheet: true,
      });
      const { getByPlaceholderText, ref } = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Abhyanga');
      await act(async () => {
        await ref.current!.sendTreatmentToAdmin();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentOrderKeys.detail('sheet-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: treatmentSheetsKeys.detail('sheet-1') });
    });
  });

  it('flag OFF: sendTreatmentToAdmin still calls the API, but does NOT invalidate the query cache (moved from freshnessFeatureFlag.test.tsx)', async () => {
    const { getByPlaceholderText, ref } = renderModule();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.changeText(getByPlaceholderText('Type to search therapies...'), 'Shirodhara');
    await act(async () => {
      await ref.current!.sendTreatmentToAdmin();
    });

    expect(createTreatmentRecommendationApi).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  describe('episode/appointment context changes (moved from T-0.4/T-A.5 characterization)', () => {
    it('T-A.5 FIX (unchanged by T-B.3): changing episodeId/appointmentId resets the draft and correctly re-syncs the new context\'s treatment sheet (avoids the ED-003-class stale-ref race)', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        treatmentSheet: { id: 'sheet-1', status: 'DRAFT', rows: [], duration_days: 7, state: 'ORDERED', recommended_therapy: 'Abhyanga' },
        treatmentSheetId: 'sheet-1',
        hasTreatmentSheet: true,
      });

      const { getByDisplayValue, rerender } = render(buildTree('episode-1', 'appointment-1'));
      await waitFor(() => expect(getByDisplayValue('Abhyanga')).toBeTruthy());

      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        treatmentSheet: { id: 'sheet-2', status: 'DRAFT', rows: [], duration_days: 14, state: 'DRAFT', recommended_therapy: 'Shirodhara' },
        treatmentSheetId: 'sheet-2',
        hasTreatmentSheet: true,
      });
      rerender(buildTree('episode-2', 'appointment-2'));

      await waitFor(() => expect(getByDisplayValue('Shirodhara')).toBeTruthy());
    });
  });
});
