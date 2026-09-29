import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import Index from '../../app/index';

const mockReplace = jest.fn();
const mockUseAuth = jest.fn();
const mockUseRegistrationStatus = jest.fn();
const mockUseOnboardingStatusQuery = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('../../features/registration/presentation/hooks/useRegistrationStatus', () => ({
  useRegistrationStatus: (...args: unknown[]) => mockUseRegistrationStatus(...args),
}));
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOnboardingStatusQuery: (...args: unknown[]) => mockUseOnboardingStatusQuery(...args),
}));

const user = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-1',
  email: 'owner@example.com',
  tenantId: null,
  isOrgAdmin: false,
  applicationStatus: null,
  roles: ['clinic_owner'],
  ...overrides,
});

describe('root registration lifecycle routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, currentUser: user(), logout: jest.fn() });
    mockUseOnboardingStatusQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('routes a pending registration with no tenant to the dedicated review state, never no-clinic', async () => {
    mockUseRegistrationStatus.mockReturnValue({
      data: { status: 'registered', application_id: 'application-1', application_status: 'pending_review' },
      isLoading: false,
    });
    const screen = render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/pending-review?applicationId=application-1'));
    expect(screen.queryByText('applicationStatus.noClinic.title')).toBeNull();
  });

  it('keeps no-clinic for an authenticated user with neither tenant nor registration', () => {
    mockUseRegistrationStatus.mockReturnValue({ data: { status: 'no_applications' }, isLoading: false });
    const screen = render(<Index />);

    expect(screen.getByText('applicationStatus.noClinic.title')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each(['approved', 'onboarding'] as const)('routes %s registration through its authoritative onboarding tenant', async application_status => {
    mockUseRegistrationStatus.mockReturnValue({
      data: { status: 'registered', application_id: 'application-1', application_status, tenant_id: 'tenant-1' },
      isLoading: false,
    });
    render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-1'));
  });

  it('routes an active tenant session to its dashboard', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      currentUser: user({ tenantId: 'tenant-1', applicationStatus: 'active' }),
      logout: jest.fn(),
    });
    mockUseRegistrationStatus.mockReturnValue({ data: undefined, isLoading: false });

    render(<Index />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/clinic-admin'));
  });
});
