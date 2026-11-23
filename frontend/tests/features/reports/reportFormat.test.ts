import { formatReportCell, reportColumnLabel, reportTotalsRow } from '../../../features/reports/domain/reportFormat';

const translations: Record<string, string> = {
  'reports.clinic.columns.billed': 'Billed',
  'reports.clinic.values.unassigned': 'Not assigned',
  'reports.clinic.values.treatment': 'Treatment',
};
const has = (key: string) => key in translations;
const tr = (key: string) => translations[key] ?? key;

describe('showing a report', () => {
  it('a column uses its translation, and the server label when there is none', () => {
    expect(reportColumnLabel({ key: 'billed', label: 'Billed (server)' }, tr, has)).toBe('Billed');
    expect(reportColumnLabel({ key: 'weird', label: 'Weird (server)' }, tr, has)).toBe('Weird (server)');
  });

  it('amounts are shown with two decimals in the reader\'s number format', () => {
    expect(formatReportCell('billed', '1700.5', 'en-IN')).toBe('1,700.50');
    expect(formatReportCell('collected', '0', 'en-IN')).toBe('0.00');
    expect(formatReportCell('outstanding', '125000', 'en-IN')).toBe('1,25,000.00');
  });

  it('counts, labels and empty cells are left as they are', () => {
    expect(formatReportCell('invoices', 3, 'en-IN')).toBe('3');
    expect(formatReportCell('patient', 'Maya Rao', 'en-IN')).toBe('Maya Rao');
    expect(formatReportCell('due_date', null, 'en-IN')).toBe('');
  });

  it('known words in a cell are translated (service type, unassigned)', () => {
    expect(formatReportCell('service_type', 'treatment', 'en-IN', tr, has)).toBe('Treatment');
    expect(formatReportCell('name', 'unassigned', 'en-IN', tr, has)).toBe('Not assigned');
    expect(formatReportCell('name', 'Dr. Rao', 'en-IN', tr, has)).toBe('Dr. Rao');
  });

  it('rates are percentages and hours have one decimal', () => {
    expect(formatReportCell('no_show_rate', '22.2', 'en-IN')).toBe('22.2%');
    expect(formatReportCell('utilisation', '0.0', 'en-IN')).toBe('0.0%');
    expect(formatReportCell('available_hours', '2288.0', 'en-IN')).toBe('2,288.0');
  });

  it('dates are shown in the reader\'s date format', () => {
    expect(formatReportCell('date', '2026-11-02', 'en-IN')).toBe('2 Nov 2026');
    expect(formatReportCell('invoice_date', '2026-11-02', 'en-IN')).toBe('2 Nov 2026');
  });

  it('the totals row starts with the word Total and has one cell per column', () => {
    const columns = [{ key: 'date', label: 'Date' }, { key: 'total', label: 'Total' }];
    expect(reportTotalsRow(columns, { total: '2000.5' }, 'Total', 'en-IN')).toEqual(['Total', '2,000.50']);
    expect(reportTotalsRow(columns, {}, 'Total', 'en-IN')).toBeUndefined();
  });
});
