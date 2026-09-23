import { renderHook, waitFor } from '@testing-library/react-native';

import { useJourneyFoundation } from '../../features/onboarding/presentation/hooks/useJourneyFoundation';

const mockUseOnboardingStatusQuery = jest.fn();
const mockUseJourneyVisibilityQuery = jest.fn();
const mockUseOrganizationContextQuery = jest.fn();
const mockClearJourneyVisibilityCache = jest.fn();
const mockClearOnboardingStatusCache = jest.fn();

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOnboardingStatusQuery: (...args: unknown[]) => mockUseOnboardingStatusQuery(...args),
  useJourneyVisibilityQuery: (...args: unknown[]) => mockUseJourneyVisibilityQuery(...args),
  useOrganizationContextQuery: () => mockUseOrganizationContextQuery(),
  useClearJourneyVisibilityCache: () => mockClearJourneyVisibilityCache,
  useClearOnboardingStatusCache: () => mockClearOnboardingStatusCache,
}));

const revision = `cap-v1:${'a'.repeat(64)}`;
const buildProjection = (tenantId: string, stepIds: string[]) => ({
  identity: {
    contractVersion: '1.0',
    templateVersion: 'template-v2',
    capabilityRevision: revision,
    tenantId,
  },
  projectedAt: new Date('2026-07-22T10:00:00Z'),
  projectionRevision: `onboarding-v1:${'b'.repeat(64)}`,
  visibleSteps: stepIds.map((stepId, order) => ({
    stepId,
    order,
    visibility: 'VISIBLE',
    progress: order === 0 ? 'INCOMPLETE' : 'COMPLETED',
  })),
  resolvedSteps: stepIds.map((stepId, order) => ({
    stepId,
    order,
    rendererKey: 'generic_configuration',
    applicable: true,
    required: true,
    state: order === 0 ? 'BLOCKED' : 'COMPLETE',
    titleToken: `onboarding.steps.${stepId}.title`,
    helpToken: `onboarding.steps.${stepId}.help`,
    requirements: [],
    blockers: [],
    correctiveActions: order === 0
      ? [{
          kind: 'NAVIGATE',
          target: stepId,
          destination: 'onboarding.step_detail',
          requiredParams: [],
          labelToken: 'onboarding.actions.configure',
          availability: 'AVAILABLE',
          fallbackToken: 'onboarding.actions.unavailable',
        }]
      : [],
    presentation: {},
  })),
});

const buildStep = (stepCode: string) => ({
  step_code: stepCode,
  status: 'not_started',
  is_complete: false,
  is_valid: true,
  issues: [],
  blocked_reason: null,
  action_url_template: `/onboarding/{tenant_id}/${stepCode}`,
  entity_type: stepCode,
  icon: 'ellipse-outline',
  category: 'setup',
  visible: true,
  actionable: true,
});

const buildStatus = (tenantId: string, stepIds: string[]) => ({
  tenant_id: tenantId,
  template_id: 'template-a',
  clinic_type: 'specialty-neutral',
  total_steps: stepIds.length,
  completed_steps: 0,
  in_progress_steps: 0,
  pending_steps: stepIds.length,
  blocked_steps: 0,
  completion_percentage: 0,
  current_step: stepIds[0] ?? null,
  next_recommended_step: stepIds[0] ?? null,
  is_ready_to_go_live: false,
  per_step_validation: Object.fromEntries(stepIds.map(step => [step, buildStep(step)])),
  visible_steps: stepIds,
  actionable_steps: stepIds,
});

const queryResult = (data: unknown) => ({
  data,
  isLoading: false,
  isRefetching: false,
  error: null,
  refetch: jest.fn().mockResolvedValue({ data }),
});

describe('useJourneyFoundation authoritative projection integration', () => {
  let effectiveTenantId = 'tenant-a';

  beforeEach(() => {
    jest.clearAllMocks();
    effectiveTenantId = 'tenant-a';
    mockUseOrganizationContextQuery.mockImplementation(() => ({
      data: {
        effectiveOrganizationId: 'org-1',
        effectiveTenantId,
        sessionRefreshRequired: false,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn().mockImplementation(async () => ({
        data: {
          effectiveOrganizationId: 'org-1',
          effectiveTenantId,
          sessionRefreshRequired: false,
        },
      })),
    }));
    mockUseOnboardingStatusQuery.mockImplementation((tenantId: string) =>
      queryResult(buildStatus(tenantId, ['clinic_profile', 'staff_setup', 'inventory_setup']))
    );
    mockUseJourneyVisibilityQuery.mockImplementation((_org: string, tenantId: string) =>
      queryResult(buildProjection(tenantId, ['staff_setup', 'clinic_profile']))
    );
  });

  it('renders only projected cards in backend order and preserves projection identity', () => {
    const { result } = renderHook(() => useJourneyFoundation('tenant-a'));

    expect(result.current.journey?.cards.map(card => card.stepCode)).toEqual([
      'staff_setup',
      'clinic_profile',
    ]);
    expect(result.current.journey?.identity.projection).toEqual({
      templateVersion: 'template-v2',
      capabilityRevision: revision,
    });
    expect(result.current.journey?.cards.map(card => card.status)).toEqual([
      'blocked',
      'complete',
    ]);
  });

  it('treats an empty projection as authoritative', () => {
    mockUseJourneyVisibilityQuery.mockReturnValue(queryResult(buildProjection('tenant-a', [])));
    const { result } = renderHook(() => useJourneyFoundation('tenant-a'));
    expect(result.current.journey?.cards).toEqual([]);
    expect(result.current.journey?.progress).toEqual({ completed: 0, total: 0 });
  });

  it('rejects a stale outgoing-tenant projection', () => {
    effectiveTenantId = 'tenant-b';
    mockUseJourneyVisibilityQuery.mockReturnValue(
      queryResult(buildProjection('tenant-a', ['clinic_profile']))
    );
    const { result } = renderHook(() => useJourneyFoundation('tenant-b'));
    expect(result.current.journey).toBeNull();
    expect(result.current.projection).toBeUndefined();
  });

  it('removes the outgoing tenant projection cache on tenant switch', async () => {
    let requestedTenantId = 'tenant-a';
    const { rerender } = renderHook(() => useJourneyFoundation(requestedTenantId));
    effectiveTenantId = 'tenant-b';
    requestedTenantId = 'tenant-b';
    rerender(undefined);

    await waitFor(() =>
      expect(mockClearJourneyVisibilityCache).toHaveBeenCalledWith('org-1', 'tenant-a')
    );
    expect(mockClearOnboardingStatusCache).toHaveBeenCalledWith('org-1', 'tenant-a');
  });

  it('blocks navigation revalidation after an effective-tenant change', async () => {
    const { result } = renderHook(() => useJourneyFoundation('tenant-a'));
    effectiveTenantId = 'tenant-b';
    await expect(result.current.revalidateTenant()).resolves.toBe(false);
  });
});
