import { invalidateCanonicalOnboardingState } from '../../features/onboarding/data/repositories/onboardingFreshness';

describe('canonical onboarding freshness', () => {
  it('invalidates only canonical onboarding reads for the mutated tenant', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    await invalidateCanonicalOnboardingState(
      { invalidateQueries } as never,
      'tenant-a',
    );

    const options = invalidateQueries.mock.calls[0][0];
    expect(options.predicate({ queryKey: ['onboarding', 'status', 'org-a', 'tenant-a', 'v1'] })).toBe(true);
    expect(options.predicate({ queryKey: ['onboarding', 'journey-visibility', 'org-a', 'tenant-a', '1.0'] })).toBe(true);
    expect(options.predicate({ queryKey: ['onboarding', 'ready-to-start', 'org-a', 'tenant-a', '1.0'] })).toBe(true);
    expect(options.predicate({ queryKey: ['onboarding', 'journey-visibility', 'org-b', 'tenant-b', '1.0'] })).toBe(false);
    expect(options.predicate({ queryKey: ['rooms', 'list', 'tenant-a'] })).toBe(false);
  });
});
