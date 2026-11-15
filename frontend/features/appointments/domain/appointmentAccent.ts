/**
 * The accent colour of an appointment card (its left border and a light tint).
 *
 * Doctor consultations and therapy appointments both start as "scheduled" and both used the status's blue, so they looked
 * the same in the list. While an appointment is still active (scheduled, confirmed, in progress) its KIND sets the accent: blue
 * for a doctor consultation, teal for a therapy appointment. Once it is finished (completed, cancelled, no-show) the status
 * colour takes over, so the outcome still reads at a glance. The status badge always shows the status colour.
 */
export const DOCTOR_ACCENT = '#3B82F6'; // blue
export const THERAPY_ACCENT = '#0D9488'; // teal

const FINISHED = new Set(['completed', 'cancelled', 'no_show']);

export const appointmentAccent = (
  status: string | null | undefined,
  isTherapy: boolean,
  statusColor: string
): { border: string; tint: string | null } => {
  const key = (status ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  if (FINISHED.has(key)) return { border: statusColor, tint: null };
  return isTherapy ? { border: THERAPY_ACCENT, tint: `${THERAPY_ACCENT}0F` } : { border: DOCTOR_ACCENT, tint: null };
};
