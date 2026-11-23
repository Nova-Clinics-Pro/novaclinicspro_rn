import { axiosClient } from '../../../../core/api/axiosClient';
import { ClinicReportError } from '../../domain/clinicReportError';
import type { ClinicReportParams, ClinicReportResponse } from '../models/clinicReports.dtos';

const path = (tenantId: string, report: string) => `/api/v1/clinic/${tenantId}/reports/${report}`;

/** Only the options that were chosen: an empty option would be refused by the server as an invalid one. */
const queryParams = (params: ClinicReportParams): Record<string, string> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => typeof value === 'string' && value !== '')) as Record<string, string>;

const toError = (error: unknown): ClinicReportError => {
  const detail = (error as { response?: { data?: { detail?: { error_code?: unknown } } } } | undefined)?.response?.data?.detail;
  const code = typeof detail === 'object' && detail !== null && typeof detail.error_code === 'string' ? detail.error_code : 'REPORT_FAILED';
  return new ClinicReportError(code);
};

/** One report of one clinic for a range of days. */
export const getClinicReportApi = async (tenantId: string, report: string, params: ClinicReportParams): Promise<ClinicReportResponse> => {
  try {
    return (await axiosClient.get<ClinicReportResponse>(path(tenantId, report), { params: queryParams(params) })).data;
  } catch (error) {
    throw toError(error);
  }
};

/** The same report as CSV text, for a download. */
export const downloadClinicReportCsvApi = async (tenantId: string, report: string, params: ClinicReportParams): Promise<string> => {
  try {
    return (await axiosClient.get<string>(path(tenantId, report), { params: { ...queryParams(params), format: 'csv' }, responseType: 'text' })).data;
  } catch (error) {
    throw toError(error);
  }
};
