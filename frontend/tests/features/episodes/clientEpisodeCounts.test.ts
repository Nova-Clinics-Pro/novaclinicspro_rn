jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

import { axiosClient } from '../../../core/api/axiosClient';
import { getClientEpisodeCountsApi } from '../../../features/episodes/data/datasources/episodes.api';

const mockGet = axiosClient.get as jest.Mock;

describe('getClientEpisodeCountsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves per-client counts and degrades an individual failed count to zero', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('client_id=client-a')) {
        return Promise.resolve({ data: { items: [], total: 3, skip: 0, limit: 1 } });
      }
      return Promise.reject(new Error('unavailable'));
    });

    await expect(getClientEpisodeCountsApi('tenant-a', ['client-a', 'client-b'])).resolves.toEqual({
      'client-a': 3,
      'client-b': 0,
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-a/episodes?client_id=client-a&limit=1'
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-a/episodes?client_id=client-b&limit=1'
    );
  });
});
