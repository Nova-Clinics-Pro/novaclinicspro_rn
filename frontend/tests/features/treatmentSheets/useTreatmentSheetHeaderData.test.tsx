import { readFileSync } from 'fs';
import { resolve } from 'path';
import { renderHook } from '@testing-library/react-native';
import { useEpisodeQuery } from '../../../features/episodes/data/repositories/episodes.repository.impl';
import { useClientDetailQuery } from '../../../features/clients/data/repositories/clients.repository.impl';
import { useTreatmentSheetHeaderData } from '../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetHeaderData';

jest.mock('../../../features/episodes/data/repositories/episodes.repository.impl', () => ({
  useEpisodeQuery: jest.fn(),
}));

jest.mock('../../../features/clients/data/repositories/clients.repository.impl', () => ({
  useClientDetailQuery: jest.fn(),
}));

const mockEpisodeQuery = useEpisodeQuery as jest.Mock;
const mockClientQuery = useClientDetailQuery as jest.Mock;

const idleEpisode = { data: undefined, error: null, isFetching: false };
const idleClient = { data: undefined, error: null, isFetching: false };

describe('useTreatmentSheetHeaderData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEpisodeQuery.mockReturnValue(idleEpisode);
    mockClientQuery.mockReturnValue(idleClient);
  });

  it('disables both canonical reads when tenant or episode identity is missing', () => {
    const { result } = renderHook(() => useTreatmentSheetHeaderData('', null));

    expect(mockEpisodeQuery).toHaveBeenCalledWith(
      '',
      '',
      expect.objectContaining({ enabled: false, retry: false })
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      '',
      '',
      expect.objectContaining({ enabled: false, retry: false })
    );
    expect(result.current).toEqual({
      episodeData: null,
      clientData: null,
      isLoadingHeaderData: false,
    });
  });

  it('sequences the tenant-scoped Client query from the canonical Episode result', () => {
    const episode = { id: 'episode-1', tenant_id: 'tenant-1', client_id: 'client-1', title: 'Knee pain' };
    const client = { id: 'client-1', tenant_id: 'tenant-1', full_name: 'Patient One' };
    mockEpisodeQuery.mockReturnValue({ data: episode, error: null, isFetching: false });
    mockClientQuery.mockReturnValue({ data: client, error: null, isFetching: false });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(mockEpisodeQuery).toHaveBeenCalledWith(
      'tenant-1',
      'episode-1',
      expect.objectContaining({
        enabled: true,
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      'tenant-1',
      'client-1',
      expect.objectContaining({ enabled: true, retry: false })
    );
    expect(result.current.episodeData).toBe(episode);
    expect(result.current.clientData).toBe(client);
    expect(result.current.isLoadingHeaderData).toBe(false);
  });

  it('reports loading while the Episode read is fetching', () => {
    mockEpisodeQuery.mockReturnValue({ data: undefined, error: null, isFetching: true });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(result.current.isLoadingHeaderData).toBe(true);
    expect(mockClientQuery).toHaveBeenCalledWith(
      'tenant-1',
      '',
      expect.objectContaining({ enabled: false })
    );
  });

  it('reports loading while the dependent Client read is fetching', () => {
    mockEpisodeQuery.mockReturnValue({
      data: { client_id: 'client-1', title: 'Knee pain' },
      error: null,
      isFetching: false,
    });
    mockClientQuery.mockReturnValue({ data: undefined, error: null, isFetching: true });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(result.current.isLoadingHeaderData).toBe(true);
  });

  it('does not enable the Client query when the Episode has no client identity', () => {
    const episode = { id: 'episode-1', title: 'Knee pain' };
    mockEpisodeQuery.mockReturnValue({ data: episode, error: null, isFetching: false });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(mockClientQuery).toHaveBeenCalledWith(
      'tenant-1',
      '',
      expect.objectContaining({ enabled: false })
    );
    expect(result.current.episodeData).toBe(episode);
    expect(result.current.clientData).toBeNull();
  });

  it('tolerates Episode failure and preserves the existing diagnostic', () => {
    const error = new Error('episode failed');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockEpisodeQuery.mockReturnValue({ data: undefined, error, isFetching: false });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(result.current.episodeData).toBeNull();
    expect(result.current.clientData).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      '[TreatmentSheet] Failed to fetch header data:',
      error
    );
    consoleError.mockRestore();
  });

  it('retains Episode data when the dependent Client read fails', () => {
    const episode = { id: 'episode-1', client_id: 'client-1', title: 'Knee pain' };
    const error = new Error('client failed');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockEpisodeQuery.mockReturnValue({ data: episode, error: null, isFetching: false });
    mockClientQuery.mockReturnValue({ data: undefined, error, isFetching: false });

    const { result } = renderHook(() =>
      useTreatmentSheetHeaderData('tenant-1', 'episode-1')
    );

    expect(result.current.episodeData).toBe(episode);
    expect(result.current.clientData).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      '[TreatmentSheet] Failed to fetch header data:',
      error
    );
    consoleError.mockRestore();
  });

  it('contains no direct presentation transport or datasource access', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../features/treatmentSheets/presentation/pages/detail/useTreatmentSheetHeaderData.ts'
      ),
      'utf8'
    );
    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
    expect(source).not.toMatch(/data\/datasources|\.api['"]/);
  });
});
