import type { PrescriptionShareResponse } from '../data/models/prescriptions.dtos';

export type ShareOutcome = 'sent' | 'recorded_not_sent' | 'failed';

/**
 * What a share really achieved. `recorded_not_sent` is a successful request whose channel only logged the message (no
 * messaging provider is configured): the user must not be told it was sent.
 */
export const shareOutcome = (result: Pick<PrescriptionShareResponse, 'success' | 'delivered'>): ShareOutcome => {
  if (!result.success) return 'failed';
  return result.delivered === false ? 'recorded_not_sent' : 'sent';
};
