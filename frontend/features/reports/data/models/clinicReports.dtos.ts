/** What the clinic report endpoint returns (`GET /api/v1/clinic/{tenant}/reports/{report}`). Amounts are strings, dates are ISO text. */

export interface ClinicReportColumn { key: string; label: string }
export type ClinicReportCell = string | number | null;

export interface ClinicReportResponse {
  report: string;
  start_date: string;
  end_date: string;
  columns: ClinicReportColumn[];
  rows: Array<Record<string, ClinicReportCell>>;
  totals: Record<string, ClinicReportCell>;
  meta: Record<string, ClinicReportCell>;
}

export interface ClinicReportParams {
  start_date: string;
  end_date: string;
  dimension?: string;
  group_by?: string;
}
