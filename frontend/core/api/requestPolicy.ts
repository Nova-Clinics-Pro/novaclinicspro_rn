/**
 * Shared policy for ordinary request/response API work.
 *
 * Long-running workflows must opt in to their own lifecycle UI. They must not
 * silently rely on this ordinary request fallback.
 */
export const ORDINARY_API_LOADING_NOTICE_MS = 3_000;
export const ORDINARY_API_LOADING_FALLBACK_MS = 8_000;

export const isDeterministicClientError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: unknown } } | undefined)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

/** Keep retries bounded, and never retry deterministic client failures. */
export const shouldRetryApiRequest = (failureCount: number, error: unknown): boolean =>
  !isDeterministicClientError(error) && failureCount < 2;
