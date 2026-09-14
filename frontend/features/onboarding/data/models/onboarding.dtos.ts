/**
 * Onboarding DTOs
 * Data Transfer Objects for onboarding flow
 */

// === Application Detail Response ===
export interface ApplicationDetailResponse {
  id: string;
  tenant_id?: string;
  tenant_name: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ACTIVE';
  business_profile?: Record<string, any>;
  contact_details?: Record<string, any>;
  app_context?: Record<string, any>;
  component_recommendations?: ComponentRecommendation[];
  auto_approval_result?: AutoApprovalResult;
  approved_components?: string[];
  validation_errors?: string[];
  created_at: string;
  updated_at: string;
}

export interface ComponentRecommendation {
  component: string;
  confidence: number;
  reason: string;
}

export interface AutoApprovalResult {
  eligible: boolean;
  risk_score: number;
  risk_factors: string[];
  reason?: string;
}

// === Validation Report ===
export interface ValidationReportResponse {
  application_id: string;
  overall_score: number;
  validation_errors: ValidationError[];
  missing_fields: ValidationError[];
  format_issues: ValidationError[];
  priority_fixes: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

// === Application Improvement ===
export interface ApplicationImprovementRequest {
  business_profile?: Record<string, any>;
  contact_details?: Record<string, any>;
  app_context?: Record<string, any>;
}

export interface ApplicationImprovementResponse {
  application_id: string;
  improvement_applied: boolean;
  previous_risk_score: number;
  new_risk_score: number;
  previous_eligible: boolean;
  new_eligible: boolean;
  remaining_risk_factors: string[];
}

// === Demo Mode ===
export interface DemoCreateRequest {
  application_id: string;
}

export interface DemoCreateResponse {
  demo_tenant_id: string;
  tenant_id: string;
  demo_url: string;
  expires_at: string;
  duration_days: number;
  status?: string;
}

export interface DemoStatusResponse {
  demo_tenant_id: string;
  display_name: string;
  status: 'TRIAL' | 'PENDING' | 'ACTIVE' | 'expired' | 'transitioned';
  demo_expires_at: string;
  trial_expires_at: string;
  demo_time_remaining_seconds: number;
  trial_time_remaining_seconds: number;
  is_demo_expired: boolean;
  is_trial_expired: boolean;
  demo_url: string;
  created_at: string;
}

// === Setup Wizard (OLD - Keep for backward compatibility) ===
export interface SetupWizardContextResponse {
  application_id: string;
  tenant_name: string;
  pre_populated_data: {
    clinic_profile?: Record<string, any>;
    operating_hours?: Record<string, any>;
  };
  setup_steps: string[];
  estimated_time: string;
}

export interface SetupWizardProgressResponse {
  application_id: string;
  completed_steps: string[];
  total_steps: number;
  completion_percentage: number;
  next_step?: string;
}

// === Onboarding Status (NEW - Dynamic Steps) ===
export interface OnboardingStatusResponse {
  tenant_id: string;
  template_id: string;
  clinic_type: string;
  total_steps: number;
  completed_steps: number;
  in_progress_steps: number;
  pending_steps: number;
  blocked_steps: number;
  completion_percentage: number;
  current_step: string;
  next_recommended_step: string;
  is_ready_to_go_live: boolean;
  per_step_validation: Record<string, StepValidationDTO>;
  visible_steps: string[];
  actionable_steps: string[];
}

export interface StepValidationDTO {
  step_code: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked';
  is_complete: boolean;
  is_valid: boolean;
  issues: ValidationIssueDTO[];
  blocked_reason: string | null;
  action_url_template: string | null;
  entity_type: string | null;
  icon: string | null;
  category: string | null;
  visible: boolean;
  actionable: boolean;
  revision?: string | null;
  updated_at?: string | null;
  template_version?: string | null;
  capability_revision?: string | null;
}

export class OnboardingStatusDatasourceError extends Error {
  constructor(
    readonly kind: 'TENANT_MISMATCH' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'BACKEND_FAILURE',
    readonly errorCode: string,
    readonly messageToken: string,
    readonly retryable: boolean
  ) {
    super(messageToken);
    this.name = 'OnboardingStatusDatasourceError';
  }
}

export interface ValidationIssueDTO {
  severity: 'blocker' | 'warning' | 'info';
  error_key: string;
  resolved_message: string;
  entity: string | null;
  field: string | null;
}

// === Step Submission ===
export interface StepSubmitRequest {
  data: Record<string, any>;
  mark_complete?: boolean;
  expected_revision?: string;
}

export interface StepSubmitResponse {
  step_code: string;
  status: 'completed' | 'in_progress' | 'blocked';
  created_entities: CreatedEntity[];
  validation_errors: StepValidationError[];
  next_step: string | null;
  message: string;
  revision?: string | null;
  template_version?: string | null;
  capability_revision?: string | null;
}

export interface StepConflictResponseDTO {
  error: {
    error_code: 'onboarding.step_revision_conflict';
    message_token: string;
    conflict: {
      classification: 'STALE_REVISION';
      step_code: string;
      current_revision: string;
      template_version: string;
      capability_revision: string;
    };
  };
}

export type StepSubmissionDatasourceFailureKind =
  | 'STALE_REVISION'
  | 'MALFORMED_CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TENANT_MISMATCH'
  | 'ORGANIZATION_MISMATCH'
  | 'VALIDATION'
  | 'UNSUPPORTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'BACKEND_FAILURE';

export class StepSubmissionDatasourceError extends Error {
  constructor(
    readonly kind: StepSubmissionDatasourceFailureKind,
    readonly errorCode: string,
    readonly messageToken: string,
    readonly retryable: boolean,
    readonly conflict: StepConflictResponseDTO['error']['conflict'] | null = null
  ) {
    super(messageToken);
    this.name = 'StepSubmissionDatasourceError';
  }
}

export interface CreatedEntity {
  entity_type: string;
  entity_id: string;
  name: string;
}

export interface StepValidationError {
  field: string;
  message: string;
  code: string;
}

// === Complete Setup ===
export interface CompleteSetupResponse {
  success: boolean;
  tenant_id: string;
  status: 'ACTIVE';
  subscription_start_date: string;
  message: string;
  subscription_info: {
    plan: string;
    billing_cycle: string;
    trial_days_used: number;
    subscription_starts_at: string;
    days_until_billing: number;
    free_active_days: number;
    first_billing: {
      date: string;
      is_prorated: boolean;
      prorated_days: number;
      prorated_amount: number;
      full_monthly_price: number;
      description: string;
      next_full_billing_date: string;
    };
  };
}

// === Workspace Preparation (TG20 Version 1) ===
export type WorkspacePreparationStateDTO =
  | 'PENDING'
  | 'PREPARING'
  | 'PERSONALIZATION_AVAILABLE'
  | 'RETRYABLE_FAILURE'
  | 'TERMINAL_FAILURE';

export interface WorkspacePreparationStartRequestDTO {
  contract_version: 'workspace_preparation_v1';
}

export interface WorkspacePreparationRetryRequestDTO
  extends WorkspacePreparationStartRequestDTO {
  aggregate_version: number;
}

export interface WorkspacePreparationProgressDTO {
  completed: number;
  total: number;
  indeterminate: boolean;
}

export interface WorkspacePreparationUnitDTO {
  code: string;
  outcome: string;
  evidence_version: string;
  attempt: number;
  observed_at: string;
  recorded_at: string;
}

export interface WorkspacePreparationResponseDTO {
  contract_version: string;
  run_id: string;
  state: WorkspacePreparationStateDTO;
  aggregate_version: number;
  progress: WorkspacePreparationProgressDTO;
  units: WorkspacePreparationUnitDTO[];
  reason_code: string | null;
  retry_allowed: boolean;
  user_retry_count: number;
  max_user_retries: number;
  next_action: string;
  refresh_after_seconds: number | null;
  support_correlation_id: string;
  updated_at: string;
}

export interface WorkspacePreparationErrorDTO {
  error_code: string;
  message_token: string;
  retryable: boolean;
}

export class WorkspacePreparationDatasourceError extends Error {
  constructor(
    readonly errorCode: string,
    readonly messageToken: string,
    readonly retryable: boolean
  ) {
    super(messageToken);
    this.name = 'WorkspacePreparationDatasourceError';
  }
}

// === Journey Visibility (TG21 Version 1) ===
export type JourneyVisibilityProgressDTO = 'INCOMPLETE' | 'COMPLETED';

export interface JourneyVisibilityStepDTO {
  step_id: string;
  order: number;
  visibility: 'VISIBLE';
  progress: JourneyVisibilityProgressDTO;
}

export interface JourneyVisibilityResponseDTO {
  contract_version: '1.0';
  template_version: string;
  capability_revision: string;
  tenant_id: string;
  projected_at: string;
  visible_steps: JourneyVisibilityStepDTO[];
}

export class JourneyVisibilityDatasourceError extends Error {
  constructor(
    readonly errorCode: string,
    readonly messageToken: string,
    readonly retryable: boolean,
    readonly httpStatus?: number
  ) {
    super(messageToken);
    this.name = 'JourneyVisibilityDatasourceError';
  }
}

// === Ready to Start (TG22 Version 1) ===
export type ReadinessStateDTO =
  | 'READY'
  | 'NOT_READY'
  | 'EVALUATING'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'STALE';

export type ReadinessChecklistStatusDTO =
  | 'COMPLETE'
  | 'BLOCKED'
  | 'ADVISORY'
  | 'EVALUATING'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'STALE';

export type ReadinessClassificationDTO = 'BLOCKER' | 'ADVISORY';
export type ReadinessProviderOutcomeDTO = 'SATISFIED' | 'BLOCKER' | 'ADVISORY';
export type ReadinessNextActionKindDTO =
  | 'NAVIGATE'
  | 'REFRESH'
  | 'RETRY'
  | 'CONTACT_SUPPORT';

export interface ReadinessProjectionIdentityDTO {
  readonly template_version: string;
  readonly capability_revision: string;
}

export interface ReadinessIdentityDTO {
  readonly readiness_contract_version: 'ready_to_start_v1';
  readonly tenant_id: string;
  readonly journey_projection_identity: ReadinessProjectionIdentityDTO;
  readonly provider_set_revision: string;
  readonly evidence_revision: string;
}

export interface ReadinessNextActionDTO {
  readonly action_id: string;
  readonly label_token: string;
  readonly owner_id: string;
  readonly kind: ReadinessNextActionKindDTO;
  readonly authorization_requirement: string;
  readonly target_id: string | null;
}

export interface ReadinessChecklistItemDTO {
  readonly provider_id: string;
  readonly item_id: string;
  readonly item_version: string;
  readonly title_token: string;
  readonly explanation_token: string;
  readonly status: ReadinessChecklistStatusDTO;
  readonly classification: ReadinessClassificationDTO | null;
  readonly evidence_timestamp: string;
  readonly order: number;
  readonly applicable: boolean;
  readonly next_action: ReadinessNextActionDTO | null;
}

export interface ReadinessProviderDTO {
  readonly provider_id: string;
  readonly provider_version: string;
  readonly provider_order: number;
  readonly applicable: boolean;
  readonly state: ReadinessStateDTO;
  readonly outcome: ReadinessProviderOutcomeDTO;
  readonly evidence_revision: string;
  readonly observed_at: string;
  readonly severity: string;
  readonly explanation_token: string;
  readonly next_action: ReadinessNextActionDTO | null;
}

export interface ReadyToStartResponseDTO {
  readonly identity: ReadinessIdentityDTO;
  readonly state: ReadinessStateDTO;
  readonly providers: readonly ReadinessProviderDTO[];
  readonly checklist: readonly ReadinessChecklistItemDTO[];
  readonly blockers: readonly ReadinessChecklistItemDTO[];
  readonly advisories: readonly ReadinessChecklistItemDTO[];
  readonly evaluated_at: string;
  readonly authorizes_handoff: boolean;
}

export class ReadyToStartDatasourceError extends Error {
  constructor(
    readonly errorCode: string,
    readonly messageToken: string,
    readonly retryable: boolean,
    readonly httpStatus?: number
  ) {
    super(messageToken);
    this.name = 'ReadyToStartDatasourceError';
  }
}
