import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { useRouter } from 'expo-router';
import { PrescriptionStandaloneScreen } from '../../../features/prescriptions/presentation/pages/PrescriptionStandaloneScreen';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import {
  usePrescriptionDetailQuery,
  useCreatePrescriptionMutation,
  useUpdatePrescriptionMutation,
} from '../../../features/prescriptions/index';
import { useAppointmentDetailQuery } from '../../../features/appointments/data/repositories/appointments.repository.impl';
import { useEpisodeQuery } from '../../../features/episodes/data/repositories/episodes.repository.impl';

/**
 * R3B · T-B.5 — Verification for `PrescriptionStandaloneScreen`, the new
 * thin standalone host for the T-B.4 canonical Prescription editing core.
 * Not yet wired to any route (T-B.6's job) — rendered directly here,
 * mirroring `casesheetStandaloneScreen.test.tsx`'s own T-B.2 structure.
 *
 * Proves the "before" capabilities T-0.3 characterized against
 * `PrescriptionForm` directly (medication add/edit, silent block on
 * incomplete medications, notes/next_visit_days, disabled/read-only path)
 * now hold against this wrapper's own hosting of the canonical core, plus
 * the host-level concerns (status/role edit-gate, reactive
 * PRESCRIPTION_ALREADY_EXISTS handling) T-0.3 found are not the core's own
 * responsibility.
 */

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../features/prescriptions/data/repositories/prescriptions.repository.impl', () => ({
  usePrescriptionDetailQuery: jest.fn(),
  useCreatePrescriptionMutation: jest.fn(),
  useUpdatePrescriptionMutation: jest.fn(),
}));
jest.mock('../../../features/appointments/data/repositories/appointments.repository.impl', () => ({
  useAppointmentDetailQuery: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', main: '#2563EB', onPrimary: '#FFFFFF' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6', focus: '#2563EB' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF', link: '#2563EB' },
      feedback: { success: '#10B981', error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: { h6: {}, subtitle2: {}, body2: {}, caption: {}, button: {} },
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const router = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };

describe('PrescriptionStandaloneScreen (R3B · T-B.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['DOCTOR'] } });
    (useAppointmentDetailQuery as jest.Mock).mockReturnValue({ data: undefined });
    (useEpisodeQuery as jest.Mock).mockReturnValue({ data: undefined });
  });

  describe('Hosts the canonical core directly — does not delegate to the old PrescriptionForm (source check)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/prescriptions/presentation/pages/PrescriptionStandaloneScreen.tsx'),
      'utf8',
    );

    it('imports PrescriptionEditingCore (the T-B.4 canonical core)', () => {
      expect(source).toContain("from '../components/PrescriptionEditingCore'");
    });

    it('does NOT import PrescriptionForm as a rendered component', () => {
      expect(source).not.toMatch(/import\s*\{[^}]*\bPrescriptionForm\b[^}]*\}.*from '\.\.\/components\/PrescriptionForm'/);
    });
  });

  describe('Create mode', () => {
    beforeEach(() => {
      (useCreatePrescriptionMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockResolvedValue({ id: 'new-rx-1' }),
        isPending: false,
      });
    });

    it('renders an empty medication field, Add Medication, and notes/next_visit_days fields (full standalone field set)', () => {
      const { getByPlaceholderText, getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" />);
      expect(getByPlaceholderText('name')).toBeTruthy();
      expect(getByText('Add Medication')).toBeTruthy();
      expect(getByPlaceholderText('Notes')).toBeTruthy();
      expect(getByPlaceholderText('Follow-up in (days)')).toBeTruthy();
    });

    it('silently blocks Save when no medication has both a name and a dosage (T-0.3\'s confirmed standalone behavior, now reconciled at the host level)', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: 'new-rx-1' });
      (useCreatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
      const { getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" />);
      await act(async () => {
        fireEvent.press(getByText('Save Prescription'));
        await Promise.resolve();
      });
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('filters out incomplete medication rows and submits only valid ones, including notes/next_visit_days', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({ id: 'new-rx-1' });
      (useCreatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
      const { getByPlaceholderText, getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" />);

      fireEvent.changeText(getByPlaceholderText('name'), 'Paracetamol');
      fireEvent.changeText(getByPlaceholderText('dosage'), '500mg');
      fireEvent.changeText(getByPlaceholderText('Notes'), 'Take with food');
      fireEvent.changeText(getByPlaceholderText('Follow-up in (days)'), '14');

      await act(async () => {
        fireEvent.press(getByText('Save Prescription'));
        await Promise.resolve();
      });

      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'client-1',
          notes: 'Take with food',
          next_visit_days: 14,
          prescription_data: expect.objectContaining({
            medications: [expect.objectContaining({ name: 'Paracetamol', dosage: '500mg' })],
          }),
        }),
      );
    });

    it('reactively handles PRESCRIPTION_ALREADY_EXISTS on create (CreatePrescriptionScreen\'s own error-response pattern, not a proactive guard)', async () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
      const mutateAsync = jest.fn().mockRejectedValue({
        response: { data: { detail: { error: 'PRESCRIPTION_ALREADY_EXISTS', prescription_id: 'existing-rx-1', message: 'This visit already has a prescription.' } } },
      });
      (useCreatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

      const { getByPlaceholderText, getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" />);
      fireEvent.changeText(getByPlaceholderText('name'), 'Paracetamol');
      fireEvent.changeText(getByPlaceholderText('dosage'), '500mg');
      await act(async () => {
        fireEvent.press(getByText('Save Prescription'));
        await Promise.resolve();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Prescription Already Exists',
        'This visit already has a prescription.',
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  describe('Edit mode', () => {
    const basePrescription = {
      id: 'rx-1',
      status: 'DRAFT',
      document_version: 2,
      notes: 'Existing note',
      prescription_data: { medications: [{ name: 'Ibuprofen', dosage: '200mg', frequency: '', duration: '' }] },
    };

    it('loads the prescription and renders its data into the canonical core fields', () => {
      (usePrescriptionDetailQuery as jest.Mock).mockReturnValue({ data: basePrescription, isLoading: false, isError: false });
      (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

      const { getByDisplayValue } = render(<PrescriptionStandaloneScreen clientId="client-1" prescriptionId="rx-1" />);
      expect(getByDisplayValue('Ibuprofen')).toBeTruthy();
      expect(getByDisplayValue('Existing note')).toBeTruthy();
    });

    it('does not show next_visit_days in edit mode (deliberate departure — the old screen shows it but silently discards edits, since PrescriptionUpdateRequest has no such field)', () => {
      (usePrescriptionDetailQuery as jest.Mock).mockReturnValue({ data: basePrescription, isLoading: false, isError: false });
      (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

      const { queryByPlaceholderText } = render(<PrescriptionStandaloneScreen clientId="client-1" prescriptionId="rx-1" />);
      expect(queryByPlaceholderText('Follow-up in (days)')).toBeNull();
    });

    it('submits the edited draft via updateMutation, without next_visit_days', async () => {
      const mutateAsync = jest.fn().mockResolvedValue({});
      (usePrescriptionDetailQuery as jest.Mock).mockReturnValue({ data: basePrescription, isLoading: false, isError: false });
      (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

      const { getByDisplayValue, getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" prescriptionId="rx-1" />);
      fireEvent.changeText(getByDisplayValue('Ibuprofen'), 'Ibuprofen 400');
      await act(async () => {
        fireEvent.press(getByText('Save Prescription'));
        await Promise.resolve();
      });

      const callArg = mutateAsync.mock.calls[0][0];
      expect(callArg.prescription_data.medications[0].name).toBe('Ibuprofen 400');
      expect(callArg).not.toHaveProperty('next_visit_days');
    });

    it('status/role edit-gate: FINAL is never editable, even for a doctor', () => {
      (usePrescriptionDetailQuery as jest.Mock).mockReturnValue({ data: { ...basePrescription, status: 'FINAL' }, isLoading: false, isError: false });
      (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
      const { getByText, queryByText } = render(<PrescriptionStandaloneScreen clientId="client-1" prescriptionId="rx-1" />);
      expect(getByText('Cannot Edit Prescription')).toBeTruthy();
      expect(queryByText('Save Prescription')).toBeNull();
    });

    it('status/role edit-gate: SIGNED is editable only by a DOCTOR-role user', () => {
      (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['RECEPTIONIST'] } });
      (usePrescriptionDetailQuery as jest.Mock).mockReturnValue({ data: { ...basePrescription, status: 'SIGNED' }, isLoading: false, isError: false });
      (useUpdatePrescriptionMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
      const { getByText } = render(<PrescriptionStandaloneScreen clientId="client-1" prescriptionId="rx-1" />);
      expect(getByText('Only doctors can edit signed prescriptions.')).toBeTruthy();
    });
  });
});
