/** Stable feature semantics for doctor-authored Treatment Session instructions. */
export type SessionInstructionsFailureKind =
  | 'VERSION_CONFLICT'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_FAILED'
  | 'SAVE_FAILED';

export class SessionInstructionsError extends Error {
  constructor(
    readonly kind: SessionInstructionsFailureKind,
    message: string,
    readonly currentVersion: number | null = null,
  ) {
    super(message);
    this.name = 'SessionInstructionsError';
  }
}
