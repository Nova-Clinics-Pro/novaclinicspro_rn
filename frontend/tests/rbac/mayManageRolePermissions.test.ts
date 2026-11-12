import { mayManageRolePermissions } from '../../features/auth/domain/entities/auth.entity';
import type { AuthUserSession } from '../../features/auth/domain/entities/auth.entity';

const session = (over: Partial<AuthUserSession>): AuthUserSession => ({
  id: 'u', userId: 'u', email: 'a@b.co', fullName: 'A', clinicName: 'C', tenantId: 't', roles: [], permissions: [],
  isOrgAdmin: false, isDemoTenant: false, applicationStatus: 'active', ownedClinics: [], ...over,
});

describe('who is offered the role-permission tool', () => {
  it('offers it to a recognized owner', () => {
    expect(mayManageRolePermissions(session({ ownedClinics: [{ tenantId: 't', clinicName: 'C' }] }))).toBe(true);
    expect(mayManageRolePermissions(session({ roles: ['clinic_owner'] }))).toBe(true);
  });

  it('offers it when the session does not say who the owner is (empty roles, no owned clinics)', () => {
    expect(mayManageRolePermissions(session({}))).toBe(true);
  });

  it('hides it from users the session explicitly lists with another role', () => {
    for (const role of ['doctor', 'Receptionist', 'nurse', 'Clinic Admin', 'therapist', 'pharmacist']) {
      expect(mayManageRolePermissions(session({ roles: [role] }))).toBe(false);
    }
  });
});
