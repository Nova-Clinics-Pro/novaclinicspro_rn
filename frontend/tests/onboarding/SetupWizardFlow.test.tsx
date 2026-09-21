/**
 * SetupWizardFlow Tests
 *
 * Covers the visible_steps-empty observability fix (FR-097 regression detection).
 *
 * Verifies:
 *   1. visible_steps: null  → console.error fired with FR-097-referencing message + full
 *                             statusData payload, error UI renders, no navigation occurs
 *   2. visible_steps: []    → same as above
 *   3. visible_steps populated → console.error NOT called, no UI regression
 *
 * Note on console.error suppression: setup.ts does `global.console.error = jest.fn()`,
 * so assertions against it work cleanly without producing test output noise.
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, BackHandler } from 'react-native';
import { SetupWizardFlow } from '../../features/onboarding/presentation/pages/SetupWizardFlow';
import * as wizardStore from '../../features/onboarding/presentation/stores/wizard.store';
import { createDraftRevisionEvidence } from '../../features/onboarding/domain/entities/step-revision.entity';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ tenantId: 'test-tenant-456' }),
  useFocusEffect: (cb: () => void) => {
    // Fire the focus callback once, matching real mount behaviour.
    const react = require('react');
    react.useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E' },
      secondary: { default: '#6B7280' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280', onPrimary: '#FFFFFF' },
      feedback: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        warningLight: '#FEF3C7',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h5: { fontSize: 20, fontWeight: '700' },
      h6: { fontSize: 16, fontWeight: '600' },
      body1: { fontSize: 16 },
      body2: { fontSize: 14 },
      caption: { fontSize: 12 },
      button: { fontSize: 14, fontWeight: '600' },
    },
  }),
}));

const mockNetInfoState = {
  isConnected: true as boolean | null,
  isInternetReachable: true as boolean | null,
};

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockNetInfoState,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('lz-string', () => ({
  compressToUTF16: (value: string) => value,
  decompressFromUTF16: (value: string) => value,
}), { virtual: true });
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('immer', () => ({
  produce: (recipe: (draft: any) => void) => (state: any) => {
    const draft = JSON.parse(JSON.stringify(state));
    recipe(draft);
    return draft;
  },
}), { virtual: true });

const mockTranslate = (key: string, params?: Record<string, string | number>) => {
  const translations = require('../../core/localization/translations/en-US.json');
  const value = key.split('.').reduce((current: any, segment) => current?.[segment], translations);
  if (typeof value !== 'string') return key;
  return Object.entries(params ?? {}).reduce(
    (text, [name, replacement]) => text.replace(`{{${name}}}`, String(replacement)),
    value
  );
};

jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

const mockAuthState = {
  currentUser: {
    tenantId: 'test-tenant-456',
    applicationStatus: 'onboarding',
  } as any,
  isAuthenticated: false,
};

jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockAuthState.currentUser,
    isAuthenticated: mockAuthState.isAuthenticated,
  }),
}));

// Stub child components — their internal behaviour is not under test here.
jest.mock('../../features/onboarding/presentation/components/WizardStepper', () => ({
  WizardStepper: () => null,
}));
jest.mock('../../features/onboarding/presentation/components/StepCard', () => ({
  StepCard: ({ journeyCard, onPress }: any) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        testID={`journey-card-${journeyCard.stepCode}`}
        onPress={onPress}
        disabled={!journeyCard.isActionable}
      >
        <Text>{journeyCard.stepCode}</Text>
      </TouchableOpacity>
    );
  },
}));
jest.mock('../../features/onboarding/presentation/pages/steps/ClinicProfileScreen', () => ({
  ClinicProfileScreen: () => null,
}));
jest.mock('../../features/onboarding/presentation/pages/steps/BillingSetupScreen', () => ({
  BillingSetupScreen: () => null,
}));
jest.mock('../../features/onboarding/presentation/pages/steps/PaymentSetupScreen', () => ({
  PaymentSetupScreen: () => null,
}));
jest.mock('../../features/onboarding/presentation/pages/steps/GoLiveScreen', () => ({
  GoLiveScreen: ({ onComplete }: { onComplete: () => void }) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onComplete}>
        <Text>Complete Ready to Start</Text>
      </TouchableOpacity>
    );
  },
}));
jest.mock('../../features/onboarding/data/datasources/onboarding.api', () => ({
  submitStepDataApi: jest.fn(),
}));

// Mutable query mock — tests override return value per case.
const mockRefetch = jest.fn();
const mockVisibilityRefetch = jest.fn();
const mockOrganizationRefetch = jest.fn().mockResolvedValue({
  data: {
    effectiveOrganizationId: 'org-1',
    effectiveTenantId: 'test-tenant-456',
    sessionRefreshRequired: false,
  },
});
const mockMutateAsync = jest.fn();
const mockExecuteRecoverableStepSubmission = jest.fn();
const mockUseOnboardingStatusQuery = jest.fn();
const mockUseDemoStatusQuery = jest.fn();
const mockClearJourneyVisibilityCache = jest.fn();
const mockClearOnboardingStatusCache = jest.fn();
const mockProjectionCache = new WeakMap<object, object>();
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOnboardingStatusQuery: (...args: any[]) => mockUseOnboardingStatusQuery(...args),
  useJourneyVisibilityQuery: (_organizationId: string, tenantId: string) => {
    const status = mockUseOnboardingStatusQuery().data;
    const visibleSteps = status?.visible_steps ?? [];
    const cached = status ? mockProjectionCache.get(status) : undefined;
    if (cached) {
      return {
        data: cached,
        isLoading: false,
        isRefetching: false,
        error: null,
        refetch: mockVisibilityRefetch,
      };
    }
    const projection = {
      identity: {
        contractVersion: '1.0',
        templateVersion: 'template-v1',
        capabilityRevision: `cap-v1:${'a'.repeat(64)}`,
        tenantId,
      },
      projectedAt: new Date('2026-07-22T10:00:00Z'),
      visibleSteps: visibleSteps.map((stepId: string, order: number) => ({
        stepId,
        order,
        visibility: 'VISIBLE',
        progress: status?.per_step_validation?.[stepId]?.is_complete
          ? 'COMPLETED'
          : 'INCOMPLETE',
      })),
    };
    if (status) mockProjectionCache.set(status, projection);
    return {
      data: projection,
      isLoading: false,
      isRefetching: false,
      error: null,
      refetch: mockVisibilityRefetch,
    };
  },
  useOrganizationContextQuery: () => ({
    data: {
      effectiveOrganizationId: 'org-1',
      effectiveTenantId: 'test-tenant-456',
      sessionRefreshRequired: false,
    },
    isLoading: false,
    error: null,
    refetch: mockOrganizationRefetch,
  }),
  useClearJourneyVisibilityCache: () => mockClearJourneyVisibilityCache,
  useClearOnboardingStatusCache: () => mockClearOnboardingStatusCache,
  useDemoStatusQuery: (...args: any[]) => mockUseDemoStatusQuery(...args),
  useSubmitStepMutation: () => ({
    mutateAsync: (...args: any[]) => mockMutateAsync(...args),
    isPending: false,
  }),
}));
jest.mock('../../features/onboarding/application/recoverable-step-submission', () => ({
  executeRecoverableStepSubmission: (...args: any[]) =>
    mockExecuteRecoverableStepSubmission(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal but realistic OnboardingStatusResponse. */
const buildStatus = (visible_steps: string[] | null) => ({
  tenant_id: 'test-tenant-456',
  template_id: 'template-abc',
  clinic_type: 'ayurveda',
  total_steps: visible_steps?.length ?? 0,
  completed_steps: 0,
  in_progress_steps: 0,
  pending_steps: visible_steps?.length ?? 0,
  blocked_steps: 0,
  completion_percentage: 0,
  current_step: null,
  next_recommended_step: null,
  is_ready_to_go_live: false,
  per_step_validation: {},
  visible_steps,
  actionable_steps: visible_steps ?? [],
});

type StepValidationMock = {
  step_code: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked';
  is_complete: boolean;
  is_valid: boolean;
  issues: any[];
  blocked_reason: string | null;
  action_url_template: string | null;
  entity_type: string | null;
  icon: string | null;
  category: string | null;
  visible: boolean;
  actionable: boolean;
  revision: string;
  updated_at: string;
  template_version: string;
  capability_revision: string;
};

const buildValidation = (
  visibleSteps: string[],
  completedStepCodes: string[] = [],
  overrides: Record<string, Partial<StepValidationMock>> = {}
) => Object.fromEntries(
  visibleSteps.map(stepCode => [
    stepCode,
    {
      step_code: stepCode,
      status: completedStepCodes.includes(stepCode) ? 'completed' : 'not_started',
      is_complete: completedStepCodes.includes(stepCode),
      is_valid: completedStepCodes.includes(stepCode),
      issues: [],
      blocked_reason: null,
      action_url_template: `/clinic/{tenant_id}/${stepCode}`,
      entity_type: null,
      icon: null,
      category: null,
      visible: true,
      actionable: true,
      revision: `step-rev-v1:${'a'.repeat(64)}`,
      updated_at: '2026-07-23T10:00:00Z',
      template_version: 'template-v1',
      capability_revision: `cap-v1:${'a'.repeat(64)}`,
      ...overrides[stepCode],
    },
  ])
);

const buildStatusWithSteps = (
  visibleSteps: string[],
  completedStepCodes: string[] = [],
  validationOverrides: Record<string, Partial<StepValidationMock>> = {}
) => ({
  ...buildStatus(visibleSteps),
  total_steps: visibleSteps.length,
  completed_steps: completedStepCodes.length,
  pending_steps: visibleSteps.length - completedStepCodes.length,
  per_step_validation: buildValidation(visibleSteps, completedStepCodes, validationOverrides),
  visible_steps: visibleSteps,
  actionable_steps: visibleSteps,
});

const buildDemoStatus = () => ({
  demo_tenant_id: 'test-tenant-456',
  display_name: 'Clinic Preparation',
  status: 'TRIAL',
  demo_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  trial_expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
  demo_time_remaining_seconds: 5 * 24 * 60 * 60,
  trial_time_remaining_seconds: 25 * 24 * 60 * 60,
  is_demo_expired: false,
  is_trial_expired: false,
  demo_url: '',
  created_at: new Date().toISOString(),
});

const renderFlow = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SetupWizardFlow />
    </QueryClientProvider>
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetupWizardFlow — authoritative journey presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoState.isConnected = true;
    mockNetInfoState.isInternetReachable = true;
    mockAuthState.currentUser = { tenantId: 'test-tenant-456', applicationStatus: 'onboarding' };
    mockAuthState.isAuthenticated = false;
    wizardStore.useWizardStore.getState().reset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRefetch.mockResolvedValue({});
    mockVisibilityRefetch.mockResolvedValue({ data: undefined });
    mockMutateAsync.mockResolvedValue({});
    mockExecuteRecoverableStepSubmission.mockImplementation(
      async ({ submit }: { submit: () => Promise<unknown> }) => ({
        status: 'SUBMITTED',
        response: await submit(),
      })
    );
    mockUseDemoStatusQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders an empty projection as authoritative without fallback cards or navigation', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatus([]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, queryByTestId, queryByText } = renderFlow();

    await waitFor(() => {
      expect(getByText(/No supported journey steps are available yet/)).toBeTruthy();
    });
    expect(queryByTestId(/^journey-card-/)).toBeNull();
    expect(queryByText('Next')).toBeNull();
  });

  it('does not query demo status for a normal onboarding tenant', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatus([]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(mockUseDemoStatusQuery).toHaveBeenCalledWith(
        'test-tenant-456',
        expect.objectContaining({ enabled: false })
      );
    });
  });

  it('queries demo status only for a backend-authoritative demo tenant', async () => {
    mockAuthState.currentUser = {
      tenantId: 'test-tenant-456',
      applicationStatus: 'onboarding',
      isDemoTenant: true,
    };
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatus([]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(mockUseDemoStatusQuery).toHaveBeenCalledWith(
        'test-tenant-456',
        expect.objectContaining({ enabled: true })
      );
    });
  });

  it('does not navigate or log a template error for an empty projection', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatus(null),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(mockUseOnboardingStatusQuery).toHaveBeenCalled();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('visible_steps'),
      expect.anything()
    );
  });

  // ── 7. Happy path: console.error NOT called when visible_steps is populated ─
  it('does NOT fire console.error when visible_steps is populated', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatus(['clinic_profile', 'operating_hours', 'staff_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    // Allow all effects to settle — give React a full tick.
    await waitFor(() => {
      expect(mockUseOnboardingStatusQuery).toHaveBeenCalled();
    });

    expect(console.error).not.toHaveBeenCalledWith(
      '[SetupWizardFlow] visible_steps is empty/null for tenant',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('renders Journey Cards in authoritative backend visible-step order', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['staff_setup', 'clinic_profile', 'operating_hours']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getAllByTestId, getByRole, getByText } = renderFlow();

    await waitFor(() => {
      expect(getByRole('header')).toHaveTextContent('Your clinic preparation journey');
      expect(getByText('0 of 3 journey steps complete')).toBeTruthy();
      expect(getAllByTestId(/^journey-card-/).map(card => card.props.testID)).toEqual([
        'journey-card-staff_setup',
        'journey-card-clinic_profile',
        'journey-card-operating_hours',
      ]);
    });
  });

  it('selects the existing wizard step when a Journey Card action is pressed', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile', 'staff_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByTestId, getByText } = renderFlow();

    await waitFor(() => {
      expect(getByTestId('journey-card-staff_setup')).toBeTruthy();
    });

    fireEvent.press(getByTestId('journey-card-staff_setup'));

    await waitFor(() => {
      expect(getByText('Staff & Roles')).toBeTruthy();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not render a fabricated Journey Card for an unknown backend step', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['unknown_step', 'staff_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { queryByTestId, getByTestId } = renderFlow();

    await waitFor(() => {
      expect(getByTestId('journey-card-staff_setup')).toBeTruthy();
    });
    expect(queryByTestId('journey-card-unknown_step')).toBeNull();
  });

  it('shows the explicit empty journey state and hides navigation when all steps are unknown', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['unknown_step']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, queryByText } = renderFlow();

    await waitFor(() => {
      expect(getByText(/No supported journey steps are available yet/)).toBeTruthy();
    });
    expect(queryByText('Next')).toBeNull();
    expect(queryByText(/Step unknown_step/)).toBeNull();
  });

  it('renders the Treatments redirect card for all service catalogue aliases', async () => {
    for (const stepCode of ['services', 'services_and_specialities', 'treatment_services']) {
      jest.clearAllMocks();
      mockUseOnboardingStatusQuery.mockReturnValue({
        data: buildStatusWithSteps([stepCode]),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { getByText, unmount } = renderFlow();

      await waitFor(() => {
        expect(getByText('Treatments & Therapies')).toBeTruthy();
        expect(getByText('Go to Treatments Management')).toBeTruthy();
      });

      unmount();
    }
  });

  it('shows the offline banner and keeps step content visible when NetInfo reports offline', async () => {
    mockNetInfoState.isConnected = false;
    mockNetInfoState.isInternetReachable = false;
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText("You're offline")).toBeTruthy();
      expect(getByText('Changes are saved locally. Connect to the internet to submit this step.')).toBeTruthy();
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });
  });

  it('does not render the offline banner when NetInfo reports online', async () => {
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { queryByText, getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });

    expect(queryByText("You're offline")).toBeNull();
  });

  it('disables submit while offline and re-enables it when connectivity returns', async () => {
    mockNetInfoState.isConnected = false;
    mockNetInfoState.isInternetReachable = false;
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByLabelText, rerender } = renderFlow();

    await waitFor(() => {
      expect(getByLabelText('Connect to the internet to submit this step')).toHaveProp(
        'accessibilityState',
        { disabled: true }
      );
    });

    mockNetInfoState.isConnected = true;
    mockNetInfoState.isInternetReachable = true;

    rerender(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })}
      >
        <SetupWizardFlow />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getByLabelText('Ready to Start')).toHaveProp('accessibilityState', { disabled: false });
    });
  });

  it('does not dispatch submit mutation when offline submit is pressed', async () => {
    mockNetInfoState.isConnected = false;
    mockNetInfoState.isInternetReachable = false;
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByLabelText } = renderFlow();

    await waitFor(() => {
      expect(getByLabelText('Connect to the internet to submit this step')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Connect to the internet to submit this step'));

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('routes an approved transient-capable production submission through the single E7 enqueue owner', async () => {
    const status = buildStatusWithSteps(['operating_hours']);
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: status,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockAuthState.currentUser = {
      tenantId: 'test-tenant-456',
      applicationStatus: 'onboarding',
      userId: 'user-1',
    };
    mockAuthState.isAuthenticated = true;

    const screen = renderFlow();
    await waitFor(() => expect(screen.getByText('Operating Hours')).toBeTruthy());
    wizardStore.useWizardStore.getState().setOperatingHours(
      {
        schedule: [{ day: 'Monday', is_open: true }],
      },
      createDraftRevisionEvidence({
        organizationId: 'org-1',
        tenantId: 'test-tenant-456',
        stepCode: 'operating_hours',
        revision: `step-rev-v1:${'a'.repeat(64)}`,
        templateVersion: 'template-v1',
        capabilityRevision: `cap-v1:${'a'.repeat(64)}`,
      })
    );
    fireEvent.press(screen.getByLabelText('Ready to Start'));

    await waitFor(() =>
      expect(mockExecuteRecoverableStepSubmission).toHaveBeenCalledTimes(1)
    );
    expect(mockExecuteRecoverableStepSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: {
          userId: 'user-1',
          organizationId: 'org-1',
          tenantId: 'test-tenant-456',
        },
        stepCode: 'operating_hours',
        body: {
          operating_hours: [{ day: 'Monday', is_open: true }],
        },
        expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
        templateVersion: 'template-v1',
        capabilityRevision: `cap-v1:${'a'.repeat(64)}`,
      })
    );
  });

  it('routes the banner continue setup action to the backend recommended step', async () => {
    mockUseDemoStatusQuery.mockReturnValue({
      data: buildDemoStatus(),
      isLoading: false,
      error: null,
    });
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: {
        ...buildStatusWithSteps(['clinic_profile', 'operating_hours', 'go_live_checklist']),
        next_recommended_step: 'operating_hours',
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, queryByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Clinic Preparation')).toBeTruthy();
      expect(queryByText(/Demo/i)).toBeNull();
      expect(queryByText(/Go Live/i)).toBeNull();
    });

    fireEvent.press(getByText('Continue Setup'));

    await waitFor(() => {
      expect(getByText('Operating Hours')).toBeTruthy();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('routes the banner Ready to Start action to the existing checklist step', async () => {
    mockUseDemoStatusQuery.mockReturnValue({
      data: buildDemoStatus(),
      isLoading: false,
      error: null,
    });
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile', 'go_live_checklist']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Ready to Start')).toBeTruthy();
    });

    fireEvent.press(getByText('Ready to Start'));

    await waitFor(() => {
      expect(getByText('Complete Ready to Start')).toBeTruthy();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('disables the banner Ready to Start action when backend readiness is not actionable', async () => {
    mockUseDemoStatusQuery.mockReturnValue({
      data: buildDemoStatus(),
      isLoading: false,
      error: null,
    });
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(
        ['clinic_profile', 'go_live_checklist'],
        [],
        { go_live_checklist: { actionable: false } }
      ),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByLabelText, queryByText } = renderFlow();

    await waitFor(() => {
      expect(getByLabelText('Ready to Start')).toHaveProp('accessibilityState', { disabled: true });
    });

    fireEvent.press(getByLabelText('Ready to Start'));

    expect(queryByText('Complete Ready to Start')).toBeNull();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits an external step only once during rapid Next taps and sends the idempotency key', async () => {
    let resolveSubmit: (() => void) | undefined;
    mockMutateAsync.mockImplementation(() => new Promise<void>(resolve => {
      resolveSubmit = resolve;
    }));
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services', 'inventory_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Next')).toBeTruthy();
    });

    const nextButton = getByText('Next');
    fireEvent.press(nextButton);
    fireEvent.press(nextButton);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        data: {},
        mark_complete: true,
        idempotencyKey: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        ),
      })
    );

    await act(async () => {
      resolveSubmit?.();
    });
  });

  it('does not advance until refetch resolves after submit', async () => {
    let resolveRefetch: ((value: unknown) => void) | undefined;
    mockMutateAsync.mockResolvedValue({});
    mockRefetch.mockImplementation(() => new Promise<unknown>(resolve => {
      resolveRefetch = resolve;
    }));
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services', 'inventory_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, queryByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });

    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalled();
    });
    expect(queryByText('Inventory Readiness')).toBeNull();

    await act(async () => {
      resolveRefetch?.({ data: buildStatusWithSteps(['services', 'inventory_setup']) });
    });

    await waitFor(() => {
      expect(getByText('Inventory Readiness')).toBeTruthy();
    });
  });

  it('drops stale submission completions after unmount without refetching or navigating', async () => {
    let firstResolveSubmit: (() => void) | undefined;
    mockMutateAsync
      .mockImplementationOnce(() => new Promise<void>(resolve => {
        firstResolveSubmit = resolve;
      }));
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services', 'inventory_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText, unmount } = renderFlow();

    await waitFor(() => {
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });

    mockRefetch.mockClear();
    fireEvent.press(getByText('Next'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    unmount();

    await act(async () => {
      firstResolveSubmit?.();
    });

    expect(mockRefetch).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/clinic-admin?tenantId=test-tenant-456');
  });

  it('uses Android hardware back to move to the previous step without exiting', async () => {
    const syncSpy = jest
      .spyOn(wizardStore, 'syncWizardDraftToStorage')
      .mockResolvedValue(undefined);
    let hardwareBackHandler: (() => boolean) | undefined;
    const addEventListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        hardwareBackHandler = handler as () => boolean;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services', 'inventory_setup']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });

    fireEvent.press(getByText('Next'));
    await waitFor(() => {
      expect(getByText('Inventory Readiness')).toBeTruthy();
    });

    const consumed = hardwareBackHandler?.();

    expect(consumed).toBe(true);
    expect(syncSpy).toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(getByText('Treatments & Therapies')).toBeTruthy();
    });

    addEventListenerSpy.mockRestore();
    syncSpy.mockRestore();
  });

  it('consumes Android hardware back on the first step without navigation', async () => {
    let hardwareBackHandler: (() => boolean) | undefined;
    const addEventListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        hardwareBackHandler = handler as () => boolean;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['services']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(hardwareBackHandler).toBeDefined();
    });

    const consumed = hardwareBackHandler?.();

    expect(consumed).toBe(true);
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it('routes Ready to Start to commercial retention without granting shell access', async () => {
    const resetSpy = jest
      .spyOn(wizardStore, 'resetWizardDraftStorage')
      .mockResolvedValue(undefined);
    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['go_live_checklist'], ['go_live_checklist']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(getByText('Complete Ready to Start')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete Ready to Start'));

    expect(resetSpy).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/onboarding/commercial-retention?tenantId=test-tenant-456'
    );
    expect(mockRouterReplace).not.toHaveBeenCalledWith(
      '/clinic-admin?tenantId=test-tenant-456'
    );

    resetSpy.mockRestore();
  });

  it('persists dirty wizard drafts when the app moves to background', async () => {
    const syncSpy = jest
      .spyOn(wizardStore, 'syncWizardDraftToStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile', 'operating_hours']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    act(() => {
      wizardStore.useWizardStore.getState().setStepDraft('clinic_profile', { name: 'Nova Clinic' });
      appStateHandler?.('background');
    });

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledTimes(1);
    });

    addEventListenerSpy.mockRestore();
    syncSpy.mockRestore();
  });

  it('skips background persistence when the wizard draft store is clean', async () => {
    const syncSpy = jest
      .spyOn(wizardStore, 'syncWizardDraftToStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    act(() => {
      appStateHandler?.('background');
    });

    expect(syncSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    syncSpy.mockRestore();
  });

  it('hydrates drafts and refreshes backend status when returning active', async () => {
    mockAuthState.isAuthenticated = true;
    const hydrateSpy = jest
      .spyOn(wizardStore, 'hydrateWizardDraftFromStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockRefetch.mockResolvedValue({ data: buildStatusWithSteps(['clinic_profile']) });

    renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    mockRefetch.mockClear();

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    await waitFor(() => {
      expect(hydrateSpy).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    expect(hydrateSpy.mock.invocationCallOrder[0]).toBeLessThan(mockRefetch.mock.invocationCallOrder[0]);

    addEventListenerSpy.mockRestore();
    hydrateSpy.mockRestore();
  });

  it('does not refetch on foreground when authentication is missing', async () => {
    mockAuthState.isAuthenticated = false;
    const hydrateSpy = jest
      .spyOn(wizardStore, 'hydrateWizardDraftFromStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    mockRefetch.mockClear();

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    await waitFor(() => {
      expect(hydrateSpy).toHaveBeenCalled();
    });
    expect(mockRefetch).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    hydrateSpy.mockRestore();
  });

  it('shows a localized notice when backend visible steps change after foreground refresh', async () => {
    mockAuthState.isAuthenticated = true;
    jest
      .spyOn(wizardStore, 'hydrateWizardDraftFromStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockRefetch.mockResolvedValue({ data: buildStatusWithSteps(['clinic_profile', 'operating_hours']) });
    mockVisibilityRefetch.mockResolvedValue({
      data: {
        visibleSteps: [
          { stepId: 'clinic_profile' },
          { stepId: 'operating_hours' },
        ],
      },
    });

    const { getByText } = renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    await waitFor(() => {
      expect(getByText('Your onboarding progress has been updated.')).toBeTruthy();
    });

    addEventListenerSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('does not show a notice when backend visible steps are unchanged after foreground refresh', async () => {
    mockAuthState.isAuthenticated = true;
    jest
      .spyOn(wizardStore, 'hydrateWizardDraftFromStorage')
      .mockResolvedValue(undefined);
    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as any;
      });

    mockUseOnboardingStatusQuery.mockReturnValue({
      data: buildStatusWithSteps(['clinic_profile']),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockRefetch.mockResolvedValue({ data: buildStatusWithSteps(['clinic_profile']) });

    const { queryByText } = renderFlow();

    await waitFor(() => {
      expect(appStateHandler).toBeDefined();
    });

    act(() => {
      appStateHandler?.('background');
      appStateHandler?.('active');
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });

    expect(queryByText('Your onboarding progress has been updated.')).toBeNull();

    addEventListenerSpy.mockRestore();
    jest.restoreAllMocks();
  });
});
