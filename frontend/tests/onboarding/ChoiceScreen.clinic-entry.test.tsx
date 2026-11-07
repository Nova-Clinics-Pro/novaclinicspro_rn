import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import mockEnUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';
import { ChoiceScreen } from '../../features/onboarding/presentation/pages/ChoiceScreen';

const mockReplace = jest.fn();
const mockRefetch = jest.fn();
const mockSetCurrentApplicationId = jest.fn();
const mockUseApplicationDetailQuery = jest.fn();
const mockApplicationDetailQueryFn = jest.fn();
const mockUseAuth = jest.fn();
const mockUseRegistrationStatus = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseClinicEntryOrchestration = jest.fn();
const mockSubmitNewClinic = jest.fn();
const mockSubmitBringClinic = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#primary', soft: '#primary-soft', onPrimary: '#on-primary' },
      background: { default: '#background' },
      surface: { default: '#surface' },
      border: { default: '#border' },
      text: {
        primary: '#primary-text',
        secondary: '#secondary-text',
        tertiary: '#tertiary-text',
      },
      feedback: {
        success: '#success',
        info: '#info',
        infoLight: '#info-light', error: '#error',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h3: { fontSize: 24 },
      h5: { fontSize: 18 },
      h6: { fontSize: 16 },
      body1: { fontSize: 16 },
      body2: { fontSize: 14 },
      caption: { fontSize: 12 },
    },
  }),
}));

jest.mock('../../core/localization/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.split('.').reduce((value: any, segment) => value?.[segment], mockEnUS) ?? key,
  }),
}));

jest.mock('../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../features/registration/presentation/hooks/useRegistrationStatus', () => ({
  useRegistrationStatus: (...args: unknown[]) => mockUseRegistrationStatus(...args),
}));

jest.mock('../../features/onboarding/data/repositories/onboarding.repository.impl', () => ({
  useApplicationDetailQuery: (...args: unknown[]) => mockUseApplicationDetailQuery(...args),
}));

jest.mock('../../features/onboarding/presentation/providers/onboarding.store', () => ({
  useOnboardingStore: () => ({ setCurrentApplicationId: mockSetCurrentApplicationId }),
}));

jest.mock('../../features/onboarding/presentation/hooks/useClinicEntryOrchestration', () => ({
  useClinicEntryOrchestration: () => mockUseClinicEntryOrchestration(),
}));

describe('ChoiceScreen Clinic Entry presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseAuth.mockReturnValue({ currentUser: { userId: 'user-1', applicationStatus: 'approved' } });
    mockUseRegistrationStatus.mockReturnValue({
      data: {
        status: 'approved',
        action_required: false,
        updated_at: '2026-10-19T00:00:00Z',
        continuation: {
          kind: 'approved_choice',
          application_id: '11111111-1111-4111-8111-111111111111',
          tenant_name: 'Nova Clinic',
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseApplicationDetailQuery.mockImplementation((applicationId: string, options?: { enabled?: boolean }) => {
      if (options?.enabled) mockApplicationDetailQueryFn(applicationId);
      return {
        data: { id: '11111111-1111-4111-8111-111111111111', tenant_name: 'Nova Clinic' },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };
    });
    mockUseClinicEntryOrchestration.mockReturnValue({
      state: 'idle', errorToken: null, organizations: [], organizationId: 'org-1',
      setSelectedOrganizationId: jest.fn(), tenantChoices: [], isLoadingContext: false,
      contextError: null, submitNewClinic: mockSubmitNewClinic,
      submitBringClinic: mockSubmitBringClinic, resumePending: jest.fn(),
      chooseTenant: jest.fn(), retry: jest.fn(), logout: jest.fn(), resetOperation: jest.fn(),
    });
  });

  it('presents both approved paths and submits the New Clinic contract', () => {
    const { getAllByRole, getByText, getByTestId, queryByTestId } = render(<ChoiceScreen />);

    expect(getByText('Create a new clinic')).toBeTruthy();
    expect(getByText('Bring your clinic')).toBeTruthy();
    expect(getAllByRole('radio')).toHaveLength(2);
    expect(queryByTestId('clinic-entry-selection-summary')).toBeNull();

    fireEvent.press(getByTestId('clinic-entry-path-new_clinic'));

    expect(getByTestId('clinic-entry-selection-summary')).toBeTruthy();
    fireEvent.changeText(getByTestId('clinic-specialty'), 'General');
    fireEvent.changeText(getByTestId('clinic-address-line1'), '1 Main Road');
    fireEvent.changeText(getByTestId('clinic-city'), 'Pune');
    fireEvent.changeText(getByTestId('clinic-state'), 'MH');
    fireEvent.changeText(getByTestId('clinic-postal-code'), '411001');
    fireEvent.changeText(getByTestId('clinic-contact-value'), 'owner@example.com');
    fireEvent.press(getByTestId('clinic-entry-submit'));
    expect(mockSubmitNewClinic).toHaveBeenCalledWith(
      expect.objectContaining({ clinicName: 'Nova Clinic', countryCode: 'IN' }),
      'Nova Clinic'
    );
    expect(getByTestId('clinic-entry-path-new_clinic').props.accessibilityState.checked).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ enabled: true }),
    );
    expect(mockSetCurrentApplicationId).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(mockApplicationDetailQueryFn).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('presents Bring Your Clinic verification and non-import boundaries', () => {
    const { getByTestId } = render(<ChoiceScreen />);

    fireEvent.press(getByTestId('clinic-entry-path-bring_your_clinic'));

    fireEvent.changeText(getByTestId('ownership-reference'), 'opaque-reference');
    fireEvent.changeText(getByTestId('clinic-contact-value'), 'owner@example.com');
    fireEvent.press(getByTestId('clinic-entry-submit'));
    expect(mockSubmitBringClinic).toHaveBeenCalledWith(
      expect.objectContaining({ ownershipReference: 'opaque-reference' }),
      'Nova Clinic'
    );
    expect(getByTestId('clinic-entry-path-bring_your_clinic').props.accessibilityState.checked).toBe(true);
  });

  it('reuses the existing loading, empty, and safe error presentations', () => {
    mockUseApplicationDetailQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    const loading = render(<ChoiceScreen />);
    expect(loading.getByText('Loading clinic entry options...')).toBeTruthy();
    loading.unmount();

    mockUseApplicationDetailQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('raw backend text'),
      refetch: mockRefetch,
    });
    const failed = render(<ChoiceScreen />);
    expect(failed.getByText('Clinic entry options could not be loaded. Please try again.')).toBeTruthy();
    expect(failed.queryByText('raw backend text')).toBeNull();
  });

  it('preserves the existing navigation for an already active onboarding journey', () => {
    mockUseAuth.mockReturnValue({ currentUser: { userId: 'user-1', applicationStatus: 'onboarding' } });

    render(<ChoiceScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/wizard-flow');
  });

  it('uses only the authenticated continuation when navigation supplies a conflicting application ID', () => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: 'attacker-selected-application' });

    render(<ChoiceScreen />);

    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ enabled: true }),
    );
    expect(mockSetCurrentApplicationId).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(mockUseApplicationDetailQuery).not.toHaveBeenCalledWith(
      'attacker-selected-application',
      expect.anything(),
    );
  });

  it.each([
    ['approved', undefined],
    ['pending_review', undefined],
    ['rejected', undefined],
  ] as const)('does not load a route-supplied application for %s without an approved continuation', (status, continuation) => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: 'attacker-selected-application' });
    mockUseRegistrationStatus.mockReturnValue({
      data: { status, action_required: false, updated_at: '2026-10-19T00:00:00Z', continuation },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const screen = render(<ChoiceScreen />);

    expect(screen.getByText('Clinic entry is unavailable because the application context could not be resolved.')).toBeTruthy();
    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSetCurrentApplicationId).not.toHaveBeenCalled();
    expect(mockApplicationDetailQueryFn).not.toHaveBeenCalled();
  });

  it.each([
    ['loading', { data: undefined, isLoading: true, error: null, refetch: mockRefetch }],
    ['error', { data: undefined, isLoading: false, error: new Error('status failure'), refetch: mockRefetch }],
  ])('does not load application details while the authenticated status query is %s', (_state, statusResult) => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: 'attacker-selected-application' });
    mockUseRegistrationStatus.mockReturnValue(statusResult);

    const screen = render(<ChoiceScreen />);

    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSetCurrentApplicationId).not.toHaveBeenCalled();
    expect(mockApplicationDetailQueryFn).not.toHaveBeenCalled();
    expect(screen.queryByText('Nova Clinic')).toBeNull();
  });

  it('does not use a cached continuation without an authenticated applicant', () => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: 'attacker-selected-application' });
    mockUseAuth.mockReturnValue({ currentUser: undefined });

    render(<ChoiceScreen />);

    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSetCurrentApplicationId).not.toHaveBeenCalled();
    expect(mockApplicationDetailQueryFn).not.toHaveBeenCalled();
  });

  it.each([
    ['missing continuation', undefined],
    ['null continuation', null],
    ['empty continuation', {}],
    ['wrong continuation kind', { kind: 'other', application_id: '11111111-1111-4111-8111-111111111111', tenant_name: 'Nova Clinic' }],
    ['missing application ID', { kind: 'approved_choice', tenant_name: 'Nova Clinic' }],
    ['empty application ID', { kind: 'approved_choice', application_id: '', tenant_name: 'Nova Clinic' }],
    ['malformed application ID', { kind: 'approved_choice', application_id: 'not-a-uuid', tenant_name: 'Nova Clinic' }],
    ['missing tenant name', { kind: 'approved_choice', application_id: '11111111-1111-4111-8111-111111111111' }],
    ['blank tenant name', { kind: 'approved_choice', application_id: '11111111-1111-4111-8111-111111111111', tenant_name: '   ' }],
  ])('does not enable application details for direct entry with %s', (_scenario, continuation) => {
    mockUseLocalSearchParams.mockReturnValue({ applicationId: 'attacker-selected-application' });
    mockUseRegistrationStatus.mockReturnValue({
      data: { status: 'approved', action_required: false, updated_at: '2026-10-19T00:00:00Z', continuation },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ChoiceScreen />);

    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSetCurrentApplicationId).not.toHaveBeenCalled();
    expect(mockApplicationDetailQueryFn).not.toHaveBeenCalled();
  });

  it('does not enable application details for a nonapproved status with a valid-looking continuation', () => {
    mockUseRegistrationStatus.mockReturnValue({
      data: {
        status: 'pending_review',
        action_required: false,
        updated_at: '2026-10-19T00:00:00Z',
        continuation: {
          kind: 'approved_choice',
          application_id: '11111111-1111-4111-8111-111111111111',
          tenant_name: 'Nova Clinic',
        },
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ChoiceScreen />);

    expect(mockUseApplicationDetailQuery).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSetCurrentApplicationId).not.toHaveBeenCalled();
    expect(mockApplicationDetailQueryFn).not.toHaveBeenCalled();
  });

  it('keeps English and Hindi Clinic Entry localization shapes compatible', () => {
    const english = mockEnUS.onboarding.progressiveExperience.clinicEntry;
    const hindi = hiIN.onboarding.progressiveExperience.clinicEntry;
    const placeholders = (value: string) => value.match(/{{[^}]+}}/g)?.sort() ?? [];

    expect(Object.keys(hindi).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(hindi.newClinic).sort()).toEqual(Object.keys(english.newClinic).sort());
    expect(Object.keys(hindi.bringYourClinic).sort()).toEqual(
      Object.keys(english.bringYourClinic).sort()
    );

    const compareLeaves = (left: Record<string, string>, right: Record<string, string>) => {
      Object.keys(left).forEach((key) => {
        expect(placeholders(right[key])).toEqual(placeholders(left[key]));
      });
    };
    compareLeaves(english.newClinic, hindi.newClinic);
    compareLeaves(english.bringYourClinic, hindi.bringYourClinic);
  });
});
