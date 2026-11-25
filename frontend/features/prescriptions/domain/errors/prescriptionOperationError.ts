import type { AllergyAlert } from '../../../clients/domain/clientAllergies';

export type PrescriptionOperationFailureKind =
  | 'ALREADY_EXISTS'
  | 'EPISODE_MISMATCH'
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'FINALIZED'
  | 'ALLERGY_ALERT'
  | 'LOAD_FAILED'
  | 'SAVE_FAILED';

/** A presentation-safe outcome of a prescription transport operation. */
export class PrescriptionOperationError extends Error {
  constructor(
    readonly kind: PrescriptionOperationFailureKind,
    readonly existingPrescriptionId?: string,
    /** For ALLERGY_ALERT: the medicines that match an allergy of the patient. */
    readonly alerts?: AllergyAlert[],
  ) {
    super(kind);
    this.name = 'PrescriptionOperationError';
  }
}
