/**
 * Onboarding Repository Implementation
 * React Query hooks for onboarding management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { queryClient as sharedQueryClient } from '../../../../core/api/queryClient';
import {
  getApplicationDetailApi,
  getValidationReportApi,
  improveApplicationApi,
  resubmitApplicationApi,
  createDemoTenantApi,
  getDemoStatusApi,
  transitionDemoToLiveApi,
  getSetupWizardContextApi,
  getSetupWizardProgressApi,
  completeSetupWizardApi,
  getOnboardingStatusApi,
  submitStepDataApi,
  completeSetupApi,
  associateClinicEntryApi,
  createClinicEntryApi,
  createInitialOrganizationApi,
  getContactVerificationStatusApi,
  getOrganizationContextApi,
  getOwnershipStatusApi,
  refreshEffectiveTenantApi,
  requestContactVerificationApi,
  selectEffectiveTenantApi,
  ensureWorkspacePreparationApi,
  getWorkspacePreparationApi,
  retryWorkspacePreparationApi,
  getJourneyVisibilityApi,
  getReadyToStartApi
} from '../datasources/onboarding.api';
import {
  ApplicationDetailResponse,
  ValidationReportResponse,
  ApplicationImprovementRequest,
  ApplicationImprovementResponse,
  DemoCreateRequest,
  DemoCreateResponse,
  DemoStatusResponse,
  SetupWizardContextResponse,
  SetupWizardProgressResponse,
  OnboardingStatusResponse,
  StepSubmitRequest,
  StepSubmitResponse,
  CompleteSetupResponse,
  WorkspacePreparationDatasourceError,
  WorkspacePreparationResponseDTO,
  JourneyVisibilityDatasourceError,
  JourneyVisibilityResponseDTO,
  ReadinessChecklistItemDTO,
  ReadinessNextActionDTO,
  ReadinessProviderDTO,
  ReadyToStartDatasourceError,
  ReadyToStartResponseDTO,
  StepSubmissionDatasourceError,
} from '../models/onboarding.dtos';
import {
  BringClinicInput,
  ClinicEntryResult,
  ContactVerificationResult,
  EffectiveTenantResult,
  NewClinicInput,
  InitialOrganizationResult,
  OwnershipStatusResult,
} from '../../domain/clinic-entry';
import {
  WORKSPACE_PREPARATION_CONTRACT_V1,
  WorkspacePreparation,
  WorkspacePreparationError,
} from '../../domain/entities/workspace-preparation.entity';
import { buildWorkspacePreparationViewModel } from '../../domain/usecases/build-workspace-preparation-view-model.usecase';
import {
  JOURNEY_VISIBILITY_CONTRACT_V1,
  JourneyVisibilityError,
  JourneyVisibilityProjection,
} from '../../domain/entities/journey-visibility.entity';
import {
  IJourneyVisibilityRepository,
  IReadyToStartRepository,
} from '../../domain/repositories/onboarding.repository';
import {
  Advisory,
  Blocker,
  ChecklistItem,
  NextAction,
  READY_TO_START_CONTRACT_V1,
  ReadinessProvider,
  ReadyToStart,
  ReadyToStartError,
} from '../../domain/entities/ready-to-start.entity';
import {
  PendingMutationContractError,
  parsePendingMutationRecord,
  type PendingMutationExecutionResult,
  type PendingMutationRecord,
} from '../../domain/entities/pending-mutation.entity';
import {
  StepConflictError,
  createAuthoritativeStepRevision,
  createStepProjectionIdentity,
  createStaleRevisionConflict,
} from '../../domain/entities/step-revision.entity';

type StepSubmitVariables = StepSubmitRequest & {
  idempotencyKey?: string;
};

// ============================================
// QUERY KEYS
// ============================================

export const onboardingKeys = {
  all: ['onboarding'] as const,
  applications: () => [...onboardingKeys.all, 'applications'] as const,
  application: (id: string) => [...onboardingKeys.applications(), id] as const,
  validationReport: (id: string) => [...onboardingKeys.application(id), 'validation'] as const,
  demos: () => [...onboardingKeys.all, 'demos'] as const,
  demo: (id: string) => [...onboardingKeys.demos(), id] as const,
  setupWizard: (id: string) => [...onboardingKeys.all, 'setup-wizard', id] as const,
  setupProgress: (id: string) => [...onboardingKeys.setupWizard(id), 'progress'] as const,
  statuses: (organizationId: string, tenantId: string) =>
    [...onboardingKeys.all, 'status', organizationId, tenantId] as const,
  status: (organizationId: string, tenantId: string) =>
    [...onboardingKeys.statuses(organizationId, tenantId), 'v1'] as const,
  organizationContext: () => [...onboardingKeys.all, 'organization-context'] as const,
  workspacePreparations: (organizationId: string, tenantId: string) =>
    [...onboardingKeys.all, 'workspace-preparation', organizationId, tenantId] as const,
  workspacePreparation: (organizationId: string, tenantId: string) =>
    [
      ...onboardingKeys.workspacePreparations(organizationId, tenantId),
      WORKSPACE_PREPARATION_CONTRACT_V1,
    ] as const,
  journeyVisibility: (organizationId: string, tenantId: string) =>
    [
      ...onboardingKeys.all,
      'journey-visibility',
      organizationId,
      tenantId,
      JOURNEY_VISIBILITY_CONTRACT_V1,
    ] as const,
  journeyVisibilities: (organizationId: string, tenantId: string) =>
    [...onboardingKeys.all, 'journey-visibility', organizationId, tenantId] as const,
  readinesses: (organizationId: string, tenantId: string) =>
    [...onboardingKeys.all, 'ready-to-start', organizationId, tenantId] as const,
  readiness: (organizationId: string, tenantId: string) =>
    [
      ...onboardingKeys.readinesses(organizationId, tenantId),
      READY_TO_START_CONTRACT_V1,
    ] as const,
};

const CAPABILITY_REVISION_V1 = /^cap-v1:[0-9a-f]{64}$/;

export const mapJourneyVisibility = (
  dto: JourneyVisibilityResponseDTO,
  requestedTenantId: string
): JourneyVisibilityProjection => {
  const projectedAt = new Date(dto.projected_at);
  const invalidStep = dto.visible_steps.some(
    (step) =>
      !step.step_id ||
      !Number.isInteger(step.order) ||
      step.order < 0 ||
      step.visibility !== 'VISIBLE' ||
      !['INCOMPLETE', 'COMPLETED'].includes(step.progress)
  );
  if (
    dto.contract_version !== JOURNEY_VISIBILITY_CONTRACT_V1 ||
    !dto.template_version ||
    !CAPABILITY_REVISION_V1.test(dto.capability_revision) ||
    dto.tenant_id !== requestedTenantId ||
    Number.isNaN(projectedAt.getTime()) ||
    invalidStep
  ) {
    throw new JourneyVisibilityError(
      dto.tenant_id !== requestedTenantId ? 'TENANT_MISMATCH' : 'CONTRACT_MISMATCH',
      dto.tenant_id !== requestedTenantId
        ? 'journey_visibility.scope_mismatch'
        : 'journey_visibility.contract_mismatch',
      dto.tenant_id !== requestedTenantId
        ? 'errors.journeyVisibility.scope_mismatch'
        : 'errors.journeyVisibility.contract_mismatch',
      false
    );
  }

  const identity = Object.freeze({
    contractVersion: JOURNEY_VISIBILITY_CONTRACT_V1,
    templateVersion: dto.template_version,
    capabilityRevision: dto.capability_revision,
    tenantId: dto.tenant_id,
  });
  const visibleSteps = Object.freeze(
    dto.visible_steps.map((step) =>
      Object.freeze({
        stepId: step.step_id,
        order: step.order,
        visibility: step.visibility,
        progress: step.progress,
      })
    )
  );
  return Object.freeze({ identity, projectedAt, visibleSteps });
};

const journeyVisibilityFailureKind = (
  error: JourneyVisibilityDatasourceError
): JourneyVisibilityError['kind'] => {
  if (error.httpStatus === 401) return 'UNAUTHORIZED';
  if (error.errorCode === 'journey_visibility.scope_mismatch') return 'TENANT_MISMATCH';
  if (error.httpStatus === 403) return 'FORBIDDEN';
  if (error.errorCode === 'journey_visibility.contract_mismatch') return 'CONTRACT_MISMATCH';
  if (
    error.errorCode === 'journey_visibility.projection_unavailable' ||
    error.errorCode === 'journey_visibility.capability_snapshot_unavailable'
  ) return 'PROJECTION_UNAVAILABLE';
  return 'BACKEND_FAILURE';
};

const mapJourneyVisibilityError = (error: unknown): never => {
  if (error instanceof JourneyVisibilityError) throw error;
  if (error instanceof JourneyVisibilityDatasourceError) {
    throw new JourneyVisibilityError(
      journeyVisibilityFailureKind(error),
      error.errorCode,
      error.messageToken,
      error.retryable
    );
  }
  throw new JourneyVisibilityError(
    'BACKEND_FAILURE',
    'journey_visibility.unavailable',
    'errors.journeyVisibility.unavailable',
    true
  );
};

export const journeyVisibilityRepository: IJourneyVisibilityRepository = {
  async getJourneyVisibility(tenantId: string): Promise<JourneyVisibilityProjection> {
    try {
      return mapJourneyVisibility(await getJourneyVisibilityApi(tenantId), tenantId);
    } catch (error) {
      return mapJourneyVisibilityError(error);
    }
  },
};

export const shouldRetryJourneyVisibility = (failureCount: number, error: Error): boolean =>
  error instanceof JourneyVisibilityError && error.retryable && failureCount < 2;

export const useJourneyVisibilityQuery = (
  organizationId: string,
  tenantId: string,
  options?: Omit<UseQueryOptions<JourneyVisibilityProjection, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<JourneyVisibilityProjection, Error>({
    queryKey: onboardingKeys.journeyVisibility(organizationId, tenantId),
    queryFn: () => journeyVisibilityRepository.getJourneyVisibility(tenantId),
    enabled: Boolean(organizationId && tenantId),
    retry: shouldRetryJourneyVisibility,
    ...options,
  });

export const useClearJourneyVisibilityCache = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (organizationId: string, tenantId: string): Promise<void> => {
      const queryKey = onboardingKeys.journeyVisibilities(organizationId, tenantId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );
};

const READINESS_STATES = [
  'READY',
  'NOT_READY',
  'EVALUATING',
  'UNKNOWN',
  'UNAVAILABLE',
  'STALE',
] as const;
const CHECKLIST_STATUSES = [
  'COMPLETE',
  'BLOCKED',
  'ADVISORY',
  'EVALUATING',
  'UNKNOWN',
  'UNAVAILABLE',
  'STALE',
] as const;
const PROVIDER_OUTCOMES = ['SATISFIED', 'BLOCKER', 'ADVISORY'] as const;
const NEXT_ACTION_KINDS = ['NAVIGATE', 'REFRESH', 'RETRY', 'CONTACT_SUPPORT'] as const;

const present = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const timestamp = (value: string): boolean => present(value) && !Number.isNaN(Date.parse(value));

const invalidAggregate = (messageToken = 'errors.readyToStart.invalid_aggregate'): never => {
  throw new ReadyToStartError(
    'INVALID_AGGREGATE',
    'readiness.invalid_aggregate',
    messageToken,
    false
  );
};

const mapReadinessNextAction = (dto: ReadinessNextActionDTO | null): NextAction | null => {
  if (dto === null) return null;
  if (
    !present(dto.action_id) ||
    !present(dto.label_token) ||
    !present(dto.owner_id) ||
    !NEXT_ACTION_KINDS.includes(dto.kind) ||
    !present(dto.authorization_requirement) ||
    (dto.target_id !== null && !present(dto.target_id))
  ) invalidAggregate();
  return Object.freeze({
    actionId: dto.action_id,
    labelToken: dto.label_token,
    ownerId: dto.owner_id,
    kind: dto.kind,
    authorizationRequirement: dto.authorization_requirement,
    targetId: dto.target_id,
  });
};

const mapReadinessChecklistItem = (dto: ReadinessChecklistItemDTO): ChecklistItem => {
  const classificationMatchesStatus =
    (dto.status === 'COMPLETE' && dto.classification === null) ||
    (dto.status === 'ADVISORY' && dto.classification === 'ADVISORY') ||
    (!['COMPLETE', 'ADVISORY'].includes(dto.status) && dto.classification === 'BLOCKER');
  if (
    !present(dto.provider_id) ||
    !present(dto.item_id) ||
    !present(dto.item_version) ||
    !present(dto.title_token) ||
    !present(dto.explanation_token) ||
    !CHECKLIST_STATUSES.includes(dto.status) ||
    (dto.classification !== null && !['BLOCKER', 'ADVISORY'].includes(dto.classification)) ||
    !timestamp(dto.evidence_timestamp) ||
    !Number.isInteger(dto.order) ||
    dto.order < 0 ||
    typeof dto.applicable !== 'boolean' ||
    !classificationMatchesStatus
  ) invalidAggregate();
  return Object.freeze({
    providerId: dto.provider_id,
    itemId: dto.item_id,
    itemVersion: dto.item_version,
    titleToken: dto.title_token,
    explanationToken: dto.explanation_token,
    status: dto.status,
    classification: dto.classification,
    evidenceTimestamp: dto.evidence_timestamp,
    order: dto.order,
    applicable: dto.applicable,
    nextAction: mapReadinessNextAction(dto.next_action),
  });
};

const mapReadinessProvider = (dto: ReadinessProviderDTO): ReadinessProvider => {
  if (
    !present(dto.provider_id) ||
    !present(dto.provider_version) ||
    !Number.isInteger(dto.provider_order) ||
    dto.provider_order < 0 ||
    typeof dto.applicable !== 'boolean' ||
    !READINESS_STATES.includes(dto.state) ||
    !PROVIDER_OUTCOMES.includes(dto.outcome) ||
    !present(dto.evidence_revision) ||
    !timestamp(dto.observed_at) ||
    !present(dto.severity) ||
    !present(dto.explanation_token)
  ) invalidAggregate();
  return Object.freeze({
    providerId: dto.provider_id,
    providerVersion: dto.provider_version,
    providerOrder: dto.provider_order,
    applicable: dto.applicable,
    state: dto.state,
    outcome: dto.outcome,
    evidenceRevision: dto.evidence_revision,
    observedAt: dto.observed_at,
    severity: dto.severity,
    explanationToken: dto.explanation_token,
    nextAction: mapReadinessNextAction(dto.next_action),
  });
};

export const mapReadyToStart = (
  dto: ReadyToStartResponseDTO,
  requestedTenantId: string
): ReadyToStart => {
  if (!dto.identity) invalidAggregate();
  if (dto.identity.tenant_id !== requestedTenantId) {
    throw new ReadyToStartError(
      'TENANT_MISMATCH',
      'readiness.tenant_mismatch',
      'errors.readyToStart.tenant_mismatch',
      false
    );
  }
  if (dto.identity.readiness_contract_version !== READY_TO_START_CONTRACT_V1) {
    throw new ReadyToStartError(
      'UNSUPPORTED_CONTRACT',
      'readiness.unsupported_contract',
      'errors.readyToStart.unsupported_contract',
      false
    );
  }
  if (
    !present(dto.identity.journey_projection_identity?.template_version) ||
    !present(dto.identity.journey_projection_identity?.capability_revision) ||
    !present(dto.identity.provider_set_revision) ||
    !present(dto.identity.evidence_revision) ||
    !READINESS_STATES.includes(dto.state) ||
    !Array.isArray(dto.providers) ||
    !Array.isArray(dto.checklist) ||
    !Array.isArray(dto.blockers) ||
    !Array.isArray(dto.advisories) ||
    !timestamp(dto.evaluated_at) ||
    typeof dto.authorizes_handoff !== 'boolean' ||
    dto.authorizes_handoff !== (dto.state === 'READY')
  ) invalidAggregate();

  const identity = Object.freeze({
    readinessContractVersion: READY_TO_START_CONTRACT_V1,
    tenantId: dto.identity.tenant_id,
    journeyProjectionIdentity: Object.freeze({
      templateVersion: dto.identity.journey_projection_identity.template_version,
      capabilityRevision: dto.identity.journey_projection_identity.capability_revision,
    }),
    providerSetRevision: dto.identity.provider_set_revision,
    evidenceRevision: dto.identity.evidence_revision,
  });
  const providers = Object.freeze(dto.providers.map(mapReadinessProvider));
  const checklist = Object.freeze(dto.checklist.map(mapReadinessChecklistItem));
  const blockers = Object.freeze(
    dto.blockers.map((item) => {
      const mapped = mapReadinessChecklistItem(item);
      if (mapped.classification !== 'BLOCKER') invalidAggregate();
      return mapped as Blocker;
    })
  );
  const advisories = Object.freeze(
    dto.advisories.map((item) => {
      const mapped = mapReadinessChecklistItem(item);
      if (mapped.classification !== 'ADVISORY') invalidAggregate();
      return mapped as Advisory;
    })
  );
  return Object.freeze({
    identity,
    state: dto.state,
    providers,
    checklist,
    blockers,
    advisories,
    evaluatedAt: dto.evaluated_at,
    authorizesHandoff: dto.authorizes_handoff,
  });
};

const readinessFailureKind = (
  error: ReadyToStartDatasourceError
): ReadyToStartError['kind'] => {
  if (error.httpStatus === 401) return 'UNAUTHORIZED';
  if (error.errorCode === 'readiness.tenant_mismatch') return 'TENANT_MISMATCH';
  if (error.errorCode === 'readiness.organization_mismatch') return 'ORGANIZATION_MISMATCH';
  if (error.httpStatus === 403 || error.errorCode === 'readiness.forbidden') return 'FORBIDDEN';
  if (error.errorCode === 'readiness.unsupported_contract') return 'UNSUPPORTED_CONTRACT';
  if (error.errorCode === 'readiness.stale') return 'STALE_PROJECTION';
  if (
    error.errorCode === 'readiness.provider_unavailable' ||
    error.errorCode === 'readiness.effective_tenant_unavailable'
  ) return 'READINESS_UNAVAILABLE';
  if (
    error.errorCode === 'readiness.provider_configuration' ||
    error.errorCode === 'readiness.invalid_aggregate'
  ) return 'INVALID_AGGREGATE';
  return 'BACKEND_FAILURE';
};

const mapReadyToStartError = (error: unknown): never => {
  if (
    error instanceof Error &&
    (error.name === 'CanceledError' || (error as Error & { code?: string }).code === 'ERR_CANCELED')
  ) throw error;
  if (error instanceof ReadyToStartError) throw error;
  if (error instanceof ReadyToStartDatasourceError) {
    throw new ReadyToStartError(
      readinessFailureKind(error),
      error.errorCode,
      error.messageToken,
      error.retryable
    );
  }
  throw new ReadyToStartError(
    'BACKEND_FAILURE',
    'readiness.evaluation_failure',
    'errors.readyToStart.evaluation_failure',
    true
  );
};

export const readyToStartRepository: IReadyToStartRepository = {
  async getReadyToStart(tenantId: string, signal?: AbortSignal): Promise<ReadyToStart> {
    try {
      return mapReadyToStart(await getReadyToStartApi(tenantId, signal), tenantId);
    } catch (error) {
      return mapReadyToStartError(error);
    }
  },
};

export const shouldRetryReadyToStart = (failureCount: number, error: Error): boolean =>
  error instanceof ReadyToStartError && error.retryable && failureCount < 2;

export const useReadyToStartQuery = (
  organizationId: string,
  tenantId: string,
  options?: Omit<UseQueryOptions<ReadyToStart, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<ReadyToStart, Error>({
    queryKey: onboardingKeys.readiness(organizationId, tenantId),
    queryFn: ({ signal }) => readyToStartRepository.getReadyToStart(tenantId, signal),
    enabled: Boolean(organizationId && tenantId),
    retry: shouldRetryReadyToStart,
    ...options,
  });

export const useClearReadyToStartCache = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (organizationId: string, tenantId: string): Promise<void> => {
      const queryKey = onboardingKeys.readinesses(organizationId, tenantId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );
};

const mapWorkspacePreparation = (
  dto: WorkspacePreparationResponseDTO
): WorkspacePreparation =>
  buildWorkspacePreparationViewModel({
    contractVersion: dto.contract_version,
    runId: dto.run_id,
    state: dto.state,
    aggregateVersion: dto.aggregate_version,
    progress: dto.progress,
    units: dto.units.map((unit) => ({
      code: unit.code,
      outcome: unit.outcome,
      evidenceVersion: unit.evidence_version,
      attempt: unit.attempt,
      observedAt: unit.observed_at,
      recordedAt: unit.recorded_at,
    })),
    reasonCode: dto.reason_code,
    retryAllowed: dto.retry_allowed,
    userRetryCount: dto.user_retry_count,
    maxUserRetries: dto.max_user_retries,
    nextAction: dto.next_action,
    refreshAfterSeconds: dto.refresh_after_seconds,
    supportCorrelationId: dto.support_correlation_id,
    updatedAt: dto.updated_at,
  });

const mapWorkspacePreparationError = (error: unknown): never => {
  if (error instanceof WorkspacePreparationError) throw error;
  if (error instanceof WorkspacePreparationDatasourceError) {
    throw new WorkspacePreparationError(error.errorCode, error.messageToken, error.retryable);
  }
  throw new WorkspacePreparationError(
    'workspace_preparation.execution_failure',
    'errors.workspacePreparation.execution_failure',
    true
  );
};

export const workspacePreparationRepository = {
  async ensureWorkspacePreparation(tenantId: string): Promise<WorkspacePreparation> {
    try {
      return mapWorkspacePreparation(await ensureWorkspacePreparationApi(tenantId));
    } catch (error) {
      return mapWorkspacePreparationError(error);
    }
  },
  async getWorkspacePreparation(tenantId: string): Promise<WorkspacePreparation> {
    try {
      return mapWorkspacePreparation(await getWorkspacePreparationApi(tenantId));
    } catch (error) {
      return mapWorkspacePreparationError(error);
    }
  },
  async retryWorkspacePreparation(
    tenantId: string,
    aggregateVersion: number,
    idempotencyKey: string
  ): Promise<WorkspacePreparation> {
    try {
      return mapWorkspacePreparation(
        await retryWorkspacePreparationApi(tenantId, aggregateVersion, idempotencyKey)
      );
    } catch (error) {
      return mapWorkspacePreparationError(error);
    }
  },
};

export const shouldRetryWorkspacePreparation = (
  failureCount: number,
  error: Error
): boolean =>
  error instanceof WorkspacePreparationError && error.retryable && failureCount < 2;

export const useWorkspacePreparationQuery = (
  organizationId: string,
  tenantId: string,
  options?: Omit<UseQueryOptions<WorkspacePreparation, Error>, 'queryKey' | 'queryFn'>
) =>
  useQuery<WorkspacePreparation, Error>({
    queryKey: onboardingKeys.workspacePreparation(organizationId, tenantId),
    queryFn: () => workspacePreparationRepository.getWorkspacePreparation(tenantId),
    enabled: Boolean(organizationId && tenantId),
    retry: shouldRetryWorkspacePreparation,
    ...options,
  });

export const useEnsureWorkspacePreparationMutation = (
  organizationId: string,
  tenantId: string
) => {
  const queryClient = useQueryClient();
  const queryKey = onboardingKeys.workspacePreparation(organizationId, tenantId);
  return useMutation<WorkspacePreparation, Error, void>({
    mutationFn: () => workspacePreparationRepository.ensureWorkspacePreparation(tenantId),
    onSuccess: (value) => {
      queryClient.setQueryData(queryKey, value);
      queryClient.invalidateQueries({ queryKey });
    },
    retry: false,
  });
};

export const useRetryWorkspacePreparationMutation = (
  organizationId: string,
  tenantId: string
) => {
  const queryClient = useQueryClient();
  const queryKey = onboardingKeys.workspacePreparation(organizationId, tenantId);
  const scope = `${organizationId}:${tenantId}`;
  const pendingIntent = useRef<{
    scope: string;
    key: string;
    aggregateVersion: number;
  } | null>(null);
  return useMutation<
    WorkspacePreparation,
    Error,
    { aggregateVersion: number }
  >({
    mutationFn: ({ aggregateVersion }) => {
      if (pendingIntent.current?.scope !== scope) pendingIntent.current = null;
      pendingIntent.current ??= {
        scope,
        key: `workspace-preparation-retry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        aggregateVersion,
      };
      return workspacePreparationRepository.retryWorkspacePreparation(
        tenantId,
        pendingIntent.current.aggregateVersion,
        pendingIntent.current.key
      );
    },
    onSuccess: (value) => {
      queryClient.setQueryData(queryKey, value);
      queryClient.invalidateQueries({ queryKey });
      pendingIntent.current = null;
    },
    retry: false,
  });
};

export const useClearWorkspacePreparationCache = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (organizationId: string, tenantId: string): Promise<void> => {
      const queryKey = onboardingKeys.workspacePreparations(organizationId, tenantId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );
};

export const useOrganizationContextQuery = () =>
  useQuery({
    queryKey: onboardingKeys.organizationContext(),
    queryFn: getOrganizationContextApi,
  });

export const useCreateInitialOrganizationMutation = () =>
  useMutation<InitialOrganizationResult, Error, string>({
    mutationFn: createInitialOrganizationApi,
  });

export const useRequestContactVerificationMutation = () =>
  useMutation<
    ContactVerificationResult,
    Error,
    {
      organizationId: string;
      contactKind: 'email' | 'mobile';
      contactValue: string;
      intendedOperation: 'clinic_entry.create.v1' | 'clinic_entry.associate.v1';
      idempotencyKey: string;
    }
  >({
    mutationFn: (variables) =>
      requestContactVerificationApi(
        variables.organizationId,
        variables.contactKind,
        variables.contactValue,
        variables.intendedOperation,
        variables.idempotencyKey
      ),
  });

export const useContactVerificationStatusMutation = () =>
  useMutation<
    ContactVerificationResult,
    Error,
    { organizationId: string; evidenceId: string }
  >({
    mutationFn: ({ organizationId, evidenceId }) =>
      getContactVerificationStatusApi(organizationId, evidenceId),
  });

export const useOwnershipStatusMutation = () =>
  useMutation<
    OwnershipStatusResult,
    Error,
    { organizationId: string; ownershipReference: string }
  >({
    mutationFn: ({ organizationId, ownershipReference }) =>
      getOwnershipStatusApi(organizationId, ownershipReference),
  });

export const useCreateClinicEntryMutation = () =>
  useMutation<
    ClinicEntryResult,
    Error,
    {
      organizationId: string;
      input: NewClinicInput;
      evidenceReference: string;
      idempotencyKey: string;
    }
  >({
    mutationFn: ({ organizationId, input, evidenceReference, idempotencyKey }) =>
      createClinicEntryApi(organizationId, input, evidenceReference, idempotencyKey),
  });

export const useAssociateClinicEntryMutation = () =>
  useMutation<
    ClinicEntryResult,
    Error,
    {
      organizationId: string;
      input: BringClinicInput;
      evidenceReference: string;
      idempotencyKey: string;
    }
  >({
    mutationFn: ({ organizationId, input, evidenceReference, idempotencyKey }) =>
      associateClinicEntryApi(organizationId, input, evidenceReference, idempotencyKey),
  });

export const useSelectEffectiveTenantMutation = () =>
  useMutation<
    EffectiveTenantResult,
    Error,
    { organizationId: string; tenantId: string; idempotencyKey: string }
  >({
    mutationFn: ({ organizationId, tenantId, idempotencyKey }) =>
      selectEffectiveTenantApi(organizationId, tenantId, idempotencyKey),
  });

export const useRefreshEffectiveTenantMutation = () =>
  useMutation<EffectiveTenantResult, Error, string>({
    mutationFn: refreshEffectiveTenantApi,
  });

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get application details
 */
export const useApplicationDetailQuery = (
  applicationId: string,
  options?: Omit<UseQueryOptions<ApplicationDetailResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ApplicationDetailResponse, Error>({
    queryKey: onboardingKeys.application(applicationId),
    queryFn: () => getApplicationDetailApi(applicationId),
    enabled: !!applicationId,
    ...options,
  });
};

/**
 * Hook to get validation report
 */
export const useValidationReportQuery = (
  applicationId: string,
  options?: Omit<UseQueryOptions<ValidationReportResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ValidationReportResponse, Error>({
    queryKey: onboardingKeys.validationReport(applicationId),
    queryFn: () => getValidationReportApi(applicationId),
    enabled: !!applicationId,
    ...options,
  });
};

/**
 * Hook to get demo status
 */
export const shouldRetryDemoStatusQuery = (
  failureCount: number,
  error: unknown
): boolean => {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return false;
  }
  return failureCount < 2;
};

export const useDemoStatusQuery = (
  demoTenantId: string,
  options?: Omit<UseQueryOptions<DemoStatusResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<DemoStatusResponse, Error>({
    queryKey: onboardingKeys.demo(demoTenantId),
    queryFn: () => getDemoStatusApi(demoTenantId),
    enabled: !!demoTenantId,
    retry: shouldRetryDemoStatusQuery,
    refetchInterval: 60000, // Refresh every minute
    ...options,
  });
};

/**
 * Hook to get setup wizard context
 */
export const useSetupWizardContextQuery = (
  applicationId: string,
  options?: Omit<UseQueryOptions<SetupWizardContextResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<SetupWizardContextResponse, Error>({
    queryKey: onboardingKeys.setupWizard(applicationId),
    queryFn: () => getSetupWizardContextApi(applicationId),
    enabled: !!applicationId,
    ...options,
  });
};

/**
 * Hook to get setup wizard progress
 */
export const useSetupWizardProgressQuery = (
  applicationId: string,
  options?: Omit<UseQueryOptions<SetupWizardProgressResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<SetupWizardProgressResponse, Error>({
    queryKey: onboardingKeys.setupProgress(applicationId),
    queryFn: () => getSetupWizardProgressApi(applicationId),
    enabled: !!applicationId,
    ...options,
  });
};

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to improve application
 */
export const useImproveApplicationMutation = (applicationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationImprovementResponse, Error, ApplicationImprovementRequest>({
    mutationFn: (data) => improveApplicationApi(applicationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.application(applicationId) });
      queryClient.invalidateQueries({ queryKey: onboardingKeys.validationReport(applicationId) });
    },
    onError: (error) => {
      console.error('[useImproveApplicationMutation] Error:', error);
    },
  });
};

/**
 * Hook to resubmit application
 */
export const useResubmitApplicationMutation = (applicationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDetailResponse, Error, void>({
    mutationFn: () => resubmitApplicationApi(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.application(applicationId) });
    },
    onError: (error) => {
      console.error('[useResubmitApplicationMutation] Error:', error);
    },
  });
};

/**
 * Hook to create demo tenant
 */
export const useCreateDemoTenantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<DemoCreateResponse, Error, DemoCreateRequest>({
    mutationFn: (data) => createDemoTenantApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.demos() });
    },
    onError: (error) => {
      console.error('[useCreateDemoTenantMutation] Error:', error);
    },
  });
};

/**
 * Hook to transition demo to live
 */
export const useTransitionDemoToLiveMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<{ tenant_id: string }, Error, string>({
    mutationFn: (demoTenantId) => transitionDemoToLiveApi(demoTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.demos() });
    },
    onError: (error) => {
      console.error('[useTransitionDemoToLiveMutation] Error:', error);
    },
  });
};

/**
 * Hook to complete setup wizard
 */
export const useCompleteSetupWizardMutation = (applicationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<{ tenant_id: string }, Error, void>({
    mutationFn: () => completeSetupWizardApi(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.setupWizard(applicationId) });
    },
    onError: (error) => {
      console.error('[useCompleteSetupWizardMutation] Error:', error);
    },
  });
};

/**
 * Hook to get onboarding status (NEW - Dynamic Steps)
 */
export const useOnboardingStatusQuery = (
  tenantId: string,
  options?: Omit<UseQueryOptions<OnboardingStatusResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const organizationContext = useOrganizationContextQuery();
  const organizationId = organizationContext.data?.effectiveOrganizationId ?? '';
  const scopeMatches =
    organizationContext.data?.effectiveTenantId === tenantId &&
    !organizationContext.data?.sessionRefreshRequired;
  return useQuery<OnboardingStatusResponse, Error>({
    queryKey: onboardingKeys.status(organizationId, tenantId),
    queryFn: ({ signal }) => getOnboardingStatusApi(tenantId, signal),
    staleTime: 30000, // 30 seconds
    ...options,
    enabled:
      Boolean(organizationId && tenantId && scopeMatches) &&
      (options?.enabled ?? true),
  });
};

export const useClearOnboardingStatusCache = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (organizationId: string, tenantId: string): Promise<void> => {
      const queryKey = onboardingKeys.statuses(organizationId, tenantId);
      await queryClient.cancelQueries({ queryKey });
      queryClient.removeQueries({ queryKey });
    },
    [queryClient]
  );
};

export const mapStepSubmissionError = (error: unknown, stepCode: string): never => {
  if (error instanceof StepConflictError) throw error;
  if (error instanceof StepSubmissionDatasourceError) {
    if (error.kind === 'STALE_REVISION' && error.conflict) {
      const conflict = createStaleRevisionConflict({
        classification: error.conflict.classification,
        stepCode: error.conflict.step_code,
        currentRevision: error.conflict.current_revision,
        templateVersion: error.conflict.template_version,
        capabilityRevision: error.conflict.capability_revision,
        messageToken: error.messageToken,
      });
      if (conflict.stepCode !== stepCode) {
        throw new StepConflictError(
          'MALFORMED_CONFLICT',
          'onboarding.step_conflict_scope_mismatch',
          'errors.onboarding.stepConflictScopeMismatch',
          false
        );
      }
      throw new StepConflictError(
        'STALE_REVISION',
        error.errorCode,
        error.messageToken,
        false,
        conflict
      );
    }
    const conflictKind: StepConflictError['kind'] = (
      [
        'MALFORMED_CONFLICT',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'TENANT_MISMATCH',
        'ORGANIZATION_MISMATCH',
        'BACKEND_FAILURE',
      ] as const
    ).includes(error.kind as never)
      ? error.kind as StepConflictError['kind']
      : 'BACKEND_FAILURE';
    throw new StepConflictError(
      conflictKind,
      error.errorCode,
      error.messageToken,
      error.retryable
    );
  }
  throw new StepConflictError(
    'BACKEND_FAILURE',
    'onboarding.step_submission_failed',
    'errors.onboarding.stepSubmissionFailed',
    true
  );
};

export const validateStepSubmissionResponse = (
  response: StepSubmitResponse,
  stepCode: string,
  revisionAware: boolean
): StepSubmitResponse => {
  if (response.step_code && response.step_code !== stepCode) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_submission_scope_mismatch',
      'errors.onboarding.stepSubmissionScopeMismatch',
      false
    );
  }
  const fields = [
    response.revision,
    response.template_version,
    response.capability_revision,
  ];
  const complete = fields.every((field) => field !== null && field !== undefined);
  if (revisionAware && !complete) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_submission_evidence_missing',
      'errors.onboarding.stepSubmissionEvidenceMissing',
      false
    );
  }
  if (complete) {
    createAuthoritativeStepRevision(response.revision);
    createStepProjectionIdentity(
      response.template_version,
      response.capability_revision
    );
  }
  return response;
};

type PendingMutationSubmit = typeof submitStepDataApi;

export interface PendingMutationExecutionDependencies {
  readonly submitStep: PendingMutationSubmit;
  readonly invalidateCurrentStatus: (
    organizationId: string,
    tenantId: string
  ) => Promise<unknown>;
}

const defaultPendingMutationExecutionDependencies:
  PendingMutationExecutionDependencies = {
  submitStep: submitStepDataApi,
  invalidateCurrentStatus: (organizationId, tenantId) =>
    sharedQueryClient.invalidateQueries({
      queryKey: onboardingKeys.status(organizationId, tenantId),
    }),
};

const terminal = (
  category: Extract<
    PendingMutationExecutionResult,
    { status: 'TERMINAL_FAILURE' }
  >['category']
): PendingMutationExecutionResult => ({ status: 'TERMINAL_FAILURE', category });

const mapPendingMutationExecutionError = (
  error: unknown
): PendingMutationExecutionResult => {
  if (error instanceof PendingMutationContractError) {
    return terminal(
      error.kind === 'SCOPE_MISMATCH' ? 'SCOPE_MISMATCH' : 'UNSUPPORTED'
    );
  }
  if (error instanceof StepConflictError) {
    if (error.kind === 'STALE_REVISION') return { status: 'E6_CONFLICT' };
    if (error.kind === 'UNAUTHORIZED') return terminal('AUTHENTICATION');
    if (error.kind === 'FORBIDDEN') return terminal('AUTHORIZATION');
    if (
      error.kind === 'TENANT_MISMATCH' ||
      error.kind === 'ORGANIZATION_MISMATCH'
    ) return terminal('SCOPE_MISMATCH');
    if (
      error.kind === 'MALFORMED_CONFLICT' ||
      error.kind === 'UNSUPPORTED_CONTRACT'
    ) return terminal('MALFORMED_RESPONSE');
    return error.retryable
      ? { status: 'RETRYABLE_FAILURE', category: 'RETRYABLE_SERVER' }
      : terminal('MALFORMED_RESPONSE');
  }
  if (error instanceof StepSubmissionDatasourceError) {
    switch (error.kind) {
      case 'STALE_REVISION':
        return { status: 'E6_CONFLICT' };
      case 'UNAUTHORIZED':
        return terminal('AUTHENTICATION');
      case 'FORBIDDEN':
        return terminal('AUTHORIZATION');
      case 'TENANT_MISMATCH':
      case 'ORGANIZATION_MISMATCH':
        return terminal('SCOPE_MISMATCH');
      case 'VALIDATION':
        return terminal('VALIDATION');
      case 'UNSUPPORTED':
        return terminal('UNSUPPORTED');
      case 'IDEMPOTENCY_CONFLICT':
        return terminal('IDEMPOTENCY_CONFLICT');
      case 'MALFORMED_CONFLICT':
        return terminal('MALFORMED_RESPONSE');
      case 'NETWORK':
        return { status: 'RETRYABLE_FAILURE', category: 'NETWORK' };
      case 'TIMEOUT':
        return { status: 'RETRYABLE_FAILURE', category: 'TIMEOUT' };
      case 'CANCELLED':
        return { status: 'CANCELLED' };
      case 'BACKEND_FAILURE':
        return error.retryable
          ? { status: 'RETRYABLE_FAILURE', category: 'RETRYABLE_SERVER' }
          : terminal('MALFORMED_RESPONSE');
    }
  }
  return terminal('MALFORMED_RESPONSE');
};

export const createPendingMutationExecutor = (
  dependencies: PendingMutationExecutionDependencies =
  defaultPendingMutationExecutionDependencies
) => async (
  queuedRecord: PendingMutationRecord,
  signal: AbortSignal
): Promise<PendingMutationExecutionResult> => {
  try {
    const record = parsePendingMutationRecord(queuedRecord);
    const response = await dependencies.submitStep(
      record.tenantId,
      record.stepCode,
      {
        data: record.body,
        mark_complete: true,
        expected_revision: record.revisionEvidence.revision.value,
      },
      record.idempotencyKey,
      { signal, skipAuthRefreshRetry: true }
    );
    validateStepSubmissionResponse(response, record.stepCode, true);
    await dependencies.invalidateCurrentStatus(
      record.organizationId,
      record.tenantId
    );
    return { status: 'SUCCEEDED' };
  } catch (error) {
    if (
      error instanceof StepSubmissionDatasourceError &&
      error.kind === 'STALE_REVISION'
    ) {
      try {
        mapStepSubmissionError(error, queuedRecord.stepCode);
      } catch (mappedError) {
        return mapPendingMutationExecutionError(mappedError);
      }
    }
    return mapPendingMutationExecutionError(error);
  }
};

export const executePendingMutation =
  createPendingMutationExecutor();

/**
 * Hook to submit step data
 */
export const useSubmitStepMutation = (tenantId: string, stepCode: string) => {
  const queryClient = useQueryClient();
  const organizationContext = useOrganizationContextQuery();
  const organizationId = organizationContext.data?.effectiveOrganizationId ?? '';

  return useMutation<StepSubmitResponse, StepConflictError, StepSubmitVariables>({
    mutationFn: async ({ idempotencyKey, ...data }) => {
      try {
        const response = await submitStepDataApi(
          tenantId,
          stepCode,
          data,
          idempotencyKey
        );
        return validateStepSubmissionResponse(
          response,
          stepCode,
          Boolean(data.expected_revision)
        );
      } catch (error) {
        return mapStepSubmissionError(error, stepCode);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.status(organizationId, tenantId),
      });
    },
    onError: (error) => {
      console.error('[useSubmitStepMutation] Error:', error);
    },
    retry: false,
  });
};

/**
 * Hook to complete setup (NEW)
 */
export const useCompleteSetupMutation = (tenantId: string) => {
  const queryClient = useQueryClient();

  return useMutation<CompleteSetupResponse, Error, void>({
    mutationFn: () => completeSetupApi(tenantId),
    onSuccess: () => {
      // Invalidate all onboarding queries
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
    onError: (error) => {
      console.error('[useCompleteSetupMutation] Error:', error);
    },
  });
};
