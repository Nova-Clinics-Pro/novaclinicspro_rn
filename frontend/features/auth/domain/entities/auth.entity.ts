/**
 * Auth Domain Entity
 * Business logic representation of authenticated user session
 * 
 * NOTE: ownedClinics represents the ownership snapshot at login time;
 * it is not a live clinic registry. Always refresh via /auth/me
 * rather than patching clinics locally.
 */

/**
 * Owned clinic representation from /auth/me
 */
export interface OwnedClinic {
  tenantId: string;
  clinicName: string;
  city?: string;
  isPrimary?: boolean;
}

/**
 * Main auth user session entity
 */
export interface AuthUserSession {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  clinicName: string; // Clinic name for the user's assigned tenant
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  isOrgAdmin: boolean;
  /** Backend-authoritative; never inferred from application lifecycle state. */
  isDemoTenant: boolean;
  applicationStatus: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected' | null;
  /**
   * List of clinics owned by this user (for clinic owners).
   * Derived from /auth/me. Not editable on the client.
   * Empty array for non-owner users.
   */
  ownedClinics: OwnedClinic[];
}

/**
 * Check if user is a clinic owner
 */
export const isClinicOwner = (session: AuthUserSession): boolean => {
  return session.ownedClinics.length > 0 || session.roles.includes('clinic_owner');
};

/**
 * Check if user has multiple clinics
 */
export const hasMultipleClinics = (session: AuthUserSession): boolean => {
  return session.ownedClinics.length > 1;
};

/**
 * Get primary clinic (first one or the one marked as primary)
 */
export const getPrimaryClinic = (session: AuthUserSession): OwnedClinic | null => {
  if (session.ownedClinics.length === 0) return null;
  return session.ownedClinics.find(c => c.isPrimary) || session.ownedClinics[0];
};

/**
 * Map DTO to domain entity
 */
export const mapCurrentUserToDomain = (dto: {
  user_id: string;
  email: string;
  full_name?: string;
  clinic_name?: string;
  clinic_names?: string[];
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
  is_org_admin: boolean;
  is_demo_tenant?: boolean;
  owned_clinics?: Array<{
    tenant_id: string;
    clinic_name: string;
    city?: string;
    is_primary?: boolean;
  }>;
  application_status?: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected' | null;
}): AuthUserSession => {
  console.log('[mapCurrentUserToDomain] Input DTO:', dto);
  console.log('[mapCurrentUserToDomain] application_status from DTO:', dto.application_status);

  const ownedClinics = (dto.owned_clinics || []).map(c => ({
    tenantId: c.tenant_id,
    clinicName: c.clinic_name,
    city: c.city,
    isPrimary: c.is_primary,
  }));

  // Resolve clinic name: new list field → legacy single field → owned_clinics
  const clinicName =
    dto.clinic_names?.[0] ||
    dto.clinic_name ||
    ownedClinics.find(c => c.isPrimary)?.clinicName ||
    ownedClinics[0]?.clinicName ||
    '';

  const mapped = {
    id: dto.user_id,
    userId: dto.user_id,
    email: dto.email,
    fullName: dto.full_name || '',
    clinicName,
    tenantId: dto.tenant_id,
    roles: dto.roles,
    permissions: dto.permissions,
    isOrgAdmin: dto.is_org_admin,
    isDemoTenant: dto.is_demo_tenant === true,
    applicationStatus: dto.application_status || null,
    ownedClinics,
  };
  
  console.log('[mapCurrentUserToDomain] Mapped entity:', mapped);
  console.log('[mapCurrentUserToDomain] applicationStatus:', mapped.applicationStatus);
  
  return mapped;
};

/**
 * Determine the appropriate landing route based on user context
 */
export const getLandingRoute = (session: AuthUserSession): string => {
  // Super admin
  if (session.isOrgAdmin) {
    return '/super-admin';
  }

  // Clinic owner with multiple clinics -> Owner dashboard
  if (hasMultipleClinics(session)) {
    return '/owner';
  }

  // Clinic owner with single clinic -> Clinic admin
  if (isClinicOwner(session) && session.ownedClinics.length === 1) {
    return '/clinic-admin';
  }

  // Has tenant assigned -> Clinic admin or role-based dashboard
  if (session.tenantId) {
    // Check for specific roles
    if (session.roles.includes('doctor')) {
      return '/doctor';
    }
    if (session.roles.includes('therapist')) {
      return '/therapist';
    }
    return '/clinic-admin';
  }

  // No tenant - go to index
  return '/';
};
