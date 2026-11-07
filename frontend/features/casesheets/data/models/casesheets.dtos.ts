/**
 * Casesheets DTOs
 * Data Transfer Objects matching OpenAPI schemas for clinical case sheets
 */

// ============================================
// ENUMS
// ============================================

/** Casesheet document status */
export type CasesheetStatus = 'DRAFT' | 'FINAL' | 'SIGNED';

/** Clinic type for casesheet */
export type ClinicType = 'ayurveda' | 'general' | 'dental' | 'other';

// ============================================
// REQUEST DTOs
// ============================================

/** Create casesheet request */
export interface CasesheetCreateRequest {
  clinic_type: ClinicType;
  data_json: Record<string, any>;
  template_id?: string;
  appointment_id?: string;
  encounter_id?: string;
  episode_id?: string; // Added: Link casesheet to episode directly
}

/** Update casesheet request */
export interface CasesheetUpdateRequest {
  data_json: Record<string, any>;
  /**
   * T-FE-E.1a (T-BE-C.2, FR-CS-2). The Appointment this write is authored
   * during, right now -- the backend resolves and validates the current
   * Visit from it server-side (never a client-supplied visit_id). This
   * field already exists on the backend's CaseSheetUpdateRequest schema;
   * it was simply never sent from the frontend update path before this
   * task, which is exactly the verified defect FR-CS-2 names (every
   * contribution after the first attributed to the creating visit).
   */
  appointment_id?: string;
}

/** Transition casesheet status request */
export interface CasesheetStatusTransitionRequest {
  status: CasesheetStatus;
}

/** List casesheets params */
export interface ListCasesheetsParams {
  skip?: number;
  limit?: number;
  status?: CasesheetStatus;
  from_date?: string;
  to_date?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Casesheet response */
export interface CasesheetResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  template_id: string | null;
  appointment_id: string | null;
  episode_id: string | null;
  treatment_sheet_id: string | null; // ID of associated treatment sheet (if exists)
  chief_complaint: string | null;
  provisional_diagnosis: string | null;
  final_diagnosis: string | null;
  status: CasesheetStatus;
  document_version: number;
  recorded_at: string;
  recorded_by_staff_id: string | null;
  signed_by_staff_id: string | null;
  signed_at: string | null;
  data_json: Record<string, any>;
  header_snapshot: Record<string, any> | null;
  footer_snapshot: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Paginated casesheet list response */
export interface CasesheetListResponse {
  items: CasesheetResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Print casesheet response (returns HTML/PDF data) */
export interface CasesheetPrintResponse {
  content: string;
  content_type: 'text/html' | 'application/pdf';
  filename?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get status display label */
export const getStatusLabel = (status: CasesheetStatus): string => {
  const labels: Record<CasesheetStatus, string> = {
    DRAFT: 'Draft',
    FINAL: 'Final',
    SIGNED: 'Signed',
  };
  return labels[status] || status;
};

/** Get status color */
export const getStatusColor = (status: CasesheetStatus): string => {
  const colors: Record<CasesheetStatus, string> = {
    DRAFT: '#F59E0B',   // Amber/warning
    FINAL: '#3B82F6',   // Blue/info
    SIGNED: '#10B981',  // Green/success
  };
  return colors[status] || '#6B7280';
};

/** Check if casesheet is editable */
export const isEditable = (status: CasesheetStatus): boolean => {
  return status === 'DRAFT';
};

/** Get allowed transitions from current status */
export const getAllowedTransitions = (status: CasesheetStatus): CasesheetStatus[] => {
  switch (status) {
    case 'DRAFT':
      return ['FINAL'];
    case 'FINAL':
      return ['SIGNED'];
    case 'SIGNED':
      return []; // No transitions allowed from SIGNED
    default:
      return [];
  }
};

/** Format date for display */
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/** Format date and time for display */
export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// ============================================
// CONTRIBUTION HISTORY (T-FE-E.1b, T-BE-E.1a, Decision 12, FR-CS-5/6)
// ============================================

/**
 * Safe staff-display facts for a contribution's author. `full_name` is
 * honestly nullable (staff never assigned, or later deleted) — mirrors
 * the backend's `CaseSheetContributionAuthor` (no email/phone/auth id).
 */
export interface CasesheetContributionAuthor {
  staff_id: string | null;
  full_name: string | null;
}

/**
 * One append-only, immutable Case Sheet contribution. `content_snapshot`
 * is the exact `data_json` recorded at that Visit, never a generated
 * summary; `content_available=false` (with `content_snapshot=null`)
 * distinguishes a legacy contribution from a genuinely empty one — never
 * backfilled or reconstructed on the frontend.
 */
export interface CasesheetContributionItem {
  id: string;
  visit_id: string;
  author: CasesheetContributionAuthor;
  contributed_at: string;
  content_snapshot: Record<string, any> | null;
  content_available: boolean;
}

/**
 * Deterministic, append-only contribution history for one Episode Case
 * Sheet. `contributions` is returned exactly as the backend orders it
 * (`contributed_at` ASC, `id` ASC) — never reordered on the frontend.
 */
export interface CasesheetContributionHistoryResponse {
  casesheet_id: string;
  episode_id: string;
  contributions: CasesheetContributionItem[];
}
