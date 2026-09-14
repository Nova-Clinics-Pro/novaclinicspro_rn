import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  activateCommercialTrialApi,
  getCommercialRetentionApi,
  getCommercialTrialApi,
  grantCommercialTrialExtensionApi,
  requestCommercialTrialExtensionApi,
  requestCommercialTrialSubscriptionApi,
} from '../datasources/commercial-trial.api';
import {
  COMMERCIAL_TRIAL_CONTRACT_V1,
  type CommercialRetention,
  type CommercialRetentionAction,
  type CommercialRetentionIneligibilityReason,
  type CommercialRetentionResponseDTO,
  type CommercialTrial,
  type CommercialTrialAction,
  CommercialTrialDatasourceError,
  CommercialTrialError,
  type CommercialTrialHandoff,
  type CommercialTrialHandoffDTO,
  type CommercialTrialResponseDTO,
  type CommercialTrialState,
} from '../../contracts/commercial-trial';
import type { ICommercialTrialRepository } from '../../domain/repositories/commercial-trial.repository';

export const commercialTrialKeys = {
  commercialTrial: (organizationId: string, tenantId: string) =>
    ['onboarding', 'commercial-trial', organizationId, tenantId, COMMERCIAL_TRIAL_CONTRACT_V1] as const,
  commercialRetention: (organizationId: string, tenantId: string) =>
    ['onboarding', 'commercial-retention', organizationId, tenantId, COMMERCIAL_TRIAL_CONTRACT_V1] as const,
};

const states: readonly CommercialTrialState[] = ['ELIGIBLE', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED', 'ARCHIVED', 'DELETED'];
const actions: readonly CommercialTrialAction[] = ['START_TRIAL', 'REQUEST_EXTENSION', 'GRANT_EXTENSION', 'REQUEST_SUBSCRIPTION'];
const retentionActions: readonly CommercialRetentionAction[] = [...actions, 'RESTORE_WORKSPACE', 'REQUEST_PERMANENT_DELETION', 'REQUEST_WORKSPACE_DATA_EXPORT', 'CONTACT_SUPPORT'];
const reasons: readonly CommercialRetentionIneligibilityReason[] = ['PROTECTION_EVIDENCE_UNAVAILABLE', 'LEGAL_HOLD_ACTIVE', 'STATUTORY_RETENTION_ACTIVE', 'EXPORT_IN_PROGRESS', 'RETENTION_PERIOD_ACTIVE'];
const present = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const timestamp = (value: string): boolean => !Number.isNaN(Date.parse(value));
const optionalTimestamp = (value: string | null): boolean => value === null || timestamp(value);
const invalid = (kind: CommercialTrialError['kind'] = 'INVALID_AGGREGATE', code = 'commercial_trial.invalid_aggregate', token = 'errors.commercialTrial.invalid_aggregate'): never => { throw new CommercialTrialError(kind, code, token, false); };

export const mapCommercialTrial = (dto: CommercialTrialResponseDTO, organizationId: string, tenantId: string): CommercialTrial => {
  if (dto.organization_id !== organizationId) invalid('ORGANIZATION_MISMATCH', 'commercial_trial.organization_mismatch', 'errors.commercialTrial.organization_mismatch');
  if (dto.tenant_id !== tenantId) invalid('TENANT_MISMATCH', 'commercial_trial.tenant_mismatch', 'errors.commercialTrial.tenant_mismatch');
  if (dto.contract_version !== COMMERCIAL_TRIAL_CONTRACT_V1) invalid('UNSUPPORTED_CONTRACT', 'commercial_trial.unsupported_contract', 'errors.commercialTrial.unsupported_contract');
  if (!present(dto.trial_id) || !states.includes(dto.state as CommercialTrialState) || !Number.isInteger(dto.aggregate_version) || dto.aggregate_version < 1 || !optionalTimestamp(dto.activation_at) || !optionalTimestamp(dto.expires_at) || !optionalTimestamp(dto.final_notice_starts_at) || !Array.isArray(dto.allowed_actions) || dto.allowed_actions.some(action => !actions.includes(action as CommercialTrialAction)) || new Set(dto.allowed_actions).size !== dto.allowed_actions.length) invalid();
  return Object.freeze({ contractVersion: COMMERCIAL_TRIAL_CONTRACT_V1, trialId: dto.trial_id, organizationId: dto.organization_id, tenantId: dto.tenant_id, state: dto.state as CommercialTrialState, aggregateVersion: dto.aggregate_version, activationAt: dto.activation_at, expiresAt: dto.expires_at, finalNoticeStartsAt: dto.final_notice_starts_at, allowedActions: Object.freeze([...dto.allowed_actions]) as readonly CommercialTrialAction[] });
};

export const mapCommercialRetention = (dto: CommercialRetentionResponseDTO, organizationId: string, tenantId: string): CommercialRetention => {
  if (dto.organization_id !== organizationId) invalid('ORGANIZATION_MISMATCH', 'commercial_trial.organization_mismatch', 'errors.commercialTrial.organization_mismatch');
  if (dto.tenant_id !== tenantId) invalid('TENANT_MISMATCH', 'commercial_trial.tenant_mismatch', 'errors.commercialTrial.tenant_mismatch');
  if (dto.contract_version !== COMMERCIAL_TRIAL_CONTRACT_V1) invalid('UNSUPPORTED_CONTRACT', 'commercial_trial.unsupported_contract', 'errors.commercialTrial.unsupported_contract');
  if (!present(dto.trial_id) || !states.includes(dto.commercial_state as CommercialTrialState) || !Number.isInteger(dto.aggregate_version) || dto.aggregate_version < 1 || !optionalTimestamp(dto.archived_at) || !optionalTimestamp(dto.retention_until) || typeof dto.restore_eligible !== 'boolean' || typeof dto.permanent_deletion_eligible !== 'boolean' || typeof dto.extension_eligible !== 'boolean' || typeof dto.workspace_data_export_request_permitted !== 'boolean' || ![true, false, null].includes(dto.legal_hold_active) || ![true, false, null].includes(dto.statutory_retention_active) || !Array.isArray(dto.allowed_actions) || dto.allowed_actions.some(action => !retentionActions.includes(action as CommercialRetentionAction)) || new Set(dto.allowed_actions).size !== dto.allowed_actions.length || !Array.isArray(dto.ineligibility_reasons) || dto.ineligibility_reasons.some(reason => !reasons.includes(reason as CommercialRetentionIneligibilityReason)) || new Set(dto.ineligibility_reasons).size !== dto.ineligibility_reasons.length) invalid();
  return Object.freeze({ contractVersion: COMMERCIAL_TRIAL_CONTRACT_V1, trialId: dto.trial_id, organizationId: dto.organization_id, tenantId: dto.tenant_id, commercialState: dto.commercial_state as CommercialTrialState, aggregateVersion: dto.aggregate_version, archivedAt: dto.archived_at, retentionUntil: dto.retention_until, restoreEligible: dto.restore_eligible, permanentDeletionEligible: dto.permanent_deletion_eligible, extensionEligible: dto.extension_eligible, workspaceDataExportRequestPermitted: dto.workspace_data_export_request_permitted, legalHoldActive: dto.legal_hold_active, statutoryRetentionActive: dto.statutory_retention_active, allowedActions: Object.freeze([...dto.allowed_actions]) as readonly CommercialRetentionAction[], ineligibilityReasons: Object.freeze([...dto.ineligibility_reasons]) as readonly CommercialRetentionIneligibilityReason[] });
};

const mapHandoff = (dto: CommercialTrialHandoffDTO, tenantId: string): CommercialTrialHandoff => {
  if (dto.tenant_id !== tenantId || dto.owner !== 'E9' || dto.action !== 'REQUEST_SUBSCRIPTION') invalid();
  return Object.freeze({ owner: 'E9', action: 'REQUEST_SUBSCRIPTION', tenantId: dto.tenant_id });
};
const failureKind = (error: CommercialTrialDatasourceError): CommercialTrialError['kind'] => {
  if (error.httpStatus === 401) return 'UNAUTHORIZED';
  if (error.errorCode === 'commercial_trial.tenant_mismatch') return 'TENANT_MISMATCH';
  if (error.errorCode === 'commercial_trial.organization_mismatch') return 'ORGANIZATION_MISMATCH';
  if (error.httpStatus === 403 || error.errorCode === 'commercial_trial.forbidden') return 'FORBIDDEN';
  if (error.errorCode === 'commercial_trial.unsupported_contract') return 'UNSUPPORTED_CONTRACT';
  if (error.errorCode === 'commercial_trial.not_ready') return 'NOT_READY';
  if (error.errorCode === 'commercial_trial.confirmation_required') return 'CONFIRMATION_REQUIRED';
  if (error.errorCode === 'commercial_trial.retention_evidence_unavailable') return 'RETENTION_EVIDENCE_UNAVAILABLE';
  if (error.httpStatus === 409 || error.errorCode.includes('conflict') || error.errorCode === 'commercial_trial.duplicate_operation') return 'CONFLICT';
  if (error.httpStatus === 404 || error.errorCode === 'commercial_trial.not_found') return 'NOT_FOUND';
  return 'BACKEND_FAILURE';
};
const mapError = (error: unknown): never => {
  if (error instanceof Error && (error.name === 'CanceledError' || (error as Error & { code?: string }).code === 'ERR_CANCELED')) throw error;
  if (error instanceof CommercialTrialError) throw error;
  if (error instanceof CommercialTrialDatasourceError) throw new CommercialTrialError(failureKind(error), error.errorCode, error.messageToken, error.retryable);
  throw new CommercialTrialError('BACKEND_FAILURE', 'commercial_trial.application_failure', 'errors.commercialTrial.application_failure', true);
};

export const commercialTrialRepository: ICommercialTrialRepository = {
  async getCommercialTrial(organizationId, tenantId, signal) { try { return mapCommercialTrial(await getCommercialTrialApi(tenantId, signal), organizationId, tenantId); } catch (error) { return mapError(error); } },
  async getCommercialRetention(organizationId, tenantId, signal) { try { return mapCommercialRetention(await getCommercialRetentionApi(tenantId, signal), organizationId, tenantId); } catch (error) { return mapError(error); } },
  async activateCommercialTrial(organizationId, tenantId, aggregateVersion, confirmed, idempotencyKey) { try { return mapCommercialTrial(await activateCommercialTrialApi(tenantId, { contract_version: COMMERCIAL_TRIAL_CONTRACT_V1, aggregate_version: aggregateVersion, confirmed }, idempotencyKey), organizationId, tenantId); } catch (error) { return mapError(error); } },
  async requestCommercialTrialExtension(organizationId, tenantId, reason, channel, idempotencyKey) { try { return mapCommercialTrial(await requestCommercialTrialExtensionApi(tenantId, { contract_version: COMMERCIAL_TRIAL_CONTRACT_V1, reason, channel }, idempotencyKey), organizationId, tenantId); } catch (error) { return mapError(error); } },
  async grantCommercialTrialExtension(organizationId, tenantId, aggregateVersion, extensionDays, reason, channel, idempotencyKey, requesterId, requestOperationId) { try { return mapCommercialTrial(await grantCommercialTrialExtensionApi(tenantId, { contract_version: COMMERCIAL_TRIAL_CONTRACT_V1, aggregate_version: aggregateVersion, extension_days: extensionDays, reason, channel, ...(requesterId ? { requester_id: requesterId } : {}), ...(requestOperationId ? { request_operation_id: requestOperationId } : {}) }, idempotencyKey), organizationId, tenantId); } catch (error) { return mapError(error); } },
  async requestCommercialTrialSubscription(_organizationId, tenantId) { try { return mapHandoff(await requestCommercialTrialSubscriptionApi(tenantId), tenantId); } catch (error) { return mapError(error); } },
};

export const shouldRetryCommercialTrial = (failureCount: number, error: Error): boolean => error instanceof CommercialTrialError && error.retryable && failureCount < 2;
const updateCache = (current: CommercialTrial | undefined, incoming: CommercialTrial): CommercialTrial => current && current.aggregateVersion > incoming.aggregateVersion ? current : incoming;
export const useCommercialTrialQuery = (organizationId: string, tenantId: string, options?: Omit<UseQueryOptions<CommercialTrial, Error>, 'queryKey' | 'queryFn'>) => useQuery<CommercialTrial, Error>({ queryKey: commercialTrialKeys.commercialTrial(organizationId, tenantId), queryFn: ({ signal }) => commercialTrialRepository.getCommercialTrial(organizationId, tenantId, signal), enabled: Boolean(organizationId && tenantId), retry: shouldRetryCommercialTrial, ...options });
export const useCommercialRetentionQuery = (organizationId: string, tenantId: string, options?: Omit<UseQueryOptions<CommercialRetention, Error>, 'queryKey' | 'queryFn'>) => useQuery<CommercialRetention, Error>({ queryKey: commercialTrialKeys.commercialRetention(organizationId, tenantId), queryFn: ({ signal }) => commercialTrialRepository.getCommercialRetention(organizationId, tenantId, signal), enabled: Boolean(organizationId && tenantId), retry: shouldRetryCommercialTrial, ...options });
const useCommercialMutation = <Variables, Result extends CommercialTrial | CommercialTrialHandoff>(organizationId: string, tenantId: string, mutationFn: (variables: Variables) => Promise<Result>) => { const client = useQueryClient(); const key = commercialTrialKeys.commercialTrial(organizationId, tenantId); return useMutation<Result, Error, Variables>({ mutationFn, onSuccess: value => { if ('aggregateVersion' in value) client.setQueryData<CommercialTrial>(key, current => updateCache(current, value)); client.invalidateQueries({ queryKey: key }); }, retry: false }); };
export const useActivateCommercialTrialMutation = (organizationId: string, tenantId: string) => useCommercialMutation(organizationId, tenantId, ({ aggregateVersion, confirmed, idempotencyKey }: { aggregateVersion: number; confirmed: boolean; idempotencyKey: string }) => commercialTrialRepository.activateCommercialTrial(organizationId, tenantId, aggregateVersion, confirmed, idempotencyKey));
export const useRequestCommercialTrialExtensionMutation = (organizationId: string, tenantId: string) => useCommercialMutation(organizationId, tenantId, ({ reason, channel, idempotencyKey }: { reason: string; channel: string; idempotencyKey: string }) => commercialTrialRepository.requestCommercialTrialExtension(organizationId, tenantId, reason, channel, idempotencyKey));
export const useGrantCommercialTrialExtensionMutation = (organizationId: string, tenantId: string) => useCommercialMutation(organizationId, tenantId, ({ aggregateVersion, extensionDays, reason, channel, idempotencyKey, requesterId, requestOperationId }: { aggregateVersion: number; extensionDays: number; reason: string; channel: string; idempotencyKey: string; requesterId?: string; requestOperationId?: string }) => commercialTrialRepository.grantCommercialTrialExtension(organizationId, tenantId, aggregateVersion, extensionDays, reason, channel, idempotencyKey, requesterId, requestOperationId));
export const useCommercialTrialSubscriptionMutation = (organizationId: string, tenantId: string) => useCommercialMutation<void, CommercialTrialHandoff>(organizationId, tenantId, () => commercialTrialRepository.requestCommercialTrialSubscription(organizationId, tenantId));
export const useClearCommercialTrialCache = () => { const client = useQueryClient(); return useCallback(async (organizationId: string, tenantId: string) => { const key = commercialTrialKeys.commercialTrial(organizationId, tenantId); await client.cancelQueries({ queryKey: key }); client.removeQueries({ queryKey: key }); }, [client]); };
export const useClearCommercialRetentionCache = () => { const client = useQueryClient(); return useCallback(async (organizationId: string, tenantId: string) => { const key = commercialTrialKeys.commercialRetention(organizationId, tenantId); await client.cancelQueries({ queryKey: key }); client.removeQueries({ queryKey: key }); }, [client]); };
