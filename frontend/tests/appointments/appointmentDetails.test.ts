import { appointmentDetailRows, showsEpisodeSection } from '../../features/appointments/domain/appointmentDetails';

const base = {
  id: 'a1',
  client_id: 'c1',
  appointment_start: '2026-11-14T10:00:00',
  appointment_end: '2026-11-14T11:00:00',
  status: 'scheduled',
} as never;

const appointment = (overrides: Record<string, unknown> = {}) => ({ ...(base as object), ...overrides }) as never;

describe('showsEpisodeSection', () => {
  it('shows the Episode box for a doctor appointment, with or without an episode', () => {
    expect(showsEpisodeSection(appointment({ doctor_id: 'd1', therapist_ids: [] }))).toBe(true);
    expect(showsEpisodeSection(appointment({ doctor_id: 'd1', therapist_ids: [], episode_id: 'e1' }))).toBe(true);
  });

  it('hides it for a therapy appointment that has no episode', () => {
    expect(showsEpisodeSection(appointment({ therapist_ids: ['t1'], doctor_id: null }))).toBe(false);
  });

  it('still shows it for a therapy appointment that does have an episode', () => {
    expect(showsEpisodeSection(appointment({ therapist_ids: ['t1'], episode_id: 'e1' }))).toBe(true);
  });

  it('shows nothing for no appointment', () => {
    expect(showsEpisodeSection(null)).toBe(false);
  });
});

describe('appointmentDetailRows', () => {
  it('says when, what, with whom and where for a therapy appointment', () => {
    const rows = appointmentDetailRows(
      appointment({
        therapist_ids: ['t1'],
        staff_assignments: [{ id: 't1', name: 'T-M-1' }],
        treatment_name: 'Abhyanga Massage',
        room_name: 'Room 2',
      })
    );
    const byKey = Object.fromEntries(rows.map(row => [row.key, row.value]));
    expect(Object.keys(byKey)).toEqual(['date', 'time', 'service', 'staff', 'room']);
    expect(byKey.service).toBe('Abhyanga Massage');
    expect(byKey.staff).toBe('T-M-1');
    expect(byKey.room).toBe('Room 2');
    expect(byKey.time).toMatch(/–/); // a start–end range
    expect(byKey.time).toMatch(/1 hr|60 min/i); // and its length
  });

  it('leaves out what is not known instead of printing blanks', () => {
    const rows = appointmentDetailRows(appointment({ doctor_id: null, therapist_ids: [] }));
    expect(rows.map(row => row.key)).toEqual(['date', 'time']);
  });

  it('names the doctor for a consultation and the session of a multi-day treatment', () => {
    const rows = appointmentDetailRows(
      appointment({ doctor_id: 'd1', therapist_ids: [], staff_name: 'L Haresh', series_id: 's1', session_number: 2, total_sessions: 5 })
    );
    const byKey = Object.fromEntries(rows.map(row => [row.key, row.value]));
    expect(byKey.staff).toBe('L Haresh');
    expect(byKey.session).toBe('2/5');
  });
});
