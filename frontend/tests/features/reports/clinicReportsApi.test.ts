import { downloadClinicReportCsvApi, getClinicReportApi } from '../../../features/reports/data/datasources/clinicReports.api';
import { axiosClient } from '../../../core/api/axiosClient';

jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn() } }));
const get = axiosClient.get as jest.Mock;

describe('the clinic report calls', () => {
  beforeEach(() => get.mockReset());

  it('asks for one report of one clinic with the dates and only the options that were chosen', async () => {
    get.mockResolvedValueOnce({ data: { report: 'daily_collection', columns: [], rows: [], totals: {}, meta: {} } });
    const report = await getClinicReportApi('t1', 'revenue_by_period', { start_date: '2026-11-01', end_date: '2026-11-30', dimension: 'doctor' });
    expect(get).toHaveBeenCalledWith('/api/v1/clinic/t1/reports/revenue_by_period', {
      params: { start_date: '2026-11-01', end_date: '2026-11-30', dimension: 'doctor' },
    });
    expect(report.report).toBe('daily_collection');
  });

  it('drops options that were not chosen instead of sending them empty', async () => {
    get.mockResolvedValueOnce({ data: {} });
    await getClinicReportApi('t1', 'daily_collection', { start_date: 'a', end_date: 'b', dimension: undefined, group_by: '' });
    expect(get.mock.calls[0][1].params).toEqual({ start_date: 'a', end_date: 'b' });
  });

  it('downloads the same report as CSV text', async () => {
    get.mockResolvedValueOnce({ data: 'Date,Total\n2026-11-02,100\n' });
    const text = await downloadClinicReportCsvApi('t1', 'daily_collection', { start_date: 'a', end_date: 'b' });
    expect(get).toHaveBeenCalledWith('/api/v1/clinic/t1/reports/daily_collection', { params: { start_date: 'a', end_date: 'b', format: 'csv' }, responseType: 'text' });
    expect(text).toBe('Date,Total\n2026-11-02,100\n');
  });

  it('turns a refusal into a code the screen can explain', async () => {
    get.mockRejectedValueOnce({ response: { status: 400, data: { detail: { error_code: 'REPORT_RANGE_TOO_LONG', message: 'x' } } } });
    await expect(getClinicReportApi('t1', 'daily_collection', { start_date: 'a', end_date: 'b' })).rejects.toMatchObject({ code: 'REPORT_RANGE_TOO_LONG' });
    get.mockRejectedValueOnce({ response: { status: 403, data: { detail: { error_code: 'REPORT_NOT_ALLOWED' } } } });
    await expect(getClinicReportApi('t1', 'daily_collection', { start_date: 'a', end_date: 'b' })).rejects.toMatchObject({ code: 'REPORT_NOT_ALLOWED' });
    get.mockRejectedValueOnce(new Error('network'));
    await expect(getClinicReportApi('t1', 'daily_collection', { start_date: 'a', end_date: 'b' })).rejects.toMatchObject({ code: 'REPORT_FAILED' });
  });
});
