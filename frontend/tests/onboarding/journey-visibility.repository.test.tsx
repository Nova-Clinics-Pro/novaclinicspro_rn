import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

import { getJourneyVisibilityApi } from '../../features/onboarding/data/datasources/onboarding.api';
import {
  JourneyResolvedStepDTO,
  JourneyVisibilityDatasourceError,
  JourneyVisibilityResponseDTO,
} from '../../features/onboarding/data/models/onboarding.dtos';
import {
  journeyVisibilityRepository,
  mapJourneyVisibility,
  onboardingKeys,
  useJourneyVisibilityQuery,
} from '../../features/onboarding/data/repositories/onboarding.repository.impl';

jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  getJourneyVisibilityApi: jest.fn(),
}));

const mockGetJourneyVisibilityApi = getJourneyVisibilityApi as jest.Mock;
const revision = `cap-v1:${'a'.repeat(64)}`;
const dto = (tenantId: string): JourneyVisibilityResponseDTO => ({
  contract_version: '1.0',
  template_version: 'template-v4',
  capability_revision: revision,
  tenant_id: tenantId,
  projected_at: '2026-07-22T10:00:00Z',
  projection_revision: 'onboarding-v1:revision-a',
  visible_steps: [
    { step_id: 'staff_setup', order: 8, visibility: 'VISIBLE', progress: 'INCOMPLETE' },
    { step_id: 'clinic_profile', order: 2, visibility: 'VISIBLE', progress: 'COMPLETED' },
  ],
  resolved_steps: [],
});

const resolvedStep = (
  state: JourneyResolvedStepDTO['state'],
): JourneyResolvedStepDTO => ({
  step_id: 'configuration',
  order: 0,
  renderer_key: 'configuration',
  applicable: true,
  required: true,
  state,
  title_token: 'onboarding.steps.configuration.title',
  help_token: null,
  requirements: [],
  blockers: [],
  corrective_actions: [],
  management_actions: [],
  presentation: {},
});

describe('Journey Visibility repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetJourneyVisibilityApi.mockImplementation(async (tenantId: string) => dto(tenantId));
  });

  it('maps DTOs to an immutable domain projection without reordering', async () => {
    const result = await journeyVisibilityRepository.getJourneyVisibility('tenant-1');

    expect(result.identity).toEqual({
      contractVersion: '1.0',
      templateVersion: 'template-v4',
      capabilityRevision: revision,
      tenantId: 'tenant-1',
    });
    expect(result.visibleSteps.map((step) => step.stepId)).toEqual([
      'staff_setup',
      'clinic_profile',
    ]);
    expect(result.visibleSteps.map((step) => step.progress)).toEqual([
      'INCOMPLETE',
      'COMPLETED',
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.identity)).toBe(true);
    expect(Object.isFrozen(result.visibleSteps)).toBe(true);
    expect(Object.isFrozen(result.visibleSteps[0])).toBe(true);
    expect(result).not.toHaveProperty('contract_version');
  });

  it.each(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED', 'NOT_APPLICABLE'] as const)(
    'accepts the canonical resolved lifecycle state %s without coercion',
    (state) => {
      const result = mapJourneyVisibility(
        {
          ...dto('tenant-1'),
          resolved_steps: [resolvedStep(state)],
        },
        'tenant-1',
      );

      expect(result.resolvedSteps[0].state).toBe(state);
    },
  );

  it.each([
    ['hidden visibility', { visibility: 'HIDDEN' }],
    ['unknown progress', { progress: 'UNKNOWN' }],
  ])('fails closed for %s', async (_label, override) => {
    mockGetJourneyVisibilityApi.mockResolvedValue({
      ...dto('tenant-1'),
      visible_steps: [{ ...dto('tenant-1').visible_steps[0], ...override }],
    });

    await expect(
      journeyVisibilityRepository.getJourneyVisibility('tenant-1')
    ).rejects.toMatchObject({ kind: 'CONTRACT_MISMATCH' });
  });

  it('rejects a projection for a different tenant', async () => {
    mockGetJourneyVisibilityApi.mockResolvedValue(dto('tenant-stale'));
    await expect(
      journeyVisibilityRepository.getJourneyVisibility('tenant-current')
    ).rejects.toMatchObject({ kind: 'TENANT_MISMATCH' });
  });

  it('maps typed transport errors into safe domain failures', async () => {
    mockGetJourneyVisibilityApi.mockRejectedValue(
      new JourneyVisibilityDatasourceError(
        'journey_visibility.forbidden',
        'errors.journeyVisibility.forbidden',
        false,
        403
      )
    );
    await expect(
      journeyVisibilityRepository.getJourneyVisibility('tenant-1')
    ).rejects.toMatchObject({
      kind: 'FORBIDDEN',
      code: 'journey_visibility.forbidden',
      message: 'errors.journeyVisibility.forbidden',
    });
  });

  it('keys and reloads query state by organization and tenant scope', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    let tenantId = 'tenant-1';
    const { result, rerender, unmount } = renderHook(
      () => useJourneyVisibilityQuery('org-1', tenantId),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.identity.tenantId).toBe('tenant-1');

    tenantId = 'tenant-2';
    rerender(undefined);
    await waitFor(() => expect(result.current.data?.identity.tenantId).toBe('tenant-2'));
    expect(mockGetJourneyVisibilityApi).toHaveBeenCalledWith('tenant-1');
    expect(mockGetJourneyVisibilityApi).toHaveBeenCalledWith('tenant-2');
    expect(onboardingKeys.journeyVisibility('org-1', 'tenant-2')).toEqual([
      'onboarding',
      'journey-visibility',
      'org-1',
      'tenant-2',
      '1.0',
    ]);
    unmount();
    queryClient.clear();
  });

  it('exposes typed failure state from the query hook', async () => {
    mockGetJourneyVisibilityApi.mockRejectedValue(
      new JourneyVisibilityDatasourceError(
        'journey_visibility.projection_unavailable',
        'errors.journeyVisibility.projection_unavailable',
        false,
        503
      )
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(
      () => useJourneyVisibilityQuery('org-1', 'tenant-1'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ kind: 'PROJECTION_UNAVAILABLE' });
    unmount();
    queryClient.clear();
  });
});
