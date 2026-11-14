import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { changeErrorMessage, RolePermissionsScreen } from '../../features/rbac/presentation/pages/RolePermissionsScreen';
import { badgeFor, customizationCount, groupRolePermissions, permissionLabel } from '../../features/rbac/domain/rolePermissionPresentation';
import { changeLanguage, t } from '../../core/localization/i18n';
import type { RolePermissionItemDto } from '../../features/rbac/data/models/rolePermissions.dtos';

const item = (over: Partial<RolePermissionItemDto>): RolePermissionItemDto => ({
  code: 'appointment.read', name: 'Read Appointments', module: 'CORE', default_granted: true, override: null,
  effective: true, locked: false, ...over,
});

describe('role permission presentation', () => {
  beforeEach(() => changeLanguage('en-US'));

  it('labels permissions in the user\'s language and falls back to the backend name for unknown codes', () => {
    expect(permissionLabel(t, { code: 'appointment.create', name: 'x' })).toBe('Create appointments');
    expect(permissionLabel(t, { code: 'weird.thing', name: 'Weird Thing' })).toBe('Weird Thing');
    changeLanguage('hi-IN');
    expect(permissionLabel(t, { code: 'appointment.create', name: 'x' })).toBe('अपॉइंटमेंट बनाने');
  });

  it('shows a badge only when this clinic differs from the default', () => {
    expect(badgeFor({ default_granted: false, override: 'ADD' })).toBe('added');
    expect(badgeFor({ default_granted: true, override: 'REMOVE' })).toBe('removed');
    expect(badgeFor({ default_granted: true, override: null })).toBeNull();
    expect(badgeFor({ default_granted: true, override: 'ADD' })).toBeNull(); // redundant row: nothing to flag
  });

  it('groups by module with localized headings and sorted rows', () => {
    const groups = groupRolePermissions(t, [
      item({ code: 'inventory.read', name: 'Read Inventory', module: 'INVENTORY' }),
      item({ code: 'appointment.update', name: 'u' }),
      item({ code: 'appointment.cancel', name: 'c' }),
      item({ code: 'x.y', name: 'Mystery', module: 'brand_new' }),
    ]);
    expect(groups.map(g => g.title)).toEqual(['Brand new', 'Clinic operations', 'Inventory']);
    expect(groups[1].rows.map(r => r.label)).toEqual(['Cancel appointments', 'Update appointments']);
  });

  it('counts only real customizations', () => {
    expect(customizationCount([
      item({}), item({ override: 'REMOVE', effective: false }), item({ default_granted: false, override: 'ADD' }),
    ])).toBe(2);
  });
});

describe('changeErrorMessage', () => {
  const refusal = (code: string) => ({ response: { status: 403, data: { detail: { error_code: code } } } });

  it('explains each refusal in English and Hindi', () => {
    changeLanguage('en-US');
    expect(changeErrorMessage(t, refusal('ROLE_PERMISSION_LOCKED'))).toMatch(/Clinical authoring belongs to doctors/);
    expect(changeErrorMessage(t, refusal('ROLE_OWNER_PROTECTED'))).toMatch(/never be locked out/);
    changeLanguage('hi-IN');
    expect(changeErrorMessage(t, refusal('ROLE_PERMISSION_OWNER_ONLY_ADMIN_ONLY'))).toMatch(/स्वामी की है/);
  });

  it('never shows transport text', () => {
    changeLanguage('en-US');
    expect(changeErrorMessage(t, { message: 'Request failed with status code 500', response: { status: 500 } })).not.toMatch(/status code/);
  });
});

// ------------------------------------------------------------------------------------------ screen

const mockMutate = jest.fn();
const mockReset = jest.fn();
let mockPermissions: { data?: unknown; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void };
let mockRoles: { data?: unknown; isSuccess: boolean; isError: boolean; error?: unknown; refetch: () => void };

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: ({ title }: { title: string }) => { const { Text } = require('react-native'); return <Text>{title}</Text>; } }));
jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ currentUser: { tenantId: 'tenant-1', roles: [], ownedClinics: [{ tenantId: 'tenant-1' }] } }),
}));
jest.mock('../../features/rbac/data/repositories/rbac.repository.impl', () => ({ useTenantRolesQuery: () => mockRoles }));
jest.mock('../../features/rbac/data/repositories/rolePermissions.repository', () => ({
  useRolePermissionsQuery: () => mockPermissions,
  useSetRolePermissionMutation: () => ({ mutate: mockMutate, isPending: false }),
  useResetRolePermissionsMutation: () => ({ mutate: mockReset, isPending: false }),
}));

const view = (roleName: string, items: RolePermissionItemDto[]) => ({ role_id: 'r1', role_name: roleName, is_system: true, items });

describe('RolePermissionsScreen', () => {
  beforeEach(() => {
    changeLanguage('en-US');
    mockMutate.mockClear(); mockReset.mockClear();
    mockRoles = { data: { items: [{ id: 'r1', name: 'Nurse' }, { id: 'r2', name: 'Doctor' }] }, isSuccess: true, isError: false, refetch: jest.fn() };
    mockPermissions = { isLoading: false, isError: false, refetch: jest.fn(), data: view('Nurse', [
      item({ code: 'appointment.read' }),
      item({ code: 'appointment.create', default_granted: false, effective: false }),
      item({ code: 'prescription.create', default_granted: false, effective: false, locked: true }),
      item({ code: 'inventory.read', module: 'INVENTORY', default_granted: true, override: 'REMOVE', effective: false }),
    ]) };
  });

  it('shows the roles, the grouped permissions in plain language, badges and the locked reason', () => {
    const { getByText, getAllByText } = render(<RolePermissionsScreen />);
    expect(getByText('Nurse')).toBeTruthy();
    expect(getByText('Doctor')).toBeTruthy();
    expect(getByText('Create appointments')).toBeTruthy();
    expect(getByText('Removed by you')).toBeTruthy();
    expect(getAllByText("This can't be changed for this role.")).toHaveLength(1);
    expect(getByText('1 customized')).toBeTruthy();
  });

  it('grants a permission immediately and disables locked ones', () => {
    const { getByLabelText } = render(<RolePermissionsScreen />);
    fireEvent(getByLabelText('Create appointments'), 'valueChange', true);
    expect(mockMutate).toHaveBeenCalledWith({ code: 'appointment.create', enabled: true }, expect.anything());
    expect(getByLabelText('Create prescriptions').props.disabled).toBe(true);
  });

  it('asks before taking a permission away from a whole role', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByLabelText } = render(<RolePermissionsScreen />);
    fireEvent(getByLabelText('View appointments'), 'valueChange', false);
    expect(mockMutate).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Remove this permission?', 'Nurse will no longer be able to view appointments.', expect.any(Array));
    const confirm = (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find(b => b.text === 'Remove');
    confirm?.onPress?.();
    expect(mockMutate).toHaveBeenCalledWith({ code: 'appointment.read', enabled: false }, expect.anything());
    alert.mockRestore();
  });

  it('protects the owner role: no reset, an explanation instead', () => {
    mockPermissions = { ...mockPermissions, data: view('Clinic Owner', [item({ override: 'REMOVE', effective: false })]) };
    const { queryByText, getByText } = render(<RolePermissionsScreen />);
    expect(getByText("The Clinic Owner role can't be changed, so you can never be locked out.")).toBeTruthy();
    expect(queryByText('Reset to defaults')).toBeNull();
  });

  it('offers reset only when the clinic has customized the role', () => {
    const { getByText, queryByText, rerender } = render(<RolePermissionsScreen />);
    expect(getByText('Reset to defaults')).toBeTruthy();
    mockPermissions = { ...mockPermissions, data: view('Nurse', [item({})]) };
    rerender(<RolePermissionsScreen />);
    expect(queryByText('Reset to defaults')).toBeNull();
    expect(getByText('Following the defaults')).toBeTruthy();
  });

  it('shows the localized permission explanation, not a retry loop, when a non-owner opens it', () => {
    mockRoles = { isSuccess: false, isError: true, refetch: jest.fn(), error: {
      response: { status: 403, data: { detail: { error_code: 'MISSING_PERMISSION', details: {
        required_permission: 'role.manage_permissions', permitted_roles: ['Clinic Owner'], user_roles: ['Clinic Admin'] } } } } } };
    const { getByText, queryByText } = render(<RolePermissionsScreen />);
    expect(getByText("You don't have permission")).toBeTruthy();
    expect(queryByText('Retry')).toBeNull();
  });
});
