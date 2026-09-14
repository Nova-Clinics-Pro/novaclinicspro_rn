/**
 * Onboarding API Datasource
 * Handles API calls for onboarding flow
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { getErrorMessage, logError } from '../../../../core/utils/errorHandler';
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
  OnboardingStatusDatasourceError,
  StepConflictResponseDTO,
  StepSubmitRequest,
  StepSubmitResponse,
  StepSubmissionDatasourceError,
  CompleteSetupResponse,
  WorkspacePreparationDatasourceError,
  WorkspacePreparationResponseDTO,
  WorkspacePreparationRetryRequestDTO,
  WorkspacePreparationStartRequestDTO,
  JourneyVisibilityDatasourceError,
  JourneyVisibilityResponseDTO,
  ReadyToStartDatasourceError,
  ReadyToStartResponseDTO,
} from '../models/onboarding.dtos';
import {
  AuthOrganizationContext,
  BringClinicInput,
  ClinicEntryResult,
  ClinicEntryTransportError,
  ContactVerificationResult,
  EffectiveTenantResult,
  NewClinicInput,
  InitialOrganizationResult,
  OwnershipStatusResult,
} from '../../domain/clinic-entry';

const throwClinicEntryError = (error: any): never => {
  const body = error?.response?.data?.detail?.error ?? error?.response?.data?.detail ?? {};
  throw new ClinicEntryTransportError(
    body.errorCode ?? body.error_code ?? 'clinic_entry.transient_failure',
    body.messageToken ?? body.message_token ?? 'errors.clinicEntry.transientFailure',
    Boolean(body.retryable),
    body.fieldKey ?? body.field_key
  );
};

const clinicEntryHeaders = (idempotencyKey: string) => ({
  headers: { 'Idempotency-Key': idempotencyKey },
});

const throwWorkspacePreparationError = (error: any): never => {
  const detail = error?.response?.data?.detail ?? {};
  const body = detail.error ?? detail;
  throw new WorkspacePreparationDatasourceError(
    body.error_code ?? 'workspace_preparation.execution_failure',
    body.message_token ?? 'errors.workspacePreparation.execution_failure',
    Boolean(body.retryable)
  );
};

const throwJourneyVisibilityError = (error: any): never => {
  const detail = error?.response?.data?.detail ?? {};
  const body = detail.error ?? detail;
  throw new JourneyVisibilityDatasourceError(
    body.error_code ?? 'journey_visibility.unavailable',
    body.message_token ?? 'errors.journeyVisibility.unavailable',
    Boolean(body.retryable),
    error?.response?.status
  );
};

const throwReadyToStartError = (error: any): never => {
  if (error?.code === 'ERR_CANCELED') throw error;
  const detail = error?.response?.data?.detail ?? {};
  const body = detail.error ?? detail;
  throw new ReadyToStartDatasourceError(
    body.error_code ?? 'readiness.evaluation_failure',
    body.message_token ?? 'errors.readyToStart.evaluation_failure',
    Boolean(body.retryable),
    error?.response?.status
  );
};

export const getReadyToStartApi = async (
  tenantId: string,
  signal?: AbortSignal
): Promise<ReadyToStartResponseDTO> => {
  try {
    const response = await axiosClient.get<ReadyToStartResponseDTO>(
      `/api/v1/onboarding/${tenantId}/ready-to-start`,
      { signal }
    );
    return response.data;
  } catch (error) {
    return throwReadyToStartError(error);
  }
};

export const getJourneyVisibilityApi = async (
  tenantId: string
): Promise<JourneyVisibilityResponseDTO> => {
  try {
    const response = await axiosClient.get<JourneyVisibilityResponseDTO>(
      `/api/v1/onboarding/${tenantId}/journey-visibility`
    );
    return response.data;
  } catch (error) {
    return throwJourneyVisibilityError(error);
  }
};

export const ensureWorkspacePreparationApi = async (
  tenantId: string
): Promise<WorkspacePreparationResponseDTO> => {
  const request: WorkspacePreparationStartRequestDTO = {
    contract_version: 'workspace_preparation_v1',
  };
  try {
    const response = await axiosClient.post<WorkspacePreparationResponseDTO>(
      `/api/v1/onboarding/${tenantId}/workspace-preparation`,
      request
    );
    return response.data;
  } catch (error) {
    return throwWorkspacePreparationError(error);
  }
};

export const getWorkspacePreparationApi = async (
  tenantId: string
): Promise<WorkspacePreparationResponseDTO> => {
  try {
    const response = await axiosClient.get<WorkspacePreparationResponseDTO>(
      `/api/v1/onboarding/${tenantId}/workspace-preparation`
    );
    return response.data;
  } catch (error) {
    return throwWorkspacePreparationError(error);
  }
};

export const retryWorkspacePreparationApi = async (
  tenantId: string,
  aggregateVersion: number,
  idempotencyKey: string
): Promise<WorkspacePreparationResponseDTO> => {
  const request: WorkspacePreparationRetryRequestDTO = {
    contract_version: 'workspace_preparation_v1',
    aggregate_version: aggregateVersion,
  };
  try {
    const response = await axiosClient.post<WorkspacePreparationResponseDTO>(
      `/api/v1/onboarding/${tenantId}/workspace-preparation/retry`,
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
  } catch (error) {
    return throwWorkspacePreparationError(error);
  }
};

export const createInitialOrganizationApi = async (
  displayName: string
): Promise<InitialOrganizationResult> => {
  try {
    const { data } = await axiosClient.post('/api/v1/auth/organizations', { displayName });
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const getOrganizationContextApi = async (): Promise<AuthOrganizationContext> => {
  try {
    const { data } = await axiosClient.get('/api/v1/auth/me');
    return {
      memberships: (data.organization_memberships ?? []).map((membership: any) => ({
        organizationId: membership.organization_id,
        organizationName: membership.organization_name,
        authorizedClinics: (membership.authorized_clinics ?? []).map((clinic: any) => ({
          tenantId: clinic.tenant_id,
          clinicName: clinic.clinic_name,
          city: clinic.city,
        })),
        effectiveTenantId: membership.effective_tenant_id,
        selectionRequired: membership.selection_required,
      })),
      effectiveOrganizationId: data.effective_organization_id,
      effectiveTenantId: data.effective_tenant_id,
      selectionRequired: data.selection_required,
      sessionRefreshRequired: data.session_refresh_required,
    };
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const requestContactVerificationApi = async (
  organizationId: string,
  contactKind: 'email' | 'mobile',
  contactValue: string,
  intendedOperation: 'clinic_entry.create.v1' | 'clinic_entry.associate.v1',
  idempotencyKey: string
): Promise<ContactVerificationResult> => {
  try {
    const { data } = await axiosClient.post(
      `/api/v1/organizations/${organizationId}/contact-verifications`,
      { contactKind, contactValue, intendedOperation },
      clinicEntryHeaders(idempotencyKey)
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const getContactVerificationStatusApi = async (
  organizationId: string,
  evidenceId: string
): Promise<ContactVerificationResult> => {
  try {
    const { data } = await axiosClient.get(
      `/api/v1/organizations/${organizationId}/contact-verifications/${evidenceId}`
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const getOwnershipStatusApi = async (
  organizationId: string,
  ownershipReference: string
): Promise<OwnershipStatusResult> => {
  try {
    const { data } = await axiosClient.post(
      `/api/v1/organizations/${organizationId}/ownership-verifications/status`,
      { targetReference: ownershipReference }
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const createClinicEntryApi = async (
  organizationId: string,
  input: NewClinicInput,
  evidenceReference: string,
  idempotencyKey: string
): Promise<ClinicEntryResult> => {
  try {
    const { data } = await axiosClient.post(
      `/api/v1/clinic-entry/organizations/${organizationId}/clinics`,
      {
        contractVersion: '1.0',
        clinicIdentity: {
          clinicName: input.clinicName,
          clinicTypeSpecialty: input.clinicTypeSpecialty,
          clinicAddress: {
            line1: input.addressLine1,
            line2: input.addressLine2 || null,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            countryCode: input.countryCode,
          },
          primaryContactNumber: input.contactKind === 'mobile' ? input.contactValue : null,
          verifiedContact: {
            kind: input.contactKind,
            value: input.contactValue,
            evidenceReference,
          },
        },
      },
      clinicEntryHeaders(idempotencyKey)
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const associateClinicEntryApi = async (
  organizationId: string,
  input: BringClinicInput,
  evidenceReference: string,
  idempotencyKey: string
): Promise<ClinicEntryResult> => {
  try {
    const { data } = await axiosClient.post(
      `/api/v1/clinic-entry/organizations/${organizationId}/associations`,
      {
        contractVersion: '1.0',
        ownershipVerificationId: input.ownershipReference,
        verifiedContact: {
          kind: input.contactKind,
          value: input.contactValue,
          evidenceReference,
        },
      },
      clinicEntryHeaders(idempotencyKey)
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const selectEffectiveTenantApi = async (
  organizationId: string,
  tenantId: string,
  idempotencyKey: string
): Promise<EffectiveTenantResult> => {
  try {
    const { data } = await axiosClient.put(
      `/api/v1/auth/organizations/${organizationId}/effective-tenant`,
      { tenantId, contractVersion: '1.0' },
      clinicEntryHeaders(idempotencyKey)
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

export const refreshEffectiveTenantApi = async (
  organizationId: string
): Promise<EffectiveTenantResult> => {
  try {
    const { data } = await axiosClient.post(
      `/api/v1/auth/organizations/${organizationId}/session-refresh`
    );
    return data;
  } catch (error) {
    return throwClinicEntryError(error);
  }
};

/**
 * Get application details
 */
export const getApplicationDetailApi = async (
  applicationId: string
): Promise<ApplicationDetailResponse> => {
  try {
    const response = await axiosClient.get<ApplicationDetailResponse>(
      `/api/v1/onboarding/applications/${applicationId}`
    );
    return response.data;
  } catch (error: any) {
    logError('getApplicationDetailApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load application details. Please try again.'));
  }
};

/**
 * Get validation report for application
 */
export const getValidationReportApi = async (
  applicationId: string
): Promise<ValidationReportResponse> => {
  try {
    const response = await axiosClient.get<ValidationReportResponse>(
      `/api/v1/onboarding/applications/${applicationId}/validation-report`
    );
    return response.data;
  } catch (error: any) {
    logError('getValidationReportApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load validation report. Please try again.'));
  }
};

/**
 * Improve application with corrected data
 */
export const improveApplicationApi = async (
  applicationId: string,
  data: ApplicationImprovementRequest
): Promise<ApplicationImprovementResponse> => {
  try {
    const response = await axiosClient.post<ApplicationImprovementResponse>(
      `/api/v1/onboarding/applications/${applicationId}/improve`,
      data
    );
    return response.data;
  } catch (error: any) {
    logError('improveApplicationApi', error);
    throw new Error(getErrorMessage(error, 'Unable to save improvements. Please try again.'));
  }
};

/**
 * Resubmit application after improvements
 */
export const resubmitApplicationApi = async (
  applicationId: string
): Promise<ApplicationDetailResponse> => {
  try {
    const response = await axiosClient.post<ApplicationDetailResponse>(
      `/api/v1/onboarding/applications/${applicationId}/resubmit`
    );
    return response.data;
  } catch (error: any) {
    logError('resubmitApplicationApi', error);
    throw new Error(getErrorMessage(error, 'Unable to resubmit application. Please try again.'));
  }
};

/**
 * Create demo tenant
 */
export const createDemoTenantApi = async (
  data: DemoCreateRequest
): Promise<DemoCreateResponse> => {
  try {
    const response = await axiosClient.post<DemoCreateResponse>(
      '/api/v1/onboarding/demo/create',
      data
    );
    return response.data;
  } catch (error: any) {
    logError('createDemoTenantApi', error);
    throw new Error(getErrorMessage(error, 'Unable to create demo. Please try again.'));
  }
};

/**
 * Get demo tenant status
 */
export const getDemoStatusApi = async (
  demoTenantId: string
): Promise<DemoStatusResponse> => {
  try {
    const response = await axiosClient.get<DemoStatusResponse>(
      `/api/v1/onboarding/demo/${demoTenantId}/status`
    );
    return response.data;
  } catch (error: any) {
    logError('getDemoStatusApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load demo status. Please try again.'));
  }
};

/**
 * Transition demo to live tenant
 */
export const transitionDemoToLiveApi = async (
  demoTenantId: string
): Promise<{ tenant_id: string; tenant_url: string }> => {
  try {
    const response = await axiosClient.post(
      '/api/v1/onboarding/demo/transition',
      { demo_tenant_id: demoTenantId }
    );
    return response.data;
  } catch (error: any) {
    logError('transitionDemoToLiveApi', error);
    throw new Error(getErrorMessage(error, 'Unable to transition to live. Please try again.'));
  }
};

/**
 * Get setup wizard context
 */
export const getSetupWizardContextApi = async (
  applicationId: string
): Promise<SetupWizardContextResponse> => {
  try {
    const response = await axiosClient.get<SetupWizardContextResponse>(
      `/api/v1/onboarding/setup-wizard/${applicationId}/context`
    );
    return response.data;
  } catch (error: any) {
    logError('getSetupWizardContextApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load setup wizard. Please try again.'));
  }
};

/**
 * Get setup wizard progress
 */
export const getSetupWizardProgressApi = async (
  applicationId: string
): Promise<SetupWizardProgressResponse> => {
  try {
    const response = await axiosClient.get<SetupWizardProgressResponse>(
      `/api/v1/onboarding/setup-wizard/${applicationId}/progress`
    );
    return response.data;
  } catch (error: any) {
    logError('getSetupWizardProgressApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load setup progress. Please try again.'));
  }
};

/**
 * Complete setup wizard
 */
export const completeSetupWizardApi = async (
  applicationId: string
): Promise<{ tenant_id: string; success: boolean }> => {
  try {
    const response = await axiosClient.post(
      `/api/v1/onboarding/setup-wizard/${applicationId}/complete`,
      { confirmation: true }
    );
    return response.data;
  } catch (error: any) {
    logError('completeSetupWizardApi', error);
    throw new Error(getErrorMessage(error, 'Unable to complete setup. Please try again.'));
  }
};

/**
 * Get onboarding status (NEW - Dynamic Steps)
 * WORKAROUND: Backend requires tenant_id in JWT, but doesn't update it after demo creation
 * We pass it as a custom header as a workaround
 */
export const getOnboardingStatusApi = async (
  tenantId: string,
  signal?: AbortSignal
): Promise<OnboardingStatusResponse> => {
  try {
    console.log('[getOnboardingStatusApi] Fetching status for tenant:', tenantId);
    const response = await axiosClient.get<OnboardingStatusResponse>(
      `/api/v1/onboarding/${tenantId}/status`,
      {
        signal,
        headers: {
          'X-Tenant-ID': tenantId, // Workaround: Backend should accept this instead of requiring JWT
        },
      }
    );
    if (response.data.tenant_id !== tenantId) {
      throw new OnboardingStatusDatasourceError(
        'TENANT_MISMATCH',
        'onboarding.status_tenant_mismatch',
        'errors.onboarding.statusTenantMismatch',
        false
      );
    }
    console.log('[getOnboardingStatusApi] Status fetched successfully');
    return response.data;
  } catch (error: any) {
    if (error?.code === 'ERR_CANCELED' || error instanceof OnboardingStatusDatasourceError) {
      throw error;
    }
    if (error?.response?.status === 401) {
      console.log('[getOnboardingStatusApi] Skipping status fetch: no authenticated session');
    } else {
      logError('getOnboardingStatusApi', error);
    }
    
    // If 403, provide helpful error message
    if (error?.response?.status === 403) {
      throw new OnboardingStatusDatasourceError(
        'FORBIDDEN',
        'onboarding.status_forbidden',
        'errors.onboarding.statusForbidden',
        false
      );
    }
    if (error?.response?.status === 401) {
      throw new OnboardingStatusDatasourceError(
        'UNAUTHORIZED',
        'onboarding.status_unauthorized',
        'errors.onboarding.statusUnauthorized',
        false
      );
    }
    throw new OnboardingStatusDatasourceError(
      'BACKEND_FAILURE',
      'onboarding.status_unavailable',
      'errors.onboarding.statusUnavailable',
      true
    );
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseStepConflict = (value: unknown): StepConflictResponseDTO['error'] | null => {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const error = value.error;
  if (
    error.error_code !== 'onboarding.step_revision_conflict' ||
    typeof error.message_token !== 'string' ||
    !isRecord(error.conflict) ||
    error.conflict.classification !== 'STALE_REVISION' ||
    typeof error.conflict.step_code !== 'string' ||
    typeof error.conflict.current_revision !== 'string' ||
    typeof error.conflict.template_version !== 'string' ||
    typeof error.conflict.capability_revision !== 'string'
  ) {
    return null;
  }
  return error as unknown as StepConflictResponseDTO['error'];
};

const throwStepSubmissionError = (error: any): never => {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const detail = isRecord(body?.detail)
    ? isRecord(body.detail.error)
      ? body.detail.error
      : body.detail
    : {};
  const errorCode =
    typeof detail.error_code === 'string' ? detail.error_code : '';
  const detailText =
    typeof body?.detail === 'string' ? body.detail.toLowerCase() : '';
  if (error?.code === 'ERR_CANCELED') {
    throw new StepSubmissionDatasourceError(
      'CANCELLED',
      'onboarding.step_submission_cancelled',
      'errors.onboarding.stepSubmissionCancelled',
      false
    );
  }
  if (error?.code === 'ECONNABORTED') {
    throw new StepSubmissionDatasourceError(
      'TIMEOUT',
      'onboarding.step_submission_timeout',
      'errors.onboarding.stepSubmissionTimeout',
      true
    );
  }
  if (!status) {
    throw new StepSubmissionDatasourceError(
      'NETWORK',
      'onboarding.step_submission_network_failure',
      'errors.onboarding.stepSubmissionNetworkFailure',
      true
    );
  }
  if (status === 409) {
    const conflict = parseStepConflict(body);
    if (conflict) {
      throw new StepSubmissionDatasourceError(
        'STALE_REVISION',
        conflict.error_code,
        conflict.message_token,
        false,
        conflict.conflict
      );
    }
    if (
      errorCode.includes('idempotency') ||
      detailText.includes('idempotent') ||
      detailText.includes('idempotency')
    ) {
      throw new StepSubmissionDatasourceError(
        'IDEMPOTENCY_CONFLICT',
        errorCode || 'onboarding.step_submission_idempotency_conflict',
        typeof detail.message_token === 'string'
          ? detail.message_token
          : 'errors.onboarding.stepSubmissionIdempotencyConflict',
        false
      );
    }
    throw new StepSubmissionDatasourceError(
      'MALFORMED_CONFLICT',
      'onboarding.step_revision_conflict_malformed',
      'errors.onboarding.stepRevisionConflictMalformed',
      false
    );
  }
  if (status === 400 || status === 422) {
    const unsupported = errorCode.includes('unsupported');
    throw new StepSubmissionDatasourceError(
      unsupported ? 'UNSUPPORTED' : 'VALIDATION',
      errorCode ||
        (unsupported
          ? 'onboarding.step_submission_unsupported'
          : 'onboarding.step_submission_validation_failed'),
      typeof detail.message_token === 'string'
        ? detail.message_token
        : unsupported
          ? 'errors.onboarding.stepSubmissionUnsupported'
          : 'errors.onboarding.stepSubmissionValidationFailed',
      false
    );
  }
  if (status === 401) {
    throw new StepSubmissionDatasourceError(
      'UNAUTHORIZED',
      'onboarding.step_submission_unauthorized',
      'errors.onboarding.stepSubmissionUnauthorized',
      false
    );
  }
  if (status === 403) {
    const kind = errorCode.includes('organization')
      ? 'ORGANIZATION_MISMATCH'
      : errorCode.includes('tenant') || errorCode.includes('scope')
        ? 'TENANT_MISMATCH'
        : 'FORBIDDEN';
    throw new StepSubmissionDatasourceError(
      kind,
      errorCode || 'onboarding.step_submission_forbidden',
      typeof detail.message_token === 'string'
        ? detail.message_token
        : 'errors.onboarding.stepSubmissionForbidden',
      false
    );
  }
  throw new StepSubmissionDatasourceError(
    'BACKEND_FAILURE',
    'onboarding.step_submission_failed',
    'errors.onboarding.stepSubmissionFailed',
    true
  );
};

/**
 * Submit step data
 */
export const submitStepDataApi = async (
  tenantId: string,
  stepCode: string,
  data: StepSubmitRequest,
  idempotencyKey?: string,
  options?: {
    readonly signal?: AbortSignal;
    readonly skipAuthRefreshRetry?: boolean;
  }
): Promise<StepSubmitResponse> => {
  try {
    const url = `/api/v1/onboarding/${tenantId}/steps/${stepCode}`;
    console.log('[submitStepDataApi] POST', url);
    console.log('[submitStepDataApi] Request data:', JSON.stringify(data, null, 2));

    const headers: Record<string, string> = {
      'X-Tenant-ID': tenantId, // TODO: Req 11 - remove after staging confirms tenant_id is present in JWT for provisional and live tenants.
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const response = await axiosClient.post<StepSubmitResponse>(
      url,
      data,
      {
        headers,
        ...(options?.signal ? { signal: options.signal } : {}),
        ...(options?.skipAuthRefreshRetry
          ? { skipAuthRefreshRetry: true }
          : {}),
      }
    );
    
    console.log('[submitStepDataApi] Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    return throwStepSubmissionError(error);
  }
};

/**
 * Complete setup (NEW)
 */
export const completeSetupApi = async (
  tenantId: string
): Promise<CompleteSetupResponse> => {
  try {
    const response = await axiosClient.post<CompleteSetupResponse>(
      `/api/v1/onboarding/${tenantId}/complete`,
      {}
    );
    return response.data;
  } catch (error: any) {
    logError('completeSetupApi', error);
    throw new Error(getErrorMessage(error, 'Unable to complete setup. Please try again.'));
  }
};

export interface SubscriptionPlanInfo {
  plan_code: string;
  name: string;
  base_price: number;
  billing_cycle: string;
  limits: Record<string, unknown>;
  features: string[];
}

export interface SubscriptionCreateResponse {
  success: boolean;
  message: string;
  subscription_id?: string | null;
  plan_code?: string | null;
  plan_name?: string | null;
  base_price?: number | null;
  billing_cycle?: string | null;
  next_billing_date?: string | null;
  provider?: string | null;
  provider_subscription_id?: string | null;
  checkout_url?: string | null;
  requires_internal_payment_setup?: boolean;
}

export const getSubscriptionPlansApi = async (): Promise<{ plans: SubscriptionPlanInfo[]; total_plans: number }> => {
  try {
    const response = await axiosClient.get('/api/v1/billing/subscription-plans');
    return response.data;
  } catch (error: any) {
    logError('getSubscriptionPlansApi', error);
    throw new Error(getErrorMessage(error, 'Unable to load subscription plans. Please try again.'));
  }
};

export const createTenantSubscriptionApi = async (
  tenantId: string,
  data: { plan_code: string; billing_cycle: string; promotional_code?: string | null }
): Promise<SubscriptionCreateResponse> => {
  try {
    const response = await axiosClient.post<SubscriptionCreateResponse>(
      `/api/v1/billing/tenants/${tenantId}/subscription`,
      data,
      { headers: { 'X-Tenant-ID': tenantId } }
    );
    return response.data;
  } catch (error: any) {
    logError('createTenantSubscriptionApi', error);
    throw new Error(getErrorMessage(error, 'Unable to set up subscription payment. Please try again.'));
  }
};
