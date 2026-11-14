import React from 'react';
import { render } from '@testing-library/react-native';

import { dashboardsFor, mayOpenDashboard, resolveDashboardRoute } from '../../features/auth/domain/dashboardRoute';

describe('resolveDashboardRoute', () => {
  it('sends owners, admins and the front desk to the clinic-admin dashboard, however the role is written', () => {
    for (const role of ['clinic_owner', 'Clinic Owner', 'clinic-admin', 'Clinic Admin', 'receptionist', 'tenant_admin']) {
      expect(resolveDashboardRoute([role])).toBe('/clinic-admin');
    }
  });

  it('sends a doctor or therapist to their own dashboard', () => {
    expect(resolveDashboardRoute(['doctor'])).toBe('/doctor');
    expect(resolveDashboardRoute(['Therapist'])).toBe('/therapist');
  });

  it('looks at every role, owner first (an owner who is also a therapist lands on clinic-admin)', () => {
    expect(resolveDashboardRoute(['therapist', 'clinic_owner'])).toBe('/clinic-admin');
    expect(resolveDashboardRoute(['staff', 'doctor'])).toBe('/doctor');
  });

  it('a user with two roles may open both dashboards (they land on the higher-priority one)', () => {
    expect(dashboardsFor(['therapist', 'doctor'])).toEqual(['/doctor', '/therapist']);
    expect(mayOpenDashboard(['therapist', 'doctor'], '/therapist')).toBe(true);
    expect(mayOpenDashboard(['therapist', 'doctor'], '/doctor')).toBe(true);
    expect(mayOpenDashboard(['clinic_owner', 'therapist'], '/clinic-admin')).toBe(true);
    expect(mayOpenDashboard(['doctor'], '/clinic-admin')).toBe(false);
    expect(mayOpenDashboard(['staff'], '/doctor')).toBe(false);
  });

  it('has no dashboard for roles that have none, and says so with null instead of defaulting', () => {
    expect(resolveDashboardRoute(['staff'])).toBeNull();
    expect(dashboardsFor(['staff'])).toEqual([]);
    expect(resolveDashboardRoute(['Nurse', 'Pharmacist'])).toBeNull();
  });

  it('keeps the old default for a user with no roles at all (a freshly registered owner)', () => {
    expect(resolveDashboardRoute([])).toBe('/clinic-admin');
    expect(resolveDashboardRoute(undefined)).toBe('/clinic-admin');
  });
});

// --- the home route must explain, not redirect, for a role without a dashboard -------------------------------------
const mockReplace = jest.fn();
let mockUser: Record<string, unknown> | null = null;

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../core/localization/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: !!mockUser, isLoading: false, currentUser: mockUser, logout: jest.fn() }),
}));
jest.mock('../../features/registration/presentation/hooks/useRegistrationStatus', () => ({
  useRegistrationStatus: () => ({ data: undefined, isLoading: false }),
}));
const mockOnboardingOptions: Record<string, unknown>[] = [];
jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useOnboardingStatusQuery: (_tenantId: string, options: Record<string, unknown>) => {
    mockOnboardingOptions.push(options);
    return { data: undefined, isLoading: false };
  },
}));

import Index from '../../app/index';

describe('home route', () => {
  beforeEach(() => mockReplace.mockClear());
  const user = (roles: string[]) => ({
    email: 'a@example.com', tenantId: 't1', roles, isOrgAdmin: false, applicationStatus: 'active',
  });

  it('explains instead of redirecting for a Staff user (this was an endless redirect loop)', () => {
    mockUser = user(['staff']);
    const screen = render(<Index />);
    expect(screen.getByText('applicationStatus.noDashboard.title')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not ask for the onboarding status when /auth/me already says where to go, and never as a global error', () => {
    mockOnboardingOptions.length = 0;
    mockUser = user(['staff']); // lacks tenant.read: that request would be refused
    render(<Index />);
    const options = mockOnboardingOptions[mockOnboardingOptions.length - 1];
    expect(options.enabled).toBe(false);
    expect(options.meta).toEqual({ apiFailurePresentation: 'feature' });
  });

  it('still routes a doctor and an owner to their dashboards', () => {
    mockUser = user(['doctor']);
    render(<Index />);
    expect(mockReplace).toHaveBeenCalledWith('/doctor');
    mockReplace.mockClear();
    mockUser = user(['clinic_owner']);
    render(<Index />);
    expect(mockReplace).toHaveBeenCalledWith('/clinic-admin');
  });
});
