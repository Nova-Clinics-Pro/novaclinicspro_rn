import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import mockEnUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';
import { ChoiceScreen } from '../../features/onboarding/presentation/pages/ChoiceScreen';

const mockReplace = jest.fn();
const mockRefetch = jest.fn();
const mockSetCurrentApplicationId = jest.fn();
const mockUseApplicationDetailQuery = jest.fn();
const mockUseAuth = jest.fn();
const mockUseClinicEntryOrchestration = jest.fn();
const mockSubmitNewClinic = jest.fn();
const mockSubmitBringClinic = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ applicationId: 'application-1' }),
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
    mockUseAuth.mockReturnValue({ currentUser: { applicationStatus: 'approved' } });
    mockUseApplicationDetailQuery.mockReturnValue({
      data: { id: 'application-1', tenant_name: 'Nova Clinic' },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
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
    mockUseAuth.mockReturnValue({ currentUser: { applicationStatus: 'onboarding' } });

    render(<ChoiceScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/wizard-flow');
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
