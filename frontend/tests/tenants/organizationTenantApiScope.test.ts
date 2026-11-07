jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { axiosClient } from '../../core/api/axiosClient';
import {
  OrganizationContextRequiredError,
  createTenantApi,
  getTenantApi,
  listTenantsApi,
  updateTenantApi,
} from '../../features/tenants/data/datasources/tenants.api';

const organizationId = 'organization-a';
const tenantId = 'tenant-a';
const createPayload = { name: 'Clinic A', clinic_type: 'general' } as any;
const updatePayload = { name: 'Clinic A Updated' } as any;

describe('organization-scoped tenant management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axiosClient.get as jest.Mock).mockResolvedValue({ data: [] });
    (axiosClient.post as jest.Mock).mockResolvedValue({ data: { id: tenantId } });
    (axiosClient.patch as jest.Mock).mockResolvedValue({ data: { id: tenantId } });
  });

  it('sends the active organization as a query parameter when creating a tenant', async () => {
    await createTenantApi(organizationId, createPayload);

    expect(axiosClient.post).toHaveBeenCalledWith(
      '/api/v1/org/tenants',
      createPayload,
      { params: { organization_id: organizationId } },
    );
  });

  it('sends the active organization as a query parameter when listing tenants', async () => {
    await listTenantsApi(organizationId, { limit: 20, search: 'Clinic' });

    expect(axiosClient.get).toHaveBeenCalledWith('/api/v1/org/tenants', {
      params: { limit: 20, search: 'Clinic', organization_id: organizationId },
    });
  });

  it('sends the active organization as a query parameter when retrieving a tenant', async () => {
    await getTenantApi(organizationId, tenantId);

    expect(axiosClient.get).toHaveBeenCalledWith(`/api/v1/org/tenants/${tenantId}`, {
      params: { organization_id: organizationId },
    });
  });

  it('sends the active organization as a query parameter when updating a tenant', async () => {
    await updateTenantApi(organizationId, tenantId, updatePayload);

    expect(axiosClient.patch).toHaveBeenCalledWith(
      `/api/v1/org/tenants/${tenantId}`,
      updatePayload,
      { params: { organization_id: organizationId } },
    );
  });

  it('fails before a request when no authoritative organization context is available', async () => {
    await expect(createTenantApi('', createPayload)).rejects.toBeInstanceOf(
      OrganizationContextRequiredError,
    );

    expect(axiosClient.get).not.toHaveBeenCalled();
    expect(axiosClient.post).not.toHaveBeenCalled();
    expect(axiosClient.patch).not.toHaveBeenCalled();
  });
});
