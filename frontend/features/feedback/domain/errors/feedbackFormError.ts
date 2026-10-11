export type FeedbackFormFailureKind = 'INVALID_LINK' | 'ALREADY_SUBMITTED' | 'LOAD_FAILED';

/** Stable public-form load failure semantics. */
export class FeedbackFormError extends Error {
  constructor(readonly kind: FeedbackFormFailureKind) {
    super(kind);
    this.name = 'FeedbackFormError';
  }
}
