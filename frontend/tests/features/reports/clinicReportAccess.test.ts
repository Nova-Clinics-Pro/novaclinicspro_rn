import { CLINIC_REPORTS, reportsForPermissions, resolveReportRange } from '../../../features/reports/domain/clinicReports';

const keys = (permissions: string[]) => reportsForPermissions(permissions).map((report) => report.key);

describe('which reports a person is offered', () => {
  it('lists the ten reports the owner decided on, in the order of the three groups', () => {
    expect(CLINIC_REPORTS.map((report) => report.key)).toEqual([
      'daily_collection', 'revenue_by_period', 'outstanding_dues', 'appointments_summary', 'patient_visits',
      'staff_workload', 'follow_up_retention', 'treatment_plan_progress', 'inventory_status', 'feedback_summary',
    ]);
  });

  it('the owner and admin are offered all ten', () => {
    expect(keys(['reports.clinic.view'])).toHaveLength(10);
  });

  it('the front desk is offered only the daily collection and the appointments summary', () => {
    expect(keys(['reports.desk.view'])).toEqual(['daily_collection', 'appointments_summary']);
  });

  it('a doctor or therapist is offered only their own workload', () => {
    expect(keys(['reports.own_workload.view'])).toEqual(['staff_workload']);
  });

  it('holding the old reports.view permission or none offers nothing', () => {
    expect(keys(['reports.view', 'invoice.read'])).toEqual([]);
    expect(keys([])).toEqual([]);
  });

  it('holding both the desk and the own-workload permission offers both', () => {
    expect(keys(['reports.desk.view', 'reports.own_workload.view'])).toEqual(['daily_collection', 'appointments_summary', 'staff_workload']);
  });

  it('each report says which options it offers', () => {
    const revenue = CLINIC_REPORTS.find((report) => report.key === 'revenue_by_period')!;
    expect(revenue.dimensions).toEqual(['period', 'service_type', 'doctor']);
    expect(revenue.groupBy).toBe(true);
    expect(revenue.groupByDimension).toBe('period');
    expect(CLINIC_REPORTS.find((report) => report.key === 'patient_visits')).toMatchObject({ dimensions: ['summary', 'top_patients'], groupByDimension: 'summary', defaultGroupBy: 'month' });
    expect(CLINIC_REPORTS.find((report) => report.key === 'follow_up_retention')!.dimensions).toEqual(['due', 'missed', 'lapsed']);
    expect(CLINIC_REPORTS.find((report) => report.key === 'treatment_plan_progress')).toMatchObject({ dimensions: ['summary', 'therapy'], groupByDimension: 'summary' });
    expect(CLINIC_REPORTS.find((report) => report.key === 'inventory_status')!.dimensions).toEqual(['stock', 'consumption']);
    expect(CLINIC_REPORTS.find((report) => report.key === 'feedback_summary')!.dimensions).toEqual(['doctor', 'therapist']);
    expect(CLINIC_REPORTS.find((report) => report.key === 'outstanding_dues')!.dimensions).toEqual(['patient', 'invoice']);
  });
});

describe('the date ranges offered', () => {
  const today = new Date(2026, 10, 23); // 23 Nov 2026

  it.each([
    ['today', '2026-11-23', '2026-11-23'],
    ['last7', '2026-11-17', '2026-11-23'],
    ['last30', '2026-10-25', '2026-11-23'],
    ['thisMonth', '2026-11-01', '2026-11-23'],
    ['lastMonth', '2026-10-01', '2026-10-31'],
  ] as const)('%s', (preset, start, end) => {
    expect(resolveReportRange(preset, today)).toEqual({ start, end });
  });

  it('works across a year end', () => {
    expect(resolveReportRange('lastMonth', new Date(2027, 0, 5))).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});
