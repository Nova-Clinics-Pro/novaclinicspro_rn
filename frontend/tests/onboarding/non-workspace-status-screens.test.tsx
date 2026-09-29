import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DraftApplicationScreen } from '../../features/onboarding/presentation/pages/DraftApplicationScreen';
import { PendingReviewScreen } from '../../features/onboarding/presentation/pages/PendingReviewScreen';
import { RejectedScreen } from '../../features/onboarding/presentation/pages/RejectedScreen';

const mockReplace = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockRefetch = jest.fn().mockResolvedValue({});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ applicationId: 'application-1' }),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { background: { default: '#fff' }, feedback: { warning: '#f90' }, text: { primary: '#000', secondary: '#666', onPrimary: '#fff' }, surface: { default: '#fff' }, primary: { default: '#060' }, border: { default: '#ddd' } },
    spacing: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    typography: { h3: {}, h6: {}, body1: {}, body2: {}, button: {} },
  }),
}));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: { userId: 'user-1' }, logout: mockLogout }),
}));
jest.mock('../../features/registration/presentation/hooks/useRegistrationStatus', () => ({
  useRegistrationStatus: () => ({ refetch: mockRefetch, isFetching: false }),
}));
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useApplicationDetailQuery: () => ({ data: { tenant_name: 'Clinic One' }, isLoading: false, error: null, refetch: mockRefetch }),
}));
jest.mock('../../features/onboarding/presentation/providers/onboarding.store', () => ({
  useOnboardingStore: () => ({ setCurrentApplicationId: jest.fn() }),
}));

describe('non-workspace application status screens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders DRAFT as registration attention, not application review, and signs out canonically', () => {
    const screen = render(<DraftApplicationScreen />);

    expect(screen.getByText('applicationStatus.draft.title')).toBeTruthy();
    expect(screen.queryByText('applicationStatus.pendingReview.title')).toBeNull();
    fireEvent.press(screen.getByTestId('application-status-sign-out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders PENDING_REVIEW separately, refreshes through the root gate, and signs out canonically', async () => {
    const screen = render(<PendingReviewScreen />);

    expect(screen.getByText('applicationStatus.pendingReview.title')).toBeTruthy();
    expect(screen.queryByText('applicationStatus.draft.title')).toBeNull();
    fireEvent.press(screen.getByTestId('application-status-refresh'));
    await Promise.resolve();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');

    fireEvent.press(screen.getByTestId('application-status-sign-out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps REJECTED as a separate terminal state with a canonical sign-out path', () => {
    const screen = render(<RejectedScreen />);

    expect(screen.getByText('applicationStatus.rejected.title')).toBeTruthy();
    expect(screen.queryByText('applicationStatus.pendingReview.title')).toBeNull();
    fireEvent.press(screen.getByTestId('application-status-sign-out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
