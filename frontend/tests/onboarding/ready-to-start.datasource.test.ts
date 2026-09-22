import { axiosClient } from '../../core/api/axiosClient';
import { getReadyToStartApi } from '../../features/onboarding/data/datasources/onboarding.api';
import { ReadyToStartDatasourceError } from '../../features/onboarding/data/models/onboarding.dtos';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const mockGet = axiosClient.get as jest.Mock;

describe('Ready to Start datasource', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated onboarding client, endpoint, and cancellation signal', async () => {
    const response = { identity: { tenant_id: 'tenant-1' } };
    const controller = new AbortController();
    mockGet.mockResolvedValue({ data: response });

    await expect(getReadyToStartApi('tenant-1', controller.signal)).resolves.toBe(response);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/ready-to-start',
      { signal: controller.signal, apiFailurePresentation: 'feature' }
    );
  });

  it('maps the safe backend error envelope without exposing raw details', async () => {
    mockGet.mockRejectedValue({
      response: {
        status: 403,
        data: {
          detail: {
            error: {
              error_code: 'readiness.forbidden',
              message_token: 'errors.readyToStart.forbidden',
              retryable: false,
              internal: 'must not be retained',
            },
          },
        },
      },
    });

    await expect(getReadyToStartApi('tenant-1')).rejects.toEqual(
      expect.objectContaining<Partial<ReadyToStartDatasourceError>>({
        errorCode: 'readiness.forbidden',
        messageToken: 'errors.readyToStart.forbidden',
        retryable: false,
        httpStatus: 403,
      })
    );
  });

  it('preserves Axios cancellation for TanStack Query tenant-switch cancellation', async () => {
    const canceled = Object.assign(new Error('canceled'), {
      name: 'CanceledError',
      code: 'ERR_CANCELED',
    });
    mockGet.mockRejectedValue(canceled);

    await expect(getReadyToStartApi('tenant-1')).rejects.toBe(canceled);
  });
});
