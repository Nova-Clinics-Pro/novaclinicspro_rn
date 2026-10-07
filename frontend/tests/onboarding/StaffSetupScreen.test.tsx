import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { axiosClient } from '../../core/api/axiosClient';
import { listOnboardingStaffApi } from '../../features/staff/data/datasources/staff.api';
import { staffKeys } from '../../features/staff/data/repositories/staff.repository.impl';
import { StaffSetupScreen } from '../../features/onboarding/presentation/pages/steps/StaffSetupScreen';
import { useWizardStore } from '../../features/onboarding/presentation/stores/wizard.store';

const mockRouterReplace = jest.fn();
const mockRouterBack = jest.fn();
const mockStaffQuery = jest.fn();
const mockSubmitStep = jest.fn();
const mockClearStepDraft = jest.fn().mockResolvedValue(undefined);

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockRouterReplace, back: mockRouterBack }),
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' },
      border: { default: '#E5E7EB' },
      text: {
        primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF', onPrimary: '#FFFFFF',
      },
      feedback: { error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    typography: {
      h4: { fontSize: 24 }, h6: { fontSize: 16 }, body2: { fontSize: 14 },
      caption: { fontSize: 12 }, button: { fontSize: 14 },
    },
  }),
}));

jest.mock('../../features/staff/data/repositories/staff.repository.impl', () => {
  const actual = jest.requireActual(
    '../../features/staff/data/repositories/staff.repository.impl'
  );
  return {
    ...actual,
    useOnboardingStaffQuery: (...args: unknown[]) => mockStaffQuery(...args),
  };
});

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useSubmitStepMutation: () => ({ mutateAsync: mockSubmitStep, isPending: false }),
}));

jest.mock('../../features/onboarding/presentation/stores/wizard.store', () => {
  const actual = jest.requireActual(
    '../../features/onboarding/presentation/stores/wizard.store'
  );
  return {
    ...actual,
    clearStepDraftAndSync: (...args: unknown[]) => mockClearStepDraft(...args),
  };
});

const mockGet = axiosClient.get as jest.Mock;

describe('StaffSetup datasource contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the canonical tenant-scoped staff endpoint and preserves array responses', async () => {
    const staff = [{ id: 'staff-1', name: 'Dr Rao', role: 'doctor' }];
    mockGet.mockResolvedValueOnce({ data: staff });

    await expect(listOnboardingStaffApi('tenant-a')).resolves.toEqual(staff);
    expect(mockGet).toHaveBeenCalledWith('/api/v1/clinic/tenant-a/staff');
  });

  it.each([{ items: [{ id: 'staff-1' }] }, null, undefined, 'invalid'])(
    'preserves the historical empty result for a successful non-array response',
    async (data) => {
      mockGet.mockResolvedValueOnce({ data });
      await expect(listOnboardingStaffApi('tenant-a')).resolves.toEqual([]);
    }
  );

  it('propagates read failures without fallback transport', async () => {
    const failure = { response: { status: 403 } };
    mockGet.mockRejectedValueOnce(failure);

    await expect(listOnboardingStaffApi('tenant-a')).rejects.toBe(failure);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('keeps onboarding staff query keys tenant-isolated', () => {
    expect(staffKeys.onboarding('tenant-a')).not.toEqual(staffKeys.onboarding('tenant-b'));
  });
});

describe('StaffSetupScreen query boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWizardStore.getState().reset();
    mockStaffQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    mockSubmitStep.mockResolvedValue({ next_step: 'next-step' });
  });

  it('keeps the loading state while the canonical Staff query is loading', () => {
    mockStaffQuery.mockReturnValue({ isLoading: true, isError: false });

    const { getByText } = render(<StaffSetupScreen tenantId="tenant-a" />);

    expect(getByText('Loading staff data...')).toBeTruthy();
    expect(mockStaffQuery).toHaveBeenCalledWith('tenant-a');
  });

  it('maps staff in source order without filtering roles', async () => {
    mockStaffQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: 'staff-1', name: 'Nurse One', role: 'nurse', phone: '111', email: 'n@example.com' },
        { id: 'staff-2', name: 'Doctor Two', role: 'doctor', specialization: 'Kayachikitsa', phone: '222', email: 'd@example.com' },
      ],
    });

    const { getByText, getByDisplayValue } = render(
      <StaffSetupScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByDisplayValue('Nurse One')).toBeTruthy());
    expect(getByDisplayValue('Doctor Two')).toBeTruthy();
    expect(getByDisplayValue('Kayachikitsa')).toBeTruthy();
    expect(getByText('Staff Member 1')).toBeTruthy();
    expect(getByText('Staff Member 2')).toBeTruthy();
  });

  it.each([
    { isLoading: false, isError: false, data: [] },
    { isLoading: false, isError: true, data: undefined },
  ])('restores the current-step draft for empty or failed reads', async (queryResult) => {
    useWizardStore.getState().setStepDraft('staff_setup', {
      staff_members: [{ name: 'Draft Doctor', role: 'doctor', specialization: 'Ayurveda', phone: '333', email: 'draft@example.com' }],
    });
    mockStaffQuery.mockReturnValue(queryResult);

    const { getByText, getByDisplayValue } = render(
      <StaffSetupScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('Unsaved changes restored')).toBeTruthy());
    expect(getByDisplayValue('Draft Doctor')).toBeTruthy();
    expect(getByDisplayValue('333')).toBeTruthy();
  });

  it('falls back to the legacy staff_and_roles draft alias', async () => {
    useWizardStore.getState().setStepDraft('staff_and_roles', {
      staff_members: [{ name: 'Legacy Nurse', role: 'nurse', phone: '444', email: 'legacy@example.com' }],
    });

    const { getByDisplayValue } = render(<StaffSetupScreen tenantId="tenant-a" />);

    await waitFor(() => expect(getByDisplayValue('Legacy Nurse')).toBeTruthy());
  });

  it('retains one default doctor row when no source or draft exists', async () => {
    const { getByText, getByPlaceholderText } = render(
      <StaffSetupScreen tenantId="tenant-a" />
    );

    await waitFor(() => expect(getByText('Add Staff Members')).toBeTruthy());
    expect(getByPlaceholderText('Enter staff name').props.value).toBe('');
    expect(getByText('Doctor').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF' })])
    );
  });

  it('completes onboarding before clearing drafts and navigating', async () => {
    mockStaffQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ id: 'staff-1', name: 'Dr Rao', role: 'doctor', specialization: 'Ayurveda', phone: '555', email: 'rao@example.com' }],
    });
    const { getByDisplayValue, getByText } = render(
      <StaffSetupScreen tenantId="tenant-a" />
    );
    await waitFor(() => expect(getByDisplayValue('Dr Rao')).toBeTruthy());

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());
    expect(mockSubmitStep).toHaveBeenCalledWith({
      data: {
        staff_members: [{
          name: 'Dr Rao', role: 'doctor', specialization: 'Ayurveda', phone: '555', email: 'rao@example.com',
        }],
      },
      mark_complete: true,
    });
    expect(mockClearStepDraft).toHaveBeenNthCalledWith(1, 'staff_setup');
    expect(mockClearStepDraft).toHaveBeenNthCalledWith(2, 'staff_and_roles');
    expect(mockSubmitStep.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearStepDraft.mock.invocationCallOrder[0]
    );
    expect(mockClearStepDraft.mock.invocationCallOrder[1]).toBeLessThan(
      mockRouterReplace.mock.invocationCallOrder[0]
    );
  });

  it('contains no direct presentation transport', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../features/onboarding/presentation/pages/steps/StaffSetupScreen.tsx'
      ),
      'utf8'
    );
    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
  });
});
