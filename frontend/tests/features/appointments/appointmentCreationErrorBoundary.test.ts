import { axiosClient } from '../../../core/api/axiosClient';
import {
  createAppointmentApi,
  normalizeAppointmentCreationError,
} from '../../../features/appointments/data/datasources/appointments.api';
import { AppointmentCreationError } from '../../../features/appointments/domain/errors/appointmentCreationError';

jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: {
    post: jest.fn(),
  },
}));

const asAxiosError = (overrides: Record<string, unknown> = {}) => ({
  isAxiosError: true,
  message: 'Request failed with status code 400',
  ...overrides,
});

describe('appointment creation error boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps a scheduling conflict detail to the stable conflict contract', () => {
    const error = normalizeAppointmentCreationError(asAxiosError({
      response: { data: { detail: 'This slot has an overlap with an existing appointment.' } },
    }));

    expect(error).toBeInstanceOf(AppointmentCreationError);
    expect(error).toMatchObject({
      kind: 'CREATE_FAILED',
      message: 'This slot has an overlap with an existing appointment.',
      isConflict: true,
    });
  });

  it('maps validation detail arrays and alternate backend error envelopes without exposing them to presentation', () => {
    expect(normalizeAppointmentCreationError(asAxiosError({
      response: { data: { detail: [{ msg: 'Appointment start is required.' }] } },
    }))).toMatchObject({ kind: 'CREATE_FAILED', message: 'Appointment start is required.', isConflict: false });

    expect(normalizeAppointmentCreationError(asAxiosError({
      response: { data: { error: 'Doctor is unavailable.' } },
    }))).toMatchObject({ kind: 'CREATE_FAILED', message: 'Doctor is unavailable.' });

    expect(normalizeAppointmentCreationError(asAxiosError({
      response: { data: { message: 'Room is unavailable.' } },
    }))).toMatchObject({ kind: 'CREATE_FAILED', message: 'Room is unavailable.' });
  });

  it('keeps the established post-submit network acknowledgement as a feature outcome', () => {
    expect(normalizeAppointmentCreationError(asAxiosError({
      message: 'Network Error',
      response: undefined,
    }))).toMatchObject({
      kind: 'NETWORK_AFTER_SUBMIT',
      message: 'The appointment was saved. There was a brief network issue loading the confirmation.',
    });
  });

  it('does not surface technical backend details as appointment messages', () => {
    expect(normalizeAppointmentCreationError(asAxiosError({
      response: { data: { detail: 'SQL traceback: SELECT patient records' } },
    }))).toMatchObject({
      kind: 'CREATE_FAILED',
      message: 'Failed to create appointment.',
      isConflict: false,
    });
  });

  it('preserves tenant-scoped endpoint and payload while rejecting the normalized feature error', async () => {
    const payload = {
      client_id: 'client-1',
      appointment_start: '2026-10-11T09:00:00',
      status: 'scheduled',
    };
    (axiosClient.post as jest.Mock).mockRejectedValue(asAxiosError({
      response: { data: { detail: 'Doctor already has an appointment.' } },
    }));

    await expect(createAppointmentApi('tenant-1', payload)).rejects.toMatchObject({
      kind: 'CREATE_FAILED',
      isConflict: true,
    });
    expect(axiosClient.post).toHaveBeenCalledWith('/api/v1/clinic/tenant-1/appointments', payload);
  });
});
