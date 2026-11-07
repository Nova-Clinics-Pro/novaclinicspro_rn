/** Backend-authoritative R7 signed Living Document read transport. */
export interface LivingDocumentVersionSummary {
  version_id: string;
  version_number: number;
  predecessor_version_id: string | null;
  is_current: boolean;
  is_superseded: boolean;
  signed_at: string | null;
  signed_by_staff_id: string | null;
  amendment_reason: string | null;
  amended_at: string | null;
}

export interface LivingDocumentVersionListResponse {
  document_identity_id: string;
  document_type: 'CASE_SHEET' | 'PRESCRIPTION';
  versions: LivingDocumentVersionSummary[];
}

export interface CasesheetSignedVersionSnapshot extends LivingDocumentVersionSummary {
  document_identity_id: string;
  document_type: 'CASE_SHEET';
  data_json: Record<string, unknown>;
  header_snapshot: Record<string, unknown> | null;
  footer_snapshot: Record<string, unknown> | null;
}

export interface PrescriptionSignedVersionSnapshot extends LivingDocumentVersionSummary {
  document_identity_id: string;
  document_type: 'PRESCRIPTION';
  prescription_data: Record<string, unknown>;
  notes: string | null;
  next_visit_days: number | null;
  source_document_id: string | null;
  source_document_type: string | null;
  repeated_from_prescription_id: string | null;
}
