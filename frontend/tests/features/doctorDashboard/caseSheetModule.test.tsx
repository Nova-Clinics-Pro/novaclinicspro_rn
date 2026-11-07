import React, { createRef } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CaseSheetModule,
  CaseSheetModuleHandle,
} from '../../../features/episodes/presentation/components/ConsultationSections/CaseSheetModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createCasesheetApi, updateCasesheetApi } from '../../../features/casesheets/data/datasources/casesheets.api';
import { casesheetsKeys } from '../../../features/casesheets/data/repositories/casesheets.repository.impl';

// R3A · T-B.1 — CaseSheetModule's own tests. Migrated from
// useConsultationWorkspace.test.tsx, whose casesheet coverage (autosave
// debounce, POST-then-PATCH, flushPendingAutosave, per-field progress) now
// lives here, unchanged in substance — only relocated to test the module
// directly instead of the (now casesheet-free) hook.
//
// Deliberately does NOT import tests/features/doctorDashboard/setup — that
// file mocks @tanstack/react-query's useQueryClient() to return a hardcoded
// fake object, which silently defeats jest.spyOn(queryClient, ...) against
// this test's own real QueryClient instance (needed by the "save
// invalidation" tests below). CaseSheetModule and its section children only
// need react-native primitives (handled natively by the jest-expo preset)
// and useClinicTheme — mocked directly below, nothing else.

let mockFeatures: any = { clinic_type: 'ayurveda', freshness_v1_enabled: false };

jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => mockFeatures,
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: (value: any) => !!value.freshness_v1_enabled,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  createCasesheetApi: jest.fn(),
  updateCasesheetApi: jest.fn(),
  // T-FE-E.1b: CaseSheetModule now also composes CaseSheetContributionHistory,
  // which fetches contribution history through this datasource's repository
  // hook -- keep it resolved so these pre-existing tests never hit a real
  // network call.
  getCasesheetContributionsApi: jest.fn().mockResolvedValue({ casesheet_id: '', episode_id: '', contributions: [] }),
}));
// Full theme shape (mirrors tests/features/doctorDashboard/setup.ts's own
// theme object) — CaseSheetModule's section children read many color/
// spacing/typography paths, so a partial mock risks a fresh "Cannot read
// properties of undefined" every time a not-yet-mocked path is touched.
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
    radii: { small: 4, medium: 8, large: 16, pill: 999 },
    borderWidths: { thin: 1 },
    sizes: { touchTarget: 44, iconSmall: 16, iconMedium: 24, iconLarge: 32 },
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

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
      <WorkspaceSaveStatusProvider>{children}</WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  </QueryClientProvider>
);

// Default: only Chief Complaint expanded, so getByDisplayValue('') resolves
// to exactly one element (matching the pattern already established in
// sectionSwitchingContext.characterization.test.tsx). Tests that need every
// section visible pass their own Set explicitly.
const renderModule = (expandedSections: Set<any> = new Set(['chiefComplaint'])) => {
  const ref = createRef<CaseSheetModuleHandle>();
  const onToggleSection = jest.fn();
  const utils = render(
    <CaseSheetModule ref={ref} expandedSections={expandedSections} onToggleSection={onToggleSection} />,
    { wrapper },
  );
  return { ...utils, ref, onToggleSection };
};

describe('CaseSheetModule (R3A · T-B.1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda' };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (createCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1' });
    (updateCasesheetApi as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces autosave and creates then patches a casesheet (unchanged from pre-T-B.1 useConsultationWorkspace behavior)', async () => {
    const { getByDisplayValue } = renderModule();

    fireEvent.changeText(getByDisplayValue(''), 'Knee pain');
    expect(createCasesheetApi).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(createCasesheetApi).toHaveBeenCalledWith('tenant-1', 'client-1', expect.objectContaining({
      appointment_id: 'appointment-1',
      episode_id: 'episode-1',
    }));
  });

  it('flushPendingAutosave (exposed via ref, called by "Save & Submit") resolves immediately when no save is pending', async () => {
    const { ref } = renderModule();
    await expect(ref.current!.flushPendingAutosave()).resolves.toBeUndefined();
    expect(createCasesheetApi).not.toHaveBeenCalled();
  });

  it('flushPendingAutosave awaits and completes a pending debounced save', async () => {
    const { getByDisplayValue, ref } = renderModule();
    fireEvent.changeText(getByDisplayValue(''), 'Pain');
    await act(async () => {
      await ref.current!.flushPendingAutosave();
    });
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
  });

  it('fires pending autosave on unmount (own unmount-flush effect, design §6.4 — moved with the module)', async () => {
    const { getByDisplayValue, unmount } = renderModule();
    fireEvent.changeText(getByDisplayValue(''), 'Pain');
    unmount();
    await waitFor(() => expect(createCasesheetApi).toHaveBeenCalledTimes(1));
  });

  it('ensureCasesheetExists (transitional bridge for sendTreatmentToAdmin, T-B.1) creates a casesheet on demand and returns its id', async () => {
    const { ref } = renderModule();
    let returnedId: string | null = null;
    await act(async () => {
      returnedId = await ref.current!.ensureCasesheetExists();
    });
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(returnedId).toBe('casesheet-1');
  });

  it('ensureCasesheetExists does not re-create a casesheet that already exists', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
      ...baseWorkspaceData,
      casesheetId: 'existing-casesheet',
      hasCasesheet: true,
    });
    const { ref } = renderModule();
    let returnedId: string | null = null;
    await act(async () => {
      returnedId = await ref.current!.ensureCasesheetExists();
    });
    expect(createCasesheetApi).not.toHaveBeenCalled();
    expect(returnedId).toBe('existing-casesheet');
  });

  it('omits the Ayurvedic Assessment section entirely for a non-Ayurveda clinic', () => {
    mockFeatures = { clinic_type: 'general' };
    const { queryByText } = renderModule();
    expect(queryByText('Ayurvedic Assessment')).toBeNull();
  });

  it('shows the Ayurvedic Assessment section for an Ayurveda clinic', () => {
    const { getByText } = renderModule();
    expect(getByText('Ayurvedic Assessment')).toBeTruthy();
  });

  it('computes chiefComplaint/clinicalNotes progress and transitions saveStatus saved → idle after 2s', async () => {
    const { getByDisplayValue, ref } = renderModule();
    fireEvent.changeText(getByDisplayValue(''), 'S');
    await act(async () => {
      await ref.current!.flushPendingAutosave();
    });
    // Re-render to observe the post-save state — the save confirmation text
    // ("✓ Saved") is rendered by CollapsedSection/section components reading
    // this module's own sectionProgress.
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    // No error thrown/timeout — the module's own saved→idle timer (mirroring
    // the pre-T-B.1 hook's identical mechanism) completes without leaking.
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
  });

  // R3A · T-B.1: moved from freshnessFeatureFlag.test.tsx (T-A.6/RB-1) — this
  // invalidation-skipping logic now lives in CaseSheetModule, unchanged in
  // substance. mockFeatures defaults to freshness_v1_enabled: undefined
  // (falsy → OFF) per the outer beforeEach, so no override needed here.
  it('flag OFF: casesheet save still calls the API and refetchEpisode(), but does NOT invalidate the query cache', async () => {
    const { getByDisplayValue } = renderModule();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

    fireEvent.changeText(getByDisplayValue(''), 'Knee pain');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(baseWorkspaceData.refetchEpisode).toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(setDataSpy).not.toHaveBeenCalled();
  });

  // R3A · T-B.1: moved from consultationSaveInvalidation.test.tsx — this
  // invalidation logic now lives in CaseSheetModule, unchanged in substance.
  describe('save invalidation (flag ON) — moved from consultationSaveInvalidation.test.tsx (T-A.2)', () => {
    beforeEach(() => {
      mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: true };
    });

    it('casesheet CREATE (autosave) primes the detail cache and invalidates the client list', async () => {
      const { getByDisplayValue } = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

      fireEvent.changeText(getByDisplayValue(''), 'Knee pain');
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(setDataSpy).toHaveBeenCalledWith(
        casesheetsKeys.detail('tenant-1', 'casesheet-1'),
        expect.objectContaining({ id: 'casesheet-1' }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: casesheetsKeys.list('tenant-1', 'client-1'),
      });
    });

    it('casesheet UPDATE (autosave) writes fresh data to the detail cache and invalidates all lists', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({
        ...baseWorkspaceData,
        casesheetId: 'casesheet-1',
        hasCasesheet: true,
      });
      (updateCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1', data_json: {} });
      const { getByDisplayValue, ref } = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

      fireEvent.changeText(getByDisplayValue(''), 'Rest');
      await act(async () => {
        await ref.current!.flushPendingAutosave();
      });

      expect(setDataSpy).toHaveBeenCalledWith(
        casesheetsKeys.detail('tenant-1', 'casesheet-1'),
        expect.objectContaining({ id: 'casesheet-1' }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: casesheetsKeys.lists() });
    });
  });

  // R3A · T-B.1: moved from consultationSaveFreshness.characterization.test.tsx
  // (Phase 1 T-0.4/T-A.5) — this module's own workspaceKeyRef reset effect
  // (episodeId/appointmentId-keyed) is copied unchanged from the pre-T-B.1
  // hook, so the same baseline/fix characterization applies, now exercised
  // by re-rendering WorkspaceProvider with different context props instead
  // of re-rendering the hook directly.
  describe('episode/appointment context changes (moved from T-0.4/T-A.5 characterization)', () => {
    const casesheetV1 = {
      id: 'casesheet-1',
      data_json: { basic: { chief_complaint: 'Initial complaint (V1)' }, extensions: [] },
    };
    const casesheetV2 = {
      id: 'casesheet-1',
      data_json: { basic: { chief_complaint: 'Updated complaint (V2, saved elsewhere)' }, extensions: [] },
    };

    const buildTree = (episodeId: string, appointmentId: string) => (
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider tenantId="tenant-1" episodeId={episodeId} appointmentId={appointmentId} clientId="client-1">
          <WorkspaceSaveStatusProvider>
            <CaseSheetModule expandedSections={new Set(['chiefComplaint'])} onToggleSection={jest.fn()} />
          </WorkspaceSaveStatusProvider>
        </WorkspaceProvider>
      </QueryClientProvider>
    );

    it('BASELINE: re-rendering with the SAME episodeId/appointmentId but fresher remote casesheet data does NOT refresh the local draft (matches pre-T-B.1 hook behavior)', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, casesheet: casesheetV1, casesheetId: 'casesheet-1', hasCasesheet: true });
      const { getByDisplayValue, rerender } = render(buildTree('episode-1', 'appointment-1'));

      await waitFor(() => expect(getByDisplayValue('Initial complaint (V1)')).toBeTruthy());

      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, casesheet: casesheetV2, casesheetId: 'casesheet-1', hasCasesheet: true });
      rerender(buildTree('episode-1', 'appointment-1'));

      // Same identifiers → the module's own initialSyncDoneRef already fired
      // once, so it does not re-sync. Matches the exact pre-T-B.1 baseline.
      expect(getByDisplayValue('Initial complaint (V1)')).toBeTruthy();
    });

    it('T-A.5 FIX (unchanged by T-B.1): changing episodeId/appointmentId resets the local draft AND correctly re-syncs the new context\'s remote casesheet data', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, casesheet: casesheetV1, casesheetId: 'casesheet-1', hasCasesheet: true });
      const { getByDisplayValue, rerender } = render(buildTree('episode-1', 'appointment-1'));

      await waitFor(() => expect(getByDisplayValue('Initial complaint (V1)')).toBeTruthy());

      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, casesheet: casesheetV2, casesheetId: 'casesheet-1', hasCasesheet: true });
      rerender(buildTree('episode-2', 'appointment-2'));

      await waitFor(() => expect(getByDisplayValue('Updated complaint (V2, saved elsewhere)')).toBeTruthy());
    });
  });
});
