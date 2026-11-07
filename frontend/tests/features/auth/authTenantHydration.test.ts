import { mapCurrentUserToDomain } from '../../../features/auth/domain/entities/auth.entity';
import { useAuthStore } from '../../../features/auth/presentation/providers/auth.store';

jest.mock('../../../core/api/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
    },
  },
}));

jest.mock('../../../core/utils/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('authenticated tenant hydration', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: true,
      selectedClinicId: null,
    });
  });

  it('retains backend tenant_id through mapping and currentUser storage', () => {
    const doctor = mapCurrentUserToDomain({
      user_id: 'doctor-1',
      email: 'doctor@example.com',
      full_name: 'Doctor',
      clinic_names: ['Clinic'],
      tenant_id: 'tenant-doctor',
      roles: ['DOCTOR'],
      permissions: [],
      is_org_admin: false,
      is_demo_tenant: false,
      application_status: 'active',
    });

    useAuthStore.getState().setCurrentUser(doctor);

    expect(useAuthStore.getState().currentUser?.tenantId).toBe('tenant-doctor');
    expect(useAuthStore.getState().selectedClinicId).toBe('tenant-doctor');
  });

  it('does not infer a tenant for an explicitly tenant-less response', () => {
    const tenantlessUser = mapCurrentUserToDomain({
      user_id: 'user-1',
      email: 'unassigned@example.com',
      tenant_id: null,
      roles: [],
      permissions: [],
      is_org_admin: false,
      application_status: null,
    });

    useAuthStore.getState().setCurrentUser(tenantlessUser);

    expect(useAuthStore.getState().currentUser?.tenantId).toBeNull();
    expect(useAuthStore.getState().selectedClinicId).toBeNull();
  });
});
