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

  it('maps the backend-authoritative session scope so stale token claims can be detected', () => {
    const base = { user_id: 'user-1', email: 'owner@example.com', tenant_id: 'tenant-1', roles: [], permissions: [], is_org_admin: false };

    expect(
      mapCurrentUserToDomain({
        ...base,
        effective_organization_id: 'org-1',
        effective_tenant_id: 'tenant-1',
        session_refresh_required: true,
      }).sessionScope
    ).toEqual({ effectiveOrganizationId: 'org-1', effectiveTenantId: 'tenant-1', sessionRefreshRequired: true });

    // Older backend responses without the fields carry no scope (nothing to reconcile).
    expect(mapCurrentUserToDomain(base).sessionScope).toBeUndefined();

    // A missing flag is never treated as "refresh required".
    expect(mapCurrentUserToDomain({ ...base, effective_tenant_id: null }).sessionScope).toEqual({
      effectiveOrganizationId: null,
      effectiveTenantId: null,
      sessionRefreshRequired: false,
    });
  });
});
