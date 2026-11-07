export type PrescriptionOperationFailureKind =
  | 'ALREADY_EXISTS'
  | 'EPISODE_MISMATCH'
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'FINALIZED'
  | 'LOAD_FAILED'
  | 'SAVE_FAILED';

/** A presentation-safe outcome of a prescription transport operation. */
export class PrescriptionOperationError extends Error {
  constructor(
    readonly kind: PrescriptionOperationFailureKind,
    readonly existingPrescriptionId?: string,
  ) {
    super(kind);
    this.name = 'PrescriptionOperationError';
  }
}
