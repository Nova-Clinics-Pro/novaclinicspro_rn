export type StaffOperationFailureKind = 'LOAD_FAILED' | 'SAVE_FAILED' | 'DELETE_FAILED';

/** Stable staff-operation failure semantics; never expose a transport body. */
export class StaffOperationError extends Error {
  constructor(readonly kind: StaffOperationFailureKind) {
    super(kind);
    this.name = 'StaffOperationError';
  }
}
