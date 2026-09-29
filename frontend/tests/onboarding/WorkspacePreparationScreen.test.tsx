import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { WorkspacePreparationScreen } from '../../features/onboarding/presentation/pages/WorkspacePreparationScreen';
import { WorkspacePreparationOrchestrationState } from '../../features/onboarding/domain/entities/workspace-preparation.entity';

const mockPush = jest.fn();
const mockRetry = jest.fn();
const mockReload = jest.fn();
const mockPreparePersonalizationHandoff = jest.fn();
const mockUseWorkspacePreparation = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../features/onboarding/presentation/hooks/useWorkspacePreparation', () => ({
  useWorkspacePreparation: (...args: unknown[]) => mockUseWorkspacePreparation(...args),
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    t: (token: string, values?: Record<string, unknown>) =>
      values ? `${token}:${JSON.stringify(values)}` : token,
  }),
}));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      background: { default: '#fff' },
      surface: { default: '#fff' },
      primary: { default: '#000' },
      text: { primary: '#000', secondary: '#555', onPrimary: '#fff' },
      feedback: {
        success: '#080', successLight: '#efe', error: '#800', errorLight: '#fee',
      },
      border: { subtle: '#ddd' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h3: { fontSize: 24 }, h5: { fontSize: 18 }, body1: { fontSize: 16 },
      body2: { fontSize: 14 }, button: { fontSize: 16 }, h6: { fontSize: 16 },
    },
  }),
}));

const buildDomain = (
  overrides: Partial<WorkspacePreparationOrchestrationState> = {}
): WorkspacePreparationOrchestrationState => ({
  lifecycle: 'PREPARING',
  progress: {
    completedUnits: ['TENANT_FOUNDATION'],
    remainingUnits: ['ACCESS_FOUNDATION', 'ONBOARDING_FOUNDATION', 'PERSONALIZATION_HANDOFF'],
    currentUnit: 'ACCESS_FOUNDATION',
    completed: 1,
    total: 4,
    percentage: 25,
    indeterminate: false,
  },
  retry: { available: false, exhausted: false, used: 0, maximum: 3, remaining: 3 },
  failure: { kind: 'NONE', reasonCode: null, messageToken: null },
  nextAction: 'WAIT',
  personalizationAvailable: false,
  aggregateVersion: 2,
  refreshAfterSeconds: 5,
  supportCorrelationId: 'safe-correlation',
  ...overrides,
});

const presentation = (domain: WorkspacePreparationOrchestrationState | null) => ({
  loading: false,
  domain,
  error: null,
  retrying: false,
  personalizing: false,
  retry: mockRetry,
  reload: mockReload,
  preparePersonalizationHandoff: mockPreparePersonalizationHandoff,
});

describe('WorkspacePreparationScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the localized loading state', () => {
    mockUseWorkspacePreparation.mockReturnValue({
      ...presentation(null),
      loading: true,
    });
    const { getByText } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByText('onboarding.progressiveExperience.workspacePreparation.loading'))
      .toBeTruthy();
  });

  it('renders ordered progress with accessible status semantics', () => {
    mockUseWorkspacePreparation.mockReturnValue(presentation(buildDomain()));
    const { getByRole, getByText } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('progressbar').props.accessibilityValue).toEqual({
      min: 0, max: 100, now: 25,
    });
    expect(getByText('onboarding.progressiveExperience.workspacePreparation.units.TENANT_FOUNDATION'))
      .toBeTruthy();
    expect(mockUseWorkspacePreparation).toHaveBeenCalledWith('tenant-1', 'org-1');
  });

  it('announces indeterminate progress without fabricating a percentage', () => {
    mockUseWorkspacePreparation.mockReturnValue(
      presentation(buildDomain({
        progress: {
          completedUnits: [], remainingUnits: [
            'TENANT_FOUNDATION', 'ACCESS_FOUNDATION', 'ONBOARDING_FOUNDATION',
            'PERSONALIZATION_HANDOFF',
          ],
          currentUnit: 'TENANT_FOUNDATION', completed: 0, total: 4,
          percentage: 0, indeterminate: true,
        },
      }))
    );
    const { getByRole } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
    expect(getByRole('progressbar').props.accessibilityValue).toBeUndefined();
  });

  it('offers an accessible retry only for a retryable failure', () => {
    mockUseWorkspacePreparation.mockReturnValue(
      presentation(buildDomain({
        lifecycle: 'RETRYABLE_FAILURE',
        failure: { kind: 'RETRYABLE', reasonCode: 'safe_reason', messageToken: 'safe.token' },
        retry: { available: true, exhausted: false, used: 1, maximum: 3, remaining: 2 },
        nextAction: 'RETRY',
      }))
    );
    const { getByRole } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('exposes disabled semantics while retry is pending', () => {
    mockUseWorkspacePreparation.mockReturnValue({
      ...presentation(buildDomain({
        lifecycle: 'RETRYABLE_FAILURE',
        failure: { kind: 'RETRYABLE', reasonCode: 'safe_reason', messageToken: 'safe.token' },
        retry: { available: true, exhausted: false, used: 1, maximum: 3, remaining: 2 },
        nextAction: 'RETRY',
      })),
      retrying: true,
    });
    const { getByRole } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('button').props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(getByRole('button'));
    expect(mockRetry).not.toHaveBeenCalled();
  });

  it('fails safely without exposing a retry for a terminal failure', () => {
    mockUseWorkspacePreparation.mockReturnValue(
      presentation(buildDomain({
        lifecycle: 'TERMINAL_FAILURE',
        failure: { kind: 'TERMINAL', reasonCode: 'internal_reason', messageToken: 'safe.token' },
        retry: { available: false, exhausted: true, used: 3, maximum: 3, remaining: 0 },
        nextAction: 'CONTACT_SUPPORT',
      }))
    );
    const { queryByRole, getByText } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(queryByRole('button')).toBeNull();
    expect(getByText('onboarding.progressiveExperience.workspacePreparation.failure.safeMessage'))
      .toBeTruthy();
    expect(queryByRole('text', { name: 'internal_reason' })).toBeNull();
  });

  it('hands completed preparation to the existing personalization flow', async () => {
    mockPreparePersonalizationHandoff.mockResolvedValue(true);
    mockUseWorkspacePreparation.mockReturnValue(
      presentation(buildDomain({
        lifecycle: 'PERSONALIZATION_AVAILABLE',
        progress: {
          completedUnits: [
            'TENANT_FOUNDATION', 'ACCESS_FOUNDATION', 'ONBOARDING_FOUNDATION',
            'PERSONALIZATION_HANDOFF',
          ],
          remainingUnits: [], currentUnit: null, completed: 4, total: 4,
          percentage: 100, indeterminate: false,
        },
        nextAction: 'ENTER_PERSONALIZATION',
        personalizationAvailable: true,
      }))
    );
    const { getByRole } = render(
      <WorkspacePreparationScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button'));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/onboarding/wizard-flow?tenantId=tenant-1')
    );
  });
});
