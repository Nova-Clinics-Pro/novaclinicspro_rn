import { executeReadinessAction } from '../../features/onboarding/presentation/actions/onboardingActionRegistry';
import type { NextAction } from '../../features/onboarding/domain/entities/ready-to-start.entity';

const mockLogError = jest.fn();

jest.mock('../../core/utils/errorHandler', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const workspacePreparationAction: NextAction = {
  actionId: 'readiness.open_workspace_preparation',
  labelToken: 'readiness.workspace_preparation.actions.open',
  ownerId: 'workspace_preparation',
  kind: 'NAVIGATE',
  authorizationRequirement: 'tenant.read',
  targetId: 'onboarding.workspace_preparation',
};

describe('readiness action registry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches the backend-emitted workspace preparation target without step inference', () => {
    const router = { push: jest.fn() };

    expect(executeReadinessAction(router as never, workspacePreparationAction, { tenant_id: 'tenant-1' })).toBe(true);

    expect(router.push).toHaveBeenCalledWith('/onboarding/workspace-preparation?tenantId=tenant-1');
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('delegates a backend refresh action to the final-review refresh callback', () => {
    const router = { push: jest.fn() };
    const onRefresh = jest.fn();

    expect(
      executeReadinessAction(
        router as never,
        { ...workspacePreparationAction, kind: 'REFRESH', targetId: null },
        { tenant_id: 'tenant-1' },
        { onRefresh }
      )
    ).toBe(true);

    expect(router.push).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('opens the workspace-preparation recovery UI for a backend retry action', () => {
    const router = { push: jest.fn() };

    expect(
      executeReadinessAction(
        router as never,
        { ...workspacePreparationAction, kind: 'RETRY', targetId: 'workspace_preparation.retry' },
        { tenant_id: 'tenant-1' }
      )
    ).toBe(true);

    expect(router.push).toHaveBeenCalledWith('/onboarding/workspace-preparation?tenantId=tenant-1');
  });
});
