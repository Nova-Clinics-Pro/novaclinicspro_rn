/**
 * Onboarding Status Domain Entity
 * Clean domain representation of onboarding status
 */

import { OnboardingStatusResponse, StepValidationDTO, ValidationIssueDTO } from '../../data/models/onboarding.dtos';
import {
  AuthoritativeStepUpdateEvidence,
  StepConflictError,
  createAuthoritativeStepUpdateEvidence,
} from './step-revision.entity';

export interface OnboardingStatus {
  tenantId: string;
  clinicType: string;
  totalSteps: number;
  completedSteps: number;
  completionPercentage: number;
  currentStep: string | null;
  nextRecommendedStep: string | null;
  isReadyToGoLive: boolean;
  steps: Map<string, StepStatus>;
  visibleSteps: string[];
  actionableSteps: string[];
}

export interface StepStatus {
  code: string;
  status: StepStatusType;
  isComplete: boolean;
  isValid: boolean;
  issues: Issue[];
  blockedReason: string | null;
  actionUrl: string;
  entityType: string;
  icon: string;
  category: string;
  isVisible: boolean;
  isActionable: boolean;
  evidenceAvailability: 'AVAILABLE' | 'UNAVAILABLE';
  authoritativeEvidence: AuthoritativeStepUpdateEvidence | null;
}

export type StepStatusType = 'completed' | 'in_progress' | 'not_started' | 'blocked';

export interface Issue {
  severity: 'blocker' | 'warning' | 'info';
  errorKey: string;
  message: string;
  entity: string | null;
  field: string | null;
}

/**
 * Map DTO to domain entity
 */
export const mapOnboardingStatusToDomain = (
  dto: OnboardingStatusResponse
): OnboardingStatus => {
  const stepsMap = new Map<string, StepStatus>();

  // Convert per_step_validation to Map
  Object.entries(dto.per_step_validation || {}).forEach(([stepCode, stepDto]) => {
    stepsMap.set(stepCode, mapStepValidationToDomain(stepCode, stepDto, dto.tenant_id));
  });

  return {
    tenantId: dto.tenant_id,
    clinicType: dto.clinic_type,
    totalSteps: dto.total_steps,
    completedSteps: dto.completed_steps,
    completionPercentage: dto.completion_percentage,
    currentStep: dto.current_step || null,
    nextRecommendedStep: dto.next_recommended_step || null,
    isReadyToGoLive: dto.is_ready_to_go_live,
    steps: stepsMap,
    visibleSteps: dto.visible_steps || [],
    actionableSteps: dto.actionable_steps || [],
  };
};

/**
 * Map step validation DTO to domain
 */
const mapStepValidationToDomain = (
  authoritativeStepCode: string,
  dto: StepValidationDTO,
  tenantId: string
): StepStatus => {
  if (dto.step_code !== authoritativeStepCode) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_identity_mismatch',
      'errors.onboarding.stepIdentityMismatch',
      false
    );
  }
  const evidenceFields = [
    dto.revision,
    dto.updated_at,
    dto.template_version,
    dto.capability_revision,
  ];
  const hasAnyEvidence = evidenceFields.some((value) => value !== null && value !== undefined);
  const hasCompleteEvidence = evidenceFields.every(
    (value) => value !== null && value !== undefined
  );
  if (hasAnyEvidence && !hasCompleteEvidence) {
    throw new StepConflictError(
      'UNSUPPORTED_CONTRACT',
      'onboarding.step_evidence_incomplete',
      'errors.onboarding.stepEvidenceIncomplete',
      false
    );
  }
  const authoritativeEvidence = hasCompleteEvidence
    ? createAuthoritativeStepUpdateEvidence({
        tenantId,
        stepCode: dto.step_code,
        revision: dto.revision,
        updatedAt: dto.updated_at,
        templateVersion: dto.template_version,
        capabilityRevision: dto.capability_revision,
      })
    : null;
  return {
    code: dto.step_code,
    status: dto.status,
    isComplete: dto.is_complete,
    isValid: dto.is_valid,
    issues: (dto.issues || []).map(mapIssueToDomain),
    blockedReason: dto.blocked_reason,
    actionUrl: dto.action_url_template?.replace('{tenant_id}', tenantId) ?? '',
    entityType: dto.entity_type ?? '',
    icon: dto.icon ?? '',
    category: dto.category ?? '',
    isVisible: dto.visible,
    isActionable: dto.actionable,
    evidenceAvailability: authoritativeEvidence ? 'AVAILABLE' : 'UNAVAILABLE',
    authoritativeEvidence,
  };
};

/**
 * Map issue DTO to domain
 */
const mapIssueToDomain = (dto: ValidationIssueDTO): Issue => {
  return {
    severity: dto.severity,
    errorKey: dto.error_key,
    message: dto.resolved_message,
    entity: dto.entity,
    field: dto.field,
  };
};
