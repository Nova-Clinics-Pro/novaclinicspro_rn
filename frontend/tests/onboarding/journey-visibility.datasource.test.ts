import { axiosClient } from '../../core/api/axiosClient';
import { getJourneyVisibilityApi } from '../../features/onboarding/data/datasources/onboarding.api';
import { JourneyVisibilityDatasourceError } from '../../features/onboarding/data/models/onboarding.dtos';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const mockGet = axiosClient.get as jest.Mock;

describe('Journey Visibility datasource', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the existing authenticated API client and returns the transport unchanged', async () => {
    const dto = { contract_version: '1.0', tenant_id: 'tenant-1', visible_steps: [] };
    mockGet.mockResolvedValue({ data: dto });

    await expect(getJourneyVisibilityApi('tenant-1')).resolves.toBe(dto);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/onboarding/tenant-1/journey-visibility');
  });

  it('converts backend typed errors without exposing raw transport details', async () => {
    mockGet.mockRejectedValue({
      response: {
        status: 403,
        data: {
          detail: {
            error: {
              error_code: 'journey_visibility.scope_mismatch',
              message_token: 'errors.journeyVisibility.scope_mismatch',
              retryable: false,
            },
          },
        },
      },
    });

    await expect(getJourneyVisibilityApi('tenant-2')).rejects.toEqual(
      expect.objectContaining<Partial<JourneyVisibilityDatasourceError>>({
        errorCode: 'journey_visibility.scope_mismatch',
        messageToken: 'errors.journeyVisibility.scope_mismatch',
        retryable: false,
        httpStatus: 403,
      })
    );
  });
});
