/**
 * The clinic's own reports: the ten reports, who is offered which, and the date ranges a person can pick quickly.
 * Pure; the server decides what a person may really open (these only decide what is offered).
 */

export type ClinicReportKey =
  | 'daily_collection' | 'revenue_by_period' | 'outstanding_dues' | 'appointments_summary' | 'patient_visits'
  | 'staff_workload' | 'follow_up_retention' | 'treatment_plan_progress' | 'inventory_status' | 'feedback_summary';

export type ClinicReportGroup = 'money' | 'operations' | 'clinical';

export interface ClinicReportDefinition {
  key: ClinicReportKey;
  group: ClinicReportGroup;
  icon: string;
  /** The ways the report can be split, first is the default (the server validates them). */
  dimensions?: readonly string[];
  /** Whether the report can group its rows by day, week or month. */
  groupBy?: boolean;
  /** The split on which the grouping applies, when the report has splits (the grouping is offered only there). */
  groupByDimension?: string;
  /** The grouping the report starts with (the server's own default). */
  defaultGroupBy?: 'day' | 'week' | 'month';
}

export const CLINIC_REPORTS: readonly ClinicReportDefinition[] = [
  { key: 'daily_collection', group: 'money', icon: 'cash-outline' },
  { key: 'revenue_by_period', group: 'money', icon: 'trending-up-outline', dimensions: ['period', 'service_type', 'doctor'], groupBy: true, groupByDimension: 'period' },
  { key: 'outstanding_dues', group: 'money', icon: 'time-outline', dimensions: ['patient', 'invoice'] },
  { key: 'appointments_summary', group: 'operations', icon: 'calendar-outline', groupBy: true },
  { key: 'patient_visits', group: 'operations', icon: 'people-outline', dimensions: ['summary', 'top_patients'], groupBy: true, groupByDimension: 'summary', defaultGroupBy: 'month' },
  { key: 'staff_workload', group: 'operations', icon: 'person-outline' },
  { key: 'follow_up_retention', group: 'operations', icon: 'repeat-outline', dimensions: ['due', 'missed', 'lapsed'] },
  { key: 'treatment_plan_progress', group: 'clinical', icon: 'medkit-outline', dimensions: ['summary', 'therapy'], groupBy: true, groupByDimension: 'summary', defaultGroupBy: 'month' },
  { key: 'inventory_status', group: 'clinical', icon: 'cube-outline', dimensions: ['stock', 'consumption'] },
  { key: 'feedback_summary', group: 'clinical', icon: 'star-outline', dimensions: ['doctor', 'therapist'] },
];

export const ALL_REPORTS_PERMISSION = 'reports.clinic.view';
export const DESK_REPORTS_PERMISSION = 'reports.desk.view';
export const OWN_WORKLOAD_PERMISSION = 'reports.own_workload.view';

const DESK_REPORT_KEYS: ReadonlySet<ClinicReportKey> = new Set(['daily_collection', 'appointments_summary']);

/** The reports to offer a person who holds these permissions. */
export const reportsForPermissions = (permissions: readonly string[]): ClinicReportDefinition[] => {
  const held = new Set(permissions);
  if (held.has(ALL_REPORTS_PERMISSION)) return [...CLINIC_REPORTS];
  return CLINIC_REPORTS.filter(
    (report) =>
      (held.has(DESK_REPORTS_PERMISSION) && DESK_REPORT_KEYS.has(report.key)) ||
      (held.has(OWN_WORKLOAD_PERMISSION) && report.key === 'staff_workload'),
  );
};

export type ReportRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';
export interface ReportDateRange { start: string; end: string }

const iso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const daysBefore = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);

/** A quick date range counted back from `today` (the clinic's own calendar days, inclusive). */
export const resolveReportRange = (preset: ReportRangePreset, today: Date = new Date()): ReportDateRange => {
  switch (preset) {
    case 'today': return { start: iso(today), end: iso(today) };
    case 'last7': return { start: iso(daysBefore(today, 6)), end: iso(today) };
    case 'last30': return { start: iso(daysBefore(today, 29)), end: iso(today) };
    case 'thisMonth': return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: iso(first), end: iso(last) };
    }
  }
};
