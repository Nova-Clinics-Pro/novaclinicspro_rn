import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import CommercialRetentionRoute from '../../app/onboarding/commercial-retention';

const mockComplete = jest.fn();
const mockRefreshSession = jest.fn();
const mockResetDraft = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ tenantId: 'tenant-1' }),
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ refreshSession: mockRefreshSession }),
}));
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useCompleteSetupMutation: () => ({ mutateAsync: mockComplete, isPending: false }),
}));
jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => ({
  resetWizardDraftStorage: (...args: unknown[]) => mockResetDraft(...args),
}));
jest.mock('../../features/onboarding/presentation/pages/CommercialRetentionScreen', () => ({
  CommercialRetentionScreen: ({ onCommercialEligibilityConfirmed }: {
    onCommercialEligibilityConfirmed: () => Promise<void>;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest factory must resolve this lazily.
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="complete-after-commercial-eligibility"
        onPress={() => void onCommercialEligibilityConfirmed().catch(() => undefined)}
      >
        <Text>Complete</Text>
      </Pressable>
    );
  },
}));

describe('CommercialRetentionRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockComplete.mockResolvedValue(undefined);
    mockResetDraft.mockResolvedValue(undefined);
    mockRefreshSession.mockResolvedValue(undefined);
  });

  it('completes only after commercial eligibility, refreshes /auth/me, then returns to the existing root router', async () => {
    const { getByRole } = render(<CommercialRetentionRoute />);
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'complete-after-commercial-eligibility' }));
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockResetDraft).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not navigate when the authoritative session refresh fails', async () => {
    mockRefreshSession.mockRejectedValueOnce(new Error('refresh failed'));
    const { getByRole } = render(<CommercialRetentionRoute />);
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'complete-after-commercial-eligibility' }));
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockResetDraft).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
