import type { ClinicReportCell, ClinicReportColumn } from '../data/models/clinicReports.dtos';

type Translate = (key: string) => string;
type HasTranslation = (key: string) => boolean;

const AMOUNT_COLUMNS: ReadonlySet<string> = new Set([
  'cash', 'upi', 'card', 'net_banking', 'insurance', 'other', 'total', 'billed', 'collected', 'due', 'paid', 'outstanding',
  'not_due', '0-7', '8-30', '30+', 'consumption_value', 'stock_value',
]);
const PERCENT_COLUMNS: ReadonlySet<string> = new Set(['no_show_rate', 'utilisation', 'completion_rate', 'response_rate']);
const ONE_DECIMAL_COLUMNS: ReadonlySet<string> = new Set(['available_hours', 'booked_hours', 'average_rating']);
const DATE_COLUMN = /(^|_)date$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const KEY_PREFIX = 'reports.clinic';

/** A column's heading: its translation, otherwise the label the server sent. */
export const reportColumnLabel = (column: ClinicReportColumn, t: Translate, hasTranslation: HasTranslation): string => {
  const key = `${KEY_PREFIX}.columns.${column.key}`;
  return hasTranslation(key) ? t(key) : column.label;
};

/** One cell as the reader sees it: amounts with two decimals, dates in their format, known words translated. */
export const formatReportCell = (
  columnKey: string,
  value: ClinicReportCell | undefined,
  locale: string,
  t?: Translate,
  hasTranslation?: HasTranslation,
): string => {
  if (value === null || value === undefined || value === '') return '';
  if (AMOUNT_COLUMNS.has(columnKey) && /^-?\d+(\.\d+)?$/.test(String(value))) {
    return Number(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (/^-?\d+(\.\d+)?$/.test(String(value)) && (PERCENT_COLUMNS.has(columnKey) || ONE_DECIMAL_COLUMNS.has(columnKey))) {
    const shown = Number(value).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return PERCENT_COLUMNS.has(columnKey) ? `${shown}%` : shown;
  }
  const text = String(value);
  if (DATE_COLUMN.test(columnKey) && ISO_DAY.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const valueKey = `${KEY_PREFIX}.values.${text}`;
  if (t && hasTranslation && hasTranslation(valueKey)) return t(valueKey);
  return text;
};

/** The totals as one row of cells (the first says Total), or undefined when the report has no totals. */
export const reportTotalsRow = (
  columns: ClinicReportColumn[],
  totals: Record<string, ClinicReportCell>,
  totalLabel: string,
  locale: string,
): string[] | undefined => {
  if (!Object.keys(totals).length) return undefined;
  return columns.map((column, index) => (index === 0 ? totalLabel : formatReportCell(column.key, totals[column.key], locale)));
};
