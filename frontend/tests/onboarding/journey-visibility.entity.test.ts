import {
  JOURNEY_VISIBILITY_CONTRACT_V1,
  isSameJourneyVisibilityProjectionIdentity,
} from '../../features/onboarding/domain/entities/journey-visibility.entity';

describe('Journey Visibility domain', () => {
  const identity = {
    contractVersion: JOURNEY_VISIBILITY_CONTRACT_V1,
    templateVersion: 'template-v1',
    capabilityRevision: `cap-v1:${'a'.repeat(64)}`,
    tenantId: 'tenant-1',
  } as const;

  it('compares the complete projection identity', () => {
    expect(isSameJourneyVisibilityProjectionIdentity(identity, { ...identity })).toBe(true);
    expect(
      isSameJourneyVisibilityProjectionIdentity(identity, {
        ...identity,
        capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
      })
    ).toBe(false);
    expect(
      isSameJourneyVisibilityProjectionIdentity(identity, {
        ...identity,
        tenantId: 'tenant-2',
      })
    ).toBe(false);
  });
});
