import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ClinicReportScreen } from '../../../features/reports/presentation/pages/ClinicReportScreen';
import { ReportsHomeScreen } from '../../../features/reports/presentation/pages/ReportsHomeScreen';
import { ClinicReportError } from '../../../features/reports/domain/clinicReportError';
import { saveTextFile } from '../../../core/utils/saveTextFile';
import { changeLanguage } from '../../../core/localization/i18n';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { reportKey: 'daily_collection' };
let mockPermissions: string[] = ['reports.clinic.view'];
let mockReport: any = { data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() };
const mockCsv = jest.fn();
const mockQuery = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }), useLocalSearchParams: () => mockParams }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../../core/clinicalPrint/ClinicalPrintPreviewModal', () => ({ ClinicalPrintPreviewModal: () => null }));
jest.mock('../../../core/utils/saveTextFile', () => ({ saveTextFile: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { tenantId: 't1', clinicName: 'Nova Clinic', permissions: mockPermissions } }),
}));
jest.mock('../../../features/reports/data/repositories/clinicReports.repository.impl', () => ({
  useClinicReportQuery: (...args: unknown[]) => { mockQuery(...args); return mockReport; },
  useClinicReportCsvMutation: () => ({ mutateAsync: mockCsv, isPending: false }),
}));

const table = {
  data: {
    report: 'daily_collection', start_date: '2026-10-25', end_date: '2026-11-23',
    columns: [{ key: 'date', label: 'Date' }, { key: 'cash', label: 'Cash' }, { key: 'total', label: 'Total' }],
    rows: [{ date: '2026-11-02', cash: '500.00', total: '500.00' }, { date: '2026-11-03', cash: '300.00', total: '300.00' }],
    totals: { cash: '800.00', total: '800.00' }, meta: {},
  },
  isLoading: false, isError: false, error: null, refetch: jest.fn(),
};

describe('a clinic report', () => {
  beforeEach(() => { changeLanguage('en-US'); mockQuery.mockClear(); mockCsv.mockReset(); (saveTextFile as jest.Mock).mockClear(); mockParams = { reportKey: 'daily_collection' }; });

  it('shows the rows with amounts formatted and a totals row', () => {
    mockReport = table;
    const view = render(<ClinicReportScreen />);
    expect(view.getByText('Daily collection')).toBeTruthy();
    expect(view.getByText('2 Nov 2026')).toBeTruthy();
    expect(view.getAllByText('500.00').length).toBeGreaterThan(0);
    expect(view.getByTestId('report-totals')).toBeTruthy();
    expect(view.getAllByText('800.00').length).toBe(2);
  });

  it('asks for the last 30 days at first and for another range when one is picked', () => {
    mockReport = table;
    const view = render(<ClinicReportScreen />);
    const first = mockQuery.mock.calls[0];
    expect(first[0]).toBe('t1'); expect(first[1]).toBe('daily_collection');
    expect(first[2].end_date >= first[2].start_date).toBe(true);
    fireEvent.press(view.getByTestId('report-preset-today'));
    const last = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][2];
    expect(last.start_date).toBe(last.end_date);
  });

  it('refuses dates that are not typed as YYYY-MM-DD and does not ask the server', () => {
    mockReport = table;
    const view = render(<ClinicReportScreen />);
    const before = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][2];
    fireEvent.changeText(view.getByTestId('report-start'), '23/11/2026');
    fireEvent.press(view.getByTestId('report-apply'));
    expect(view.getByTestId('report-date-error')).toBeTruthy();
    const after = mockQuery.mock.calls[mockQuery.mock.calls.length - 1][2];
    expect(after.start_date).toBe(before.start_date);                           // the report still asks for the dates it had
  });

  it('says so when there is nothing for the dates', () => {
    mockReport = { ...table, data: { ...table.data, rows: [], totals: {} } };
    expect(render(<ClinicReportScreen />).getByTestId('report-empty')).toBeTruthy();
  });

  it('explains a refusal from the server in words, with a way to try again', () => {
    mockReport = { data: undefined, isLoading: false, isError: true, error: new ClinicReportError('REPORT_RANGE_TOO_LONG'), refetch: jest.fn() };
    const view = render(<ClinicReportScreen />);
    expect(view.getByTestId('report-error').props.children).toBe('That range is too long. Pick a shorter one.');
    fireEvent.press(view.getByTestId('report-retry'));
    expect(mockReport.refetch).toHaveBeenCalled();
  });

  it('exports the same report as a CSV file named for the report and dates', async () => {
    mockReport = table;
    mockCsv.mockResolvedValueOnce('Date,Cash\n');
    const view = render(<ClinicReportScreen />);
    fireEvent.press(view.getByTestId('report-export'));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalled());
    expect((saveTextFile as jest.Mock).mock.calls[0][0]).toMatch(/^daily_collection_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
    expect((saveTextFile as jest.Mock).mock.calls[0][1]).toBe('Date,Cash\n');
  });

  it('the revenue report offers its splits and grouping', () => {
    mockParams = { reportKey: 'revenue_by_period' };
    mockReport = { ...table, data: { ...table.data, report: 'revenue_by_period' } };
    const view = render(<ClinicReportScreen />);
    fireEvent.press(view.getByTestId('report-dimension-doctor'));
    expect(mockQuery.mock.calls[mockQuery.mock.calls.length - 1][2].dimension).toBe('doctor');
    expect(view.queryByTestId('report-group-week')).toBeNull();                  // grouping applies to the period split only
    fireEvent.press(view.getByTestId('report-dimension-period'));
    fireEvent.press(view.getByTestId('report-group-week'));
    expect(mockQuery.mock.calls[mockQuery.mock.calls.length - 1][2].group_by).toBe('week');
  });

  it('is available in Hindi', () => {
    changeLanguage('hi-IN');
    mockReport = table;
    expect(render(<ClinicReportScreen />).getByText('दैनिक वसूली')).toBeTruthy();
  });
});

describe('the reports home', () => {
  beforeEach(() => { changeLanguage('en-US'); mockPush.mockClear(); });

  it('offers the owner all ten and opens one', () => {
    mockPermissions = ['reports.clinic.view'];
    const view = render(<ReportsHomeScreen />);
    expect(view.getAllByTestId(/^report-card-/)).toHaveLength(10);
    fireEvent.press(view.getByTestId('report-card-outstanding_dues'));
    expect(mockPush).toHaveBeenCalledWith('/clinic-admin/reports/outstanding_dues');
  });

  it('offers the front desk only its two', () => {
    mockPermissions = ['reports.desk.view'];
    const view = render(<ReportsHomeScreen />);
    expect(view.getAllByTestId(/^report-card-/).map((node) => node.props.testID)).toEqual(['report-card-daily_collection', 'report-card-appointments_summary']);
  });

  it('says so when a person has no report', () => {
    mockPermissions = ['reports.view'];
    expect(render(<ReportsHomeScreen />).getByTestId('reports-no-access')).toBeTruthy();
  });
});
