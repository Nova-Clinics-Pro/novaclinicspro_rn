/**
 * Treatment Plan DTOs (T-FE-E.2 closure, T-BE-D.4a, FR-TP-1, FR-TR-1)
 *
 * Field-for-field mirror of the backend's `TreatmentPlanResponse`
 * (`app/schemas/treatment_plans.py`) — no invented fields (no
 * `plan_status` label, no amendment/version-history, no schedule/
 * session-date fields; Plan versioning is T-BE-D.5's own scope).
 */

export interface TreatmentPlanResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  episode_id: string;
  originating_recommendation_id: string | null;
  authoring_staff_id: string;
  therapies: string[];
  authorized_session_count: number | null;
  frequency: string | null;
  scheduling_intent: string | null;
  preferred_interval: string | null;
  sequencing_pattern: string | null;
  review_milestones: string[];
  completion_criteria: string | null;
  course_precautions: string | null;
  therapist_requirements: string | null;
  /** FR-TP-2's eight frozen semantic stages, e.g. 'authoring' | 'active_course' | ... */
  status: string;
  document_version: number;
  superseded_by_plan_id: string | null;
  recorded_by_staff_id: string | null;
  created_at: string;
}

/**
 * Only caller-authored fields — tenant_id/authoring_staff_id/
 * recorded_by_staff_id are never accepted here; the backend derives
 * them from the authenticated context (T-BE-D.4a).
 */
export interface CreateTreatmentPlanRequest {
  client_id: string;
  episode_id: string;
  originating_recommendation_id: string;
  therapies: string[];
  authorized_session_count?: number | null;
  frequency?: string | null;
  scheduling_intent?: string | null;
  preferred_interval?: string | null;
  sequencing_pattern?: string | null;
  review_milestones?: string[] | null;
  completion_criteria?: string | null;
  course_precautions?: string | null;
  therapist_requirements?: string | null;
}
