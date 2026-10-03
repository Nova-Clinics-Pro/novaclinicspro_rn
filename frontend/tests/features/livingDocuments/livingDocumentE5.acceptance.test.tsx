import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CaseSheetVersionPanel } from '../../../features/casesheets/presentation/components/CaseSheetVersionPanel';
import { PrescriptionVersionPanel } from '../../../features/prescriptions/presentation/components/PrescriptionVersionPanel';
import { casesheetsKeys, useTransitionCasesheetStatusMutation } from '../../../features/casesheets/data/repositories/casesheets.repository.impl';
import { prescriptionsKeys, useUpdatePrescriptionMutation } from '../../../features/prescriptions/data/repositories/prescriptions.repository.impl';
import * as caseApi from '../../../features/casesheets/data/datasources/casesheets.api';
import * as prescriptionApi from '../../../features/prescriptions/data/datasources/prescriptions.api';

jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { primary: { default: '#2563EB', main: '#2563EB', onPrimary: '#fff' }, border: { default: '#ddd', subtle: '#eee' }, text: { primary: '#111', secondary: '#555', link: '#2563EB' }, feedback: { success: '#080', error: '#c00' } },
    spacing: { sm: 8, md: 16 }, typography: { h5: {}, h6: {}, body1: {}, body2: {}, caption: {}, button: {} },
  }),
}));
jest.mock('../../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string, params?: { number?: number }) => key === 'livingDocuments.version' ? `Version ${params?.number}` : ({
    'livingDocuments.versionHistory': 'Version history', 'livingDocuments.current': 'CURRENT', 'livingDocuments.superseded': 'SUPERSEDED',
    'livingDocuments.printVersion': 'Print version', 'livingDocuments.amend': 'Amend', 'livingDocuments.noSignedVersions': 'No signed versions',
    'livingDocuments.historicalVersion': 'Historical signed version', 'livingDocuments.historyError': 'History error', 'livingDocuments.printError': 'Print error', 'common.close': 'Close',
  } as Record<string, string>)[key] || key }),
}));
jest.mock('../../../core/clinicalPrint/ClinicalPrintPreviewModal', () => ({ ClinicalPrintPreviewModal: ({ visible, html }: any) => visible ? <>{`PRINT:${html}`}</> : null }));
jest.mock('../../../features/casesheets/data/datasources/casesheets.api', () => ({
  listCasesheetVersionsApi: jest.fn(), getCasesheetVersionApi: jest.fn(), printCasesheetVersionApi: jest.fn(), amendCasesheetApi: jest.fn(),
  transitionCasesheetStatusApi: jest.fn(), createCasesheetApi: jest.fn(), updateCasesheetApi: jest.fn(), listCasesheetsApi: jest.fn(), getCasesheetApi: jest.fn(), printCasesheetApi: jest.fn(), getCasesheetContributionsApi: jest.fn(), archiveCasesheetApi: jest.fn(),
}));
jest.mock('../../../features/prescriptions/data/datasources/prescriptions.api', () => ({
  listPrescriptionVersionsApi: jest.fn(), getPrescriptionVersionApi: jest.fn(), printPrescriptionVersionApi: jest.fn(), amendPrescriptionApi: jest.fn(),
  updatePrescriptionApi: jest.fn(), createPrescriptionApi: jest.fn(), listPrescriptionsApi: jest.fn(), getPrescriptionApi: jest.fn(), deletePrescriptionApi: jest.fn(), sharePrescriptionApi: jest.fn(), getPrescriptionPrintApi: jest.fn(),
}));

const tenant = 'tenant-e5';
const caseId = 'casesheet-e5';
const prescriptionId = 'prescription-e5';
const lineage = (type: 'CASE_SHEET' | 'PRESCRIPTION') => ({ document_identity_id: 'identity-e5', document_type: type, versions: [
  { version_id: 'v-42', version_number: 42, predecessor_version_id: 'v-7', is_current: false, is_superseded: true, signed_at: '2026-01-01', signed_by_staff_id: 'staff', amendment_reason: 'reason', amended_at: '2026-01-02' },
  { version_id: 'v-7', version_number: 7, predecessor_version_id: null, is_current: true, is_superseded: false, signed_at: '2025-01-01', signed_by_staff_id: 'staff', amendment_reason: null, amended_at: null },
] });

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapperFor = (client: QueryClient) => {
  const E5QueryClientWrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  E5QueryClientWrapper.displayName = 'E5QueryClientWrapper';
  return E5QueryClientWrapper;
};

describe('R7 T-FE-E.5 Living Document acceptance', () => {
  let client: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks(); client = makeClient();
    (caseApi.listCasesheetVersionsApi as jest.Mock).mockResolvedValue(lineage('CASE_SHEET'));
    (caseApi.getCasesheetVersionApi as jest.Mock).mockResolvedValue({ document_identity_id: 'identity-e5', document_type: 'CASE_SHEET', data_json: { immutable: 'case V42' } });
    (caseApi.printCasesheetVersionApi as jest.Mock).mockResolvedValue('<case-v42/>');
    (caseApi.amendCasesheetApi as jest.Mock).mockResolvedValue({ id: caseId, status: 'DRAFT' });
    (prescriptionApi.listPrescriptionVersionsApi as jest.Mock).mockResolvedValue(lineage('PRESCRIPTION'));
    (prescriptionApi.getPrescriptionVersionApi as jest.Mock).mockResolvedValue({ document_identity_id: 'identity-e5', document_type: 'PRESCRIPTION', prescription_data: { immutable: 'rx V42' } });
    (prescriptionApi.printPrescriptionVersionApi as jest.Mock).mockResolvedValue('<rx-v42/>');
    (prescriptionApi.amendPrescriptionApi as jest.Mock).mockResolvedValue({ id: prescriptionId, status: 'DRAFT' });
  });

  const renderCase = (canAmend = true) => render(<CaseSheetVersionPanel tenantId={tenant} casesheetId={caseId} signed canAmend={canAmend} onAmended={jest.fn()} />, { wrapper: wrapperFor(client) });
  const renderPrescription = (canAmend = true) => render(<PrescriptionVersionPanel tenantId={tenant} prescriptionId={prescriptionId} signed canAmend={canAmend} onAmended={jest.fn()} />, { wrapper: wrapperFor(client) });

  it('renders Case Sheet backend lineage verbatim, retrieves immutable history and prints/amends only by the existing ID', async () => {
    const ui = renderCase();
    await waitFor(() => expect(ui.getByText('Version 42')).toBeTruthy());
    expect(ui.getAllByText(/Version (42|7)/).map((node) => node.props.children)).toEqual(['Version 42', 'Version 7']);
    expect(ui.getByText('SUPERSEDED')).toBeTruthy(); expect(ui.getByText('CURRENT')).toBeTruthy();
    fireEvent.press(ui.getByTestId('casesheet-version-v-42'));
    await waitFor(() => expect(caseApi.getCasesheetVersionApi).toHaveBeenCalledWith(tenant, caseId, 'v-42'));
    await waitFor(() => expect(ui.getByTestId('casesheet-historical-read-only')).toBeTruthy());
    expect(ui.queryByText('Edit')).toBeNull(); expect(ui.queryByText('Save')).toBeNull(); expect(ui.queryByText('Delete')).toBeNull(); expect(ui.queryByText('Archive')).toBeNull();
    fireEvent.press(ui.getByTestId('casesheet-print-v-42'));
    await waitFor(() => expect(caseApi.printCasesheetVersionApi).toHaveBeenCalledWith(tenant, caseId, 'v-42'));
    fireEvent.press(ui.getByTestId('casesheet-amend'));
    await waitFor(() => expect(caseApi.amendCasesheetApi).toHaveBeenCalledWith(tenant, caseId));
    expect(caseApi.createCasesheetApi).not.toHaveBeenCalled();
    expect(ui.queryByText('Version 2')).toBeNull();
  });

  it('keeps Case Sheet amendment gated and does not fabricate an empty lineage', async () => {
    (caseApi.listCasesheetVersionsApi as jest.Mock).mockResolvedValue({ document_identity_id: 'identity-e5', document_type: 'CASE_SHEET', versions: [] });
    const ui = renderCase(false);
    await waitFor(() => expect(ui.getByText('No signed versions')).toBeTruthy());
    expect(ui.queryByText('Version 1')).toBeNull(); expect(ui.queryByTestId('casesheet-amend')).toBeNull();
  });

  it('renders Prescription backend lineage verbatim, retrieves immutable history and prints/amends only by the existing ID', async () => {
    const ui = renderPrescription();
    await waitFor(() => expect(ui.getByText('Version 42')).toBeTruthy());
    expect(ui.getAllByText(/Version (42|7)/).map((node) => node.props.children)).toEqual(['Version 42', 'Version 7']);
    expect(ui.getByText('SUPERSEDED')).toBeTruthy(); expect(ui.getByText('CURRENT')).toBeTruthy();
    fireEvent.press(ui.getByTestId('prescription-version-v-42'));
    await waitFor(() => expect(prescriptionApi.getPrescriptionVersionApi).toHaveBeenCalledWith(tenant, prescriptionId, 'v-42'));
    await waitFor(() => expect(ui.getByTestId('prescription-historical-read-only')).toBeTruthy());
    expect(ui.queryByText('Edit')).toBeNull(); expect(ui.queryByText('Save')).toBeNull(); expect(ui.queryByText('Delete')).toBeNull(); expect(ui.queryByText('Archive')).toBeNull();
    fireEvent.press(ui.getByTestId('prescription-print-v-42'));
    await waitFor(() => expect(prescriptionApi.printPrescriptionVersionApi).toHaveBeenCalledWith(tenant, prescriptionId, 'v-42'));
    fireEvent.press(ui.getByTestId('prescription-amend'));
    await waitFor(() => expect(prescriptionApi.amendPrescriptionApi).toHaveBeenCalledWith(tenant, prescriptionId));
    expect(prescriptionApi.createPrescriptionApi).not.toHaveBeenCalled();
    expect(ui.queryByText('Version 2')).toBeNull();
  });

  it('keeps Prescription amendment gated and does not fabricate an empty lineage', async () => {
    (prescriptionApi.listPrescriptionVersionsApi as jest.Mock).mockResolvedValue({ document_identity_id: 'identity-e5', document_type: 'PRESCRIPTION', versions: [] });
    const ui = renderPrescription(false);
    await waitFor(() => expect(ui.getByText('No signed versions')).toBeTruthy());
    expect(ui.queryByText('Version 1')).toBeNull(); expect(ui.queryByTestId('prescription-amend')).toBeNull();
  });

  it('invalidates Case Sheet lineage after canonical successor SIGN without locally rewriting V1/V2', async () => {
    (caseApi.transitionCasesheetStatusApi as jest.Mock).mockResolvedValue({ id: caseId, status: 'SIGNED' });
    const invalidate = jest.spyOn(client, 'invalidateQueries'); const set = jest.spyOn(client, 'setQueryData');
    const { result } = renderHook(() => useTransitionCasesheetStatusMutation(tenant, caseId), { wrapper: wrapperFor(client) });
    await act(async () => { await result.current.mutateAsync({ status: 'SIGNED' } as any); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: casesheetsKeys.versions(tenant, caseId) });
    expect(set).not.toHaveBeenCalledWith(casesheetsKeys.versions(tenant, caseId), expect.anything());
  });

  it('invalidates Prescription lineage after canonical successor SIGN without locally rewriting V1/V2', async () => {
    (prescriptionApi.updatePrescriptionApi as jest.Mock).mockResolvedValue({ id: prescriptionId, status: 'SIGNED' });
    const invalidate = jest.spyOn(client, 'invalidateQueries'); const set = jest.spyOn(client, 'setQueryData');
    const { result } = renderHook(() => useUpdatePrescriptionMutation(tenant, prescriptionId), { wrapper: wrapperFor(client) });
    await act(async () => { await result.current.mutateAsync({} as any); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: prescriptionsKeys.versions(tenant, prescriptionId) });
    expect(set).not.toHaveBeenCalledWith(prescriptionsKeys.versions(tenant, prescriptionId), expect.anything());
  });
});
