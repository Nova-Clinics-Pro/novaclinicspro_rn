import type {
  CommercialRetentionStateResult,
  CommercialTrial,
  CommercialTrialHandoff,
  CommercialTrialStateResult,
} from '../../contracts/commercial-trial';

export interface ICommercialTrialRepository {
  getCommercialTrial(organizationId: string, tenantId: string, signal?: AbortSignal): Promise<CommercialTrialStateResult>;
  getCommercialRetention(organizationId: string, tenantId: string, signal?: AbortSignal): Promise<CommercialRetentionStateResult>;
  activateCommercialTrial(organizationId: string, tenantId: string, aggregateVersion: number | undefined, confirmed: boolean, idempotencyKey: string): Promise<CommercialTrial>;
  requestCommercialTrialExtension(organizationId: string, tenantId: string, reason: string, channel: string, idempotencyKey: string): Promise<CommercialTrial>;
  grantCommercialTrialExtension(organizationId: string, tenantId: string, aggregateVersion: number, extensionDays: number, reason: string, channel: string, idempotencyKey: string, requesterId?: string, requestOperationId?: string): Promise<CommercialTrial>;
  requestCommercialTrialSubscription(organizationId: string, tenantId: string): Promise<CommercialTrialHandoff>;
}
