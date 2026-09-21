import { mapCurrentUserToDomain } from '../../../features/auth/domain/entities/auth.entity';

describe('mapCurrentUserToDomain', () => {
  it('hydrates the backend-authoritative demo tenant flag', () => {
    const mapped = mapCurrentUserToDomain({
      user_id: 'user-1',
      email: 'owner@example.com',
      tenant_id: 'tenant-1',
      roles: [],
      permissions: [],
      is_org_admin: false,
      is_demo_tenant: true,
      application_status: 'onboarding',
    });

    expect(mapped.isDemoTenant).toBe(true);
  });

  it('fails closed when an older backend response omits the demo flag', () => {
    const mapped = mapCurrentUserToDomain({
      user_id: 'user-1',
      email: 'owner@example.com',
      tenant_id: 'tenant-1',
      roles: [],
      permissions: [],
      is_org_admin: false,
      application_status: 'onboarding',
    });

    expect(mapped.isDemoTenant).toBe(false);
  });
});
