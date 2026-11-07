export type CasesheetOperationFailureKind =
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'LOAD_FAILED';

/** Stable query failure semantics for Case Sheet presentation. */
export class CasesheetOperationError extends Error {
  constructor(readonly kind: CasesheetOperationFailureKind) {
    super(kind);
    this.name = 'CasesheetOperationError';
  }
}
