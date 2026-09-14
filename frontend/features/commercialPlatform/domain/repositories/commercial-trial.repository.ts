import type { CommercialRetention, CommercialTrial, CommercialTrialHandoff } from '../../contracts/commercial-trial';

export interface ICommercialTrialRepository {
  getCommercialTrial(organizationId: string, tenantId: string, signal?: AbortSignal): Promise<CommercialTrial>;
  getCommercialRetention(organizationId: string, tenantId: string, signal?: AbortSignal): Promise<CommercialRetention>;
  activateCommercialTrial(organizationId: string, tenantId: string, aggregateVersion: number, confirmed: boolean, idempotencyKey: string): Promise<CommercialTrial>;
  requestCommercialTrialExtension(organizationId: string, tenantId: string, reason: string, channel: string, idempotencyKey: string): Promise<CommercialTrial>;
  grantCommercialTrialExtension(organizationId: string, tenantId: string, aggregateVersion: number, extensionDays: number, reason: string, channel: string, idempotencyKey: string, requesterId?: string, requestOperationId?: string): Promise<CommercialTrial>;
  requestCommercialTrialSubscription(organizationId: string, tenantId: string): Promise<CommercialTrialHandoff>;
}
