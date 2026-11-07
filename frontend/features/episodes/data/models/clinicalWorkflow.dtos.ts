/**
 * Clinical Workflow contract DTOs (T-FE-B.1, backend T-BE-B.2a)
 *
 * One-to-one mirror of the backend's ClinicalWorkflowResolutionResponse
 * (app/api/v1/schemas/clinical_workflow.py) — no renamed fields, no
 * flattened states, no locally-computed properties. This is the single
 * backend-owned workflow semantic contract for a Visit context (DP-15);
 * the frontend renders it, it never assembles or derives it.
 *
 * `state` on WorkflowStage is verified against the backend's own
 * `StageState` enum (app/domain/models/clinical_workflow.py) to carry
 * NINE values, not the six named in tasks.md's own AC shorthand:
 * completed | current | pending | waiting | blocked | read_only |
 * historical_only | not_applicable | unresolved. Typed here as `string`
 * (not a frontend union) so an unrecognised future backend value never
 * becomes a TypeScript compile error — WorkflowPills.tsx's own state-map
 * falls back safely for anything it doesn't recognise.
 */

export interface WorkflowStage {
  code: string;
  state: string;
  mandatory: boolean;
  waiting_permission: string | null;
  blocking_reason_code: string | null;
  detail_reason_code: string | null;
}

export interface AlternativeAction {
  action: string;
  stage: string;
  reason_code: string;
}

export interface WorkflowCompletionReadiness {
  ready: boolean;
  unresolved_stage_codes: string[];
  reason_code: string | null;
}

export interface CapabilityLossSemantic {
  code: string;
  capability_code: string;
  stage: string | null;
}

export interface ClinicalWorkflowResolutionResponse {
  stages: WorkflowStage[];
  recommended_action: string | null;
  recommendation_reason: string | null;
  blocking_factors: string[];
  waiting_role: string | null;
  alternatives: AlternativeAction[];
  completion_readiness: WorkflowCompletionReadiness;
  outstanding_work: string[];
  optional_work: string[];
  unresolved_facts: string[];
  capability_loss: CapabilityLossSemantic[];
}
