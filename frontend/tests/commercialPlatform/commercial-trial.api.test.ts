import { axiosClient } from '../../core/api/axiosClient';
import { activateCommercialTrialApi, getCommercialRetentionApi, getCommercialTrialApi, grantCommercialTrialExtensionApi, requestCommercialTrialExtensionApi, requestCommercialTrialSubscriptionApi } from '../../features/commercialPlatform/data/datasources/commercial-trial.api';

jest.mock('../../core/api/axiosClient', () => ({ axiosClient: { get: jest.fn(), post: jest.fn() } }));

const mockPost = axiosClient.post as jest.Mock;
const mockGet = axiosClient.get as jest.Mock;

describe('Commercial Trial datasource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { contract_version: 'commercial_trial_v1' } });
    mockPost.mockResolvedValue({ data: { contract_version: 'commercial_trial_v1' } });
  });

  it('uses the authenticated client and cancellation for the scoped read', async () => {
    const controller = new AbortController();
    await getCommercialTrialApi('tenant-1', controller.signal);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/commercial-trial',
      { signal: controller.signal }
    );
  });

  it('uses the authenticated client and cancellation for the retention read', async () => {
    const controller = new AbortController();
    await getCommercialRetentionApi('tenant-1', controller.signal);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/commercial-trial/retention',
      { signal: controller.signal }
    );
  });

  it('preserves caller-owned idempotency for activation and extension commands', async () => {
    await activateCommercialTrialApi(
      'tenant-1',
      {
        contract_version: 'commercial_trial_v1',
        aggregate_version: 3,
        confirmed: true,
      },
      'activate-key'
    );
    await requestCommercialTrialExtensionApi(
      'tenant-1',
      {
        contract_version: 'commercial_trial_v1',
        reason: 'Customer success review',
        channel: 'support',
      },
      'request-key'
    );
    await grantCommercialTrialExtensionApi(
      'tenant-1',
      {
        contract_version: 'commercial_trial_v1',
        aggregate_version: 4,
        extension_days: 10,
        reason: 'Approved recovery',
        channel: 'support',
      },
      'grant-key'
    );

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/api/v1/onboarding/tenant-1/commercial-trial/activate',
      expect.any(Object),
      { headers: { 'Idempotency-Key': 'activate-key' } }
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/api/v1/onboarding/tenant-1/commercial-trial/extension-requests',
      expect.any(Object),
      { headers: { 'Idempotency-Key': 'request-key' } }
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/api/v1/onboarding/tenant-1/commercial-trial/extensions',
      expect.any(Object),
      { headers: { 'Idempotency-Key': 'grant-key' } }
    );
  });

  it('uses only the approved E9 subscription handoff route', async () => {
    await requestCommercialTrialSubscriptionApi('tenant-1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/commercial-trial/subscription-request'
    );
    expect(mockGet).not.toHaveBeenCalled();
  });
});
