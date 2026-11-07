import type { RegistrationStatus } from '../domain/entities/registration.entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isApprovedChoiceContinuation = (
  continuation: unknown,
): continuation is NonNullable<RegistrationStatus['continuation']> => {
  if (!continuation || typeof continuation !== 'object' || Array.isArray(continuation)) {
    return false;
  }

  const candidate = continuation as Record<string, unknown>;
  return candidate.kind === 'approved_choice'
    && typeof candidate.application_id === 'string'
    && UUID_PATTERN.test(candidate.application_id)
    && typeof candidate.tenant_name === 'string'
    && candidate.tenant_name.trim().length > 0;
};

/** Route resolution used only by the root gate after authoritative status fetch. */
export const resolveRegistrationStatusRoute = (status: RegistrationStatus): string | null => {
  switch (status.status) {
    case 'registration_submitted':
      return '/onboarding/draft';
    case 'pending_review':
      return '/onboarding/pending-review';
    case 'approved':
      return isApprovedChoiceContinuation(status.continuation) ? '/onboarding/choice' : null;
    case 'rejected':
      return '/onboarding/rejected';
    default:
      return null;
  }
};
