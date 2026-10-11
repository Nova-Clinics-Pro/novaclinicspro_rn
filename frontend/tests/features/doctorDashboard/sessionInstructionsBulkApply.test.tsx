/**
 * SessionInstructionsModule bulk-apply tests (T-FE-E.2a, FR-TS-3 Adoption
 * requirement: "author once, apply to many Sessions").
 *
 * Covers: multi-selection (select/deselect/select-all/clear), the shared
 * author-once draft, confirmation for >1 selected Session, the single
 * bulk API call (never a client-side loop), atomic success/failure
 * behavior, and that the existing single-Session edit flow
 * (`sessionInstructionsModule.test.tsx`) is untouched by this addition.
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionInstructionsModule } from '../../../features/episodes/presentation/components/ConsultationSections/SessionInstructionsModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { getTreatmentOrderApi } from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';
import {
  updateTreatmentSheetRowApi,
  updateAllTreatmentSheetRowsApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
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
    { id: 'row-2', day_number: 2, status: 'SCHEDULED', assigned_staff_id: 'staff-1', scheduled_date: '2026-07-01', scheduled_time: '09:00:00', treatment_name: 'Shirodhara', medicines_text: 'Oil A', instructions_text: 'Rest after' },
    { id: 'row-3', day_number: 3, status: 'COMPLETED', assigned_staff_id: 'staff-1', scheduled_date: '2026-07-02', scheduled_time: '09:00:00', treatment_name: 'Kizhi', medicines_text: '', instructions_text: '' },
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

describe('SessionInstructionsModule bulk-apply (T-FE-E.2a, FR-TS-3 Adoption requirement)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (getTreatmentOrderApi as jest.Mock).mockResolvedValue(rowOrder);
    (updateAllTreatmentSheetRowsApi as jest.Mock).mockResolvedValue({ ...rowOrder });
  });

  describe('selection', () => {
    it('selects and deselects individual Sessions by their checkbox', async () => {
      const { findByLabelText } = renderModule();
      const checkbox1 = await findByLabelText('Select Day 1');
      fireEvent.press(checkbox1);
      expect(checkbox1.props.accessibilityState.checked).toBe(true);
      fireEvent.press(checkbox1);
      expect(checkbox1.props.accessibilityState.checked).toBe(false);
    });

    it('selects multiple Sessions independently', async () => {
      const { findByLabelText, findByText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.press(await findByLabelText('Select Day 2'));
      expect(await findByText('2 Sessions selected')).toBeTruthy();
    });

    it('a COMPLETED Session offers no checkbox at all -- not selectable', async () => {
      const { findByText, queryByLabelText } = renderModule();
      await findByText('Day 3');
      expect(queryByLabelText('Select Day 3')).toBeNull();
    });

    it('select all eligible checks every non-COMPLETED Session and none of the COMPLETED one', async () => {
      const { findByText, findByLabelText } = renderModule();
      fireEvent.press(await findByText('Select all eligible'));
      const checkbox1 = await findByLabelText('Select Day 1');
      const checkbox2 = await findByLabelText('Select Day 2');
      expect(checkbox1.props.accessibilityState.checked).toBe(true);
      expect(checkbox2.props.accessibilityState.checked).toBe(true);
      expect(await findByText('2 Sessions selected')).toBeTruthy();
    });

    it('clear selection deselects everything and hides the bulk panel', async () => {
      const { findByText, queryByText } = renderModule();
      fireEvent.press(await findByText('Select all eligible'));
      fireEvent.press(await findByText('Clear selection'));
      await waitFor(() => expect(queryByText(/Sessions selected/)).toBeNull());
      expect(queryByText('Apply to 2 Sessions')).toBeNull();
    });

    it('selection is keyed by the stable row id, not day_number or array position', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/ConsultationSections/SessionInstructionsModule.tsx'),
        'utf8',
      );
      expect(source).toMatch(/checkedRowIds/);
      expect(source).not.toMatch(/checkedRowIds.*day_number|checkedDayNumbers/);
    });
  });

  describe('shared author-once draft', () => {
    it('does not misrepresent a selected Session\'s existing content as shared -- draft starts empty', async () => {
      const { findByText, findByLabelText, queryByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 2')); // has existing content "Shirodhara"/"Oil A"/"Rest after"
      await findByText('Apply to 1 Sessions');
      // The bulk draft's own field values (not the single-edit ones) must be empty.
      expect(queryByDisplayValue('Shirodhara')).toBeNull();
      expect(queryByDisplayValue('Oil A')).toBeNull();
    });

    it('empty selection cannot submit -- no bulk panel is rendered', async () => {
      const { findByText, queryByText } = renderModule();
      await findByText('Day 1');
      expect(queryByText(/Apply to \d+ Sessions/)).toBeNull();
    });

    it('an empty draft disables the apply action even with Sessions selected', async () => {
      const { findByLabelText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      const applyButton = await findByLabelText('Apply to 1 Sessions');
      expect(applyButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('confirmation', () => {
    it('shows a confirmation before applying to more than one Session', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue, queryByText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.press(await findByLabelText('Select Day 2'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 2 Sessions'));
      await findByText('Confirm bulk apply');
      await findByText('This replaces doctor instructions on the selected Sessions.');
      await findByText('Scheduling and execution details will not change.');
      expect(updateAllTreatmentSheetRowsApi).not.toHaveBeenCalled();
    });

    it('does not require confirmation for a single checked Session', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue, queryByText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await waitFor(() => expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalled());
      expect(queryByText('Confirm bulk apply')).toBeNull();
    });
  });

  describe('request shape', () => {
    it('makes exactly one bulk API call with the exact selected row IDs and only doctor-content fields', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.press(await findByLabelText('Select Day 2'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 2 Sessions'));
      fireEvent.press(await findByText('Confirm'));

      await waitFor(() => expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalledTimes(1));
      const [, , rows] = (updateAllTreatmentSheetRowsApi as jest.Mock).mock.calls[0];
      expect(rows).toEqual([
        { id: 'row-1', treatment_description: 'Panchakarma', medicines_given: '', instructions: '' },
        { id: 'row-2', treatment_description: 'Panchakarma', medicines_given: '', instructions: '' },
      ]);
    });

    it('sends the exact parent Treatment Sheet id', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await waitFor(() => expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalledWith('tenant-1', 'sheet-1', expect.any(Array)));
    });

    it('never sends scheduling, execution, or therapist-assignment fields', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await waitFor(() => expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalled());
      const [, , rows] = (updateAllTreatmentSheetRowsApi as jest.Mock).mock.calls[0];
      for (const forbidden of [
        'status', 'scheduled_date', 'scheduled_time', 'assigned_staff_id', 'appointment_id',
        'completed_at', 'completed_by_staff_id', 'started_at', 'started_by_staff_id',
        'materials_payload_hash', 'non_execution_reason_code', 'day_number',
      ]) {
        expect(rows[0]).not.toHaveProperty(forbidden);
      }
    });

    it('never loops single-row mutations -- updateTreatmentSheetRowApi is not called during bulk apply', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.press(await findByLabelText('Select Day 2'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 2 Sessions'));
      fireEvent.press(await findByText('Confirm'));
      await waitFor(() => expect(updateAllTreatmentSheetRowsApi).toHaveBeenCalledTimes(1));
      expect(updateTreatmentSheetRowApi).not.toHaveBeenCalled();
    });
  });

  describe('results', () => {
    it('success shows success feedback and refetches the canonical order query', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue } = renderModule();
      (getTreatmentOrderApi as jest.Mock).mockClear();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await findByText('Applied successfully');
      await waitFor(() => expect(getTreatmentOrderApi).toHaveBeenCalled());
    });

    it('a fresh selection/checkbox interaction after success dismisses the transient success message', async () => {
      const { findByLabelText, findByText, getAllByDisplayValue, queryByText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await findByText('Applied successfully');
      fireEvent.press(await findByLabelText('Select Day 2'));
      expect(queryByText('Applied successfully')).toBeNull();
    });

    it('a validation failure (400) surfaces an error and produces no false success message', async () => {
      (updateAllTreatmentSheetRowsApi as jest.Mock).mockRejectedValue(new SessionInstructionsError('VALIDATION_FAILED', 'Could not apply — one or more selected Sessions is not eligible.'));
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue, queryByText } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await findByText('Could not apply — one or more selected Sessions is not eligible.');
      expect(queryByText('Applied successfully')).toBeNull();
    });

    it('a permission failure (403) surfaces the permission-specific message', async () => {
      (updateAllTreatmentSheetRowsApi as jest.Mock).mockRejectedValue(new SessionInstructionsError('PERMISSION_DENIED', 'You do not have permission to apply Session instructions.'));
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await findByText('You do not have permission to apply Session instructions.');
    });

    it('atomic failure never marks any Session as applied -- selection and draft are preserved for retry', async () => {
      (updateAllTreatmentSheetRowsApi as jest.Mock).mockRejectedValue(new SessionInstructionsError('VALIDATION_FAILED', 'Could not apply — one or more selected Sessions is not eligible.'));
      const { findByLabelText, findByText, getAllByDisplayValue, getByDisplayValue } = renderModule();
      fireEvent.press(await findByLabelText('Select Day 1'));
      fireEvent.changeText(getAllByDisplayValue('')[0], 'Panchakarma');
      fireEvent.press(await findByText('Apply to 1 Sessions'));
      await findByText('Could not apply — one or more selected Sessions is not eligible.');
      expect(getByDisplayValue('Panchakarma')).toBeTruthy();
      expect(await findByLabelText('Select Day 1')).toHaveProperty('props.accessibilityState.checked', true);
    });
  });
});
