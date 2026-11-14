import React from 'react';
import { render } from '@testing-library/react-native';

import { consultationActionKey } from '../../features/appointments/domain/consultationAction';
import { AppointmentRow } from '../../features/appointments/presentation/components/AppointmentRow';
import type { AppointmentResponse } from '../../features/appointments/data/models/appointments.dtos';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'appointments.consultationAction.start': 'Start Consultation',
        'appointments.consultationAction.continue': 'Continue Consultation',
        'appointments.consultationAction.complete': 'Complete Consultation',
      })[key] ?? key,
  }),
}));
jest.mock('../../core/hooks/useFeatures', () => ({
  useFeatures: () => ({ clinic_type: 'general', appointments: { allow_multiday: false, enable_gender_matching: false }, treatment_sheets: { enable_treatment_sheets: false, enable_sheet_sync: false } }),
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
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({ useAuth: () => ({ currentUser: { tenantId: 'tenant-1' } }) }));
jest.mock('../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetDetailQuery: () => ({ data: undefined, isLoading: false }),
}));

const appointment = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'a1', client_id: 'c1', client_name: 'P-1', appointment_start: '2026-11-14T09:00:00Z', appointment_end: '2026-11-14T09:30:00Z',
    status: 'scheduled', treatment_name: 'Consultation', therapist_ids: [], ...overrides,
  }) as unknown as AppointmentResponse;

const card = (overrides: Record<string, unknown>) =>
  render(<AppointmentRow variant="full" appointment={appointment(overrides)} userRole="doctor" onStartConsultation={jest.fn()} />);

describe('consultationActionKey', () => {
  it('maps the backend progress to the button', () => {
    expect(consultationActionKey('not_started')).toBe('start');
    expect(consultationActionKey('in_progress')).toBe('continue');
    expect(consultationActionKey('documents_finalized')).toBe('complete');
    expect(consultationActionKey(undefined)).toBe('start'); // an older backend that does not report progress
    expect(consultationActionKey(null)).toBe('start');
  });
});

describe('the doctor card button follows the consultation progress', () => {
  it('says Start Consultation before anything is recorded (and for an older backend)', () => {
    expect(card({ consultation_progress: 'not_started' }).getByText('Start Consultation')).toBeTruthy();
    expect(card({}).getByText('Start Consultation')).toBeTruthy();
  });

  it('says Continue Consultation while documents are drafts', () => {
    const screen = card({ consultation_progress: 'in_progress' });
    expect(screen.getByText('Continue Consultation')).toBeTruthy();
    expect(screen.queryByText('Start Consultation')).toBeNull();
  });

  it('says Complete Consultation once the documents are finalized, never Start', () => {
    const screen = card({ consultation_progress: 'documents_finalized' });
    expect(screen.getByText('Complete Consultation')).toBeTruthy();
    expect(screen.queryByText('Start Consultation')).toBeNull();
    expect(screen.getByLabelText('Complete Consultation')).toBeTruthy();
  });

  it('a completed appointment shows no consultation button (the status badge, as before)', () => {
    const screen = card({ status: 'completed', consultation_progress: 'closed' });
    expect(screen.queryByText('Complete Consultation')).toBeNull();
    expect(screen.queryByText('Start Consultation')).toBeNull();
  });
});
