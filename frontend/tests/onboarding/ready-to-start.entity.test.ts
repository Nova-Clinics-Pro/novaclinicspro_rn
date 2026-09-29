import {
  isSameReadinessIdentity,
  ReadinessIdentity,
  ReadyToStartError,
} from '../../features/onboarding/domain/entities/ready-to-start.entity';

const identity = (evidenceRevision: string): ReadinessIdentity =>
  Object.freeze({
    readinessContractVersion: 'ready_to_start_v1',
    tenantId: 'tenant-1',
    journeyProjectionIdentity: Object.freeze({
      templateVersion: 'template-v1',
      capabilityRevision: 'cap-v1:revision',
    }),
    providerSetRevision: 'providers-v1',
    evidenceRevision,
  });

describe('Ready to Start domain values', () => {
  it('compares the complete immutable identity', () => {
    expect(isSameReadinessIdentity(identity('evidence-1'), identity('evidence-1'))).toBe(true);
    expect(isSameReadinessIdentity(identity('evidence-1'), identity('evidence-2'))).toBe(false);
    expect(Object.isFrozen(identity('evidence-1'))).toBe(true);
  });

  it('exposes safe typed failures without transport details', () => {
    const error = new ReadyToStartError(
      'STALE_PROJECTION',
      'readiness.stale',
      'errors.readyToStart.stale',
      true
    );
    expect(error).toMatchObject({
      kind: 'STALE_PROJECTION',
      code: 'readiness.stale',
      messageToken: 'errors.readyToStart.stale',
      retryable: true,
    });
  });
});
