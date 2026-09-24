import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates only canonical onboarding reads scoped to one tenant after a
 * corrective configuration mutation. The next projection is always computed
 * by the backend; this helper never derives or writes step completion.
 */
export const invalidateCanonicalOnboardingState = (
  queryClient: QueryClient,
  tenantId: string,
): Promise<void> =>
  queryClient.invalidateQueries({
    predicate: query =>
      query.queryKey[0] === 'onboarding' && query.queryKey.includes(tenantId),
  });
