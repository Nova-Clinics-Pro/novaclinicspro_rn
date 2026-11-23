/** A dispensing that was refused or failed; `code` is the server's stable reason (DISPENSING_FAILED for anything else). */
export class DispensingError extends Error {
  constructor(
    readonly code: string,
    /** Stock figures when the reason is not enough stock. */
    readonly details?: { available?: string; requested?: string },
  ) {
    super(code);
    this.name = 'DispensingError';
  }
}
