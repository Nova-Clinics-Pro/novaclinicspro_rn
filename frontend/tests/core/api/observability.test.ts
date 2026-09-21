/**
 * Phase 1 · T-0.7 — Observability hooks.
 *
 * Verifies `reportObservabilityEvent` and its two call sites in
 * core/api/axiosClient.ts, per FR-E4/AC-10/NFR-6 (5xx and auth-boundary
 * anomalies must be observable without code inspection).
 *
 * This uses SOURCE INSPECTION (the same technique already established in
 * this project for tests/features/doctorDashboard/startBehavior.characterization.test.ts),
 * rather than importing the real module. Importing the real axiosClient.ts
 * transitively requires live Supabase/API-base-URL env values that are baked
 * in at babel-transform time (react-native-dotenv) — not settable at test
 * runtime — which is exactly why this project's existing tests
 * (e.g. useConsultationWorkspace.test.tsx, caseResolver.test.ts) mock
 * axiosClient wholesale rather than import the real file. Source inspection
 * avoids fighting that build-time constraint while still giving a durable
 * regression test: if the observability call is ever removed, or wrapped
 * back inside `__DEV__`, this test fails.
 */
import fs from 'fs';
import path from 'path';

const AXIOS_CLIENT_PATH = path.resolve(__dirname, '../../../core/api/axiosClient.ts');
const source = fs.readFileSync(AXIOS_CLIENT_PATH, 'utf8');

/** Extracts the response-interceptor error handler body (from its `async (error: AxiosError) => {` down to the matching closing of the `axiosClient.interceptors.response.use(` call). */
function extractResponseErrorHandler(src: string): string {
  const startMarker = 'async (error: AxiosError) => {';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error('Could not locate the response error handler in axiosClient.ts');
  const end = src.indexOf('\n);', start);
  return src.slice(start, end);
}

describe('axiosClient observability hooks (T-0.7)', () => {
  it('exports reportObservabilityEvent with the required event categories', () => {
    expect(source).toContain('export function reportObservabilityEvent(');
    expect(source).toContain("'api.server_error'");
    expect(source).toContain("'api.auth_boundary_anomaly'");
  });

  it('keeps server errors as errors and auth-boundary anomalies as warnings', () => {
    const fnStart = source.indexOf('export function reportObservabilityEvent(');
    const fnBody = source.slice(fnStart, source.indexOf('\n}', fnStart));
    expect(fnBody).not.toContain('__DEV__');
    expect(fnBody).toContain("event.event === 'api.auth_boundary_anomaly'");
    expect(fnBody).toContain('console.warn');
    expect(fnBody).toContain('console.error');
  });

  describe('response error interceptor wiring', () => {
    const handlerBody = extractResponseErrorHandler(source);

    it('reports a server_error event for 5xx responses', () => {
      expect(handlerBody).toMatch(
        /error\.response\?\.status && error\.response\.status >= 500[\s\S]*?event: 'api\.server_error'/
      );
    });

    it('keeps unauthenticated bootstrap 401s quiet while observing authenticated 401s', () => {
      expect(handlerBody).toContain('const isUnauthenticated401');
      expect(handlerBody).toContain('const isAuthenticated401');
      expect(handlerBody).toMatch(/if \(isAuthenticated401\) \{[\s\S]*?event: 'api\.auth_boundary_anomaly'/);
      const unauthenticatedBranchStart = handlerBody.indexOf('if (isUnauthenticated401) {');
      const unauthenticatedBranchEnd = handlerBody.indexOf('\n      } else {', unauthenticatedBranchStart);
      expect(handlerBody.slice(unauthenticatedBranchStart, unauthenticatedBranchEnd))
        .not.toContain('reportObservabilityEvent');
    });

    it('the two observability calls are NOT nested inside the __DEV__-gated block', () => {
      // The existing dev-only console logging is gated behind `if (__DEV__) { ... }`.
      // The new observability calls must sit OUTSIDE that block (as a sibling
      // if/else-if), not inside it — otherwise they would be invisible in
      // production, which is exactly the gap this task closes.
      const devBlockStart = handlerBody.indexOf('if (__DEV__) {');
      const devBlockEnd = handlerBody.indexOf('\n    }', devBlockStart);
      const devBlock = handlerBody.slice(devBlockStart, devBlockEnd);
      expect(devBlock).not.toContain('reportObservabilityEvent');

      const afterDevBlock = handlerBody.slice(devBlockEnd);
      expect(afterDevBlock).toContain('reportObservabilityEvent');
    });

    it('does not alter existing behavior: CORS handling, 401 token-refresh retry, and Promise.reject(error) are unchanged', () => {
      expect(handlerBody).toContain("error.message?.includes('CORS')");
      expect(handlerBody).toContain('supabase.auth.refreshSession()');
      expect(handlerBody).toContain('return Promise.reject(error);');
    });
  });
});
