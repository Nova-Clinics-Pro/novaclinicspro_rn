import { SessionInstructionsError } from '../domain/errors/sessionInstructionsError';
import { TreatmentOperationError } from '../domain/errors/treatmentOperationError';

/** Presentation-facing safe wording for feature-owned Treatment errors. */
export const treatmentErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof TreatmentOperationError) return error.message;
  if (error instanceof SessionInstructionsError) {
    switch (error.kind) {
      case 'VERSION_CONFLICT':
        return 'Session instructions changed on the server.';
      case 'PERMISSION_DENIED':
        return 'You do not have permission to apply Session instructions.';
      case 'VALIDATION_FAILED':
        return 'Could not apply — one or more selected Sessions is not eligible.';
      default:
        return fallbackMessage;
    }
  }
  return fallbackMessage;
};

export const isTreatmentVersionConflict = (error: unknown): boolean =>
  error instanceof TreatmentOperationError && error.kind === 'VERSION_CONFLICT';
