import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../features/auth/presentation/hooks/useAuth';
import {
  useArchiveCasesheetMutation,
  useCasesheetDetailQuery,
  usePrintCasesheetMutation,
  useTransitionCasesheetStatusMutation,
} from '../../../features/casesheets/data/repositories/casesheets.repository.impl';
import { CasesheetDetailScreen } from '../../../features/casesheets/presentation/pages/CasesheetDetailScreen';
import { useClientDetailQuery } from '../../../features/clients/data/repositories/clients.repository.impl';
import { useEpisodeQuery } from '../../../features/episodes/data/repositories/episodes.repository.impl';
import {
  useCreateTreatmentSheetMutation,
  useTreatmentSheetsByEpisodeQuery,
} from '../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl';

const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../features/casesheets/data/repositories/casesheets.repository.impl', () => ({
  useCasesheetDetailQuery: jest.fn(),
  useTransitionCasesheetStatusMutation: jest.fn(),
  usePrintCasesheetMutation: jest.fn(),
  useArchiveCasesheetMutation: jest.fn(),
}));
jest.mock('../../../features/clients/data/repositories/clients.repository.impl', () => ({
  useClientDetailQuery: jest.fn(),
}));
jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(),
}));
jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useCreateTreatmentSheetMutation: jest.fn(),
  useTreatmentSheetsByEpisodeQuery: jest.fn(),
}));
jest.mock('../../../features/casesheets/presentation/components/CasesheetStatusBadge', () => ({
  CasesheetStatusBadge: () => null,
}));
jest.mock('../../../core/clinicalPrint/ClinicalPrintPreviewModal', () => ({
  ClinicalPrintPreviewModal: () => null,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const mockUseRouter = useRouter as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseCasesheetDetailQuery = useCasesheetDetailQuery as jest.Mock;
const mockUseClientDetailQuery = useClientDetailQuery as jest.Mock;
const mockUseEpisodeQuery = useEpisodeQuery as jest.Mock;
const mockUseTreatmentSheetsByEpisodeQuery =
  useTreatmentSheetsByEpisodeQuery as jest.Mock;

const router = { back: jest.fn(), push: jest.fn() };
const idleMutation = { mutateAsync: jest.fn(), isPending: false };
const baseCasesheet = {
  id: 'casesheet-1',
  episode_id: 'episode-1',
  treatment_sheet_id: null,
  status: 'DRAFT',
  recorded_at: '2026-10-01T10:00:00.000Z',
  signed_at: null,
  chief_complaint: 'Knee pain',
  provisional_diagnosis: null,
  final_diagnosis: null,
  data_json: null,
  header_snapshot: null,
  footer_snapshot: null,
};

describe('CasesheetDetailScreen clinical read boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(router);
    mockUseLocalSearchParams.mockReturnValue({
      clientId: 'client-1',
      casesheetId: 'casesheet-1',
    });
    mockUseAuth.mockReturnValue({ currentUser: { tenantId: 'tenant-1' } });
    mockUseCasesheetDetailQuery.mockReturnValue({
      data: baseCasesheet,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    mockUseClientDetailQuery.mockReturnValue({ data: undefined });
    mockUseEpisodeQuery.mockReturnValue({ data: undefined });
    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: { treatment_sheets: [], total: 0 },
    });
    (useTransitionCasesheetStatusMutation as jest.Mock).mockReturnValue(idleMutation);
    (usePrintCasesheetMutation as jest.Mock).mockReturnValue(idleMutation);
    (useArchiveCasesheetMutation as jest.Mock).mockReturnValue(idleMutation);
    (useCreateTreatmentSheetMutation as jest.Mock).mockReturnValue(idleMutation);
  });

  it('composes the canonical tenant-scoped Case Sheet, Client, Episode, and Treatment Sheet queries', () => {
    render(<CasesheetDetailScreen />);

    expect(mockUseCasesheetDetailQuery).toHaveBeenCalledWith('tenant-1', 'casesheet-1');
    expect(mockUseClientDetailQuery).toHaveBeenCalledWith('tenant-1', 'client-1');
    expect(mockUseEpisodeQuery).toHaveBeenCalledWith('tenant-1', 'episode-1');
    expect(mockUseTreatmentSheetsByEpisodeQuery).toHaveBeenCalledWith(
      'tenant-1',
      'episode-1'
    );
  });

  it('passes empty dependent identities until the Case Sheet provides its Episode', () => {
    mockUseCasesheetDetailQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });

    const { getByText } = render(<CasesheetDetailScreen />);

    expect(mockUseEpisodeQuery).toHaveBeenCalledWith('tenant-1', '');
    expect(mockUseTreatmentSheetsByEpisodeQuery).toHaveBeenCalledWith('tenant-1', '');
    expect(getByText('Loading casesheet...')).toBeTruthy();
  });

  it('preserves partial-data behavior when the independent Client read has no data', () => {
    const { getByText, queryByText } = render(<CasesheetDetailScreen />);

    expect(getByText('Knee pain')).toBeTruthy();
    expect(queryByText('Patient One')).toBeNull();
  });

  it('preserves Client demographics and Case Sheet navigation behavior', () => {
    mockUseClientDetailQuery.mockReturnValue({
      data: {
        id: 'client-1',
        full_name: 'Patient One',
        age: 42,
        gender: 'female',
        phone: '9999999999',
      },
    });

    const { getByText, getByLabelText } = render(<CasesheetDetailScreen />);

    expect(getByText('Patient One')).toBeTruthy();
    expect(getByText('42/F')).toBeTruthy();
    expect(getByText('9999999999')).toBeTruthy();
    fireEvent.press(getByLabelText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('preserves direct-link priority and Episode-list fallback detection', () => {
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: { treatment_sheets: [{ id: 'fallback-sheet-1' }], total: 1 },
    });

    const first = render(<CasesheetDetailScreen />);
    expect(consoleLog).toHaveBeenCalledWith(
      '[CasesheetDetail] Treatment sheet detection:',
      expect.objectContaining({ finalTreatmentSheetId: 'fallback-sheet-1' })
    );
    first.unmount();

    mockUseCasesheetDetailQuery.mockReturnValue({
      data: { ...baseCasesheet, treatment_sheet_id: 'linked-sheet-1' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isRefetching: false,
    });
    render(<CasesheetDetailScreen />);
    expect(consoleLog).toHaveBeenCalledWith(
      '[CasesheetDetail] Treatment sheet detection:',
      expect.objectContaining({ finalTreatmentSheetId: 'linked-sheet-1' })
    );
    consoleLog.mockRestore();
  });

  it('contains no direct transport, endpoint construction, or datasource access', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../features/casesheets/presentation/pages/CasesheetDetailScreen.tsx'
      ),
      'utf8'
    );

    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
    expect(source).not.toMatch(/data\/datasources|\.api['"]/);
    expect(source).toMatch(/useClientDetailQuery/);
    expect(source).toMatch(/useEpisodeQuery/);
    expect(source).toMatch(/useTreatmentSheetsByEpisodeQuery/);
  });
});
