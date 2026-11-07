/**
 * Consultation Completion contract DTOs (T-0.8, backend T-BE-F.3/T-BE-F.3a)
 *
 * One-to-one mirror of the backend's ConsultationCompletionResponse
 * (app/api/v1/schemas/consultation_completion.py) — no renamed fields, no
 * flattened distinctions, no locally-computed properties. This is the
 * single backend-owned answer to "can this consultation be completed?"
 * (DP-15); the frontend renders it, it does not derive it.
 */

export interface CaseSheetSummary {
  exists: boolean;
  document_status: string | null;
  recording_state: string;
}

export interface PrescriptionSummary {
  exists: boolean;
  document_status: string | null;
  recording_state: string;
}

export interface TreatmentSummary {
  exists: boolean;
  lifecycle_status: string | null;
  lifecycle_unresolved: boolean;
  recording_state: string;
}

export interface BillingSummary {
  clinical_services_exist: boolean | null;
  invoice_exists: boolean | null;
  invoice_count: number | null;
  invoice_statuses: string[];
  billed_amount: string | null;
  paid_amount: string | null;
  outstanding_amount: string | null;
  currency: string | null;
  recording_state: string;
}

export interface VisitSummary {
  visit_exists: boolean;
  appointment_status: string | null;
  outcome_type: string | null;
  recording_state: string;
}

export interface CapabilityLoss {
  code: string;
  capability_code: string;
  stage: string | null;
}

export interface ConsultationCompletionResponse {
  state: string;
  can_complete: boolean;
  clinically_ready: boolean;
  actionable_by_current_user: boolean;

  outstanding_mandatory: string[];
  optional_suggested: string[];
  warnings: string[];
  unresolved_facts: string[];

  recommended_action: string | null;
  recommendation_reason: string | null;
  blocking_factors: string[];
  waiting_permission: string | null;

  case_sheet: CaseSheetSummary;
  prescription: PrescriptionSummary;
  treatment: TreatmentSummary;
  billing: BillingSummary;
  visit: VisitSummary;

  capability_loss: CapabilityLoss[];
}
