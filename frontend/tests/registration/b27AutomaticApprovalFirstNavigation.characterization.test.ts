/**
 * B2.7-RC-002: historical navigation characterization for the df93d138
 * baseline. These tests intentionally preserve the route behavior; they do
 * not authorize identifier exposure or a replacement policy.
 */

import { resolveRegistrationStatusRoute } from '../../features/registration/presentation/registrationStatusRouting';

const applicationId = 'application-1';

describe('B2.7-RC-002 historical applicant status navigation', () => {
  it('RC-002-01 routes an auto-approved application with a tenant to setup', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'approved', tenant_id: 'tenant-1',
    })).toBe('/onboarding/setup-wizard?tenantId=tenant-1');
  });

  it('RC-002-02 routes pending review with the historical application identity', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'pending_review',
    })).toBe(`/onboarding/pending-review?applicationId=${applicationId}`);
  });

  it('RC-002-03 routes rejected applications to the historical terminal screen', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'rejected',
    })).toBe(`/onboarding/rejected?applicationId=${applicationId}`);
  });

  it('RC-002-04 leaves loading to the root query gate rather than inventing a status route', () => {
    expect(resolveRegistrationStatusRoute({ status: 'registered', application_id: applicationId })).toBeNull();
  });

  it('RC-002-05 exposes no route for an absent application identity', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_status: 'pending_review',
    })).toBeNull();
  });

  it('RC-002-06 preserves the status-to-route mapping used after a status refresh', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'draft',
    })).toBe(`/onboarding/draft?applicationId=${applicationId}`);
  });

  it('RC-002-07 accepts the baseline lowercase lifecycle vocabulary', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'pending_review',
    })).toBe(`/onboarding/pending-review?applicationId=${applicationId}`);
  });

  it('RC-002-08 does not establish backend applicant authorization', () => {
    // Route resolution has no caller identity; authorization remains backend-owned.
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'active',
    })).toBeNull();
  });

  it('RC-002-09 routes onboarding with an authoritative tenant to its workspace', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'onboarding', tenant_id: 'tenant-1',
    })).toBe('/onboarding/setup-wizard?tenantId=tenant-1');
  });

  it('RC-002-10 preserves the baseline response mapping distinctions', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'registered', application_id: applicationId, application_status: 'approved',
    })).toBe(`/onboarding/choice?applicationId=${applicationId}`);
  });
});
