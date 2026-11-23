import { DispensingError } from './dispensingError';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const KNOWN: Record<string, string> = {
  PRESCRIPTION_ALREADY_DISPENSED: 'alreadyDispensed',
  PRESCRIPTION_NOT_SIGNED: 'notSigned',
  PRESCRIPTION_NOT_FOUND: 'notFound',
  INVALID_DISPENSING_LINE: 'invalidLine',
  MISSING_PERMISSION: 'noPermission',
};

/** What to tell the person when dispensing was refused: the specific reason when we know it. */
export const dispensingErrorMessage = (t: Translate, error: unknown): string => {
  if (error instanceof DispensingError) {
    if (error.code === 'INSUFFICIENT_INVENTORY') {
      return t('dispensing.errors.insufficientStock', { available: error.details?.available ?? '?', requested: error.details?.requested ?? '?' });
    }
    const key = KNOWN[error.code];
    if (key) return t(`dispensing.errors.${key}`);
  }
  return t('dispensing.errors.failed');
};
