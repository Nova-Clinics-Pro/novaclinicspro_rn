/**
 * Shared React Query client.
 *
 * Exported as a singleton (rather than only living inside app/_layout.tsx) so
 * that non-component code — e.g. the logout() flow in useAuth — can cancel
 * in-flight queries and clear the cache when the session ends. Without this,
 * cached/active queries (most often ones re-triggered via an explicit
 * `refetch()` from a `useFocusEffect`, which bypasses each query's `enabled`
 * guard) can fire authenticated requests after the JWT has already been
 * cleared, producing "Authorization header required" 401s right after logout.
 *
 * Phase 1 · T-A.1 (ADR-P1-01, design.md §5 "Query keys: deterministic per
 * affected clinical read"): the single addressing scheme for Group A's 3
 * affected clinical reads (casesheet, prescription, treatment sheet/order,
 * scoped to the active episode+appointment) is the existing per-feature key
 * factories, reused as-is rather than duplicated here:
 *   - `casesheetsKeys` (features/casesheets/data/repositories/casesheets.repository.impl.ts)
 *   - `prescriptionsKeys` (features/prescriptions/data/repositories/prescriptions.repository.impl.ts)
 *     — `.byAppointment(tenantId, episodeId, appointmentId)` added in T-A.1;
 *       no equivalent existed before (the consultation workspace resolved
 *       this read via an ad-hoc, non-React-Query `axiosClient.get` call).
 *   - `treatmentSheetsKeys` / `treatmentOrderKeys` (features/treatmentSheets/data/repositories/*.ts)
 * These already had working, deterministic keys and (for casesheet/treatment
 * sheet/order) invalidating mutation hooks before Phase 1 — the gap Group A
 * addresses is that `useConsultationWorkspace.ts` doesn't use any of them
 * (calls raw API datasource functions directly), so its saves never
 * invalidate the query cache. That wiring is a later, flag-gated task.
 */
import { QueryClient } from '@tanstack/react-query';
import { shouldRetryApiRequest } from './requestPolicy';

export {
  ORDINARY_API_LOADING_FALLBACK_MS,
  ORDINARY_API_LOADING_NOTICE_MS,
  shouldRetryApiRequest,
} from './requestPolicy';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry only transient/network failures; every deterministic 4xx is terminal.
      retry: shouldRetryApiRequest,
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Errors are handled in UI components, not via a global query-level
      // onError — that callback was removed from query defaultOptions in
      // React Query v5 (still valid on mutations below).
    },
    mutations: {
      // Don't show global error notifications - errors are handled in UI
      onError: () => {
        // Errors are displayed in the UI
      },
    },
  },
});
