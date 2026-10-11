import { isAxiosError } from 'axios';
import { TreatmentOperationError } from '../../domain/errors/treatmentOperationError';

type ErrorEnvelope = {
  error?: unknown;
  detail?: unknown;
  current_version?: unknown;
};

const errorCode = (envelope: ErrorEnvelope | undefined): unknown => {
  if (envelope?.error) return envelope.error;
  if (envelope?.detail && typeof envelope.detail === 'object') {
    return (envelope.detail as ErrorEnvelope).error;
  }
  return undefined;
};

/**
 * Converts Treatment transport failures once at the datasource boundary.
 * Presentation receives only the feature error and its safe, operation-owned
 * fallback wording.
 */
export const normalizeTreatmentOperationError = (
  error: unknown,
  fallbackMessage: string,
): TreatmentOperationError => {
  if (error instanceof TreatmentOperationError) return error;
  if (!isAxiosError(error)) return new TreatmentOperationError('SAVE_FAILED', fallbackMessage);

  const envelope = error.response?.data as ErrorEnvelope | undefined;
  const code = errorCode(envelope);
  const status = error.response?.status;

  if (status === 401) return new TreatmentOperationError('AUTHENTICATION_REQUIRED', 'Authentication failed. Please try logging in again.');
  if (status === 409 || code === 'VERSION_CONFLICT') {
    return new TreatmentOperationError('VERSION_CONFLICT', 'This plan was updated elsewhere. Please review and try again.');
  }
  if (status === 403) return new TreatmentOperationError('PERMISSION_DENIED', 'You do not have permission to perform this action.');
  if (status === 400 || status === 422) return new TreatmentOperationError('VALIDATION_FAILED', fallbackMessage);
  if (status === 404) return new TreatmentOperationError('NOT_FOUND', 'The requested treatment record is no longer available.');
  return new TreatmentOperationError('SAVE_FAILED', fallbackMessage);
};
