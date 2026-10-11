/** Stable feature semantics for Treatment Plan and scheduling operations. */
export type TreatmentOperationFailureKind =
  | 'VERSION_CONFLICT'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'SAVE_FAILED';

export class TreatmentOperationError extends Error {
  constructor(
    readonly kind: TreatmentOperationFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'TreatmentOperationError';
  }
}
