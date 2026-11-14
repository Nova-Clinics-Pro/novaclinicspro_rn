/** The appointments list, optionally opened on a given day (YYYY-MM-DD) so a just-created appointment is visible. */
export const appointmentsListRoute = (date?: string | null): string =>
  date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `/clinic-admin/appointments?date=${date}` : '/clinic-admin/appointments';

/** The day the list should open on: the `date` route parameter when it is a real calendar day, else today. */
export const parseListDateParam = (value: string | string[] | null | undefined, today: Date = new Date()): Date => {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null;
  if (!match) return today;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(year, month - 1, day);
  const real = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  return real ? parsed : today;
};
