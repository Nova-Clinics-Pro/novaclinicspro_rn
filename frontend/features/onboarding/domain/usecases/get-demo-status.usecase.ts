/**
 * Get Demo Status Use Case
 * Retrieves the current status of a demo tenant
 */

import { IOnboardingRepository } from '../repositories/onboarding.repository';
import { logError } from '../../../../core/utils/errorHandler';

type DemoStatusRepository = Pick<IOnboardingRepository, 'getDemoStatus'>;

export interface DemoStatus {
  demoTenantId: string;
  status: 'active' | 'pending' | 'expired' | 'transitioned';
  expiresAt: string;
  daysRemaining: number;
  demoUrl: string;
}

export interface GetDemoStatusResult {
  success: boolean;
  demoStatus?: DemoStatus;
  isExpiringSoon?: boolean; // Less than 3 days remaining
  isExpired?: boolean; // Demo has expired
  canTransition?: boolean; // Active and not expired
  shouldCompleteSetup?: boolean; // Expired, should go to setup wizard
  error?: string;
}

export class GetDemoStatusUseCase {
  constructor(private readonly repository: DemoStatusRepository) {}

  async execute(demoTenantId: string): Promise<GetDemoStatusResult> {
    try {
      if (!demoTenantId || demoTenantId.trim() === '') {
        return {
          success: false,
          error: 'Demo tenant ID is required',
        };
      }

      const status = await this.repository.getDemoStatus(demoTenantId);

      if (!status) {
        return {
          success: false,
          error: 'Demo tenant not found',
        };
      }

      const daysRemaining = Math.max(
        0,
        Math.ceil(status.demo_time_remaining_seconds / (24 * 60 * 60))
      );

      const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;
      const isExpired = status.is_demo_expired;
      const normalizedStatus =
        status.status === 'transitioned'
          ? 'transitioned'
          : status.is_demo_expired
            ? 'expired'
            : status.status === 'PENDING'
              ? 'pending'
              : 'active';

      const canTransition = status.status === 'ACTIVE' && !status.is_demo_expired;

      const shouldCompleteSetup = isExpired && status.status !== 'transitioned';

      return {
        success: true,
        demoStatus: {
          demoTenantId: status.demo_tenant_id,
          status: normalizedStatus,
          expiresAt: status.demo_expires_at,
          daysRemaining,
          demoUrl: status.demo_url,
        },
        isExpiringSoon,
        isExpired,
        canTransition,
        shouldCompleteSetup,
      };
    } catch (error) {
      logError('onboarding.demo_status.load_failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch demo status',
      };
    }
  }
}
