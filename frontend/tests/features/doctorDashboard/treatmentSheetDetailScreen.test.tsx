import React from 'react';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TreatmentSheetDetailScreen from '../../../features/treatmentSheets/presentation/pages/TreatmentSheetDetailScreen';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import {
  useArchiveTreatmentSheetMutation,
  usePrintTreatmentSheetMutation,
  useTreatmentSheetDetailQuery,
  useCanPauseTreatmentSeriesQuery,
  useCanResumeTreatmentSeriesQuery,
  useCanCancelTreatmentSeriesQuery,
  usePauseTreatmentSeriesMutation,
  useCancelTreatmentSeriesMutation,
} from '../../../features/treatmentSheets/index';
import {
  useTreatmentOrderQuery,
  useSendToSchedulingMutation,
  useReleaseTreatmentSheetMutation,
  useAddClinicalReviewNoteMutation,
  useRecordClinicalReviewOutcomeMutation,
} from '../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { useEpisodeQuery } from '../../../features/episodes/data/repositories/episodes.repository.impl';
import { useTreatmentSheetHeaderData } from '../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetHeaderData';
import { useTreatmentSheetRows } from '../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetRows';

/**
 * R7 · T-0.7 (ED-ARCH-001) — CHARACTERIZATION, created before production
 * remediation, per the task's Characterization-First Gate, then UPDATED
 * (mock boundary only, not product assertions) after the repoint to target
 * the new governed hooks in place of the removed `lifecycleApi`/
 * `axiosClient` calls — the same mock-boundary-follows-the-repoint pattern
 * established in T-0.2 through T-0.6. Locks TreatmentSheetDetailScreen's
 * current observable orchestration (route params, loading/error/data
 * wiring to its header/content children, isDoctor gating, navigation
 * actions, pause/cancel eligibility + mutation wiring).
 *
 * `TreatmentSheetDetailHeader`/`TreatmentSheetDetailContent` are shallow-
 * mocked (render only the specific props under test) rather than rendered
 * in full — their own deep rendering (row cards, lifecycle actions,
 * clinical review) is unchanged by T-0.7 and already covered elsewhere
 * (treatmentSheetHeaderLifecycleRepoint.test.tsx,
 * treatmentSheetInfoCardStatusRepoint.test.tsx); this file's job is only to
 * characterize what the SCREEN itself fetches and wires through.
 * `useTreatmentSheetRows` is likewise mocked here — its own behavior has
 * its own dedicated characterization (useTreatmentSheetRows.test.tsx).
 */

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      background: { default: '#fff' },
      primary: { default: '#2563EB' },
      text: { primary: '#111', secondary: '#666' },
    },
  }),
}));
jest.mock('../../../features/treatmentSheets/index', () => ({
  useTreatmentSheetDetailQuery: jest.fn(),
  usePrintTreatmentSheetMutation: jest.fn(),
  useArchiveTreatmentSheetMutation: jest.fn(),
  useCanPauseTreatmentSeriesQuery: jest.fn(),
  useCanResumeTreatmentSeriesQuery: jest.fn(),
  useCanCancelTreatmentSeriesQuery: jest.fn(),
  usePauseTreatmentSeriesMutation: jest.fn(),
  useCancelTreatmentSeriesMutation: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentOrders.repository.impl', () => ({
  useTreatmentOrderQuery: jest.fn(),
  useSendToSchedulingMutation: jest.fn(),
  useReleaseTreatmentSheetMutation: jest.fn(),
  useAddClinicalReviewNoteMutation: jest.fn(),
  useRecordClinicalReviewOutcomeMutation: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetHeaderData', () => ({
  useTreatmentSheetHeaderData: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetRows', () => ({
  useTreatmentSheetRows: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/presentation/components/CancelSeriesDialog', () => ({
  CancelSeriesDialog: () => null,
}));
jest.mock('../../../features/treatmentSheets/presentation/components/PatientScheduleModal', () => ({
  PatientScheduleModal: () => null,
}));
jest.mock('../../../features/treatmentSheets/presentation/components/PauseSeriesDialog', () => ({
  PauseSeriesDialog: () => null,
}));
jest.mock('../../../features/treatmentSheets/presentation/components/ScheduleRowModal', () => ({
  ScheduleRowModal: () => null,
}));
jest.mock('../../../core/clinicalPrint/ClinicalPrintPreviewModal', () => ({
  ClinicalPrintPreviewModal: () => null,
}));
jest.mock('../../../core/clinicalPrint/adapters', () => ({
  buildTreatmentSheetPrintHtml: jest.fn(() => '<html></html>'),
}));

let capturedHeaderProps: any = null;
let capturedContentProps: any = null;
jest.mock('../../../features/treatmentSheets/presentation/pages/detail/TreatmentSheetDetailHeader', () => ({
  TreatmentSheetDetailHeader: (props: any) => {
    capturedHeaderProps = props;
    const { Text: RNText } = require('react-native');
    return <RNText testID="header-marker">header</RNText>;
  },
}));
jest.mock('../../../features/treatmentSheets/presentation/pages/detail/TreatmentSheetDetailContent', () => ({
  TreatmentSheetDetailContent: (props: any) => {
    capturedContentProps = props;
    const { Text: RNText } = require('react-native');
    return <RNText testID="content-marker">content</RNText>;
  },
}));

const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

let queryClient: QueryClient;
const renderScreen = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <TreatmentSheetDetailScreen />
    </QueryClientProvider>,
  );

const baseTreatmentSheet = {
  id: 'sheet-1',
  episode_id: 'episode-1',
  case_sheet_id: 'casesheet-1',
  duration_days: 7,
  rows: [],
};

const baseTreatmentOrder = {
  id: 'sheet-1',
  version: 3,
  lifecycle_status: 'in_therapy',
  lifecycle_status_label: 'In Therapy',
  lifecycle_status_unresolved: false,
};

const mockRowsController = {
  rowsData: [],
  hasBeenSavedOnce: false,
  isSavingAll: false,
  updateRowField: jest.fn(),
  copyFromAbove: jest.fn(),
  toggleEditMode: jest.fn(),
  updateSingleRow: jest.fn(),
  saveAllRows: jest.fn(),
};

describe('TreatmentSheetDetailScreen (R7 · T-0.7 characterization)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    capturedHeaderProps = null;
    capturedContentProps = null;

    (useLocalSearchParams as jest.Mock).mockReturnValue({ treatmentSheetId: 'sheet-1', casesheetId: 'casesheet-1' });
    (useRouter as jest.Mock).mockReturnValue(router);
    (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['DOCTOR'] } });
    (useTreatmentSheetDetailQuery as jest.Mock).mockReturnValue({
      data: baseTreatmentSheet,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    (usePrintTreatmentSheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (useArchiveTreatmentSheetMutation as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (useTreatmentOrderQuery as jest.Mock).mockReturnValue({ data: baseTreatmentOrder, isLoading: false, refetch: jest.fn() });
    (useSendToSchedulingMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), status: 'idle', errorMessage: null, currentVersion: null, reset: jest.fn() });
    (useReleaseTreatmentSheetMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useAddClinicalReviewNoteMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useRecordClinicalReviewOutcomeMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useCanPauseTreatmentSeriesQuery as jest.Mock).mockReturnValue({ data: { allowed: true }, isLoading: false });
    (useCanResumeTreatmentSeriesQuery as jest.Mock).mockReturnValue({ data: { allowed: false }, isLoading: false });
    (useCanCancelTreatmentSeriesQuery as jest.Mock).mockReturnValue({ data: { allowed: true }, isLoading: false });
    (usePauseTreatmentSeriesMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useCancelTreatmentSeriesMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
    (useTreatmentSheetHeaderData as jest.Mock).mockReturnValue({ episodeData: null, clientData: null, isLoadingHeaderData: false });
    (useTreatmentSheetRows as jest.Mock).mockReturnValue(mockRowsController);
    (useEpisodeQuery as jest.Mock).mockReturnValue({
      refetch: jest.fn().mockResolvedValue({ data: { treatment_id: 'treatment-1', title: 'Chronic Knee Pain' } }),
    });
  });

  it('CHARACTERIZATION: reads only { treatmentSheetId, casesheetId } from route params and derives tenantId from the current user', () => {
    renderScreen();
    expect(useTreatmentSheetDetailQuery).toHaveBeenCalledWith('sheet-1', 'tenant-1');
  });

  it('CHARACTERIZATION: passes loading/error state straight through to TreatmentSheetDetailContent, unmodified', () => {
    (useTreatmentSheetDetailQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    renderScreen();
    expect(capturedContentProps.isLoading).toBe(true);
    expect(capturedContentProps.treatmentSheet).toBeUndefined();
  });

  it('CHARACTERIZATION: passes an error/missing-sheet state straight through to TreatmentSheetDetailContent, unmodified', () => {
    const err = new Error('404');
    (useTreatmentSheetDetailQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: jest.fn(),
      isRefetching: false,
    });
    renderScreen();
    expect(capturedContentProps.isError).toBe(true);
    expect(capturedContentProps.error).toBe(err);
    expect(capturedContentProps.treatmentSheet).toBeUndefined();
  });

  it('CHARACTERIZATION: isDoctor is true only when the current user has the DOCTOR role, and is passed to Content for row-content edit gating', () => {
    renderScreen();
    expect(capturedContentProps.isDoctor).toBe(true);

    (useAuth as jest.Mock).mockReturnValue({ currentUser: { tenantId: 'tenant-1', roles: ['ADMIN'] } });
    renderScreen();
    expect(capturedContentProps.isDoctor).toBe(false);
  });

  it('CHARACTERIZATION: passes the row controller (useTreatmentSheetRows\' own return value) through to Content unmodified, and its length to Header as rowsCount', () => {
    const rowsController = { ...mockRowsController, rowsData: [{ id: 'row-1' }, { id: 'row-2' }] };
    (useTreatmentSheetRows as jest.Mock).mockReturnValue(rowsController);
    renderScreen();
    expect(capturedContentProps.rows).toBe(rowsController);
    expect(capturedHeaderProps.rowsCount).toBe(2);
  });

  it('CHARACTERIZATION: passes the backend-resolved treatmentOrder (lifecycle_status/lifecycle_status_label/lifecycle_status_unresolved) straight through to Header and Content, unmodified — no local lifecycle re-derivation', () => {
    renderScreen();
    expect(capturedHeaderProps.treatmentOrder).toBe(baseTreatmentOrder);
    expect(capturedContentProps.treatmentOrder).toBe(baseTreatmentOrder);
    expect(capturedContentProps.treatmentOrder.lifecycle_status_label).toBe('In Therapy');
  });

  it('CHARACTERIZATION: onBack navigates back via the router', () => {
    renderScreen();
    capturedHeaderProps.onBack();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('CHARACTERIZATION: onViewAppointments navigates to the appointments list', () => {
    renderScreen();
    capturedContentProps.onViewAppointments();
    expect(router.push).toHaveBeenCalledWith('/clinic-admin/appointments');
  });

  it('CHARACTERIZATION: onScheduleAppointments fetches the episode (on demand, via refetch) and navigates with treatmentId/treatmentName/durationDays populated from it', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: { treatment_id: 'treatment-1', title: 'Chronic Knee Pain' } });
    (useEpisodeQuery as jest.Mock).mockReturnValue({ refetch });
    renderScreen();
    // Never auto-fetches on mount — only on demand when the handler runs.
    expect(refetch).not.toHaveBeenCalled();

    await act(async () => {
      await capturedContentProps.onScheduleAppointments();
    });
    expect(refetch).toHaveBeenCalledWith({ throwOnError: true });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/clinic-admin/appointments/create',
      params: expect.objectContaining({
        tab: 'MULTI',
        treatmentSheetId: 'sheet-1',
        episodeId: 'episode-1',
        caseSheetId: 'casesheet-1',
        treatmentId: 'treatment-1',
        treatmentName: 'Chronic Knee Pain',
        durationDays: '7',
      }),
    });
  });

  it('CHARACTERIZATION: onScheduleAppointments falls back to a minimal param set (no treatmentId/treatmentName) when the episode fetch fails', async () => {
    (useEpisodeQuery as jest.Mock).mockReturnValue({ refetch: jest.fn().mockRejectedValue(new Error('network down')) });
    renderScreen();
    await act(async () => {
      await capturedContentProps.onScheduleAppointments();
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/clinic-admin/appointments/create',
      params: {
        tab: 'MULTI',
        treatmentSheetId: 'sheet-1',
        episodeId: 'episode-1',
        durationDays: '7',
      },
    });
  });

  it('CHARACTERIZATION: pause/resume/cancel eligibility hooks are called with tenantId/treatmentSheetId, gated on the sheet being loaded, and their results are passed through to Content unmodified', async () => {
    renderScreen();
    expect(useCanPauseTreatmentSeriesQuery).toHaveBeenCalledWith('tenant-1', 'sheet-1', expect.objectContaining({ enabled: true }));
    expect(useCanResumeTreatmentSeriesQuery).toHaveBeenCalledWith('tenant-1', 'sheet-1', expect.objectContaining({ enabled: true }));
    expect(useCanCancelTreatmentSeriesQuery).toHaveBeenCalledWith('tenant-1', 'sheet-1', expect.objectContaining({ enabled: true }));
    expect(capturedContentProps.canPauseResult).toEqual({ allowed: true });
    expect(capturedContentProps.canResumeResult).toEqual({ allowed: false });
    expect(capturedContentProps.canCancelResult).toEqual({ allowed: true });
  });

  it('CHARACTERIZATION: pause/resume/cancel eligibility hooks stay disabled until the treatment sheet itself has loaded', () => {
    (useTreatmentSheetDetailQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    renderScreen();
    expect(useCanPauseTreatmentSeriesQuery).toHaveBeenCalledWith('tenant-1', 'sheet-1', expect.objectContaining({ enabled: false }));
  });

  it('CHARACTERIZATION: no document-status (DRAFT/FINAL/SIGNED) terminology is reintroduced into the screen\'s own gating logic — the source contains no treatmentSheet.status comparison', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/treatmentSheets/presentation/pages/TreatmentSheetDetailScreen.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/treatmentSheet\.status\s*===/);
  });
});
