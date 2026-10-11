export type RbacOperationFailureKind =
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'NETWORK_FAILED'
  | 'SAVE_FAILED';

/** Stable semantic failures consumed by RBAC presentation. */
export class RbacOperationError extends Error {
  constructor(readonly kind: RbacOperationFailureKind, readonly code?: string) {
    super(kind);
    this.name = 'RbacOperationError';
  }
}
