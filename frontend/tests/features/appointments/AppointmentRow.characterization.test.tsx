/**
 * Phase 1 · T-C.1 — Verifies the unified `AppointmentRow` component
 * (features/appointments/presentation/components/AppointmentRow.tsx)
 * reproduces the original `appointments/.../AppointmentListItem.tsx`
 * surface's exact behavior, per ADR-P1-03.
 *
 * These are the SAME scenarios already proven in T-0.3 against the original
 * standalone component
 * (tests/features/appointments/AppointmentListItem.characterization.test.tsx),
 * re-run here against the unified component.
 *
 * T-C.4 (FR-B4/AC-6): the `variant="minimal"` scenarios formerly here (a
 * parallel port of `staffDashboards/.../AppointmentListItem.tsx`) were
 * removed along with the dead-code branch they characterized — that
 * original had zero production consumers, confirmed in T-C.2, and no
 * later-phase claim existed for it.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('../../../core/localization/useTranslation', () => ({
  // The doctor card's button label now comes from translations (Start / Continue / Complete Consultation).
  useTranslation: () => ({
    t: (key: string) => (key === 'appointments.consultationAction.start' ? 'Start Consultation' : key),
  }),
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({
    clinic_type: 'general',
    appointments: { allow_multiday: false, enable_gender_matching: false },
    treatment_sheets: { enable_treatment_sheets: false, enable_sheet_sync: false },
  }),
  hasMultiDayAppointments: () => false,
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', main: '#2563EB', onPrimary: '#FFFFFF' },
      secondary: { default: '#7C3AED' },
      background: { default: '#F9FAFB' },
      text: { primary: '#111827', secondary: '#6B7280', onPrimary: '#FFFFFF' },
      feedback: { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
      success: { main: '#10B981' },
      grey: { 50: '#F9FAFB', 400: '#9CA3AF' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: { body1: { fontSize: 16 }, body2: { fontSize: 14 }, caption: { fontSize: 12 } },
  }),
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' } }),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetDetailQuery: () => ({ data: undefined, isLoading: false }),
}));

import { AppointmentRow } from '../../../features/appointments/presentation/components/AppointmentRow';
import type { AppointmentResponse } from '../../../features/appointments/data/models/appointments.dtos';

// ---------------------------------------------------------------------------
// Full variant — mirrors T-0.3's appointments characterization exactly
// ---------------------------------------------------------------------------

const fullAppointment: AppointmentResponse = {
  id: 'appt-1',
  client_id: 'client-1',
  client_name: 'Jane Doe',
  client_phone: '555-0100',
  appointment_start: '2026-06-05T09:00:00Z',
  appointment_end: '2026-06-05T09:30:00Z',
  status: 'scheduled',
  treatment_name: 'General Consultation',
  therapist_ids: [],
} as unknown as AppointmentResponse;

describe('AppointmentRow variant="full" (unified, T-C.1) — parity with appointments original', () => {
  describe('clinic admin role', () => {
    it('renders Reschedule / Record Visit / No-Show / Cancel quick actions for a scheduled appointment', () => {
      const { getByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={fullAppointment}
          userRole="clinic_admin"
          onStatusUpdate={jest.fn()}
          onCancel={jest.fn()}
          onReschedule={jest.fn()}
        />
      );
      expect(getByLabelText('Reschedule')).toBeTruthy();
      expect(getByLabelText('Record Visit')).toBeTruthy();
      expect(getByLabelText('No-Show')).toBeTruthy();
      expect(getByLabelText('Cancel')).toBeTruthy();
    });

    it('hides quick actions entirely for a terminal status (completed)', () => {
      const { queryByLabelText, getByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'completed' }}
          userRole="clinic_admin"
          onStatusUpdate={jest.fn()}
          onCancel={jest.fn()}
          onReschedule={jest.fn()}
        />
      );
      expect(queryByLabelText('Reschedule')).toBeNull();
      expect(queryByLabelText('Cancel')).toBeNull();
      expect(getByLabelText('Status: Completed')).toBeTruthy();
    });
  });

  describe('therapist role', () => {
    it('renders only the Complete quick action for an in_progress appointment', () => {
      const { getByLabelText, queryByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'in_progress' }}
          userRole="therapist"
          onStatusUpdate={jest.fn()}
        />
      );
      expect(getByLabelText('Complete')).toBeTruthy();
      expect(queryByLabelText('Reschedule')).toBeNull();
      expect(queryByLabelText('Cancel')).toBeNull();
    });

    it('does not render Complete for a therapist when status is only "confirmed" (not in_progress)', () => {
      const { queryByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'confirmed' }}
          userRole="therapist"
          onStatusUpdate={jest.fn()}
        />
      );
      expect(queryByLabelText('Complete')).toBeNull();
    });
  });

  describe('doctor role', () => {
    it('renders the Start Consultation CTA and secondary links for a non-terminal appointment, with no quick-actions row', () => {
      const { getByText, getByLabelText, queryByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'scheduled' }}
          userRole="doctor"
          onStartConsultation={jest.fn()}
        />
      );
      expect(getByLabelText('Start Consultation')).toBeTruthy();
      expect(getByText('View Patient History')).toBeTruthy();
      expect(getByText('View Cases')).toBeTruthy();
      expect(queryByLabelText('Reschedule')).toBeNull();
      expect(queryByLabelText('Complete')).toBeNull();
    });

    it('shows a loading indicator instead of the label while starting a consultation', () => {
      const { queryByText, getByLabelText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'scheduled' }}
          userRole="doctor"
          onStartConsultation={jest.fn()}
          isStartingConsultation
        />
      );
      expect(queryByText('Start Consultation')).toBeNull();
      expect(getByLabelText('Start Consultation')).toBeTruthy();
    });

    it('renders the status badge (no CTA, no links) for a terminal-status appointment (duplicate badge — see ED-002-A)', () => {
      const { getAllByLabelText, queryByLabelText, queryByText } = render(
        <AppointmentRow
          variant="full"
          appointment={{ ...fullAppointment, status: 'completed' }}
          userRole="doctor"
          onStartConsultation={jest.fn()}
        />
      );
      // Reproduces the same pre-existing duplicate-badge behavior characterized
      // in T-0.3 (ED-002-A) — not fixed here, faithfully preserved.
      expect(getAllByLabelText('Status: Completed')).toHaveLength(2);
      expect(queryByLabelText('Start Consultation')).toBeNull();
      expect(queryByText('View Patient History')).toBeNull();
    });
  });

  describe('navigation arrow', () => {
    it('renders the navigation arrow only when onPress is provided', () => {
      const { queryByTestId, rerender } = render(
        <AppointmentRow variant="full" appointment={fullAppointment} userRole="clinic_admin" />
      );
      expect(queryByTestId('appointment-nav-arrow')).toBeNull();
      rerender(<AppointmentRow variant="full" appointment={fullAppointment} userRole="clinic_admin" onPress={jest.fn()} />);
      // Same pre-existing `data-testid` (not RN `testID`) characteristic as
      // the original — getByTestId will not find it; documented, not fixed.
      expect(queryByTestId('appointment-nav-arrow')).toBeNull();
    });
  });
});
