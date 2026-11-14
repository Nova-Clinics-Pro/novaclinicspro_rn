/**
 * Prescriptions DTOs
 * Data Transfer Objects matching OpenAPI schemas for prescriptions
 */

// ============================================
// ENUMS
// ============================================

/** Prescription document status */
export type PrescriptionStatus = 'DRAFT' | 'FINAL' | 'SIGNED';

/** Share channel options */
export type ShareChannel = 'SMS' | 'WhatsApp' | 'Email';

/** Source document type */
export type SourceDocumentType = 'casesheet' | 'appointment' | 'visit' | 'manual';

// ============================================
// MEDICATION TYPES
// ============================================

/** Single medication item in prescription */
export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity?: number;
  unit?: string;
}

/** Prescription data structure */
export interface PrescriptionData {
  medications: MedicationItem[];
  dietary_advice?: string;
  lifestyle_advice?: string;
  follow_up_instructions?: string;
  warnings?: string[];
}

// ============================================
// REQUEST DTOs
// ============================================

/** Create prescription request */
export interface PrescriptionCreateRequest {
  client_id: string;
  prescription_data: PrescriptionData;
  appointment_id?: string;
  episode_id?: string;
  issued_by_staff_id?: string;
  notes?: string;
  next_visit_days?: number;
  source_document_id?: string;
  source_document_type?: SourceDocumentType;
  repeat_previous_prescription_id?: string;
}

/** Update prescription request */
export interface PrescriptionUpdateRequest {
  prescription_data?: PrescriptionData;
  appointment_id?: string;
  issued_by_staff_id?: string;
  notes?: string;
  source_document_id?: string;
  source_document_type?: SourceDocumentType;
  status?: PrescriptionStatus;
  signed_by_staff_id?: string;
  is_active?: boolean;
}

/** Share prescription request */
export interface PrescriptionShareRequest {
  channel: ShareChannel;
  recipient_phone?: string;
  recipient_email?: string;
  prescription_pdf_url?: string;
  custom_message?: string;
}

/** List prescriptions params */
export interface ListPrescriptionsParams {
  skip?: number;
  limit?: number;
  client_id?: string;
  status?: PrescriptionStatus;
  from_date?: string;
  to_date?: string;
  /** Phase 1 · T-A.1 (ADR-P1-01): scope to one appointment (used with episode_id). */
  appointment_id?: string;
  /** Phase 1 · T-A.1 (ADR-P1-01): scope to one episode (used with appointment_id). */
  episode_id?: string;
}

export interface PrescriptionPrintResponse {
  id: string;
  prescription_number: string | null;
  patient_name: string;
  patient_age: number | null;
  patient_gender: string | null;
  patient_phone: string | null;
  prescription_data: PrescriptionData;
  notes: string | null;
  issued_date: string;
  next_visit_days: number | null;
  branding: {
    clinic_name: string;
    clinic_address: string | null;
    clinic_phone: string | null;
    clinic_email: string | null;
    clinic_logo_url: string | null;
    doctor_name: string;
    doctor_qualification: string | null;
    doctor_registration_number: string | null;
  };
}

// ============================================
// RESPONSE DTOs
// ============================================

/** Prescription response */
export interface PrescriptionResponse {
  id: string;
  tenant_id: string;
  client_id: string;
  appointment_id: string | null;
  episode_id: string | null;
  issued_by_staff_id: string | null;
  prescription_data: PrescriptionData;
  notes: string | null;
  next_visit_days?: number | null;
  source_document_id?: string | null;
  source_document_type?: SourceDocumentType | null;
  repeated_from_prescription_id?: string | null;
  status: PrescriptionStatus;
  document_version: number;
  signed_by_staff_id?: string | null;
  signed_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Paginated prescription list response */
export interface PrescriptionListResponse {
  items: PrescriptionResponse[];
  total: number;
  skip: number;
  limit: number;
}

/** Share prescription response */
export interface PrescriptionShareResponse {
  success: boolean;
  channel: ShareChannel;
  prescription_id: string;
  client_name?: string;
  recipient_phone?: string;
  recipient_email?: string;
  error?: string;
  /** False when the share was only recorded because no messaging provider is configured: nothing reached the recipient. */
  delivered?: boolean;
  message?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get status display label */
export const getStatusLabel = (status: PrescriptionStatus): string => {
  const labels: Record<PrescriptionStatus, string> = {
    DRAFT: 'Draft',
    FINAL: 'Final',
    SIGNED: 'Signed',
  };
  return labels[status] || status;
};

/** Get status color */
export const getStatusColor = (status: PrescriptionStatus): string => {
  const colors: Record<PrescriptionStatus, string> = {
    DRAFT: '#F59E0B',   // Amber/warning
    FINAL: '#3B82F6',   // Blue/info
    SIGNED: '#10B981',  // Green/success
  };
  return colors[status] || '#6B7280';
};

/** Get share channel icon */
export const getChannelIcon = (channel: ShareChannel): string => {
  const icons: Record<ShareChannel, string> = {
    SMS: 'chatbubble-outline',
    WhatsApp: 'logo-whatsapp',
    Email: 'mail-outline',
  };
  return icons[channel] || 'share-outline';
};

/** Get share channel color */
export const getChannelColor = (channel: ShareChannel): string => {
  const colors: Record<ShareChannel, string> = {
    SMS: '#3B82F6',     // Blue
    WhatsApp: '#25D366', // WhatsApp green
    Email: '#EA4335',   // Gmail red
  };
  return colors[channel] || '#6B7280';
};

/** Check if prescription is editable */
export const isEditable = (status: PrescriptionStatus): boolean => {
  return status === 'DRAFT';
};

/** Check if prescription can be shared */
export const canShare = (status: PrescriptionStatus): boolean => {
  return status === 'SIGNED';
};

/** Get allowed transitions from current status */
export const getAllowedTransitions = (status: PrescriptionStatus): PrescriptionStatus[] => {
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

/** Format medication for display */
export const formatMedication = (med: MedicationItem): string => {
  const parts = [med.name];
  if (med.dosage) parts.push(med.dosage);
  if (med.frequency) parts.push(med.frequency);
  if (med.duration) parts.push(`for ${med.duration}`);
  return parts.join(' - ');
};

/** Get medication count */
export const getMedicationCount = (data: PrescriptionData): number => {
  return data.medications?.length || 0;
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
