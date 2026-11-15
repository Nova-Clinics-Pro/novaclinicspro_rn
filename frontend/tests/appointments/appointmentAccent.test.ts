import { appointmentAccent, DOCTOR_ACCENT, THERAPY_ACCENT } from '../../features/appointments/domain/appointmentAccent';

describe('appointmentAccent', () => {
  it('an active doctor consultation is blue and a therapy appointment is a different colour', () => {
    for (const status of ['scheduled', 'confirmed', 'in_progress', 'SCHEDULED']) {
      expect(appointmentAccent(status, false, '#3B82F6').border).toBe(DOCTOR_ACCENT);
      expect(appointmentAccent(status, true, '#3B82F6').border).toBe(THERAPY_ACCENT);
    }
    expect(THERAPY_ACCENT).not.toBe(DOCTOR_ACCENT);
  });

  it('only therapy cards get a tint', () => {
    expect(appointmentAccent('scheduled', true, '#000').tint).toBeTruthy();
    expect(appointmentAccent('scheduled', false, '#000').tint).toBeNull();
  });

  it('a finished appointment keeps the status colour whatever its kind', () => {
    for (const status of ['completed', 'cancelled', 'no_show', 'No-Show']) {
      expect(appointmentAccent(status, true, '#EF4444')).toEqual({ border: '#EF4444', tint: null });
      expect(appointmentAccent(status, false, '#059669')).toEqual({ border: '#059669', tint: null });
    }
  });
});
