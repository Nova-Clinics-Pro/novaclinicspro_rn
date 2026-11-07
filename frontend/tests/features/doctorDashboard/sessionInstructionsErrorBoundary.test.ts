jest.mock('../../../core/api/axiosClient', () => ({ axiosClient: { patch: jest.fn() } }));

import { axiosClient } from '../../../core/api/axiosClient';
import {
  normalizeSessionInstructionsError,
  updateAllTreatmentSheetRowsApi,
  updateTreatmentSheetRowApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentSheets.api';
import { SessionInstructionsError } from '../../../features/treatmentSheets/domain/errors/sessionInstructionsError';

const axiosFailure = (status: number, data: Record<string, unknown> = {}) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: { status, data },
});

describe('Session Instructions transport error boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps the backend VERSION_CONFLICT envelope to the stable conflict contract', () => {
    expect(normalizeSessionInstructionsError(axiosFailure(409, { error: 'VERSION_CONFLICT', current_version: 5 }))).toMatchObject({
      kind: 'VERSION_CONFLICT', currentVersion: 5,
    });
  });

  it('maps the previously presentation-owned bulk status distinctions below the feature boundary', () => {
    expect(normalizeSessionInstructionsError(axiosFailure(403))).toMatchObject({ kind: 'PERMISSION_DENIED' });
    expect(normalizeSessionInstructionsError(axiosFailure(400, { detail: 'Cannot edit completed row' }))).toMatchObject({ kind: 'VALIDATION_FAILED' });
    expect(normalizeSessionInstructionsError(axiosFailure(422))).toMatchObject({ kind: 'VALIDATION_FAILED' });
  });

  it('preserves a safe generic response message without exposing SQL-like detail', () => {
    expect(normalizeSessionInstructionsError(axiosFailure(500, { detail: 'Save unavailable.' }))).toMatchObject({ kind: 'SAVE_FAILED', message: 'Save unavailable.' });
    expect(normalizeSessionInstructionsError(axiosFailure(500, { detail: 'SQL traceback' }))).toMatchObject({ kind: 'SAVE_FAILED', message: 'Could not save Session instructions.' });
  });

  it('keeps row identity, version propagation, and bulk tenant/sheet scope at the datasource boundary', async () => {
    (axiosClient.patch as jest.Mock).mockRejectedValueOnce(axiosFailure(409, { error: 'VERSION_CONFLICT', current_version: 5 }));
    await expect(updateTreatmentSheetRowApi('row-1', { instructions: 'Rest' }, 3)).rejects.toBeInstanceOf(SessionInstructionsError);
    expect(axiosClient.patch).toHaveBeenCalledWith('/api/v1/clinic/treatment-sheets/rows/row-1', { instructions: 'Rest' }, { headers: { 'If-Match': '3' } });

    (axiosClient.patch as jest.Mock).mockRejectedValueOnce(axiosFailure(400));
    await expect(updateAllTreatmentSheetRowsApi('tenant-1', 'sheet-1', [{ id: 'row-1', instructions: 'Rest' }])).rejects.toMatchObject({ kind: 'VALIDATION_FAILED' });
    expect(axiosClient.patch).toHaveBeenLastCalledWith('/api/v1/clinic/tenant-1/treatment-sheets/sheet-1/rows', { rows: [{ id: 'row-1', instructions: 'Rest' }] });
  });
});
