import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({
    clinic_type: 'general',
    appointments: { allow_multiday: false, enable_gender_matching: false },
    treatment_sheets: { enable_treatment_sheets: false, enable_sheet_sync: false },
  }),
  hasMultiDayAppointments: () => false,
}));
jest.mock('../../core/theme/useClinicTheme', () => ({
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
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 'tenant-1' } }),
}));
jest.mock('../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetDetailQuery: () => ({ data: undefined, isLoading: false }),
}));

import { AppointmentRow } from '../../features/appointments/presentation/components/AppointmentRow';
import { appointmentActionAccess } from '../../features/appointments/domain/appointmentActionAccess';
import type { AppointmentResponse } from '../../features/appointments/data/models/appointments.dtos';

const scheduled = {
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

const renderRow = (userRole: string, permissions?: string[]) =>
  render(
    <AppointmentRow
      variant="full"
      appointment={scheduled}
      userRole={userRole}
      permissions={permissions}
      onStatusUpdate={jest.fn()}
      onCancel={jest.fn()}
      onReschedule={jest.fn()}
    />
  );

describe('appointmentActionAccess', () => {
  it('maps the backend permissions to the actions', () => {
    expect(appointmentActionAccess(['appointment.update', 'appointment.cancel', 'client.read'])).toEqual({
      canUpdate: true, canCancel: true, canNotifyClient: true, canCallClient: true,
    });
    expect(appointmentActionAccess(['appointment.update'])).toMatchObject({ canUpdate: true, canCancel: false, canCallClient: false });
    expect(appointmentActionAccess(undefined)).toEqual({ canUpdate: false, canCancel: false, canNotifyClient: false, canCallClient: false });
  });
});

describe('AppointmentRow actions follow permissions when they are known', () => {
  it('a Clinic Owner (role name the old list did not know) gets the front-desk actions', () => {
    const { getByLabelText } = renderRow('clinic_owner', ['appointment.update', 'appointment.cancel']);
    expect(getByLabelText('Reschedule')).toBeTruthy();
    expect(getByLabelText('Record Visit')).toBeTruthy();
    expect(getByLabelText('No-Show')).toBeTruthy();
    expect(getByLabelText('Cancel')).toBeTruthy();
  });

  it('without appointment.cancel the Cancel action is not offered, the rest still is', () => {
    const { getByLabelText, queryByLabelText } = renderRow('receptionist', ['appointment.update']);
    expect(getByLabelText('Reschedule')).toBeTruthy();
    expect(queryByLabelText('Cancel')).toBeNull();
  });

  it('without appointment.update no front-desk actions are offered, whatever the role is called', () => {
    const { queryByLabelText } = renderRow('clinic_admin', ['appointment.read']);
    expect(queryByLabelText('Reschedule')).toBeNull();
    expect(queryByLabelText('Record Visit')).toBeNull();
    expect(queryByLabelText('Cancel')).toBeNull();
  });

  it('without permissions (other screens) the role name decides, as before', () => {
    const { getByLabelText } = renderRow('clinic_admin');
    expect(getByLabelText('Reschedule')).toBeTruthy();
    expect(getByLabelText('Cancel')).toBeTruthy();
  });
});
