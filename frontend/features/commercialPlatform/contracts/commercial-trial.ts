export const COMMERCIAL_TRIAL_CONTRACT_V1 = 'commercial_trial_v1' as const;

export type CommercialTrialState =
  | 'ELIGIBLE'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'DELETED';

export type CommercialTrialAction =
  | 'START_TRIAL'
  | 'REQUEST_EXTENSION'
  | 'GRANT_EXTENSION'
  | 'REQUEST_SUBSCRIPTION';

export type CommercialRetentionAction =
  | CommercialTrialAction
  | 'RESTORE_WORKSPACE'
  | 'REQUEST_PERMANENT_DELETION'
  | 'REQUEST_WORKSPACE_DATA_EXPORT'
  | 'CONTACT_SUPPORT';

export type CommercialRetentionIneligibilityReason =
  | 'PROTECTION_EVIDENCE_UNAVAILABLE'
  | 'LEGAL_HOLD_ACTIVE'
  | 'STATUTORY_RETENTION_ACTIVE'
  | 'EXPORT_IN_PROGRESS'
  | 'RETENTION_PERIOD_ACTIVE';

export interface CommercialTrial {
  readonly contractVersion: typeof COMMERCIAL_TRIAL_CONTRACT_V1;
  readonly trialId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly state: CommercialTrialState;
  readonly aggregateVersion: number;
  readonly activationAt: string | null;
  readonly expiresAt: string | null;
  readonly finalNoticeStartsAt: string | null;
  readonly allowedActions: readonly CommercialTrialAction[];
}

export interface CommercialTrialHandoff {
  readonly owner: 'E9';
  readonly action: 'REQUEST_SUBSCRIPTION';
  readonly tenantId: string;
}

export interface CommercialRetention {
  readonly contractVersion: typeof COMMERCIAL_TRIAL_CONTRACT_V1;
  readonly trialId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly commercialState: CommercialTrialState;
  readonly aggregateVersion: number;
  readonly archivedAt: string | null;
  readonly retentionUntil: string | null;
  readonly restoreEligible: boolean;
  readonly permanentDeletionEligible: boolean;
  readonly extensionEligible: boolean;
  readonly workspaceDataExportRequestPermitted: boolean;
  readonly legalHoldActive: boolean | null;
  readonly statutoryRetentionActive: boolean | null;
  readonly allowedActions: readonly CommercialRetentionAction[];
  readonly ineligibilityReasons: readonly CommercialRetentionIneligibilityReason[];
}

export type CommercialTrialFailureKind =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'ORGANIZATION_MISMATCH'
  | 'UNSUPPORTED_CONTRACT'
  | 'INVALID_AGGREGATE'
  | 'NOT_READY'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RETENTION_EVIDENCE_UNAVAILABLE'
  | 'BACKEND_FAILURE';

export class CommercialTrialError extends Error {
  constructor(readonly kind: CommercialTrialFailureKind, readonly code: string, readonly messageToken: string, readonly retryable: boolean) {
    super(messageToken);
    this.name = 'CommercialTrialError';
  }
}

export interface CommercialTrialResponseDTO { contract_version: string; trial_id: string; organization_id: string; tenant_id: string; state: string; aggregate_version: number; activation_at: string | null; expires_at: string | null; final_notice_starts_at: string | null; allowed_actions: string[]; }
export interface CommercialRetentionResponseDTO { contract_version: string; trial_id: string; organization_id: string; tenant_id: string; commercial_state: string; aggregate_version: number; archived_at: string | null; retention_until: string | null; restore_eligible: boolean; permanent_deletion_eligible: boolean; extension_eligible: boolean; workspace_data_export_request_permitted: boolean; legal_hold_active: boolean | null; statutory_retention_active: boolean | null; allowed_actions: string[]; ineligibility_reasons: string[]; }
export interface ActivateCommercialTrialRequestDTO { contract_version: typeof COMMERCIAL_TRIAL_CONTRACT_V1; aggregate_version: number; confirmed: boolean; }
export interface RequestCommercialTrialExtensionDTO { contract_version: typeof COMMERCIAL_TRIAL_CONTRACT_V1; reason: string; channel: string; }
export interface GrantCommercialTrialExtensionDTO { contract_version: typeof COMMERCIAL_TRIAL_CONTRACT_V1; aggregate_version: number; extension_days: number; reason: string; channel: string; requester_id?: string; request_operation_id?: string; }
export interface CommercialTrialHandoffDTO { owner: string; action: string; tenant_id: string; }

export class CommercialTrialDatasourceError extends Error {
  constructor(readonly errorCode: string, readonly messageToken: string, readonly retryable: boolean, readonly httpStatus?: number) {
    super(messageToken);
    this.name = 'CommercialTrialDatasourceError';
  }
}
