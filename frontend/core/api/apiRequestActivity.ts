/**
 * Transport-level activity used solely by the app-level loading safety net.
 * It does not change request cancellation, retries, or business ownership.
 */
export type ApiLoadingMode = 'ordinary' | 'long-running';

type TrackableRequest = {
  apiRequestTrackerId?: string;
  apiLoadingMode?: ApiLoadingMode;
  apiFailurePresentation?: 'feature';
};

type TransportError = {
  response?: { status?: unknown };
};

export type UnhandledTransportFailure = {
  key: string;
};

let nextRequestId = 0;
const activeOrdinaryRequests = new Set<string>();
const listeners = new Set<() => void>();
let latestUnhandledFailure: UnhandledTransportFailure | null = null;
let unhandledFailureVersion = 0;

const notify = () => listeners.forEach((listener) => listener());

export const beginApiRequest = <T extends TrackableRequest>(config: T): T => {
  if (config.apiLoadingMode === 'long-running' || config.apiFailurePresentation === 'feature') {
    return config;
  }
  if (!config.apiRequestTrackerId) {
    config.apiRequestTrackerId = `api-request-${++nextRequestId}`;
  }
  activeOrdinaryRequests.add(config.apiRequestTrackerId);
  notify();
  return config;
};

export const completeApiRequest = (config?: TrackableRequest, error?: unknown): void => {
  if (!config?.apiRequestTrackerId) return;
  const requestId = config.apiRequestTrackerId;
  const completed = activeOrdinaryRequests.delete(requestId);
  const status = (error as TransportError | undefined)?.response?.status;
  // Raw Axios callers do not necessarily have React Query to surface an
  // unhandled network/5xx failure. Auth and feature-owned failures keep their
  // current owners; this only gives the root fallback a terminal UI path.
  if ((typeof status !== 'number' || status >= 500) && error) {
    latestUnhandledFailure = { key: `${requestId}:${++unhandledFailureVersion}` };
  }
  if (completed || error) notify();
};

export const getActiveOrdinaryRequestCount = (): number => activeOrdinaryRequests.size;

export const getUnhandledTransportFailure = (): UnhandledTransportFailure | null => latestUnhandledFailure;

export const getUnhandledTransportFailureVersion = (): number => unhandledFailureVersion;

export const subscribeToApiRequestActivity = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Test-only reset; production code must only complete real transport requests. */
export const resetApiRequestActivityForTests = (): void => {
  activeOrdinaryRequests.clear();
  nextRequestId = 0;
  latestUnhandledFailure = null;
  unhandledFailureVersion = 0;
  notify();
};
