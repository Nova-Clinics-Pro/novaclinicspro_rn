import { useMutation, useQuery } from '@tanstack/react-query';
import { downloadClinicReportCsvApi, getClinicReportApi } from '../datasources/clinicReports.api';
import type { ClinicReportParams, ClinicReportResponse } from '../models/clinicReports.dtos';
import type { ClinicReportError } from '../../domain/clinicReportError';

export const clinicReportKeys = {
  all: ['clinic-reports'] as const,
  report: (tenantId: string, report: string, params: ClinicReportParams) => [...clinicReportKeys.all, tenantId, report, params] as const,
};

/** One clinic report; re-read when the clinic, report, dates or options change. */
export const useClinicReportQuery = (tenantId: string, report: string, params: ClinicReportParams) =>
  useQuery<ClinicReportResponse, ClinicReportError>({
    queryKey: clinicReportKeys.report(tenantId, report, params),
    queryFn: () => getClinicReportApi(tenantId, report, params),
    enabled: !!tenantId && !!report && !!params.start_date && !!params.end_date,
    retry: false,
  });

/** The CSV of the report being shown. */
export const useClinicReportCsvMutation = (tenantId: string, report: string) =>
  useMutation<string, ClinicReportError, ClinicReportParams>({
    mutationFn: (params) => downloadClinicReportCsvApi(tenantId, report, params),
  });
