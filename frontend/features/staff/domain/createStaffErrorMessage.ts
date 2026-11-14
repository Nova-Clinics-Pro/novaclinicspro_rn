import { classifyApiError } from '../../../core/api/apiErrorPresentation';
import { describeApiError } from '../../../core/localization/apiErrorMessages';
import { ErrorTokens } from '../../../core/localization/errorTokens';
import { StaffOperationError } from './errors/staffOperationError';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** FastAPI validation failures: name the field(s) that are wrong (never the raw server text). */
const invalidDetailsMessage = (t: Translate, cause: unknown): string => {
  const detail = (cause as { response?: { data?: { detail?: unknown } } } | undefined)?.response?.data?.detail;
  const issues = Array.isArray(detail) ? (detail as { loc?: unknown[]; msg?: unknown }[]) : [];
  const text = issues.map(i => `${(i.loc ?? []).join('.')} ${String(i.msg ?? '')}`).join(' ').toLowerCase();
  if (text.includes('email')) return t('errors.staff.emailRequired');
  if (text.includes('phone')) return t('errors.staff.phoneInvalid');
  return t('errors.staff.invalidDetails');
};

/** What to tell the user when creating a staff member failed: the specific reason when we know it. */
export const createStaffErrorMessage = (t: Translate, error: unknown): string => {
  if (error instanceof StaffOperationError) {
    if (error.kind === 'EMAIL_EXISTS') return t('errors.staff.emailExists');
    if (error.kind === 'AUTH_EMAIL_REGISTERED') return t('errors.staff.emailRegistered');
    if (error.kind === 'INVALID_DETAILS') return invalidDetailsMessage(t, error.cause);
    if (error.kind === 'PHONE_EXISTS') return t('errors.staff.phoneExists');
    if (error.kind === 'RATE_LIMITED') return t('errors.staff.rateLimited');
    if (error.kind === 'PERMISSION_DENIED') return describeApiError(t, classifyApiError(error.cause)).message;
  }
  return t(ErrorTokens.staff.createFailed);
};
