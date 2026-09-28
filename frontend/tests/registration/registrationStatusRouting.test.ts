import { resolveRegistrationStatusRoute } from '../../features/registration/presentation/registrationStatusRouting';

describe('registration status routing', () => {
  const applicationId = 'application-1';

  it('keeps DRAFT distinct from PENDING_REVIEW', () => {
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId, application_status: 'DRAFT' }))
      .toBe(`/onboarding/draft?applicationId=${applicationId}`);
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId, application_status: 'PENDING_REVIEW' }))
      .toBe(`/onboarding/pending-review?applicationId=${applicationId}`);
  });

  it('normalizes the lowercase lifecycle values emitted by registration-status', () => {
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId, application_status: 'pending_review' }))
      .toBe(`/onboarding/pending-review?applicationId=${applicationId}`);
  });

  it('uses the authoritative tenant only for approved or onboarding setup routing', () => {
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId, application_status: 'approved', tenant_id: 'tenant-1' }))
      .toBe('/onboarding/setup-wizard?tenantId=tenant-1');
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId, application_status: 'onboarding', tenant_id: 'tenant-1' }))
      .toBe('/onboarding/setup-wizard?tenantId=tenant-1');
  });

  it('does not invent a route for missing application state', () => {
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId })).toBeNull();
  });
});
