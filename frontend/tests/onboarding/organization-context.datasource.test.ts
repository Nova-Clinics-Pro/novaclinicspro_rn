import { AuthSessionInvalidError } from '../../features/onboarding/domain/clinic-entry';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

import { axiosClient } from '../../core/api/axiosClient';
import { getOrganizationContextApi } from '../../features/onboarding/data/datasources/onboarding.api';

describe('organization-context datasource auth boundary', () => {
  it('maps a post-logout 401 to session-invalid semantics, not clinic-entry failure', async () => {
    (axiosClient.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });

    await expect(getOrganizationContextApi()).rejects.toBeInstanceOf(AuthSessionInvalidError);
  });
});
