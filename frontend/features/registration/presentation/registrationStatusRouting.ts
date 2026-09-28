import type { RegistrationStatus } from '../domain/entities/registration.entity';

/** Route resolution used only by the root gate after authoritative status fetch. */
export const resolveRegistrationStatusRoute = (status: RegistrationStatus): string | null => {
  if (!status.application_id) return null;

  switch (status.application_status?.toLowerCase()) {
    case 'draft':
      return `/onboarding/draft?applicationId=${status.application_id}`;
    case 'pending_review':
      return `/onboarding/pending-review?applicationId=${status.application_id}`;
    case 'approved':
      return status.tenant_id
        ? `/onboarding/setup-wizard?tenantId=${status.tenant_id}`
        : `/onboarding/choice?applicationId=${status.application_id}`;
    case 'onboarding':
      return status.tenant_id
        ? `/onboarding/setup-wizard?tenantId=${status.tenant_id}`
        : null;
    case 'active':
      return status.tenant_id ? '/clinic-admin' : null;
    case 'rejected':
      return `/onboarding/rejected?applicationId=${status.application_id}`;
    default:
      return null;
  }
};
