import { toDoctorDashboardError } from '../../../features/doctorDashboard/application/doctorDashboardError';

jest.mock('../../../core/api/axiosClient', () => ({
  normalizeError: jest.fn(),
}));

import { normalizeError } from '../../../core/api/axiosClient';

const mockNormalizeError = normalizeError as jest.Mock;

describe('Doctor dashboard error contract', () => {
  it.each([
    [400, 'VALIDATION_FAILED', 'Invalid Request'],
    [401, 'SESSION_EXPIRED', 'Session Expired'],
    [403, 'PERMISSION_DENIED', 'Access Denied'],
    [404, 'NOT_FOUND', 'Not Found'],
    [409, 'CONFLICT', 'Update Conflict'],
  ])('maps transport status %s to %s', (status, code, title) => {
    mockNormalizeError.mockReturnValue({ status });

    expect(toDoctorDashboardError(new Error('internal detail'))).toMatchObject({ code, title });
  });

  it('does not expose an unknown backend message', () => {
    mockNormalizeError.mockReturnValue({ status: 500, message: 'internal detail' });

    expect(toDoctorDashboardError(new Error('internal detail'))).toEqual({
      code: 'LOAD_FAILED',
      title: 'Error Loading Dashboard',
      message: 'Could not load this information. Please try again.',
    });
  });
});
