/** A clinic report that could not be produced; `code` is the server's stable reason (or REPORT_FAILED for anything else). */
export class ClinicReportError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ClinicReportError';
  }
}
