import type { DemoStatusResponse } from '../../features/onboarding/data/models/onboarding.dtos';
import { GetDemoStatusUseCase } from '../../features/onboarding/domain/usecases/get-demo-status.usecase';
import { TransitionDemoToLiveUseCase } from '../../features/onboarding/domain/usecases/transition-demo-to-live.usecase';

const buildDemoStatus = (
  overrides: Partial<DemoStatusResponse> = {}
): DemoStatusResponse => ({
  demo_tenant_id: 'demo-tenant',
  display_name: 'Demo clinic',
  status: 'ACTIVE',
  demo_expires_at: '2026-10-01T00:00:00Z',
  trial_expires_at: '2026-10-01T00:00:00Z',
  demo_time_remaining_seconds: 2 * 24 * 60 * 60,
  trial_time_remaining_seconds: 2 * 24 * 60 * 60,
  is_demo_expired: false,
  is_trial_expired: false,
  demo_url: 'https://demo.example.test',
  created_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

describe('demo status use cases', () => {
  it('derives compatibility status from the canonical demo transport contract', async () => {
    const repository = {
      getDemoStatus: jest.fn().mockResolvedValue(buildDemoStatus()),
    };

    const result = await new GetDemoStatusUseCase(repository).execute('demo-tenant');

    expect(result).toMatchObject({
      success: true,
      isExpiringSoon: true,
      isExpired: false,
      canTransition: true,
      demoStatus: {
        status: 'active',
        expiresAt: '2026-10-01T00:00:00Z',
        daysRemaining: 2,
      },
    });
  });

  it('does not transition a canonically expired demo', async () => {
    const repository = {
      getDemoStatus: jest
        .fn()
        .mockResolvedValue(buildDemoStatus({ is_demo_expired: true })),
      transitionDemoToLive: jest.fn(),
    };

    const result = await new TransitionDemoToLiveUseCase(repository).execute('demo-tenant');

    expect(result.success).toBe(false);
    expect(repository.transitionDemoToLive).not.toHaveBeenCalled();
  });
});
