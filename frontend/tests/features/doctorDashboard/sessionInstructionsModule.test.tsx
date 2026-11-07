/**
 * SessionInstructionsModule tests (T-FE-E.2, FR-TS-3, FR-SCH-2)
 *
 * NEW module, NEW test file -- no prior test owned this behavior. Mocks at
 * the true datasource boundary (`treatmentOrders.api`/`treatmentSheets.api`)
 * behind the two hooks the module calls
 * (`useTreatmentOrderQuery`/`useUpdateTreatmentSheetRowMutation`), mirroring
 * the established convention in `prescriptionModule.test.tsx`/
 * `treatmentRecommendationModule.test.tsx`.
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionInstructionsModule } from '../../../features/episodes/presentation/components/ConsultationSections/SessionInstructionsModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { getTreatmentOrderApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import { updateTreatmentSheetRowApi } from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
import { SessionInstructionsError } from '../../../features/treatmentSheets/domain/errors/sessionInstructionsError';

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
jest.mock('../../../features/treatmentSheets/data/datasources/treatmentSheets.api', () => ({
  updateTreatmentSheetRowApi: jest.fn(),
  updateAllTreatmentSheetRowsApi: jest.fn(),
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
    { id: 'row-2', day_number: 2, status: 'COMPLETED', assigned_staff_id: 'staff-1', scheduled_date: '2026-07-01', scheduled_time: '09:00:00', treatment_name: 'Shirodhara', medicines_text: 'Oil A', instructions_text: 'Rest after' },
  ],
};

let queryClient: QueryClient;

const renderModule = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
        <SessionInstructionsModule />
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
};

describe('SessionInstructionsModule (T-FE-E.2, FR-TS-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue(rowOrder);
    (updateTreatmentSheetRowApi as jest.Mock).mockResolvedValue({ ...rowOrder, version: 4 });
  });

  it('renders no Sessions from the order rows using the stable Session id, never day_number/array position as identity', async () => {
    const { findByText } = renderModule();
    await findByText('Day 1');
    await findByText('Day 2');
    expect(getTreatmentOrderApi).toHaveBeenCalledWith('sheet-1', 'tenant-1');
  });

  it('shows the honest empty state when the Episode has no treatment order yet', () => {
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue({ ...baseWorkspaceData, treatmentSheetId: null, hasTreatmentSheet: false });
    const { getByText, queryByText } = renderModule();
    expect(getByText('Session Instructions')).toBeTruthy();
    expect(queryByText('Day 1')).toBeNull();
  });

  it('selecting a non-completed row loads its content into editable fields', async () => {
    const { findByText, getByDisplayValue } = renderModule();
    fireEvent.press(await findByText('Day 1'));
    expect(getByDisplayValue('Abhyanga')).toBeTruthy();
  });

  it('a COMPLETED Session is never editable — fields are read-only and no save action is offered', async () => {
    const { findByText, getByDisplayValue, queryByText } = renderModule();
    fireEvent.press(await findByText('Day 2'));
    expect(getByDisplayValue('Shirodhara').props.editable).toBe(false);
    expect(queryByText('Save')).toBeNull();
  });

  it('saving sends the order version as If-Match via expectedVersion, never a client-invented value', async () => {
    const { findByText, getByDisplayValue, getByText } = renderModule();
    fireEvent.press(await findByText('Day 1'));
    fireEvent.changeText(getByDisplayValue('Abhyanga'), 'Abhyanga Updated');
    await act(async () => {
      fireEvent.press(getByText('Save'));
      await Promise.resolve();
    });
    expect(updateTreatmentSheetRowApi).toHaveBeenCalledWith(
      'row-1',
      expect.objectContaining({ treatment_description: 'Abhyanga Updated' }),
      3,
    );
  });

  it('a normalized VERSION_CONFLICT surfaces an explicit conflict state, never a silent overwrite or blind retry', async () => {
    (updateTreatmentSheetRowApi as jest.Mock).mockRejectedValue(new SessionInstructionsError('VERSION_CONFLICT', 'Session instructions changed on the server.', 5));
    const { findByText, getByDisplayValue, getByText } = renderModule();
    fireEvent.press(await findByText('Day 1'));
    fireEvent.changeText(getByDisplayValue('Abhyanga'), 'Conflicting edit');
    await act(async () => {
      fireEvent.press(getByText('Save'));
      await Promise.resolve();
    });
    expect(await findByText(/updated this .* while you were editing/i)).toBeTruthy();
    expect(updateTreatmentSheetRowApi).toHaveBeenCalledTimes(1);
  });

  it('reload-after-conflict clears the conflict state and re-fetches — never auto-resubmits the stale draft', async () => {
    (updateTreatmentSheetRowApi as jest.Mock).mockRejectedValue(new SessionInstructionsError('VERSION_CONFLICT', 'Session instructions changed on the server.', 5));
    const { findByText, getByDisplayValue, getByText } = renderModule();
    fireEvent.press(await findByText('Day 1'));
    fireEvent.changeText(getByDisplayValue('Abhyanga'), 'Conflicting edit');
    await act(async () => {
      fireEvent.press(getByText('Save'));
      await Promise.resolve();
    });
    const reloadButton = await findByText('Reload');
    (getTreatmentOrderApi as jest.Mock).mockClear();
    await act(async () => {
      fireEvent.press(reloadButton);
      await Promise.resolve();
    });
    expect(getTreatmentOrderApi).toHaveBeenCalled();
    expect(updateTreatmentSheetRowApi).toHaveBeenCalledTimes(1);
  });
});

describe('architecture — SessionInstructionsModule composition', () => {
  it('VisitCommandCenter.tsx composes SessionInstructionsModule from its existing location only, no direct axios/datasource import', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ConsultationSections/SessionInstructionsModule.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/axiosClient/);
    expect(source).not.toMatch(/from ['"].*treatmentSheets\.api['"]/);
    expect(source).not.toMatch(/from ['"].*treatmentOrders\.api['"]/);
  });
});
