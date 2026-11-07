import { normalizeError } from '../../../core/api/axiosClient';

export type DoctorDashboardErrorCode =
  | 'VALIDATION_FAILED'
  | 'SESSION_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'LOAD_FAILED';

export interface DoctorDashboardError {
  code: DoctorDashboardErrorCode;
  title: string;
  message: string;
}

/**
 * Converts transport failures into the small, screen-owned error vocabulary.
 * Presentation deliberately receives no response envelope or backend message.
 */
export const toDoctorDashboardError = (error: unknown): DoctorDashboardError => {
  const { status } = normalizeError(error);

  switch (status) {
    case 400:
      return {
        code: 'VALIDATION_FAILED',
        title: 'Invalid Request',
        message: 'Invalid period or date range. Please try again.',
      };
    case 401:
      return {
        code: 'SESSION_EXPIRED',
        title: 'Session Expired',
        message: 'Please log in again to continue.',
      };
    case 403:
      return {
        code: 'PERMISSION_DENIED',
        title: 'Access Denied',
        message: 'You do not have permission to view this information.',
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        title: 'Not Found',
        message: 'The requested clinical context is no longer available.',
      };
    case 409:
      return {
        code: 'CONFLICT',
        title: 'Update Conflict',
        message: 'This appointment changed. Please retry.',
      };
    default:
      return {
        code: 'LOAD_FAILED',
        title: 'Error Loading Dashboard',
        message: 'Could not load this information. Please try again.',
      };
  }
};
