/**
 * Phase 1 · T-A.4 (FR-A5, ADR-P1-01, design.md §6.2): a synchronous,
 * module-level "logging out" flag — shared between useAuth.ts's logout()
 * (writer) and axiosClient.ts's request interceptor (reader).
 *
 * Why this exists: React-level guards (isAuthenticated checks on
 * useFocusEffect refetches) can't protect a request that is already
 * in-flight when logout starts, or one issued via a raw axiosClient call
 * outside React Query (queryClient.cancelQueries() only cancels queries it
 * is tracking). A plain module-level flag, checked synchronously in the
 * request interceptor, closes that gap regardless of how the request was
 * initiated. Not a React hook/store — axiosClient.ts is a plain module
 * outside the component tree.
 */
let loggingOut = false;
let logoutEpoch = 0;

export function setLoggingOut(value: boolean): void {
  // Each logout start opens a new epoch so that session work begun earlier
  // (e.g. a concurrent bootstrap restoring a persisted session) can detect that
  // a logout happened meanwhile and must not re-establish authentication.
  if (value && !loggingOut) logoutEpoch += 1;
  loggingOut = value;
}

/** Monotonic counter incremented every time a logout begins. */
export function getLogoutEpoch(): number {
  return logoutEpoch;
}

export function isLoggingOut(): boolean {
  return loggingOut;
}
