/**
 * Treatment Sheets DTOs
 * Data Transfer Objects matching OpenAPI schemas for treatment sheets
 */

// ============================================
// ENUMS
// ============================================

/** Treatment Sheet document status */
export type TreatmentSheetStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PAUSED' | 'SIGNED' | 'FINAL';

// ============================================
// REQUEST DTOs
// ============================================

/** Create treatment sheet request (from casesheet) */
export interface TreatmentSheetCreateRequest {
  duration_days: number;
  appointment_id?: string;
  encounter_id?: string;
  // Episode-scoped creation — triggers inline sync with appointments
  episode_id?: string;
  rows?: TreatmentSheetRowCreateRequest[];
}

/** Row data for episode-scoped treatment sheet creation */
export interface TreatmentSheetRowCreateRequest {
  day_number: number;
  treatment_description?: string;
  medicines_given?: string;
  instructions?: string;
}

/** Create treatment sheet simplified request */
export interface TreatmentSheetSimpleCreateRequest {
  client_id: string;
  /**
   * Required by the backend router validation on
   * POST /tenants/{tenant_id}/treatment-sheets. The simplified service derives
   * the sheet from the client's latest casesheet and does not persist this id,
   * but the request is rejected with 400 ("Missing required fields") if it is absent.
   */
  treatment_id: string;
  /** ISO date (YYYY-MM-DD). Also required by router validation. */
  start_date: string;
  duration_days: number;
  appointment_id?: string;
  episode_id?: string;
  encounter_id?: string;
}

/** Update treatment sheet row request */
export interface TreatmentSheetRowUpdateRequest {
  treatment_description?: string;
  medicines_given?: string;
  instructions?: string;
}

/** Complete treatment sheet row request */
export interface TreatmentSheetRowCompleteRequest {
  materials?: string;
}

/** Transition treatment sheet status request */
export interface TreatmentSheetStatusTransitionRequest {
  status: TreatmentSheetStatus;
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Treatment sheet row response */
export interface TreatmentSheetRowResponse {
  id: string;
  treatment_sheet_id: string;
  day_number: number;
  session_date: string | null;
  session_id: string | null;
  scheduled_time?: string | null;
  therapist_id?: string | null;
  treatment_description?: string | null;
  treatment_name?: string | null;
  medicines_given?: string | null;
  medicines_text?: string | null;
  instructions?: string | null;
  instructions_text?: string | null;
  created_at: string;
  updated_at: string;
}

/** Treatment sheet response */
export interface TreatmentSheetResponse {
  id: string;
  tenant_id: string;
  case_sheet_id: string | null;
  episode_id?: string | null;
  appointment_id: string | null;
  encounter_id: string | null;
  duration_days: number;
  status: TreatmentSheetStatus;
  agreed_package_cost?: number | null;
  document_version: number;
  version?: number;
  // Order / recommendation fields (present once sent to scheduling)
  state?: string | null;
  scheduling_status?: string | null;
  is_order?: boolean;
  planned_sessions?: number | null;
  frequency?: string | null;
  order_notes?: string | null;
  recommended_therapy?: string | null;
  recommended_treatment_id?: string | null;
  recorded_at: string;
  recorded_by_staff_id: string | null;
  signed_by_staff_id: string | null;
  signed_at: string | null;
  rows: TreatmentSheetRowResponse[];
  header_snapshot: Record<string, any> | null;
  footer_snapshot: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Treatment sheet sync response */
export interface TreatmentSheetSyncResponse {
  total: number;
  created: number;
  updated: number;
}

/** Print treatment sheet response */
export interface TreatmentSheetPrintResponse {
  content: string;
  content_type: 'text/html' | 'application/pdf';
  filename?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get status display label */
export const getStatusLabel = (status: TreatmentSheetStatus): string => {
  const labels: Record<TreatmentSheetStatus, string> = {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    PAUSED: 'Paused',
    SIGNED: 'Signed',
    FINAL: 'Final',
  };
  return labels[status] || status;
};

/** Get status color */
export const getStatusColor = (status: TreatmentSheetStatus): string => {
  const colors: Record<TreatmentSheetStatus, string> = {
    DRAFT: '#6B7280',      // Gray
    SCHEDULED: '#3B82F6',  // Blue
    IN_PROGRESS: '#8B5CF6', // Purple
    COMPLETED: '#10B981',  // Green
    CANCELLED: '#EF4444',  // Red
    PAUSED: '#F59E0B',     // Yellow/Amber
    SIGNED: '#10B981',     // Green
    FINAL: '#3B82F6',      // Blue
  };
  return colors[status] || '#6B7280';
};

/** Check if treatment sheet is editable */
export const isEditable = (status: TreatmentSheetStatus): boolean => {
  return status === 'DRAFT' || status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'PAUSED';
};

/** Get allowed transitions from current status */
export const getAllowedTransitions = (status: TreatmentSheetStatus): TreatmentSheetStatus[] => {
  switch (status) {
    case 'DRAFT':
      return ['FINAL'];
    case 'FINAL':
      return ['SIGNED'];
    case 'SIGNED':
      return [];
    default:
      return [];
  }
};

/** Get row completion status */
export const getRowCompletionStatus = (row: TreatmentSheetRowResponse): 'pending' | 'scheduled' | 'completed' => {
  if (row.session_id && row.treatment_description) {
    return 'completed';
  }
  if (row.session_date) {
    return 'scheduled';
  }
  return 'pending';
};

/** Get row status color */
export const getRowStatusColor = (row: TreatmentSheetRowResponse): string => {
  const status = getRowCompletionStatus(row);
  switch (status) {
    case 'completed':
      return '#10B981'; // Green
    case 'scheduled':
      return '#3B82F6'; // Blue
    default:
      return '#9CA3AF'; // Gray
  }
};

/** Calculate progress percentage */
export const calculateProgress = (rows: TreatmentSheetRowResponse[]): number => {
  if (!rows || rows.length === 0) return 0;
  const completed = rows.filter(r => getRowCompletionStatus(r) === 'completed').length;
  return Math.round((completed / rows.length) * 100);
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
