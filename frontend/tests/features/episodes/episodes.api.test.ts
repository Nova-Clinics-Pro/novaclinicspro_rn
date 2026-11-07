import { axiosClient } from '../../../core/api/axiosClient';
import { createEpisodeApi } from '../../../features/episodes/data/datasources/episodes.api';

jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: {
    post: jest.fn(),
  },
}));

const mockPost = axiosClient.post as jest.Mock;

describe('createEpisodeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts the tenant-scoped Episode payload and returns the created Episode', async () => {
    const episode = { id: 'episode-1' };
    const payload = {
      client_id: 'client-1',
      title: 'Back pain',
      appointment_id: 'appointment-1',
    };
    mockPost.mockResolvedValue({ data: episode });

    await expect(createEpisodeApi('tenant-1', payload)).resolves.toBe(episode);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/clinic/tenant-1/episodes',
      payload
    );
  });

  it('normalizes a backend detail before the error crosses into presentation', async () => {
    mockPost.mockRejectedValue({
      response: { data: { detail: 'An active Episode is already attached.' } },
    });

    await expect(
      createEpisodeApi('tenant-1', {
        client_id: 'client-1',
        title: 'Back pain',
        appointment_id: 'appointment-1',
      })
    ).rejects.toThrow('An active Episode is already attached.');
  });
});
