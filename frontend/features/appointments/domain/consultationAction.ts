/**
 * Where a consultation stands, as reported by the backend for the doctor dashboard (see the backend rule
 * `consultation_progress`). Older responses do not carry it.
 */
export type ConsultationProgress = 'not_started' | 'in_progress' | 'documents_finalized' | 'closed';

export type ConsultationActionKey = 'start' | 'continue' | 'complete';

/**
 * Which label the doctor's appointment card button shows. Every one of them opens the same consultation workspace; the
 * label only says what the doctor is there to do. Whether the consultation can actually be completed is decided by the
 * backend's completion contract when the workspace is open, never by this label.
 */
export const consultationActionKey = (progress: ConsultationProgress | null | undefined): ConsultationActionKey => {
  if (progress === 'documents_finalized') return 'complete';
  if (progress === 'in_progress') return 'continue';
  return 'start';
};
