import { appointmentsListRoute, parseListDateParam } from '../../features/appointments/domain/appointmentsListRoute';

describe('appointmentsListRoute', () => {
  it('is the appointments list, opened on the given day when there is one', () => {
    expect(appointmentsListRoute('2026-11-20')).toBe('/clinic-admin/appointments?date=2026-11-20');
    expect(appointmentsListRoute()).toBe('/clinic-admin/appointments');
    expect(appointmentsListRoute(null)).toBe('/clinic-admin/appointments');
    expect(appointmentsListRoute('not-a-date')).toBe('/clinic-admin/appointments');
  });
});

describe('parseListDateParam', () => {
  const today = new Date(2026, 10, 14);

  it('opens on the day in the parameter', () => {
    const parsed = parseListDateParam('2026-11-20', today);
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([2026, 10, 20]);
    expect(parseListDateParam(['2026-12-01'], today).getDate()).toBe(1);
  });

  it('falls back to today for anything that is not a real calendar day', () => {
    for (const bad of [undefined, null, '', 'abc', '2026-13-01', '2026-02-30', '20261120']) {
      expect(parseListDateParam(bad as never, today)).toBe(today);
    }
  });
});
