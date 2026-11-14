export type StaffOperationFailureKind =
  | 'LOAD_FAILED'
  | 'SAVE_FAILED'
  | 'DELETE_FAILED'
  /** The email already belongs to a staff member of this clinic (HTTP 409). */
  | 'EMAIL_EXISTS'
  /** The phone number already belongs to a staff member of this clinic (HTTP 409 with code STAFF_PHONE_EXISTS). */
  | 'PHONE_EXISTS'
  /** A sign-in account already exists for the email but is not linked to a staff member here (HTTP 409 with code AUTH_EMAIL_REGISTERED). */
  | 'AUTH_EMAIL_REGISTERED'
  /** The server rejected the details as incomplete or invalid (HTTP 422); `cause` carries the field messages. */
  | 'INVALID_DETAILS'
  /** The sign-in provider is temporarily limiting emails (HTTP 429); trying again later works. */
  | 'RATE_LIMITED'
  /** The signed-in user is not allowed to do this (HTTP 403). The original error is kept in `cause`. */
  | 'PERMISSION_DENIED';

/** Stable staff-operation failure semantics; never expose a transport body. */
export class StaffOperationError extends Error {
  constructor(
    readonly kind: StaffOperationFailureKind,
    /** The underlying request error, kept only so a screen can explain a permission refusal. */
    readonly cause?: unknown,
  ) {
    super(kind);
    this.name = 'StaffOperationError';
  }
}
