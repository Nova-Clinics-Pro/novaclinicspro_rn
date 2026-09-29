import {
  WORKSPACE_PREPARATION_CONTRACT_V1,
  WorkspacePreparationError,
  WORKSPACE_PREPARATION_UNIT_ORDER,
} from '../../features/onboarding/domain/entities/workspace-preparation.entity';

describe('Workspace Preparation domain contract', () => {
  it('freezes the Version 1 contract identity', () => {
    expect(WORKSPACE_PREPARATION_CONTRACT_V1).toBe('workspace_preparation_v1');
  });

  it('exposes safe typed errors without raw provider content', () => {
    const error = new WorkspacePreparationError(
      'workspace_preparation.stale_version',
      'errors.workspacePreparation.stale_version',
      true
    );
    expect(error).toMatchObject({
      code: 'workspace_preparation.stale_version',
      message: 'errors.workspacePreparation.stale_version',
      retryable: true,
    });
  });

  it('keeps the approved preparation unit order immutable', () => {
    expect(WORKSPACE_PREPARATION_UNIT_ORDER).toEqual([
      'TENANT_FOUNDATION',
      'ACCESS_FOUNDATION',
      'ONBOARDING_FOUNDATION',
      'PERSONALIZATION_HANDOFF',
    ]);
    expect(Object.isFrozen(WORKSPACE_PREPARATION_UNIT_ORDER)).toBe(true);
  });
});
