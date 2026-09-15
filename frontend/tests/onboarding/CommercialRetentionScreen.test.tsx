import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import {
  CommercialRetention,
  CommercialTrialError,
} from '../../features/commercialPlatform/contracts/commercial-trial';
import { CommercialRetentionScreen } from '../../features/onboarding/presentation/pages/CommercialRetentionScreen';

const mockUseCommercialRetentionQuery = jest.fn();
const mockActivate = jest.fn();
const mockRequestExtension = jest.fn();
const mockGrantExtension = jest.fn();
const mockUseActivateMutation = jest.fn();
const mockUseRequestExtensionMutation = jest.fn();
const mockUseGrantExtensionMutation = jest.fn();
const mockUseOrganizationContextQuery = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock(
  '../../features/commercialPlatform',
  () => ({
    CommercialTrialError: jest.requireActual(
      '../../features/commercialPlatform/contracts/commercial-trial'
    ).CommercialTrialError,
    useCommercialRetentionQuery: (...args: unknown[]) =>
      mockUseCommercialRetentionQuery(...args),
    useActivateCommercialTrialMutation: (...args: unknown[]) =>
      mockUseActivateMutation(...args),
    useRequestCommercialTrialExtensionMutation: (...args: unknown[]) =>
      mockUseRequestExtensionMutation(...args),
    useGrantCommercialTrialExtensionMutation: (...args: unknown[]) =>
      mockUseGrantExtensionMutation(...args),
  })
);
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'en-US',
    t: (token: string) => token,
  }),
}));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      background: { default: '#fff' },
      surface: { default: '#fff', overlay: '#0008' },
      primary: { default: '#111', light: '#eee', onPrimary: '#fff' },
      text: { primary: '#111', secondary: '#555' },
      feedback: {
        success: '#080',
        warning: '#850',
        warningLight: '#ffe',
        error: '#800',
      },
      border: { subtle: '#ddd', default: '#ccc' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h3: { fontSize: 24 },
      h4: { fontSize: 20 },
      h5: { fontSize: 18 },
      h6: { fontSize: 16 },
      body1: { fontSize: 16 },
      body2: { fontSize: 14 },
      button: { fontSize: 16 },
    },
  }),
}));
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOrganizationContextQuery: () => mockUseOrganizationContextQuery(),
}));

const ROOT = 'onboarding.progressiveExperience.commercialRetention';

const retention = (
  overrides: Partial<CommercialRetention> = {}
): CommercialRetention => ({
  contractVersion: 'commercial_trial_v1',
  trialId: 'trial-secret',
  organizationId: 'org-1',
  tenantId: 'tenant-1',
  commercialState: 'ARCHIVED',
  aggregateVersion: 8,
  archivedAt: '2026-07-01T10:00:00Z',
  retentionUntil: '2026-09-29T10:00:00Z',
  restoreEligible: true,
  permanentDeletionEligible: false,
  extensionEligible: true,
  workspaceDataExportRequestPermitted: false,
  legalHoldActive: false,
  statutoryRetentionActive: false,
  allowedActions: ['GRANT_EXTENSION', 'RESTORE_WORKSPACE'],
  ineligibilityReasons: ['RETENTION_PERIOD_ACTIVE'],
  ...overrides,
});

const query = (
  data: CommercialRetention | undefined,
  error: Error | null = null
) => ({
  data,
  error,
  isPending: false,
  refetch: jest.fn().mockResolvedValue({ data, error: null }),
});

describe('CommercialRetentionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrganizationContextQuery.mockReturnValue({
      data: {
        effectiveOrganizationId: 'org-1',
        effectiveTenantId: 'tenant-1',
        selectionRequired: false,
        sessionRefreshRequired: false,
      },
      error: null,
      isPending: false,
      refetch: jest.fn(),
    });
    mockUseCommercialRetentionQuery.mockReturnValue(query(retention()));
    mockUseActivateMutation.mockReturnValue({
      mutateAsync: mockActivate,
      isPending: false,
    });
    mockUseRequestExtensionMutation.mockReturnValue({
      mutateAsync: mockRequestExtension,
      isPending: false,
    });
    mockUseGrantExtensionMutation.mockReturnValue({
      mutateAsync: mockGrantExtension,
      isPending: false,
    });
    mockActivate.mockResolvedValue({});
    mockRequestExtension.mockResolvedValue({});
    mockGrantExtension.mockResolvedValue({});
  });

  it.each([
    'ACTIVE',
    'EXPIRED',
    'SUSPENDED',
    'ARCHIVED',
    'DELETED',
  ] as const)('renders the backend-authoritative %s status', (state) => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ commercialState: state }))
    );
    const { getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByText(`${ROOT}.states.${state}`)).toBeTruthy();
    expect(getByText(`${ROOT}.stateDescriptions.${state}`)).toBeTruthy();
    expect(mockUseCommercialRetentionQuery).toHaveBeenCalledWith(
      'org-1',
      'tenant-1'
    );
  });

  it('uses the localized loading primitive', () => {
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(undefined),
      isPending: true,
    });
    const { getByRole, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('progressbar').props.accessibilityState).toEqual({
      busy: true,
    });
    expect(getByText(`${ROOT}.loading`)).toBeTruthy();
  });

  it('fails closed when workspace scope is missing', () => {
    const { getByRole, getByText } = render(
      <CommercialRetentionScreen organizationId="" tenantId="" />
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByText(`${ROOT}.empty.permissionDenied`)).toBeTruthy();
  });

  it.each([
    ['FORBIDDEN', 'permissionDenied'],
    ['NOT_FOUND', 'missingWorkspace'],
    ['RETENTION_EVIDENCE_UNAVAILABLE', 'missingEvidence'],
    ['UNSUPPORTED_CONTRACT', 'unsupported'],
    ['BACKEND_FAILURE', 'network'],
  ] as const)('maps %s to a localized safe empty state', (kind, message) => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(
        undefined,
        new CommercialTrialError(
          kind,
          `commercial_trial.${kind.toLowerCase()}`,
          `errors.${kind}`,
          false
        )
      )
    );
    const { getByRole, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByText(`${ROOT}.empty.${message}`)).toBeTruthy();
  });

  it('renders exactly the backend action collection without identifiers or export artifacts', () => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(
        retention({
          allowedActions: [
            'REQUEST_EXTENSION',
            'REQUEST_WORKSPACE_DATA_EXPORT',
            'CONTACT_SUPPORT',
          ],
        })
      )
    );
    const { getByText, queryByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByText(`${ROOT}.actionLabels.REQUEST_EXTENSION`)).toBeTruthy();
    expect(
      getByText(`${ROOT}.actionLabels.REQUEST_WORKSPACE_DATA_EXPORT`)
    ).toBeTruthy();
    expect(getByText(`${ROOT}.actionLabels.CONTACT_SUPPORT`)).toBeTruthy();
    expect(queryByText(`${ROOT}.actionLabels.GRANT_EXTENSION`)).toBeNull();
    expect(queryByText('trial-secret')).toBeNull();
    expect(queryByText(/download|package|artifact/i)).toBeNull();
  });

  it('announces backend ineligibility reasons without exposing raw enums', () => {
    const { getByRole, getByText, queryByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(
      getByText(`${ROOT}.ineligibilityReasons.RETENTION_PERIOD_ACTIVE`)
    ).toBeTruthy();
    expect(queryByText('RETENTION_PERIOD_ACTIVE')).toBeNull();
  });

  it('omits missing dates and nullable hold evidence instead of inventing values', () => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(
        retention({
          archivedAt: null,
          retentionUntil: null,
          legalHoldActive: null,
          statutoryRetentionActive: null,
          ineligibilityReasons: [],
        })
      )
    );
    const { getByText, queryByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByText(`${ROOT}.retention.notApplicable`)).toBeTruthy();
    expect(queryByText(`${ROOT}.retention.archivedAt`)).toBeNull();
    expect(queryByText(`${ROOT}.retention.retentionUntil`)).toBeNull();
  });

  it('exposes an ordered accessible screen and backend action summaries', () => {
    const { getByLabelText, getAllByLabelText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(getByLabelText(`${ROOT}.accessibility.screen`)).toBeTruthy();
    expect(
      getAllByLabelText(
        new RegExp(`${ROOT}\\.actionLabels\\.(GRANT_EXTENSION|RESTORE_WORKSPACE)`)
      )
    ).toHaveLength(2);
  });

  it('starts the trial only after explicit confirmation and refreshes authority', async () => {
    const refetch = jest.fn().mockResolvedValue({
      data: retention({ commercialState: 'ACTIVE', allowedActions: [] }),
    });
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] })),
      refetch,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    expect(mockActivate).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2];
    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    expect(mockActivate).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateVersion: 8, confirmed: true })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(getByText(`${ROOT}.workflow.startTrial.success`)).toBeTruthy();
    alert.mockRestore();
  });

  it('invokes host completion only after the authoritative commercial refresh is eligible', async () => {
    const completeAfterEligibility = jest.fn().mockResolvedValue(undefined);
    const refetch = jest.fn().mockResolvedValue({
      data: retention({ commercialState: 'ACTIVE', allowedActions: [] }),
      error: null,
    });
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] })),
      refetch,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole } = render(
      <CommercialRetentionScreen
        tenantId="tenant-1"
        onCommercialEligibilityConfirmed={completeAfterEligibility}
      />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    await act(async () => {
      await alert.mock.calls[0][2]?.[1]?.onPress?.();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(completeAfterEligibility).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('does not invoke host completion when the authoritative commercial refresh fails', async () => {
    const completeAfterEligibility = jest.fn().mockResolvedValue(undefined);
    const refetch = jest.fn().mockResolvedValue({ data: undefined, error: new Error('offline') });
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] })),
      refetch,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole } = render(
      <CommercialRetentionScreen
        tenantId="tenant-1"
        onCommercialEligibilityConfirmed={completeAfterEligibility}
      />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    await act(async () => {
      await alert.mock.calls[0][2]?.[1]?.onPress?.();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(completeAfterEligibility).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('allows a completion retry after a host completion failure without reactivating the trial', async () => {
    const completeAfterEligibility = jest
      .fn()
      .mockRejectedValueOnce(new Error('session refresh unavailable'))
      .mockResolvedValueOnce(undefined);
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ commercialState: 'ACTIVE', allowedActions: [] }))
    );
    const { getByRole } = render(
      <CommercialRetentionScreen
        tenantId="tenant-1"
        onCommercialEligibilityConfirmed={completeAfterEligibility}
      />
    );

    const continueButton = getByRole('button', {
      name: /readyToStart\.presentation\.actions\.continue/,
    });
    await act(async () => {
      fireEvent.press(continueButton);
    });
    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(completeAfterEligibility).toHaveBeenCalledTimes(2);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it('fails closed when authoritative organization context does not match the requested tenant', () => {
    mockUseOrganizationContextQuery.mockReturnValue({
      data: {
        effectiveOrganizationId: 'org-1',
        effectiveTenantId: 'tenant-2',
        selectionRequired: false,
        sessionRefreshRequired: false,
      },
      error: null,
      isPending: false,
      refetch: jest.fn(),
    });

    const { getByRole, getByText } = render(
      <CommercialRetentionScreen tenantId="tenant-1" />
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByText(`${ROOT}.empty.permissionDenied`)).toBeTruthy();
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it('cancels trial activation without submitting', () => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] }))
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    alert.mock.calls[0][2]?.[0]?.onPress?.();

    expect(mockActivate).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('submits a trimmed Organization Admin extension request and refreshes authority', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: retention() });
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ allowedActions: ['REQUEST_EXTENSION'] })),
      refetch,
    });
    const { getByRole, getByLabelText, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.REQUEST_EXTENSION/ }));
    fireEvent.changeText(
      getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
      '  Need time to finish setup  '
    );
    await act(async () => {
      fireEvent.press(getByRole('button', { name: `${ROOT}.workflow.extension.submit` }));
    });

    expect(mockRequestExtension).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Need time to finish setup',
        channel: 'IN_APP_REQUEST',
      })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(getByText(`${ROOT}.workflow.extension.success`)).toBeTruthy();
  });

  it.each(['', ' '.repeat(3), 'a'.repeat(161)])(
    'rejects invalid extension reason %# without submitting',
    async (reason) => {
      mockUseCommercialRetentionQuery.mockReturnValue(
        query(retention({ allowedActions: ['REQUEST_EXTENSION'] }))
      );
      const { getByRole, getByLabelText, getByText } = render(
        <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
      );

      fireEvent.press(getByRole('button', { name: /actionLabels\.REQUEST_EXTENSION/ }));
      fireEvent.changeText(getByLabelText(`${ROOT}.workflow.extension.reasonLabel`), reason);
      await act(async () => {
        fireEvent.press(getByRole('button', { name: `${ROOT}.workflow.extension.submit` }));
      });

      expect(mockRequestExtension).not.toHaveBeenCalled();
      expect(getByText(`${ROOT}.workflow.extension.reasonError`)).toBeTruthy();
    }
  );

  it('submits Super Admin grant inputs with the selected approved channel', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: retention() });
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ allowedActions: ['GRANT_EXTENSION'] })),
      refetch,
    });
    const { getByRole, getByLabelText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.GRANT_EXTENSION/ }));
    fireEvent.changeText(
      getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
      'Verified customer success request'
    );
    fireEvent.changeText(getByLabelText(`${ROOT}.workflow.extension.daysLabel`), '14');
    fireEvent.press(
      getByRole('radio', { name: `${ROOT}.workflow.extension.channels.CUSTOMER_SUCCESS` })
    );
    await act(async () => {
      fireEvent.press(getByRole('button', { name: `${ROOT}.workflow.extension.submit` }));
    });

    expect(mockGrantExtension).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateVersion: 8,
        extensionDays: 14,
        reason: 'Verified customer success request',
        channel: 'CUSTOMER_SUCCESS',
      })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it.each(['0', '31', '1.5'])(
    'rejects invalid extension duration %s without submitting',
    async (duration) => {
      mockUseCommercialRetentionQuery.mockReturnValue(
        query(retention({ allowedActions: ['GRANT_EXTENSION'] }))
      );
      const { getByRole, getByLabelText, getByText } = render(
        <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
      );

      fireEvent.press(getByRole('button', { name: /actionLabels\.GRANT_EXTENSION/ }));
      fireEvent.changeText(
        getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
        'Verified operational request'
      );
      fireEvent.changeText(
        getByLabelText(`${ROOT}.workflow.extension.daysLabel`),
        duration
      );
      fireEvent.press(
        getByRole('radio', { name: `${ROOT}.workflow.extension.channels.SUPPORT` })
      );
      await act(async () => {
        fireEvent.press(
          getByRole('button', { name: `${ROOT}.workflow.extension.submit` })
        );
      });

      expect(mockGrantExtension).not.toHaveBeenCalled();
      expect(getByText(`${ROOT}.workflow.extension.daysError`)).toBeTruthy();
    }
  );

  it.each(['1', '30'])(
    'accepts approved extension duration boundary %s',
    async (duration) => {
      mockUseCommercialRetentionQuery.mockReturnValue(
        query(retention({ allowedActions: ['GRANT_EXTENSION'] }))
      );
      const { getByRole, getByLabelText } = render(
        <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
      );

      fireEvent.press(getByRole('button', { name: /actionLabels\.GRANT_EXTENSION/ }));
      fireEvent.changeText(
        getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
        'Verified operational request'
      );
      fireEvent.changeText(
        getByLabelText(`${ROOT}.workflow.extension.daysLabel`),
        duration
      );
      fireEvent.press(
        getByRole('radio', { name: `${ROOT}.workflow.extension.channels.SUPPORT` })
      );
      await act(async () => {
        fireEvent.press(
          getByRole('button', { name: `${ROOT}.workflow.extension.submit` })
        );
      });

      expect(mockGrantExtension).toHaveBeenCalledWith(
        expect.objectContaining({ extensionDays: Number(duration), channel: 'SUPPORT' })
      );
    }
  );

  it('fails closed when no approved extension channel is selected', async () => {
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ allowedActions: ['GRANT_EXTENSION'] }))
    );
    const { getByRole, getByLabelText, getByText, queryByRole } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.GRANT_EXTENSION/ }));
    fireEvent.changeText(
      getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
      'Verified operational request'
    );
    fireEvent.changeText(getByLabelText(`${ROOT}.workflow.extension.daysLabel`), '14');

    expect(
      queryByRole('radio', { name: `${ROOT}.workflow.extension.channels.UNKNOWN` })
    ).toBeNull();
    await act(async () => {
      fireEvent.press(
        getByRole('button', { name: `${ROOT}.workflow.extension.submit` })
      );
    });

    expect(mockGrantExtension).not.toHaveBeenCalled();
    expect(getByText(`${ROOT}.workflow.extension.channelError`)).toBeTruthy();
  });

  it('prevents duplicate action dispatch while a mutation is pending', () => {
    mockUseActivateMutation.mockReturnValue({
      mutateAsync: mockActivate,
      isPending: true,
    });
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] }))
    );
    const { getByRole } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );
    const action = getByRole('button', { name: /actionLabels\.START_TRIAL/ });

    expect(action.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(action);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it('guards rapid duplicate activation confirmation before hook state rerenders', async () => {
    let resolveActivation: (() => void) | undefined;
    mockActivate.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveActivation = resolve;
      })
    );
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ commercialState: 'ELIGIBLE', allowedActions: ['START_TRIAL'] }))
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    const confirm = alert.mock.calls[0][2]?.[1]?.onPress;
    let firstSubmission: void | Promise<void> = undefined;
    await act(async () => {
      firstSubmission = confirm?.();
      confirm?.();
      await Promise.resolve();
    });

    expect(mockActivate).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveActivation?.();
      await firstSubmission;
    });
    alert.mockRestore();
  });

  it('shows an accessible loading state while an extension submits', () => {
    mockUseRequestExtensionMutation.mockReturnValue({
      mutateAsync: mockRequestExtension,
      isPending: true,
    });
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ allowedActions: ['REQUEST_EXTENSION'] }))
    );
    const { getByRole } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    expect(
      getByRole('button', { name: /actionLabels\.REQUEST_EXTENSION/ }).props
        .accessibilityState
    ).toEqual({ disabled: true, busy: true });
  });

  it.each([
    ['FORBIDDEN', 'permissionDenied'],
    ['INVALID_AGGREGATE', 'notAvailable'],
  ] as const)('maps mutation %s to a safe localized error', async (kind, token) => {
    mockRequestExtension.mockRejectedValue(
      new CommercialTrialError(kind, `commercial_trial.${kind}`, 'internal', false)
    );
    mockUseCommercialRetentionQuery.mockReturnValue(
      query(retention({ allowedActions: ['REQUEST_EXTENSION'] }))
    );
    const { getByRole, getByLabelText, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.REQUEST_EXTENSION/ }));
    fireEvent.changeText(
      getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
      'Operational reason'
    );
    await act(async () => {
      fireEvent.press(getByRole('button', { name: `${ROOT}.workflow.extension.submit` }));
    });

    await waitFor(() =>
      expect(getByText(`${ROOT}.workflow.errors.${token}`)).toBeTruthy()
    );
  });

  it('refreshes stale authority once after a conflict without retrying the mutation', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: retention() });
    mockRequestExtension.mockRejectedValue(
      new CommercialTrialError(
        'CONFLICT',
        'commercial_trial.conflict',
        'internal',
        false
      )
    );
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(retention({ allowedActions: ['REQUEST_EXTENSION'] })),
      refetch,
    });
    const { getByRole, getByLabelText, getByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.REQUEST_EXTENSION/ }));
    fireEvent.changeText(
      getByLabelText(`${ROOT}.workflow.extension.reasonLabel`),
      'Operational reason'
    );
    await act(async () => {
      fireEvent.press(
        getByRole('button', { name: `${ROOT}.workflow.extension.submit` })
      );
    });

    expect(mockRequestExtension).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(getByText(`${ROOT}.workflow.errors.conflict`)).toBeTruthy();
  });

  it('keeps activation fail-closed after an authorization failure', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: retention() });
    mockActivate.mockRejectedValue(
      new CommercialTrialError(
        'FORBIDDEN',
        'commercial_trial.forbidden',
        'internal-sensitive-detail',
        false
      )
    );
    mockUseCommercialRetentionQuery.mockReturnValue({
      ...query(
        retention({
          commercialState: 'ELIGIBLE',
          allowedActions: ['START_TRIAL'],
        })
      ),
      refetch,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByRole, getByText, queryByText } = render(
      <CommercialRetentionScreen organizationId="org-1" tenantId="tenant-1" />
    );

    fireEvent.press(getByRole('button', { name: /actionLabels\.START_TRIAL/ }));
    await act(async () => {
      await alert.mock.calls[0][2]?.[1]?.onPress?.();
    });

    expect(mockActivate).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
    expect(getByText(`${ROOT}.workflow.errors.permissionDenied`)).toBeTruthy();
    expect(getByText(`${ROOT}.states.ELIGIBLE`)).toBeTruthy();
    expect(queryByText('internal-sensitive-detail')).toBeNull();
    alert.mockRestore();
  });
});
