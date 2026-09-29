/**
 * Transition Demo to Live Use Case
 * Converts a demo tenant to a live/production tenant
 */

import { IOnboardingRepository } from '../repositories/onboarding.repository';
import { logError } from '../../../../core/utils/errorHandler';

type DemoTransitionRepository = Pick<
  IOnboardingRepository,
  'getDemoStatus' | 'transitionDemoToLive'
>;

export interface TransitionDemoToLiveResult {
  success: boolean;
  tenantId?: string;
  tenantUrl?: string;
  message?: string;
  error?: string;
}

export class TransitionDemoToLiveUseCase {
  constructor(private readonly repository: DemoTransitionRepository) {}

  async execute(demoTenantId: string): Promise<TransitionDemoToLiveResult> {
    try {
      if (!demoTenantId || demoTenantId.trim() === '') {
        return {
          success: false,
          error: 'Demo tenant ID is required',
        };
      }

      // Business logic: Verify demo tenant is active before transition
      const demoStatus = await this.repository.getDemoStatus(demoTenantId);
      
      if (!demoStatus) {
        return {
          success: false,
          error: 'Demo tenant not found',
        };
      }

      if (demoStatus.is_demo_expired) {
        return {
          success: false,
          error: 'Demo period has ended. Please complete the setup wizard to create your permanent clinic.',
        };
      }

      if (demoStatus.status === 'transitioned') {
        return {
          success: false,
          error: 'This demo has already been transitioned to a live tenant.',
        };
      }

      // Transition demo to live
      const result = await this.repository.transitionDemoToLive(demoTenantId);

      return {
        success: true,
        tenantId: result.tenant_id,
        tenantUrl: result.tenant_url,
        message: 'Demo successfully transitioned to live tenant! Your clinic is now fully operational.',
      };
    } catch (error) {
      logError('onboarding.demo.transition_failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transition demo to live tenant',
      };
    }
  }
}
