import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import Index from '../../app/index';

const mockReplace = jest.fn();
const mockUseAuth = jest.fn();
const mockUseRegistrationStatus = jest.fn();
const mockUseOnboardingStatusQuery = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
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

const registrationStatus = (overrides: Record<string, unknown> = {}) => ({
  status: 'pending_review',
  action_required: false,
  updated_at: '2026-10-19T00:00:00Z',
  ...overrides,
});

describe('root registration lifecycle routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, currentUser: user(), logout: jest.fn() });
    mockUseOnboardingStatusQuery.mockReturnValue({ data: undefined, isLoading: false });
    mockUseRegistrationStatus.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('routes an authenticated tenant in onboarding to its existing setup journey and does not request applicant status', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      currentUser: user({ tenantId: 'tenant-1', applicationStatus: 'onboarding' }),
      logout: jest.fn(),
    });

    render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/setup-wizard?tenantId=tenant-1'));
    expect(mockUseRegistrationStatus).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('routes a tenantless approved applicant to Choice only from a valid server-selected continuation', async () => {
    mockUseRegistrationStatus.mockReturnValue({
      data: registrationStatus({
        status: 'approved',
        continuation: {
          kind: 'approved_choice',
          application_id: '550e8400-e29b-41d4-a716-446655440000',
          tenant_name: 'Nova Clinic',
        },
      }),
      isLoading: false,
      error: null,
    });

    render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding/choice'));
  });

  it('does not route approval without continuation to Choice', () => {
    mockUseRegistrationStatus.mockReturnValue({
      data: registrationStatus({ status: 'approved' }),
      isLoading: false,
      error: null,
    });

    const screen = render(<Index />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('applicationStatus.noClinic.title')).toBeTruthy();
  });

  it.each([
    ['pending_review', '/onboarding/pending-review'],
    ['rejected', '/onboarding/rejected'],
  ])('preserves the safe %s applicant destination without application IDs', async (status, route) => {
    mockUseRegistrationStatus.mockReturnValue({
      data: registrationStatus({ status }),
      isLoading: false,
      error: null,
    });

    render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(route));
  });

  it.each(['provisioning_pending', 'provisioning_in_progress', 'provisioning_completed', 'provisioning_recovery_required'])(
    'does not fabricate tenant context for %s',
    status => {
      mockUseRegistrationStatus.mockReturnValue({
        data: registrationStatus({ status }),
        isLoading: false,
        error: null,
      });

      const screen = render(<Index />);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByText('applicationStatus.noClinic.title')).toBeTruthy();
    },
  );

  it('does not navigate while registration status is loading or unavailable after an error', () => {
    mockUseRegistrationStatus.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const loading = render(<Index />);
    expect(loading.getByText('applicationStatus.loading')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    loading.unmount();

    mockUseRegistrationStatus.mockReturnValue({ data: undefined, isLoading: false, error: new Error('unavailable') });
    const failed = render(<Index />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(failed.getByText('applicationStatus.noClinic.title')).toBeTruthy();
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

  it('routes a hydrated Doctor tenant to the Doctor dashboard without no-clinic fallback', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      currentUser: user({
        tenantId: 'tenant-doctor',
        applicationStatus: 'active',
        roles: ['DOCTOR'],
      }),
      logout: jest.fn(),
    });
    const screen = render(<Index />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/doctor'));
    expect(screen.queryByText('applicationStatus.noClinic.title')).toBeNull();
    expect(mockUseRegistrationStatus).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
