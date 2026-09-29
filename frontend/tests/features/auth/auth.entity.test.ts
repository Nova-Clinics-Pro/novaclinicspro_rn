import { mapCurrentUserToDomain } from '../../../features/auth/domain/entities/auth.entity';

describe('mapCurrentUserToDomain', () => {
  it('maps the backend tenant_id into the canonical tenantId', () => {
    const mapped = mapCurrentUserToDomain({
      user_id: 'doctor-1',
      email: 'doctor@example.com',
      tenant_id: 'tenant-1',
      roles: ['DOCTOR'],
      permissions: ['consultation.read'],
      is_org_admin: false,
      application_status: 'active',
    });

    expect(mapped.tenantId).toBe('tenant-1');
    expect(mapped.roles).toEqual(['DOCTOR']);
  });

  it('preserves an explicitly tenant-less backend response without inference', () => {
    const mapped = mapCurrentUserToDomain({
      user_id: 'user-1',
      email: 'unassigned@example.com',
      tenant_id: null,
      roles: [],
      permissions: [],
      is_org_admin: false,
      application_status: null,
    });

    expect(mapped.tenantId).toBeNull();
  });

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
