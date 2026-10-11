/**
 * Stable error semantics for appointment creation.
 *
 * Transport envelopes are intentionally normalized below presentation so
 * appointment screens can respond to product outcomes without Axios knowledge.
 */
export type AppointmentCreationFailureKind =
  | 'NETWORK_AFTER_SUBMIT'
  | 'CREATE_FAILED';

export class AppointmentCreationError extends Error {
  constructor(
    readonly kind: AppointmentCreationFailureKind,
    message: string,
    readonly isConflict: boolean = false
  ) {
    super(message);
    this.name = 'AppointmentCreationError';
  }
}
