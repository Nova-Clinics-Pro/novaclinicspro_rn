import { shouldRetryApiRequest } from '../../../core/api/requestPolicy';

describe('ordinary API request retry policy', () => {
  it.each([400, 401, 403, 404, 422])('treats deterministic %i responses as terminal', (status) => {
    expect(shouldRetryApiRequest(0, { response: { status } })).toBe(false);
  });

  it('keeps transient failures bounded to two retries', () => {
    expect(shouldRetryApiRequest(0, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryApiRequest(1, new Error('network unavailable'))).toBe(true);
    expect(shouldRetryApiRequest(2, { response: { status: 500 } })).toBe(false);
  });
});
