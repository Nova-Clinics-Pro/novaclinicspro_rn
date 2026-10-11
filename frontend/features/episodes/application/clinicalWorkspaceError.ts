import { normalizeError } from '../../../core/api/axiosClient';

export type ClinicalWorkspaceErrorCode =
  | 'VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SAVE_FAILED';

export interface ClinicalWorkspaceError {
  code: ClinicalWorkspaceErrorCode;
  message: string;
}

/** Keeps Axios and backend error envelopes below Consultation Workspace presentation. */
export const toClinicalWorkspaceError = (
  error: unknown,
  fallbackMessage: string,
): ClinicalWorkspaceError => {
  const { status } = normalizeError(error);

  switch (status) {
    case 400:
    case 422:
      return { code: 'VALIDATION_FAILED', message: fallbackMessage };
    case 403:
      return { code: 'PERMISSION_DENIED', message: fallbackMessage };
    case 404:
      return { code: 'NOT_FOUND', message: fallbackMessage };
    case 409:
      return { code: 'CONFLICT', message: fallbackMessage };
    default:
      return { code: 'SAVE_FAILED', message: fallbackMessage };
  }
};
