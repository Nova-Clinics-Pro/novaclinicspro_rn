import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { useRouter } from 'expo-router';
import { CasesheetStandaloneScreen } from '../../../features/casesheets/presentation/pages/CasesheetStandaloneScreen';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import {
  useCasesheetDetailQuery,
  useCreateCasesheetMutation,
  useUpdateCasesheetMutation,
} from '../../../features/casesheets/data/repositories/casesheets.repository.impl';
import { useAppointmentDetailQuery } from '../../../features/appointments/data/repositories/appointments.repository.impl';
import { useEpisodeQuery, useEpisodeDetailsQuery } from '../../../features/episodes/data/repositories/episodes.repository.impl';

/**
 * R3B · T-B.2 — Verification for `CasesheetStandaloneScreen`, the new thin
 * standalone host for the T-B.1 canonical Case Sheet editing core. Not yet
 * wired to any route (T-B.3's job) — rendered directly here, matching this
 * task's own verify line.
 *
 * Proves the same "before" capabilities T-0.2 characterized against
 * `CasesheetForm` directly (chief complaint edit, all 4 extension templates
 * with dynamic add/remove, disabled/read-only path, cancel) now hold against
 * this wrapper's own hosting of the canonical core, PLUS the host-level
 * concerns (status/role edit-gate, one-casesheet-per-episode guard) T-0.2
 * found are not the core's own responsibility.
 */

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/repositories/casesheets.repository.impl', () => ({
  useCasesheetDetailQuery: jest.fn(),
  useCreateCasesheetMutation: jest.fn(),
  useUpdateCasesheetMutation: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/models/casesheets.dtos', () => ({
  ...jest.requireActual('../../../features/casesheets/data/models/casesheets.dtos'),
  isEditable: (status: string) => status === 'DRAFT',
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useAppointmentDetailQuery: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(),
  useEpisodeDetailsQuery: jest.fn(),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'physio' }),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', main: '#2563EB' },
      background: { elevated: '#FFFFFF' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
      feedback: { success: '#10B981', error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h6: {}, subtitle1: {}, subtitle2: {}, body1: {}, body2: {}, caption: {},
    },
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const router = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };

describe('CasesheetStandaloneScreen (R3B · T-B.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['DOCTOR'] } });
    (useAppointmentDetailQuery as jest.Mock).mockReturnValue({ data: undefined });
    (useEpisodeQuery as jest.Mock).mockReturnValue({ data: undefined });
    (useEpisodeDetailsQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
  });

  describe('Hosts the canonical core directly — does not delegate to the old CasesheetForm (source check)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/casesheets/presentation/pages/CasesheetStandaloneScreen.tsx'),
      'utf8',
    );

    it('imports ChiefComplaintSection/ClinicalNotesSection/CaseSheetExtensionsSection (the T-B.1 canonical core)', () => {
      expect(source).toContain("from '../components/ChiefComplaintSection'");
      expect(source).toContain("from '../components/ClinicalNotesSection'");
      expect(source).toContain("from '../components/CaseSheetExtensionsSection'");
    });

    it('does NOT import CasesheetForm as a rendered component (only its CasesheetFormData type, for the shared data shape)', () => {
      expect(source).not.toMatch(/import\s*\{[^}]*\bCasesheetForm\b[^}]*\}.*from '\.\.\/components\/CasesheetForm'/);
      expect(source).toMatch(/import\s+type\s*\{\s*CasesheetFormData\s*\}\s*from '\.\.\/components\/CasesheetForm'/);
    });
  });

  describe('Create mode', () => {
    beforeEach(() => {
      (useCreateCasesheetMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockResolvedValue({ id: 'new-casesheet-1' }),
        isPending: false,
      });
    });

    it('renders an empty Chief Complaint field and the extensions section with an Add Extension control', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <CasesheetStandaloneScreen clientId="client-1" />,
      );
      expect(getByPlaceholderText("Primary reason for today's visit")).toBeTruthy();
      expect(getByLabelText('Add Extension')).toBeTruthy();
    });

    it('submits using the REAL clinic type from features, not a hardcoded "ayurveda" (the deliberate departure from CreateCasesheetScreen\'s own confirmed bug)', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: 'new-casesheet-1' });
      (useCreateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

      const { getByPlaceholderText, getByTestId } = render(<CasesheetStandaloneScreen clientId="client-1" />);
      fireEvent.changeText(getByPlaceholderText("Primary reason for today's visit"), 'Knee pain');
      await act(async () => {
        fireEvent.press(getByTestId('standalone-casesheet-submit'));
        await Promise.resolve();
      });

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ clinic_type: 'physio' }),
      );
    });

    it('adds a Vitals extension via the Add Extension picker and captures a field edit within it', () => {
      const { getByLabelText, getByPlaceholderText } = render(<CasesheetStandaloneScreen clientId="client-1" />);
      fireEvent.press(getByLabelText('Add Extension'));
      fireEvent.press(getByLabelText('Add Vital Signs'));
      fireEvent.changeText(getByPlaceholderText('e.g., 120/80 mmHg'), '120/80 mmHg');
      // No throw / element found confirms the vitals template (standalone-only
      // until T-B.1) is reachable from this host — the capability T-0.2 found
      // missing from the workspace's own AyurvedicAssessmentSection.
    });

    it('adds a Custom (free-text) extension — the other template carried in by T-B.1', () => {
      const { getByLabelText } = render(<CasesheetStandaloneScreen clientId="client-1" />);
      fireEvent.press(getByLabelText('Add Extension'));
      fireEvent.press(getByLabelText('Add Custom Notes'));
      expect(getByLabelText('Custom Notes')).toBeTruthy();
    });

    it('removes an added extension', () => {
      const { getByLabelText, queryByLabelText } = render(<CasesheetStandaloneScreen clientId="client-1" />);
      fireEvent.press(getByLabelText('Add Extension'));
      fireEvent.press(getByLabelText('Add Vital Signs'));
      expect(queryByLabelText('Vital Signs')).toBeTruthy();
      fireEvent.press(getByLabelText('Remove Vital Signs'));
      expect(queryByLabelText('Vital Signs')).toBeNull();
    });

    it('redirects to the existing casesheet instead of rendering the form when the episode already has one (one-casesheet-per-episode guard, replicated from CreateCasesheetScreen)', () => {
      (useEpisodeDetailsQuery as jest.Mock).mockReturnValue({
        data: { documents: { casesheet: { exists: true, id: 'existing-casesheet-1' } } },
        isLoading: false,
      });
      render(<CasesheetStandaloneScreen clientId="client-1" episodeId="episode-1" />);
      expect(router.replace).toHaveBeenCalledWith('/clinic-admin/clients/client-1/casesheets/existing-casesheet-1');
    });
  });

  describe('Edit mode', () => {
    const baseCasesheet = {
      id: 'casesheet-1',
      status: 'DRAFT',
      document_version: 2,
      chief_complaint: 'Existing complaint',
      data_json: { basic: {}, extensions: [] },
    };

    it('loads the casesheet and renders its data into the canonical core fields', () => {
      (useCasesheetDetailQuery as jest.Mock).mockReturnValue({ data: baseCasesheet, isLoading: false, isError: false });
      (useUpdateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

      const { getByDisplayValue } = render(<CasesheetStandaloneScreen clientId="client-1" casesheetId="casesheet-1" />);
      expect(getByDisplayValue('Existing complaint')).toBeTruthy();
    });

    it('submits the edited draft via updateMutation', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      (useCasesheetDetailQuery as jest.Mock).mockReturnValue({ data: baseCasesheet, isLoading: false, isError: false });
      (useUpdateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

      const { getByDisplayValue, getByTestId } = render(
        <CasesheetStandaloneScreen clientId="client-1" casesheetId="casesheet-1" />,
      );
      fireEvent.changeText(getByDisplayValue('Existing complaint'), 'Updated complaint');
      await act(async () => {
        fireEvent.press(getByTestId('standalone-casesheet-submit'));
        await Promise.resolve();
      });

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ data_json: expect.objectContaining({ basic: expect.objectContaining({ chief_complaint: 'Updated complaint' }) }) }),
      );
    });

    it('status/role edit-gate: DRAFT is always editable (host-level concern, replicated from CasesheetEditScreen)', () => {
      (useCasesheetDetailQuery as jest.Mock).mockReturnValue({ data: { ...baseCasesheet, status: 'DRAFT' }, isLoading: false, isError: false });
      (useUpdateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
      const { queryByTestId } = render(<CasesheetStandaloneScreen clientId="client-1" casesheetId="casesheet-1" />);
      expect(queryByTestId('standalone-casesheet-submit')).toBeTruthy();
    });

    it('status/role edit-gate: FINAL is never editable, even for a doctor', () => {
      (useCasesheetDetailQuery as jest.Mock).mockReturnValue({ data: { ...baseCasesheet, status: 'FINAL' }, isLoading: false, isError: false });
      (useUpdateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
      const { getByText, queryByTestId } = render(<CasesheetStandaloneScreen clientId="client-1" casesheetId="casesheet-1" />);
      expect(getByText('Cannot Edit Casesheet')).toBeTruthy();
      expect(queryByTestId('standalone-casesheet-submit')).toBeNull();
    });

    it('status/role edit-gate: SIGNED is editable only by a DOCTOR-role user', () => {
      (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['RECEPTIONIST'] } });
      (useCasesheetDetailQuery as jest.Mock).mockReturnValue({ data: { ...baseCasesheet, status: 'SIGNED' }, isLoading: false, isError: false });
      (useUpdateCasesheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
      const { getByText } = render(<CasesheetStandaloneScreen clientId="client-1" casesheetId="casesheet-1" />);
      expect(getByText('Only doctors can edit signed casesheets.')).toBeTruthy();
    });
  });
});
