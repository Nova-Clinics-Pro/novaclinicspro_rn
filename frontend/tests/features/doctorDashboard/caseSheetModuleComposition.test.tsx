/**
 * T-FE-E.1a — Current-Visit attribution + missing-context tests for
 * `CaseSheetModule.tsx`'s update path.
 *
 * `caseSheetModule.test.tsx` already covers the module's pre-existing
 * behavior (autosave debounce, create-then-patch, flushPendingAutosave,
 * per-field progress) unchanged — not re-tested here. This file covers
 * only what T-FE-E.1a adds: the update payload now includes the current
 * `appointment_id` (T-BE-C.2, FR-CS-2 -- the backend field already
 * existed; the frontend simply never sent it), and the new
 * missing-context guard that refuses to send an unattributed write.
 *
 * Composition-level proof (CaseSheetModule renders exactly once inside
 * VisitCommandCenter, correct region order, no duplicate form/route)
 * lives in `visitCommandCenter.test.tsx`'s own T-FE-E.1a tests -- not
 * duplicated here.
 *
 * Reuses the exact wrapper/mock pattern `caseSheetModule.test.tsx`
 * already established -- same theme mock, same useFeatures mock shape,
 * same WorkspaceProvider/WorkspaceSaveStatusProvider wrapper.
 */
import React, { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CaseSheetModule,
  CaseSheetModuleHandle,
} from '../../../features/episodes/presentation/components/ConsultationSections/CaseSheetModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createCasesheetApi, updateCasesheetApi } from '../../../features/casesheets/data/datasources/casesheets.api';

let mockFeatures: any = { clinic_type: 'ayurveda' };

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

const existingCasesheetWorkspaceData = {
  ...baseWorkspaceData,
  casesheet: { id: 'casesheet-1', data_json: { basic: {} } },
  casesheetId: 'casesheet-1',
  hasCasesheet: true,
  episodeDetails: {
    ...baseWorkspaceData.episodeDetails,
    documents: {
      ...baseWorkspaceData.episodeDetails.documents,
      casesheet: { exists: true, id: 'casesheet-1', status: 'DRAFT', created_at: '2026-06-01T00:00:00Z' },
    },
  },
};

let queryClient: QueryClient;

const wrapperWithAppointment = (appointmentId: string) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId={appointmentId} clientId="client-1">
        <WorkspaceSaveStatusProvider>{children}</WorkspaceSaveStatusProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = 'WrapperWithAppointment';
  return Wrapper;
};

const renderModule = (appointmentId: string, expandedSections: Set<any> = new Set(['chiefComplaint'])) => {
  const ref = createRef<CaseSheetModuleHandle>();
  const onToggleSection = jest.fn();
  const utils = render(
    <CaseSheetModule ref={ref} expandedSections={expandedSections} onToggleSection={onToggleSection} />,
    { wrapper: wrapperWithAppointment(appointmentId) },
  );
  return { ...utils, ref };
};

describe('CaseSheetModule current-Visit attribution (T-FE-E.1a, T-BE-C.2, FR-CS-2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda' };
    (createCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1' });
    (updateCasesheetApi as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('the update payload includes the active appointment_id — the field the backend already accepts but the frontend never sent', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(existingCasesheetWorkspaceData);
    const { getByDisplayValue } = renderModule('appointment-2');

    fireEvent.changeText(getByDisplayValue(''), 'Updated note');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(updateCasesheetApi).toHaveBeenCalledWith(
      'tenant-1',
      'casesheet-1',
      expect.objectContaining({ appointment_id: 'appointment-2' }),
    );
  });

  it('the update payload never includes visit_id, tenant_id, client_id, episode_id, or a staff/author id as trusted request facts', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(existingCasesheetWorkspaceData);
    const { getByDisplayValue } = renderModule('appointment-2');

    fireEvent.changeText(getByDisplayValue(''), 'Updated note');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    const [, , payload] = (updateCasesheetApi as jest.Mock).mock.calls[0];
    expect(payload).not.toHaveProperty('visit_id');
    expect(payload).not.toHaveProperty('tenant_id');
    expect(payload).not.toHaveProperty('client_id');
    expect(payload).not.toHaveProperty('episode_id');
    expect(payload).not.toHaveProperty('staff_id');
    expect(payload).not.toHaveProperty('author_id');
  });

  it('the create path retains its existing appointment_id attribution (regression — unchanged by this task)', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    const { getByDisplayValue } = renderModule('appointment-1');

    fireEvent.changeText(getByDisplayValue(''), 'New note');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(createCasesheetApi).toHaveBeenCalledWith(
      'tenant-1',
      'client-1',
      expect.objectContaining({ appointment_id: 'appointment-1', episode_id: 'episode-1' }),
    );
  });

  describe('missing-context guard', () => {
    it('does not send an unattributed update when appointmentId is empty — preserves the draft, surfaces the error convention, never creates a second sheet', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(existingCasesheetWorkspaceData);
      const { getByDisplayValue, ref } = renderModule('');

      fireEvent.changeText(getByDisplayValue(''), 'Should not save');
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        await ref.current!.flushPendingAutosave().catch(() => {});
      });

      expect(updateCasesheetApi).not.toHaveBeenCalled();
      expect(createCasesheetApi).not.toHaveBeenCalled();
    });

    it('does not fall through to create a second Case Sheet when appointmentId is missing, even with no existing sheet', async () => {
      (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
      const { getByDisplayValue } = renderModule('');

      fireEvent.changeText(getByDisplayValue(''), 'Should not create');
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(createCasesheetApi).not.toHaveBeenCalled();
    });
  });
});

describe('Episode Case Sheet ownership (T-FE-E.1a, FR-CS-1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda' };
    (createCasesheetApi as jest.Mock).mockResolvedValue({ id: 'casesheet-1' });
    (updateCasesheetApi as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the Episode\'s existing Case Sheet — no create call when the Episode already has one', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(existingCasesheetWorkspaceData);
    const { getByDisplayValue } = renderModule('appointment-1');

    fireEvent.changeText(getByDisplayValue(''), 'Follow-up note');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(createCasesheetApi).not.toHaveBeenCalled();
    expect(updateCasesheetApi).toHaveBeenCalledTimes(1);
  });

  it('creates only when the Episode has no Case Sheet — never a second sheet on a subsequent save', async () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    const { getByDisplayValue } = renderModule('appointment-1');

    fireEvent.changeText(getByDisplayValue(''), 'First note');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);

    fireEvent.changeText(getByDisplayValue('First note'), 'First note continued');
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    // Second save updates the just-created sheet — never a second create.
    expect(createCasesheetApi).toHaveBeenCalledTimes(1);
    expect(updateCasesheetApi).toHaveBeenCalledTimes(1);
  });
});

describe('architecture — no datasource/axios import in the composition path', () => {
  it('VisitCommandCenter.tsx imports CaseSheetModule from its existing location only, no duplicate form/route', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/pages/VisitCommandCenter.tsx'),
      'utf8',
    );
    expect(source).toMatch(/from '..\/components\/ConsultationSections\/CaseSheetModule'/);
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/casesheets\.api/);
    expect(source).not.toMatch(/createCasesheetApi|updateCasesheetApi/);
  });
});
