import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { SetupWizardFlow } from '../../features/onboarding/presentation/pages/SetupWizardFlow';
import type { JourneyVisibilityProjection } from '../../features/onboarding/domain/entities/journey-visibility.entity';

const mockSelectStep = jest.fn();
const mockSubmitStep = jest.fn();
const mockRefetch = jest.fn();
let mockProjection: JourneyVisibilityProjection;
let mockInitialSelectedStepId: string | null = null;

const makeProjection = (staffState: 'NOT_STARTED' | 'COMPLETE'): JourneyVisibilityProjection => ({
  identity: {
    contractVersion: '1.0',
    templateVersion: 'test-template',
    capabilityRevision: 'test-capability',
    tenantId: 'tenant-1',
  },
  projectedAt: new Date('2026-09-27T00:00:00Z'),
  projectionRevision: staffState === 'COMPLETE' ? 'revision-complete' : 'revision-pending',
  visibleSteps: [
    { stepId: 'clinic_profile', order: 0, visibility: 'VISIBLE', progress: 'COMPLETED' },
    { stepId: 'staff_and_roles', order: 1, visibility: 'VISIBLE', progress: staffState === 'COMPLETE' ? 'COMPLETED' : 'INCOMPLETE' },
    { stepId: 'go_live_checklist', order: 2, visibility: 'VISIBLE', progress: 'INCOMPLETE' },
  ],
  resolvedSteps: [
    {
      stepId: 'clinic_profile', order: 0, rendererKey: 'clinic_profile', applicable: true,
      required: true, state: 'COMPLETE', titleToken: 'clinic profile', helpToken: null,
      requirements: [], blockers: [], correctiveActions: [], managementActions: [], presentation: {},
    },
    {
      stepId: 'staff_and_roles', order: 1, rendererKey: 'staff_and_roles', applicable: true,
      required: true, state: staffState, titleToken: 'staff and roles', helpToken: null,
      requirements: [], blockers: [], correctiveActions: [],
      managementActions: [{
        kind: 'NAVIGATE', target: 'manage_staff', destination: 'clinic.staff',
        requiredParams: ['tenant_id', 'step_id'], labelToken: 'manage staff',
        availability: 'AVAILABLE', fallbackToken: 'action unavailable',
      }], presentation: {},
    },
    {
      stepId: 'go_live_checklist', order: 2, rendererKey: 'go_live_review', applicable: true,
      required: false, state: 'IN_PROGRESS', titleToken: 'ready to start', helpToken: null,
      requirements: [], blockers: [], correctiveActions: [], managementActions: [], presentation: {},
    },
  ],
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ tenantId: 'tenant-1' }),
  useFocusEffect: () => undefined,
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { primary: { default: '#000' }, surface: { default: '#fff', elevated: '#eee' }, background: { default: '#fff' }, border: { default: '#ddd' }, text: { primary: '#000', secondary: '#555', onPrimary: '#fff' }, feedback: { error: '#f00', warning: '#fc0', warningLight: '#ff0' } },
    spacing: { xs: 2, sm: 4, md: 8, lg: 12 },
    typography: { h5: {}, body1: {}, body2: {}, button: {} },
  }),
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key === 'common.next' ? 'Next' : key === 'common.previous' ? 'Previous' : key }),
}));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: { userId: 'user-1', tenantId: 'tenant-1', applicationStatus: 'onboarding' },
    isAuthenticated: true,
    refreshSession: jest.fn().mockResolvedValue({ applicationStatus: 'active' }),
    logout: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
  useCompleteSetupMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDemoStatusQuery: () => ({ data: null }),
  executePendingMutation: jest.fn(),
}));
jest.mock('../../features/onboarding/presentation/hooks/useOnboardingRuntime', () => ({
  useOnboardingRuntime: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // Jest factories are hoisted; use a lazy require so the actual runtime
    // module is loaded only after the mock's captured test state exists.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildOnboardingRuntime } = require('../../features/onboarding/domain/usecases/build-onboarding-runtime.usecase');
    const [selectedStepId, setSelectedStepId] = React.useState<string | null>(mockInitialSelectedStepId);
    const runtime = buildOnboardingRuntime(mockProjection, selectedStepId);
    return {
      data: { per_step_validation: {} }, isLoading: false, error: null, isRefreshing: false,
      journey: { identity: { tenantId: 'tenant-1' }, availability: 'available', cards: [{ stepCode: 'staff_and_roles' }] },
      projection: mockProjection, organizationId: null, statusDomain: { steps: new Map() },
      scopeMatches: true, runtime,
      selectStep: (stepId: string) => { mockSelectStep(stepId); setSelectedStepId(stepId); },
      refetch: async () => { const value = { projection: mockProjection }; mockRefetch(value); return value; },
      revalidateTenant: async () => true,
    };
  },
}));
jest.mock('../../features/onboarding/presentation/components/WizardStepper', () => ({ WizardStepper: () => null }));
jest.mock('../../features/onboarding/presentation/components/OfflineBanner', () => ({ OfflineBanner: () => null }));
jest.mock('../../features/onboarding/presentation/components/PendingMutationRecoveryBanner', () => ({ PendingMutationRecoveryBanner: () => null }));
jest.mock('../../features/onboarding/presentation/components/DemoStatusBanner', () => ({ DemoStatusBanner: () => null }));
jest.mock('../../features/onboarding/presentation/components/JourneySurface', () => ({ JourneySurface: () => null }));
jest.mock('../../features/onboarding/presentation/components/DraftConflictModal', () => ({ DraftConflictModal: () => null }));
jest.mock('../../features/onboarding/presentation/components/LoadingScreen', () => ({ LoadingScreen: () => null }));
jest.mock('../../features/onboarding/presentation/components/ErrorScreen', () => ({ ErrorScreen: () => null }));
jest.mock('../../features/onboarding/presentation/renderers/onboardingRendererRegistry', () => ({
  OnboardingRenderer: ({ step }: { step: { rendererKey: string } }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text>{step.rendererKey === 'go_live_review' ? 'Start Trial' : 'Staff & Roles'}</Text>;
  },
}));
jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const store = (selector: (state: { setTenantId: jest.Mock; stepDrafts: Record<string, unknown> }) => unknown) => selector({ setTenantId: jest.fn(), stepDrafts: {} });
  store.getState = () => ({ stepDrafts: {} });
  store.subscribe = () => () => undefined;
  return { useWizardStore: store, hydrateWizardDraftFromStorage: jest.fn(), resetWizardDraftStorage: jest.fn(), syncWizardDraftToStorage: jest.fn() };
});
jest.mock('../../features/onboarding/presentation/hooks/useDraftConflictRecovery', () => ({
  useDraftConflictRecovery: () => ({ visible: false, pendingAction: null, failure: null, useLatestDisabled: false, keepLocalDisabled: false, executeSubmission: async ({ submit }: { submit: (context: { expectedRevision?: string; idempotencyKey: string }) => Promise<unknown> }) => submit({ idempotencyKey: 'submission-1' }), useLatest: jest.fn(), keepLocal: jest.fn() }),
}));
jest.mock('../../features/onboarding/presentation/hooks/usePendingMutationReplayLifecycle', () => ({ usePendingMutationReplayLifecycle: jest.fn() }));
jest.mock('../../features/onboarding/presentation/stores/pending-mutations.store', () => ({
  usePendingMutationsStore: Object.assign(
    (selector: (state: { records: unknown[]; recoveryRequired: boolean }) => unknown) => selector({ records: [], recoveryRequired: false }),
    { getState: () => ({ setRecoveryRequired: jest.fn() }) },
  ),
}));
jest.mock('../../features/onboarding/application/recoverable-step-submission', () => ({ executeRecoverableStepSubmission: jest.fn() }));
jest.mock('../../core/utils/errorHandler', () => ({ logError: jest.fn() }));
jest.mock('../../features/onboarding/presentation/config/onboardingPresentationRegistry', () => ({ translateOnboardingToken: (token: string | null) => token ?? '' }));
jest.mock('../../features/onboarding/presentation/actions/onboardingActionRegistry', () => ({ executeOnboardingAction: jest.fn() }));

describe('SetupWizardFlow final-review handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjection = makeProjection('NOT_STARTED');
    mockInitialSelectedStepId = 'staff_and_roles';
    mockSubmitStep.mockImplementation(async () => { mockProjection = makeProjection('COMPLETE'); });
  });

  it('submits an incomplete final setup step once, then advances to final review after the refreshed projection confirms completion', async () => {
    const screen = render(<SetupWizardFlow />);

    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(mockSubmitStep).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSelectStep).toHaveBeenCalledWith('go_live_checklist'));
    expect(screen.getByText('Start Trial')).toBeTruthy();
  });

  it('uses Next only for forward navigation from a completed staff step and never replays the staff mutation', async () => {
    mockProjection = makeProjection('COMPLETE');
    const screen = render(<SetupWizardFlow />);

    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(mockSelectStep).toHaveBeenCalledWith('go_live_checklist'));
    expect(mockSubmitStep).not.toHaveBeenCalled();
    expect(screen.getByText('Start Trial')).toBeTruthy();
  });

  it('does not advance an incomplete final setup step before the submission completes', async () => {
    mockSubmitStep.mockRejectedValueOnce(new Error('staff validation failed'));
    const screen = render(<SetupWizardFlow />);

    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(mockSubmitStep).toHaveBeenCalledTimes(1));
    expect(mockSelectStep).not.toHaveBeenCalledWith('go_live_checklist');
    expect(screen.getByText('Staff & Roles')).toBeTruthy();
  });
});
