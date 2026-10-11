export type OperatingHoursOperationFailureKind =
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'SAVE_FAILED';

/** Stable operating-hours failure semantics, normalized at the datasource boundary. */
export class OperatingHoursOperationError extends Error {
  constructor(readonly kind: OperatingHoursOperationFailureKind) {
    super(kind);
    this.name = 'OperatingHoursOperationError';
  }
}
