/**
 * Contract test: the Clinical Review calls must match the backend router (treatment_orders_router.py):
 *   POST /treatment-sheets/{id}/clinical-reviews          body { notes: str }, no If-Match
 *   POST /treatment-sheets/{id}/clinical-reviews/outcome   body { outcome }, If-Match required
 * with `mark_complete` (not `complete`) as the completing outcome.
 */
import {
  addClinicalReviewNoteApi,
  clinicalReviewNoteText,
  recordClinicalReviewOutcomeApi,
} from '../../../features/treatmentSheets/data/datasources/treatmentOrders.api';

jest.mock('../../../core/api/axiosClient', () => ({
  axiosClient: { post: jest.fn() },
}));

const { axiosClient } = jest.requireMock('../../../core/api/axiosClient') as { axiosClient: { post: jest.Mock } };

describe('Clinical Review API contract', () => {
  beforeEach(() => {
    axiosClient.post.mockReset();
    axiosClient.post.mockResolvedValue({ data: { ok: true } });
  });

  it('adds a note at /clinical-reviews with a plain-text `notes` body', async () => {
    await addClinicalReviewNoteApi('sheet-1', { observation: '  Reduced stiffness.  ' });

    expect(axiosClient.post).toHaveBeenCalledTimes(1);
    expect(axiosClient.post).toHaveBeenCalledWith('/api/v1/treatment-sheets/sheet-1/clinical-reviews', {
      notes: 'Reduced stiffness.',
    });
  });

  it('refuses to send an empty note (the backend requires at least one character)', async () => {
    await expect(addClinicalReviewNoteApi('sheet-1', {})).rejects.toThrow('clinical observation is required');
    await expect(addClinicalReviewNoteApi('sheet-1', { observation: '   ' })).rejects.toThrow();
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('extracts note text only from a string `observation`', () => {
    expect(clinicalReviewNoteText({ observation: 5 })).toBe('');
    expect(clinicalReviewNoteText(undefined)).toBe('');
    expect(clinicalReviewNoteText({ observation: ' x ' })).toBe('x');
  });

  it('records an outcome at /clinical-reviews/outcome with only { outcome } and If-Match', async () => {
    await recordClinicalReviewOutcomeApi('sheet-1', 7, 'mark_complete');

    expect(axiosClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = axiosClient.post.mock.calls[0];
    expect(url).toBe('/api/v1/treatment-sheets/sheet-1/clinical-reviews/outcome');
    expect(body).toEqual({ outcome: 'mark_complete' });
    expect(config.headers['If-Match']).toBe('7');
  });

  it('saves an optional decision note first, then records the outcome', async () => {
    await recordClinicalReviewOutcomeApi('sheet-1', 3, 'continue_unchanged', { observation: 'No concerns.' });

    expect(axiosClient.post).toHaveBeenCalledTimes(2);
    expect(axiosClient.post.mock.calls[0][0]).toBe('/api/v1/treatment-sheets/sheet-1/clinical-reviews');
    expect(axiosClient.post.mock.calls[0][1]).toEqual({ notes: 'No concerns.' });
    expect(axiosClient.post.mock.calls[1][0]).toBe('/api/v1/treatment-sheets/sheet-1/clinical-reviews/outcome');
    expect(axiosClient.post.mock.calls[1][1]).toEqual({ outcome: 'continue_unchanged' });
  });

  it('does NOT record the outcome when its decision note could not be saved', async () => {
    axiosClient.post.mockRejectedValueOnce(Object.assign(new Error('boom'), { isAxiosError: true, response: { status: 500, data: {} } }));

    await expect(
      recordClinicalReviewOutcomeApi('sheet-1', 3, 'extend', { observation: 'Needs more sessions.' })
    ).rejects.toBeDefined();
    expect(axiosClient.post).toHaveBeenCalledTimes(1);
  });
});
