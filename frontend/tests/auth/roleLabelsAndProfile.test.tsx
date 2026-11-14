import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileScreen from '../../app/profile';
import { roleLabel, roleLabelsFor } from '../../features/auth/domain/roleLabels';
import { changeLanguage, t } from '../../core/localization/i18n';

let mockUser: Record<string, unknown> | null;

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../core/components/ProtectedRoute', () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ currentUser: mockUser, isLoading: false }),
}));

const owner = {
  userId: '918961a9-9298-41d9-9735-ee10663ef40a', fullName: 'Lekkala Haresh', email: 'owner@example.com',
  tenantId: '5aa4dcba-bc77-4424-a114-cc250643b8ec', clinicName: 'Haresh Clinic', roles: ['clinic_owner'],
  roleNames: ['Clinic Owner'], permissions: [], isOrgAdmin: false, ownedClinics: [],
};

describe('role labels', () => {
  beforeEach(() => changeLanguage('en-US'));

  it('turns codes and backend names into human-readable, localized labels', () => {
    expect(roleLabel(t, 'clinic_owner')).toBe('Clinic Owner');
    expect(roleLabel(t, 'Clinic Admin')).toBe('Clinic Admin');
    expect(roleLabel(t, 'billing_clerk')).toBe('Billing Clerk'); // unknown role: readable fallback
    changeLanguage('hi-IN');
    expect(roleLabel(t, 'Clinic Owner')).toBe('क्लिनिक स्वामी');
  });

  it('prefers the backend names and collapses the same role reported twice', () => {
    expect(roleLabelsFor(t, { roles: ['clinic_owner', 'doctor'], roleNames: ['Clinic Owner'] })).toEqual(['Clinic Owner']);
    expect(roleLabelsFor(t, { roles: ['doctor', 'DOCTOR'] })).toEqual(['Doctor']);
    expect(roleLabelsFor(t, { roles: [] })).toEqual([]);
  });
});

describe('My Profile', () => {
  beforeEach(() => { changeLanguage('en-US'); mockUser = owner; });

  it('shows the role under the name, the clinic by name, and no raw ids', () => {
    const { getAllByText, getByText, queryByText } = render(<ProfileScreen />);
    expect(getAllByText('Clinic Owner').length).toBeGreaterThanOrEqual(2); // under the name and as the role tag
    expect(getByText('Haresh Clinic')).toBeTruthy();
    expect(queryByText(/Tenant:/)).toBeNull();
    expect(queryByText('User ID')).toBeNull();
    expect(queryByText(/918961a9/)).toBeNull();
  });

  it('shows the email only in the account details, not under the name', () => {
    const { getAllByText } = render(<ProfileScreen />);
    expect(getAllByText('owner@example.com')).toHaveLength(1);
  });

  it('says so when no role is assigned', () => {
    mockUser = { ...owner, roles: [], roleNames: [] };
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('No roles assigned')).toBeTruthy();
  });

  it('shows the roles in Hindi when the user chose Hindi', () => {
    changeLanguage('hi-IN');
    const { getAllByText } = render(<ProfileScreen />);
    expect(getAllByText('क्लिनिक स्वामी').length).toBeGreaterThanOrEqual(2);
  });
});
