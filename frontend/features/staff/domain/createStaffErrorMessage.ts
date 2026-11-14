import { classifyApiError } from '../../../core/api/apiErrorPresentation';
import { describeApiError } from '../../../core/localization/apiErrorMessages';
import { ErrorTokens } from '../../../core/localization/errorTokens';
import { StaffOperationError } from './errors/staffOperationError';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** What to tell the user when creating a staff member failed: the specific reason when we know it. */
export const createStaffErrorMessage = (t: Translate, error: unknown): string => {
  if (error instanceof StaffOperationError) {
    if (error.kind === 'EMAIL_EXISTS') return t('errors.staff.emailExists');
    if (error.kind === 'PHONE_EXISTS') return t('errors.staff.phoneExists');
    if (error.kind === 'RATE_LIMITED') return t('errors.staff.rateLimited');
    if (error.kind === 'PERMISSION_DENIED') return describeApiError(t, classifyApiError(error.cause)).message;
  }
  return t(ErrorTokens.staff.createFailed);
};
