import type { AppointmentResponse } from '../data/models/appointments.dtos';
import { formatDate, formatTime } from '../../../core/utils/dateTimeUtils';
import { calculateDuration, formatDuration, getStaffName, isTherapyAppointment } from './helpers';

/**
 * Whether the appointment page shows the Episode box. An episode is a clinical case a doctor opens and follows; a therapy
 * appointment (assigned to therapists) belongs to a treatment, not a case, so an empty "No episode linked" box with Create
 * and Link buttons is noise there. A therapy appointment that does have an episode still shows it.
 */
export const showsEpisodeSection = (appointment: Pick<AppointmentResponse, 'episode_id' | 'therapist_ids'> | null): boolean =>
  !!appointment && (!!appointment.episode_id || !isTherapyAppointment(appointment as AppointmentResponse));

export type AppointmentDetailKey = 'date' | 'time' | 'service' | 'staff' | 'room' | 'session';

export interface AppointmentDetailRow {
  key: AppointmentDetailKey;
  value: string;
}

/**
 * What the appointment page says about the appointment itself: when, what, with whom, where. Rows with nothing to show are
 * left out. (The page used to show only the status, the episode and the client: no date, time, treatment, staff or room.)
 */
export const appointmentDetailRows = (appointment: AppointmentResponse): AppointmentDetailRow[] => {
  const rows: AppointmentDetailRow[] = [];
  rows.push({ key: 'date', value: formatDate(appointment.appointment_start) });

  const start = formatTime(appointment.appointment_start);
  const end = appointment.appointment_end ? formatTime(appointment.appointment_end) : null;
  const minutes = calculateDuration(appointment.appointment_start, appointment.appointment_end ?? null);
  rows.push({
    key: 'time',
    value: `${end ? `${start} – ${end}` : start}${minutes ? ` (${formatDuration(minutes)})` : ''}`,
  });

  if (appointment.treatment_name) rows.push({ key: 'service', value: appointment.treatment_name });

  const staff = getStaffName(appointment);
  if (staff && staff !== 'Unassigned') rows.push({ key: 'staff', value: staff });

  if (appointment.room_name) rows.push({ key: 'room', value: appointment.room_name });

  if (appointment.series_id && appointment.session_number) {
    rows.push({
      key: 'session',
      value: appointment.total_sessions
        ? `${appointment.session_number}/${appointment.total_sessions}`
        : String(appointment.session_number),
    });
  }
  return rows;
};
