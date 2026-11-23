import { StaffOperationError } from './errors/staffOperationError';
import { createStaffErrorMessage } from './createStaffErrorMessage';
import { ErrorTokens } from '../../../core/localization/errorTokens';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** What to tell the user when inviting a staff member to sign in failed: the specific reason when we know it. */
export const inviteStaffErrorMessage = (t: Translate, error: unknown): string => {
  if (error instanceof StaffOperationError) {
    if (error.kind === 'ALREADY_HAS_LOGIN') return t('errors.staff.alreadyHasLogin');
    // The same reasons Add Staff explains (email taken, sign-in account elsewhere, rate limit, refused, invalid).
    if (error.kind !== 'SAVE_FAILED') return createStaffErrorMessage(t, error);
  }
  return t(ErrorTokens.staff.inviteFailed);
};
