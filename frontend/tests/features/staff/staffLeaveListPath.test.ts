/** Contract test: the admin leave list is served at the plural `/leaves` route (backend staff_router.list_all_leaves). */
import { listAllStaffLeaveApi } from '../../../features/staff/data/datasources/staff.api';

jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

const { axiosClient } = jest.requireMock('../../../core/api/axiosClient') as { axiosClient: { get: jest.Mock } };

describe('admin leave list contract', () => {
  it('requests GET /clinic/{tenant}/leaves with the caller params', async () => {
    axiosClient.get.mockResolvedValue({ data: { items: [], total: 0 } });

    await listAllStaffLeaveApi('tenant-1', { status: 'PENDING' } as never);

    expect(axiosClient.get).toHaveBeenCalledTimes(1);
    const [url, config] = axiosClient.get.mock.calls[0];
    expect(url).toBe('/api/v1/clinic/tenant-1/leaves');
    expect(config).toEqual({ params: { status: 'PENDING' } });
  });
});
